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
// assets/sfx/<id>.wav        every sound effect (16-bit mono WAV)

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { deflateSync, inflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spell, looks, sprites, compose, sheet, Pixmap, text, encodeAPNG, MATERIAL_NAMES, MATERIALS as MATERIALS_FOR_DOCS } from '../src/index.js'
import { heroOf, heroCard } from '../src/profile.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const deflate = (b) => deflateSync(b, { level: 9 })
const madeDirs = new Set()
const write = async (path, bytes) => {
  const dir = dirname(path)
  if (!madeDirs.has(dir)) { await mkdir(dir, { recursive: true }); madeDirs.add(dir) }
  await writeFile(path, bytes)
}
const png = (img) => img.toPNG({ deflate })

const apng = (frames, fps) => encodeAPNG(frames, { fps, deflate })

// --------------------------------------------------------------- assets
async function buildAssets() {
  const out = join(root, 'assets')
  await rm(out, { recursive: true, force: true })
  madeDirs.clear()
  const atlasFrames = []
  let files = 0
  for (const look of Object.values(looks)) {
    const { id, def } = look
    const frames = spell.frames(id)
    const still = spell(id, { frame: def.cover })
    await write(join(out, 'png', `${id}.png`), png(still))
    await write(join(out, 'png@4x', `${id}.png`), png(still.scale(4)))
    files += 2
    if (def.frames.length > 1) {
      await write(join(out, 'anim', `${id}.png`), apng(frames.map((f) => f.scale(4)), def.fps))
      const unique = def.frames.map((_, i) => spell(id, { frame: i }))
      await write(join(out, 'strips', `${id}.png`), png(sheet(unique).image))
      files += 2
    }
    def.frames.forEach((_, i) => atlasFrames.push({ name: def.frames.length > 1 ? `${id}#${i}` : id, img: spell(id, { frame: i }) }))
  }
  // walk strips for every base body in every direction (variants: use spell.walk with that body)
  for (const body of spell.char.parts.body.filter((b) => !looks[b].variant)) {
    for (const dir of [...spell.walk.dirs, ...spell.walk.diagonals]) {
      await write(join(out, 'walk', `${body}-${dir}.png`), png(sheet(spell.walk(body, dir)).image))
      files++
    }
  }
  const cols = 32
  const { image, frames } = sheet(atlasFrames.map((f) => f.img), { columns: cols })
  await write(join(out, 'atlas.png'), png(image))
  // TexturePacker "JSON hash": Phaser load.atlas(), PixiJS and most engines read it directly.
  const json = {
    frames: Object.fromEntries(frames.map((f, i) => [atlasFrames[i].name, {
      frame: { x: f.x, y: f.y, w: f.w, h: f.h }, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h }, sourceSize: { w: f.w, h: f.h },
    }])),
    meta: { app: 'https://github.com/olebangpad/pixspell', version: '1', image: 'atlas.png', format: 'RGBA8888', size: { w: image.w, h: image.h }, scale: '1' },
    // not part of the TexturePacker format, ignored by loaders: frame names per animation
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
  const ids = spell.list({ variants: false })
  const { image } = sheet(ids.map((id) => spell(id, { frame: looks[id].def.cover })), { columns: 14, gap: 4 })
  return framed(image, 6).scale(3)
}

// One drawing, many colors.
function recolor() {
  const potions = MATERIAL_NAMES.map((m) => spell('potion', { A: m }))
  const hexes = ['#ff5555', '#ff9f43', '#ffd93d', '#6bcB77', '#4d96ff', '#9b5de5', '#f15bb5', '#00bbf9', '#00f5d4', '#fee440', '#c0c0c0', '#8d6e63']
  const slimes = hexes.map((h) => spell('slime', { A: h }))
  const swords = ['iron', 'gold', 'ice', 'red', 'purple', 'green', 'shadow', 'bone', 'orange'].map((m) => spell('sword', { A: m, C: m === 'gold' ? 'red' : 'gold' }))
  const img = column([
    label("spell('potion', { A: material })"), row(potions, 2),
    label("spell('slime', { A: '#ANYHEX' })"), row(slimes, 2),
    label("spell('sword', { A, C })"), row(swords, 2),
  ], 4)
  return framed(img, 6).scale(3)
}

// Layers -> new sprites.
function combine() {
  const plus = label('+', INK), eq = label('=', ACCENT)
  const recipe = (parts, result) => row([...parts.flatMap((p, i) => (i ? [plus, p] : [p])), eq, result], 4)
  const hero = spell('hero'), crown = spell('crown')
  const knight = compose(spell('hero', { A: 'red' }), spell('helmet').at(0, -6))
  const mage = compose(spell('hero-mage'), spell('wizard-hat').at(1, -9), spell('staff').at(7, 2))
  const king = compose(hero, crown.at(0, -7))
  const pup = compose(spell('dog'), spell('wizard-hat', { A: 'pink' }).at(4, -8))
  const ring = compose(spell('ring', { C: 'blue' }), spell('sparkle', { frame: 2, A: 'ice' }).at(6, -6))
  const img = column([
    recipe([hero, crown], king),
    recipe([spell('hero', { A: 'red' }), spell('helmet')], knight),
    recipe([spell('hero-mage'), spell('wizard-hat'), spell('staff')], mage),
    recipe([spell('dog'), spell('wizard-hat', { A: 'pink' })], pup),
    recipe([spell('ring', { C: 'blue' }), spell('sparkle', { frame: 2, A: 'ice' })], ring),
  ], 6)
  return framed(img, 6).scale(3)
}

// Size: crisp upscale, Scale2x smoothing, majority downscale.
function sizes() {
  const s = spell('slime-pink')
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
    return spell(id, { frame: i })
  }
  const frames = []
  for (let t = 0; t < nFrames; t++) {
    let img = new Pixmap(W * 16, H * 16)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const tile = y >= 5 ? frameOf('water', t) : y === 4 && x > 7 ? spell('dirt-sand') : spell('grass')
      img = img.draw(tile, x * 16, y * 16)
    }
    const place = (id, x, y) => { img = img.draw(id instanceof Pixmap ? id : frameOf(id, t), x, y) }
    place('tree', 4, 4); place('tree-autumn', 22, 14); place('tree', 160, 2); place('tree-cherry', 140, 18)
    place('bush', 52, 8); place('rock-mossy', 114, 54); place('flower', 40, 40); place('flower-blue', 98, 26)
    place('flower-sun', 66, 66); place('sign', 172, 50)
    place('campfire', 74, 34)
    place('dog', 52, 36)
    place(compose(spell('hero'), spell('crown').at(0, -7)), 96, 40)
    place('slime', 132, 40); place('slime-blue', 150, 30)
    place('chest-gold', 8, 48); place('coin', 28, 52)
    place('ghost', 172, 14)
    place('bat', 120, 6 + Math.round(Math.sin((t / nFrames) * Math.PI * 2) * 3))
    place('chick', 140, 60)
    place('fish-salmon', 40 + ((t * 2) % 160), 92)
    const walker = spell.walk({ body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }, 'left')
    place(walker[t % walker.length], 186 - t * 3, 58)
    if (t >= 10 && t < 18) place(frameOf('sparkle', t - 10), 26, 40)
    frames.push(img.scale(3))
  }
  return frames
}

function banner() {
  const ids = ['dog', 'slime', 'coin', 'torch', 'ghost', 'potion-mana', 'sword-gold', 'chick', 'bat', 'explosion', 'eye', 'campfire', 'cat']
  const n = 16
  const title = text('PIXSPELL', { color: ACCENT }).scale(3)
  const sub = text('GAME ASSETS AS CODE', { color: DIM })
  const frames = []
  for (let t = 0; t < n; t++) {
    const sprites = ids.map((id) => {
      const look = looks[id]
      const seq = look.def.sequence
      return spell(id, { frame: seq[Math.floor((t * look.def.fps) / 8) % seq.length] })
    })
    const img = column([row([title, sub], 6), row(sprites, 6)], 6)
    frames.push(framed(img, 8).scale(3))
  }
  return frames
}

// Random characters from spell.char.random(seed) - deterministic, so the image is stable.
function characters() {
  const specs = Array.from({ length: 24 }, (_, i) => spell.char.random(i + 1))
  const all = specs.map((s) => spell.char.frames(s))
  const n = 12
  const title = text(`PixSpell.CHAR.RANDOM()  ${spell.char.count().toLocaleString('en-US')} COMBINATIONS`, { color: DIM })
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
  const elements = [null, ...spell.action.elements]
  const grid = spell.action.list.map((name) => elements.map((el) => spell.action(cast[name], name, el ?? undefined)))
  const cellW = 32, labelW = 34, gap = 4
  return Array.from({ length: 8 }, (_, t) => {
    let img = new Pixmap(labelW + elements.length * (cellW + gap), 10 + grid.length * (cellW + gap))
    elements.forEach((el, c) => {
      const l = text((el ?? 'default').toUpperCase(), { color: DIM })
      img = img.draw(l, labelW + c * (cellW + gap) + ((cellW - l.w) >> 1), 0)
    })
    grid.forEach((cells, r) => {
      const y = 10 + r * (cellW + gap)
      img = img.draw(text(spell.action.list[r].toUpperCase(), { color: ACCENT }), 0, y + 14)
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
  const dirs = [...spell.walk.dirs, ...spell.walk.diagonals]
  const label = (d) => d.replace('down-', 'DN-').replace('up-', 'UP-').replace(/-(right|left)$/, (_, x) => `-${x[0]}`).toUpperCase()
  const grid = dirs.map((dir) => cast.map((c) => spell.walk(c, dir)))
  const cell = 24, gap = 4, labelW = 26
  return Array.from({ length: 8 }, (_, t) => {
    let img = new Pixmap(labelW + cast.length * (cell + gap), grid.length * (cell + gap))
    grid.forEach((row, r) => {
      img = img.draw(text(label(dirs[r]), { color: ACCENT }), 0, r * (cell + gap) + 10)
      row.forEach((frames, c) => { img = img.draw(frames[t % frames.length], labelW + c * (cell + gap), r * (cell + gap)) })
    })
    return framed(img, 8).scale(3)
  })
}

// Every procedural effect, animated, labeled.
function fxShowcase() {
  const ids = spell.fx.list
  const all = ids.map((id) => spell.frames(id))
  const cols = 7, cell = 32, gap = 10, labelH = 8
  const rows = Math.ceil(ids.length / cols)
  const steps = 16
  return Array.from({ length: steps }, (_, t) => {
    let img = new Pixmap(cols * (cell + gap) - gap, rows * (cell + labelH + gap) - gap)
    ids.forEach((id, i) => {
      const x = (i % cols) * (cell + gap), y = Math.floor(i / cols) * (cell + labelH + gap)
      const frames = all[i]
      img = img.draw(frames[t % frames.length], x, y)
      const name = id.replace(/^fx-/, '').toUpperCase().slice(0, 9)
      const l = text(name, { color: DIM })
      img = img.draw(l, x + ((cell - l.w) >> 1), y + cell + 2)
    })
    return framed(img, 8).scale(3)
  })
}

// 1280x640 image for GitHub's social preview (Settings -> General -> Social preview).
function social() {
  let img = Pixmap.create(320, 160, BG)
  img = img.draw(text('PIXSPELL', { color: ACCENT }).scale(5), 16, 18)
  img = img.draw(text('GAME ASSETS AS CODE', { color: DIM }), 16, 48)
  const lines = [
    [`665 EFFECTS - ${spell.sfx.list.length} SOUNDS - ${spell.music.list.length} SONGS`, INK],
    [`${spell.char.count().toLocaleString('en-US')} CHARACTERS`, ACCENT],
    ['WALK - ATTACK - CAST - LEVEL UP', INK],
    ['FREE - CC0 - ZERO DEPENDENCIES', DIM],
  ]
  lines.forEach(([str, color], i) => { img = img.draw(text(str, { color }), 16, 70 + i * 11) })
  img = img.draw(text('GITHUB.COM/OLEBANGPAD/PIXSPELL', { color: ACCENT }), 16, 136)
  const chars = Array.from({ length: 20 }, (_, i) => spell.char(spell.char.random(i + 40)))
  const { image } = sheet(chars, { columns: 5, gap: 2 })
  img = img.draw(image, 320 - image.w - 14, (160 - image.h) >> 1)
  return img.scale(4)
}

// The same art at every tile grid (8, 16, 32, 64), zoomed so each row is the same size on screen:
// what changes is how many pixels draw it.
function gridsShowcase() {
  const BOX = 136, PAD = 8, BG = '#16201a'
  const items = [
    (g) => spell('sword', { grid: g }), (g) => spell('potion-mana', { grid: g }), (g) => spell('slime-pink', { grid: g, frame: 0 }),
    (g) => spell('chest-gold', { grid: g }), (g) => spell.char({ body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield', grid: g }),
    (g) => spell('fx-meteor', { grid: g, frame: 7 }),
  ]
  const rows = spell.grids.map((g) => {
    const zoom = 64 / g // a 16 px tile always shows 64 px wide
    const tiles = items.map((make) => {
      const img = make(g).scale(zoom)
      return Pixmap.create(BOX, BOX, BG).draw(img, (BOX - img.w) >> 1, (BOX - img.h) >> 1)
    })
    const row = sheet(tiles, { columns: items.length, gap: PAD }).image
    const tag = text(`${g}X${g}`, { color: '#a8e05a' }).scale(4)
    return new Pixmap(row.w + 132, row.h).draw(tag, 8, (row.h - tag.h) >> 1).draw(row, 132, 0)
  })
  return sheet(rows, { columns: 1, gap: PAD, padding: 12, background: '#0f1712' }).image
}

// The README's showcase: one 256 px animated tile per idea, each made by the one line of code captioned under it.
// Most are drawn on a 64 px stage and zoomed 4x; returns { name: { frames, fps } }.
function showTiles() {
  const L = 64, Z = 4, BG = '#101712'
  const stage = () => Pixmap.create(L, L, BG)
  const center = (img, sprite, zoom = 1, dy = 0) => {
    const s = zoom === 1 ? sprite : sprite.scale(zoom)
    return img.draw(s, (L - s.w) >> 1, ((L - s.h) >> 1) + dy)
  }
  const tile = (frames, fps) => ({ frames: frames.map((f) => f.scale(Z)), fps })
  const knight = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }
  const mage = { body: 'heroine', hat: 'wizard', hand: 'staff' }

  // a mage walking right over scrolling grass (a 32 px stage at 2x)
  const walk = () => {
    const w = spell.walk(mage, 'right')
    return Array.from({ length: 16 }, (_, i) => {
      let img = Pixmap.create(32, 32, BG)
      const off = (i * 2) % 32
      for (let x = -off; x < 48; x += 16) img = img.draw(spell('grass'), x, 22)
      for (const [id, x, y] of [['flower', 30, 19], ['rock', 14, 22]]) for (const k of [0, 32]) img = img.draw(spell(id), x - off + k, y)
      return img.draw(w[Math.floor(i / 2) % w.length], 4, 1).scale(2)
    })
  }
  const hexes = ['#ff4fd8', '#4fc3ff', '#ffd23f', '#7cff6b', '#b388ff', '#ff6b4f', '#4fffd2', '#ffffff']
  const slimes = hexes.flatMap((A) => { const f = spell.frames('slime', { A }); return [0, 0, 1, 1].map((j) => center(stage(), f[j % f.length], 2)) })
  const chars = Array.from({ length: 8 }, (_, i) => spell.char.frames(spell.char.random(i + 7)))
    .flatMap((f) => [0, 0, 1, 1].map((j) => center(stage(), f[j % f.length], 2)))
  const meteor = spell.fx('meteor', { element: 'ice', size: 64 })
  const pad = (frames, n) => [...frames, ...Array.from({ length: n }, () => new Pixmap(frames[0].w, frames[0].h))]

  // the same knight at every tile grid, shown the same size: 12, 24, 48 and 96 px drawn into 192 px
  const grids = spell.grids.flatMap((g) => {
    const c = spell.char({ ...knight, grid: g })
    const big = c.scale(192 / c.w)
    const img = Pixmap.create(L * Z, L * Z, BG).draw(big, (L * Z - big.w) >> 1, L * Z - big.h - 12)
      .draw(text(`${g}X${g}`, { color: ACCENT }).scale(4), 12, 12)
    return Array(6).fill(img)
  })

  return {
    characters: tile(chars, 6),
    attack: tile(spell.action(knight, 'attack', 'fire').map((f) => center(stage(), f, 2)), 12),
    meteor: tile(pad(meteor, 4).map((f) => center(stage(), f)), meteor.fps),
    walk: { frames: walk().map((f) => f.scale(Z)), fps: 10 },
    recolor: tile(slimes, 8),
    tornado: (() => { const f = spell.fx('tornado', { element: 'fire', size: 64 }); return tile(f.map((x) => center(stage(), x)), f.fps) })(),
    grids: { frames: grids, fps: 6 },
    status: (() => { const f = spell.status({ body: 'skeleton', hat: 'viking', hand: 'axe' }, 'burning'); return tile(f.map((x) => center(stage(), x, 2)), 8) })(),
    levelup: (() => { const f = spell.action({ body: 'hero', hat: 'crown', hand: 'sword-gold' }, 'levelup'); return tile(f.map((x) => center(stage(), x, 2)), f.fps) })(),
  }
}

// Every monster, idling, with its name; each one is also a character body (hats, walks, actions)
function monstersShowcase() {
  const ids = Object.values(sprites).filter((d) => d.category === 'monsters').map((d) => d.id)
  const all = ids.map((id) => spell.frames(id))
  const cols = 7, col = 32, cell = 16, gapY = 8, labelH = 8
  const rows = Math.ceil(ids.length / cols)
  const short = { 'baby-dragon': 'dragon', jellyfish: 'jelly' }
  return Array.from({ length: 8 }, (_, t) => {
    let img = new Pixmap(cols * col, rows * (cell + labelH + gapY) - gapY)
    ids.forEach((id, i) => {
      const x = (i % cols) * col, y = Math.floor(i / cols) * (cell + labelH + gapY)
      const f = all[i]
      img = img.draw(f[Math.floor(t / 2) % f.length], x + ((col - cell) >> 1), y)
      const l = text((short[id] ?? id).toUpperCase().slice(0, 8), { color: DIM })
      img = img.draw(l, x + ((col - l.w) >> 1), y + cell + 2)
    })
    return framed(img, 8).scale(3)
  })
}

// The UI kit put together: panels stretched with nineSlice, an inventory, bars, buttons and icons
function uiShowcase() {
  let img = Pixmap.create(240, 128, '#2f5a3a')
  for (let y = 0; y < 128; y += 16) for (let x = 0; x < 240; x += 16) img = img.draw(spell('grass'), x, y)
  const put = (p, x, y) => { img = img.draw(p, x, y) }
  // HUD: hearts, bars
  ;['heart', 'heart', 'heart-half', 'heart-empty'].forEach((h, i) => put(spell(h), 4 + i * 14, 2))
  const bar = (kind, fill) => spell('bar-empty').draw(spell(kind).crop(0, 0, 1 + Math.round(30 * fill), 8), 0, 0)
  put(bar('bar', 0.7), 64, 6); put(bar('bar-mana', 0.45), 100, 6); put(bar('bar-xp', 0.85), 136, 6)
  ;['gear', 'sound', 'pause', 'menu'].forEach((h, i) => put(spell(h), 172 + i * 16, 2))
  // dialog
  put(spell('panel').nineSlice(120, 52), 6, 24)
  put(spell.char({ body: 'heroine', hat: 'wizard', hand: 'staff' }), 12, 34)
  put(text('WELCOME, HERO!', { color: '#3a2a1a' }), 40, 34)
  put(text('THE CAVE IS NORTH.', { color: '#5a4630' }), 40, 44)
  put(spell('button').nineSlice(40, 16).draw(text('ACCEPT', { color: '#ffffff' }), 9, 5), 40, 56)
  put(spell('button-red').nineSlice(32, 16).draw(text('NO', { color: '#ffffff' }), 12, 5), 84, 56)
  // inventory
  put(spell('panel-stone').nineSlice(100, 76), 134, 24)
  put(text('BAG', { color: '#e8f3e4' }), 142, 30)
  const items = ['sword-gold', 'potion', 'armor', 'boots', 'amulet', 'bread', 'map', 'key', 'gem', 'bomb', 'rune', null]
  items.forEach((id, i) => {
    const x = 140 + (i % 4) * 22, y = 38 + Math.floor(i / 4) * 20
    put(spell(i === 0 ? 'slot-gold' : 'slot'), x, y)
    if (id) put(spell(id), x, y)
  })
  // bottom: a menu panel with icon buttons
  put(spell('panel-dark').nineSlice(120, 40), 6, 82)
  ;['play', 'home', 'plus', 'minus', 'arrow', 'mute'].forEach((h, i) => put(spell(h), 14 + i * 18, 94))
  return img.scale(3)
}

// An island from a height map: water, then sand, grass and rock blended with spell.autotile, a dirt path, props
function terrainShowcase() {
  const W = 26, H = 13, T = 16
  const hgt = (x, y) => 1 - Math.hypot((x - 12.5) / 11, (y - 6.2) / 6) + 0.16 * Math.sin(x * 0.85) * Math.cos(y * 1.2) + 0.08 * Math.sin(x * 2.1 + y)
  const cells = (t) => Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => hgt(x, y) > t))
  const path = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => hgt(x, y) > 0.38 && Math.abs(y - 6 - Math.sin(x * 0.5) * 1.5) < 0.9 && x > 5 && x < 21))
  let land = new Pixmap(W * T, H * T)
  for (const [id, t] of [['dirt-sand', 0.12], ['grass', 0.3]]) land = land.draw(spell.autotile(id, null).draw(cells(t)), 0, 0)
  land = land.draw(spell.autotile('dirt', null).draw(path), 0, 0)
  const pond = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => Math.hypot((x - 17.5) / 2.2, (y - 9.5) / 1.4) < 1))
  land = land.draw(spell.autotile('water', null).draw(pond), 0, 0)
  const props = [['pine-tree', 7, 3], ['tree', 9, 2], ['pine-tree', 16, 3], ['tree-autumn', 21, 8], ['rock', 5, 7], ['flower', 10, 9],
    ['flower-blue', 15, 9], ['tent', 13, 3], ['campfire', 14, 4], ['bush', 20, 5], ['giant-mushroom', 8, 8], ['rock-mossy', 4, 9]]
  const frameOf = (id, t) => { const f = spell.frames(id); return f[t % f.length] }
  const water = spell.frames('water')
  const hero = spell.walk({ body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }, 'right')
  return Array.from({ length: 8 }, (_, t) => {
    let img = new Pixmap(W * T, H * T)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) img = img._blit(water[(t >> 1) % water.length], x * T, y * T)
    img = img.draw(land, 0, 0)
    for (const [id, x, y] of props) img = img.draw(frameOf(id, t), x * T, y * T)
    img = img.draw(hero[t % hero.length], (6 + t * 0.5) * T - 4, 5 * T)
    return img.scale(2)
  })
}

// The same island in six palettes: spell.palette() before drawing, nothing else changes
function palettesShowcase() {
  const names = [null, 'gameboy', 'pico-8', 'sweetie-16', 'c64', '1-bit']
  const panels = names.map((name) => {
    spell.palette(name)
    const frame = terrainShowcase()[0].crop(128, 64, 272, 176)
    const tag = text(name ?? 'full color', { color: '#ffffff' }).scale(2)
    return frame.draw(Pixmap.create(tag.w + 8, tag.h + 6, '#000000aa'), 4, 4).draw(tag, 8, 7)
  })
  spell.palette(null)
  return sheet(panels, { columns: 3, gap: 6, padding: 6, background: BG }).image
}

// Your own PNG in: examples/import/my-frog.png (plain hex colors) -> a sprite that recolors and resizes like the built-ins
function importShowcase() {
  const src = spell.readPNG(readFileSync(join(root, 'examples', 'import', 'my-frog.png')), inflateSync)
  if (!looks['my-frog']) spell.define(spell.fromImage(src, { id: 'my-frog' }).def)
  const label = (s, img) => {
    const t = text(s, { color: '#cfe8d4' }).scale(2)
    return Pixmap.create(Math.max(img.w, t.w), img.h + t.h + 8).draw(img, (Math.max(img.w, t.w) - img.w) >> 1, 0).draw(t, (Math.max(img.w, t.w) - t.w) >> 1, img.h + 8)
  }
  const arrow = text('->', { color: '#7fbf8e' }).scale(4)
  const looks5 = [[{}, 'as drawn'], [{ A: 'red' }, 'red'], [{ A: 'ice', B: 'gold' }, 'ice'], [{ A: 'gold', B: 'purple' }, 'gold'], [{ A: '#ff4fd8', C: 'blue' }, '#ff4fd8']]
  const panels = [label('my-frog.png', src.scale(5)), Pixmap.create(arrow.w + 8, 80).draw(arrow, 4, 30),
    ...looks5.map(([r, n]) => label(n, spell('my-frog', r).scale(5))), label('grid 32', spell('my-frog', { grid: 32, A: 'mint' }).scale(2))]
  return sheet(panels, { columns: panels.length, gap: 14, padding: 12, background: BG }).image
}

// A village and a dungeon room built only from tiles and props, animated (lava, torches, cauldron, fountain, banners)
function worldShowcase() {
  const T = 16, W = 14, H = 9
  const frameOf = (id, t) => { const f = spell.frames(id); return f[t % f.length] }
  const village = (t) => {
    let img = new Pixmap(W * T, H * T)
    const at = (id, x, y) => { img = img.draw(frameOf(id, t), x, y) }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) at(y === 6 && x < 11 ? 'cobblestone' : x >= 11 && y >= 6 ? 'water' : 'grass', x * T, y * T)
    for (let x = 1; x < 6; x++) { at('roof', x * T, T); at('roof', x * T, 2 * T); at('planks', x * T, 3 * T); at('planks', x * T, 4 * T) }
    at('door', 3 * T, 4 * T); at('window', T + 6, 3 * T + 2); at('window-lit', 4 * T + 6, 3 * T + 2); at('banner', 6 * T + 2, 2 * T + 4)
    for (let x = 7; x < 11; x++) at('fence', x * T, 4 * T)
    at('well', 8 * T, 2 * T + 2); at('lamp-post', 6 * T, 5 * T - 6); at('hay-bale', 11 * T, 3 * T + 4); at('pumpkin', 12 * T, 4 * T)
    at('pumpkin-white', 13 * T - 4, 4 * T + 2); at('pine-tree', 12 * T, 0); at('pine-tree', 10 * T + 4, -4); at('tree', 0, 7 * T - 4)
    at('stump', 2 * T, 7 * T + 2); at('barrel', 6 * T + 2, 3 * T + 8); at('crate', 0, 5 * T); at('sack', T, 5 * T)
    at('bridge', 11 * T, 6 * T); at('bridge', 12 * T, 6 * T); at('bridge', 13 * T, 6 * T); at('lily-pad', 12 * T, 7 * T + 4)
    at('fountain', 8 * T, 7 * T); at('giant-mushroom', 4 * T, 7 * T); at('tent', 6 * T, 7 * T)
    const hero = spell.walk({ body: 'heroine', hat: 'wizard', hand: 'staff' }, 'right')
    img = img.draw(hero[t % hero.length], 2 * T + 2 + t * 2, 5 * T + 4)
    return img
  }
  const dungeon = (t) => {
    let img = new Pixmap(W * T, H * T)
    const at = (id, x, y) => { img = img.draw(frameOf(id, t), x, y) }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      at(y < 2 ? 'brick-dungeon' : x >= 9 && y >= 6 ? 'lava' : x >= 3 && x <= 6 && y >= 3 && y <= 6 ? 'carpet' : 'checker-floor-dungeon', x * T, y * T)
    }
    at('door-dark', 6 * T, T); at('wall-torch', 4 * T, 12); at('wall-torch', 8 * T, 12); at('banner-black', 2 * T, 6); at('banner-black', 10 * T, 6)
    at('pillar', T, 2 * T); at('pillar', T, 5 * T); at('pillar-dark', 12 * T, 2 * T); at('cobweb', 0, 2 * T); at('bones', 2 * T, 7 * T)
    at('spikes', 7 * T, 6 * T); at('spikes', 8 * T, 6 * T); at('bookshelf', 9 * T, 2 * T); at('bookshelf-magic', 10 * T, 2 * T)
    at('cauldron', 11 * T + 4, 3 * T + 6); at('table', 4 * T, 4 * T); at('chair', 3 * T + 2, 4 * T - 2); at('stairs-down', 13 * T, 7 * T)
    at('crystals-amethyst', 12 * T, 5 * T); at('chest-gold', 5 * T + 4, 2 * T + 8); at('pot', 2 * T, 3 * T); at('pot-blue', 2 * T + 10, 3 * T + 4)
    at('bed', 7 * T, 3 * T + 4); at('anvil', 0, 4 * T); at('minecart', T, 7 * T); at('tombstone', 6 * T, 7 * T)
    const knight = spell.walk({ body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }, 'down')
    img = img.draw(knight[t % knight.length], 6 * T - 4, 3 * T + 6 + t)
    return img
  }
  return Array.from({ length: 12 }, (_, t) => {
    const a = village(t), b = dungeon(t)
    return Pixmap.create(a.w, a.h * 2 + 4, BG).draw(a, 0, 0).draw(b, 0, a.h + 4).scale(3)
  })
}

// The profile-card example in the README: a made-up account, so the image never changes
function heroExample() {
  const stats = { login: 'you', createdAt: '2019-03-01T00:00:00Z', repos: 42, followers: 120, stars: 860,
    languages: { TypeScript: 12, JavaScript: 9 }, activity: { day: 3, week: 11 } }
  return heroCard(heroOf(stats, { now: Date.parse('2026-11-06T12:00:00Z') }), { scale: 3 })
}

async function buildShowcase() {
  const dir = join(root, 'docs', 'img')
  { const { frames, fps } = heroExample(); await write(join(dir, 'hero.png'), apng(frames, fps)) }
  await write(join(dir, 'world.png'), apng(worldShowcase(), 6))
  await write(join(dir, 'terrain.png'), apng(terrainShowcase(), 6))
  await write(join(dir, 'palettes.png'), png(palettesShowcase()))
  // ready-made terrain transitions (also in the download zips)
  for (const [inner, outer] of spell.autotile.presets) {
    const pack = spell.autotile(inner, outer).pack({ deflate })
    for (const [n, bytes] of Object.entries(pack.files)) if (!n.startsWith('README')) await write(join(root, 'assets', 'terrain', n), bytes)
  }
  await write(join(dir, 'monsters.png'), apng(monstersShowcase(), 6))
  await write(join(dir, 'ui.png'), png(uiShowcase()))
  for (const [name, { frames, fps }] of Object.entries(showTiles())) await write(join(dir, 'show', `${name}.png`), apng(frames, fps))
  if (process.env.DOG_PROFILE) {
    for (const [name, fn] of Object.entries({ gallery, recolor, combine, sizes, scene, banner, characters, actions, walks, social, fxShowcase, gridsShowcase })) {
      const s = Date.now(); const r = fn(); const m = Date.now() - s
      const e = Date.now(); Array.isArray(r) ? apng(r, 8) : png(r)
      console.log(`  ${name}: render ${m}ms, encode ${Date.now() - e}ms`)
    }
  }
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
  await write(join(dir, 'fx.png'), apng(fxShowcase(), 12))
  await write(join(dir, 'grids.png'), png(gridsShowcase()))
  await write(join(dir, 'import.png'), png(importShowcase())) // last: it defines my-frog, which nothing above should list
}

// Packs used by templates/phaser, regenerated so they always match the library.
async function buildTemplates() {
  const dir = join(root, 'templates', 'phaser')
  const packs = [
    ['hero', { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }],
    ['slime', { body: 'slime' }],
  ]
  for (const [name, spec] of packs) {
    const pack = spell.pack(spec, { name, deflate, actions: ['attack', 'hit', 'death'] })
    await write(join(dir, `${name}.png`), pack.files[`${name}.png`])
    await write(join(dir, `${name}.json`), pack.files[`${name}.json`])
  }
  await write(join(dir, 'grass.png'), png(spell('grass')))
  for (const s of ['slash', 'hit', 'poof']) await write(join(dir, `${s}.wav`), spell.sfx(s).toWAV())
}

// skills/pixspell/catalog.md: every sprite id, so people (and AI assistants) can pick sprites by name.
async function buildCatalog() {
  const defs = Object.values(sprites)
  const variants = (d) => Object.keys(d.variants).join(', ') || '-'
  const row = (d) => `| \`${d.id}\` | ${d.w}x${d.h} | ${d.frames.length > 1 ? `${d.frames.length} @ ${d.fps}fps` : '1'} | ${variants(d)} |`
  const table = (list) => ['| id | size | frames | variants (`id-variant`) |', '| --- | --- | --- | --- |', ...list.map(row)].join('\n')
  const humanoid = (d) => !!d.anchors.hand
  const bodies = defs.filter((d) => Object.keys(d.anchors).length && !d.tags.includes('walk'))
  const gear = (slot) => defs.filter((d) => d.equip === slot)
  const byCat = (cat) => defs.filter((d) => d.category === cat && !Object.keys(d.anchors).length && !d.equip)
  const md = `# PixSpell sprite catalog

Generated by \`scripts/build.js\`: ${defs.length} sprites, ${Object.keys(looks).length} looks with variants,
${spell.char.count().toLocaleString('en-US')} character combinations. Use a variant by appending its name: \`potion\` -> \`potion-mana\`.
Any sprite can also be recolored with \`spell(id, { A: 'material' | '#hex' })\`.

## Character bodies: \`spell.char({ body })\`

Humanoids hold \`hand\` and \`offhand\` items and have drawn front / back / side walk poses: ${bodies.filter(humanoid).map((d) => `\`${d.id}\``).join(', ')}.
Others wear hats only: ${bodies.filter((d) => !humanoid(d)).map((d) => `\`${d.id}\``).join(', ')} (the dog walks side-on, the rest hop or float).

${table(bodies)}

## Hats: \`hat: 'crown'\` (= \`hat-crown\`)

${table(gear('head'))}

## Held items: \`hand: 'sword'\` (= \`held-sword\`)

${table(gear('hand'))}

## Off-hand items: \`offhand: 'shield'\` (= \`held-shield\`)

${table(gear('offhand'))}

## Actions and elements: \`spell.action(spec, action, element)\`

Actions: ${spell.action.list.map((a) => `\`${a}\``).join(' ')}. Elements: ${spell.action.elements.map((e) => `\`${e}\``).join(' ')}, or any material / hex.
Walk directions: ${[...spell.walk.dirs, ...spell.walk.diagonals].map((d) => `\`${d}\``).join(' ')}.

${['tiles', 'items', 'monsters', 'icons', 'effects'].map((cat) => `## ${cat[0].toUpperCase() + cat.slice(1)}\n\n${table(byCat(cat))}`).join('\n\n')}

## Sounds: \`spell.sfx(name, { element, pitch, seed })\`

Elements: ${spell.sfx.elements.map((e) => `\`${e}\``).join(' ')}. Every attack style and action has a sound of the same name:
\`spell.sfx(spell.action.styleOf(spec))\`. \`spell.sfx.forEffect('fx-meteor')\` gives an effect's sound.

| sound | length | tags |
| --- | --- | --- |
${spell.sfx.list.map((id) => `| \`${id}\` | ${spell.sfx(id).duration.toFixed(2)}s${spell.sfx(id).loop ? ' loop' : ''} | ${spell.sfx.tags(id).join(', ')} |`).join('\n')}

## Materials

${Object.entries(MATERIALS_FOR_DOCS).map(([name, ramp]) => `\`${name}\` ${ramp.join(' ')}`).join('  \n')}
`
  await write(join(root, 'skills', 'pixspell', 'catalog.md'), md)
}

// --------------------------------------------------------------- sounds
async function buildSounds() {
  for (const id of spell.sfx.list) await write(join(root, 'assets', 'sfx', `${id}.wav`), spell.sfx(id).toWAV())
  return spell.sfx.list.length
}

// time every stage, so slow builds point at their cause
const t0 = Date.now()
const timings = []
async function stage(name, fn) {
  const s = Date.now()
  const r = await fn()
  timings.push(`${name} ${((Date.now() - s) / 1000).toFixed(1)}s`)
  return r
}
const files = await stage('assets', buildAssets) + await stage('sounds', buildSounds)
await stage('templates', buildTemplates)
await stage('catalog', buildCatalog)
await stage('showcase', buildShowcase)
console.log(`pixspell: ${Object.keys(sprites).length} sprites, ${Object.keys(looks).length} looks -> ${files} asset files + showcase in ${Date.now() - t0}ms (${timings.join(', ')})`)
