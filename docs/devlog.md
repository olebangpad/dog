# DOG devlog

Five plan → build rounds focused on **more effects** and **better engine tech**.
Each round: a plan written before coding, then what actually shipped and how it was checked.

---

## Round 1 · FX engine and the first big batch of effects

### Plan

**Problem.** Effects were hand-drawn or generated once in a throwaway script and frozen as text. Only 5 existed,
and making more meant drawing every frame by hand.

**Tech.** A procedural effect engine (`src/fx.js`):

- An effect is a small *recipe*: a `draw(painter, t)` function per frame plus settings (size, frames, fps, colors).
- The painter draws soft shapes (glow, disc, ring, arc, line, blob, star, spiral, glyph) into an intensity field,
  one field per color ramp (A, B, C), so an explosion can be fire (A) with smoke (B).
- The field is quantized into DOG text art (`1-4`, `5-8`, `a-d`, `w`). So every effect is still a normal,
  recolorable sprite that the gallery, assets, packs and catalog already understand.
- Pixel-art clean-up built in: optional 2×2 ordered dithering for soft glows, a selective outline in each
  ramp's darkest shade (readable on any background), and orphan-pixel removal so there's no single-pixel noise.
- Seeded randomness: the same recipe and seed always produce the same pixels.
- Empty leading/trailing frames are trimmed and the busiest frame becomes the thumbnail automatically.
- `dog.fx(name, { element, size, seed })` regenerates any effect at another size or seed.

**Effects (target ~26).** Bursts (burst, boom, shockwave, firework, dust, impact), magic (magic circle, sparkle
burst, aura, shield, teleport, portal, charge, heal), elements (flame, ice shards, lightning, poison cloud, holy
beam, dark vortex), combat and misc (cross slash, claw, dizzy stars, sleep, splash, coin pop). Each one also comes
in element colors as variants.

**Checks.** Tests: determinism, sizes, no empty frames, colors stay inside the ramps, generation time budget.
A contact sheet of every effect is reviewed by eye before shipping.

### Shipped

- `src/fx.js` engine + `src/fx/recipes.js`: **26 effects**, each with up to 9 color variants (fire, ice, poison, holy,
  dark, water, nature, blood, arcane, steel): **233 new looks** (441 → 674). All go through the normal sprite
  pipeline, so they appear in the gallery, `assets/`, the catalog, packs and `dog()` with no extra code.
- `dog.fx(name, { size, seed, element })` regenerates an effect at any size, seed or color.
- `docs/img/fx.png` showcase.

### What the review caught

- **Fading turned into dark blobs.** The first contact sheet showed bursts, impacts, auras and shields ending as big
  dark-red/blue discs: lowering intensity just slid a large area down to the darkest shade. Fixed in the engine,
  not per effect: the darkest shade is now reserved for the outline and anything under 30% intensity is cleared,
  so effects fade by shrinking and thinning. Then individual tweaks for aura, heal, shield, dizzy, sleep, coin-pop.
- **Page load regression.** The gallery went from 441 to 674 thumbnails and the page took 2.45 s to get ready.
  Thumbnails are now painted lazily with an IntersectionObserver and only visible ones animate: **1.1 s**.

### Measured, left for Round 4

- Generating the 26 effects at import costs ~108 ms of a ~200 ms import.
- A full asset build takes ~20 s and `assets/` is 9.4 MB (2,040 files).

### Checks

39 tests (3 new: every effect is animated and recolorable, `dog.fx` determinism / sizes / colors, every effect pixel
stays inside its ramps), plus the browser suite (studio, maker, actions, walking, demo game, pack download, templates).
