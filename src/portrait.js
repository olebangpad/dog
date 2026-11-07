// Portraits and RPG Maker: a character as a profile picture, and as RPG Maker MV / MZ character and face sheets.
//
//   spell.avatar({ body: 'hero', hat: 'crown' })                 // 256x256 head-and-shoulders picture on a background
//   spell.avatar(spec, { size: 512, frame: 'full', background: null })
//   const rm = spell.rpgmaker({ body: 'heroine', hand: 'bow' })    // $heroine-bow.png (3x4 frames of 48x48) + a face
//   const npcs = spell.rpgmaker([...8 specs], { name: 'Townsfolk' }) // Townsfolk.png: 8 characters, 12x8 frames
//   rm.files / rm.zip()                                          // img/characters/..., img/faces/..., README.txt
//
// RPG Maker MV and MZ use 48x48 frames: a chibi PixSpell character (24x24) at 2x is exactly that, and a tall one
// (height 24) is 48x64, which a "$" sheet allows. Rows are down, left, right, up; columns are step, stand, step.

import { Pixmap } from './pixmap.js'
import { zip } from './zip.js'

const BUST = { x: 12, y: 11 } // the middle of a character's head, in its 24 px frame

export function createPortraits(spell) {
  const specOf = (s) => (typeof s === 'string' ? { body: s } : { ...s })

  /** A square crop around the head (side px), from the character's standing frame. */
  function bust(spec, side) {
    const img = spell.char(spec)
    const x = BUST.x - (side >> 1), y = BUST.y - (side >> 1)
    return new Pixmap(side, side).draw(img, -x, -y)
  }

  /**
   * A profile picture: the character on a square background.
   * frame 'bust' (head and shoulders, the default) or 'full' (the whole character); background a color or null.
   */
  function avatar(spec, { size = 256, frame = 'bust', background = '#2a3a2e' } = {}) {
    const s = specOf(spec)
    let art
    if (frame === 'full') {
      const img = spell.char(s)
      const side = Math.max(img.w, img.h) + 4
      art = new Pixmap(side, side).draw(img, (side - img.w) >> 1, side - img.h - 2)
    } else if (frame === 'bust') art = bust(s, 18)
    else throw new Error(`pixspell: avatar frame is 'bust' or 'full', not "${frame}"`)
    const k = Math.max(1, Math.floor(size / art.w))
    const big = art.scale(k)
    const out = background ? Pixmap.create(size, size, background) : new Pixmap(size, size)
    return out.draw(big, (size - big.w) >> 1, (size - big.h) >> 1)
  }

  /** One character's 3x4 block: rows down, left, right, up; columns step, stand, step. Frames are cw x ch. */
  function characterBlock(spec, scale, cw, ch) {
    const block = new Pixmap(cw * 3, ch * 4)
    const rows = ['down', 'left', 'right', 'up'].map((dir) => {
      const w = spell.walk(spec, dir)
      return w.length >= 3 ? [w[1], w[0], w[2]] : [w[1] ?? w[0], w[0], w[1] ?? w[0]] // side walks: stride, stand, stride
    })
    rows.forEach((frames, r) => frames.forEach((f, c) => {
      const img = f.scale(scale)
      block._blit(img, c * cw + ((cw - img.w) >> 1), r * ch + ch - img.h) // feet on the bottom of the frame
    }))
    return block
  }

  /**
   * RPG Maker MV / MZ sheets. One spec: a "$" single-character sheet. Up to 8 specs: a standard 4x2 sheet.
   * Also a face sheet (144x144 faces, 4 across) and a README. scale 2 gives the standard 48 px frames.
   */
  function rpgmaker(specs, { name, scale = 2, deflate } = {}) {
    const list = (Array.isArray(specs) ? specs : [specs]).map(specOf)
    if (!list.length || list.length > 8) throw new Error('pixspell: rpgmaker takes 1 to 8 characters (one sheet holds 8)')
    const single = list.length === 1
    const slug = (s) => [s.body, s.hat, s.hand].filter(Boolean).map((p) => p.replace(/^(hat|held)-/, '')).join('-').replace(/[^a-z0-9-]/gi, '').slice(0, 40)
    const id = name ?? (single ? slug(list[0]) : 'Characters')
    const tallest = Math.max(...list.map((s) => spell.char(s).h))
    const cw = 24 * scale, ch = tallest * scale
    const characters = new Pixmap(single ? cw * 3 : cw * 12, single ? ch * 4 : ch * 8)
    list.forEach((s, i) => characters._blit(characterBlock(s, scale, cw, ch), single ? 0 : (i % 4) * cw * 3, single ? 0 : Math.floor(i / 4) * ch * 4))
    // faces: 144x144 each, 4 across and 2 down, in the same order as the characters
    const face = 144, crop = 18
    const faces = new Pixmap(face * 4, face * 2)
    list.forEach((s, i) => faces._blit(bust(s, crop).scale(face / crop), (i % 4) * face, Math.floor(i / 4) * face))
    const sheetName = `${single ? '$' : ''}${id}.png`
    const files = {
      [`img/characters/${sheetName}`]: characters.toPNG(deflate ? { deflate } : undefined),
      [`img/faces/${id}.png`]: faces.toPNG(deflate ? { deflate } : undefined),
      'README.txt': `PixSpell characters for RPG Maker MV / MZ: ${id}
Made with PixSpell - https://github.com/olebangpad/pixspell - art is CC0 (no credit needed).

img/characters/${sheetName}  ${single ? `one character ("$" sheet), 3 x 4 frames of ${cw}x${ch}` : `${list.length} characters, a standard 4 x 2 sheet of ${cw}x${ch} frames`}
img/faces/${id}.png          faces, 144x144 each, in the same order

Copy the img folder into your project (merge it with the project's img folder), then pick the image
in the database (Actors: Character Image and Face Image) or for an event's image.
${ch > 48 ? `These are tall characters (frames ${cw}x${ch}): RPG Maker draws them from the feet up, so they stand on the tile.\n` : ''}
Rebuild in code: spell.rpgmaker(${single ? JSON.stringify(list[0]) : `[${list.map((s) => JSON.stringify(s)).join(', ')}]`}${name ? `, { name: '${name}' }` : ''})
`,
    }
    return { id, characters, faces, files, zip: () => zip(files) }
  }

  return { avatar, rpgmaker }
}
