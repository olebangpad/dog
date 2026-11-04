// Named 4-shade ramps (dark -> light). Every sprite paints with up to three
// ramp slots (A, B, C); swapping a slot's material recolors the sprite.
// Hand-tuned with hue shifting: shadows lean blue/purple, lights lean yellow.

export const OUTLINE = '#1b1225'
export const WHITE = '#ffffff'

export const MATERIALS = {
  red:    ['#4a1430', '#9c2a3a', '#e0453a', '#ff9a6a'],
  orange: ['#5a2418', '#b0481c', '#f08a24', '#ffd06a'],
  gold:   ['#5a3412', '#a8681a', '#e8b02a', '#fff08a'],
  lime:   ['#1e4a2a', '#4a8a22', '#9ad02a', '#eaff8a'],
  green:  ['#12302a', '#22693a', '#4caa3c', '#a8e05a'],
  mint:   ['#0e3a4a', '#14806e', '#2ec8a0', '#a0f8d0'],
  ice:    ['#1a3a5a', '#2a78a8', '#5ac8e8', '#c8f8ff'],
  blue:   ['#1a1a4a', '#2a3c9c', '#3c7ae0', '#8ad0ff'],
  purple: ['#2a1440', '#5c2a8a', '#9a4ad0', '#e09aff'],
  pink:   ['#4a1440', '#9a2a6a', '#e05a9a', '#ffaad0'],
  wood:   ['#2e1a14', '#5e3420', '#9a5c30', '#d09a5a'],
  leather:['#2a1418', '#5a2a24', '#8a4a34', '#c07a52'],
  skin:   ['#5a2e24', '#a65a40', '#e0966a', '#ffd0a6'],
  sand:   ['#5a4224', '#a07a44', '#dcb872', '#fff0b8'],
  iron:   ['#2a2a3e', '#5a6078', '#9aa4b8', '#e6eef6'],
  stone:  ['#2a2630', '#4e4854', '#7e7682', '#b4acb0'],
  bone:   ['#5a5470', '#9a96b0', '#d6d4e4', '#ffffff'],
  shadow: ['#120e1a', '#2a2236', '#463a56', '#6e5e80'],
}

export const MATERIAL_NAMES = Object.keys(MATERIALS)
