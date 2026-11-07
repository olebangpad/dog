// Animated GIF encoder, no dependencies: for sharing animations where APNG doesn't play (chat apps, social posts).
//
//   encodeGIF(frames, { fps: 12 })                          transparent background (alpha below 128 is clear)
//   encodeGIF(frames, { fps: 12, background: '#1b1225' })   soft glows blended onto a color instead
//
// GIF has one-bit transparency and 256 colors per image. Pixel art rarely needs more; when an animation does (glows,
// fades), the colors are reduced with median cut to one shared palette, so nothing flickers between frames.

import { parseColor } from './color.js'

/** Shared palette for every frame: exact when there are <= maxColors colors, else median cut. */
function buildPalette(pixels, maxColors) {
  const counts = new Map()
  for (const px of pixels) for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue
    const key = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const colors = [...counts.entries()].map(([k, n]) => ({ c: [(k >> 16) & 255, (k >> 8) & 255, k & 255], n }))
  if (colors.length <= maxColors) return colors.map((e) => e.c)
  // median cut: split the box with the widest channel range (weighted by pixel count) until there are enough boxes
  let boxes = [colors]
  while (boxes.length < maxColors) {
    let best = -1, bestRange = -1, bestCh = 0
    boxes.forEach((b, i) => {
      if (b.length < 2) return
      for (let ch = 0; ch < 3; ch++) {
        let lo = 255, hi = 0
        for (const e of b) { lo = Math.min(lo, e.c[ch]); hi = Math.max(hi, e.c[ch]) }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestCh = ch }
      }
    })
    if (best < 0) break
    const box = boxes[best].sort((a, b) => a.c[bestCh] - b.c[bestCh])
    const total = box.reduce((s, e) => s + e.n, 0)
    let acc = 0, cut = 1
    for (let i = 0; i < box.length - 1; i++) { acc += box[i].n; if (acc >= total / 2) { cut = i + 1; break } }
    boxes.splice(best, 1, box.slice(0, cut), box.slice(cut))
  }
  return boxes.map((b) => {
    const total = b.reduce((s, e) => s + e.n, 0)
    return [0, 1, 2].map((ch) => Math.round(b.reduce((s, e) => s + e.c[ch] * e.n, 0) / total))
  })
}

/** LZW-compress color indexes the way GIF wants (variable code size, clear code at 4096). */
function lzw(indexes, minCodeSize) {
  const clear = 1 << minCodeSize, end = clear + 1
  const out = []
  let bitBuf = 0, bitLen = 0
  let codeSize = minCodeSize + 1
  const emit = (code) => {
    bitBuf |= code << bitLen
    bitLen += codeSize
    while (bitLen >= 8) { out.push(bitBuf & 255); bitBuf >>>= 8; bitLen -= 8 }
  }
  let dict = new Map(), next = end + 1
  emit(clear)
  let prefix = indexes[0]
  for (let i = 1; i < indexes.length; i++) {
    const k = indexes[i], key = prefix * 4096 + k
    const hit = dict.get(key)
    if (hit !== undefined) { prefix = hit; continue }
    emit(prefix)
    if (next < 4096) {
      dict.set(key, next++)
      if (next > (1 << codeSize) && codeSize < 12) codeSize++
    } else {
      emit(clear)
      dict = new Map(); next = end + 1; codeSize = minCodeSize + 1
    }
    prefix = k
  }
  emit(prefix)
  emit(end)
  if (bitLen > 0) out.push(bitBuf & 255)
  return out
}

/**
 * Frames (Pixmaps of one size, or of different sizes: each is centered on the largest) -> GIF bytes.
 * opts: fps (8), loops (0 = forever), background (a color to blend partial alpha onto; default transparent).
 */
export function encodeGIF(frames, { fps = 8, loops = 0, background = null } = {}) {
  if (!frames.length) throw new Error('pixspell: a GIF needs at least one frame')
  const w = Math.max(...frames.map((f) => f.w)), h = Math.max(...frames.map((f) => f.h))
  const bg = background ? parseColor(background) : null
  // flatten every frame to w x h, either onto the background or to on/off transparency
  const flat = frames.map((f) => {
    const px = new Uint8ClampedArray(w * h * 4)
    const ox = (w - f.w) >> 1, oy = (h - f.h) >> 1
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4
      const sx = x - ox, sy = y - oy
      const inside = sx >= 0 && sy >= 0 && sx < f.w && sy < f.h
      const s = inside ? (sy * f.w + sx) * 4 : -1
      const a = s >= 0 ? f.data[s + 3] / 255 : 0
      if (bg) {
        for (let k = 0; k < 3; k++) px[o + k] = Math.round((s >= 0 ? f.data[s + k] : 0) * a + bg[k] * (1 - a))
        px[o + 3] = 255
      } else if (a >= 0.5) {
        for (let k = 0; k < 3; k++) px[o + k] = f.data[s + k]
        px[o + 3] = 255
      }
    }
    return px
  })
  const palette = buildPalette(flat, bg ? 256 : 255)
  const transparent = bg ? -1 : palette.length // the slot after the colors
  let bits = 1
  while ((1 << bits) < palette.length + (bg ? 0 : 1)) bits++
  const size = 1 << bits
  const cache = new Map()
  const nearest = (r, g, b) => {
    const key = (r << 16) | (g << 8) | b
    let i = cache.get(key)
    if (i === undefined) {
      let bestD = Infinity
      palette.forEach((c, j) => { const d = (c[0] - r) ** 2 * 2 + (c[1] - g) ** 2 * 4 + (c[2] - b) ** 2 * 3; if (d < bestD) { bestD = d; i = j } })
      cache.set(key, i)
    }
    return i
  }

  const bytes = []
  const u16 = (v) => bytes.push(v & 255, (v >> 8) & 255)
  const str = (s) => { for (const ch of s) bytes.push(ch.charCodeAt(0)) }
  str('GIF89a')
  u16(w); u16(h)
  bytes.push(0x80 | ((bits - 1) << 4) | (bits - 1), 0, 0) // global color table, its size
  for (let i = 0; i < size; i++) { const c = palette[i] ?? [0, 0, 0]; bytes.push(c[0], c[1], c[2]) }
  // loop forever (or n times)
  bytes.push(0x21, 0xff, 11); str('NETSCAPE2.0'); bytes.push(3, 1); u16(loops); bytes.push(0)
  const delay = Math.max(2, Math.round(100 / fps))
  for (const px of flat) {
    // graphic control: delay, transparency, disposal 2 (restore to background) so clear pixels stay clear
    bytes.push(0x21, 0xf9, 4, (2 << 2) | (transparent >= 0 ? 1 : 0)); u16(delay); bytes.push(transparent >= 0 ? transparent : 0, 0)
    bytes.push(0x2c); u16(0); u16(0); u16(w); u16(h); bytes.push(0)
    const idx = new Uint8Array(w * h)
    for (let i = 0; i < w * h; i++) idx[i] = px[i * 4 + 3] ? nearest(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) : transparent
    const min = Math.max(2, bits)
    bytes.push(min)
    const data = lzw(idx, min)
    for (let i = 0; i < data.length; i += 255) {
      const chunk = data.slice(i, i + 255)
      bytes.push(chunk.length, ...chunk)
    }
    bytes.push(0)
  }
  bytes.push(0x3b)
  return new Uint8Array(bytes)
}
