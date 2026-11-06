# DOG + Phaser starter

A hero that walks in 4 directions and fights slimes, using two DOG game packs.

```bash
cd templates/phaser
python3 -m http.server 8000   # any static server works
# open http://localhost:8000 - arrows move, space attacks
```

- `hero.png` + `hero.json`, `slime.png` + `slime.json`: DOG game packs (Aseprite-format JSON).
  Make your own in the [character maker](https://olebangpad.github.io/dog/#maker) → **📦 Game pack**,
  or `node scripts/dog.js pack heroine --hat wizard --hand staff -o hero.zip`, and replace the files.
- Phaser reads them with `this.load.aseprite()` and `sprite.anims.createFromAseprite()`.
- Animations in every pack: `idle`, `walk-down`, `walk-up`, `walk-left`, `walk-right`,
  `attack`, `hit`, `heal`, `levelup`, `cast`, `death`. Feet are at (16, 31) in each 32×32 frame.
- `slash.wav`, `hit.wav`, `poof.wav`: DOG sounds, made by code like the sprites. Get others on the
  [sounds page](https://olebangpad.github.io/dog/sfx.html) or with `node scripts/dog.js sfx smash --element fire -o slash.wav`.
  Without files: `this.sound.decodeAudio('coin', dog.sfx('coin').toWAV().buffer)`, then play it after the `decoded` event.
