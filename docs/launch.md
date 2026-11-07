# Launch plan: who PixSpell is for, and how they find it

## Positioning

**Every asset for your 2D game, from code.** No image model, no API key, works offline, the same output every time,
CC0. Characters that walk and fight, items, tiles, effects, sounds and music, in one zero-dependency library that a
person can click through and a coding agent can call.

What's out there:

- **Character generators** prove the demand. The LPC character generator has about 2,000 stars and outputs one style
  in one sheet layout.
- **"Game asset" MCP servers** sit around 100–170 stars, and all of them need a GPU or a paid API.

Nothing else covers all four:

- one coherent pixel style;
- recolors and resizes that are code;
- animations, sounds and music as well as images;
- an agent skill and MCP server built in.

## Name

Keep **PixSpell**. The API is `spell('sword')`, so the name explains the code, and "spell" carries the idea that one
line conjures an asset. "Pixpell" would read as a typo of "pixel". Neither name is taken on npm or GitHub. To make the
"xsp" easier to read, always write it **PixSpell**.

## Who uses it, and what they need

| who | what they need | what we have |
| --- | --- | --- |
| Game jam and indie devs | assets in minutes, in their engine | maker, downloads at 8–64 px; packs for Phaser, Godot, Unity, GameMaker, RPG Maker; Tiled tilesets |
| People building games with AI agents | assets the agent can make itself | Agent Skill, MCP server, typo suggestions, `pixspell preview` |
| RPG Maker hobbyists | free characters in its format | `spell.rpgmaker`, maker button (48 px frames, faces) |
| People who just want a pixel avatar | a picture to use | maker Avatar button, GitHub hero card |
| JS learners and teachers | a game in one file | `templates/canvas`, the SKILL recipe, Spell Survivors |

## Owner checklist (needs your accounts)

1. **Publish to npm.** This blocks launch: the README tells people to run `npm i pixspell` and `npx pixspell`, and both
   fail until the package is published.
   - Add an `NPM_TOKEN` secret, then push the tag `v0.1.0`; the release workflow publishes.
   - After that, `https://cdn.jsdelivr.net/npm/pixspell/+esm` also serves the library as one bundled file.
2. **GitHub:** About text, website link, topics (`pixel-art`, `game-assets`, `gamedev`, `sprites`, `procedural-generation`,
   `mcp`, `agent-skills`, `phaser`, `godot`, `rpg-maker`, `cc0`), and the social preview image (`docs/img/social.png`).
3. **itch.io asset page** (free, CC0). This is where indie devs search for assets.
   - Upload the 16 and 32 px download zips and the RPG Maker sample.
   - Cover: `docs/img/people.png`; screenshots: gallery, effects, terrain.
4. **OpenGameArt** entry for the CC0 collection, linking back.
5. **Directories:** MCP lists (mcp.so, Smithery, awesome-mcp-servers); awesome-gamedev, awesome-pixel-art, awesome-cc0,
   awesome-claude-code; the Godot Asset Library (as an asset pack).
6. **Launch posts**, after the promo game: Show HN, r/gamedev, r/pixelart, r/godot, r/IndieDev, r/RPGMaker, X / Bluesky
   with the promo GIF. The best hook: "a whole game in one HTML file, zero image or audio files."

## Before launch (code)

- The promo game: everything visible on one screen, playable in the browser, with a GIF of it in the README hero.
- Refresh the promo assets: `code.gif`, the social image and the reels still show old numbers.
