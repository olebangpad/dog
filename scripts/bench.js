#!/usr/bin/env node
// Micro-benchmarks for the hot paths. Run: node scripts/bench.js
// Numbers are milliseconds (lower is better); compare before/after a change on the same machine.

const t0 = performance.now()
const { dog, looks } = await import('../src/index.js')
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
const specs = Array.from({ length: 100 }, (_, i) => dog.char.random(i))
let seed = 1000
const results = [
  ['import (first load)', importMs, importMs],
  bench('dog(id) x every look', () => { for (const id of ids) dog(id) }),
  bench('dog(id) x every look, again', () => { for (const id of ids) dog(id) }),
  bench('dog.char x 100 random', () => { for (const s of specs) dog.char(s) }),
  bench('dog.walk x 100 random', () => { for (const s of specs) dog.walk(s, 'left') }),
  bench('dog.action x 20 attack', () => { for (const s of specs.slice(0, 20)) dog.action(s, 'attack') }),
  bench('scale(8) + outline x 200', () => { for (const id of ids.slice(0, 200)) dog(id).scale(8).outline('#fff') }),
  // a new seed every run, so this measures generation and not the dog.fx cache
  bench(`fx generate x ${dog.fx.list.length} (uncached)`, () => { seed++; for (const id of dog.fx.list) dog.fx(id, { seed }) }),
  bench(`fx x ${dog.fx.list.length} (cached)`, () => { for (const id of dog.fx.list) dog.fx(id, { seed: 1 }) }),
]
const w = Math.max(...results.map((r) => r[0].length))
console.log(`${'benchmark'.padEnd(w)}   best ms   median ms`)
for (const [name, best, median] of results) console.log(`${name.padEnd(w)}  ${best.toFixed(1).padStart(8)}  ${median.toFixed(1).padStart(10)}`)
