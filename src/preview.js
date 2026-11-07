// A contact sheet for checking assets by eye: each entry is a row with its label, size and frame info,
// then every frame (zoomed so small sprites are readable) on a checkerboard that shows transparency.
// Sounds show as a waveform. Used by `pixspell preview` and the MCP server, so a coding agent can look
// at what it picked before wiring it into a game.
//
//   const items = [{ fx: 'meteor', element: 'ice' }, { char: 'hero', action: 'attack', element: 'fire' }]
//   const entries = items.map((item) => ({ label: itemCode(item), value: resolveItem(spell, item) }))
//   previewSheet(entries).toPNG()   ·   describe(entries[0].value) -> '32x32, 12 frames at 14 fps, plays once'

import { Pixmap } from './pixmap.js'
import { text } from './font.js'

const BG = '#101712', CHECK = ['#1a251d', '#141d17'], INK = '#e8f3e4', DIM = '#8aa592', ACCENT = '#a8e05a', WAVE = '#ffd06a'
const isSound = (v) => v && v.samples && typeof v.sampleRate === 'number'
const isPixmap = (v) => v instanceof Pixmap || (v && typeof v.w === 'number' && v.data)

/** One line about a value: size, frames, fps, loop; or a sound's length. */
export function describe(value) {
  if (isSound(value)) return `sound, ${value.duration.toFixed(2)}s${value.loop ? ', loops' : ''}`
  if (isPixmap(value)) return `${value.w}x${value.h} image`
  if (Array.isArray(value) && value.length && isPixmap(value[0])) {
    const { w, h } = value[0]
    if (value.length === 1) return `${w}x${h}, 1 frame`
    const play = value.loop === false ? ', plays once' : value.loop === true ? ', loops' : ''
    return `${w}x${h}, ${value.length} frames${value.fps ? ` at ${value.fps} fps` : ''}${play}`
  }
  throw new Error('pixspell: preview takes an image, frames or a sound')
}

const rgba = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(255)
const checkers = new Map()
function checker(w, h, cell = 4) {
  const key = `${w}x${h}`
  if (!checkers.has(key)) {
    const img = new Pixmap(w, h), [a, b] = CHECK.map(rgba)
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.data.set(((x / cell) ^ (y / cell)) & 1 ? b : a, (y * w + x) * 4)
    checkers.set(key, img)
  }
  return checkers.get(key)
}

function waveform(sound, w = 160, h = 32) {
  const img = checker(w, h).clone()
  const c = rgba(WAVE), n = sound.samples.length
  for (let x = 0; x < w; x++) {
    let peak = 0
    for (let i = Math.floor((x / w) * n); i < Math.floor(((x + 1) / w) * n); i++) peak = Math.max(peak, Math.abs(sound.samples[i]))
    const half = Math.max(1, Math.round(peak * (h / 2 - 2)))
    for (let y = h / 2 - half; y < h / 2 + half; y++) img.data.set(c, (y * w + x) * 4)
  }
  return img
}

/**
 * The contact sheet. entries: [{ label, value }] where value is a Pixmap, frames or a Sound.
 * zoom: fixed zoom, or by default whatever makes the largest frame about 96 px. maxFrames: frames shown per row.
 */
export function previewSheet(entries, { zoom, maxFrames = 16, width = 1200 } = {}) {
  const PAD = 10, GAP = 6
  const rows = entries.map(({ label, value }) => {
    const info = describe(value)
    let tiles, caption = []
    if (isSound(value)) {
      tiles = [waveform(value)]
    } else {
      const frames = isPixmap(value) ? [value] : value
      const pick = frames.length <= maxFrames ? frames.map((_, i) => i)
        : Array.from({ length: maxFrames }, (_, i) => Math.round((i * (frames.length - 1)) / (maxFrames - 1)))
      const { w, h } = frames[0]
      const z = zoom ?? Math.max(1, Math.min(8, Math.floor(96 / Math.max(w, h))))
      tiles = pick.map((i) => checker(w * z, h * z).draw(z === 1 ? frames[i] : frames[i].scale(z), 0, 0))
      caption = frames.length > 1 ? pick.map((i) => String(i)) : []
    }
    // lay tiles out left to right, wrapping at the sheet width
    const tw = tiles[0].w, th = tiles[0].h + (caption.length ? 8 : 0)
    const perLine = Math.max(1, Math.floor((width - 2 * PAD + GAP) / (tw + GAP)))
    const lines = Math.ceil(tiles.length / perLine)
    let body = new Pixmap(Math.min(tiles.length, perLine) * (tw + GAP) - GAP, lines * (th + GAP) - GAP)
    tiles.forEach((t, i) => {
      const x = (i % perLine) * (tw + GAP), y = Math.floor(i / perLine) * (th + GAP)
      body = body.draw(t, x, y)
      if (caption[i]) body = body.draw(text(caption[i], { color: DIM }), x, y + t.h + 2)
    })
    const maxChars = Math.floor((width - 2 * PAD) / 4)
    const small = text(label.length > maxChars ? label.slice(0, maxChars - 3) + '...' : label, { color: ACCENT })
    const head = small.w * 2 <= width - 2 * PAD ? small.scale(2) : small
    const sub = text(info, { color: INK })
    return { head, sub, body }
  })
  const W = Math.min(width, Math.max(...rows.map((r) => Math.max(r.head.w, r.sub.w, r.body.w))) + 2 * PAD)
  const H = rows.reduce((n, r) => n + r.head.h + r.sub.h + r.body.h + 4 + 4 + 14, 0) + PAD
  let img = Pixmap.create(W, H, BG), y = PAD
  for (const r of rows) {
    img = img.draw(r.head, PAD, y); y += r.head.h + 4
    img = img.draw(r.sub, PAD, y); y += r.sub.h + 4
    img = img.draw(r.body, PAD, y); y += r.body.h + 14
  }
  return img
}

// ------------------------------------------------------------------ items: JSON that names a PixSpell call
// { sprite: 'slime-pink', A?, B?, C?, grid? }            -> spell.frames(id, opts)
// { char: 'hero' | { body, hat, hand, offhand, A }, grid? } -> spell.char.frames(spec)
// { char, action: 'attack', element? }                   -> spell.action(spec, action, opts)
// { char, walk: 'left' }                                 -> spell.walk(spec, dir)
// { char, vs: 'slime', ko?, element? }                   -> spell.act(spec, target, opts)
// { char, status: 'burning', element? }                  -> spell.status(spec, effect, opts)
// { fx: 'meteor', element?, size?, seed?, A? }           -> spell.fx(name, opts)
// { sfx: 'slash', element?, pitch?, seed? }              -> spell.sfx(name, opts)
// { music: 'town', key?, tempo?, seed? }                 -> spell.music(name, opts)

const pickOpts = (item, keys) => Object.fromEntries(keys.filter((k) => item[k] != null).map((k) => [k, item[k]]))
const RAMPS = ['A', 'B', 'C']
const ACT_OPTS = ['element', 'style', 'ko', 'amount', 'freeze', 'shake', 'distance', 'lunge', 'grid']
const charSpec = (item) => {
  const spec = typeof item.char === 'string' ? { body: item.char } : { ...item.char }
  if (!spec.body) throw new Error('pixspell: char needs a body, e.g. "hero" or { "body": "hero", "hat": "knight" }')
  return spec
}

/** Run the PixSpell call an item names. */
export function resolveItem(spell, item) {
  if (!item || typeof item !== 'object') throw new Error('pixspell: an item is an object like { "fx": "meteor" }')
  if (item.music) return spell.music(item.music, pickOpts(item, ['key', 'tempo', 'seed']))
  if (item.sfx) return spell.sfx(item.sfx, pickOpts(item, ['element', 'pitch', 'seed']))
  if (item.fx) return spell.fx(item.fx, pickOpts(item, ['element', 'size', 'seed', 'grid', 'light', ...RAMPS]))
  if (item.char && item.action) return spell.action(charSpec(item), item.action, pickOpts(item, ['element', 'grid', 'amount', 'text', 'style']))
  if (item.char && item.walk) return spell.walk({ ...charSpec(item), ...pickOpts(item, ['grid']) }, item.walk)
  if (item.char && item.vs) return spell.act(charSpec(item), item.vs, pickOpts(item, ACT_OPTS))
  if (item.char && item.status) return spell.status(charSpec(item), item.status, pickOpts(item, ['element', 'grid', 'size']))
  if (item.char) return spell.char.frames({ ...charSpec(item), ...pickOpts(item, ['grid', ...RAMPS]) })
  if (item.sprite) return spell.frames(item.sprite, pickOpts(item, ['grid', ...RAMPS]))
  throw new Error('pixspell: an item needs one of sprite, char, fx, sfx or music')
}

const lit = (v) => (typeof v === 'string' ? `'${v}'` : typeof v === 'object' ? obj(v) : String(v))
const obj = (o) => {
  const parts = Object.entries(o).filter(([, v]) => v != null).map(([k, v]) => `${k}: ${lit(v)}`)
  return parts.length ? `{ ${parts.join(', ')} }` : ''
}
const args = (...xs) => xs.filter((x) => x !== '' && x != null).join(', ')

/** The JavaScript call an item stands for, to paste into a game. */
export function itemCode(item) {
  const spec = item.char && (typeof item.char === 'string' && !item.grid && !RAMPS.some((k) => item[k]) ? lit(item.char) : null)
  const charArg = () => spec ?? obj({ ...charSpec(item), ...(item.action || item.status || item.vs ? {} : pickOpts(item, ['grid', ...RAMPS])) })
  if (item.music) return `spell.music(${args(lit(item.music), obj(pickOpts(item, ['key', 'tempo', 'seed'])))})`
  if (item.sfx) return `spell.sfx(${args(lit(item.sfx), obj(pickOpts(item, ['element', 'pitch', 'seed'])))})`
  if (item.fx) return `spell.fx(${args(lit(item.fx), obj(pickOpts(item, ['element', 'size', 'seed', 'grid', 'light', ...RAMPS])))})`
  if (item.char && item.action) return `spell.action(${args(charArg(), lit(item.action), obj(pickOpts(item, ['element', 'grid', 'amount', 'text', 'style'])))})`
  if (item.char && item.walk) return `spell.walk(${args(item.grid ? obj({ ...charSpec(item), grid: item.grid }) : charArg(), lit(item.walk))})`
  if (item.char && item.vs) return `spell.act(${args(spec ?? obj(charSpec(item)), lit(item.vs), obj(pickOpts(item, ACT_OPTS)))})`
  if (item.char && item.status) return `spell.status(${args(charArg(), lit(item.status), obj(pickOpts(item, ['element', 'grid', 'size'])))})`
  if (item.char) return `spell.char.frames(${charArg()})`
  if (item.sprite) return `spell.frames(${args(lit(item.sprite), obj(pickOpts(item, ['grid', ...RAMPS])))})`
  return JSON.stringify(item)
}
