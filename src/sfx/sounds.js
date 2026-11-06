// Sound recipes. Names line up with the rest of PixSpell on purpose:
//   - every attack style:  spell.sfx(spell.action.styleOf(hero))   slash stab thrust whip smash burn bonk punch shoot magic
//   - every action:        hit heal levelup cast death (+ hurt for the player)
//   - effects:             boom meteor quake firework poof laser zap shockwave crit miss block parry teleport ...
// Times are seconds, pitches Hz or note names. See src/sfx.js for every layer field.

const whoosh = (from, to, len, volume = 0.6, extra = {}) => ({ wave: 'noise', freq: 22050, lowpass: from, lowpassTo: to, attack: len * 0.35, decay: len * 0.65, volume, ...extra })
const thud = (from, to, decay, volume = 0.8, extra = {}) => ({ wave: 'sine', freq: from, to, attack: 0.002, decay, curve: 1.3, volume, ...extra })

export const SOUNDS = [
  // ---------------------------------------------------------------- ui
  { id: 'click', tags: ['ui'], level: 0.64, layers: [{ wave: 'square', freq: 1400, to: 900, attack: 0.001, decay: 0.03, volume: 0.5 }] },
  { id: 'select', tags: ['ui'], level: 0.71, layers: [{ wave: 'pulse', duty: 0.25, notes: ['A5', 'E6'], every: 0.04, hold: 0.04, decay: 0.06 }] },
  { id: 'confirm', tags: ['ui'], level: 0.79, layers: [{ wave: 'square', notes: ['E5', 'B5'], every: 0.07, hold: 0.08, decay: 0.14 }, { wave: 'triangle', notes: ['E4', 'B4'], every: 0.07, hold: 0.08, decay: 0.14, volume: 0.4 }] },
  { id: 'cancel', tags: ['ui'], level: 0.71, layers: [{ wave: 'square', notes: ['B4', 'E4'], every: 0.07, hold: 0.08, decay: 0.12 }] },
  { id: 'error', tags: ['ui'], level: 0.71, layers: [{ wave: 'square', freq: 196, hold: 0.06, decay: 0.05, repeat: { count: 2, every: 0.12 } }, { wave: 'saw', freq: 185, hold: 0.06, decay: 0.05, volume: 0.3, repeat: { count: 2, every: 0.12 } }] },
  { id: 'text', tags: ['ui'], level: 0.5, layers: [{ wave: 'square', duty: 0.4, freq: 660, attack: 0.001, hold: 0.012, decay: 0.02 }] },
  { id: 'menu', tags: ['ui'], level: 0.71, layers: [{ wave: 'triangle', freq: 330, to: 990, attack: 0.005, hold: 0.04, decay: 0.08 }, whoosh(800, 3000, 0.12, 0.2)] },

  // ----------------------------------------------------------- movement
  { id: 'jump', tags: ['move'], level: 0.86, layers: [{ wave: 'pulse', duty: 0.25, dutyTo: 0.5, freq: 240, to: 640, attack: 0.002, hold: 0.04, decay: 0.12 }] },
  { id: 'land', tags: ['move'], level: 0.79, layers: [thud(130, 55, 0.09, 0.8), whoosh(1400, 500, 0.07, 0.5)] },
  { id: 'step', tags: ['move'], level: 0.5, layers: [{ wave: 'noise', freq: 9000, lowpass: 1800, attack: 0.001, decay: 0.035, volume: 0.6 }, thud(110, 70, 0.03, 0.4)] },
  { id: 'dash', tags: ['move'], level: 0.86, layers: [whoosh(600, 6000, 0.2, 0.7), { wave: 'square', freq: 180, to: 360, attack: 0.01, decay: 0.12, volume: 0.15, lowpass: 900 }] },
  { id: 'splash', tags: ['move', 'water'], level: 0.93, layers: [whoosh(6000, 700, 0.35, 0.7, { attack: 0.01, decay: 0.34 }), { wave: 'sine', freq: 500, to: 1100, attack: 0.002, decay: 0.05, volume: 0.35, delay: 0.04, repeat: { count: 4, every: 0.06, pitch: 0.85, jitter: 0.3, fade: 0.2 } }] },

  // ------------------------------------------------------------ pickups
  { id: 'coin', tags: ['pickup', 'reward'], level: 0.86, layers: [{ wave: 'square', notes: ['B5', 'E6'], every: 0.055, hold: 0.06, decay: 0.3, curve: 1.2 }] },
  { id: 'gem', tags: ['pickup', 'reward'], level: 0.86, layers: [{ wave: 'triangle', notes: ['E6', 'G6', 'B6', 'E7'], every: 0.045, hold: 0.14, decay: 0.3 }, { wave: 'sine', freq: 'E7', vibrato: [12, 0.01], delay: 0.14, attack: 0.01, decay: 0.35, volume: 0.25 }] },
  { id: 'key', tags: ['pickup', 'reward'], level: 0.79, layers: [{ wave: 'pulse', duty: 0.3, notes: ['A5', 'C#6', 'E6', 'A6'], every: 0.06, hold: 0.2, decay: 0.2 }] },
  { id: 'pickup', tags: ['pickup'], level: 0.79, layers: [{ wave: 'square', freq: 520, to: 1040, attack: 0.002, hold: 0.04, decay: 0.1 }] },
  { id: 'powerup', tags: ['pickup', 'buff'], level: 0.86, layers: [{ wave: 'square', duty: 0.35, freq: 220, to: 880, steps: [1, 1.26, 1.5, 2], every: 0.035, vibrato: [8, 0.02], attack: 0.01, hold: 0.45, decay: 0.15, slideTime: 0.6 }] },
  { id: 'chest', tags: ['pickup', 'reward'], level: 0.86, layers: [{ wave: 'saw', freq: 140, to: 190, lowpass: 700, attack: 0.02, hold: 0.12, decay: 0.05, volume: 0.5 }, thud(160, 80, 0.08, 0.6, { delay: 0.18 }), { wave: 'square', notes: ['C6', 'E6', 'G6', 'C7'], every: 0.05, delay: 0.24, hold: 0.2, decay: 0.25, volume: 0.35 }] },

  // ------------------------------------------------- attack styles (spell.action)
  { id: 'slash', tags: ['attack', 'combat'], level: 1, layers: [whoosh(900, 7000, 0.16, 0.7), { wave: 'pulse', duty: 0.12, freq: 2600, to: 1900, attack: 0.002, decay: 0.09, volume: 0.12, delay: 0.05 }] },
  { id: 'stab', tags: ['attack', 'combat'], level: 1, layers: [whoosh(3000, 6000, 0.06, 0.6, { attack: 0.01 }), { wave: 'triangle', freq: 900, to: 300, attack: 0.001, decay: 0.06, volume: 0.4, delay: 0.04 }] },
  { id: 'thrust', tags: ['attack', 'combat'], level: 1, layers: [whoosh(500, 3500, 0.2, 0.7), { wave: 'square', freq: 260, to: 130, lowpass: 1200, attack: 0.03, decay: 0.12, volume: 0.25 }] },
  { id: 'whip', tags: ['attack', 'combat'], level: 1.07, layers: [whoosh(1500, 9000, 0.1, 0.4), { wave: 'noise', freq: 22050, highpass: 2500, attack: 0.001, decay: 0.035, volume: 0.9, delay: 0.09 }, { wave: 'square', freq: 1800, to: 900, attack: 0.001, decay: 0.03, volume: 0.25, delay: 0.09 }] },
  { id: 'smash', tags: ['attack', 'combat'], level: 1.29, layers: [thud(150, 38, 0.35, 1), whoosh(1200, 250, 0.3, 0.7, { attack: 0.002, decay: 0.3 }), { wave: 'noise', freq: 5000, lowpass: 3500, attack: 0.001, decay: 0.07, volume: 0.5, delay: 0.01 }] },
  { id: 'burn', tags: ['attack', 'combat', 'fire'], level: 1.07, layers: [whoosh(500, 2600, 0.35, 0.8, { attack: 0.06, hold: 0.08, decay: 0.25 }), { wave: 'noise', freq: 22050, highpass: 3000, attack: 0.001, decay: 0.012, volume: 0.6, repeat: { count: 9, every: 0.04, jitter: 0.5 } }] },
  { id: 'bonk', tags: ['attack', 'combat'], level: 1, layers: [{ wave: 'triangle', freq: 640, to: 260, vibrato: [28, 0.06], attack: 0.002, decay: 0.22, volume: 0.8 }, { wave: 'square', freq: 1200, attack: 0.001, decay: 0.02, volume: 0.25 }] },
  { id: 'punch', tags: ['attack', 'combat'], level: 1.07, layers: [thud(190, 70, 0.11, 0.9), { wave: 'noise', freq: 22050, lowpass: 1600, attack: 0.001, decay: 0.07, volume: 0.6 }] },
  { id: 'shoot', tags: ['attack', 'combat'], level: 0.93, layers: [{ wave: 'triangle', freq: 196, to: 180, vibrato: [40, 0.015], attack: 0.001, decay: 0.2, volume: 0.6 }, whoosh(2500, 5000, 0.14, 0.4, { delay: 0.03 })] },
  { id: 'magic', tags: ['attack', 'magic'], level: 0.86, layers: [{ wave: 'pulse', duty: 0.25, freq: 660, steps: [1, 1.25, 1.5, 2, 1.5, 2, 2.5, 3], every: 0.03, attack: 0.005, hold: 0.22, decay: 0.12 }, { wave: 'sine', freq: 1320, to: 2640, vibrato: [14, 0.03], attack: 0.04, decay: 0.3, volume: 0.25 }] },

  // ----------------------------------------------------------- actions
  { id: 'hit', tags: ['action', 'combat'], level: 1.07, layers: [{ wave: 'square', freq: 330, to: 110, attack: 0.001, decay: 0.12, volume: 0.5 }, { wave: 'noise', freq: 22050, lowpass: 3500, attack: 0.001, decay: 0.08, volume: 0.6 }] },
  { id: 'hurt', tags: ['action', 'combat'], level: 1, layers: [{ wave: 'square', freq: 460, to: 200, vibrato: [30, 0.05], attack: 0.002, hold: 0.03, decay: 0.18 }, { wave: 'noise', freq: 4000, lowpass: 2000, attack: 0.001, decay: 0.06, volume: 0.4 }] },
  { id: 'crit', tags: ['action', 'combat', 'feedback'], level: 1.21, layers: [thud(220, 55, 0.2, 0.9), { wave: 'noise', freq: 22050, lowpass: 5000, attack: 0.001, decay: 0.1, volume: 0.7 }, { wave: 'pulse', duty: 0.2, notes: ['E6', 'B6'], every: 0.05, delay: 0.04, hold: 0.06, decay: 0.2, volume: 0.35 }] },
  { id: 'miss', tags: ['action', 'combat', 'feedback'], level: 0.71, layers: [whoosh(2200, 500, 0.18, 0.6), { wave: 'triangle', freq: 600, to: 300, attack: 0.01, decay: 0.16, volume: 0.25, delay: 0.03 }] },
  { id: 'block', tags: ['action', 'combat', 'feedback'], level: 1.07, layers: [{ wave: 'pulse', duty: 0.3, freq: 1560, attack: 0.001, decay: 0.12, volume: 0.4 }, { wave: 'square', freq: 2140, attack: 0.001, decay: 0.09, volume: 0.25 }, { wave: 'noise', freq: 22050, highpass: 3000, attack: 0.001, decay: 0.03, volume: 0.7 }] },
  { id: 'parry', tags: ['action', 'combat', 'feedback'], level: 1.07, layers: [{ wave: 'pulse', duty: 0.3, freq: 1560, attack: 0.001, decay: 0.08, volume: 0.4 }, { wave: 'noise', freq: 22050, highpass: 3000, attack: 0.001, decay: 0.03, volume: 0.6 }, { wave: 'sine', freq: 2000, to: 3200, vibrato: [18, 0.01], attack: 0.003, decay: 0.32, volume: 0.35, delay: 0.03 }] },
  { id: 'heal', tags: ['action', 'magic', 'heal'], level: 0.86, layers: [{ wave: 'sine', notes: ['C5', 'E5', 'G5', 'C6', 'E6'], every: 0.07, vibrato: [7, 0.012], attack: 0.01, hold: 0.32, decay: 0.3 }, { wave: 'triangle', notes: ['C6', 'E6', 'G6', 'C7', 'E7'], every: 0.07, attack: 0.01, hold: 0.32, decay: 0.3, volume: 0.2 }] },
  { id: 'levelup', tags: ['action', 'reward'], level: 1, layers: [{ wave: 'pulse', duty: 0.25, notes: ['C5', 'E5', 'G5', 'C6', 'E6', 'G6', 'C7'], every: [0.07, 0.07, 0.07, 0.07, 0.07, 0.07, 0.3], hold: 0.42, decay: 0.3 }, { wave: 'triangle', notes: ['C4', 'G4', 'C5'], every: [0.14, 0.14, 0.4], hold: 0.42, decay: 0.3, volume: 0.45 }] },
  { id: 'cast', tags: ['action', 'magic'], level: 0.86, layers: [{ wave: 'square', duty: 0.3, freq: 200, to: 800, vibrato: [9, 0.04], attack: 0.15, hold: 0.2, decay: 0.12, volume: 0.35, lowpass: 2500 }, { wave: 'sine', freq: 880, steps: [1, 1.5, 2, 3], every: 0.05, delay: 0.32, decay: 0.2, volume: 0.35 }] },
  { id: 'death', tags: ['action'], level: 1, layers: [{ wave: 'square', freq: 440, to: 55, vibrato: [10, 0.04], attack: 0.005, hold: 0.1, decay: 0.55, curve: 1.1 }, whoosh(1500, 200, 0.5, 0.3, { delay: 0.1 })] },

  // ------------------------------------------------------------- magic
  { id: 'charge', tags: ['magic', 'buff'], level: 0.86, layers: [{ wave: 'sine', freq: 150, to: 900, vibrato: [14, 0.03], attack: 0.5, hold: 0.05, decay: 0.08, curve: 1, volume: 0.7 }, { wave: 'noise', freq: 22050, highpass: 4000, attack: 0.5, decay: 0.08, volume: 0.15 }] },
  { id: 'buff', tags: ['magic', 'buff'], level: 0.79, layers: [{ wave: 'triangle', notes: ['G4', 'B4', 'D5', 'G5'], every: 0.06, hold: 0.24, decay: 0.2 }, { wave: 'sine', freq: 'G6', vibrato: [10, 0.02], delay: 0.18, decay: 0.3, volume: 0.25 }] },
  { id: 'debuff', tags: ['magic', 'debuff'], level: 0.79, layers: [{ wave: 'square', duty: 0.4, notes: ['G4', 'Eb4', 'C4', 'G3'], every: 0.07, vibrato: [6, 0.03], hold: 0.28, decay: 0.2, lowpass: 2000 }] },
  { id: 'shield', tags: ['magic', 'buff'], level: 0.79, layers: [{ wave: 'sine', freq: 520, to: 780, vibrato: [22, 0.05], attack: 0.03, hold: 0.15, decay: 0.25 }, { wave: 'triangle', freq: 1040, vibrato: [22, 0.05], attack: 0.03, hold: 0.15, decay: 0.25, volume: 0.25 }] },
  { id: 'teleport', tags: ['magic', 'movement'], level: 0.86, layers: [{ wave: 'sine', freq: 2000, to: 200, vibrato: [26, 0.2], attack: 0.005, decay: 0.25, curve: 1 }, { wave: 'sine', freq: 200, to: 2400, vibrato: [26, 0.2], attack: 0.005, decay: 0.2, delay: 0.25 }] },
  { id: 'portal', tags: ['magic'], level: 0.86, layers: [{ wave: 'saw', freq: 70, to: 90, lowpass: 500, vibrato: [3, 0.08], attack: 0.15, hold: 0.4, decay: 0.3, volume: 0.4 }, { wave: 'sine', freq: 620, to: 310, vibrato: [5, 0.06], attack: 0.15, hold: 0.4, decay: 0.3, volume: 0.45 }, { wave: 'triangle', freq: 1240, to: 930, vibrato: [7, 0.03], attack: 0.2, hold: 0.3, decay: 0.3, volume: 0.15 }] },
  { id: 'summon', tags: ['magic', 'spectacle'], level: 1.07, layers: [{ wave: 'saw', freq: 55, to: 110, lowpass: 900, attack: 0.25, hold: 0.25, decay: 0.3 }, { wave: 'square', duty: 0.3, notes: ['D4', 'A4', 'D5', 'F5', 'A5'], every: 0.09, delay: 0.25, hold: 0.4, decay: 0.3, volume: 0.3 }, thud(110, 40, 0.4, 0.7, { delay: 0.5 })] },
  { id: 'revive', tags: ['magic', 'holy', 'spectacle'], level: 0.93, layers: [{ wave: 'sine', notes: ['C5', 'G5', 'C6', 'E6', 'G6'], every: 0.1, vibrato: [5, 0.01], attack: 0.02, hold: 0.5, decay: 0.5 }, { wave: 'sine', notes: ['E5', 'C6', 'G6', 'C7'], every: 0.12, delay: 0.05, attack: 0.03, hold: 0.45, decay: 0.5, volume: 0.25 }, { wave: 'triangle', freq: 'C4', attack: 0.2, hold: 0.4, decay: 0.5, volume: 0.3 }] },

  // ------------------------------------------------------------- big
  { id: 'boom', tags: ['explosion', 'burst'], level: 1.36, layers: [{ wave: 'noise', freq: 1600, lowpass: 3500, lowpassTo: 250, attack: 0.002, hold: 0.04, decay: 0.6, curve: 1.2, volume: 1 }, thud(95, 32, 0.55, 0.9)] },
  { id: 'meteor', tags: ['explosion', 'spectacle', 'fire'], level: 1.36, layers: [{ wave: 'sine', freq: 1800, to: 300, attack: 0.05, hold: 0.25, decay: 0.05, volume: 0.25, slideTime: 0.35 }, whoosh(400, 3000, 0.35, 0.4, { attack: 0.3, decay: 0.05 }), { wave: 'noise', freq: 1600, lowpass: 3500, lowpassTo: 200, delay: 0.35, attack: 0.002, hold: 0.06, decay: 0.7, curve: 1.2, volume: 1 }, thud(90, 28, 0.7, 1, { delay: 0.35 })] },
  { id: 'quake', tags: ['explosion', 'spectacle'], level: 1.29, layers: [{ wave: 'noise', freq: 220, lowpass: 260, tremolo: [11, 0.6], attack: 0.08, hold: 0.5, decay: 0.5, volume: 0.8 }, thud(60, 40, 0.9, 0.5, { tremolo: [7, 0.5], attack: 0.05 }), { wave: 'noise', freq: 2500, lowpass: 1100, tremolo: [13, 0.7], attack: 0.05, hold: 0.45, decay: 0.5, volume: 0.45 }, { wave: 'noise', freq: 22050, lowpass: 3000, attack: 0.001, decay: 0.03, volume: 0.35, delay: 0.1, repeat: { count: 12, every: 0.07, jitter: 0.6, fade: 0.06 } }] },
  { id: 'firework', tags: ['explosion', 'celebration'], level: 1.14, layers: [{ wave: 'sine', freq: 500, to: 1900, attack: 0.02, hold: 0.3, decay: 0.02, volume: 0.25, slideTime: 0.32 }, { wave: 'noise', freq: 22050, lowpass: 2500, delay: 0.33, attack: 0.002, decay: 0.25, volume: 0.8 }, { wave: 'noise', freq: 22050, highpass: 3500, delay: 0.42, attack: 0.001, decay: 0.012, volume: 0.6, repeat: { count: 14, every: 0.035, jitter: 0.6, fade: 0.05 } }] },
  { id: 'poof', tags: ['smoke', 'spectacle'], level: 0.86, layers: [whoosh(2400, 400, 0.22, 0.8, { attack: 0.01, decay: 0.21 }), { wave: 'sine', freq: 320, to: 160, attack: 0.002, decay: 0.08, volume: 0.4 }] },
  { id: 'laser', tags: ['beam', 'projectile'], level: 0.86, layers: [{ wave: 'pulse', duty: 0.3, freq: 1600, to: 280, attack: 0.001, decay: 0.2, curve: 1.2 }] },
  { id: 'zap', tags: ['electric', 'element'], level: 1, layers: [{ wave: 'noise', freq: 600, highpass: 400, attack: 0.001, decay: 0.25, volume: 0.6, tremolo: [60, 0.7] }, { wave: 'square', freq: 60, to: 50, attack: 0.001, decay: 0.2, volume: 0.35, crush: 3 }, { wave: 'noise', freq: 22050, highpass: 5000, attack: 0.001, decay: 0.01, volume: 0.5, repeat: { count: 6, every: 0.035, jitter: 0.5 } }] },
  { id: 'shockwave', tags: ['burst'], level: 1.21, layers: [thud(210, 45, 0.35, 0.9), whoosh(5000, 300, 0.4, 0.6, { attack: 0.005, decay: 0.39 })] },
  { id: 'bolt', tags: ['projectile', 'magic'], level: 0.86, layers: [{ wave: 'pulse', duty: 0.2, freq: 900, to: 420, vibrato: [35, 0.05], attack: 0.003, decay: 0.22 }, whoosh(3000, 1200, 0.2, 0.25)] },

  // ----------------------------------------------------------- elements
  { id: 'fire', tags: ['element', 'fire'], level: 1, layers: [whoosh(400, 1800, 0.5, 0.7, { attack: 0.08, hold: 0.15, decay: 0.3 })] },
  { id: 'ice', tags: ['element', 'ice'], level: 0.86, layers: [{ wave: 'triangle', notes: ['E7', 'B6', 'G#7', 'E7', 'B7'], every: 0.035, attack: 0.001, hold: 0.15, decay: 0.25, volume: 0.4 }, whoosh(6000, 9000, 0.25, 0.15, { highpass: 4000 })] },
  { id: 'poison', tags: ['element', 'poison'], level: 0.86, layers: [{ wave: 'sine', freq: 240, to: 520, attack: 0.003, decay: 0.07, volume: 0.6, repeat: { count: 6, every: 0.07, pitch: 1.08, jitter: 0.35, fade: 0.08 } }, { wave: 'square', freq: 90, lowpass: 400, vibrato: [7, 0.06], attack: 0.05, hold: 0.25, decay: 0.15, volume: 0.25 }] },
  { id: 'holy', tags: ['element', 'holy'], level: 0.86, layers: [{ wave: 'sine', freq: 'E6', attack: 0.002, decay: 0.8, curve: 1.2, volume: 0.6 }, { wave: 'sine', freq: 'B6', attack: 0.002, decay: 0.6, curve: 1.4, volume: 0.35 }, { wave: 'sine', freq: 'E5', attack: 0.002, decay: 0.9, volume: 0.35 }] },
  { id: 'dark', tags: ['element', 'dark'], level: 1, layers: [{ wave: 'saw', freq: 110, to: 52, lowpass: 700, vibrato: [5, 0.04], attack: 0.08, hold: 0.2, decay: 0.35 }, whoosh(300, 1200, 0.5, 0.4)] },

  // ------------------------------------------------------------ jingles
  { id: 'win', tags: ['jingle'], level: 1, layers: [{ wave: 'pulse', duty: 0.3, notes: ['C5', 'E5', 'G5', 'C6', 'G5', 'C6'], every: [0.1, 0.1, 0.1, 0.2, 0.1, 0.5], hold: 0.75, decay: 0.35 }, { wave: 'triangle', notes: ['C4', 'G4', 'E4', 'C4'], every: [0.2, 0.2, 0.2, 0.6], hold: 0.75, decay: 0.35, volume: 0.45 }] },
  { id: 'lose', tags: ['jingle'], level: 0.93, layers: [{ wave: 'square', notes: ['G4', 'F#4', 'F4', 'E4'], every: [0.22, 0.22, 0.22, 0.7], vibrato: [6, 0.02], hold: 0.9, decay: 0.4, lowpass: 2500 }, { wave: 'triangle', notes: ['C4', 'B3', 'Bb3', 'A3'], every: [0.22, 0.22, 0.22, 0.7], hold: 0.9, decay: 0.4, volume: 0.45 }] },
  { id: 'fanfare', tags: ['jingle', 'celebration', 'reward'], level: 1, layers: [{ wave: 'square', duty: 0.35, notes: ['G4', 'C5', 'E5', 'G5', 'E5', 'G5'], every: [0.09, 0.09, 0.09, 0.2, 0.09, 0.45], hold: 0.7, decay: 0.3 }, { wave: 'triangle', notes: ['C4', 'C4', 'G3', 'C4'], every: [0.18, 0.2, 0.18, 0.45], hold: 0.7, decay: 0.3, volume: 0.5 }] },

  // -------------------------------------------------------------- loops
  { id: 'rain', tags: ['loop', 'weather'], loop: 2, level: 0.64, layers: [{ wave: 'noise', freq: 22050, lowpass: 5000, highpass: 600, attack: 0.001, hold: 2.5, decay: 0.01, volume: 0.5 }, { wave: 'sine', freq: 1200, to: 600, attack: 0.001, decay: 0.03, volume: 0.25, repeat: { count: 30, every: 0.08, jitter: 0.9 } }] },
  { id: 'wind', tags: ['loop', 'weather'], loop: 4, level: 0.71, layers: [{ wave: 'noise', freq: 22050, lowpass: 450, tremolo: [0.5, 0.75], attack: 0.001, hold: 4.5, decay: 0.01, volume: 0.8 }, { wave: 'noise', freq: 22050, lowpass: 1600, highpass: 900, tremolo: [0.75, 0.9], attack: 0.001, hold: 4.5, decay: 0.01, volume: 0.25 }] },
  { id: 'campfire', tags: ['loop', 'fire'], loop: 2, level: 0.71, layers: [{ wave: 'noise', freq: 22050, lowpass: 280, attack: 0.001, hold: 2.5, decay: 0.01, volume: 0.6 }, { wave: 'noise', freq: 22050, highpass: 2500, attack: 0.001, decay: 0.012, volume: 0.6, repeat: { count: 34, every: 0.07, jitter: 0.9 } }] },
]

// Element flavors: extra layers sized to the sound they join (len = its length in seconds).
// spell.sfx('slash', { element: 'fire' }) is a slash with crackle on it, the way an effect takes a color.
const pops = (len, highpass, volume) => ({ wave: 'noise', freq: 22050, highpass, attack: 0.001, decay: 0.014, volume, delay: len * 0.2, repeat: { count: Math.max(5, Math.round(len / 0.03) + 4), every: 0.03, jitter: 0.6, fade: 0.04 } })
const after = (len) => Math.max(0.15, len * 0.6) // flavors ring a little past the sound they join
export const FLAVORS = {
  fire: (len) => [whoosh(500, 2400, len + 0.1, 0.4), pops(len, 3000, 0.75)],
  ice: (len) => [{ wave: 'triangle', notes: ['E7', 'B7', 'G#7', 'E8'], every: 0.03, delay: len * 0.3, attack: 0.001, hold: 0.09, decay: after(len) + 0.1, volume: 0.45 }],
  poison: (len) => [{ wave: 'sine', freq: 230, to: 560, attack: 0.002, decay: 0.05, volume: 0.6, delay: len * 0.3, repeat: { count: Math.max(4, Math.round(len / 0.06) + 3), every: 0.06, jitter: 0.4, pitch: 1.06, fade: 0.05 } }],
  holy: (len) => [{ wave: 'sine', freq: 'E6', delay: len * 0.3, attack: 0.002, decay: after(len) + 0.3, volume: 0.45 }, { wave: 'sine', freq: 'B6', delay: len * 0.3, attack: 0.002, decay: after(len) + 0.2, volume: 0.28 }],
  dark: (len) => [{ wave: 'saw', freq: 95, to: 45, lowpass: 650, vibrato: [6, 0.05], attack: 0.02, hold: len * 0.5, decay: after(len), volume: 0.7 }],
  water: (len) => [{ wave: 'sine', freq: 420, to: 1100, attack: 0.002, decay: 0.045, volume: 0.5, delay: len * 0.3, repeat: { count: Math.max(3, Math.round(len / 0.06) + 2), every: 0.06, jitter: 0.4, pitch: 0.9, fade: 0.08 } }],
  nature: (len) => [whoosh(1200, 3200, len + 0.1, 0.35), { wave: 'sine', freq: 2300, to: 3400, attack: 0.002, decay: 0.06, volume: 0.4, delay: len * 0.4, repeat: { count: 3, every: 0.08, pitch: 1.1 } }],
  blood: (len) => [{ wave: 'noise', freq: 22050, lowpass: 900, attack: 0.002, decay: after(len), volume: 0.8, delay: len * 0.3 }, { wave: 'sine', freq: 300, to: 110, attack: 0.002, decay: 0.12, volume: 0.5, delay: len * 0.3 }],
  arcane: (len) => [{ wave: 'pulse', duty: 0.2, freq: 1320, steps: [1, 1.5, 2, 1.5, 2.5, 2], every: 0.03, vibrato: [12, 0.02], delay: len * 0.2, attack: 0.003, hold: Math.max(0.12, len * 0.6), decay: 0.15, volume: 0.35 }],
  steel: (len) => [{ wave: 'pulse', duty: 0.3, freq: 1760, delay: len * 0.3, attack: 0.001, decay: 0.3, volume: 0.4 }, { wave: 'square', freq: 2470, delay: len * 0.3, attack: 0.001, decay: 0.22, volume: 0.22 }],
}

// Which sound goes with which effect (fx-<name> and the hand-drawn effects). Effects that are pure
// ambience (glow, motes, fireflies...) have none on purpose.
export const EFFECT_SOUNDS = {
  burst: 'boom', boom: 'boom', explosion: 'boom', shockwave: 'shockwave', firework: 'firework', dust: 'land', impact: 'hit', hit: 'hit',
  'magic-circle': 'portal', 'sparkle-burst': 'gem', sparkle: 'gem', aura: 'buff', shield: 'shield', teleport: 'teleport', portal: 'portal',
  charge: 'charge', heal: 'heal', flame: 'fire', 'ice-shards': 'ice', lightning: 'zap', 'poison-cloud': 'poison', 'holy-beam': 'holy',
  'dark-vortex': 'dark', 'cross-slash': 'slash', slash: 'slash', claw: 'slash', dizzy: 'bonk', splash: 'splash', 'coin-pop': 'coin',
  comet: 'bolt', orb: 'bolt', 'energy-bolt': 'bolt', spinner: 'thrust', wave: 'slash', laser: 'laser', 'chain-lightning': 'zap',
  rain: 'rain', snow: 'wind', leaves: 'wind', embers: 'campfire', burning: 'fire', frozen: 'ice', poisoned: 'poison', buff: 'buff',
  debuff: 'debuff', confused: 'debuff', love: 'heal', stab: 'stab', smash: 'smash', thrust: 'thrust', whip: 'whip', arrow: 'shoot',
  pow: 'bonk', crit: 'crit', miss: 'miss', block: 'block', parry: 'parry', whirlwind: 'slash', 'loot-beam': 'gem', smoke: 'poof',
  lava: 'campfire', fog: 'wind', wind: 'wind', geyser: 'splash', ripple: 'splash', meteor: 'meteor', tornado: 'wind', quake: 'quake',
  'black-hole': 'portal', summon: 'summon', revive: 'revive', thorns: 'smash', 'electric-field': 'zap', confetti: 'fanfare',
  poof: 'poof', drip: 'splash', notes: 'win',
}
