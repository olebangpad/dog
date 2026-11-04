#!/usr/bin/env node
// Checks every sprite before it can be merged. Run: node scripts/validate.js
// (Loading the registry already validates sizes and characters; this adds
// style rules so the collection stays consistent.)

import { sprites, looks, MATERIALS, resolveRamp } from '../src/index.js'

const errors = []
const fail = (id, msg) => errors.push(`${id}: ${msg}`)

for (const def of Object.values(sprites)) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(def.id)) fail(def.id, 'ids are lowercase-kebab-case')
  if (def.w > 64 || def.h > 64) fail(def.id, 'keep sprites at 64x64 or smaller')
  if (def.fps < 1 || def.fps > 30) fail(def.id, 'fps must be between 1 and 30')
  for (const [slot, value] of Object.entries(def.ramps)) {
    try { resolveRamp(value) } catch (e) { fail(def.id, `ramp ${slot}: ${e.message}`) }
  }
  for (const [name, ramps] of Object.entries(def.variants)) {
    if (!/^[a-z0-9_]+$/.test(name)) fail(def.id, `variant "${name}" should be lowercase`)
    for (const [slot, value] of Object.entries(ramps)) {
      if (!['A', 'B', 'C'].includes(slot)) fail(def.id, `variant "${name}" sets unknown slot ${slot}`)
      else if (!def.slots.includes(slot)) fail(def.id, `variant "${name}" recolors slot ${slot}, but the art never uses it`)
      try { resolveRamp(value) } catch (e) { fail(def.id, `variant "${name}": ${e.message}`) }
    }
  }
  const visible = def.frames.every((rows) => rows.some((r) => /[^.]/.test(r)))
  if (!visible) fail(def.id, 'every frame needs at least one visible pixel')
}

const count = Object.keys(looks).length
if (errors.length) {
  console.error(errors.map((e) => '  x ' + e).join('\n'))
  console.error(`\n${errors.length} problem(s) found`)
  process.exit(1)
}
console.log(`ok - ${Object.keys(sprites).length} sprites, ${count} looks, ${Object.keys(MATERIALS).length} materials`)
