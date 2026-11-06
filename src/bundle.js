// Everything at one tile size: the list of files for a "download all" zip.
//
//   const items = dog.bundle({ grid: 32 })          // [{ path, make }]: make() renders that one file
//   for (const it of items) files[it.path] = encode(it.make())
//
// make() returns a Pixmap (encode it as PNG), a Uint8Array (a WAV) or a string (the README). Rendering is
// left to the caller one file at a time, so a page can show progress and use the browser's PNG compressor.

import { sheet } from './pixmap.js'

export function createBundle(dog, looks, recipeIds) {
  return function bundle({ grid = 16, sprites = true, effects = true, effectColors = false, characters = true, sounds = true } = {}) {
    const items = []
    const strip = (frames) => sheet(frames).image
    if (sprites) {
      for (const look of Object.values(looks)) {
        const { def } = look
        if (recipeIds.has(def.id) || def.tags.includes('walk') || def.equip) continue
        items.push({ path: `sprites/${look.id}.png`, make: () => dog(look.id, { grid, frame: def.cover }) })
        if (def.frames.length > 1) items.push({ path: `sprites/strips/${look.id}.png`, make: () => strip(dog.frames(look.id, { grid })) })
      }
      // gear on its own (hats, held items) is still useful as item art
      for (const look of Object.values(looks)) {
        if (!look.def.equip) continue
        items.push({ path: `sprites/gear/${look.id}.png`, make: () => dog(look.id, { grid }) })
      }
    }
    if (characters) {
      for (const body of dog.char.parts.body) {
        items.push({ path: `characters/${body}.png`, make: () => dog.char(body, { grid }) })
        for (const dir of dog.walk.dirs) items.push({ path: `characters/walk/${body}-${dir}.png`, make: () => strip(dog.walk(body, dir, { grid })) })
      }
    }
    if (effects) {
      for (const look of Object.values(looks)) {
        if (!recipeIds.has(look.def.id) || (look.variant && !effectColors)) continue
        items.push({ path: `effects/${look.id}.png`, make: () => strip(dog.frames(look.id, { grid })) })
      }
    }
    if (sounds) for (const id of dog.sfx.list) items.push({ path: `sounds/${id}.wav`, make: () => dog.sfx(id).toWAV() })
    const k = grid / 16
    items.push({
      path: 'README.txt',
      make: () => `DOG (Dots Of Games) - everything for a ${grid}x${grid} px tile grid
https://github.com/olebangpad/dots-of-games - CC0: use it in any game, commercial or not. Credit welcome, not required.

DOG draws on a 16 px grid. This download was converted for ${grid} px tiles:
${k < 1 ? '  shrunk to half by vote, with the 1px outline drawn again (details like eyes are kept)'
    : k > 1 ? `  grown ${k}x with Scale2x (rounded stair steps, like art drawn at that size)`
      : '  the original pixels'}
  effects are code, so they were drawn again at their new size (${32 * k}x${32 * k}), not stretched

sprites/          ${16 * k}x${16 * k} items, tiles, monsters, icons (still frame); strips/ = every animation frame, left to right
sprites/gear/     hats and held items on their own
characters/       every body (${24 * k}x${24 * k}); walk/ = 4-direction walk strips
effects/          ${32 * k}x${32 * k} effect strips, frames left to right${effectColors ? ' (every color)' : ' (original colors; more colors on the effects page)'}
sounds/           sound effects, 16-bit mono WAV (the same at every grid)

Make anything else at this size in code: dog('sword', { grid: ${grid} }), dog.char(spec, { grid: ${grid} }),
dog.pack(spec, { grid: ${grid} }), dog.fx('meteor', { grid: ${grid} }).
`,
    })
    return items
  }
}
