// Retro palettes: draw everything with a console's colors.
//
//   spell.palette('gameboy')        every sprite, character and effect drawn from now on uses the 4 Game Boy greens
//   spell.palette(null)             back to full color
//   spell.toPalette(img, 'pico-8')  convert one image or frame list (a composed scene, text, anything)
//
// A palette with a single hue (Game Boy, 1-bit, Virtual Boy...) maps by brightness, so the dark outline stays the
// darkest shade and highlights the lightest. Color palettes pick the nearest color. Only the 15 or so colors a sprite
// uses are mapped, at render time, so it costs nothing per pixel.

const hex = (s) => s.split(' ').map((c) => `#${c}`)
export const PALETTES = {
  gameboy: { colors: hex('0f380f 306230 8bac0f 9bbc0f'), by: 'light', note: 'the original Game Boy greens' },
  'gameboy-pocket': { colors: hex('081820 346856 88c070 e0f8d0'), by: 'light', note: 'a softer Game Boy palette' },
  'pico-8': { colors: hex('000000 1d2b53 7e2553 008751 ab5236 5f574f c2c3c7 fff1e8 ff004d ffa300 ffec27 00e436 29adff 83769c ff77a8 ffccaa'), by: 'nearest', note: 'PICO-8 by Lexaloffle' },
  'sweetie-16': { colors: hex('1a1c2c 5d275d b13e53 ef7d57 ffcd75 a7f070 38b764 257179 29366f 3b5dc9 41a6f6 73eff7 f4f4f4 94b0c2 566c86 333c57'), by: 'nearest', note: 'Sweetie 16 by GrafxKid' },
  c64: { colors: hex('000000 ffffff 68372b 70a4b2 6f3d86 588d43 352879 b8c76f 6f4f25 433900 9a6759 444444 6c6c6c 9ad284 6c5eb5 959595'), by: 'nearest', note: 'Commodore 64 (Pepto)' },
  cga: { colors: hex('000000 55ffff ff55ff ffffff'), by: 'nearest', note: 'CGA mode 4, palette 1' },
  'virtual-boy': { colors: hex('000000 550000 aa0000 ff0000'), by: 'light', note: 'four shades of red' },
  '1-bit': { colors: hex('000000 ffffff'), by: 'light', note: 'black and white' },
  sepia: { colors: hex('2b1d14 5c4033 8b6b4a b99a73 e8d5b0'), by: 'light', note: 'an old photo' },
}

const parse = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
let active = null // { name, colors: [[r,g,b]], by, cache: Map }

function prepare(name) {
  if (name == null) return null
  const p = Array.isArray(name) ? { colors: name, by: 'nearest' } : PALETTES[name]
  if (!p) throw new Error(`pixspell: no palette called "${name}". Palettes: ${Object.keys(PALETTES).join(', ')} (or pass an array of colors)`)
  const colors = p.colors.map((c) => (typeof c === 'string' ? parse(c) : c.slice(0, 3)))
  const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
  if (p.by === 'light') colors.sort((a, b) => lum(a) - lum(b))
  return { name: Array.isArray(name) ? 'custom' : name, colors, by: p.by, lum, cache: new Map() }
}

/** Map one [r, g, b, a] color through a prepared palette. */
function mapWith(pal, c) {
  const key = (c[0] << 16) | (c[1] << 8) | c[2]
  let out = pal.cache.get(key)
  if (!out) {
    if (pal.by === 'light') {
      // a little extra contrast: sprite colors sit mostly in the middle, consoles want their darkest and lightest used
      const n = pal.colors.length, l = Math.min(1, Math.max(0, (pal.lum(c) / 255 - 0.12) / 0.72))
      out = pal.colors[Math.min(n - 1, Math.floor(l * n))]
    } else {
      let best = pal.colors[0], bestD = Infinity
      for (const p of pal.colors) {
        const dr = c[0] - p[0], dg = c[1] - p[1], db = c[2] - p[2]
        const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db
        if (d < bestD) { bestD = d; best = p }
      }
      out = best
    }
    pal.cache.set(key, out)
  }
  return [out[0], out[1], out[2], c[3] ?? 255]
}

/** The active palette's mapping for render(), or null for full color. */
export const paletteColor = (c) => (active ? mapWith(active, c) : c)
export const activePalette = () => active?.name ?? null
export function setPalette(name) { active = prepare(name); return active?.name ?? null }

/** Snap an image or frames to the active palette (for anything that mixes colors after rendering: flashes, fades, overlays). */
export function applyActive(img) {
  if (!active) return img
  const one = (p) => p.map((c) => (c[3] ? mapWith(active, c) : c))
  if (!Array.isArray(img)) return one(img)
  const out = img.map(one)
  for (const k of ['fps', 'loop']) if (img[k] !== undefined) out[k] = img[k]
  return out
}

/** Convert a Pixmap (or frames) to a palette now, whatever the active one is. */
export function toPalette(img, name) {
  const pal = prepare(name)
  if (!pal) return img
  const one = (p) => p.map((c) => (c[3] ? mapWith(pal, c) : c))
  if (Array.isArray(img)) {
    const out = img.map(one)
    for (const k of ['fps', 'loop']) if (img[k] !== undefined) out[k] = img[k]
    return out
  }
  return one(img)
}
