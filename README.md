<div align="center">

<img src="docs/img/banner.png" alt="DOG - Dots Of Games: animated pixel-art sprites" width="100%">

# DOG · Dots Of Games

**Pixel art as code.** 440+ free game sprites and **540+ game effects** you can **combine, resize and recolor in one line**,<br>
plus a character maker with **2.7 million combinations** that walk in 4 directions and act. Every sprite is plain text. Zero dependencies.

[**▶ Play the demo**](https://olebangpad.github.io/dog/game.html) ·
[Open the playground](https://olebangpad.github.io/dog/) ·
[Make a game](#-make-a-game-with-dog) ·
[Character maker](#-character-maker) ·
[Effects](#-545-game-effects) ·
[Actions](#%EF%B8%8F-actions--effects) ·
[Walking](#-walk-in-4-directions) ·
[Download sprites](#-just-want-the-pngs) ·
[Use in code](#-use-it-in-code) ·
[Add a sprite](CONTRIBUTING.md) ·
[한국어](README.ko.md)

![sprites](https://img.shields.io/badge/sprites-126_base_·_441_looks-a8e05a?style=flat-square)
![effects](https://img.shields.io/badge/effects-80_designs_·_545_looks-a8e05a?style=flat-square)
![characters](https://img.shields.io/badge/characters-2%2C756%2C176-a8e05a?style=flat-square)
![license](https://img.shields.io/badge/art-CC0-a8e05a?style=flat-square)
![deps](https://img.shields.io/badge/dependencies-0-a8e05a?style=flat-square)
![size](https://img.shields.io/badge/tile-16×16-a8e05a?style=flat-square)

<img src="docs/img/scene.png" alt="An animated scene built only from DOG sprites" width="576">

</div>

## Why DOG?

Asset packs give you a fixed set of PNGs. When you need the same sword in gold, or a slime in your
game's exact pink, you're stuck redrawing it.

DOG stores every sprite as **text**, painted with **color slots** instead of fixed colors, so any of them
can become any color, size or combination in a single call:

```js
dog('slime', { A: '#ff4fd8' }).scale(8).outline('#fff')
```

### 🎮 A game screen made only from DOG

[**DOG Quest**](https://olebangpad.github.io/dog/game.html) is a tiny playable demo: every pixel on screen comes from this repo.
The hero is a `dog.char()`, it moves with `dog.walk()`, swings with `dog.action('attack')`, enemies flash with
`dog.action('hit')` and puff away with `dog.action('death')`; crits, coin pops, poofs, level-up confetti, the campfire's glow and the
fireflies are `dog.fx()`; tiles, coins, hearts and the HUD text are sprites and the pixel font.
It plays itself until you press a key, and the character maker has a **▶ Play as this character** button.

<a href="https://olebangpad.github.io/dog/game.html"><img src="docs/promo/gameplay.gif" alt="DOG Quest gameplay: a knight fighting slimes, goblins and skeletons" width="512"></a>

Short vertical promo clips (made by `scripts/record-promo.cjs`): [English](docs/promo/dog-reel-en.mp4) · [한국어](docs/promo/dog-reel-ko.mp4) ·
effects reel [English](docs/promo/fx-reel-en.mp4) · [한국어](docs/promo/fx-reel-ko.mp4)

### 🛠 Make a game with DOG

Three ways in, from zero setup to a full engine:

**1. Copy a starter.** [`templates/canvas/index.html`](templates/canvas/index.html) is a complete little game in one file, with no install
and no build step. [`templates/phaser/`](templates/phaser) is the same idea with Phaser 3 and DOG game packs.

**2. Download a game pack.** In the [character maker](https://olebangpad.github.io/dog/#maker) press **📦 Game pack**: one zip with a sprite sheet
(`idle`, 4-way `walk`, `attack`, `hit`, `heal`, `levelup`, `cast`, `death`), Aseprite/Phaser JSON and a Godot 4 SpriteFrames file.
In code it's `dog.pack(spec)`; on the command line it's `node scripts/dog.js pack hero --hat crown --hand sword`.

```js
// Phaser 3
this.load.aseprite('hero', 'hero.png', 'hero.json')
const hero = this.add.sprite(160, 120, 'hero').setOrigin(0.5, 31 / 32)
hero.anims.createFromAseprite('hero')
hero.play({ key: 'walk-left', repeat: -1 })
```

**3. Let your AI assistant build it.** DOG ships a skill for AI coding assistants: [`skills/dog/SKILL.md`](skills/dog/SKILL.md)
(API, pixel-art rules, a full game recipe, engine exports) and [`catalog.md`](skills/dog/catalog.md) (every sprite id). Its code samples run in CI.
For Claude Code, inside your game project:

```bash
mkdir -p .claude/skills/dog && cd .claude/skills/dog
curl -sLO https://raw.githubusercontent.com/olebangpad/dog/main/skills/dog/SKILL.md
curl -sLO https://raw.githubusercontent.com/olebangpad/dog/main/skills/dog/catalog.md
```

Then ask something like *"make a top-down game where a goblin with a dagger fights slimes, using DOG"*.
Other assistants can start from [`llms.txt`](llms.txt).

### 🧙 Character maker

Put gear on a body **by name**. Bodies know where their head and hands are, gear knows where it's held,
so everything snaps into place, no coordinates needed. Hats ride along with animations (a slime's crown bounces with it).

```js
dog.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })   // 24×24 Pixmap
dog.char('slime-pink', { hat: 'wizard' })
dog.char(dog.char.random(42))                     // same seed → same character, great for NPCs
```

12 bodies (hero, heroine, skeleton, goblin, robot, dog, cat, chick, slime, ghost, skull, frog) × 18 hats × 15 held items × 6 off-hand items,
with color variants: **2,756,176 combinations** before you even change the outfit color.

<img src="docs/img/characters.png" alt="24 random characters made with dog.char.random()" width="654">

### ⚔️ Actions & effects

Make any character **do something**. Effects attach to the right spot by themselves: the slash at the weapon hand,
damage numbers and "LV UP" above the hat, smoke over the body. Pick an element and the effect follows it;
on a hit the target burns, freezes or turns sick too.

```js
const frames = dog.action({ body: 'hero', hat: 'knight', hand: 'sword' }, 'attack', 'fire')
// always 8 frames of 32×32, play them at frames.fps: drop straight into a sprite sheet

dog.action('slime', 'hit', { element: 'ice', amount: '-12' })
dog.action('hero-mage', 'cast', '#00ffcc')      // any material or hex works as an element
```

**6 actions** (`attack` `hit` `heal` `levelup` `cast` `death`) × **5 elements** (`fire` `ice` `poison` `holy` `dark`) on any of the 2.7 million characters.

<img src="docs/img/actions.png" alt="Every action in every element, animated" width="672">

Attacks follow the weapon: swords slash, daggers stab, spears thrust, hammers and axes smash, bows shoot, staffs cast,
whips crack, torches burn, flowers bonk, empty hands punch. `dog.action.styleOf(spec)` tells you which; `{ style: 'whip' }` overrides it.

### ✨ 545 game effects

**80 effect designs drawn entirely by code**, each in up to 11 colors and at any size, plus the hand-drawn explosions, sparkles and slashes.
Bursts, magic, elements, projectiles and beams, seamless weather, environment (lava, fog, sunrays, ripples), status overlays,
weapon slashes and hit feedback (POW, CRIT!, MISS, block, parry), rewards, and big moments (meteor, tornado, black hole, summon, revive, confetti).
Browse, recolor and download them on the [**effects page**](https://olebangpad.github.io/dog/fx.html).

<a href="https://olebangpad.github.io/dog/fx.html"><img src="docs/img/fx.png" alt="Every procedural effect, animated" width="100%"></a>

```js
dog.fx('meteor')                                   // frames (32×32) with .fps and .loop
dog.fx('tornado', { element: 'fire', size: 64 })   // 11 colors or any hex, any size, still crisp
dog.fx('rain', { size: 64 })                       // seamless: repeat the tile over a whole map
dog.status('slime', 'frozen')                      // a character with a status effect on (32×32)
dog.fx.sequence([{ fx: 'charge' }, { fx: 'comet', repeat: 2 }, { fx: 'boom', with: true, at: -2 }])
dog.fxPack(['meteor', 'poof', 'crit'])             // one sheet + Phaser/Aseprite JSON + Godot .tres
```

Effects are recipes: a few lines that paint light into layers, which the engine turns into shaded, outlined pixel art
(see [`src/fx/`](src/fx) and [how to add one](CONTRIBUTING.md#adding-an-effect)). A test checks that every recipe keeps its layout when drawn at double size.

### 🚶 Walk in 4 directions

Humanoids have drawn front, back and side poses; gear follows the view (the weapon swaps hands from behind,
the shield tucks behind the body from the side). Animals and monsters hop or float. `left` mirrors `right`.

```js
dog.walk({ body: 'heroine', hat: 'wizard', hand: 'staff' }, 'left')   // frames (24×24), .fps
```

<img src="docs/img/walk.png" alt="Six characters walking down, up, left and right" width="630">

### 🎨 One drawing, any color

Each sprite paints with up to three 4-shade ramps (`A`, `B`, `C`). Swap a ramp for one of 18 hand-tuned
materials, or pass **any hex color** and DOG builds a hue-shifted ramp for you.

<img src="docs/img/recolor.png" alt="A potion recolored into 18 materials, slimes in 12 hex colors, swords in 9 materials" width="100%">

### 🧩 Combine sprites into new ones

Stack sprites as layers with `compose()` and offset them with `.at(x, y)`. The canvas grows to fit.

<img src="docs/img/combine.png" alt="hero + crown = king, hero + helmet = knight, dog + wizard hat = wizard dog" width="348">

### 🔍 Resize and effects that stay crisp

Nearest-neighbor upscaling, **Scale2x** smoothing, majority-vote downscaling (outlines survive),
outlines, drop shadows, hue shifts, flips and rotations, all chainable.

<img src="docs/img/size.png" alt="The same slime at 1x, 2x, 4x, smoothed, halved, outlined, shadowed and hue-shifted" width="100%">

## 🖼 The collection

126 base sprites in 7 categories, **441 looks** with variants, 33 of them animated.
Characters, wearable gear, weapons, armor, potions, gems, food, monsters, seamless tiles, props, UI icons,
emote bubbles and effects (explosions, sparkles, smoke, hits, slashes). On top of that, the [80 procedural effects](#-545-game-effects)
add 525 more animated looks; all of them are exported in `assets/` too.

<img src="docs/img/gallery.png" alt="Every base sprite in DOG" width="100%">

## 📦 Just want the PNGs?

Everything is pre-exported in [`assets/`](assets). No build step needed.

| Folder | What's inside |
| --- | --- |
| `assets/png/` | every look at 16×16, e.g. `potion-mana.png` |
| `assets/png@4x/` | the same at 64×64 |
| `assets/anim/` | animated PNGs (4x) of every animated look |
| `assets/strips/` | horizontal frame strips (1x) for game engines |
| `assets/walk/` | walk-cycle strips for every body in every direction |
| `assets/atlas.png` + `atlas.json` | one texture atlas with every frame (TexturePacker JSON hash: `this.load.atlas('dog', 'atlas.png', 'atlas.json')`) |

All art is **CC0**: use it in commercial games, remix it, no credit required (credit is appreciated ❤).

## 💻 Use it in code

**Browser** (no install, straight from GitHub via jsDelivr):

```html
<script type="module">
  import { dog, compose } from 'https://cdn.jsdelivr.net/gh/olebangpad/dog@main/src/index.js'

  const king = compose(dog('hero'), dog('crown').at(0, -7)).scale(8)
  document.body.append(king.toCanvas())
</script>
```

**Node** (clone the repo; nothing to install):

```js
import { dog, compose, sheet } from './src/index.js'

await dog('sword', { A: 'gold', C: 'red' }).scale(4).save('gold-sword.png')

const frames = dog.frames('slime-blue')            // every animation frame
await sheet(frames).image.scale(4).save('slime-sheet.png')
```

**CLI**:

```bash
node scripts/dog.js list monsters
node scripts/dog.js render potion -A '#ff4fd8' --scale 8 --outline '#fff' -o potion.png
node scripts/dog.js render explosion --anim --scale 4 -o boom.png      # animated PNG
node scripts/dog.js combine hero crown@0,-7 --scale 6 -o king.png
node scripts/dog.js char hero-elf --hat wizard --hand staff-fire -A purple --scale 6 -o mage.png
node scripts/dog.js char --random 42 --scale 6 -o npc.png
node scripts/dog.js char hero --hand sword --action attack --element fire --anim --scale 4 -o slash.png
node scripts/dog.js char heroine --hat cowboy --hand rod --walk left --anim --scale 4 -o walk.png
node scripts/dog.js fx meteor --element ice --size 64 -o meteor.png      # any effect, color, size
node scripts/dog.js fx burning --on slime --strip -o burning.png        # status effect on a character
node scripts/dog.js fxpack meteor poof crit -o effects.zip              # effects as a game pack
```

TypeScript and editors: types ship in [`src/index.d.ts`](src/index.d.ts), so `dog.` autocompletes.

## ✏️ Sprites are just text

```js
{
  id: 'heart',
  ramps: { A: 'red' },          // slot A starts as the "red" material
  art: `
    ...###....###...
    ..#344#..#344#..
    .#3w443##34432#.
    .#344444443322#.
    .#334444433222#.
    ..#3344433222#..
    ...#33433222#...
    ....#333222#....
    .....#3322#.....
    ......#21#......
    .......##.......
  `,
}
```

| Char | Meaning |
| --- | --- |
| `.` | transparent |
| `#` | outline |
| `w` | white highlight |
| `1 2 3 4` | ramp **A**, dark → light |
| `5 6 7 8` | ramp **B**, dark → light |
| `a b c d` | ramp **C**, dark → light |

Because pixels point at *shades* instead of colors, shading survives every recolor. Pixel diffs show
up in pull requests as plain text diffs.

## 📚 API

```js
import { dog, compose, sheet, text, Pixmap } from './src/index.js'
```

| Call | Does |
| --- | --- |
| `dog(id, { A, B, C, frame })` | render a sprite. `A/B/C` take a material name, any hex color, or 4 colors |
| `dog.frames(id, opts)` | every frame of an animation, in play order |
| `dog.list({ category, tag, variants })` | ids of all looks |
| `dog.char(body, { hat, hand, offhand, A, B, C })` | 24×24 character with gear snapped on by name |
| `dog.char.frames(spec)` · `dog.char.random(seed)` | animation frames · a reproducible random character |
| `dog.char.parts` · `dog.char.count()` | every body / hat / hand / off-hand id · number of combinations |
| `dog.walk(spec, dir)` | walk cycle `down` `up` `left` `right` (24×24 frames, `.fps`) |
| `dog.action(spec, name, element)` | 8 frames (32×32, `.fps`) of a character doing `attack` `hit` `heal` `levelup` `cast` `death` |
| `dog.fx(name, { element, size, seed })` | a procedural effect: frames with `.fps` and `.loop`; `dog.fx.list` has every name |
| `dog.fx.sequence(steps)` | chain or overlap effects into one animation |
| `dog.status(spec, effect, { walk })` | a character with a status effect on it (32×32 frames) |
| `dog.pack(spec)` · `dog.fxPack(names)` | game packs: sheet + Aseprite/Phaser JSON + Godot `.tres`, `.zip()` for one file |
| `compose(...layers)` | stack layers; place them with `.at(x, y)` |
| `sheet(images, { columns, gap })` | pack into a sprite sheet → `{ image, frames }` |
| `text('SCORE 9', { color })` | built-in 3×5 pixel font |

Every `Pixmap` method returns a new image, so calls chain:

| Size | Color | Effects / output |
| --- | --- | --- |
| `.scale(n)` (`0.5` halves) | `.hue(deg)` | `.outline(color)` |
| `.smooth()` (Scale2x) | `.adjust({ hue, saturation, lightness })` | `.shadow(color, dx, dy)` |
| `.resize(w, h)` | `.swap(from, to)` | `.silhouette(color)` |
| `.downscale(k)` | `.quantize(palette)` | `.flipX()` `.flipY()` `.rotate(90)` |
| `.pad(n)` `.crop()` `.trim()` | `.tint(color, amount)` `.grayscale()` | `.toPNG()` `.toCanvas()` `.save(path)` |

Materials: `red orange gold lime green mint ice blue purple pink wood leather skin sand iron stone bone shadow`

## 🤝 Contributing

New sprites are the best contribution, and it takes about two minutes:

1. Open the [playground](https://olebangpad.github.io/dog/) → **Edit pixels** → draw → **Copy sprite definition**
2. Paste it into the right file in [`src/sprites/`](src/sprites) and add a few `variants`
3. `npm run check && npm run build`, then open a PR

See [CONTRIBUTING.md](CONTRIBUTING.md) for the style guide. Sprite requests are welcome as issues too.

### Ideas on the roadmap

- [x] Character maker with automatic gear placement
- [x] Character actions: attack / hit / heal / level-up / cast / death, in 5 elements
- [x] Walk cycles in 4 directions
- [x] Playable demo game screen
- [x] Game packs for Phaser / Godot, starter templates, AI skill
- [x] 500+ procedural effects in any color and size, an effects gallery, weapon-aware attacks
- [x] TypeScript types, visual regression tests
- [ ] More bodies (each one adds ~180,000 combinations)
- [ ] PNG → text art importer
- [ ] More palettes (limit the whole set to a 16- or 32-color palette)
- [ ] 32×32 characters with walk cycles
- [ ] npm package

## 📄 License

- **Art** (`src/sprites/`, `assets/`, `docs/img/`): [CC0 1.0](LICENSE-ASSETS), public domain
- **Code**: [MIT](LICENSE)

If DOG saved you some drawing time, a ⭐ helps other devs find it.
