# DOG devlog

Five plan → build rounds focused on **more effects** and **better engine tech**, then one round per follow-up feature.
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

47 tests (snapshots: 1,116 hashes), `tsc --strict` on the usage sample, benchmarks, load times, full browser suite.

---

## Round 5 · Show it: final effects batch, a demo that uses them, an effects reel, docs

### Plan

**Problem.** 68 effect designs exist, but the demo game, the README, the AI skill and the promo video don't show any
of them. Nobody can find them yet.

- **Effects (target ~12, "big moments").** Meteor, tornado, quake, black hole, summon, revive, thorns, electric
  field, confetti, poof, drip, music notes.
- **Demo game uses them.** Weapon attacks already come from `dog.action`. Add crits ("CRIT!" + double damage), a
  coin-pop on pickup, a "poof" when enemies vanish, a level-up burst, a glow behind the campfire, and drifting
  ambient effects (leaves / fireflies) tiled over the map.
- **Effects reel.** A vertical 1080×1920 video in the spirit of the "244 effects" reel that started all this:
  the effect count, a grid of effects cycling page by page, captions. English and Korean, same frame-stepped
  recorder. Re-record the gameplay GIF with the new effects.
- **Docs.** README (EN/KO) effects section and counts; SKILL.md: `dog.fx`, sequences, `dog.status`, `dog.fxPack`,
  attack styles; CONTRIBUTING: how to add an effect recipe; this devlog closes with a summary of all five rounds.

**Checks.** Contact-sheet review of the new batch, the demo in a browser (crits and new effects actually fire),
watch frames from the new reel, snapshots updated on purpose, the full browser suite.

### Shipped

- **12 "big moment" effects (80 designs, 966 looks; 545 of them are effects).** Meteor, tornado, quake, black hole,
  summon, revive, thorns, electric field, confetti, poof, drip, music notes, in `src/fx/spectacle.js`.
- **The demo game uses effects.** 1 hit in 5 is a crit: double damage, "CRIT!" over the enemy and a "-2" hit.
  The killing blow lands an impact, enemies vanish in a poof, coins pop, a level-up throws confetti, the campfire
  casts a soft glow, and firefly swarms drift around the map. All of it is `dog.fx()`, built once into canvases.
- **Effects reel** (`fxreel.html`, `docs/promo/fx-reel-en.mp4` / `-ko.mp4`): 1080×1920, 17 s. The count runs up to
  545, then 7 themed pages of 25 live effects each: highlights, combat, magic, big moments, weather on grass and
  water, statuses on characters, one effect in five colors. Captions in English and Korean, recorded frame by frame.
  The gameplay GIF and both promo reels were re-recorded with the new effects.
- **Engine: effects keep their look at any size.** New brushes `p.pt()` (one art pixel) and `p.px` (a 1px line
  width that scales). Text in effects grows and centers itself. Sparks and dot particles scale too. A new test
  draws all 80 recipes at 32 and 64 px.
- **CLI**: `dog fx meteor --element ice --size 64`, `--on slime` for a status on a character, `--strip` / `--frame`,
  and `dog fxpack [names] -o effects.zip`.
- `fx.html` gained the *environment* and *spectacle* filters. `dog.status()` frames now carry `.loop`.
- **Docs.** The README (EN/KO) finally has an effects section: showcase, API, CLI, weapon styles, counts and badge.
  SKILL.md has an Effects section with usage rules; every code block in it still runs in the test.
  CONTRIBUTING has "Adding an effect", and llms.txt links the gallery.

### What the review caught

- **Drip only worked at 32 px.** The falling drop's height divided by the scale a second time, so at 64 px it
  stopped halfway down. That raised a broader question: which other recipes break at other sizes?
  A measurement (where the ink sits and how much of it there is, at 32 vs 64 px) answered it:
  - the tornado had *less* ink at double size (0.83×)
  - the summoning circle vanished
  - MISS / CRIT! / POW stayed 32-px small
  - ripples and bubbles turned into dotted lines

  All of these drew single pixels or 1px lines. The fix went into the engine (`pt`, `px`, scaling text) and the
  recipes moved onto it. At 32 px the output is unchanged, except MISS and POW now sit on their true center
  (1 px). The test now fails if any recipe drifts or stops growing.
- **Confetti was faint.** There were too few, too thin pieces. Now there are 24 flakes that tumble (wide face-on,
  thin edge-on).
- **The demo's first ambient pass looked like wallpaper.** A 64 px firefly tile repeated over the whole map, with
  an obvious pattern. It's now four small swarms with different seeds. The campfire glow was a solid orange "rug";
  it's now drawn at 55% opacity, so it reads as light.
- **Reel layout.** "FREE GAME" touched the right edge, because the count reserved room for 4 digits. And one-shot
  tiles sat empty too long between replays; the gap went from 0.3 s to 0.12 s.
- `dog fx burning --on slime` printed "plays once" because status frames didn't say they loop. Fixed in
  `dog.status()`.

### Checks

- 50 tests: scaling for all 80 recipes, status loops, and the CLI writing an APNG at the requested size plus an
  effect pack.
- Snapshots (1,194 hashes) were updated on purpose. The only changes were the 12 new effects, MISS/POW at 32 px,
  and 48 px renders that gained scaled lines.
- `tsc --strict` on the usage sample, and a 15.4 s full build.
- The demo game in a browser, screenshotted when crits, poofs, coins and level-ups fire.
- Reel frames checked at 8 points in each language, plus frames pulled from the final videos.
- The full browser suite: studio, maker, actions, walking, demo, packs, templates, recipe, lazy gallery, load
  times, effects page.

---

## Five rounds, in numbers

| round | focus | effect designs | looks | tech that shipped with it |
| --- | --- | ---: | ---: | --- |
| start | | 5 hand-drawn | 441 | |
| 1 | FX engine | 31 | 674 | recipes paint light, the engine shades and outlines it; fade-by-shrinking; lazy gallery painting |
| 2 | projectiles, beams, weather, status | 51 | 790 | particles, seamless wrap, effect timelines, Pixmap hot paths up to 18× faster |
| 3 | effects in gameplay | 63 | 851 | weapon-aware attacks, `dog.status`, `dog.fxPack`, render memo, layer priority, effects page |
| 4 | engineering | 73 | 900 | lazy effects (import 6× faster), 2× faster build, TypeScript types, 1,116-hash visual regression |
| 5 | show it | 85 | 966 | size-proof brushes + test, `dog fx` CLI, effects reel, demo integration, docs |

From 20 effect looks to **545**, with every one recolorable, resizable and exportable to Phaser/Godot. Tests went
from 36 to 50, and every round's plan is above, next to what actually happened.

---

## Round 6 · Sound: `dog.sfx()`, game sounds made by code

### Plan

**Problem.** DOG gives a game its pictures and its effects, but a game also needs sounds, and the effects are
silent. Asset packs ship fixed WAV files. DOG's whole point is "everything is code you can change", so the
sounds should be code too.

- **Synth engine** (`src/sfx.js`, zero dependencies). A sound is a short recipe of layers. Each layer has:
  - a wave: square, pulse, saw, triangle, sine or noise
  - an envelope (attack / hold / decay)
  - pitch slides, pitch steps (arpeggios and jingles), vibrato
  - low/high-pass filters, bit crush, repeats

  The engine renders the layers to samples, mixes them and limits the result. Rendering is deterministic, and
  `seed` makes small variations, so ten hits don't sound identical.
- **Sounds that match what DOG already draws.**
  - Every attack style (slash, stab, thrust, whip, smash, burn, bonk, punch, shoot, magic), so
    `dog.sfx(dog.action.styleOf(hero))` just works.
  - Every action (hit, heal, level-up, cast, death).
  - The effects (boom, meteor, laser, poof, crit, miss, block, parry...).
  - Pickups, UI blips, movement, jingles, and a few seamless loops (rain, wind, fire).
  - `element: 'fire'` adds that element's flavor layer (crackle, shimmer, bubbles, bell, rumble), the way it
    changes an effect's color. `pitch` and `volume` work like recoloring.
- **Output.**
  - `.toWAV()`, `.toDataURL()`, `.play()` in the browser (one shared AudioContext), `.save(path)` in Node.
  - `dog.sfxPack()`: a zip of WAVs.
  - CLI: `dog sfx coin -o coin.wav`.
  - Every sound pre-exported in `assets/sfx/`.
- **Where you hear them.**
  - A sounds page (play, vary, pick element and pitch, download one or all).
  - The effect detail on the effects page plays its sound.
  - The demo game gets sound, with a mute toggle. It stays silent until a player takes over, so autoplay
    doesn't make noise.

**Checks.**
- Tests: every sound is deterministic, non-silent, never clips, and has no NaNs. WAV headers parse back.
  Element and pitch really change the samples. Sound hashes go into the snapshots.
- Listen-review: render every sound and look at the waveform and spectrum sheet, since sound can't be "seen"
  in a contact sheet the usual way.
- The demo game in a browser, with sound triggered by real input.

### Shipped

- **`dog.sfx(name, { element, pitch, seed, volume })`**: 66 sounds made by code, rendered on demand (all 66 in about 0.3 s),
  cached, and returned as a `Sound`: `.play()`, `.toWAV()`, `.toDataURL()`, `.toAudioBuffer()`, `.save(path)`.
  - UI: click, select, confirm, cancel, error, text, menu.
  - Movement: jump, land, step, dash, splash.
  - Pickups: coin, gem, key, pickup, power-up, chest.
  - All 10 attack styles and the actions.
  - Magic, explosions (boom, meteor, quake, firework, shockwave), five element sounds.
  - Jingles: win, lose, fanfare.
  - Seamless loops: rain, wind, campfire.
- **10 element flavors** (fire crackle, ice chime, poison bubbles, holy bell, dark rumble, water bloops, nature chirps,
  blood squelch, arcane sparkle, steel ring). They are layered on any sound, the same 10 names as effect colors.
- **Names line up with the rest of DOG.**
  - `dog.sfx(dog.action.styleOf(hero))` is the right swing for the weapon.
  - `dog.sfx.forEffect('fx-meteor')` gives an effect's sound.
  - Tests check that every style, action and effect mapping points at a real sound.
- **Engine** (`src/sfx.js`, no dependencies, ~250 lines): 6 waves; envelopes; pitch slides and steps (arpeggios,
  jingles with per-note lengths); vibrato and tremolo; one-pole low/high-pass; bit crush; retriggers with jitter.
  Seeded noise, so it's deterministic. Seamless loops by cross-fading the tail into the head.
- **Output.**
  - `dog.sfxPack()` zips WAVs.
  - CLI: `dog sfx` (list), `dog sfx slash --element fire`, and `dog sfxpack`.
  - `assets/sfx/*.wav` (66 files, 1.8 MB).
  - A "Sounds" table in the catalog.
- **Pages.**
  - `sfx.html`: pixel waveforms, kind filters, element and pitch, "vary each play", download one or all.
  - The effects page's detail plays the effect's sound.
  - Both starter templates make sound: the canvas starter calls `dog.sfx`, and the Phaser starter loads WAVs that the
    build writes.
  - The demo game has sound with a remembered mute toggle.
- Types (`Sound`, `SfxOptions`, `dog.sfx`, `dog.sfxPack`), checked by `tsc` including a deliberate bad element.
  README (EN/KO), SKILL.md (Sounds section, runs in the test), CONTRIBUTING ("Adding a sound") and llms.txt are updated.

### What the review caught

- **Loudness was all over the place.** Normalizing every sound to the same *peak* made square-wave sounds (death,
  power-up, coin) three times "louder" by RMS than noise-based ones like explosions. The engine now matches the RMS of
  each sound's loudest 20 ms instead, with a peak cap. Measured RMS went from 0.06–0.44 to 0.09–0.25; `level` sets
  intent (a UI click is meant to be quiet).
- **Sound can't be looked at in a contact sheet, so the review used one anyway**: a waveform plus spectrogram for every
  sound. It showed that:
  - The quake and the portal lived almost entirely below 250 Hz, which phone speakers can't play. Both got mid-range
    layers (crumble and pebbles, a wobbling mid tone).
  - Five of the ten element flavors were invisible on a slash: their layers sat under the whoosh and ended with it.
    Flavors are now louder and ring a little past the sound they join. Each element has a distinct signature in the
    spectrogram.
- The first sound cards put a download link inside the play button (invalid nested controls); cards are now two
  separate buttons.
- The demo's hit sound first drew its variation from the game's random generator, which would have changed the
  self-playing demo's run (and the recorded promo). It uses a counter instead.
- Before documenting a Phaser route that needs no files, it was tested in Phaser 3: `this.sound.decodeAudio()` takes
  both `toWAV().buffer` and `toDataURL()`, and the decoded sound plays.

### Checks

- 54 tests:
  - Every sound is finite, never clips and isn't silent.
  - Same input, same samples.
  - Element, seed and pitch all change the samples.
  - The loop seams are no bigger than a normal step.
  - The WAV header parses back.
  - The name mappings point at real sounds.
  - The catalog's sound list matches.
- Snapshots: 1,271 hashes, now including every sound's 16-bit PCM.
- `tsc --strict`.
- Browser checks:
  - Sounds page: play, loop on/off, element, pitch, single and zip download, mobile layout.
  - Effects-page sound button: shown for the meteor, hidden for the silent glow.
  - Demo game: 0 sounds while it plays itself, sounds after taking over, 0 when muted, and the mute setting is
    remembered.
  - Phaser template with its WAVs.
  - The full suite from earlier rounds.

---

## Round 7 · Pick your "bit": every download in 8, 16, 32 or 64 px tiles

### Plan

**Problem.** Games are built on a tile size: 8×8, 16×16, 32×32 or 64×64 (often called "8-bit / 16-bit / 32-bit"
pixel art). DOG draws on a 16 px grid. Its download buttons only *zoom* (1×, 4×, 8×), which gives big blocky pixels,
not art that sits on a 32 or 64 grid. People should be able to pick the size their game uses and get everything at it.

- **One option everywhere: `grid: 8 | 16 | 32 | 64`.** It's the tile size of your game. Each kind of art is
  converted the best way for it:
  - Hand-drawn sprites (16 px):
    - 8 halves them by majority vote, so outlines survive.
    - 32 and 64 use Scale2x once or twice, which rounds stair steps instead of fat pixels.
    - `smooth: false` gives plain crisp zoom instead.
  - Characters, walks, actions and statuses scale by the same factor (a 24 px character becomes 48 at grid 32).
  - **Effects are code, so they are redrawn natively** at the new size (a grid-32 effect is a real 64 px drawing),
    not stretched.
  - Applies to `dog()`, `dog.frames`, `dog.char` / `walk` / `action` / `status`, `dog.fx`, `dog.pack`, `dog.fxPack`.
- **Download everything at one size.**
  - A panel on the main page: pick 8 / 16 / 32 / 64, preview real sprites at that size, pick sprites / effects /
    sounds, get one zip. It's built in the browser, so the repo doesn't carry four copies of every asset.
  - CLI: `dog export --grid 32` writes the same zip.
- **Size controls where people download.** The character maker's size buttons become tile sizes (the game pack
  follows). The effects page uses the same 8 / 16 / 32 / 64 choice.
- **Checks.**
  - Tests: every grid gives the right pixel sizes for sprites, characters, actions, effects and packs.
  - Grid-8 sprites keep an outline.
  - Grid effects are native renders, not scaled copies.
  - Contact sheet comparing the four sizes.
  - A browser test of the panel (preview, zip contents, timing).

### Shipped

- **`grid: 8 | 16 | 32 | 64` on every call.**
  - Covers `dog()`, `dog.frames`, `dog.char` / `walk` / `action` / `status`, `dog.fx`, `dog.pack` and `dog.fxPack`.
    `smooth: false` gives plain zoom.
  - Sizes and anchors follow: at grid 32, a pack has 64 px cells with the feet at (32, 63), and its README, Phaser
    origin and Godot offset say so.
  - `dog.toGrid(img, grid)` converts any DOG image; `dog.grids` lists the sizes.
- **Effects at another grid are native renders.** `dog('fx-meteor', { grid: 32 })` is the recipe drawn at 64 px
  (a test checks it is *not* a stretched 32 px image).
- **8 px that still looks like pixel art.** Halving votes among the inside colors only, then redraws a 1px outline
  around the smaller shape. Dark details inside the shape (eyes, lid seams) get extra weight so they survive.
- **`dog.bundle({ grid })`**: everything for one tile size as a list of files to render one by one. That's 951 files:
  - sprites with animation strips
  - gear
  - every body with 4-direction walk strips
  - the 80 effects (or every color)
  - the 66 sounds
  - a README explaining how that size was made
- **Download panel** on the main page (`#download`):
  - tile-size buttons with a live preview
  - checkboxes for what to include
  - one zip, with progress

  It uses the browser's PNG compressor:

  | tile | zip | made in (browser) |
  | --- | ---: | ---: |
  | 8×8 | 2.0 MB | 1.9 s |
  | 32×32 | 2.8 MB | 2.8 s |
  | 64×64 | 4.2 MB | 6.2 s |

  CLI: `dog export --grid 32` writes the same zip in 2.4 s. `--grid` works on `render`, `char`, `fx`, `pack` and `fxpack`.
- The character maker's 1× / 4× / 8× zoom became **tile 8 / 16 / 32 / 64 px** for PNG, animated PNG, strip and game
  pack. It stays in sync with the download panel, and the choice is remembered. The effects page uses the same choice
  for its previews, downloads and packs, and its code samples show `grid:`.
- `docs/img/grids.png`: the same art at the four sizes, zoomed to the same size on screen.
  README (EN/KO) "Just want the PNGs?" now leads with the tile-size download; there are also API rows, CLI lines,
  a SKILL.md rule ("match the game's tile size") and llms.txt.

### What the review caught

- **The plan said "outlines survive" at 8 px; the first contact sheet said they didn't.** A plain majority vote never
  keeps a 1px outline, because it loses every 2×2 block. Even judging that took a second look: the sheet's dark
  background was almost the outline color, so it was re-rendered on a light one. Fixed by voting without the edge
  outline and drawing it again. The next sheet showed the slime had lost its eyes (dark pixels *inside* the shape),
  so inner dark pixels now count triple. A test checks both: every pixel on a silhouette edge is outline-colored, and
  the slime keeps its eyes.
- The first grid showcase zoomed each row by a whole-number factor that fitted the box, so the 64 px row came out
  *smaller* than the 32 px row. Each row now zooms by 64 / grid, so a tile is the same size in every row.
- The download panel's size control stretched across the whole page; it now keeps its own width.
- Moving the effects page from pixel sizes to tile sizes left one reader of the old `detail.size` (the preview
  loop). A grep found it before it shipped.

### Checks

- 56 tests:
  - Every grid gives the right sizes for sprites, frames, characters (as an option and inside the spec), walks,
    actions, statuses, effects, effect looks, packs (cell and origin) and effect packs.
  - Effects are native, sprites use Scale2x or zoom, and `toGrid` matches.
  - 8 px edges are outline-colored and the slime keeps its eyes.
  - A bad grid is rejected.
- 1,302 snapshot hashes, including halved, Scale2x and native-effect renders and a grid-32 pack.
- `tsc` with a deliberate `grid: 24` error.
- Browser:
  - Panel preview at every size, three real zip downloads with their contents checked, and maker ↔ panel sync.
  - A maker pack at 32 (64 px cells, feet at 32, 63).
  - The effects page at 64 (128 px strip, `grid: 64` in its code).
  - Mobile with no overflow.
  - The whole earlier suite.

---

## Round 8 · Launch readiness: a pre-release review, and a name people can find

### Review (before changing anything)

Facts checked first:
- 0 stars, 0 forks.
- Repo "About" is just `dog`, with no topics and no website.
- Nothing on npm (`dots-of-games` is free).
- CI and Pages are green.
- The suite passes on Node 18.20.8 (the `engines` floor) as well as 22.

| priority | finding | fix | who |
| --- | --- | --- | --- |
| P0 | The name `dog` can't be found on GitHub or a search engine, and the About box is empty | rename to `dots-of-games`; update all 68 references (docs, pages, CDN URLs, CTAs in the promo videos); suggested About text and topics | rename and About: owner, in Settings; references: here |
| P0 | `npm i` is impossible. The current `files` would ship 17 MB of assets (3.5 MB tarball, 3,326 files), and there's no `repository` / `homepage` / `bugs` | slim package (library, CLI, skill, templates); metadata; a release workflow that publishes with provenance | here; the first publish needs the owner's npm token |
| P0 | The license only covered `src/sprites/`, `assets/` and `docs/img/`. It said nothing about the effects and sounds the code *generates*, or the template art | say plainly: everything DOG generates (images, sounds) is CC0; code is MIT | here |
| P0 | The README's first screen is a list of numbers. There's no 3-line quick start near the top and no mention of AI coding agents | one-line identity ("game assets as code"), quick start under the hero, "use with AI coding agents" section, CI badge | here |
| P1 | AI agents: SKILL.md exists but nothing says how to install it. There's no Claude Code plugin and no AGENTS.md / CLAUDE.md for people working on the repo with an agent | Claude Code plugin marketplace in the repo (checked with `claude plugin validate` and a real install), AGENTS.md, CLAUDE.md | here |
| P1 | Community files: only a sprite-request template; no bug / feature templates, PR template, changelog or code of conduct | add them | here |
| P1 | CI only tests Node 22 while `engines` promises 18+ | matrix 18 / 20 / 22, plus a package-contents check | here |
| P1 | `scripts/dog.js` has a shebang but isn't executable in git | `chmod +x` | here |
| P2 | API review: names, options and return shapes are consistent (`element`, `grid`, `size`, `seed`; frames carry `.fps` / `.loop`). Errors name the fix. It's ESM-only (Node 18+, modern browsers). Nothing needs a breaking change before 0.1.0 | document "ESM only" and the 0.x versioning promise | here |
| P2 | Clone size: `.git` 35 MB, `docs/` 12 MB, mostly the promo videos | fine for now; revisit if it grows | none |

The plan: fix every "here" row and verify each one. Then hand the owner a short list: rename the repo, fill the About box,
upload the social preview, add an npm token, publish v0.1.0.

### Shipped

- **New name, everywhere:** 68 references in 23 files now point at `olebangpad/dots-of-games`: README links, site meta,
  CDN imports, SKILL.md, llms.txt, pack and bundle READMEs, the atlas, and the call-to-action in all four promo videos.
  The longer address wrapped onto two lines on the video button, so the button text is smaller and kept on one line.
  The videos were re-recorded.
- **npm-ready.**
  - `package.json` has `repository`, `homepage`, `bugs`, `author`, `sideEffects` and `publishConfig` (public, provenance).
  - The package is the library, CLI, skill, templates and licenses: **142 kB, 53 files** instead of 3.5 MB / 3,326.
  - Tested by installing the real tarball into an empty project: `import { dog } from 'dots-of-games'` works,
    `npx dog render` and `npx dog sfx` work, and the TypeScript types resolve (a wrong `grid` is caught).
  - `.github/workflows/release.yml` publishes to npm with provenance when a GitHub Release is published. It checks
    that the tag matches `package.json` and runs the tests first.
- **License, stated plainly:** everything DOG draws or plays, including generated effects and sounds at any size, is
  CC0. The code is MIT. This is in `LICENSE-ASSETS` and both READMEs.
- **README:**
  - The first screen is one line ("Game assets as code") with a facts line and a 5-line quick start.
  - Tile and CI badges.
  - The AI section installs the skill as a Claude Code plugin; there are instructions for Codex, Cursor and others.
  - An npm section, plus the ESM-only and 0.x versioning promises.
  - Korean kept in step.
- **AI agents.**
  - The repo is a Claude Code plugin marketplace: `/plugin marketplace add olebangpad/dots-of-games`, then
    `/plugin install dog@dots-of-games`.
  - `claude plugin validate .` passes. A real install in a throwaway home directory loaded the `game-assets` skill
    (about 240 tokens always-on).
  - `AGENTS.md` (map, commands, rules for working on the repo) and `CLAUDE.md` (imports it).
- **Community files:** bug and feature issue templates next to the sprite request, a PR checklist, a code of conduct,
  and `CHANGELOG.md` with the 0.1.0 notes.
- **CI:** tests on Node 18, 20 and 22. The build job also checks the npm package contents and size, and the plugin
  manifest. `scripts/dog.js` is executable.

### What the review caught

- The first draft of the issue-template config linked to GitHub Discussions, and the code of conduct linked to private
  vulnerability reporting. Both 404 unless the owner turns those features on, so neither link shipped.
- The plugin validator's advice line still said `olebangpad/dog`, because it reads the git remote. That's a reminder
  that the remote changes when the owner renames the repo, not before.
- The `.claude-plugin` entry points at `skills/dog` as the plugin itself, not the repo root. That keeps a root
  `CLAUDE.md` out of the plugin (the validator warns about one) and installs only the skill.

### Checks

- 56 tests on Node 22, and on Node 18.20.8 locally.
- `tsc`, the build, and `claude plugin validate`.
- The tarball installed and used in a fresh project.
- The promo call-to-action measured at 1,054 of 1,080 px on one line.
- Browser suite.

### Left for the owner (can't be done from here)

1. Settings → General → rename the repository to `dots-of-games`. GitHub redirects the old repo URL, but the Pages
   site moves to `olebangpad.github.io/dots-of-games/` and the old one stops.
2. The About box: description, website and topics.
3. Settings → Social preview: upload `docs/img/social.png`.
4. npm: create an access token, add it as the `NPM_TOKEN` repository secret, then publish GitHub Release `v0.1.0`.
   The workflow does the rest.

### Addendum: the final name is PixSpell

`dots-of-games` lasted one commit. Two hyphens are hard to say and to remember, and "DOG" isn't a brand worth keeping:
the word is everywhere. The owner chose **PixSpell** from a list of one-word candidates (the list also had spawnpix,
spritomatic and spritescript). It's free on npm, no other GitHub repo uses the name, and it says "one line of code and
the art appears". `codeart` was considered and dropped: it's free on npm, but 953 GitHub repos already use the name.

- **API:** the entry point is now `spell` (`spell('sword')`, `spell.char()`, `spell.fx()`, `spell.sfx()`). `dog` is still
  exported as an alias, so earlier snippets keep working. Types: `PixSpell` (old `Dog` kept as a deprecated alias).
- **Everything else follows:**
  - names: package `pixspell`, CLI `pixspell` (`scripts/pixspell.js`), skill folder `skills/pixspell`, plugin
    `pixspell@pixspell`, test file `test/pixspell.test.js`
  - in pages and files: zip names `pixspell-32px.zip`, error messages `pixspell: ...`, pack metadata key `pixspell`,
    banner and social image ("PIXSPELL · GAME ASSETS AS CODE"), page titles, promo titles; videos re-recorded
- **How the rename was kept safe:** the `dog` animal sprite is a real sprite id. Strings like `'dog'` and `'dog-shiba'`
  had to survive, and so did prose such as "the dog walks side-on", while every `dog(` / `dog.` call changed. The
  rename ran as ordered rules with a dry run first, then the leftovers were reviewed by hand. The review found:
  - `export default dog` and `...dog.action.list`, which the rules skipped (end of line, after a spread)
  - Korean text, where `DOG` touching a particle (`DOG는`) isn't a word boundary. The particles also had to change
    with the new final consonant: `PixSpell은`, `PixSpell이`
  - two README anchors that changed with their headings
  - the social image, which still said `GITHUB.COM/OLEBANGPAD/DOG` in capitals: a miss from Round 8's
    lowercase-only search
  - the promo title at 190 px, which no longer fit the 1,080 px frame (now 140 px)
  - the main page's subtitle, which had become "PixSpell PixSpell"
- Checks: 56 tests, types, build, `claude plugin validate`, the full browser suite (its scripts updated to the new
  names), and banner, social image and promo frames looked at.

Owner steps are the same as Round 8, with the new name: rename the repository to **`pixspell`**, then the About box,
the social preview, `NPM_TOKEN`, and a `v0.1.0` release.

### Polish after the rename

- **The README now opens on code.** `docs/promo/code.gif` (960×420, 318 KB, 15 s): five lines of PixSpell are typed one
  by one, and each line's result appears with a spell sparkle as it finishes.
  - The lines make a recolored slime, a wizard, a spell cast, an ice meteor, and a coin sound (shown as its waveform).
  - `codereel.html` renders it, and `scripts/record-promo.cjs` records it frame by frame at full size so the code
    stays readable.
  - The first draft cut off the wizard line at the editor's edge. The line was shortened and the font set to 15 px.
  - The animated scene moved down into "Why PixSpell?".
- **A mascot that fits the name:** the site header shows a wizard casting (`spell.action(..., 'cast', 'holy')`), and the
  favicon is the wizard hat. The dog sprite stays in the collection.
- Rename leftovers fixed: AGENTS.md named the CLI `spell.js` (it's `pixspell.js`) and listed the API as `dog`; one README
  line said `dog.` autocompletes.
- **Releasing is one tag:** `release.yml` now runs on a pushed `v*` tag. It checks that the npm token exists and that
  the version matches, runs the tests, publishes to npm with provenance, and creates the GitHub Release with that
  version's CHANGELOG section as notes. After the repo was renamed (Pages redeployed fine at the new address), the
  owner's steps are: the About box, the social preview (GitHub has no API for it), and the `NPM_TOKEN` secret. Then
  pushing `v0.1.0` does the rest.

---

## Round 9 · Stand out: light that glows, a game an AI agent builds, "every asset for your 2D game"

### Plan

**Problem.** Other pixel-effect libraries are also code, also recolorable, and some ship a Claude Code skill too. The
best of them have more effects and a glow ours lacks: pixelfx, for one, has 244 effects with an additive light buffer.
Competing on "number of effects" is a losing game. What nobody else has is the whole set: characters that walk and
fight, items and tiles, effects and sounds, all from one import. That's what we should show, and the effects still
need to look as good as the rest.

- **(a) Light.** Today, light below the 30% cut is thrown away and shapes end at a hard dark outline. Instead:
  - Keep that light as translucent halo pixels in the effect's own ramp color, plus a soft bloom around bright pixels.
  - Recolor, tile sizes, packs and statuses keep working, because it's the same ramp.
  - Recipes can turn it down or off (smoke, dust).
  - Snapshots get updated on purpose.
- **(b) A game an AI agent builds.** A complete small game in a different genre from the demo (a survivor-style
  arena): auto-attacks with weapon effects, enemy waves, statuses, level-up choices, sounds. Every pixel and sound comes
  from PixSpell calls; there are no image or audio files. Ship it as a playable page, a GIF, and the prompt to try with
  the plugin. The page says plainly how it was made.
- **(c) Reposition.**
  - README and site lead with "every asset for your 2D game, from code": characters first.
  - A new hero GIF that builds a game scene line by line (tiles, hero, enemy, attack with effect and sound, loot).
  - Package, skill, llms.txt and About texts follow.

**Checks.**
- Effect contact sheets before and after on dark and light backgrounds.
- Recolor, grid and pack still correct, and halos never paint over the sprite.
- The game played in a browser: no errors, input works, sounds play after input.
- GIF frames reviewed.
- The full suite.

### (a) Shipped: effects glow

- **Engine:** `lightMap()` in `src/fx.js` keeps two kinds of light from layer A, the effect's own color:
  - the soft light under the 30% cut that used to be discarded
  - a bloom around bright pixels: a box blur twice, radius 2 px at 32 px

  It's stored per frame as alpha (max 0.7) for empty pixels only. `render()` paints it under the sprite in ramp A's
  brightest shade, so recolors, element variants, other sizes, tile grids, statuses, actions and packs all glow
  without extra code.
- **Off where it looks wrong:** `light: 0` in a recipe for smoke, dust, puffs, fog and the glow effect (which is
  already light). `light: false` in `spell.fx()` / `spell()` gives flat pixels for engines or palettes without alpha.
- **What the review caught:** the first strength was too timid to notice at 1×. The second pass doubled the bloom
  radius and raised the cap. On the glow effect itself, the halo drew a ring around the dithered disc, so light is off
  for it.
- **Tests:**
  - The color rule now covers glow: every translucent pixel must be ramp A's brightest shade at ≤ 70% alpha.
  - A new test checks that glow never changes a pixel the plain effect draws, that recolors carry the glow color,
    and that smoke never glows.
  - 595 snapshots changed on purpose: every effect, plus the actions and statuses that use effects.

### (b) Shipped: a game built with nothing but PixSpell

- **`examples/spell-survivors/`**: a survivor-style arena game in one HTML file of about 450 lines.
  - You walk while a magic bolt fires itself, and enemies arrive in growing waves.
  - Every level you pick one of three spells: fire aura (burns), frost nova (freezes), chain lightning, meteor, ice
    blades, faster bolts, more HP or speed.
  - It has damage numbers, XP gems, a night look so the new glow shows, sounds after the first input, a mute
    button, touch drag on phones, and `?demo` (plays itself, silent).
  - Every sprite, animation, effect and sound is a PixSpell call. Its README maps each part of the game to the call
    that makes it, and gives the prompt to try with the plugin.
  - It says plainly who wrote it: Claude in Claude Code, using only the public API in SKILL.md.
- **`docs/promo/survivors.gif`** (640×360, 7 s): recorded 30 s into a demo run (`?warm=30`) so the screen is busy.
- **What the play-tests caught:**
  - The first build took 18 s to reach level 2: gems were only pulled from 40 px and enemies arrived slowly. Now gems
    come from 64 px, waves grow every 30 s, and the first level needs 4 XP. A keyboard run now reaches level 3 in
    18 s and the picks work.
  - The phone layout was stuck at 1× (320 px), because only whole-number zoom was allowed. It now fills the screen
    when 2× doesn't fit.
  - Firefly swarms showed cut-off dots in columns where the seamless tile ended. Swarms are now the tile repeated
    2×2 with a soft round fade.
  - The first GIF was 4.1 MB; at 7 s and 10 fps it's 2.8 MB.

### (c) Shipped: "every asset for your 2D game, from code"

- **README (EN/KO) opens with the new pitch.**
  - The facts line now starts with characters.
  - The nav has a "🤖 A game an AI agent made" link.
  - A paragraph says plainly what's different: other libraries give one piece, usually effects; this gives all of
    them.
  - A new section shows Spell Survivors with its GIF.
- **New hero GIF** (`docs/promo/code.gif`, 136 KB, 19 s): eight lines of code build one game scene. Ground, then a
  wizard who walks in, a pink slime, a cast, a glowing fire meteor that takes the slime out, the meteor's sound, and
  the coin it leaves. Each line's label names the asset kind (tiles, characters, walk cycles, monsters, actions,
  effects, sounds, items).
- **Same story everywhere else:** page titles and meta descriptions, the main and demo page navs ("🤖 AI-made game"),
  `package.json`, `llms.txt` (which now links the example), the skill's description and its pointer to the example,
  the plugin description, and the CHANGELOG.
- The promo reels and the gameplay GIF were re-recorded, so every video shows the glowing effects.
- **Checks:** 57 tests, types, plugin validation, the browser suite (main, demo, effects, sounds, templates, mascot),
  and GIF frames reviewed around the meteor moment.

## Round 10: what the new wave of pixel-art agent tools teaches

Plan: study the pixel-art and agent-skill repos from the last months (pixelfx 5.4k★, sprite-normals 770★,
aseprite-ai-artist 600★, git-koi 560★, diorama, pixel-path, spritekiln, codixel, pixel-anims, Pokémon Claude Red...)
and take what works into PixSpell, in three steps: (a) README, (b) a profile-README character, (c) agent tooling.

### (a) Shipped: a README that shows, then tells

- **"What one line makes":** nine animated 256 px tiles at the top (`docs/img/show/`, drawn by `showTiles()` in
  `scripts/build.js`), each captioned with the exact call that drew it. Random characters, a fire attack, an ice meteor,
  a walk, a recolored slime, a fire tornado, one knight at 8/16/32/64 px, a burning skeleton, a level-up.
  The frozen skeleton was swapped for a burning one: under ice it didn't read as a skeleton.
- **Spell Survivors, told like the games that got attention:** the GIF first, `image files: 0` / `audio files: 0` /
  `one HTML file` / `written by Claude Code` badges, a ▶ Play link, and the prompt to make your own. It says plainly
  that the prompt is one to try, not the one it was made from.
- **The skill now follows the open Agent Skills spec.** The spec says `name` must match the folder, and ours was
  `game-assets` in `skills/pixspell/`, so it's now `pixspell`. `npx pixspell skill` copies it into `.agents/skills/`,
  the cross-client folder (Codex, Cursor, Gemini CLI, GitHub Copilot, OpenCode...); `--claude` uses `.claude/skills/`.
  A paste-this prompt covers agents with nothing installed. A test checks both folders and the name rule.
- **Also:** an Agent Skill badge, a one-line "New" strip, Credits (Scale2x, sfxr, Silkscreen), roadmap items for
  normal maps and 8-direction walks, and two leftover `dog-32px.zip` mentions fixed.

### (b) Shipped: your GitHub account as a game hero

git-koi got 560★ in ten days with one idea: draw something from your GitHub account for your profile README, so every
user's profile shows it off. PixSpell has 2.7M characters, which suits that idea well.

- **`src/profile.js`** (internal, not part of `spell`):
  - `fetchStats(login)` makes three public REST calls: the user, their own repos, their recent public events.
  - `heroOf(stats)` maps the stats onto a character:
    - the login (hashed) picks the body (only ones that hold weapons), the hat and the off-hand;
    - the top language among the user's own repos picks the class, the weapon family and the outfit and effect color
      (GitHub's language color). 39 languages have a class; any other language gets a stable one by name;
    - `10·repos + 5·stars + 3·followers + 20·years` on a log scale sets the level (1–99), and the weapon upgrades at
      15 and 35;
    - activity in the last day / week picks the mood: in battle, on a quest, resting at the inn.
  - `heroCard(hero)` draws a 200×72 card at 3×: the hero at 2× on grass, doing today's thing, next to the name, level,
    XP bar, stats and mood.
- **Three ways to get one:**
  - `hero.html`: type a name and see the card, download it, copy the workflow;
  - `pixspell hero <login>` (uses `$GITHUB_TOKEN` if set; `--stats file.json` works offline);
  - `action.yml` at the repo root, so `uses: olebangpad/pixspell@main` redraws it daily in a profile repo and
    commits it.
- **Smaller APNGs everywhere:** a profile card is mostly still text, so `encodeAPNG` now stores, after the first frame,
  only the rectangle that changed (dispose none, blend source). A test decodes the file back and compares every frame.
  Chromium plays them right. Sizes:
  - the README tiles dropped by 20–80%;
  - `assets/` shrank by 350 KB;
  - a hero card is 5–9 KB.
- The browser's download goes through `CompressionStream`, so it is as small as the CLI's.
- **What looking at it changed:**
  - The first card drew the hero at 1×, small next to the text, so the stage is now drawn at 2×.
  - The Zzz was clipped, so the card uses `spell.status(spec, 'sleep')`, which already places it.
  - The new 3×5 `@` read as an "e", so the card shows the bare login; the glyph stays in the font.
- **Not checked live:** this session can't reach GitHub's user API, so the tests and the page check use responses with
  the API's shape. The first real run of the Action is the live test.

### (c) Shipped: agents can look at what they pick

The tools getting attention (aseprite-ai-artist, pixel-art-studio, spritekiln) all sell a loop where the agent sees
its own output. A PixSpell agent picked assets by name and never saw them.

- **`pixspell preview`** draws any mix of things into one contact sheet (`src/preview.js`). Each row shows the call,
  the size, the frame count and fps, then every frame zoomed to about 96 px on a checkerboard. Sounds are drawn as
  waveforms. It takes three kinds of input:
  - names: `slime`, `meteor`, `coin` (sprite first, then effect, then sound);
  - JavaScript calls;
  - JSON items like `{ "char": "goblin", "action": "attack" }`.

  It also prints one text line per item, so an agent that can't open images still learns the sizes.
- **`pixspell mcp`** is an MCP server written straight on stdio JSON-RPC, with no SDK. It has four tools:
  - `preview` returns the image together with each item's JavaScript call;
  - `catalog` lists names;
  - `save` writes a PNG, an animated PNG, a strip or a WAV;
  - `pack` writes an engine zip.

  Safety and protocol details:
  - Tools take JSON items and never run code they are sent.
  - Paths must stay inside the working directory.
  - The protocol version is negotiated: the server echoes the client's version if it knows it, and otherwise
    answers with its own newest version.
- **`pixspell doctor`** checks the Node version and that rendering works. It also lists the skill copies an agent
  would read (`.agents/`, `.claude/`, the plugin cache) and whether each matches this version.
- **SKILL.md** has a new section, "Look at what you picked": what to check (contrast against the background, effects
  clipped at the frame edge, which way characters face, one tile size everywhere), plus the MCP setup.
- **Checks:**
  - Tests: every item's printed call renders the same frames as the item itself; the CLI; and a full MCP session
    (handshake, tools, image content, files written, an escaping path refused, error codes).
  - Live: real Claude Code ran `claude mcp list` and reported the server as connected. A headless Claude Code agent
    then called `preview` for an ice meteor and described the image correctly ("a glowing white-and-cyan ball ...
    bursts into a bright cyan-white flash, then spreads into a widening light-blue arc").
- **Not yet:** the Claude Code plugin could start this server by itself through a `.mcp.json`, but that needs
  `npx pixspell` to exist, so it waits for the npm release.

## Round 11: more content

Counting what there was showed the gap: 12 tiles, 22 items, 6 monsters, 18 icons, and no music. The 2.7 million
characters had little world to stand in. The plan is world building, then monsters, then items, a UI kit and music.

### (a) Shipped: 42 world-building tiles and props

- **New sprites:** `src/sprites/world.js`, category `tiles`. Each has 2–4 material variants, adding 173 looks
  (614 sprite looks, up from 441).
- **Indoors and dungeon:** door, stairs, barrel, crate, pot, table, chair, bed, bookshelf, wall torch, spike trap, pillar,
  cobweb, bones, tombstone, cauldron, anvil, minecart, rails.
- **Town and outdoors:** fence, well, window, lamp post, hay bale, pumpkin, banner, tent, sack, fountain, cactus,
  pine tree, giant mushroom, stump, crystals, lily pad.
- **Seamless ground:**
  - cobblestone, roof scales, carpet, checkered floor and bridge;
  - lava that flows by shifting the tile;
  - fence, rails and bridge repeat sideways, the ladder repeats downward.
- **Art fix:** the first roof read as bricks, so the shingles are now rounded scales.
- **Showcase:** `docs/img/world.png` is a village and a dungeon room built only from these sprites, with a walking
  wizard and knight.
- **Checks:** the snapshots changed only by adding the 173 new looks; no existing look changed.

### (b) Shipped: 15 more monsters, each a character body

- **The new monsters:** spider, snake, rat, wolf, mushroom monster, crab, beetle, golem, imp, will-o-wisp, jellyfish,
  biting plant, mimic, bee and a baby dragon. Each has a 2-frame idle animation and 3–5 colors. There are now 21
  monsters and 72 more looks (686 in all).
- **Each one declares a head anchor, which makes it a character body.** Hats, `spell.walk`, every `spell.action` in
  every element, status effects and game packs all work on them with no extra art. There are 27 bodies now and
  2,761,072 combinations.
- **What the checks caught:**
  - The gear test failed on `hat-cap` on the wolf: its head anchor sat too close to the right edge, so the cap's brim
    clipped. The anchor moved one pixel left.
  - The spider's legs were drawn in the outline color and vanished on dark backgrounds, so they now use the body's
    dark shade. Its default color moved from black to purple; black is a variant.
- **Snapshots:** 72 new looks. The only changed snapshots are the random-seed characters (`char:N`, `walk:N`), because
  `spell.char.random` now picks from more bodies. GitHub heroes don't change: they pick from humanoid bodies only.
- **Showcase:** `docs/img/monsters.png` shows all 21 monsters idling, with their names.

### (c) Shipped: 26 more items

- **Weapons and gear:** dagger, spear, hammer, wand, armor, boots, amulet, and an animated candle.
- **Food:** bread, cheese, cake, carrot, egg, grapes, bottle (milk, wine, poison, honey, ink).
- **Treasure and quest items:** gold bar, trophy, map, compass, hourglass, feather, bone, backpack, letter, dice, runes.
- **Counts:** 48 items, 790 sprite looks.
- **Art fix:** the dice pips were drawn in the body's dark shade, which on white bone is pale grey and invisible, so
  they use the outline color now.

### (d) Shipped: a UI kit and `nineSlice`

- **New sprites:** `panel`, `slot` and two button states, all drawn with a 4 px frame and a uniform middle so they
  can be 9-sliced. Plus a 32×8 `bar` whose variants (`mana`, `xp`, `stamina`, `shield`, `empty`) make a fill by
  cropping, and ten icons: settings, sound, mute, pause, play, home, menu, plus, minus, arrow.
- **New method `Pixmap.nineSlice(w, h, edge = 4)`:** the corners stay as drawn, while the edges and the middle repeat
  rather than stretch, so the pixels stay crisp. Added to the types, README tables, SKILL.md (with a runnable example)
  and a test.
- **Showcase:** `docs/img/ui.png` is a game screen made from the kit: hearts, three bars, a dialog with a portrait and
  buttons, an inventory of slots filled with the new items, and an icon panel.

### (e) Shipped: music made by code

- **`spell.music(name, { key, tempo, seed })`** (`src/music.js`) adds 17 tracks:
  - 14 seamless loops for scenes: title, town, field, forest, dungeon, cave, battle, boss, shop, night, castle,
    desert, snow, ocean;
  - 3 jingles: victory, level-clear, game-over.
- **A song is a few lines of data:** tempo, key and scale, chords (one per bar), and a style for each channel. The
  engine writes the parts:
  - the melody puts chord tones on strong beats and moves by scale steps between them. A 4-bar phrase repeats with its
    first two bars as a hook, and the second ending lands on the tonic;
  - the bass plays root, root-fifth, walking or pulse patterns on a triangle wave;
  - harmony is pulse-wave arpeggios or held pads;
  - drums come from pattern strings, with a fill every 8 bars.
- **How it plays:** everything goes through `renderSound` as one recipe of timed layers, so tracks use the effects'
  voices and their seamless-loop crossfade. The jingles are written out note by note. The melody's seed is the
  song's id, so a track never changes; `seed` writes another melody, `key` transposes and `tempo` scales.
- **Fixed during the work:** the first draft built the melody's pitch pool by transposing an already-transposed
  scale. Only keys on C came out right, and the dungeon track crashed. Pitch classes are now compared directly.
- **Checks:**
  - every track renders under 0.4 s in Node, loops between 16 and 42 s, and doesn't clip;
  - loop seams are under 0.006;
  - every melody note is in its key and scale;
  - a seed gives a new melody, tempo scales the length, and key transposes;
  - 18 new snapshot hashes, with no existing one changed.
- **Where it shows up:** the sounds page has a Music section (click to loop, click again to stop), `pixspell music
  [name]` lists or renders tracks, and MCP items take `{ "music": "town" }`.
- **Not checked:** I can't listen to the tracks. Every check above is numeric, so whether they sound good is for a
  person to judge.

## Round 12: more of everything

### (a) Shipped: 30 more effect designs

- **The new designs:** 110 designs and 665 looks in all.
  - Combat: bite, triple slash, shuriken, thrown rock, muzzle flash, shield break, KO!.
  - Magic: hex barrier, life drain, rising soul, curse, haste, slow, holy cross, ice spikes, vines.
  - Rewards and UI: checkmark, alert "!", a 3-2-1-GO countdown.
  - Spectacle: falling stars, dragon breath.
  - Status: bleeding, shocked, wet, regen.
  - Seamless: petals, ash, a starry sky, clouds, a waterfall.
- **Each new effect has a sound,** chosen from the existing ones for now (`spell.sfx.forEffect`).
- **What looking at it changed:**
  - The starry sky and ash were nearly invisible on dark backgrounds, because the pale ramp's darker shades disappear.
    Their dots are brighter now.
  - The waterfall read as noise, because every column had its own phase. Columns now share a phase in bands, so it
    reads as streaks.
  - The thrown rock got bigger.
- **Checks:** 170 new looks; no existing snapshot changed. The effects page loads all 110 in under 2 s, and the new
  status overlays show up under its status filter.

### (b) Shipped: 37 more sound effects

- **103 sounds now,** all exported to `assets/sfx/`:
  - UI: hover, beep, pause, notify, buy, equip, unlock, door, switch.
  - Movement: climb, swim, fall, bounce, slide.
  - Combat: bite, throw, gunshot, shatter, thunk, clang.
  - Magic: drain, curse, haste, slow, barrier, twinkle.
  - Creatures: roar, squeak, hiss, a looping buzz, squish, wail.
  - Loops: stream, lava, crickets, heartbeat.
  - Jingle: secret, an original arpeggio, not a known game's.
- **The new effects now use the new sounds,** for example bite → `bite`, shield break → `shatter`, drain → `drain`,
  countdown → `beep`, falling stars → `twinkle`, waterfall → `stream`. The lava tile and the fireflies, which were
  silent or borrowed the campfire, now get `lava` and `crickets`.
- **The sounds page** has a `creature` filter.
- **Checks:** every sound renders between 0.05 and 3 s, doesn't clip and is loud enough. 37 new snapshot hashes,
  none changed.

### (c) Shipped: 10 more monsters (31 in all)

- **The new monsters:** owl, penguin, bunny, octopus, mummy, yeti, boar, piranha, sand worm and scorpion. Each has a
  2-frame idle animation (blinking, waddling, swaying, bobbing) and 3–4 colors.
- **All of them are bodies too,** so they wear hats, walk and act like everyone else. There are 37 bodies and 2,763,928
  combinations; 887 sprite looks in all.
- **Checks:**
  - The gear test passed for every hat on every new body without changes.
  - Snapshots: 42 new looks. As in round 11, the only changed ones are the random-seed characters, because
    `spell.char.random` picks from more bodies.

### (d) Shipped: walking in 8 directions

- **`spell.walk` takes `down-right`, `down-left`, `up-right` and `up-left`.**
  - For humanoids, a diagonal is the front or back pose with its first 12 rows (head and torso) turned one pixel
    toward the side, a 3/4 view. The legs keep their stride, and the head anchor moves with the head so the hat turns
    too.
  - The turned poses are made once per pose and cached.
  - The left diagonals mirror the right ones.
  - A body with only a side pose (the dog) walks diagonally in side view; bodies without poses hop.
- **Try-outs:** turning only the head was too subtle to read as 3/4. Turning the shoulders too made it clear.
- **Kept compatible:** `spell.walk.dirs` stays the 4 straight directions, because packs, the demo game and older code
  loop over it. `spell.walk.diagonals` lists the other 4.
- **Where diagonals show up:** `spell.pack(spec, { diagonals: true })` adds the 4 diagonal walk rows. Downloads,
  `assets/walk/`, the character maker (↘ ↙ ↗ ↖ buttons), the MCP `walk` enum and the walk showcase now cover all 8.
- **Checks:** a test covers left mirroring right, a diagonal differing from the front view, the side-pose and hop
  fallbacks, grids and pack tags. 72 new snapshots, none changed. Types are updated.

## Round 13: what real games need

### (a) Shipped: terrain that blends (autotiles)

- **`spell.autotile(inner, outer)`** (`src/autotile.js`) makes 16 corner tiles:
  - The tile index is a bitmask of which corners are the inner terrain: NW 1, NE 2, SW 4, SE 8.
  - Inside a tile, the four corners blend bilinearly, plus a small wobble that repeats every tile. Along a shared edge
    the blend depends only on the two shared corners, so neighbouring tiles meet. A test checks that fewer than 5% of
    the edge rows of any matching pair disagree.
  - The outer side gets a dark line and the inner side a light rim.
- **Using them:**
  - `outer: null` makes an overlay, so layers stack.
  - `draw(cells)` paints a whole map on a dual grid, with tiles on the corners between cells. `layout(cells)` gives
    the indices for your own tilemap.
  - `pack()` writes the sheet, a Tiled corner Wang set (`.tsx`), a Godot 4 TileSet (`.tres`, Match Corners), JSON and a
    README.
- **Where they show up:** 10 ready-made pairs go to `assets/terrain/` and the download zips (`terrain/`). There is
  `pixspell autotile <inner> [outer]`, an MCP `autotile` tool that returns the sheet image, and 11 snapshot hashes.
- **Showcase:** `docs/img/terrain.png` is an island from a height map: sea, sand, grass, a dirt path and a bay, with
  animated water.
- **Fixes along the way:**
  - The stone-floor "mountain" read as green bricks, so I dropped it.
  - A pond drawn with a water–grass pair painted grass over the whole map. A pond on a map needs an overlay.
- **Not checked:** the Tiled XML parses, and its corner order matches Tiled's documented `wangid` order. But I haven't
  opened either file in Tiled or Godot.

### (b) Shipped: retro palettes

- **`spell.palette(name)`** (`src/palette.js`) makes everything drawn afterwards use a console's colors. There are 9
  palettes: Game Boy, Game Boy Pocket, PICO-8, Sweetie 16, C64, CGA, Virtual Boy, 1-bit and sepia. A custom palette is
  an array of colors.
- **How it works:**
  - `render()` maps the ~15 colors a sprite uses (and its glow color) once per render, so nothing costs per pixel.
  - Single-hue palettes map by brightness with a little contrast added, so outlines stay darkest. Color palettes pick
    the nearest color.
  - Changing the palette clears the effect cache.
  - Actions and status overlays mix colors after rendering (hit flashes, fades, glow over a body), so with a palette
    on, their frames are snapped to it once more. A test caught this: Game Boy greens plus a fading goblin gave colors
    outside the palette.
- **`spell.toPalette(img, name)`** converts anything already drawn, such as text or a composed scene.
- **Showcase:** `docs/img/palettes.png` shows the island in six palettes.
- **Checks:** 9 snapshot hashes, plus a test that full color comes back exactly after `spell.palette(null)`.

### (c) Shipped: bring your own art (PNG importer)

- **Why:** everything so far was drawn in this repo's text format. People who already draw in Aseprite or Piskel had no
  way in, and their art couldn't recolor or resize like ours.
- **`spell.readPNG(bytes, inflate)`** (`src/import.js`) decodes PNGs: RGBA, RGB, gray, gray+alpha and palette images,
  1/2/4/8-bit, `tRNS` transparency, all five row filters. Inflate comes from the caller (`zlib.inflateSync` in Node), so
  the library stays dependency-free. Checked against PIL on Chromium screenshots and hand-made palette and 1-bit files.
- **`spell.fromImage(img, { id })`** turns the picture into a sprite:
  1. Dark colors touching the background become the outline `#`; near-white becomes `w`.
  2. The rest is grouped by hue (greys apart) into at most 3 groups. A group with more than 4 colors is split at its
     widest hue gap while a ramp is free (wood and gold sat in one group until this).
  3. Each group becomes a ramp of 4 of its own colors, so the import looks like the original until you recolor it.
- **Round trip:** drawing a built-in sprite, importing it and drawing the import gives the same pixels for sword, slime,
  heart, door, coin, tree and baby dragon. Sprites with more than 12 colors (chest, mimic, bookshelf) lose a few shades.
- **`spell.define(def)`** registers a sprite at runtime, with its variants.
- **CLI `pixspell import`:** prints the definition as code (or writes it with `-o`), splits strips with `--size 16x16`,
  and `--preview` draws 5 recolors. A preview of a file named like a built-in sprite (`frog.png`) failed on the name
  clash, so the preview now uses its own id and the CLI says the name is taken.
- **Showcase:** `docs/img/import.png`: `examples/import/my-frog.png`, drawn with plain hex colors, imported, then
  recolored and resized to a 32 px grid.
- **Skipped: hand-drawn 3/4 diagonal poses.** The procedural turn (head and shoulders shifted a pixel) already reads as
  3/4 at 16 px, and drawing 3 poses for each of 37 bodies costs a lot for little gain.

## Round 14: three passes of "use it, find what's wrong, fix it"

### Pass 1: a newcomer's first ten minutes

I packed the npm tarball, installed it in an empty folder and followed the README; then loaded every page in Chromium
at desktop and phone width.

- **Found:** an animation couldn't be saved. `spell('sword').save('x.png')` works, but `spell.action(...)` returns an
  array, so the obvious `.save()` was undefined and you had to find `encodeAPNG` and write the file yourself.
  **Fixed:** every frame list now has `.save(path)`, `.toDataURL()`, `.toAPNG()`, `.toSheet()` and `.scale(n)`
  (`src/frames.js`). The helpers are non-enumerable, so arrays still spread and compare like plain arrays.
- **Found:** `spell.frames('coin')` and `spell.char.frames(spec)` had no `.fps`, so a saved or played coin had no speed
  to go by. **Fixed:** both carry `.fps` and `.loop` now (effects loop only if their recipe does).
- **Found:** the importer only existed in code and the CLI. **Fixed:** the studio has an Import panel, and you can drop a
  PNG on the preview. A row of square frames becomes an animation, and the copied definition writes the imported
  ramps correctly (it printed `'#a,#b,#c,#d'` before).
- **Found:** the console greeting still said DOG. **Fixed.**
- **Fine:** the 61-file package, the CLI help, and all six pages (no console errors, no sideways scroll on a phone).

### Pass 2: writing a game the way an agent would

I wrote a small game from SKILL.md alone and noted where the code got long or easy to get wrong.

- **Found:** every game loop repeats the same lines: pick the frame for time t, turn every frame into a canvas, and
  subtract the feet offset, which is (12, 23) for a walk, (16, 31) for an action and doubles at grid 32. Mixing those up
  is the classic bug: a hero who jumps 4 px when they attack.
  **Fixed:**
  - frame lists know `.atTime(t)` (wrap or hold), `.duration` and `.origin`;
  - `.flipX()` keeps all of that;
  - images keep one `.canvas` each.
  The origin is stored as a kind (feet, center, corner) rather than a point, so it stays right through `scale(3)`,
  `toGrid(…, 32)` and palettes. My first version scaled the point and put the feet a pixel high.
- **Found:** no way to mute or turn the music down, although the UI kit ships mute icons. **Fixed:** every sound plays
  through a music or effects bus into a master: `spell.volume()`, `spell.volume('music', 0.3)`, `spell.mute(true)`, and
  they apply to sounds already playing.
- **Found:** switching music meant keeping the old handle around and stopping it. **Fixed:** `spell.music.play('battle')`
  fades the old track out, and calling it again with the same track does nothing, so a scene can call it on every entry.
- **SKILL.md and the canvas starter:** the one-file game recipe is shorter, draws an autotiled lake, plays music from the first key press and
  mutes on M. `templates/canvas/` got the same treatment plus a sand path that blends into the grass. I ran both in
  Chromium with simulated keys: no errors, and the knight walks and swings left with the mirrored action.

### Pass 3: what happens when you get a name wrong

AI agents guess names all day (`sowrd`, `fiire`, `crwn`), so I tried the wrong name on every API and in the CLI.

- **Found:**
  - `spell('sowrd')` said "Try spell.list()", which lists 1,500 ids.
  - An element typo (`'fiire'`) was reported as "unknown material", a word the caller never used.
  - In the CLI, a wrong sprite name printed a Node stack trace.
  - A misspelled option (`--elemnt ice`) was silently ignored, so you got a default orange meteor and no hint why.
- **Fixed:**
  - `src/suggest.js` finds the closest names by edit distance, counting a swapped pair as one edit. It also matches one
    part of a hyphenated id, so `crwn` finds `crown` and `metor` finds `meteor`.
  - Every lookup error now ends with `Did you mean "sword"?` when something is close, and says nothing when nothing is
    close.
  - Elements are checked where they're used, so the message says "element" and lists the elements.
  - The CLI suggests commands and options, refuses unknown options, and prints errors as one line with exit code 1
    (`PIXSPELL_DEBUG=1` shows the stack).
- **Also:** `pixspell char` printed the character spec on every run. It now prints only for `--random`, to stderr, so
  you can rebuild that character in code.
- **SKILL.md** tells agents the errors name the closest real names, so they read the suggestion instead of guessing again.
- **Checked and fine:** importing the library takes about 45 ms in Node.

## Round 15: people from around the world

The ask: more varied characters, especially ones with the look of different countries.

- **Skin tones first.** Every humanoid paints its skin with ramp C, but there was only one skin material, so nearly
  everyone was light-skinned. There are now 6 tones, light to deep (`spell.char.skins`). Random characters pick one 70% of
  the time, and the maker has a Skin row.
- **14 bodies in traditional clothing:** hanbok, the seonbi's dopo, kimono, kamishimo, hanfu, áo dài, sari, thobe and
  bisht, kente, toga, kilt, dirndl, poncho and deel.
  - **How they're built:** a small generator (`people.js` is its output) combines 5 hair styles (short, long, topknot,
    low bun with a pin, braids) with outfit rows for the front, back and side views. Front and back are written as
    mirrored halves. Walk frames are derived: legs lift one foot at a time, while robes and skirts sway the hem a pixel.
    Each body is 4 sprites (front plus 3 walk poses), and all of them wear any hat and hold any item.
  - **Colors:** A is the garment, B is the hair and trims, C is the skin, and `w` is white cloth.
- **What I fixed after looking at them:**
  - Garments painted in the lightest shade read as pastel (the red hanbok looked peach), so most use the mid shade now.
  - The seonbi's sash read as a necktie, so it became a band with a tie at the side.
  - Kente was noise, so it became clean stripes over one shoulder.
  - The default hanfu was red, like the hanbok, so it's jade now.
  - The turban looked like bread until it went white with a red jewel.
  - The kokoshnik looked like a red-and-white mushroom until the white dots became gold.
  - The hide shield's spots happened to spell "25".
- **Gear:** 14 hats, 8 weapons and 3 shields.
  - The weapons bring their own attack styles: the katana and scimitar slash, the gladius and jian stab, the claymore
    smashes and the fan casts. The boomerang slashes, because "shoot" fires an arrow.
  - The clipping test caught 474 placements where the scimitar, fan, boomerang, khopesh or a long headcloth left the
    24×24 frame. The rule it taught: an item must stay within 5 pixels of its grip. The nemes and keffiyeh drapes are two
    rows shorter so they fit on a slime.
- **Approach:** clothing and headwear show where someone is from; faces are the same for everyone, with no features
  drawn as a caricature. Every part recolors, and any skin tone goes with any outfit.
- **Presets:** `spell.char.world` has 26 people with a name and region each. The maker shows them as an "Around the
  world" row, and `docs/img/people.png` shows them all walking.
- **Numbers:**

  | | before | after |
  | --- | --- | --- |
  | bodies | 37 | 51 |
  | hats | 18 | 32 |
  | held items | 15 | 23 |
  | off-hand items | 6 | 9 |
  | combinations | 2.76 million | 23.3 million |
  | sprite looks | 887 | 1,056 |

  The snapshots for the 12 random characters changed, as expected, because there are more bodies and tones to draw from.

## Round 16: taller people

The ask: characters that are a bit longer top to bottom, not only the 16 px chibi.

- **Not redrawn: stretched.** `height` on a spec (16-32) repeats one torso row and one leg row of a humanoid in every
  pose. Front, back, side and 3/4 all repeat the same rows, so the hips don't jump when the walk direction changes.
  Anchors below a repeated row move down with it, so the sword is still in the hand. Each image is a cached sprite like
  the 3/4 poses.
- **Choosing the rows took two tries.**
  - First I scored rows by how much they looked like the row below. That picked the hero's hand row (arms like orange
    sticks) and the boot row (black stilts).
  - Each body now names its rows: the chest or a long garment, never a row with the hands. Never a row the walk
    animation moves either, because the bodies that step lift rows 13-15.
  - So the hero grows in the chest and thighs, the hanbok's chima and the samurai's hakama get longer, and the hanfu's
    sleeves and robe lengthen together.
  - 40% of the extra height goes to the torso and 60% to the legs, so 24 px reads as normal RPG proportions.
- **Everything around it grows with it.**
  - The character canvas is 24 x (8 + height).
  - Action frames are 32 x (16 + height), with the smash's ground line measured from the bottom.
  - Status effects sit at the feet.
  - Pack cells get taller, and the README's Phaser origin and Godot offset use the real cell height.
- **Maker:** a Height row (16/20/24/28/32). Presets keep the height you picked, and the code note gives the real frame
  size.
- **Checks:** a test checks sizes, origins, the unchanged head, the sword following the hand, monsters keeping their
  size, the error for 40 and the pack metadata. There are 26 new snapshot hashes, and no existing one changed.

### More checks after the tall characters

- **Found: the demo game dropped things you chose in the maker.** "Play as this character" kept only the hat, held
  items and outfit color, so a skin tone, hair color or height disappeared on the way. It also drew everyone at fixed
  24x24 and 32x32 offsets, so a tall hero would have floated a row per extra pixel. And its "you are playing as" line
  still said `dog.char`.
  **Fixed:** it keeps B, C and height, draws every frame from its bottom center, and says `spell.char`. I played it as a
  24 px brown-skinned samurai in Chromium and it stands and swings in the right place.
- **Found: the maker forgot the chosen height.** Rolling a monster (which can't be tall) dropped the height, so the
  following rolls came out chibi again. **Fixed:** the Height row sets a preference that rolls and presets keep.
- **Found: random characters were mostly traditional outfits.** Every humanoid counted three times, and 14 of the 19
  humanoids are now outfits, so 9 of 12 rolls were outfits. **Fixed:** outfits count once, like animals and monsters.
  Over 3,000 seeds that gives about 25% fantasy heroes, 22% outfits and 53% animals and monsters.
- **Found: the tall hanbok had a pale stripe down the chima.** It repeated a skirt row with a highlight in it.
  **Fixed:** it repeats the plain row above.
- **Fine:** all six pages, no sideways scroll on a phone; every humanoid at 32 px.

### Tall, take two: drawn, not stretched

Next to the original, the stretched people looked wrong: the arms were sticks, and nothing bent at the elbow, waist or
knee. I drew one tall knight by hand to compare; the difference was obvious, and drawing fits the project better anyway,
since every sprite is hand-drawn text art and a tall body is just one more sprite with anchors.

- **All 19 human bodies are drawn again at 16x24** (`src/sprites/tall.js`, 76 sprites: each body plus 3 walk poses).
  - **Same head:** rows 0-7 are copied from each chibi pose, so a tall character has the same face and hair, and hats
    sit the same way.
  - **Below the neck,** each body has shoulders, arms apart from the torso, hands at the hips on row 14, then legs with
    knees and boots, or a long garment: the chima, the dopo, the hakama, a sari with its pallu over one shoulder.
  - **Walking:** legs lift one shin at a time and robes sway at the hem. Each body has a side view and a drawn stride,
    and the 3/4 diagonals come from the same turn as the chibi poses.
- **`height` now takes 16 or 24.** 24 swaps in `<body>-tall` for every pose. Variants keep their colors, and animals and
  monsters keep their size. The row-stretching code is gone, and with it heights 20, 28 and 32.
- **Fixed after looking at them:**
  - The sari's pallu was mirrored into an "A", because its rows were written as mirrored halves.
  - The poncho was a flat disc; it's now a longer cape with a fringe.
  - The deel had a lump on one shoulder.
- **Checks:**
  - The clipping test now bounds each pose by its real height.
  - A test checks that every humanoid has all 4 tall sprites with the chibi head, plus the sizes, origins, the hand,
    the pack cells and the error for 32.
  - Snapshots: only the tall entries changed (stretched to drawn), 2 were removed (20 and 32) and 76 are new.

## Round 17: what would make people use it

The question this time: keep the name or switch to "Pixpell", and what would actually bring people in.

- **The name stays.** The API is `spell()`, so "PixSpell" explains the code, and "Pixpell" would read as a typo of
  "pixel". Neither name is taken on npm or GitHub.
- **Looking at what's out there:** the LPC character generator has about 2,000 stars, so people want character
  generators. "Game asset" MCP servers have 100-170 stars, and every one of them needs a GPU or an API key. What we have
  that nobody else does: no model, no key, offline, the same output every time, CC0, with sound and music too.
  The full plan, including what only the owner can do, is in `docs/launch.md`.
- **Biggest blocker:** the package isn't on npm yet, so the README's `npm i pixspell` and `npx pixspell` would fail
  for anyone who tries.
- **Built this round, for the engines people already use:**
  - **RPG Maker MV / MZ:** `spell.rpgmaker(specs)` makes a "$" sheet for one character or a 4x2 sheet for up to 8.
    The chibi characters at 2x are exactly RPG Maker's 48 px frames, and tall ones are 48x64. Rows go down, left, right,
    up, with the standing frame in the middle column. Faces are a crop around the head at 144 px.
  - **GameMaker:** `pack(spec, { strips: true })` adds `<name>_<animation>_stripN.png`, which GameMaker splits on
    import.
  - **Unity:** the pack README gives the slice grid and a bottom-center pivot.
  - **Avatars:** `spell.avatar(spec)` makes a square profile picture, head and shoulders or the full character, for
    people who just want a pixel portrait.
  - **Where they show up:** maker buttons (RPG Maker, Avatar; the maker's game pack now includes strips), CLI
    `pixspell rpgmaker [--random 8]` and `pixspell avatar`, and an MCP pack `format: "rpgmaker"`.

