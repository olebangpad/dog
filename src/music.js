// Music engine: chiptune loops from a few lines of song data, rendered with the same voices as the sound effects.
//
// A song names its tempo, key, chord progression and a style for each channel. The engine writes the parts:
//   lead     a melody: chord tones on strong beats, steps between them, a motif that comes back, a cadence home
//   bass     root / fifth / walking patterns on a triangle wave
//   harmony  arpeggios or held chords on a thin pulse wave
//   drums    kick, snare and hats from pattern strings
// Same song, same notes: the melody comes from a seed (the song's id), so a track never changes between runs.
// `seed` gives a variation, `key` transposes, `tempo` scales the speed. Jingles (victory, game over) are written out.

import { renderSound, Sound, SAMPLE_RATE } from './sfx.js'
import { hashSeed, mulberry } from './fx.js'

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
const midi = (name) => { // 'C5' -> 72
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name)
  return 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0)
}
const hz = (m) => 440 * 2 ** ((m - 69) / 12)
const SCALES = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  harmonic: [0, 2, 3, 5, 7, 8, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 4, 5, 7, 8, 10], // phrygian dominant: desert
  pentatonic: [0, 2, 4, 7, 9],
}
// 'Am' -> { root: 9, tones: [0, 3, 7] }
function chord(name) {
  const m = /^([A-G])([#b]?)(m|dim|sus)?(7)?$/.exec(name)
  if (!m) throw new Error(`pixspell music: "${name}" is not a chord`)
  const root = (NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12
  const tones = m[3] === 'm' ? [0, 3, 7] : m[3] === 'dim' ? [0, 3, 6] : m[3] === 'sus' ? [0, 5, 7] : [0, 4, 7]
  if (m[4]) tones.push(10)
  return { root, tones }
}

// rhythm templates for one bar of eighths: x = a note starts, - = it holds, . = rest
const RHYTHMS = {
  march: ['x-x-x-xx', 'x-xxx-x-', 'x-x-xxx-', 'x---x-x-'],
  flowing: ['x-x-x-x-', 'x--xx-x-', 'x-x--xx-', 'x---x---'],
  calm: ['x---x---', 'x-----x-', 'x---x-x-', 'x-------'],
  driving: ['xxx-xxx-', 'x-xxx-xx', 'xx-xx-x-', 'x-x-xxxx'],
  bouncy: ['x.xxx.x.', 'x.x.xx.x', 'xx.x.xx.', 'x.x.x---'],
  sparse: ['x---.-x-', 'x-------', '..x-x---', 'x---x---'],
}
// drum patterns over 8 eighths (k kick, s snare, h hat, o open hat), one string per bar shape
const DRUMS = {
  rock: ['k.h.s.h.', 'k.h.s.hk', 'k.hks.h.', 'k.h.s.ss'],
  march: ['k.s.k.s.', 'k.s.k.ss', 'k.s.kks.', 'k.s.ssss'],
  fast: ['khskkhsh', 'khskkhss', 'khskhkhs', 'kssksss.'],
  shuffle: ['k.hsk.hs', 'k.hsk.hk', 'k.hsk.hs', 'k.hss.ss'],
  soft: ['k...h...', 'k...h..k', 'k...h...', 'k...h.h.'],
  none: ['........'],
}

/** The songs: data only. tempo in quarter notes per minute; chords one per bar, repeated to fill `bars`. */
export const SONGS = [
  { id: 'title', tags: ['menu', 'heroic'], tempo: 116, key: 'C', scale: 'major', chords: ['C', 'G', 'Am', 'F'], bars: 16,
    lead: { wave: 'square', duty: 0.5, low: 'G4', high: 'E6', rhythm: 'march' }, bass: 'rootFifth', harmony: 'arp', drums: 'rock' },
  { id: 'town', tags: ['town', 'happy'], tempo: 104, key: 'F', scale: 'major', chords: ['F', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'C'], bars: 16,
    lead: { wave: 'pulse', duty: 0.25, low: 'C5', high: 'D6', rhythm: 'bouncy' }, bass: 'walk', harmony: 'arp', drums: 'shuffle' },
  { id: 'field', tags: ['overworld', 'adventure'], tempo: 128, key: 'G', scale: 'major', chords: ['G', 'D', 'Em', 'C'], bars: 16,
    lead: { wave: 'square', duty: 0.5, low: 'D5', high: 'E6', rhythm: 'flowing' }, bass: 'rootFifth', harmony: 'arp', drums: 'rock' },
  { id: 'forest', tags: ['nature', 'calm'], tempo: 92, key: 'A', scale: 'minor', chords: ['Am', 'F', 'C', 'G'], bars: 16,
    lead: { wave: 'triangle', low: 'A4', high: 'C6', rhythm: 'calm' }, bass: 'pulse', harmony: 'arp', drums: 'soft' },
  { id: 'dungeon', tags: ['dungeon', 'tense'], tempo: 96, key: 'D', scale: 'harmonic', chords: ['Dm', 'Bb', 'Gm', 'A'], bars: 16,
    lead: { wave: 'pulse', duty: 0.125, low: 'A4', high: 'D6', rhythm: 'sparse' }, bass: 'root8', harmony: 'pad', drums: 'soft' },
  { id: 'cave', tags: ['cave', 'dark', 'ambient'], tempo: 70, key: 'E', scale: 'minor', chords: ['Em', 'C', 'Em', 'B'], bars: 8,
    lead: { wave: 'triangle', low: 'E4', high: 'B5', rhythm: 'sparse' }, bass: 'pulse', harmony: 'arp', drums: 'none' },
  { id: 'battle', tags: ['battle', 'fast'], tempo: 152, key: 'A', scale: 'harmonic', chords: ['Am', 'F', 'G', 'E'], bars: 16,
    lead: { wave: 'square', duty: 0.5, low: 'A4', high: 'E6', rhythm: 'driving' }, bass: 'root8', harmony: 'arp', drums: 'fast' },
  { id: 'boss', tags: ['battle', 'boss', 'intense'], tempo: 166, key: 'C', scale: 'harmonic', chords: ['Cm', 'Ab', 'Bb', 'G'], bars: 16,
    lead: { wave: 'saw', low: 'G4', high: 'Eb6', rhythm: 'driving' }, bass: 'root8', harmony: 'arp', drums: 'fast' },
  { id: 'shop', tags: ['town', 'shop', 'happy'], tempo: 118, key: 'C', scale: 'major', chords: ['C', 'Am', 'Dm', 'G'], bars: 8,
    lead: { wave: 'pulse', duty: 0.25, low: 'E5', high: 'E6', rhythm: 'bouncy' }, bass: 'walk', harmony: 'arp', drums: 'shuffle' },
  { id: 'night', tags: ['calm', 'night'], tempo: 72, key: 'F', scale: 'major', chords: ['F', 'Em', 'Dm', 'C'], bars: 8,
    lead: { wave: 'sine', low: 'C5', high: 'C6', rhythm: 'calm' }, bass: 'pulse', harmony: 'pad', drums: 'none' },
  { id: 'castle', tags: ['castle', 'regal'], tempo: 104, key: 'D', scale: 'major', chords: ['D', 'Bm', 'G', 'A'], bars: 16,
    lead: { wave: 'square', duty: 0.5, low: 'A4', high: 'D6', rhythm: 'march' }, bass: 'rootFifth', harmony: 'pad', drums: 'march' },
  { id: 'desert', tags: ['overworld', 'desert'], tempo: 108, key: 'E', scale: 'phrygian', chords: ['E', 'F', 'E', 'Dm'], bars: 16,
    lead: { wave: 'pulse', duty: 0.25, low: 'B4', high: 'E6', rhythm: 'flowing' }, bass: 'rootFifth', harmony: 'arp', drums: 'shuffle' },
  { id: 'snow', tags: ['overworld', 'calm', 'winter'], tempo: 96, key: 'E', scale: 'major', chords: ['E', 'C#m', 'A', 'B'], bars: 8,
    lead: { wave: 'sine', low: 'B4', high: 'B5', rhythm: 'flowing' }, bass: 'pulse', harmony: 'arp', drums: 'soft' },
  { id: 'ocean', tags: ['overworld', 'water', 'calm'], tempo: 98, key: 'Bb', scale: 'major', chords: ['Bb', 'Gm', 'Eb', 'F'], bars: 8,
    lead: { wave: 'triangle', low: 'F4', high: 'F5', rhythm: 'flowing' }, bass: 'walk', harmony: 'arp', drums: 'soft' },
  // jingles: written out, played once
  { id: 'victory', tags: ['jingle'], tempo: 140, jingle: [
    ['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1.5], ['G5', 0.5], ['C6', 3]],
    under: [['C3', 3], ['G2', 0.5], ['C3', 3]] },
  { id: 'level-clear', tags: ['jingle'], tempo: 150, jingle: [
    ['G5', 0.5], ['A5', 0.5], ['B5', 0.5], ['D6', 0.5], ['B5', 0.5], ['D6', 0.5], ['G6', 3]],
    under: [['G2', 1], ['D3', 1], ['G3', 4]] },
  { id: 'game-over', tags: ['jingle'], tempo: 84, jingle: [
    ['E5', 1], ['D#5', 1], ['D5', 1], ['C#5', 3]],
    under: [['A2', 2], ['F2', 1], ['A2', 3]] },
]

const VOICE = { // how each channel sounds; volume is balanced so the lead sits on top
  lead: (wave, duty) => ({ wave, duty, attack: 0.004, volume: wave === 'saw' ? 0.22 : wave === 'sine' || wave === 'triangle' ? 0.42 : 0.26, vibrato: [5.5, 0.008] }),
  bass: { wave: 'triangle', attack: 0.003, volume: 0.5 },
  harmony: { wave: 'pulse', duty: 0.25, attack: 0.002, volume: 0.09 },
  pad: { wave: 'square', duty: 0.5, attack: 0.05, volume: 0.06, lowpass: 1800 },
}

function drumHit(kind, at) {
  if (kind === 'k') return [{ wave: 'sine', freq: 160, to: 45, slideTime: 0.09, attack: 0.001, decay: 0.16, curve: 1.2, volume: 0.75, delay: at }]
  if (kind === 's') return [
    { wave: 'noise', freq: 6500, attack: 0.001, decay: 0.13, highpass: 1200, volume: 0.32, delay: at },
    { wave: 'triangle', freq: 210, to: 130, attack: 0.001, decay: 0.07, volume: 0.25, delay: at },
  ]
  if (kind === 'h') return [{ wave: 'noise', freq: 15000, attack: 0.001, decay: 0.03, highpass: 7000, volume: 0.13, delay: at }]
  if (kind === 'o') return [{ wave: 'noise', freq: 15000, attack: 0.001, decay: 0.16, highpass: 7000, volume: 0.1, delay: at }]
  return []
}

// the melody: a 4-bar phrase written with chord tones on strong beats and steps between, played twice per 8 bars
// (the second time with a new ending that lands on the tonic)
function writeMelody(song, rng, tonic, scale, chords, transpose) {
  const lo = midi(song.lead.low) + transpose, hi = midi(song.lead.high) + transpose
  const pitches = []
  for (let m = lo; m <= hi; m++) if (scale.includes(m % 12)) pitches.push(m) // scale holds pitch classes already in the key
  const nearest = (target, pool) => pool.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a))
  const rhythms = RHYTHMS[song.lead.rhythm]
  const phraseRhythm = [0, 1, 0, 2].map((i) => rhythms[(i + Math.floor(rng() * rhythms.length)) % rhythms.length])
  let prev = nearest((lo + hi) / 2, pitches)
  const phrase = (bar0, ending) => {
    const notes = []
    for (let b = 0; b < 4; b++) {
      const c = chords[(bar0 + b) % chords.length]
      const chordPitches = pitches.filter((m) => c.tones.some((t) => (m - c.root + 120) % 12 === t))
      const r = ending && b === 3 ? 'x---x---' : phraseRhythm[b]
      for (let s = 0; s < 8; s++) {
        if (r[s] !== 'x') continue
        let len = 1
        while (s + len < 8 && r[s + len] === '-') len++
        let m
        if (ending && b === 3 && s === 4) m = nearest(prev, pitches.filter((p) => (p - tonic + 120) % 12 === 0)) // home
        else if (s === 0 || s === 4) m = nearest(prev + (rng() < 0.5 ? -2 : 2), chordPitches.length ? chordPitches : pitches)
        else {
          const i = pitches.indexOf(nearest(prev, pitches))
          const step = [-2, -1, -1, 1, 1, 2][Math.floor(rng() * 6)]
          m = pitches[Math.max(0, Math.min(pitches.length - 1, i + step))]
        }
        notes.push({ bar: bar0 + b, step: s, len: ending && b === 3 && s === 4 ? 4 : len, m })
        prev = m
      }
    }
    return notes
  }
  const a = phrase(0, false), b = phrase(4, true)
  const eight = [...a, ...b]
  // a phrase's first two bars come back in bars 4-5 so the tune has a hook
  const hook = a.filter((n) => n.bar < 2).map((n) => ({ ...n, bar: n.bar + 4 }))
  const melody = [...a, ...hook, ...b.filter((n) => n.bar >= 6)]
  const out = []
  for (let rep = 0; rep < song.bars / 8; rep++) for (const n of (rep % 2 ? eight : melody)) out.push({ ...n, bar: n.bar + rep * 8 })
  return out
}

/** Turn a song into a sound recipe (layers with delays). */
export function songRecipe(song, { seed = 0, key = 0, tempo = 1 } = {}) {
  const beat = 60 / (song.tempo * tempo), eighth = beat / 2, barLen = beat * 4
  const layers = []
  if (song.jingle) {
    let t = 0
    for (const [n, beats] of song.jingle) {
      const d = beats * beat
      layers.push({ ...VOICE.lead('square', 0.5), freq: hz(midi(n) + key), hold: d * 0.85, decay: Math.min(0.6, d), delay: t, volume: 0.3 })
      layers.push({ ...VOICE.harmony, freq: hz(midi(n) + key - 12), hold: d * 0.5, decay: 0.15, delay: t })
      t += d
    }
    t = 0
    for (const [n, beats] of song.under) {
      const d = beats * beat
      layers.push({ ...VOICE.bass, freq: hz(midi(n) + key), hold: d * 0.8, decay: Math.min(0.5, d * 0.5), delay: t })
      t += d
    }
    return { id: song.id, tags: song.tags, layers, level: 0.9 }
  }
  const rng = mulberry(hashSeed('music:' + song.id) + seed * 7919)
  const tonic = (NOTE[song.key[0]] + (song.key[1] === 'b' ? -1 : song.key[1] === '#' ? 1 : 0) + key + 120) % 12
  const scale = SCALES[song.scale].map((s) => (s + tonic) % 12)
  const chords = song.chords.map(chord).map((c) => ({ ...c, root: (c.root + key + 120) % 12 }))
  const lead = VOICE.lead(song.lead.wave, song.lead.duty)
  for (const n of writeMelody(song, rng, tonic, scale, chords, key)) {
    const d = n.len * eighth
    layers.push({ ...lead, freq: hz(n.m), hold: d * 0.7, decay: d * 0.5 + 0.04, delay: n.bar * barLen + n.step * eighth })
  }
  for (let bar = 0; bar < song.bars; bar++) {
    const c = chords[bar % chords.length], t0 = bar * barLen
    const bassRoot = 36 + ((c.root - 0 + 12) % 12) // C2..B2
    const fifth = bassRoot + 7, third = bassRoot + c.tones[1]
    const bassNotes = {
      root8: Array.from({ length: 8 }, (_, i) => [i, 1, i % 4 === 3 ? bassRoot + 12 : bassRoot]),
      rootFifth: [[0, 2, bassRoot], [2, 2, fifth], [4, 2, bassRoot], [6, 2, fifth]],
      walk: [[0, 2, bassRoot], [2, 2, third], [4, 2, fifth], [6, 2, bassRoot + (c.tones[1] === 3 ? 10 : 9)]],
      pulse: [[0, 6, bassRoot], [6, 2, fifth]],
    }[song.bass]
    for (const [s, len, m] of bassNotes) layers.push({ ...VOICE.bass, freq: hz(m), hold: len * eighth * 0.8, decay: 0.06, delay: t0 + s * eighth })
    const chordNotes = c.tones.slice(0, 3).map((t) => 60 + c.root + t - (c.root + t >= 7 ? 12 : 0))
    if (song.harmony === 'arp') {
      for (let s = 0; s < 16; s++) {
        const m = chordNotes[[0, 1, 2, 1][s % 4]] + (s % 8 >= 4 ? 12 : 0)
        layers.push({ ...VOICE.harmony, freq: hz(m), hold: eighth * 0.25, decay: eighth * 0.3, delay: t0 + s * eighth / 2 })
      }
    } else if (song.harmony === 'pad') {
      for (const m of chordNotes) layers.push({ ...VOICE.pad, freq: hz(m), hold: barLen * 0.85, decay: barLen * 0.2, delay: t0 })
    }
    const pats = DRUMS[song.drums]
    const pat = pats[bar % 8 === 7 ? pats.length - 1 : bar % 2 ? 1 % pats.length : 0]
    for (let s = 0; s < 8; s++) for (const l of drumHit(pat[s], t0 + s * eighth)) layers.push(l)
  }
  return { id: song.id, tags: song.tags, layers, loop: song.bars * barLen, level: 0.85 }
}

/** Render a song to a Sound: a seamless loop, or a one-shot jingle. */
export function renderSong(song, opts = {}) {
  const recipe = songRecipe(song, opts)
  const samples = renderSound(recipe, { sampleRate: opts.sampleRate ?? SAMPLE_RATE })
  return new Sound(samples, { id: song.id, loop: !song.jingle })
}
