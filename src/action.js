// Situation effects: a character performing an action, with effects attached
// to the right spot (slash at the hand, numbers above the head, smoke over the body).
//
//   dog.action('hero', 'attack')                                 // 8 frames, 32x32
//   dog.action({ body: 'hero', hand: 'sword' }, 'attack', 'fire')
//   dog.action('slime', 'hit', { element: 'ice', amount: '-12' })
//
// Every action returns exactly 8 same-sized frames, with `.fps` on the array,
// so it drops straight into a sprite sheet or game engine.

import { Pixmap } from './pixmap.js'
import { text } from './font.js'
import { OUTLINE } from './materials.js'
import { resolveRamp } from './sprite.js'
import { BODY_AT } from './character.js'

export const ACTION_SIZE = 32
export const ACTION_FRAMES = 8
const CHAR_AT = [4, 8] // the 24x24 character inside the 32x32 action frame

/** Element name -> material used for its effects. Any material name or hex color works too. */
export const ELEMENTS = { fire: 'orange', ice: 'ice', poison: 'lime', holy: 'gold', dark: 'purple' }

// small sparkles drifting up around a point: [dx, dy, first frame]
const PARTICLES = [[-8, 4, 0], [7, 2, 1], [-3, -3, 2], [6, -6, 3], [-7, -5, 4], [2, 6, 1]]

export function createActions(dog, looks) {
  const blank = () => new Pixmap(ACTION_SIZE, ACTION_SIZE)
  const frame = (...layers) => layers.flat().filter(Boolean).reduce((c, l) => c.draw(l), blank())
  const centered = (img, cx, cy) => img.at(Math.round(cx - img.w / 2), Math.round(cy - img.h / 2))
  const charAt = (img, dx = 0, dy = 0) => img.at(CHAR_AT[0] + dx, CHAR_AT[1] + dy)
  const fx = (id, f, material) => dog(id, { A: material, frame: f })
  const label = (str, color) => text(str, { color }).outline(OUTLINE)
  const clampTop = (img, y) => Math.max(0, y)

  function bbox(img) {
    let x0 = img.w, y0 = img.h, x1 = -1, y1 = -1
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++)
      if (img.alpha(x, y)) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y) }
    return { x0, y0, x1, y1 }
  }

  /** Attach points in action-frame coordinates. */
  function points(spec, first) {
    const body = looks[spec.body].def
    const b = bbox(dog.char({ body: spec.body, A: spec.A, B: spec.B, C: spec.C }))
    const all = bbox(first)
    const cx = CHAR_AT[0] + ((b.x0 + b.x1 + 1) >> 1), cy = CHAR_AT[1] + ((b.y0 + b.y1 + 1) >> 1)
    const anchor = (k) => body.anchors[k] && [CHAR_AT[0] + BODY_AT[0] + body.anchors[k][0][0], CHAR_AT[1] + BODY_AT[1] + body.anchors[k][0][1]]
    return {
      center: [cx, cy],
      top: [CHAR_AT[0] + ((all.x0 + all.x1 + 1) >> 1), CHAR_AT[1] + all.y0], // above any hat
      hand: anchor('hand') ?? [CHAR_AT[0] + b.x1 + 1, cy],
    }
  }

  function setup(spec, opts, fallback) {
    const s = typeof spec === 'string' ? { body: spec } : { ...spec }
    const o = typeof opts === 'string' ? { element: opts } : { ...opts }
    const material = o.element ? (ELEMENTS[o.element] ?? o.element) : fallback
    const ramp = resolveRamp(material)
    const frames = dog.char.frames(s)
    const char = (i) => frames[i % frames.length]
    return { s, o, material, ramp, char, pts: points(s, frames[0]), tinted: !!o.element }
  }

  function particles(center, i, material, rise = 2) {
    return PARTICLES.map(([dx, dy, start]) => {
      const k = i - start
      if (k < 0 || k > 3) return null
      return centered(fx('sparkle', [0, 1, 2, 1][k], material), center[0] + dx, center[1] + dy - k * rise)
    })
  }

  const ACTIONS = {
    // lunge forward and swing; the slash arcs in front of the hand
    attack: { fps: 12, fallback: 'bone', build(c) {
      const lunge = [-1, 1, 2, 2, 1, 0, 0, 0]
      const slash = [null, 0, 1, 2, 3, null, null, null]
      return lunge.map((dx, i) => frame(
        charAt(c.char(i), dx),
        slash[i] != null && centered(fx('slash', slash[i], c.material), c.pts.hand[0] + 3 + dx, c.pts.hand[1] + 1),
      ))
    } },

    // white flash, knock-back, hit spark, damage number; elements tint the target
    hit: { fps: 12, fallback: 'red', build(c) {
      const kb = [-1, -2, -2, -1, -1, 0, 0, 0]
      const spark = [0, 1, 2, null, null, null, null, null]
      const num = label(c.o.amount ?? '-7', c.tinted ? c.ramp[3] : '#ff6b5a')
      return kb.map((dx, i) => {
        let img = c.char(i)
        if (i === 0 || i === 2) img = img.silhouette('#ffffff')
        else if (c.tinted && i <= 5) img = img.tint(c.ramp[2], 0.5)
        return frame(
          charAt(img, dx),
          spark[i] != null && centered(fx('hit', spark[i], c.material), c.pts.center[0] + 2, c.pts.center[1]),
          c.o.label !== false && i >= 1 && i <= 6 && num.at(c.pts.top[0] - (num.w >> 1), clampTop(num, c.pts.top[1] - 5 - i)),
        )
      })
    } },

    // green glow pulse, sparkles drifting up, heal number
    heal: { fps: 10, fallback: 'mint', build(c) {
      const glow = [0, 0.12, 0.22, 0.3, 0.22, 0.15, 0.06, 0]
      const num = label(c.o.amount ?? '+12', c.ramp[3])
      return glow.map((g, i) => frame(
        charAt(g ? c.char(i).tint(c.ramp[3], g) : c.char(i)),
        particles(c.pts.center, i, c.material),
        c.o.label !== false && i >= 2 && num.at(c.pts.top[0] - (num.w >> 1), clampTop(num, c.pts.top[1] - 4 - i)),
      ))
    } },

    // jump, golden aura, sparkles, "LV UP"
    levelup: { fps: 10, fallback: 'gold', build(c) {
      const jump = [0, -2, -3, -3, -2, -1, 0, 0]
      const tag = label(c.o.text ?? 'LV UP', c.ramp[3])
      return jump.map((dy, i) => {
        let img = c.char(i)
        if (i >= 2 && i <= 4) img = img.outline(c.ramp[i === 3 ? 3 : 2])
        return frame(
          i >= 2 && i <= 4 ? img.at(CHAR_AT[0] - 1, CHAR_AT[1] + dy - 1) : charAt(img, 0, dy),
          particles([c.pts.center[0], c.pts.center[1] + 2], i, c.material, 3),
          c.o.label !== false && i >= 2 && tag.at(c.pts.top[0] - (tag.w >> 1), clampTop(tag, c.pts.top[1] - 6 - Math.min(i, 5))),
        )
      })
    } },

    // pulsing aura in the element color, a star charging at the hand
    cast: { fps: 10, fallback: 'pink', build(c) {
      const star = [0, 1, 2, 3, 4, 3, 2, 1]
      const tip = [c.pts.hand[0], c.pts.hand[1] - 9]
      return star.map((s, i) => {
        const aura = i >= 1 && i <= 6
        const img = aura ? c.char(i).outline(c.ramp[i % 2 ? 3 : 2]) : c.char(i)
        return frame(
          aura ? img.at(CHAR_AT[0] - 1, CHAR_AT[1] - 1) : charAt(img),
          particles(tip, i, c.material),
          centered(fx('sparkle', s, c.material), tip[0], tip[1]),
        )
      })
    } },

    // flash, fade, puff of smoke
    death: { fps: 10, fallback: 'bone', build(c) {
      const smoke = [null, null, null, 0, 1, 2, 3, 5]
      return smoke.map((s, i) => {
        let img = c.char(i)
        if (i === 0 || i === 2) img = img.silhouette('#ffffff')
        else if (i === 3) img = img.opacity(0.6)
        else if (i === 4) img = img.opacity(0.25)
        else if (i >= 5) img = null
        return frame(img && charAt(img), s != null && centered(fx('smoke', s, c.material), c.pts.center[0], c.pts.center[1] - 1))
      })
    } },
  }

  /** 8 frames (32x32) of `spec` performing `name`. `opts`: element name, or { element, amount, text, label }. */
  function action(spec, name, opts = {}) {
    const a = ACTIONS[name]
    if (!a) throw new Error(`dog: unknown action "${name}". Try: ${Object.keys(ACTIONS).join(', ')}`)
    const c = setup(spec, opts, a.fallback)
    const frames = a.build(c)
    frames.fps = a.fps
    return frames
  }

  action.list = Object.keys(ACTIONS)
  action.elements = Object.keys(ELEMENTS)
  action.fps = (name) => ACTIONS[name]?.fps
  action.size = ACTION_SIZE
  return action
}
