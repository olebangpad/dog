// Procedural effects: recipes in ../fx/recipes.js are rendered to text art when PixSpell loads,
// so they behave like every other sprite (recolor, variants, gallery, packs, assets).
import { RECIPES } from '../fx/index.js'
import { effectSprite } from '../fx.js'

export const category = 'effects'

export default RECIPES.map(effectSprite)
