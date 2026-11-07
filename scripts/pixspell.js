#!/usr/bin/env node
// Command line for PixSpell.
//
//   node scripts/pixspell.js list [category]
//   node scripts/pixspell.js render potion -A gold --scale 8 --outline '#fff' -o potion.png
//   node scripts/pixspell.js render slime -A '#ff4fd8' --anim -o slime.png     (animated PNG)
//   node scripts/pixspell.js combine hero crown@0,-7 --scale 6 -o king.png
//   node scripts/pixspell.js outline < my-art.txt                              (auto-outline helper)

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'node:fs'
import { didYouMean } from '../src/suggest.js'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync, inflateSync } from 'node:zlib'
import { spell, looks, compose, sheet, text, Pixmap, encodeAPNG as apngBytes, encodeGIF, zip, MATERIAL_NAMES } from '../src/index.js'

const HELP = `pixspell - game assets as code

usage:
  pixspell list [category]                      list every sprite look
  pixspell info <id>                            size, slots, variants, frames
  pixspell render <id> [options] -o out.png     export one sprite
  pixspell combine <id>[@x,y] <id>[@x,y] ...    stack sprites into one image
  pixspell char <body> [--hat x] [--hand x] [--offhand x] [-A color] [--height 24] -o out.png
  pixspell char --random [seed] -o out.png      a random character (same seed, same character)
  pixspell char <body> ... --action attack [--element fire] --anim -o hit.png
                                           actions: attack hit heal levelup cast death
  pixspell char <body> ... --walk left --anim -o walk.png   directions: down up left right down-right down-left up-right up-left
  pixspell act <body> [--hat x] [--hand x] ... --vs slime [--ko] [--element fire] [--scale 4] -o hit.gif
                                           one character hitting another: wind-up, hit-stop, shake, reaction
                                           (prints the hit timing and the sounds to play, for your game)
  pixspell pack <body> [--hat x] [--hand x] [--offhand x] [-A color] [--element fire] [-o hero.zip | --dir out/]
                                           game pack: sprite sheet + Phaser/Aseprite JSON + Godot .tres
                                           (--strip adds GameMaker strips; the README says how to slice it in Unity)
  pixspell rpgmaker <body> [--hat x] [--hand x] [--height 24] [-o hero.zip]   RPG Maker MV / MZ sheet + face
  pixspell rpgmaker --random 8 [--seed town] [--id Townsfolk]                8 random characters on one sheet
  pixspell avatar <body> [--hat x] [--size 512] [--full] -o me.png            a profile picture
  pixspell fx <name> [--element ice] [--size 64] [--seed n] [--on <body>] -o out.png
                                           procedural effect as an animated PNG (--strip: frame strip,
                                           --frame n: one frame, --on slime: on a character as a status)
  pixspell fxpack [name ...] [-o effects.zip | --dir out/]   effects as one game pack (default: all of them)
  pixspell sfx <name> [--element fire] [--pitch 1.2] [--seed n] [--volume 0.8] -o out.wav
                                           a sound effect as a WAV file (pixspell sfx alone lists them)
  pixspell import <image.png> [--id name] [--size 16x16] [-o sprite.js] [--preview p.png]
                                           your own pixel art as a PixSpell sprite (text art + color ramps);
                                           --size splits a strip into frames; --preview shows it recolored
  pixspell autotile <inner> [outer] [--grid 32] [-o shore.zip | --dir out/]
                                           terrain transition: 16 corner tiles + Tiled .tsx + Godot .tres
                                           (no outer: an overlay to stack on another terrain)
  pixspell music [name] [--key 2] [--tempo 1.1] [--seed n] -o out.wav
                                           chiptune music: a seamless loop or a jingle (pixspell music alone lists them)
  pixspell sfxpack [name ...] [-o sounds.zip | --dir out/]   sounds as WAV files in one zip (default: all)
  pixspell export [--grid 32] [--no-effects] [--no-sounds] [--all-colors] -o pixspell-32px.zip
                                           everything for one tile size in one zip
  pixspell hero <github-login> [-o pixspell-hero.png] [--scale 3]
                                           your GitHub account as a game hero: an animated card for your
                                           profile README (uses $GITHUB_TOKEN if set; --stats file.json: offline)
  pixspell preview <what> [<what> ...] [-o preview.png] [--zoom n]
                                           one image to check assets by eye: every frame, zoomed, on a checkerboard,
                                           sounds as waveforms. <what> is a name (slime, meteor, coin), a JS call
                                           ("spell.fx('meteor', { element: 'ice' })") or JSON ('{"char":"hero","action":"attack"}')
  pixspell doctor                               check Node, rendering, and the skill copies your agents read
  pixspell mcp                                  run the MCP server (stdio): tools that return images to your agent
  pixspell skill [--claude] [--dir path]       install the PixSpell skill for your coding agent: into .agents/skills/
                                           (Codex, Cursor, Gemini CLI, Copilot, OpenCode...), --claude: .claude/skills/
  pixspell outline                              read text art on stdin, add # outlines
  pixspell materials                            list named materials

options:
  --grid <8|16|32|64>          tile size of your game: art is converted to fit it (render, char, fx, pack, fxpack)
  --height <16|24>             how tall people are drawn (char, pack): 16 = chibi, 24 = drawn taller
  -A, -B, -C <material|#hex>   recolor a ramp slot
  --scale <n>                  4 = 4x bigger, 0.5 = half size
  --smooth                     Scale2x smoothing (doubles size)
  --outline [color]            1px outline around the shape
  --shadow [color]             drop shadow
  --hue <deg> --sat <x> --light <v>
  --flip-x --flip-y --rotate <90|180|270>
  --frame <n>                  animation frame
  --anim                       write every frame as an animated PNG
  --strip                      write every frame side by side (sprite strip)
  -o <file>                    output path (default: <id>.png); animations end in .gif for a GIF
`

function parse(argv) {
  const opts = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    const next = () => argv[++i]
    const optional = () => (argv[i + 1] && !argv[i + 1].startsWith('-') ? next() : undefined)
    if (a === '-A' || a === '-B' || a === '-C') opts[a[1]] = next()
    else if (a === '-o' || a === '--out') opts.out = next()
    else if (a === '--scale') opts.scale = Number(next())
    else if (a === '--smooth') opts.smooth = true
    else if (a === '--outline') opts.outline = optional() ?? '#000000'
    else if (a === '--shadow') opts.shadow = optional() ?? '#00000066'
    else if (a === '--hue') opts.hue = Number(next())
    else if (a === '--sat') opts.saturation = Number(next())
    else if (a === '--light') opts.lightness = Number(next())
    else if (a === '--flip-x') opts.flipX = true
    else if (a === '--flip-y') opts.flipY = true
    else if (a === '--rotate') opts.rotate = Number(next())
    else if (a === '--frame') opts.frame = Number(next())
    else if (a === '--anim') opts.anim = true
    else if (a === '--hat' || a === '--hand' || a === '--offhand') opts[a.slice(2)] = next()
    else if (a === '--random') opts.random = optional() ?? true
    else if (a === '--action') opts.action = next()
    else if (a === '--walk') opts.walk = optional() ?? 'down'
    else if (a === '--element') opts.element = next()
    else if (a === '--strip') opts.strip = true
    else if (a === '--dir') opts.dir = next()
    else if (a === '--size') { const v = next(); if (/x/.test(v)) opts.cell = v; else opts.size = Number(v) } // 64, or 16x16 for import
    else if (a === '--seed') opts.seed = Number(next())
    else if (a === '--on') opts.on = next()
    else if (a === '--pitch') opts.pitch = Number(next())
    else if (a === '--grid') opts.grid = Number(next())
    else if (a === '--no-effects') opts.noEffects = true
    else if (a === '--no-sounds') opts.noSounds = true
    else if (a === '--all-colors') opts.allColors = true
    else if (a === '--volume') opts.volume = Number(next())
    else if (a === '--claude') opts.claude = true
    else if (a === '--stats') opts.stats = next()
    else if (a === '--zoom') opts.zoom = Number(next())
    else if (a === '--key') opts.key = Number(next())
    else if (a === '--id') opts.id = next()
    else if (a === '--preview') opts.preview = next()
    else if (a === '--tempo') opts.tempo = Number(next())
    else if (a === '--height') opts.height = Number(next())
    else if (a === '--full') opts.full = true
    else if (a === '--vs') opts.vs = next()
    else if (a === '--ko') opts.ko = true
    else if (a === '-h' || a === '--help') opts.help = true
    else if (/^--?[a-z]/i.test(a)) (opts.unknown ??= []).push(a)
    else opts._.push(a)
  }
  return opts
}
// every option parse() knows, for "did you mean" on a typo
const OPTIONS = ['-A', '-B', '-C', '-o', '--out', '--scale', '--smooth', '--outline', '--shadow', '--hue', '--sat', '--light', '--flip-x',
  '--flip-y', '--rotate', '--frame', '--anim', '--hat', '--hand', '--offhand', '--random', '--action', '--walk', '--element', '--strip',
  '--dir', '--size', '--seed', '--on', '--pitch', '--grid', '--no-effects', '--no-sounds', '--all-colors', '--volume', '--claude',
  '--stats', '--zoom', '--key', '--id', '--preview', '--tempo', '--height', '--full', '--vs', '--ko', '--help']
const COMMANDS = ['list', 'materials', 'info', 'render', 'combine', 'char', 'act', 'pack', 'rpgmaker', 'avatar', 'fx', 'fxpack', 'sfx', 'import', 'autotile', 'music',
  'sfxpack', 'export', 'hero', 'preview', 'doctor', 'mcp', 'skill', 'outline']

function finish(img, o) {
  if (o.flipX) img = img.flipX()
  if (o.flipY) img = img.flipY()
  if (o.rotate) img = img.rotate(o.rotate)
  if (o.hue || o.saturation != null || o.lightness) img = img.adjust({ hue: o.hue, saturation: o.saturation ?? 1, lightness: o.lightness ?? 0 })
  if (o.smooth) img = img.smooth()
  if (o.scale) img = img.scale(o.scale)
  if (o.outline) img = img.outline(o.outline)
  if (o.shadow) img = img.shadow(o.shadow, Math.max(1, Math.round((o.scale ?? 1) / 2)), Math.max(1, Math.round((o.scale ?? 1) / 2)))
  return img
}

const save = (path, bytes) => {
  writeFileSync(path, bytes)
  console.log(`wrote ${path}`)
}
const deflate = (b) => deflateSync(b, { level: 9 })
// animations: an animated PNG, or a GIF when the output path ends in .gif (chat apps and social posts play GIFs)
let outPath = null
const encodeAPNG = (frames, { fps, deflate: d } = {}) => (/\.gif$/i.test(outPath ?? '') ? encodeGIF(frames, { fps }) : apngBytes(frames, { fps, deflate: d }))
const ramps = (o) => Object.fromEntries(['A', 'B', 'C'].filter((k) => o[k]).map((k) => [k, o[k]]))

function autoOutline(src) {
  const rows = src.split('\n').map((l) => l.trim()).filter(Boolean)
  const w = Math.max(...rows.map((r) => r.length)) + 2
  const g = ['', ...rows, ''].map((r) => ('.' + r).padEnd(w, '.'))
  const filled = (x, y) => y >= 0 && y < g.length && x >= 0 && x < w && g[y][x] !== '.'
  return g.map((r, y) => [...r].map((ch, x) => ch !== '.' ? ch
    : filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? '#' : '.').join('')).join('\n')
}

// errors print as one line (PIXSPELL_DEBUG=1 for the stack), and the exit code says it failed
const fail = (e) => {
  console.error(process.env.PIXSPELL_DEBUG ? e : `${e?.message ?? e}`.replace(/^(pixspell: )?/, 'pixspell: '))
  process.exit(1)
}
process.on('uncaughtException', fail)
process.on('unhandledRejection', fail)

const o = parse(process.argv.slice(2))
outPath = o.out ?? null
const [cmd, ...args] = o._
for (const u of o.unknown ?? []) {
  console.error(`pixspell: unknown option ${u}.${didYouMean(u, OPTIONS)} See: pixspell --help`)
  process.exit(1)
}

if (!cmd || o.help) {
  console.log(HELP)
} else if (cmd === 'list') {
  const ids = spell.list({ category: args[0] })
  console.log(ids.join('\n'))
  console.error(`\n${ids.length} looks`)
} else if (cmd === 'materials') {
  console.log(MATERIAL_NAMES.join('\n'))
} else if (cmd === 'info') {
  const { def, ramps: r } = spell.info(args[0])
  console.log({ id: args[0], size: `${def.w}x${def.h}`, category: def.category, slots: def.slots, ramps: r, frames: def.frames.length, fps: def.fps, variants: Object.keys(def.variants) })
} else if (cmd === 'render') {
  const id = args[0]
  if (!looks[id]) throw new Error(`no sprite called "${id}".${didYouMean(id, Object.keys(looks))} Every id: pixspell list`)
  const out = o.out ?? `${id}.png`
  if (o.anim) {
    const frames = spell.frames(id, { ...ramps(o), grid: o.grid }).map((f) => finish(f, o))
    save(out, encodeAPNG(frames, { fps: looks[id].def.fps, deflate }))
  } else {
    save(out, finish(spell(id, { ...ramps(o), grid: o.grid, frame: o.frame ?? looks[id].def.cover }), o).toPNG({ deflate }))
  }
} else if (cmd === 'combine') {
  const layers = args.map((spec) => {
    const [id, pos = '0,0'] = spec.split('@')
    const [x, y] = pos.split(',').map(Number)
    return spell(id).at(x, y)
  })
  save(o.out ?? 'combined.png', finish(compose(layers), o).toPNG({ deflate }))
} else if (cmd === 'char') {
  const spec = o.random ? spell.char.random(o.random === true ? undefined : o.random)
    : { body: args[0] ?? 'hero', hat: o.hat, hand: o.hand, offhand: o.offhand, ...ramps(o), ...(o.height ? { height: o.height } : {}) }
  if (o.random) console.error(`random character: ${JSON.stringify(spec)}`) // what the seed rolled, to rebuild it in code
  const name = o.out ?? `${spec.body}${o.walk ? '-walk-' + o.walk : o.action ? '-' + o.action : ''}.png`
  const g = { grid: o.grid }
  const frames = o.walk ? spell.walk(spec, o.walk, g) : o.action ? spell.action(spec, o.action, { element: o.element, grid: o.grid }) : spell.char.frames(spec, g)
  const fps = frames.fps ?? looks[spec.body].def.fps
  if (o.anim) save(name, encodeAPNG(frames.map((f) => finish(f, o)), { fps, deflate }))
  else if (o.strip || o.action || o.walk) save(name, finish(sheet(frames).image, o).toPNG({ deflate }))
  else save(name, finish(spell.char(spec, g), o).toPNG({ deflate }))
} else if (cmd === 'act') {
  const spec = o.random ? spell.char.random(o.random === true ? undefined : o.random)
    : { body: args[0] ?? 'hero', hat: o.hat, hand: o.hand, offhand: o.offhand, ...ramps(o), ...(o.height ? { height: o.height } : {}) }
  for (const k of Object.keys(spec)) if (spec[k] == null) delete spec[k]
  const target = { body: o.vs ?? args[1] ?? 'slime', ...(o.height ? { height: o.height } : {}) }
  const act = spell.act(spec, target, { element: o.element, ko: o.ko, grid: o.grid })
  const name = o.out ?? `${spec.body}-vs-${target.body}.gif`
  outPath = name
  if (o.strip) save(name, finish(sheet(act).image, o).toPNG({ deflate }))
  else save(name, encodeAPNG(act.map((f) => finish(f, o)), { fps: act.fps, deflate }))
  const [hit] = act.hits
  console.error(`${act.length} frames at ${act.fps} fps. Hit at frame ${hit.frame} (${hit.time} s): freeze ${hit.freeze} s, shake ${hit.shake} px`)
  console.error(`sounds: ${act.cues.map((c) => `spell.sfx('${c.sound}'${c.opts.element ? `, { element: '${c.opts.element}' }` : ''}) at ${c.time} s`).join(', ')}`)
} else if (cmd === 'pack') {
  const spec = o.random ? spell.char.random(o.random === true ? undefined : o.random)
    : { body: args[0] ?? 'hero', hat: o.hat, hand: o.hand, offhand: o.offhand, ...ramps(o), ...(o.height ? { height: o.height } : {}) }
  for (const k of Object.keys(spec)) if (spec[k] == null) delete spec[k]
  const pack = spell.pack(spec, { element: o.element, deflate, grid: o.grid, strips: o.strip })
  if (o.dir) {
    mkdirSync(join(o.dir, 'strips'), { recursive: true })
    for (const [name, data] of Object.entries(pack.files)) save(join(o.dir, name), data)
  } else {
    save(o.out ?? `${pack.id}.zip`, pack.zip())
  }
  console.log(`${pack.animations.length} animations: ${pack.animations.join(', ')}`)
} else if (cmd === 'rpgmaker') {
  // one character as a "$" sheet, or --random n (up to 8) as one standard sheet of townsfolk
  const one = (seed) => spell.char.random(seed)
  const specs = o.random
    ? Array.from({ length: Math.min(8, o.random === true ? 8 : Number(o.random) || 8) }, (_, i) => ({ ...one(`${o.seed ?? 'rpg'}-${i}`), ...(o.height ? { height: o.height } : {}) }))
    : [{ body: args[0] ?? 'hero', hat: o.hat, hand: o.hand, offhand: o.offhand, ...ramps(o), ...(o.height ? { height: o.height } : {}) }]
  for (const s of specs) for (const k of Object.keys(s)) if (s[k] == null) delete s[k]
  const rm = spell.rpgmaker(specs.length === 1 ? specs[0] : specs, { name: o.id, deflate })
  if (o.dir) {
    for (const [name, data] of Object.entries(rm.files)) { mkdirSync(dirname(join(o.dir, name)), { recursive: true }); save(join(o.dir, name), data) }
  } else save(o.out ?? `${rm.id}-rpgmaker.zip`, rm.zip())
  console.error(`${specs.length} character${specs.length > 1 ? 's' : ''} for RPG Maker MV / MZ: copy the img folder into your project`)
} else if (cmd === 'avatar') {
  const spec = o.random ? spell.char.random(o.random === true ? undefined : o.random)
    : { body: args[0] ?? 'hero', hat: o.hat, hand: o.hand, offhand: o.offhand, ...ramps(o), ...(o.height ? { height: o.height } : {}) }
  for (const k of Object.keys(spec)) if (spec[k] == null) delete spec[k]
  save(o.out ?? `${spec.body}-avatar.png`, spell.avatar(spec, { size: o.size ?? 512, frame: o.full ? 'full' : 'bust' }).toPNG({ deflate }))
} else if (cmd === 'fx') {
  const name = args[0]
  if (!name) throw new Error(`which effect? one of:\n${spell.fx.list.map((id) => id.replace(/^fx-/, '')).join(' ')}`)
  const fxOpts = { element: o.element, size: o.size, seed: o.seed, grid: o.grid, ...ramps(o) }
  const frames = o.on ? spell.status(o.on, name, { element: o.element, size: o.size, grid: o.grid }) : spell.fx(name, fxOpts)
  const out = o.out ?? `${name.replace(/^fx-/, '')}${o.element ? '-' + o.element : ''}.png`
  if (o.frame != null) save(out, finish(frames[o.frame % frames.length], o).toPNG({ deflate }))
  else if (o.strip) save(out, finish(sheet(frames).image, o).toPNG({ deflate }))
  else save(out, encodeAPNG(frames.map((f) => finish(f, o)), { fps: frames.fps, deflate }))
  console.log(`${frames.length} frames @ ${frames.fps}fps, ${frames.loop ? 'loops' : 'plays once'}`)
} else if (cmd === 'fxpack') {
  const pack = spell.fxPack(args.length ? args : undefined, { deflate, grid: o.grid })
  if (o.dir) {
    mkdirSync(o.dir, { recursive: true })
    for (const [name, data] of Object.entries(pack.files)) save(join(o.dir, name), data)
  } else {
    save(o.out ?? `${pack.id}.zip`, pack.zip())
  }
  console.log(`${pack.animations.length} effects`)
} else if (cmd === 'sfx') {
  const name = args[0]
  if (!name) {
    console.log(spell.sfx.list.map((id) => `${id.padEnd(10)} ${spell.sfx.tags(id).join(', ')}`).join('\n'))
    console.error(`\n${spell.sfx.list.length} sounds · elements: ${spell.sfx.elements.join(' ')}`)
  } else {
    const sound = spell.sfx(name, { element: o.element, pitch: o.pitch, seed: o.seed, volume: o.volume })
    save(o.out ?? `${sound.id}.wav`, sound.toWAV())
    console.log(`${sound.duration.toFixed(2)}s${sound.loop ? ', seamless loop' : ''}`)
  }
} else if (cmd === 'import') {
  try {
    if (!args[0]) throw new Error('pixspell: which image? pixspell import sprite.png')
    const img = spell.readPNG(readFileSync(args[0]), (b) => inflateSync(b))
    let frames = [img]
    if (o.cell) {
      const [cw, ch] = o.cell.split('x').map(Number)
      frames = []
      for (let y = 0; y + ch <= img.h; y += ch) for (let x = 0; x + cw <= img.w; x += cw) frames.push(img.crop(x, y, cw, ch))
    }
    const id = o.id ?? args[0].replace(/^.*[\\/]/, '').replace(/\.png$/i, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const { def, code, warnings } = spell.fromImage(frames, { id })
    if (o.out) save(o.out, `// paste into a file in src/sprites/ (or spell.define() it at runtime)\nexport default ${code}\n`)
    else console.log(code)
    if (spell.list().includes(id)) console.error(`note: a built-in sprite is already called "${id}"; spell.define() needs another id (--id)`)
    if (o.preview) {
      const pid = `${id}-import-preview` // its own id, so a name taken by a built-in sprite still previews
      spell.define({ ...def, id: pid })
      const looks = [{}, { A: 'red' }, { A: 'ice' }, { A: 'gold', B: 'purple' }, { A: '#ff4fd8' }].map((r) => spell(pid, r).scale(4))
      save(o.preview, sheet(looks, { columns: looks.length, gap: 4, padding: 4, background: '#1a1f1c' }).image.toPNG({ deflate }))
    }
    console.error(`${frames.length} frame${frames.length > 1 ? 's' : ''} of ${frames[0].w}x${frames[0].h}, ramps ${Object.keys(def.ramps).join(', ')}${warnings.length ? ` (${warnings.join('; ')})` : ''}`)
  } catch (e) {
    console.error(e.message)
    process.exitCode = 1
  }
} else if (cmd === 'autotile') {
  if (!args[0]) { console.error('pixspell: which terrains? e.g. pixspell autotile water grass'); process.exitCode = 1 }
  else {
    const at = spell.autotile(args[0], args[1] ?? null, { grid: o.grid ?? 16, seed: o.seed })
    const pack = at.pack({ deflate })
    if (o.dir) {
      mkdirSync(o.dir, { recursive: true })
      for (const [n, bytes] of Object.entries(pack.files)) save(join(o.dir, n), bytes)
    } else save(o.out ?? `${pack.id}.zip`, pack.zip())
    console.log(`16 tiles of ${at.size}x${at.size}: ${args[0]} into ${args[1] ?? 'transparency'}`)
  }
} else if (cmd === 'music') {
  if (!args[0]) {
    for (const id of spell.music.list) {
      const i = spell.music.info(id)
      console.log(`${id.padEnd(12)} ${i.loop ? `${i.tempo} bpm, ${i.key} ${i.scale}, ${i.bars} bars, loops` : 'jingle'}  [${i.tags.join(', ')}]`)
    }
  } else {
    const song = spell.music(args[0], { seed: o.seed, key: o.key, tempo: o.tempo, volume: o.volume })
    save(o.out ?? `${args[0]}.wav`, song.toWAV())
    console.log(`${song.duration.toFixed(1)}s, ${song.loop ? 'seamless loop' : 'plays once'}`)
  }
} else if (cmd === 'sfxpack') {
  const pack = spell.sfxPack(args.length ? args : undefined, { element: o.element, pitch: o.pitch })
  if (o.dir) {
    mkdirSync(o.dir, { recursive: true })
    for (const [name, data] of Object.entries(pack.files)) save(join(o.dir, name), data)
  } else {
    save(o.out ?? `${pack.id}.zip`, pack.zip())
  }
  console.log(`${pack.sounds.length} sounds`)
} else if (cmd === 'export') {
  const grid = o.grid ?? 16
  const items = spell.bundle({ grid, effects: !o.noEffects, sounds: !o.noSounds, effectColors: Boolean(o.allColors) })
  const files = {}, root = `pixspell-${grid}px/`
  items.forEach((it, i) => {
    const r = it.make()
    files[root + it.path] = r.toPNG ? r.toPNG({ deflate }) : r
    if (i % 100 === 0) process.stderr.write(`\r${i}/${items.length}`)
  })
  process.stderr.write('\r')
  save(o.out ?? `pixspell-${grid}px.zip`, zip(files))
  console.log(`${items.length} files for ${grid}x${grid} tiles`)
} else if (cmd === 'hero') {
  const { fetchStats, heroOf, heroCard, heroAlt } = await import('../src/profile.js')
  try {
    if (!args[0] && !o.stats) throw new Error('pixspell: which GitHub user? pixspell hero <login>')
    const stats = o.stats ? JSON.parse(readFileSync(o.stats, 'utf8'))
      : await fetchStats(args[0], { token: process.env.GITHUB_TOKEN || process.env.GH_TOKEN || undefined })
    const hero = heroOf(stats)
    const { frames, fps } = heroCard(hero, { scale: o.scale ?? 3 })
    save(o.out ?? 'pixspell-hero.png', encodeAPNG(frames, { fps, deflate }))
    const doing = { battle: 'in battle today', quest: 'on a quest this week', rest: 'resting' }[hero.mood]
    console.log(`${heroAlt(hero)}, ${doing}`)
  } catch (e) {
    console.error(e.message)
    process.exitCode = 1
  }
} else if (cmd === 'preview') {
  const { previewSheet, describe, resolveItem, itemCode } = await import('../src/preview.js')
  try {
    if (!args.length) throw new Error(`pixspell: what should I draw? e.g. pixspell preview slime "spell.fx('meteor', { element: 'ice' })"`)
    const entries = args.map((arg) => {
      if (arg.trim().startsWith('{')) { const item = JSON.parse(arg); return { label: itemCode(item), value: resolveItem(spell, item) } }
      if (/^[a-z0-9-]+$/.test(arg)) { // a bare name: a sprite, then an effect, then a sound
        if (looks[arg]) return { label: `spell.frames('${arg}')`, value: spell.frames(arg) }
        if (spell.fx.list.includes(`fx-${arg}`)) return { label: `spell.fx('${arg}')`, value: spell.fx(arg) }
        if (spell.sfx.list.includes(arg)) return { label: `spell.sfx('${arg}')`, value: spell.sfx(arg) }
        throw new Error(`pixspell: no sprite, effect or sound named "${arg}" (pixspell list, spell.fx.list, pixspell sfx)`)
      }
      // a JavaScript expression, run like node -e with PixSpell in scope
      const value = new Function('spell', 'compose', 'sheet', 'text', 'Pixmap', `return (${arg})`)(spell, compose, sheet, text, Pixmap)
      return { label: arg, value }
    })
    save(o.out ?? 'pixspell-preview.png', previewSheet(entries, { zoom: o.zoom }).toPNG({ deflate }))
    entries.forEach((e, i) => console.log(`${i + 1}. ${e.label}  ->  ${describe(e.value)}`))
  } catch (e) {
    console.error(e.message)
    process.exitCode = 1
  }
} else if (cmd === 'doctor') {
  const ok = (m) => console.log(`✓ ${m}`), warn = (m) => console.log(`! ${m}`)
  const bad = (m) => { console.log(`✗ ${m}`); process.exitCode = 1 }
  const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..')
  const node = Number(process.versions.node.split('.')[0])
  node >= 18 ? ok(`Node ${process.versions.node}`) : bad(`Node ${process.versions.node}: PixSpell needs Node 18 or newer`)
  ok(`PixSpell ${JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8')).version} at ${pkgDir}`)
  try {
    const t = Date.now()
    const png = spell.action({ body: 'hero', hat: 'knight', hand: 'sword' }, 'attack', 'fire')[3].toPNG({ deflate })
    const wav = spell.sfx('slash', { element: 'fire' }).toWAV()
    ok(`draws and plays: an attack frame (${png.length} B PNG) and its sound (${wav.length} B WAV) in ${Date.now() - t} ms`)
  } catch (e) {
    bad(`rendering failed: ${e.message}`)
  }
  existsSync(join(process.cwd(), 'node_modules', 'pixspell', 'package.json'))
    ? ok(`this project can import { spell } from 'pixspell'`)
    : warn(`pixspell isn't in this project's node_modules: npm i pixspell, or in a browser import it from\n  https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js`)
  const bundled = readFileSync(join(pkgDir, 'skills', 'pixspell', 'SKILL.md'), 'utf8')
  const copies = []
  for (const base of [process.cwd(), homedir()]) for (const d of ['.agents', '.claude']) copies.push(join(base, d, 'skills', 'pixspell', 'SKILL.md'))
  const plugins = join(homedir(), '.claude', 'plugins', 'cache', 'pixspell', 'pixspell')
  if (existsSync(plugins)) for (const v of readdirSync(plugins)) copies.push(join(plugins, v, 'SKILL.md'))
  const found = [...new Set(copies)].filter((f) => existsSync(f))
  for (const f of found) readFileSync(f, 'utf8') === bundled ? ok(`skill up to date: ${f}`) : warn(`skill differs from this version: ${f} (pixspell skill, or update the plugin)`)
  if (!found.length) warn('no PixSpell skill for your agent yet: run `npx pixspell skill` in your project, or install the Claude Code plugin')
  console.log('\nTo let your agent look at assets, add the MCP server:  claude mcp add pixspell -- npx -y pixspell mcp')
} else if (cmd === 'mcp') {
  const { serve } = await import('./mcp.js')
  serve()
} else if (cmd === 'skill') {
  // the skill ships in the package: copy it where agents look for skills (the Agent Skills convention)
  const from = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'pixspell')
  const to = o.dir ?? join(o.claude ? '.claude' : '.agents', 'skills', 'pixspell')
  mkdirSync(to, { recursive: true })
  for (const f of ['SKILL.md', 'catalog.md']) copyFileSync(join(from, f), join(to, f))
  console.log(`installed the PixSpell skill in ${to}/\nnow ask your agent for a game, e.g. "make a top-down game where a goblin fights slimes, with sounds, using PixSpell"`)
} else if (cmd === 'outline') {
  console.log(autoOutline(readFileSync(0, 'utf8')))
} else {
  console.error(`pixspell: unknown command "${cmd}".${didYouMean(cmd, COMMANDS)}\n`)
  console.log(HELP)
  process.exitCode = 1
}
