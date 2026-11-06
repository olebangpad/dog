// Frame lists (what spell.walk, spell.action, spell.fx, spell.frames... return) are plain arrays of Pixmaps with
// .fps and .loop, plus a few helpers so an animation is as easy to use as one image:
//
//   await spell.walk(knight, 'left').scale(4).save('walk.png')    Node: an animated PNG at the animation's speed
//   img.src = spell.fx('meteor').toDataURL()                       browser: an <img> that plays it
//   const { image, frames } = spell.action(knight, 'attack').toSheet({ columns: 4 })
//
// In a game loop: frames.atTime(t) is the frame t seconds in (looping, or holding the last frame), frames.duration is
// how long one pass takes, and frames.origin is the point to place at (x, y): the feet of a character, the middle of an
// effect, the top-left of a plain sprite.
//   const f = walk.atTime(t); ctx.drawImage(f.canvas, x - walk.origin[0], y - walk.origin[1])
//
// The helpers are non-enumerable, so the arrays still compare and spread like plain arrays.

import { sheet } from './pixmap.js'
import { encodeAPNG, toBase64 } from './png.js'

const METHODS = {
  /** An animated PNG of every frame at .fps, looping forever. opts: deflate, loops (0 = forever). */
  toAPNG(opts = {}) { return encodeAPNG(this, { fps: this.fps ?? 8, ...opts }) },
  /** A data: URL of the animated PNG, for <img src>. */
  toDataURL() { return 'data:image/png;base64,' + toBase64(this.toAPNG()) },
  /** Node: write a compressed animated PNG file. */
  async save(path) {
    const [{ writeFile }, { deflateSync }] = await Promise.all([import('node:fs/promises'), import('node:zlib')])
    await writeFile(path, this.toAPNG({ deflate: (b) => deflateSync(b, { level: 9 }) }))
    return path
  },
  /** Every frame on one sprite sheet: { image, frames: [{ x, y, w, h }] }. opts: columns, gap, padding, background. */
  toSheet(opts) { return sheet(this, opts) },
  /** Every frame scaled (4 = 4x bigger); keeps .fps, .loop and .origin. */
  scale(n) { return asFrames(this.map((f) => f.scale(n)), this.fps, this.loop, originKind(this)) },
  /** Every frame mirrored (an action faces right; flipX() faces left); keeps .fps, .loop and .origin. */
  flipX() { return asFrames(this.map((f) => f.flipX()), this.fps, this.loop, originKind(this)) },
  /** The frame t seconds in: looping animations wrap, the others hold their last frame. */
  atTime(t) {
    const i = Math.floor(Math.max(0, t) * (this.fps || 8))
    return this[this.loop ? i % this.length : Math.min(i, this.length - 1)]
  },
}
/** Where a frame list is placed from: a character's feet, an effect's middle, or a sprite's top-left. */
export const ORIGINS = {
  feet: (f) => [f[0].w >> 1, f[0].h - 1],
  center: (f) => [f[0].w >> 1, f[0].h >> 1],
  corner: () => [0, 0],
}
// the kind is kept, not the point, so the point follows the frames through scale(), flipX() and toGrid()
const kinds = new WeakMap()
export const originKind = (arr) => kinds.get(arr) ?? 'corner'

const descriptors = {
  ...Object.fromEntries(Object.entries(METHODS).map(([k, v]) => [k, { value: v, writable: true, configurable: true }])),
  /** Seconds for one pass through every frame. */
  duration: { get() { return this.length / (this.fps || 8) }, configurable: true },
  /** The point to place at (x, y), in frame pixels: [x, y]. */
  origin: { get() { return this.length ? ORIGINS[originKind(this)](this) : [0, 0] }, configurable: true },
}

/** Give a frame list its helpers, .fps / .loop when given, and an origin kind (feet, center, corner). Returns the same array. */
export function asFrames(arr, fps = arr.fps, loop = arr.loop, kind = originKind(arr)) {
  if (fps !== undefined) arr.fps = fps
  if (loop !== undefined) arr.loop = loop
  kinds.set(arr, ORIGINS[kind] ? kind : 'corner')
  return Object.defineProperties(arr, descriptors)
}

/**
 * Wrap a function that returns frames so its result gets the helpers and an origin; keeps the function's own
 * properties. origin: a key of ORIGINS, or a function (frames, ...args) => key.
 */
export const framed = (fn, origin = 'corner') => Object.assign((...a) => {
  const out = fn(...a)
  if (!Array.isArray(out)) return out
  return asFrames(out, out.fps, out.loop, typeof origin === 'function' ? origin(out, ...a) : origin)
}, fn)
