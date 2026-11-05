// Things that travel: projectiles (draw them where the shot is and move the sprite) and beams.
// Projectiles face right; mirror them with .flipX() for left.

const TAU = Math.PI * 2

export const MOTION = [
  {
    id: 'fx-comet', color: 'orange', frames: 6, fps: 14, loop: true, tags: ['projectile', 'loop'],
    draw(p, t, i) {
      const { c, s } = p
      const hx = c + 7 * s
      p.glow(hx, c, 5 * s, 1.35)
      for (let k = 1; k <= 6; k++) {
        const wob = Math.sin((i + k * 1.7) * 2.1) * k * 0.35 * s
        p.blob(hx - k * 3.2 * s, c + wob, (4.2 - k * 0.55) * s, 1.05 - k * 0.11, 0.3, i + k)
      }
      for (let k = 0; k < 3; k++) p.pt(hx - (10 + ((i * 3 + k * 7) % 12)) * s, c + ((k * 5 + i * 3) % 7 - 3) * s, 0.9)
    },
  },
  {
    id: 'fx-orb', color: 'purple', frames: 8, fps: 12, loop: true, tags: ['projectile', 'magic', 'loop'],
    draw(p, t) {
      const { c, s } = p
      p.glow(c, c, (5 + Math.sin(t * TAU) * 0.8) * s, 1.3)
      p.ring(c, c, 6.5 * s, 1.2 * s, 0.7)
      for (let k = 0; k < 3; k++) {
        const a = t * TAU + (k / 3) * TAU
        p.disc(c + Math.cos(a) * 10 * s, c + Math.sin(a) * 4 * s, 1.2 * s, 1, 0.2)
      }
    },
  },
  {
    id: 'fx-energy-bolt', color: 'ice', frames: 6, fps: 16, loop: true, tags: ['projectile', 'electric', 'loop'],
    draw(p, t, i) {
      const { c, s, size } = p
      let x = 3 * s, y = c
      const r = (k) => ((Math.sin(i * 91.7 + k * 12.3) * 43758.5) % 1)
      while (x < size - 9 * s) {
        const nx = x + (3 + Math.abs(r(x)) * 3) * s, ny = c + r(x + 1) * 5 * s
        p.line(x, y, nx, ny, 1.4 * s, 0.75 + 0.3 * (x / size))
        x = nx; y = ny
      }
      p.line(x, y, size - 6 * s, c, 1.4 * s, 1)
      p.glow(size - 6 * s, c, 4 * s, 1.3)
    },
  },
  {
    id: 'fx-spinner', color: 'bone', frames: 4, fps: 16, loop: true, tags: ['projectile', 'loop'], variants: ['fire', 'ice', 'dark', 'holy', 'nature'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 4; k++) {
        const a = t * (TAU / 4) + (k / 4) * TAU
        p.arc(c, c, 6 * s, 3 * s, a, a + 1.1, 1.15)
      }
      p.disc(c, c, 2 * s, 0.9, 0.2)
    },
  },
  {
    id: 'fx-wave', color: 'ice', frames: 4, fps: 12, loop: true, tags: ['projectile', 'slash', 'loop'],
    draw(p, t, i) {
      const { c, s } = p
      const shimmer = i % 2 ? 0.08 : 0
      p.arc(c - 4 * s, c, 11 * s, 3.4 * s, -1.05, 1.05, 1.15 + shimmer)
      p.arc(c - 7 * s, c, 9 * s, 1.6 * s, -0.9, 0.9, 0.7)
    },
  },
  {
    id: 'fx-laser', color: 'red', frames: 4, fps: 16, loop: true, wrap: true, tags: ['beam', 'seamless', 'loop'],
    variants: ['ice', 'nature', 'arcane', 'holy', 'dark'],
    draw(p, t, i) {
      const { c, s, size } = p
      const w = (3.2 + (i % 2) * 0.8) * s
      p.line(-2, c, size + 2, c, w * 2.2, 0.62)
      p.line(-2, c, size + 2, c, w, 1.2)
      for (let k = 0; k < 4; k++) p.pt(((i * 9 + k * 8) % size), c + ((k % 2 ? 1 : -1) * (w + 1.5 * s)), 0.9)
    },
  },
  {
    id: 'fx-chain-lightning', color: 'gold', frames: 4, fps: 16, loop: true, wrap: true, tags: ['beam', 'electric', 'seamless', 'loop'],
    variants: ['ice', 'arcane', 'dark', 'nature'],
    draw(p, t, i) {
      const { c, s, size } = p
      const pts = [[0, c]]
      for (let k = 1; k < 6; k++) pts.push([(k / 6) * size, c + Math.sin(i * 7.3 + k * 2.9) * 6 * s])
      pts.push([size, c]) // both ends at the middle so it tiles left to right
      for (let k = 0; k < pts.length - 1; k++) {
        p.line(pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 1.3 * s, 1.15)
        if ((k + i) % 3 === 0) p.line(pts[k][0], pts[k][1], pts[k][0] + 4 * s, pts[k][1] + 5 * s * (k % 2 ? 1 : -1), 1, 0.8)
      }
    },
  },
]
