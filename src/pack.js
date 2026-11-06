// Game packs: one character -> everything a game engine needs.
//
//   const pack = spell.pack({ body: 'hero', hat: 'crown', hand: 'sword' })
//   pack.files   // { 'hero.png', 'hero.json', 'hero.tres', 'README.txt' }
//   pack.zip()   // the same as one .zip (Uint8Array)
//
// Sheet: 32x32 cells, one animation per row, feet at (16, 31) in every cell.
// JSON:  Aseprite / TexturePacker "JSON array" with meta.frameTags, so Phaser's
//        load.aseprite() + anims.createFromAseprite() work out of the box.
// .tres: Godot 4 SpriteFrames for AnimatedSprite2D.

import { Pixmap, sheet } from './pixmap.js'
import { zip } from './zip.js'

export const PACK_CELL = 32
const ORIGIN = { x: 16, y: 31 }

export function createPack(spell, looks) {
  const slug = (s) => [s.body, s.hat, s.hand, s.offhand].filter(Boolean)
    .map((p) => p.replace(/^(hat|held)-/, '')).join('-').replace(/[^a-z0-9-]/g, '').slice(0, 60)

  function pack(spec, { name, element, actions = spell.action.list, deflate, grid = 16, smooth } = {}) {
    const s = typeof spec === 'string' ? { body: spec } : { ...spec }
    for (const k of ['action', 'element', 'frame', 'dir']) delete s[k]
    const id = name ?? slug(s)
    const pad = (f) => new Pixmap(PACK_CELL, PACK_CELL).draw(f, 4, 8) // 24x24 -> 32x32, same feet spot as actions

    const idle = spell.char.frames(s)
    const bodyFps = looks[s.body].def.frames.length > 1 ? looks[s.body].def.fps : 4
    const rows = [{ tag: 'idle', frames: idle.map(pad), fps: bodyFps, loop: true }]
    for (const dir of spell.walk.dirs) {
      const w = spell.walk(s, dir)
      rows.push({ tag: `walk-${dir}`, frames: w.map(pad), fps: w.fps, loop: true })
    }
    for (const a of actions) {
      const f = spell.action(s, a, element)
      rows.push({ tag: a, frames: f, fps: f.fps, loop: false })
    }

    // another tile size: the same rows, converted (cell 32 -> 16 / 64 / 128, feet stay at the bottom center)
    const k = grid / 16
    if (k !== 1) for (const r of rows) r.frames = spell.toGrid(r.frames, grid, { smooth })
    const origin = { x: ORIGIN.x * k, y: (ORIGIN.y + 1) * k - 1 }
    return writePack(id, rows, { readme: readmeFor(id, s, rows, origin, PACK_CELL * k), meta: { spec: s, origin, grid }, deflate, extra: { spec: s } })
  }

  return pack
}

/**
 * Shared pack writer: rows [{ tag, frames, fps, loop }] -> sheet + Aseprite JSON + Godot .tres + README (+ zip).
 * Every frame goes in a cell the size of the largest frame; smaller frames are centered.
 */
export function writePack(id, rows, { readme, meta = {}, deflate, extra = {} } = {}) {
  const cellW = Math.max(...rows.flatMap((r) => r.frames.map((f) => f.w)))
  const cellH = Math.max(...rows.flatMap((r) => r.frames.map((f) => f.h)))
  const cols = Math.max(...rows.map((r) => r.frames.length))
  const image = new Pixmap(cols * cellW, rows.length * cellH)
  const frames = [], frameTags = []
  rows.forEach((r, ri) => {
    const from = frames.length
    r.frames.forEach((f, fi) => {
      const x = fi * cellW, y = ri * cellH
      image._blit(f, x + ((cellW - f.w) >> 1), y + ((cellH - f.h) >> 1)) // in place, not a copy per frame
      frames.push({
        filename: String(frames.length), // Phaser's createFromAseprite looks frames up by index
        frame: { x, y, w: cellW, h: cellH },
        rotated: false, trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: cellW, h: cellH },
        sourceSize: { w: cellW, h: cellH },
        duration: Math.round(1000 / r.fps),
      })
    })
    frameTags.push({ name: r.tag, from, to: frames.length - 1, direction: 'forward' })
  })
  const json = {
    frames,
    meta: {
      app: 'https://github.com/olebangpad/pixspell', version: '1', image: `${id}.png`, format: 'RGBA8888',
      size: { w: image.w, h: image.h }, scale: '1', frameTags,
      pixspell: { cell: cellW, ...meta, loops: Object.fromEntries(rows.map((r) => [r.tag, r.loop])) },
    },
  }
  const tres = godot(id, rows, frames)
  const files = {
    [`${id}.png`]: image.toPNG(deflate ? { deflate } : undefined),
    [`${id}.json`]: JSON.stringify(json, null, 1),
    [`${id}.tres`]: tres,
    'README.txt': readme,
  }
  return { id, ...extra, image, json, tres, files, animations: rows.map((r) => r.tag), zip: () => zip(files) }
}

/**
 * Effect packs: spell.fxPack(['fx-boom', 'fx-comet-ice']) or spell.fxPack() for every effect.
 * One row per effect, same files as a character pack.
 */
export function createFxPack(spell, looks) {
  return function fxPack(ids = spell.fx.list, { name = 'effects', deflate, grid } = {}) {
    const rows = ids.map((raw) => {
      const id = looks[raw] ? raw : `fx-${raw}`
      if (!looks[id]) throw new Error(`pixspell: no effect called "${raw}"`)
      const { def } = looks[id]
      return { tag: id.replace(/^fx-/, ''), frames: spell.frames(id, { grid }), fps: def.fps, loop: def.tags.includes('loop') }
    })
    const readme = `PixSpell effects pack: ${name}
Made with PixSpell - https://github.com/olebangpad/pixspell - CC0, use it anywhere.

${name}.png   one effect per row (${rows.length} effects), frames left to right
${name}.json  Aseprite / TexturePacker JSON array, one frameTag per effect (Phaser: load.aseprite + createFromAseprite)
${name}.tres  Godot 4 SpriteFrames, one animation per effect

EFFECTS
${rows.map((r, i) => `  ${String(i).padStart(3)}: ${r.tag.padEnd(22)} ${r.frames.length} frames @ ${r.fps} fps ${r.loop ? 'loop' : 'once'}`).join('\n')}

Directional effects face right: flip them for left. Status effects line up with 32x32 character frames.
`
    return writePack(name, rows, { readme, meta: { effects: rows.length }, deflate })
  }
}

/** Godot 4 SpriteFrames resource. Animation names use underscores (walk_down). */
function godot(id, rows, frames) {
  const subs = frames.map((f, i) =>
    `[sub_resource type="AtlasTexture" id="AtlasTexture_${i}"]\natlas = ExtResource("1_sheet")\nregion = Rect2(${f.frame.x}, ${f.frame.y}, ${f.frame.w}, ${f.frame.h})\n`)
  let i = 0
  const anims = rows.map((r) => {
    const fr = r.frames.map(() => `{\n"duration": 1.0,\n"texture": SubResource("AtlasTexture_${i++}")\n}`)
    return `{\n"frames": [${fr.join(', ')}],\n"loop": ${r.loop},\n"name": &"${r.tag.replace(/-/g, '_')}",\n"speed": ${r.fps.toFixed(1)}\n}`
  })
  return [
    `[gd_resource type="SpriteFrames" load_steps=${frames.length + 2} format=3]`,
    '',
    `[ext_resource type="Texture2D" path="res://${id}.png" id="1_sheet"]`,
    '',
    subs.join('\n'),
    '[resource]',
    `animations = [${anims.join(', ')}]`,
    '',
  ].join('\n')
}

function readmeFor(id, spec, rows, origin = ORIGIN, cell = PACK_CELL) {
  const opts = ['hat', 'hand', 'offhand', 'A', 'B', 'C'].filter((k) => spec[k]).map((k) => `${k}: '${spec[k]}'`)
  return `PixSpell character pack: ${id}
Made with PixSpell - https://github.com/olebangpad/pixspell
The art is CC0 (public domain): use it in any game, commercial or not. Credit is welcome, not required.

FILES
  ${id}.png    sprite sheet: ${cell}x${cell} cells, one animation per row.
               Every cell has the character's feet at x=${origin.x}, y=${origin.y} - use that as the sprite origin.
  ${id}.json   Aseprite / TexturePacker "JSON array" atlas with meta.frameTags (one tag per animation)
  ${id}.tres   Godot 4 SpriteFrames (expects the png at res://${id}.png - fix the path if you move it)

ANIMATIONS (row: name, frames, loops?)
${rows.map((r, i) => `  ${String(i).padStart(2)}: ${r.tag.padEnd(10)} ${r.frames.length} frames @ ${r.fps} fps ${r.loop ? 'loop' : 'once'}`).join('\n')}

PHASER 3
  // preload()
  this.load.aseprite('${id}', '${id}.png', '${id}.json')
  // create()
  this.anims.createFromAseprite('${id}')
  const hero = this.add.sprite(160, 120, '${id}').setOrigin(0.5, ${origin.y} / ${cell})
  hero.play({ key: 'walk-down', repeat: -1 })
  // pixel-perfect: new Phaser.Game({ pixelArt: true, ... })

GODOT 4
  Copy ${id}.png and ${id}.tres into the project root, add an AnimatedSprite2D,
  set its Sprite Frames to ${id}.tres and pick an animation (walk_down, attack, ...).
  Set the texture filter to Nearest for crisp pixels; offset.y = -${origin.y - cell / 2} puts the feet on the node position.

ANYTHING ELSE
  ${id}.json lists every frame's x / y / w / h and duration in milliseconds.

REBUILD IT IN CODE
  spell.pack({ body: '${spec.body}'${opts.length ? ', ' + opts.join(', ') : ''} }${cell !== PACK_CELL ? `, { grid: ${cell / 2} }` : ''})
`
}
