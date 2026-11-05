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

---

## Round 3 · Effects in gameplay: weapon attacks, status overlays, FX packs, FX gallery

### Plan

**Problem.** The effects exist, but a game dev still has to wire them up by hand. Every attack looks the same
whatever the character holds, and effects can't be downloaded the way characters can.

**Tech.**

- **Weapon-aware attacks.** `dog.action(spec, 'attack')` picks a style from the held item: sword/scythe slash,
  dagger stab, axe/hammer/pickaxe smash, spear/trident thrust, bow shoots an arrow, staff/wand fires a magic bolt
  in the element color, fishing rod whips, torch bursts into flame, lollipop/flower bonk, bare hands punch.
  Still 8 frames of 32×32, so packs and games don't change. Override it with `{ style }`.
- **FX memo.** Attacks will now call `dog.fx` often, so cache rendered effects by name, size, seed and colors.
  This is the cache Round 2 didn't need yet; now there's a real caller.
- **Status overlays.** `dog.status(spec, 'burning', { walk: 'left' })` puts a status effect on a character
  (idle or walking). Effects that belong behind the body (aura) draw behind it.
- **FX packs.** `dog.fxPack(ids)` uses the same format as character packs: one row per effect, Aseprite/Phaser JSON,
  Godot SpriteFrames, a README. The pack code gets refactored so both packs share one writer.
- **FX gallery page** (`fx.html`), like the "244 effects" reel that started this: every effect animating at once,
  filters by kind, one color switch for everything, click to preview big with code, and download one effect or all
  of them as a pack.

**Effects (target ~12).** Attack effects the styles need: stab, smash, thrust, whip, arrow, pow (comic bonk).
Plus combat feedback: crit, miss, block, parry, whirlwind (spin attack), loot beam.

**Checks.** Different weapons produce different attacks; status frames contain both character and effect; FX pack
zip structure and tags; memo returns identical frames; the new page in desktop and mobile browsers.

### Shipped

- **Weapon-aware attacks.** `dog.action(spec, 'attack')` reads the held item: sword/scythe slash, dagger stab,
  axe/hammer/pickaxe smash (ground shockwave + debris), spear/trident thrust, bow shoots an arrow that flies out,
  staff/wand fire a magic bolt that bursts, fishing rod whips, torch bursts into flame, lollipop/flower bonk
  ("POW"), bare hands and animals punch. `dog.action.styleOf(spec)` and `{ style }` override.
- **12 combat effects (58 total).** stab, smash, thrust, whip, arrow, pow, crit, miss, block, parry, whirlwind,
  loot beam. **851 looks** in all; 430 of them are effects.
- **`dog.status(spec, name, { walk })`** puts a status effect on an idle or walking character; aura, magic circle
  and loot beam draw *behind* the body.
- **`dog.fxPack(ids)`**: one tagged row per effect, same files as character packs. The pack writer was refactored
  into a shared `writePack()` that both use (and that centers smaller frames in the cell).
- **FX memo**: `dog.fx` caches renders (bounded, 300 entries) and hands out fresh arrays.
- **`fx.html`**: the effects gallery. A big count, filters by kind, 10 colors, dark/grass/light backgrounds,
  click to preview at 16–64 px with copyable code, download one effect (APNG, strip, pack) or the whole filtered set as a pack.

### What the review caught

- **Text effects were unreadable.** "MISS" showed as "MI::" and "CRIT!" lost its dot. The clean-up pass that removes
  lone pixels was deleting the font's diagonal pixels. Text recipes now opt out (`clean: false`), and letters are
  spaced 5 px so their outlines don't merge.
- **"POW" never showed on its star.** The engine picks the brightest layer per pixel, so dark text always lost.
  New recipe option `top: 'B'` lets one layer win wherever it's drawn.
- The FX page first showed "430 effects" with no context. 430 counts color variants, so it now also says
  "63 designs × up to 11 colors". And one-shot effects all restarted in sync and went blank together; each card is
  now offset in time.
- A test I wrote compared a sword-holder forced to shoot against a bow-holder. Those differ in the held item, not
  the attack, so the test was wrong rather than the code. It now checks that forcing a style changes the same
  character's attack.

### Checks

46 tests (4 new: weapon → style for every weapon, every style renders 8 frames, status overlay incl. "behind",
FX pack structure, memo isolation), `fx.html` in desktop + mobile browsers (filter, recolor, pack download, detail
sizes, APNG download), and the full browser suite.

---

## Round 4 · Engineering: load time, types, visual regression, build speed

### Plan

**Problem.** Three numbers got worse as content grew, and one safety net is missing:

- **Import time** grows with every effect: all recipes run when DOG loads (~240 ms at 46 recipes, more now).
- **Build time**: a full asset build takes 33 s.
- **No TypeScript types**: editors can't autocomplete `dog.char({ hat: ... })`, and AI tools guess.
- **No visual regression net.** Round 2 rewrote the pixel hot paths. A reference test covered them, but nothing
  catches an *unintended* change to what any sprite, character, action or effect looks like.

**Tech.**

- **Lazy effects.** Effect sprites are registered with their size and color slots up front, and their frames are
  generated the first time something reads them. The gallery only touches what's on screen. Measure import before/after.
- **`src/index.d.ts`**: types for the whole public API, checked by compiling a usage sample with `tsc` (dev-only).
- **Snapshot hashes**: `test/snapshots.json` holds a hash of every look plus characters, walks, actions, statuses
  and effects at other sizes. A changed hash fails the test; `npm run snapshots` updates it on purpose.
- **Faster build**: profile it first, then fix the biggest cost.

**Effects (target ~10): environment.** Light glow, smoke column, lava bubbles, water glints, fog, sun rays, wind,
dust motes, geyser, ripple.

### Shipped

| measure | before | after | how |
| --- | ---: | ---: | --- |
| `import` DOG | 290–363 ms | **41–56 ms** | effect sprites are lazy: registered with size + color slots, frames generated on first read |
| main page ready | 1213 ms | **797 ms** | same (and only visible gallery tiles generate their effect) |
| fx page ready | 1425 ms | **1043 ms** | same |
| full build | 30.1 s | **12.9 s** (14.7 s with this round's 10 new effects) | `sheet()` / `compose()` / packs drew by copying the whole canvas per frame |
| `dog.fxPack()` (all) | 427 ms | **102 ms** | same fix in the pack writer |

- **Types**: `src/index.d.ts` for the whole API (`package.json` `types` + `exports`). `test/types/usage.ts` is
  compiled with `tsc --strict` in CI. It includes three `@ts-expect-error` misuses (bad walk direction, unknown
  action, missing body) that must stay errors. The same file runs under Node with types stripped, and the only
  runtime error is the deliberate bad direction.
- **Visual regression**: `test/snapshots.json` has 1,116 hashes (every look, characters, all walk directions,
  actions, attack styles, statuses, every effect at 48 px with another seed, a sequence, an image-op pipeline,
  a pack). `npm run snapshots` updates it on purpose.
- **10 environment effects (68 total, 900 looks)**: glow, smoke column, lava, glints, fog, sun rays, wind,
  motes, geyser, ripple.
- `scripts/build.js` prints per-stage timings; `DOG_PROFILE=1` breaks down the showcase images.

### How the build fix was found

The plan said "profile first". The guess was compression (deflate level 9 on ~2,700 files). The profile said
rendering + compression together were ~5.5 s of a 23 s stage. The rest was `sheet()`: it built the 1,300-frame
texture atlas by calling `draw()`, which returns a *copy*, once per frame, copying a ~5 MB image 1,300 times.
`sheet`, `compose` and the pack writer now blit in place into the canvas they created. The snapshot test passing
unchanged proves the output is pixel-identical.

### Proving the safety nets work

- Changing one shade of the `red` material by a single unit made the snapshot test fail with 193 changed renders,
  listed by name. Reverting made it pass.
- The benchmark for effects started reporting 0.0 ms once Round 3's memo existed: it was timing cache hits. It now
  uses a fresh seed per run (uncached) and reports the cached number separately.
- The first lava was striped bars: a sine pattern quantized into bands. It's now molten orange with dark crust plates
  drifting on top (using Round 3's `top` layer priority) and popping bubbles.

### Checks

48 tests (snapshots: 1,116 hashes), `tsc --strict` on the usage sample, benchmarks, load times, full browser suite.
