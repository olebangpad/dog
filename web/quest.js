// PixSpell Quest: a tiny top-down action scene built only from PixSpell sprites.
// Characters come from spell.char / spell.walk, attacks and hits from spell.action,
// crits, coins, poofs, level-ups, firelight and fireflies from spell.fx, sound cues for spell.sfx,
// tiles, pickups, HUD icons and text from the sprite collection and pixel font.
// It is a showcase, not a game engine: ~400 lines, no dependencies.

import { spell, looks, Pixmap, text } from '../src/index.js'

export const T = 16
const COLS = 16, ROWS = 11, HUD = 16
export const W = COLS * T, H = ROWS * T + HUD

// T tree  ~ water  , path  f flower  b bush  r rock  c campfire  x chest  s sign  . grass
const MAP = [
  'TTTTTTTTTTTTTTTT',
  'T..f......b..r.T',
  'T.........,....T',
  'T.c.......,~~~.T',
  'T.........,~~~.T',
  'T..s,,,,,,,~~~.T',
  'T.........,....T',
  'T.r.......,..x.T',
  'T....f....,....T',
  'T..b......,..f.T',
  'TTTTTTTTTTTTTTTT',
]
const SOLID = new Set('T~brcxs')
const SWARMS = [[196, 20], [208, 92], [20, 128], [118, 120]]

const ENEMIES = [
  { spec: { body: 'slime' }, hp: 2, speed: 20, weight: 4 },
  { spec: { body: 'slime-blue' }, hp: 2, speed: 22, weight: 3 },
  { spec: { body: 'slime-red', hat: 'horns' }, hp: 3, speed: 24, weight: 2 },
  { spec: { body: 'goblin', hand: 'dagger' }, hp: 3, speed: 32, weight: 3 },
  { spec: { body: 'skeleton', hat: 'viking', hand: 'axe' }, hp: 4, speed: 26, weight: 2 },
  { spec: { body: 'ghost' }, hp: 2, speed: 18, weight: 2, fly: true },
  { spec: { body: 'robot-stealth', hand: 'hammer' }, hp: 4, speed: 24, weight: 1 },
  { spec: { body: 'slime-gold', hat: 'crown' }, hp: 6, speed: 16, weight: 1 },
]

/** Element of an attack, guessed from the held item's variant name. */
function elementOf(spec) {
  const id = spec.hand ?? ''
  if (/fire/.test(id)) return 'fire'
  if (/crystal|ice/.test(id)) return 'ice'
  if (/poison|cursed|toxic|lime/.test(id)) return 'poison'
  if (/dark|void|shadow|blood/.test(id)) return 'dark'
  if (/gold|holy/.test(id)) return 'holy'
  return undefined
}

// ------------------------------------------------------------- caching
const toCanvas = (img) => img.toCanvas(document.createElement('canvas'))
const memo = new Map()
const once = (key, make) => (memo.has(key) ? memo.get(key) : (memo.set(key, make()), memo.get(key)))
const anim = (frames, fps = frames.fps ?? 8) => ({ imgs: frames.map(toCanvas), fps })

function kit(spec, element) {
  return once(`kit:${JSON.stringify(spec)}:${element}`, () => {
    const walk = Object.fromEntries(spell.walk.dirs.map((d) => [d, anim(spell.walk(spec, d))]))
    const attack = spell.action(spec, 'attack', element)
    return {
      walk,
      attack: { right: anim(attack, 20), left: anim(attack.map((f) => f.flipX()), 20) },
      hit: anim(spell.action(spec, 'hit', { element, amount: '-1' }), 16),
      crit: anim(spell.action(spec, 'hit', { element, amount: '-2' }), 16),
      hurt: anim(spell.action(spec, 'hit', { amount: '-1' }), 16),
      death: anim(spell.action(spec, 'death'), 12),
      levelup: anim(spell.action(spec, 'levelup', 'holy'), 12),
      heal: anim(spell.action(spec, 'heal', { amount: '+2' }), 12),
    }
  })
}

const fx = (name, opts = {}) => once(`fx:${name}:${JSON.stringify(opts)}`, () => anim(spell.fx(name, opts)))
const small = (id, frame) => once(`small:${id}:${frame}`, () => toCanvas(spell(id, { frame }).downscale(2)))
const label = (str, color = '#e8f3e4') => once(`text:${str}:${color}`, () => toCanvas(text(str, { color }).outline('#1b1225')))
const shadow = once('shadow', () => {
  const p = new Pixmap(12, 4)
  for (let x = 0; x < 12; x++) for (let y = 0; y < 4; y++) {
    const dx = (x - 5.5) / 6, dy = (y - 1.5) / 2
    if (dx * dx + dy * dy <= 1) p.set(x, y, [0, 0, 0, 70])
  }
  return toCanvas(p)
})

function backgrounds() {
  return once('bg', () => [0, 1, 2, 3].map((wf) => {
    let img = new Pixmap(COLS * T, ROWS * T)
    MAP.forEach((row, r) => [...row].forEach((ch, c) => {
      const x = c * T, y = r * T
      img = img.draw(ch === '~' ? spell('water', { frame: wf }) : ch === ',' ? spell('dirt-sand') : spell('grass'), x, y)
      const deco = { T: (r + c) % 3 ? 'tree' : 'tree-autumn', f: (r * c) % 2 ? 'flower' : 'flower-blue', b: 'bush', r: 'rock-mossy', x: 'chest-gold', s: 'sign' }[ch]
      if (deco) img = img.draw(spell(deco), x, y)
    }))
    return toCanvas(img)
  }))
}

// ------------------------------------------------------------------ game
export function createGame(canvas, { spec, auto = true, seed = 1, onHero, onSound } = {}) {
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = false

  let rand = mulberry(seed)
  const solid = (x, y) => {
    const c = Math.floor(x / T), r = Math.floor(y / T)
    return r < 0 || c < 0 || r >= ROWS || c >= COLS || SOLID.has(MAP[r][c])
  }
  const blocked = (x, y, fly) => fly
    ? x < 18 || x > W - 18 || y < 20 || y > ROWS * T - 8
    : solid(x - 4, y - 3) || solid(x + 4, y - 3) || solid(x - 4, y) || solid(x + 4, y)

  const g = {
    hero: null, enemies: [], pickups: [], fx: [],
    coins: 0, kills: 0, level: 1, auto, idle: 0, time: 0, hudKey: '',
  }

  function makeHero(s) {
    const hero = {
      spec: s, element: elementOf(s), x: 8 * T, y: 6 * T + 8, dir: 'down', lastH: 'right',
      state: 'walk', t: 0, moving: false, hp: g.hero?.maxHp ?? 6, maxHp: g.hero?.maxHp ?? 6,
      invuln: 0, cooldown: 0, struck: false,
    }
    kit(s, hero.element)
    return hero
  }
  g.hero = makeHero(spec ?? { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' })

  function spawn() {
    const total = ENEMIES.reduce((n, e) => n + e.weight, 0)
    let pick = rand() * total, type = ENEMIES[0]
    for (const e of ENEMIES) { if ((pick -= e.weight) < 0) { type = e; break } }
    for (let tries = 0; tries < 40; tries++) {
      const x = 24 + rand() * (W - 48), y = 28 + rand() * (ROWS * T - 44)
      if (blocked(x, y, type.fly) || Math.hypot(x - g.hero.x, y - g.hero.y) < 70) continue
      kit(type.spec, g.hero.element)
      g.enemies.push({ ...type, x, y, dir: 'down', state: 'walk', t: 0, hp: type.hp, wander: 0, vx: 0, vy: 0, kb: [0, 0] })
      return
    }
  }

  const effect = (a, x, y) => g.fx.push({ a, x, y, t: 0 })
  // sound cues (spell.sfx names); the page decides whether to play them. Silent while the demo plays itself.
  const sound = (name, opts) => { if (!g.auto) onSound?.(name, opts) }

  // ------------------------------------------------------------ input
  const keys = new Set()
  const input = { x: 0, y: 0, attack: false }
  function readKeys() {
    input.x = (keys.has('ArrowRight') || keys.has('d') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('a') ? 1 : 0)
    input.y = (keys.has('ArrowDown') || keys.has('s') ? 1 : 0) - (keys.has('ArrowUp') || keys.has('w') ? 1 : 0)
    input.attack = keys.has(' ') || keys.has('j') || keys.has('z') || keys.has('Enter')
  }
  const ATTACK_KEYS = new Set([' ', 'j', 'z', 'Enter'])
  function press(key, down) {
    key = key.length === 1 ? key.toLowerCase() : key
    if (down) keys.add(key); else keys.delete(key)
    if (down && ATTACK_KEYS.has(key)) g.queued = 0.3 // a quick tap between frames still counts
    g.auto = false
    g.idle = 0
  }

  // the demo plays itself until someone touches a key
  let aiTurn = 0, aiDir = [0, 0], stuck = 0, lastPos = [0, 0]
  function autopilot(dt) {
    const h = g.hero
    const foe = g.enemies.filter((e) => e.state !== 'dead' && e.state !== 'dying').sort((a, b) => dist(a, h) - dist(b, h))[0]
    // grab nearby loot first (hearts only when hurt), otherwise go fight
    const loot = g.pickups.filter((p) => p.kind === 'coin' || h.hp < h.maxHp).sort((a, b) => dist(a, h) - dist(b, h))[0]
    const target = loot && (!foe || dist(loot, h) < 60 || dist(loot, h) < dist(foe, h)) ? loot : foe
    input.attack = false
    if (aiTurn > 0) { aiTurn -= dt; [input.x, input.y] = aiDir; return }
    if (!target) { input.x = input.y = 0; return }
    const dx = target.x - h.x, dy = target.y - h.y
    if (target === loot) {
      input.x = Math.abs(dx) > 2 ? Math.sign(dx) : 0
      input.y = Math.abs(dy) > 2 ? Math.sign(dy) : 0
    } else if (Math.abs(dy) < 8 && Math.abs(dx) < 22) {
      input.x = Math.sign(dx) * 0.01; input.y = 0
      input.attack = true
      return
    }
    if (target !== loot) {
      input.x = Math.abs(dx) > 14 ? Math.sign(dx) : 0
      input.y = Math.abs(dy) > 3 ? Math.sign(dy) : 0
    }
    stuck += dt
    if (stuck > 0.4) {
      if (Math.hypot(h.x - lastPos[0], h.y - lastPos[1]) < 2) {
        aiDir = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(rand() * 4)]
        aiTurn = 0.5
      }
      stuck = 0
      lastPos = [h.x, h.y]
    }
  }

  // ------------------------------------------------------------ update
  function move(a, vx, vy, dt, fly) {
    const nx = a.x + vx * dt, ny = a.y + vy * dt
    if (!blocked(nx, a.y, fly)) a.x = nx
    if (!blocked(a.x, ny, fly)) a.y = ny
  }
  const dirOf = (vx, vy, fallback) => (Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy ? (vy > 0 ? 'down' : 'up') : fallback)
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)

  function updateHero(dt) {
    const h = g.hero
    h.t += dt
    h.invuln = Math.max(0, h.invuln - dt)
    h.cooldown = Math.max(0, h.cooldown - dt)
    if (h.state === 'dead') {
      if (h.t > 1.6) { Object.assign(h, { state: 'walk', t: 0, hp: h.maxHp, x: 8 * T, y: 6 * T + 8, invuln: 2 }) }
      return
    }
    if (h.state === 'attack' || h.state === 'hurt' || h.state === 'levelup') {
      const a = h.state === 'attack' ? kit(h.spec, h.element).attack.right : kit(h.spec, h.element)[h.state]
      if (h.state === 'attack' && !h.struck && h.t > 0.08) { h.struck = true; strike() }
      if (h.state === 'hurt') move(h, h.kb[0], h.kb[1], dt)
      if (h.t >= a.imgs.length / a.fps) { h.state = 'walk'; h.t = 0 }
      return
    }
    const len = Math.hypot(input.x, input.y)
    h.moving = len > 0.5
    if (len) {
      h.dir = dirOf(input.x, input.y, h.dir)
      if (input.x) h.lastH = input.x > 0 ? 'right' : 'left'
    }
    if (h.moving) move(h, (input.x / len) * 58, (input.y / len) * 58, dt)
    g.queued = Math.max(0, (g.queued ?? 0) - dt)
    if ((input.attack || g.queued) && !h.cooldown) {
      Object.assign(h, { state: 'attack', t: 0, struck: false, cooldown: 0.45 })
      sound(spell.action.styleOf(h.spec), { element: h.element })
      g.queued = 0
    }
  }

  function strike() {
    const h = g.hero
    const face = h.dir === 'up' || h.dir === 'down' ? h.dir : h.lastH
    for (const e of g.enemies) {
      if (e.state === 'dead' || e.state === 'hit') continue
      const dx = e.x - h.x, dy = e.y - h.y
      const reach = {
        right: dx > -2 && dx < 26 && Math.abs(dy) < 16,
        left: dx < 2 && dx > -26 && Math.abs(dy) < 16,
        up: dy < 4 && dy > -28 && Math.abs(dx) < 16,
        down: dy > -4 && dy < 24 && Math.abs(dx) < 16,
      }[face]
      if (!reach) continue
      e.crit = rand() < 0.2 // a crit hits twice as hard and says so
      e.hp -= e.crit ? 2 : 1
      if (e.crit) effect(fx('crit'), e.x, e.y - 26)
      g.hits = (g.hits ?? 0) + 1
      sound(e.crit ? 'crit' : 'hit', { seed: g.hits % 4 }) // 4 variations so repeated hits don't sound identical
      const n = Math.hypot(dx, dy) || 1
      e.kb = [(dx / n) * 60, (dy / n) * 60]
      Object.assign(e, { state: e.hp > 0 ? 'hit' : 'dying', t: 0 })
    }
  }

  function updateEnemies(dt) {
    const h = g.hero
    for (const e of g.enemies) {
      e.t += dt
      const k = kit(e.spec, h.element)
      if (e.state === 'hit' || e.state === 'dying') {
        move(e, e.kb[0], e.kb[1], dt, e.fly)
        e.kb = e.kb.map((v) => v * 0.9)
        if (e.t >= k.hit.imgs.length / k.hit.fps) {
          if (e.state === 'dying') { e.state = 'dead'; e.t = 0; effect(fx('impact', { element: g.hero.element }), e.x, e.y - 10) }
          else { e.state = 'walk'; e.t = 0 }
        }
        continue
      }
      if (e.state === 'dead') {
        if (e.t >= k.death.imgs.length / k.death.fps) {
          e.gone = true
          g.kills++
          effect(fx('poof', { size: 24 }), e.x, e.y - 8)
          sound('poof')
          const roll = rand()
          if (roll < 0.7) g.pickups.push({ kind: 'coin', x: e.x, y: e.y, t: 0 })
          else if (roll < 0.9) g.pickups.push({ kind: 'heart', x: e.x, y: e.y, t: 0 })
          if (g.kills % 5 === 0) levelUp()
        }
        continue
      }
      const d = dist(e, h)
      if (d < 72 && h.state !== 'dead') {
        e.vx = ((h.x - e.x) / d) * e.speed
        e.vy = ((h.y - e.y) / d) * e.speed
      } else if ((e.wander -= dt) <= 0) {
        const a = rand() * Math.PI * 2
        const go = rand() < 0.7
        e.vx = go ? Math.cos(a) * e.speed * 0.6 : 0
        e.vy = go ? Math.sin(a) * e.speed * 0.6 : 0
        e.wander = 1 + rand() * 1.5
      }
      move(e, e.vx, e.vy, dt, e.fly)
      e.dir = dirOf(e.vx, e.vy, e.dir)
      if (d < 11 && !h.invuln && h.state !== 'dead' && h.state !== 'levelup') hurtHero(e)
    }
    g.enemies = g.enemies.filter((e) => !e.gone)
  }

  function hurtHero(from) {
    const h = g.hero
    h.hp -= 1
    const n = dist(h, from) || 1
    h.kb = [((h.x - from.x) / n) * 50, ((h.y - from.y) / n) * 50]
    if (h.hp <= 0) { Object.assign(h, { state: 'dead', t: 0, hp: 0 }); sound('lose') }
    else { Object.assign(h, { state: 'hurt', t: 0, invuln: 1.2 }); sound('hurt') }
  }

  function levelUp() {
    const h = g.hero
    g.level++
    h.maxHp = Math.min(10, h.maxHp + 2)
    h.hp = h.maxHp
    Object.assign(h, { state: 'levelup', t: 0, invuln: 1.5 })
    effect(fx('confetti', { size: 48 }), h.x, h.y - 20)
    sound('levelup')
  }

  function updatePickups(dt) {
    const h = g.hero
    for (const p of g.pickups) {
      p.t += dt
      if (dist(p, h) < 12 && h.state !== 'dead') {
        p.gone = true
        if (p.kind === 'coin') { g.coins++; effect(fx('coin-pop', { size: 24 }), p.x, p.y - 12); sound('coin') }
        else if (h.hp < h.maxHp) { h.hp = Math.min(h.maxHp, h.hp + 2); effect(fx('sparkle-burst', { element: 'blood', size: 24 }), p.x, p.y - 6); sound('heal') }
      }
      if (p.t > 12) p.gone = true
    }
    g.pickups = g.pickups.filter((p) => !p.gone)
    for (const f of g.fx) f.t += dt
    g.fx = g.fx.filter((f) => f.t < f.a.imgs.length / f.a.fps)
  }

  function update(dt) {
    g.time += dt
    g.idle += dt
    if (!g.auto && g.idle > 10 && !keys.size) g.auto = true
    if (g.auto) autopilot(dt)
    else readKeys()
    updateHero(dt)
    updateEnemies(dt)
    updatePickups(dt)
    const want = Math.min(8, 4 + g.level)
    if (g.enemies.length < want && Math.floor(g.time * 2) !== Math.floor((g.time - dt) * 2)) spawn()
  }

  // ------------------------------------------------------------ render
  function frameOf(a, t, loop = true) {
    const i = Math.floor(t * a.fps)
    return a.imgs[loop ? i % a.imgs.length : Math.min(i, a.imgs.length - 1)]
  }

  function drawActor(a, isHero) {
    const k = kit(a.spec, g.hero.element)
    const sx = Math.round(a.x), sy = Math.round(a.y) + HUD
    ctx.drawImage(shadow, sx - 6, sy - 2)
    let img, big = true
    if (a.state === 'attack') img = frameOf(k.attack[a.dir === 'left' || (a.dir !== 'right' && a.lastH === 'left') ? 'left' : 'right'], a.t, false)
    else if (a.state === 'hit' || a.state === 'dying') img = frameOf(a.crit ? k.crit : k.hit, a.t, false)
    else if (a.state === 'hurt') img = frameOf(k.hurt, a.t, false)
    else if (a.state === 'dead') img = frameOf(k.death, a.t, false)
    else if (a.state === 'levelup') img = frameOf(k.levelup, a.t, false)
    else {
      big = false
      const w = k.walk[a.dir]
      img = isHero && !a.moving ? w.imgs[0] : frameOf(w, g.time + (a.x % 7) / 10)
    }
    if (isHero && a.invuln && a.state === 'walk' && Math.floor(g.time * 12) % 2) return
    if (big) ctx.drawImage(img, sx - 16, sy - 31)
    else ctx.drawImage(img, sx - 12, sy - 23)
  }

  function drawHud() {
    const h = g.hero
    const key = [h.hp, h.maxHp, g.coins, g.level, g.kills, g.auto].join(',')
    if (key !== g.hudKey) {
      g.hudKey = key
      const c = document.createElement('canvas')
      c.width = W; c.height = HUD
      const x = c.getContext('2d')
      x.fillStyle = '#15201a'; x.fillRect(0, 0, W, HUD)
      for (let i = 0; i < h.maxHp / 2; i++) {
        const left = h.hp - i * 2
        x.drawImage(small(left >= 2 ? 'heart' : left === 1 ? 'heart-half' : 'heart-empty', 0), 4 + i * 9, 4)
      }
      x.drawImage(small('coin', 0), 104, 4)
      x.drawImage(label(String(g.coins)), 114, 5)
      x.drawImage(label(`LV ${g.level}`, '#a8e05a'), 146, 5)
      x.drawImage(label(g.auto ? 'DEMO' : 'PIXSPELL', g.auto ? '#ffd06a' : '#8aa592'), g.auto ? 220 : 214, 5)
      g.hud = c
    }
    ctx.drawImage(g.hud, 0, 0)
  }

  function draw() {
    const bgs = backgrounds()
    ctx.drawImage(bgs[Math.floor(g.time * 4) % 4], 0, HUD)
    const fire = once('campfire', () => anim(spell.frames('campfire')))
    const light = fx('glow', { element: 'fire', size: 48 })
    MAP.forEach((row, r) => [...row].forEach((ch, c) => {
      if (ch !== 'c') return
      ctx.globalAlpha = 0.55 // firelight first, so it sits under the fire, and half see-through so the grass shows
      ctx.drawImage(frameOf(light, g.time), c * T - 16, r * T - 14 + HUD)
      ctx.globalAlpha = 1
      ctx.drawImage(frameOf(fire, g.time), c * T, r * T + HUD)
    }))
    for (const p of g.pickups) {
      const bob = Math.round(Math.sin(p.t * 6) * 1.5)
      if (p.t > 9 && Math.floor(p.t * 8) % 2) continue
      const img = p.kind === 'coin' ? small('coin', Math.floor(p.t * 8) % 4) : small('heart', 0)
      ctx.drawImage(img, Math.round(p.x) - 4, Math.round(p.y) - 10 + bob + HUD)
    }
    const actors = [...g.enemies.map((e) => [e, false]), [g.hero, true]].sort((a, b) => a[0].y - b[0].y)
    for (const [a, isHero] of actors) drawActor(a, isHero)
    // a few firefly swarms: the seamless 32px tile, a different seed per spot so no two match
    SWARMS.forEach(([x, y], k) => ctx.drawImage(frameOf(fx('fireflies', { seed: k + 1 }), g.time + k * 0.37), x, y + HUD))
    for (const f of g.fx) {
      const img = frameOf(f.a, f.t, false)
      ctx.drawImage(img, Math.round(f.x - img.width / 2), Math.round(f.y - img.height / 2) + HUD)
    }
    drawHud()
    if (g.auto && Math.floor(g.time * 2) % 2) {
      const msg = label(matchMedia('(pointer: coarse)').matches ? 'TAP TO PLAY' : 'PRESS ANY KEY')
      ctx.drawImage(msg, (W - msg.width) >> 1, H - 12)
    }
  }

  // -------------------------------------------------------------- loop
  let raf = 0, prev = 0
  function frame(now) {
    const dt = prev ? Math.min(0.05, Math.max(0, (now - prev) / 1000)) : 0
    prev = now
    update(dt)
    draw()
    raf = requestAnimationFrame(frame)
  }

  return {
    state: g,
    start() { for (let i = 0; i < 4; i++) spawn(); raf = requestAnimationFrame(frame) },
    stop() { cancelAnimationFrame(raf) },
    press,
    setHero(s) {
      g.hero = { ...makeHero(s), x: g.hero.x, y: g.hero.y, hp: g.hero.hp }
      g.hudKey = ''
      onHero?.(s)
    },
    reseed(s) { rand = mulberry(s) },
  }
}

function mulberry(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export { looks }
