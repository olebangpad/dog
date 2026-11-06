// Sounds page: every dog.sfx sound as a card with a pixel waveform. Click to play.
import { dog, zip, MATERIALS, FX_COLORS } from '../src/index.js'
import { $, $$, h, download, copy, toast } from './ui.js'

const KINDS = ['all', 'ui', 'move', 'pickup', 'attack', 'action', 'magic', 'explosion', 'element', 'jingle', 'loop']
const KIND_COLOR = { ui: 'ice', move: 'sand', pickup: 'gold', attack: 'orange', action: 'red', magic: 'pink', explosion: 'orange', element: 'purple', jingle: 'lime', loop: 'blue' }
const ids = dog.sfx.list
const state = { kind: 'all', element: null, pitch: 1, vary: false, last: 'coin' }

$('#sfx-count').textContent = ids.length
$('#sfx-designs').textContent = `${ids.length} sounds × ${dog.sfx.elements.length + 1} element flavors × any pitch · every attack style and action has one`

const kindOf = (id) => KINDS.find((k) => k !== 'all' && dog.sfx.tags(id).includes(k)) ?? 'element'
const opts = (seed = 0) => ({ element: state.element ?? undefined, pitch: state.pitch, seed })
const sound = (id, seed = 0) => dog.sfx(id, opts(seed))

// --------------------------------------------------------------- cards
const cards = new Map()
function waveform(canvas, id) {
  const s = sound(id), w = canvas.width, hgt = canvas.height
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, w, hgt)
  ctx.fillStyle = MATERIALS[KIND_COLOR[kindOf(id)]][2]
  // pixel bars: the loudest sample in each column, 1.2 s across (longer sounds squeeze to fit)
  const span = Math.max(1.2, s.duration) * s.sampleRate
  for (let x = 0; x < w; x++) {
    let peak = 0
    const a = Math.floor((x / w) * span), b = Math.min(s.samples.length, Math.floor(((x + 1) / w) * span))
    for (let i = a; i < b; i++) peak = Math.max(peak, Math.abs(s.samples[i]))
    const bar = Math.round(peak * (hgt / 2 - 1))
    if (bar) ctx.fillRect(x, hgt / 2 - bar, 1, bar * 2)
    else if (a < s.samples.length) ctx.fillRect(x, hgt / 2, 1, 1)
  }
}

function buildGrid() {
  const grid = $('#sfx-grid')
  for (const id of ids) {
    const canvas = h('canvas', { width: 48, height: 24, 'aria-hidden': 'true' })
    const card = h('div', { class: 'fx-card', 'data-id': id },
      h('button', { class: 'play', title: `Play ${id}`, onclick: () => play(id) },
        canvas, h('span', {}, id), h('span', { class: 'kind' }, `${kindOf(id)}${dog.sfx(id).loop ? ' · loop' : ''}`)),
      h('button', { class: 'dl', title: `Download ${id}.wav`, 'aria-label': `Download ${id}.wav`, onclick: () => saveOne(id) }, '⬇'))
    cards.set(id, { card, canvas })
    grid.append(card)
  }
  redraw()
}
function redraw() { for (const [id, c] of cards) waveform(c.canvas, id) }

function filter() {
  let n = 0
  for (const [id, c] of cards) {
    const show = state.kind === 'all' || dog.sfx.tags(id).includes(state.kind)
    c.card.hidden = !show
    if (show) n++
  }
  $$('#kinds button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)))
  $('#dl-all').textContent = `📦 Download these ${n} as WAVs`
}

// ---------------------------------------------------------------- play
let looping = null
function play(id) {
  const c = cards.get(id)
  if (looping?.id === id) { looping.handle.stop(); c.card.classList.remove('playing'); looping = null; return }
  const seed = state.vary ? 1 + Math.floor(Math.random() * 999) : 0
  const s = sound(id, seed)
  const handle = s.play()
  if (s.loop) {
    looping?.handle.stop()
    if (looping) cards.get(looping.id).card.classList.remove('playing')
    looping = { id, handle }
    c.card.classList.add('playing')
  } else {
    c.card.classList.add('playing')
    setTimeout(() => c.card.classList.remove('playing'), s.duration * 1000)
  }
  state.last = id
  showCode(seed)
}

function showCode(seed = 0) {
  const id = state.last
  const o = [state.element && `element: '${state.element}'`, state.pitch !== 1 && `pitch: ${state.pitch}`, seed && `seed: ${seed}`].filter(Boolean)
  const call = `dog.sfx('${id}'${o.length ? `, { ${o.join(', ')} }` : ''})`
  $('#code').textContent = [
    `import { dog } from 'https://cdn.jsdelivr.net/gh/olebangpad/dots-of-games@main/src/index.js'`,
    '',
    `${call}.play()${dog.sfx(id).loop ? '          // seamless loop: .play({ loop: true }) / .stop()' : '          // call from a click or key handler the first time'}`,
    `await ${call}.save('${id}.wav')   // Node`,
    `${call}.toWAV()                   // bytes for any engine`,
  ].join('\n')
}

function saveOne(id) {
  const s = sound(id)
  download(`${s.id}${state.pitch !== 1 ? `-x${state.pitch}` : ''}.wav`, s.toWAV(), 'audio/wav')
}

$('#dl-all').addEventListener('click', () => {
  const list = ids.filter((id) => !cards.get(id).card.hidden)
  const name = `dog-${state.kind === 'all' ? '' : state.kind + '-'}sounds${state.element ? '-' + state.element : ''}`
  const pack = dog.sfxPack(list, { name, element: state.element ?? undefined, pitch: state.pitch })
  download(`${name}.zip`, zip(pack.files), 'application/zip')
  toast(`${name}.zip: ${list.length} WAV file${list.length > 1 ? 's' : ''}`)
})
$('#copy').addEventListener('click', () => copy($('#code').textContent, 'Code copied'))

// ------------------------------------------------------------ controls
$('#kinds').append(...KINDS.map((k) => h('button', { 'data-kind': k, onclick: () => { state.kind = k; filter() } }, k)))
const swatch = (m) => `linear-gradient(135deg, ${MATERIALS[m][3]} 0 30%, ${MATERIALS[m][2]} 30% 65%, ${MATERIALS[m][1]} 65%)`
$('#elements').append(
  h('button', { 'data-element': '', 'aria-pressed': 'true', onclick: () => setElement(null) }, h('i', { style: { '--sw': '#55665a' } }), 'plain'),
  ...dog.sfx.elements.map((name) => h('button', { 'data-element': name, 'aria-pressed': 'false', onclick: () => setElement(name) }, h('i', { style: { '--sw': swatch(FX_COLORS[name]) } }), name)),
)
function setElement(el) {
  state.element = el
  $$('#elements button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.element || null) === el)))
  redraw()
  showCode()
}
$('#pitch').addEventListener('input', (e) => { $('#pitch-out').textContent = `${Number(e.target.value).toFixed(2)}×` })
$('#pitch').addEventListener('change', (e) => { state.pitch = Number(e.target.value); redraw(); showCode() })
$('#vary').addEventListener('click', (e) => {
  state.vary = !state.vary
  e.currentTarget.setAttribute('aria-pressed', String(state.vary))
})

$('#favicon').href = dog('fx-notes', { frame: 4 }).toDataURL()
buildGrid()
filter()
showCode()
window.dog = dog
