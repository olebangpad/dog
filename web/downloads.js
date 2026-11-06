// "Download everything, at your tile size": spell.bundle() rendered in the browser, one zip.
import { spell, zip, Pixmap } from '../src/index.js'
import { $, $$, h, download, toast } from './ui.js'

const GRIDS = [
  { g: 8, label: '8×8', note: 'tiny retro' },
  { g: 16, label: '16×16', note: 'original' },
  { g: 32, label: '32×32', note: 'smooth 2×' },
  { g: 64, label: '64×64', note: 'smooth 4×' },
]
const SAMPLES = [
  ['sword', (g) => spell('sword', { grid: g })],
  ['potion', (g) => spell('potion-mana', { grid: g })],
  ['slime', (g) => spell('slime-pink', { grid: g, frame: 0 })],
  ['chest', (g) => spell('chest-gold', { grid: g })],
  ['tree', (g) => spell('tree', { grid: g })],
  ['knight', (g) => spell.char({ body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield', grid: g })],
  ['meteor', (g) => spell('fx-meteor', { grid: g, frame: 7 })],
]
let grid = 32
try { grid = Number(localStorage.getItem('pixspell-grid')) || 32 } catch {}
if (!GRIDS.some((x) => x.g === grid)) grid = 32

function showPreview() {
  $('#grid-preview').replaceChildren(...SAMPLES.map(([name, make]) => {
    const img = make(grid)
    const c = h('canvas', { width: img.w, height: img.h, 'aria-hidden': 'true' })
    img.toCanvas(c)
    return h('figure', {}, c, h('figcaption', {}, `${name} ${img.w}×${img.h}`))
  }))
  $$('#grid-pick button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.g) === grid)))
  $('#dl-bundle').textContent = `📦 Download dog-${grid}px.zip`
}

function setGrid(g) {
  grid = g
  try { localStorage.setItem('pixspell-grid', g) } catch {}
  showPreview()
}
addEventListener('pixspell-grid', (e) => { if (e.detail !== grid) setGrid(e.detail) }) // the character maker picked one

$('#grid-pick').append(...GRIDS.map(({ g, label, note }) => h('button', {
  'data-g': g, 'aria-pressed': 'false',
  onclick: () => { setGrid(g); dispatchEvent(new CustomEvent('pixspell-grid', { detail: g })) },
}, h('b', {}, label), h('small', {}, note))))

// PNGs: let the browser compress them (the built-in encoder stores pixels uncompressed)
const canvasPNG = (img) => new Promise((resolve) => img.toCanvas(document.createElement('canvas')).toBlob(async (b) => resolve(new Uint8Array(await b.arrayBuffer())), 'image/png'))
const nextFrame = () => new Promise((r) => setTimeout(r, 0))

let busy = false
$('#dl-bundle').addEventListener('click', async () => {
  if (busy) return
  busy = true
  const parts = Object.fromEntries($$('#dl-opts input').map((i) => [i.dataset.part, i.checked]))
  const items = spell.bundle({ grid, ...parts })
  const status = $('#dl-status'), t0 = performance.now()
  const files = {}, root = `pixspell-${grid}px/`
  $('#dl-bundle').disabled = true
  try {
    for (let i = 0; i < items.length; i += 24) {
      const batch = items.slice(i, i + 24)
      const made = batch.map((it) => it.make())
      const bytes = await Promise.all(made.map((r) => (r instanceof Pixmap ? canvasPNG(r) : r)))
      batch.forEach((it, k) => { files[root + it.path] = bytes[k] })
      status.textContent = `Rendering ${Math.min(i + 24, items.length)} / ${items.length} files…`
      await nextFrame()
    }
    const out = zip(files)
    download(`pixspell-${grid}px.zip`, out, 'application/zip')
    const secs = ((performance.now() - t0) / 1000).toFixed(1)
    status.textContent = `pixspell-${grid}px.zip: ${items.length} files, ${(out.length / 1048576).toFixed(1)} MB, made in ${secs}s`
    toast(`pixspell-${grid}px.zip is ready`)
  } finally {
    busy = false
    $('#dl-bundle').disabled = false
  }
})

showPreview()
