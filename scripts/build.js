#!/usr/bin/env node
// Export every sprite + variant as ready-to-use game assets, and render the
// showcase images used in the README.
//
//   node scripts/build.js            -> assets/ + docs/img/
//
// assets/png/<id>.png        1x (16x16) PNG of every look
// assets/png@4x/<id>.png     4x PNG of every look
// assets/anim/<id>.png       animated PNG (4x) of every animated look
// assets/strips/<id>.png     horizontal frame strip (1x) for game engines
// assets/atlas.png/.json     one texture atlas with every frame of every look

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { deflateSync } from 'node:zlib'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dog, looks, sprites, compose, sheet, Pixmap, text, encodeAPNG, MATERIAL_NAMES } from '../src/index.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const deflate = (b) => deflateSync(b, { level: 9 })
const write = async (path, bytes) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, bytes)
}
const png = (img) => img.toPNG({ deflate })
const apng = (frames, fps) => encodeAPNG(frames, { fps, deflate })

// --------------------------------------------------------------- assets
async function buildAssets() {
  const out = join(root, 'assets')
  await rm(out, { recursive: true, force: true })
  const atlasFrames = []
  let files = 0
  for (const look of Object.values(looks)) {
    const { id, def } = look
    const frames = dog.frames(id)
    const still = dog(id, { frame: def.cover })
    await write(join(out, 'png', `${id}.png`), png(still))
    await write(join(out, 'png@4x', `${id}.png`), png(still.scale(4)))
    files += 2
    if (def.frames.length > 1) {
      await write(join(out, 'anim', `${id}.png`), apng(frames.map((f) => f.scale(4)), def.fps))
      const unique = def.frames.map((_, i) => dog(id, { frame: i }))
      await write(join(out, 'strips', `${id}.png`), png(sheet(unique).image))
      files += 2
    }
    def.frames.forEach((_, i) => atlasFrames.push({ name: def.frames.length > 1 ? `${id}#${i}` : id, img: dog(id, { frame: i }) }))
  }
  // walk strips for every base body in every direction (variants: use dog.walk with that body)
  for (const body of dog.char.parts.body.filter((b) => !looks[b].variant)) {
    for (const dir of dog.walk.dirs) {
      await write(join(out, 'walk', `${body}-${dir}.png`), png(sheet(dog.walk(body, dir)).image))
      files++
    }
  }
  const cols = 32
  const { image, frames } = sheet(atlasFrames.map((f) => f.img), { columns: cols })
  await write(join(out, 'atlas.png'), png(image))
  const json = {
    meta: { image: 'atlas.png', size: { w: image.w, h: image.h }, tile: 16, generator: 'dog' },
    frames: Object.fromEntries(frames.map((f, i) => [atlasFrames[i].name, f])),
    animations: Object.fromEntries(
      Object.values(looks)
        .filter((l) => l.def.frames.length > 1)
        .map((l) => [l.id, { fps: l.def.fps, frames: l.def.sequence.map((i) => `${l.id}#${i}`) }]),
    ),
  }
  await write(join(out, 'atlas.json'), JSON.stringify(json, null, 1))
  return files + 2
}

// ------------------------------------------------------------- showcase
const BG = '#15201a'
const INK = '#e8f3e4'
const DIM = '#6f8f78'
const ACCENT = '#a8e05a'

function label(str, color = DIM) {
  return text(str, { color })
}

/** Lay images in a row, vertically centered, with a gap. */
function row(items, gap = 4) {
  const h = Math.max(...items.map((i) => i.h))
  let x = 0
  const placed = items.map((img) => {
    const p = img.at(x, (h - img.h) >> 1)
    x += img.w + gap
    return p
  })
  const base = new Pixmap(Math.max(1, x - gap), h)
  return compose(base, ...placed)
}

function column(items, gap = 6, align = 'left') {
  const w = Math.max(...items.map((i) => i.w))
  let y = 0
  const placed = items.map((img) => {
    const p = img.at(align === 'center' ? (w - img.w) >> 1 : 0, y)
    y += img.h + gap
    return p
  })
  return compose(new Pixmap(w, Math.max(1, y - gap)), ...placed)
}

function framed(img, pad = 8) {
  return Pixmap.create(img.w + pad * 2, img.h + pad * 2, BG).draw(img, pad, pad)
}

// Every base sprite in one grid.
function gallery() {
  const ids = dog.list({ variants: false })
  const { image } = sheet(ids.map((id) => dog(id, { frame: looks[id].def.cover })), { columns: 14, gap: 4 })
  return framed(image, 6).scale(3)
}

// One drawing, many colors.
function recolor() {
  const potions = MATERIAL_NAMES.map((m) => dog('potion', { A: m }))
  const hexes = ['#ff5555', '#ff9f43', '#ffd93d', '#6bcB77', '#4d96ff', '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4', '#fee440', '#c0c0c0', '#8d6e63']
  const slimes = hexes.map((h) => dog('slime', { A: h }))
  const swords = ['iron', 'gold', 'ice', 'red', 'purple', 'green', 'shadow', 'bone', 'orange'].map((m) => dog('sword', { A: m, C: m === 'gold' ? 'red' : 'gold' }))
  const img = column([
    label("dog('potion', { A: material })"), row(potions, 2),
    label("dog('slime', { A: '#ANYHEX' })"), row(slimes, 2),
    label("dog('sword', { A, C })"), row(swords, 2),
  ], 4)
  return framed(img, 6).scale(3)
}

// Layers -> new sprites.
function combine() {
  const plus = label('+', INK), eq = label('=', ACCENT)
  const recipe = (parts, result) => row([...parts.flatMap((p, i) => (i ? [plus, p] : [p])), eq, result], 4)
  const hero = dog('hero'), crown = dog('crown')
  const knight = compose(dog('hero', { A: 'red' }), dog('helmet').at(0, -6))
  const mage = compose(dog('hero-mage'), dog('wizard-hat').at(1, -9), dog('staff').at(7, 2))
  const king = compose(hero, crown.at(0, -7))
  const pup = compose(dog('dog'), dog('wizard-hat', { A: 'pink' }).at(4, -8))
  const ring = compose(dog('ring', { C: 'blue' }), dog('sparkle', { frame: 2, A: 'ice' }).at(6, -6))
  const img = column([
    recipe([hero, crown], king),
    recipe([dog('hero', { A: 'red' }), dog('helmet')], knight),
    recipe([dog('hero-mage'), dog('wizard-hat'), dog('staff')], mage),
    recipe([dog('dog'), dog('wizard-hat', { A: 'pink' })], pup),
    recipe([dog('ring', { C: 'blue' }), dog('sparkle', { frame: 2, A: 'ice' })], ring),
  ], 6)
  return framed(img, 6).scale(3)
}

// Size: crisp upscale, Scale2x smoothing, majority downscale.
function sizes() {
  const s = dog('slime-pink')
  const big = s.scale(4)
  const items = [
    column([s.scale(4).crop(0, 0, 1, 1).opacity(0), s, label('1X')], 4, 'center'),
    column([s.scale(2), label('2X')], 4, 'center'),
    column([big, label('4X')], 4, 'center'),
    column([s.smooth(2), label('SMOOTH')], 4, 'center'),
    column([big.scale(0.5), label('1/2')], 4, 'center'),
    column([s.outline('#ffffff').scale(2), label('OUTLINE')], 4, 'center'),
    column([s.shadow('#00000088', 2, 2).scale(2), label('SHADOW')], 4, 'center'),
    column([s.flipX().hue(150).scale(2), label('FLIP+HUE')], 4, 'center'),
  ]
  return framed(row(items, 10), 8).scale(3)
}

// Animated scene built only from sprites in this repo.
function scene() {
  const W = 12, H = 7
  const fpsBase = 8, nFrames = 24
  const frameOf = (id, t) => {
    const look = looks[id]
    const seq = look.def.sequence
    const i = seq[Math.floor((t * look.def.fps) / fpsBase) % seq.length]
    return dog(id, { frame: i })
  }
  const frames = []
  for (let t = 0; t < nFrames; t++) {
    let img = new Pixmap(W * 16, H * 16)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tile = y >= 5 ? frameOf('water', t) : y === 4 && x > 7 ? dog('dirt-sand') : dog('grass')
      img = img.draw(tile, x * 16, y * 16)
    }
    const place = (id, x, y) => { img = img.draw(id instanceof Pixmap ? id : frameOf(id, t), x, y) }
    place('tree', 4, 4); place('tree-autumn', 22, 14); place('tree', 160, 2); place('tree-cherry', 140, 18)
    place('bush', 52, 8); place('rock-mossy', 114, 54); place('flower', 40, 40); place('flower-blue', 98, 26)
    place('flower-sun', 66, 66); place('sign', 172, 50)
    place('campfire', 74, 34)
    place('dog', 52, 36)
    place(compose(dog('hero'), dog('crown').at(0, -7)), 96, 40)
    place('slime', 132, 40); place('slime-blue', 150, 30)
    place('chest-gold', 8, 48); place('coin', 28, 52)
    place('ghost', 172, 14)
    place('bat', 120, 6 + Math.round(Math.sin((t / nFrames) * Math.PI * 2) * 3))
    place('chick', 140, 60)
    place('fish-salmon', 40 + ((t * 2) % 160), 92)
    const walker = dog.walk({ body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }, 'left')
    place(walker[t % walker.length], 186 - t * 3, 58)
    if (t >= 10 && t < 18) place(frameOf('sparkle', t - 10), 26, 40)
    frames.push(img.scale(3))
  }
  return frames
}

function banner() {
  const ids = ['dog', 'slime', 'coin', 'torch', 'ghost', 'potion-mana', 'sword-gold', 'chick', 'bat', 'explosion', 'eye', 'campfire', 'cat']
  const n = 16
  const title = text('DOG', { color: ACCENT }).scale(3)
  const sub = text('DOTS OF GAMES', { color: DIM })
  const frames = []
  for (let t = 0; t < n; t++) {
    const sprites = ids.map((id) => {
      const look = looks[id]
      const seq = look.def.sequence
      return dog(id, { frame: seq[Math.floor((t * look.def.fps) / 8) % seq.length] })
    })
    const img = column([row([title, sub], 6), row(sprites, 6)], 6)
    frames.push(framed(img, 8).scale(3))
  }
  return frames
}

// Random characters from dog.char.random(seed) - deterministic, so the image is stable.
function characters() {
  const specs = Array.from({ length: 24 }, (_, i) => dog.char.random(i + 1))
  const all = specs.map((s) => dog.char.frames(s))
  const n = 12
  const title = text(`DOG.CHAR.RANDOM()  ${dog.char.count().toLocaleString('en-US')} COMBINATIONS`, { color: DIM })
  return Array.from({ length: n }, (_, t) => {
    const { image } = sheet(all.map((f) => f[t % f.length]), { columns: 8, gap: 2 })
    return framed(column([title, image], 6), 6).scale(3)
  })
}

// Every action in every element, played by a character that fits it.
function actions() {
  const cast = {
    attack: { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' },
    hit: { body: 'skeleton', hat: 'viking', hand: 'axe' },
    heal: { body: 'hero-elf', hat: 'band', hand: 'flower' },
    levelup: { body: 'hero', hat: 'crown', hand: 'sword-gold' },
    cast: { body: 'hero-mage', hat: 'wizard', hand: 'staff' },
    death: { body: 'slime-purple', hat: 'party' },
  }
  const elements = [null, ...dog.action.elements]
  const grid = dog.action.list.map((name) => elements.map((el) => dog.action(cast[name], name, el ?? undefined)))
  const cellW = 32, labelW = 34, gap = 4
  return Array.from({ length: 8 }, (_, t) => {
    let img = new Pixmap(labelW + elements.length * (cellW + gap), 10 + grid.length * (cellW + gap))
    elements.forEach((el, c) => {
      const l = text((el ?? 'default').toUpperCase(), { color: DIM })
      img = img.draw(l, labelW + c * (cellW + gap) + ((cellW - l.w) >> 1), 0)
    })
    grid.forEach((cells, r) => {
      const y = 10 + r * (cellW + gap)
      img = img.draw(text(dog.action.list[r].toUpperCase(), { color: ACCENT }), 0, y + 14)
      cells.forEach((frames, c) => { img = img.draw(frames[t], labelW + c * (cellW + gap), y) })
    })
    return framed(img, 8).scale(3)
  })
}

// Walk cycles in all four directions.
function walks() {
  const cast = [
    { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' },
    { body: 'heroine', hat: 'wizard', hand: 'staff', offhand: 'orb' },
    { body: 'skeleton', hat: 'pirate', hand: 'scythe' },
    { body: 'heroine-blonde', hat: 'cowboy', hand: 'rod' },
    { body: 'hero-orc', hat: 'horns', hand: 'hammer', offhand: 'buckler' },
    { body: 'dog-shiba', hat: 'party' },
  ]
  const grid = dog.walk.dirs.map((dir) => cast.map((c) => dog.walk(c, dir)))
  const cell = 24, gap = 4, labelW = 26
  return Array.from({ length: 8 }, (_, t) => {
    let img = new Pixmap(labelW + cast.length * (cell + gap), grid.length * (cell + gap))
    grid.forEach((row, r) => {
      img = img.draw(text(dog.walk.dirs[r].toUpperCase(), { color: ACCENT }), 0, r * (cell + gap) + 10)
      row.forEach((frames, c) => { img = img.draw(frames[t % frames.length], labelW + c * (cell + gap), r * (cell + gap)) })
    })
    return framed(img, 8).scale(3)
  })
}

// 1280x640 image for GitHub's social preview (Settings -> General -> Social preview).
function social() {
  let img = Pixmap.create(320, 160, BG)
  img = img.draw(text('DOG', { color: ACCENT }).scale(5), 16, 18)
  img = img.draw(text('DOTS OF GAMES', { color: DIM }), 16, 48)
  const lines = [
    ['PIXEL ART AS CODE', INK],
    [`${dog.char.count().toLocaleString('en-US')} CHARACTERS`, ACCENT],
    ['WALK - ATTACK - CAST - LEVEL UP', INK],
    ['FREE - CC0 - ZERO DEPENDENCIES', DIM],
  ]
  lines.forEach(([str, color], i) => { img = img.draw(text(str, { color }), 16, 70 + i * 11) })
  img = img.draw(text('GITHUB.COM/OLEBANGPAD/DOG', { color: ACCENT }), 16, 136)
  const chars = Array.from({ length: 20 }, (_, i) => dog.char(dog.char.random(i + 40)))
  const { image } = sheet(chars, { columns: 5, gap: 2 })
  img = img.draw(image, 320 - image.w - 14, (160 - image.h) >> 1)
  return img.scale(4)
}

async function buildShowcase() {
  const dir = join(root, 'docs', 'img')
  await write(join(dir, 'gallery.png'), png(gallery()))
  await write(join(dir, 'recolor.png'), png(recolor()))
  await write(join(dir, 'combine.png'), png(combine()))
  await write(join(dir, 'size.png'), png(sizes()))
  await write(join(dir, 'scene.png'), apng(scene(), 8))
  await write(join(dir, 'banner.png'), apng(banner(), 8))
  await write(join(dir, 'characters.png'), apng(characters(), 6))
  await write(join(dir, 'actions.png'), apng(actions(), 10))
  await write(join(dir, 'walk.png'), apng(walks(), 6))
  await write(join(dir, 'social.png'), png(social()))
}

const t0 = Date.now()
const files = await buildAssets()
await buildShowcase()
console.log(`dog: ${Object.keys(sprites).length} sprites, ${Object.keys(looks).length} looks -> ${files} asset files + showcase in ${Date.now() - t0}ms`)
