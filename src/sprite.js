// Turning text art into pixels.
//
//   .        transparent
//   #        outline (dark)
//   w        white highlight
//   1 2 3 4  ramp A, dark -> light
//   5 6 7 8  ramp B, dark -> light
//   a b c d  ramp C, dark -> light
//
// A sprite never stores real colors, only which ramp + shade a pixel uses.
// That is why one drawing can be recolored into any material or hex color.

import { MATERIALS, OUTLINE, WHITE } from './materials.js'
import { parseColor, rampFrom, isColor } from './color.js'
import { Pixmap } from './pixmap.js'

export const LEGEND = {
  '1': ['A', 0], '2': ['A', 1], '3': ['A', 2], '4': ['A', 3],
  '5': ['B', 0], '6': ['B', 1], '7': ['B', 2], '8': ['B', 3],
  a: ['C', 0], b: ['C', 1], c: ['C', 2], d: ['C', 3],
}
export const SLOTS = ['A', 'B', 'C']
const VALID = new Set(['.', '#', 'w', ...Object.keys(LEGEND)])

/** Split an art string into equal-length rows of characters. */
export function parseArt(art) {
  return art.split('\n').map((l) => l.replace(/\s+/g, '')).filter(Boolean)
}

/** Material name, any CSS hex color, or an explicit 4-color array -> 4 hex shades. */
export function resolveRamp(value) {
  if (Array.isArray(value)) {
    if (value.length !== 4) throw new Error('dog: a ramp needs 4 colors (dark -> light)')
    return value
  }
  if (MATERIALS[value]) return MATERIALS[value]
  if (isColor(value)) return rampFrom(value)
  throw new Error(`dog: unknown material "${value}"`)
}

/** Which ramp slots (A/B/C) a sprite actually paints with. */
export function usedSlots(def) {
  const used = new Set()
  for (const f of def.frames) for (const row of f) for (const ch of row) if (LEGEND[ch]) used.add(LEGEND[ch][0])
  return SLOTS.filter((s) => used.has(s))
}

export const EQUIP_SLOTS = ['head', 'hand', 'offhand']

function normalizeAnchors(def, n) {
  const out = {}
  for (const [name, v] of Object.entries(def.anchors ?? {})) {
    if (!EQUIP_SLOTS.includes(name)) throw new Error(`dog: "${def.id}" has unknown anchor "${name}"`)
    const perFrame = Array.isArray(v[0]) ? v : Array.from({ length: n }, () => v)
    if (perFrame.length !== n) throw new Error(`dog: "${def.id}" anchor "${name}" needs one point per frame`)
    out[name] = perFrame
  }
  return out
}

/** Validate and normalise a sprite definition. */
export function defineSprite(def) {
  const frames = (def.frames ?? [def.art]).map((f) => (Array.isArray(f) ? f : parseArt(f)))
  const h = frames[0].length, w = frames[0][0]?.length ?? 0
  if (def.sequence?.some((i) => !frames[i])) throw new Error(`dog: "${def.id}" sequence points at a missing frame`)
  if (def.cover != null && !frames[def.cover]) throw new Error(`dog: "${def.id}" cover points at a missing frame`)
  if (def.equip && !EQUIP_SLOTS.includes(def.equip)) throw new Error(`dog: "${def.id}" equip must be one of ${EQUIP_SLOTS.join(', ')}`)
  if (def.equip && !Array.isArray(def.pivot)) throw new Error(`dog: "${def.id}" needs a pivot: [x, y]`)
  frames.forEach((rows, fi) => {
    if (rows.length !== h) throw new Error(`dog: "${def.id}" frame ${fi} has ${rows.length} rows, expected ${h}`)
    rows.forEach((row, y) => {
      if (row.length !== w) throw new Error(`dog: "${def.id}" frame ${fi} row ${y} is ${row.length} wide, expected ${w}`)
      for (const ch of row) if (!VALID.has(ch)) throw new Error(`dog: "${def.id}" uses unknown pixel "${ch}" (frame ${fi}, row ${y})`)
    })
  })
  const out = {
    id: def.id,
    name: def.name ?? def.id.replace(/-/g, ' '),
    category: def.category ?? 'misc',
    tags: def.tags ?? [],
    w, h,
    fps: def.fps ?? 6,
    ramps: { A: 'iron', B: 'wood', C: 'gold', ...def.ramps },
    variants: def.variants ?? {},
    frames,
    // play order for animations, e.g. [0, 0, 0, 1] holds frame 0 longer
    sequence: def.sequence ?? frames.map((_, i) => i),
    animated: frames.length > 1,
    // frame used for thumbnails and still exports
    cover: def.cover ?? 0,
    // bodies: where gear attaches, one [x, y] per frame
    anchors: normalizeAnchors(def, frames.length),
    // gear: which anchor it goes on, and which of its own pixels lands there
    equip: def.equip ?? null,
    pivot: def.pivot ?? null,
    layer: def.layer ?? 'front',
  }
  out.slots = usedSlots(out)
  return out
}

/**
 * A sprite whose frames are produced on first use (procedural effects). Size and color slots
 * are known up front, so the registry, gallery and validator can work without generating it.
 *   lazySprite({ id, w, h, slots, ramps, ... }, () => ({ frames, cover }))
 */
export function lazySprite(meta, generate) {
  const def = {
    name: meta.name ?? meta.id.replace(/-/g, ' '), category: meta.category ?? 'misc', tags: meta.tags ?? [],
    fps: meta.fps ?? 6, ramps: { A: 'iron', B: 'wood', C: 'gold', ...meta.ramps }, variants: meta.variants ?? {},
    anchors: {}, equip: null, pivot: null, layer: 'front', animated: true,
    ...meta,
  }
  let data = null
  const load = () => {
    if (!data) {
      const { frames, cover } = generate()
      const checked = defineSprite({ id: meta.id, frames, cover, ramps: def.ramps })
      data = { frames: checked.frames, sequence: checked.sequence, cover: checked.cover, animated: checked.animated }
    }
    return data
  }
  for (const key of ['frames', 'sequence', 'cover']) Object.defineProperty(def, key, { get: () => load()[key], enumerable: true })
  return def
}

/**
 * Render one frame of a sprite definition.
 * opts: { A, B, C } materials or hex colors, outline color, frame index.
 */
export function render(def, opts = {}) {
  const rows = def.frames[(opts.frame ?? 0) % def.frames.length]
  const pal = {
    '#': parseColor(opts.outline ?? OUTLINE),
    w: parseColor(opts.white ?? WHITE),
  }
  for (const [ch, [slot, shade]] of Object.entries(LEGEND)) {
    pal[ch] = parseColor(resolveRamp(opts[slot] ?? def.ramps[slot])[shade])
  }
  const img = new Pixmap(def.w, def.h)
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) if (pal[row[x]]) img.set(x, y, pal[row[x]])
  })
  return img
}

/** Every frame of an animation, in play order (follows def.sequence). */
export function renderFrames(def, opts = {}) {
  const cache = new Map()
  return def.sequence.map((frame) => {
    if (!cache.has(frame)) cache.set(frame, render(def, { ...opts, frame }))
    return cache.get(frame)
  })
}
