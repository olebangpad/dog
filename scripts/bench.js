#!/usr/bin/env node
// Micro-benchmarks for the hot paths. Run: node scripts/bench.js
// Numbers are milliseconds (lower is better); compare before/after a change on the same machine.

const t0 = performance.now()
const { spell, looks } = await import('../src/index.js')
const importMs = performance.now() - t0

function bench(name, fn, runs = 3) {
  const times = []
  for (let i = 0; i < runs; i++) {
    const s = performance.now()
    fn()
    times.push(performance.now() - s)
  }
  times.sort((a, b) => a - b)
  return [name, times[0], times[times.length >> 1]]
}

const ids = Object.keys(looks)
const specs = Array.from({ length: 100 }, (_, i) => spell.char.random(i))
let seed = 1000
const results = [
  ['import (first load)', importMs, importMs],
  bench('spell(id) x every look', () => { for (const id of ids) spell(id) }),
  bench('spell(id) x every look, again', () => { for (const id of ids) spell(id) }),
  bench('spell.char x 100 random', () => { for (const s of specs) spell.char(s) }),
  bench('spell.walk x 100 random', () => { for (const s of specs) spell.walk(s, 'left') }),
  bench('spell.action x 20 attack', () => { for (const s of specs.slice(0, 20)) spell.action(s, 'attack') }),
  bench('scale(8) + outline x 200', () => { for (const id of ids.slice(0, 200)) spell(id).scale(8).outline('#fff') }),
  // a new seed every run, so this measures generation and not the spell.fx cache
  bench(`fx generate x ${spell.fx.list.length} (uncached)`, () => { seed++; for (const id of spell.fx.list) spell.fx(id, { seed }) }),
  bench(`fx x ${spell.fx.list.length} (cached)`, () => { for (const id of spell.fx.list) spell.fx(id, { seed: 1 }) }),
]
const w = Math.max(...results.map((r) => r[0].length))
console.log(`${'benchmark'.padEnd(w)}   best ms   median ms`)
for (const [name, best, median] of results) console.log(`${name.padEnd(w)}  ${best.toFixed(1).padStart(8)}  ${median.toFixed(1).padStart(10)}`)
