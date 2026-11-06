// Effects gallery: every procedural effect animating at once, recolor, preview, download.
import { dog, looks, sheet, encodeAPNG, zip, MATERIALS, FX_COLORS } from '../src/index.js'
import { $, $$, h, download, copy, toast } from './ui.js'

const KINDS = ['all', 'burst', 'magic', 'element', 'projectile', 'beam', 'weather', 'environment', 'status', 'combat', 'reward', 'spectacle', 'loop']
const ids = dog.fx.list
const state = { kind: 'all', color: null, bg: 'dark' }

// how many effects people can actually pick: every fx look plus the hand-drawn effects and their variants
const effectLooks = Object.values(looks).filter((l) => l.def.category === 'effects')
const designs = effectLooks.filter((l) => !l.variant).length
$('#fx-count').textContent = effectLooks.length
$('#fx-designs').textContent = `${designs} designs × up to ${Object.keys(FX_COLORS).length + 1} colors`

// ------------------------------------------------------------- rendering
const toCanvas = (img) => img.toCanvas(document.createElement('canvas'))
const rendered = new Map()
function framesFor(id, color = state.color, size) {
  const key = `${id}|${color}|${size}`
  if (!rendered.has(key)) {
    const frames = dog.fx(id, { element: color ?? undefined, size })
    rendered.set(key, { frames, imgs: frames.map(toCanvas), fps: frames.fps, loop: frames.loop })
  }
  return rendered.get(key)
}

const cards = new Map()
const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    const c = cards.get(e.target.dataset.id)
    if (c) c.visible = e.isIntersecting
  }
}, { rootMargin: '150px' })

function buildGrid() {
  const grid = $('#fx-grid')
  for (const id of ids) {
    const def = looks[id].def
    const canvas = h('canvas', { width: 32, height: 32, 'aria-hidden': 'true' })
    const kind = def.tags.includes('spectacle') ? 'spectacle' : KINDS.find((k) => k !== 'all' && k !== 'loop' && def.tags.includes(k)) ?? 'effect'
    const card = h('button', { class: 'fx-card', 'data-id': id, title: id, onclick: () => openDetail(id) },
      canvas, h('span', {}, id.replace(/^fx-/, '')), h('span', { class: 'kind' }, kind))
    cards.set(id, { card, canvas, def, visible: false, painted: '' })
    seen.observe(card)
    grid.append(card)
  }
}

function filter() {
  let n = 0
  for (const [, c] of cards) {
    const show = state.kind === 'all' || c.def.tags.includes(state.kind)
    c.card.hidden = !show
    if (show) n++
  }
  $$('#kinds button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.kind === state.kind)))
  $('#dl-all').textContent = `📦 Download these ${n} as one pack`
}

// ---------------------------------------------------------------- detail
let detail = null
function openDetail(id) {
  detail = { id, size: 32 }
  renderDetail()
  $('#detail').showModal()
}
function renderDetail() {
  const { id, size } = detail
  const r = framesFor(id, state.color, size)
  const def = looks[id].def
  const short = id.replace(/^fx-/, '')
  $('#detail-title').textContent = short
  $('#detail-meta').textContent = `${r.frames.length} frames · ${r.fps} fps · ${r.loop ? 'loops' : 'plays once'} · ${size}×${size} · ${def.tags.filter((t) => !['effect', 'fx', 'animated'].includes(t)).join(', ')}`
  $('#detail-sizes').replaceChildren(...[16, 32, 48, 64].map((s) => h('button', {
    'aria-pressed': String(s === size), onclick: () => { detail.size = s; renderDetail() },
  }, `${s}px`)))
  const opts = [state.color && `element: '${state.color}'`, size !== 32 && `size: ${size}`].filter(Boolean)
  const lookId = state.color ? `${id}-${state.color}` : id
  const lines = [
    `import { dog } from 'https://cdn.jsdelivr.net/gh/olebangpad/dog@main/src/index.js'`,
    '',
    `const frames = dog.fx('${short}'${opts.length ? `, { ${opts.join(', ')} }` : ''})`,
    `// ${r.frames.length} Pixmaps, play at frames.fps (${r.fps})${r.loop ? ', loops' : ''}`,
  ]
  if (size === 32 && looks[lookId]) lines.push(`// also a regular sprite: dog.frames('${lookId}')`)
  const sfx = dog.sfx.forEffect(id)
  $('#detail-sound').hidden = !sfx
  if (sfx) lines.push(`dog.sfx('${sfx}'${state.color ? `, { element: '${state.color}' }` : ''}).play()   // its sound`)
  $('#detail-code').textContent = lines.join('\n')
}
$('#detail-anim').addEventListener('click', () => {
  const r = framesFor(detail.id, state.color, detail.size)
  download(`${detail.id}${state.color ? '-' + state.color : ''}.png`, encodeAPNG(r.frames.map((f) => f.scale(4)), { fps: r.fps }))
})
$('#detail-strip').addEventListener('click', () => {
  const r = framesFor(detail.id, state.color, detail.size)
  download(`${detail.id}${state.color ? '-' + state.color : ''}-strip.png`, sheet(r.frames).image.toPNG())
})
$('#detail-pack').addEventListener('click', () => downloadPack([detail.id], detail.id.replace(/^fx-/, '')))
$('#detail-copy').addEventListener('click', () => copy($('#detail-code').textContent, 'Code copied'))
$('#detail-sound').addEventListener('click', () => dog.sfx(dog.sfx.forEffect(detail.id), { element: state.color ?? undefined }).play())

async function downloadPack(list, name) {
  const lookIds = list.map((id) => (state.color && looks[`${id}-${state.color}`] ? `${id}-${state.color}` : id))
  const pack = dog.fxPack(lookIds, { name })
  // let the browser compress the sheet (the built-in PNG writer stores it uncompressed)
  const blob = await new Promise((resolve) => pack.image.toCanvas().toBlob(resolve, 'image/png'))
  const bytes = zip({ ...pack.files, [`${name}.png`]: new Uint8Array(await blob.arrayBuffer()) })
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }))
  const a = h('a', { href: url, download: `${name}.zip` })
  document.body.append(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  toast(`${name}.zip: ${list.length} effect${list.length > 1 ? 's' : ''} for Phaser, Godot or any engine`)
}
$('#dl-all').addEventListener('click', () => {
  const list = ids.filter((id) => !cards.get(id).card.hidden)
  downloadPack(list, state.kind === 'all' ? 'dog-effects' : `dog-${state.kind}-effects`)
})

// -------------------------------------------------------------- controls
$('#kinds').append(...KINDS.map((k) => h('button', { 'data-kind': k, onclick: () => { state.kind = k; filter() } }, k)))
const swatch = (m) => `linear-gradient(135deg, ${MATERIALS[m][3]} 0 30%, ${MATERIALS[m][2]} 30% 65%, ${MATERIALS[m][1]} 65%)`
$('#colors').append(
  h('button', { 'data-color': '', 'aria-pressed': 'true', onclick: () => setColor(null) }, h('i', { style: { '--sw': 'conic-gradient(#e0453a, #e8b02a, #4caa3c, #3c7ae0, #9a4ad0, #e0453a)' } }), 'original'),
  ...Object.entries(FX_COLORS).map(([name, m]) => h('button', { 'data-color': name, 'aria-pressed': 'false', onclick: () => setColor(name) }, h('i', { style: { '--sw': swatch(m) } }), name)),
)
function setColor(c) {
  state.color = c
  $$('#colors button').forEach((b) => b.setAttribute('aria-pressed', String((b.dataset.color || null) === c)))
  if ($('#detail').open) renderDetail()
}
$$('#bgs button').forEach((b) => b.addEventListener('click', () => {
  state.bg = b.dataset.bg
  $('#fx-grid').dataset.bg = state.bg
  $$('#bgs button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)))
}))

// ------------------------------------------------------------------ loop
let start = performance.now()
function loop(now) {
  const t = Math.max(0, now - start) / 1000
  let n = 0
  for (const [id, c] of cards) {
    n++
    if (!c.visible || c.card.hidden) continue
    const r = framesFor(id)
    const hold = r.loop ? 0 : 4 // one-shot effects pause a moment before replaying
    const i = Math.floor((t + n * 0.37) * r.fps) % (r.imgs.length + hold) // staggered, so the grid never goes blank at once
    const key = `${state.color}|${i}`
    if (c.painted === key) continue
    c.painted = key
    const ctx = c.canvas.getContext('2d')
    ctx.clearRect(0, 0, 32, 32)
    if (i < r.imgs.length) ctx.drawImage(r.imgs[i], 0, 0)
  }
  if ($('#detail').open) {
    const r = framesFor(detail.id, state.color, detail.size)
    const view = $('#detail-view')
    if (view.width !== r.frames[0].w) { view.width = r.frames[0].w; view.height = r.frames[0].h }
    const i = Math.floor(t * r.fps) % (r.imgs.length + (r.loop ? 0 : 4))
    const ctx = view.getContext('2d')
    ctx.clearRect(0, 0, view.width, view.height)
    if (i < r.imgs.length) ctx.drawImage(r.imgs[i], 0, 0)
  }
  requestAnimationFrame(loop)
}

$('#favicon').href = dog('fx-burst', { frame: 3 }).toDataURL()
buildGrid()
filter()
requestAnimationFrame(loop)
window.dog = dog
