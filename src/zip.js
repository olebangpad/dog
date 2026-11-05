// Minimal ZIP writer (stored, no compression) so packs download as one file
// in the browser without dependencies. PNGs are already compressed anyway.

import { crc32 } from './png.js'

const enc = new TextEncoder()

/** files: { 'name.png': Uint8Array | string, ... } -> Uint8Array (.zip) */
export function zip(files) {
  const entries = Object.entries(files).map(([name, data]) => ({
    name: enc.encode(name),
    data: typeof data === 'string' ? enc.encode(data) : data,
  }))
  const size = entries.reduce((n, e) => n + 30 + e.name.length + e.data.length + 46 + e.name.length, 22)
  const out = new Uint8Array(size)
  const dv = new DataView(out.buffer)
  let o = 0
  const central = []
  const DATE = (0 << 9) | (1 << 5) | 1 // 1980-01-01
  for (const e of entries) {
    const crc = crc32(e.data)
    central.push({ ...e, crc, offset: o })
    dv.setUint32(o, 0x04034b50, true)
    dv.setUint16(o + 4, 20, true)
    dv.setUint16(o + 6, 0x0800, true) // UTF-8 names
    dv.setUint16(o + 8, 0, true) // stored
    dv.setUint16(o + 10, 0, true)
    dv.setUint16(o + 12, DATE, true)
    dv.setUint32(o + 14, crc, true)
    dv.setUint32(o + 18, e.data.length, true)
    dv.setUint32(o + 22, e.data.length, true)
    dv.setUint16(o + 26, e.name.length, true)
    dv.setUint16(o + 28, 0, true)
    out.set(e.name, o + 30)
    out.set(e.data, o + 30 + e.name.length)
    o += 30 + e.name.length + e.data.length
  }
  const cdStart = o
  for (const e of central) {
    dv.setUint32(o, 0x02014b50, true)
    dv.setUint16(o + 4, 20, true)
    dv.setUint16(o + 6, 20, true)
    dv.setUint16(o + 8, 0x0800, true)
    dv.setUint16(o + 10, 0, true)
    dv.setUint16(o + 12, 0, true)
    dv.setUint16(o + 14, DATE, true)
    dv.setUint32(o + 16, e.crc, true)
    dv.setUint32(o + 20, e.data.length, true)
    dv.setUint32(o + 24, e.data.length, true)
    dv.setUint16(o + 28, e.name.length, true)
    dv.setUint32(o + 42, e.offset, true)
    out.set(e.name, o + 46)
    o += 46 + e.name.length
  }
  dv.setUint32(o, 0x06054b50, true)
  dv.setUint16(o + 8, central.length, true)
  dv.setUint16(o + 10, central.length, true)
  dv.setUint32(o + 12, o - cdStart, true)
  dv.setUint32(o + 16, cdStart, true)
  return out
}
