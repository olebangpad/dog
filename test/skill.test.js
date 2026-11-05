// The SKILL.md for AI assistants must stay correct: run every JavaScript code
// block in it (except the Phaser one, which needs a browser) against the library.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const lib = pathToFileURL(join(root, 'src', 'index.js')).href
const skill = readFileSync(join(root, 'skills', 'dog', 'SKILL.md'), 'utf8')
const blocks = [...skill.matchAll(/```js\n([\s\S]*?)```/g)].map((m) => m[1])

test('SKILL.md has front matter with a name and description', () => {
  const fm = skill.match(/^---\n([\s\S]*?)\n---/)
  assert.ok(fm, 'front matter')
  assert.match(fm[1], /^name: [a-z0-9-]+$/m)
  assert.match(fm[1], /^description: .{50,}/m)
})

test('every SKILL.md code block runs', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dog-skill-'))
  try {
    let ran = 0
    for (const [i, code] of blocks.entries()) {
      if (code.includes('this.')) continue // Phaser scene code
      const body = code
        .replace(/^import .*$/gm, '')
        .replace(/^\/\/ (preload|create)\(\).*$/gm, '')
      const file = join(dir, `block${i}.mjs`)
      writeFileSync(file, `import { dog, compose, sheet, text, Pixmap, defineSprite, render } from '${lib}'\n${body}\n`)
      await import(pathToFileURL(file).href)
      ran++
    }
    assert.ok(ran >= 4, `ran ${ran} blocks`)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('every sprite id in the catalog exists', async () => {
  const { looks } = await import(lib)
  const catalog = readFileSync(join(root, 'skills', 'dog', 'catalog.md'), 'utf8')
  const ids = [...catalog.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((m) => m[1])
  assert.ok(ids.length > 100)
  for (const id of ids) assert.ok(looks[id], id)
})
