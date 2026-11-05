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

---

## Round 2 · Projectiles, beams, weather, status + particles, timelines, cache

### Plan

**What games still miss.** Round 1 covered "something happens here" effects. Games also need things that *travel*
(projectiles, beams), things that *cover the screen* (weather), and things that *stay on a character* (status).

**Tech.**

- **Particles.** `emit()` creates a seeded particle list (origin, speed, spread, gravity, drag, life);
  `p.particles(list, time)` places them with a closed-form motion formula, so any frame can be drawn
  without simulating the previous ones.
- **Seamless tiles.** A `wrap` option makes the painter wrap shapes around the edges, so weather sprites tile
  across a whole screen without seams.
- **Timelines.** `dog.fx.sequence([...])` plays effects one after another or overlapped, at offsets
  (e.g. charge → fireball → explosion), and returns one frame list.
- **Render cache.** `dog()`, `dog.char()` and friends re-render every call; the gallery, studio and game call them
  constantly. Add a bounded cache that hands out copies, so callers can't corrupt it. Measure before and after.

**Effects (target ~20).** Projectiles (comet, orb, energy bolt, spinner, wave), beams (laser, chain lightning),
weather and ambience (rain, snow, leaves, fireflies, bubbles, embers), status (burning, frozen, poisoned, buff,
debuff, confused, love).

**Checks.** Particle determinism, seamless edges for wrapped effects, sequence timing, cache returns equal but
independent images, a benchmark before/after the cache, contact-sheet review.

### Shipped

- **20 new effects (46 total), 116 new looks (674 → 790).** Projectiles: comet, orb, energy bolt, spinner, wave.
  Beams: laser, chain lightning. Weather and ambience: rain, snow, leaves, fireflies, bubbles, embers (all seamless).
  Status: burning, frozen, poisoned, buff, debuff, confused, love.
- Recipes split by theme: `src/fx/core.js`, `motion.js`, `ambient.js`, `status.js` (aggregated in `src/fx/index.js`).
- **Particles**: `p.emit()` and `p.particles(list, t)` with gravity and drag in closed form.
- **Seamless tiles**: `wrap: true` makes the painter, the outline and the clean-up pass wrap around the edges.
- **Timelines**: `dog.fx.sequence([{ fx: 'charge' }, { fx: 'comet' }, { fx: 'boom', with: true, at: 3 }])`.
- `scripts/bench.js`: benchmarks for the hot paths.

### The plan changed after measuring

The plan said "add a render cache". The benchmark said otherwise: `dog(id)` over all 674 looks took **25 ms**
(0.04 ms each), so a cache would barely matter. The real cost was Pixmap operations: `scale(8) + outline` took
**3.3 ms per call**, because every pixel went through a closure and allocated an array. Instead of a cache, the hot
operations (scale, resize, crop, pad, flips, rotate, outline) now work on a 32-bit view of the pixel buffer:

| benchmark | before | after |
| --- | ---: | ---: |
| scale(8) + outline × 200 | 663 ms | 37 ms |
| dog(id) × every look | 25 ms | 15 ms (with 116 more looks) |
| dog.walk × 100 | 39 ms | 19 ms |

A new test compares every optimized operation with a naive per-pixel reference on random images (1×1, odd sizes, 16×16).

### What the review caught

- The first status sheet drew buff/debuff arrows and sleep Z's straight over the character's face; they now sit beside
  the body and above the head (checked by drawing each status over a real character frame).
- `fx-love` silently had only 2 color variants (one was its own color); fixed and covered by the variants test.
- One test I wrote for seamless tiles could never fail (`|| true`). Replaced with a real check: a disc drawn on the
  right edge must appear on the left edge with `wrap`, and must not without it.

### Still open (Round 4)

Effects are generated at import: with 46 recipes that is now most of the 240 ms import.

### Checks

42 tests, benchmark before/after, tiled-weather and status-over-character renders, full browser suite.
