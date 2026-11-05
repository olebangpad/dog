// Combat effects: what each weapon style draws, plus hit feedback (crit, miss, block, parry).
// Directional ones face right; mirror with .flipX() for left.

const TAU = Math.PI * 2
const out = (t) => 1 - (1 - t) * (1 - t)
const bell = (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
const clamp = (t) => Math.min(1, Math.max(0, t))

// 5px per letter (not 4) so each letter keeps its own outline and words stay readable
function word(p, text, x, y, v, scale = 1) {
  for (let i = 0; i < text.length; i++) p.glyph(text[i], x + i * 5 * scale, y, v, scale)
}

export const COMBAT = [
  {
    id: 'fx-stab', color: 'bone', frames: 6, fps: 18, tags: ['combat', 'attack'], variants: ['fire', 'ice', 'poison', 'dark', 'blood'],
    draw(p, t) {
      const { c, s } = p
      const reach = out(clamp(t * 2)) * 22 * s
      const tail = clamp((t - 0.5) * 2) * 20 * s
      p.line(4 * s + tail, c, 4 * s + reach, c, 1.8 * s, 0.6, 1.25)
      if (t > 0.25 && t < 0.8) p.star(4 * s + reach, c, 3.5 * s * bell((t - 0.25) / 0.55), 4, 1.2, 0.2)
    },
  },
  {
    id: 'fx-smash', color: 'gold', B: 'stone', frames: 8, fps: 14, tags: ['combat', 'attack', 'burst'], variants: ['fire', 'ice', 'nature', 'dark'],
    setup(p) { return p.emit({ count: 8, x: p.c, y: p.size - 5 * p.s, speed: [10, 18], angle: [-Math.PI * 0.95, -Math.PI * 0.05], gravity: 50, life: [0.7, 1], size: [1, 1.8] }) },
    draw(p, t) {
      const { c, s, size } = p
      const ground = size - 4 * s
      if (t < 0.35) p.use('A').glow(c, ground, (4 + 10 * t) * s, 1.35 - t)
      p.use('A').arc(c, ground, (3 + 11 * out(t)) * s, (2.5 - 1.8 * t) * s, Math.PI, TAU, 1.05 - 0.4 * t)
      for (const dx of [-1, 1]) p.use('B').line(c, ground, c + dx * (4 + 9 * out(t)) * s, ground + 1.5 * s, 1.4 * s, 0.9 * (1 - t * 0.6))
      p.use('B').particles(p.state, t, { v: 0.95, shape: 'disc' })
    },
  },
  {
    id: 'fx-thrust', color: 'bone', frames: 6, fps: 16, tags: ['combat', 'attack'], variants: ['fire', 'ice', 'holy', 'water'],
    draw(p, t) {
      const { c, s } = p
      const x = (3 + 20 * out(clamp(t * 1.6))) * s
      const fade = 1 - clamp((t - 0.6) / 0.4)
      for (let k = 0; k < 4; k++) p.line(x - (6 + k * 3) * s, c - (1.5 - k) * 1.2 * s, x - 2 * s, c - (1.5 - k) * 1.2 * s * 0.4, 1, 0.75 * fade)
      p.line(x - 4 * s, c - 3 * s, x + 3 * s, c, 1.6 * s, 1.2 * fade)
      p.line(x - 4 * s, c + 3 * s, x + 3 * s, c, 1.6 * s, 1.2 * fade)
    },
  },
  {
    id: 'fx-whip', color: 'bone', frames: 6, fps: 16, tags: ['combat', 'attack'], variants: ['fire', 'ice', 'blood', 'arcane'],
    draw(p, t) {
      const { c, s } = p
      const len = out(clamp(t * 1.7)) * 24 * s
      let px = 4 * s, py = c
      for (let x = 0; x <= len; x += s) {
        const nx = 4 * s + x, ny = c - Math.sin((x / (24 * s)) * Math.PI) * 6 * s * (1 - t)
        p.line(px, py, nx, ny, 1.2 * s, 0.8 + 0.3 * (x / (24 * s)))
        px = nx; py = ny
      }
      if (t > 0.45 && t < 0.9) p.star(px, py, 3.5 * s * bell((t - 0.45) / 0.45), 4, 1.25, 0.15)
    },
  },
  {
    id: 'fx-arrow', color: 'wood', B: 'iron', C: 'bone', frames: 4, fps: 16, loop: true, outline: 'none', tags: ['projectile', 'loop'],
    variants: ['fire', 'ice', 'poison', 'arcane'],
    draw(p, t, i) {
      const { c, s } = p
      p.use('A').line(6 * s, c, 22 * s, c, 1, 0.9)
      p.use('B').line(22 * s, c - 2 * s, 26 * s, c, 1.3 * s, 1.0).line(22 * s, c + 2 * s, 26 * s, c, 1.3 * s, 1.0)
      p.use('C').line(6 * s, c - 2 * s, 9 * s, c, 1, 1).line(6 * s, c + 2 * s, 9 * s, c, 1, 1)
      for (let k = 0; k < 3; k++) p.use('C').line((1 + ((i * 3 + k * 2) % 4)) * s, c + (k - 1) * 3 * s, (4 + ((i * 3 + k * 2) % 4)) * s, c + (k - 1) * 3 * s, 1, 0.6)
    },
  },
  {
    id: 'fx-pow', color: 'gold', B: 'shadow', top: 'B', clean: false, frames: 6, fps: 14, tags: ['combat', 'feedback'], variants: ['arcane', 'ice', 'nature', 'fire'],
    draw(p, t) {
      const { c, s } = p
      const grow = t < 0.3 ? out(t / 0.3) : 1 - clamp((t - 0.75) / 0.25)
      if (grow <= 0) return
      p.use('A').star(c, c, 14 * s * grow, 9, 1.0, 0.55)
      if (grow > 0.6) word(p.use('B'), 'POW', c - 7 * s, c - 2.5 * s, 0.6)
    },
  },
  {
    id: 'fx-crit', color: 'gold', clean: false, frames: 8, fps: 12, tags: ['combat', 'feedback'], variants: ['blood', 'fire', 'arcane', 'ice'],
    draw(p, t) {
      const { c, s } = p
      const y = c - 2 * s - out(t) * 6 * s
      if (t < 0.35) p.star(c, y + 2 * s, (4 + 18 * t) * s, 8, 1.1 - t, 0.25)
      word(p, 'CRIT!', c - 12 * s, y, t > 0.85 ? 0.7 : 1.2)
    },
  },
  {
    id: 'fx-miss', color: 'bone', clean: false, frames: 8, fps: 10, tags: ['combat', 'feedback'], variants: ['ice', 'arcane', 'dark'],
    draw(p, t) {
      const { c, s } = p
      word(p, 'MISS', c - 9.5 * s, c - out(t) * 8 * s, t > 0.7 ? 0.6 : 1.0)
    },
  },
  {
    id: 'fx-block', color: 'ice', frames: 6, fps: 16, tags: ['combat', 'feedback'], variants: ['holy', 'steel', 'arcane', 'fire'],
    setup(p) { return p.emit({ count: 7, x: 20 * p.s, y: p.c, speed: [12, 20], angle: [-Math.PI * 0.4, Math.PI * 0.4], gravity: 30, life: [0.5, 0.9], size: [1, 1.5] }) },
    draw(p, t) {
      const { c, s } = p
      p.arc(10 * s, c, 11 * s, 2.6 * s * (1 - t * 0.6), -0.95, 0.95, 1.2 - 0.5 * t)
      p.particles(p.state, t, { shape: 'spark', v: 1.15 })
    },
  },
  {
    id: 'fx-parry', color: 'gold', frames: 6, fps: 16, tags: ['combat', 'feedback'], variants: ['ice', 'holy', 'fire', 'arcane'],
    draw(p, t) {
      const { c, s } = p
      const r = (3 + 10 * out(t)) * s, v = 1.25 - 0.6 * t
      for (const a of [Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, (-3 * Math.PI) / 4]) p.spark(c + Math.cos(a) * r, c + Math.sin(a) * r, a, 5 * s * (1 - t * 0.5), v)
      if (t < 0.4) p.star(c, c, 5 * s * (1 - t), 4, 1.3, 0.15)
      p.ring(c, c, r * 0.8, 1.3 * s, 0.8 * (1 - t))
    },
  },
  {
    id: 'fx-whirlwind', color: 'bone', frames: 8, fps: 16, tags: ['combat', 'attack'], variants: ['fire', 'ice', 'nature', 'dark', 'blood'],
    draw(p, t) {
      const { c, s } = p
      const spin = t * TAU * 1.5
      for (let k = 0; k < 2; k++) {
        const a0 = spin + k * Math.PI
        p.arc(c, c + 2 * s, (10 + k) * s, 3 * s * (1 - t * 0.5), a0, a0 + 2.2, 1.15 - 0.3 * t)
      }
      p.ring(c, c + 2 * s, 13 * s, 1, 0.6 * (1 - t))
    },
  },
  {
    id: 'fx-loot-beam', behind: true, color: 'gold', frames: 8, fps: 10, loop: true, tags: ['reward', 'loop'], variants: ['nature', 'water', 'arcane', 'fire', 'steel'],
    draw(p, t) {
      const { c, s, size } = p
      const pulse = 0.85 + 0.15 * Math.sin(t * TAU)
      p.line(c, 0, c, size - 5 * s, 3 * s * pulse, 0.5, 1.0)
      p.ring(c, size - 5 * s, 6 * s, 1.4 * s, 0.9)
      for (let k = 0; k < 3; k++) {
        const u = (t + k / 3) % 1
        p.star(c + (k - 1) * 5 * s, size - 6 * s - u * 22 * s, 1.8 * s, 4, 1.15 * bell(u), 0.2)
      }
    },
  },
]
