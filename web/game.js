// Page glue for game.html: input, sizing, and "play as the character you made".
import { dog, looks } from '../src/index.js'
import { createGame, W, H } from './quest.js'
import { $, $$, encode, decode, readHash, writeHash } from './ui.js'

const DEFAULT = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }

function heroFromLink() {
  const raw = readHash('c')
  if (!raw) return null
  try {
    const s = decode(raw)
    if (!looks[s.body] || !Object.keys(looks[s.body].def.anchors).length) return null
    const out = { body: s.body }
    for (const k of ['hat', 'hand', 'offhand', 'A']) if (s[k]) out[k] = s[k]
    return out
  } catch {
    return null
  }
}

const short = (id) => id?.replace(/^(hat|held)-/, '')
function showHero(spec) {
  const opts = ['hat', 'hand', 'offhand', 'A'].filter((k) => spec[k]).map((k) => `${k}: '${k === 'A' ? spec[k] : short(spec[k])}'`)
  $('#hero-code').textContent = `// you are playing as\ndog.char('${spec.body}'${opts.length ? `, { ${opts.join(', ')} }` : ''})`
  $('#edit-hero').href = `./#c=${encode(spec)}`
  writeHash('c', encode(spec))
}

const startHero = heroFromLink() ?? DEFAULT
const game = createGame($('#game'), { spec: startHero, auto: true, seed: 7, onHero: showHero })
showHero(startHero)

// ------------------------------------------------------------------ input
const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd', 'j', 'z', 'Enter'])
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, a, button') && e.key !== ' ' && !e.key.startsWith('Arrow')) return
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
  if (GAME_KEYS.has(k)) e.preventDefault()
  game.press(k, true)
})
addEventListener('keyup', (e) => game.press(e.key, false))
addEventListener('blur', () => GAME_KEYS.forEach((k) => game.press(k, false)))

for (const b of $$('#pad button')) {
  const key = b.dataset.key
  const down = (e) => { e.preventDefault(); b.classList.add('held'); game.press(key, true) }
  const up = () => { b.classList.remove('held'); game.press(key, false) }
  b.addEventListener('pointerdown', down)
  b.addEventListener('pointerup', up)
  b.addEventListener('pointerleave', up)
  b.addEventListener('pointercancel', up)
}
$('#game').addEventListener('pointerdown', () => game.press('Shift', false))

$('#new-hero').addEventListener('click', (e) => {
  e.currentTarget.blur()
  game.setHero(dog.char.random())
})

// ----------------------------------------------------------------- sizing
function fit() {
  const screen = $('#screen')
  const touch = matchMedia('(pointer: coarse)').matches
  const availW = screen.clientWidth - 20
  const availH = innerHeight - (touch ? 300 : 200)
  let s = Math.min(availW / W, Math.max(1, availH) / H)
  if (s >= 2) s = Math.floor(s)
  const c = $('#game')
  c.style.width = `${Math.floor(W * s)}px`
  c.style.height = `${Math.floor(H * s)}px`
}
addEventListener('resize', fit)
fit()

$('#favicon').href = dog('dog').toDataURL()
game.start()
Object.assign(window, { game, dog })
