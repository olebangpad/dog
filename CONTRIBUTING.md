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
