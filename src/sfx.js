// SFX engine: game sounds as tiny recipes, the way src/fx.js does effects.
//
// A sound is a list of layers. Each layer is one voice with a wave, an envelope and optional
// pitch slides, pitch steps, vibrato, filters and repeats. The engine renders every layer,
// mixes them, adds an element's "flavor" layers if asked, and limits the result. Pure math, so
// a recipe always gives the same samples, in Node and in the browser.
//
//   { id: 'coin', tags: ['pickup'], layers: [
//     { wave: 'square', notes: ['B5', 'E6'], every: 0.06, hold: 0.06, decay: 0.3 },
//   ] }
//
// Layer fields (seconds and Hz; all optional except what the sound needs):
//   wave      'square' | 'pulse' | 'saw' | 'triangle' | 'sine' | 'noise'        (default 'square')
//   freq, to  start / end pitch (Hz or a note name like 'C5'); slide: 'exp' | 'lin'; slideTime
//   notes     pitch steps instead of freq: ['C5', 'E5', 'G5'], every: 0.08 (or one length per note)
//   attack, hold, decay, curve   envelope: ramp up, stay, fade with (1 - u) ** curve (default 1.6)
//   volume, delay                 loudness and start time in the mix
//   duty, dutyTo                  pulse width for square/pulse (0.5 = square)
//   vibrato: [rate, depth]        pitch wobble (depth 0.05 = 5%); tremolo: [rate, depth] for loudness
//   lowpass, lowpassTo, highpass  simple one-pole filters (Hz); crush: bits; rate: sample-and-hold Hz
//   repeat: { count, every, pitch, fade, jitter }   retrigger the layer (pops, echoes, rapid fire)
// For noise, freq is how often a new random value is picked: high = hiss, low = gritty rumble.
//
// Recipe fields: id, tags, layers, level (loudness, 1 = normal, 0.6 = a quiet UI blip), loop (seamless loop length).

import { hashSeed, mulberry } from './fx.js'

export const SAMPLE_RATE = 22050
const TAU = Math.PI * 2
const LOUDNESS = 0.3 // target RMS of the loudest 20 ms
const NOTE_INDEX = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 }

/** 'A4' -> 440, 'C#5' -> 554.37, 'Eb3' -> 155.56. Numbers pass through. */
export function note(n) {
  if (typeof n === 'number') return n
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(n)
  if (!m) throw new Error(`pixspell sfx: "${n}" is not a note (try 'C5' or 440)`)
  const semis = NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) - 4) * 12
  return 440 * 2 ** (semis / 12)
}

const lerp = (a, b, u) => a + (b - a) * u
const expLerp = (a, b, u) => (a > 0 && b > 0 ? a * (b / a) ** u : lerp(a, b, u))
const layerLength = (l) => (l.attack ?? 0.005) + (l.hold ?? 0) + (l.decay ?? 0.1)

/** Render one layer (one trigger) into out[], starting at `start` samples. */
function renderLayer(out, l, start, { sr, pitch, rng, volume = 1, freqMul = 1 }) {
  const attack = l.attack ?? 0.005, hold = l.hold ?? 0, decay = l.decay ?? 0.1, curve = l.curve ?? 1.6
  const len = attack + hold + decay
  const n = Math.ceil(len * sr)
  const wave = l.wave ?? 'square'
  const f0 = note(l.freq ?? 440) * pitch * freqMul
  const f1 = l.to != null ? note(l.to) * pitch * freqMul : f0
  const slideTime = l.slideTime ?? len
  const slide = l.slide === 'lin' ? lerp : expLerp
  // pitch steps: notes (absolute) or steps (multipliers of freq), each lasting `every` seconds
  const steps = l.notes ? l.notes.map((x) => note(x) * pitch * freqMul) : l.steps ? l.steps.map((m) => m * f0) : null
  const stepEnds = steps && steps.map((_, i) => (Array.isArray(l.every) ? l.every.slice(0, i + 1).reduce((a, b) => a + b, 0) : (i + 1) * (l.every ?? 0.08)))
  const vib = l.vibrato, trem = l.tremolo
  const lp0 = l.lowpass, lp1 = l.lowpassTo ?? l.lowpass, hp = l.highpass
  const crushQ = l.crush ? 2 ** (l.crush - 1) : 0
  const holdEvery = l.rate ? sr / l.rate : 0
  const vol = (l.volume ?? 0.5) * volume
  let phase = 0, noiseVal = rng() * 2 - 1, lp = 0, hpLow = 0, held = 0, step = 0
  for (let i = 0; i < n; i++) {
    const idx = start + i
    if (idx < 0) continue
    if (idx >= out.length) break
    const t = i / sr, u = Math.min(1, t / slideTime)
    let f
    if (steps) {
      while (step < steps.length - 1 && t >= stepEnds[step]) step++
      f = steps[step] * (l.to != null ? expLerp(1, f1 / f0, u) : 1)
    } else f = slide(f0, f1, u)
    if (vib) f *= 1 + vib[1] * Math.sin(TAU * vib[0] * t)
    const prev = phase
    phase += f / sr
    let x
    const ph = phase % 1
    switch (wave) {
      case 'sine': x = Math.sin(TAU * phase); break
      case 'triangle': x = 4 * Math.abs(ph - 0.5) - 1; break
      case 'saw': x = 2 * ph - 1; break
      case 'noise':
        if (Math.floor(phase) !== Math.floor(prev)) noiseVal = rng() * 2 - 1
        x = noiseVal
        break
      default: { // square / pulse
        const duty = l.dutyTo != null ? lerp(l.duty ?? 0.5, l.dutyTo, u) : (l.duty ?? (wave === 'pulse' ? 0.25 : 0.5))
        x = ph < duty ? 1 : -1
      }
    }
    if (lp0) {
      const fc = expLerp(lp0, lp1, Math.min(1, t / len))
      lp += (1 - Math.exp((-TAU * fc) / sr)) * (x - lp)
      x = lp
    }
    if (hp) {
      hpLow += (1 - Math.exp((-TAU * hp) / sr)) * (x - hpLow)
      x -= hpLow
    }
    if (crushQ) x = Math.round(x * crushQ) / crushQ
    if (holdEvery) {
      if (i % Math.max(1, Math.round(holdEvery)) === 0) held = x
      x = held
    }
    let env = t < attack ? t / attack : t < attack + hold ? 1 : Math.max(0, 1 - (t - attack - hold) / decay) ** curve
    if (trem) env *= 1 - trem[1] * (0.5 + 0.5 * Math.sin(TAU * trem[0] * t))
    out[idx] += x * env * vol
  }
}

/** Total length of a layer including repeats and delay, in seconds. */
function layerEnd(l) {
  const r = l.repeat
  return (l.delay ?? 0) + layerLength(l) + (r ? (r.count - 1) * r.every * (1 + (r.jitter ?? 0)) : 0)
}

/**
 * Render a recipe to samples.
 * opts: seed (0 = the canonical sound; others vary pitch and timing a little), pitch (multiplier),
 * flavor (extra layers, e.g. an element), sampleRate.
 */
export function renderSound(recipe, { seed = 0, pitch = 1, flavor = null, sampleRate = SAMPLE_RATE } = {}) {
  const sr = sampleRate
  const vary = seed ? mulberry(hashSeed(recipe.id) + seed * 7919) : null
  const p = pitch * (vary ? 1 + (vary() - 0.5) * 0.12 : 1)
  const stretch = vary ? 1 + (vary() - 0.5) * 0.16 : 1
  let layers = recipe.layers.map((l) => (stretch === 1 ? l : { ...l, hold: (l.hold ?? 0) * stretch, decay: (l.decay ?? 0.1) * stretch }))
  const baseLen = Math.max(...layers.map(layerEnd))
  if (flavor) layers = layers.concat(flavor(baseLen))
  const loop = recipe.loop
  const fadeLen = loop ? Math.min(0.25, loop / 4) : 0
  const length = loop ? loop + fadeLen : Math.max(...layers.map(layerEnd)) + 0.02
  const out = new Float32Array(Math.ceil(length * sr))
  layers.forEach((l, k) => {
    const rng = mulberry(hashSeed(recipe.id) + k * 101 + seed * 7919)
    const r = l.repeat
    const count = r ? r.count : 1
    for (let j = 0; j < count; j++) {
      const jitter = r?.jitter ? (rng() - 0.5) * 2 * r.jitter * r.every : 0
      const at = (l.delay ?? 0) + (r ? j * r.every + jitter : 0)
      const volume = r ? (1 - (r.fade ?? 0)) ** j * (r.jitter ? 0.55 + 0.45 * rng() : 1) : 1
      renderLayer(out, l, Math.round(at * sr), { sr, pitch: p, rng, volume, freqMul: r?.pitch ? r.pitch ** j : 1 })
    }
  })
  let samples = out
  if (loop) { // seamless: cross-fade the tail into the head, then cut to the loop length
    const n = Math.round(loop * sr), f = Math.round(fadeLen * sr)
    samples = out.slice(0, n)
    for (let i = 0; i < f; i++) {
      const w = i / f
      samples[i] = out[i] * w + out[n + i] * (1 - w)
    }
  }
  // remove DC offset, then set the loudness: the loudest 20 ms should reach the same RMS for every
  // sound (times its level), so a square-wave jingle isn't twice as loud as an explosion; never clip
  let mean = 0
  for (const v of samples) mean += v
  mean /= samples.length || 1
  let peak = 0, loudest = 0, sum = 0
  const win = Math.max(1, Math.round(0.02 * sr))
  for (let i = 0; i < samples.length; i++) {
    const v = (samples[i] -= mean)
    peak = Math.max(peak, Math.abs(v))
    sum += v * v
    if (i >= win) sum -= samples[i - win] ** 2
    if (i >= win - 1) loudest = Math.max(loudest, Math.sqrt(Math.max(0, sum) / win))
  }
  if (!loudest) loudest = Math.sqrt(sum / samples.length)
  const gain = peak > 0 ? Math.min(0.95 / peak, (LOUDNESS * (recipe.level ?? 1)) / loudest) : 0
  const edge = loop ? 0 : Math.min(64, samples.length >> 2)
  for (let i = 0; i < samples.length; i++) {
    let g = gain
    if (edge && i < 16) g *= i / 16
    if (edge && i >= samples.length - edge) g *= (samples.length - 1 - i) / edge
    samples[i] *= g
  }
  return samples
}

// ----------------------------------------------------------------- output

let audioContext = null
function getAudioContext() {
  if (!audioContext) {
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext
    if (!AC) throw new Error('pixspell sfx: play() needs a browser (Web Audio). In Node use .save(path) or .toWAV()')
    audioContext = new AC()
  }
  if (audioContext.state === 'suspended') audioContext.resume()
  return audioContext
}

/** A rendered sound: mono samples in -1..1 plus ways to play and export them. */
export class Sound {
  constructor(samples, { sampleRate = SAMPLE_RATE, id = 'sound', loop = false } = {}) {
    this.samples = samples
    this.sampleRate = sampleRate
    this.id = id
    this.loop = loop
    this._buffers = new WeakMap()
  }

  get duration() { return this.samples.length / this.sampleRate }

  /** 16-bit PCM mono WAV file bytes. */
  toWAV() {
    const n = this.samples.length
    const out = new Uint8Array(44 + n * 2)
    const dv = new DataView(out.buffer)
    const str = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i) }
    str(0, 'RIFF'); dv.setUint32(4, 36 + n * 2, true); str(8, 'WAVE')
    str(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true)
    dv.setUint32(24, this.sampleRate, true); dv.setUint32(28, this.sampleRate * 2, true)
    dv.setUint16(32, 2, true); dv.setUint16(34, 16, true)
    str(36, 'data'); dv.setUint32(40, n * 2, true)
    for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, this.samples[i])) * 32767), true)
    return out
  }

  /** data:audio/wav;base64,... (works as an <audio> src or a loader URL). */
  toDataURL() {
    const bytes = this.toWAV()
    let bin = ''
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
    const b64 = typeof btoa === 'function' ? btoa(bin) : Buffer.from(bytes).toString('base64')
    return `data:audio/wav;base64,${b64}`
  }

  /** A Web Audio AudioBuffer for your own audio graph. */
  toAudioBuffer(context = getAudioContext()) {
    let buf = this._buffers.get(context)
    if (!buf) {
      buf = context.createBuffer(1, this.samples.length, this.sampleRate)
      buf.copyToChannel(this.samples, 0)
      this._buffers.set(context, buf)
    }
    return buf
  }

  /** Browser: play now. Returns { stop() }. Call from a click or key handler the first time (autoplay rules). */
  play({ volume = 1, loop = this.loop, rate = 1 } = {}) {
    const ctx = getAudioContext()
    const src = ctx.createBufferSource()
    src.buffer = this.toAudioBuffer(ctx)
    src.loop = loop
    src.playbackRate.value = rate
    const gain = ctx.createGain()
    gain.gain.value = volume
    src.connect(gain).connect(ctx.destination)
    src.start()
    return { stop: () => { try { src.stop() } catch {} }, source: src }
  }

  /** Node only: write a .wav file. */
  async save(path) {
    const { writeFile } = await import('node:fs/promises')
    await writeFile(path, this.toWAV())
    return path
  }
}
