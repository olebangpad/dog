// Sounds page: every spell.sfx sound as a card with a pixel waveform. Click to play.
import { spell, zip, MATERIALS, FX_COLORS } from '../src/index.js'
import { $, $$, h, download, copy, toast } from './ui.js'

const KINDS = ['all', 'ui', 'move', 'pickup', 'attack', 'action', 'magic', 'explosion', 'element', 'creature', 'jingle', 'loop']
const KIND_COLOR = { ui: 'ice', move: 'sand', pickup: 'gold', attack: 'orange', action: 'red', magic: 'pink', explosion: 'orange', element: 'purple', jingle: 'lime', loop: 'blue', creature: 'green' }
const ids = spell.sfx.list
const state = { kind: 'all', element: null, pitch: 1, vary: false, last: 'coin' }

$('#sfx-count').textContent = ids.length
$('#sfx-designs').textContent = `${ids.length} sounds × ${spell.sfx.elements.length + 1} element flavors × any pitch · every attack style and action has one · plus ${spell.music.list.length} music tracks`

const kindOf = (id) => KINDS.find((k) => k !== 'all' && spell.sfx.tags(id).includes(k)) ?? 'element'
const opts = (seed = 0) => ({ element: state.element ?? undefined, pitch: state.pitch, seed })
const sound = (id, seed = 0) => spell.sfx(id, opts(seed))

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
        canvas, h('span', {}, id), h('span', { class: 'kind' }, `${kindOf(id)}${spell.sfx(id).loop && kindOf(id) !== 'loop' ? ' · loop' : ''}`)),
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
    const show = state.kind === 'all' || spell.sfx.tags(id).includes(state.kind)
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
  const call = `spell.sfx('${id}'${o.length ? `, { ${o.join(', ')} }` : ''})`
  $('#code').textContent = [
    `import { spell } from 'https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js'`,
    '',
    `${call}.play()${spell.sfx(id).loop ? '          // seamless loop: .play({ loop: true }) / .stop()' : '          // call from a click or key handler the first time'}`,
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
  const name = `pixspell-${state.kind === 'all' ? '' : state.kind + '-'}sounds${state.element ? '-' + state.element : ''}`
  const pack = spell.sfxPack(list, { name, element: state.element ?? undefined, pitch: state.pitch })
  download(`${name}.zip`, zip(pack.files), 'application/zip')
  toast(`${name}.zip: ${list.length} WAV file${list.length > 1 ? 's' : ''}`)
})
$('#copy').addEventListener('click', () => copy($('#code').textContent, 'Code copied'))

// ------------------------------------------------------------ controls
$('#kinds').append(...KINDS.map((k) => h('button', { 'data-kind': k, onclick: () => { state.kind = k; filter() } }, k)))
const swatch = (m) => `linear-gradient(135deg, ${MATERIALS[m][3]} 0 30%, ${MATERIALS[m][2]} 30% 65%, ${MATERIALS[m][1]} 65%)`
$('#elements').append(
  h('button', { 'data-element': '', 'aria-pressed': 'true', onclick: () => setElement(null) }, h('i', { style: { '--sw': '#55665a' } }), 'plain'),
  ...spell.sfx.elements.map((name) => h('button', { 'data-element': name, 'aria-pressed': 'false', onclick: () => setElement(name) }, h('i', { style: { '--sw': swatch(FX_COLORS[name]) } }), name)),
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

// ---------------------------------------------------------------- music
let song = null // { id, handle, card }
function playMusic(id, card) {
  const same = song?.id === id
  if (song) { song.handle.stop(); song.card.classList.remove('playing'); song = null }
  if (same) return
  const s = spell.music(id) // written and rendered the first time, a fraction of a second
  card.classList.add('playing')
  song = { id, handle: s.play(), card }
  if (!s.loop) setTimeout(() => { if (song?.id === id) { card.classList.remove('playing'); song = null } }, s.duration * 1000)
  $('#code').textContent = [
    `import { spell } from 'https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js'`,
    '',
    s.loop ? `const music = spell.music('${id}').play()      // a seamless loop; music.stop() ends it` : `spell.music('${id}').play()                    // a jingle: plays once`,
    `spell.music('${id}', { key: 2, tempo: 1.1 })   // two semitones up, 10% faster`,
    `spell.music('${id}', { seed: 1 })              // the same style, a different melody`,
    `await spell.music('${id}').save('${id}.wav')   // Node`,
  ].join('\n')
}
for (const id of spell.music.list) {
  const info = spell.music.info(id)
  const card = h('div', { class: 'fx-card', 'data-music': id })
  card.append(
    h('button', { class: 'play', title: `Play ${id}`, onclick: () => playMusic(id, card) },
      h('span', { class: 'note-icon', 'aria-hidden': 'true' }, info.loop ? '♫' : '♪'), h('span', {}, id),
      h('span', { class: 'kind' }, info.loop ? `${info.tempo} bpm · loop` : 'jingle')),
    h('button', { class: 'dl', title: `Download ${id}.wav`, 'aria-label': `Download ${id}.wav`, onclick: () => download(`${id}.wav`, spell.music(id).toWAV(), 'audio/wav') }, '⬇'))
  $('#music-grid').append(card)
}

$('#favicon').href = spell('fx-notes', { frame: 4 }).toDataURL()
buildGrid()
filter()
showCode()
window.spell = spell
