# Changelog

PixSpell follows [semantic versioning](https://semver.org). Until 1.0, a minor version (0.x) may change the API;
patch versions never do. Art changes that alter how a sprite looks are listed here too.

## 0.1.0 · first release

- **One entry point, `spell`:** `spell('sword')`, `spell.char()`, `spell.fx()`, `spell.sfx()` and the rest. The project's
  early name was DOG, so `dog` is exported as an alias of `spell` and old snippets keep working.

- **Sprites as code:** 126 sprites, 441 looks with variants. Recolor any of them to 18 materials or any hex
  color, combine them, resize them crisply, export PNG / animated PNG / sheets / atlas.
- **Characters:**
  - 12 bodies and 2.7 million combinations of hats, held items and off-hand items, snapped on by name.
  - 4-direction walk cycles.
  - 6 actions (attack, hit, heal, level up, cast, death) in 5 elements, with attacks that follow the weapon.
- **Effects that glow:** 80 procedural designs (545 looks), with a translucent light layer (`light: false` for flat pixels): bursts, magic, projectiles, beams, seamless weather, environment,
  status overlays, combat feedback and big moments. Any color, any size; sequences; effects on characters.
- **Sounds:** 66 procedural sound effects matching every attack style, action and effect; 10 element flavors,
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
