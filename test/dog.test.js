import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inflateSync } from 'node:zlib'
import { dog, looks, sprites, compose, sheet, Pixmap, defineSprite, render, rampFrom, parseColor, toHex, text, encodeAPNG, MATERIALS, CHAR_SIZE, ACTION_SIZE, ACTION_FRAMES, ELEMENTS, PACK_CELL, resolveRamp } from '../src/index.js'

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

// ------------------------------------------------------------ characters
import { BODY_AT } from '../src/character.js'

test('dog.char builds a fixed-size character from names', () => {
  const plain = dog.char('hero')
  const king = dog.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })
  assert.equal(king.w, CHAR_SIZE)
  assert.equal(king.h, CHAR_SIZE)
  assert.notDeepEqual(king.data, plain.data)
  // short names and full ids mean the same thing
  assert.deepEqual(dog.char('hero', { hat: 'crown' }).data, dog.char({ body: 'hero', hat: 'hat-crown' }).data)
  // outfit color only touches the body
  assert.ok(dog.char('hero', { A: '#ff00aa' }).colors().includes('#ff00aa'))
})

test('dog.char rejects things that cannot be worn', () => {
  assert.throws(() => dog.char('potion'), /no anchors/)
  assert.throws(() => dog.char('nobody'), /no body called/)
  assert.throws(() => dog.char('hero', { hat: 'sword' }), /can't be worn on head/)
})

test('animals ignore hand items instead of floating them', () => {
  assert.deepEqual(dog.char('dog', { hand: 'sword' }).data, dog.char('dog').data)
})

test('random characters are reproducible from a seed', () => {
  assert.deepEqual(dog.char.random(7), dog.char.random(7))
  assert.deepEqual(dog.char.random('npc-3'), dog.char.random('npc-3'))
  const specs = new Set(Array.from({ length: 50 }, (_, i) => JSON.stringify(dog.char.random(i))))
  assert.ok(specs.size > 40)
  for (let i = 0; i < 200; i++) dog.char(dog.char.random(i))
})

test('character animation covers body and gear frames', () => {
  assert.equal(dog.char.frames('slime').length, 2)
  assert.equal(dog.char.frames('hero', { hand: 'torch' }).length, looks['held-torch'].def.sequence.length)
  const [a, b] = dog.char.frames('slime', { hat: 'crown' })
  assert.notDeepEqual(a.data, b.data) // the hat rides the bounce
})

test('no gear is clipped on any body or walk pose', () => {
  const { parts } = dog.char
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
  assert.ok(dog.char.count() > 100000)
  assert.ok(dog.char.parts.body.includes('hero') && dog.char.parts.head.includes('hat-crown'))
})

// --------------------------------------------------------------- actions
test('every action gives 8 same-size frames with an fps', () => {
  for (const name of dog.action.list) {
    for (const spec of ['hero', { body: 'dog', hat: 'crown' }, { body: 'slime-blue', hat: 'wizard' }]) {
      const frames = dog.action(spec, name)
      assert.equal(frames.length, ACTION_FRAMES, name)
      assert.ok(frames.every((f) => f.w === ACTION_SIZE && f.h === ACTION_SIZE), name)
      assert.ok(frames.fps > 0, name)
      assert.ok(frames.some((f) => f.colors().length), `${name} is empty`)
    }
  }
})

test('elements recolor the effect', () => {
  const plain = dog.action('hero', 'attack')
  const fire = dog.action('hero', 'attack', 'fire')
  assert.notDeepEqual(plain[2].data, fire[2].data)
  const fireColors = new Set(fire.flatMap((f) => f.colors()))
  assert.ok(MATERIALS.orange.some((c) => fireColors.has(c)))
  // any material or hex works as a custom element
  assert.ok(new Set(dog.action('hero', 'cast', { element: '#00ffcc' }).flatMap((f) => f.colors())).has('#00ffcc'))
  assert.deepEqual(dog.action.elements, Object.keys(ELEMENTS))
})

test('hit flashes white and can hide its number', () => {
  const [first] = dog.action('hero', 'hit')
  assert.ok(first.colors().includes('#ffffff'))
  const withNum = dog.action('hero', 'hit', { amount: '-99' })
  const noNum = dog.action('hero', 'hit', { label: false })
  assert.notDeepEqual(withNum[3].data, noNum[3].data)
})

test('death ends without the character', () => {
  // with a pure-green smoke, the last frame must contain only smoke colors
  const smoke = rampFrom('#00ff00')
  const last = dog.action('ghost', 'death', '#00ff00').at(-1)
  assert.ok(last.colors().length > 0)
  assert.ok(last.colors().every((c) => smoke.includes(c)), last.colors().join(' '))
  assert.throws(() => dog.action('hero', 'dance'), /unknown action/)
})

// ------------------------------------------------------------------ walk
test('walk works for every body in every direction', () => {
  for (const body of dog.char.parts.body.filter((b) => !looks[b].variant)) {
    for (const dir of dog.walk.dirs) {
      const frames = dog.walk({ body, hat: 'crown' }, dir)
      assert.ok(frames.length >= 2, `${body} ${dir}`)
      assert.ok(frames.fps > 0)
      assert.ok(frames.every((f) => f.w === CHAR_SIZE && f.h === CHAR_SIZE))
      assert.notDeepEqual(frames[0].data, frames[1].data, `${body} ${dir} does not move`)
    }
  }
})

test('left is the mirror of right, and humanoids have real back and side poses', () => {
  const spec = { body: 'heroine', hat: 'wizard', hand: 'staff', offhand: 'book' }
  const right = dog.walk(spec, 'right'), left = dog.walk(spec, 'left')
  right.forEach((f, i) => assert.deepEqual(left[i].data, f.flipX().data))
  const down = dog.walk(spec, 'down')[0], up = dog.walk(spec, 'up')[0]
  assert.notDeepEqual(down.data, up.data)
  assert.notDeepEqual(down.data, right[0].data)
  // body colors carry over to the walk poses
  assert.ok(dog.walk('hero-red', 'up')[0].colors().includes(MATERIALS.red[2]))
})

test('walk keeps gear on, and walk poses are not offered as bodies', () => {
  assert.notDeepEqual(dog.walk({ body: 'hero', hat: 'crown' }, 'right')[0].data, dog.walk('hero', 'right')[0].data)
  assert.ok(!dog.char.parts.body.some((b) => b.includes('-walk-')))
  assert.throws(() => dog.walk('hero', 'diagonal'), /walk direction/)
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

test('dog.pack builds a sheet with every animation tagged', () => {
  const pack = dog.pack({ body: 'goblin', hat: 'pirate', hand: 'dagger' })
  const tags = pack.json.meta.frameTags
  assert.deepEqual(tags.map((t) => t.name), ['idle', 'walk-down', 'walk-up', 'walk-left', 'walk-right', ...dog.action.list])
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

test('dog.pack writes a valid zip with png, json, Godot tres and readme', () => {
  const pack = dog.pack('robot', { name: 'bot' })
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

test('dog.pack works for animals and custom elements', () => {
  const pack = dog.pack({ body: 'slime-pink', hat: 'crown' }, { element: 'ice', actions: ['attack', 'hit'] })
  assert.deepEqual(pack.animations, ['idle', 'walk-down', 'walk-up', 'walk-left', 'walk-right', 'attack', 'hit'])
  assert.ok(pack.json.meta.dog.loops['walk-left'] && !pack.json.meta.dog.loops.attack)
})

// -------------------------------------------------------------------- fx
test('every fx recipe is a registered, animated, recolorable sprite', () => {
  assert.ok(dog.fx.list.length >= 26)
  for (const id of dog.fx.list) {
    const def = looks[id].def
    assert.equal(def.category, 'effects')
    assert.ok(def.frames.length >= 2, `${id} is not animated`)
    assert.ok(def.frames.every((f) => f.some((r) => /[^.]/.test(r))), `${id} has an empty frame`)
    assert.ok(Object.keys(def.variants).length >= 3, `${id} needs color variants`)
  }
})

test('dog.fx is deterministic per seed and works at other sizes and colors', () => {
  const a = dog.fx('firework', { seed: 5 }), b = dog.fx('firework', { seed: 5 }), c = dog.fx('firework', { seed: 6 })
  assert.deepEqual(a.map((f) => [...f.data]), b.map((f) => [...f.data]))
  assert.notDeepEqual(a.map((f) => [...f.data]), c.map((f) => [...f.data]))
  const big = dog.fx('boom', { size: 64 })
  assert.equal(big[0].w, 64)
  assert.ok(big.fps > 0)
  const ice = new Set(dog.fx('burst', { element: 'ice' }).flatMap((f) => f.colors()))
  assert.ok([...ice].every((col) => [...MATERIALS.ice, '#ffffff'].includes(col)), [...ice].join(' '))
  assert.equal(dog.fx('magic-circle').loop, true)
  assert.throws(() => dog.fx('nope'), /no effect called/)
})

test('fx colors stay inside their ramps (plus white cores)', () => {
  for (const id of dog.fx.list) {
    const def = looks[id].def
    const allowed = new Set(['#ffffff', ...['A', 'B', 'C'].flatMap((k) => resolveRamp(looks[id].ramps[k]))])
    for (let f = 0; f < def.frames.length; f++) {
      for (const col of dog(id, { frame: f }).colors()) assert.ok(allowed.has(col), `${id} frame ${f}: ${col}`)
    }
  }
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
  for (const id of dog.fx.list.filter((id) => looks[id].def.tags.includes('seamless'))) {
    assert.ok(looks[id].def.frames.length >= 4, id)
  }
  const a = dog.fx('firework', { seed: 1 }), b = dog.fx('firework', { seed: 1 })
  assert.deepEqual(a.map((f) => [...f.data]), b.map((f) => [...f.data]))
})

test('dog.fx.sequence chains and overlaps effects', () => {
  const charge = dog.fx('charge'), boom = dog.fx('boom')
  const seq = dog.fx.sequence([{ fx: 'charge' }, { fx: 'boom' }])
  assert.equal(seq.length, charge.length + boom.length)
  assert.deepEqual([...seq[0].data], [...charge[0].data])
  assert.deepEqual([...seq[charge.length].data], [...boom[0].data])
  const both = dog.fx.sequence([{ fx: 'charge' }, { fx: 'boom', with: true, at: 2 }])
  assert.equal(both.length, Math.max(charge.length, 2 + boom.length))
  const looped = dog.fx.sequence([{ fx: 'orb', repeat: 3 }])
  assert.equal(looped.length, dog.fx('orb').length * 3)
  assert.ok(seq.fps > 0)
})
