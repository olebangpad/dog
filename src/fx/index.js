// Every effect recipe, grouped by theme. Add a recipe to one of these files and it shows up
// everywhere: dog('fx-...'), the gallery, assets/, the catalog and game packs.
import { CORE } from './core.js'
import { MOTION } from './motion.js'
import { AMBIENT } from './ambient.js'
import { STATUS } from './status.js'

export const RECIPES = [...CORE, ...MOTION, ...AMBIENT, ...STATUS]
