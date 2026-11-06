// A GitHub account as a game hero, for a profile README.
//
//   const stats = await fetchStats('octocat')          // 3 public GitHub API calls (a token raises the rate limit)
//   const hero = heroOf(stats)                         // { spec, level, title, mood, ... }
//   const { frames, fps } = heroCard(hero)             // an animated card: encodeAPNG(frames, { fps })
//
// The login picks the look (body, hat, off-hand), so a hero stays recognizable. The top language picks the class,
// the weapon and the colors. Repos, stars, followers and account age set the level, and a higher level upgrades the
// weapon. The last day and week of public activity decide what the hero is doing today.

import { spell } from './index.js'
import { Pixmap } from './pixmap.js'
import { text } from './font.js'

// language: [GitHub's language color, weapon family, class]
export const LANGUAGES = {
  JavaScript: ['#f1e05a', 'staff', 'wizard'],
  TypeScript: ['#3178c6', 'sword', 'knight'],
  Python: ['#3572a5', 'flower', 'druid'],
  Java: ['#b07219', 'spear', 'lancer'],
  'C#': ['#178600', 'sword', 'paladin'],
  'C++': ['#f34b7d', 'axe', 'warlord'],
  C: ['#555555', 'axe', 'barbarian'],
  Go: ['#00add8', 'bow', 'ranger'],
  Rust: ['#dea584', 'hammer', 'blacksmith'],
  Ruby: ['#701516', 'dagger', 'rogue'],
  PHP: ['#4f5d95', 'trident', 'tidecaller'],
  Swift: ['#f05138', 'bow', 'archer'],
  Kotlin: ['#a97bff', 'staff', 'enchanter'],
  Dart: ['#00b4ab', 'dagger', 'scout'],
  Scala: ['#c22d40', 'spear', 'dragoon'],
  Shell: ['#89e051', 'pickaxe', 'miner'],
  HTML: ['#e34c26', 'torch', 'torchbearer'],
  CSS: ['#663399', 'lollipop', 'artist'],
  Vue: ['#41b883', 'lollipop', 'bard'],
  Svelte: ['#ff3e00', 'torch', 'firebrand'],
  Lua: ['#000080', 'staff', 'moon priest'],
  Haskell: ['#5e5086', 'staff', 'sorcerer'],
  Elixir: ['#6e4a7e', 'staff', 'alchemist'],
  Erlang: ['#b83998', 'staff', 'alchemist'],
  Clojure: ['#db5855', 'staff', 'sage'],
  'Jupyter Notebook': ['#da5b0b', 'staff', 'scholar'],
  R: ['#198ce7', 'staff', 'oracle'],
  Julia: ['#a270ba', 'staff', 'oracle'],
  Zig: ['#ec915c', 'torch', 'firebrand'],
  Nim: ['#ffc200', 'sword', 'duelist'],
  'Objective-C': ['#438eff', 'bow', 'archer'],
  Perl: ['#0298c3', 'dagger', 'rogue'],
  Elm: ['#60b5cc', 'flower', 'druid'],
  GDScript: ['#355570', 'sword', 'hero'],
  Solidity: ['#aa6746', 'pickaxe', 'prospector'],
  Assembly: ['#6e4c13', 'pickaxe', 'deep miner'],
  Nix: ['#7e7eff', 'trident', 'tidecaller'],
  Dockerfile: ['#384d54', 'rod', 'sailor'],
  'Vim Script': ['#199f4b', 'staff', 'monk'],
}

// weapon family: [held item at levels 1-14, 15-34, 35+], and the class for a language not in the table
const WEAPONS = {
  staff: [['wand', 'staff', 'staff-void'], 'mage'],
  sword: [['sword', 'sword-gold', 'sword-crystal'], 'knight'],
  axe: [['axe', 'axe-gold', 'axe-crystal'], 'barbarian'],
  hammer: [['hammer-stone', 'hammer-gold', 'hammer-crystal'], 'smith'],
  bow: [['bow', 'bow-elven', 'bow-dark'], 'ranger'],
  spear: [['spear-bone', 'spear', 'spear-gold'], 'lancer'],
  dagger: [['dagger-bone', 'dagger', 'dagger-ruby'], 'rogue'],
  pickaxe: [['pickaxe', 'pickaxe-gold', 'pickaxe-crystal'], 'miner'],
  trident: [['trident-iron', 'trident', 'trident-sea'], 'tidecaller'],
  flower: [['flower', 'flower-sun', 'staff-nature'], 'druid'],
  torch: [['torch', 'torch-blue', 'staff-fire'], 'torchbearer'],
  rod: [['rod', 'rod-pro', 'trident-sea'], 'angler'],
  lollipop: [['lollipop', 'lollipop-blue', 'lollipop-rainbow'], 'bard'],
}
const FAMILIES = Object.keys(WEAPONS)
const HUMANOID = /^(hero|heroine|skeleton|goblin|robot)(-|$)/

// FNV-1a: a stable number for any string
function hash(str) {
  let h = 0x811c9dc5
  for (const ch of str) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0 }
  return h
}
const pick = (list, str) => list[hash(str) % list.length]

const DAY = 86400000
const YEAR = 365.25 * DAY

/** Read what a hero needs from GitHub's public REST API: the user, their own repos, their recent public events. */
export async function fetchStats(login, { token, fetch: get = globalThis.fetch, now = Date.now() } = {}) {
  if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login ?? '')) throw new Error(`pixspell: "${login}" is not a GitHub login`)
  const headers = { accept: 'application/vnd.github+json', ...(token ? { authorization: `Bearer ${token}` } : {}) }
  if (typeof window === 'undefined') headers['user-agent'] = 'pixspell'
  const api = async (path) => {
    const res = await get(`https://api.github.com${path}`, { headers })
    if (res.status === 404) throw new Error(`pixspell: no GitHub user "${login}"`)
    if (!res.ok) throw new Error(`pixspell: GitHub answered ${res.status} for ${path}${res.status === 403 || res.status === 429 ? ' (rate limit: try again later, or pass a token)' : ''}`)
    return res.json()
  }
  const [user, repos, events] = await Promise.all([
    api(`/users/${login}`),
    api(`/users/${login}/repos?per_page=100&type=owner&sort=pushed`),
    api(`/users/${login}/events/public?per_page=100`).catch(() => []),
  ])
  const own = repos.filter((r) => !r.fork)
  const languages = {}
  for (const r of own) if (r.language) languages[r.language] = (languages[r.language] ?? 0) + 1
  const times = [...events.map((e) => e.created_at), ...own.map((r) => r.pushed_at)].filter(Boolean).map((t) => Date.parse(t))
  const within = (ms) => times.filter((t) => now - t < ms).length
  return {
    login: user.login,
    createdAt: user.created_at,
    repos: user.public_repos ?? own.length,
    followers: user.followers ?? 0,
    stars: own.reduce((n, r) => n + (r.stargazers_count ?? 0), 0),
    languages,
    activity: { day: within(DAY), week: within(7 * DAY) },
  }
}

/** Turn stats into a hero: { login, spec, level, progress, language, color, title, mood, years }. */
export function heroOf(stats, { now = Date.now() } = {}) {
  const login = String(stats.login)
  const key = `github:${login.toLowerCase()}`
  const top = Object.entries(stats.languages ?? {}).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))[0]?.[0] ?? null
  const known = top && LANGUAGES[top]
  const family = known ? known[1] : top ? pick(FAMILIES, top) : 'sword'
  const [tiers, defaultTitle] = WEAPONS[family]
  const title = known ? known[2] : top ? defaultTitle : 'adventurer'
  const color = known ? known[0] : `hsl(${hash(top ?? key) % 360}, 60%, 55%)`

  const years = Math.max(0, (now - Date.parse(stats.createdAt ?? now)) / YEAR)
  const xp = 10 * (stats.repos ?? 0) + 5 * (stats.stars ?? 0) + 3 * (stats.followers ?? 0) + 20 * years
  const v = 10 * Math.log10(1 + xp / 10)
  const level = Math.min(99, 1 + Math.floor(v))
  const progress = level === 99 ? 1 : v - Math.floor(v)

  const bodies = spell.char.parts.body.filter((b) => HUMANOID.test(b))
  const offhands = [null, ...spell.char.parts.offhand]
  const spec = {
    body: pick(bodies, key + ':body'),
    hat: pick(spell.char.parts.head, key + ':hat'),
    hand: `held-${tiers[level < 15 ? 0 : level < 35 ? 1 : 2]}`,
    A: toHex(color),
  }
  const off = pick(offhands, key + ':offhand')
  if (off) spec.offhand = off

  const { day = 0, week = 0 } = stats.activity ?? {}
  const mood = day > 0 ? 'battle' : week > 0 ? 'quest' : 'rest'
  return { login, spec, level, progress, language: top, color: toHex(color), title, mood, years, stars: stats.stars ?? 0, repos: stats.repos ?? 0 }
}

// hsl() or #hex -> #rrggbb (the ramps take hex)
function toHex(color) {
  const m = /^hsl\((\d+), (\d+)%, (\d+)%\)$/.exec(color)
  if (!m) return color.toLowerCase()
  const [h, s, l] = [Number(m[1]), Number(m[2]) / 100, Number(m[3]) / 100]
  const f = (n) => {
    const k = (n + h / 30) % 12, a = s * Math.min(l, 1 - l)
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e4 ? `${Math.round(n / 1e3)}K` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}K` : String(n))
const MOODS = { battle: 'TODAY: IN BATTLE', quest: 'THIS WEEK: ON A QUEST', rest: 'RESTING AT THE INN' }
export const CARD = { w: 200, h: 72 }

/** The profile card as frames: the hero doing today's thing on the left (at 2x), name, level and stats on the right. */
export function heroCard(hero, { scale = 3 } = {}) {
  const { w: W, h: H } = CARD
  const BG = '#101712', LINE = '#2b3b30', INK = '#e8f3e4', DIM = '#8aa592', FAINT = '#4d6152', ACCENT = '#a8e05a', GOLD = '#ffd06a'
  // the still part: panel, text, XP bar
  let base = Pixmap.create(W, H, LINE).draw(Pixmap.create(W - 2, H - 2, BG), 1, 1)
  const x0 = 76, room = W - x0 - 6
  const name = text(hero.login, { color: ACCENT }) // no "@": at 3x5 it reads as an "e"
  const big = name.w * 2 <= room
  let y = big ? 7 : 9
  base = base.draw(big ? name.scale(2) : name, x0, y)
  y += big ? 15 : 9
  const lv = text(`LV ${hero.level} ${hero.language ? `${hero.language} ` : ''}${hero.title}`, { color: INK })
  base = base.draw(lv.w <= room ? lv : text(`LV ${hero.level} ${hero.title}`, { color: INK }), x0, y)
  y += 8
  base = base.draw(Pixmap.create(room, 4, LINE), x0, y).draw(Pixmap.create(Math.max(1, Math.round((room - 2) * hero.progress)), 2, hero.color), x0 + 1, y + 1)
  y += 9
  const years = hero.years >= 1 ? `${Math.floor(hero.years)} YRS` : 'NEW'
  base = base.draw(text(`${short(hero.stars)} STARS  ${short(hero.repos)} REPOS  ${years}`, { color: DIM }), x0, y)
  y += 11
  base = base.draw(text(MOODS[hero.mood], { color: GOLD }), x0, y)
  const brand = text('PIXSPELL', { color: FAINT })
  base = base.draw(brand, W - brand.w - 5, H - brand.h - 4)

  // the stage: 34x34, drawn at 2x, grass along the bottom; characters stand with their feet at y 32
  const stage = (scroll = 0) => {
    let s = Pixmap.create(34, 34, '#0b110d')
    for (let x = -(scroll % 16); x < 34; x += 16) s = s.draw(spell('grass'), x, 22)
    return s
  }
  const frames = []
  let fps = 8
  if (hero.mood === 'battle') {
    const attack = spell.action(hero.spec, 'attack', hero.color)
    const idle = spell.char.frames(hero.spec)
    fps = attack.fps ?? 12
    for (const f of attack) frames.push(stage().draw(f, 1, 1))
    for (let i = 0; i < 6; i++) frames.push(stage().draw(idle[Math.floor(i / 3) % idle.length], 5, 9))
  } else if (hero.mood === 'quest') {
    const walk = spell.walk(hero.spec, 'right')
    for (let i = 0; i < 16; i++) frames.push(stage(i).draw(walk[Math.floor(i / 2) % walk.length], 5, 9))
  } else {
    const asleep = spell.status(hero.spec, 'sleep') // 32x32 frames, the Zzz placed above the head
    fps = asleep.fps ?? 6
    for (const f of asleep) frames.push(stage().draw(f, 1, 1))
  }
  return { frames: frames.map((s) => base.draw(s.scale(2), 2, 2).scale(scale)), fps }
}

/** One line for alt text: "@octocat: LV 21 TypeScript knight". */
export const heroAlt = (hero) => `@${hero.login}: LV ${hero.level} ${hero.language ? `${hero.language} ` : ''}${hero.title}`
