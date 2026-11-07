// Character maker: body + hat + held item + off-hand, snapped together by spell.char().
import { spell, looks, sheet, encodeAPNG, Pixmap, zip, MATERIALS, MATERIAL_NAMES, ELEMENTS, ACTION_SIZE, CHAR_SIZE } from '../src/index.js'
import { $, h, paint, thumb, download, copy, toast, encode, decode, readHash, writeHash } from './ui.js'

const REPO = 'olebangpad/pixspell'
const KINDS = [
  { key: 'body', label: 'Body', kind: 'body' },
  { key: 'hat', label: 'Hat', kind: 'head' },
  { key: 'hand', label: 'Hand', kind: 'hand' },
  { key: 'offhand', label: 'Off-hand', kind: 'offhand' },
]
const GRIDS = [8, 16, 32, 64] // tile size of your game: downloads are converted to it (spell.toGrid)
const ACTION_LABELS = { attack: 'Attack', hit: 'Hit', heal: 'Heal', levelup: 'Level up', cast: 'Cast', death: 'Death' }
const ELEMENT_ICONS = { fire: '🔥', ice: '❄', poison: '☠', holy: '✦', dark: '☾' }
const WALK_ARROWS = { down: '↓', up: '↑', left: '←', right: '→', 'down-right': '↘', 'down-left': '↙', 'up-right': '↗', 'up-left': '↖' }
const walkDir = () => (action?.startsWith('walk-') ? action.slice(5) : null)

let spec = { body: 'hero', hat: 'hat-crown', hand: 'held-sword', offhand: 'held-shield' }
let frames = []
let fps = 6
let grid = 32
try { grid = Number(localStorage.getItem('pixspell-grid')) || 32 } catch {}
if (!GRIDS.includes(grid)) grid = 32
const atGrid = (img) => spell.toGrid(img, grid)
let history = []
let seed = null
let action = null // null = idle
let element = null
let preview = [] // what the stage plays: 32 wide, as tall as the character needs
let heightPref = null // the height picked in the Height row; rolls and presets keep it (it only applies to people)

const short = (id, kind) => id && id.replace(kind === 'head' ? /^hat-/ : /^held-/, '')
const anchorsOf = (body) => looks[body].def.anchors
const fits = (kind) => kind === 'body' || !!anchorsOf(spec.body)[kind]

function cleanSpec(s) {
  const out = { body: s.body }
  for (const k of ['hat', 'hand', 'offhand', 'A', 'B', 'C']) if (s[k]) out[k] = s[k]
  if (s.height > 16 && anchorsOf(s.body).hand) out.height = s.height // taller people; animals and monsters keep their size
  if (out.C && SKINS.includes(out.C) && !hasSkin(out.body)) delete out.C // a skin tone means nothing on a slime
  return out
}
// presets use short names ('gat', 'katana'); the pickers use full ids ('hat-gat', 'held-katana')
function fullSpec(s) {
  const out = { ...s }
  for (const [key, prefix] of [['hat', 'hat'], ['hand', 'held'], ['offhand', 'held']]) if (s[key] && !looks[s[key]]) out[key] = `${prefix}-${s[key]}`
  return out
}
const SKINS = spell.char.skins
const hasSkin = (body) => SKINS.includes(looks[body].ramps.C)

function codeFor(s) {
  const opts = []
  if (s.hat) opts.push(`hat: '${short(s.hat, 'head')}'`)
  if (s.hand && anchorsOf(s.body).hand) opts.push(`hand: '${short(s.hand, 'hand')}'`)
  if (s.offhand && anchorsOf(s.body).offhand) opts.push(`offhand: '${short(s.offhand, 'offhand')}'`)
  for (const k of ['A', 'B', 'C']) if (s[k]) opts.push(`${k}: '${s[k]}'`)
  if (s.height) opts.push(`height: ${s.height}`)
  const imp = `import { spell } from 'https://cdn.jsdelivr.net/gh/${REPO}@main/src/index.js'\n\n`
  if (walkDir()) {
    const obj = `{ body: '${s.body}'${opts.length ? ', ' + opts.join(', ') : ''} }`
    return `${imp}const frames = spell.walk(${obj}, '${walkDir()}')\n// ${frames.length} frames, ${frames[0].w}x${frames[0].h}, feet at frames.origin, play at frames.fps (${frames.fps})\ndocument.body.append(frames[1].scale(8).toCanvas())`
  }
  if (action) {
    const obj = `{ body: '${s.body}'${opts.length ? ', ' + opts.join(', ') : ''} }`
    return `${imp}const frames = spell.action(${obj}, '${action}'${element ? `, '${element}'` : ''})\n// ${frames.length} frames, ${frames[0].w}x${frames[0].h}, feet at frames.origin, play at frames.fps (${frames.fps})\ndocument.body.append(frames[2].scale(8).toCanvas())`
  }
  const call = `spell.char('${s.body}'${opts.length ? `, { ${opts.join(', ')} }` : ''})`
  return `${imp}const character = ${call}\ndocument.body.append(character.scale(8).toCanvas())`
}

// ---------------------------------------------------------------- render
function refresh({ pickers = true } = {}) {
  spec = cleanSpec(spec)
  if (walkDir()) {
    frames = spell.walk(spec, walkDir())
    fps = frames.fps
    preview = frames.map((f) => new Pixmap(ACTION_SIZE, ACTION_SIZE + f.h - CHAR_SIZE).draw(f, 4, 8))
  } else if (action) {
    frames = spell.action(spec, action, element ?? undefined)
    fps = frames.fps
    preview = [...frames, ...Array(5).fill(frames[frames.length - 1])] // short pause between loops
  } else {
    frames = spell.char.frames(spec)
    const animated = [spec.body, spec.hat, spec.hand, spec.offhand].filter((id) => id && looks[id] && looks[id].def.frames.length > 1)
    fps = animated.length ? looks[animated[0]].def.fps : 6
    preview = frames.map((f) => new Pixmap(ACTION_SIZE, ACTION_SIZE + f.h - CHAR_SIZE).draw(f, 4, 8))
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
    const ids = spell.char.parts[kind]
    const ok = fits(kind)
    const current = spec[key]
    const strip = h('div', { class: 'strip' },
      kind === 'body' ? null : h('button', {
        class: 'pick none', title: `No ${label.toLowerCase()}`, 'aria-label': `No ${label.toLowerCase()}`,
        'aria-pressed': String(!current), disabled: !ok, onclick: () => { delete spec[key]; seed = null; refresh() },
      }, '✕'),
      ids.map((id) => tile(spell(id, { frame: looks[id].def.cover }), id, current === id, () => { spec[key] = id; seed = null; refresh() }, !ok)),
    )
    const head = h('div', { class: 'picker-head' },
      h('b', {}, label),
      h('span', { class: 'muted' }, ok ? (current ? (kind === 'body' ? current : short(current, kind)) : 'none') : `${spec.body} can't hold items`),
    )
    return h('div', { class: `picker${ok ? '' : ' off'}` }, head, strip)
  }), outfitPicker(), skinPicker(), heightPicker(), actionPicker())
  box.prepend(worldPicker())
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
      MATERIAL_NAMES.filter((m) => !SKINS.includes(m)).map(swatch), custom),
  )
}

// people from around the world: traditional clothing with hats and weapons from the same place
function worldPicker() {
  // a preset swaps the clothes and gear but keeps the height you picked
  const same = (w) => JSON.stringify(cleanSpec({ ...fullSpec(w.spec), height: spec.height })) === JSON.stringify(cleanSpec(spec))
  const strip = h('div', { class: 'strip' }, spell.char.world.map((w) => tile(spell.char(w.spec), `${w.name} (${w.region})`, same(w),
    () => { spec = { ...fullSpec(w.spec), ...(heightPref ? { height: heightPref } : {}) }; seed = null; refresh() })))
  const now = spell.char.world.find(same)
  return h('div', { class: 'picker' },
    h('div', { class: 'picker-head' }, h('b', {}, 'Around the world'), h('span', { class: 'muted' }, now ? `${now.name} · ${now.region}` : `${spell.char.world.length} ready-made`)),
    strip)
}

// how tall people are drawn: 16 is the classic chibi size, up to 32 for long-legged RPG proportions
function heightPicker() {
  const ok = Boolean(anchorsOf(spec.body).hand)
  const now = spec.height ?? 16
  return h('div', { class: `picker${ok ? '' : ' off'}` },
    h('div', { class: 'picker-head' }, h('b', {}, 'Height'), h('span', { class: 'muted' }, ok ? (now === 16 ? '16 px (chibi)' : `${now} px`) : `${spec.body} keeps its size`)),
    h('div', { class: 'seg' }, [16, 20, 24, 28, 32].map((v) => h('button', {
      'aria-pressed': String(now === v), disabled: !ok, title: v === 16 ? 'As drawn (chibi)' : `${v} px tall`,
      onclick: () => { heightPref = v === 16 ? null : v; if (heightPref) spec.height = v; else delete spec.height; seed = null; refresh() },
    }, String(v)))),
  )
}

function skinPicker() {
  const ok = hasSkin(spec.body)
  const swatch = (name) => h('button', {
    class: 'swatch', title: name, 'aria-label': `Skin ${name}`, 'aria-pressed': String(spec.C === name), disabled: !ok,
    style: { '--sw': `linear-gradient(135deg, ${MATERIALS[name][3]} 0 45%, ${MATERIALS[name][2]} 45% 80%, ${MATERIALS[name][1]} 80%)` },
    onclick: () => { spec.C = name; seed = null; refresh() },
  })
  return h('div', { class: `picker${ok ? '' : ' off'}` },
    h('div', { class: 'picker-head' }, h('b', {}, 'Skin'), h('span', { class: 'muted' }, ok ? spec.C ?? 'original' : `${spec.body} has no skin tone`)),
    h('div', { class: 'swatches' },
      h('button', { class: 'pick none small', 'aria-pressed': String(!spec.C), title: 'Original', disabled: !ok, onclick: () => { delete spec.C; seed = null; refresh() } }, '↺'),
      SKINS.map(swatch)),
  )
}

function actionPicker() {
  const btn = (label, pressed, onclick, title) => h('button', { 'aria-pressed': String(pressed), title: title ?? label, onclick }, label)
  return h('div', { class: 'picker' },
    h('div', { class: 'picker-head' }, h('b', {}, 'Action'), h('span', { class: 'muted' }, action ? `${action}${element && !walkDir() ? ' · ' + element : ''}` : 'idle')),
    h('div', { class: 'seg wrap moves' },
      btn('Idle', !action, () => { action = null; refresh() }),
      [...spell.walk.dirs, ...spell.walk.diagonals].map((d) => btn(`Walk ${WALK_ARROWS[d]}`, action === `walk-${d}`, () => { action = `walk-${d}`; refresh() }, `Walk ${d}`))),
    h('div', { class: 'seg wrap actions' },
      spell.action.list.map((a) => btn(ACTION_LABELS[a] ?? a, action === a, () => { action = a; refresh() }))),
    h('div', { class: 'seg wrap elements' + (action && !walkDir() ? '' : ' muted-seg') },
      btn('Default', !element, () => { element = null; if (!action || walkDir()) action = 'attack'; refresh() }, 'Default effect colors'),
      spell.action.elements.map((e) => btn(`${ELEMENT_ICONS[e] ?? ''} ${e}`, element === e, () => { element = e; if (!action || walkDir()) action = 'attack'; refresh() }))),
  )
}

// --------------------------------------------------------------- history
function renderHistory() {
  const box = $('#history')
  box.hidden = !history.length
  $('#history-list').replaceChildren(...history.map((s) =>
    h('button', { class: 'pick', title: dogLabel(s), 'aria-label': dogLabel(s), onclick: () => { spec = { ...s }; seed = null; refresh() } }, thumb(spell.char(s), 40))))
}
const dogLabel = (s) => [s.body, s.hat && short(s.hat, 'head'), s.hand && short(s.hand, 'hand'), s.offhand && short(s.offhand, 'offhand')].filter(Boolean).join(' + ')

function roll(n = 1) {
  const fresh = Array.from({ length: n }, () => {
    seed = Math.floor(Math.random() * 1e6)
    return { ...spell.char.random(seed), ...(heightPref ? { height: heightPref } : {}) }
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
      action = spell.action.list.includes(s.action) || /^walk-(down|up|left|right)$/.test(s.action) ? s.action : null
      element = ELEMENTS[s.element] ? s.element : null
      spec = s
      if (s.height > 16) heightPref = s.height
    }
  } catch { /* ignore broken links */ }

  $('#roll').addEventListener('click', () => roll(1))
  $('#roll-16').addEventListener('click', () => roll(16))
  $('#maker-scale').append(h('span', { class: 'seg-label' }, 'Tile'), ...GRIDS.map((g) => h('button', {
    'aria-pressed': String(g === grid), 'data-s': g, title: `Downloads for a ${g}×${g} px tile grid`,
    onclick: () => { pickGrid(g); dispatchEvent(new CustomEvent('pixspell-grid', { detail: g })) },
  }, `${g}px`)))
  function pickGrid(g) {
    grid = g
    try { localStorage.setItem('pixspell-grid', g) } catch {}
    for (const b of $('#maker-scale').querySelectorAll('button')) b.setAttribute('aria-pressed', String(Number(b.dataset.s) === g))
  }
  addEventListener('pixspell-grid', (e) => { if (e.detail !== grid) pickGrid(e.detail) }) // the download panel picked one
  const name = () => dogLabel(spec).replace(/ \+ /g, '_') + (action ? `_${action}${element && !walkDir() ? '-' + element : ''}` : '')
  $('#mk-png').addEventListener('click', () => download(`${name()}-${grid}px.png`, atGrid(frames[action && !walkDir() ? 2 : 0]).toPNG()))
  $('#mk-anim').addEventListener('click', () => download(`${name()}-${grid}px-anim.png`, encodeAPNG(atGrid(frames), { fps })))
  $('#mk-pack').addEventListener('click', async () => {
    const pack = spell.pack(spec, { element: element ?? undefined, grid })
    // let the browser's PNG encoder compress the sheet (the built-in encoder writes uncompressed PNGs)
    const blob = await new Promise((resolve) => pack.image.toCanvas().toBlob(resolve, 'image/png'))
    const bytes = zip({ ...pack.files, [`${pack.id}.png`]: new Uint8Array(await blob.arrayBuffer()) })
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
    const link = h('a', { href: url, download: `${pack.id}.zip` })
    document.body.append(link); link.click(); link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast(`${pack.id}.zip: ${pack.animations.length} animations, ${grid * 2}px cells, for Phaser, Godot or any engine`)
  })
  $('#mk-strip').addEventListener('click', () => download(`${name()}-${grid}px-strip.png`, sheet(atGrid(frames)).image.toPNG()))
  $('#mk-sheet').addEventListener('click', () => download(`characters-${history.length}-${grid}px.png`, sheet(history.map((s) => atGrid(spell.char(s))), { columns: 8 }).image.toPNG()))
  $('#mk-code-copy').addEventListener('click', () => copy(codeFor(spec), 'Code copied'))
  $('#mk-link').addEventListener('click', () => { writeHash('c', encode({ ...spec, action, element })); copy(location.href, 'Link copied') })
  $('#mk-studio').addEventListener('click', () => {
    const body = looks[spec.body].def
    const layers = [{ id: spec.body, x: 0, y: 0, ramps: Object.fromEntries(['A', 'B', 'C'].filter((k) => spec[k]).map((k) => [k, spec[k]])) }]
    for (const [key, kind] of [['hand', 'hand'], ['offhand', 'offhand'], ['hat', 'head']]) {
      if (!spec[key] || !body.anchors[kind]) continue
      const part = looks[spec[key]].def
      const [ax, ay] = body.anchors[kind][0]
      layers.push({ id: spec[key], x: ax - part.pivot[0], y: ay - part.pivot[1], ramps: {} })
    }
    openInStudio(layers)
    toast('Opened in the studio - every piece is its own layer now')
  })
  $('#maker-count').textContent = `${spell.char.count().toLocaleString('en-US')} gear combinations × any outfit color and skin tone`

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
