// PixSpell studio: browse, combine, recolor and resize sprites, then export.
import {
  spell, looks, sprites, compose, sheet, defineSprite, render, resolveRamp, rampFrom,
  MATERIALS, MATERIAL_NAMES, LEGEND, OUTLINE, encodeAPNG,
} from '../src/index.js'
import { $, $$, h, paint, thumb, download, toast, copy, encode, decode, readHash, writeHash } from './ui.js'
import { initMaker } from './maker.js'

const REPO = 'olebangpad/pixspell'
const CATEGORIES = ['all', 'characters', 'gear', 'items', 'monsters', 'tiles', 'icons', 'effects']
const SCALES = [0.5, 1, 2, 3, 4, 6, 8, 12, 16]
const PRESETS = [
  { name: 'King', layers: [['hero'], ['crown', 0, -7]] },
  { name: 'Knight', layers: [['hero', 0, 0, { A: 'red' }], ['helmet', 0, -6]] },
  { name: 'Mage', layers: [['hero-mage'], ['wizard-hat', 1, -9], ['staff', 7, 2]] },
  { name: 'Wizard dog', layers: [['dog'], ['wizard-hat', 4, -8, { A: 'pink' }]] },
  { name: 'Loot', layers: [['chest-gold'], ['coin', -9, 4], ['gem-sapphire', 10, 5], ['sparkle', 7, -9]] },
  { name: 'Camp', layers: [['grass'], ['grass', 16, 0], ['campfire', 8, -2], ['dog-shiba', -6, -4], ['torch', 22, -6]] },
]

// --------------------------------------------------------------- state
const blankFx = () => ({ hue: 0, sat: 1, light: 0, scale: 8, smooth: false, outline: null, shadow: false, flash: false, flipY: false, rotate: 0 })
const mkLayer = (id, x = 0, y = 0, ramps = {}) => ({ id, x, y, ramps: { ...ramps }, flip: false, hidden: false, custom: null })
let state = { layers: [mkLayer('dog')], active: 0, fx: blankFx(), bg: 'checker' }
const ui = { category: 'all', query: '', variants: true, playing: true, editFrame: 0, t: 0 }

function encodeState() {
  return encode({
    l: state.layers.map((L) => [L.id, L.x, L.y, L.ramps, L.flip ? 1 : 0, L.custom]),
    a: state.active, f: state.fx, b: state.bg,
  })
}
function decodeState(str) {
  const s = decode(str)
  const layers = s.l.filter(([id]) => looks[id]).map(([id, x, y, ramps, flip, custom]) => ({ ...mkLayer(id, x, y, ramps), flip: !!flip, custom: custom ?? null }))
  if (!layers.length) throw new Error('empty')
  return { layers, active: Math.min(s.a ?? 0, layers.length - 1), fx: { ...blankFx(), ...s.f }, bg: s.b ?? 'checker' }
}
function loadFromHash() {
  const s = readHash('s')
  if (s) try { state = decodeState(s) } catch { /* ignore broken links */ }
}

const active = () => state.layers[state.active]

// ------------------------------------------------------- sprite helpers
const defCache = new Map()
function layerDef(L) {
  const base = looks[L.id].def
  if (!L.custom) return base
  const key = L.id + '\n' + L.custom.join('\n--\n')
  if (!defCache.has(key)) {
    try {
      defCache.set(key, defineSprite({ ...base, frames: L.custom.map((f) => f.split('\n')) }))
    } catch {
      defCache.set(key, base)
    }
  }
  return defCache.get(key)
}
const layerRamps = (L) => ({ ...looks[L.id].ramps, ...L.ramps })
const frameAt = (def, t) => def.sequence[Math.floor(t * def.fps) % def.sequence.length]
const isAnimated = () => state.layers.some((L) => !L.hidden && layerDef(L).frames.length > 1)

function renderLayer(L, frame) {
  let img = render(layerDef(L), { ...layerRamps(L), frame })
  if (L.flip) img = img.flipX()
  return img.at(L.x, L.y)
}

function applyFx(img) {
  const f = state.fx
  if (f.hue || f.sat !== 1 || f.light) img = img.adjust({ hue: f.hue, saturation: f.sat, lightness: f.light })
  if (f.flash) img = img.silhouette('#ffffff')
  if (f.flipY) img = img.flipY()
  if (f.rotate) img = img.rotate(f.rotate)
  if (f.outline) img = img.outline(f.outline)
  if (f.shadow) img = img.shadow('#00000066', 1, 1)
  if (f.smooth) img = img.smooth()
  if (f.scale !== 1) img = img.scale(f.scale)
  return img
}

/** The composite at time t (seconds), or at a frame step for export. */
function composite({ t = ui.t, step = null } = {}) {
  const layers = state.layers.filter((L) => !L.hidden)
  if (!layers.length) return applyFx(compose([spell('dog').opacity(0)]))
  return applyFx(compose(layers.map((L) => {
    const def = layerDef(L)
    const frame = step == null ? frameAt(def, t) : def.sequence[step % def.sequence.length]
    return renderLayer(L, frame)
  })))
}

// ---------------------------------------------------------------- stage
const view = $('#view')
const stage = $('#stage')
let lastImg = null
let lastKey = ''

function drawStage(force = false) {
  const key = JSON.stringify(state) + '|' + state.layers.map((L) => frameAt(layerDef(L), ui.t)).join(',')
  if (!force && key === lastKey) return
  lastKey = key
  const img = composite()
  lastImg = img
  paint(view, img)
  const box = stage.getBoundingClientRect()
  const fit = Math.min((box.width - 24) / img.w, (box.height - 24) / img.h)
  const zoom = fit >= 1 ? Math.floor(fit) : fit
  view.style.width = `${img.w * zoom}px`
  view.style.height = `${img.h * zoom}px`
  const frames = Math.max(...state.layers.map((L) => layerDef(L).sequence.length))
  $('#info').textContent = `${img.w}×${img.h}px · ${state.layers.length} layer${state.layers.length > 1 ? 's' : ''}${frames > 1 ? ` · ${frames} frames` : ''}`
}

// drag the active layer around
let drag = null
view.addEventListener('pointerdown', (e) => {
  if (!active()) return
  view.setPointerCapture(e.pointerId)
  view.classList.add('dragging')
  drag = { x: e.clientX, y: e.clientY, lx: active().x, ly: active().y }
})
view.addEventListener('pointermove', (e) => {
  if (!drag || !lastImg) return
  const f = state.fx
  const unit = (view.clientWidth / lastImg.w) * f.scale * (f.smooth ? 2 : 1)
  const nx = drag.lx + Math.round((e.clientX - drag.x) / unit)
  const ny = drag.ly + Math.round((e.clientY - drag.y) / unit)
  if (nx !== active().x || ny !== active().y) {
    active().x = nx; active().y = ny
    // keep the dragged layer under the cursor even as the canvas grows
    drawStage(); renderLayers(); renderCode()
  }
})
const endDrag = () => { drag = null; view.classList.remove('dragging'); saveHash() }
view.addEventListener('pointerup', endDrag)
view.addEventListener('pointercancel', endDrag)

document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, select')) return
  const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
  if (!d || !active()) return
  e.preventDefault()
  active().x += d[0]; active().y += d[1]
  update({ gallery: false, colors: false })
})

$$('.stage-bar [data-bg]').forEach((b) => b.addEventListener('click', () => { state.bg = b.dataset.bg; update({ gallery: false }) }))
$('#play').addEventListener('click', () => {
  ui.playing = !ui.playing
  $('#play').textContent = ui.playing ? '❚❚' : '▶'
})

// --------------------------------------------------------------- layers
function renderLayers() {
  const list = $('#layers')
  list.replaceChildren(...state.layers.map((L, i) => {
    const def = layerDef(L)
    const btn = (label, title, fn) => h('button', { title, 'aria-label': title, onclick: (e) => { e.stopPropagation(); fn() } }, label)
    return h('li', {
      class: `layer${i === state.active ? ' active' : ''}${L.hidden ? ' hidden-layer' : ''}`,
      onclick: () => { state.active = i; ui.editFrame = 0; update() },
    },
      thumb(renderLayer(L, def.cover)),
      h('div', {}, h('div', { class: 'name' }, L.id + (L.custom ? ' (edited)' : '')), h('div', { class: 'pos' }, `x ${L.x}  y ${L.y}`)),
      h('div', { class: 'acts' },
        btn('⇆', 'Mirror layer', () => { L.flip = !L.flip; update() }),
        btn(L.hidden ? '◌' : '●', L.hidden ? 'Show layer' : 'Hide layer', () => { L.hidden = !L.hidden; update() }),
        btn('▲', 'Move layer up (draw later)', () => moveLayer(i, 1)),
        btn('▼', 'Move layer down (draw earlier)', () => moveLayer(i, -1)),
        state.layers.length > 1 ? btn('✕', 'Remove layer', () => removeLayer(i)) : null,
      ),
    )
  }).reverse())
}
function moveLayer(i, dir) {
  const j = i + dir
  if (j < 0 || j >= state.layers.length) return
  const ls = state.layers
  ;[ls[i], ls[j]] = [ls[j], ls[i]]
  if (state.active === i) state.active = j
  else if (state.active === j) state.active = i
  update()
}
function removeLayer(i) {
  state.layers.splice(i, 1)
  state.active = Math.min(state.active, state.layers.length - 1)
  update()
}
$('#add-layer').addEventListener('click', () => {
  state.layers.push(mkLayer('crown', 0, -7))
  state.active = state.layers.length - 1
  update()
  toast('Layer added - now pick a sprite in the gallery')
})

function renderPresets() {
  $('#presets').replaceChildren(...PRESETS.map((p) => {
    const layers = p.layers.map(([id, x = 0, y = 0, ramps = {}]) => mkLayer(id, x, y, ramps))
    const img = compose(layers.map((L) => renderLayer(L, layerDef(L).cover)))
    return h('button', {
      title: `Load "${p.name}"`,
      onclick: () => {
        state.layers = layers.map((L) => ({ ...L, ramps: { ...L.ramps } }))
        state.active = 0
        update()
      },
    }, thumb(img, 24), p.name)
  }))
}

// --------------------------------------------------------------- colors
function rampBox(ramp) {
  return h('span', { class: 'ramp-preview' }, ramp.map((c) => h('i', { style: { background: c } })))
}
function renderSlots() {
  const L = active()
  const def = layerDef(L)
  const ramps = layerRamps(L)
  const box = $('#slots')
  if (!def.slots.length) {
    box.replaceChildren(h('p', { class: 'hint' }, 'This sprite only uses outline and white pixels.'))
    return
  }
  box.replaceChildren(...def.slots.map((slot) => {
    const current = ramps[slot]
    const set = (v) => { L.ramps[slot] = v; update({ gallery: false }) }
    const custom = h('input', { type: 'color', title: 'Any color: 4 shades are generated from it', value: /^#/.test(current) ? current.slice(0, 7) : resolveRamp(current)[2].slice(0, 7) })
    custom.addEventListener('input', () => set(custom.value))
    return h('div', { class: 'slot' },
      h('div', { class: 'slot-head' }, h('b', {}, slot), rampBox(resolveRamp(current)), h('span', {}, /^#/.test(current) ? current : current)),
      h('div', { class: 'swatches' },
        MATERIAL_NAMES.map((m) => h('button', {
          class: 'swatch', title: m, 'aria-label': `${slot}: ${m}`, 'aria-pressed': String(current === m),
          style: { '--sw': `linear-gradient(135deg, ${MATERIALS[m][3]} 0 30%, ${MATERIALS[m][2]} 30% 65%, ${MATERIALS[m][1]} 65%)` },
          onclick: () => set(m),
        })),
        custom,
      ),
    )
  }))
}

const sliders = [['hue', 'hue', (v) => `${v}°`], ['sat', 'sat', (v) => `${Math.round(v * 100)}%`], ['light', 'light', (v) => (v > 0 ? '+' : '') + v]]
for (const [el, key, fmt] of sliders) {
  const input = $('#' + el)
  input.addEventListener('input', () => {
    state.fx[key] = Number(input.value)
    input.nextElementSibling.textContent = fmt(state.fx[key])
    update({ gallery: false, colors: false, layers: false })
  })
}
function syncControls() {
  const f = state.fx
  for (const [el, key, fmt] of sliders) {
    $('#' + el).value = f[key]
    $('#' + el).nextElementSibling.textContent = fmt(f[key])
  }
  $$('#scales button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.scale) === f.scale)))
  $$('#rotations button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.rot) === f.rotate)))
  $$('.stage-bar [data-bg]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.bg === state.bg)))
  stage.dataset.bg = state.bg
  $('#smooth').checked = f.smooth
  $('#outline').checked = !!f.outline
  if (f.outline) $('#outline-color').value = f.outline
  $('#shadow').checked = f.shadow
  $('#flash').checked = f.flash
  $('#flipy').checked = f.flipY
  const anim = isAnimated()
  $('#dl-anim').disabled = !anim
  $('#dl-strip').disabled = !anim
}

// ---------------------------------------------------------- size & fx
$('#scales').append(...SCALES.map((s) => h('button', { 'data-scale': s, onclick: () => { state.fx.scale = s; update({ gallery: false, colors: false, layers: false }) } }, s === 0.5 ? '½' : `${s}x`)))
$$('#rotations button').forEach((b) => b.addEventListener('click', () => { state.fx.rotate = Number(b.dataset.rot); update({ gallery: false, colors: false, layers: false }) }))
const fxToggle = (id, fn) => $(id).addEventListener('change', (e) => { fn(e.target.checked); update({ gallery: false, colors: false, layers: false }) })
fxToggle('#smooth', (v) => (state.fx.smooth = v))
fxToggle('#outline', (v) => (state.fx.outline = v ? $('#outline-color').value : null))
fxToggle('#shadow', (v) => (state.fx.shadow = v))
fxToggle('#flash', (v) => (state.fx.flash = v))
fxToggle('#flipy', (v) => (state.fx.flipY = v))
$('#outline-color').addEventListener('input', (e) => {
  state.fx.outline = e.target.value
  update({ gallery: false, colors: false, layers: false })
})

// --------------------------------------------------------------- export
const baseName = () => state.layers.map((L) => L.id).join('+').slice(0, 60)
function animFrames() {
  const visible = state.layers.filter((L) => !L.hidden)
  const n = Math.max(...visible.map((L) => layerDef(L).sequence.length))
  const fps = Math.max(...visible.map((L) => (layerDef(L).frames.length > 1 ? layerDef(L).fps : 0)), 1)
  return { frames: Array.from({ length: n }, (_, step) => composite({ step })), fps }
}
$('#dl-png').addEventListener('click', () => download(`${baseName()}.png`, (lastImg ?? composite()).toPNG()))
$('#dl-anim').addEventListener('click', () => {
  const { frames, fps } = animFrames()
  download(`${baseName()}-anim.png`, encodeAPNG(frames, { fps }))
})
$('#dl-strip').addEventListener('click', () => {
  const { frames } = animFrames()
  download(`${baseName()}-strip.png`, sheet(frames).image.toPNG())
})
$('#copy-link').addEventListener('click', () => {
  saveHash()
  copy(location.href, 'Link copied')
})

function fmtRamps(r) {
  const entries = Object.entries(r)
  return entries.length ? `, { ${entries.map(([k, v]) => `${k}: '${v}'`).join(', ')} }` : ''
}
function codeSnippet() {
  const layers = state.layers.filter((L) => !L.hidden)
  const calls = layers.map((L) => {
    let s = `spell('${L.id}'${fmtRamps(L.ramps)})`
    if (L.flip) s += '.flipX()'
    if (L.x || L.y) s += `.at(${L.x}, ${L.y})`
    return s
  })
  const f = state.fx
  const chain = []
  if (f.hue || f.sat !== 1 || f.light) {
    const parts = []
    if (f.hue) parts.push(`hue: ${f.hue}`)
    if (f.sat !== 1) parts.push(`saturation: ${f.sat}`)
    if (f.light) parts.push(`lightness: ${f.light}`)
    chain.push(`.adjust({ ${parts.join(', ')} })`)
  }
  if (f.flash) chain.push(`.silhouette('#ffffff')`)
  if (f.flipY) chain.push('.flipY()')
  if (f.rotate) chain.push(`.rotate(${f.rotate})`)
  if (f.outline) chain.push(`.outline('${f.outline}')`)
  if (f.shadow) chain.push('.shadow()')
  if (f.smooth) chain.push('.smooth()')
  if (f.scale !== 1) chain.push(`.scale(${f.scale})`)
  const many = calls.length > 1
  const imports = many ? '{ spell, compose }' : '{ spell }'
  const body = many ? `compose(\n  ${calls.join(',\n  ')},\n)` : calls[0] ?? `spell('dog')`
  const edited = layers.some((L) => L.custom) ? '\n// note: edited pixels are not included - copy them from "Edit pixels"' : ''
  return `import ${imports} from 'https://cdn.jsdelivr.net/gh/${REPO}@main/src/index.js'\n\nconst img = ${body}${chain.length ? '\n  ' + chain.join('\n  ') : ''}\n\ndocument.body.append(img.toCanvas())${edited}`
}
function renderCode() { $('#code').textContent = codeSnippet() }
$('#copy-code').addEventListener('click', () => copy(codeSnippet(), 'Code copied'))

// -------------------------------------------------------- pixel editor
const art = $('#art')
function frameText(def, i) { return def.frames[i].join('\n') }
function renderEditor() {
  const L = active()
  const def = layerDef(L)
  ui.editFrame = Math.min(ui.editFrame, def.frames.length - 1)
  if (document.activeElement !== art) art.value = frameText(def, ui.editFrame)
  art.rows = def.h + 1
  const pick = $('#frame-pick')
  pick.replaceChildren(...(def.frames.length > 1
    ? [h('span', { class: 'hint' }, 'Frame'), h('div', { class: 'seg' }, def.frames.map((_, i) => h('button', {
        'aria-pressed': String(i === ui.editFrame), onclick: () => { ui.editFrame = i; art.value = frameText(def, i); renderEditor() },
      }, String(i + 1))))]
    : []))
  const ramps = layerRamps(L)
  const swatch = (ch) => {
    if (ch === '#') return OUTLINE
    if (ch === 'w') return '#ffffff'
    const [slot, shade] = LEGEND[ch]
    return resolveRamp(ramps[slot])[shade]
  }
  const used = new Set(def.frames.flat().join(''))
  $('#legend').replaceChildren(
    h('span', {}, h('i', { style: { background: 'transparent', borderStyle: 'dashed' } }), '.'),
    ...['#', 'w', ...Object.keys(LEGEND)].filter((ch) => used.has(ch) || '#w1234'.includes(ch)).map((ch) => h('span', {}, h('i', { style: { background: swatch(ch) } }), ch)),
  )
}
art.addEventListener('input', () => {
  const L = active()
  const base = layerDef({ ...L, custom: null })
  const frames = (L.custom ?? base.frames.map((f) => f.join('\n'))).slice()
  frames[ui.editFrame] = art.value.split('\n').map((r) => r.replace(/\s+/g, '')).filter(Boolean).join('\n')
  try {
    defineSprite({ ...base, frames: frames.map((f) => f.split('\n')) })
    $('#art-error').textContent = ''
    L.custom = frames
    update({ gallery: false, editor: false })
  } catch (e) {
    $('#art-error').textContent = e.message.replace(/^pixspell: /, '')
  }
})
$('#art-reset').addEventListener('click', () => {
  active().custom = null
  $('#art-error').textContent = ''
  art.value = ''
  art.blur()
  update({ gallery: false })
})
$('#copy-def').addEventListener('click', () => {
  const L = active()
  const def = layerDef(L)
  const ramps = layerRamps(L)
  const art = (rows, ind) => '`\n' + rows.map((r) => ind + r).join('\n') + '\n' + ind.slice(2) + '`'
  const lines = [
    '{',
    `  id: '${L.custom ? L.id + '-remix' : L.id}',`,
    `  tags: ${JSON.stringify(def.tags)},`,
    `  ramps: { ${def.slots.map((s) => `${s}: '${ramps[s]}'`).join(', ')} },`,
    def.frames.length > 1 ? `  fps: ${def.fps},` : null,
    def.frames.length > 1
      ? `  frames: [\n${def.frames.map((f) => '    ' + art(f, '      ')).join(',\n')},\n  ],`
      : `  art: ${art(def.frames[0], '    ')},`,
    '},',
  ].filter(Boolean)
  copy(lines.join('\n'), 'Definition copied - paste it into src/sprites/*.js')
})

// --------------------------------------------------------------- gallery
const tiles = new Map()
// Thumbnails are painted only when they scroll into view (hundreds of them otherwise delay the page).
const tileByEl = new WeakMap()
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const t = tileByEl.get(e.target)
    if (!t) continue
    t.visible = e.isIntersecting
    if (t.visible && !t.painted) {
      t.painted = true
      paint(t.canvas, spell(t.look.id, { frame: t.look.def.cover }))
    }
  }
}, { rootMargin: '200px' })
function buildGallery() {
  const grid = $('#grid')
  for (const look of Object.values(looks)) {
    const { def, id } = look
    const c = h('canvas', { width: def.w, height: def.h, 'aria-hidden': 'true' })
    const tile = h('button', {
      class: 'tile', title: `${id}${def.tags.length ? ' · ' + def.tags.join(', ') : ''}`, 'aria-label': id,
      onclick: (e) => pick(id, e.shiftKey),
    }, c, h('span', {}, id), def.animated ? h('i', { class: 'anim' }, '▶') : null)
    const entry = { tile, canvas: c, look, visible: false, painted: false }
    tiles.set(id, entry)
    tileByEl.set(tile, entry)
    seen.observe(tile)
    grid.append(tile)
  }
  $('#chips').append(...CATEGORIES.map((cat) => h('button', {
    'data-cat': cat, onclick: () => { ui.category = cat; filterGallery() },
  }, cat)))
  $('#search').addEventListener('input', (e) => { ui.query = e.target.value.trim().toLowerCase(); filterGallery() })
  $('#show-variants').addEventListener('change', (e) => { ui.variants = e.target.checked; filterGallery() })
  filterGallery()
}
function filterGallery() {
  let n = 0
  for (const [id, { tile, look }] of tiles) {
    const { def } = look
    const show = (ui.category === 'all' || def.category === ui.category) &&
      (ui.variants || !look.variant) &&
      (!ui.query || id.includes(ui.query) || def.name.includes(ui.query) || def.tags.some((t) => t.includes(ui.query)) || def.category.includes(ui.query))
    tile.hidden = !show
    if (show) n++
  }
  $$('#chips button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === ui.category)))
  $('#count').textContent = `${n} sprite${n === 1 ? '' : 's'} · click to use · shift-click to add as a new layer`
}
function markSelected() {
  const ids = new Set(state.layers.map((L) => L.id))
  for (const [id, { tile }] of tiles) tile.classList.toggle('selected', ids.has(id))
}
function pick(id, asNewLayer) {
  if (asNewLayer) {
    state.layers.push(mkLayer(id))
    state.active = state.layers.length - 1
  } else {
    const L = active()
    L.id = id; L.ramps = {}; L.custom = null
  }
  ui.editFrame = 0
  update()
  if (matchMedia('(max-width: 860px)').matches) window.scrollTo({ top: 0, behavior: 'smooth' })
}

// ----------------------------------------------------------------- misc
let hashTimer
function saveHash() {
  clearTimeout(hashTimer)
  hashTimer = setTimeout(() => writeHash('s', encodeState()), 250)
}

function update({ gallery = true, colors = true, layers = true, editor = true } = {}) {
  if (layers) renderLayers()
  if (colors) renderSlots()
  if (gallery) markSelected()
  if (editor) renderEditor()
  syncControls()
  renderCode()
  drawStage(true)
  saveHash()
}

// mascot + favicon + background tile + stats
function decorate() {
  // the mascot casts a spell, the favicon is its hat
  const frames = spell.action({ body: 'hero', hat: 'wizard', hand: 'staff' }, 'cast', 'holy')
  const mascot = $('#mascot')
  let i = 0
  setInterval(() => { paint(mascot, frames[i++ % frames.length]) }, 1000 / frames.fps)
  paint(mascot, frames[0])
  $('#favicon').href = spell('hat-wizard').toDataURL()
  const style = document.createElement('style')
  style.textContent = `.stage[data-bg='grass'] { background-image: url(${spell('grass').scale(4).toDataURL()}); }`
  document.head.append(style)
  const base = Object.keys(sprites).length, all = Object.keys(looks).length
  $('#stats').textContent = `${base} sprites · ${all} looks · ${spell.char.count().toLocaleString('en-US')} characters · CC0`
}

// animation loop: stage + animated gallery tiles
const animatedTiles = () => [...tiles.values()].filter(({ look, tile, visible }) => visible && look.def.animated && !tile.hidden)
let lastTileFrame = -1
let prev = performance.now()
function loop(now) {
  const dt = Math.max(0, (now - prev) / 1000)
  prev = now
  if (ui.playing) ui.t += dt
  drawStage()
  const tick = Math.floor(now / 125)
  if (tick !== lastTileFrame) {
    lastTileFrame = tick
    for (const { canvas, look } of animatedTiles()) {
      const frame = frameAt(look.def, now / 1000)
      if (canvas.dataset.f !== String(frame)) {
        canvas.dataset.f = frame
        paint(canvas, spell(look.id, { frame }))
      }
    }
  }
  requestAnimationFrame(loop)
}

loadFromHash()
// on phones, keep only "Combine" open so the gallery is one short scroll away
if (matchMedia('(max-width: 860px)').matches) $$('.panel').slice(1).forEach((p) => { p.open = false })
decorate()
buildGallery()
renderPresets()
update()
initMaker({
  openInStudio(layers) {
    state.layers = layers.map((L) => mkLayer(L.id, L.x, L.y, L.ramps))
    state.active = 0
    update()
    $('.layout').scrollIntoView({ behavior: 'smooth' })
  },
})
addEventListener('resize', () => drawStage(true))
requestAnimationFrame(loop)

// expose for tinkering in the console
Object.assign(window, { spell, compose, looks })
console.log('%cDOG', 'font: bold 20px monospace; color: #a8e05a', "- try: spell('slime', { A: '#ff00aa' }).scale(8).toCanvas()")
