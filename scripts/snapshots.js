#!/usr/bin/env node
// Visual regression snapshots: a hash of what everything looks like.
//   node scripts/snapshots.js          -> rewrite test/snapshots.json (after an intended art/engine change)
// test/snapshots.test.js recomputes the hashes and fails if any changed unexpectedly.

import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export async function computeSnapshots() {
  const { dog, looks } = await import('../src/index.js')
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
  for (const id of Object.keys(looks)) out[`look:${id}`] = fnv(looks[id].def.frames.map((_, i) => dog(id, { frame: i })))
  // characters, walks, actions, statuses
  const specs = [
    { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield' },
    { body: 'heroine', hat: 'wizard', hand: 'staff-fire', offhand: 'orb' },
    { body: 'goblin-chief', hat: 'pirate', hand: 'dagger' },
    { body: 'robot', hat: 'cowboy', hand: 'hammer', A: '#ff4fd8' },
    { body: 'skeleton', hand: 'bow' },
    { body: 'slime-blue', hat: 'crown' },
    ...Array.from({ length: 12 }, (_, i) => dog.char.random(i)),
  ]
  specs.forEach((s, i) => {
    out[`char:${i}`] = fnv(dog.char.frames(s))
    for (const d of dog.walk.dirs) out[`walk:${i}:${d}`] = fnv(dog.walk(s, d))
  })
  for (const s of specs.slice(0, 6)) {
    for (const a of dog.action.list) out[`action:${s.body}:${a}`] = fnv(dog.action(s, a))
    out[`action:${s.body}:attack-ice`] = fnv(dog.action(s, 'attack', 'ice'))
  }
  for (const st of dog.action.styles) out[`style:${st}`] = fnv(dog.action('hero', 'attack', { style: st }))
  for (const name of ['burning', 'aura', 'frozen']) out[`status:${name}`] = fnv(dog.status(specs[0], name, { walk: 'left' }))
  // effects at another size and seed, and a sequence
  for (const id of dog.fx.list) out[`fx48:${id}`] = fnv(dog.fx(id, { size: 48, seed: 3 }))
  out['fx:sequence'] = fnv(dog.fx.sequence([{ fx: 'charge' }, { fx: 'comet', x: 4 }, { fx: 'boom', with: true, at: 3 }]))
  // image ops
  out['ops:pipeline'] = fnv([dog('slime-pink').smooth(2).outline('#fff').shadow().hue(40).rotate(90).flipX().scale(0.5)])
  out['pack:hero'] = fnv([dog.pack(specs[0]).image])
  return out
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const snaps = await computeSnapshots()
  const path = join(dirname(fileURLToPath(import.meta.url)), '..', 'test', 'snapshots.json')
  writeFileSync(path, JSON.stringify(snaps, null, 1) + '\n')
  console.log(`wrote ${Object.keys(snaps).length} snapshots to test/snapshots.json`)
}
