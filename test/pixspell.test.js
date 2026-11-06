import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { spell, looks, sprites, compose, sheet, Pixmap, defineSprite, render, rampFrom, parseColor, toHex, text, encodeAPNG, MATERIALS, CHAR_SIZE, ACTION_SIZE, ACTION_FRAMES, ELEMENTS, PACK_CELL, resolveRamp } from '../src/index.js'

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
    const img = spell(id)
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
  const a = spell('potion', { A: 'blue' })
  const b = spell('potion', { A: '#ff00aa' })
  const c = spell('potion', { A: ['#000000', '#111111', '#222222', '#333333'] })
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
  assert.deepEqual(spell('potion-mana').data, spell('potion', { A: 'blue' }).data)
  assert.ok(spell.list().length > spell.list({ variants: false }).length)
  assert.throws(() => spell('nope'), /no sprite called/)
})

test('scale up, scale down and smooth', () => {
  const s = spell('slime')
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
  const s = spell('gem')
  const o = s.outline('#fff')
  assert.equal(o.w, s.w + 2)
  assert.ok(o.colors().includes('#ffffff'))
  assert.equal(s.shadow('#000', 2, 3).h, s.h + 3)
})

test('color adjustments keep transparency', () => {
  const s = spell('heart')
  const g = s.grayscale()
  for (let i = 0; i < s.data.length; i += 4) assert.equal(g.data[i + 3], s.data[i + 3])
  const [r, gg, b] = g.get(5, 5)
  assert.ok(r === gg && gg === b)
  assert.ok(s.silhouette('#00ff00').colors().every((c) => c === '#00ff00'))
  assert.ok(s.swap(MATERIALS.red[2], '#123456').colors().includes('#123456'))
  assert.ok(s.quantize(['#000000', '#ffffff']).colors().every((c) => c === '#000000' || c === '#ffffff'))
})

test('compose grows to fit offset layers', () => {
  const out = compose(spell('hero'), spell('crown').at(0, -7))
  assert.equal(out.w, 16)
  assert.equal(out.h, 23)
  const side = compose(spell('dog'), spell('cat').at(20, 0))
  assert.equal(side.w, 36)
})

test('sheet packs frames and reports their rects', () => {
  const frames = spell.frames('coin')
  const { image, frames: rects } = sheet(frames, { columns: 2, gap: 1 })
  assert.equal(image.w, 33)
  assert.equal(rects.length, frames.length)
  assert.deepEqual(rects[1], { x: 17, y: 0, w: 16, h: 16 })
})

test('PNG round trip (stored and zlib-compressed)', async () => {
  const img = spell('potion-mana').scale(3)
  const { deflateSync } = await import('node:zlib')
  for (const bytes of [img.toPNG(), img.toPNG({ deflate: deflateSync })]) {
    assert.deepEqual([...bytes.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10])
    const back = decodePNG(bytes)
    assert.equal(back.w, img.w)
    assert.deepEqual(back.px, img.data)
  }
})

test('APNG has animation chunks', () => {
  const bytes = encodeAPNG(spell.frames('slime'), { fps: 4 })
  const s = Buffer.from(bytes).toString('latin1')
  assert.ok(s.includes('acTL') && s.includes('fcTL') && s.includes('fdAT'))
})

// a small APNG reader for our own files (filter 0, RGBA, dispose none, blend source): every frame composited
function decodeAPNG(bytes) {
  const b = Buffer.from(bytes)
  let w = 0, h = 0, canvas = null, rect = null, data = []
  const frames = [], rects = []
  const flush = () => {
    if (!rect) return
    const px = inflateSync(Buffer.concat(data)), row = rect.w * 4 + 1
    for (let y = 0; y < rect.h; y++) {
      assert.equal(px[y * row], 0, 'filter none')
      canvas.set(px.subarray(y * row + 1, (y + 1) * row), ((rect.y + y) * w + rect.x) * 4)
    }
    frames.push(new Uint8Array(canvas)); rects.push(rect); rect = null; data = []
  }
  for (let o = 8; o < b.length;) {
    const len = b.readUInt32BE(o), type = b.toString('latin1', o + 4, o + 8), d = b.subarray(o + 8, o + 8 + len)
    if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); canvas = new Uint8Array(w * h * 4) }
    if (type === 'fcTL') {
      flush()
      rect = { w: d.readUInt32BE(4), h: d.readUInt32BE(8), x: d.readUInt32BE(12), y: d.readUInt32BE(16) }
      assert.equal(d[24], 0, 'dispose none'); assert.equal(d[25], 0, 'blend source')
    }
    if (type === 'IDAT') data.push(d)
    if (type === 'fdAT') data.push(d.subarray(4))
    o += 12 + len
  }
  flush()
  return { w, h, frames, rects }
}

test('APNG frames after the first store only what changed, and decode back to the same pixels', () => {
  const frames = spell.action({ body: 'hero', hat: 'knight', hand: 'sword' }, 'attack', 'fire').map((f) => f.scale(2))
  frames.push(frames[frames.length - 1]) // an unchanged frame
  const out = decodeAPNG(encodeAPNG(frames, { fps: 12 }))
  assert.equal(out.frames.length, frames.length)
  out.frames.forEach((px, i) => assert.deepEqual(px, new Uint8Array(frames[i].data.buffer), `frame ${i}`))
  assert.deepEqual(out.rects[0], { x: 0, y: 0, w: 64, h: 64 })
  assert.ok(out.rects.slice(1, -1).some((r) => r.w * r.h < 64 * 64), 'some frames are partial')
  assert.deepEqual(out.rects.at(-1), { x: 0, y: 0, w: 1, h: 1 })
})

test('animation sequences and covers point at real frames', () => {
  for (const def of Object.values(sprites)) {
    assert.ok(def.sequence.every((i) => def.frames[i]), def.id)
    assert.ok(def.frames[def.cover], def.id)
  }
  assert.equal(spell.frames('eye').length, looks.eye.def.sequence.length)
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
  assert.throws(() => spell('potion', { A: 'not-a-material' }), /unknown material/)
})

// ------------------------------------------------------------ characters
import { BODY_AT } from '../src/character.js'

test('spell.char builds a fixed-size character from names', () => {
  const plain = spell.char('hero')
  const king = spell.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })
  assert.equal(king.w, CHAR_SIZE)
  assert.equal(king.h, CHAR_SIZE)
  assert.notDeepEqual(king.data, plain.data)
  // short names and full ids mean the same thing
  assert.deepEqual(spell.char('hero', { hat: 'crown' }).data, spell.char({ body: 'hero', hat: 'hat-crown' }).data)
  // outfit color only touches the body
  assert.ok(spell.char('hero', { A: '#ff00aa' }).colors().includes('#ff00aa'))
})

test('spell.char rejects things that cannot be worn', () => {
  assert.throws(() => spell.char('potion'), /no anchors/)
  assert.throws(() => spell.char('nobody'), /no body called/)
  assert.throws(() => spell.char('hero', { hat: 'sword' }), /can't be worn on head/)
})

test('animals ignore hand items instead of floating them', () => {
  assert.deepEqual(spell.char('dog', { hand: 'sword' }).data, spell.char('dog').data)
})

test('random characters are reproducible from a seed', () => {
  assert.deepEqual(spell.char.random(7), spell.char.random(7))
  assert.deepEqual(spell.char.random('npc-3'), spell.char.random('npc-3'))
  const specs = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(spell.char.random(i))))
  assert.ok(specs.size > 40)
  for (let i = 0; i < 200; i++) spell.char(spell.char.random(i))
})

test('character animation covers body and gear frames', () => {
  assert.equal(spell.char.frames('slime').length, 2)
  assert.equal(spell.char.frames('hero', { hand: 'torch' }).length, looks['held-torch'].def.sequence.length)
  const [a, b] = spell.char.frames('slime', { hat: 'crown' })
  assert.notDeepEqual(a.data, b.data) // the hat rides the bounce
})

test('no gear is clipped on any body or walk pose', () => {
  const { parts } = spell.char
  const poses = Object.keys(looks).filter((id) => Object.keys(looks[id].def.anchors).length)
  for (const bodyId of poses) {
    const body = looks[bodyId].def
    for (const kind of ['head', 'hand', 'offhand']) {
      if (!body.anchors[kind]) continue
      for (const partId of parts[kind]) {
        const part = looks[partId].def
        body.anchors[kind].forEach(([ax, ay]) => {
          part.frames.forEach((rows) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
            if (ch === '.') return
            const cx = BODY_AT[0] + ax - part.pivot[0] + x, cy = BODY_AT[1] + ay - part.pivot[1] + y
            assert.ok(cx >= 0 && cy >= 0 && cx < CHAR_SIZE && cy < CHAR_SIZE, `${partId} on ${bodyId} is clipped`)
          })))
        })
      }
    }
  }
})

test('there are lots of combinations', () => {
  assert.ok(spell.char.count() > 100000)
  assert.ok(spell.char.parts.body.includes('hero') && spell.char.parts.head.includes('hat-crown'))
})

// --------------------------------------------------------------- actions
test('every action gives 8 same-size frames with an fps', () => {
  for (const name of spell.action.list) {
    for (const spec of ['hero', { body: 'dog', hat: 'crown' }, { body: 'slime-blue', hat: 'wizard' }]) {
      const frames = spell.action(spec, name)
      assert.equal(frames.length, ACTION_FRAMES, name)
      assert.ok(frames.every((f) => f.w === ACTION_SIZE && f.h === ACTION_SIZE), name)
      assert.ok(frames.fps > 0, name)
      assert.ok(frames.some((f) => f.colors().length), `${name} is empty`)
    }
  }
})

test('elements recolor the effect', () => {
  const plain = spell.action('hero', 'attack')
  const fire = spell.action('hero', 'attack', 'fire')
  assert.notDeepEqual(plain[2].data, fire[2].data)
  const fireColors = new Set(fire.flatMap((f) => f.colors()))
  assert.ok(MATERIALS.orange.some((c) => fireColors.has(c)))
  // any material or hex works as a custom element
  assert.ok(new Set(spell.action('hero', 'cast', { element: '#00ffcc' }).flatMap((f) => f.colors())).has('#00ffcc'))
  assert.deepEqual(spell.action.elements, Object.keys(ELEMENTS))
})

test('hit flashes white and can hide its number', () => {
  const [first] = spell.action('hero', 'hit')
  assert.ok(first.colors().includes('#ffffff'))
  const withNum = spell.action('hero', 'hit', { amount: '-99' })
  const noNum = spell.action('hero', 'hit', { label: false })
  assert.notDeepEqual(withNum[3].data, noNum[3].data)
})

test('death ends without the character', () => {
  // with a pure-green smoke, the last frame must contain only smoke colors
  const smoke = rampFrom('#00ff00')
  const last = spell.action('ghost', 'death', '#00ff00').at(-1)
  assert.ok(last.colors().length > 0)
  assert.ok(last.colors().every((c) => smoke.includes(c)), last.colors().join(' '))
  assert.throws(() => spell.action('hero', 'dance'), /unknown action/)
})

// ------------------------------------------------------------------ walk
test('walk works for every body in every direction', () => {
  for (const body of spell.char.parts.body.filter((b) => !looks[b].variant)) {
    for (const dir of spell.walk.dirs) {
      const frames = spell.walk({ body, hat: 'crown' }, dir)
      assert.ok(frames.length >= 2, `${body} ${dir}`)
      assert.ok(frames.fps > 0)
      assert.ok(frames.every((f) => f.w === CHAR_SIZE && f.h === CHAR_SIZE))
      assert.notDeepEqual(frames[0].data, frames[1].data, `${body} ${dir} does not move`)
    }
  }
})

test('left is the mirror of right, and humanoids have real back and side poses', () => {
  const spec = { body: 'heroine', hat: 'wizard', hand: 'staff', offhand: 'book' }
  const right = spell.walk(spec, 'right'), left = spell.walk(spec, 'left')
  right.forEach((f, i) => assert.deepEqual(left[i].data, f.flipX().data))
  const down = spell.walk(spec, 'down')[0], up = spell.walk(spec, 'up')[0]
  assert.notDeepEqual(down.data, up.data)
  assert.notDeepEqual(down.data, right[0].data)
  // body colors carry over to the walk poses
  assert.ok(spell.walk('hero-red', 'up')[0].colors().includes(MATERIALS.red[2]))
})

test('walk keeps gear on, and walk poses are not offered as bodies', () => {
  assert.notDeepEqual(spell.walk({ body: 'hero', hat: 'crown' }, 'right')[0].data, spell.walk('hero', 'right')[0].data)
  assert.ok(!spell.char.parts.body.some((b) => b.includes('-walk-')))
  assert.throws(() => spell.walk('hero', 'diagonal'), /walk direction/)
})

// ------------------------------------------------------------------ packs
function readZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const files = {}
  let o = 0
  while (dv.getUint32(o, true) === 0x04034b50) {
    const size = dv.getUint32(o + 18, true), nameLen = dv.getUint16(o + 26, true)
    const name = new TextDecoder().decode(bytes.subarray(o + 30, o + 30 + nameLen))
    files[name] = bytes.subarray(o + 30 + nameLen, o + 30 + nameLen + size)
    o += 30 + nameLen + size
  }
  assert.equal(dv.getUint32(o, true), 0x02014b50, 'central directory follows the files')
  return files
}

test('spell.pack builds a sheet with every animation tagged', () => {
  const pack = spell.pack({ body: 'goblin', hat: 'pirate', hand: 'dagger' })
  const tags = pack.json.meta.frameTags
  assert.deepEqual(tags.map((t) => t.name), ['idle', 'walk-down', 'walk-up', 'walk-left', 'walk-right', ...spell.action.list])
  // tags are contiguous and cover every frame
  tags.forEach((t, i) => { if (i) assert.equal(t.from, tags[i - 1].to + 1) })
  assert.equal(tags.at(-1).to, pack.json.frames.length - 1)
  // Phaser's createFromAseprite looks frames up by index
  pack.json.frames.forEach((f, i) => assert.equal(f.filename, String(i)))
  assert.equal(pack.image.w % PACK_CELL, 0)
  assert.equal(pack.image.h, tags.length * PACK_CELL)
  // every frame rect is inside the sheet and has a duration
  for (const f of pack.json.frames) {
    assert.ok(f.frame.x + f.frame.w <= pack.image.w && f.frame.y + f.frame.h <= pack.image.h)
    assert.ok(f.duration > 0)
  }
})

test('spell.pack writes a valid zip with png, json, Godot tres and readme', () => {
  const pack = spell.pack('robot', { name: 'bot' })
  const files = readZip(pack.zip())
  assert.deepEqual(Object.keys(files).sort(), ['README.txt', 'bot.json', 'bot.png', 'bot.tres'])
  assert.deepEqual([...files['bot.png'].subarray(0, 4)], [137, 80, 78, 71])
  assert.equal(JSON.parse(new TextDecoder().decode(files['bot.json'])).meta.image, 'bot.png')
  const tres = new TextDecoder().decode(files['bot.tres'])
  assert.match(tres, new RegExp(`load_steps=${pack.json.frames.length + 2} format=3`))
  assert.match(tres, /&"walk_down"/)
  assert.match(tres, /path="res:\/\/bot.png"/)
  assert.equal((tres.match(/\[sub_resource/g) || []).length, pack.json.frames.length)
})

test('spell.pack works for animals and custom elements', () => {
  const pack = spell.pack({ body: 'slime-pink', hat: 'crown' }, { element: 'ice', actions: ['attack', 'hit'] })
  assert.deepEqual(pack.animations, ['idle', 'walk-down', 'walk-up', 'walk-left', 'walk-right', 'attack', 'hit'])
  assert.ok(pack.json.meta.pixspell.loops['walk-left'] && !pack.json.meta.pixspell.loops.attack)
})

// -------------------------------------------------------------------- fx
test('every fx recipe is a registered, animated, recolorable sprite', () => {
  assert.ok(spell.fx.list.length >= 26)
  for (const id of spell.fx.list) {
    const def = looks[id].def
    assert.equal(def.category, 'effects')
    assert.ok(def.frames.length >= 2, `${id} is not animated`)
    assert.ok(def.frames.every((f) => f.some((r) => /[^.]/.test(r))), `${id} has an empty frame`)
    assert.ok(Object.keys(def.variants).length >= 3, `${id} needs color variants`)
  }
})

test('spell.fx is deterministic per seed and works at other sizes and colors', () => {
  const a = spell.fx('firework', { seed: 5 }), b = spell.fx('firework', { seed: 5 }), c = spell.fx('firework', { seed: 6 })
  assert.deepEqual(a.map((f) => [...f.data]), b.map((f) => [...f.data]))
  assert.notDeepEqual(a.map((f) => [...f.data]), c.map((f) => [...f.data]))
  const big = spell.fx('boom', { size: 64 })
  assert.equal(big[0].w, 64)
  assert.ok(big.fps > 0)
  // opaque pixels use the ice ramp (or white); translucent glow is the ramp's brightest shade
  const ice = new Set(spell.fx('burst', { element: 'ice' }).flatMap((f) => f.colors()))
  assert.ok([...ice].every((col) => [...MATERIALS.ice, '#ffffff'].includes(col.slice(0, 7))), [...ice].join(' '))
  assert.ok([...ice].filter((col) => col.length === 9).every((col) => col.startsWith(MATERIALS.ice[3])))
  assert.equal(spell.fx('magic-circle').loop, true)
  assert.throws(() => spell.fx('nope'), /no effect called/)
})

test('fx colors stay inside their ramps (plus white cores); glow is translucent ramp-A light', () => {
  for (const id of spell.fx.list) {
    const def = looks[id].def
    const allowed = new Set(['#ffffff', ...['A', 'B', 'C'].flatMap((k) => resolveRamp(looks[id].ramps[k]))])
    const light = resolveRamp(looks[id].ramps.A)[3]
    for (let f = 0; f < def.frames.length; f++) {
      for (const col of spell(id, { frame: f }).colors()) {
        if (col.length === 7) assert.ok(allowed.has(col), `${id} frame ${f}: ${col}`)
        else assert.ok(col.startsWith(light) && parseInt(col.slice(7), 16) <= 179, `${id} frame ${f} glow: ${col}`)
      }
    }
  }
})

test('effect light: under the sprite only, off when asked, and recolors with the effect', () => {
  const lit = spell.fx('portal'), dark = spell.fx('portal', { light: false })
  let glow = 0
  for (let k = 0; k < lit.length; k++) {
    for (let i = 3; i < lit[k].data.length; i += 4) {
      // wherever the plain effect has a pixel, the lit one has exactly that pixel (glow never paints over the sprite)
      if (dark[k].data[i]) assert.deepEqual([...lit[k].data.subarray(i - 3, i + 1)], [...dark[k].data.subarray(i - 3, i + 1)])
      else if (lit[k].data[i]) glow++
    }
  }
  assert.ok(glow > 100, 'portal glows')
  const ice = spell('fx-portal-ice', { frame: 2 }).colors().filter((c) => c.length === 9)
  assert.ok(ice.length && ice.every((c) => c.startsWith(MATERIALS.ice[3])))
  // effects that are smoke or dust don't glow
  assert.ok(spell.fx('smoke-column').every((f) => f.colors().every((c) => c.length === 7)))
})

// ------------------------------------------------- fast paths vs reference
// The optimized Pixmap ops must give exactly what a naive per-pixel version gives.
function randomPixmap(w, h, seed) {
  let a = seed
  const rnd = () => ((a = (a * 1103515245 + 12345) >>> 0) / 4294967296)
  const p = new Pixmap(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rnd() > 0.45) p.set(x, y, [rnd() * 255 | 0, rnd() * 255 | 0, rnd() * 255 | 0, 255])
  return p
}
function naive(w, h, fn) {
  const p = new Pixmap(w, h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, fn(x, y))
  return p
}
test('optimized scale / resize / crop / pad / flips / rotate / outline match a reference', () => {
  for (const [w, h, seed] of [[1, 1, 1], [5, 3, 2], [16, 16, 3], [7, 12, 4]]) {
    const img = randomPixmap(w, h, seed)
    const same = (a, b, what) => { assert.equal(a.w, b.w, what); assert.equal(a.h, b.h, what); assert.deepEqual([...a.data], [...b.data], what) }
    same(img.scale(3), naive(w * 3, h * 3, (x, y) => img.get((x / 3) | 0, (y / 3) | 0)), 'scale')
    same(img.resize(11, 5), naive(11, 5, (x, y) => img.get(((x * w) / 11) | 0, ((y * h) / 5) | 0)), 'resize')
    same(img.crop(-2, 1, 6, 9), naive(6, 9, (x, y) => img.get(x - 2, y + 1)), 'crop')
    same(img.pad(1, 2, 3, 4), naive(w + 6, h + 4, (x, y) => img.get(x - 4, y - 1)), 'pad')
    same(img.flipX(), naive(w, h, (x, y) => img.get(w - 1 - x, y)), 'flipX')
    same(img.flipY(), naive(w, h, (x, y) => img.get(x, h - 1 - y)), 'flipY')
    same(img.rotate(90), naive(h, w, (x, y) => img.get(y, h - 1 - x)), 'rotate 90')
    same(img.rotate(180), naive(w, h, (x, y) => img.get(w - 1 - x, h - 1 - y)), 'rotate 180')
    same(img.rotate(270), naive(h, w, (x, y) => img.get(w - 1 - y, x)), 'rotate 270')
    const padded = img.pad(1)
    same(img.outline('#ff00ff'), naive(w + 2, h + 2, (x, y) => {
      if (padded.alpha(x, y)) return padded.get(x, y)
      return padded.alpha(x - 1, y) || padded.alpha(x + 1, y) || padded.alpha(x, y - 1) || padded.alpha(x, y + 1) ? [255, 0, 255, 255] : [0, 0, 0, 0]
    }), 'outline')
  }
})

test('wrap makes shapes continue across the edge (seamless tiles)', async () => {
  const { runRecipe } = await import('../src/fx.js')
  const edgeDisc = (wrap) => runRecipe({ id: 'edge', wrap, frames: 2, outline: 'none', draw(p) { p.disc(p.size - 1, 16, 3, 1) } }).frames[0]
  const wrapped = edgeDisc(true), plain = edgeDisc(false)
  assert.notEqual(wrapped[16][0], '.', 'wrapped disc reaches the left edge')
  assert.equal(plain[16][0], '.', 'unwrapped disc does not')
  assert.notEqual(plain[16][31], '.')
  // every registered seamless effect really is drawn with wrap on, and loops
  for (const id of spell.fx.list.filter((id) => looks[id].def.tags.includes('seamless'))) {
    assert.ok(looks[id].def.frames.length >= 4, id)
  }
  const a = spell.fx('firework', { seed: 1 }), b = spell.fx('firework', { seed: 1 })
  assert.deepEqual(a.map((f) => [...f.data]), b.map((f) => [...f.data]))
})

test('spell.fx.sequence chains and overlaps effects', () => {
  const charge = spell.fx('charge'), boom = spell.fx('boom')
  const seq = spell.fx.sequence([{ fx: 'charge' }, { fx: 'boom' }])
  assert.equal(seq.length, charge.length + boom.length)
  assert.deepEqual([...seq[0].data], [...charge[0].data])
  assert.deepEqual([...seq[charge.length].data], [...boom[0].data])
  const both = spell.fx.sequence([{ fx: 'charge' }, { fx: 'boom', with: true, at: 2 }])
  assert.equal(both.length, Math.max(charge.length, 2 + boom.length))
  const looped = spell.fx.sequence([{ fx: 'orb', repeat: 3 }])
  assert.equal(looped.length, spell.fx('orb').length * 3)
  assert.ok(seq.fps > 0)
})

// -------------------------------------------------------- round 3: gameplay
test('attacks follow the held weapon', () => {
  const styles = {
    sword: 'slash', dagger: 'stab', hammer: 'smash', spear: 'thrust', bow: 'shoot', staff: 'magic',
    rod: 'whip', torch: 'burn', lollipop: 'bonk',
  }
  for (const [hand, style] of Object.entries(styles)) assert.equal(spell.action.styleOf({ body: 'hero', hand }), style, hand)
  assert.equal(spell.action.styleOf({ body: 'hero', hand: 'sword-gold' }), 'slash')
  assert.equal(spell.action.styleOf('dog'), 'punch')
  assert.equal(spell.action.styleOf('hero'), 'punch')
  const bow = spell.action({ body: 'hero', hand: 'bow' }, 'attack'), sword = spell.action({ body: 'hero', hand: 'sword' }, 'attack')
  assert.equal(bow.length, ACTION_FRAMES)
  assert.notDeepEqual([...bow[3].data], [...sword[3].data])
  // a style can be forced: same sword-holder, different attack
  const forced = spell.action({ body: 'hero', hand: 'sword' }, 'attack', { style: 'shoot' })
  assert.notDeepEqual([...forced[3].data], [...sword[3].data])
  for (const style of spell.action.styles) assert.equal(spell.action('hero', 'attack', { style }).length, ACTION_FRAMES)
})

test('spell.status overlays an effect on a character, idle or walking', () => {
  const plain = new Set(spell.char('hero').colors())
  const frames = spell.status('hero', 'burning')
  assert.ok(frames.length >= 2 && frames.fps > 0)
  assert.equal(frames[0].w, 32)
  const colors = new Set(frames.flatMap((f) => f.colors()))
  assert.ok([...plain].some((c) => colors.has(c)), 'character visible')
  assert.ok(MATERIALS.orange.some((c) => colors.has(c)), 'flames visible')
  assert.ok(spell.status('slime', 'frozen', { walk: 'left' }).length >= 4)
  // aura sits behind the body: the hero's pixels win where they overlap
  const aura = spell.status('hero', 'aura')[0], body = new Pixmap(32, 32).draw(spell.char('hero'), 4, 8)
  const i = (20 * 32 + 16) * 4 // a pixel on the hero's chest
  assert.deepEqual([...aura.data.subarray(i, i + 4)], [...body.data.subarray(i, i + 4)])
  assert.throws(() => spell.status('hero', 'nope'), /no effect/)
})

test('spell.fxPack writes one tagged row per effect', () => {
  const pack = spell.fxPack(['boom', 'fx-comet-ice', 'rain'], { name: 'fx3' })
  assert.deepEqual(pack.animations, ['boom', 'comet-ice', 'rain'])
  assert.equal(pack.json.meta.frameTags.length, 3)
  assert.deepEqual(Object.keys(pack.files).sort(), ['README.txt', 'fx3.json', 'fx3.png', 'fx3.tres'])
  assert.equal(pack.json.meta.pixspell.loops.rain, true)
  assert.equal(pack.json.meta.pixspell.loops.boom, false)
  const all = spell.fxPack()
  assert.equal(all.animations.length, spell.fx.list.length)
})

test('spell.fx caches renders but hands out fresh arrays', () => {
  const a = spell.fx('comet', { size: 20 }), b = spell.fx('comet', { size: 20 })
  assert.notEqual(a, b)
  assert.equal(a[0], b[0])
  a.pop()
  assert.equal(spell.fx('comet', { size: 20 }).length, b.length)
})

test('effects keep their layout at any size (no hard-coded pixel positions)', () => {
  // where the ink sits (centroid, as a fraction of the frame) and how much of it there is, over all frames
  const ink = (frames, size) => {
    let sx = 0, sy = 0, n = 0
    for (const f of frames) for (let i = 3; i < f.data.length; i += 4) if (f.data[i]) { const p = (i - 3) / 4; sx += p % f.w; sy += Math.floor(p / f.w); n++ }
    return { x: sx / n / size, y: sy / n / size, n }
  }
  for (const id of spell.fx.list) {
    const a = ink(spell.fx(id), 32), b = ink(spell.fx(id, { size: 64 }), 64)
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.1, `${id} drifts when scaled`)
    assert.ok(b.n / a.n > 1.8, `${id} does not grow with its size (${(b.n / a.n).toFixed(2)}x ink at 2x size)`)
  }
})

test('spell.status loops when its effect loops', () => {
  assert.equal(spell.status('hero', 'burning').loop, true)
  assert.equal(spell.status('slime', 'heal').loop, false)
})

test('CLI renders effects and effect packs', async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'pixspell-cli-'))
  const cli = new URL('../scripts/pixspell.js', import.meta.url).pathname
  try {
    const log = execFileSync('node', [cli, 'fx', 'meteor', '--element', 'ice', '--size', '48', '-o', join(dir, 'm.png')], { encoding: 'utf8' })
    assert.match(log, /12 frames @ 14fps, plays once/)
    const png = readFileSync(join(dir, 'm.png'))
    assert.ok(png.includes(Buffer.from('acTL')), 'animated PNG')
    assert.equal(png.readUInt32BE(16), 48)
    assert.match(execFileSync('node', [cli, 'fx', 'burning', '--on', 'slime', '--strip', '-o', join(dir, 's.png')], { encoding: 'utf8' }), /loops/)
    assert.match(execFileSync('node', [cli, 'fxpack', 'meteor', 'poof', '-o', join(dir, 'p.zip')], { encoding: 'utf8' }), /2 effects/)
    // pixspell skill: copies the skill where Agent Skills clients look, with a name matching its folder (the spec's rule)
    execFileSync('node', [cli, 'skill'], { cwd: dir })
    const skill = readFileSync(join(dir, '.agents', 'skills', 'pixspell', 'SKILL.md'), 'utf8')
    assert.match(skill, /^---\nname: pixspell\n/)
    assert.ok(readFileSync(join(dir, '.agents', 'skills', 'pixspell', 'catalog.md'), 'utf8').includes('# PixSpell sprite catalog'))
    execFileSync('node', [cli, 'skill', '--claude'], { cwd: dir })
    assert.equal(readFileSync(join(dir, '.claude', 'skills', 'pixspell', 'SKILL.md'), 'utf8'), skill)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('pixspell sfx: every sound renders clean, loud enough, deterministic', () => {
  assert.ok(spell.sfx.list.length >= 60)
  for (const id of spell.sfx.list) {
    const s = spell.sfx(id)
    assert.ok(s.duration > 0.03 && s.duration < 5, `${id} length ${s.duration}`)
    let peak = 0, energy = 0
    for (const v of s.samples) { assert.ok(Number.isFinite(v), `${id} NaN`); peak = Math.max(peak, Math.abs(v)); energy += v * v }
    assert.ok(peak <= 0.951, `${id} clips (${peak})`)
    assert.ok(Math.sqrt(energy / s.samples.length) > 0.03, `${id} is nearly silent`)
  }
  // same call, same samples (memo off: different volume key forces a fresh render)
  const a = spell.sfx('meteor', { volume: 0.999 }), b = spell.sfx('meteor', { volume: 0.998 })
  assert.ok(Math.abs(a.samples[5000] / 0.999 - b.samples[5000] / 0.998) < 1e-6)
})

test('pixspell sfx: names line up with attack styles, actions and effects', () => {
  for (const st of spell.action.styles) assert.ok(spell.sfx.list.includes(st), `style ${st}`)
  for (const a of spell.action.list.filter((x) => x !== 'attack')) assert.ok(spell.sfx.list.includes(a), `action ${a}`)
  for (const fx of spell.fx.list) {
    const s = spell.sfx.forEffect(fx)
    if (s !== null) assert.ok(spell.sfx.list.includes(s), `${fx} -> ${s}`)
  }
  assert.equal(spell.sfx.forEffect('fx-meteor-ice'), 'meteor')
  assert.equal(spell.sfx.forEffect('explosion-plasma'), 'boom')
  assert.equal(spell.sfx.forEffect('fx-glow'), null)
  assert.throws(() => spell.sfx('nope'), /no sound/)
  assert.throws(() => spell.sfx('hit', { element: 'lava' }), /element/)
})

test('pixspell sfx: element, seed and pitch change the sound; loops are seamless', () => {
  const base = spell.sfx('slash')
  const differs = (x, y) => x.samples.length !== y.samples.length || x.samples.some((v, i) => Math.abs(v - y.samples[i]) > 1e-3)
  for (const el of spell.sfx.elements) assert.ok(differs(base, spell.sfx('slash', { element: el })), el)
  assert.ok(differs(base, spell.sfx('slash', { seed: 1 })))
  assert.ok(differs(spell.sfx('coin'), spell.sfx('coin', { pitch: 1.5 })))
  for (const id of ['rain', 'wind', 'campfire']) {
    const s = spell.sfx(id)
    assert.equal(s.loop, true)
    // the jump from the last sample back to the first is no bigger than a normal step inside the sound
    let maxStep = 0
    for (let i = 1; i < s.samples.length; i++) maxStep = Math.max(maxStep, Math.abs(s.samples[i] - s.samples[i - 1]))
    assert.ok(Math.abs(s.samples[0] - s.samples[s.samples.length - 1]) <= maxStep + 1e-6, `${id} seam`)
  }
})

test('Sound.toWAV writes a valid 16-bit mono WAV', () => {
  const s = spell.sfx('coin')
  const wav = s.toWAV()
  const dv = new DataView(wav.buffer)
  const str = (o, n) => String.fromCharCode(...wav.subarray(o, o + n))
  assert.equal(str(0, 4), 'RIFF'); assert.equal(str(8, 4), 'WAVE'); assert.equal(str(36, 4), 'data')
  assert.equal(dv.getUint32(4, true), wav.length - 8)
  assert.equal(dv.getUint16(22, true), 1)
  assert.equal(dv.getUint32(24, true), spell.sfx.sampleRate)
  assert.equal(dv.getUint16(34, true), 16)
  assert.equal(dv.getUint32(40, true), s.samples.length * 2)
  assert.equal(dv.getInt16(44 + 2000 * 2, true), Math.round(s.samples[2000] * 32767))
  assert.match(s.toDataURL(), /^data:audio\/wav;base64,UklGR/)
  const pack = spell.sfxPack(['coin', 'hit'])
  assert.deepEqual(Object.keys(pack.files).sort(), ['README.txt', 'coin.wav', 'hit.wav'])
})

test('grid: every call delivers art for an 8, 16, 32 or 64 px tile grid', () => {
  const size = (x) => (Array.isArray(x) ? [x[0].w, x[0].h] : [x.w, x.h])
  for (const g of [8, 16, 32, 64]) {
    const k = g / 16
    assert.deepEqual(size(spell('sword', { grid: g })), [16 * k, 16 * k])
    assert.deepEqual(size(spell.frames('coin', { grid: g })), [16 * k, 16 * k])
    assert.deepEqual(size(spell.char('hero', { hat: 'crown', grid: g })), [24 * k, 24 * k])
    assert.deepEqual(size(spell.char({ body: 'slime', grid: g })), [24 * k, 24 * k])
    assert.deepEqual(size(spell.walk('heroine', 'left', { grid: g })), [24 * k, 24 * k])
    assert.deepEqual(size(spell.action('hero', 'attack', { element: 'fire', grid: g })), [32 * k, 32 * k])
    assert.deepEqual(size(spell.status('slime', 'frozen', { grid: g })), [32 * k, 32 * k])
    assert.deepEqual(size(spell.fx('boom', { grid: g })), [32 * k, 32 * k])
    assert.deepEqual(size(spell('fx-meteor-ice', { grid: g })), [32 * k, 32 * k])
    const pack = spell.pack('hero', { grid: g, actions: ['attack'] })
    assert.equal(pack.json.frames[0].frame.w, 32 * k)
    assert.deepEqual(pack.json.meta.pixspell.origin, { x: 16 * k, y: 32 * k - 1 })
    assert.equal(spell.fxPack(['meteor'], { grid: g }).json.frames[0].frame.w, 32 * k)
  }
  assert.equal(spell.walk('hero', 'down', { grid: 32 }).fps, spell.walk('hero', 'down').fps)
  assert.throws(() => spell('sword', { grid: 24 }), /grid must be one of/)
})

test('grid: effects are redrawn natively, sprites smoothed or zoomed, 8 px keeps outlines and details', () => {
  const same = (a, b) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i])
  // a grid-32 effect is the 64 px drawing, not a stretched 32 px one
  assert.ok(same(spell('fx-meteor', { grid: 32, frame: 5 }), spell.fx('fx-meteor', { size: 64 })[5]))
  assert.ok(!same(spell('fx-meteor', { grid: 32, frame: 5 }), spell('fx-meteor', { frame: 5 }).smooth()))
  assert.ok(same(spell('sword', { grid: 32 }), spell('sword').smooth()))
  assert.ok(same(spell('sword', { grid: 32, smooth: false }), spell('sword').scale(2)))
  assert.ok(same(spell.toGrid(spell('sword'), 64), spell('sword').smooth(2)))
  // 8 px: the silhouette edge is outline-colored wherever it meets transparency, and dark details inside survive
  const OUT = [0x1b, 0x12, 0x25]
  for (const id of ['potion', 'sword', 'slime', 'chest', 'skull']) {
    const img = spell(id, { grid: 8 })
    const at = (x, y) => (y * img.w + x) * 4
    const clear = (x, y) => x >= 0 && y >= 0 && x < img.w && y < img.h && img.data[at(x, y) + 3] === 0
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      if (!img.data[at(x, y) + 3]) continue
      if (clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1)) {
        assert.deepEqual([...img.data.subarray(at(x, y), at(x, y) + 3)], OUT, `${id} edge at ${x},${y}`)
      }
    }
  }
  const slime = spell('slime', { grid: 8, frame: 0 })
  let inner = 0 // the eyes: outline-colored pixels with no transparent neighbor
  for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) {
    const i = (y * 8 + x) * 4, n = [-1, 1, -8, 8].map((d) => slime.data[i + d * 4 + 3])
    if (slime.data[i] === 0x1b && slime.data[i + 2] === 0x25 && n.every(Boolean)) inner++
  }
  assert.ok(inner >= 1, 'slime keeps its eyes at 8 px')
})

// ------------------------------------------------------------------ GitHub hero (src/profile.js)
import { fetchStats, heroOf, heroCard, heroAlt, LANGUAGES, CARD } from '../src/profile.js'

const NOW = Date.parse('2026-11-06T12:00:00Z')
const statsOf = (over = {}) => ({ login: 'Octo-Cat', createdAt: '2019-03-01T00:00:00Z', repos: 42, followers: 120, stars: 860,
  languages: { TypeScript: 12, JavaScript: 9 }, activity: { day: 0, week: 3 }, ...over })

test('hero: the login picks the look, the top language the class, the level the weapon', () => {
  const a = heroOf(statsOf(), { now: NOW })
  assert.deepEqual(heroOf(statsOf({ login: 'octo-cat' }), { now: NOW }).spec, a.spec, 'login case does not matter')
  assert.equal(a.language, 'TypeScript')
  assert.equal(a.title, 'knight')
  assert.equal(a.color, LANGUAGES.TypeScript[0])
  assert.equal(a.spec.A, LANGUAGES.TypeScript[0])
  assert.match(a.spec.body, /^(hero|heroine|skeleton|goblin|robot)/, 'a body that holds a weapon')
  assert.ok(spell.char.parts.hand.includes(a.spec.hand))
  // same login, another language: same body and hat, another class
  const b = heroOf(statsOf({ languages: { Rust: 3 } }), { now: NOW })
  assert.equal(b.spec.body, a.spec.body); assert.equal(b.spec.hat, a.spec.hat)
  assert.equal(b.title, 'blacksmith'); assert.match(b.spec.hand, /hammer/)
  // a language without a class still gets one, the same every time; no language at all is an adventurer
  const c = heroOf(statsOf({ languages: { Brainfuck: 1 } }), { now: NOW })
  assert.deepEqual(c, heroOf(statsOf({ languages: { Brainfuck: 1 } }), { now: NOW }))
  assert.match(c.color, /^#[0-9a-f]{6}$/)
  assert.equal(heroOf(statsOf({ languages: {} }), { now: NOW }).title, 'adventurer')
  // the weapon upgrades with the level
  const lo = heroOf(statsOf({ repos: 1, stars: 0, followers: 0, createdAt: '2026-10-01T00:00:00Z' }), { now: NOW })
  const hi = heroOf(statsOf({ stars: 90000, followers: 30000 }), { now: NOW })
  assert.ok(lo.level < 15 && hi.level >= 35, `${lo.level} ${hi.level}`)
  assert.equal(lo.spec.hand, 'held-sword'); assert.equal(hi.spec.hand, 'held-sword-crystal')
  assert.ok(hi.level <= 99 && lo.level >= 1 && lo.progress >= 0 && lo.progress < 1)
  assert.equal(heroAlt(a), `@Octo-Cat: LV ${a.level} TypeScript knight`)
})

test('hero: activity picks the mood, and every mood draws a card', () => {
  const moods = { battle: { day: 2, week: 5 }, quest: { day: 0, week: 1 }, rest: { day: 0, week: 0 } }
  for (const [mood, activity] of Object.entries(moods)) {
    const hero = heroOf(statsOf({ activity }), { now: NOW })
    assert.equal(hero.mood, mood)
    const { frames, fps } = heroCard(hero, { scale: 2 })
    assert.ok(frames.length >= 6 && fps > 0, mood)
    for (const f of frames) { assert.equal(f.w, CARD.w * 2); assert.equal(f.h, CARD.h * 2) }
    assert.notDeepEqual(frames[0].data, frames[frames.length >> 1].data, `${mood} moves`)
  }
  // a login too long for big letters still fits
  assert.equal(heroCard(heroOf(statsOf({ login: 'a'.repeat(39) }), { now: NOW }), { scale: 1 }).frames[0].w, CARD.w)
})

test('hero: fetchStats reads the user, own repos (not forks) and recent events', async () => {
  const iso = (days) => new Date(NOW - days * 86400000).toISOString()
  const calls = []
  const fake = async (url, init) => {
    calls.push([url, init.headers.authorization])
    const body = url.includes('/repos?') ? [
      { fork: false, language: 'Go', stargazers_count: 10, pushed_at: iso(30) },
      { fork: false, language: 'Go', stargazers_count: 5, pushed_at: iso(9) },
      { fork: false, language: null, stargazers_count: 1, pushed_at: iso(60) },
      { fork: true, language: 'Python', stargazers_count: 500, pushed_at: iso(0.1) },
    ] : url.includes('/events/') ? [{ type: 'PushEvent', created_at: iso(3) }, { type: 'WatchEvent', created_at: iso(12) }]
      : { login: 'Gopher', public_repos: 4, followers: 7, created_at: '2020-01-01T00:00:00Z' }
    return { ok: true, status: 200, json: async () => body }
  }
  const s = await fetchStats('gopher', { fetch: fake, token: 't0k', now: NOW })
  assert.deepEqual(s, { login: 'Gopher', createdAt: '2020-01-01T00:00:00Z', repos: 4, followers: 7, stars: 16,
    languages: { Go: 2 }, activity: { day: 0, week: 1 } })
  assert.equal(calls.length, 3)
  assert.ok(calls.every(([url, auth]) => url.startsWith('https://api.github.com/users/gopher') && auth === 'Bearer t0k'))
  const missing = async () => ({ ok: false, status: 404 })
  await assert.rejects(fetchStats('ghost-user', { fetch: missing }), /no GitHub user "ghost-user"/)
  const limited = async () => ({ ok: false, status: 403 })
  await assert.rejects(fetchStats('gopher', { fetch: limited }), /rate limit/)
  await assert.rejects(fetchStats('not a login!', { fetch: fake }), /not a GitHub login/)
})

test('CLI: pixspell hero draws a card from stats', async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdtempSync, writeFileSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'pixspell-hero-'))
  const cli = new URL('../scripts/pixspell.js', import.meta.url).pathname
  try {
    writeFileSync(join(dir, 'stats.json'), JSON.stringify(statsOf({ activity: { day: 1, week: 1 } })))
    const log = execFileSync('node', [cli, 'hero', '--stats', join(dir, 'stats.json'), '--scale', '2', '-o', join(dir, 'h.png')], { encoding: 'utf8' })
    assert.match(log, /@Octo-Cat: LV \d+ TypeScript knight, in battle today/)
    const png = readFileSync(join(dir, 'h.png'))
    assert.ok(png.includes(Buffer.from('acTL')))
    assert.equal(png.readUInt32BE(16), CARD.w * 2)
    assert.ok(png.length < 20000, `small enough for a README (${png.length} bytes)`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

// ------------------------------------------------------------------ preview + MCP (agents looking at assets)
import { previewSheet, describe as describeAsset, resolveItem, itemCode } from '../src/preview.js'

test('preview: an item, the code it prints, and that code make the same frames', () => {
  const items = [
    { sprite: 'slime', A: '#ff4fd8' },
    { char: { body: 'hero', hat: 'knight', hand: 'sword' } },
    { char: 'goblin', action: 'attack', element: 'poison' },
    { char: { body: 'heroine', hat: 'wizard' }, walk: 'left', grid: 32 },
    { char: 'skeleton', status: 'burning' },
    { fx: 'meteor', element: 'ice', size: 64 },
    { sfx: 'slash', element: 'fire', pitch: 1.2 },
  ]
  for (const item of items) {
    const code = itemCode(item)
    const a = resolveItem(spell, item), b = new Function('spell', `return ${code}`)(spell)
    if (a.samples) assert.deepEqual(a.samples, b.samples, code)
    else assert.deepEqual(a.map((f) => f.data), b.map((f) => f.data), code)
  }
  assert.equal(describeAsset(spell.fx('meteor')), '32x32, 12 frames at 14 fps, plays once')
  assert.equal(describeAsset(spell('sword')), '16x16 image')
  assert.match(describeAsset(spell.sfx('coin')), /^sound, \d\.\d\ds$/)
  assert.throws(() => resolveItem(spell, { nothing: 1 }), /needs one of/)
  assert.throws(() => describeAsset(42), /image, frames or a sound/)
  const img = previewSheet(items.map((item) => ({ label: itemCode(item), value: resolveItem(spell, item) })))
  assert.ok(img.w <= 1200 && img.h > 300, `${img.w}x${img.h}`)
})

test('CLI: preview, doctor', async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'pixspell-look-'))
  const cli = new URL('../scripts/pixspell.js', import.meta.url).pathname
  try {
    const log = execFileSync('node', [cli, 'preview', 'slime', 'meteor', "spell.action('hero', 'cast', 'holy')", '{"sfx":"coin"}', '-o', join(dir, 'p.png')], { encoding: 'utf8' })
    assert.match(log, /1\. spell\.frames\('slime'\)/)
    assert.match(log, /2\. spell\.fx\('meteor'\)  ->  32x32, 12 frames at 14 fps, plays once/)
    assert.match(log, /3\. spell\.action\('hero', 'cast', 'holy'\)  ->  32x32, 8 frames/)
    assert.match(log, /4\. spell\.sfx\('coin'\)  ->  sound/)
    assert.equal(readFileSync(join(dir, 'p.png')).subarray(1, 4).toString(), 'PNG')
    assert.throws(() => execFileSync('node', [cli, 'preview', 'no-such-thing'], { stdio: 'pipe' }), /no sprite, effect or sound/)
    const doc = execFileSync('node', [cli, 'doctor'], { encoding: 'utf8', cwd: dir })
    assert.match(doc, /✓ Node /)
    assert.match(doc, /✓ draws and plays/)
    assert.match(doc, /no PixSpell skill|skill up to date|skill differs/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('MCP server: handshake, tools, images, files kept inside the project', async () => {
  const { spawn } = await import('node:child_process')
  const { mkdtempSync, existsSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'pixspell-mcp-'))
  const server = spawn('node', [new URL('../scripts/pixspell.js', import.meta.url).pathname, 'mcp'], { cwd: dir })
  const pending = new Map()
  let buf = '', id = 0
  server.stdout.on('data', (d) => {
    buf += d
    for (let i; (i = buf.indexOf('\n')) >= 0; buf = buf.slice(i + 1)) { const m = JSON.parse(buf.slice(0, i)); pending.get(m.id)?.(m) }
  })
  const rpc = (method, params) => new Promise((done) => { const n = ++id; pending.set(n, done); server.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: n, method, params }) + '\n') })
  const tool = async (name, args) => (await rpc('tools/call', { name, arguments: args })).result
  try {
    const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '1' } })
    assert.equal(init.result.protocolVersion, '2025-06-18')
    assert.equal(init.result.serverInfo.name, 'pixspell')
    assert.ok(init.result.capabilities.tools)
    assert.equal((await rpc('initialize', { protocolVersion: '1999-01-01' })).result.protocolVersion, '2025-11-25', 'unknown version: ours')
    server.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n')
    const { tools } = (await rpc('tools/list', {})).result
    assert.deepEqual(tools.map((t) => t.name), ['preview', 'save', 'pack', 'autotile', 'catalog'])
    for (const t of tools) assert.equal(t.inputSchema.type, 'object')

    const look = await tool('preview', { items: [{ fx: 'meteor', element: 'ice' }, { sfx: 'coin' }] })
    assert.equal(look.content[0].type, 'image'); assert.equal(look.content[0].mimeType, 'image/png')
    assert.equal(Buffer.from(look.content[0].data, 'base64').subarray(1, 4).toString(), 'PNG')
    assert.match(look.content[1].text, /spell\.fx\('meteor', \{ element: 'ice' \}\)/)

    assert.match((await tool('save', { item: { char: 'hero', walk: 'down' }, path: 'art/walk.png' })).content[0].text, /wrote art\/walk\.png/)
    assert.ok(existsSync(join(dir, 'art', 'walk.png')))
    assert.match((await tool('save', { item: { sfx: 'jump' }, path: 'jump.wav' })).content[0].text, /wrote jump\.wav/)
    const outside = await tool('save', { item: { sprite: 'slime' }, path: '../escape.png' })
    assert.equal(outside.isError, true); assert.match(outside.content[0].text, /inside/)
    assert.ok(!existsSync(join(dir, '..', 'escape.png')))
    assert.match((await tool('pack', { char: 'goblin', path: 'goblin.zip' })).content[0].text, /goblin\.zip/)
    assert.match((await tool('catalog', { kind: 'held', query: 'sword' })).content[0].text, /sword-gold/)
    assert.equal((await tool('preview', { items: [{ fx: 'not-an-effect' }] })).isError, true)
    assert.equal((await rpc('tools/call', { name: 'nope', arguments: {} })).error.code, -32602)
    assert.equal((await rpc('resources/list', {})).error.code, -32601)
    assert.deepEqual((await rpc('ping', {})).result, {})
  } finally {
    server.kill()
    rmSync(dir, { recursive: true, force: true })
  }
})

test('nineSlice keeps the corners and repeats the middle', () => {
  const p = spell('panel')
  const big = p.nineSlice(64, 40)
  assert.equal(big.w, 64); assert.equal(big.h, 40)
  const px = (img, x, y) => [...img.data.subarray((y * img.w + x) * 4, (y * img.w + x) * 4 + 4)].join()
  for (const [x, y] of [[0, 0], [3, 3], [1, 2]]) {
    assert.equal(px(big, x, y), px(p, x, y), 'top-left corner')
    assert.equal(px(big, 63 - x, 39 - y), px(p, 15 - x, 15 - y), 'bottom-right corner')
  }
  assert.equal(px(big, 30, 20), px(p, 4 + ((30 - 4) % 8), 4 + ((20 - 4) % 8)), 'middle repeats')
  assert.equal(px(big, 0, 20), px(p, 0, 4 + ((20 - 4) % 8)), 'left edge repeats down')
  assert.deepEqual(p.nineSlice(16, 16).data, p.data, 'same size, same image')
  assert.equal(p.nineSlice(2, 2).w, 9, 'never smaller than the two corners and one middle pixel')
})

// ------------------------------------------------------------------ music
import { SONGS, songRecipe } from '../src/music.js'

test('music: every track renders, loops seamlessly or plays once, and stays in its key', () => {
  assert.ok(spell.music.list.length >= 15)
  const SCALE = { major: [0, 2, 4, 5, 7, 9, 11], minor: [0, 2, 3, 5, 7, 8, 10], harmonic: [0, 2, 3, 5, 7, 8, 11], phrygian: [0, 1, 4, 5, 7, 8, 10] }
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }
  for (const id of spell.music.list) {
    const s = spell.music(id), info = spell.music.info(id)
    assert.equal(s.loop, info.loop, id)
    if (s.loop) {
      assert.ok(s.duration > 10 && s.duration < 60, `${id} ${s.duration}s`)
      assert.ok(Math.abs(s.samples.at(-1) - s.samples[0]) < 0.05, `${id} loop seam`)
    } else assert.ok(s.duration < 6, `${id} jingle ${s.duration}s`)
    let peak = 0, energy = 0
    for (const v of s.samples) { peak = Math.max(peak, Math.abs(v)); energy += v * v }
    assert.ok(peak <= 0.951, `${id} clips`)
    assert.ok(Math.sqrt(energy / s.samples.length) > 0.05, `${id} too quiet`)
    const song = SONGS.find((x) => x.id === id)
    if (song.jingle) continue
    const tonic = (PC[song.key[0]] + (song.key[1] === 'b' ? -1 : song.key[1] === '#' ? 1 : 0) + 12) % 12
    const inKey = SCALE[song.scale].map((x) => (x + tonic) % 12)
    const lead = songRecipe(song).layers.filter((l) => l.vibrato).map((l) => Math.round(69 + 12 * Math.log2(l.freq / 440)) % 12)
    assert.ok(lead.length >= 8, `${id} has a melody`)
    for (const pc of lead) assert.ok(inKey.includes(pc), `${id}: melody note ${pc} outside ${song.key} ${song.scale}`)
  }
  assert.throws(() => spell.music('nope'), /no music/)
  assert.equal(spell.music.info('nope'), null)
  assert.deepEqual(spell.music.tags('boss'), ['battle', 'boss', 'intense'])
})

test('music: same call, same samples; key, tempo and seed change it', () => {
  const a = spell.music('shop', { volume: 0.999 }), b = spell.music('shop', { volume: 0.998 })
  assert.ok(Math.abs(a.samples[20000] / 0.999 - b.samples[20000] / 0.998) < 1e-6, 'deterministic')
  const base = spell.music('shop')
  const fast = spell.music('shop', { tempo: 1.25 })
  assert.ok(Math.abs(fast.duration - base.duration / 1.25) < 0.05, 'tempo scales the length')
  const up = spell.music('shop', { key: 3 }), other = spell.music('shop', { seed: 2 })
  assert.equal(up.samples.length, base.samples.length)
  assert.notDeepEqual(up.samples.slice(0, 5000), base.samples.slice(0, 5000), 'key transposes')
  assert.equal(other.samples.length, base.samples.length)
  assert.notDeepEqual(other.samples, base.samples, 'seed writes another melody')
})

test('walks: 8 directions; diagonals turn humanoids, mirror for the left, and fall back for other bodies', () => {
  assert.deepEqual(spell.walk.diagonals, ['down-right', 'down-left', 'up-right', 'up-left'])
  const knight = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }
  const dr = spell.walk(knight, 'down-right'), dl = spell.walk(knight, 'down-left'), down = spell.walk(knight, 'down')
  assert.equal(dr.length, down.length)
  assert.notDeepEqual(dr[0].data, down[0].data, 'a 3/4 view, not the front view')
  dr.forEach((f, i) => assert.deepEqual(dl[i].data, f.flipX().data, 'left mirrors right'))
  assert.notDeepEqual(spell.walk(knight, 'up-right')[0].data, spell.walk(knight, 'up')[0].data)
  // a body with only a side pose walks diagonally in side view; a body without poses hops
  assert.deepEqual(spell.walk('dog', 'down-right')[0].data, spell.walk('dog', 'right')[0].data)
  assert.deepEqual(spell.walk('slime', 'up-left')[0].data, spell.walk('slime', 'left')[0].data)
  // grids and packs take them too
  assert.equal(spell.walk(knight, 'down-right', { grid: 32 })[0].w, 48)
  const pack = spell.pack(knight, { diagonals: true })
  const raw = Object.entries(pack.files).find(([n]) => n.endsWith('.json'))[1]
  const json = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw))
  for (const d of spell.walk.diagonals) assert.ok(json.meta.frameTags.some((t) => t.name === `walk-${d}`), d)
  assert.throws(() => spell.walk(knight, 'sideways'), /walk direction/)
})

test('autotile: 16 corner tiles that meet, a dual-grid map, overlays and engine files', () => {
  const shore = spell.autotile('water', 'grass')
  assert.equal(shore.tiles.length, 16)
  assert.deepEqual(shore.tiles[0].data, spell('grass').data, 'no inner corner: the outer tile')
  assert.deepEqual(shore.tiles[15].data, spell('water').data, 'every corner inner: the inner tile')
  assert.equal(shore.tile(1, 0, 0, 1), shore.tiles[9])
  // neighbours that share corners meet: along the shared edge, the side of the line matches on both tiles
  const isWater = (img, x, y) => { const [r, g, b] = img.get(x, y); return b > g }
  let mismatch = 0, total = 0
  for (const L of shore.tiles.keys()) for (const R of shore.tiles.keys()) {
    if (((L >> 1) & 1) !== (R & 1) || ((L >> 3) & 1) !== ((R >> 2) & 1)) continue
    for (let y = 0; y < 16; y++) { total++; if (isWater(shore.tiles[L], 15, y) !== isWater(shore.tiles[R], 0, y)) mismatch++ }
  }
  assert.ok(mismatch / total < 0.05, `${mismatch} of ${total} edge rows disagree`)
  // a map: (h + 1) x (w + 1) dual-grid masks, drawn at the map's size
  const cells = [[0, 1, 1], [1, 1, 0]]
  const masks = shore.layout(cells)
  assert.equal(masks.length, 3); assert.equal(masks[0].length, 4)
  assert.equal(masks[1][1], 0 * 1 + 1 * 2 + 1 * 4 + 1 * 8)
  const map = shore.draw(cells)
  assert.equal(map.w, 48); assert.equal(map.h, 32)
  // overlays are transparent away from the inner terrain, and grids scale
  const sand = spell.autotile('dirt-sand', null)
  assert.equal(sand.tiles[0].data.some((v, i) => i % 4 === 3 && v > 0), false)
  assert.equal(spell.autotile('water', 'grass', { grid: 32 }).tiles[5].w, 32)
  // engine files
  const pack = shore.pack()
  assert.ok(pack.files['water-grass.png'] instanceof Uint8Array)
  assert.equal((pack.files['water-grass.tsx'].match(/<wangtile /g) ?? []).length, 16)
  assert.match(pack.files['water-grass.tsx'], /wangtile tileid="1" wangid="0,1,0,1,0,1,0,2"/) // NW corner = water
  assert.match(pack.files['water-grass.tres'], /terrain_set_0\/mode = 1/)
  assert.match(pack.files['water-grass.tres'], /3:3\/0\/terrains_peering_bit\/bottom_right_corner = 1/)
  assert.throws(() => spell.autotile('bar', 'grass'), /needs 16x16 tiles/) // the health bar is 32x8
})

test('palettes: everything drawn afterwards uses the console colors, and null brings full color back', () => {
  const before = spell.char({ body: 'hero', hat: 'knight', hand: 'sword' }).data
  try {
    assert.equal(spell.palette('gameboy'), 'gameboy')
    assert.equal(spell.palette(), 'gameboy')
    const gb = spell.palettes.gameboy.colors
    for (const img of [spell('slime'), spell.char({ body: 'hero', hat: 'knight', hand: 'sword' }), ...spell.fx('meteor'), ...spell.action('goblin', 'attack', 'fire')]) {
      for (const c of img.colors()) assert.ok(gb.includes(c.slice(0, 7)), `${c} is not a Game Boy color`)
    }
    // the outline stays the darkest shade
    const slime = spell('slime')
    const outline = slime.get(6, 5) // an outline pixel of the slime
    assert.deepEqual(outline.slice(0, 3), [0x0f, 0x38, 0x0f])
    spell.palette(['#000000', '#ff0000', '#ffffff'])
    assert.ok(spell('potion').colors().every((c) => ['#000000', '#ff0000', '#ffffff'].includes(c.slice(0, 7))))
    assert.throws(() => spell.palette('nes-ish'), /no palette called/)
  } finally {
    spell.palette(null)
  }
  assert.equal(spell.palette(), null)
  assert.deepEqual(spell.char({ body: 'hero', hat: 'knight', hand: 'sword' }).data, before, 'full color again')
  // converting something already drawn, frames keep their timing
  const coins = spell.toPalette(spell.frames('coin'), 'pico-8')
  assert.equal(coins.length, spell.frames('coin').length)
  assert.ok(coins.every((f) => f.colors().every((c) => spell.palettes['pico-8'].colors.includes(c.slice(0, 7)))))
})

test('import: readPNG decodes RGBA, palette and gray PNGs', async () => {
  const { deflateSync } = await import('node:zlib')
  const { crc32 } = await import('../src/png.js')
  const img = spell('mimic').scale(2)
  for (const bytes of [img.toPNG(), img.toPNG({ deflate: deflateSync })]) assert.deepEqual(spell.readPNG(bytes, inflateSync).data, img.data)
  // a hand-made 2-bit palette PNG with a transparent entry, and a 1-bit gray one
  const chunk = (name, data) => {
    const b = Buffer.alloc(12 + data.length), body = Buffer.concat([Buffer.from(name), data])
    b.writeUInt32BE(data.length, 0); body.copy(b, 4); b.writeUInt32BE(crc32(body) >>> 0, 8 + data.length)
    return b
  }
  const png = (w, h, depth, type, rows, extra = []) => {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = depth; ihdr[9] = type
    const raw = Buffer.concat(rows.map((r) => Buffer.from([0, ...r])))
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), ...extra, chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))])
  }
  // 4x1 pixels, indexes 0 1 2 3 = 0b00011011
  const pal = spell.readPNG(png(4, 1, 2, 3, [[0b00011011]], [chunk('PLTE', Buffer.from([0, 0, 0, 255, 0, 0, 0, 255, 0, 0, 0, 255])), chunk('tRNS', Buffer.from([0]))]), inflateSync)
  assert.deepEqual([0, 1, 2, 3].map((x) => pal.get(x, 0)), [[0, 0, 0, 0], [255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]])
  const gray = spell.readPNG(png(3, 1, 1, 0, [[0b10100000]]), inflateSync)
  assert.deepEqual([0, 1, 2].map((x) => gray.get(x, 0)[0]), [255, 0, 255])
  assert.throws(() => spell.readPNG(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]), inflateSync), /not a PNG/)
})

test('import: a picture becomes a recolorable sprite that draws the same', () => {
  // round trip: draw built-in sprites, read them back as new sprites, draw those
  for (const id of ['sword', 'slime', 'heart', 'coin', 'tree', 'baby-dragon']) {
    const { def, code, ramps, warnings } = spell.fromImage(spell(id), { id: `imported-${id}` })
    assert.deepEqual(warnings, [])
    assert.ok(Object.keys(ramps).length >= 1 && Object.keys(ramps).length <= 3)
    assert.match(code, new RegExp(`id: "imported-${id}"`))
    spell.define(def)
    assert.deepEqual(spell(`imported-${id}`).data, spell(id).data, `${id} draws the same after importing`)
  }
  // the imported sprite recolors and resizes like any other
  const red = spell('imported-slime', { A: 'red' })
  assert.notDeepEqual(red.data, spell('imported-slime').data)
  assert.equal(spell('imported-slime', { grid: 32 }).w, 32)
  // frames of an animation become an animated sprite
  const anim = spell.fromImage(spell.frames('coin'), { id: 'imported-coin-spin' })
  spell.define(anim.def)
  assert.equal(spell.frames('imported-coin-spin').length, spell.frames('coin').length)
  assert.throws(() => spell.define(anim.def), /already exists/)
  assert.throws(() => spell.fromImage(new Pixmap(80, 16)), /at most 64x64/)
  assert.throws(() => spell.fromImage(new Pixmap(8, 8)), /empty/)
})

test('CLI imports a PNG as sprite source', async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdtempSync, readFileSync, writeFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'pixspell-import-'))
  const cli = new URL('../scripts/pixspell.js', import.meta.url).pathname
  try {
    writeFileSync(join(dir, 'my-chest.png'), spell('chest').toPNG())
    const code = execFileSync('node', [cli, 'import', join(dir, 'my-chest.png')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
    assert.match(code, /id: "my-chest"/)
    assert.match(code, /art: `/)
    execFileSync('node', [cli, 'import', join(dir, 'my-chest.png'), '--id', 'loot', '-o', join(dir, 'loot.js'), '--preview', join(dir, 'p.png')], { stdio: 'ignore' })
    const mod = await import(join(dir, 'loot.js'))
    assert.equal(mod.default.id, 'loot')
    assert.ok(readFileSync(join(dir, 'p.png')).length > 100)
    // a strip of frames
    writeFileSync(join(dir, 'strip.png'), sheet(spell.frames('coin'), { columns: 8 }).image.toPNG())
    assert.match(execFileSync('node', [cli, 'import', join(dir, 'strip.png'), '--size', '16x16'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }), /frames: \[/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('animations save, play and sheet like images: frame lists carry fps, loop and helpers', async () => {
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const knight = { body: 'hero', hat: 'knight', hand: 'sword' }
  const all = { walk: spell.walk(knight, 'left'), action: spell.action(knight, 'attack', 'fire'), fx: spell.fx('meteor'), frames: spell.frames('coin'),
    status: spell.status('slime', 'burning'), idle: spell.char.frames(knight), sequence: spell.fx.sequence([{ fx: 'boom' }]), grid: spell.toGrid(spell.frames('coin'), 32) }
  for (const [name, f] of Object.entries(all)) {
    assert.ok(f.fps > 0, `${name} has an fps`)
    for (const m of ['save', 'toAPNG', 'toDataURL', 'toSheet', 'scale']) assert.equal(typeof f[m], 'function', `${name}.${m}`)
    assert.deepEqual(Object.keys(f).filter((k) => isNaN(k)).sort(), Object.keys(f).filter((k) => ['fps', 'loop'].includes(k)).sort(), 'helpers are not enumerable')
  }
  assert.equal(all.frames.fps, sprites.coin.fps)
  assert.equal(all.frames.loop, true)
  assert.equal(spell.frames('fx-meteor').loop, false)
  assert.equal(spell.frames('fx-rain').loop, true)
  const big = all.walk.scale(3)
  assert.equal(big[0].w, all.walk[0].w * 3)
  assert.equal(big.fps, all.walk.fps)
  assert.equal(typeof big.save, 'function')
  assert.equal(all.action.toSheet({ columns: 4 }).frames.length, 8)
  assert.match(all.fx.toDataURL(), /^data:image\/png;base64,/)
  const dir = mkdtempSync(join(tmpdir(), 'pixspell-frames-'))
  try {
    await all.walk.save(join(dir, 'walk.png'))
    const png = readFileSync(join(dir, 'walk.png'))
    assert.ok(png.includes(Buffer.from('acTL')), 'an animated PNG')
    assert.deepEqual(spell.readPNG(png, inflateSync).data, all.walk[0].data, 'its first frame')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('animations in a game loop: atTime, duration, origin (feet, middle, corner) through scale, flipX and grids', () => {
  const knight = { body: 'hero', hat: 'knight', hand: 'sword' }
  const walk = spell.walk(knight, 'left'), swing = spell.action(knight, 'attack', 'fire'), boom = spell.fx('boom')
  assert.deepEqual(walk.origin, [12, 23]) // the feet, as the docs say
  assert.deepEqual(swing.origin, [16, 31])
  assert.deepEqual(spell.walk(knight, 'left', { grid: 32 }).origin, [24, 47])
  assert.deepEqual(spell.toGrid(walk, 32).origin, [24, 47])
  assert.deepEqual(walk.scale(3).origin, [36, 71])
  assert.deepEqual(swing.flipX().origin, [16, 31])
  assert.deepEqual(boom.origin, [16, 16])
  assert.deepEqual(spell.frames('coin').origin, [0, 0])
  assert.deepEqual(spell.toPalette(swing, 'gameboy').origin, [16, 31])
  // looping animations wrap, the others hold their last frame
  assert.equal(walk.atTime(walk.duration + 0.01), walk[0])
  assert.equal(swing.atTime(0), swing[0])
  assert.equal(swing.atTime(99), swing[swing.length - 1])
  assert.equal(swing.duration, swing.length / swing.fps)
  assert.deepEqual(swing.flipX()[0].data, swing[0].flipX().data)
})

test('volume and mute: master, music and sfx levels, clamped; music is on the music bus', () => {
  try {
    assert.equal(spell.volume(0.5), 0.5)
    assert.equal(spell.volume('music', 2), 1, 'clamped')
    assert.equal(spell.volume('sfx', -1), 0)
    assert.equal(spell.volume('music'), 1)
    assert.equal(spell.mute(true), true)
    assert.equal(spell.mute(), true)
    assert.throws(() => spell.volume('voice', 1), /'master', 'music' or 'sfx'/)
    assert.equal(spell.music('victory').kind, 'music')
    assert.equal(spell.sfx('coin').kind, 'sfx')
    assert.equal(spell.music.playing(), null)
  } finally {
    spell.volume(1); spell.volume('music', 1); spell.volume('sfx', 1); spell.mute(false)
  }
})
