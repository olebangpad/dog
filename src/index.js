// PixSpell
// Pixel art as code: combine, resize and recolor game sprites in a few lines.
//
//   import { spell, compose } from './src/index.js'
//   const img = compose(spell('hero'), spell('crown').at(4, -2)).scale(8).outline('#fff')

import { groups } from './sprites/index.js'
import { defineSprite, render, renderFrames, resolveRamp, LEGEND, SLOTS } from './sprite.js'
import { Pixmap, compose, sheet } from './pixmap.js'
import { MATERIALS, MATERIAL_NAMES, OUTLINE } from './materials.js'
import { parseColor, toHex, rampFrom } from './color.js'
import { encodePNG, encodeAPNG } from './png.js'
import { text, FONT_CHARS } from './font.js'
import { createCharacters, CHAR_SIZE } from './character.js'
import { createActions, ACTION_SIZE, ACTION_FRAMES, ELEMENTS } from './action.js'
import { createPack, createFxPack, PACK_CELL } from './pack.js'
import { runRecipe, FX_COLORS } from './fx.js'
import { RECIPES } from './fx/index.js'
import { zip } from './zip.js'
import { createBundle } from './bundle.js'
import { renderSound, Sound, note, SAMPLE_RATE } from './sfx.js'
import { SOUNDS, FLAVORS, EFFECT_SOUNDS } from './sfx/sounds.js'

/** Every sprite definition, keyed by id. */
export const sprites = {}
/** Every ready-made look: "potion", "potion-mana", ... -> { def, ramps } */
export const looks = {}

for (const group of groups) {
  for (const raw of group.default) {
    // lazy sprites (procedural effects) are already normalized and must not be spread (that would generate them)
    const def = raw.animated === true && Object.getOwnPropertyDescriptor(raw, 'frames')?.get ? raw : defineSprite({ ...raw, category: raw.category ?? group.category })
    if (sprites[def.id]) throw new Error(`pixspell: duplicate sprite id "${def.id}"`)
    sprites[def.id] = def
    looks[def.id] = { id: def.id, def, variant: null, ramps: { ...def.ramps } }
    for (const [name, ramps] of Object.entries(def.variants)) {
      const id = `${def.id}-${name}`
      looks[id] = { id, def, variant: name, ramps: { ...def.ramps, ...ramps } }
    }
  }
}

function lookup(id) {
  const look = looks[id]
  if (!look) throw new Error(`pixspell: no sprite called "${id}". Try spell.list()`)
  return look
}

/**
 * Render a sprite as a Pixmap.
 *   spell('potion')                          default look
 *   spell('potion-mana')                     a named variant
 *   spell('potion', { A: 'gold' })           swap a ramp to another material
 *   spell('potion', { A: '#ff4fd8' })        ...or to any color (4 shades are generated)
 *   spell('coin', { frame: 2 })              animation frame
 */
export function spell(id, opts = {}) {
  const look = lookup(id)
  const { grid, smooth, ...rest } = opts
  const k = gridFactor(grid)
  if (k !== 1 && recipeById[look.def.id]) { // effects are code: draw them again at the new size
    const frames = effectAtGrid(look, k, rest)
    return frames[Math.min(rest.frame ?? look.def.cover, frames.length - 1)]
  }
  return regrid(render(look.def, { ...look.ramps, ...rest }), k, smooth)
}

/** All frames of an animated sprite. */
spell.frames = (id, opts = {}) => {
  const look = lookup(id)
  const { grid, smooth, ...rest } = opts
  const k = gridFactor(grid)
  if (k !== 1 && recipeById[look.def.id]) return effectAtGrid(look, k, rest)
  return regridAll(renderFrames(look.def, { ...look.ramps, ...rest }), k, smooth)
}

// ---------------------------------------------------------------- grids
/** Tile sizes PixSpell can deliver: the art is drawn on a 16 px grid and converted from there. */
export const GRIDS = [8, 16, 32, 64]
function gridFactor(grid) {
  if (grid == null || grid === 16) return 1
  if (!GRIDS.includes(grid)) throw new Error(`pixspell: grid must be one of ${GRIDS.join(', ')} (the tile size of your game)`)
  return grid / 16
}
/**
 * Convert art drawn on the 16 px grid to another grid: majority vote when shrinking (outlines survive),
 * Scale2x when growing (rounded stair steps, like art drawn at that size), or plain zoom with smooth: false.
 */
function regrid(img, k, smooth = true) {
  if (k === 1) return img
  if (k < 1) return halve(img)
  return smooth === false ? img.scale(k) : img.smooth(Math.log2(k))
}
/**
 * Half size for pixel art. A plain majority vote loses the 1px outline (it never wins a 2x2 block), so:
 * vote among the *inside* colors only, then draw the outline again, 1px, around the shrunk shape.
 */
const OUTLINE_RGBA = parseColor(OUTLINE)
function halve(img) {
  const { w, h, data } = img
  const W = Math.ceil(w / 2), H = Math.ceil(h / 2)
  const out = new Pixmap(W, H), od = out.data
  const isOutline = (i) => data[i] === OUTLINE_RGBA[0] && data[i + 1] === OUTLINE_RGBA[1] && data[i + 2] === OUTLINE_RGBA[2]
  const clear = (x, y) => x < 0 || y < 0 || x >= w || y >= h || !data[(y * w + x) * 4 + 3]
  const edge = (x, y) => clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1)
  let hadOutline = false
  for (let by = 0; by < H; by++) for (let bx = 0; bx < W; bx++) {
    let best = -1, bestN = 0
    const seen = []
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const x = bx * 2 + dx, y = by * 2 + dy
      if (x >= w || y >= h) continue
      const i = (y * w + x) * 4
      if (!data[i + 3]) continue
      // the outline on the silhouette edge gets redrawn below; dark details inside (eyes, seams) are kept on purpose
      const detail = isOutline(i)
      if (detail && edge(x, y)) { hadOutline = true; continue }
      const weight = detail ? 3 : 1
      seen.push([i, weight])
      let n = 0
      for (const [j, wj] of seen) if (data[j] === data[i] && data[j + 1] === data[i + 1] && data[j + 2] === data[i + 2] && data[j + 3] === data[i + 3]) n += wj
      if (n > bestN || (n === bestN && detail)) { best = i; bestN = n }
    }
    if (best >= 0) od.set(data.subarray(best, best + 4), (by * W + bx) * 4)
  }
  if (hadOutline) {
    const solid = (x, y) => x >= 0 && y >= 0 && x < W && y < H && od[(y * W + x) * 4 + 3] !== 0
    const mark = []
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (od[(y * W + x) * 4 + 3]) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) mark.push((y * W + x) * 4)
    }
    for (const i of mark) od.set(OUTLINE_RGBA, i)
  }
  return out
}
function regridAll(frames, k, smooth) {
  if (k === 1) return frames
  const out = frames.map((f) => regrid(f, k, smooth))
  for (const key of ['fps', 'loop']) if (frames[key] !== undefined) out[key] = frames[key]
  return out
}
// a procedural effect look (fx-meteor, fx-meteor-ice) redrawn natively at k times its size
function effectAtGrid(look, k, { A, B, C } = {}) {
  const frames = spell.fx(look.def.id, { size: look.def.w * k, element: look.variant ?? undefined, A, B, C })
  return frames
}

/** Ids of every look, optionally filtered by category or tag. */
spell.list = ({ category, tag, variants = true } = {}) =>
  Object.values(looks)
    .filter((l) => variants || !l.variant)
    .filter((l) => !category || l.def.category === category)
    .filter((l) => !tag || l.def.tags.includes(tag))
    .map((l) => l.id)

spell.info = (id) => lookup(id)

/**
 * Character maker - gear snaps onto bodies by name.
 *   spell.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })
 *   spell.char.frames(spec)   spell.char.random(seed)   spell.char.parts   spell.char.count()
 */
// grid: { grid: 32 } can ride along in whichever options object a call takes (or in the spec itself)
function takeGrid(args) {
  let k = 1, smooth
  const clean = args.map((a) => {
    if (a && typeof a === 'object' && !Array.isArray(a) && !(a instanceof Pixmap) && ('grid' in a || 'smooth' in a)) {
      const { grid, smooth: sm, ...rest } = a
      k = gridFactor(grid)
      smooth = sm
      return rest
    }
    return a
  })
  return { k, smooth, args: clean }
}
const gridded = (fn, many) => Object.assign((...a) => {
  const { k, smooth, args } = takeGrid(a)
  const out = fn(...args)
  return many ? regridAll(out, k, smooth) : regrid(out, k, smooth)
}, fn)

/** Convert any PixSpell image or frame list to another tile grid: spell.toGrid(spell('sword'), 32). */
spell.toGrid = (img, grid, { smooth } = {}) => (Array.isArray(img) ? regridAll(img, gridFactor(grid), smooth) : regrid(img, gridFactor(grid), smooth))
spell.grids = GRIDS

const characters = createCharacters(looks)
spell.char = Object.assign(gridded(characters, false), characters, {
  frames: gridded(characters.frames, true),
  walk: gridded(characters.walk, true),
})

/**
 * Situation effects - a character doing something, effects attached to hands / head / body.
 *   spell.action({ body: 'hero', hand: 'sword' }, 'attack', 'fire')   -> 8 frames, 32x32, .fps
 *   actions: attack hit heal levelup cast death   elements: fire ice poison holy dark
 */
spell.action = gridded(createActions(spell, looks), true)

/**
 * Walk cycles: spell.walk({ body: 'hero', hat: 'crown', hand: 'sword' }, 'left') -> frames (24x24, .fps)
 * directions: down up left right
 */
spell.walk = spell.char.walk

/**
 * Game pack: sprite sheet + Aseprite/Phaser JSON + Godot SpriteFrames for one character.
 *   const pack = spell.pack({ body: 'hero', hat: 'crown', hand: 'sword' })
 *   pack.files  -> { 'hero-crown-sword.png': bytes, '.json', '.tres', 'README.txt' }   pack.zip() -> .zip bytes
 */
spell.pack = createPack(spell, looks)

/**
 * Procedural effects at any size / seed / color (the registered fx-* sprites are the 32px defaults).
 *   spell.fx('firework')                         -> frames (.fps, .loop)
 *   spell.fx('boom', { size: 64, seed: 3, element: 'ice' })
 */
const recipeById = Object.fromEntries(RECIPES.map((r) => [r.id, r]))
// rendered effects are cached: attacks and games ask for the same few over and over
const fxMemo = new Map()
const FX_MEMO_MAX = 300
spell.fx = (name, opts = {}) => {
  if (opts.grid != null) { // effects are code: a grid just means drawing them at another size
    const { grid, smooth, ...rest } = opts
    opts = { ...rest, size: (rest.size ?? 32) * gridFactor(grid) }
  }
  const key = name + JSON.stringify(opts)
  let hit = fxMemo.get(key)
  if (!hit) {
    hit = renderFx(name, opts)
    if (fxMemo.size >= FX_MEMO_MAX) fxMemo.delete(fxMemo.keys().next().value)
    fxMemo.set(key, hit)
  }
  return Object.assign([...hit], { fps: hit.fps, loop: hit.loop }) // a fresh array; the images are immutable
}
function renderFx(name, { size, seed, frames: count, element, A, B, C } = {}) {
  const recipe = recipeById[name] ?? recipeById[`fx-${name}`]
  if (!recipe) throw new Error(`pixspell: no effect called "${name}". Try: ${Object.keys(recipeById).slice(0, 8).join(', ')}...`)
  const { frames } = runRecipe(recipe, { size, seed, frames: count })
  const def = defineSprite({ id: recipe.id, frames, ramps: { A: recipe.color ?? 'orange', B: recipe.B ?? 'stone', C: recipe.C ?? 'bone' } })
  const ramps = { A: A ?? (element ? FX_COLORS[element] ?? element : undefined), B, C }
  const out = renderFrames(def, Object.fromEntries(Object.entries(ramps).filter(([, v]) => v != null)))
  out.fps = recipe.fps ?? 12
  out.loop = !!recipe.loop
  return out
}
spell.fx.list = RECIPES.map((r) => r.id)

/** Every effect (or the ids you pass) as one game pack: sheet + Phaser/Aseprite JSON + Godot .tres. */
spell.fxPack = createFxPack(spell, looks)

/**
 * A character with a status effect on it, idle or walking: 32x32 frames like spell.action.
 *   spell.status({ body: 'hero', hat: 'crown' }, 'burning')
 *   spell.status('slime', 'frozen', { walk: 'left', element: 'arcane' })
 */
spell.status = (spec, name, { walk, element, size = 32, grid, smooth } = {}) => {
  const recipe = recipeById[name] ?? recipeById[`fx-${name}`]
  if (!recipe) throw new Error(`pixspell: no effect called "${name}"`)
  const k = gridFactor(grid)
  size *= k
  const effect = spell.fx(recipe.id, { element, size }) // drawn natively at the new size
  const base = regridAll(walk ? spell.walk(spec, walk) : spell.char.frames(spec), k, smooth)
  const cs = base[0].w
  const gcd = (a, b) => (b ? gcd(b, a % b) : a)
  const lcm = (base.length * effect.length) / gcd(base.length, effect.length)
  const n = lcm <= 48 ? lcm : Math.max(base.length, effect.length)
  const out = Array.from({ length: n }, (_, i) => {
    const body = new Pixmap(size, size).draw(base[i % base.length], (size - cs) >> 1, size - cs)
    const fx = effect[i % effect.length]
    return recipe.behind ? new Pixmap(size, size).draw(fx).draw(body) : body.draw(fx)
  })
  out.fps = effect.fps
  out.loop = Boolean(recipe.loop)
  return out
}

/**
 * Play effects one after another or overlapping, as one frame list.
 *   spell.fx.sequence([
 *     { fx: 'charge' },                         // starts at frame 0
 *     { fx: 'comet', repeat: 2, x: 6 },         // starts when the previous step ends
 *     { fx: 'boom', with: true, at: -2 },       // 'with': same start as the previous step, shifted by 'at'
 *   ], { size: 32, fps: 12 })
 * Each step: fx, element, seed, x/y offset, repeat (for loops), at (frame offset), with.
 */
spell.fx.sequence = (steps, { size = 32, fps } = {}) => {
  let prevStart = 0, prevEnd = 0
  const placed = steps.map((st) => {
    const one = spell.fx(st.fx, { size: st.size ?? size, element: st.element, seed: st.seed })
    const frames = Array.from({ length: one.length * (st.repeat ?? 1) }, (_, i) => one[i % one.length])
    const start = Math.max(0, (st.with ? prevStart : prevEnd) + (st.at ?? 0))
    prevStart = start
    prevEnd = start + frames.length
    return { frames, start, x: st.x ?? 0, y: st.y ?? 0, fps: one.fps }
  })
  const total = Math.max(...placed.map((p) => p.start + p.frames.length))
  const out = Array.from({ length: total }, (_, f) => {
    let img = new Pixmap(size, size)
    for (const p of placed) {
      const k = f - p.start
      if (k >= 0 && k < p.frames.length) {
        const fr = p.frames[k]
        img = img.draw(fr, ((size - fr.w) >> 1) + p.x, ((size - fr.h) >> 1) + p.y)
      }
    }
    return img
  })
  out.fps = fps ?? placed[0]?.fps ?? 12
  return out
}
spell.fx.colors = FX_COLORS

// ------------------------------------------------------------------ sound
const soundById = Object.fromEntries(SOUNDS.map((r) => [r.id, r]))
const sfxMemo = new Map()

/**
 * Game sound effects made by code, as a Sound you can play or export.
 *   spell.sfx('coin').play()                          browser (call it from a click or key handler first)
 *   spell.sfx('slash', { element: 'fire' })            an element adds its flavor, like an effect's color
 *   spell.sfx('hit', { seed: 3, pitch: 1.2 })          variations: seed changes it a little, pitch a lot
 *   await spell.sfx('boom').save('boom.wav')           Node
 * Names match the rest of PixSpell: every attack style (spell.action.styleOf(spec)), every action, the effects.
 */
spell.sfx = (name, opts = {}) => {
  const recipe = soundById[name]
  if (!recipe) throw new Error(`pixspell: no sound called "${name}". Try spell.sfx.list`)
  const { seed = 0, pitch = 1, volume = 1, element } = opts
  if (element != null && !FLAVORS[element]) throw new Error(`pixspell sfx: element must be one of ${Object.keys(FLAVORS).join(', ')}`)
  const key = `${name}|${seed}|${pitch}|${volume}|${element ?? ''}`
  let sound = sfxMemo.get(key)
  if (!sound) {
    const samples = renderSound(recipe, { seed, pitch, flavor: element ? FLAVORS[element] : null })
    if (volume !== 1) for (let i = 0; i < samples.length; i++) samples[i] *= volume
    sound = new Sound(samples, { id: element ? `${name}-${element}` : name, loop: Boolean(recipe.loop) })
    if (sfxMemo.size >= 200) sfxMemo.delete(sfxMemo.keys().next().value)
    sfxMemo.set(key, sound)
  }
  return sound
}
spell.sfx.list = SOUNDS.map((r) => r.id)
spell.sfx.elements = Object.keys(FLAVORS)
spell.sfx.tags = (name) => [...(soundById[name]?.tags ?? [])]
spell.sfx.sampleRate = SAMPLE_RATE
/** The sound that goes with an effect: 'fx-meteor', 'meteor-ice' or 'explosion' -> 'meteor' / 'boom'. null for silent ones. */
spell.sfx.forEffect = (fx) => {
  const id = String(fx).replace(/^fx-/, '')
  if (EFFECT_SOUNDS[id] !== undefined) return EFFECT_SOUNDS[id]
  const base = Object.keys(EFFECT_SOUNDS).filter((k) => id.startsWith(`${k}-`)).sort((a, b) => b.length - a.length)[0]
  return base ? EFFECT_SOUNDS[base] : null
}

/**
 * Everything at one tile size, as a list of files to render one by one: [{ path, make }].
 *   spell.bundle({ grid: 32, sprites: true, characters: true, effects: true, effectColors: false, sounds: true })
 * make() returns a Pixmap (encode as PNG), WAV bytes or text. scripts/pixspell.js export and the web page zip it.
 */
spell.bundle = createBundle(spell, looks, new Set(RECIPES.map((r) => r.id)))

/** Sounds (all, or the names you pass) as WAV files in one zip. Same options as spell.sfx apply to every sound. */
spell.sfxPack = (names = spell.sfx.list, { name = 'sounds', ...opts } = {}) => {
  const files = {}
  for (const n of names) files[`${n}.wav`] = spell.sfx(n, opts).toWAV()
  files['README.txt'] = [
    `${name}: ${names.length} sound effects from PixSpell, https://github.com/olebangpad/pixspell`,
    `16-bit mono WAV, ${SAMPLE_RATE} Hz. Made by code; CC0, use them anywhere.`,
    'Loops (seamless): ' + (names.filter((n) => soundById[n]?.loop).join(', ') || 'none'),
    '',
    'Phaser 3:  this.load.audio(\'coin\', \'coin.wav\')  then  this.sound.play(\'coin\')',
    'Godot 4:   drop the .wav files into the project, use an AudioStreamPlayer',
  ].join('\n')
  return { id: name, files, sounds: [...names], zip: () => zip(files) }
}

export {
  Pixmap, compose, sheet, render, renderFrames, defineSprite, resolveRamp,
  MATERIALS, MATERIAL_NAMES, OUTLINE, LEGEND, SLOTS,
  parseColor, toHex, rampFrom, encodePNG, encodeAPNG, text, FONT_CHARS, CHAR_SIZE, ACTION_SIZE, ACTION_FRAMES, ELEMENTS, PACK_CELL, zip, FX_COLORS, RECIPES,
  Sound, renderSound, note, SAMPLE_RATE, SOUNDS,
}
/** The old name of spell, kept so early code keeps working. */
export { spell as dog }
export default spell
