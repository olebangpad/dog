// Terrain transitions ("autotiles"): 16 corner tiles that blend one terrain into another, so a map can have
// shores, paths and cliffs instead of square edges.
//
//   const shore = spell.autotile('water', 'grass')      // water inside, grass around it
//   shore.tiles[mask]                                    // 16 tiles; mask bits: NW 1, NE 2, SW 4, SE 8 = which corners are water
//   shore.draw(map)                                      // a whole map from a 2D array of cells (true = water)
//   shore.pack().zip()                                   // sheet + Tiled .tsx (corner Wang set) + Godot 4 TileSet .tres + JSON
//
// Each tile's corners say which terrain sits there; the edge between them is a curve through the tile that
// meets the next tile's edge exactly, with a dark line on the outer side and a light rim on the inner side.
// outer: null makes an overlay (transparent outside the inner terrain) to stack layers: water, then sand, then grass.
// draw() uses a dual grid: tiles sit on the corners between map cells, so any shape a map can hold looks right.

import { Pixmap } from './pixmap.js'
import { zip } from './zip.js'

const TAU = Math.PI * 2
const MASKS = Array.from({ length: 16 }, (_, i) => i)
/** Ready-made pairs [inner, outer]: exported to assets/terrain/ and the download zips. */
export const TERRAIN_PRESETS = [['water', 'grass'], ['water', 'dirt-sand'], ['dirt-sand', 'grass'], ['dirt', 'grass'], ['cobblestone', 'grass'],
  ['lava', 'stone'], ['water', 'stone'], ['grass-snow', 'grass'], ['water-swamp', 'grass'], ['grass', 'dirt-mud']]
const bit = (mask, b) => (mask >> b) & 1 // 0 NW, 1 NE, 2 SW, 3 SE

export function createAutotile(spell) {
  function autotile(inner, outer, { grid = 16, edge = 'line', seed = 0, frame = 0 } = {}) {
    const S = grid
    const terrain = (id) => {
      if (id == null) return null
      const img = spell(id, { grid, frame })
      if (img.w !== S || img.h !== S) throw new Error(`pixspell: autotile needs ${S}x${S} tiles; "${id}" is ${img.w}x${img.h}`)
      return img
    }
    const A = terrain(inner), B = terrain(outer)
    // a little wobble so edges look drawn, periodic in the tile so neighbouring tiles still meet
    const ph = seed * 1.7
    const noise = (x, y) => 0.045 * Math.sin(TAU * (x / S) + ph) * Math.cos(TAU * (y / S) + 1.3 * ph)
      + 0.03 * Math.sin(TAU * ((2 * y) / S + x / S) + 0.7 * ph)
    const clamp01 = (t) => Math.min(1, Math.max(0, t))
    const inside = (mask, x, y) => {
      const u = clamp01((x + 0.5) / S), v = clamp01((y + 0.5) / S)
      const f = bit(mask, 0) * (1 - u) * (1 - v) + bit(mask, 1) * u * (1 - v) + bit(mask, 2) * (1 - u) * v + bit(mask, 3) * u * v
      return f + noise(x, y) > 0.5
    }
    const darken = (c) => [c[0] * 0.55, c[1] * 0.55, c[2] * 0.6, c[3]].map(Math.round)
    const lighten = (c) => [c[0] + (255 - c[0]) * 0.35, c[1] + (255 - c[1]) * 0.35, c[2] + (255 - c[2]) * 0.35, c[3]].map(Math.round)
    const LINE = [12, 16, 20, 110] // the outline on an overlay's transparent side

    function make(mask) {
      const img = new Pixmap(S, S)
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        const isIn = inside(mask, x, y)
        const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(mask, x + dx, y + dy) !== isIn)
        let c
        if (isIn) {
          c = A.get(x, y)
          if (near && edge !== 'none') c = lighten(c)
        } else if (B) {
          c = B.get(x, y)
          if (near && edge === 'line') c = darken(c)
        } else c = near && edge === 'line' ? LINE : null
        if (c) img.set(x, y, c)
      }
      return img
    }
    const tiles = MASKS.map(make)
    const sheet = new Pixmap(S * 4, S * 4)
    tiles.forEach((t, m) => sheet._blit(t, (m % 4) * S, Math.floor(m / 4) * S))

    const cellAt = (cells, x, y) => (y >= 0 && y < cells.length && x >= 0 && x < cells[y].length ? Boolean(cells[y][x]) : false)
    /** Dual grid: (h + 1) x (w + 1) tile masks; the tile at [y][x] covers the corner between cells (x - 1, y - 1) and (x, y). */
    function layout(cells) {
      const h = cells.length, w = cells[0]?.length ?? 0
      return Array.from({ length: h + 1 }, (_, y) => Array.from({ length: w + 1 }, (_, x) =>
        cellAt(cells, x - 1, y - 1) * 1 + cellAt(cells, x, y - 1) * 2 + cellAt(cells, x - 1, y) * 4 + cellAt(cells, x, y) * 8))
    }
    /** The whole map as one image, w x h cells of S px (each cell is drawn by the 4 dual-grid tiles around it). */
    function draw(cells) {
      const masks = layout(cells), h = cells.length, w = cells[0]?.length ?? 0
      const img = new Pixmap(w * S, h * S)
      masks.forEach((row, y) => row.forEach((m, x) => img._blit(tiles[m], x * S - S / 2, y * S - S / 2)))
      return img
    }

    const name = `${inner}-${outer ?? 'overlay'}`.replace(/[^a-z0-9-]/g, '')
    function pack({ name: id = name, deflate } = {}) {
      const files = {}
      files[`${id}.png`] = sheet.toPNG({ deflate })
      const wang = MASKS.map((m) => `   <wangtile tileid="${m}" wangid="0,${bit(m, 1) + 1},0,${bit(m, 3) + 1},0,${bit(m, 2) + 1},0,${bit(m, 0) + 1}"/>`)
      files[`${id}.tsx`] = `<?xml version="1.0" encoding="UTF-8"?>
<tileset version="1.10" tiledversion="1.10.2" name="${id}" tilewidth="${S}" tileheight="${S}" tilecount="16" columns="4">
 <image source="${id}.png" width="${S * 4}" height="${S * 4}"/>
 <wangsets>
  <wangset name="${id}" type="corner" tile="15">
   <wangcolor name="${outer ?? 'empty'}" color="#5a8f3a" tile="0" probability="1"/>
   <wangcolor name="${inner}" color="#3a6fd8" tile="15" probability="1"/>
${wang.join('\n')}
  </wangset>
 </wangsets>
</tileset>
`
      const peer = (m) => [['top_left_corner', 0], ['top_right_corner', 1], ['bottom_left_corner', 2], ['bottom_right_corner', 3]]
        .map(([k, b]) => `${m % 4}:${Math.floor(m / 4)}/0/terrains_peering_bit/${k} = ${bit(m, b)}`)
      files[`${id}.tres`] = `[gd_resource type="TileSet" load_steps=3 format=3]

[ext_resource type="Texture2D" path="res://${id}.png" id="1_tex"]

[sub_resource type="TileSetAtlasSource" id="TileSetAtlasSource_1"]
texture = ExtResource("1_tex")
texture_region_size = Vector2i(${S}, ${S})
${MASKS.map((m) => [`${m % 4}:${Math.floor(m / 4)}/0 = 0`, `${m % 4}:${Math.floor(m / 4)}/0/terrain_set = 0`,
  `${m % 4}:${Math.floor(m / 4)}/0/terrain = ${bit(m, 0) + bit(m, 1) + bit(m, 2) + bit(m, 3) >= 2 ? 1 : 0}`, ...peer(m)].join('\n')).join('\n')}

[resource]
tile_size = Vector2i(${S}, ${S})
terrain_set_0/mode = 1
terrain_set_0/terrain_0/name = "${outer ?? 'empty'}"
terrain_set_0/terrain_0/color = Color(0.35, 0.56, 0.23, 1)
terrain_set_0/terrain_1/name = "${inner}"
terrain_set_0/terrain_1/color = Color(0.23, 0.44, 0.85, 1)
sources/0 = SubResource("TileSetAtlasSource_1")
`
      files[`${id}.json`] = JSON.stringify({
        image: `${id}.png`, tileSize: S, columns: 4, inner, outer,
        corners: 'mask bits: NW 1, NE 2, SW 4, SE 8 (1 = inner terrain at that corner); tile index = mask',
        tiles: MASKS.map((m) => ({ index: m, x: (m % 4) * S, y: Math.floor(m / 4) * S, nw: bit(m, 0), ne: bit(m, 1), sw: bit(m, 2), se: bit(m, 3) })),
      }, null, 2)
      files['README.txt'] = `${id}: ${inner} blending into ${outer ?? 'transparency'}, 16 corner tiles (${S}x${S}) from PixSpell, CC0.
https://github.com/olebangpad/pixspell

Tile index = which corners are ${inner}: NW 1 + NE 2 + SW 4 + SE 8 (0 = all ${outer ?? 'empty'}, 15 = all ${inner}).
Tiled:  open ${id}.tsx, use the Terrain (corner Wang set) brush.
Godot 4: TileMapLayer with ${id}.tres as its TileSet, paint with the terrain in Match Corners mode.
Own engine: a dual grid. For a map of cells (true = ${inner}), the tile on the corner between cells
(x-1, y-1) .. (x, y) has mask cell(x-1,y-1)*1 + cell(x,y-1)*2 + cell(x-1,y)*4 + cell(x,y)*8; draw it at
(x*${S} - ${S / 2}, y*${S} - ${S / 2}). In code: spell.autotile('${inner}', ${outer ? `'${outer}'` : 'null'}).draw(cells).
`
      return { id, files, zip: () => zip(files) }
    }

    return { inner, outer, size: S, tiles, sheet, tile: (nw, ne, sw, se) => tiles[nw * 1 + ne * 2 + sw * 4 + se * 8], layout, draw, pack }
  }
  autotile.presets = TERRAIN_PRESETS
  return autotile
}
