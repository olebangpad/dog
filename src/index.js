// DOG - Dots Of Games
// Pixel art as code: combine, resize and recolor game sprites in a few lines.
//
//   import { dog, compose } from './src/index.js'
//   const img = compose(dog('hero'), dog('crown').at(4, -2)).scale(8).outline('#fff')

import { groups } from './sprites/index.js'
import { defineSprite, render, renderFrames, resolveRamp, LEGEND, SLOTS } from './sprite.js'
import { Pixmap, compose, sheet } from './pixmap.js'
import { MATERIALS, MATERIAL_NAMES, OUTLINE } from './materials.js'
import { parseColor, toHex, rampFrom } from './color.js'
import { encodePNG, encodeAPNG } from './png.js'
import { text, FONT_CHARS } from './font.js'
import { createCharacters, CHAR_SIZE } from './character.js'
import { createActions, ACTION_SIZE, ACTION_FRAMES, ELEMENTS } from './action.js'
import { createPack, PACK_CELL } from './pack.js'
import { runRecipe, FX_COLORS } from './fx.js'
import { RECIPES } from './fx/index.js'
import { zip } from './zip.js'

/** Every sprite definition, keyed by id. */
export const sprites = {}
/** Every ready-made look: "potion", "potion-mana", ... -> { def, ramps } */
export const looks = {}

for (const group of groups) {
  for (const raw of group.default) {
    const def = defineSprite({ ...raw, category: raw.category ?? group.category })
    if (sprites[def.id]) throw new Error(`dog: duplicate sprite id "${def.id}"`)
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
  if (!look) throw new Error(`dog: no sprite called "${id}". Try dog.list()`)
  return look
}

/**
 * Render a sprite as a Pixmap.
 *   dog('potion')                          default look
 *   dog('potion-mana')                     a named variant
 *   dog('potion', { A: 'gold' })           swap a ramp to another material
 *   dog('potion', { A: '#ff4fd8' })        ...or to any color (4 shades are generated)
 *   dog('coin', { frame: 2 })              animation frame
 */
export function dog(id, opts = {}) {
  const { def, ramps } = lookup(id)
  return render(def, { ...ramps, ...opts })
}

/** All frames of an animated sprite. */
dog.frames = (id, opts = {}) => {
  const { def, ramps } = lookup(id)
  return renderFrames(def, { ...ramps, ...opts })
}

/** Ids of every look, optionally filtered by category or tag. */
dog.list = ({ category, tag, variants = true } = {}) =>
  Object.values(looks)
    .filter((l) => variants || !l.variant)
    .filter((l) => !category || l.def.category === category)
    .filter((l) => !tag || l.def.tags.includes(tag))
    .map((l) => l.id)

dog.info = (id) => lookup(id)

/**
 * Character maker - gear snaps onto bodies by name.
 *   dog.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })
 *   dog.char.frames(spec)   dog.char.random(seed)   dog.char.parts   dog.char.count()
 */
dog.char = createCharacters(looks)

/**
 * Situation effects - a character doing something, effects attached to hands / head / body.
 *   dog.action({ body: 'hero', hand: 'sword' }, 'attack', 'fire')   -> 8 frames, 32x32, .fps
 *   actions: attack hit heal levelup cast death   elements: fire ice poison holy dark
 */
dog.action = createActions(dog, looks)

/**
 * Walk cycles: dog.walk({ body: 'hero', hat: 'crown', hand: 'sword' }, 'left') -> frames (24x24, .fps)
 * directions: down up left right
 */
dog.walk = dog.char.walk

/**
 * Game pack: sprite sheet + Aseprite/Phaser JSON + Godot SpriteFrames for one character.
 *   const pack = dog.pack({ body: 'hero', hat: 'crown', hand: 'sword' })
 *   pack.files  -> { 'hero-crown-sword.png': bytes, '.json', '.tres', 'README.txt' }   pack.zip() -> .zip bytes
 */
dog.pack = createPack(dog, looks)

/**
 * Procedural effects at any size / seed / color (the registered fx-* sprites are the 32px defaults).
 *   dog.fx('firework')                         -> frames (.fps, .loop)
 *   dog.fx('boom', { size: 64, seed: 3, element: 'ice' })
 */
const recipeById = Object.fromEntries(RECIPES.map((r) => [r.id, r]))
dog.fx = (name, { size, seed, frames: count, element, A, B, C } = {}) => {
  const recipe = recipeById[name] ?? recipeById[`fx-${name}`]
  if (!recipe) throw new Error(`dog: no effect called "${name}". Try: ${Object.keys(recipeById).slice(0, 8).join(', ')}...`)
  const { frames } = runRecipe(recipe, { size, seed, frames: count })
  const def = defineSprite({ id: recipe.id, frames, ramps: { A: recipe.color ?? 'orange', B: recipe.B ?? 'stone', C: recipe.C ?? 'bone' } })
  const ramps = { A: A ?? (element ? FX_COLORS[element] ?? element : undefined), B, C }
  const out = renderFrames(def, Object.fromEntries(Object.entries(ramps).filter(([, v]) => v != null)))
  out.fps = recipe.fps ?? 12
  out.loop = !!recipe.loop
  return out
}
dog.fx.list = RECIPES.map((r) => r.id)

/**
 * Play effects one after another or overlapping, as one frame list.
 *   dog.fx.sequence([
 *     { fx: 'charge' },                         // starts at frame 0
 *     { fx: 'comet', repeat: 2, x: 6 },         // starts when the previous step ends
 *     { fx: 'boom', with: true, at: -2 },       // 'with': same start as the previous step, shifted by 'at'
 *   ], { size: 32, fps: 12 })
 * Each step: fx, element, seed, x/y offset, repeat (for loops), at (frame offset), with.
 */
dog.fx.sequence = (steps, { size = 32, fps } = {}) => {
  let prevStart = 0, prevEnd = 0
  const placed = steps.map((st) => {
    const one = dog.fx(st.fx, { size: st.size ?? size, element: st.element, seed: st.seed })
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
dog.fx.colors = FX_COLORS

export {
  Pixmap, compose, sheet, render, renderFrames, defineSprite, resolveRamp,
  MATERIALS, MATERIAL_NAMES, OUTLINE, LEGEND, SLOTS,
  parseColor, toHex, rampFrom, encodePNG, encodeAPNG, text, FONT_CHARS, CHAR_SIZE, ACTION_SIZE, ACTION_FRAMES, ELEMENTS, PACK_CELL, zip, FX_COLORS, RECIPES,
}
export default dog
