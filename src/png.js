// Tiny dependency-free PNG + APNG encoder that runs in browsers and Node.
// By default it writes uncompressed (stored) deflate blocks; pass a real
// deflate function (e.g. Node's zlib.deflateSync) for smaller files.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()

export function crc32(bytes) {
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function u32(v) {
  return [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]
}
function u16(v) {
  return [(v >>> 8) & 255, v & 255]
}

function chunk(type, data) {
  const body = new Uint8Array(4 + data.length)
  for (let i = 0; i < 4; i++) body[i] = type.charCodeAt(i)
  body.set(data, 4)
  const out = new Uint8Array(12 + data.length)
  out.set(u32(data.length), 0)
  out.set(body, 4)
  out.set(u32(crc32(body)), 8 + data.length)
  return out
}

function adler32(data) {
  let a = 1, b = 0
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521
    b = (b + a) % 65521
  }
  return ((b << 16) | a) >>> 0
}

/** zlib stream using stored (uncompressed) deflate blocks. */
export function zlibStore(data) {
  const blocks = Math.max(1, Math.ceil(data.length / 65535))
  const out = new Uint8Array(2 + blocks * 5 + data.length + 4)
  out[0] = 0x78; out[1] = 0x01
  let o = 2
  for (let i = 0; i < blocks; i++) {
    const start = i * 65535
    const len = Math.min(65535, data.length - start)
    out[o++] = i === blocks - 1 ? 1 : 0
    out[o++] = len & 255; out[o++] = len >>> 8
    out[o++] = ~len & 255; out[o++] = (~len >>> 8) & 255
    out.set(data.subarray(start, start + len), o)
    o += len
  }
  out.set(u32(adler32(data)), o)
  return out
}

function scanlines(img) {
  const { w, h, data } = img
  const out = new Uint8Array((w * 4 + 1) * h)
  for (let y = 0; y < h; y++) {
    out[y * (w * 4 + 1)] = 0 // filter: none
    out.set(data.subarray(y * w * 4, (y + 1) * w * 4), y * (w * 4 + 1) + 1)
  }
  return out
}

function concat(parts) {
  const len = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(len)
  let o = 0
  for (const p of parts) { out.set(p, o); o += p.length }
  return out
}

const SIGNATURE = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

function ihdr(w, h) {
  return chunk('IHDR', new Uint8Array([...u32(w), ...u32(h), 8, 6, 0, 0, 0]))
}

/** Encode a Pixmap ({ w, h, data: RGBA }) as a PNG file. */
export function encodePNG(img, { deflate = zlibStore } = {}) {
  return concat([
    SIGNATURE,
    ihdr(img.w, img.h),
    chunk('IDAT', new Uint8Array(deflate(scanlines(img)))),
    chunk('IEND', new Uint8Array(0)),
  ])
}

/** Encode same-sized frames as an animated PNG (plays in browsers & GitHub). */
export function encodeAPNG(frames, { fps = 8, loops = 0, deflate = zlibStore } = {}) {
  if (frames.length === 1) return encodePNG(frames[0], { deflate })
  const { w, h } = frames[0]
  const parts = [SIGNATURE, ihdr(w, h), chunk('acTL', new Uint8Array([...u32(frames.length), ...u32(loops)]))]
  let seq = 0
  frames.forEach((f, i) => {
    if (f.w !== w || f.h !== h) throw new Error('pixspell: APNG frames must share one size')
    parts.push(chunk('fcTL', new Uint8Array([
      ...u32(seq++), ...u32(w), ...u32(h), ...u32(0), ...u32(0),
      ...u16(1), ...u16(fps), 1, 0, // delay 1/fps, dispose: background, blend: source
    ])))
    const z = new Uint8Array(deflate(scanlines(f)))
    if (i === 0) parts.push(chunk('IDAT', z))
    else parts.push(chunk('fdAT', concat([new Uint8Array(u32(seq++)), z])))
  })
  parts.push(chunk('IEND', new Uint8Array(0)))
  return concat(parts)
}

export function toBase64(bytes) {
  if (typeof Buffer !== 'undefined') return Buffer.from(bytes).toString('base64')
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}
