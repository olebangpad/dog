// Frame lists (what spell.walk, spell.action, spell.fx, spell.frames... return) are plain arrays of Pixmaps with
// .fps and .loop, plus a few helpers so an animation is as easy to use as one image:
//
//   await spell.walk(knight, 'left').scale(4).save('walk.png')    Node: an animated PNG at the animation's speed
//   img.src = spell.fx('meteor').toDataURL()                       browser: an <img> that plays it
//   const { image, frames } = spell.action(knight, 'attack').toSheet({ columns: 4 })
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
  /** Every frame scaled (4 = 4x bigger); keeps .fps and .loop. */
  scale(n) { return asFrames(this.map((f) => f.scale(n)), this.fps, this.loop) },
}
const descriptors = Object.fromEntries(Object.entries(METHODS).map(([k, v]) => [k, { value: v, writable: true, configurable: true }]))

/** Give a frame list its helpers (and .fps / .loop when given). Returns the same array. */
export function asFrames(arr, fps = arr.fps, loop = arr.loop) {
  if (fps !== undefined) arr.fps = fps
  if (loop !== undefined) arr.loop = loop
  return Object.defineProperties(arr, descriptors)
}

/** Wrap a function that returns frames so its result gets the helpers; keeps the function's own properties. */
export const framed = (fn) => Object.assign((...a) => {
  const out = fn(...a)
  return Array.isArray(out) ? asFrames(out) : out
}, fn)
