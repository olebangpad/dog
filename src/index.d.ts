// Type definitions for PixSpell. The library is plain JavaScript; these give editors
// autocomplete and let TypeScript projects use it. Checked by compiling a usage sample with tsc.

/** A material name, any CSS hex color ('#ff4fd8'), or an explicit 4-color ramp (dark -> light). */
export type Color = MaterialName | `#${string}` | [string, string, string, string]
export type MaterialName =
  | 'red' | 'orange' | 'gold' | 'lime' | 'green' | 'mint' | 'ice' | 'blue' | 'purple' | 'pink'
  | 'wood' | 'leather' | 'skin' | 'sand' | 'iron' | 'stone' | 'bone' | 'shadow'
export type RGBA = [number, number, number, number]

export interface Ramps { A?: Color; B?: Color; C?: Color }

/** The tile size of your game. PixSpell draws on 16; 8 halves (outline kept), 32 / 64 grow with Scale2x, effects are redrawn. */
export type Grid = 8 | 16 | 32 | 64
export interface GridOptions {
  grid?: Grid
  /** false: grow with plain zoom (fat pixels) instead of Scale2x. */
  smooth?: boolean
}

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
  /** Stretch a framed image (panel, button, slot) to w x h: corners stay, edges and middle repeat. edge: frame width (default 4). */
  nineSlice(w: number, h: number, edge?: number): Pixmap
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

export interface CharacterSpec extends Ramps, GridOptions {
  /** Body id, e.g. 'hero', 'heroine-blonde', 'goblin', 'slime-pink'. See spell.char.parts.body. */
  body: string
  /** 'crown' or 'hat-crown' (variants: 'crown-silver'). */
  hat?: string
  /** 'sword' or 'held-sword'. Humanoid bodies only. */
  hand?: string
  /** 'shield', 'book', 'lantern', ... Humanoid bodies only. */
  offhand?: string
  frame?: number
}

export type WalkDir = 'down' | 'up' | 'left' | 'right' | 'down-right' | 'down-left' | 'up-right' | 'up-left'
export type ActionName = 'attack' | 'hit' | 'heal' | 'levelup' | 'cast' | 'death'
export type AttackStyle = 'slash' | 'stab' | 'thrust' | 'whip' | 'smash' | 'burn' | 'bonk' | 'punch' | 'shoot' | 'magic'
export type ElementName = 'fire' | 'ice' | 'poison' | 'holy' | 'dark'
export type FxColorName = ElementName | 'water' | 'nature' | 'blood' | 'arcane' | 'steel'

export interface ActionOptions extends GridOptions {
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

export interface FxOptions extends Ramps, GridOptions {
  /** Effects glow (translucent light in ramp A's brightest shade, under the sprite). false turns it off. */
  light?: boolean
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

export interface Autotile {
  inner: string
  outer: string | null
  size: number
  /** 16 tiles; index = which corners are the inner terrain: NW 1 + NE 2 + SW 4 + SE 8. */
  tiles: Pixmap[]
  /** The 16 tiles in a 4x4 sheet (index = row * 4 + column). */
  sheet: Pixmap
  tile(nw: 0 | 1, ne: 0 | 1, sw: 0 | 1, se: 0 | 1): Pixmap
  /** Dual-grid tile indices for a map of cells (true = inner): (h + 1) x (w + 1). */
  layout(cells: ArrayLike<ArrayLike<unknown>>): number[][]
  /** The whole map as one image (w x h cells). */
  draw(cells: ArrayLike<ArrayLike<unknown>>): Pixmap
  /** Sheet PNG + Tiled .tsx (corner Wang set) + Godot 4 TileSet .tres + JSON + README. */
  pack(opts?: { name?: string; deflate?: (b: Uint8Array) => Uint8Array }): { id: string; files: Record<string, Uint8Array | string>; zip(): Uint8Array }
}

export interface MusicOptions {
  /** 0 (default) is the track as written; other seeds write a different melody in the same style. */
  seed?: number
  /** Transpose by semitones, e.g. 2 or -3. */
  key?: number
  /** Speed multiplier: 1.1 = 10% faster. */
  tempo?: number
  volume?: number
}

export interface MusicInfo {
  tempo: number
  key: string | null
  scale: string | null
  bars: number | null
  loop: boolean
  tags: string[]
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

/** A rendered sound: mono samples in -1..1. Treat it as read-only (spell.sfx caches it). */
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

export interface PixSpell {
  /** Render any sprite or variant: spell('potion'), spell('potion-mana'), spell('potion', { A: '#ff4fd8' }). */
  (id: string, opts?: Ramps & GridOptions & { frame?: number; outline?: string; white?: string; light?: boolean }): Pixmap
  frames(id: string, opts?: Ramps & GridOptions): Frames
  /** The tile sizes PixSpell delivers: [8, 16, 32, 64]. */
  grids: Grid[]
  /** Convert any PixSpell image (or frame list) drawn on the 16 px grid to another grid. */
  toGrid<T extends Pixmap | Pixmap[]>(img: T, grid: Grid, opts?: { smooth?: boolean }): T
  /** Everything at one tile size, as files to render one by one (see scripts/pixspell.js export). */
  bundle(opts?: { grid?: Grid; sprites?: boolean; characters?: boolean; effects?: boolean; effectColors?: boolean; sounds?: boolean }): { path: string; make(): Pixmap | Uint8Array | string }[]
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
  /** dirs: the 4 straight directions; diagonals: the other 4 (a 3/4 view of humanoids). spell.walk takes all 8. */
  walk: PixSpell['char']['walk'] & { dirs: WalkDir[]; diagonals: WalkDir[] }
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
  status(spec: string | CharacterSpec, effect: string, opts?: GridOptions & { walk?: WalkDir; element?: FxColorName | Color; size?: number }): Frames
  /** Game pack: sheet + Aseprite/Phaser JSON + Godot .tres + README. */
  pack(spec: string | CharacterSpec, opts?: GridOptions & { name?: string; element?: ElementName | Color; actions?: ActionName[]; diagonals?: boolean; deflate?: (b: Uint8Array) => Uint8Array }): Pack
  /** Every effect (or the ids given) as one pack. */
  fxPack(ids?: string[], opts?: { name?: string; grid?: Grid; deflate?: (b: Uint8Array) => Uint8Array }): Pack
  /** Sound effects made by code: spell.sfx('coin').play(), spell.sfx('slash', { element: 'fire' }). */
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
  /** Terrain transitions: spell.autotile('water', 'grass').draw(cells). outer null = an overlay on transparency. */
  autotile(inner: string, outer: string | null, opts?: GridOptions & { edge?: 'line' | 'soft' | 'none'; seed?: number; frame?: number }): Autotile
  /** Chiptune music made by code: seamless loops (spell.music('town').play()) and jingles ('victory'). */
  music: {
    (name: string, opts?: MusicOptions): Sound
    /** Every track: title, town, field, forest, dungeon, cave, battle, boss, shop, night, castle, desert, snow, ocean, and jingles. */
    list: string[]
    tags(name: string): string[]
    info(name: string): MusicInfo | null
  }
  /** Sounds (all, or the names given) as WAV files in one zip. */
  sfxPack(names?: string[], opts?: SfxOptions & { name?: string }): SoundPack
  fx: {
    /** Procedural effect: spell.fx('comet', { element: 'ice', size: 64 }). */
    (name: string, opts?: FxOptions): Frames
    list: string[]
    colors: Record<FxColorName, MaterialName>
    sequence(steps: SequenceStep[], opts?: { size?: number; fps?: number }): Frames
  }
}

/** The whole library: spell('sword'), spell.char(), spell.fx(), spell.sfx(), ... */
export const spell: PixSpell
/** @deprecated The old name of spell. */
export const dog: PixSpell
/** @deprecated The old name of PixSpell. */
export type Dog = PixSpell
export default spell

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
