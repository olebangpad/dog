// Code reel: each line of PixSpell code is typed, and the game scene on the right gains what that line makes:
// ground, a hero who walks in, an enemy, a spell, a glowing meteor, its sound, the loot.
// Recorded to docs/promo/code.gif by scripts/record-promo.cjs (the page clock is stepped frame by frame).
import { spell, Pixmap } from '../src/index.js'

const toC = (img) => img.toCanvas(document.createElement('canvas'))
const anim = (frames, fps = frames.fps ?? 6, loop = frames.loop !== false) => ({ imgs: frames.map(toC), fps, loop })
const frameAt = (a, t) => a.imgs[a.loop ? Math.floor(t * a.fps) % a.imgs.length : Math.min(a.imgs.length - 1, Math.max(0, Math.floor(t * a.fps)))]

const SW = 160, SH = 110 // the scene, drawn at 2x
const mage = { body: 'heroine', hat: 'wizard', hand: 'staff' }
const A = {
  walk: anim(spell.walk(mage, 'right')),
  cast: anim(spell.action(mage, 'cast', 'fire'), 12, false),
  slime: anim(spell.walk('slime-pink', 'left')),
  slimeDie: anim(spell.action('slime-pink', 'death'), 12, false),
  meteor: anim(spell.fx('meteor', { element: 'fire', size: 64 }), 14, false),
  coin: anim(spell.frames('coin'), 8),
  coinPop: anim(spell.fx('coin-pop', { size: 32 }), 14, false),
  note: anim(spell.fx('notes', { element: 'holy', size: 48 })),
}
// the ground: grass with a tree and flowers, like the first line of any game
let ground = new Pixmap(SW, SH)
for (let y = 0; y < SH; y += 16) for (let x = 0; x < SW; x += 16) ground = ground.draw(spell('grass'), x, y)
ground = ground.draw(spell('tree'), 4, 4).draw(spell('tree-autumn'), 140, 6).draw(spell('flower'), 70, 12).draw(spell('flower-blue'), 120, 86).draw(spell('rock'), 20, 88)
const groundC = toC(ground)

// a sound has no picture: draw its waveform as pixels
const wave = (() => {
  const s = spell.sfx('meteor'), w = 64, h = 18, img = new Pixmap(w, h)
  for (let x = 0; x < w; x++) {
    let peak = 0
    for (let i = Math.floor((x / w) * s.samples.length); i < Math.floor(((x + 1) / w) * s.samples.length); i++) peak = Math.max(peak, Math.abs(s.samples[i]))
    const bar = Math.max(1, Math.round(peak * 8))
    for (let y = 9 - bar; y < 9 + bar; y++) img.set(x, y, [255, 208, 106, 255])
  }
  return toC(img)
})()

const STEPS = [
  { code: `const ground = spell('grass')`, label: 'tiles and props' },
  { code: `const mage = { body: 'heroine', hat: 'wizard' }`, label: '2.7 million characters' },
  { code: `spell.walk(mage, 'right')`, label: 'walk cycles' },
  { code: `spell.walk('slime-pink', 'left')`, label: 'monsters in any color' },
  { code: `spell.action(mage, 'cast', 'fire')`, label: 'attack, cast, level up' },
  { code: `spell.fx('meteor', { element: 'fire' })`, label: '665 effects that glow' },
  { code: `spell.sfx('meteor').play()`, label: '103 sounds' },
  { code: `spell('coin')`, label: 'items and loot' },
]
const CPS = 32, SHOW = 1.3
let start = 0
STEPS.forEach((s) => { s.start = start; s.typed = start + s.code.length / CPS; start = s.typed + SHOW })
const LENGTH = start + 1.2
const at = (i) => STEPS[i].typed // when line i's result appears

const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const highlight = (line) => esc(line).replace(/('[^']*'?)/g, '<span class="s">$1</span>').replace(/\b(spell)\b/g, '<span class="k">$1</span>')

const pre = document.querySelector('#code')
const label = document.querySelector('#label')
const ctx = document.querySelector('#out').getContext('2d')
ctx.imageSmoothingEnabled = false
let shown = ''

function draw(t) {
  t %= LENGTH
  const cur = STEPS.findLast((s) => t >= s.start) ?? STEPS[0]
  const html = STEPS.filter((s) => s.start <= t).map((s, i) => {
    const n = Math.min(s.code.length, Math.floor((t - s.start) * CPS))
    return `<span class="ln">${i + 1}</span>${highlight(s.code.slice(0, n))}${s === cur ? '<span class="cur"></span>' : ''}`
  }).join('\n')
  if (html !== shown) { pre.innerHTML = html; shown = html }
  const last = STEPS.findLast((s) => t >= s.typed)
  label.textContent = last ? last.label : ''

  ctx.clearRect(0, 0, SW, SH)
  if (t < at(0)) return
  ctx.drawImage(groundC, 0, 0)
  ctx.fillStyle = 'rgba(6, 10, 28, 0.35)'; ctx.fillRect(0, 0, SW, SH) // dusk, so the spell glows
  const feet = 78
  // the hero: stands once described, walks in, casts
  if (t >= at(1)) {
    const walkT = t >= at(2) ? Math.min(1, (t - at(2)) / 0.9) : 0
    const hx = t >= at(2) ? -12 + walkT * 50 : 38
    if (t >= at(4) && t < at(4) + 0.8) ctx.drawImage(frameAt(A.cast, t - at(4)), Math.round(hx) - 16, feet - 31)
    else ctx.drawImage(walkT > 0 && walkT < 1 ? frameAt(A.walk, t) : A.walk.imgs[0], Math.round(hx) - 12, feet - 23)
  }
  // the slime: hops in, then the meteor gets it
  const sx = 118
  if (t >= at(3)) {
    const inT = Math.min(1, (t - at(3)) / 0.9), x = 175 - inT * (175 - sx)
    const hit = at(5) + 0.45 * A.meteor.imgs.length / A.meteor.fps
    if (t < hit) ctx.drawImage(frameAt(A.slime, t), Math.round(x) - 12, feet - 23)
    else if (t < hit + 0.7) ctx.drawImage(frameAt(A.slimeDie, t - hit), sx - 16, feet - 31)
  }
  if (t >= at(5) && t < at(5) + A.meteor.imgs.length / A.meteor.fps) ctx.drawImage(frameAt(A.meteor, t - at(5)), sx - 32, feet - 52)
  // the sound: its waveform and a few notes
  if (t >= at(6) && t < at(7) + 0.6) { ctx.drawImage(wave, 48, 6); ctx.drawImage(frameAt(A.note, t), 56, 18) }
  // the loot
  if (t >= at(7)) {
    ctx.drawImage(frameAt(A.coin, t), sx - 8, feet - 14 + Math.round(Math.sin(t * 5) * 1.5))
    if (t < at(7) + 0.6) ctx.drawImage(frameAt(A.coinPop, t - at(7)), sx - 16, feet - 34)
  }
}

let t0 = null
;(function tick(now) {
  if (t0 === null) t0 = now
  draw(Math.max(0, now - t0) / 1000)
  requestAnimationFrame(tick)
})(performance.now())
window.reelLength = LENGTH
