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

// -------------------------------------------------------- round 3: gameplay
test('attacks follow the held weapon', () => {
  const styles = {
    sword: 'slash', dagger: 'stab', hammer: 'smash', spear: 'thrust', bow: 'shoot', staff: 'magic',
    rod: 'whip', torch: 'burn', lollipop: 'bonk',
  }
  for (const [hand, style] of Object.entries(styles)) assert.equal(dog.action.styleOf({ body: 'hero', hand }), style, hand)
  assert.equal(dog.action.styleOf({ body: 'hero', hand: 'sword-gold' }), 'slash')
  assert.equal(dog.action.styleOf('dog'), 'punch')
  assert.equal(dog.action.styleOf('hero'), 'punch')
  const bow = dog.action({ body: 'hero', hand: 'bow' }, 'attack'), sword = dog.action({ body: 'hero', hand: 'sword' }, 'attack')
  assert.equal(bow.length, ACTION_FRAMES)
  assert.notDeepEqual([...bow[3].data], [...sword[3].data])
  // a style can be forced: same sword-holder, different attack
  const forced = dog.action({ body: 'hero', hand: 'sword' }, 'attack', { style: 'shoot' })
  assert.notDeepEqual([...forced[3].data], [...sword[3].data])
  for (const style of dog.action.styles) assert.equal(dog.action('hero', 'attack', { style }).length, ACTION_FRAMES)
})

test('dog.status overlays an effect on a character, idle or walking', () => {
  const plain = new Set(dog.char('hero').colors())
  const frames = dog.status('hero', 'burning')
  assert.ok(frames.length >= 2 && frames.fps > 0)
  assert.equal(frames[0].w, 32)
  const colors = new Set(frames.flatMap((f) => f.colors()))
  assert.ok([...plain].some((c) => colors.has(c)), 'character visible')
  assert.ok(MATERIALS.orange.some((c) => colors.has(c)), 'flames visible')
  assert.ok(dog.status('slime', 'frozen', { walk: 'left' }).length >= 4)
  // aura sits behind the body: the hero's pixels win where they overlap
  const aura = dog.status('hero', 'aura')[0], body = new Pixmap(32, 32).draw(dog.char('hero'), 4, 8)
  const i = (20 * 32 + 16) * 4 // a pixel on the hero's chest
  assert.deepEqual([...aura.data.subarray(i, i + 4)], [...body.data.subarray(i, i + 4)])
  assert.throws(() => dog.status('hero', 'nope'), /no effect/)
})

test('dog.fxPack writes one tagged row per effect', () => {
  const pack = dog.fxPack(['boom', 'fx-comet-ice', 'rain'], { name: 'fx3' })
  assert.deepEqual(pack.animations, ['boom', 'comet-ice', 'rain'])
  assert.equal(pack.json.meta.frameTags.length, 3)
  assert.deepEqual(Object.keys(pack.files).sort(), ['README.txt', 'fx3.json', 'fx3.png', 'fx3.tres'])
  assert.equal(pack.json.meta.dog.loops.rain, true)
  assert.equal(pack.json.meta.dog.loops.boom, false)
  const all = dog.fxPack()
  assert.equal(all.animations.length, dog.fx.list.length)
})

test('dog.fx caches renders but hands out fresh arrays', () => {
  const a = dog.fx('comet', { size: 20 }), b = dog.fx('comet', { size: 20 })
  assert.notEqual(a, b)
  assert.equal(a[0], b[0])
  a.pop()
  assert.equal(dog.fx('comet', { size: 20 }).length, b.length)
})

test('effects keep their layout at any size (no hard-coded pixel positions)', () => {
  // where the ink sits (centroid, as a fraction of the frame) and how much of it there is, over all frames
  const ink = (frames, size) => {
    let sx = 0, sy = 0, n = 0
    for (const f of frames) for (let i = 3; i < f.data.length; i += 4) if (f.data[i]) { const p = (i - 3) / 4; sx += p % f.w; sy += Math.floor(p / f.w); n++ }
    return { x: sx / n / size, y: sy / n / size, n }
  }
  for (const id of dog.fx.list) {
    const a = ink(dog.fx(id), 32), b = ink(dog.fx(id, { size: 64 }), 64)
    assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 0.1, `${id} drifts when scaled`)
    assert.ok(b.n / a.n > 1.8, `${id} does not grow with its size (${(b.n / a.n).toFixed(2)}x ink at 2x size)`)
  }
})

test('dog.status loops when its effect loops', () => {
  assert.equal(dog.status('hero', 'burning').loop, true)
  assert.equal(dog.status('slime', 'heal').loop, false)
})

test('CLI renders effects and effect packs', async () => {
  const { execFileSync } = await import('node:child_process')
  const { mkdtempSync, readFileSync, rmSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const dir = mkdtempSync(join(tmpdir(), 'dog-cli-'))
  const cli = new URL('../scripts/dog.js', import.meta.url).pathname
  try {
    const log = execFileSync('node', [cli, 'fx', 'meteor', '--element', 'ice', '--size', '48', '-o', join(dir, 'm.png')], { encoding: 'utf8' })
    assert.match(log, /12 frames @ 14fps, plays once/)
    const png = readFileSync(join(dir, 'm.png'))
    assert.ok(png.includes(Buffer.from('acTL')), 'animated PNG')
    assert.equal(png.readUInt32BE(16), 48)
    assert.match(execFileSync('node', [cli, 'fx', 'burning', '--on', 'slime', '--strip', '-o', join(dir, 's.png')], { encoding: 'utf8' }), /loops/)
    assert.match(execFileSync('node', [cli, 'fxpack', 'meteor', 'poof', '-o', join(dir, 'p.zip')], { encoding: 'utf8' }), /2 effects/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('dog.sfx: every sound renders clean, loud enough, deterministic', () => {
  assert.ok(dog.sfx.list.length >= 60)
  for (const id of dog.sfx.list) {
    const s = dog.sfx(id)
    assert.ok(s.duration > 0.03 && s.duration < 5, `${id} length ${s.duration}`)
    let peak = 0, energy = 0
    for (const v of s.samples) { assert.ok(Number.isFinite(v), `${id} NaN`); peak = Math.max(peak, Math.abs(v)); energy += v * v }
    assert.ok(peak <= 0.951, `${id} clips (${peak})`)
    assert.ok(Math.sqrt(energy / s.samples.length) > 0.03, `${id} is nearly silent`)
  }
  // same call, same samples (memo off: different volume key forces a fresh render)
  const a = dog.sfx('meteor', { volume: 0.999 }), b = dog.sfx('meteor', { volume: 0.998 })
  assert.ok(Math.abs(a.samples[5000] / 0.999 - b.samples[5000] / 0.998) < 1e-6)
})

test('dog.sfx: names line up with attack styles, actions and effects', () => {
  for (const st of dog.action.styles) assert.ok(dog.sfx.list.includes(st), `style ${st}`)
  for (const a of dog.action.list.filter((x) => x !== 'attack')) assert.ok(dog.sfx.list.includes(a), `action ${a}`)
  for (const fx of dog.fx.list) {
    const s = dog.sfx.forEffect(fx)
    if (s !== null) assert.ok(dog.sfx.list.includes(s), `${fx} -> ${s}`)
  }
  assert.equal(dog.sfx.forEffect('fx-meteor-ice'), 'meteor')
  assert.equal(dog.sfx.forEffect('explosion-plasma'), 'boom')
  assert.equal(dog.sfx.forEffect('fx-glow'), null)
  assert.throws(() => dog.sfx('nope'), /no sound/)
  assert.throws(() => dog.sfx('hit', { element: 'lava' }), /element/)
})

test('dog.sfx: element, seed and pitch change the sound; loops are seamless', () => {
  const base = dog.sfx('slash')
  const differs = (x, y) => x.samples.length !== y.samples.length || x.samples.some((v, i) => Math.abs(v - y.samples[i]) > 1e-3)
  for (const el of dog.sfx.elements) assert.ok(differs(base, dog.sfx('slash', { element: el })), el)
  assert.ok(differs(base, dog.sfx('slash', { seed: 1 })))
  assert.ok(differs(dog.sfx('coin'), dog.sfx('coin', { pitch: 1.5 })))
  for (const id of ['rain', 'wind', 'campfire']) {
    const s = dog.sfx(id)
    assert.equal(s.loop, true)
    // the jump from the last sample back to the first is no bigger than a normal step inside the sound
    let maxStep = 0
    for (let i = 1; i < s.samples.length; i++) maxStep = Math.max(maxStep, Math.abs(s.samples[i] - s.samples[i - 1]))
    assert.ok(Math.abs(s.samples[0] - s.samples[s.samples.length - 1]) <= maxStep + 1e-6, `${id} seam`)
  }
})

test('Sound.toWAV writes a valid 16-bit mono WAV', () => {
  const s = dog.sfx('coin')
  const wav = s.toWAV()
  const dv = new DataView(wav.buffer)
  const str = (o, n) => String.fromCharCode(...wav.subarray(o, o + n))
  assert.equal(str(0, 4), 'RIFF'); assert.equal(str(8, 4), 'WAVE'); assert.equal(str(36, 4), 'data')
  assert.equal(dv.getUint32(4, true), wav.length - 8)
  assert.equal(dv.getUint16(22, true), 1)
  assert.equal(dv.getUint32(24, true), dog.sfx.sampleRate)
  assert.equal(dv.getUint16(34, true), 16)
  assert.equal(dv.getUint32(40, true), s.samples.length * 2)
  assert.equal(dv.getInt16(44 + 2000 * 2, true), Math.round(s.samples[2000] * 32767))
  assert.match(s.toDataURL(), /^data:audio\/wav;base64,UklGR/)
  const pack = dog.sfxPack(['coin', 'hit'])
  assert.deepEqual(Object.keys(pack.files).sort(), ['README.txt', 'coin.wav', 'hit.wav'])
})

test('grid: every call delivers art for an 8, 16, 32 or 64 px tile grid', () => {
  const size = (x) => (Array.isArray(x) ? [x[0].w, x[0].h] : [x.w, x.h])
  for (const g of [8, 16, 32, 64]) {
    const k = g / 16
    assert.deepEqual(size(dog('sword', { grid: g })), [16 * k, 16 * k])
    assert.deepEqual(size(dog.frames('coin', { grid: g })), [16 * k, 16 * k])
    assert.deepEqual(size(dog.char('hero', { hat: 'crown', grid: g })), [24 * k, 24 * k])
    assert.deepEqual(size(dog.char({ body: 'slime', grid: g })), [24 * k, 24 * k])
    assert.deepEqual(size(dog.walk('heroine', 'left', { grid: g })), [24 * k, 24 * k])
    assert.deepEqual(size(dog.action('hero', 'attack', { element: 'fire', grid: g })), [32 * k, 32 * k])
    assert.deepEqual(size(dog.status('slime', 'frozen', { grid: g })), [32 * k, 32 * k])
    assert.deepEqual(size(dog.fx('boom', { grid: g })), [32 * k, 32 * k])
    assert.deepEqual(size(dog('fx-meteor-ice', { grid: g })), [32 * k, 32 * k])
    const pack = dog.pack('hero', { grid: g, actions: ['attack'] })
    assert.equal(pack.json.frames[0].frame.w, 32 * k)
    assert.deepEqual(pack.json.meta.dog.origin, { x: 16 * k, y: 32 * k - 1 })
    assert.equal(dog.fxPack(['meteor'], { grid: g }).json.frames[0].frame.w, 32 * k)
  }
  assert.equal(dog.walk('hero', 'down', { grid: 32 }).fps, dog.walk('hero', 'down').fps)
  assert.throws(() => dog('sword', { grid: 24 }), /grid must be one of/)
})

test('grid: effects are redrawn natively, sprites smoothed or zoomed, 8 px keeps outlines and details', () => {
  const same = (a, b) => a.w === b.w && a.h === b.h && a.data.every((v, i) => v === b.data[i])
  // a grid-32 effect is the 64 px drawing, not a stretched 32 px one
  assert.ok(same(dog('fx-meteor', { grid: 32, frame: 5 }), dog.fx('fx-meteor', { size: 64 })[5]))
  assert.ok(!same(dog('fx-meteor', { grid: 32, frame: 5 }), dog('fx-meteor', { frame: 5 }).smooth()))
  assert.ok(same(dog('sword', { grid: 32 }), dog('sword').smooth()))
  assert.ok(same(dog('sword', { grid: 32, smooth: false }), dog('sword').scale(2)))
  assert.ok(same(dog.toGrid(dog('sword'), 64), dog('sword').smooth(2)))
  // 8 px: the silhouette edge is outline-colored wherever it meets transparency, and dark details inside survive
  const OUT = [0x1b, 0x12, 0x25]
  for (const id of ['potion', 'sword', 'slime', 'chest', 'skull']) {
    const img = dog(id, { grid: 8 })
    const at = (x, y) => (y * img.w + x) * 4
    const clear = (x, y) => x >= 0 && y >= 0 && x < img.w && y < img.h && img.data[at(x, y) + 3] === 0
    for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) {
      if (!img.data[at(x, y) + 3]) continue
      if (clear(x - 1, y) || clear(x + 1, y) || clear(x, y - 1) || clear(x, y + 1)) {
        assert.deepEqual([...img.data.subarray(at(x, y), at(x, y) + 3)], OUT, `${id} edge at ${x},${y}`)
      }
    }
  }
  const slime = dog('slime', { grid: 8, frame: 0 })
  let inner = 0 // the eyes: outline-colored pixels with no transparent neighbor
  for (let y = 1; y < 7; y++) for (let x = 1; x < 7; x++) {
    const i = (y * 8 + x) * 4, n = [-1, 1, -8, 8].map((d) => slime.data[i + d * 4 + 3])
    if (slime.data[i] === 0x1b && slime.data[i + 2] === 0x25 && n.every(Boolean)) inner++
  }
  assert.ok(inner >= 1, 'slime keeps its eyes at 8 px')
})
