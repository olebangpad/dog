# Contributing to DOG

Thanks for helping grow the collection! New sprites are the most welcome contribution.

## Add a sprite in two minutes

1. Open the [playground](https://olebangpad.github.io/dog/), pick a similar sprite, open **Edit pixels** and draw.
   Or write the text art in any editor.
2. Click **Copy sprite definition** and paste it into the matching file in `src/sprites/`:

   | File | For |
   | --- | --- |
   | `characters.js` | people, animals |
   | `gear.js` | hats and held items for `dog.char()` (see below) |
   | `items.js` | weapons, armor, treasure, food |
   | `monsters.js` | enemies |
   | `tiles.js` | seamless ground tiles and world props |
   | `icons.js` | UI icons, hearts, emote bubbles |
   | `effects.js` | animated effects |

3. Add 2-4 `variants` (other materials for its slots). That's how one drawing becomes many sprites.
4. Run the checks and regenerate the PNGs:

   ```bash
   npm run check    # validator + tests
   npm run build    # re-exports assets/ and docs/img/
   ```

5. Open a pull request with a screenshot.

Tip: draw only the fill, then let the CLI add outlines for you:

```bash
node scripts/dog.js outline < my-sprite.txt
```

## Add gear for the character maker

Hats and held items live in `src/sprites/gear.js`. On top of a normal sprite they need two fields:

```js
{
  id: 'hat-pirate',
  equip: 'head',      // 'head', 'hand' or 'offhand'
  pivot: [8, 9],      // the pixel of this sprite that lands on the body's anchor
  // ...ramps, variants, art as usual
}
```

- **Hats**: the pivot is the bottom row of the brim, horizontally centred. It lands on the top of the head.
- **Held items**: the pivot is the top pixel of the grip. It lands just outside the fist.
- **New bodies** declare `anchors: { head: [x, y], hand: [x, y], offhand: [x, y] }`, optionally one point per animation frame.
  An anchor can carry a third value, `'back'`, to draw that gear behind the body (e.g. a shield in side view).
- **Walk poses** are sprites named `<body>-walk-down`, `-walk-up` and `-walk-side` (facing right) with the `walk` tag and their own anchors.
  Bodies without them hop in place.

`npm test` renders every piece of gear on every body and fails if anything would be clipped, so you'll know right away.

## Adding an effect

Effects are **recipes** in [`src/fx/`](src/fx): a function that paints *light* (an intensity from 0 to about 1.2) for a time `t`
from 0 to 1. The engine turns that light into the 4 shades of a ramp, adds the outline, cleans stray pixels and exports
the result as an ordinary animated sprite, so recoloring, packs and the gallery work with no extra code.

```js
{
  id: 'fx-pulse', color: 'pink', frames: 8, fps: 12, tags: ['magic'], variants: ['fire', 'ice', 'dark'],
  draw(p, t) {
    const { c, s } = p                                    // c: center, s: size / 32
    p.ring(c, c, (3 + 10 * t) * s, 2 * s, 1.1 * (1 - t))  // an expanding ring that fades out
    p.glow(c, c, 4 * s * (1 - t), 1.2)                     // a bright core
  },
}
```

- Put it in the file for its kind (`core`, `motion`, `ambient`, `status`, `combat`, `environment`, `spectacle`); `src/fx/index.js` collects them.
- **Brushes**: `glow` `disc` `ring` `arc` `line` `blob` `star` `spark` `glyph`, `pt` (one art pixel) and `dot` (one canvas pixel, for fills).
  `p.use('B')` switches to the second ramp (declare `B: 'stone'`), `p.rng()` is seeded, and `setup(p)` runs once and lands in `p.state`.
  Particles: `p.emit({ count, x, y, speed, angle, gravity, life })` in `setup`, then `p.particles(p.state, t)` in `draw`.
- **Write every size and position in `s`** (`10 * s`, not `10`), and use `p.px` for 1px lines, so the effect looks the same at 16, 32 or 64 px.
  A test draws every recipe at 32 and 64 px and fails if it drifts or stops growing.
- Flags: `loop: true` for loops; `wrap: true` for seamless tiles (tag them `seamless`); `behind: true` for things drawn under a character;
  `dither`, `outline: 'none' | 'glow'`, `top: 'B'` (layer B wins where both are lit), `clean: false` for text.
- `variants` lists colors from `dog.fx.colors` (`fire ice poison holy dark water nature blood arcane steel`); each one becomes a look.
- Check it with `node scripts/dog.js fx pulse --size 64 --scale 4 -o pulse.png` (or the effects page), then `npm run snapshots` and `npm test`.

## Adding a sound

Sounds are recipes too, in [`src/sfx/sounds.js`](src/sfx/sounds.js): a list of layers that [`src/sfx.js`](src/sfx.js) renders and mixes.

```js
{ id: 'coin', tags: ['pickup', 'reward'], level: 0.86, layers: [
  { wave: 'square', notes: ['B5', 'E6'], every: 0.055, hold: 0.06, decay: 0.3 },   // two quick notes
] }
```

- A layer is one voice: `wave` (square, pulse, saw, triangle, sine, noise), pitch (`freq` → `to`, or `notes` + `every`),
  envelope (`attack`, `hold`, `decay`), and extras: `vibrato`, `tremolo`, `lowpass`/`lowpassTo`, `highpass`, `crush`,
  `delay`, `repeat: { count, every, jitter, pitch, fade }`. The comment at the top of `src/sfx.js` lists them all.
- `level` is loudness relative to the others (the engine evens out loudness, so a square-wave jingle and an explosion sit
  together). `loop: 2` makes a seamless 2-second loop.
- Keep sounds short (most are under 0.6 s) and give them something above ~300 Hz: phone speakers can't play deep bass.
- Check it: `node scripts/dog.js sfx coin -o coin.wav` and listen, try it with an `--element`, then `npm run snapshots` and `npm test`.

## Text art legend

```
.        transparent
#        outline
w        white highlight
1 2 3 4  ramp A, dark -> light
5 6 7 8  ramp B, dark -> light
a b c d  ramp C, dark -> light
```

## Style guide

- **16×16** canvas for items, characters, monsters and icons. Keep a 1px margin so outlines fit.
- **1px dark outline** (`#`) around the silhouette. Effects and flames can outline with their own darkest shade (`1`, `5` or `a`) to glow.
- **Light from the top-left**: highlights (`4`, `w`) up-left, shadows (`1`, `2`) down-right.
- Paint with **ramps, not colors**. Use A for the main material, B for a secondary one, C for accents.
  Never hard-code a color: that would break recoloring.
- Tiles in `tiles.js` tagged `seamless` must tile without visible seams.
- Animated sprites: list `frames`, set `fps`, and optionally `sequence` (play order) and `cover` (thumbnail frame).
- ids are `lowercase-kebab-case`; variant names are lowercase single words.

## Code changes

The library lives in `src/` and has zero dependencies. Please keep it that way. Run `npm test` before opening a PR.
