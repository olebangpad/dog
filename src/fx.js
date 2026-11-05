// FX engine: effects as tiny recipes instead of hand-drawn frames.
//
// A recipe paints soft shapes into intensity fields (one per color ramp A/B/C),
// and the engine turns each frame into ordinary DOG text art: shades 1-4 / 5-8 / a-d
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
//   p.dot(x, y, v)                    one pixel
//   p.glyph(char, x, y, v, scale)     3x5 font character, scaled by whole pixels
//   p.rng()                           seeded random number for this effect (same every frame)
//   p.c, p.size, p.s                  center, size, scale (size / 32)

import { glyphBits } from './font.js'

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
  constructor(size, seed) {
    this.size = size
    this.c = size / 2
    this.s = size / 32
    this.fields = { A: new Float32Array(size * size), B: new Float32Array(size * size), C: new Float32Array(size * size) }
    this.cur = this.fields.A
    this.rng = mulberry(seed)
  }

  use(layer) { this.cur = this.fields[layer]; return this }

  _put(x, y, v) {
    if (v <= 0 || x < 0 || y < 0 || x >= this.size || y >= this.size) return
    const i = y * this.size + x
    if (v > this.cur[i]) this.cur[i] = v
  }

  _box(x, y, r, fn) {
    const x0 = Math.max(0, Math.floor(x - r - 1)), x1 = Math.min(this.size - 1, Math.ceil(x + r + 1))
    const y0 = Math.max(0, Math.floor(y - r - 1)), y1 = Math.min(this.size - 1, Math.ceil(y + r + 1))
    for (let py = y0; py <= y1; py++) for (let px = x0; px <= x1; px++) fn(px, py, px + 0.5 - x, py + 0.5 - y)
  }

  dot(x, y, v = 1) { this._put(Math.floor(x), Math.floor(y), v); return this }

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
    return this.line(x, y, x - Math.cos(angle) * length, y - Math.sin(angle) * length, 1, v, v * 0.35)
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
function quantize(p, { dither, core }) {
  const { size, fields } = p
  const rows = []
  for (let y = 0; y < size; y++) {
    let row = ''
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      let layer = 'A', v = fields.A[i]
      if (fields.B[i] > v) { layer = 'B'; v = fields.B[i] }
      if (fields.C[i] > v) { layer = 'C'; v = fields.C[i] }
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
function clean(rows) {
  const h = rows.length, w = rows[0].length
  const filled = (x, y) => x >= 0 && y >= 0 && x < w && y < h && rows[y][x] !== '.'
  return rows.map((r, y) => [...r].map((ch, x) => (ch !== '.' && !filled(x - 1, y) && !filled(x + 1, y) && !filled(x, y - 1) && !filled(x, y + 1) ? '.' : ch)).join(''))
}

/** Selective outline: empty pixels next to a shape take that ramp's darkest shade. */
function glowOutline(rows) {
  const h = rows.length, w = rows[0].length
  return rows.map((r, y) => [...r].map((ch, x) => {
    if (ch !== '.') return ch
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = rows[y + dy]?.[x + dx]
      if (n && n !== '.' && n !== '#') return DARKEST[LAYER_OF[n]]
    }
    return '.'
  }).join(''))
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
  const setupPainter = new Painter(size, seed)
  const state = recipe.setup ? recipe.setup(setupPainter) : null
  let frames = []
  for (let i = 0; i < n; i++) {
    const p = new Painter(size, seed)
    p.state = state
    const t = recipe.loop ? i / n : n === 1 ? 0 : i / (n - 1)
    recipe.draw(p, t, i)
    let rows = quantize(p, { dither: recipe.dither ?? false, core: recipe.core ?? true })
    if (recipe.clean ?? true) rows = clean(rows)
    if ((recipe.outline ?? 'glow') === 'glow') rows = glowOutline(rows)
    frames.push(rows)
  }
  // trim empty frames at both ends; keep at least one
  while (frames.length > 1 && isEmpty(frames[0])) frames.shift()
  while (frames.length > 1 && isEmpty(frames.at(-1))) frames.pop()
  frames = frames.map((f) => (isEmpty(f) ? f.map((r, y) => (y === (size >> 1) ? r.slice(0, size >> 1) + '1' + r.slice((size >> 1) + 1) : r)) : f))
  let cover = 0
  frames.forEach((f, i) => { if (filledCount(f) > filledCount(frames[cover])) cover = i })
  return { frames, cover }
}

/** Recipe -> raw sprite definition for the registry (default color + element variants). */
export function effectSprite(recipe) {
  const { frames, cover } = runRecipe(recipe)
  const variants = {}
  for (const [name, material] of Object.entries(FX_COLORS)) {
    if (material === recipe.color || (recipe.variants && !recipe.variants.includes(name))) continue
    variants[name] = { A: material }
  }
  return {
    id: recipe.id,
    name: recipe.name ?? recipe.id.replace(/^fx-/, '').replace(/-/g, ' '),
    category: 'effects',
    tags: ['effect', 'fx', 'animated', ...(recipe.tags ?? [])],
    ramps: { A: recipe.color ?? 'orange', B: recipe.B ?? 'stone', C: recipe.C ?? 'bone' },
    variants,
    fps: recipe.fps ?? 12,
    frames,
    cover,
  }
}
