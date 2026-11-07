// Acts: one character hitting another, with game feel. The attacker winds up (and steps in, for a melee weapon),
// swings (its real attack, with the effect for its weapon), everything freezes for a moment on contact (hit-stop)
// while the screen shakes, then the target reacts (flash, knock-back, damage number) or is knocked out, and both recover.
// Both sides are PixSpell characters or monsters, so any of the millions of combinations can fight any monster.
//
//   const act = spell.act(knight, 'slime', { element: 'fire' })
//   act               frames (12 fps): the attacker on the left facing right, the target on the right facing left
//   act.hits          [{ frame, time, freeze, shake, push }]: the hit-stop and shake to reproduce in a game
//   act.cues          [{ frame, time, sound, opts }]: play spell.sfx(sound, opts) at that time (act.play() does it)
//   act.feet          { attacker: [x, y], target: [x, y] }: where their feet are in the frame
//   act.save('hit.gif'), act.toSheet(), act.toAPNG() ... like any animation

const FPS = 12
// the attack frame where the blow lands, for each attack style (see spell.action.styles)
const CONTACT = { slash: 2, stab: 3, thrust: 3, whip: 2, smash: 3, burn: 2, bonk: 3, punch: 3, shoot: 4, magic: 5 }
const SHAKE = [[1, 0], [-1, 0], [1, -1], [-1, 1], [0, 1], [1, 0]] // per frozen frame, times opts.shake
// melee styles step in until their feet are this far from the target's when the blow lands (ranged ones stay put)
const GAP = { slash: 18, stab: 22, thrust: 22, whip: 26, smash: 15, burn: 18, bonk: 17, punch: 14 }

export function createActs(spell, { Pixmap, text, applyActive, asFrames, OUTLINE }) {
  const specOf = (s) => (typeof s === 'string' ? { body: s } : { ...s })
  const top = (img) => { for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) if (img.alpha(x, y)) return y; return 0 }

  function act(attacker, target, opts = {}) {
    const { element, style, ko = false, amount = ko ? '-99' : '-7', label = true, freeze = 0.25, shake = 2, distance = 26, lunge = true, grid, mirror = false } = opts
    const a = specOf(attacker), t = specOf(target)
    for (const s of [a, t]) {
      if (spell.char.parts.body.includes(s.body)) continue
      try { spell(s.body) } catch { continue } // not a sprite at all: the character error below suggests a body
      throw new Error(`pixspell: spell.act needs characters, and "${s.body}" is a sprite, not a body. Bodies: ${spell.char.parts.body.filter((b) => !b.includes('-')).join(', ')}`)
    }
    // the attacker's swing, in a frame wide enough for the effect to reach the target
    const W = 2 * (distance + 30)
    const swing = spell.action(a, 'attack', { element, style, width: W })
    const aStyle = style ?? spell.action.styleOf(a)
    const contact = Math.min(swing.length - 2, CONTACT[aStyle] ?? 2)
    const aIdle = spell.char.frames(a)
    // the target faces left: its reactions are mirrored, and the damage number is drawn separately so it reads right
    const hit = spell.action(t, 'hit', { element, label: false }).flipX()
    const death = ko ? spell.action(t, 'death', { label: false }).flipX() : null
    const tIdle = spell.char.frames(t).map((f) => f.flipX())

    const H = Math.max(swing[0].h, hit[0].h) + 4 // 2 px of room for the shake on each side
    const feetY = H - 3
    const aFeetX = W >> 1 // the attacker stands in the middle of its wide swing frame
    const ax = 2, tFeetX = ax + aFeetX + distance
    const stageW = ax + W + 2
    const place = (img, feetX) => img && img.at(feetX - (img.w >> 1), feetY - img.h + 1)
    const asAction = (idle) => new Pixmap(W, swing[0].h).draw(idle, (W - idle.w) >> 1, swing[0].h - idle.h) // idle in swing coordinates

    // the timeline, one entry per frame
    const steps = []
    const F = Math.max(0, Math.round(freeze * FPS))
    const L = lunge ? Math.max(0, distance - (GAP[aStyle] ?? distance)) : 0 // how far a melee attacker steps in
    steps.push({ a: 0, adx: -1, t: 'idle' }, { a: 0, adx: -2, t: 'idle' }) // pull back before the blow
    if (L > 4) steps.push({ a: 0, adx: Math.round(L * 0.5), t: 'idle' }, { a: 0, adx: Math.round(L * 0.9), t: 'idle' }) // dash in
    const swingStep = steps.length
    for (let i = 1; i < contact; i++) steps.push({ a: i, adx: L, t: 'idle' })
    const contactStep = steps.length
    for (let i = 0; i <= F; i++) steps.push({ a: contact, adx: L, t: 0, shake: i < F ? SHAKE[i % SHAKE.length] : null }) // frozen, flashing
    const react = ko ? death : hit
    const reactFrom = 1, reactLen = react.length - reactFrom
    for (let i = 0; i < Math.max(swing.length - contact - 1, reactLen); i++) {
      steps.push({ a: contact + 1 + i < swing.length ? contact + 1 + i : 'idle', adx: L, t: reactFrom + i < react.length ? reactFrom + i : ko ? 'gone' : 'idle' })
    }
    for (const k of [0.6, 0.25, 0]) steps.push({ a: 'idle', adx: Math.round(L * k), t: ko ? 'gone' : 'idle' }) // step back
    const afterFreeze = contactStep + F + 1

    // the damage number rises above the target once the freeze lets go
    const num = label && amount != null ? text(String(amount), { color: element ? '#ffd06a' : '#ff6b5a' }).outline(OUTLINE) : null
    const tTop = feetY - (tIdle[0].h - 1 - top(tIdle[0])) + 0
    const scenes = steps.map((st, i) => {
      let scene = new Pixmap(stageW, H)
      const aImg = st.a === 'idle' ? asAction(aIdle[i % aIdle.length]) : swing[st.a]
      const tImg = st.t === 'gone' ? null : st.t === 'idle' ? tIdle[i % tIdle.length] : react[st.t]
      if (tImg) scene = scene.draw(place(tImg, tFeetX))
      return scene.draw(place(aImg, ax + aFeetX + (st.adx ?? 0)))
    })
    // trim the empty columns on the left of the wide swing frame (counting where the shake moves them)
    const left = (f) => { for (let x = 0; x < f.w; x++) for (let y = 0; y < f.h; y++) if (f.alpha(x, y)) return x; return f.w }
    const used = scenes.reduce((m, f, i) => Math.min(m, Math.max(0, left(f) + (steps[i].shake ? steps[i].shake[0] * shake : 0))), stageW)
    const cut = Math.max(0, used - 2), w = stageW - cut
    // mirrored (flipX: the attacker on the right) before the number is drawn, so the number still reads right
    const fx = (x) => (mirror ? w - 1 - (x - cut) : x - cut)
    let out = scenes.map((scene, i) => {
      scene = scene.crop(cut, 0, w, H)
      if (mirror) scene = scene.flipX()
      const k = i - afterFreeze
      if (num && k >= 0 && k < 7) scene = scene.draw(num, fx(tFeetX) - (num.w >> 1), Math.max(0, tTop - 6 - k))
      const st = steps[i]
      return st.shake ? new Pixmap(w, H).draw(scene, st.shake[0] * shake, st.shake[1] * shake) : scene
    })
    out = applyActive(Object.assign(out, { fps: FPS, loop: false }))

    const k = grid ? grid / 16 : 1
    if (k !== 1) out = spell.toGrid(out, grid)
    const result = asFrames(out, FPS, false, 'corner')
    const time = (f) => Math.round((f / FPS) * 1000) / 1000
    const cues = [
      { frame: swingStep, time: time(swingStep), sound: aStyle, opts: element ? { element } : {} },
      { frame: contactStep, time: time(contactStep), sound: ko ? 'crit' : 'hit', opts: element ? { element } : {} },
      ...(ko ? [{ frame: afterFreeze + 3, time: time(afterFreeze + 3), sound: 'death', opts: {} }] : []),
    ]
    const hits = [{ frame: contactStep, time: time(contactStep), freeze: time(F), shake: shake * k, push: 2 * k }]
    const feet = { attacker: [fx(ax + aFeetX) * k, (feetY + 1) * k - 1], target: [fx(tFeetX) * k, (feetY + 1) * k - 1] }
    return dress(result, hits, cues, feet, () => act(attacker, target, { ...opts, mirror: !mirror }))
  }

  // the act's extras, non-enumerable like the other helpers (so it still compares and spreads like a plain array of
  // frames); flipX() builds the act again mirrored (so the damage number reads right), scale() scales the feet too
  function dress(frames, hits, cues, feet, flipped) {
    const { scale } = frames
    const extra = {
      hits,
      cues,
      feet,
      /** Browser: play the sounds at their times (the frames are yours to draw). Returns { stop() }. */
      play: (playOpts = {}) => {
        const timers = cues.map((c) => setTimeout(() => spell.sfx(c.sound, c.opts).play(playOpts), c.time * 1000))
        return { stop: () => timers.forEach(clearTimeout) }
      },
      /** Mirrored: the attacker on the right facing left (an enemy's turn). */
      flipX: flipped,
      scale: (n) => {
        const s = ([x, y]) => [Math.round(x * n), Math.round((y + 1) * n) - 1]
        return dress(scale.call(frames, n), hits.map((h) => ({ ...h, shake: h.shake * n, push: h.push * n })), cues, { attacker: s(feet.attacker), target: s(feet.target) }, () => flipped().scale(n))
      },
    }
    for (const [key, value] of Object.entries(extra)) Object.defineProperty(frames, key, { value, writable: true, configurable: true })
    return frames
  }
  act.styles = Object.keys(CONTACT)
  return act
}
