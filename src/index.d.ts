// Type definitions for DOG (Dots Of Games). The library is plain JavaScript; these give editors
// autocomplete and let TypeScript projects use it. Checked by compiling a usage sample with tsc.

/** A material name, any CSS hex color ('#ff4fd8'), or an explicit 4-color ramp (dark -> light). */
export type Color = MaterialName | `#${string}` | [string, string, string, string]
export type MaterialName =
  | 'red' | 'orange' | 'gold' | 'lime' | 'green' | 'mint' | 'ice' | 'blue' | 'purple' | 'pink'
  | 'wood' | 'leather' | 'skin' | 'sand' | 'iron' | 'stone' | 'bone' | 'shadow'
export type RGBA = [number, number, number, number]

export interface Ramps { A?: Color; B?: Color; C?: Color }

/** An immutable RGBA image. Every method returns a new Pixmap, so calls chain. */
export class Pixmap {
  constructor(w: number, h: number, data?: Uint8ClampedArray)
  static create(w: number, h: number, fill?: string | RGBA): Pixmap
  static fromImageData(data: { width: number; height: number; data: ArrayLike<number> }): Pixmap
  readonly w: number
  readonly h: number
  readonly width: number
  readonly height: number
  data: Uint8ClampedArray
  /** Placement offset used by compose(). */
  x: number
  y: number
  clone(): Pixmap
  /** The same image placed at (x, y) when passed to compose(). */
  at(x: number, y: number): Pixmap
  get(x: number, y: number): RGBA
  /** Mutating setter; prefer the chainable methods. */
  set(x: number, y: number, c: RGBA): this
  alpha(x: number, y: number): number
  // size
  /** 4 = four times bigger (crisp); 0.5 = half size (majority vote keeps outlines). */
  scale(n: number): Pixmap
  resize(w: number, h?: number): Pixmap
  downscale(k: number): Pixmap
  /** Scale2x / EPX: double size, rounded stair-steps. */
  smooth(times?: number): Pixmap
  pad(top?: number, right?: number, bottom?: number, left?: number): Pixmap
  crop(x: number, y: number, w: number, h: number): Pixmap
  trim(): Pixmap
  // transform
  flipX(): Pixmap
  flipY(): Pixmap
  /** Clockwise, multiples of 90 degrees. */
  rotate(deg?: 90 | 180 | 270 | 0 | number): Pixmap
  // effects
  outline(color?: string, opts?: { corners?: boolean }): Pixmap
  shadow(color?: string, dx?: number, dy?: number): Pixmap
  silhouette(color?: string): Pixmap
  map(fn: (rgba: RGBA, x: number, y: number) => RGBA): Pixmap
  // color
  adjust(opts?: { hue?: number; saturation?: number; lightness?: number }): Pixmap
  hue(deg: number): Pixmap
  saturate(factor: number): Pixmap
  lighten(amount: number): Pixmap
  grayscale(): Pixmap
  invert(): Pixmap
  opacity(alpha: number): Pixmap
  tint(color: string, amount?: number): Pixmap
  swap(from: string, to: string): Pixmap
  swap(table: Record<string, string>): Pixmap
  quantize(palette: string[]): Pixmap
  colors(): string[]
  /** Alpha-blend another image on top at (x, y) (defaults to its .at() offset). */
  draw(img: Pixmap, x?: number, y?: number): Pixmap
  // output
  toPNG(opts?: { deflate?: (bytes: Uint8Array) => Uint8Array }): Uint8Array
  toDataURL(): string
  /** Browser only. */
  toCanvas(canvas?: HTMLCanvasElement): HTMLCanvasElement
  /** Node only: write a compressed PNG. */
  save(path: string): Promise<string>
}

/** A list of frames with the speed they were made for. */
export type Frames = Pixmap[] & { fps: number; loop?: boolean }

export interface CharacterSpec extends Ramps {
  /** Body id, e.g. 'hero', 'heroine-blonde', 'goblin', 'slime-pink'. See dog.char.parts.body. */
  body: string
  /** 'crown' or 'hat-crown' (variants: 'crown-silver'). */
  hat?: string
  /** 'sword' or 'held-sword'. Humanoid bodies only. */
  hand?: string
  /** 'shield', 'book', 'lantern', ... Humanoid bodies only. */
  offhand?: string
  frame?: number
}

export type WalkDir = 'down' | 'up' | 'left' | 'right'
export type ActionName = 'attack' | 'hit' | 'heal' | 'levelup' | 'cast' | 'death'
export type AttackStyle = 'slash' | 'stab' | 'thrust' | 'whip' | 'smash' | 'burn' | 'bonk' | 'punch' | 'shoot' | 'magic'
export type ElementName = 'fire' | 'ice' | 'poison' | 'holy' | 'dark'
export type FxColorName = ElementName | 'water' | 'nature' | 'blood' | 'arcane' | 'steel'

export interface ActionOptions {
  element?: ElementName | Color
  /** Damage / heal number, e.g. '-12'. */
  amount?: string
  /** Level-up text. */
  text?: string
  /** false hides numbers and text. */
  label?: boolean
  /** Attack only: override the style the held item would pick. */
  style?: AttackStyle
}

export interface Pack {
  id: string
  image: Pixmap
  /** Aseprite / TexturePacker JSON array with meta.frameTags. */
  json: { frames: object[]; meta: { frameTags: { name: string; from: number; to: number; direction: string }[]; [k: string]: unknown } }
  /** Godot 4 SpriteFrames resource. */
  tres: string
  files: Record<string, Uint8Array | string>
  animations: string[]
  zip(): Uint8Array
}

export interface SpriteDef {
  id: string
  name: string
  category: string
  tags: string[]
  w: number
  h: number
  fps: number
  ramps: Required<Ramps>
  variants: Record<string, Ramps>
  frames: string[][]
  sequence: number[]
  cover: number
  animated: boolean
  slots: ('A' | 'B' | 'C')[]
  anchors: Partial<Record<'head' | 'hand' | 'offhand', [number, number, ('back' | 'front')?][]>>
  equip: 'head' | 'hand' | 'offhand' | null
  pivot: [number, number] | null
}

export interface Look { id: string; def: SpriteDef; variant: string | null; ramps: Required<Ramps> }

export interface FxOptions extends Ramps {
  /** Pixel size of the square frame (default 32). */
  size?: number
  seed?: number
  frames?: number
  element?: FxColorName | Color
}

export interface SequenceStep {
  fx: string
  element?: FxColorName | Color
  seed?: number
  size?: number
  x?: number
  y?: number
  /** Loop the effect this many times. */
  repeat?: number
  /** Frame offset from where this step would start. */
  at?: number
  /** Start together with the previous step instead of after it. */
  with?: boolean
}

export interface SfxOptions {
  /** 0 (default) is the canonical sound; other seeds vary pitch and timing a little. */
  seed?: number
  /** Pitch multiplier: 2 = an octave up. */
  pitch?: number
  volume?: number
  /** Adds the element's flavor layer (crackle, chime, bubbles, bell, rumble...). */
  element?: FxColorName
}

/** A rendered sound: mono samples in -1..1. Treat it as read-only (dog.sfx caches it). */
export class Sound {
  constructor(samples: Float32Array, opts?: { sampleRate?: number; id?: string; loop?: boolean })
  readonly samples: Float32Array
  readonly sampleRate: number
  readonly id: string
  /** Seamless loop (rain, wind, campfire). */
  readonly loop: boolean
  /** Seconds. */
  readonly duration: number
  /** 16-bit PCM mono WAV bytes. */
  toWAV(): Uint8Array
  toDataURL(): string
  /** Browser: an AudioBuffer for your own Web Audio graph. */
  toAudioBuffer(context?: BaseAudioContext): AudioBuffer
  /** Browser: play now. Call it from a click/key handler the first time (autoplay rules). */
  play(opts?: { volume?: number; loop?: boolean; rate?: number }): { stop(): void; source: AudioBufferSourceNode }
  /** Node only: write a .wav file. */
  save(path: string): Promise<string>
}

export interface SoundPack {
  id: string
  files: Record<string, Uint8Array | string>
  sounds: string[]
  zip(): Uint8Array
}

export interface Dog {
  /** Render any sprite or variant: dog('potion'), dog('potion-mana'), dog('potion', { A: '#ff4fd8' }). */
  (id: string, opts?: Ramps & { frame?: number; outline?: string; white?: string }): Pixmap
  frames(id: string, opts?: Ramps): Frames
  list(filter?: { category?: string; tag?: string; variants?: boolean }): string[]
  info(id: string): Look

  char: {
    /** A 24x24 character with gear snapped on by name. */
    (body: string, opts?: Omit<CharacterSpec, 'body'>): Pixmap
    (spec: CharacterSpec): Pixmap
    frames(body: string | CharacterSpec, opts?: Omit<CharacterSpec, 'body'>): Pixmap[]
    /** Reproducible random spec. */
    random(seed?: number | string, opts?: { outfit?: number }): CharacterSpec
    walk(body: string | CharacterSpec, dir?: WalkDir, opts?: Omit<CharacterSpec, 'body'>): Frames
    parts: { body: string[]; head: string[]; hand: string[]; offhand: string[] }
    count(): number
    size: number
  }
  /** Walk cycle: 24x24 frames with .fps. 'left' mirrors 'right'. */
  walk: Dog['char']['walk'] & { dirs: WalkDir[] }
  /** 8 frames of 32x32 (feet at 16,31) with .fps. */
  action: {
    (spec: string | CharacterSpec, name: ActionName, opts?: ElementName | Color | ActionOptions): Frames
    list: ActionName[]
    elements: ElementName[]
    styles: AttackStyle[]
    styleOf(spec: string | CharacterSpec): AttackStyle
    fps(name: ActionName): number
    size: number
  }
  /** Character + status effect, 32x32 frames, idle or walking. */
  status(spec: string | CharacterSpec, effect: string, opts?: { walk?: WalkDir; element?: FxColorName | Color; size?: number }): Frames
  /** Game pack: sheet + Aseprite/Phaser JSON + Godot .tres + README. */
  pack(spec: string | CharacterSpec, opts?: { name?: string; element?: ElementName | Color; actions?: ActionName[]; deflate?: (b: Uint8Array) => Uint8Array }): Pack
  /** Every effect (or the ids given) as one pack. */
  fxPack(ids?: string[], opts?: { name?: string; deflate?: (b: Uint8Array) => Uint8Array }): Pack
  /** Sound effects made by code: dog.sfx('coin').play(), dog.sfx('slash', { element: 'fire' }). */
  sfx: {
    (name: string, opts?: SfxOptions): Sound
    /** Every sound name. Attack styles and actions have sounds of the same name. */
    list: string[]
    elements: FxColorName[]
    tags(name: string): string[]
    sampleRate: number
    /** The sound for an effect ('fx-meteor' -> 'meteor'), or null for silent ambience. */
    forEffect(effect: string): string | null
  }
  /** Sounds (all, or the names given) as WAV files in one zip. */
  sfxPack(names?: string[], opts?: SfxOptions & { name?: string }): SoundPack
  fx: {
    /** Procedural effect: dog.fx('comet', { element: 'ice', size: 64 }). */
    (name: string, opts?: FxOptions): Frames
    list: string[]
    colors: Record<FxColorName, MaterialName>
    sequence(steps: SequenceStep[], opts?: { size?: number; fps?: number }): Frames
  }
}

export const dog: Dog
export default dog

export const sprites: Record<string, SpriteDef>
export const looks: Record<string, Look>

/** Stack layers (later on top); offsets from .at(x, y); the canvas grows to fit. */
export function compose(...layers: (Pixmap | Pixmap[] | null | false | undefined)[]): Pixmap
export function sheet(images: Pixmap[], opts?: { columns?: number; gap?: number; padding?: number; background?: string }): { image: Pixmap; frames: { x: number; y: number; w: number; h: number }[] }
/** 3x5 pixel font. */
export function text(str: string, opts?: { color?: string; spacing?: number; lineHeight?: number }): Pixmap
export function defineSprite(def: { id: string; art?: string; frames?: (string | string[])[]; ramps?: Ramps; [k: string]: unknown }): SpriteDef
export function render(def: SpriteDef, opts?: Ramps & { frame?: number; outline?: string; white?: string }): Pixmap
export function renderFrames(def: SpriteDef, opts?: Ramps): Pixmap[]
export function resolveRamp(value: Color): [string, string, string, string]
export function rampFrom(color: string): [string, string, string, string]
export function parseColor(c: string | RGBA): RGBA
export function toHex(rgba: RGBA): string
export function encodePNG(img: Pixmap, opts?: { deflate?: (b: Uint8Array) => Uint8Array }): Uint8Array
export function encodeAPNG(frames: Pixmap[], opts?: { fps?: number; loops?: number; deflate?: (b: Uint8Array) => Uint8Array }): Uint8Array
export function zip(files: Record<string, Uint8Array | string>): Uint8Array

export const MATERIALS: Record<MaterialName, [string, string, string, string]>
export const MATERIAL_NAMES: MaterialName[]
export const OUTLINE: string
export const LEGEND: Record<string, ['A' | 'B' | 'C', 0 | 1 | 2 | 3]>
export const SLOTS: ['A', 'B', 'C']
export const ELEMENTS: Record<ElementName, MaterialName>
export const FX_COLORS: Record<FxColorName, MaterialName>
export const RECIPES: { id: string; [k: string]: unknown }[]
export const FONT_CHARS: string
export const CHAR_SIZE: 24
export const ACTION_SIZE: 32
export const ACTION_FRAMES: 8
export const PACK_CELL: 32
export const SAMPLE_RATE: number
/** 'A4' -> 440. */
export function note(n: string | number): number
export function renderSound(recipe: { id: string; layers: object[]; level?: number; loop?: number }, opts?: { seed?: number; pitch?: number; sampleRate?: number }): Float32Array
export const SOUNDS: { id: string; tags: string[]; [k: string]: unknown }[]
