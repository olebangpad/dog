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
        p.line(x, y, x - 2 * s, y + 5 * s, 1, 0.65, 1.05)
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
        p.ring(x, y, r, 1, 1)
        p.dot(x - r * 0.4, y - r * 0.4, 1.15)
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
]
