---
name: game-assets
description: Build 2D pixel-art games and game assets with PixSpell, a zero-dependency JavaScript library of CC0 sprites. Use when the user wants pixel-art sprites, game characters (2.7M combinations of bodies, hats and weapons), 4-direction walk cycles, attack/hit/heal/level-up/death animations, 500+ game effects (explosions, magic, slashes, weather, status overlays, crits, meteors), 60+ sound effects made by code (hits, coins, jumps, magic, jingles, loops), tiles, UI icons, recolored or resized sprites, sprite sheets for Phaser or Godot, or a quick browser game prototype.
---

# PixSpell: pixel art as code

PixSpell renders every sprite from text art, so anything can be recolored, combined, resized and exported in one call.
Art is CC0 (no credit needed), code is MIT. Repo: https://github.com/olebangpad/pixspell. Every sprite id is in [catalog.md](catalog.md).

## Setup

Browser, no install or build step (ES module):

```js
import { spell, compose, sheet, text, Pixmap } from 'https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js'
```

Node / bundlers: `npm i pixspell`, then `import { spell } from 'pixspell'` (ES modules only, TypeScript types included).
Save images with `await img.save('out.png')`. The CLI comes along: `npx pixspell render sword --grid 32 -o sword.png`.

Game engines (Phaser, Godot, anything that reads Aseprite/TexturePacker JSON): export a **game pack**, see below.

## Rules that keep pixel art crisp and fast

1. `ctx.imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`. Prefer whole-number zoom.
2. Build sprites **once** at startup and turn them into canvases: `img.toCanvas(document.createElement('canvas'))`.
   Then only `ctx.drawImage()` in the game loop. Never call `spell()`, `spell.walk()` or `spell.action()` per frame.
3. Sizes and anchors: tiles/items are 16×16. Characters (`spell.char`, `spell.walk`) are **24×24 with the feet at (12, 23)**.
   Actions and game packs are **32×32 with the feet at (16, 31)**. Draw a character standing at (x, y) with
   `drawImage(walkFrame, x - 12, y - 23)` or `drawImage(actionFrame, x - 16, y - 31)`.
4. Action frames face **right**. For a character facing left, mirror them (`frames.map(f => f.flipX())` or `ctx.scale(-1, 1)`).
   Walk cycles already exist for `left`.
5. Every animation is an array of Pixmaps with a `.fps` property. Frame at time t: `frames[Math.floor(t * frames.fps) % frames.length]`.
6. **Match the game's tile size with `grid`** (8, 16, 32 or 64; the art is drawn on 16). Every call takes it:
   `spell('sword', { grid: 32 })`, `spell.char(spec, { grid: 32 })`, `spell.walk(spec, 'left', { grid: 32 })`,
   `spell.action(spec, 'attack', { element: 'fire', grid: 32 })`, `spell.fx('boom', { grid: 32 })`, `spell.pack(spec, { grid: 32 })`.
   Sizes and anchors scale with it: at grid 32, characters are 48×48 (feet at 24, 47), actions and packs 64×64 (feet at 32, 63).
   Use one grid for the whole game; `smooth: false` gives plain zoom instead of Scale2x.

## Characters

A character is a spec: `{ body, hat?, hand?, offhand?, A?, B?, C? }`.

- Short names work: `hat: 'crown'` means `hat-crown`, `hand: 'sword'` means `held-sword`. Variants add a suffix: `'sword-gold'`, `'hero-red'`.
- Humanoid bodies (`hero`, `heroine`, `skeleton`, `goblin`, `robot` and their variants) hold `hand` and `offhand` items.
  Animals and monsters (`dog`, `cat`, `chick`, `slime`, `ghost`, `skull`, `frog`) only wear hats.
- `A`, `B`, `C` recolor the body's ramps (A is usually the outfit): a material name or any hex color.

```js
const knight = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield', A: 'red' }

spell.char(knight)                         // 24x24 Pixmap, standing
spell.walk(knight, 'left')                 // walk cycle frames (24x24) + .fps   dirs: down up left right
spell.action(knight, 'attack', 'fire')     // 8 frames (32x32) + .fps
spell.action(knight, 'hit', { element: 'ice', amount: '-12' })
spell.char.random(42)                      // a reproducible random spec, great for NPCs
spell.char.parts                           // { body, head, hand, offhand }: every valid id
```

Actions: `attack` (lunge + slash at the weapon hand), `hit` (flash, knock-back, damage number), `heal` (+number, sparkles),
`levelup` ("LV UP", jump, aura), `cast` (aura + charging star at the hand), `death` (fade into smoke).
Elements: `fire` `ice` `poison` `holy` `dark`, or any material name or hex color. Options: `{ element, amount: '-7', text: 'LV UP', label: false }`.
The attack effect follows the held weapon (`spell.action.styleOf(spec)`): sword/scythe slash, dagger stab, spear/trident thrust,
axe/hammer/pickaxe smash, bow shoot, staff/wand magic, rod whip, torch burn, flower/lollipop bonk, empty hand punch.
Force one with `{ style: 'whip' }`.

## Effects

80 procedural effects (`spell.fx.list`), each in up to 11 colors and at any size; every id, its frames and colors are in [catalog.md](catalog.md).
Kinds (`tags`): burst, magic, element, projectile, beam, weather, environment, status, combat, reward, spectacle; `seamless` ones tile.

```js
const meteor = spell.fx('meteor')                          // frames (32x32) + .fps + .loop (false: play once, then remove)
spell.fx('tornado', { element: 'fire', size: 64 })         // fire ice poison holy dark water nature blood arcane steel, or hex
spell.fx('rain', { size: 64 })                             // seamless loop: repeat the tile over the whole map
spell.status({ body: 'slime' }, 'frozen')                  // character + overlay, 32x32 frames, feet at (16, 31)
spell.status('hero', 'burning', { walk: 'down' })          // walking while burning
spell.fx.sequence([{ fx: 'charge' }, { fx: 'comet', repeat: 2 }, { fx: 'boom', with: true, at: -2 }]) // chain or overlap
spell.fxPack(['fx-meteor', 'fx-poof', 'fx-crit'])          // one sheet, a row per effect, + Aseprite JSON / Godot .tres
```

- Center an effect on its target: `drawImage(frame, x - size / 2, y - size / 2)`. Pick the size for the job:
  16-24 for hit sparks and coin pops, 32 for most, 48-64 for spells and big moments.
- `glow`, `aura`, `magic-circle` and `loot-beam` read best drawn **under** the character; the rest go on top.
- Good game feel for little code: `crit` / `pow` / `miss` / `block` over the target, `impact` on a hit, `poof` when an enemy
  vanishes, `coin-pop` on pickup, `confetti` or `firework` on level-up, `glow` under a campfire, `fireflies` or `leaves` drifting.
- Like every animation, build them once (`frames.map(toCanvas)`) and only `drawImage` in the loop.

## Sounds

66 sound effects made by code (`spell.sfx.list`), listed in [catalog.md](catalog.md). Every attack style and every action
has a sound of the same name, and `spell.sfx.forEffect()` gives an effect's sound.

```js
const hero = { body: 'hero', hand: 'axe' }
const swing = spell.sfx(spell.action.styleOf(hero))          // the attack sound for the weapon ('smash' for an axe)
spell.sfx('hit', { element: 'ice', seed: 2 })              // element flavor (like an effect color), seed = small variation
spell.sfx('coin', { pitch: 1.5 })                          // pitch multiplier
spell.sfx(spell.sfx.forEffect('fx-meteor'))                  // the sound that goes with an effect
const wav = spell.sfx('levelup').toWAV()                   // 16-bit mono WAV bytes; .toDataURL(); .save(path) in Node
const sounds = spell.sfxPack(['slash', 'hit', 'coin'])     // WAVs in one zip: .files, .zip()
console.log(swing.duration, wav.length, Object.keys(sounds.files))
```

- Browser: `sound.play()` returns `{ stop() }`. Browsers only start audio from a key press or click, so trigger the first
  sound from an input handler (later ones can come from the game loop). Loops (`rain`, `wind`, `campfire`) are seamless:
  `.play({ loop: true })`.
- Names: UI `click select confirm cancel error text menu`, movement `jump land step dash splash`, pickups `coin gem key pickup
  powerup chest`, jingles `win lose fanfare`, plus the attack styles, actions and effects. Use `seed: 1..4` on repeated
  sounds (hits, steps) so they don't all sound the same.
- Phaser 3: `this.load.audio('coin', 'coin.wav')` with exported files, or with no files
  `this.sound.decodeAudio('coin', spell.sfx('coin').toWAV().buffer)` and play after the `decoded` event.
  Godot: drop the WAVs in and use an `AudioStreamPlayer`. Every sound is also in `assets/sfx/<name>.wav`.

## Everything else

```js
spell('potion')                            // 16x16 Pixmap of any sprite id
spell('potion-mana')                       // a named variant
spell('potion', { A: '#ff4fd8' })          // any color: 4 shades are generated from it
spell('coin', { frame: 2 })                // one frame of an animated sprite
spell.frames('water')                      // all frames, in play order
spell.list({ category: 'tiles' })          // ids; categories: characters gear items monsters tiles icons effects

compose(spell('chest-gold'), spell('sparkle', { frame: 3 }).at(8, -6))   // stack layers, place with .at(x, y)
sheet(spell.frames('coin'), { columns: 8 }) // -> { image, frames: [{ x, y, w, h }] }
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
import { spell, Pixmap } from 'https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js'

const ctx = document.getElementById('game').getContext('2d')
ctx.imageSmoothingEnabled = false
const toCanvas = (img) => img.toCanvas(document.createElement('canvas'))
const anim = (frames) => ({ imgs: frames.map(toCanvas), fps: frames.fps ?? 6 })

// 1. build everything once
const HERO = { body: 'heroine', hat: 'wizard', hand: 'staff-fire' }
const walk = Object.fromEntries(spell.walk.dirs.map((d) => [d, anim(spell.walk(HERO, d))]))
const swing = spell.action(HERO, 'attack', 'fire') // faces right
const attack = { right: anim(swing), left: { imgs: swing.map((f) => toCanvas(f.flipX())), fps: swing.fps } }
let map = new Pixmap(256, 176)
for (let y = 0; y < 11; y++) for (let x = 0; x < 16; x++) map = map.draw(spell('grass'), x * 16, y * 16)
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

Grow it from there: enemies are more specs (`{ body: 'slime' }`, `{ body: 'goblin', hand: 'dagger' }`) using `spell.walk` +
`spell.action(enemy, 'hit')` / `'death'`; pickups are `spell('coin', { frame })` and `spell('heart')` (`.downscale(2)` gives 8×8);
HUD numbers use `text()`; hit sparks, crits, coin pops and poofs are `spell.fx()` (see Effects), and every one of those
moments has a `spell.sfx()` sound (see Sounds). A complete example with collisions, enemies, coins, crits, effects and a HUD is `web/quest.js` in the repo;
a commented starter is `templates/canvas/index.html`.

## Recipe: export for Phaser, Godot or any engine

```js
const pack = spell.pack({ body: 'robot', hat: 'cowboy', hand: 'hammer' }, { name: 'hero' })
pack.files   // { 'hero.png', 'hero.json', 'hero.tres', 'README.txt' }
pack.zip()   // the same files as one .zip (Uint8Array)
```

The sheet has 32×32 cells, one animation per row: `idle`, `walk-down`, `walk-up`, `walk-left`, `walk-right`, `attack`, `hit`,
`heal`, `levelup`, `cast`, `death` (pass `{ actions: ['attack', 'hit'] }` to include fewer). Feet at (16, 31).
CLI: `node scripts/pixspell.js pack hero --hat crown --hand sword -o hero.zip`. In the web maker: **📦 Game pack**.

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
(TexturePacker JSON hash, so `this.load.atlas('pixspell', 'atlas.png', 'atlas.json')` works).

## Making new sprites

Text art legend: `.` clear, `#` outline, `w` white, `1-4` ramp A, `5-8` ramp B, `a-d` ramp C (dark to light). Example:

```js
import { defineSprite, render } from 'pixspell'
const star = defineSprite({ id: 'tiny-star', ramps: { A: 'gold' }, art: `
  ..#..
  .#4#.
  #434#
  .#3#.
  ..#..
` })
render(star, { A: 'pink' }).scale(8)
```

Hats and held items for `spell.char` also need `equip: 'head' | 'hand' | 'offhand'` and `pivot: [x, y]`; see CONTRIBUTING.md in the repo.
