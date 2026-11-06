// Big moments: meteors, tornadoes, quakes, black holes, summons, revives, and a few playful ones.

const TAU = Math.PI * 2
const out = (t) => 1 - (1 - t) * (1 - t)
const bell = (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
const clamp = (t) => Math.min(1, Math.max(0, t))

function note(p, x, y, v) {
  const s = p.s
  p.disc(x, y, 1.6 * s, v, 0.1)
  p.line(x + 1.3 * s, y, x + 1.3 * s, y - 6 * s, p.px, v)
  p.line(x + 1.3 * s, y - 6 * s, x + 4 * s, y - 4.5 * s, p.px, v)
}

export const SPECTACLE = [
  {
    id: 'fx-meteor', color: 'orange', B: 'stone', frames: 12, fps: 14, tags: ['spectacle', 'fire'], variants: ['ice', 'arcane', 'nature', 'dark'],
    setup(p) { return p.emit({ count: 9, x: p.c, y: p.size - 5 * p.s, speed: [14, 24], angle: [-Math.PI * 0.9, -Math.PI * 0.1], gravity: 70, life: [0.5, 0.8], size: [1, 1.6] }) },
    draw(p, t) {
      const { c, s, size } = p
      const ground = size - 5 * s
      if (t < 0.45) {
        const k = t / 0.45
        const x = size - 3 * s - (size - 3 * s - c) * k, y = 2 * s + (ground - 2 * s) * k
        for (let j = 1; j <= 5; j++) p.use('A').blob(x + j * 2.6 * s, y - j * 3 * s, (3.4 - j * 0.5) * s, 1.05 - j * 0.12, 0.3, j)
        p.use('A').glow(x, y, 3.8 * s, 1.35)
        return
      }
      const k = (t - 0.45) / 0.55
      if (k < 0.45) p.use('A').glow(c, ground, (4 + 12 * k) * s, 1.35 - k)
      p.use('A').arc(c, ground, (4 + 11 * out(k)) * s, (3 - 2.2 * k) * s, Math.PI, TAU, 1.05 - 0.3 * k)
      p.use('B').particles(p.state, k, { shape: 'disc' })
    },
  },
  {
    id: 'fx-tornado', color: 'bone', frames: 8, fps: 14, loop: true, tags: ['spectacle', 'weather', 'loop'], variants: ['fire', 'poison', 'water', 'dark', 'nature'],
    draw(p, t) {
      const { c, s, size } = p
      for (let k = 0; k < 9; k++) {
        const y = size - 3 * s - k * 3.1 * s
        const r = (2 + k * 1.25) * s
        const sway = Math.sin(t * TAU + k * 0.55) * k * 0.35 * s
        for (let a = 0; a < TAU; a += 0.35) {
          const front = Math.sin(a + t * TAU * 2 + k) > 0
          p.pt(c + sway + Math.cos(a + t * TAU * 2 + k) * r, y + Math.sin(a) * r * 0.25, front ? 1.05 : 0.6)
        }
      }
      for (let k = 0; k < 3; k++) {
        const a = t * TAU * 2 + (k / 3) * TAU
        p.disc(c + Math.cos(a) * 9 * s, size - 12 * s - k * 5 * s, 0.9 * s, 0.9, 0.1)
      }
    },
  },
  {
    id: 'fx-quake', color: 'sand', B: 'stone', frames: 10, fps: 12, tags: ['spectacle', 'environment'], variants: ['fire', 'nature', 'ice'],
    setup(p) { return p.emit({ count: 10, x: p.c, y: p.size - 7 * p.s, speed: [8, 16], angle: [-Math.PI * 0.85, -Math.PI * 0.15], gravity: 55, life: [0.6, 1], size: [1.2, 2.2] }) },
    draw(p, t) {
      const { c, s, size } = p
      const y0 = size - 7 * s
      for (const dir of [-1, 1]) {
        let x = c, y = y0
        const reach = out(clamp(t * 1.6)) * 14 * s
        for (let k = 0; k < reach; k += 2.5 * s) {
          const nx = x + dir * 2.5 * s, ny = y0 + ((k / s) % 5 < 2.5 ? 1 : -1) * 1.2 * s
          p.use('B').line(x, y, nx, ny, 1.3 * s, 1.0)
          x = nx; y = ny
        }
      }
      p.use('A').particles(p.state, t, { shape: 'disc', v: 0.95 })
      if (t < 0.5) p.use('A').ring(c, y0, (3 + 12 * t) * s, 1.4 * s, 0.85)
    },
  },
  {
    id: 'fx-black-hole', color: 'purple', B: 'shadow', top: 'B', frames: 8, fps: 10, loop: true, tags: ['spectacle', 'dark', 'loop'], variants: ['blood', 'ice', 'nature', 'holy'],
    setup(p) { return Array.from({ length: 10 }, () => ({ a: p.rng() * TAU, r: 0.5 + p.rng() * 0.5 })) },
    draw(p, t) {
      const { c, s } = p
      p.use('A').ring(c, c, 8 * s, 3 * s, 1.15)
      p.use('A').ring(c, c, 11.5 * s, 1.2 * s, 0.7)
      for (const q of p.state) {
        const u = (t + q.r) % 1
        const r = (14 - 9 * u) * s, a = q.a + u * TAU
        p.use('A').disc(c + Math.cos(a) * r, c + Math.sin(a) * r, 0.8 * s, 0.95, 0.1)
      }
      p.use('B').disc(c, c, 5.5 * s, 0.35, 0)
    },
  },
  {
    id: 'fx-summon', color: 'pink', frames: 10, fps: 12, tags: ['spectacle', 'magic'], variants: ['dark', 'holy', 'fire', 'ice', 'nature'],
    draw(p, t) {
      const { c, s, size } = p
      const ground = size - 6 * s
      const open = out(clamp(t * 2))
      for (let a = 0; a < TAU; a += 0.12) p.pt(c + Math.cos(a) * 12 * s * open, ground + Math.sin(a) * 4 * s * open, 1.0)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + t * 2
        p.pt(c + Math.cos(a) * 8 * s * open, ground + Math.sin(a) * 2.6 * s * open, 1.2)
      }
      const pillar = bell(clamp((t - 0.3) / 0.7))
      if (pillar > 0.05) p.line(c, ground, c, ground - 24 * s * pillar, 5 * s * pillar, 1.0, 0.55)
      for (let k = 0; k < 4; k++) {
        const u = (t * 1.5 + k / 4) % 1
        p.pt(c + (k - 1.5) * 5 * s, ground - u * 20 * s, 1.1 * bell(u))
      }
    },
  },
  {
    id: 'fx-revive', color: 'gold', frames: 12, fps: 12, tags: ['spectacle', 'holy', 'heal'], variants: ['ice', 'nature', 'arcane'],
    setup(p) { return Array.from({ length: 6 }, (_, k) => ({ x: p.c + (k - 2.5) * 4 * p.s, delay: p.rng() * 0.4, k })) },
    draw(p, t) {
      const { c, s, size } = p
      const beam = t < 0.4 ? out(t / 0.4) : 1 - clamp((t - 0.7) / 0.3)
      if (beam > 0.05) p.line(c, 0, c, (size - 4 * s) * Math.min(1, beam * 1.3), 7 * s * beam, 0.75, 1.15)
      p.ring(c, size - 4 * s, (4 + 9 * t) * s, 1.5 * s, 0.95 * (1 - t))
      for (const f of p.state) { // feathers drifting down
        const u = clamp((t - f.delay) / 0.6)
        if (u <= 0 || u >= 1) continue
        const x = f.x + Math.sin((u * 2 + f.k) * TAU) * 2 * s, y = 2 * s + u * 18 * s
        p.arc(x, y, 1.6 * s, 1.2 * s, Math.PI * 0.1, Math.PI * 0.9, 1.1 * bell(u))
      }
    },
  },
  {
    id: 'fx-thorns', color: 'green', B: 'wood', frames: 8, fps: 14, tags: ['spectacle', 'nature'], variants: ['dark', 'ice', 'blood', 'poison'],
    draw(p, t) {
      const { s, size } = p
      const ground = size - 3 * s
      for (let k = 0; k < 5; k++) {
        const grow = bell(clamp((t - k * 0.06) / 0.85))
        const x = (6 + k * 5) * s, h = (8 + (k % 2) * 6) * s * grow
        if (h < 1) continue
        p.use('B').line(x - 2 * s, ground, x, ground - h, 1.8 * s, 0.85).line(x + 2 * s, ground, x, ground - h, 1.8 * s, 0.85)
        p.use('A').line(x, ground, x, ground - h, 1.2 * s, 1.1)
      }
    },
  },
  {
    id: 'fx-electric-field', color: 'gold', frames: 6, fps: 16, loop: true, tags: ['spectacle', 'electric', 'loop'], variants: ['ice', 'arcane', 'nature', 'dark'],
    draw(p, t, i) {
      const { c, s } = p
      p.ring(c, c, 12 * s, p.px, 0.65)
      const r = (k) => Math.abs(Math.sin(i * 17.31 + k * 3.7) * 43758.5) % 1
      for (let b = 0; b < 3; b++) {
        let a = r(b) * TAU, x = c + Math.cos(a) * 12 * s, y = c + Math.sin(a) * 12 * s
        for (let k = 0; k < 4; k++) {
          const nx = x + (c - x) * 0.3 + (r(b * 10 + k) - 0.5) * 6 * s, ny = y + (c - y) * 0.3 + (r(b * 10 + k + 5) - 0.5) * 6 * s
          p.line(x, y, nx, ny, 1.2 * s, 1.15)
          x = nx; y = ny
        }
      }
      p.glow(c, c, 3 * s, 1.1)
    },
  },
  {
    id: 'fx-confetti', color: 'pink', B: 'ice', C: 'gold', frames: 14, fps: 14, outline: 'none', tags: ['spectacle', 'celebration', 'reward'],
    setup(p) {
      const ps = p.emit({ count: 24, x: p.c, y: p.c + 5 * p.s, speed: [20, 34], angle: [-Math.PI * 0.92, -Math.PI * 0.08], gravity: 50, drag: 1.1, life: [0.85, 1] })
      return ps.map((q, k) => ({ ...q, layer: ['A', 'B', 'C'][k % 3], spin: p.rng() * TAU }))
    },
    draw(p, t) {
      const { s } = p
      for (const q of p.state) {
        const tt = t - q.delay
        if (tt < 0 || tt > q.life) continue
        const f = q.k ? (1 - Math.exp(-q.k * tt)) / q.k : tt
        const x = q.x + q.vx * f, y = q.y + q.vy * f + 0.5 * q.g * tt * tt
        const a = q.spin + tt * 12
        // a paper flake: full width face-on, a sliver edge-on as it tumbles
        const w = (1.2 + 0.9 * Math.abs(Math.cos(a))) * s
        p.use(q.layer).line(x - w, y - Math.sin(a) * 0.9 * s, x + w, y + Math.sin(a) * 0.9 * s, 1.7 * s, 1.1)
      }
    },
  },
  {
    id: 'fx-poof', light: 0, color: 'bone', frames: 7, fps: 16, tags: ['spectacle', 'smoke'], variants: ['arcane', 'dark', 'poison', 'fire', 'nature'],
    draw(p, t) {
      const { c, s } = p
      const g = out(t)
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * TAU + 0.4
        p.blob(c + Math.cos(a) * 7 * g * s, c + Math.sin(a) * 6 * g * s, (3.5 + 2 * g) * (1 - t * 0.75) * s, 1.05, 0.2, k + 1)
      }
      if (t < 0.5) p.disc(c, c, 5 * (1 - t * 1.6) * s, 1.1, 0.2)
      if (t > 0.3 && t < 0.8) p.star(c + 8 * s, c - 8 * s, 2.5 * s * bell((t - 0.3) / 0.5), 4, 1.2, 0.2)
    },
  },
  {
    id: 'fx-drip', color: 'lime', frames: 10, fps: 10, loop: true, tags: ['spectacle', 'poison', 'loop'], variants: ['water', 'blood', 'arcane', 'fire'],
    draw(p, t) {
      const { c, s, size } = p
      p.blob(c, 1.5 * s, 4 * s, 0.95, 0.15, 2)
      if (t < 0.45) {
        const g = t / 0.45
        p.disc(c, (3 + 3 * g) * s, (1.5 + 1.2 * g) * s, 1.0, 0.2)
        p.line(c, 2 * s, c, (3 + 3 * g) * s, 1.4 * s, 1.0)
      } else if (t < 0.8) {
        const f = (t - 0.45) / 0.35
        p.disc(c, 7 * s + (size - 13 * s) * f * f, 2.2 * s, 1.1, 0.2)
      } else {
        const k = (t - 0.8) / 0.2
        for (const dir of [-1, 1]) p.disc(c + dir * (2 + 5 * k) * s, size - 4 * s - 3 * bell(k) * s, 1.2 * s, 1.0 - 0.3 * k, 0.2)
        p.line(c - 4 * s, size - 3 * s, c + 4 * s, size - 3 * s, 1.2 * s, 0.9)
      }
    },
  },
  {
    id: 'fx-notes', color: 'purple', frames: 12, fps: 10, loop: true, tags: ['spectacle', 'status', 'loop'], variants: ['holy', 'arcane', 'ice', 'nature'],
    draw(p, t) {
      const { c, s, size } = p
      for (let k = 0; k < 3; k++) {
        const u = (t + k / 3) % 1
        const x = c - 6 * s + k * 6 * s + Math.sin((u * 1.5 + k) * TAU) * 2.5 * s
        note(p, x, size - 6 * s - u * 20 * s, 1.15 * bell(u * 0.95 + 0.05))
      }
    },
  },
]
