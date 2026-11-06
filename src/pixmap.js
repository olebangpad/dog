// Pixmap: a tiny immutable RGBA image with pixel-art friendly operations.
// Every method returns a new Pixmap, so calls chain:
//   spell('sword').scale(4).outline('#fff').shadow()

import { parseColor, rgbToHsl, hslToRgb, clamp01, toHex } from './color.js'
import { encodePNG, toBase64 } from './png.js'

const pack = (r, g, b, a) => a === 0 ? 0 : (((r << 24) | (g << 16) | (b << 8) | a) >>> 0)

export class Pixmap {
  constructor(w, h, data) {
    this.w = w | 0
    this.h = h | 0
    this.data = data ?? new Uint8ClampedArray(this.w * this.h * 4)
    this.x = 0 // placement offset, used by compose()
    this.y = 0
  }

  static create(w, h, fill) {
    const p = new Pixmap(w, h)
    if (fill) {
      const c = parseColor(fill)
      for (let i = 0; i < p.data.length; i += 4) p.data.set(c, i)
    }
    return p
  }

  /** Wrap browser ImageData (or any { width, height, data }). */
  static fromImageData({ width, height, data }) {
    return new Pixmap(width, height, new Uint8ClampedArray(data))
  }

  get width() { return this.w }
  get height() { return this.h }

  clone() {
    const p = new Pixmap(this.w, this.h, new Uint8ClampedArray(this.data))
    p.x = this.x; p.y = this.y
    return p
  }

  /** Same image, placed at (x, y) when passed to compose(). */
  at(x, y) {
    const p = this.clone()
    p.x = x | 0; p.y = y | 0
    return p
  }

  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return [0, 0, 0, 0]
    const i = (y * this.w + x) * 4, d = this.data
    return [d[i], d[i + 1], d[i + 2], d[i + 3]]
  }

  /** Mutating setter. Prefer the chainable methods in user code. */
  set(x, y, c) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return this
    this.data.set(c, (y * this.w + x) * 4)
    return this
  }

  key(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0
    const i = (y * this.w + x) * 4, d = this.data
    return pack(d[i], d[i + 1], d[i + 2], d[i + 3])
  }

  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0
    return this.data[(y * this.w + x) * 4 + 3]
  }

  /** 32-bit view of the pixels: one element per pixel, for fast copies. */
  _u32() {
    const d = this.data
    return d.byteOffset % 4 === 0 ? new Uint32Array(d.buffer, d.byteOffset, this.w * this.h) : new Uint32Array(new Uint8ClampedArray(d).buffer)
  }

  _blank(w, h) {
    const p = new Pixmap(w, h)
    p.x = this.x; p.y = this.y
    return p
  }

  _new(w, h, fn) {
    const p = new Pixmap(w, h)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = fn(x, y)
      if (c) p.data.set(c, (y * w + x) * 4)
    }
    p.x = this.x; p.y = this.y
    return p
  }

  // ---------------------------------------------------------------- size

  /**
   * scale(4)   -> 4x bigger, crisp nearest-neighbour
   * scale(0.5) -> half size, keeps the most common color per block
   */
  scale(n) {
    if (n === 1) return this.clone()
    if (n < 1) return this.downscale(Math.round(1 / n))
    if (!Number.isInteger(n)) return this.resize(Math.round(this.w * n), Math.round(this.h * n))
    const { w, h } = this, W = w * n
    const out = this._blank(W, h * n), src = this._u32(), dst = out._u32()
    for (let y = 0; y < h; y++) {
      const row = y * n * W
      for (let x = 0; x < w; x++) {
        const v = src[y * w + x]
        if (v) dst.fill(v, row + x * n, row + x * n + n)
      }
      for (let k = 1; k < n; k++) dst.copyWithin(row + k * W, row, row + W)
    }
    return out
  }

  /** Nearest-neighbour resize to any size. */
  resize(w, h = Math.round(this.h * (w / this.w))) {
    const out = this._blank(w, h), src = this._u32(), dst = out._u32()
    for (let y = 0; y < h; y++) {
      const sy = ((y * this.h) / h) | 0
      for (let x = 0; x < w; x++) dst[y * w + x] = src[sy * this.w + (((x * this.w) / w) | 0)]
    }
    return out
  }

  /** Shrink by an integer factor using majority vote, so outlines survive. */
  downscale(k) {
    k = Math.max(1, k | 0)
    const w = Math.max(1, Math.ceil(this.w / k)), h = Math.max(1, Math.ceil(this.h / k))
    return this._new(w, h, (bx, by) => {
      const counts = new Map()
      let solid = 0, total = 0
      for (let y = by * k; y < Math.min(this.h, by * k + k); y++)
        for (let x = bx * k; x < Math.min(this.w, bx * k + k); x++) {
          total++
          const key = this.key(x, y)
          if (!key) continue
          solid++
          counts.set(key, (counts.get(key) || 0) + 1)
        }
      if (solid * 2 < total) return null
      let best = 0, bestN = -1
      for (const [c, n] of counts) if (n > bestN) { best = c; bestN = n }
      return [best >>> 24, (best >>> 16) & 255, (best >>> 8) & 255, best & 255]
    })
  }

  /** Scale2x / EPX: doubles size and rounds off stair-steps. Call twice for 4x. */
  smooth(times = 1) {
    let src = this
    for (let t = 0; t < times; t++) {
      const s = src
      src = s._new(s.w * 2, s.h * 2, (x, y) => {
        const px = x >> 1, py = y >> 1
        const P = s.key(px, py), A = s.key(px, py - 1), B = s.key(px + 1, py)
        const C = s.key(px - 1, py), D = s.key(px, py + 1)
        const right = x & 1, bottom = y & 1
        let pick = [px, py]
        if (!right && !bottom && C === A && C !== D && A !== B) pick = [px, py - 1]
        else if (right && !bottom && A === B && A !== C && B !== D) pick = [px + 1, py]
        else if (!right && bottom && D === C && D !== B && C !== A) pick = [px - 1, py]
        else if (right && bottom && B === D && B !== A && D !== C) pick = [px, py + 1]
        return s.get(pick[0], pick[1])
      })
    }
    return src
  }

  pad(t = 1, r = t, b = t, l = r) {
    return this.crop(-l, -t, this.w + l + r, this.h + t + b)
  }

  crop(x0, y0, w, h) {
    const out = this._blank(w, h), src = this._u32(), dst = out._u32()
    const sx0 = Math.max(0, x0), sx1 = Math.min(this.w, x0 + w)
    if (sx1 > sx0) {
      for (let y = Math.max(0, -y0); y < h; y++) {
        const sy = y + y0
        if (sy >= this.h) break
        dst.set(src.subarray(sy * this.w + sx0, sy * this.w + sx1), y * w + (sx0 - x0))
      }
    }
    return out
  }

  /** Remove transparent borders. */
  trim() {
    let x0 = this.w, y0 = this.h, x1 = -1, y1 = -1
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++)
      if (this.alpha(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    if (x1 < 0) return new Pixmap(1, 1)
    return this.crop(x0, y0, x1 - x0 + 1, y1 - y0 + 1)
  }

  // ------------------------------------------------------------ transform

  flipX() {
    const { w, h } = this, out = this._blank(w, h), src = this._u32(), dst = out._u32()
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) dst[y * w + x] = src[y * w + w - 1 - x]
    return out
  }

  flipY() {
    const { w, h } = this, out = this._blank(w, h), src = this._u32(), dst = out._u32()
    for (let y = 0; y < h; y++) dst.set(src.subarray((h - 1 - y) * w, (h - y) * w), y * w)
    return out
  }

  /** Rotate clockwise by 90, 180 or 270 degrees. */
  rotate(deg = 90) {
    const d = ((Math.round(deg / 90) % 4) + 4) % 4
    if (d === 0) return this.clone()
    const { w, h } = this, src = this._u32()
    const out = d === 2 ? this._blank(w, h) : this._blank(h, w), dst = out._u32()
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const v = src[y * w + x]
      if (d === 2) dst[(h - 1 - y) * w + (w - 1 - x)] = v
      else if (d === 1) dst[x * h + (h - 1 - y)] = v // clockwise: (x, y) -> (h-1-y, x)
      else dst[(w - 1 - x) * h + y] = v
    }
    return out
  }

  // -------------------------------------------------------------- effects

  /** 1px outline around the shape. Grows the image by 1px on each side. */
  outline(color = '#000', { corners = false } = {}) {
    const src = this.pad(1), { w, h, data } = src
    const out = src.clone(), dst = out._u32()
    const cv = new Uint32Array(new Uint8ClampedArray(parseColor(color)).buffer)[0]
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] !== 0
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]) continue
      if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1) ||
        (corners && (solid(x - 1, y - 1) || solid(x + 1, y - 1) || solid(x - 1, y + 1) || solid(x + 1, y + 1)))) dst[y * w + x] = cv
    }
    return out
  }

  /** Drop shadow. Grows the image so the shadow is not clipped. */
  shadow(color = '#00000066', dx = 1, dy = 1) {
    const sil = this.silhouette(color)
    const p = new Pixmap(this.w + Math.abs(dx), this.h + Math.abs(dy))
    p.x = this.x; p.y = this.y
    return p.draw(sil, Math.max(0, dx), Math.max(0, dy)).draw(this, Math.max(0, -dx), Math.max(0, -dy))
  }

  /** Paint every visible pixel one flat color (hit flash, shadows, icons). */
  silhouette(color = '#fff') {
    const [r, g, b, a] = parseColor(color)
    return this.map((p) => [r, g, b, Math.round((p[3] * a) / 255)])
  }

  /** Apply fn([r,g,b,a], x, y) -> [r,g,b,a] to every visible pixel. */
  map(fn) {
    return this._new(this.w, this.h, (x, y) => {
      const p = this.get(x, y)
      return p[3] ? fn(p, x, y) : null
    })
  }

  // ---------------------------------------------------------------- color

  /** Shift hue (degrees), multiply saturation, add lightness (-1..1). */
  adjust({ hue = 0, saturation = 1, lightness = 0 } = {}) {
    if (!hue && saturation === 1 && !lightness) return this.clone()
    return this.map(([r, g, b, a]) => {
      const [h, s, l] = rgbToHsl(r, g, b)
      return [...hslToRgb(h + hue, clamp01(s * saturation), clamp01(l + lightness)), a]
    })
  }
  hue(deg) { return this.adjust({ hue: deg }) }
  saturate(f) { return this.adjust({ saturation: f }) }
  lighten(v) { return this.adjust({ lightness: v }) }
  grayscale() { return this.adjust({ saturation: 0 }) }
  invert() { return this.map(([r, g, b, a]) => [255 - r, 255 - g, 255 - b, a]) }
  opacity(f) { return this.map(([r, g, b, a]) => [r, g, b, Math.round(a * clamp01(f))]) }

  /** Mix every pixel toward a color: tint('#f00', 0.5). */
  tint(color, amount = 0.5) {
    const [tr, tg, tb] = parseColor(color)
    const m = (v, t) => Math.round(v + (t - v) * amount)
    return this.map(([r, g, b, a]) => [m(r, tr), m(g, tg), m(b, tb), a])
  }

  /** Replace exact colors: swap('#ff0000', '#00ff00') or swap({ '#f00': '#0f0' }). */
  swap(from, to) {
    const table = new Map()
    const pairs = typeof from === 'object' && !Array.isArray(from) ? Object.entries(from) : [[from, to]]
    for (const [f, t] of pairs) table.set(pack(...parseColor(f)), parseColor(t))
    return this.map((p) => table.get(pack(...p)) ?? p)
  }

  /** Snap every color to the nearest color of a palette. */
  quantize(palette) {
    const pal = palette.map(parseColor)
    return this.map(([r, g, b, a]) => {
      let best = pal[0], bestD = Infinity
      for (const c of pal) {
        const dr = r - c[0], dg = g - c[1], db = b - c[2]
        const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db
        if (d < bestD) { bestD = d; best = c }
      }
      return [best[0], best[1], best[2], a]
    })
  }

  /** Unique visible colors as hex strings. */
  colors() {
    const set = new Set()
    for (let i = 0; i < this.data.length; i += 4)
      if (this.data[i + 3]) set.add(toHex([this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]]))
    return [...set]
  }

  // ------------------------------------------------------------ combining

  /** Alpha-blend another Pixmap on top at (x, y). Returns a new Pixmap. */
  draw(img, x = img.x, y = img.y) {
    return this.clone()._blit(img, x, y)
  }

  /** In-place alpha blend. Internal: only for images a function just created itself (sheet, compose). */
  _blit(img, x = img.x, y = img.y) {
    const p = this
    const d = p.data, s = img.data
    for (let sy = 0; sy < img.h; sy++) {
      const ty = sy + y
      if (ty < 0 || ty >= p.h) continue
      for (let sx = 0; sx < img.w; sx++) {
        const tx = sx + x
        if (tx < 0 || tx >= p.w) continue
        const si = (sy * img.w + sx) * 4, sa = s[si + 3]
        if (!sa) continue
        const ti = (ty * p.w + tx) * 4
        if (sa === 255) { d[ti] = s[si]; d[ti + 1] = s[si + 1]; d[ti + 2] = s[si + 2]; d[ti + 3] = 255; continue }
        const a = sa / 255, da = d[ti + 3] / 255, oa = a + da * (1 - a)
        for (let k = 0; k < 3; k++) d[ti + k] = (s[si + k] * a + d[ti + k] * da * (1 - a)) / oa
        d[ti + 3] = oa * 255
      }
    }
    return p
  }

  // --------------------------------------------------------------- output

  toPNG(opts) { return encodePNG(this, opts) }
  toDataURL() { return 'data:image/png;base64,' + toBase64(this.toPNG()) }

  /** Browser: draw into a <canvas> (creates one if not given). */
  toCanvas(canvas = document.createElement('canvas')) {
    canvas.width = this.w
    canvas.height = this.h
    canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(this.data), this.w, this.h), 0, 0)
    return canvas
  }

  /** Node: write a compressed PNG file. */
  async save(path) {
    const [{ writeFile }, { deflateSync }] = await Promise.all([import('node:fs/promises'), import('node:zlib')])
    await writeFile(path, this.toPNG({ deflate: (b) => deflateSync(b, { level: 9 }) }))
    return path
  }
}

/**
 * Stack layers into one image. Later layers draw on top.
 * Offsets come from .at(x, y); the canvas grows to fit every layer.
 *   compose(spell('hero'), spell('crown').at(0, -5))
 */
export function compose(...layers) {
  layers = layers.flat().filter(Boolean)
  if (!layers.length) return new Pixmap(1, 1)
  const x0 = Math.min(...layers.map((l) => l.x)), y0 = Math.min(...layers.map((l) => l.y))
  const x1 = Math.max(...layers.map((l) => l.x + l.w)), y1 = Math.max(...layers.map((l) => l.y + l.h))
  const out = new Pixmap(x1 - x0, y1 - y0)
  for (const l of layers) out._blit(l, l.x - x0, l.y - y0) // the canvas is ours: draw in place, no copy per layer
  return out
}

/** Pack images into a grid sprite sheet. Returns { image, frames: [{x,y,w,h}] }. */
export function sheet(images, { columns = images.length, gap = 0, padding = 0, background } = {}) {
  const cw = Math.max(...images.map((i) => i.w)), ch = Math.max(...images.map((i) => i.h))
  const cols = Math.max(1, Math.min(columns, images.length)), rows = Math.ceil(images.length / cols)
  const image = Pixmap.create(padding * 2 + cols * cw + (cols - 1) * gap, padding * 2 + rows * ch + (rows - 1) * gap, background)
  const frames = images.map((img, i) => {
    const x = padding + (i % cols) * (cw + gap) + ((cw - img.w) >> 1)
    const y = padding + ((i / cols) | 0) * (ch + gap) + (ch - img.h)
    image._blit(img, x, y) // in place: copying the whole sheet per frame made big atlases quadratic
    return { x, y, w: img.w, h: img.h }
  })
  return { image, frames }
}
