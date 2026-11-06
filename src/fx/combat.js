// Combat effects: what each weapon style draws, plus hit feedback (crit, miss, block, parry).
// Directional ones face right; mirror with .flipX() for left.

const TAU = Math.PI * 2
const out = (t) => 1 - (1 - t) * (1 - t)
const bell = (t) => Math.sin(Math.PI * Math.min(1, Math.max(0, t)))
const clamp = (t) => Math.min(1, Math.max(0, t))

// 5px per letter (not 4) so each letter keeps its own outline and words stay readable
/** Pixel-font text centered on cx; letters grow with the effect size (2x at 64px). */
function word(p, text, cx, y, v) {
  const k = p.px, x = cx - ((text.length * 5 - 2) * k) / 2
  for (let i = 0; i < text.length; i++) p.glyph(text[i], x + i * 5 * k, y, v, k)
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
      p.use('A').line(6 * s, c, 22 * s, c, p.px, 0.9)
      p.use('B').line(22 * s, c - 2 * s, 26 * s, c, 1.3 * s, 1.0).line(22 * s, c + 2 * s, 26 * s, c, 1.3 * s, 1.0)
      p.use('C').line(6 * s, c - 2 * s, 9 * s, c, p.px, 1).line(6 * s, c + 2 * s, 9 * s, c, p.px, 1)
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
      if (grow > 0.6) word(p.use('B'), 'POW', c, c - 2.5 * s, 0.6)
    },
  },
  {
    id: 'fx-crit', color: 'gold', clean: false, frames: 8, fps: 12, tags: ['combat', 'feedback'], variants: ['blood', 'fire', 'arcane', 'ice'],
    draw(p, t) {
      const { c, s } = p
      const y = c - 2 * s - out(t) * 6 * s
      if (t < 0.35) p.star(c, y + 2 * s, (4 + 18 * t) * s, 8, 1.1 - t, 0.25)
      word(p, 'CRIT!', c, y, t > 0.85 ? 0.7 : 1.2)
    },
  },
  {
    id: 'fx-miss', color: 'bone', clean: false, frames: 8, fps: 10, tags: ['combat', 'feedback'], variants: ['ice', 'arcane', 'dark'],
    draw(p, t) {
      const { c, s } = p
      word(p, 'MISS', c, c - out(t) * 8 * s, t > 0.7 ? 0.6 : 1.0)
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
      p.ring(c, c + 2 * s, 13 * s, p.px, 0.6 * (1 - t))
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
  {
    id: 'fx-bite', color: 'bone', frames: 6, fps: 16, tags: ['combat', 'attack'], variants: ['blood', 'poison', 'ice', 'dark'],
    draw(p, t) {
      const { c, s } = p
      const gap = (1 - out(clamp(t * 1.8))) * 8 * s + 1.5 * s // the jaws close
      const fade = 1 - clamp((t - 0.7) / 0.3)
      for (const dir of [-1, 1]) {
        const y = c + dir * gap
        const [a0, a1] = dir < 0 ? [Math.PI * 1.15, Math.PI * 1.85] : [Math.PI * 0.15, Math.PI * 0.85]
        p.arc(c, y - dir * 6 * s, 9 * s, 2.2 * s, a0, a1, 1.1 * fade)
        for (let k = -2; k <= 2; k++) p.line(c + k * 3.2 * s, y, c + k * 3.2 * s, y - dir * 3 * s, 1.4 * s, 1.15 * fade, 0.65 * fade)
      }
      if (t > 0.45 && t < 0.8) p.star(c, c, 6 * s * bell((t - 0.45) / 0.35), 4, 1.25, 0.2)
    },
  },
  {
    id: 'fx-triple-slash', color: 'bone', frames: 8, fps: 18, tags: ['combat', 'attack'], variants: ['fire', 'ice', 'blood', 'arcane', 'holy'],
    draw(p, t) {
      const { c, s } = p
      for (let k = 0; k < 3; k++) {
        const u = clamp((t - k * 0.18) / 0.45)
        if (u <= 0 || u >= 1) continue
        const y = c + (k - 1) * 6 * s
        const at = (q) => [4 * s + q * 24 * s, y + 5 * s - q * 10 * s]
        const [x1, y1] = at(clamp(u * 1.6 - 0.6)), [x2, y2] = at(out(clamp(u * 1.6)))
        p.line(x1, y1, x2, y2, 2 * s * (1 - u * 0.5), 0.7, 1.25)
      }
    },
  },
  {
    id: 'fx-shuriken', color: 'bone', frames: 4, fps: 16, loop: true, tags: ['projectile', 'loop'], variants: ['fire', 'poison', 'arcane', 'ice'],
    draw(p, t, i) {
      const { c, s } = p
      const spin = (i / 4) * (TAU / 4) // a quarter turn per loop: the star looks the same again
      for (let k = 0; k < 4; k++) {
        const a = spin + (k * TAU) / 4
        p.line(c, c, c + Math.cos(a) * 8 * s, c + Math.sin(a) * 8 * s, 2.6 * s, 1.15, 0.85)
      }
      p.disc(c, c, 2 * s, 1.25, 0.1)
      for (const dy of [-3, 0, 3]) p.line(c - 15 * s, c + dy * s, c - 9 * s, c + dy * s, p.px, 0.35, 0.8)
    },
  },
  {
    id: 'fx-rock-throw', color: 'stone', B: 'sand', frames: 8, fps: 14, tags: ['projectile', 'combat'], variants: ['fire', 'ice', 'nature', 'dark'],
    setup(p) { return p.emit({ count: 7, x: 26 * p.s, y: 26 * p.s, speed: [6, 12], angle: [-Math.PI * 0.95, -Math.PI * 0.05], gravity: 30, life: [0.25, 0.35], size: [1, 1.8], delay: [0.62, 0.66] }) },
    draw(p, t) {
      const { s } = p
      const u = clamp(t / 0.65)
      if (t < 0.66) {
        const at = (q) => [(4 + 22 * q) * s, (24 - 16 * Math.sin(Math.PI * q) + 2 * q) * s]
        for (let k = 1; k <= 3; k++) { const [tx, ty] = at(Math.max(0, u - k * 0.06)); p.use('B').pt(tx, ty, 0.9 - k * 0.15) }
        const [x, y] = at(u)
        p.use('A').blob(x, y, 4 * s, 1.2, 0.2, 3)
      }
      p.use('B').particles(p.state, t, { shape: 'disc', v: 0.95 })
    },
  },
  {
    id: 'fx-muzzle-flash', color: 'gold', B: 'stone', frames: 5, fps: 18, tags: ['combat', 'attack', 'burst'], variants: ['fire', 'ice', 'arcane', 'poison'],
    draw(p, t) {
      const { c, s } = p
      if (t < 0.5) {
        const g = 1 - t * 2
        p.use('A').star(8 * s, c, (5 + 6 * g) * s, 6, 0.3 + 1.1 * g, 0.25)
        p.use('A').line(8 * s, c, (8 + 16 * g) * s, c, Math.max(p.px, 2.4 * s * g), 1.3, 0.45)
      }
      p.use('B').blob((10 + 8 * t) * s, c - 2 * s * t, (2 + 4 * t) * s, 0.9 * (1 - t), 0.3, 2)
    },
  },
  {
    id: 'fx-shield-break', color: 'ice', frames: 8, fps: 14, tags: ['combat', 'feedback'], variants: ['holy', 'steel', 'arcane', 'fire'],
    setup(p) { return p.emit({ count: 10, x: p.c, y: p.c, speed: [10, 18], angle: [0, TAU], gravity: 25, life: [0.5, 0.65], size: [1.2, 2], delay: [0.3, 0.34] }) },
    draw(p, t) {
      const { c, s } = p
      if (t < 0.32) {
        p.ring(c, c, 10 * s, 2.2 * s, 1.05)
        const crack = clamp(t / 0.28)
        p.line(c, c - 10 * s, c + 2 * s, c - 10 * s + 8 * s * crack, p.px, 1.3)
        p.line(c + 2 * s, c - 2 * s, c - 3 * s, c - 2 * s + 9 * s * crack, p.px, 1.3)
      }
      p.particles(p.state, t, { shape: 'spark', v: 1.15 })
    },
  },
  {
    id: 'fx-ko', color: 'red', clean: false, frames: 8, fps: 12, tags: ['combat', 'feedback'], variants: ['fire', 'arcane', 'holy', 'dark'],
    draw(p, t) {
      const { c, s } = p
      if (t < 0.4) p.star(c, c, (6 + 16 * t) * s, 10, 1.1 - t, 0.35)
      const k = 2 * p.px, text = 'KO!', x0 = c - ((text.length * 5 - 2) * k) / 2
      const y = c - (5 * k) / 2 - out(clamp(t * 2)) * 2 * s
      for (let n = 0; n < text.length; n++) p.glyph(text[n], x0 + n * 5 * k, y, t > 0.85 ? 0.75 : 1.2, k)
    },
  },
]
