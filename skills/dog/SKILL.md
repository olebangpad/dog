---
name: dog-pixel-art
description: Build 2D pixel-art games and game assets with DOG (Dots Of Games), a zero-dependency JavaScript library of CC0 sprites. Use when the user wants pixel-art sprites, game characters (2.7M combinations of bodies, hats and weapons), 4-direction walk cycles, attack/hit/heal/level-up/death effects, tiles, UI icons, recolored or resized sprites, sprite sheets for Phaser or Godot, or a quick browser game prototype.
---

# DOG: pixel art as code

DOG renders every sprite from text art, so anything can be recolored, combined, resized and exported in one call.
Art is CC0 (no credit needed), code is MIT. Repo: https://github.com/olebangpad/dog. Every sprite id is in [catalog.md](catalog.md).

## Setup

Browser, no install or build step (ES module):

```js
import { dog, compose, sheet, text, Pixmap } from 'https://cdn.jsdelivr.net/gh/olebangpad/dog@main/src/index.js'
```

Node: `git clone https://github.com/olebangpad/dog`, then `import { dog } from './dog/src/index.js'` and save images with `await img.save('out.png')`.

Game engines (Phaser, Godot, anything that reads Aseprite/TexturePacker JSON): export a **game pack**, see below.

## Rules that keep pixel art crisp and fast

1. `ctx.imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`. Prefer whole-number zoom.
2. Build sprites **once** at startup and turn them into canvases: `img.toCanvas(document.createElement('canvas'))`.
   Then only `ctx.drawImage()` in the game loop. Never call `dog()`, `dog.walk()` or `dog.action()` per frame.
3. Sizes and anchors: tiles/items are 16×16. Characters (`dog.char`, `dog.walk`) are **24×24 with the feet at (12, 23)**.
   Actions and game packs are **32×32 with the feet at (16, 31)**. Draw a character standing at (x, y) with
   `drawImage(walkFrame, x - 12, y - 23)` or `drawImage(actionFrame, x - 16, y - 31)`.
4. Action frames face **right**. For a character facing left, mirror them (`frames.map(f => f.flipX())` or `ctx.scale(-1, 1)`).
   Walk cycles already exist for `left`.
5. Every animation is an array of Pixmaps with a `.fps` property. Frame at time t: `frames[Math.floor(t * frames.fps) % frames.length]`.

## Characters

A character is a spec: `{ body, hat?, hand?, offhand?, A?, B?, C? }`.

- Short names work: `hat: 'crown'` means `hat-crown`, `hand: 'sword'` means `held-sword`. Variants add a suffix: `'sword-gold'`, `'hero-red'`.
- Humanoid bodies (`hero`, `heroine`, `skeleton`, `goblin`, `robot` and their variants) hold `hand` and `offhand` items.
  Animals and monsters (`dog`, `cat`, `chick`, `slime`, `ghost`, `skull`, `frog`) only wear hats.
- `A`, `B`, `C` recolor the body's ramps (A is usually the outfit): a material name or any hex color.

```js
const knight = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield', A: 'red' }

dog.char(knight)                         // 24x24 Pixmap, standing
dog.walk(knight, 'left')                 // walk cycle frames (24x24) + .fps   dirs: down up left right
dog.action(knight, 'attack', 'fire')     // 8 frames (32x32) + .fps
dog.action(knight, 'hit', { element: 'ice', amount: '-12' })
dog.char.random(42)                      // a reproducible random spec, great for NPCs
dog.char.parts                           // { body, head, hand, offhand }: every valid id
```

Actions: `attack` (lunge + slash at the weapon hand), `hit` (flash, knock-back, damage number), `heal` (+number, sparkles),
`levelup` ("LV UP", jump, aura), `cast` (aura + charging star at the hand), `death` (fade into smoke).
Elements: `fire` `ice` `poison` `holy` `dark`, or any material name or hex color. Options: `{ element, amount: '-7', text: 'LV UP', label: false }`.

## Everything else

```js
dog('potion')                            // 16x16 Pixmap of any sprite id
dog('potion-mana')                       // a named variant
dog('potion', { A: '#ff4fd8' })          // any color: 4 shades are generated from it
dog('coin', { frame: 2 })                // one frame of an animated sprite
dog.frames('water')                      // all frames, in play order
dog.list({ category: 'tiles' })          // ids; categories: characters gear items monsters tiles icons effects

compose(dog('chest-gold'), dog('sparkle', { frame: 3 }).at(8, -6))   // stack layers, place with .at(x, y)
sheet(dog.frames('coin'), { columns: 8 }) // -> { image, frames: [{ x, y, w, h }] }
text('SCORE 120', { color: '#ffd06a' }) // 3x5 pixel font, uppercase
```

Pixmap methods return new images and chain: `.scale(4)` (`0.5` halves) `.smooth()` `.resize(w, h)` `.flipX()` `.flipY()` `.rotate(90)`
`.outline('#fff')` `.shadow()` `.silhouette('#fff')` `.hue(90)` `.adjust({ hue, saturation, lightness })` `.tint(color, 0.5)`
`.opacity(0.5)` `.pad(n)` `.crop(x, y, w, h)` `.trim()` `.draw(img, x, y)`; output: `.toCanvas()` `.toDataURL()` `.toPNG()` `.save(path)` (Node).

Materials: `red orange gold lime green mint ice blue purple pink wood leather skin sand iron stone bone shadow`.

## Recipe: a playable top-down game in one HTML file

```html
<canvas id="game" width="256" height="176" style="width:768px;image-rendering:pixelated"></canvas>
<script type="module">
import { dog, Pixmap } from 'https://cdn.jsdelivr.net/gh/olebangpad/dog@main/src/index.js'

const ctx = document.getElementById('game').getContext('2d')
ctx.imageSmoothingEnabled = false
const toCanvas = (img) => img.toCanvas(document.createElement('canvas'))
const anim = (frames) => ({ imgs: frames.map(toCanvas), fps: frames.fps ?? 6 })

// 1. build everything once
const HERO = { body: 'heroine', hat: 'wizard', hand: 'staff-fire' }
const walk = Object.fromEntries(dog.walk.dirs.map((d) => [d, anim(dog.walk(HERO, d))]))
const swing = dog.action(HERO, 'attack', 'fire') // faces right
const attack = { right: anim(swing), left: { imgs: swing.map((f) => toCanvas(f.flipX())), fps: swing.fps } }
let map = new Pixmap(256, 176)
for (let y = 0; y < 11; y++) for (let x = 0; x < 16; x++) map = map.draw(dog('grass'), x * 16, y * 16)
const background = toCanvas(map)

// 2. state + input
const hero = { x: 128, y: 100, dir: 'down', attackT: -1 }
const keys = new Set()
addEventListener('keydown', (e) => { keys.add(e.key); if (e.key === ' ') hero.attackT = 0 })
addEventListener('keyup', (e) => keys.delete(e.key))

// 3. loop: update, then drawImage only
let last = performance.now(), t = 0
requestAnimationFrame(function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; t += dt
  const mx = keys.has('ArrowRight') - keys.has('ArrowLeft'), my = keys.has('ArrowDown') - keys.has('ArrowUp')
  if (mx || my) hero.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up')
  hero.x += mx * 60 * dt; hero.y += my * 60 * dt
  ctx.drawImage(background, 0, 0)
  if (hero.attackT >= 0) {
    hero.attackT += dt
    const a = attack[hero.dir === 'left' ? 'left' : 'right']
    const i = Math.floor(hero.attackT * a.fps)
    if (i >= a.imgs.length) hero.attackT = -1
    else ctx.drawImage(a.imgs[i], Math.round(hero.x) - 16, Math.round(hero.y) - 31)
  }
  if (hero.attackT < 0) {
    const w = walk[hero.dir]
    const img = mx || my ? w.imgs[Math.floor(t * w.fps) % w.imgs.length] : w.imgs[0]
    ctx.drawImage(img, Math.round(hero.x) - 12, Math.round(hero.y) - 23)
  }
  requestAnimationFrame(loop)
})
</script>
```

Grow it from there: enemies are more specs (`{ body: 'slime' }`, `{ body: 'goblin', hand: 'dagger' }`) using `dog.walk` +
`dog.action(enemy, 'hit')` / `'death'`; pickups are `dog('coin', { frame })` and `dog('heart')` (`.downscale(2)` gives 8×8);
HUD numbers use `text()`. A complete example with collisions, enemies, coins and a HUD is `web/quest.js` in the repo;
a commented starter is `templates/canvas/index.html`.

## Recipe: export for Phaser, Godot or any engine

```js
const pack = dog.pack({ body: 'robot', hat: 'cowboy', hand: 'hammer' }, { name: 'hero' })
pack.files   // { 'hero.png', 'hero.json', 'hero.tres', 'README.txt' }
pack.zip()   // the same files as one .zip (Uint8Array)
```

The sheet has 32×32 cells, one animation per row: `idle`, `walk-down`, `walk-up`, `walk-left`, `walk-right`, `attack`, `hit`,
`heal`, `levelup`, `cast`, `death` (pass `{ actions: ['attack', 'hit'] }` to include fewer). Feet at (16, 31).
CLI: `node scripts/dog.js pack hero --hat crown --hand sword -o hero.zip`. In the web maker: **📦 Game pack**.

Phaser 3:

```js
// preload()
this.load.aseprite('hero', 'hero.png', 'hero.json')
// create(): each sprite gets its own copy of the animations, so several packs never clash
const hero = this.add.sprite(160, 120, 'hero').setOrigin(0.5, 31 / 32)
hero.anims.createFromAseprite('hero')
hero.play({ key: 'walk-down', repeat: -1 })
// new Phaser.Game({ pixelArt: true, ... }); listen with keyboard.on('keydown-SPACE') rather than JustDown for taps
```

Godot 4: copy `hero.png` + `hero.tres` to the project root, add an `AnimatedSprite2D`, set Sprite Frames to `hero.tres`
(animations use underscores: `walk_down`), set the texture filter to Nearest. Working Phaser example: `templates/phaser/`.

## Assets without code

Every sprite and variant is pre-exported in the repo: `assets/png/<id>.png` (16×16), `assets/png@4x/`, `assets/anim/` (animated PNG),
`assets/strips/` (frame strips), `assets/walk/<body>-<dir>.png`, and `assets/atlas.png` + `assets/atlas.json`
(TexturePacker JSON hash, so `this.load.atlas('dog', 'atlas.png', 'atlas.json')` works).

## Making new sprites

Text art legend: `.` clear, `#` outline, `w` white, `1-4` ramp A, `5-8` ramp B, `a-d` ramp C (dark to light). Example:

```js
import { defineSprite, render } from './dog/src/index.js'
const star = defineSprite({ id: 'tiny-star', ramps: { A: 'gold' }, art: `
  ..#..
  .#4#.
  #434#
  .#3#.
  ..#..
` })
render(star, { A: 'pink' }).scale(8)
```

Hats and held items for `dog.char` also need `equip: 'head' | 'hand' | 'offhand'` and `pivot: [x, y]`; see CONTRIBUTING.md in the repo.
