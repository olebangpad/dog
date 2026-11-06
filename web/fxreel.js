// Effects reel: the effect count, then themed pages of 25 effects each, every one animating.
// Recorded to video by scripts/record-promo.cjs (the page clock is stepped frame by frame).
import { spell, looks, Pixmap } from '../src/index.js'

const lang = new URLSearchParams(location.search).get('lang') === 'ko' ? 'ko' : 'en'
if (lang === 'ko') document.body.classList.add('ko')

const TOTAL = Object.values(looks).filter((l) => l.def.category === 'effects').length
const PAGE = 2.4 // seconds per page
const CELL = 192, GAP = 16, COLS = 5 // 32px art at 6x

// [effect, element?] lists, 25 per page; bg picks the tile behind each effect
const v = (list) => list.map((x) => (Array.isArray(x) ? x : [x]))
const PAGES = [
  {
    caption: { en: 'Every effect here is <b>code</b>', ko: '여기 이펙트 전부 <b>코드</b>예요' },
    items: v(['boom', 'firework', 'magic-circle', 'lightning', 'cross-slash', 'portal', 'flame', 'meteor', 'black-hole', 'heal',
      'shockwave', 'comet', 'dark-vortex', 'holy-beam', 'whirlwind', 'crit', 'summon', 'tornado', 'loot-beam', 'ice-shards',
      'sparkle-burst', 'electric-field', 'poof', 'teleport', 'pow']),
  },
  {
    caption: { en: 'Slashes, hits, <b>crits</b>', ko: '베기 · 타격 · <b>크리티컬</b>' },
    items: v(['cross-slash', 'claw', 'stab', 'smash', 'thrust', 'whip', 'whirlwind', 'pow', 'crit', 'miss', 'block', 'parry', 'impact',
      'arrow', 'wave', ['cross-slash', 'ice'], ['claw', 'dark'], ['stab', 'poison'], ['smash', 'fire'], ['thrust', 'holy'],
      ['whip', 'arcane'], ['whirlwind', 'blood'], ['crit', 'fire'], ['block', 'holy'], ['parry', 'ice']]),
  },
  {
    caption: { en: 'Magic in <b>every element</b>', ko: '모든 속성의 <b>마법</b>' },
    items: v(['aura', 'shield', 'magic-circle', 'portal', 'charge', 'heal', 'teleport', 'orb', 'energy-bolt', 'spinner',
      'flame', 'ice-shards', 'lightning', 'poison-cloud', 'holy-beam', 'dark-vortex', 'splash', 'chain-lightning', 'laser',
      ['spinner', 'fire'], ['laser', 'arcane'], ['splash', 'poison'], ['chain-lightning', 'dark'], ['aura', 'fire'], ['portal', 'ice']]),
  },
  {
    caption: { en: 'Big <b>moments</b>', ko: '한 방의 <b>연출</b>' },
    items: v(['meteor', 'tornado', 'quake', 'black-hole', 'summon', 'revive', 'thorns', 'electric-field', 'confetti', 'poof', 'drip', 'notes',
      ['meteor', 'ice'], ['tornado', 'fire'], ['black-hole', 'blood'], ['summon', 'holy'], ['revive', 'nature'], ['thorns', 'dark'],
      ['electric-field', 'arcane'], ['poof', 'arcane'], ['drip', 'water'], ['notes', 'holy'], ['quake', 'fire'], ['tornado', 'poison'], ['summon', 'dark']]),
  },
  {
    caption: { en: 'Weather that <b>tiles</b> forever', ko: '끝없이 <b>이어지는</b> 날씨' },
    bg: (id) => (/glints|ripple|bubbles|geyser/.test(id) ? 'water' : id === 'lava' ? 'none' : 'grass'),
    items: v(['rain', 'snow', 'leaves', 'fireflies', 'embers', 'fog', 'sunrays', 'wind', 'motes', ['glow', 'fire'], 'smoke-column', 'geyser',
      'ripple', 'glints', 'bubbles', 'lava', ['lava', 'poison'], ['lava', 'ice'], ['rain', 'blood'], ['snow', 'arcane'], ['leaves', 'fire'],
      ['fireflies', 'ice'], ['embers', 'ice'], ['fog', 'dark'], ['glow', 'arcane']]),
  },
  {
    caption: { en: 'Status on <b>any character</b>', ko: '<b>어떤 캐릭터</b>에도 상태 효과' },
    status: true,
    items: v(['burning', 'frozen', 'poisoned', 'buff', 'debuff', 'confused', 'love', 'dizzy', 'sleep', 'aura', 'shield', 'notes',
      ['burning', 'arcane'], ['frozen', 'holy'], ['poisoned', 'dark'], ['buff', 'nature'], ['debuff', 'blood'], ['love', 'water'],
      'glow', 'loot-beam', ['sleep', 'ice'], ['confused', 'ice'], ['aura', 'dark'], ['shield', 'fire'], ['burning', 'ice']]),
  },
  {
    caption: { en: 'Any effect, <b>any color</b>', ko: '아무 이펙트나 <b>아무 색</b>으로' },
    items: ['flame', 'portal', 'cross-slash', 'tornado', 'magic-circle'].flatMap((id) =>
      ['fire', 'ice', 'poison', 'arcane', 'dark'].map((el) => [id, el])),
  },
]
document.querySelector('#count-label').innerHTML = lang === 'ko' ? '무료 게임<br>이펙트' : 'FREE GAME<br>EFFECTS'
document.querySelector('#cta-sub').textContent = lang === 'ko' ? '무료 · CC0 · Phaser / Godot 팩 다운로드' : 'free · CC0 · packs for Phaser, Godot, anything'

// ------------------------------------------------------------- prepare
const toCanvas = (img) => img.toCanvas(document.createElement('canvas'))
const tile = (id) => {
  const t = spell(id, { frame: 0 })
  return toCanvas(new Pixmap(32, 32).draw(t, 0, 0).draw(t, 16, 0).draw(t, 0, 16).draw(t, 16, 16))
}
const BGS = { grass: tile('grass'), water: tile('water') }
const CAST = [
  { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }, { body: 'heroine', hat: 'wizard', hand: 'staff' },
  { body: 'slime' }, { body: 'goblin', hand: 'dagger' }, { body: 'robot', hand: 'hammer' }, { body: 'ghost' },
  { body: 'skeleton', hat: 'viking', hand: 'axe' }, { body: 'slime-gold', hat: 'crown' },
]

const pages = PAGES.map((page, p) => page.items.map(([id, element], i) => {
  const frames = page.status
    ? spell.status(i < 8 ? CAST[i] : spell.char.random(40 + i), id, { element })
    : spell.fx(id, { element })
  return { imgs: frames.map(toCanvas), fps: frames.fps, loop: page.status || frames.loop, bg: page.bg?.(id) ?? 'dark', offset: ((i * 7) % 11) * 0.09 + p * 0.05 }
}))

const dots = document.querySelector('#dots')
dots.append(...PAGES.map(() => document.createElement('i')))
const caption = document.querySelector('#caption')
const count = document.querySelector('#count')
const ctx = document.querySelector('#grid').getContext('2d')
ctx.imageSmoothingEnabled = false

// ---------------------------------------------------------------- draw
let shown = -1
function draw(t) {
  const p = Math.min(PAGES.length - 1, Math.floor(t / PAGE))
  const local = t - p * PAGE
  if (p !== shown) {
    shown = p
    caption.innerHTML = `<span>${PAGES[p].caption[lang]}</span>`
    ;[...dots.children].forEach((d, k) => d.classList.toggle('on', k === p))
  }
  const k = Math.min(1, Math.max(0, (t - 0.15) / 1.3))
  count.textContent = String(Math.round(TOTAL * (1 - (1 - k) ** 3)))

  ctx.clearRect(0, 0, 1024, 1024)
  pages[p].forEach((cell, i) => {
    const row = Math.floor(i / COLS), col = i % COLS
    const appear = (row + col) * 0.035 // a diagonal wave brings each page in
    if (local < appear) return
    const x = col * (CELL + GAP), y = row * (CELL + GAP)
    const grow = Math.min(1, (local - appear) / 0.12)
    const sz = Math.round(CELL * (0.7 + 0.3 * grow)), off = (CELL - sz) >> 1
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(x + off, y + off, sz, sz, 14)
    ctx.clip()
    if (cell.bg === 'dark' || cell.bg === 'none') { ctx.fillStyle = '#18241c'; ctx.fillRect(x + off, y + off, sz, sz) }
    else ctx.drawImage(BGS[cell.bg], x + off, y + off, sz, sz)
    const n = cell.imgs.length, dur = n / cell.fps
    const tt = local + cell.offset
    let f
    if (cell.loop) f = Math.floor(tt * cell.fps) % n
    else {
      const u = tt % (dur + 0.12) // one-shots replay with a short pause
      f = u < dur ? Math.floor(u * cell.fps) : -1
    }
    if (f >= 0) ctx.drawImage(cell.imgs[f], x + off, y + off, sz, sz)
    ctx.restore()
  })
}

let t0 = null
;(function tick(now) {
  if (t0 === null) t0 = now
  draw(Math.max(0, now - t0) / 1000)
  requestAnimationFrame(tick)
})(performance.now())
window.reelLength = PAGES.length * PAGE
