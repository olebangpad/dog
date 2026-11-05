// Visual regression: everything must look exactly like it did when snapshots were last updated.
// After an intended change run `npm run snapshots` and commit test/snapshots.json.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeSnapshots } from '../scripts/snapshots.js'

test('renders match the snapshots', async () => {
  const want = JSON.parse(readFileSync(new URL('./snapshots.json', import.meta.url), 'utf8'))
  const got = await computeSnapshots()
  const changed = Object.keys(want).filter((k) => got[k] !== want[k])
  const added = Object.keys(got).filter((k) => !(k in want))
  assert.ok(
    changed.length === 0 && added.length === 0,
    `${changed.length} changed, ${added.length} new - if intended, run: npm run snapshots\n` +
      [...changed.slice(0, 15).map((k) => `  changed ${k}`), ...added.slice(0, 15).map((k) => `  new ${k}`)].join('\n'),
  )
})
