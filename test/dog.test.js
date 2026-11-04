import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { dog, looks, sprites, compose, sheet, Pixmap, defineSprite, render, rampFrom, parseColor, toHex, text, encodeAPNG, MATERIALS } from '../src/index.js'

const hex = (img, x, y) => toHex(img.get(x, y))

/** Minimal PNG reader (8-bit RGBA, filter 0) to check the encoder round-trips. */
function decodePNG(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let o = 8, w, h
  const idat = []
  const types = []
  while (o < bytes.length) {
    const len = view.getUint32(o)
    const type = String.fromCharCode(...bytes.subarray(o + 4, o + 8))
    types.push(type)
    const data = bytes.subarray(o + 8, o + 8 + len)
    if (type === 'IHDR') { w = view.getUint32(o + 8); h = view.getUint32(o + 12) }
    if (type === 'IDAT') idat.push(data)
    o += 12 + len
  }
  const raw = inflateSync(Buffer.concat(idat))
  const px = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) px.set(raw.subarray(y * (w * 4 + 1) + 1, (y + 1) * (w * 4 + 1)), y * w * 4)
  return { w, h, px, types }
}

test('every sprite renders at its declared size', () => {
  for (const id of Object.keys(looks)) {
    const img = dog(id)
    const { def } = looks[id]
    assert.equal(img.w, def.w)
    assert.equal(img.h, def.h)
    assert.ok(img.colors().length > 0, `${id} is empty`)
  }
})

test('text art maps to ramp colors', () => {
  const def = defineSprite({ id: 't', art: `
    #1w
    4a.
  `, ramps: { A: 'red', C: 'gold' } })
  const img = render(def)
  assert.equal(hex(img, 1, 0), MATERIALS.red[0])
  assert.equal(hex(img, 2, 0), '#ffffff')
  assert.equal(hex(img, 0, 1), MATERIALS.red[3])
  assert.equal(hex(img, 1, 1), MATERIALS.gold[0])
  assert.equal(img.get(2, 1)[3], 0)
})

test('recolor with a material, a hex color, or a 4-color ramp', () => {
  const a = dog('potion', { A: 'blue' })
  const b = dog('potion', { A: '#ff00aa' })
  const c = dog('potion', { A: ['#000000', '#111111', '#222222', '#333333'] })
  assert.ok(a.colors().includes(MATERIALS.blue[2]))
  assert.ok(b.colors().includes('#ff00aa'))
  assert.ok(c.colors().includes('#222222'))
})

test('rampFrom builds 4 shades, dark to light, around the base', () => {
  const r = rampFrom('#3c7ae0')
  assert.equal(r.length, 4)
  assert.equal(r[2], '#3c7ae0')
  const lum = (h) => { const [R, G, B] = parseColor(h); return R * 0.3 + G * 0.59 + B * 0.11 }
  assert.ok(lum(r[0]) < lum(r[1]) && lum(r[1]) < lum(r[2]) && lum(r[2]) < lum(r[3]))
})

test('variants are registered as their own looks', () => {
  assert.ok(looks['potion-mana'])
  assert.deepEqual(dog('potion-mana').data, dog('potion', { A: 'blue' }).data)
  assert.ok(dog.list().length > dog.list({ variants: false }).length)
  assert.throws(() => dog('nope'), /no sprite called/)
})

test('scale up, scale down and smooth', () => {
  const s = dog('slime')
  assert.equal(s.scale(4).w, 64)
  assert.equal(hex(s.scale(4), 33, 41), hex(s, 8, 10))
  assert.equal(s.scale(4).scale(0.25).w, 16)
  assert.deepEqual(s.scale(4).downscale(4).data, s.data)
  assert.equal(s.smooth().w, 32)
  assert.equal(s.smooth(2).w, 64)
  assert.equal(s.resize(24).h, 24)
})

test('transforms', () => {
  const img = new Pixmap(3, 2).set(0, 0, [255, 0, 0, 255])
  assert.equal(img.flipX().get(2, 0)[0], 255)
  assert.equal(img.flipY().get(0, 1)[0], 255)
  const r = img.rotate(90)
  assert.equal(r.w, 2); assert.equal(r.h, 3)
  assert.equal(r.get(1, 0)[0], 255)
  assert.deepEqual(img.rotate(360).data, img.data)
  assert.equal(img.trim().w, 1)
})

test('outline and shadow grow the canvas', () => {
  const s = dog('gem')
  const o = s.outline('#fff')
  assert.equal(o.w, s.w + 2)
  assert.ok(o.colors().includes('#ffffff'))
  assert.equal(s.shadow('#000', 2, 3).h, s.h + 3)
})

test('color adjustments keep transparency', () => {
  const s = dog('heart')
  const g = s.grayscale()
  for (let i = 0; i < s.data.length; i += 4) assert.equal(g.data[i + 3], s.data[i + 3])
  const [r, gg, b] = g.get(5, 5)
  assert.ok(r === gg && gg === b)
  assert.ok(s.silhouette('#00ff00').colors().every((c) => c === '#00ff00'))
  assert.ok(s.swap(MATERIALS.red[2], '#123456').colors().includes('#123456'))
  assert.ok(s.quantize(['#000000', '#ffffff']).colors().every((c) => c === '#000000' || c === '#ffffff'))
})

test('compose grows to fit offset layers', () => {
  const out = compose(dog('hero'), dog('crown').at(0, -7))
  assert.equal(out.w, 16)
  assert.equal(out.h, 23)
  const side = compose(dog('dog'), dog('cat').at(20, 0))
  assert.equal(side.w, 36)
})

test('sheet packs frames and reports their rects', () => {
  const frames = dog.frames('coin')
  const { image, frames: rects } = sheet(frames, { columns: 2, gap: 1 })
  assert.equal(image.w, 33)
  assert.equal(rects.length, frames.length)
  assert.deepEqual(rects[1], { x: 17, y: 0, w: 16, h: 16 })
})

test('PNG round trip (stored and zlib-compressed)', async () => {
  const img = dog('potion-mana').scale(3)
  const { deflateSync } = await import('node:zlib')
  for (const bytes of [img.toPNG(), img.toPNG({ deflate: deflateSync })]) {
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    const back = decodePNG(bytes)
    assert.equal(back.w, img.w)
    assert.deepEqual(back.px, img.data)
  }
})

test('APNG has animation chunks', () => {
  const bytes = encodeAPNG(dog.frames('slime'), { fps: 4 })
  const s = Buffer.from(bytes).toString('latin1')
  assert.ok(s.includes('acTL') && s.includes('fcTL') && s.includes('fdAT'))
})

test('animation sequences and covers point at real frames', () => {
  for (const def of Object.values(sprites)) {
    assert.ok(def.sequence.every((i) => def.frames[i]), def.id)
    assert.ok(def.frames[def.cover], def.id)
  }
  assert.equal(dog.frames('eye').length, looks.eye.def.sequence.length)
})

test('pixel font', () => {
  const t = text('HI 2')
  assert.equal(t.h, 5)
  assert.equal(t.w, 4 * 4 - 1)
  assert.equal(text('A\nB').h, 12)
})

test('bad art is rejected with a helpful message', () => {
  assert.throws(() => defineSprite({ id: 'x', art: '..\n...' }), /row 1 is 3 wide/)
  assert.throws(() => defineSprite({ id: 'x', art: '.z' }), /unknown pixel "z"/)
  assert.throws(() => dog('potion', { A: 'not-a-material' }), /unknown material/)
})
