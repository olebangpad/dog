// Promo frame: the demo playing itself, rotating captions and a strip of
// random characters. Recorded to video by scripts/record-promo.cjs.
import { spell, Pixmap } from '../src/index.js'
import { createGame } from './quest.js'

const params = new URLSearchParams(location.search)
const lang = params.get('lang') === 'ko' ? 'ko' : 'en'
if (params.get('mode') === 'clip') document.body.classList.add('clip')
if (lang === 'ko') document.body.classList.add('ko')

const count = spell.char.count()
const CAPTIONS = {
  en: [
    'Every pixel here is <b>code</b>',
    `<b>${count.toLocaleString('en-US')}</b> characters`,
    'Walk · attack · cast · <b>level up</b>',
    'Recolor anything in <b>one line</b>',
    '<b>Free</b> · CC0 · open source',
  ],
  ko: [
    '여기 모든 픽셀이 <b>코드</b>예요',
    `캐릭터 <b>${Math.floor(count / 10000)}만</b> 가지`,
    '걷기 · 공격 · 마법 · <b>레벨업</b>',
    '색 바꾸기도 <b>한 줄</b>이면 끝',
    '<b>무료</b> · CC0 · 오픈소스',
  ],
}[lang]
document.querySelector('#cta-sub').textContent = lang === 'ko' ? '게임 도트 이미지 · 무료 · 의존성 0개' : 'free pixel art for games · zero dependencies'

const game = createGame(document.querySelector('#game'), {
  spec: { body: 'hero', hat: 'knight', hand: 'sword-fire', offhand: 'shield' },
  auto: true,
  seed: 11,
})
game.start()

// swap the hero every few seconds: "play as anyone"
const heroes = [
  { body: 'heroine', hat: 'wizard', hand: 'staff-fire', offhand: 'orb' },
  { body: 'goblin-chief', hat: 'crown', hand: 'dagger-poison', offhand: 'buckler' },
  { body: 'robot', hat: 'cowboy', hand: 'hammer-crystal' },
]
heroes.forEach((h, i) => setTimeout(() => game.setHero(h), 4500 * (i + 1)))

// rotating captions
const cap = document.querySelector('#caption')
let ci = 0
const showCaption = () => { cap.innerHTML = `<span>${CAPTIONS[ci++ % CAPTIONS.length]}</span>` }
showCaption()
setInterval(showCaption, 3000)

// strip of random characters walking, re-rolled every second
const strip = document.querySelector('#strip')
const sctx = strip.getContext('2d')
let walkers = []
let seed = 100
const reroll = () => {
  walkers = Array.from({ length: 9 }, () => spell.walk(spell.char.random(seed++), 'down').map((f) => f.toCanvas(document.createElement('canvas'))))
}
reroll()
setInterval(reroll, 1000)
const t0 = performance.now()
;(function tick(now) {
  sctx.clearRect(0, 0, strip.width, strip.height)
  const step = Math.floor((Math.max(0, now - t0) / 1000) * 6)
  walkers.forEach((frames, i) => sctx.drawImage(frames[step % frames.length], 4 + i * 26, 10))
  requestAnimationFrame(tick)
})(t0)
