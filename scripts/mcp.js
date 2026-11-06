// PixSpell as an MCP server (stdio, no dependencies): `pixspell mcp`.
// Tools return images, so an agent can look at sprites, characters, effects and sounds before it uses them,
// then save them as files or game packs.
//
//   Claude Code:  claude mcp add pixspell -- npx -y pixspell mcp
//   Others:       { "command": "npx", "args": ["-y", "pixspell", "mcp"] } in the client's MCP config
//
// Tools take JSON items, not code, so the server never runs code it is sent.

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { resolve, relative, isAbsolute, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'
import { createInterface } from 'node:readline'
import { spell, looks, sheet, encodeAPNG, MATERIAL_NAMES } from '../src/index.js'
import { previewSheet, describe, resolveItem, itemCode } from '../src/preview.js'

const VERSION = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')).version
const PROTOCOLS = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05']
const deflate = (b) => deflateSync(b, { level: 9 })
const b64 = (bytes) => Buffer.from(bytes).toString('base64')

const ITEM = {
  type: 'object',
  description: 'One PixSpell asset. Give exactly one of sprite, char, fx, sfx or music; with char, optionally one of action, walk or status.',
  properties: {
    sprite: { type: 'string', description: 'Sprite id, e.g. "slime-pink", "sword-gold", "grass", "chest". See the catalog tool.' },
    char: {
      description: 'A character: a body id ("hero", "heroine", "goblin", "skeleton", "slime-pink"...) or { body, hat, hand, offhand, A }',
      anyOf: [{ type: 'string' }, {
        type: 'object',
        properties: { body: { type: 'string' }, hat: { type: 'string' }, hand: { type: 'string' }, offhand: { type: 'string' }, A: { type: 'string' } },
        required: ['body'],
      }],
    },
    action: { type: 'string', enum: spell.action.list, description: 'With char: an 8-frame 32x32 action' },
    walk: { type: 'string', enum: spell.walk.dirs, description: 'With char: a walk cycle in this direction' },
    status: { type: 'string', description: 'With char: a status effect on it, e.g. "burning", "frozen", "poisoned", "sleep"' },
    fx: { type: 'string', description: 'Effect name, e.g. "meteor", "slash", "explosion", "heal", "rain". See the catalog tool.' },
    sfx: { type: 'string', description: 'Sound name, e.g. "slash", "coin", "jump", "levelup". See the catalog tool.' },
    music: { type: 'string', description: 'Music track: "title", "town", "field", "dungeon", "battle", "boss", "victory"... See the catalog tool.' },
    key: { type: 'number', description: 'Music: transpose by semitones' },
    tempo: { type: 'number', description: 'Music: speed multiplier, e.g. 1.1' },
    element: { type: 'string', description: 'fire, ice, poison, holy, dark, water, nature, blood, arcane, steel, or a #hex color' },
    size: { type: 'number', description: 'Effect frame size in px (default 32)' },
    grid: { type: 'number', enum: [8, 16, 32, 64], description: 'Tile size the art is made for (default 16)' },
    A: { type: 'string', description: 'Recolor ramp A: a material name or #hex' },
    B: { type: 'string', description: 'Recolor ramp B' },
    C: { type: 'string', description: 'Recolor ramp C' },
    seed: { type: 'number' },
    pitch: { type: 'number', description: 'Sounds: pitch multiplier' },
  },
}

const TOOLS = [
  {
    name: 'preview',
    title: 'Look at assets',
    description: 'Render PixSpell assets into one contact sheet image (every frame, zoomed, on a checkerboard; sounds as waveforms) '
      + 'and say for each its size, frames, fps and the JavaScript call that makes it. Use it to check a choice by eye before using it.',
    inputSchema: { type: 'object', properties: { items: { type: 'array', items: ITEM, minItems: 1, maxItems: 24 } }, required: ['items'] },
  },
  {
    name: 'save',
    title: 'Save an asset as a file',
    description: 'Write one asset into the project: "png" (one frame), "apng" (animated PNG), "strip" (frames side by side) or "wav" (sounds). '
      + 'The path is relative to the working directory and must stay inside it.',
    inputSchema: {
      type: 'object',
      properties: {
        item: ITEM,
        path: { type: 'string', description: 'e.g. "assets/hero-walk.png"' },
        format: { type: 'string', enum: ['png', 'apng', 'strip', 'wav'], description: 'Default: apng for animations, png for one frame, wav for sounds' },
        scale: { type: 'number', description: 'Integer zoom, default 1' },
        frame: { type: 'number', description: 'png: which frame (default 0)' },
      },
      required: ['item', 'path'],
    },
  },
  {
    name: 'pack',
    title: 'Save a character game pack',
    description: 'Write a zip for a game engine: a sprite sheet with idle, 4-way walk and actions, Aseprite/Phaser JSON and a Godot 4 SpriteFrames file.',
    inputSchema: {
      type: 'object',
      properties: {
        char: ITEM.properties.char,
        path: { type: 'string', description: 'e.g. "assets/hero.zip"' },
        element: ITEM.properties.element,
        grid: ITEM.properties.grid,
      },
      required: ['char', 'path'],
    },
  },
  {
    name: 'catalog',
    title: 'Find asset names',
    description: 'List PixSpell names: sprites, bodies, hats, held, offhand, fx, sfx, music, actions, elements or materials, optionally filtered by a word.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['sprites', 'bodies', 'hats', 'held', 'offhand', 'fx', 'sfx', 'music', 'actions', 'elements', 'materials'] },
        query: { type: 'string', description: 'Substring filter, e.g. "sword" or "slime"' },
      },
      required: ['kind'],
    },
  },
]

// paths stay inside the working directory
function target(path) {
  const full = resolve(process.cwd(), String(path ?? ''))
  const rel = relative(process.cwd(), full)
  if (!path || rel.startsWith('..') || isAbsolute(rel)) throw new Error(`path must be inside ${process.cwd()}`)
  mkdirSync(dirname(full), { recursive: true })
  return full
}

const LISTS = {
  sprites: () => Object.keys(looks).filter((id) => !id.startsWith('fx-')),
  bodies: () => spell.char.parts.body,
  hats: () => spell.char.parts.head.map((h) => h.replace(/^hat-/, '')),
  held: () => spell.char.parts.hand.map((h) => h.replace(/^held-/, '')),
  offhand: () => spell.char.parts.offhand.map((h) => h.replace(/^held-/, '')),
  fx: () => spell.fx.list.map((id) => id.replace(/^fx-/, '')),
  sfx: () => spell.sfx.list,
  music: () => spell.music.list,
  actions: () => spell.action.list,
  elements: () => Object.keys(spell.fx.colors),
  materials: () => MATERIAL_NAMES,
}

const handlers = {
  preview({ items }) {
    if (!Array.isArray(items) || !items.length) throw new Error('items: give at least one item')
    const entries = items.map((item) => ({ label: itemCode(item), value: resolveItem(spell, item) }))
    const png = previewSheet(entries).toPNG({ deflate })
    const lines = entries.map((e, i) => `${i + 1}. ${e.label}  ->  ${describe(e.value)}`)
    return [{ type: 'image', data: b64(png), mimeType: 'image/png' }, { type: 'text', text: lines.join('\n') }]
  },
  save({ item, path, format, scale = 1, frame = 0 }) {
    const value = resolveItem(spell, item)
    const file = target(path)
    let bytes
    if (value.samples) {
      if (format && format !== 'wav') throw new Error('sounds save as wav')
      bytes = value.toWAV()
    } else {
      const frames = (Array.isArray(value) ? value : [value]).map((f) => (scale > 1 ? f.scale(Math.round(scale)) : f))
      const kind = format ?? (frames.length > 1 ? 'apng' : 'png')
      if (kind === 'wav') throw new Error('only sounds save as wav')
      bytes = kind === 'apng' ? encodeAPNG(frames, { fps: value.fps ?? 8, deflate })
        : kind === 'strip' ? sheet(frames, { columns: frames.length }).image.toPNG({ deflate })
          : frames[Math.min(frames.length - 1, Math.max(0, frame))].toPNG({ deflate })
    }
    writeFileSync(file, bytes)
    return [{ type: 'text', text: `wrote ${relative(process.cwd(), file)} (${bytes.length} bytes): ${itemCode(item)}, ${describe(value)}` }]
  },
  pack({ char, path, element, grid }) {
    const spec = typeof char === 'string' ? { body: char } : char
    const pack = spell.pack(spec, { element, grid, deflate })
    const file = target(path)
    const bytes = pack.zip()
    writeFileSync(file, bytes)
    return [{ type: 'text', text: `wrote ${relative(process.cwd(), file)} (${bytes.length} bytes): ${Object.keys(pack.files).join(', ')}` }]
  },
  catalog({ kind, query }) {
    const list = LISTS[kind]
    if (!list) throw new Error(`kind: one of ${Object.keys(LISTS).join(', ')}`)
    const q = String(query ?? '').toLowerCase()
    const hits = list().filter((id) => id.toLowerCase().includes(q))
    const shown = hits.slice(0, 400)
    return [{ type: 'text', text: `${hits.length} ${kind}${q ? ` matching "${q}"` : ''}:\n${shown.join(' ')}${hits.length > shown.length ? ' ...' : ''}` }]
  },
}

function reply(id, result) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n') }
function fail(id, code, message) { process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n') }

function handle(msg) {
  const { id, method, params = {} } = msg
  const isRequest = id !== undefined && id !== null
  if (method === 'initialize') {
    const asked = params.protocolVersion
    return reply(id, {
      protocolVersion: PROTOCOLS.includes(asked) ? asked : PROTOCOLS[0],
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'pixspell', title: 'PixSpell', version: VERSION },
      instructions: 'PixSpell makes pixel-art game assets from code. Use catalog to find names, preview to look at assets '
        + '(it returns an image and the JavaScript call for each), then save or pack to write files, or use the printed '
        + 'calls in code: import { spell } from "pixspell".',
    })
  }
  if (method === 'ping') return isRequest && reply(id, {})
  if (method === 'tools/list') return reply(id, { tools: TOOLS })
  if (method === 'tools/call') {
    const tool = handlers[params.name]
    if (!tool) return fail(id, -32602, `unknown tool "${params.name}"`)
    try {
      return reply(id, { content: tool(params.arguments ?? {}) })
    } catch (e) {
      return reply(id, { content: [{ type: 'text', text: String(e.message).replace(/^pixspell: /, '') }], isError: true })
    }
  }
  if (!isRequest) return // notifications (initialized, cancelled...) need no answer
  fail(id, -32601, `method not found: ${method}`)
}

export function serve() {
  const rl = createInterface({ input: process.stdin })
  rl.on('line', (line) => {
    if (!line.trim()) return
    let msg
    try { msg = JSON.parse(line) } catch { return fail(null, -32700, 'parse error') }
    for (const m of Array.isArray(msg) ? msg : [msg]) {
      try { handle(m) } catch (e) { if (m.id != null) fail(m.id, -32603, e.message) }
    }
  })
}
