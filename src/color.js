// Color helpers. Colors are RGBA arrays [r, g, b, a] with 0-255 channels.

export function parseColor(c) {
  if (Array.isArray(c)) return [c[0] | 0, c[1] | 0, c[2] | 0, c[3] ?? 255]
  let s = String(c).trim()
  if (s === 'transparent' || s === 'none') return [0, 0, 0, 0]
  if (s[0] === '#') s = s.slice(1)
  if (s.length === 3 || s.length === 4) s = [...s].map((ch) => ch + ch).join('')
  if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(s)) throw new Error(`dog: invalid color "${c}"`)
  const n = parseInt(s.slice(0, 6), 16)
  const a = s.length === 8 ? parseInt(s.slice(6), 16) : 255
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}

export function isColor(c) {
  try { parseColor(c); return true } catch { return false }
}

export function toHex([r, g, b, a = 255]) {
  const h = (v) => v.toString(16).padStart(2, '0')
  return '#' + h(r) + h(g) + h(b) + (a === 255 ? '' : h(a))
}

export function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s, l]
}

export function hslToRgb(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360
  s = clamp01(s); l = clamp01(l)
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v] }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)]
}

export const clamp01 = (v) => Math.min(1, Math.max(0, v))

// Move hue `h` toward `target` by at most `amount` degrees (shortest way round).
function hueToward(h, target, amount) {
  const diff = ((target - h + 540) % 360) - 180
  return h + Math.sign(diff) * Math.min(Math.abs(diff), amount)
}

/**
 * Build a 4-shade ramp (dark -> light) from a single base color.
 * Shadows drift toward blue/purple and highlights toward yellow,
 * which is how pixel artists usually hand-pick ramps.
 */
export function rampFrom(color) {
  const [r, g, b] = parseColor(color)
  const [h, s, l] = rgbToHsl(r, g, b)
  const gray = s < 0.08
  const shade = (dh, target, ds, lf) => {
    const hh = gray ? h : hueToward(h, target, dh)
    return toHex([...hslToRgb(hh, clamp01(s * ds), clamp01(lf)), 255])
  }
  return [
    shade(28, 255, 1.05, l * 0.36),
    shade(12, 255, 1.0, l * 0.66),
    toHex([r, g, b, 255]),
    shade(16, 60, 0.85, l + (1 - l) * 0.55),
  ]
}
