// Status effects that sit on a character. Made for 32x32 character frames (dog.action / game packs,
// feet at 16,31): draw them at the same spot as the character and they line up with the body and head.

const TAU = Math.PI * 2
const bell = (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)))

// body region inside a 32x32 character frame
const BODY = { x: 16, top: 17, bottom: 30, head: 12 }

function arrow(p, x, y, dir, v) {
  const s = p.s, h = 3 * s * dir
  p.line(x, y + h, x, y - h, 1.6 * s, v)
  p.line(x, y - h, x - 2.5 * s, y - h + 2.5 * s * dir, 1.3 * s, v)
  p.line(x, y - h, x + 2.5 * s, y - h + 2.5 * s * dir, 1.3 * s, v)
}

function heart(p, x, y, r, v) {
  p.disc(x - r * 0.5, y, r * 0.62, v, 0.15).disc(x + r * 0.5, y, r * 0.62, v, 0.15)
  for (let k = 0; k <= r * 1.2; k += 0.5) p.line(x - r * (1 - k / (r * 1.2)) - 0.2, y + k * 0.9, x + r * (1 - k / (r * 1.2)) + 0.2, y + k * 0.9, 1, v)
}

export const STATUS = [
  {
    id: 'fx-burning', color: 'orange', frames: 8, fps: 12, loop: true, tags: ['status', 'fire', 'loop'], variants: ['ice', 'poison', 'arcane', 'dark'],
    draw(p, t) {
      const { s } = p
      for (let k = 0; k < 5; k++) {
        const ph = (t + k * 0.23) % 1
        const x = (BODY.x + (k - 2) * 3.4) * s + Math.sin((ph + k) * TAU) * 0.6 * s
        p.blob(x, (BODY.bottom - 2 - ph * 14) * s, (2.6 - 1.7 * ph) * s, 1.3 - 0.75 * ph, 0.25, k + Math.floor(t * 8))
      }
    },
  },
  {
    id: 'fx-frozen', color: 'ice', frames: 6, fps: 8, loop: true, tags: ['status', 'ice', 'loop'], variants: ['arcane', 'holy', 'poison'],
    draw(p, t, i) {
      const { s } = p
      for (const [x, y, len, a] of [[9, 29, 7, -1.9], [23, 29, 7, -1.25], [12, 21, 5, -2.4], [21, 20, 5, -0.7], [16, 30, 4, -1.57]]) {
        p.line(x * s, y * s, (x + Math.cos(a) * len) * s, (y + Math.sin(a) * len) * s, 2.2 * s, 1.0, 0.75)
      }
      const glint = [[11, 22], [21, 19], [16, 26], [9, 27], [23, 25], [14, 18]][i]
      p.star(glint[0] * s, glint[1] * s, 2.5 * s, 4, 1.2, 0.2)
    },
  },
  {
    id: 'fx-poisoned', color: 'lime', frames: 8, fps: 10, loop: true, tags: ['status', 'poison', 'loop'], variants: ['arcane', 'dark', 'blood'],
    draw(p, t) {
      const { s } = p
      for (let k = 0; k < 4; k++) {
        const u = (t + k / 4) % 1
        const x = (BODY.x + (k - 1.5) * 4 + Math.sin((u + k) * TAU)) * s
        p.ring(x, (BODY.bottom - 4 - u * 16) * s, (0.8 + u * 1.2) * s, 1, 1.1 * bell(u * 0.9 + 0.1))
      }
      const drip = (t * 2) % 1
      p.disc((BODY.x + 5) * s, (BODY.top + 4 + drip * 9) * s, 1.1 * s, 1.0 * (1 - drip * 0.5), 0.2)
    },
  },
  {
    id: 'fx-buff', color: 'gold', frames: 8, fps: 10, loop: true, tags: ['status', 'buff', 'loop'], variants: ['blood', 'ice', 'nature', 'arcane'],
    draw(p, t) {
      const { s } = p
      for (let k = 0; k < 4; k++) { // two columns beside the body, so the face stays visible
        const u = (t + k / 4) % 1
        arrow(p, (k % 2 ? 27 : 5) * s, (BODY.bottom - 3 - u * 18) * s, 1, 1.15 * bell(u))
      }
    },
  },
  {
    id: 'fx-debuff', color: 'purple', frames: 8, fps: 10, loop: true, tags: ['status', 'debuff', 'loop'], variants: ['blood', 'water', 'dark', 'poison'],
    draw(p, t) {
      const { s } = p
      for (let k = 0; k < 4; k++) {
        const u = (t + k / 4) % 1
        arrow(p, (k % 2 ? 27 : 5) * s, (BODY.head - 2 + u * 18) * s, -1, 1.1 * bell(u))
      }
    },
  },
  {
    id: 'fx-confused', color: 'gold', clean: false, frames: 8, fps: 8, loop: true, tags: ['status', 'loop'], variants: ['arcane', 'ice', 'nature'],
    draw(p, t) {
      const { s } = p
      for (let k = 0; k < 2; k++) {
        const a = t * TAU + k * Math.PI
        p.glyph('?', (BODY.x - 3 + Math.cos(a) * 8) * s, (BODY.head - 9 + Math.sin(a) * 2) * s, Math.sin(a) > 0 ? 1.15 : 0.85, 2 * s)
      }
    },
  },
  {
    id: 'fx-love', color: 'pink', frames: 8, fps: 8, loop: true, tags: ['status', 'loop'], variants: ['blood', 'holy', 'fire', 'water'],
    draw(p, t) {
      const { s } = p
      for (let k = 0; k < 3; k++) {
        const u = (t + k / 3) % 1
        heart(p, (BODY.x + (k - 1) * 7 + Math.sin((u + k) * TAU) * 1.5) * s, (BODY.top + 4 - u * 16) * s, (1.6 + u * 1.2) * s, 1.15 * bell(u))
      }
    },
  },
]
