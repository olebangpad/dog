// Bring your own pixel art in: read a PNG and turn the picture into a PixSpell sprite (text art + color ramps),
// so it recolors, resizes to any tile grid, takes palettes and sits in packs like the built-in sprites.
//
//   const img = decodePNG(bytes, inflate)        // Node: zlib.inflateSync; browsers: draw it on a canvas instead
//   const { def, code } = spriteFromImage(img, { id: 'my-sword' })
//   spell.define(def)                            // now spell('my-sword', { A: 'gold' }) works
//
// How the colors are read: dark pixels next to the empty background become the outline (#). The other colors are
// grouped by hue into up to three groups (ramps A, B, C), each split into 4 shades by brightness; near-white
// becomes the white highlight (w). Each ramp keeps the image's own colors, so the sprite looks the same until you
// recolor it.

import { Pixmap } from './pixmap.js'
import { rgbToHsl, toHex } from './color.js'

// ------------------------------------------------------------------ PNG reading
const sig = [137, 80, 78, 71, 13, 10, 26, 10]
/** Decode a PNG (8-bit gray / RGB / RGBA / gray+alpha / palette; also 1, 2, 4-bit palette and gray). */
export function decodePNG(bytes, inflate) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (!sig.every((v, i) => b[i] === v)) throw new Error('pixspell: not a PNG file')
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength)
  let w = 0, h = 0, depth = 8, type = 6, interlace = 0, palette = null, trns = null
  const idat = []
  for (let o = 8; o < b.length;) {
    const len = dv.getUint32(o), name = String.fromCharCode(...b.subarray(o + 4, o + 8)), d = b.subarray(o + 8, o + 8 + len)
    if (name === 'IHDR') { w = dv.getUint32(o + 8); h = dv.getUint32(o + 12); depth = d[8]; type = d[9]; interlace = d[12] }
    else if (name === 'PLTE') palette = d
    else if (name === 'tRNS') trns = d
    else if (name === 'IDAT') idat.push(d)
    else if (name === 'IEND') break
    o += 12 + len
  }
  if (interlace) throw new Error('pixspell: interlaced PNGs are not supported; save it without interlacing')
  if (depth === 16) throw new Error('pixspell: 16-bit PNGs are not supported; save it as 8-bit')
  const all = new Uint8Array(idat.reduce((n, d) => n + d.length, 0))
  idat.reduce((o, d) => (all.set(d, o), o + d.length), 0)
  const raw = inflate(all)
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type]
  const bpp = Math.max(1, (channels * depth) >> 3), stride = Math.ceil((w * channels * depth) / 8)
  const px = new Uint8Array(stride * h)
  let prev = new Uint8Array(stride)
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1)), cur = new Uint8Array(stride)
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0, up = prev[x], c = x >= bpp ? prev[x - bpp] : 0
      let v = line[x]
      if (f === 1) v += a
      else if (f === 2) v += up
      else if (f === 3) v += (a + up) >> 1
      else if (f === 4) { const p = a + up - c, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? up : c }
      cur[x] = v & 255
    }
    px.set(cur, y * stride)
    prev = cur
  }
  const img = new Pixmap(w, h)
  const sample = (y, i) => { // the i-th sample of row y at this bit depth
    if (depth === 8) return px[y * stride + i]
    const bit = i * depth, byte = px[y * stride + (bit >> 3)]
    return (byte >> (8 - depth - (bit & 7))) & ((1 << depth) - 1)
  }
  const scale = depth === 8 ? 1 : 255 / ((1 << depth) - 1)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let c
    if (type === 6) c = [0, 1, 2, 3].map((k) => sample(y, x * 4 + k))
    else if (type === 2) { c = [0, 1, 2].map((k) => sample(y, x * 3 + k)); c.push(trns && trns.length >= 6 && c[0] === trns[1] && c[1] === trns[3] && c[2] === trns[5] ? 0 : 255) }
    else if (type === 3) { const i = sample(y, x); c = [palette[i * 3], palette[i * 3 + 1], palette[i * 3 + 2], trns && i < trns.length ? trns[i] : 255] }
    else if (type === 0) { const g = Math.round(sample(y, x) * scale); c = [g, g, g, trns && trns.length >= 2 && sample(y, x) === ((trns[0] << 8) | trns[1]) ? 0 : 255] }
    else if (type === 4) { const g = sample(y, x * 2); c = [g, g, g, sample(y, x * 2 + 1)] }
    img.set(x, y, c)
  }
  return img
}

// ------------------------------------------------------------------ image -> sprite
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b

/**
 * Turn an image (or frames of one animation) into a sprite definition.
 * opts: id, ramps (max 3), outline (true: dark edge pixels become #), white (true: near-white becomes w).
 * Returns { def, code, ramps, warnings }.
 */
export function spriteFromImage(input, { id = 'my-sprite', ramps: maxRamps = 3, outline = true, white = true, tags = [] } = {}) {
  const frames = Array.isArray(input) ? input : [input]
  const { w, h } = frames[0]
  if (frames.some((f) => f.w !== w || f.h !== h)) throw new Error('pixspell: every frame must be the same size')
  if (w > 64 || h > 64) throw new Error(`pixspell: sprites are at most 64x64; this one is ${w}x${h}`)
  const warnings = []
  const key = (c) => (c[0] << 16) | (c[1] << 8) | c[2]
  const solid = (f, x, y) => x >= 0 && y >= 0 && x < w && y < h && f.get(x, y)[3] >= 128
  // 1. count colors and find outline colors: dark, and touching the background
  const counts = new Map(), edgeDark = new Set()
  for (const f of frames) for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = f.get(x, y)
    if (c[3] < 128) continue
    counts.set(key(c), (counts.get(key(c)) ?? 0) + 1)
    const nearBg = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !solid(f, x + dx, y + dy))
    if (outline && nearBg && lum(c) < 70) edgeDark.add(key(c))
  }
  if (!counts.size) throw new Error('pixspell: the image is empty')
  const colorOf = (k) => [(k >> 16) & 255, (k >> 8) & 255, k & 255]
  const isWhite = (c) => { const [, s, l] = rgbToHsl(...c); return white && l > 0.9 && s < 0.25 }
  const rest = [...counts.keys()].filter((k) => !edgeDark.has(k) && !isWhite(colorOf(k)))
  // 2. group the rest by hue (greys get their own group) into at most maxRamps groups, the most used first
  const hueOf = (k) => { const [hh, s] = rgbToHsl(...colorOf(k)); return s < 0.15 ? -1 : hh }
  const groups = []
  for (const k of rest.sort((a, b) => counts.get(b) - counts.get(a))) {
    const hk = hueOf(k)
    let best = null, bestD = Infinity
    for (const g of groups) {
      const d = hk < 0 || g.hue < 0 ? (hk === g.hue ? 0 : 999) : Math.min(Math.abs(hk - g.hue), 360 - Math.abs(hk - g.hue))
      if (d < bestD) { bestD = d; best = g }
    }
    if (best && (bestD <= 40 || groups.length >= maxRamps)) best.keys.push(k)
    else groups.push({ hue: hk, keys: [k] })
  }
  // a group with more than 4 colors while a ramp is still free: split it where the hues are furthest apart
  // (or, for greys, where the brightness jumps most)
  while (groups.length < maxRamps) {
    const big = groups.filter((g) => g.keys.length > 4).sort((a, b) => b.keys.length - a.keys.length)[0]
    if (!big) break
    const val = big.hue < 0 ? (k) => lum(colorOf(k)) : (k) => hueOf(k)
    const sorted = [...big.keys].sort((a, b) => val(a) - val(b))
    let at = 1, gap = -1
    for (let i = 1; i < sorted.length; i++) { const d = val(sorted[i]) - val(sorted[i - 1]); if (d > gap) { gap = d; at = i } }
    big.keys = sorted.slice(0, at)
    groups.push({ hue: big.hue < 0 ? -1 : hueOf(sorted[at]), keys: sorted.slice(at) })
  }
  if (groups.some((g) => g.keys.length > 4)) warnings.push('some colors were merged into the nearest shade')
  // 3. each group: 4 shades by brightness; the ramp is 4 of its own colors (spread from dark to light)
  const slots = ['A', 'B', 'C'], digits = { A: '1234', B: '5678', C: 'abcd' }
  const shadeOf = new Map(), rampsOut = {}
  groups.forEach((g, gi) => {
    const slot = slots[gi]
    const sorted = g.keys.sort((a, b) => lum(colorOf(a)) - lum(colorOf(b)))
    const n = sorted.length
    const pick = n >= 4 ? [0, 1, 2, 3].map((i) => sorted[Math.round((i * (n - 1)) / 3)]) : [...sorted, ...Array(4 - n).fill(sorted[n - 1])]
    // fill a short ramp out to 4 shades: darker below, lighter above
    if (n < 4) {
      const base = colorOf(sorted[0]), top = colorOf(sorted[n - 1])
      const shade = (c, k) => c.map((v) => Math.round(Math.max(0, Math.min(255, v * k))))
      if (n === 1) { pick[0] = key(shade(base, 0.55)); pick[1] = key(shade(base, 0.78)); pick[2] = sorted[0]; pick[3] = key(shade(base, 1.22)) }
      else if (n === 2) { pick[0] = key(shade(base, 0.7)); pick[1] = sorted[0]; pick[2] = sorted[1]; pick[3] = key(shade(top, 1.18)) }
      else { pick[0] = sorted[0]; pick[1] = sorted[1]; pick[2] = sorted[2]; pick[3] = key(shade(top, 1.15)) }
    }
    rampsOut[slot] = pick.map((k) => toHex(colorOf(k)))
    // every original color goes to the shade of the ramp color nearest in brightness
    for (const k of sorted) {
      const l = lum(colorOf(k))
      let best = 0, bestD = Infinity
      pick.forEach((p, i) => { const d = Math.abs(lum(colorOf(p)) - l); if (d < bestD) { bestD = d; best = i } })
      shadeOf.set(k, digits[slot][best])
    }
  })
  // 4. write the art
  const charOf = (c) => (c[3] < 128 ? '.' : edgeDark.has(key(c)) ? '#' : isWhite(c) ? 'w' : shadeOf.get(key(c)) ?? '#')
  const art = frames.map((f) => Array.from({ length: h }, (_, y) => Array.from({ length: w }, (_, x) => charOf(f.get(x, y))).join('')))
  const def = { id, tags, ramps: rampsOut, ...(frames.length > 1 ? { fps: 6, frames: art.map((rows) => rows.join('\n')) } : { art: art[0].join('\n') }) }
  const ind = (rows, pad) => rows.map((r) => `${pad}${r}`).join('\n')
  const code = `{
  id: ${JSON.stringify(id)},
  tags: ${JSON.stringify(tags)},
  ramps: { ${Object.entries(rampsOut).map(([k, v]) => `${k}: [${v.map((c) => `"${c}"`).join(', ')}]`).join(', ')} },
  variants: {},
${frames.length > 1
    ? `  fps: 6,\n  frames: [\n${art.map((rows) => `    \`\n${ind(rows, '      ')}\n    \`,`).join('\n')}\n  ],`
    : `  art: \`\n${ind(art[0], '    ')}\n  \`,`}
}`
  return { def, code, ramps: rampsOut, warnings }
}
