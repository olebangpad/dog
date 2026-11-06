#!/usr/bin/env node
// Visual regression snapshots: a hash of what everything looks like.
//   node scripts/snapshots.js          -> rewrite test/snapshots.json (after an intended art/engine change)
// test/snapshots.test.js recomputes the hashes and fails if any changed unexpectedly.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function computeSnapshots() {
  const { spell, looks } = await import('../src/index.js')
  const fnv = (frames) => {
    let h = 2166136261
    for (const f of frames) {
      h = Math.imul(h ^ f.w, 16777619); h = Math.imul(h ^ f.h, 16777619)
      for (let i = 0; i < f.data.length; i++) h = Math.imul(h ^ f.data[i], 16777619)
    }
    return (h >>> 0).toString(16).padStart(8, '0')
  }
  const out = {}
  // every sprite and variant, all frames
  for (const id of Object.keys(looks)) out[`look:${id}`] = fnv(looks[id].def.frames.map((_, i) => spell(id, { frame: i })))
  // characters, walks, actions, statuses
  const specs = [
    { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' },
    { body: 'heroine', hat: 'wizard', hand: 'staff-fire', offhand: 'orb' },
    { body: 'goblin-chief', hat: 'pirate', hand: 'dagger' },
    { body: 'robot', hat: 'cowboy', hand: 'hammer', A: '#ff4fd8' },
    { body: 'skeleton', hand: 'bow' },
    { body: 'slime-blue', hat: 'crown' },
    ...Array.from({ length: 12 }, (_, i) => spell.char.random(i)),
  ]
  specs.forEach((s, i) => {
    out[`char:${i}`] = fnv(spell.char.frames(s))
    for (const d of [...spell.walk.dirs, ...spell.walk.diagonals]) out[`walk:${i}:${d}`] = fnv(spell.walk(s, d))
  })
  for (const s of specs.slice(0, 6)) {
    for (const a of spell.action.list) out[`action:${s.body}:${a}`] = fnv(spell.action(s, a))
    out[`action:${s.body}:attack-ice`] = fnv(spell.action(s, 'attack', 'ice'))
  }
  for (const st of spell.action.styles) out[`style:${st}`] = fnv(spell.action('hero', 'attack', { style: st }))
  for (const name of ['burning', 'aura', 'frozen']) out[`status:${name}`] = fnv(spell.status(specs[0], name, { walk: 'left' }))
  // effects at another size and seed, and a sequence
  for (const id of spell.fx.list) out[`fx48:${id}`] = fnv(spell.fx(id, { size: 48, seed: 3 }))
  out['fx:sequence'] = fnv(spell.fx.sequence([{ fx: 'charge' }, { fx: 'comet', x: 4 }, { fx: 'boom', with: true, at: 3 }]))
  // image ops
  out['ops:pipeline'] = fnv([spell('slime-pink').smooth(2).outline('#fff').shadow().hue(40).rotate(90).flipX().scale(0.5)])
  out['pack:hero'] = fnv([spell.pack(specs[0]).image])
  // other tile grids: halved with outlines, Scale2x, native effects, a character pack
  for (const g of [8, 32, 64]) {
    for (const id of ['potion', 'sword', 'slime-pink', 'chest-gold', 'tree', 'skull', 'heart', 'grass']) out[`grid${g}:${id}`] = fnv(spell.frames(id, { grid: g }))
    out[`grid${g}:char`] = fnv(spell.walk(specs[0], 'left', { grid: g }))
    out[`grid${g}:fx-portal-ice`] = fnv(spell.frames('fx-portal-ice', { grid: g }))
  }
  out['grid32:pack'] = fnv([spell.pack(specs[1], { grid: 32, actions: ['attack'] }).image])
  // sounds: the 16-bit PCM bytes, so tiny float differences below one step don't count
  const pcm = (sound) => ({ w: sound.samples.length, h: sound.sampleRate, data: sound.toWAV().subarray(44) })
  for (const id of spell.sfx.list) out[`sfx:${id}`] = fnv([pcm(spell.sfx(id))])
  for (const el of spell.sfx.elements) out[`sfx:slash-${el}`] = fnv([pcm(spell.sfx('slash', { element: el }))])
  out['sfx:hit-seed3-pitch1.3'] = fnv([pcm(spell.sfx('hit', { seed: 3, pitch: 1.3 }))])
  for (const id of spell.music.list) out[`music:${id}`] = fnv([pcm(spell.music(id))])
  out['music:town-seed1-key2'] = fnv([pcm(spell.music('town', { seed: 1, key: 2 }))])
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const snaps = await computeSnapshots()
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'snapshots.json')
  writeFileSync(path, JSON.stringify(snaps, null, 1) + '\n')
  console.log(`wrote ${Object.keys(snaps).length} snapshots to test/snapshots.json`)
}
