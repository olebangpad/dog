// Effect recipes. Each draws one frame at progress t (0 -> 1; loops use 0 -> <1).
// p.c is the center, p.s scales a 32px design to other sizes. See src/fx.js for the painter API.

const TAU = Math.PI * 2
const out = (t) => 1 - (1 - t) * (1 - t)         // ease out
const inn = (t) => t * t                           // ease in
const bell = (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t))) // 0 -> 1 -> 0
const clamp = (t) => Math.min(1, Math.max(0, t))

export const CORE = [
  // ------------------------------------------------------------------ bursts
  {
    id: 'fx-burst', color: 'orange', frames: 8, fps: 16, tags: ['burst'],
    draw(p, t) {
      const { c, s } = p
      if (t < 0.45) p.glow(c, c, (3 + 10 * out(t / 0.45)) * s, 1.4 - t)
      else p.ring(c, c, (9 + 5 * (t - 0.45) / 0.55) * s, (3.5 - 3 * (t - 0.45) / 0.55) * s, 1.05 - 0.4 * t)
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU + 0.2, r = (4 + 11 * out(t)) * s
        p.spark(c + Math.cos(a) * r, c + Math.sin(a) * r, a, (7 * (1 - t) + 1) * s, 1.2 - 0.6 * t)
      }
    },
  },
  {
    id: 'fx-boom', color: 'orange', B: 'stone', frames: 10, fps: 12, tags: ['burst', 'explosion'],
    setup(p) { return Array.from({ length: 7 }, (_, i) => ({ a: (i / 7) * TAU + p.rng(), d: 0.6 + p.rng() * 0.5, seed: i + 1 })) },
    draw(p, t) {
      const { c, s } = p
      const fire = t < 0.45 ? out(t / 0.45) : 1 - (t - 0.45) / 0.4
      if (fire > 0) p.use('A').blob(c, c, (4 + 11 * fire) * s, 0.75 + 0.55 * fire, 0.3, 3)
      if (t > 0.2) {
        const k = (t - 0.2) / 0.8
        for (const q of p.state) {
          const d = (6 + 9 * out(k)) * q.d * s
          p.use('B').blob(c + Math.cos(q.a) * d, c + Math.sin(q.a) * d - 5 * k * s, (2.5 + 3.5 * k) * s, 0.95 * (1 - inn(k)), 0.3, q.seed)
        }
      }
    },
  },
  {
    id: 'fx-shockwave', color: 'ice', frames: 7, fps: 14, tags: ['burst', 'ring'],
    draw(p, t) {
      const { c, s } = p
      p.ring(c, c, (2 + 12.5 * out(t)) * s, (3.2 - 2 * t) * s, 1.2 - 0.85 * t)
      if (t < 0.4) p.glow(c, c, 4 * s, 1.2 - t * 2.5)
    },
  },
  {
    id: 'fx-firework', color: 'pink', frames: 14, fps: 14, tags: ['burst', 'celebration'],
    setup(p) { return Array.from({ length: 18 }, (_, i) => ({ a: (i / 18) * TAU + p.rng() * 0.2, v: 0.75 + p.rng() * 0.35 })) },
    draw(p, t) {
      const { c, s, size } = p
      const top = c - 5 * s
      if (t < 0.3) {
        const y = size - 2 - (size - 2 - top) * out(t / 0.3)
        p.line(c, y, c, y + 6 * s, p.px, 1.15, 0.2)
        return
      }
      const k = (t - 0.3) / 0.7
      if (k < 0.2) p.glow(c, top, (2 + 6 * k * 5) * s, 1.3)
      for (const q of p.state) {
        const r = 12 * out(k) * q.v * s
        const x = c + Math.cos(q.a) * r, y = top + Math.sin(q.a) * r + 7 * inn(k) * s
        p.spark(x, y, q.a, 3 * s * (1 - k), 1.2 - k * 0.9)
      }
    },
  },
  {
    id: 'fx-dust', light: 0, color: 'sand', frames: 8, fps: 14, tags: ['burst', 'movement'], variants: ['steel', 'nature', 'water'],
    draw(p, t) {
      const { c, s, size } = p
      for (const [dx, k] of [[-1, 0], [1, 0.1], [-0.5, 0.2], [0.5, 0.15]]) {
        const u = clamp(t + k)
        p.blob(c + dx * (3 + 10 * out(u)) * s, size - 6 * s - 4 * u * s, (2 + 3 * bell(u * 0.8)) * s, 0.9 * (1 - inn(u)), 0.3, Math.round(k * 10) + 2)
      }
    },
  },
  {
    id: 'fx-impact', color: 'gold', frames: 6, fps: 16, tags: ['burst', 'hit'],
    draw(p, t) {
      const { c, s } = p
      if (t < 0.7) {
        p.star(c, c, (6 + 8 * out(t)) * (1 - inn(t / 0.7)) * s + 2 * s, 4, 1.35, 0.22)
        p.star(c, c, (4 + 5 * out(t)) * (1 - t) * s + s, 4, 1.1, 0.22) // rotated copy below via diagonal sparks
      }
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + Math.PI / 4, r = (4 + 9 * out(t)) * s
        p.spark(c + Math.cos(a) * r, c + Math.sin(a) * r, a, 4 * s * (1 - t) + s, 1.1 - 0.5 * t)
      }
      p.ring(c, c, (5 + 9 * out(t)) * s, (2.2 - 1.6 * t) * s, 0.95)
    },
  },

  // ------------------------------------------------------------------- magic
  {
    id: 'fx-magic-circle', behind: true, color: 'purple', frames: 8, fps: 8, loop: true, tags: ['magic', 'loop'],
    draw(p, t) {
      const { c, s } = p
      const pulse = 0.85 + 0.15 * Math.sin(t * TAU)
      p.ring(c, c, 13 * s, 1.4 * s, 0.75 * pulse)
      p.ring(c, c, 8.5 * s, 1.2 * s, 0.6 * pulse)
      for (let k = 0; k < 3; k++) { // a hexagram that slowly turns
        const a = t * (TAU / 6) + (k / 3) * TAU
        const b = a + TAU / 3
        p.line(c + Math.cos(a) * 8.5 * s, c + Math.sin(a) * 8.5 * s, c + Math.cos(b) * 8.5 * s, c + Math.sin(b) * 8.5 * s, 1, 0.55, 0.55)
      }
      for (let k = 0; k < 8; k++) { // runes riding the band between the rings
        const a = (k / 8) * TAU - t * (TAU / 8)
        p.disc(c + Math.cos(a) * 10.8 * s, c + Math.sin(a) * 10.8 * s, 1.1 * s, k % 2 ? 1.15 : 0.9, 0.2)
      }
    },
  },
  {
    id: 'fx-sparkle-burst', color: 'gold', frames: 10, fps: 12, tags: ['magic', 'reward'],
    setup(p) { return Array.from({ length: 9 }, () => ({ x: 5 + p.rng() * 22, y: 5 + p.rng() * 22, start: Math.floor(p.rng() * 6), big: p.rng() > 0.6 })) },
    draw(p, t, i) {
      for (const q of p.state) {
        const k = i - q.start
        if (k < 0 || k > 3) continue
        const r = [1.5, 3, q.big ? 5 : 4, 2][k] * p.s
        p.star(q.x * p.s, q.y * p.s, r, 4, k === 2 ? 1.25 : 0.95, 0.12)
      }
    },
  },
  {
    id: 'fx-aura', behind: true, color: 'gold', frames: 8, fps: 10, loop: true, tags: ['magic', 'buff', 'loop'],
    draw(p, t) {
      const { c, s, size } = p
      p.ring(c, size - 4 * s, 11 * s, 1.4 * s, 0.7) // ground ring, squashed below by the frame edge
      for (let k = 0; k < 8; k++) {
        const ph = (t + k * 0.29) % 1
        const side = k % 2 ? 1 : -1
        const x = c + side * (6 + (k >> 1) * 1.8) * s + Math.sin((ph + k) * TAU) * 0.8 * s
        p.blob(x, size - 4 * s - ph * 22 * s, (2.4 - 1.4 * ph) * s, 1.2 - 0.6 * ph, 0.2, k + 1)
      }
    },
  },
  {
    id: 'fx-shield', color: 'ice', frames: 8, fps: 8, loop: true, tags: ['magic', 'buff', 'loop'],
    draw(p, t) {
      const { c, s } = p
      const pulse = Math.sin(t * TAU)
      p.ring(c, c, (12.5 + 0.5 * pulse) * s, 1.8 * s, 0.85)
      p.arc(c, c, 10 * s, 1.8 * s, Math.PI * 1.05, Math.PI * 1.45, 1.25)
      p.arc(c, c, 10.5 * s, 1.2 * s, t * TAU, t * TAU + 0.5, 0.95)
      p.arc(c, c, 10.5 * s, 1.2 * s, t * TAU + Math.PI, t * TAU + Math.PI + 0.5, 0.95)
    },
  },
  {
    id: 'fx-teleport', color: 'pink', frames: 10, fps: 12, tags: ['magic', 'movement'],
    draw(p, t) {
      const { c, s, size } = p
      const w = bell(t) * 6 * s
      if (w > 0.4) p.line(c, 0, c, size - 4 * s, w, 1.15 * bell(t), 0.9 * bell(t))
      for (const off of [0, 0.35]) {
        const u = clamp(t * 1.4 - off)
        if (u > 0 && u < 1) p.ring(c, size - 4 * s, (2 + 10 * out(u)) * s, 1.5 * s, 1 - u)
      }
      for (let k = 0; k < 5; k++) {
        const u = (t * 1.6 + k * 0.21) % 1
        p.pt(c + (k - 2) * 4 * s, size - 4 * s - u * 24 * s, 1.1 * (1 - u) * bell(t * 1.2))
      }
    },
  },
  {
    id: 'fx-portal', color: 'purple', frames: 8, fps: 10, loop: true, tags: ['magic', 'loop'],
    draw(p, t) {
      const { c, s } = p
      p.ring(c, c, 12.5 * s, 1.8 * s, 0.8)
      for (let arm = 0; arm < 3; arm++) {
        for (let r = 2; r < 12; r += 0.5) {
          const a = (arm / 3) * TAU + r * 0.42 - t * TAU
          p.disc(c + Math.cos(a) * r * s, c + Math.sin(a) * r * s, 0.9 * s, 0.35 + (12 - r) / 12 * 0.8, 0.2)
        }
      }
      p.glow(c, c, 3.5 * s, 1.2)
    },
  },
  {
    id: 'fx-charge', color: 'ice', frames: 10, fps: 12, tags: ['magic', 'buff'],
    setup(p) { return Array.from({ length: 12 }, () => ({ a: p.rng() * TAU, d: 0.75 + p.rng() * 0.3, lag: p.rng() * 0.3 })) },
    draw(p, t) {
      const { c, s } = p
      for (const q of p.state) {
        const u = clamp((t - q.lag) / 0.7)
        if (u <= 0 || u >= 1) continue
        const r = 14 * q.d * (1 - inn(u)) * s
        p.spark(c + Math.cos(q.a) * r, c + Math.sin(q.a) * r, q.a + Math.PI, 3 * s, 0.8 + 0.3 * u)
      }
      p.glow(c, c, (1.5 + 5 * inn(t)) * s, 0.6 + 0.7 * t)
      if (t > 0.9) p.ring(c, c, 9 * s, 2 * s, 1.1)
    },
  },
  {
    id: 'fx-heal', color: 'lime', frames: 10, fps: 10, tags: ['magic', 'heal'],
    setup(p) { return [[-7, 0], [6, 0.15], [0, 0.3], [-3, 0.45], [8, 0.55]].map(([x, delay]) => ({ x, delay })) },
    draw(p, t) {
      const { c, s, size } = p
      p.ring(c, size - 4 * s, (6 + 6 * t) * s, 1.4 * s, 0.9 * bell(t))
      for (const q of p.state) {
        const u = clamp((t - q.delay) / 0.55)
        if (u <= 0 || u >= 1) continue
        const x = c + q.x * s, y = size - 8 * s - u * 16 * s, v = 1.15 * bell(u * 0.9 + 0.1), r = 2 * s
        p.line(x - r, y, x + r, y, 1.4 * s, v).line(x, y - r, x, y + r, 1.4 * s, v)
      }
    },
  },

  // ---------------------------------------------------------------- elements
  {
    id: 'fx-flame', color: 'orange', frames: 8, fps: 12, loop: true, tags: ['element', 'fire', 'loop'],
    draw(p, t) {
      const { c, s, size } = p
      for (let k = 0; k < 6; k++) {
        const y = size - 5 * s - k * 3.6 * s
        const wob = Math.sin((t + k * 0.17) * TAU) * (0.6 + k * 0.35) * s
        p.blob(c + wob, y, (6.5 - k) * s, 1.3 - k * 0.15, 0.25, k + Math.floor(t * 8))
      }
      const tip = (t * 3) % 1
      p.disc(c + Math.sin(t * TAU * 2) * 2 * s, size - 26 * s - tip * 3 * s, 1.2 * s, 0.7 * (1 - tip), 0.2)
    },
  },
  {
    id: 'fx-ice-shards', color: 'ice', frames: 8, fps: 14, tags: ['element', 'ice'],
    draw(p, t) {
      const { c, s } = p
      if (t < 0.35) p.glow(c, c, 7 * s, 1.2 - t * 2)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + 0.5
        const r0 = (2 + 8 * out(t)) * s, r1 = r0 + (7 - 4 * t) * s
        const v = 1.15 - 0.85 * inn(t)
        p.line(c + Math.cos(a) * r0, c + Math.sin(a) * r0, c + Math.cos(a) * r1, c + Math.sin(a) * r1, 2.2 * s, v, v * 0.7)
      }
      p.ring(c, c, (3 + 9 * out(t)) * s, 1 * s, 0.6 * (1 - t))
    },
  },
  {
    id: 'fx-lightning', color: 'gold', frames: 6, fps: 14, tags: ['element', 'electric'],
    draw(p, t, i) {
      const { c, s, size } = p
      const strength = [0.7, 1.3, 1.2, 0.9, 0.6, 0.4][i] ?? 0.4
      let x = c, y = 0
      const r = (k) => Math.sin(i * 12.9898 + k * 78.233) * 43758.5453 % 1
      while (y < size - 4 * s) {
        const nx = c + (r(y) * 9 - 2) * s * 0.9, ny = y + (3 + Math.abs(r(y + 1)) * 4) * s
        p.line(x, y, nx, ny, i === 1 ? 2 * s : 1.2 * s, strength)
        if (Math.abs(r(y + 2)) > 0.7 && i < 4) p.line(nx, ny, nx + r(y + 3) * 8 * s, ny + 5 * s, 1, strength * 0.7)
        x = nx; y = ny
      }
      if (strength > 0.6) p.glow(x, size - 4 * s, (3 + 3 * strength) * s, strength)
    },
  },
  {
    id: 'fx-poison-cloud', color: 'lime', B: 'shadow', frames: 8, fps: 8, loop: true, dither: true, tags: ['element', 'poison', 'loop'],
    draw(p, t) {
      const { c, s } = p
      for (const [dx, dy, r, k] of [[-5, 3, 6, 0], [5, 3, 6, 0.3], [0, -1, 7, 0.6], [-8, 6, 4, 0.2], [8, 6, 4, 0.8]]) {
        p.blob(c + dx * s, c + dy * s + Math.sin((t + k) * TAU) * s, r * s, 0.62, 0.25, Math.round(k * 10) + 1)
      }
      for (let k = 0; k < 4; k++) {
        const u = (t + k / 4) % 1
        p.ring(c + (k * 5 - 7) * s, c - 3 * s - u * 10 * s, (1 + u) * s, 1, 1.05 * (1 - u))
      }
    },
  },
  {
    id: 'fx-holy-beam', color: 'gold', frames: 8, fps: 12, tags: ['element', 'holy'],
    draw(p, t) {
      const { c, s, size } = p
      const w = bell(t) * 9 * s
      if (w > 0.5) p.line(c, 0, c, size - 3 * s, w, 0.8 * bell(t), 1.15 * bell(t))
      p.glow(c, size - 4 * s, 10 * s * bell(t), 0.9)
      for (let k = 0; k < 4; k++) {
        const a = -Math.PI / 2 + (k - 1.5) * 0.5
        const r = (6 + 10 * t) * s
        p.spark(c + Math.cos(a) * r, size - 4 * s + Math.sin(a) * r, a, 4 * s, 1 - t)
      }
    },
  },
  {
    id: 'fx-dark-vortex', color: 'purple', frames: 8, fps: 10, loop: true, tags: ['element', 'dark', 'loop'],
    draw(p, t) {
      const { c, s } = p
      for (let arm = 0; arm < 4; arm++) {
        for (let r = 3; r < 13; r += 0.6) {
          const a = (arm / 4) * TAU - r * 0.35 + t * TAU * 0.5
          p.disc(c + Math.cos(a) * r * s, c + Math.sin(a) * r * s * 0.7, 0.8 * s, 0.25 + (r / 13) * 0.75, 0.2)
        }
      }
      p.ring(c, c, 3 * s, 1.5 * s, 0.9)
    },
  },

  // ----------------------------------------------------------- combat & misc
  {
    id: 'fx-cross-slash', color: 'bone', frames: 6, fps: 16, tags: ['combat', 'slash'], variants: ['fire', 'ice', 'dark', 'blood', 'holy'],
    draw(p, t, i) {
      const { s, size } = p
      const m = 4 * s, e = size - 4 * s
      const draw = (x0, y0, x1, y1, k) => {
        if (k <= 0) return
        const u = Math.min(1, k)
        const fade = k > 1 ? 1 - (k - 1) : 1
        p.line(x0, y0, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, 2.4 * s * fade, 1.2 * fade, 0.5 * fade)
      }
      draw(m, m, e, e, i / 2)
      draw(e, m, m, e, (i - 1) / 2)
    },
  },
  {
    id: 'fx-claw', color: 'red', frames: 6, fps: 16, tags: ['combat', 'slash'], variants: ['steel', 'dark', 'nature', 'ice'],
    draw(p, t, i) {
      const { s } = p
      for (let k = 0; k < 3; k++) {
        const u = clamp((i - k * 0.6) / 2)
        if (u <= 0) continue
        const fade = i > 3 ? (6 - i) / 3 : 1
        const x0 = (8 + k * 6) * s, y0 = 5 * s
        p.line(x0, y0, x0 + 9 * s * u, y0 + 22 * s * u, 2 * s, 1.15 * fade, 0.4 * fade)
      }
    },
  },
  {
    id: 'fx-dizzy', color: 'gold', frames: 8, fps: 10, loop: true, tags: ['status', 'loop'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 3; k++) {
        const a = t * TAU + (k / 3) * TAU
        const depth = (Math.sin(a) + 1) / 2
        p.star(c + Math.cos(a) * 9 * s, c - 4 * s + Math.sin(a) * 3 * s, (3.5 + 2 * depth) * s, 4, 0.9 + 0.4 * depth, 0.35)
      }
    },
  },
  {
    id: 'fx-sleep', color: 'bone', clean: false, frames: 8, fps: 6, loop: true, tags: ['status', 'loop'], variants: ['water', 'arcane', 'ice'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 3; k++) {
        const u = (t + k / 3) % 1
        const scale = u < 0.4 ? 1 : 2 // letters grow as they float away
        // starts just above-right of a character's head (32x32 character frame) and drifts up and away
        p.glyph('Z', (19 + u * 8) * s, (12 - u * 12) * s, 1.15 * bell(u * 0.95 + 0.05), scale * s)
      }
    },
  },
  {
    id: 'fx-splash', color: 'blue', frames: 9, fps: 14, tags: ['element', 'water'], variants: ['blood', 'poison', 'fire'],
    setup(p) { return Array.from({ length: 9 }, (_, k) => ({ vx: (k - 4) * 1.2 + (p.rng() - 0.5), vy: 7 + p.rng() * 6 })) },
    draw(p, t) {
      const { c, s, size } = p
      const base = size - 5 * s
      p.ring(c, base, (2 + 10 * out(t)) * s, 1.4 * s, 0.9 * (1 - t))
      for (const q of p.state) {
        const x = c + q.vx * t * 3 * s, y = base - (q.vy * t - 9 * t * t) * 3 * s
        if (y < base) p.disc(x, y, 1.1 * s, 1.1 - 0.6 * t, 0.2)
      }
    },
  },
  {
    id: 'fx-coin-pop', color: 'gold', frames: 8, fps: 14, tags: ['reward'],
    draw(p, t) {
      const { c, s } = p
      if (t < 0.8) p.ring(c, c, (3 + 9 * out(t)) * s, (2.4 - 2 * t) * s, 1.05)
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * TAU + Math.PI / 4
        const r = (5 + 7 * out(t)) * s
        p.star(c + Math.cos(a) * r, c + Math.sin(a) * r, (3.5 - 2.5 * t) * s, 4, 1.2, 0.2)
      }
      if (t < 0.3) p.glow(c, c, 4 * s, 1.3)
    },
  },

  {
    id: 'fx-barrier', color: 'ice', frames: 8, fps: 10, loop: true, tags: ['magic', 'loop'], variants: ['holy', 'arcane', 'nature', 'fire'],
    draw(p, t) {
      const { c, s } = p
      const pulse = 0.8 + 0.2 * Math.sin(t * TAU)
      const hex = (r, v) => {
        for (let k = 0; k < 6; k++) {
          const a0 = (k * TAU) / 6 - Math.PI / 2, a1 = a0 + TAU / 6
          p.line(c + Math.cos(a0) * r, c + Math.sin(a0) * r, c + Math.cos(a1) * r, c + Math.sin(a1) * r, 1.6 * s, v)
        }
      }
      hex(13 * s, 0.1 + pulse)
      hex(7.5 * s, 0.6 * pulse)
      const a = t * TAU - Math.PI / 2
      p.star(c + Math.cos(a) * 12 * s, c + Math.sin(a) * 12 * s, 2.5 * s, 4, 1.25, 0.2)
    },
  },
  {
    id: 'fx-drain', color: 'red', frames: 8, fps: 12, loop: true, tags: ['magic', 'loop'], variants: ['dark', 'arcane', 'nature', 'ice'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 10; k++) {
        const u = (t + k / 10) % 1, a = k * 2.4 + u * 1.5, r = (14 - 12 * u) * s
        p.disc(c + Math.cos(a) * r, c + Math.sin(a) * r, (1.4 - 0.6 * u) * s, 0.6 + 0.6 * u, 0.1)
      }
      p.glow(c, c, (3 + Math.sin(t * TAU * 2)) * s, 1.25)
    },
  },
  {
    id: 'fx-soul', color: 'ice', frames: 8, fps: 10, tags: ['magic'], variants: ['holy', 'arcane', 'dark', 'nature'],
    draw(p, t) {
      const { c, s } = p
      const y = (26 - 18 * out(t)) * s, x = c + Math.sin(t * TAU) * 2 * s, v = 1.15 - 0.6 * t
      p.blob(x, y, 3.5 * s, v, 0.15, 4)
      for (let k = 1; k <= 4; k++) p.disc(x - Math.sin((t - k * 0.06) * TAU) * 1.5 * s, y + k * 2.2 * s, (3 - k * 0.6) * s, v * (1 - k * 0.18), 0.2)
    },
  },
  {
    id: 'fx-curse', color: 'purple', frames: 8, fps: 10, loop: true, tags: ['magic', 'loop'], variants: ['blood', 'poison', 'ice'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 3; k++) {
        const a0 = t * TAU + (k * TAU) / 3
        p.arc(c, c - 2 * s, (4 + k * 3) * s, 1.6 * s, a0, a0 + 2, 1.05 - k * 0.15)
      }
      for (let k = 0; k < 5; k++) {
        const u = (t + k / 5) % 1
        p.pt(c + (k - 2) * 4 * s, c + 3 * s + u * 11 * s, 1.05 - 0.6 * u)
      }
    },
  },
  {
    id: 'fx-haste', color: 'lime', frames: 8, fps: 14, loop: true, tags: ['magic', 'status', 'loop'], variants: ['holy', 'ice', 'fire', 'arcane'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 3; k++) {
        const u = (t + k / 3) % 1, y = (26 - 20 * u) * s, v = 1.2 * bell(u)
        p.line(c - 5 * s, y + 4 * s, c, y, 1.8 * s, v)
        p.line(c, y, c + 5 * s, y + 4 * s, 1.8 * s, v)
      }
    },
  },
  {
    id: 'fx-slow', color: 'ice', frames: 8, fps: 8, loop: true, tags: ['magic', 'status', 'loop'], variants: ['arcane', 'holy', 'dark'],
    draw(p, t) {
      const { c, s } = p
      p.ring(c, c, 10 * s, 1.6 * s, 1.0)
      for (let k = 0; k < 4; k++) { const a = (k * TAU) / 4; p.pt(c + Math.cos(a) * 7.5 * s, c + Math.sin(a) * 7.5 * s, 1.1) }
      const a = t * TAU - Math.PI / 2
      p.line(c, c, c + Math.cos(a) * 7 * s, c + Math.sin(a) * 7 * s, 1.4 * s, 1.15)
      p.line(c, c, c + 3.5 * s, c - 2 * s, 1.4 * s, 1.0)
      p.disc(c, c, 1.4 * s, 1.2, 0.1)
    },
  },
  {
    id: 'fx-holy-cross', color: 'gold', frames: 8, fps: 12, tags: ['magic', 'heal'], variants: ['ice', 'arcane', 'blood', 'nature'],
    draw(p, t) {
      const { c, s } = p
      const g = t < 0.3 ? out(t / 0.3) : 1 - clamp((t - 0.7) / 0.3)
      if (g <= 0) return
      p.glow(c, c, 12 * s * g, 0.7 * g)
      p.line(c, c - 11 * s * g, c, c + 11 * s * g, 3 * s, 0.1 + 1.2 * g)
      p.line(c - 7 * s * g, c - 3 * s, c + 7 * s * g, c - 3 * s, 3 * s, 0.1 + 1.2 * g)
    },
  },
  {
    id: 'fx-ice-spike', color: 'ice', frames: 8, fps: 14, tags: ['element', 'attack'], variants: ['arcane', 'poison', 'dark', 'holy'],
    draw(p, t) {
      const { c, s, size } = p
      const ground = size - 3 * s
      const up = t < 0.35 ? out(t / 0.35) : 1, fade = 1 - clamp((t - 0.7) / 0.3)
      if (fade <= 0) return
      for (const [dx, h] of [[-7, 10], [0, 17], [7, 12]]) {
        const x = c + dx * s, top = ground - h * s * up
        p.line(x - 3 * s, ground, x, top, 1.6 * s, 0.8 * fade, 1.2 * fade)
        p.line(x + 3 * s, ground, x, top, 1.6 * s, 0.7 * fade, 1.15 * fade)
        p.line(x, ground, x, top, 1.6 * s, 0.95 * fade, 1.25 * fade)
      }
      p.line(c - 12 * s, ground, c + 12 * s, ground, p.px, 0.65 * fade)
    },
  },
  {
    id: 'fx-vine', color: 'green', frames: 8, fps: 12, tags: ['element', 'nature'], variants: ['poison', 'dark', 'holy', 'blood'],
    draw(p, t) {
      const { c, s, size } = p
      const grow = out(clamp(t * 1.4)) * 22, fade = 1 - clamp((t - 0.8) / 0.2)
      for (const [dx, ph] of [[-5, 0], [5, 2]]) {
        let prev = null
        for (let y = 0; y <= grow; y += 0.5) {
          const x = c + dx * s + Math.sin(y * 0.45 + ph) * 3 * s, yy = size - 2 * s - y * s
          if (prev) p.line(prev[0], prev[1], x, yy, 1.5 * s, 1.0 * fade)
          if (y > 0 && y % 6 === 0) p.disc(x + (Math.sin(y + ph) > 0 ? 2 : -2) * s, yy, 1.7 * s, 1.15 * fade, 0.2)
          prev = [x, yy]
        }
      }
    },
  },
  {
    id: 'fx-checkmark', color: 'green', frames: 8, fps: 12, tags: ['reward', 'feedback'], variants: ['holy', 'ice', 'arcane'],
    draw(p, t) {
      const { c, s } = p
      const g = out(clamp(t / 0.5)), fade = 1 - clamp((t - 0.8) / 0.2)
      const A = [c - 7 * s, c], B = [c - 2 * s, c + 5 * s], C = [c + 8 * s, c - 6 * s]
      const done = g * 2.6, u1 = Math.min(1, done), u2 = clamp((done - 1) / 1.6)
      p.line(A[0], A[1], A[0] + (B[0] - A[0]) * u1, A[1] + (B[1] - A[1]) * u1, 3 * s, 1.15 * fade)
      if (u2 > 0) p.line(B[0], B[1], B[0] + (C[0] - B[0]) * u2, B[1] + (C[1] - B[1]) * u2, 3 * s, 1.15 * fade)
      if (t > 0.45 && t < 0.85) p.ring(c, c, (8 + 20 * (t - 0.45)) * s, 1.4 * s, 0.95 * (1 - (t - 0.45) / 0.4))
    },
  },
  {
    id: 'fx-exclaim', color: 'gold', frames: 8, fps: 12, tags: ['reward', 'feedback'], variants: ['blood', 'ice', 'arcane'],
    draw(p, t) {
      const { c, s } = p
      const pop = t < 0.3 ? out(t / 0.3) * 1.15 : 1 + 0.15 * Math.sin((t - 0.3) * TAU * 2) * (1 - t)
      const fade = 1 - clamp((t - 0.85) / 0.15)
      p.line(c, c - 9 * s * pop, c, c + 2 * s * pop, 3.2 * s * pop, 1.2 * fade)
      p.disc(c, c + 6 * s * pop, 1.8 * s * pop, 1.2 * fade, 0.1)
      if (t < 0.45) for (const a of [-2.4, -1.57, -0.7]) p.spark(c + Math.cos(a) * 12 * s, c - 2 * s + Math.sin(a) * 12 * s, a, 4 * s, 1.1 * (1 - t * 2))
    },
  },
  {
    id: 'fx-countdown', color: 'gold', clean: false, frames: 16, fps: 4, tags: ['reward', 'feedback'], variants: ['blood', 'ice', 'nature'],
    draw(p, t, i) {
      const { c, s } = p
      const step = Math.floor(i / 4), u = (i % 4) / 4
      const text = ['3', '2', '1', 'GO'][step]
      const k = Math.max(1, Math.round((text.length > 1 ? 3 : 4) * s))
      const x0 = c - ((text.length * 5 - 2) * k) / 2
      for (let n = 0; n < text.length; n++) p.glyph(text[n], x0 + n * 5 * k, c - (5 * k) / 2, 1.2 - u * 0.35, k)
      p.ring(c, c, (14 - u * 3) * s, 1.4 * s, 0.95 - u * 0.5)
    },
  },
]
