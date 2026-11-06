// Character maker: put gear on bodies by name, no coordinates needed.
//
//   spell.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })
//   spell.char({ body: 'slime-pink', hat: 'wizard' })
//   spell.char(spell.char.random(42))          // same seed, same character
//
// Bodies declare anchors (head / hand / offhand). Gear declares which anchor
// it equips to and its own pivot pixel; the pivot is placed on the anchor.

import { render } from './sprite.js'
import { Pixmap } from './pixmap.js'
import { MATERIAL_NAMES } from './materials.js'

export const CHAR_SIZE = 24
export const BODY_AT = [4, 8] // where the 16x16 body sits inside the 24x24 character
const KINDS = ['hand', 'offhand', 'head'] // draw order: hats end up on top
const PREFIX = { head: 'hat', hand: 'held', offhand: 'held' }
export const WALK_DIRS = ['down', 'up', 'left', 'right']

function rng(seed) {
  if (seed == null) return Math.random
  let a = typeof seed === 'number' ? seed >>> 0 : [...String(seed)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 7)
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function createCharacters(looks) {
  const all = Object.values(looks)
  const parts = {
    // walk-cycle views (hero-walk-side, ...) have anchors too, but they are poses, not bodies
    body: all.filter((l) => Object.keys(l.def.anchors).length && !l.def.tags.includes('walk')).map((l) => l.id),
    head: all.filter((l) => l.def.equip === 'head').map((l) => l.id),
    hand: all.filter((l) => l.def.equip === 'hand').map((l) => l.id),
    offhand: all.filter((l) => l.def.equip === 'offhand').map((l) => l.id),
  }

  /** 'crown' -> 'hat-crown', 'sword-gold' -> 'held-sword-gold', full ids pass through. */
  function resolvePart(value, kind) {
    if (!value) return null
    const ref = typeof value === 'string' ? { id: value } : value
    const id = [`${PREFIX[kind]}-${ref.id}`, ref.id].find((c) => looks[c]?.def.equip === kind)
    if (!id) throw new Error(`pixspell: "${ref.id}" can't be worn on ${kind}. Try: ${parts[kind].slice(0, 6).join(', ')}...`)
    return { look: looks[id], ramps: { ...looks[id].ramps, ...pickRamps(ref) } }
  }

  function normalize(body, opts) {
    const spec = typeof body === 'object' && body !== null ? { ...body } : { ...opts, body }
    if (!looks[spec.body]) throw new Error(`pixspell: no body called "${spec.body}". Bodies: ${parts.body.filter((b) => !b.includes('-')).join(', ')}`)
    if (!Object.keys(looks[spec.body].def.anchors).length) throw new Error(`pixspell: "${spec.body}" has no anchors, so it can't wear gear`)
    return spec
  }

  // `view` swaps in another pose of the same body (a walk-cycle sprite) but keeps the body's colors
  function layers(spec, view) {
    const body = looks[spec.body]
    const def = view ?? body.def
    const out = [{ kind: 'body', look: { ...body, def }, ramps: { ...body.ramps, ...pickRamps(spec) } }]
    for (const kind of KINDS) {
      const part = resolvePart(spec[kind === 'head' ? 'hat' : kind], kind)
      if (part && def.anchors[kind]) out.push({ kind, ...part })
    }
    return out
  }

  /** How many frames until the whole character loops. */
  function length(spec) {
    return Math.max(...layers(normalize(spec)).map((l) => l.look.def.sequence.length))
  }

  function build(spec, step, view, bodyStep = step) {
    const ls = layers(spec, view)
    const [body] = ls
    const bdef = body.look.def
    const bframe = bdef.sequence[bodyStep % bdef.sequence.length]
    const back = [], front = []
    for (const l of ls.slice(1)) {
      const d = l.look.def
      // an anchor may carry a third value, 'back', to tuck gear behind the body (a shield in side view)
      const [ax, ay, layer = d.layer] = bdef.anchors[d.equip][bframe]
      const img = render(d, { ...l.ramps, frame: d.sequence[step % d.sequence.length] })
      ;(layer === 'back' ? back : front).push(img.at(BODY_AT[0] + ax - d.pivot[0], BODY_AT[1] + ay - d.pivot[1]))
    }
    const bodyImg = render(bdef, { ...body.ramps, frame: bframe }).at(...BODY_AT)
    let img = new Pixmap(CHAR_SIZE, CHAR_SIZE)
    for (const l of [...back, bodyImg, ...front]) img = img.draw(l)
    return img
  }

  /** One 24x24 character (frame 0, or spec.frame). */
  function char(body, opts = {}) {
    const spec = normalize(body, opts)
    return build(spec, spec.frame ?? 0)
  }

  /** Every frame of the character's animation (body and gear animate together). */
  char.frames = (body, opts = {}) => {
    const spec = normalize(body, opts)
    return Array.from({ length: length(spec) }, (_, i) => build(spec, i))
  }

  /**
   * Walk cycle in a direction: 'down' (default), 'up', 'left' or 'right'.
   * Humanoids have drawn front / back / side poses; 'left' mirrors the side pose.
   * Bodies without walk poses hop (or float) in place, mirrored for 'left'.
   */
  char.walk = (body, dir = 'down', opts = {}) => {
    if (typeof dir === 'object') [dir, opts] = [dir.dir ?? 'down', dir]
    if (!WALK_DIRS.includes(dir)) throw new Error(`pixspell: walk direction must be one of ${WALK_DIRS.join(', ')}`)
    const spec = normalize(body, opts)
    const base = looks[spec.body].def.id
    const view = dir === 'left' || dir === 'right' ? 'side' : dir
    const pose = looks[`${base}-walk-${view}`] ?? looks[`${base}-walk-side`] // e.g. a dog walks "up" in side view
    let frames
    if (pose) {
      frames = pose.def.sequence.map((_, i) => build(spec, i, pose.def))
    } else {
      // hold the body's first pose and let the hop do the moving (its own float/squash could cancel it out)
      const hop = [0, -1, -2, -1]
      frames = hop.map((dy, i) => new Pixmap(CHAR_SIZE, CHAR_SIZE).draw(build(spec, i, undefined, 0), 0, dy))
    }
    if (dir === 'left') frames = frames.map((f) => f.flipX())
    frames.fps = pose ? pose.def.fps : 6
    return frames
  }
  char.walk.dirs = WALK_DIRS

  /** A random character spec. Pass a seed (number or string) to get the same one every time. */
  char.random = (seed, { outfit = 0.5 } = {}) => {
    const r = rng(seed)
    const pick = (list) => list[Math.floor(r() * list.length)]
    // pick a base body first (humanoids weighted up: they can hold gear), then one of its color variants
    const bases = [...new Set(parts.body.map((id) => looks[id].def.id))]
    const weighted = bases.flatMap((b) => Array(looks[b].def.anchors.hand ? 3 : 1).fill(b))
    const base = pick(weighted)
    const body = pick(parts.body.filter((id) => looks[id].def.id === base))
    const anchors = looks[body].def.anchors
    const spec = { body }
    if (r() < 0.85) spec.hat = pick(parts.head)
    if (anchors.hand && r() < 0.8) spec.hand = pick(parts.hand)
    if (anchors.offhand && r() < 0.45) spec.offhand = pick(parts.offhand)
    if (r() < outfit) spec.A = pick(MATERIAL_NAMES)
    return spec
  }

  char.parts = parts
  char.size = CHAR_SIZE

  /** Number of distinct gear combinations (before recoloring). */
  char.count = () =>
    parts.body.reduce((n, id) => {
      const a = looks[id].def.anchors
      return n + (a.head ? parts.head.length + 1 : 1) * (a.hand ? parts.hand.length + 1 : 1) * (a.offhand ? parts.offhand.length + 1 : 1)
    }, 0)

  return char
}

function pickRamps(o) {
  const out = {}
  for (const k of ['A', 'B', 'C']) if (o[k] != null) out[k] = o[k]
  return out
}
