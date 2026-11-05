// Environment: light, smoke, lava, water, fog, wind. Most loop; the "seamless" ones tile over a whole map.

const TAU = Math.PI * 2
const bell = (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
const scatter = (p, n) => Array.from({ length: n }, () => ({ x: p.rng() * p.size, y: p.rng() * p.size, k: p.rng() }))

export const ENVIRONMENT = [
  {
    id: 'fx-glow', color: 'gold', frames: 8, fps: 8, loop: true, dither: true, outline: 'none', behind: true, tags: ['environment', 'light', 'loop'],
    variants: ['fire', 'ice', 'nature', 'arcane', 'dark'],
    draw(p, t) {
      const { c, s } = p
      const pulse = 0.9 + 0.1 * Math.sin(t * TAU)
      p.glow(c, c, 15 * s * pulse, 0.62)
      p.glow(c, c, 8 * s * pulse, 0.95)
    },
  },
  {
    id: 'fx-smoke-column', color: 'stone', frames: 12, fps: 10, loop: true, tags: ['environment', 'smoke', 'loop'],
    variants: ['steel', 'dark', 'poison', 'arcane'],
    draw(p, t) {
      const { c, s, size } = p
      for (let k = 0; k < 5; k++) {
        const u = (t + k / 5) % 1
        const x = c + Math.sin((u * 1.5 + k * 0.3) * TAU) * 3 * s * u
        p.blob(x, size - 3 * s - u * 26 * s, (2 + 4 * u) * s, 1.05 - 0.55 * u, 0.3, k + 1)
      }
    },
  },
  {
    // molten orange underneath, dark crust plates drifting on top (layer B wins where it's drawn), bubbles popping
    id: 'fx-lava', color: 'orange', B: 'red', top: 'B', frames: 16, fps: 8, loop: true, wrap: true, tags: ['environment', 'fire', 'seamless', 'loop'],
    variants: ['poison', 'ice', 'arcane', 'dark'],
    setup(p) { return { crust: scatter(p, 5), bubbles: scatter(p, 4) } },
    draw(p, t) {
      const { s, size } = p
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) p.dot(x, y, 0.72)
      for (const c of p.state.crust) p.use('B').blob(c.x + t * size, c.y, (3 + c.k * 3) * s, 0.42, 0.35, Math.round(c.k * 9) + 1)
      for (const b of p.state.bubbles) {
        const u = (t * 2 + b.k) % 1
        if (u < 0.55) p.use('A').ring(b.x, b.y, (0.8 + u * 3) * s, 1.1 * s, 1.15)
        else if (u < 0.65) p.use('A').disc(b.x, b.y, 1.5 * s, 1.25, 0.1)
      }
    },
  },
  {
    id: 'fx-glints', color: 'ice', frames: 16, fps: 8, loop: true, wrap: true, tags: ['environment', 'water', 'seamless', 'loop'],
    variants: ['holy', 'arcane', 'nature'],
    setup(p) { return scatter(p, 7) },
    draw(p, t) {
      const { s } = p
      for (const g of p.state) {
        const u = (t * 2 + g.k) % 1
        if (u < 0.35) {
          const k = bell(u / 0.35)
          p.line(g.x - 2 * k * s, g.y, g.x + 2 * k * s, g.y, 1, 1.15 * k)
          if (k > 0.7) p.dot(g.x, g.y - 1, 1.2).dot(g.x, g.y + 1, 1.2)
        }
      }
    },
  },
  {
    id: 'fx-fog', color: 'bone', frames: 16, fps: 6, loop: true, wrap: true, dither: true, outline: 'none', tags: ['environment', 'weather', 'seamless', 'loop'],
    variants: ['dark', 'poison', 'arcane', 'water'],
    setup(p) { return scatter(p, 5) },
    draw(p, t) {
      const { s, size } = p
      for (const f of p.state) {
        const x = f.x + t * size, y = f.y + Math.sin((t + f.k) * TAU) * 2 * s
        p.glow(x, y, (8 + f.k * 5) * s, 0.5 + 0.12 * f.k)
      }
    },
  },
  {
    id: 'fx-sunrays', color: 'gold', frames: 8, fps: 6, loop: true, dither: true, outline: 'none', tags: ['environment', 'light', 'loop'],
    variants: ['holy', 'ice', 'nature', 'arcane'],
    draw(p, t) {
      const { s, size } = p
      for (let k = 0; k < 4; k++) {
        const v = 0.48 + 0.12 * Math.sin((t + k * 0.3) * TAU)
        const x0 = (4 + k * 8) * s
        p.line(x0, 0, x0 - 10 * s, size, (2.5 + k % 2) * s, v, v * 0.45)
      }
    },
  },
  {
    id: 'fx-wind', color: 'bone', frames: 8, fps: 14, loop: true, wrap: true, outline: 'none', tags: ['environment', 'weather', 'seamless', 'loop'],
    variants: ['nature', 'ice', 'fire', 'arcane'],
    setup(p) { return scatter(p, 5) },
    draw(p, t) {
      const { s, size } = p
      for (const w of p.state) {
        const x = w.x + t * size * 2
        const len = (6 + w.k * 6) * s
        p.line(x - len, w.y, x, w.y, 1, 0.45, 0.95)
        if (w.k > 0.6) p.arc(x + 1.5 * s, w.y - 1.5 * s, 1.5 * s, 1, -Math.PI / 2, Math.PI / 2, 0.9)
      }
    },
  },
  {
    id: 'fx-motes', color: 'gold', frames: 16, fps: 8, loop: true, wrap: true, tags: ['environment', 'light', 'seamless', 'loop'],
    variants: ['ice', 'nature', 'arcane', 'steel'],
    setup(p) { return scatter(p, 8) },
    draw(p, t) {
      const { s, size } = p
      for (const m of p.state) {
        const x = m.x + Math.sin((t + m.k) * TAU) * 3 * s, y = m.y - t * size
        const tw = 0.7 + 0.4 * Math.sin((t * 3 + m.k * 5) * TAU)
        p.disc(x, y, 0.8 * s, tw, 0.1)
      }
    },
  },
  {
    id: 'fx-geyser', color: 'ice', frames: 10, fps: 12, tags: ['environment', 'water'], variants: ['water', 'fire', 'poison', 'blood'],
    setup(p) { return p.emit({ count: 14, x: p.c, y: p.size - 4 * p.s, speed: [26, 38], angle: [-Math.PI / 2 - 0.25, -Math.PI / 2 + 0.25], gravity: 60, life: [0.8, 1] }) },
    draw(p, t) {
      const { c, s, size } = p
      const h = bell(t) * 22 * s
      if (h > 1) p.line(c, size - 4 * s, c, size - 4 * s - h, 3.5 * s * bell(t), 1.15, 0.8)
      p.particles(p.state, t, { shape: 'disc', v: 1.05 })
      p.ring(c, size - 4 * s, (3 + 8 * t) * s, 1.3 * s, 0.9 * (1 - t))
    },
  },
  {
    id: 'fx-ripple', color: 'ice', frames: 12, fps: 10, loop: true, tags: ['environment', 'water', 'loop'], variants: ['water', 'poison', 'blood', 'arcane'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 3; k++) {
        const u = (t + k / 3) % 1
        const r = (2 + 12 * u) * s
        // squashed ellipse: water seen from the top-down camera
        for (let a = 0; a < TAU; a += 0.08) p.dot(c + Math.cos(a) * r, c + Math.sin(a) * r * 0.5, 1.05 * (1 - u) + 0.25)
      }
    },
  },
]
