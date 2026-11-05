<div align="center">

<img src="docs/img/banner.png" alt="DOG - Dots Of Games: animated pixel-art sprites" width="100%">

# DOG · Dots Of Games

**Pixel art as code.** 340+ free game sprites you can **combine, resize and recolor in one line**,<br>
plus a character maker with **228,384 gear combinations**. Every sprite is plain text. Zero dependencies.

[**▶ Open the playground**](https://olebangpad.github.io/dog/) ·
[Character maker](#-character-maker) ·
[Download sprites](#-just-want-the-pngs) ·
[Use in code](#-use-it-in-code) ·
[Add a sprite](CONTRIBUTING.md) ·
[한국어](README.ko.md)

![sprites](https://img.shields.io/badge/sprites-90_base_·_346_looks-a8e05a?style=flat-square)
![characters](https://img.shields.io/badge/characters-228%2C384-a8e05a?style=flat-square)
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

### 🧙 Character maker

Put gear on a body **by name**. Bodies know where their head and hands are, gear knows where it's held,
so everything snaps into place, no coordinates needed. Hats ride along with animations (a slime's crown bounces with it).

```js
dog.char('hero', { hat: 'crown', hand: 'sword', offhand: 'shield', A: 'red' })   // 24×24 Pixmap
dog.char('slime-pink', { hat: 'wizard' })
dog.char(dog.char.random(42))                     // same seed → same character, great for NPCs
```

9 bodies (hero, skeleton, dog, cat, chick, slime, ghost, skull, frog) × 10 hats × 9 held items × 3 off-hand items,
with color variants: **228,384 combinations** before you even change the outfit color.

<img src="docs/img/characters.png" alt="24 random characters made with dog.char.random()" width="654">

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

90 base sprites in 7 categories, **346 looks** with variants, 17 of them animated.
Characters, wearable gear, weapons, armor, potions, gems, food, monsters, seamless tiles, props, UI icons,
emote bubbles and effects (explosions, sparkles, smoke, hits, slashes).

<img src="docs/img/gallery.png" alt="Every base sprite in DOG" width="100%">

## 📦 Just want the PNGs?

Everything is pre-exported in [`assets/`](assets). No build step needed.

| Folder | What's inside |
| --- | --- |
| `assets/png/` | every look at 16×16, e.g. `potion-mana.png` |
| `assets/png@4x/` | the same at 64×64 |
| `assets/anim/` | animated PNGs (4x) of every animated look |
| `assets/strips/` | horizontal frame strips (1x) for game engines |
| `assets/atlas.png` + `atlas.json` | one texture atlas with every frame, plus animation lists |

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
```

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
- [ ] Character actions: attack / hit / heal / level-up effects that attach to hands and heads
- [ ] PNG → text art importer
- [ ] More palettes (limit the whole set to a 16- or 32-color palette)
- [ ] 32×32 characters with walk cycles
- [ ] Exporters for Godot / Unity / Phaser
- [ ] npm package

## 📄 License

- **Art** (`src/sprites/`, `assets/`, `docs/img/`): [CC0 1.0](LICENSE-ASSETS), public domain
- **Code**: [MIT](LICENSE)

If DOG saved you some drawing time, a ⭐ helps other devs find it.
