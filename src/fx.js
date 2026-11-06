// FX engine: effects as tiny recipes instead of hand-drawn frames.
//
// A recipe paints soft shapes into intensity fields (one per color ramp A/B/C),
// and the engine turns each frame into ordinary PixSpell text art: shades 1-4 / 5-8 / a-d
// plus white for hot cores. So every effect is a normal recolorable sprite.
//
//   const recipe = {
//     id: 'fx-burst', size: 32, frames: 8, fps: 14, color: 'orange',
//     draw(p, t) { p.glow(p.c, p.c, 4 + 10 * t, 1.2 - t) },
//   }
//
// Painter API (all coordinates in pixels, v = intensity, ~1 is full, >1.1 turns white):
//   p.use('A' | 'B' | 'C')            which ramp the next shapes go to
//   p.glow(x, y, r, v)                soft round falloff
//   p.disc(x, y, r, v, soft = 0.4)    filled circle, a little softer at the rim
//   p.ring(x, y, r, width, v)         circle outline
//   p.arc(x, y, r, width, a0, a1, v)  part of a ring (radians, clockwise from +x)
//   p.line(x0, y0, x1, y1, width, v0, v1 = v0)
//   p.blob(x, y, r, v, wobble, seed)  lumpy disc (smoke, fire)
//   p.star(x, y, r, points, v, inner) pointed star
//   p.spark(x, y, angle, length, v)   thin streak fading toward its tail
//   p.pt(x, y, v)                     one art pixel: 1px at 32px, 2x2 at 64px (dotted rings, sparkles)
//   p.dot(x, y, v)                    exactly one canvas pixel (fills)
//   p.glyph(char, x, y, v, scale)     3x5 font character, scaled by whole pixels
//   p.emit({...}) / p.particles(list, t, { shape })   seeded particles with gravity and drag
//   p.rng()                           seeded random number for this effect (same every frame)
// Recipe flags: loop, wrap (seamless tile: shapes continue across edges), dither, outline, core,
//   clean (remove lone pixels; turn off for text, whose glyphs have diagonal pixels),
//   top: 'B' (that layer wins wherever it is drawn), behind (status: draw behind the character)
//   p.c, p.size, p.s, p.px            center, size, scale (size / 32), one art pixel (max(1, round(s)))
// Write sizes and positions in s (10 * s, not 10) and 1px widths as p.px, so a recipe looks the
// same at any size; a test draws every recipe at 32 and 64 px and fails if it drifts.

import { glyphBits } from './font.js'
import { lazySprite } from './sprite.js'

const SHADES = { A: ['1', '2', '3', '4'], B: ['5', '6', '7', '8'], C: ['a', 'b', 'c', 'd'] }
const DARKEST = { A: '1', B: '5', C: 'a' }
const LAYER_OF = { 1: 'A', 2: 'A', 3: 'A', 4: 'A', w: 'A', 5: 'B', 6: 'B', 7: 'B', 8: 'B', a: 'C', b: 'C', c: 'C', d: 'C' }
// Intensity -> shade. The darkest shade (1 / 5 / a) is kept for the outline, so a fading
// effect shrinks and disappears instead of turning into a big dark blob.
const CUT = 0.3
const SHADE_AT = [0.52, 0.8] // >= CUT: shade 2, >= 0.52: shade 3, >= 0.8: shade 4
const WHITE_AT = 1.12
const BAYER = [0, 2, 3, 1] // 2x2 ordered dither

/** Element names effects understand, mapped to materials. */
export const FX_COLORS = {
  fire: 'orange', ice: 'ice', poison: 'lime', holy: 'gold', dark: 'purple',
  water: 'blue', nature: 'green', blood: 'red', arcane: 'pink', steel: 'bone',
}

export function hashSeed(str) {
  let h = 2166136261
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  return h >>> 0
}

export function mulberry(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

class Painter {
  constructor(size, seed, wrap = false) {
    this.wrap = wrap
    this.size = size
    this.c = size / 2
    this.s = size / 32
    /** One art pixel in canvas pixels: 1 up to 32px, 2 at 64px. Use it for 1px lines and dots that should scale. */
    this.px = Math.max(1, Math.round(this.s))
    this.fields = { A: new Float32Array(size * size), B: new Float32Array(size * size), C: new Float32Array(size * size) }
    this.cur = this.fields.A
    this.rng = mulberry(seed)
  }

  use(layer) { this.cur = this.fields[layer]; return this }

  _put(x, y, v) {
    if (v <= 0) return
    if (this.wrap) { x = ((x % this.size) + this.size) % this.size; y = ((y % this.size) + this.size) % this.size }
    else if (x < 0 || y < 0 || x >= this.size || y >= this.size) return
    const i = y * this.size + x
    if (v > this.cur[i]) this.cur[i] = v
  }

  _box(x, y, r, fn) {
    // with wrap on, shapes may cross an edge and continue on the other side
    const lo = this.wrap ? -Infinity : 0, hi = this.wrap ? Infinity : this.size - 1
    const x0 = Math.max(lo, Math.floor(x - r - 1)), x1 = Math.min(hi, Math.ceil(x + r + 1))
    const y0 = Math.max(lo, Math.floor(y - r - 1)), y1 = Math.min(hi, Math.ceil(y + r + 1))
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) fn(px, py, px + 0.5 - x, py + 0.5 - y)
  }

  /** Exactly one canvas pixel (fills, noise). */
  dot(x, y, v = 1) { this._put(Math.floor(x), Math.floor(y), v); return this }

  /** One art pixel: a 1px dot at 32px that grows to 2x2 at 64px, so dotted rings and sparkles keep their look. */
  pt(x, y, v = 1) {
    const k = this.px, x0 = Math.floor(x - (k - 1) / 2), y0 = Math.floor(y - (k - 1) / 2)
    for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) this._put(x0 + dx, y0 + dy, v)
    return this
  }

  glow(x, y, r, v = 1) {
    if (r <= 0) return this
    this._box(x, y, r, (px, py, dx, dy) => {
      const d = Math.hypot(dx, dy) / r
      if (d < 1) this._put(px, py, v * (1 - d * d))
    })
    return this
  }

  disc(x, y, r, v = 1, soft = 0.4) {
    if (r <= 0) return this
    this._box(x, y, r, (px, py, dx, dy) => {
      const d = Math.hypot(dx, dy) / r
      if (d <= 1) this._put(px, py, v * (1 - soft * d))
    })
    return this
  }

  ring(x, y, r, width = 1.5, v = 1) {
    if (r <= 0) return this
    const hw = width / 2
    this._box(x, y, r + hw, (px, py, dx, dy) => {
      const d = Math.abs(Math.hypot(dx, dy) - r)
      if (d <= hw) this._put(px, py, v * (1 - 0.35 * (d / hw)))
    })
    return this
  }

  arc(x, y, r, width, a0, a1, v = 1) {
    const hw = width / 2, span = a1 - a0
    this._box(x, y, r + hw, (px, py, dx, dy) => {
      const d = Math.abs(Math.hypot(dx, dy) - r)
      if (d > hw) return
      let a = Math.atan2(dy, dx) - a0
      a = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      if (a <= span) this._put(px, py, v * (1 - 0.35 * (d / hw)) * (0.55 + 0.45 * (a / span)))
    })
    return this
  }

  line(x0, y0, x1, y1, width = 1, v0 = 1, v1 = v0) {
    const len = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(len * 2))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, v = v0 + (v1 - v0) * t
      if (width <= 1) this._put(Math.floor(x), Math.floor(y), v)
      else this.disc(x, y, width / 2, v, 0.2)
    }
    return this
  }

  spark(x, y, angle, length, v = 1) {
    return this.line(x, y, x - Math.cos(angle) * length, y - Math.sin(angle) * length, this.px, v, v * 0.35)
  }

  blob(x, y, r, v = 1, wobble = 0.25, seed = 1) {
    if (r <= 0) return this
    const k = [1, 2, 3].map((n) => [((seed * 9301 + n * 49297) % 233280) / 233280 * 6.28, 2 + ((seed + n) % 3)])
    this._box(x, y, r * (1 + wobble), (px, py, dx, dy) => {
      const a = Math.atan2(dy, dx)
      const rr = r * (1 + wobble * (Math.sin(a * k[0][1] + k[0][0]) + Math.sin(a * k[1][1] + k[1][0]) * 0.6) / 1.6)
      const d = Math.hypot(dx, dy) / rr
      if (d <= 1) this._put(px, py, v * (1 - 0.45 * d))
    })
    return this
  }

  star(x, y, r, points = 4, v = 1, inner = 0.3) {
    this._box(x, y, r, (px, py, dx, dy) => {
      const a = Math.atan2(dy, dx) + Math.PI / 2
      const k = Math.abs(Math.cos((a * points) / 2))
      const lim = r * (inner + (1 - inner) * Math.pow(k, 6))
      const d = Math.hypot(dx, dy)
      if (d <= lim) this._put(px, py, v * (1 - 0.4 * (d / Math.max(1, lim))))
    })
    return this
  }

  /**
   * Seeded particles for setup(). Ranges are [min, max]; speeds are pixels per whole effect (t: 0 -> 1).
   *   p.emit({ count: 20, x: p.c, y: p.c, speed: [8, 16], angle: [0, TAU], gravity: 20, drag: 1.5 })
   */
  emit({ count = 12, x = this.c, y = this.c, speed = [6, 12], angle = [0, Math.PI * 2], gravity = 0, drag = 0, life = [0.6, 1], size = [1, 2], delay = [0, 0] } = {}) {
    const pick = ([a, b]) => a + (b - a) * this.rng()
    return Array.from({ length: count }, () => {
      const a = pick(angle), sp = pick(speed) * this.s
      return { x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: gravity * this.s, k: drag, life: pick(life), size: pick(size) * this.s, delay: pick(delay) }
    })
  }

  /** Where a particle is at effect time t (closed form, so any frame can be drawn on its own). */
  static where(q, t) {
    const tt = t - q.delay
    if (tt < 0 || tt > q.life) return null
    const f = q.k ? (1 - Math.exp(-q.k * tt)) / q.k : tt
    return { x: q.x + q.vx * f, y: q.y + q.vy * f + 0.5 * q.g * tt * tt, age: tt / q.life, dx: q.vx, dy: q.vy + q.g * tt }
  }

  /** Draw particles at time t. shape: 'dot' | 'disc' | 'spark' | 'star'. */
  particles(list, t, { v = 1, shape = 'disc', fade = 0.7, shrink = 0.6 } = {}) {
    for (const q of list) {
      const at = Painter.where(q, t)
      if (!at) continue
      const val = v * (1 - fade * at.age), r = q.size * (1 - shrink * at.age)
      if (shape === 'dot') this.pt(at.x, at.y, val)
      else if (shape === 'spark') this.spark(at.x, at.y, Math.atan2(at.dy, at.dx), Math.max(1, r * 2.5), val)
      else if (shape === 'star') this.star(at.x, at.y, Math.max(1, r * 1.5), 4, val, 0.2)
      else this.disc(at.x, at.y, Math.max(0.6, r), val, 0.25)
    }
    return this
  }

  glyph(ch, x, y, v = 1, scale = 1) {
    const bits = glyphBits(ch)
    if (!bits) return this
    const k = Math.max(1, Math.round(scale))
    for (let i = 0; i < 15; i++) {
      if (bits[i] !== '1') continue
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++)
        this._put(Math.floor(x) + (i % 3) * k + dx, Math.floor(y) + ((i / 3) | 0) * k + dy, v)
    }
    return this
  }
}

/** Turn the painter's fields into text-art rows. */
function quantize(p, { dither, core, top }) {
  const { size, fields } = p
  const rows = []
  for (let y = 0; y < size; y++) {
    let row = ''
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      let layer = 'A', v = fields.A[i]
      if (fields.B[i] > v) { layer = 'B'; v = fields.B[i] }
      if (fields.C[i] > v) { layer = 'C'; v = fields.C[i] }
      if (top && fields[top][i] >= CUT) { layer = top; v = fields[top][i] } // e.g. dark text on a bright burst
      if (dither) v += (BAYER[(x & 1) + (y & 1) * 2] / 3 - 0.5) * 0.12
      if (v < CUT) { row += '.'; continue }
      if (core && layer === 'A' && v >= WHITE_AT) { row += 'w'; continue }
      row += SHADES[layer][v >= SHADE_AT[1] ? 3 : v >= SHADE_AT[0] ? 2 : 1]
    }
    rows.push(row)
  }
  return rows
}

/** Remove pixels that have no filled 4-neighbour (single-pixel noise). */
function clean(rows, wrap) {
  const h = rows.length, w = rows[0].length
  const filled = (x, y) => {
    if (wrap) { x = (x + w) % w; y = (y + h) % h }
    return x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.'
  }
  return rows.map((r, y) => [...r].map((ch, x) => (ch !== '.' && !filled(x - 1, y) && !filled(x + 1, y) && !filled(x, y - 1) && !filled(x, y + 1) ? '.' : ch)).join(''))
}

/** Selective outline: empty pixels next to a shape take that ramp's darkest shade. */
function glowOutline(rows, wrap) {
  const h = rows.length, w = rows[0].length
  return rows.map((r, y) => [...r].map((ch, x) => {
    if (ch !== '.') return ch
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = wrap ? rows[(y + dy + h) % h][(x + dx + w) % w] : rows[y + dy]?.[x + dx]
      if (n && n !== '.' && n !== '#') return DARKEST[LAYER_OF[n]]
    }
    return '.'
  }).join(''))
}

// Light: what makes an effect glow instead of ending at a hard edge. Two sources, both in layer A (the effect's
// own color): soft light below the cut-off that used to be thrown away, and a bloom around bright pixels.
// Stored per frame as alpha 0-255 for the empty pixels only; render() paints it under the sprite in ramp A's
// brightest shade, so recolors and other sizes keep working. recipe.light: 0 turns it off, 1 is full strength.
const LIGHT_TAIL = 0.08
const BRIGHT = { 4: 1, w: 1, 3: 0.75, 2: 0.4 }
function boxBlur(src, size, r, wrap) {
  const tmp = new Float32Array(src.length), out = new Float32Array(src.length), d = 2 * r + 1
  const at = (v) => (wrap ? (v + size) % size : v)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let sum = 0
    for (let k = -r; k <= r; k++) { const xx = at(x + k); if (xx >= 0 && xx < size) sum += src[y * size + xx] }
    tmp[y * size + x] = sum / d
  }
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    let sum = 0
    for (let k = -r; k <= r; k++) { const yy = at(y + k); if (yy >= 0 && yy < size) sum += tmp[yy * size + x] }
    out[y * size + x] = sum / d
  }
  return out
}
function lightMap(p, rows, recipe) {
  const strength = recipe.light ?? 0.85
  if (!strength) return null
  const { size, fields } = p
  const src = new Float32Array(size * size)
  rows.forEach((row, y) => { for (let x = 0; x < size; x++) src[y * size + x] = BRIGHT[row[x]] ?? 0 })
  const r = Math.max(1, Math.round(2 * p.s))
  const bloom = boxBlur(boxBlur(src, size, r, recipe.wrap), size, r, recipe.wrap)
  const out = new Uint8Array(size * size)
  let any = false
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x
    if (rows[y][x] !== '.') continue // the sprite itself stays opaque
    const v = fields.A[i]
    const tail = v > LIGHT_TAIL && v < CUT ? ((v - LIGHT_TAIL) / (CUT - LIGHT_TAIL)) * 0.85 : 0
    const a = Math.min(0.7, Math.max(bloom[i] * 1.7, tail) * strength)
    if (a > 0.04) { out[i] = Math.round(a * 255); any = true }
  }
  return any ? out : null
}

const isEmpty = (rows) => rows.every((r) => !/[^.]/.test(r))
const filledCount = (rows) => rows.reduce((n, r) => n + r.replace(/\./g, '').length, 0)

/**
 * Run a recipe -> { frames: rows[][], cover }.
 * opts: size, seed, frames (count)
 */
export function runRecipe(recipe, opts = {}) {
  const size = opts.size ?? recipe.size ?? 32
  const n = opts.frames ?? recipe.frames ?? 8
  const seed = opts.seed ?? hashSeed(recipe.id)
  // setup() runs once so particles keep their identity across frames
  const setupPainter = new Painter(size, seed, !!recipe.wrap)
  const state = recipe.setup ? recipe.setup(setupPainter) : null
  let frames = [], lights = []
  for (let i = 0; i < n; i++) {
    const p = new Painter(size, seed, !!recipe.wrap)
    p.state = state
    const t = recipe.loop ? i / n : n === 1 ? 0 : i / (n - 1)
    recipe.draw(p, t, i)
    let rows = quantize(p, { dither: recipe.dither ?? false, core: recipe.core ?? true, top: recipe.top })
    if (recipe.clean ?? true) rows = clean(rows, recipe.wrap)
    if ((recipe.outline ?? 'glow') === 'glow') rows = glowOutline(rows, recipe.wrap)
    frames.push(rows)
    lights.push(lightMap(p, rows, recipe))
  }
  // trim empty frames at both ends; keep at least one
  while (frames.length > 1 && isEmpty(frames[0])) { frames.shift(); lights.shift() }
  while (frames.length > 1 && isEmpty(frames.at(-1))) { frames.pop(); lights.pop() }
  frames = frames.map((f) => (isEmpty(f) ? f.map((r, y) => (y === (size >> 1) ? r.slice(0, size >> 1) + '1' + r.slice((size >> 1) + 1) : r)) : f))
  let cover = 0
  frames.forEach((f, i) => { if (filledCount(f) > filledCount(frames[cover])) cover = i })
  return { frames, cover, light: lights.some(Boolean) ? lights : null }
}

/**
 * Recipe -> lazy sprite definition for the registry (default color + element variants).
 * Frames are generated the first time something reads them, so importing PixSpell stays fast.
 */
export function effectSprite(recipe) {
  const variants = {}
  for (const [name, material] of Object.entries(FX_COLORS)) {
    if (material === recipe.color || (recipe.variants && !recipe.variants.includes(name))) continue
    variants[name] = { A: material }
  }
  const size = recipe.size ?? 32
  return lazySprite({
    id: recipe.id,
    name: recipe.name ?? recipe.id.replace(/^fx-/, '').replace(/-/g, ' '),
    category: 'effects',
    tags: ['effect', 'fx', 'animated', ...(recipe.wrap ? ['seamless'] : []), ...(recipe.tags ?? [])],
    ramps: { A: recipe.color ?? 'orange', B: recipe.B ?? 'stone', C: recipe.C ?? 'bone' },
    slots: ['A', ...(recipe.B ? ['B'] : []), ...(recipe.C ? ['C'] : [])],
    variants,
    fps: recipe.fps ?? 12,
    w: size, h: size,
  }, () => runRecipe(recipe))
}
