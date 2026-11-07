# Changelog

PixSpell follows [semantic versioning](https://semver.org). Until 1.0, a minor version (0.x) may change the API;
patch versions never do. Art changes that alter how a sprite looks are listed here too.

## 0.1.0 · first release

- **One entry point, `spell`:** `spell('sword')`, `spell.char()`, `spell.fx()`, `spell.sfx()` and the rest. The project's
  early name was DOG, so `dog` is exported as an alias of `spell` and old snippets keep working.

- **Sprites as code:** 126 sprites, 441 looks with variants. Recolor any of them to 18 materials or any hex
  color, combine them, resize them crisply, export PNG / animated PNG / sheets / atlas.
- **World building:** 42 more tiles and props (614 sprite looks in all): doors, windows, roofs, fences, furniture, dungeon
  pieces (pillars, spike traps, stairs, cobwebs, bones), a cauldron, anvil, well, fountain, banners, tent, mine cart and
  rails, more nature, and seamless cobblestone, roof, carpet, checkered floor, bridge and animated lava.
- **Music:** `spell.music(name, { key, tempo, seed })` renders 17 chiptune tracks: 14 seamless loops for scenes (title,
  town, field, forest, dungeon, cave, battle, boss, shop, night, castle, desert, snow, ocean) and 3 jingles. Each is a few
  lines of song data; the engine writes the melody, bass, harmony and drums. Sounds page, CLI `pixspell music`, MCP items.
- **Chibi or tall:** every one of the 19 human bodies also comes drawn at 24 px tall (same head, neck, arms apart from the
  body, hands at the hips, long legs or garment), with all 8 walk directions. `height: 24` on a spec uses it in characters,
  walks, actions, statuses and packs (24x32 characters, 32x40 actions and cells, feet at the bottom); maker Height row,
  CLI `--height 24`, `docs/img/heights.png`.
- **People from around the world:** 14 bodies in traditional clothing (hanbok, seonbi dopo, kimono, kamishimo, hanfu,
  áo dài, sari, thobe, kente, toga, kilt, dirndl, poncho, deel), 14 hats from the same places, 8 weapons with their own
  attack styles and 3 shields; `spell.char.world` (26 ready-made people) and 6 skin tones (`spell.char.skins`) for any
  humanoid. Random characters now vary skin tone. The maker has "Around the world" and "Skin" rows. 23,279,919
  combinations. Random seeds give different characters than before: more bodies to draw from, and the fantasy
  humanoids count three times, outfits, animals and monsters once each.
- **Animations are easy to save:** every frame list (`walk`, `action`, `status`, `fx`, `frames`, `char.frames`) has
  `.save(path)` (an animated PNG at its own speed), `.toDataURL()` (an `<img>` that plays), `.toAPNG()`, `.toSheet()` and
  `.scale(n)`, and `spell.frames()` / `spell.char.frames()` now carry `.fps` and `.loop` too.
- **Typos get an answer:** every name lookup (sprites, effects, sounds, music, gear, bodies, actions, elements, colors,
  palettes, walk directions) says `Did you mean "sword"?` when something is close. The CLI does the same for commands
  and options, rejects unknown options instead of ignoring them, and prints errors in one line with exit code 1.
- **Game-loop helpers:** frame lists have `.atTime(t)`, `.duration`, `.flipX()` and `.origin` (a character's feet, an
  effect's middle, already right for the grid), and every image has a kept `.canvas` for `drawImage`. The SKILL.md game
  recipe uses them and draws an autotiled lake.
- **Volume and music switching:** `spell.volume(level)`, `spell.volume('music' | 'sfx', level)`, `spell.mute(on)` reach
  every sound, playing ones too. `spell.music.play(name)` switches tracks with a fade and keeps the same track going;
  `spell.music.stop(fade)`, `spell.music.playing()`. `sound.play({ fadeIn })` and `stop(fade)`.
- **Bring your own art:** `spell.fromImage(img, { id })` turns a picture (or frames, up to 64×64) into a sprite with an
  outline and up to 3 recolorable ramps, `spell.define(def)` registers it, `spell.readPNG(bytes, inflate)` decodes PNGs
  (8-bit, palette, gray). CLI `pixspell import art.png [--size 16x16] [-o art.js] [--preview p.png]`, and an Import panel in the studio
  (or drop a PNG on the preview).
- **Retro palettes:** `spell.palette('gameboy' | 'pico-8' | 'sweetie-16' | 'c64' | ...)` draws everything afterwards in
  a console's colors (brightness-mapped for single-hue palettes); `spell.toPalette(img, name)` converts one image.
- **Terrain transitions:** `spell.autotile(inner, outer)` makes 16 corner tiles that blend two terrains, draws whole
  maps from a grid of cells (dual grid), stacks as overlays, and packs a Tiled corner Wang set and a Godot 4 TileSet.
  10 ready-made pairs in `assets/terrain/` and the downloads; `pixspell autotile`; an MCP tool.
- **UI kit:** `panel`, `slot`, `button`, `button-pressed`, a 32×8 `bar` (health, mana, XP, stamina, shield, empty) and
  icons (settings, sound, mute, pause, play, home, menu, plus, minus, arrow). New `Pixmap.nineSlice(w, h, edge)`
  stretches framed images to any size with their corners intact.
- **Items:** 26 more (48 in all): dagger, spear, hammer, wand, armor, boots, amulet, candle, bread, cheese, cake, carrot,
  egg, grapes, bottle, gold bar, trophy, map, compass, hourglass, feather, bone, backpack, letter, dice and runes.
- **Monsters:** 25 new ones (spider, snake, rat, wolf, mushroom monster, crab, beetle, golem, imp, will-o-wisp,
  jellyfish, biting plant, mimic, bee, baby dragon, owl, penguin, bunny, octopus, mummy, yeti, boar, piranha, sand worm,
  scorpion), 31 in all, each a character body: hats, walks and actions work on
  every monster. `spell.char.random(seed)` now draws from 51 bodies, so a seed gives a different character than it did
  before this change.
- **Characters:**
  - 51 bodies and 23 million combinations of hats, held items and off-hand items, snapped on by name.
  - 8-direction walk cycles: drawn front, back and side poses, and 3/4 diagonals turned from them (`spell.walk.diagonals`,
    `spell.pack(spec, { diagonals: true })`).
  - 6 actions (attack, hit, heal, level up, cast, death) in 5 elements, with attacks that follow the weapon.
- **Effects that glow:** 110 procedural designs (665 looks), with a translucent light layer (`light: false` for flat pixels): bursts, magic, projectiles, beams, seamless weather, environment,
  status overlays, combat feedback and big moments. Any color, any size; sequences; effects on characters.
- **Sounds:** 103 procedural sound effects (UI, movement, combat, magic, creatures, loops and jingles) matching every attack style, action and effect; 10 element flavors,
  variations, pitch; WAV export and browser playback.
- **Any tile size:** `grid: 8 | 16 | 32 | 64` on every call; a download-everything zip per tile size.
- **Game packs** for Phaser (Aseprite JSON) and Godot 4 (`SpriteFrames`); canvas and Phaser starter templates.
- **Spell Survivors** (`examples/spell-survivors`): a complete game whose every asset is a PixSpell call, written by an AI agent.
- **Your GitHub hero:** a username becomes an animated character card for a profile README (login → look, top language →
  class and colors, repos and stars → level and weapon, recent activity → what it's doing). On the hero page, with
  `pixspell hero <login>`, or redrawn daily by the GitHub Action (`uses: olebangpad/pixspell@main`).
- **Smaller animated PNGs:** after the first frame, each frame stores only the rectangle that changed. The pixel font
  gained `@`.
- **For AI coding agents:** `SKILL.md` in the open Agent Skills format (also a Claude Code plugin), `llms.txt`, a generated
  sprite catalog, TypeScript types. `npx pixspell skill` installs the skill into `.agents/skills/` for Codex, Cursor,
  Gemini CLI, GitHub Copilot, OpenCode and other Agent Skills clients (`--claude`: `.claude/skills/`).
- **Agents can look at what they pick:** `pixspell preview` draws any mix of names, JavaScript calls or JSON items into
  one contact sheet (every frame, zoomed, with size, frames and fps; sounds as waveforms). `pixspell mcp` is an MCP
  server with no dependencies: `preview` returns that image to the agent, `catalog` finds names, `save` and `pack` write
  files inside the project. `pixspell doctor` checks the setup.
- CLI: `pixspell render | combine | char | pack | fx | fxpack | sfx | sfxpack | export | hero | preview | doctor | mcp | skill` (`npx pixspell ...`).
