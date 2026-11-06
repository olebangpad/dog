// Code reel: each line of PixSpell code is typed, then its result appears with a little spell sparkle.
// Recorded to docs/promo/code.gif by scripts/record-promo.cjs (the page clock is stepped frame by frame).
import { spell, Pixmap } from '../src/index.js'

const toCanvas = (img) => img.toCanvas(document.createElement('canvas'))
const anim = (frames, fps = frames.fps ?? 6) => ({ imgs: frames.map(toCanvas), fps, loop: frames.loop !== false })

// a sound has no picture: draw its waveform as pixels, with a note bouncing over it
function soundPicture(sound) {
  const w = 64, h = 32, img = new Pixmap(w, h)
  const span = Math.max(0.6, sound.duration) * sound.sampleRate
  for (let x = 0; x < w; x++) {
    let peak = 0
    for (let i = Math.floor((x / w) * span); i < Math.floor(((x + 1) / w) * span) && i < sound.samples.length; i++) peak = Math.max(peak, Math.abs(sound.samples[i]))
    const bar = Math.max(1, Math.round(peak * 14))
    for (let y = 16 - bar; y < 16 + bar; y++) img.set(x, y, [255, 208, 106, 255])
  }
  return [img]
}

const mage = { body: 'hero', hat: 'wizard' }
const STEPS = [
  { code: `const slime = spell('slime', { A: '#ff4fd8' })`, label: 'any sprite, any color', show: anim(spell.frames('slime', { A: '#ff4fd8' }), 6) },
  { code: `const mage = spell.char('hero', { hat: 'wizard' })`, label: '2.7 million characters', show: anim(spell.walk(mage, 'down')) },
  { code: `spell.action(mage, 'cast', 'holy')`, label: 'walk, attack, cast, level up', show: anim(spell.action(mage, 'cast', 'holy')) },
  { code: `spell.fx('meteor', { element: 'ice', size: 64 })`, label: '545 effects, any size', show: anim(spell.fx('meteor', { element: 'ice', size: 64 })) },
  { code: `spell.sfx('coin').play()  // sounds too`, label: '66 sounds, made by code', show: { imgs: soundPicture(spell.sfx('coin')).map(toCanvas), fps: 1, loop: true }, note: anim(spell.fx('notes', { element: 'holy' })) },
]
const sparkle = anim(spell.fx('sparkle-burst', { element: 'holy', size: 64 }))
const CPS = 34 // typing speed, characters per second
const SHOW = 1.7 // seconds a result stays before the next line starts
let start = 0
STEPS.forEach((s) => { s.start = start; s.typed = start + s.code.length / CPS; start = s.typed + SHOW })
const LENGTH = start + 0.6

// tiny highlighter: strings, the spell object, comments
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const highlight = (line) => {
  const [code, comment] = line.split('//')
  const body = esc(code).replace(/('[^']*'?)/g, '<span class="s">$1</span>').replace(/\b(spell)\b/g, '<span class="k">$1</span>')
  return body + (comment !== undefined ? `<span class="c">//${esc(comment)}</span>` : '')
}

const pre = document.querySelector('#code')
const label = document.querySelector('#label')
const ctx = document.querySelector('#out').getContext('2d')
ctx.imageSmoothingEnabled = false
let shownLines = ''

function draw(t) {
  t %= LENGTH
  const cur = STEPS.findLast((s) => t >= s.start) ?? STEPS[0]
  // editor: finished lines, then the one being typed
  const lines = STEPS.filter((s) => s.start <= t).map((s, i) => {
    const n = Math.min(s.code.length, Math.floor((t - s.start) * CPS))
    const text = highlight(s.code.slice(0, n))
    const caret = s === cur ? '<span class="cur"></span>' : ''
    return `<span class="ln">${i + 1}</span>${text}${caret}`
  }).join('\n')
  if (lines !== shownLines) { pre.innerHTML = lines; shownLines = lines }

  ctx.clearRect(0, 0, 160, 160)
  const done = STEPS.filter((s) => t >= s.typed)
  const last = done.at(-1)
  label.textContent = last ? last.label : ''
  if (!last) return
  const since = t - last.typed
  const a = last.show
  const img = a.imgs[Math.floor(since * a.fps) % a.imgs.length]
  const k = Math.max(1, Math.floor(128 / Math.max(img.width, img.height)))
  ctx.drawImage(img, (160 - img.width * k) >> 1, (160 - img.height * k) >> 1, img.width * k, img.height * k)
  if (last.note) {
    const n = last.note.imgs[Math.floor(since * last.note.fps) % last.note.imgs.length]
    ctx.drawImage(n, 48, 4, 64, 64)
  }
  // the spell sparkle when a line finishes
  const f = Math.floor(since * sparkle.fps)
  if (f < sparkle.imgs.length) ctx.drawImage(sparkle.imgs[f], 16, 16, 128, 128)
}

let t0 = null
;(function tick(now) {
  if (t0 === null) t0 = now
  draw(Math.max(0, now - t0) / 1000)
  requestAnimationFrame(tick)
})(performance.now())
window.reelLength = LENGTH
