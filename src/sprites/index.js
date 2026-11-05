// Sprite registry. To add a sprite, append it to one of the category files
// (or add a new file and list it here). Everything else picks it up.

import * as items from './items.js'
import * as monsters from './monsters.js'
import * as characters from './characters.js'
import * as tiles from './tiles.js'
import * as icons from './icons.js'
import * as effects from './effects.js'
import * as gear from './gear.js'

export const groups = [characters, gear, items, monsters, tiles, icons, effects]
