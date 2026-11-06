// Compiled with tsc (noEmit, strict) to check src/index.d.ts against real usage.
import { dog, compose, sheet, text, Pixmap, Sound, MATERIALS, type CharacterSpec, type Frames, type SoundPack, type Pack } from '../../src/index.js'

const knight: CharacterSpec = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield', A: 'red' }
const img: Pixmap = dog('potion', { A: '#ff4fd8' }).scale(8).outline('#fff').hue(30)
const char: Pixmap = dog.char(knight)
const short: Pixmap = dog.char('slime-pink', { hat: 'crown' })
const walk: Frames = dog.walk(knight, 'left')
const fps: number = walk.fps
const attack = dog.action(knight, 'attack', 'fire')
const hit = dog.action('goblin', 'hit', { element: 'ice', amount: '-12' })
const style = dog.action.styleOf({ body: 'hero', hand: 'bow' })
const burning: Frames = dog.status(knight, 'burning', { walk: 'right' })
const pack = dog.pack(knight, { name: 'hero' })
const zipped: Uint8Array = pack.zip()
const fx = dog.fx('comet', { element: 'ice', size: 64 })
const seq = dog.fx.sequence([{ fx: 'charge' }, { fx: 'comet', repeat: 2 }, { fx: 'boom', with: true, at: 3 }])
const fxp = dog.fxPack(['boom', 'fx-rain'])
const random: CharacterSpec = dog.char.random(42)
const combined: Pixmap = compose(dog('hero'), dog('crown').at(0, -7))
const { image, frames } = sheet(dog.frames('coin'), { columns: 4 })
const label: Pixmap = text('SCORE 9', { color: '#ffd06a' })
const ramp: string = MATERIALS.gold[2]
const n: number = dog.char.count() + dog.list({ category: 'effects' }).length + frames.length + image.w
console.log(img, char, short, fps, attack, hit, style, burning, zipped, fx.loop, seq, fxp.animations, random, combined, label, ramp, n)

const coin: Sound = dog.sfx('coin', { pitch: 1.2, seed: 2 })
const fireSlash = dog.sfx(dog.action.styleOf(knight), { element: 'fire' })
const wav: Uint8Array = coin.toWAV()
const soundFor: string | null = dog.sfx.forEffect('fx-meteor')
const sounds: SoundPack = dog.sfxPack(['coin', 'hit'])
console.log(coin.duration, fireSlash.loop, wav.length, soundFor, sounds.zip().length, dog.sfx.list.length, dog.sfx.elements[0])

const tiny: Pixmap = dog('sword', { grid: 8 })
const big: Frames = dog.walk(knight, 'up', { grid: 64 })
const bigPack: Pack = dog.pack(knight, { grid: 32 })
const regridded: Pixmap[] = dog.toGrid(dog.frames('coin'), 32)
const files = dog.bundle({ grid: 32, sounds: false })
console.log(tiny.w, big.fps, bigPack.id, regridded.length, files[0].path, dog.grids, dog.fx('boom', { grid: 8 }).length, dog.action(knight, 'cast', { grid: 32 }).length)
// @ts-expect-error: walk direction must be one of the four
dog.walk(knight, 'diagonal')
// @ts-expect-error: unknown action
dog.action(knight, 'dance')
// @ts-expect-error: a character needs a body
const bad: CharacterSpec = { hat: 'crown' }
console.log(bad)
// @ts-expect-error: element must be an effect color name
dog.sfx('hit', { element: 'lava' })
// @ts-expect-error: 24 is not a tile grid DOG delivers
dog('sword', { grid: 24 })
