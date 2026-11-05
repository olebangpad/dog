// Character maker: body + hat + held item + off-hand, snapped together by dog.char().
import { dog, looks, sheet, encodeAPNG, Pixmap, MATERIALS, MATERIAL_NAMES, ELEMENTS, ACTION_SIZE, CHAR_SIZE } from '../src/index.js'
import { $, h, paint, thumb, download, copy, toast, encode, decode, readHash, writeHash } from './ui.js'

const REPO = 'olebangpad/dog'
const KINDS = [
  { key: 'body', label: 'Body', kind: 'body' },
  { key: 'hat', label: 'Hat', kind: 'head' },
  { key: 'hand', label: 'Hand', kind: 'hand' },
  { key: 'offhand', label: 'Off-hand', kind: 'offhand' },
]
const SCALES = [1, 4, 8]
const ACTION_LABELS = { attack: 'Attack', hit: 'Hit', heal: 'Heal', levelup: 'Level up', cast: 'Cast', death: 'Death' }
const ELEMENT_ICONS = { fire: '🔥', ice: '❄', poison: '☠', holy: '✦', dark: '☾' }
const WALK_ARROWS = { down: '↓', up: '↑', left: '←', right: '→' }
const walkDir = () => (action?.startsWith('walk-') ? action.slice(5) : null)

let spec = { body: 'hero', hat: 'hat-crown', hand: 'held-sword', offhand: 'held-shield' }
let frames = []
let fps = 6
let scale = 4
let history = []
let seed = null
let action = null // null = idle
let element = null
let preview = [] // what the stage plays: always 32x32 so the character never jumps in size

const short = (id, kind) => id && id.replace(kind === 'head' ? /^hat-/ : /^held-/, '')
const anchorsOf = (body) => looks[body].def.anchors
const fits = (kind) => kind === 'body' || !!anchorsOf(spec.body)[kind]

function cleanSpec(s) {
  const out = { body: s.body }
  for (const k of ['hat', 'hand', 'offhand', 'A']) if (s[k]) out[k] = s[k]
  return out
}

function codeFor(s) {
  const opts = []
  if (s.hat) opts.push(`hat: '${short(s.hat, 'head')}'`)
  if (s.hand && anchorsOf(s.body).hand) opts.push(`hand: '${short(s.hand, 'hand')}'`)
  if (s.offhand && anchorsOf(s.body).offhand) opts.push(`offhand: '${short(s.offhand, 'offhand')}'`)
  if (s.A) opts.push(`A: '${s.A}'`)
  const imp = `import { dog } from 'https://cdn.jsdelivr.net/gh/${REPO}@main/src/index.js'\n\n`
  if (walkDir()) {
    const obj = `{ body: '${s.body}'${opts.length ? ', ' + opts.join(', ') : ''} }`
    return `${imp}const frames = dog.walk(${obj}, '${walkDir()}')\n// ${frames.length} frames, ${CHAR_SIZE}x${CHAR_SIZE}, play at frames.fps (${frames.fps})\ndocument.body.append(frames[1].scale(8).toCanvas())`
  }
  if (action) {
    const obj = `{ body: '${s.body}'${opts.length ? ', ' + opts.join(', ') : ''} }`
    return `${imp}const frames = dog.action(${obj}, '${action}'${element ? `, '${element}'` : ''})\n// ${frames.length} frames, ${ACTION_SIZE}x${ACTION_SIZE}, play at frames.fps (${frames.fps})\ndocument.body.append(frames[2].scale(8).toCanvas())`
  }
  const call = `dog.char('${s.body}'${opts.length ? `, { ${opts.join(', ')} }` : ''})`
  return `${imp}const character = ${call}\ndocument.body.append(character.scale(8).toCanvas())`
}

// ---------------------------------------------------------------- render
function refresh({ pickers = true } = {}) {
  spec = cleanSpec(spec)
  if (walkDir()) {
    frames = dog.walk(spec, walkDir())
    fps = frames.fps
    preview = frames.map((f) => new Pixmap(ACTION_SIZE, ACTION_SIZE).draw(f, 4, 8))
  } else if (action) {
    frames = dog.action(spec, action, element ?? undefined)
    fps = frames.fps
    preview = [...frames, ...Array(5).fill(frames[frames.length - 1])] // short pause between loops
  } else {
    frames = dog.char.frames(spec)
    const animated = [spec.body, spec.hat, spec.hand, spec.offhand].filter((id) => id && looks[id] && looks[id].def.frames.length > 1)
    fps = animated.length ? looks[animated[0]].def.fps : 6
    preview = frames.map((f) => new Pixmap(ACTION_SIZE, ACTION_SIZE).draw(f, 4, 8))
  }
  $('#maker-view').dataset.f = '0'
  paint($('#maker-view'), preview[0])
  $('#mk-code').textContent = codeFor(spec)
  $('#mk-anim').disabled = frames.length < 2
  $('#mk-strip').disabled = frames.length < 2
  $('#maker-seed').textContent = seed == null ? '' : `seed ${seed}`
  if (pickers) renderPickers()
  writeHash('c', encode({ ...spec, action, element }))
  $('#mk-play').href = `game.html#c=${encode(spec)}`
}

function tile(img, label, selected, onclick, disabled = false) {
  return h('button', { class: 'pick', title: label, 'aria-label': label, 'aria-pressed': String(selected), disabled, onclick }, thumb(img, 32))
}

function renderPickers() {
  const box = $('#pickers')
  box.replaceChildren(...KINDS.map(({ key, label, kind }) => {
    const ids = dog.char.parts[kind]
    const ok = fits(kind)
    const current = spec[key]
    const strip = h('div', { class: 'strip' },
      kind === 'body' ? null : h('button', {
        class: 'pick none', title: `No ${label.toLowerCase()}`, 'aria-label': `No ${label.toLowerCase()}`,
        'aria-pressed': String(!current), disabled: !ok, onclick: () => { delete spec[key]; seed = null; refresh() },
      }, '✕'),
      ids.map((id) => tile(dog(id, { frame: looks[id].def.cover }), id, current === id, () => { spec[key] = id; seed = null; refresh() }, !ok)),
    )
    const head = h('div', { class: 'picker-head' },
      h('b', {}, label),
      h('span', { class: 'muted' }, ok ? (current ? (kind === 'body' ? current : short(current, kind)) : 'none') : `${spec.body} can't hold items`),
    )
    return h('div', { class: `picker${ok ? '' : ' off'}` }, head, strip)
  }), outfitPicker(), actionPicker())
  // keep the selected thumbnail in view by scrolling its strip sideways only (never the page)
  requestAnimationFrame(() => box.querySelectorAll('.strip').forEach((strip) => {
    const sel = strip.querySelector('.pick[aria-pressed="true"]')
    if (!sel) return
    const left = sel.getBoundingClientRect().left - strip.getBoundingClientRect().left + strip.scrollLeft
    strip.scrollLeft = left - strip.clientWidth / 2 + sel.offsetWidth / 2
  }))
}

function outfitPicker() {
  const swatch = (name) => h('button', {
    class: 'swatch', title: name, 'aria-label': `Outfit ${name}`, 'aria-pressed': String(spec.A === name),
    style: { '--sw': `linear-gradient(135deg, ${MATERIALS[name][3]} 0 30%, ${MATERIALS[name][2]} 30% 65%, ${MATERIALS[name][1]} 65%)` },
    onclick: () => { spec.A = name; seed = null; refresh() },
  })
  const custom = h('input', { type: 'color', title: 'Any color', 'aria-label': 'Custom outfit color', value: /^#/.test(spec.A ?? '') ? spec.A : '#ff4fd8' })
  custom.addEventListener('input', () => { spec.A = custom.value; seed = null; refresh() })
  return h('div', { class: 'picker' },
    h('div', { class: 'picker-head' }, h('b', {}, 'Outfit'), h('span', { class: 'muted' }, spec.A ?? 'original')),
    h('div', { class: 'swatches' },
      h('button', { class: 'pick none small', 'aria-pressed': String(!spec.A), title: 'Original colors', onclick: () => { delete spec.A; seed = null; refresh() } }, '↺'),
      MATERIAL_NAMES.map(swatch), custom),
  )
}

function actionPicker() {
  const btn = (label, pressed, onclick, title) => h('button', { 'aria-pressed': String(pressed), title: title ?? label, onclick }, label)
  return h('div', { class: 'picker' },
    h('div', { class: 'picker-head' }, h('b', {}, 'Action'), h('span', { class: 'muted' }, action ? `${action}${element && !walkDir() ? ' · ' + element : ''}` : 'idle')),
    h('div', { class: 'seg wrap moves' },
      btn('Idle', !action, () => { action = null; refresh() }),
      dog.walk.dirs.map((d) => btn(`Walk ${WALK_ARROWS[d]}`, action === `walk-${d}`, () => { action = `walk-${d}`; refresh() }, `Walk ${d}`))),
    h('div', { class: 'seg wrap actions' },
      dog.action.list.map((a) => btn(ACTION_LABELS[a] ?? a, action === a, () => { action = a; refresh() }))),
    h('div', { class: 'seg wrap elements' + (action && !walkDir() ? '' : ' muted-seg') },
      btn('Default', !element, () => { element = null; if (!action || walkDir()) action = 'attack'; refresh() }, 'Default effect colors'),
      dog.action.elements.map((e) => btn(`${ELEMENT_ICONS[e] ?? ''} ${e}`, element === e, () => { element = e; if (!action || walkDir()) action = 'attack'; refresh() }))),
  )
}

// --------------------------------------------------------------- history
function renderHistory() {
  const box = $('#history')
  box.hidden = !history.length
  $('#history-list').replaceChildren(...history.map((s) =>
    h('button', { class: 'pick', title: dogLabel(s), 'aria-label': dogLabel(s), onclick: () => { spec = { ...s }; seed = null; refresh() } }, thumb(dog.char(s), 40))))
}
const dogLabel = (s) => [s.body, s.hat && short(s.hat, 'head'), s.hand && short(s.hand, 'hand'), s.offhand && short(s.offhand, 'offhand')].filter(Boolean).join(' + ')

function roll(n = 1) {
  const fresh = Array.from({ length: n }, () => {
    seed = Math.floor(Math.random() * 1e6)
    return dog.char.random(seed)
  })
  spec = { ...fresh[fresh.length - 1] }
  history = [...fresh.reverse(), ...history].slice(0, 32)
  if (n > 1) seed = null
  refresh()
  renderHistory()
}

// ----------------------------------------------------------------- init
export function initMaker({ openInStudio }) {
  const fromLink = readHash('c')
  if (fromLink) try {
    const s = decode(fromLink)
    if (looks[s.body]) {
      action = dog.action.list.includes(s.action) || /^walk-(down|up|left|right)$/.test(s.action) ? s.action : null
      element = ELEMENTS[s.element] ? s.element : null
      spec = s
    }
  } catch { /* ignore broken links */ }

  $('#roll').addEventListener('click', () => roll(1))
  $('#roll-16').addEventListener('click', () => roll(16))
  $('#maker-scale').append(...SCALES.map((s) => h('button', {
    'aria-pressed': String(s === scale), 'data-s': s,
    onclick: (e) => {
      scale = s
      for (const b of $('#maker-scale').children) b.setAttribute('aria-pressed', String(Number(b.dataset.s) === s))
    },
  }, `${s}x`)))
  const name = () => dogLabel(spec).replace(/ \+ /g, '_') + (action ? `_${action}${element && !walkDir() ? '-' + element : ''}` : '')
  $('#mk-png').addEventListener('click', () => download(`${name()}.png`, frames[action && !walkDir() ? 2 : 0].scale(scale).toPNG()))
  $('#mk-anim').addEventListener('click', () => download(`${name()}-anim.png`, encodeAPNG(frames.map((f) => f.scale(scale)), { fps })))
  $('#mk-strip').addEventListener('click', () => download(`${name()}-strip.png`, sheet(frames).image.scale(scale).toPNG()))
  $('#mk-sheet').addEventListener('click', () => download(`characters-${history.length}.png`, sheet(history.map((s) => dog.char(s)), { columns: 8 }).image.scale(scale).toPNG()))
  $('#mk-code-copy').addEventListener('click', () => copy(codeFor(spec), 'Code copied'))
  $('#mk-link').addEventListener('click', () => { writeHash('c', encode({ ...spec, action, element })); copy(location.href, 'Link copied') })
  $('#mk-studio').addEventListener('click', () => {
    const body = looks[spec.body].def
    const layers = [{ id: spec.body, x: 0, y: 0, ramps: spec.A ? { A: spec.A } : {} }]
    for (const [key, kind] of [['hand', 'hand'], ['offhand', 'offhand'], ['hat', 'head']]) {
      if (!spec[key] || !body.anchors[kind]) continue
      const part = looks[spec[key]].def
      const [ax, ay] = body.anchors[kind][0]
      layers.push({ id: spec[key], x: ax - part.pivot[0], y: ay - part.pivot[1], ramps: {} })
    }
    openInStudio(layers)
    toast('Opened in the studio - every piece is its own layer now')
  })
  $('#maker-count').textContent = `${dog.char.count().toLocaleString('en-US')} gear combinations × any outfit color`

  refresh()
  renderHistory()
  let start = performance.now()
  const loop = (now) => {
    if (preview.length > 1) {
      // rAF timestamps can be a little earlier than `start`, so never let the index go negative
      const i = Math.floor((Math.max(0, now - start) / 1000) * fps) % preview.length
      const view = $('#maker-view')
      if (view.dataset.f !== String(i)) { view.dataset.f = i; paint(view, preview[i]) }
    }
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}
