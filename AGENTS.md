# AGENTS.md

Guide for AI coding agents (and people) working **on** this repository.
To **use** PixSpell in another project, read [`skills/pixspell/SKILL.md`](skills/pixspell/SKILL.md) instead: setup, the whole API and game recipes.

## What this is

PixSpell generates game assets with code: pixel-art sprites stored as text, a character system
(bodies + gear by name), walk cycles and actions, procedural effects, procedural sound effects, and exports
(PNG / APNG, sheets, Phaser/Aseprite JSON, Godot `.tres`, zips) at an 8, 16, 32 or 64 px tile grid.
Plain ES modules, zero dependencies, Node 18+ and modern browsers.

## Map

| path | what |
| --- | --- |
| `src/index.js` | the public API: `spell` (`spell.char`, `spell.walk`, `spell.action`, `spell.fx`, `spell.sfx`, packs, grids); `dog` is an alias of the early name |
| `src/index.d.ts` | TypeScript types for the public API; keep in sync |
| `src/sprites/*.js` | sprite text art by category (`.` clear, `#` outline, `w` white, `1-4` / `5-8` / `a-d` ramps A / B / C) |
| `src/pixmap.js`, `src/png.js`, `src/zip.js` | images, PNG/APNG encoder, zip writer |
| `src/character.js`, `src/action.js`, `src/pack.js`, `src/bundle.js` | characters, actions, game packs, tile-size bundles |
| `src/fx.js` + `src/fx/*.js` | effect engine + recipes |
| `src/sfx.js` + `src/sfx/sounds.js` | sound engine + recipes |
| `src/preview.js`, `scripts/mcp.js` | contact sheets for checking assets by eye (`pixspell preview`), JSON items → calls, and the zero-dependency MCP server (`pixspell mcp`) |
| `src/profile.js`, `action.yml` | the GitHub hero: stats from GitHub's API → a character card (`pixspell hero`), and the Action that redraws it daily |
| `web/`, `*.html` | the GitHub Pages site (studio, maker, effects, sounds, demo game, GitHub hero) |
| `scripts/` | `build.js` (assets, showcase images, catalog), `pixspell.js` (CLI), `validate.js`, `snapshots.js` |
| `test/` | `node --test` suites, `snapshots.json` (hashes of every rendered look and sound), `types/usage.ts` |
| `skills/pixspell/` | the AI skill (`SKILL.md`, generated `catalog.md`); also a Claude Code plugin via `.claude-plugin/` |

## Commands

```bash
npm run check        # validate sprites + all tests (run before every commit)
npm run types        # type-check src/index.d.ts against test/types/usage.ts
npm run build        # regenerate assets/, docs/img/, skills/pixspell/catalog.md, template packs
npm run snapshots    # ONLY after an intended visual/audio change: rewrites test/snapshots.json
python3 -m http.server 8080   # serve the site, open http://localhost:8080
```

## Rules

- **No dependencies.** Not in `src/`, not in `package.json`. Dev tools run through `npx` in scripts or CI.
- **Paint with ramps, never hard-coded colors**, so every sprite stays recolorable. New sprites follow
  [CONTRIBUTING.md](CONTRIBUTING.md); effect and sound recipes too.
- **Effects scale:** write sizes and positions in `p.s` and 1px widths as `p.px` (a test draws every recipe at 32 and 64 px).
- **Snapshots are a safety net.** If `test/snapshots.test.js` fails, either fix the regression or, if the change is
  intended, run `npm run snapshots` and say in the commit which looks changed and why.
- **Public API changes** need: `src/index.d.ts` + `test/types/usage.ts`, the README API table (EN and KO),
  `skills/pixspell/SKILL.md` (its code blocks are executed by `test/skill.test.js`), and a test.
- After changing art, effects, sounds or the catalog, run `npm run build` and commit the regenerated files.
- Keep `README.md` and `README.ko.md` in step.
