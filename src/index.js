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

export {
  Pixmap, compose, sheet, render, renderFrames, defineSprite, resolveRamp,
  MATERIALS, MATERIAL_NAMES, OUTLINE, LEGEND, SLOTS,
  parseColor, toHex, rampFrom, encodePNG, encodeAPNG, text, FONT_CHARS,
}
export default dog
