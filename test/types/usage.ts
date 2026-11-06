// Compiled with tsc (noEmit, strict) to check src/index.d.ts against real usage.
import { spell, compose, sheet, text, Pixmap, Sound, MATERIALS, type CharacterSpec, type Frames, type SoundPack, type Pack } from '../../src/index.js'

const knight: CharacterSpec = { body: 'hero', hat: 'knight', hand: 'sword', offhand: 'shield', A: 'red' }
const img: Pixmap = spell('potion', { A: '#ff4fd8' }).scale(8).outline('#fff').hue(30)
const char: Pixmap = spell.char(knight)
const short: Pixmap = spell.char('slime-pink', { hat: 'crown' })
const walk: Frames = spell.walk(knight, 'left')
const fps: number = walk.fps
const attack = spell.action(knight, 'attack', 'fire')
const hit = spell.action('goblin', 'hit', { element: 'ice', amount: '-12' })
const style = spell.action.styleOf({ body: 'hero', hand: 'bow' })
const burning: Frames = spell.status(knight, 'burning', { walk: 'right' })
const pack = spell.pack(knight, { name: 'hero' })
const zipped: Uint8Array = pack.zip()
const fx = spell.fx('comet', { element: 'ice', size: 64 })
const seq = spell.fx.sequence([{ fx: 'charge' }, { fx: 'comet', repeat: 2 }, { fx: 'boom', with: true, at: 3 }])
const fxp = spell.fxPack(['boom', 'fx-rain'])
const random: CharacterSpec = spell.char.random(42)
const combined: Pixmap = compose(spell('hero'), spell('crown').at(0, -7))
const { image, frames } = sheet(spell.frames('coin'), { columns: 4 })
const label: Pixmap = text('SCORE 9', { color: '#ffd06a' })
const dialog: Pixmap = spell('panel').nineSlice(160, 64)
const theme: Sound = spell.music('town', { key: 2, tempo: 1.1, seed: 1 })
const looping: boolean | undefined = spell.music.info('battle')?.loop
const tracks: string[] = spell.music.list
const diag: Frames = spell.walk(knight, 'down-right')
const eight: string[] = [...spell.walk.dirs, ...spell.walk.diagonals]
const pack8: Pack = spell.pack(knight, { diagonals: true })
spell.palette('gameboy')
const activeName: string | null = spell.palette()
spell.palette(null)
const retro: Pixmap = spell.toPalette(spell('slime'), 'pico-8')
const retroFrames: Pixmap[] = spell.toPalette(spell.frames('coin'), ['#000000', '#ffffff'])
const shore = spell.autotile('water', 'grass', { grid: 32 })
const island: Pixmap = shore.draw([[false, true], [true, true]])
const masks: number[][] = spell.autotile('dirt', null).layout([[1, 0]])
const tsx = shore.pack().files['water-grass.tsx']
const imported = spell.fromImage(spell('slime'), { id: 'my-slime', ramps: 2 })
const mySlime = spell.define({ ...imported.def, id: 'my-slime-2' })
const fromPng: Pixmap = spell.readPNG(spell('coin').toPNG(), (b) => b)
console.log(imported.code.length, imported.warnings, mySlime.w, fromPng.w)
const savedWalk: Promise<string> = spell.walk(knight, 'left').scale(4).save('walk.png')
const playing: string = spell.fx('meteor').toDataURL()
const attackSheet: Pixmap = spell.action(knight, 'attack').toSheet({ columns: 4 }).image
const idleFps: number = spell.char.frames(knight).fps
console.log(savedWalk, playing, attackSheet, idleFps, spell.frames('coin').toAPNG().length)
const leftSwing: Frames = spell.action(knight, 'attack').flipX()
const now: Pixmap = leftSwing.atTime(0.2)
const [ox, oy] = leftSwing.origin
const swingSeconds: number = leftSwing.duration
const townMusic = spell.music.play('town', { fade: 1 })
townMusic.stop(0.5)
const musicLevel: number = spell.volume('music', 0.4) + spell.volume(0.8) + spell.volume()
const isMuted: boolean = spell.mute(true)
console.log(now.w, ox, oy, swingSeconds, musicLevel, isMuted, spell.music.playing(), spell.sfx('coin').kind)
const ramp: string = MATERIALS.gold[2]
const n: number = spell.char.count() + spell.list({ category: 'effects' }).length + frames.length + image.w
console.log(img, char, short, fps, attack, hit, style, burning, zipped, fx.loop, seq, fxp.animations, random, combined, label, ramp, n)

const coin: Sound = spell.sfx('coin', { pitch: 1.2, seed: 2 })
const fireSlash = spell.sfx(spell.action.styleOf(knight), { element: 'fire' })
const wav: Uint8Array = coin.toWAV()
const soundFor: string | null = spell.sfx.forEffect('fx-meteor')
const sounds: SoundPack = spell.sfxPack(['coin', 'hit'])
console.log(coin.duration, fireSlash.loop, wav.length, soundFor, sounds.zip().length, spell.sfx.list.length, spell.sfx.elements[0])

const tiny: Pixmap = spell('sword', { grid: 8 })
const big: Frames = spell.walk(knight, 'up', { grid: 64 })
const bigPack: Pack = spell.pack(knight, { grid: 32 })
const regridded: Pixmap[] = spell.toGrid(spell.frames('coin'), 32)
const files = spell.bundle({ grid: 32, sounds: false })
const unlit: Frames = spell.fx('portal', { light: false })
console.log(unlit.length, spell('fx-portal', { light: false }).w)
console.log(tiny.w, big.fps, bigPack.id, regridded.length, files[0].path, spell.grids, spell.fx('boom', { grid: 8 }).length, spell.action(knight, 'cast', { grid: 32 }).length)
// @ts-expect-error: walk direction must be one of the four
spell.walk(knight, 'diagonal')
// @ts-expect-error: unknown action
spell.action(knight, 'dance')
// @ts-expect-error: a character needs a body
const bad: CharacterSpec = { hat: 'crown' }
console.log(bad)
// @ts-expect-error: element must be an effect color name
spell.sfx('hit', { element: 'lava' })
// @ts-expect-error: 24 is not a tile grid PixSpell delivers
spell('sword', { grid: 24 })
