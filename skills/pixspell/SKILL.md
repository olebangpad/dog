---
name: pixspell
description: Build 2D pixel-art games and every asset they need with PixSpell, a zero-dependency JavaScript library of CC0 sprites, characters, effects and sounds. Use when the user wants pixel-art sprites, game characters (23M combinations of bodies, hats and weapons), 8-direction walk cycles, attack/hit/heal/level-up/death animations, 600+ game effects (explosions, magic, slashes, weather, status overlays, crits, meteors), 100+ sound effects made by code (hits, coins, jumps, magic, jingles, loops), tiles, UI icons, recolored or resized sprites, sprite sheets for Phaser or Godot, or a quick browser game prototype.
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
2. Build sprites **once** at startup, then only `ctx.drawImage(img.canvas, x, y)` in the game loop (`.canvas` is made once
   per image and kept). Never call `spell()`, `spell.walk()` or `spell.action()` per frame.
3. Sizes and anchors: tiles/items are 16×16. Characters (`spell.char`, `spell.walk`) are **24×24 with the feet at (12, 23)**.
   Actions and game packs are **32×32 with the feet at (16, 31)**. Draw a character standing at (x, y) with
   `drawImage(walkFrame, x - 12, y - 23)` or `drawImage(actionFrame, x - 16, y - 31)`.
4. Action frames face **right**. For a character facing left, mirror them (`frames.map(f => f.flipX())` or `ctx.scale(-1, 1)`).
   Walk cycles already exist for `left`.
5. Every animation is an array of Pixmaps with `.fps` and `.loop`. In a game loop: `frames.atTime(t)` is the frame t seconds
   in (looping ones wrap, the rest hold the last frame), `frames.duration` is one pass in seconds, and `frames.origin` is the
   point to place at (x, y), already right for the grid: a character's feet, an effect's middle, a plain sprite's top-left:
   `const f = frames.atTime(t); ctx.drawImage(f.canvas, x - frames.origin[0], y - frames.origin[1])`.
   Also `.flipX()` (face left), `.scale(n)`, `.toSheet()`, `.save(path)` (an animated PNG, Node; a GIF if the path ends in `.gif`),
   `.toGIF({ background })` (chat apps and social posts play GIFs, not APNG), `.toDataURL()` (an `<img>` that plays).
6. **Match the game's tile size with `grid`** (8, 16, 32 or 64; the art is drawn on 16). Every call takes it:
   `spell('sword', { grid: 32 })`, `spell.char(spec, { grid: 32 })`, `spell.walk(spec, 'left', { grid: 32 })`,
   `spell.action(spec, 'attack', { element: 'fire', grid: 32 })`, `spell.fx('boom', { grid: 32 })`, `spell.pack(spec, { grid: 32 })`.
   Sizes and anchors scale with it: at grid 32, characters are 48×48 (feet at 24, 47), actions and packs 64×64 (feet at 32, 63).
   Use one grid for the whole game; `smooth: false` gives plain zoom instead of Scale2x.
7. Names are checked: a wrong sprite, effect, sound, track, gear, action, element or color throws an error that names the
   closest real ones (`no sprite called "sowrd". Did you mean "sword"?`). Use the suggestion; don't guess again.

## Characters

A character is a spec: `{ body, hat?, hand?, offhand?, A?, B?, C? }`.

- Short names work: `hat: 'crown'` means `hat-crown`, `hand: 'sword'` means `held-sword`. Variants add a suffix: `'sword-gold'`, `'hero-red'`.
- Humanoid bodies (`hero`, `heroine`, `skeleton`, `goblin`, `robot` and their variants) hold `hand` and `offhand` items.
  Animals and monsters only wear hats: `dog` `cat` `chick` and every monster (`slime` `bat` `ghost` `skull` `eye` `frog`
  `spider` `snake` `rat` `wolf` `shroom` `crab` `beetle` `golem` `imp` `wisp` `jellyfish` `plant` `mimic` `bee` `baby-dragon`
  `owl` `penguin` `bunny` `octopus` `mummy` `yeti` `boar` `piranha` `worm` `scorpion`,
  each with color variants like `wolf-fox` or `golem-lava`). They all walk and do actions, so any monster can be an enemy.
- `A`, `B`, `C` recolor the body's ramps (A is usually the outfit): a material name or any hex color.
- People in traditional clothing (humanoids too): `hanbok` `seonbi` (Korea), `kimono` `samurai` (Japan), `hanfu` (China),
  `aodai` (Vietnam), `sari` (India), `thobe` (Arabia), `kente` (Ghana), `toga` (Rome), `kilt` (Scotland), `dirndl` (Alps),
  `poncho` (Andes), `deel` (Mongolia). Hats from the same places: `gat` `kabuto` `conical` `nemes` `galea` `laurel` `fez`
  `keffiyeh` `turban` `chullo` `kokoshnik` `ushanka` `beret` `tam`; weapons `katana` `gladius` `khopesh` `scimitar` `jian`
  `claymore` `fan` `boomerang`; shields `scutum` `aspis` `hide-shield`. `spell.char.world` has 26 ready-made people
  (`{ id, name, region, spec }`).
- Height: humanoids are chibi (16 px tall) by default; `height: 24` uses their hand-drawn tall version (same head, longer
  body and legs, arms apart, in every pose). Tall characters are 24x32, actions and pack cells 32x40, feet still at the
  bottom center (`frames.origin`). Animals and monsters ignore it. CLI: `--height 24`.
- Skin: `C` is the skin slot of every humanoid body; `spell.char.skins` lists 6 tones, light to deep (`skin-light` `skin`
  `skin-olive` `skin-tan` `skin-brown` `skin-dark`). Random characters already vary it.

```js
const knight = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield', A: 'red' }

spell.char(knight)                         // 24x24 Pixmap, standing
spell.walk(knight, 'left')                 // walk cycle frames (24x24) + .fps   dirs: down up left right
spell.walk(knight, 'down-right')           // diagonals too: down-right down-left up-right up-left (a 3/4 view)
spell.action(knight, 'attack', 'fire')     // 8 frames (32x32) + .fps
spell.action(knight, 'hit', { element: 'ice', amount: '-12' })
spell.char.random(42)                      // a reproducible random spec, great for NPCs
spell.char.parts                           // { body, head, hand, offhand }: every valid id
spell.char({ body: 'samurai', hat: 'kabuto', hand: 'katana', C: 'skin-tan' })
spell.char(spell.char.world.find((w) => w.region === 'Korea').spec)   // a ready-made person
spell.walk({ ...knight, height: 24 }, 'left')                          // taller: 24x32 frames, feet at frames.origin
```

Actions: `attack` (lunge + slash at the weapon hand), `hit` (flash, knock-back, damage number), `heal` (+number, sparkles),
`levelup` ("LV UP", jump, aura), `cast` (aura + charging star at the hand), `death` (fade into smoke).
Elements: `fire` `ice` `poison` `holy` `dark`, or any material name or hex color. Options: `{ element, amount: '-7', text: 'LV UP', label: false }`.
The attack effect follows the held weapon (`spell.action.styleOf(spec)`): sword/scythe slash, dagger stab, spear/trident thrust,
axe/hammer/pickaxe smash, bow shoot, staff/wand magic, rod whip, torch burn, flower/lollipop bonk, empty hand punch.
Force one with `{ style: 'whip' }`.

One character hitting another, with game feel (wind-up, a step in for melee, hit-stop, screen shake, the target's
reaction, sounds). Both sides can be any character or monster body:

```js
const knight = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' }
const duel = spell.act(knight, 'slime', { element: 'fire' })   // frames at 12 fps, attacker on the left facing right
duel.hits[0]      // { frame, time, freeze: 0.25, shake: 2, push: 2 }: pause the game and shake the camera this much
duel.cues         // [{ frame, time, sound, opts }]: spell.sfx(sound, opts) at each time (duel.play() in a browser)
duel.feet         // { attacker: [x, y], target: [x, y] } in the frame
spell.act(knight, 'goblin', { ko: true })                     // a knock-out: crit, death, the target is gone
```

Use the frames for cutscenes, turn-based battles and GIFs (`duel.scale(4).save('hit.gif')`). In a real-time game, keep
drawing your own characters and apply `duel.hits` when your hitbox connects. Options: `element`, `style`, `ko`,
`amount`, `freeze` (seconds), `shake` (px), `distance` (px between feet), `lunge: false`, `grid`.

## Effects

110 procedural effects (`spell.fx.list`), each in up to 11 colors and at any size; every id, its frames and colors are in [catalog.md](catalog.md).
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
- Effects glow: soft translucent light around them, in their own color. Draw them on a dark background for the full look, or
  pass `light: false` for flat pixels (e.g. engines or palettes without alpha).
- `glow`, `aura`, `magic-circle` and `loot-beam` read best drawn **under** the character; the rest go on top.
- Good game feel for little code: `crit` / `pow` / `miss` / `block` over the target, `impact` on a hit, `poof` when an enemy
  vanishes, `coin-pop` on pickup, `confetti` or `firework` on level-up, `glow` under a campfire, `fireflies` or `leaves` drifting.
- Like every animation, build them once (`frames.map(toCanvas)`) and only `drawImage` in the loop.

## Sounds

103 sound effects made by code (`spell.sfx.list`), listed in [catalog.md](catalog.md). Every attack style and every action
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

- Browser: `sound.play({ volume, rate, fadeIn })` returns `{ stop(fade) }`. Browsers only start audio from a key press or
  click, so trigger the first sound from an input handler (later ones can come from the game loop). Loops (`rain`, `wind`,
  `campfire`) are seamless: `.play({ loop: true })`.
- Settings and a mute button: `spell.volume(0.8)` (master), `spell.volume('music', 0.5)`, `spell.volume('sfx', 1)`,
  `spell.mute(true)`. They reach sounds that are already playing; `spell.volume('music')` reads a level.
- Names: UI `click select confirm cancel error text menu`, movement `jump land step dash splash`, pickups `coin gem key pickup
  powerup chest`, jingles `win lose fanfare`, plus the attack styles, actions and effects. Use `seed: 1..4` on repeated
  sounds (hits, steps) so they don't all sound the same.
- Phaser 3: `this.load.audio('coin', 'coin.wav')` with exported files, or with no files
  `this.sound.decodeAudio('coin', spell.sfx('coin').toWAV().buffer)` and play after the `decoded` event.
  Godot: drop the WAVs in and use an `AudioStreamPlayer`. Every sound is also in `assets/sfx/<name>.wav`.

## Music

17 chiptune tracks made by code (`spell.music.list`): seamless loops `title` `town` `field` `forest` `dungeon` `cave`
`battle` `boss` `shop` `night` `castle` `desert` `snow` `ocean` and jingles `victory` `level-clear` `game-over`.
A track is a Sound like the effects: `.play()` (loops by itself; keep what it returns to `.stop()` it), `.toWAV()`, `.save()`.

```js
const theme = spell.music('town')                          // 16 bars, a seamless loop (~37 s)
const faster = spell.music('battle', { tempo: 1.1, key: 2 }) // 10% faster, two semitones up
const another = spell.music('dungeon', { seed: 1 })          // same style, a different melody
console.log(theme.loop, faster.duration, spell.music.info('battle'), spell.music('victory').loop)
```

- Switch tracks on scene changes with `spell.music.play('battle')`: it fades out the track before (`{ fade: 0.6 }` seconds),
  and the same track again keeps playing, so call it whenever a scene starts. `spell.music.stop()` fades out,
  `spell.music.playing()` names the track. Play the first one from a key press or click (autoplay rules). Each track takes
  a fraction of a second to render the first time, then it's cached: build the ones you need at startup.

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
`.opacity(0.5)` `.pad(n)` `.crop(x, y, w, h)` `.trim()` `.nineSlice(w, h)` `.draw(img, x, y)`; output: `.toCanvas()` `.toDataURL()` `.toPNG()` `.save(path)` (Node).

Materials: `red orange gold lime green mint ice blue purple pink wood leather skin sand iron stone bone shadow`.

Maps: seamless ground tiles (`grass` `dirt` `stone` `brick` `planks` `water` `cobblestone` `roof` `carpet` `checker-floor`
`lava`, plus `fence` `bridge` `rails` across and `ladder` down) and props to place on them: `door` `window` `stairs-down`
`barrel` `crate` `pot` `sack` `table` `chair` `bed` `bookshelf` `wall-torch` `lamp-post` `banner` `pillar` `spikes`
`cauldron` `anvil` `well` `fountain` `tent` `minecart` `tombstone` `bones` `cobweb` `tree` `pine-tree` `cactus` `bush` `rock`
`stump` `giant-mushroom` `crystals` `lily-pad` `hay-bale` `pumpkin` `flower` `sign` `campfire`. Most have material
variants (`door-iron`, `checker-floor-dungeon`, `lava-toxic`); every id and variant is in catalog.md.

Terrain transitions: `spell.autotile(inner, outer)` makes the 16 corner tiles between two seamless tiles and draws whole
maps, so coasts, paths and lava edges aren't square. Stack layers with overlays (`outer` null): sea, then sand, then grass.

```js
const lake = [[false, true, true], [true, true, false]]   // cells: true = water
const shore = spell.autotile('water', 'grass')
const ground = shore.draw(lake)                            // 48x32: draw it once, then drawImage it as the map
const sand = spell.autotile('dirt-sand', null).draw(lake)  // an overlay layer
const idx = shore.layout(lake)                             // (h+1) x (w+1) tile indices for your own tilemap (dual grid, offset half a tile)
console.log(ground.w, sand.h, idx[1][1], Object.keys(shore.pack().files))   // .png, .tsx (Tiled), .tres (Godot), .json
```

Retro look: `spell.palette('gameboy')` (also `gameboy-pocket` `pico-8` `sweetie-16` `c64` `cga` `virtual-boy` `1-bit`
`sepia`, or an array of colors) recolors everything drawn afterwards; set it once before building sprites. Text and
anything you composed yourself: `spell.toPalette(img, name)`.

```js
spell.palette('pico-8')
const hero = spell.walk({ body: 'hero', hat: 'knight', hand: 'sword' }, 'down')   // in PICO-8 colors
const hud = spell.toPalette(text('HP 3', { color: '#ff6b5a' }), 'pico-8')
spell.palette(null)
console.log(hero.length, hud.w, Object.keys(spell.palettes))
```

Your own pixel art: `spell.fromImage(img, { id })` turns a picture (a Pixmap, or frames of one animation, up to 64x64)
into a sprite definition: dark edge pixels become the outline, the other colors up to 3 ramps of 4 shades. `spell.define(def)`
registers it, then it recolors, resizes and packs like a built-in. From a file: `npx pixspell import art.png --preview check.png`
(`--size 16x16` splits a strip into frames; `-o art.js` writes the definition). In Node, `spell.readPNG(bytes, zlib.inflateSync)`;
in a browser, `Pixmap.fromImageData(ctx.getImageData(0, 0, w, h))`.

```js
const picture = spell('slime', { A: '#3fa34d' })              // stands in for a PNG you drew
const { def, code, ramps } = spell.fromImage(picture, { id: 'my-slime' })
spell.define(def)
const icy = spell('my-slime', { A: 'ice', grid: 32 })
console.log(Object.keys(ramps), code.split('\n').length, icy.w)
```

UI kit: `panel` `slot` `button` `button-pressed` stretch to any size with `.nineSlice(w, h)`; `bar` is a 32x8 health bar
(`bar-mana`, `bar-xp`, `bar-empty`...: draw `bar-empty`, then a cropped `bar` for the fill); icons `gear` `sound` `mute`
`pause` `play` `home` `menu` `plus` `minus` `arrow` (`.flipX()` for left), plus `heart` `star` `check` `cross` `lock` `cursor`.

```js
const dialog = spell('panel').nineSlice(160, 64)                    // corners stay crisp at any size
const hp = 0.6                                                        // 60% health
const hpBar = spell('bar-empty').draw(spell('bar').crop(0, 0, 1 + Math.round(30 * hp), 8), 0, 0)
const ok = spell('button').nineSlice(48, 16).draw(text('OK'), 18, 5)
```

## Recipe: a playable top-down game in one HTML file

```html
<canvas id="game" width="256" height="176" style="width:768px;image-rendering:pixelated"></canvas>
<script type="module">
import { spell } from 'https://cdn.jsdelivr.net/gh/olebangpad/pixspell@main/src/index.js'

const ctx = document.getElementById('game').getContext('2d')
ctx.imageSmoothingEnabled = false
// any animation, t seconds in, with its origin (a character's feet, an effect's middle) at (x, y)
const draw = (frames, x, y, t = 0) => ctx.drawImage(frames.atTime(t).canvas, Math.round(x) - frames.origin[0], Math.round(y) - frames.origin[1])

// 1. build everything once (never call spell() in the loop)
const HERO = { body: 'heroine', hat: 'wizard', hand: 'staff-fire' }
const walk = Object.fromEntries(spell.walk.dirs.map((d) => [d, spell.walk(HERO, d)]))
const attack = { right: spell.action(HERO, 'attack', 'fire') } // actions face right
attack.left = attack.right.flipX()
const lake = Array.from({ length: 11 }, (_, y) => Array.from({ length: 16 }, (_, x) => Math.hypot(x - 11, y - 4) < 2.6))
const background = spell.autotile('water', 'grass').draw(lake).canvas // 16x11 cells of 16 px, shores included
const swish = spell.sfx('slash', { element: 'fire' })

// 2. state + input
const hero = { x: 64, y: 120, dir: 'down', attackT: -1 }
const keys = new Set()
addEventListener('keydown', (e) => {
  keys.add(e.key)
  spell.music.play('field') // browsers allow sound after a key press; calling it again keeps the same track going
  if (e.key === ' ' && hero.attackT < 0) { hero.attackT = 0; swish.play() }
  if (e.key === 'm') spell.mute(!spell.mute())
})
addEventListener('keyup', (e) => keys.delete(e.key))

// 3. loop: update, then draw
let last = performance.now(), t = 0
requestAnimationFrame(function loop(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now; t += dt
  const mx = keys.has('ArrowRight') - keys.has('ArrowLeft'), my = keys.has('ArrowDown') - keys.has('ArrowUp')
  if (mx || my) hero.dir = Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up')
  hero.x += mx * 60 * dt; hero.y += my * 60 * dt
  ctx.drawImage(background, 0, 0)
  if (hero.attackT >= 0) {
    const a = attack[hero.dir === 'left' ? 'left' : 'right']
    draw(a, hero.x, hero.y, hero.attackT)
    hero.attackT += dt
    if (hero.attackT >= a.duration) hero.attackT = -1
  } else draw(walk[hero.dir], hero.x, hero.y, mx || my ? t : 0)
  requestAnimationFrame(loop)
})
</script>
```

Grow it from there: enemies are more specs (`{ body: 'slime' }`, `{ body: 'goblin', hand: 'dagger' }`) using `spell.walk` +
`spell.action(enemy, 'hit')` / `'death'`; pickups are `spell('coin', { frame })` and `spell('heart')` (`.downscale(2)` gives 8×8);
HUD numbers use `text()`; hit sparks, crits, coin pops and poofs are `spell.fx()` (see Effects), and every one of those
moments has a `spell.sfx()` sound (see Sounds). A complete game in one HTML file (waves, auto-firing spells, level-up picks, statuses, glow, sounds) is
`examples/spell-survivors/index.html` in the repo, and `web/quest.js` is a top-down action example with collisions, coins and a HUD;
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

RPG Maker MV / MZ: `spell.rpgmaker(spec)` (or up to 8 specs) gives `files` for `img/characters/$name.png` (3 x 4 frames of
48 px; tall characters 48 x 64) and `img/faces/name.png`. GameMaker: `spell.pack(spec, { strips: true })` adds
`strips/<name>_<animation>_stripN.png`. Unity: the pack README gives the slice grid (cell size, pivot bottom center).
A profile picture: `spell.avatar(spec, { size: 512 })`.

Godot 4: copy `hero.png` + `hero.tres` to the project root, add an `AnimatedSprite2D`, set Sprite Frames to `hero.tres`
(animations use underscores: `walk_down`), set the texture filter to Nearest. Working Phaser example: `templates/phaser/`.

## Look at what you picked

You can't hear a sound or see a sprite from its name, so look before you wire it in: render your choices into one
image and read it. Each row shows the call, size, frame count and fps, then every frame zoomed on a checkerboard
(sounds as waveforms). Check that the colors read against your game's background, effects aren't cut off at
the frame edge, characters face the way you expect, and one tile size is used everywhere.

```bash
npx pixspell preview slime meteor "spell.action({ body: 'hero', hat: 'knight', hand: 'sword' }, 'attack', 'fire')" -o preview.png
npx pixspell doctor    # Node, rendering, and which skill copies your agents read
```

With the MCP server (`claude mcp add pixspell -- npx -y pixspell mcp`, or `npx -y pixspell mcp` in any MCP client) the
`preview` tool returns that image straight to you, `catalog` finds names, and `save` / `pack` write files into the project.
Its items are JSON, e.g. `{ "char": "goblin", "action": "attack", "element": "poison" }` or `{ "fx": "meteor", "element": "ice" }`,
and every result includes the JavaScript call to paste into the game.

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
