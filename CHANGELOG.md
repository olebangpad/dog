# Changelog

DOG follows [semantic versioning](https://semver.org). Until 1.0, a minor version (0.x) may change the API;
patch versions never do. Art changes that alter how a sprite looks are listed here too.

## 0.1.0 · first release

- **Sprites as code:** 126 sprites, 441 looks with variants. Recolor any of them to 18 materials or any hex
  color, combine them, resize them crisply, export PNG / animated PNG / sheets / atlas.
- **Characters:**
  - 12 bodies and 2.7 million combinations of hats, held items and off-hand items, snapped on by name.
  - 4-direction walk cycles.
  - 6 actions (attack, hit, heal, level up, cast, death) in 5 elements, with attacks that follow the weapon.
- **Effects:** 80 procedural designs (545 looks): bursts, magic, projectiles, beams, seamless weather, environment,
  status overlays, combat feedback and big moments. Any color, any size; sequences; effects on characters.
- **Sounds:** 66 procedural sound effects matching every attack style, action and effect; 10 element flavors,
  variations, pitch; WAV export and browser playback.
- **Any tile size:** `grid: 8 | 16 | 32 | 64` on every call; a download-everything zip per tile size.
- **Game packs** for Phaser (Aseprite JSON) and Godot 4 (`SpriteFrames`); canvas and Phaser starter templates.
- **For AI coding agents:** `SKILL.md` (also a Claude Code plugin), `llms.txt`, a generated sprite catalog,
  TypeScript types.
- CLI: `dog render | combine | char | pack | fx | fxpack | sfx | sfxpack | export`.
