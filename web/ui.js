// Small DOM helpers shared by the studio and the character maker.

export const $ = (sel, el = document) => el.querySelector(sel)
export const $$ = (sel, el = document) => [...el.querySelectorAll(sel)]

export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (k === 'style' && typeof v === 'object') for (const [p, val] of Object.entries(v)) el.style.setProperty(p.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()), val)
    else if (v !== false && v != null) el.setAttribute(k, v === true ? '' : v)
  }
  el.append(...kids.flat().filter((k) => k != null))
  return el
}

export const paint = (canvas, img) => img.toCanvas(canvas)

/** A small pixelated <canvas> showing a Pixmap at `size` CSS pixels (aspect kept). */
export function thumb(img, size = 32) {
  const c = h('canvas', { width: img.w, height: img.h, 'aria-hidden': 'true' })
  paint(c, img)
  const r = img.w / img.h
  c.style.width = `${r >= 1 ? size : size * r}px`
  c.style.height = `${r >= 1 ? size / r : size}px`
  return c
}

export function download(name, bytes, type = 'image/png') {
  const url = URL.createObjectURL(new Blob([bytes], { type }))
  const a = h('a', { href: url, download: name })
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function toast(msg) {
  const t = h('div', { class: 'toast', role: 'status' }, msg)
  document.body.append(t)
  setTimeout(() => t.remove(), 1800)
}

export async function copy(text, msg) {
  try {
    await navigator.clipboard.writeText(text)
    toast(msg)
  } catch {
    prompt('Copy:', text)
  }
}

export const encode = (obj) =>
  btoa(unescape(encodeURIComponent(JSON.stringify(obj)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
export const decode = (str) => JSON.parse(decodeURIComponent(escape(atob(str.replace(/-/g, '+').replace(/_/g, '/')))))

// The URL hash holds independent states side by side: #s=<studio>&c=<character>
export const readHash = (key) => new URLSearchParams(location.hash.slice(1)).get(key)
export function writeHash(key, value) {
  const p = new URLSearchParams(location.hash.slice(1))
  p.set(key, value)
  history.replaceState(null, '', '#' + p.toString())
}
