// Sprite registry. To add a sprite, append it to one of the category files
// (or add a new file and list it here). Everything else picks it up.

import * as items from './items.js'
import * as monsters from './monsters.js'
import * as characters from './characters.js'
import * as people from './people.js'
import * as tiles from './tiles.js'
import * as world from './world.js'
import * as icons from './icons.js'
import * as effects from './effects.js'
import * as gear from './gear.js'
import * as gearWorld from './gear-world.js'
import * as fx from './fx.js'

export const groups = [characters, people, gear, gearWorld, items, monsters, tiles, world, icons, effects, fx]
