// "Your GitHub hero" page: fetch a user's public stats, draw the card, offer the workflow for a profile README.
import { spell, encodeAPNG } from '../src/index.js'
import { fetchStats, heroOf, heroCard, heroAlt, LANGUAGES } from '../src/profile.js'
import { $, $$, h, download, copy } from './ui.js'

const stage = $('#stage')
let current = null // { hero, frames, fps }
let timer = null

const workflow = `name: PixSpell hero
on:
  schedule: [{ cron: '23 5 * * *' }]   # once a day
  workflow_dispatch:
permissions:
  contents: write
jobs:
  hero:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: olebangpad/pixspell@main
`
const markdown = (login) => `[![@${login}'s PixSpell hero](pixspell-hero.png)](https://github.com/olebangpad/pixspell)`
$('#workflow').textContent = workflow
$('#markdown').textContent = markdown('you')
$('#lang-count').textContent = Object.keys(LANGUAGES).length

function play(frames, fps) {
  clearInterval(timer)
  const canvas = h('canvas', { width: frames[0].w, height: frames[0].h, role: 'img' })
  stage.replaceChildren(canvas)
  let i = 0
  const step = () => { frames[i % frames.length].toCanvas(canvas); i++ }
  step()
  timer = setInterval(step, 1000 / fps)
  return canvas
}

// zlib-compress with the browser's CompressionStream, so downloads are small (encodeAPNG's own deflate only stores)
const zlib = async (bytes) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer())
async function smallAPNG(frames, fps) {
  const inputs = []
  encodeAPNG(frames, { fps, deflate: (b) => { inputs.push(b); return new Uint8Array(0) } })
  const packed = await Promise.all(inputs.map(zlib))
  let i = 0
  return encodeAPNG(frames, { fps, deflate: () => packed[i++] })
}

async function summon(login) {
  login = login.trim().replace(/^@/, '')
  if (!login) return
  history.replaceState(null, '', `?u=${encodeURIComponent(login)}`)
  stage.replaceChildren(h('p', { class: 'hero-why' }, `Looking up @${login}...`))
  $('#dl').disabled = true
  try {
    const hero = heroOf(await fetchStats(login))
    const { frames, fps } = heroCard(hero, { scale: 3 })
    current = { hero, frames, fps }
    const canvas = play(frames, fps)
    canvas.setAttribute('aria-label', heroAlt(hero))
    const [kind, ...made] = hero.spec.hand.replace('held-', '').split('-') // 'bow-elven' -> 'elven bow'
    const weapon = [...made, kind].join(' ')
    stage.append(h('p', { class: 'hero-why' },
      h('b', {}, heroAlt(hero)), '. ',
      hero.language ? `Mostly ${hero.language}, so a ${hero.title} with a ${weapon}. ` : `No language yet, so an ${hero.title} with a ${weapon}. `,
      { battle: 'Active today: in battle.', quest: 'Active this week: on a quest.', rest: 'Quiet this week: resting at the inn.' }[hero.mood]))
    for (const el of $$('.who')) el.textContent = hero.login
    $('#markdown').textContent = markdown(hero.login)
    $('#dl').disabled = false
  } catch (e) {
    stage.replaceChildren(h('p', { class: 'hero-err' }, e.message.replace(/^pixspell: /, '')))
  }
}

$('#form').addEventListener('submit', (e) => { e.preventDefault(); summon($('#login').value) })
$('#dl').addEventListener('click', async () => {
  if (!current) return
  download('pixspell-hero.png', await smallAPNG(current.frames, current.fps))
})
for (const b of $$('[data-copy]')) b.addEventListener('click', () => copy($(`#${b.dataset.copy}`).textContent, 'Copied'))
$('#favicon').href = spell('hat-crown').toDataURL()

const u = new URLSearchParams(location.search).get('u')
if (u) { $('#login').value = u; summon(u) }
