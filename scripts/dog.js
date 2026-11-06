#!/usr/bin/env node
// Command line for DOG.
//
//   node scripts/dog.js list [category]
//   node scripts/dog.js render potion -A gold --scale 8 --outline '#fff' -o potion.png
//   node scripts/dog.js render slime -A '#ff4fd8' --anim -o slime.png     (animated PNG)
//   node scripts/dog.js combine hero crown@0,-7 --scale 6 -o king.png
//   node scripts/dog.js outline < my-art.txt                              (auto-outline helper)

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { deflateSync } from 'node:zlib'
import { dog, looks, sprites, compose, sheet, encodeAPNG, MATERIAL_NAMES } from '../src/index.js'

const HELP = `dog - pixel art as code

usage:
  dog list [category]                      list every sprite look
  dog info <id>                            size, slots, variants, frames
  dog render <id> [options] -o out.png     export one sprite
  dog combine <id>[@x,y] <id>[@x,y] ...    stack sprites into one image
  dog char <body> [--hat x] [--hand x] [--offhand x] [-A color] -o out.png
  dog char --random [seed] -o out.png      a random character (same seed, same character)
  dog char <body> ... --action attack [--element fire] --anim -o hit.png
                                           actions: attack hit heal levelup cast death
  dog char <body> ... --walk left --anim -o walk.png   directions: down up left right
  dog pack <body> [--hat x] [--hand x] [--offhand x] [-A color] [--element fire] [-o hero.zip | --dir out/]
                                           game pack: sprite sheet + Phaser/Aseprite JSON + Godot .tres
  dog fx <name> [--element ice] [--size 64] [--seed n] [--on <body>] -o out.png
                                           procedural effect as an animated PNG (--strip: frame strip,
                                           --frame n: one frame, --on slime: on a character as a status)
  dog fxpack [name ...] [-o effects.zip | --dir out/]   effects as one game pack (default: all of them)
  dog sfx <name> [--element fire] [--pitch 1.2] [--seed n] [--volume 0.8] -o out.wav
                                           a sound effect as a WAV file (dog sfx alone lists them)
  dog sfxpack [name ...] [-o sounds.zip | --dir out/]   sounds as WAV files in one zip (default: all)
  dog outline                              read text art on stdin, add # outlines
  dog materials                            list named materials

options:
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
  -o <file>                    output path (default: <id>.png)
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
    else if (a === '--size') opts.size = Number(next())
    else if (a === '--seed') opts.seed = Number(next())
    else if (a === '--on') opts.on = next()
    else if (a === '--pitch') opts.pitch = Number(next())
    else if (a === '--volume') opts.volume = Number(next())
    else if (a === '-h' || a === '--help') opts.help = true
    else opts._.push(a)
  }
  return opts
}

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
const ramps = (o) => Object.fromEntries(['A', 'B', 'C'].filter((k) => o[k]).map((k) => [k, o[k]]))

function autoOutline(src) {
  const rows = src.split('\n').map((l) => l.trim()).filter(Boolean)
  const w = Math.max(...rows.map((r) => r.length)) + 2
  const g = ['', ...rows, ''].map((r) => ('.' + r).padEnd(w, '.'))
  const filled = (x, y) => y >= 0 && y < g.length && x >= 0 && x < w && g[y][x] !== '.'
  return g.map((r, y) => [...r].map((ch, x) => ch !== '.' ? ch
    : filled(x - 1, y) || filled(x + 1, y) || filled(x, y - 1) || filled(x, y + 1) ? '#' : '.').join('')).join('\n')
}

const o = parse(process.argv.slice(2))
const [cmd, ...args] = o._

if (!cmd || o.help) {
  console.log(HELP)
} else if (cmd === 'list') {
  const ids = dog.list({ category: args[0] })
  console.log(ids.join('\n'))
  console.error(`\n${ids.length} looks`)
} else if (cmd === 'materials') {
  console.log(MATERIAL_NAMES.join('\n'))
} else if (cmd === 'info') {
  const { def, ramps: r } = dog.info(args[0])
  console.log({ id: args[0], size: `${def.w}x${def.h}`, category: def.category, slots: def.slots, ramps: r, frames: def.frames.length, fps: def.fps, variants: Object.keys(def.variants) })
} else if (cmd === 'render') {
  const id = args[0]
  if (!looks[id]) throw new Error(`unknown sprite "${id}" - run: dog list`)
  const out = o.out ?? `${id}.png`
  if (o.anim) {
    const frames = dog.frames(id, ramps(o)).map((f) => finish(f, o))
    save(out, encodeAPNG(frames, { fps: looks[id].def.fps, deflate }))
  } else {
    save(out, finish(dog(id, { ...ramps(o), frame: o.frame ?? looks[id].def.cover }), o).toPNG({ deflate }))
  }
} else if (cmd === 'combine') {
  const layers = args.map((spec) => {
    const [id, pos = '0,0'] = spec.split('@')
    const [x, y] = pos.split(',').map(Number)
    return dog(id).at(x, y)
  })
  save(o.out ?? 'combined.png', finish(compose(layers), o).toPNG({ deflate }))
} else if (cmd === 'char') {
  const spec = o.random ? dog.char.random(o.random === true ? undefined : o.random)
    : { body: args[0] ?? 'hero', hat: o.hat, hand: o.hand, offhand: o.offhand, ...ramps(o) }
  console.log(spec)
  const name = o.out ?? `${spec.body}${o.walk ? '-walk-' + o.walk : o.action ? '-' + o.action : ''}.png`
  const frames = o.walk ? dog.walk(spec, o.walk) : o.action ? dog.action(spec, o.action, o.element) : dog.char.frames(spec)
  const fps = frames.fps ?? looks[spec.body].def.fps
  if (o.anim) save(name, encodeAPNG(frames.map((f) => finish(f, o)), { fps, deflate }))
  else if (o.strip || o.action || o.walk) save(name, finish(sheet(frames).image, o).toPNG({ deflate }))
  else save(name, finish(dog.char(spec), o).toPNG({ deflate }))
} else if (cmd === 'pack') {
  const spec = o.random ? dog.char.random(o.random === true ? undefined : o.random)
    : { body: args[0] ?? 'hero', hat: o.hat, hand: o.hand, offhand: o.offhand, ...ramps(o) }
  for (const k of Object.keys(spec)) if (spec[k] == null) delete spec[k]
  const pack = dog.pack(spec, { element: o.element, deflate })
  if (o.dir) {
    mkdirSync(o.dir, { recursive: true })
    for (const [name, data] of Object.entries(pack.files)) save(join(o.dir, name), data)
  } else {
    save(o.out ?? `${pack.id}.zip`, pack.zip())
  }
  console.log(`${pack.animations.length} animations: ${pack.animations.join(', ')}`)
} else if (cmd === 'fx') {
  const name = args[0]
  if (!name) throw new Error(`which effect? one of:\n${dog.fx.list.map((id) => id.replace(/^fx-/, '')).join(' ')}`)
  const fxOpts = { element: o.element, size: o.size, seed: o.seed, ...ramps(o) }
  const frames = o.on ? dog.status(o.on, name, { element: o.element, size: o.size }) : dog.fx(name, fxOpts)
  const out = o.out ?? `${name.replace(/^fx-/, '')}${o.element ? '-' + o.element : ''}.png`
  if (o.frame != null) save(out, finish(frames[o.frame % frames.length], o).toPNG({ deflate }))
  else if (o.strip) save(out, finish(sheet(frames).image, o).toPNG({ deflate }))
  else save(out, encodeAPNG(frames.map((f) => finish(f, o)), { fps: frames.fps, deflate }))
  console.log(`${frames.length} frames @ ${frames.fps}fps, ${frames.loop ? 'loops' : 'plays once'}`)
} else if (cmd === 'fxpack') {
  const pack = dog.fxPack(args.length ? args : undefined, { deflate })
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
    console.log(dog.sfx.list.map((id) => `${id.padEnd(10)} ${dog.sfx.tags(id).join(', ')}`).join('\n'))
    console.error(`\n${dog.sfx.list.length} sounds · elements: ${dog.sfx.elements.join(' ')}`)
  } else {
    const sound = dog.sfx(name, { element: o.element, pitch: o.pitch, seed: o.seed, volume: o.volume })
    save(o.out ?? `${sound.id}.wav`, sound.toWAV())
    console.log(`${sound.duration.toFixed(2)}s${sound.loop ? ', seamless loop' : ''}`)
  }
} else if (cmd === 'sfxpack') {
  const pack = dog.sfxPack(args.length ? args : undefined, { element: o.element, pitch: o.pitch })
  if (o.dir) {
    mkdirSync(o.dir, { recursive: true })
    for (const [name, data] of Object.entries(pack.files)) save(join(o.dir, name), data)
  } else {
    save(o.out ?? `${pack.id}.zip`, pack.zip())
  }
  console.log(`${pack.sounds.length} sounds`)
} else if (cmd === 'outline') {
  console.log(autoOutline(readFileSync(0, 'utf8')))
} else {
  console.error(`unknown command "${cmd}"\n`)
  console.log(HELP)
  process.exitCode = 1
}
