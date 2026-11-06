// Weather and ambience. All seamless (wrap: true) and looping: tile them over the whole screen.
// Everything travels a whole number of tile widths per loop, so the loop has no jump either.

const TAU = Math.PI * 2

const scatter = (p, n) => Array.from({ length: n }, () => ({ x: p.rng() * p.size, y: p.rng() * p.size, k: p.rng() }))

export const AMBIENT = [
  {
    id: 'fx-rain', color: 'ice', frames: 8, fps: 16, loop: true, wrap: true, outline: 'none', tags: ['weather', 'seamless', 'loop'],
    variants: ['water', 'blood', 'poison', 'arcane'],
    setup(p) { return scatter(p, 12) },
    draw(p, t) {
      const { s, size } = p
      for (const d of p.state) {
        const y = d.y + t * size * 2, x = d.x - t * size // two tiles down, one left per loop
        p.line(x, y, x - 2 * s, y + 5 * s, p.px, 0.65, 1.05)
      }
    },
  },
  {
    id: 'fx-snow', color: 'bone', frames: 16, fps: 10, loop: true, wrap: true, tags: ['weather', 'seamless', 'loop'],
    variants: ['ice', 'arcane', 'holy'],
    setup(p) { return scatter(p, 10) },
    draw(p, t) {
      const { s, size } = p
      for (const f of p.state) {
        const y = f.y + t * size, x = f.x + Math.sin((t + f.k) * TAU) * 2 * s
        if (f.k > 0.6) p.star(x, y, 2 * s, 4, 1.05, 0.3)
        else p.disc(x, y, 0.9 * s, 0.9, 0.1)
      }
    },
  },
  {
    id: 'fx-leaves', color: 'green', frames: 16, fps: 10, loop: true, wrap: true, tags: ['weather', 'seamless', 'loop'],
    variants: ['fire', 'holy', 'arcane', 'blood'],
    setup(p) { return scatter(p, 5) },
    draw(p, t) {
      const { s, size } = p
      for (const f of p.state) {
        const y = f.y + t * size, x = f.x + t * size + Math.sin((t * 2 + f.k) * TAU) * 3 * s
        const tilt = Math.cos((t * 2 + f.k) * TAU)
        p.line(x - 1.5 * tilt * s, y - s, x + 1.5 * tilt * s, y + s, 2 * s, 0.95, 0.65)
      }
    },
  },
  {
    id: 'fx-fireflies', color: 'lime', frames: 16, fps: 8, loop: true, wrap: true, tags: ['ambient', 'seamless', 'loop'],
    variants: ['holy', 'ice', 'arcane', 'fire'],
    setup(p) { return scatter(p, 6) },
    draw(p, t) {
      const { s } = p
      for (const f of p.state) {
        const x = f.x + Math.sin((t + f.k) * TAU) * 4 * s, y = f.y + Math.sin((t * 2 + f.k * 3) * TAU) * 3 * s
        const blink = 0.5 + 0.5 * Math.sin((t * 2 + f.k * 5) * TAU)
        if (blink > 0.25) p.glow(x, y, (1.4 + blink) * s, 0.6 + 0.65 * blink)
      }
    },
  },
  {
    id: 'fx-bubbles', color: 'ice', frames: 16, fps: 10, loop: true, wrap: true, tags: ['ambient', 'water', 'seamless', 'loop'],
    variants: ['water', 'poison', 'arcane'],
    setup(p) { return scatter(p, 7) },
    draw(p, t) {
      const { s, size } = p
      for (const b of p.state) {
        const y = b.y - t * size, x = b.x + Math.sin((t * 2 + b.k) * TAU) * 1.5 * s
        const r = (1 + b.k * 1.5) * s
        p.ring(x, y, r, p.px, 1)
        p.pt(x - r * 0.4, y - r * 0.4, 1.15)
      }
    },
  },
  {
    id: 'fx-embers', color: 'orange', frames: 16, fps: 12, loop: true, wrap: true, tags: ['ambient', 'fire', 'seamless', 'loop'],
    variants: ['ice', 'arcane', 'nature', 'holy'],
    setup(p) { return scatter(p, 9) },
    draw(p, t) {
      const { s, size } = p
      for (const e of p.state) {
        const y = e.y - t * size, x = e.x + Math.sin((t + e.k) * TAU) * 2 * s
        const flick = 0.75 + 0.35 * Math.sin((t * 4 + e.k * 7) * TAU)
        p.disc(x, y, (0.7 + e.k * 0.6) * s, flick, 0.1)
      }
    },
  },
  {
    id: 'fx-petals', color: 'pink', frames: 16, fps: 10, loop: true, wrap: true, tags: ['weather', 'seamless', 'loop'],
    variants: ['steel', 'holy', 'fire', 'nature'],
    setup(p) { return scatter(p, 7) },
    draw(p, t) {
      const { s, size } = p
      for (const f of p.state) {
        const y = f.y + t * size, x = f.x + t * size + Math.sin((t * 2 + f.k) * TAU) * 2.5 * s
        const tilt = Math.cos((t * 2 + f.k) * TAU)
        p.line(x - tilt * s, y - 0.6 * s, x + tilt * s, y + 0.6 * s, 1.8 * s, 1.0, 0.75)
      }
    },
  },
  {
    id: 'fx-ash', color: 'stone', frames: 16, fps: 8, loop: true, wrap: true, outline: 'none', tags: ['weather', 'seamless', 'loop'],
    variants: ['fire', 'dark', 'steel'],
    setup(p) { return scatter(p, 12) },
    draw(p, t) {
      const { s, size } = p
      for (const f of p.state) {
        const y = f.y + t * size, x = f.x + Math.sin((t + f.k) * TAU) * 2 * s
        if (f.k > 0.6) p.disc(x, y, 1.1 * s, 1.0, 0.1)
        else p.pt(x, y, 0.9 + 0.3 * f.k)
      }
    },
  },
  {
    id: 'fx-stars', color: 'bone', frames: 16, fps: 6, loop: true, wrap: true, outline: 'none', tags: ['ambient', 'seamless', 'loop'],
    variants: ['holy', 'ice', 'arcane'],
    setup(p) { return scatter(p, 9) },
    draw(p, t) {
      const { s } = p
      for (const f of p.state) {
        const b = 0.5 + 0.5 * Math.sin((t * 2 + f.k * 7) * TAU)
        if (f.k > 0.55) p.star(f.x, f.y, (1.5 + 1.5 * b) * s, 4, 0.95 + 0.35 * b, 0.2)
        else p.pt(f.x, f.y, 0.85 + 0.4 * b)
      }
    },
  },
  {
    id: 'fx-clouds', color: 'bone', frames: 16, fps: 6, loop: true, wrap: true, tags: ['weather', 'seamless', 'loop'],
    variants: ['ice', 'dark', 'fire', 'arcane'],
    setup(p) { return [0, 1].map((k) => ({ x: p.rng() * p.size, y: (8 + k * 14) * p.s, w: 0.8 + p.rng() * 0.4 })) },
    draw(p, t) {
      const { s, size } = p
      for (const cl of p.state) {
        const x = cl.x + t * size
        for (const [dx, dy, r] of [[-4, 1, 3.5], [0, -1, 4.5], [4, 1, 3.5], [7, 2, 2.5], [-7, 2, 2.5]]) p.disc(x + dx * s * cl.w, cl.y + dy * s, r * s, 0.95, 0.35)
      }
    },
  },
  {
    id: 'fx-waterfall', color: 'blue', frames: 8, fps: 12, loop: true, wrap: true, outline: 'none', tags: ['environment', 'seamless', 'loop'],
    variants: ['ice', 'poison', 'fire', 'blood'],
    setup(p) { return Array.from({ length: 16 }, () => p.rng()) }, // one phase per band of columns
    draw(p, t) {
      const { size } = p
      const band = Math.max(2, Math.round(2 * p.s))
      for (let x = 0; x < size; x++) {
        const ph = p.state[Math.floor(x / band) % 16]
        for (let y = 0; y < size; y++) {
          const u = ((y / size - t + ph) % 1 + 1) % 1, w = Math.sin(u * TAU * 2)
          p.dot(x, y, 0.5 + 0.18 * w + (w > 0.7 ? 0.45 : 0)) // long bright streaks falling one tile per loop
        }
      }
    },
  },
]
