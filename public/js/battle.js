/**
 * Battle Scene Engine & Visuals Module
 * Mirai-Game / CODAK Platform
 * 
 * Implements 160x144 Canvas visual rendering, pixel-grid sprite arrays,
 * HP bar animations, typewriter dialogue, points system, and win/lose conditions.
 */

// ===========================================================================
// BATTLE CONFIGURATION (Easily tweakable parameters)
// ===========================================================================
const BATTLE_CONFIG = {
  turnLimit: 8,
  minPoints: 120,
  points: {
    easy: 10,
    medium: 25,
    hard: 50
  }
};

if (typeof window !== 'undefined') {
  window.BATTLE_CONFIG = BATTLE_CONFIG;
}

// ---------------------------------------------------------------------------
// 1. GAME BOY COLOR PALETTE MAPPING FOR SPRITE ARRAYS
// ---------------------------------------------------------------------------
const SPRITE_PALETTE = [
  'transparent', // 0: Transparent
  '#0c1015',     // 1: gb-darkest
  '#1b2632',     // 2: gb-dark
  '#2c3e50',     // 3: gb-mid
  '#526f8a',     // 4: gb-light
  '#eef5fc',     // 5: gb-lightest
  '#38b764',     // 6: gb-green
  '#206d39',     // 7: gb-green-dark
  '#f4b41b',     // 8: gb-yellow
  '#9f7209',     // 9: gb-yellow-dark
  '#e03c3c',     // 10: gb-red
  '#941e1e',     // 11: gb-red-dark
  '#38bdf8',     // 12: gb-blue
  '#1e40af'      // 13: gb-blue-dark
];

// Glitch Color Palette (Red/Purple) for Bugmon Variants & Glitch Transformation
const BUGMON_PALETTE = [
  'transparent', // 0: Transparent
  '#150308',     // 1: Deep glitch dark
  '#2a040d',     // 2: Dark maroon
  '#540d1a',     // 3: Dark crimson
  '#9b51e0',     // 4: Glitch purple
  '#ffffff',     // 5: Glitch white glow
  '#ea80fc',     // 6: Neon magenta
  '#7b1fa2',     // 7: Deep violet
  '#ff0055',     // 8: Neon crimson
  '#c2185b',     // 9: Dark neon crimson
  '#ff1744',     // 10: Bright red
  '#d50000',     // 11: Deep blood red
  '#9c27b0',     // 12: Vivid purple
  '#4a148c'      // 13: Dark purple
];

// ---------------------------------------------------------------------------
// 2. 16x16 PIXEL SPRITE GRIDS (Editable arrays of palette indexes)
// ---------------------------------------------------------------------------

// Bugmon Enemy (Front View): Rogue Glitch Spectre with Red Core & Glowing Optics
const SPRITE_BUGMON_FRONT = [
  [0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0],
  [0, 0, 10, 1, 10, 0, 0, 0, 0, 0, 0, 10, 1, 10, 0, 0],
  [0, 0, 0, 10, 1, 10, 0, 0, 0, 0, 10, 1, 10, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 0, 0, 0],
  [0, 0, 1, 10, 5, 5, 10, 10, 10, 5, 5, 10, 1, 0, 0, 0],
  [0, 0, 1, 10, 5, 1, 10, 10, 10, 5, 1, 10, 1, 0, 0, 0],
  [0, 1, 1, 10, 10, 10, 8, 8, 10, 10, 10, 10, 1, 1, 0, 0],
  [1, 10, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 10, 1, 0],
  [1, 10, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 10, 1, 0, 0],
  [0, 1, 1, 10, 1, 10, 1, 1, 10, 1, 10, 1, 1, 0, 0, 0],
  [0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 1, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0, 0],
  [1, 1, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0]
];

// Pyrawr Front View: Dragon striker with golden scales and blue crest
const SPRITE_PYRAWR_FRONT = [
  [0, 0, 0, 0, 12, 12, 0, 0, 0, 0, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 12, 8, 8, 12, 0, 0, 12, 8, 8, 12, 0, 0, 0],
  [0, 0, 12, 8, 8, 8, 8, 12, 12, 8, 8, 8, 8, 12, 0, 0],
  [0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0],
  [0, 1, 8, 5, 1, 8, 8, 8, 8, 8, 8, 1, 5, 8, 1, 0],
  [0, 1, 8, 1, 1, 8, 8, 8, 8, 8, 8, 1, 1, 8, 1, 0],
  [0, 1, 8, 8, 8, 8, 10, 10, 10, 10, 8, 8, 8, 8, 1, 0],
  [0, 0, 1, 8, 8, 10, 1, 1, 1, 1, 10, 8, 8, 1, 0, 0],
  [0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0],
  [0, 1, 8, 8, 12, 12, 12, 12, 12, 12, 12, 12, 8, 8, 1, 0],
  [0, 1, 8, 12, 1, 12, 12, 12, 12, 12, 1, 12, 8, 8, 1, 0],
  [0, 1, 8, 12, 12, 12, 12, 12, 12, 12, 12, 12, 8, 8, 1, 0],
  [0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0],
  [0, 0, 1, 8, 1, 0, 0, 0, 0, 0, 0, 1, 8, 1, 0, 0],
  [0, 1, 8, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 8, 1, 0],
  [0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0]
];

// Jaskull Front View: Amber floating skull with glowing eyes and energy aura
const SPRITE_JASKULL_FRONT = [
  [0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0],
  [0, 0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0],
  [0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0],
  [0, 1, 5, 5, 1, 1, 5, 5, 5, 5, 1, 1, 5, 5, 1, 0],
  [0, 1, 5, 1, 8, 8, 1, 5, 5, 1, 8, 8, 1, 5, 1, 0],
  [0, 1, 5, 1, 8, 8, 1, 5, 5, 1, 8, 8, 1, 5, 1, 0],
  [0, 1, 5, 5, 1, 1, 5, 5, 5, 5, 1, 1, 5, 5, 1, 0],
  [0, 0, 1, 5, 5, 5, 5, 1, 1, 5, 5, 5, 5, 1, 0, 0],
  [0, 0, 0, 1, 5, 5, 1, 8, 8, 1, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 5, 1, 1, 5, 1, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 5, 1, 1, 5, 1, 5, 1, 0, 0, 0],
  [0, 0, 1, 8, 8, 1, 1, 1, 1, 1, 1, 8, 8, 1, 0, 0],
  [0, 1, 8, 0, 8, 8, 0, 0, 0, 0, 8, 8, 0, 8, 1, 0],
  [0, 1, 0, 0, 0, 8, 8, 0, 0, 8, 8, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0]
];

// Cplusaur Front View: Armored C++ tank beast with pointer carapace
const SPRITE_CPLUSAUR_FRONT = [
  [0, 0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 12, 13, 13, 13, 13, 13, 13, 12, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 4, 4, 3, 3, 3, 3, 4, 4, 3, 1, 0, 0],
  [0, 1, 3, 4, 10, 1, 4, 3, 3, 4, 10, 1, 4, 3, 1, 0],
  [0, 1, 3, 4, 1, 1, 4, 3, 3, 4, 1, 1, 4, 3, 1, 0],
  [0, 1, 3, 3, 4, 4, 3, 3, 3, 3, 4, 4, 3, 3, 1, 0],
  [0, 1, 3, 3, 3, 3, 1, 1, 1, 1, 3, 3, 3, 3, 1, 0],
  [0, 1, 12, 1, 3, 1, 5, 5, 5, 5, 1, 3, 1, 12, 1, 0],
  [1, 12, 12, 1, 3, 3, 1, 1, 1, 1, 3, 3, 1, 12, 12, 1],
  [1, 12, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 12, 1],
  [0, 1, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0]
];

// Bug-Pyrawr Variant (Front View): Corrupted glitch dino with blazing horns and bug mandibles
const SPRITE_BUG_PYRAWR_FRONT = [
  [0, 10, 0, 0, 4, 4, 0, 0, 0, 0, 4, 4, 0, 0, 10, 0],
  [0, 10, 10, 0, 10, 10, 10, 0, 0, 10, 10, 10, 0, 10, 10, 0],
  [0, 0, 10, 1, 10, 8, 10, 10, 10, 10, 8, 10, 1, 10, 0, 0],
  [0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 1, 0, 0],
  [0, 1, 10, 5, 8, 10, 10, 10, 10, 10, 10, 8, 5, 10, 1, 0],
  [0, 1, 10, 8, 1, 10, 10, 10, 10, 10, 10, 1, 8, 10, 1, 0],
  [1, 4, 10, 10, 10, 10, 1, 1, 1, 1, 10, 10, 10, 10, 4, 1],
  [1, 4, 1, 10, 10, 1, 5, 5, 5, 5, 1, 10, 10, 1, 4, 1],
  [0, 1, 1, 10, 10, 1, 1, 1, 1, 1, 1, 10, 10, 1, 1, 0],
  [0, 1, 10, 12, 13, 13, 8, 8, 8, 8, 13, 13, 12, 10, 1, 0],
  [1, 10, 10, 13, 1, 13, 8, 5, 5, 8, 13, 1, 13, 10, 10, 1],
  [1, 10, 1, 13, 13, 13, 8, 8, 8, 8, 13, 13, 13, 1, 10, 1],
  [0, 1, 1, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 1, 1, 0],
  [0, 0, 1, 10, 1, 0, 0, 0, 0, 0, 0, 1, 10, 1, 0, 0],
  [0, 1, 10, 10, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 1, 0],
  [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0]
];

// Bug-Jaskull Variant (Front View): Gigantic corrupted glitch skull with crimson sockets and insect mandibles
const SPRITE_BUG_JASKULL_FRONT = [
  [10, 0, 4, 4, 0, 0, 0, 0, 0, 0, 0, 0, 4, 4, 0, 10],
  [0, 10, 0, 4, 4, 0, 0, 0, 0, 0, 0, 4, 4, 0, 10, 0],
  [0, 0, 10, 1, 7, 7, 7, 7, 7, 7, 7, 7, 1, 10, 0, 0],
  [0, 1, 7, 7, 12, 12, 7, 7, 7, 7, 12, 12, 7, 7, 1, 0],
  [0, 1, 7, 12, 8, 8, 12, 7, 7, 12, 8, 8, 12, 7, 1, 0],
  [1, 4, 7, 12, 5, 8, 12, 7, 7, 12, 8, 5, 12, 7, 4, 1],
  [1, 4, 7, 7, 12, 12, 7, 7, 7, 7, 12, 12, 7, 7, 4, 1],
  [0, 1, 7, 7, 7, 7, 7, 8, 8, 7, 7, 7, 7, 7, 1, 0],
  [0, 0, 1, 7, 7, 7, 1, 1, 1, 1, 7, 7, 7, 1, 0, 0],
  [0, 0, 1, 12, 12, 1, 5, 5, 5, 5, 1, 12, 12, 1, 0, 0],
  [0, 1, 12, 1, 12, 1, 1, 1, 1, 1, 1, 12, 1, 12, 1, 0],
  [0, 1, 12, 1, 12, 1, 1, 1, 1, 1, 1, 12, 1, 12, 1, 0],
  [1, 10, 1, 8, 8, 1, 4, 4, 4, 4, 1, 8, 8, 1, 10, 1],
  [1, 10, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 10, 1],
  [0, 1, 10, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 10, 1, 0],
  [0, 0, 1, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 1, 0, 0]
];

// Bug-Cplusaur Variant (Front View): Massive corrupted tank beast with bug pincers and crimson core
const SPRITE_BUG_CPLUSAUR_FRONT = [
  [10, 0, 0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 10],
  [0, 10, 0, 12, 7, 7, 7, 7, 7, 7, 7, 7, 12, 0, 10, 0],
  [0, 0, 10, 1, 13, 13, 13, 13, 13, 13, 13, 13, 1, 10, 0, 0],
  [0, 1, 13, 7, 7, 7, 13, 13, 13, 13, 7, 7, 7, 13, 1, 0],
  [1, 13, 7, 8, 5, 8, 7, 13, 13, 7, 8, 5, 8, 7, 13, 1],
  [1, 10, 7, 8, 1, 8, 7, 13, 13, 7, 8, 1, 8, 7, 10, 1],
  [1, 10, 13, 7, 7, 7, 13, 13, 13, 13, 7, 7, 7, 13, 10, 1],
  [0, 1, 13, 13, 13, 13, 1, 1, 1, 1, 13, 13, 13, 13, 1, 0],
  [1, 10, 1, 13, 13, 1, 8, 8, 8, 8, 1, 13, 13, 1, 10, 1],
  [1, 10, 10, 1, 13, 1, 5, 5, 5, 5, 1, 13, 1, 10, 10, 1],
  [0, 1, 10, 1, 13, 13, 1, 1, 1, 1, 13, 13, 1, 10, 1, 0],
  [0, 1, 1, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 1, 1, 0],
  [0, 0, 1, 7, 7, 7, 7, 7, 7, 7, 7, 7, 7, 1, 0, 0],
  [0, 1, 10, 10, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 1, 0],
  [1, 10, 10, 10, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 10, 1],
  [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0]
];

// Bug-Bugmon Prime Variant (Front View): Prime anomaly rogue glitch bugmon
const SPRITE_BUG_BUGMON_FRONT = SPRITE_BUGMON_FRONT;

// Pyrawr Player (Back View): Python Yellow / Blue Crest & Armored Spine
const SPRITE_PYRAWR_BACK = [
  [0, 0, 0, 0, 8, 8, 0, 0, 0, 0, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 8, 8, 8, 8, 0, 0, 12, 12, 12, 12, 0, 0, 0],
  [0, 0, 0, 8, 1, 8, 8, 0, 0, 12, 1, 12, 12, 0, 0, 0],
  [0, 0, 0, 0, 8, 8, 8, 8, 12, 12, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 1, 8, 8, 8, 8, 12, 12, 12, 12, 1, 0, 0, 0],
  [0, 0, 1, 8, 8, 8, 12, 12, 12, 12, 12, 12, 1, 0, 0, 0],
  [0, 0, 1, 8, 8, 12, 1, 1, 12, 12, 12, 12, 1, 0, 0, 0],
  [0, 1, 8, 8, 12, 12, 1, 1, 12, 12, 12, 12, 1, 0, 0, 0],
  [0, 1, 8, 8, 12, 12, 12, 12, 12, 12, 13, 13, 1, 0, 0, 0],
  [0, 1, 8, 12, 12, 12, 1, 1, 12, 13, 13, 13, 1, 0, 0, 0],
  [0, 1, 12, 12, 12, 12, 1, 1, 13, 13, 13, 13, 1, 0, 0, 0],
  [0, 0, 1, 12, 12, 13, 13, 13, 13, 13, 13, 1, 0, 0, 0, 0],
  [0, 0, 1, 13, 13, 13, 13, 13, 13, 13, 13, 1, 0, 0, 0, 0],
  [0, 1, 0, 1, 13, 13, 0, 0, 13, 13, 1, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 0],
  [1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0]
];

// Jaskull Player (Back View): JavaScript Amber Ghost Skull & Energy Trails
const SPRITE_JASKULL_BACK = [
  [0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0],
  [0, 0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0, 0],
  [0, 0, 0, 0, 8, 8, 0, 0, 0, 0, 8, 8, 0, 0, 0, 0],
  [0, 0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0],
  [0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0],
  [0, 1, 5, 5, 5, 5, 4, 4, 4, 5, 5, 5, 5, 1, 0, 0],
  [0, 1, 5, 5, 5, 4, 4, 4, 4, 4, 5, 5, 5, 1, 0, 0],
  [0, 1, 5, 5, 5, 4, 4, 1, 4, 4, 5, 5, 5, 1, 0, 0],
  [0, 1, 5, 5, 5, 5, 4, 4, 4, 5, 5, 5, 5, 1, 0, 0],
  [0, 0, 1, 5, 5, 5, 5, 5, 5, 5, 5, 5, 1, 0, 0, 0],
  [0, 0, 0, 1, 5, 1, 5, 1, 5, 1, 5, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0, 0],
  [0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0],
  [0, 1, 8, 8, 0, 8, 8, 8, 8, 0, 8, 8, 1, 0, 0, 0],
  [0, 1, 8, 0, 0, 0, 8, 8, 0, 0, 0, 8, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0]
];

// Cplusaur Player (Back View): C++ Steel-Blue Heavy Armor & Pointer Crest
const SPRITE_CPLUSAUR_BACK = [
  [0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0],
  [0, 1, 3, 3, 12, 12, 3, 3, 12, 12, 3, 3, 3, 1, 0, 0],
  [0, 1, 3, 12, 12, 12, 12, 12, 12, 12, 12, 3, 3, 1, 0, 0],
  [0, 1, 3, 12, 12, 1, 12, 12, 1, 12, 12, 3, 3, 1, 0, 0],
  [0, 1, 3, 3, 12, 12, 12, 12, 12, 12, 3, 3, 3, 1, 0, 0],
  [0, 1, 3, 3, 3, 3, 12, 12, 3, 3, 3, 3, 3, 1, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 3, 3, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 1, 4, 4, 1, 0, 0, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 1, 4, 4, 1, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0]
];

// Javagron Front Sprite: Java Enterprise Golem / Dragon
const SPRITE_JAVAGRON_FRONT = [
  [0, 0, 0, 0, 0, 8, 8, 0, 0, 8, 8, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 8, 8, 8, 0, 0, 8, 8, 8, 0, 0, 0, 0],
  [0, 0, 0, 5, 0, 8, 9, 0, 0, 9, 8, 0, 5, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0],
  [0, 0, 1, 8, 8, 1, 1, 8, 8, 1, 1, 8, 8, 1, 0, 0],
  [0, 0, 1, 8, 8, 5, 1, 8, 8, 5, 1, 8, 8, 1, 0, 0],
  [0, 0, 1, 8, 8, 8, 8, 10, 10, 8, 8, 8, 8, 1, 0, 0],
  [0, 0, 0, 1, 8, 8, 10, 11, 11, 10, 8, 8, 1, 0, 0, 0],
  [0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 0, 0],
  [0, 1, 9, 8, 8, 10, 10, 10, 10, 8, 8, 9, 9, 1, 0, 0],
  [0, 1, 8, 8, 8, 10, 5, 5, 10, 8, 8, 8, 8, 1, 0, 0],
  [0, 1, 8, 8, 8, 10, 10, 10, 10, 8, 8, 8, 8, 1, 0, 0],
  [0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0]
];

// Javagron Player Back Sprite
const SPRITE_JAVAGRON_BACK = [
  [0, 0, 0, 0, 0, 9, 9, 0, 0, 9, 9, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 9, 9, 9, 0, 0, 9, 9, 9, 0, 0, 0, 0],
  [0, 0, 0, 5, 0, 9, 8, 0, 0, 8, 9, 0, 5, 0, 0, 0],
  [0, 0, 0, 0, 1, 9, 9, 9, 9, 9, 9, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 8, 8, 8, 8, 8, 8, 8, 8, 1, 0, 0, 0],
  [0, 0, 1, 8, 8, 8, 9, 9, 9, 9, 8, 8, 8, 1, 0, 0],
  [0, 0, 1, 8, 8, 9, 9, 10, 10, 9, 9, 8, 8, 1, 0, 0],
  [0, 0, 1, 8, 8, 9, 10, 10, 10, 10, 9, 8, 8, 1, 0, 0],
  [0, 0, 0, 1, 8, 8, 9, 9, 9, 9, 8, 8, 1, 0, 0, 0],
  [0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 0, 0],
  [0, 1, 9, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 1, 0, 0],
  [0, 1, 8, 8, 8, 10, 10, 10, 10, 8, 8, 8, 8, 1, 0, 0],
  [0, 1, 8, 8, 8, 10, 10, 10, 10, 8, 8, 8, 8, 1, 0, 0],
  [0, 0, 1, 9, 9, 9, 9, 9, 9, 9, 9, 9, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0]
];

// Bug-Javagron Glitch Variant
const SPRITE_BUG_JAVAGRON_FRONT = [
  [0, 0, 0, 0, 6, 6, 0, 0, 0, 0, 6, 6, 0, 0, 0, 0],
  [0, 0, 0, 6, 6, 8, 0, 0, 0, 0, 8, 6, 6, 0, 0, 0],
  [0, 0, 5, 0, 8, 4, 0, 0, 0, 0, 4, 8, 0, 5, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 11, 11, 11, 11, 11, 11, 11, 11, 3, 1, 0, 0],
  [0, 0, 1, 11, 10, 5, 5, 11, 11, 5, 5, 10, 11, 1, 0, 0],
  [0, 0, 1, 11, 10, 5, 1, 11, 11, 5, 1, 10, 11, 1, 0, 0],
  [0, 0, 1, 11, 11, 11, 11, 8, 8, 11, 11, 11, 11, 1, 0, 0],
  [0, 0, 0, 1, 11, 8, 8, 4, 4, 8, 8, 11, 1, 0, 0, 0],
  [0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0],
  [0, 1, 3, 11, 11, 8, 8, 8, 8, 11, 11, 3, 3, 1, 0, 0],
  [0, 1, 11, 11, 8, 6, 5, 5, 6, 8, 11, 11, 11, 1, 0, 0],
  [0, 1, 11, 11, 8, 8, 8, 8, 8, 8, 11, 11, 11, 1, 0, 0],
  [0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 0]
];

// Rubicorn Front Sprite: Ruby Gem Crystal Beast
const SPRITE_RUBICORN_FRONT = [
  [0, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 10, 5, 10, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 11, 11, 0, 10, 10, 0, 11, 11, 0, 0, 0, 0],
  [0, 0, 0, 11, 10, 10, 10, 10, 10, 10, 10, 10, 11, 0, 0, 0],
  [0, 0, 0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 0, 0, 0],
  [0, 0, 1, 10, 10, 1, 1, 10, 10, 1, 1, 10, 10, 1, 0, 0],
  [0, 0, 1, 10, 10, 10, 1, 10, 10, 10, 1, 10, 10, 1, 0, 0],
  [0, 0, 1, 10, 5, 5, 5, 5, 5, 5, 5, 5, 10, 1, 0, 0],
  [0, 0, 0, 1, 10, 11, 11, 11, 11, 11, 11, 10, 1, 0, 0, 0],
  [0, 0, 1, 11, 10, 10, 10, 10, 10, 10, 10, 10, 11, 1, 0, 0],
  [0, 1, 11, 10, 10, 8, 8, 8, 8, 10, 10, 10, 11, 1, 0, 0],
  [0, 1, 10, 10, 8, 5, 5, 5, 5, 8, 10, 10, 10, 1, 0, 0],
  [0, 1, 10, 10, 10, 8, 8, 8, 8, 10, 10, 10, 10, 1, 0, 0],
  [0, 0, 1, 11, 10, 10, 10, 10, 10, 10, 10, 11, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 8, 8, 1, 0, 0, 0, 0, 0, 0, 1, 8, 8, 1, 0]
];

// Rubicorn Player Back Sprite
const SPRITE_RUBICORN_BACK = [
  [0, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 10, 5, 10, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 11, 11, 0, 10, 10, 0, 11, 11, 0, 0, 0, 0],
  [0, 0, 0, 11, 10, 10, 8, 8, 8, 8, 10, 10, 11, 0, 0, 0],
  [0, 0, 0, 1, 10, 10, 8, 5, 5, 8, 10, 10, 1, 0, 0, 0],
  [0, 0, 1, 10, 10, 10, 8, 8, 8, 8, 10, 10, 10, 1, 0, 0],
  [0, 0, 1, 10, 10, 10, 10, 8, 8, 10, 10, 10, 10, 1, 0, 0],
  [0, 0, 1, 10, 10, 10, 10, 8, 8, 10, 10, 10, 10, 1, 0, 0],
  [0, 0, 0, 1, 10, 11, 11, 8, 8, 11, 11, 10, 1, 0, 0, 0],
  [0, 0, 1, 11, 10, 10, 10, 8, 8, 10, 10, 10, 11, 1, 0, 0],
  [0, 1, 11, 10, 10, 10, 10, 8, 8, 10, 10, 10, 11, 1, 0, 0],
  [0, 1, 10, 10, 10, 10, 10, 8, 8, 10, 10, 10, 10, 1, 0, 0],
  [0, 1, 10, 10, 10, 10, 10, 8, 8, 10, 10, 10, 10, 1, 0, 0],
  [0, 0, 1, 11, 10, 10, 10, 10, 10, 10, 10, 11, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 8, 8, 1, 0, 0, 0, 0, 0, 0, 1, 8, 8, 1, 0]
];

// Bug-Rubicorn Glitch Variant
const SPRITE_BUG_RUBICORN_FRONT = [
  [0, 0, 0, 0, 0, 0, 0, 8, 8, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 6, 5, 8, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 3, 3, 0, 8, 8, 0, 3, 3, 0, 0, 0, 0],
  [0, 0, 0, 3, 11, 11, 11, 11, 11, 11, 11, 11, 3, 0, 0, 0],
  [0, 0, 0, 1, 11, 11, 11, 11, 11, 11, 11, 11, 1, 0, 0, 0],
  [0, 0, 1, 11, 11, 10, 10, 11, 11, 10, 10, 11, 11, 1, 0, 0],
  [0, 0, 1, 11, 11, 5, 10, 11, 11, 5, 10, 11, 11, 1, 0, 0],
  [0, 0, 1, 11, 6, 6, 6, 6, 6, 6, 6, 6, 11, 1, 0, 0],
  [0, 0, 0, 1, 11, 3, 3, 3, 3, 3, 3, 11, 1, 0, 0, 0],
  [0, 0, 1, 3, 11, 11, 11, 11, 11, 11, 11, 11, 3, 1, 0, 0],
  [0, 1, 3, 11, 11, 8, 8, 8, 8, 11, 11, 11, 3, 1, 0, 0],
  [0, 1, 11, 11, 8, 5, 5, 5, 5, 8, 11, 11, 11, 1, 0, 0],
  [0, 1, 11, 11, 11, 8, 8, 8, 8, 11, 11, 11, 11, 1, 0, 0],
  [0, 0, 1, 3, 11, 11, 11, 11, 11, 11, 11, 3, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 0]
];

// Sqloph Front Sprite: SQL Relational Database Titan
const SPRITE_SQLOPH_FRONT = [
  [0, 0, 0, 0, 12, 12, 12, 12, 12, 12, 12, 12, 0, 0, 0, 0],
  [0, 0, 0, 5, 12, 5, 12, 5, 12, 5, 12, 5, 0, 0, 0, 0],
  [0, 0, 0, 1, 13, 13, 13, 13, 13, 13, 13, 13, 1, 0, 0, 0],
  [0, 0, 1, 13, 12, 12, 12, 12, 12, 12, 12, 12, 13, 1, 0, 0],
  [0, 0, 1, 12, 12, 1, 1, 1, 1, 1, 1, 12, 12, 1, 0, 0],
  [0, 0, 1, 12, 1, 8, 8, 8, 8, 8, 8, 1, 12, 1, 0, 0],
  [0, 0, 1, 12, 1, 8, 5, 5, 5, 5, 8, 1, 12, 1, 0, 0],
  [0, 0, 1, 12, 12, 1, 8, 8, 8, 8, 1, 12, 12, 1, 0, 0],
  [0, 0, 0, 1, 13, 12, 1, 8, 8, 1, 12, 13, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 13, 13, 12, 12, 13, 13, 12, 12, 13, 2, 1, 0, 0],
  [0, 1, 13, 13, 13, 12, 12, 13, 13, 12, 12, 13, 13, 1, 0, 0],
  [0, 1, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 13, 13, 1, 0, 0, 0, 0, 0, 0, 1, 13, 13, 1, 0]
];

// Sqloph Player Back Sprite
const SPRITE_SQLOPH_BACK = [
  [0, 0, 0, 0, 13, 13, 13, 13, 13, 13, 13, 13, 0, 0, 0, 0],
  [0, 0, 0, 12, 13, 12, 13, 12, 13, 12, 13, 12, 0, 0, 0, 0],
  [0, 0, 0, 1, 13, 13, 13, 13, 13, 13, 13, 13, 1, 0, 0, 0],
  [0, 0, 1, 13, 12, 12, 12, 12, 12, 12, 12, 12, 13, 1, 0, 0],
  [0, 0, 1, 12, 12, 13, 13, 13, 13, 13, 13, 12, 12, 1, 0, 0],
  [0, 0, 1, 12, 13, 13, 13, 13, 13, 13, 13, 13, 12, 1, 0, 0],
  [0, 0, 1, 12, 13, 13, 12, 12, 12, 12, 13, 13, 12, 1, 0, 0],
  [0, 0, 1, 12, 12, 13, 12, 12, 12, 12, 13, 12, 12, 1, 0, 0],
  [0, 0, 0, 1, 13, 12, 13, 13, 13, 13, 12, 13, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 13, 13, 12, 12, 13, 13, 12, 12, 13, 2, 1, 0, 0],
  [0, 1, 13, 13, 13, 12, 12, 13, 13, 12, 12, 13, 13, 1, 0, 0],
  [0, 1, 13, 12, 12, 12, 12, 12, 12, 12, 12, 12, 13, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 13, 13, 1, 0, 0, 0, 0, 0, 0, 1, 13, 13, 1, 0]
];

// Bug-Sqloph Glitch Variant
const SPRITE_BUG_SQLOPH_FRONT = [
  [0, 0, 0, 0, 8, 8, 8, 8, 6, 6, 6, 6, 0, 0, 0, 0],
  [0, 0, 0, 5, 8, 5, 8, 5, 6, 5, 6, 5, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 11, 11, 11, 11, 11, 11, 11, 11, 3, 1, 0, 0],
  [0, 0, 1, 11, 11, 1, 1, 1, 1, 1, 1, 11, 11, 1, 0, 0],
  [0, 0, 1, 11, 1, 10, 10, 10, 10, 10, 10, 1, 11, 1, 0, 0],
  [0, 0, 1, 11, 1, 10, 5, 5, 5, 5, 10, 1, 11, 1, 0, 0],
  [0, 0, 1, 11, 11, 1, 10, 10, 10, 10, 1, 11, 11, 1, 0, 0],
  [0, 0, 0, 1, 3, 11, 1, 8, 8, 1, 11, 3, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 2, 3, 3, 8, 8, 3, 3, 8, 8, 3, 2, 1, 0, 0],
  [0, 1, 3, 3, 3, 8, 8, 3, 3, 8, 8, 3, 3, 1, 0, 0],
  [0, 1, 3, 8, 8, 8, 8, 8, 8, 8, 8, 8, 3, 1, 0, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0],
  [0, 1, 4, 4, 1, 0, 0, 0, 0, 0, 0, 1, 4, 4, 1, 0]
];

// Error 404: The Not Found Digital Phantom
const SPRITE_ERROR_404_FRONT = [
  [0, 0, 0, 0, 0, 0, 4, 5, 5, 4, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 4, 12, 12, 12, 12, 4, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 3, 1, 1, 3, 3, 1, 1, 3, 2, 1, 0, 0],
  [0, 0, 1, 2, 3, 12, 1, 3, 3, 12, 1, 3, 2, 1, 0, 0],
  [0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0],
  [0, 0, 0, 1, 2, 3, 1, 1, 1, 1, 3, 2, 1, 0, 0, 0],
  [0, 0, 0, 1, 1, 10, 1, 10, 10, 1, 10, 1, 1, 0, 0, 0],
  [0, 0, 1, 2, 1, 10, 1, 10, 10, 1, 10, 1, 2, 1, 0, 0],
  [0, 1, 2, 3, 1, 1, 1, 1, 1, 1, 1, 1, 3, 2, 1, 0],
  [0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0],
  [0, 1, 4, 4, 12, 12, 4, 4, 12, 12, 4, 4, 4, 1, 0, 0],
  [0, 0, 1, 4, 0, 12, 0, 4, 0, 12, 0, 4, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

// Syntax Error: Jagged Parser Anomaly
const SPRITE_SYNTAX_ERROR_FRONT = [
  [0, 0, 10, 10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 10, 0, 0],
  [0, 8, 10, 10, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 8, 0],
  [0, 0, 8, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 8, 0, 0],
  [0, 0, 0, 1, 2, 11, 11, 11, 11, 11, 11, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 11, 10, 10, 10, 10, 10, 10, 11, 2, 1, 0, 0],
  [0, 0, 1, 11, 10, 8, 1, 10, 10, 1, 8, 10, 11, 1, 0, 0],
  [0, 0, 1, 11, 10, 5, 1, 10, 10, 1, 10, 10, 11, 1, 0, 0],
  [0, 0, 1, 11, 10, 10, 10, 1, 1, 10, 10, 10, 11, 1, 0, 0],
  [0, 0, 0, 1, 11, 1, 5, 1, 1, 5, 1, 11, 1, 0, 0, 0],
  [0, 0, 1, 2, 11, 11, 1, 1, 1, 1, 11, 11, 2, 1, 0, 0],
  [0, 1, 2, 11, 10, 10, 10, 10, 10, 10, 10, 10, 11, 2, 1, 0],
  [0, 1, 11, 10, 10, 8, 8, 8, 8, 10, 10, 10, 10, 11, 1, 0],
  [0, 1, 11, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 11, 1, 0],
  [0, 0, 1, 2, 11, 11, 11, 11, 11, 11, 11, 11, 2, 1, 0, 0],
  [0, 1, 10, 10, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 1, 0],
  [1, 10, 10, 10, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 10, 1]
];

// Error 500: Server Meltdown Golem
const SPRITE_ERROR_500_FRONT = [
  [0, 0, 0, 0, 10, 10, 0, 0, 0, 0, 8, 8, 0, 0, 0, 0],
  [0, 0, 0, 10, 8, 8, 11, 11, 11, 11, 8, 8, 10, 0, 0, 0],
  [0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 3, 3, 3, 3, 3, 3, 2, 2, 1, 0, 0],
  [0, 0, 1, 2, 10, 10, 10, 10, 10, 10, 10, 10, 2, 1, 0, 0],
  [0, 0, 1, 2, 10, 10, 8, 5, 5, 8, 10, 10, 2, 1, 0, 0],
  [0, 0, 1, 2, 10, 10, 8, 8, 8, 8, 10, 10, 2, 1, 0, 0],
  [0, 0, 1, 2, 3, 10, 1, 1, 1, 1, 10, 3, 2, 1, 0, 0],
  [0, 0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 11, 11, 10, 10, 10, 10, 11, 11, 1, 1, 1, 0, 0],
  [0, 1, 11, 10, 10, 8, 8, 8, 8, 10, 10, 11, 1, 0, 0, 0],
  [0, 1, 11, 10, 8, 5, 5, 5, 5, 8, 10, 11, 1, 0, 0, 0],
  [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [0, 0, 1, 2, 2, 1, 0, 0, 0, 0, 1, 2, 2, 1, 0, 0],
  [0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 0]
];

// Null Pointer: Spectre of Void Address
const SPRITE_NULL_POINTER_FRONT = [
  [0, 0, 0, 10, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0],
  [0, 0, 10, 8, 10, 0, 0, 0, 0, 0, 0, 10, 8, 10, 0, 0],
  [0, 0, 0, 10, 1, 10, 0, 0, 0, 0, 10, 1, 10, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 3, 3, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 3, 10, 10, 3, 3, 3, 3, 10, 10, 3, 1, 0, 0],
  [0, 0, 1, 3, 10, 5, 10, 3, 3, 10, 5, 10, 3, 1, 0, 0],
  [0, 0, 1, 3, 10, 10, 3, 3, 3, 3, 10, 10, 3, 1, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 1, 1, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 2, 3, 3, 1, 0, 0, 1, 3, 3, 2, 1, 0, 0],
  [0, 1, 2, 3, 3, 1, 0, 0, 0, 0, 1, 3, 3, 2, 1, 0],
  [0, 1, 2, 3, 1, 0, 0, 0, 0, 0, 0, 1, 3, 2, 1, 0],
  [0, 1, 3, 3, 1, 0, 0, 0, 0, 0, 0, 1, 3, 3, 1, 0],
  [0, 0, 1, 3, 3, 1, 0, 0, 0, 0, 1, 3, 3, 1, 0, 0],
  [0, 0, 1, 4, 0, 4, 1, 0, 0, 1, 4, 0, 4, 1, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0]
];

// Stack Overflow: Recursive Vortex Demon
const SPRITE_STACK_OVERFLOW_FRONT = [
  [0, 0, 0, 0, 0, 0, 12, 12, 12, 12, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 8, 8, 8, 8, 8, 8, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 10, 10, 10, 10, 10, 10, 10, 10, 0, 0, 0, 0],
  [0, 0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0, 0],
  [0, 0, 1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 2, 1, 0, 0],
  [0, 0, 1, 3, 8, 8, 3, 3, 3, 3, 8, 8, 3, 1, 0, 0],
  [0, 0, 1, 3, 8, 12, 8, 3, 3, 8, 12, 8, 3, 1, 0, 0],
  [0, 0, 1, 3, 3, 8, 8, 3, 3, 8, 8, 3, 3, 1, 0, 0],
  [0, 0, 0, 1, 3, 3, 3, 10, 10, 3, 3, 3, 1, 0, 0, 0],
  [0, 0, 1, 1, 10, 10, 10, 10, 10, 10, 10, 10, 1, 1, 0, 0],
  [0, 1, 2, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 2, 1, 0],
  [0, 1, 2, 12, 12, 12, 12, 12, 12, 12, 12, 12, 12, 2, 1, 0],
  [0, 1, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 1, 0],
  [0, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 0],
  [0, 1, 12, 12, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 1, 0],
  [1, 12, 12, 12, 1, 0, 0, 0, 0, 0, 0, 1, 10, 10, 10, 1]
];

// Helper to draw a pixel sprite from an array
function drawPixelSprite(ctx, grid, startX, startY, pixelSize = 2, palette = SPRITE_PALETTE) {
  if (!ctx || !grid || !grid.length) return;
  const pal = palette || SPRITE_PALETTE;
  const rows = grid.length;
  for (let r = 0; r < rows; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const colorIdx = row[c];
      if (colorIdx > 0 && pal[colorIdx]) {
        ctx.fillStyle = pal[colorIdx];
        ctx.fillRect(
          Math.floor(startX + c * pixelSize),
          Math.floor(startY + r * pixelSize),
          pixelSize,
          pixelSize
        );
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 2.5. CRISP PIXEL FONT RENDERER (100% Crisp Integer Grid Text)
// ---------------------------------------------------------------------------
const PIXEL_FONT_3X5 = {
  'A': [0b111, 0b101, 0b111, 0b101, 0b101],
  'B': [0b110, 0b101, 0b110, 0b101, 0b110],
  'C': [0b111, 0b100, 0b100, 0b100, 0b111],
  'D': [0b110, 0b101, 0b101, 0b101, 0b110],
  'E': [0b111, 0b100, 0b110, 0b100, 0b111],
  'F': [0b111, 0b100, 0b110, 0b100, 0b100],
  'G': [0b111, 0b100, 0b101, 0b101, 0b111],
  'H': [0b101, 0b101, 0b111, 0b101, 0b101],
  'I': [0b111, 0b010, 0b010, 0b010, 0b111],
  'J': [0b001, 0b001, 0b001, 0b101, 0b010],
  'K': [0b101, 0b110, 0b100, 0b110, 0b101],
  'L': [0b100, 0b100, 0b100, 0b100, 0b111],
  'M': [0b101, 0b111, 0b101, 0b101, 0b101],
  'N': [0b110, 0b101, 0b101, 0b101, 0b101],
  'O': [0b111, 0b101, 0b101, 0b101, 0b111],
  'P': [0b111, 0b101, 0b111, 0b100, 0b100],
  'Q': [0b111, 0b101, 0b101, 0b111, 0b001],
  'R': [0b111, 0b101, 0b110, 0b101, 0b101],
  'S': [0b111, 0b100, 0b111, 0b001, 0b111],
  'T': [0b111, 0b010, 0b010, 0b010, 0b010],
  'U': [0b101, 0b101, 0b101, 0b101, 0b111],
  'V': [0b101, 0b101, 0b101, 0b101, 0b010],
  'W': [0b101, 0b101, 0b101, 0b111, 0b101],
  'X': [0b101, 0b101, 0b010, 0b101, 0b101],
  'Y': [0b101, 0b101, 0b010, 0b010, 0b010],
  'Z': [0b111, 0b001, 0b010, 0b100, 0b111],
  '0': [0b111, 0b101, 0b101, 0b101, 0b111],
  '1': [0b010, 0b110, 0b010, 0b010, 0b111],
  '2': [0b111, 0b001, 0b111, 0b100, 0b111],
  '3': [0b111, 0b001, 0b111, 0b001, 0b111],
  '4': [0b101, 0b101, 0b111, 0b001, 0b001],
  '5': [0b111, 0b100, 0b111, 0b001, 0b111],
  '6': [0b111, 0b100, 0b111, 0b101, 0b111],
  '7': [0b111, 0b001, 0b010, 0b010, 0b010],
  '8': [0b111, 0b101, 0b111, 0b101, 0b111],
  '9': [0b111, 0b101, 0b111, 0b001, 0b111],
  '/': [0b001, 0b001, 0b010, 0b100, 0b100],
  '-': [0b000, 0b000, 0b111, 0b000, 0b000],
  '+': [0b000, 0b010, 0b111, 0b010, 0b000],
  ':': [0b000, 0b010, 0b000, 0b010, 0b000],
  '.': [0b000, 0b000, 0b000, 0b000, 0b010],
  '!': [0b010, 0b010, 0b010, 0b000, 0b010],
  '?': [0b110, 0b001, 0b010, 0b000, 0b010],
  '>': [0b100, 0b010, 0b001, 0b010, 0b100],
  '<': [0b001, 0b010, 0b100, 0b010, 0b001],
  '_': [0b000, 0b000, 0b000, 0b000, 0b111],
  '*': [0b101, 0b010, 0b111, 0b010, 0b101],
  '%': [0b101, 0b001, 0b010, 0b100, 0b101],
  '(': [0b010, 0b100, 0b100, 0b100, 0b010],
  ')': [0b010, 0b001, 0b001, 0b001, 0b010],
  ' ': [0, 0, 0, 0, 0]
};

function drawPixelText(ctx, text, startX, startY, color = '#ffffff', scale = 1) {
  if (!ctx || text === undefined || text === null) return;
  const str = String(text).toUpperCase();
  ctx.fillStyle = color;
  let curX = Math.round(startX);
  const sY = Math.round(startY);
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const bitmap = PIXEL_FONT_3X5[ch] || PIXEL_FONT_3X5[' '];
    for (let r = 0; r < 5; r++) {
      const row = bitmap[r];
      if (row & 0b100) ctx.fillRect(curX, sY + r * scale, scale, scale);
      if (row & 0b010) ctx.fillRect(curX + scale, sY + r * scale, scale, scale);
      if (row & 0b001) ctx.fillRect(curX + 2 * scale, sY + r * scale, scale, scale);
    }
    curX += 4 * scale; // 3px glyph width + 1px spacing
  }
}

// ---------------------------------------------------------------------------
// 3. BATTLE VISUAL STATE & ANIMATION ENGINE
// ---------------------------------------------------------------------------
const battleVisualState = {
  // HP State with smooth animated transitions
  hp: {
    player: { current: 100, target: 100, max: 100, display: 100 },
    enemy:  { current: 130, target: 130, max: 130, display: 130 }
  },

  // HUD Stats
  points: 0,
  maxPoints: BATTLE_CONFIG.minPoints,
  turnsLeft: BATTLE_CONFIG.turnLimit,
  isGlitching: false,
  isBugmon: false,
  backgroundId: 'cyber_grid',

  // Animation offsets & effects
  player: {
    offsetX: 0,
    offsetY: 0,
    visible: true,
    flashTick: 0
  },
  enemy: {
    offsetX: 0,
    offsetY: 0,
    visible: true,
    flashTick: 0
  },
  screenShake: {
    x: 0,
    y: 0,
    duration: 0
  }
};

// ---------------------------------------------------------------------------
// 4. TYPEWRITER FUNCTION: typeText(message, speed) & showMessage(text)
// ---------------------------------------------------------------------------
let typewriterTimer = null;
let activeTypewriterResolve = null;

function typeText(message, speed = 24) {
  return new Promise((resolve) => {
    const dialogueBox = document.getElementById('battle-dialogue-overlay');
    const textEl = document.getElementById('battle-dialogue-text');

    if (dialogueBox) {
      dialogueBox.classList.add('active');
      // Click on dialogue box instantly completes typing
      dialogueBox.onclick = () => {
        if (typewriterTimer) {
          clearInterval(typewriterTimer);
          typewriterTimer = null;
          if (textEl) textEl.textContent = message;
          if (activeTypewriterResolve) {
            const res = activeTypewriterResolve;
            activeTypewriterResolve = null;
            res();
          }
        }
      };
    }

    if (!textEl) {
      resolve();
      return;
    }

    // Clear any previous typewriter job
    if (typewriterTimer) {
      clearInterval(typewriterTimer);
      typewriterTimer = null;
    }
    if (activeTypewriterResolve) {
      activeTypewriterResolve();
      activeTypewriterResolve = null;
    }

    activeTypewriterResolve = resolve;
    textEl.textContent = '';
    let idx = 0;

    typewriterTimer = setInterval(() => {
      if (idx < message.length) {
        textEl.textContent += message[idx];
        idx++;
      } else {
        clearInterval(typewriterTimer);
        typewriterTimer = null;
        activeTypewriterResolve = null;
        resolve();
      }
    }, speed);
  });
}

function showMessage(text) {
  return typeText(text);
}

// ---------------------------------------------------------------------------
// 5. HP BARS & setHp(target, current, max) WITH SMOOTH ANIMATION
// ---------------------------------------------------------------------------
function setHp(target, current, max, immediate = false) {
  return new Promise((resolve) => {
    const key = (target === 'player' || target === 'enemy') ? target : 'player';
    const hp = battleVisualState.hp[key];
    
    if (typeof max === 'number' && max > 0) {
      hp.max = max;
    }
    hp.target = Math.max(0, Math.min(current, hp.max));

    if (immediate) {
      hp.current = hp.target;
      hp.display = hp.target;
      resolve();
      return;
    }

    // Update global gameState if present
    if (window.gameState) {
      if (key === 'player' && window.gameState.player) {
        window.gameState.player.hp = hp.target;
        window.gameState.player.maxHp = hp.max;
      } else if (key === 'enemy' && window.gameState.enemy) {
        window.gameState.enemy.hp = hp.target;
        window.gameState.enemy.maxHp = hp.max;
      }
    }

    // Wait until display catches up to target
    let safetyCounter = 0;
    const checkInterval = setInterval(() => {
      safetyCounter++;
      const diff = hp.target - hp.display;
      if (Math.abs(diff) > 0.4) {
        hp.display += diff * 0.25;
      }
      if (Math.abs(hp.display - hp.target) < 0.5 || safetyCounter > 25) {
        hp.display = hp.target;
        hp.current = hp.target;
        clearInterval(checkInterval);
        resolve();
      }
    }, 30);
  });
}

// Helper to determine HP bar color strictly using Game Boy Palette
function getHpColor(percentage) {
  if (percentage > 0.50) {
    return '#38b764'; // High: --gb-green
  } else if (percentage >= 0.20) {
    return '#f4b41b'; // Medium: --gb-yellow
  } else {
    return '#e03c3c'; // Low: --gb-red
  }
}

// ---------------------------------------------------------------------------
// 6. HUD STRIP UPDATE: POINTS & TURNS LEFT
// ---------------------------------------------------------------------------
function updateHud(points, turnsLeft) {
  const minPts = (typeof BATTLE_CONFIG !== 'undefined' && BATTLE_CONFIG.minPoints) || 120;

  if (typeof points === 'number') {
    const prevPoints = battleVisualState.points;
    battleVisualState.points = points;
    const ptsEl = document.getElementById('hud-points-val');
    if (ptsEl) {
      ptsEl.textContent = `${points} / ${minPts}`;

      // Pop animation on points update
      if (points !== prevPoints) {
        ptsEl.classList.remove('hud-pop');
        void ptsEl.offsetWidth; // Force DOM reflow to restart CSS animation
        ptsEl.classList.add('hud-pop');
      }
    }

    // Thin progress bar under HUD points showing progress toward minimum (120)
    const barFill = document.getElementById('hud-points-bar-fill');
    if (barFill) {
      const pct = Math.min(100, Math.round((points / minPts) * 100));
      barFill.style.width = `${pct}%`;
      if (points >= minPts) {
        barFill.classList.add('target-reached');
      } else {
        barFill.classList.remove('target-reached');
      }
    }

    if (window.gameState) {
      window.gameState.score = points;
    }
  }

  if (typeof turnsLeft === 'number') {
    battleVisualState.turnsLeft = turnsLeft;
    const turnsEl = document.getElementById('hud-turns-val');
    if (turnsEl) {
      turnsEl.textContent = `${turnsLeft}`;
      // When 2 turns remain, make the counter blink red as a warning
      if (turnsLeft <= 2) {
        turnsEl.className = 'turn-blink-red font-pixel';
        if (turnsEl.classList && turnsEl.classList.add) {
          turnsEl.classList.add('turn-blink-red');
        }
      } else if (turnsLeft <= 4) {
        turnsEl.className = 'text-yellow font-pixel';
        if (turnsEl.classList && turnsEl.classList.remove) {
          turnsEl.classList.remove('turn-blink-red');
        }
      } else {
        turnsEl.className = 'text-green font-pixel';
        if (turnsEl.classList && turnsEl.classList.remove) {
          turnsEl.classList.remove('turn-blink-red');
        }
      }
    }
    if (window.gameState) {
      window.gameState.turnsLeft = turnsLeft;
    }
  }
}

// ---------------------------------------------------------------------------
// 7. ATTACK & HIT ANIMATIONS
// ---------------------------------------------------------------------------

/**
 * playAttackAnimation(attacker)
 * Lunges the attacking codemon forward and snaps back
 */
function playAttackAnimation(attacker) {
  if (window.playSound) {
    window.playSound('battle');
  }

  return new Promise((resolve) => {
    const isPlayer = attacker === 'player';
    const targetObj = isPlayer ? battleVisualState.player : battleVisualState.enemy;
    const dirX = isPlayer ? 14 : -14;
    const dirY = isPlayer ? -8 : 8;

    if (!isPlayer) {
      battleVisualState.isEnemyAttacking = true;
      if (typeof window !== 'undefined' && window.gameState) {
        window.gameState.isEnemyAttacking = true;
      }
    }

    const startTime = performance.now();
    const duration = 280; // ms

    function animateAttack(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress < 0.4) {
        // Lunge forward
        const subP = progress / 0.4;
        targetObj.offsetX = dirX * subP;
        targetObj.offsetY = dirY * subP;
      } else if (progress < 0.7) {
        // Strike hold
        targetObj.offsetX = dirX;
        targetObj.offsetY = dirY;
      } else {
        // Return to base position
        const subP = (progress - 0.7) / 0.3;
        targetObj.offsetX = dirX * (1 - subP);
        targetObj.offsetY = dirY * (1 - subP);
      }

      if (progress < 1) {
        requestAnimationFrame(animateAttack);
      } else {
        targetObj.offsetX = 0;
        targetObj.offsetY = 0;
        if (!isPlayer) {
          battleVisualState.isEnemyAttacking = false;
          if (typeof window !== 'undefined' && window.gameState) {
            window.gameState.isEnemyAttacking = false;
          }
        }
        resolve();
      }
    }

    requestAnimationFrame(animateAttack);
  });
}

/**
 * showFloatingDamage(target, damage, isHeavy = false)
 * Appends floating combat damage/heal text that rises and fades over the sprite.
 */
function showFloatingDamage(target, damage, isHeavy = false) {
  if (typeof document === 'undefined') return;
  const layer = document.getElementById('combat-floating-damage-layer');
  if (!layer) return;

  const dmgEl = document.createElement('div');
  const isHeal = typeof damage === 'string' && damage.startsWith('+');
  dmgEl.className = `combat-floating-damage ${isHeal ? 'heal' : (isHeavy ? 'heavy' : '')}`;
  dmgEl.textContent = isHeal ? damage : `-${damage}`;

  // Position relative to target sprite on 160x144 canvas viewport
  if (target === 'player') {
    dmgEl.style.left = '26%';
    dmgEl.style.top = '60%';
  } else {
    dmgEl.style.left = '74%';
    dmgEl.style.top = '22%';
  }

  layer.appendChild(dmgEl);

  const detachDmg = () => {
    try {
      if (typeof dmgEl.remove === 'function') {
        dmgEl.remove();
      } else if (dmgEl.parentNode && typeof dmgEl.parentNode.removeChild === 'function') {
        dmgEl.parentNode.removeChild(dmgEl);
      }
    } catch {
      // Element already removed
    }
  };

  if (typeof dmgEl.addEventListener === 'function') {
    dmgEl.addEventListener('animationend', detachDmg);
  }
  setTimeout(detachDmg, 1000);
}

function showFloatingHeal(target = 'player', amount = 10) {
  showFloatingDamage(target, `+${amount}`);
}

/**
 * triggerHeavyScreenShake()
 * Triggers a pronounced screen shake on #canvas-frame on heavy hits.
 */
function triggerHeavyScreenShake() {
  if (typeof document === 'undefined') return;
  if (window.isEffectsDisabled && window.isEffectsDisabled()) return;

  const canvasFrame = document.getElementById('canvas-frame');
  if (canvasFrame) {
    canvasFrame.classList.remove('screen-shake-heavy');
    void canvasFrame.offsetWidth;
    canvasFrame.classList.add('screen-shake-heavy');
    setTimeout(() => {
      canvasFrame.classList.remove('screen-shake-heavy');
    }, 450);
  }
}

/**
 * playHitAnimation(target, damage = null, isHeavy = false)
 * Shakes target codemon and flashes visibility + triggers screen shake and floating damage
 */
function playHitAnimation(target, damage = null, isHeavy = false) {
  if (window.playSound) {
    window.playSound('hit');
  }

  // Floating damage number over target sprite
  if (damage !== null && typeof damage === 'number' && damage > 0) {
    showFloatingDamage(target, damage, isHeavy);
  }

  // Heavy hit screen shake
  if (isHeavy) {
    triggerHeavyScreenShake();
  }

  const isEffectsOff = (window.isEffectsDisabled && window.isEffectsDisabled());

  return new Promise((resolve) => {
    const isPlayer = target === 'player';
    const targetObj = isPlayer ? battleVisualState.player : battleVisualState.enemy;

    const startTime = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    const duration = isEffectsOff ? 150 : 380; // ms

    function animateHit(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      if (progress < 1) {
        if (!isEffectsOff) {
          // Rapid flash toggle
          targetObj.visible = Math.floor(elapsed / 45) % 2 === 0;

          // Horizontal jitter
          targetObj.offsetX = (Math.random() - 0.5) * (isHeavy ? 10 : 6);
          targetObj.offsetY = (Math.random() - 0.5) * 2;

          // Screen shake
          battleVisualState.screenShake.x = (Math.random() - 0.5) * (isHeavy ? 8 : 4);
          battleVisualState.screenShake.y = (Math.random() - 0.5) * (isHeavy ? 4 : 2);
        }

        requestAnimationFrame(animateHit);
      } else {
        targetObj.visible = true;
        targetObj.offsetX = 0;
        targetObj.offsetY = 0;
        battleVisualState.screenShake.x = 0;
        battleVisualState.screenShake.y = 0;
        resolve();
      }
    }

    requestAnimationFrame(animateHit);
  });
}

// ---------------------------------------------------------------------------
// 7.5. 10 RETRO / CYBER ARENA BACKGROUNDS WITH SCARY BUGMON VARIANTS
// ---------------------------------------------------------------------------
const BATTLE_BACKGROUNDS = [
  // 1. CYBER MATRIX / GLITCH VOID
  {
    id: 'cyber_grid',
    name: 'CYBER MATRIX',
    bugmonName: 'GLITCH VOID',
    description: 'Tron holographic grid arena / Broken corrupted glitch dimension',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Upper Backdrop
        ctx.fillStyle = '#0c1015';
        ctx.fillRect(0, 0, width, 58);
        ctx.fillStyle = '#1b2632';
        for (let y = 6; y < 58; y += 8) ctx.fillRect(0, y, width, 1);
        for (let x = 16; x < width; x += 24) ctx.fillRect(x, 0, 1, 58);
        // Downward data pulses
        ctx.fillStyle = '#38bdf8';
        for (let x = 16; x < width; x += 48) {
          const py = Math.floor((animTick * 1.2 + x) % 54);
          ctx.fillRect(x - 1, py, 3, 2);
        }
        // Horizon
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, 58, width, 2);
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(40, 58, 80, 1);
        // Floor
        ctx.fillStyle = '#1b2632';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#2c3e50';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60);
          ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#2c3e50';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1b2632'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#2c3e50'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#1b2632'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#38b764'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: GLITCH VOID
        ctx.fillStyle = '#180206';
        ctx.fillRect(0, 0, width, 58);
        // Jagged glitch scanlines with horizontal jitter
        ctx.fillStyle = '#42060e';
        for (let y = 4; y < 58; y += 6) {
          const shift = Math.floor(Math.sin(animTick * 0.2 + y) * 3);
          ctx.fillRect(shift, y, width, 1);
        }
        // Bloody slash rifts across backdrop
        ctx.strokeStyle = '#941e1e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(15, 8); ctx.lineTo(65, 48);
        ctx.moveTo(105, 12); ctx.lineTo(152, 44);
        ctx.stroke();
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(17, 9); ctx.lineTo(67, 49);
        ctx.moveTo(106, 13); ctx.lineTo(153, 45);
        ctx.stroke();
        // Floating glitch blood blocks
        ctx.fillStyle = '#e03c3c';
        for (let i = 0; i < 4; i++) {
          const gx = 25 + i * 35;
          const gy = Math.floor((52 - (animTick * 1.5 + i * 14)) % 52);
          ctx.fillRect(gx, gy, 3, 3);
        }
        // Horizon: Blazing laser red
        ctx.fillStyle = '#941e1e'; ctx.fillRect(0, 58, width, 2);
        ctx.fillStyle = '#ff0033'; ctx.fillRect(0, 58, width, 1);
        // Floor
        ctx.fillStyle = '#26050e'; ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#5e101a';
        horizLines.forEach((hy, idx) => {
          if (idx % 2 === 0) {
            ctx.fillRect(0, hy, width, 1);
          } else {
            for (let dx = 0; dx < width; dx += 12) ctx.fillRect(dx, hy, 7, 1);
          }
        });
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60);
          ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#5e101a';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums with dripping glitch blood edges
        ctx.fillStyle = '#540d1a'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#2a040d'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff0055'; ctx.fillRect(96, 56, 54, 2);
        // Blood drips from enemy platform
        ctx.fillRect(104, 58, 2, 4);
        ctx.fillRect(122, 58, 2, 5);
        ctx.fillRect(138, 58, 2, 3);
        // Player platform corrupted
        ctx.fillStyle = '#421017'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#20080c'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#e03c3c'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 2. SERVER CORE / MELTDOWN CORE
  {
    id: 'server_core',
    name: 'SERVER CORE',
    bugmonName: 'MELTDOWN CORE',
    description: 'Enterprise datacenter server racks / Catastrophic nuclear core meltdown',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Backdrop
        ctx.fillStyle = '#080e16';
        ctx.fillRect(0, 0, width, 58);
        // 4 Server Rack Towers
        const racks = [6, 42, 78, 118];
        racks.forEach((rx, idx) => {
          ctx.fillStyle = '#131e2b';
          ctx.fillRect(rx, 2, 34, 56);
          ctx.fillStyle = '#0a1017';
          ctx.fillRect(rx + 2, 4, 30, 52);
          // Blades & Blinking LEDs
          for (let by = 8; by < 52; by += 7) {
            ctx.fillStyle = '#192635';
            ctx.fillRect(rx + 4, by, 26, 4);
            const ledColor = ((animTick + idx * 7 + by) % 40 < 20) ? '#38b764' : '#38bdf8';
            ctx.fillStyle = ledColor;
            ctx.fillRect(rx + 6, by + 1, 2, 2);
            ctx.fillStyle = '#ffb86c';
            ctx.fillRect(rx + 10, by + 1, 2, 2);
          }
        });
        // Horizon: Industrial Steel with hazard chevrons
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 58, width, 2);
        for (let hx = 0; hx < width; hx += 16) {
          ctx.fillStyle = '#facc15';
          ctx.fillRect(hx, 58, 4, 2);
        }
        // Floor: Industrial Tiles
        ctx.fillStyle = '#0e1620';
        ctx.fillRect(0, 60, width, 84);
        ctx.fillStyle = '#1c2838';
        for (let fy = 66; fy < 144; fy += 12) ctx.fillRect(0, fy, width, 1);
        for (let fx = 10; fx < 160; fx += 24) ctx.fillRect(fx, 60, 1, 84);
        // Podiums
        ctx.fillStyle = '#223242'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#16222e'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#00f0ff'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#223242'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#16222e'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: MELTDOWN CORE
        ctx.fillStyle = '#220406';
        ctx.fillRect(0, 0, width, 58);
        // Warped burning server racks
        const racks = [6, 42, 78, 118];
        racks.forEach((rx) => {
          ctx.fillStyle = '#36090d';
          ctx.fillRect(rx, 4, 34, 54);
          ctx.fillStyle = '#1a0305';
          ctx.fillRect(rx + 2, 6, 30, 50);
          // Exposed glowing red-hot coils
          for (let by = 9; by < 50; by += 8) {
            ctx.fillStyle = '#ff2200';
            ctx.fillRect(rx + 4, by, 26, 4);
            ctx.fillStyle = '#ff8800';
            ctx.fillRect(rx + 8, by + 1, 16, 2);
          }
        });
        // Pulsing Emergency Strobe Light at top center
        const strobe = Math.floor(animTick / 10) % 2 === 0;
        if (strobe) {
          ctx.fillStyle = '#ff0033';
          ctx.fillRect(72, 2, 16, 4);
          ctx.fillStyle = 'rgba(255, 0, 51, 0.2)';
          ctx.fillRect(0, 0, width, 58);
        }
        // Floating spark particles
        ctx.fillStyle = '#ffcc00';
        for (let sp = 0; sp < 6; sp++) {
          const sx = (sp * 27 + animTick * 2) % width;
          const sy = (56 - (animTick * 2.5 + sp * 9) % 52);
          ctx.fillRect(sx, sy, 2, 2);
        }
        // Horizon: Molten dripping metal
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(0, 58, width, 2);
        ctx.fillStyle = '#ff8800';
        ctx.fillRect(20, 58, 120, 1);
        // Floor: Charred cracked magma ground
        ctx.fillStyle = '#170305';
        ctx.fillRect(0, 60, width, 84);
        ctx.fillStyle = '#420a0e';
        for (let fy = 66; fy < 144; fy += 14) ctx.fillRect(0, fy, width, 1);
        // Magma fissures
        ctx.strokeStyle = '#ff2200';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(10, 68); ctx.lineTo(40, 92); ctx.lineTo(30, 140);
        ctx.moveTo(90, 62); ctx.lineTo(120, 98); ctx.lineTo(145, 135);
        ctx.stroke();
        // Podiums
        ctx.fillStyle = '#4a0d11'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#240407'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff2a00'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#380a0e'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#1c0407'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#ff5500'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 3. NEON SKYLINE / BLOOD MOON METROPOLIS
  {
    id: 'neon_skyline',
    name: 'NEON SKYLINE',
    bugmonName: 'BLOOD MOON METROPOLIS',
    description: 'Synthwave cyberpunk metropolis / Cursed Blood Moon eclipse',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Twilight Synthwave Sky
        ctx.fillStyle = '#0a0b1e';
        ctx.fillRect(0, 0, width, 30);
        ctx.fillStyle = '#1e0e33';
        ctx.fillRect(0, 30, width, 28);
        // Synthwave Sun on horizon
        ctx.fillStyle = '#ff007f';
        ctx.beginPath();
        ctx.arc(80, 58, 20, Math.PI, 0, false);
        ctx.fill();
        ctx.fillStyle = '#ffbe0b';
        ctx.beginPath();
        ctx.arc(80, 58, 14, Math.PI, 0, false);
        ctx.fill();
        // Sun horizontal laser cutouts
        ctx.fillStyle = '#1e0e33';
        ctx.fillRect(60, 48, 40, 1);
        ctx.fillRect(63, 52, 34, 1);
        ctx.fillRect(65, 55, 30, 1);
        // Skyscrapers
        const towers = [
          { x: 4, w: 18, h: 36 },
          { x: 26, w: 16, h: 48 },
          { x: 46, w: 14, h: 32 },
          { x: 104, w: 16, h: 42 },
          { x: 124, w: 20, h: 50 },
          { x: 148, w: 12, h: 34 }
        ];
        towers.forEach(t => {
          ctx.fillStyle = '#120722';
          ctx.fillRect(t.x, 58 - t.h, t.w, t.h);
          ctx.fillStyle = '#ff007f';
          ctx.fillRect(t.x, 58 - t.h, t.w, 1);
          // Windows
          for (let wy = 58 - t.h + 4; wy < 56; wy += 5) {
            ctx.fillStyle = (wy % 10 === 0) ? '#38bdf8' : '#facc15';
            ctx.fillRect(t.x + 3, wy, 2, 2);
            ctx.fillRect(t.x + t.w - 5, wy, 2, 2);
          }
        });
        // Horizon: Neon purple
        ctx.fillStyle = '#a239ca';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Synthwave Grid
        ctx.fillStyle = '#130620';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#ff007f';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60);
          ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#a239ca';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#2c0e42'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#190629'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff007f'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#2c0e42'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#190629'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#00f3ff'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: BLOOD MOON METROPOLIS
        ctx.fillStyle = '#0a0104';
        ctx.fillRect(0, 0, width, 58);
        // Blood Moon with evil slit pupil
        ctx.fillStyle = '#b3001e';
        ctx.beginPath();
        ctx.arc(80, 26, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ff1144';
        ctx.beginPath();
        ctx.arc(80, 26, 12, 0, Math.PI * 2);
        ctx.fill();
        // Demonic Slit Pupil
        const pupilWidth = 2 + Math.sin(animTick * 0.1);
        ctx.fillStyle = '#000000';
        ctx.fillRect(80 - pupilWidth / 2, 16, pupilWidth, 20);
        // Blood Rain streaks
        ctx.fillStyle = '#ff0033';
        for (let r = 0; r < 8; r++) {
          const rx = (r * 21 + animTick * 2) % width;
          const ry = (animTick * 3 + r * 13) % 56;
          ctx.fillRect(rx, ry, 1, 4);
        }
        // Blackened ruined skyscrapers with glowing red evil eyes
        const towers = [
          { x: 4, w: 18, h: 36 },
          { x: 26, w: 16, h: 48 },
          { x: 46, w: 14, h: 32 },
          { x: 104, w: 16, h: 42 },
          { x: 124, w: 20, h: 50 },
          { x: 148, w: 12, h: 34 }
        ];
        towers.forEach(t => {
          ctx.fillStyle = '#140306';
          ctx.fillRect(t.x, 58 - t.h, t.w, t.h);
          // Glowing red eye pair
          ctx.fillStyle = '#ff0033';
          ctx.fillRect(t.x + 4, 58 - t.h + 8, 2, 2);
          ctx.fillRect(t.x + 8, 58 - t.h + 8, 2, 2);
        });
        // Horizon: Blood red
        ctx.fillStyle = '#7a0014';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Bleeding Obsidian
        ctx.fillStyle = '#140206';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#800a16';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60);
          ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#800a16';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#420812'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#210307'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff0033'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#38060f'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#1c0206'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#e03c3c'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 4. CIRCUIT MOTHERBOARD / BURNT SILICON
  {
    id: 'motherboard',
    name: 'CIRCUIT MOTHERBOARD',
    bugmonName: 'BURNT SILICON',
    description: 'Emerald PCB copper traces / Fried short-circuit silicon disaster',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // PCB Emerald Green Backdrop
        ctx.fillStyle = '#061e14';
        ctx.fillRect(0, 0, width, 58);
        // Copper circuit tracks
        ctx.strokeStyle = '#c59b27';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, 16); ctx.lineTo(35, 16); ctx.lineTo(55, 36); ctx.lineTo(95, 36);
        ctx.moveTo(160, 12); ctx.lineTo(130, 12); ctx.lineTo(110, 32); ctx.lineTo(80, 32);
        ctx.moveTo(40, 0); ctx.lineTo(40, 20); ctx.lineTo(60, 40); ctx.lineTo(60, 58);
        ctx.stroke();
        // Solder vias (gold pads)
        const vias = [[35, 16], [55, 36], [130, 12], [110, 32], [60, 40]];
        vias.forEach(v => {
          ctx.fillStyle = '#e6b800';
          ctx.fillRect(v[0] - 1, v[1] - 1, 3, 3);
          ctx.fillStyle = '#061e14';
          ctx.fillRect(v[0], v[1], 1, 1);
        });
        // IC Surface-Mount Chips
        ctx.fillStyle = '#153828';
        ctx.fillRect(10, 24, 18, 14);
        ctx.fillRect(130, 20, 20, 16);
        ctx.fillStyle = '#94a3b8';
        for (let px = 12; px < 26; px += 4) {
          ctx.fillRect(px, 22, 2, 2);
          ctx.fillRect(px, 38, 2, 2);
        }
        // Glowing data packet moving on trace
        const packetX = Math.floor((animTick * 1.5) % 95);
        ctx.fillStyle = '#38b764';
        ctx.fillRect(packetX, (packetX < 35) ? 15 : (packetX < 55) ? 15 + (packetX - 35) : 35, 3, 3);
        // Horizon: Gold Edge Connector Bus
        ctx.fillStyle = '#c59b27';
        ctx.fillRect(0, 58, width, 2);
        for (let ex = 4; ex < width; ex += 8) {
          ctx.fillStyle = '#e6b800';
          ctx.fillRect(ex, 58, 4, 2);
        }
        // Floor: PCB Substrate with ground plane
        ctx.fillStyle = '#041710';
        ctx.fillRect(0, 60, width, 84);
        ctx.strokeStyle = '#184e36';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = 12; gx < width; gx += 20) {
          ctx.moveTo(gx, 60); ctx.lineTo(gx, 144);
        }
        ctx.stroke();
        // Podiums
        ctx.fillStyle = '#0c3826'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#062418'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#e6b800'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#0c3826'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#062418'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#28c76f'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: BURNT SILICON
        ctx.fillStyle = '#140805';
        ctx.fillRect(0, 0, width, 58);
        // Melted severed traces glowing molten orange
        ctx.strokeStyle = '#ff4400';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 16); ctx.lineTo(30, 16);
        ctx.moveTo(60, 36); ctx.lineTo(95, 36);
        ctx.moveTo(160, 12); ctx.lineTo(135, 12);
        ctx.stroke();
        // Electric Sparks snapping at gap
        if (Math.floor(animTick / 6) % 2 === 0) {
          ctx.strokeStyle = '#cc44ff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(30, 16); ctx.lineTo(45, 26); ctx.lineTo(60, 36);
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(44, 25, 3, 3);
        }
        // Scorched blown chips
        ctx.fillStyle = '#2b1009';
        ctx.fillRect(10, 24, 18, 14);
        ctx.fillRect(130, 20, 20, 16);
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(16, 28, 6, 6);
        // Horizon: Molten solder
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Charred blackened substrate
        ctx.fillStyle = '#100504';
        ctx.fillRect(0, 60, width, 84);
        ctx.strokeStyle = '#42140c';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let gx = 12; gx < width; gx += 20) {
          ctx.moveTo(gx, 60); ctx.lineTo(gx, 144);
        }
        ctx.stroke();
        // Molten cracks
        ctx.strokeStyle = '#ff5500';
        ctx.beginPath();
        ctx.moveTo(25, 75); ctx.lineTo(55, 110);
        ctx.moveTo(115, 68); ctx.lineTo(135, 95); ctx.lineTo(125, 130);
        ctx.stroke();
        // Podiums
        ctx.fillStyle = '#3d120a'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1f0804'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff4500'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#301009'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#170604'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#ff7700'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 5. DEEP TERMINAL / KERNEL PANIC VOID
  {
    id: 'deep_terminal',
    name: 'DEEP TERMINAL',
    bugmonName: 'KERNEL PANIC VOID',
    description: 'Amber phosphor CRT hacker terminal / Fatal Kernel Panic crash void',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Amber phosphor CRT Screen
        ctx.fillStyle = '#0f0c05';
        ctx.fillRect(0, 0, width, 58);
        // Amber CRT Scanlines
        ctx.fillStyle = '#1c1507';
        for (let y = 3; y < 58; y += 4) ctx.fillRect(0, y, width, 1);
        // Cascading Hex & Code stream
        ctx.font = '7px monospace';
        ctx.fillStyle = '#92400e';
        ctx.fillText('0x7F MOV EAX, 1', 8, 12);
        ctx.fillText('0x80 CMP EDX, 0', 8, 22);
        ctx.fillText('0x84 JNZ 0x00FF', 8, 32);
        ctx.fillText('0x88 RET CODE', 8, 42);
        ctx.fillStyle = '#d97706';
        ctx.fillText('> SANDBOX_ACTIVE', 80, 18);
        // Blinking amber cursor
        if (Math.floor(animTick / 16) % 2 === 0) {
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(152, 18, 4, 7);
        }
        // Horizon: Amber Beam
        ctx.fillStyle = '#d97706';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Amber raster floor
        ctx.fillStyle = '#1c1407';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#b45309';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60); ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#78350f';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#362208'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1e1304'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#362208'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#1e1304'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#fbbf24'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: KERNEL PANIC VOID
        ctx.fillStyle = '#060102';
        ctx.fillRect(0, 0, width, 58);
        // Glitching red scanlines with jitter
        ctx.fillStyle = '#3b060d';
        for (let y = 3; y < 58; y += 4) {
          const jx = Math.floor(Math.sin(animTick * 0.3 + y) * 4);
          ctx.fillRect(jx, y, width, 1);
        }
        // Panic text crash dump
        ctx.font = '7px monospace';
        ctx.fillStyle = '#ef4444';
        ctx.fillText('⚠ KERNEL PANIC ⚠', 12, 12);
        ctx.fillText('FATAL TRAP 12: 0xDEAD', 12, 22);
        ctx.fillText('MEMORY PURGATORY DUMP', 12, 32);
        ctx.fillStyle = '#ff0033';
        ctx.fillText('SYSTEM HALTED: BUGMON', 12, 44);
        // Horizon: Broken red fracture
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Corrupted red raster
        ctx.fillStyle = '#140205';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#7f1d1d';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60); ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#5e101a';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#3d080e'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1f0307'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff0055'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#30080e'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#180306'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 6. DATABASE VAULT / CORRUPTED VAULT
  {
    id: 'database_vault',
    name: 'DATABASE VAULT',
    bugmonName: 'CORRUPTED VAULT',
    description: 'SQL storage silos / Malicious SQL injection corruption breach',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Vault Chamber
        ctx.fillStyle = '#06111e';
        ctx.fillRect(0, 0, width, 58);
        // 3 Cylindrical Storage Silos
        const silos = [14, 64, 114];
        silos.forEach(sx => {
          ctx.fillStyle = '#13283f';
          ctx.fillRect(sx, 4, 32, 52);
          ctx.fillStyle = '#0b1928';
          ctx.fillRect(sx + 3, 6, 26, 48);
          // Glowing storage rings
          ctx.fillStyle = '#0ea5e9';
          ctx.fillRect(sx + 5, 14, 22, 2);
          ctx.fillRect(sx + 5, 28, 22, 2);
          ctx.fillRect(sx + 5, 42, 22, 2);
        });
        // Horizon: Bulkhead Girder
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Relational Hex Grid
        ctx.fillStyle = '#0a1829';
        ctx.fillRect(0, 60, width, 84);
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let fy = 66; fy < 144; fy += 14) {
          ctx.moveTo(0, fy); ctx.lineTo(width, fy);
        }
        for (let fx = 15; fx < width; fx += 26) {
          ctx.moveTo(fx, 60); ctx.lineTo(fx, 144);
        }
        ctx.stroke();
        // Podiums
        ctx.fillStyle = '#142f4d'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#0b1d30'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#142f4d'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#0b1d30'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#10b981'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: CORRUPTED VAULT
        ctx.fillStyle = '#14031f';
        ctx.fillRect(0, 0, width, 58);
        // Ruptured Silos leaking purple ooze
        const silos = [14, 64, 114];
        silos.forEach((sx, idx) => {
          ctx.fillStyle = '#29073e';
          ctx.fillRect(sx, 4, 32, 52);
          ctx.fillStyle = '#13021f';
          ctx.fillRect(sx + 3, 6, 26, 48);
          // Cracked ruptured rings
          ctx.fillStyle = '#c084fc';
          ctx.fillRect(sx + 5, 14, 10, 2);
          ctx.fillRect(sx + 18, 15, 9, 2);
          // Purple ooze dripping down
          ctx.fillStyle = '#9333ea';
          ctx.fillRect(sx + 14, 18, 4, 20 + idx * 6);
        });
        // Floating SQL Corruption Warnings
        ctx.font = '7px monospace';
        ctx.fillStyle = '#e879f9';
        ctx.fillText('DROP TABLE *', 24, 10);
        ctx.fillText('CORRUPT PAGE', 92, 10);
        // Horizon: Corroded toxic purple girder
        ctx.fillStyle = '#581c87';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Toxic Sludge Pool
        ctx.fillStyle = '#180424';
        ctx.fillRect(0, 60, width, 84);
        ctx.strokeStyle = '#6b21a8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let fy = 66; fy < 144; fy += 14) {
          ctx.moveTo(0, fy); ctx.lineTo(width, fy);
        }
        ctx.stroke();
        // Bubbling purple toxic hazard puddles
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(25, 80, 24, 6);
        ctx.fillRect(105, 105, 30, 8);
        // Podiums
        ctx.fillStyle = '#3b0b52'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1a0424'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#d946ef'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#2a083a'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#14031d'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#c084fc'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 7. CLOUD CLUSTER / STORM OVERFLOW
  {
    id: 'cloud_tempest',
    name: 'CLOUD CLUSTER',
    bugmonName: 'STORM OVERFLOW',
    description: 'Digital cloud datacenter / Demonic atmospheric tempest with lightning',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // High Altitude Sky
        ctx.fillStyle = '#071424';
        ctx.fillRect(0, 0, width, 58);
        // Layered Drifting Clouds
        const cloudShift = Math.floor(animTick * 0.4) % 160;
        ctx.fillStyle = '#0f2742';
        ctx.beginPath();
        ctx.arc((cloudShift + 20) % 180 - 10, 24, 18, 0, Math.PI * 2);
        ctx.arc((cloudShift + 50) % 180 - 10, 20, 24, 0, Math.PI * 2);
        ctx.arc((cloudShift + 85) % 180 - 10, 26, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a3e63';
        ctx.beginPath();
        ctx.arc((cloudShift + 120) % 180 - 10, 32, 22, 0, Math.PI * 2);
        ctx.arc((cloudShift + 155) % 180 - 10, 28, 26, 0, Math.PI * 2);
        ctx.fill();
        // Cyan cloud illumination pulse
        if (animTick % 80 < 8) {
          ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.fillRect(0, 0, width, 58);
        }
        // Horizon: Cloud Bank line
        ctx.fillStyle = '#25527a';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Aerodynamic Stratosphere Deck
        ctx.fillStyle = '#0c1f33';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#1e4875';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60); ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#1e4875';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#183c61'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#0d2238'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#00f0ff'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#183c61'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#0d2238'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: STORM OVERFLOW
        ctx.fillStyle = '#0f0217';
        ctx.fillRect(0, 0, width, 58);
        // Turbulent Dark Violet Storm Clouds
        ctx.fillStyle = '#250533';
        ctx.beginPath();
        ctx.arc(35, 24, 26, 0, Math.PI * 2);
        ctx.arc(85, 18, 32, 0, Math.PI * 2);
        ctx.arc(135, 24, 28, 0, Math.PI * 2);
        ctx.fill();
        // Sinister Glowing Red Eyes hiding in storm clouds
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(36, 18, 2, 2); ctx.fillRect(41, 18, 2, 2);
        ctx.fillRect(126, 22, 2, 2); ctx.fillRect(131, 22, 2, 2);
        // Violent Lightning Strike
        const isLightning = (animTick % 36 < 6);
        if (isLightning) {
          ctx.strokeStyle = '#ff0055';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(85, 0); ctx.lineTo(75, 22); ctx.lineTo(92, 28); ctx.lineTo(82, 58);
          ctx.stroke();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(86, 0); ctx.lineTo(76, 22); ctx.lineTo(93, 28); ctx.lineTo(83, 58);
          ctx.stroke();
          ctx.fillStyle = 'rgba(255, 0, 85, 0.2)';
          ctx.fillRect(0, 0, width, height);
        }
        // Torrential Digital Rain
        ctx.fillStyle = '#7a1239';
        for (let r = 0; r < 7; r++) {
          const rx = (r * 24 + animTick * 3) % width;
          const ry = (animTick * 4 + r * 11) % 56;
          ctx.fillRect(rx, ry, 1, 5);
        }
        // Horizon: Thunderhead Rim
        ctx.fillStyle = '#6b0f85';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Electric Abyss Floor
        ctx.fillStyle = '#160421';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#4c0e63';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        // Crackling lightning lines on floor
        ctx.strokeStyle = '#a855f7';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(40, 62); ctx.lineTo(55, 95); ctx.lineTo(70, 140);
        ctx.stroke();
        // Podiums
        ctx.fillStyle = '#3a0847'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1b0321'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff0055'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#290633'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#140219'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#d946ef'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 8. RAM LABORATORY / OUT OF MEMORY HORROR
  {
    id: 'ram_buffer',
    name: 'RAM LABORATORY',
    bugmonName: 'OUT OF MEMORY HORROR',
    description: 'Cleanroom memory registers / Biological heap overflow infection',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Sterile Cleanroom Backdrop
        ctx.fillStyle = '#06171a';
        ctx.fillRect(0, 0, width, 58);
        // Memory Address Register Blocks
        const blocks = [
          { x: 8, label: '0x00' },
          { x: 38, label: '0x20' },
          { x: 68, label: '0x40' },
          { x: 98, label: '0x80' },
          { x: 128, label: '0xC0' }
        ];
        blocks.forEach((b, idx) => {
          ctx.fillStyle = '#0e3036';
          ctx.fillRect(b.x, 12, 24, 30);
          ctx.fillStyle = '#071f24';
          ctx.fillRect(b.x + 2, 14, 20, 26);
          ctx.font = '6px monospace';
          ctx.fillStyle = '#14b8a6';
          ctx.fillText(b.label, b.x + 4, 18);
          // Byte grid dots
          ctx.fillStyle = ((animTick + idx * 8) % 30 < 15) ? '#2dd4bf' : '#0f766e';
          ctx.fillRect(b.x + 6, 28, 4, 4);
          ctx.fillRect(b.x + 14, 28, 4, 4);
        });
        // Laser memory pointer scanning
        const scanX = Math.floor((animTick * 1.6) % 144) + 8;
        ctx.fillStyle = '#2dd4bf';
        ctx.fillRect(scanX, 8, 2, 38);
        // Horizon: Holographic alignment rail
        ctx.fillStyle = '#15545e';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Alternating Byte Allocation strips
        ctx.fillStyle = '#0a2226';
        ctx.fillRect(0, 60, width, 84);
        ctx.fillStyle = '#0e3036';
        for (let fx = 0; fx < width; fx += 32) ctx.fillRect(fx, 60, 16, 84);
        ctx.fillStyle = '#14565e';
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        // Podiums
        ctx.fillStyle = '#134047'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#0a2429'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#10b981'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#134047'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#0a2429'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#06b6d4'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: OUT OF MEMORY HORROR
        ctx.fillStyle = '#1c0409';
        ctx.fillRect(0, 0, width, 58);
        // Mutated infected memory registers bursting with tendrils
        const blocks = [8, 38, 68, 98, 128];
        blocks.forEach((bx, idx) => {
          ctx.fillStyle = '#3d0812';
          ctx.fillRect(bx, 12, 24, 30);
          ctx.fillStyle = '#21040a';
          ctx.fillRect(bx + 2, 14, 20, 26);
          // Pulsing mutated evil eye inside the memory cell
          ctx.fillStyle = '#ff0033';
          ctx.fillRect(bx + 8, 22, 8, 8);
          ctx.fillStyle = '#000000';
          const pOff = (idx % 2 === 0) ? 2 : 4;
          ctx.fillRect(bx + 8 + pOff, 24, 2, 4);
        });
        // Fleshy red tendrils crawling across the walls
        ctx.strokeStyle = '#a3152f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 42); ctx.lineTo(35, 36); ctx.lineTo(60, 48); ctx.lineTo(110, 38); ctx.lineTo(160, 46);
        ctx.stroke();
        // OOM Killer Warning Banner
        ctx.font = '7px monospace';
        ctx.fillStyle = '#ff1744';
        ctx.fillText('⚠ OOM KILLER: HEAP CORRUPT ⚠', 16, 6);
        // Horizon: Organic flesh ridge
        ctx.fillStyle = '#6b0c1b';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Black bile swamp floor
        ctx.fillStyle = '#140307';
        ctx.fillRect(0, 60, width, 84);
        ctx.fillStyle = '#420a14';
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        // Writhing red tendrils on floor
        ctx.strokeStyle = '#ff0055';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(15, 68); ctx.lineTo(40, 105); ctx.lineTo(30, 135);
        ctx.moveTo(100, 72); ctx.lineTo(125, 115);
        ctx.stroke();
        // Podiums
        ctx.fillStyle = '#450912'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#240409'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff0033'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#ff2255';
        ctx.fillRect(94, 54, 3, 2); ctx.fillRect(146, 54, 3, 2);
        ctx.fillStyle = '#2e070d'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#180306'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 9. FIBER HIGHWAY / DDOS MAELSTROM
  {
    id: 'fiber_highway',
    name: 'FIBER HIGHWAY',
    bugmonName: 'DDOS MAELSTROM',
    description: 'High-speed fiber optic data tunnel / DDoS packet flood singularity',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Deep Tunnel Perspective
        ctx.fillStyle = '#041119';
        ctx.fillRect(0, 0, width, 58);
        // Concentric Optical Tunnel Rings
        const rings = [10, 22, 38, 56];
        rings.forEach(r => {
          ctx.strokeStyle = '#0c2b3d';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(80, 42, r, Math.PI, 0, false);
          ctx.stroke();
        });
        // Core Photon Gateway at center
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(80, 42, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(80, 42, 3, 0, Math.PI * 2);
        ctx.fill();
        // Zipping light packet streaks along tunnel walls
        ctx.fillStyle = '#facc15';
        const streakX = (animTick * 3) % 160;
        ctx.fillRect(streakX, 22, 10, 2);
        ctx.fillStyle = '#00f0ff';
        const streakX2 = 160 - ((animTick * 3.5) % 160);
        ctx.fillRect(streakX2, 34, 8, 2);
        // Horizon: Gateway Ring
        ctx.fillStyle = '#0ea5e9';
        ctx.fillRect(0, 58, width, 2);
        // Floor: High Speed Optical Speedway
        ctx.fillStyle = '#081d29';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#0c384f';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        // Optical pulse lines rushing forward
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60); ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#0f3a4d'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#09232e'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#38bdf8'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#0c2f3f'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#071d26'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#facc15'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: DDOS MAELSTROM
        ctx.fillStyle = '#1c0307';
        ctx.fillRect(0, 0, width, 58);
        // Collapsed Black Hole Singularity at center
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(80, 36, 12, 0, Math.PI * 2);
        ctx.fill();
        // Event Horizon Red Aura
        ctx.strokeStyle = '#ff0033';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(80, 36, 14, 0, Math.PI * 2);
        ctx.stroke();
        // Blinding red laser interference bursts
        ctx.fillStyle = '#ff0033';
        const burstY = (animTick * 4) % 54;
        ctx.fillRect(0, burstY, width, 1);
        ctx.fillStyle = '#ff6600';
        const burstY2 = (animTick * 5 + 24) % 54;
        ctx.fillRect(0, burstY2, width, 1);
        // DDOS Warning Stamp
        ctx.font = '7px monospace';
        ctx.fillStyle = '#ff1744';
        ctx.fillText('⚠ DDOS MAELSTROM: 99.9% LOSS ⚠', 10, 8);
        // Horizon: Red Event Horizon Rim
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Scorched Optical Speedway
        ctx.fillStyle = '#190408';
        ctx.fillRect(0, 60, width, 84);
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        ctx.fillStyle = '#5c0f1e';
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        const floorCols = [-20, 10, 40, 70, 100, 130, 160, 190];
        floorCols.forEach(cx => {
          ctx.beginPath();
          ctx.moveTo(cx, 60); ctx.lineTo(cx + (cx - 80) * 0.8, 144);
          ctx.strokeStyle = '#e11d48';
          ctx.lineWidth = 1;
          ctx.stroke();
        });
        // Podiums
        ctx.fillStyle = '#470a12'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#260408'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff1744'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#31070d'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#1a0306'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#ef4444'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  },

  // 10. LEGACY MAINFRAME / FORGOTTEN COBOL CRYPT
  {
    id: 'legacy_grave',
    name: 'LEGACY MAINFRAME',
    bugmonName: 'FORGOTTEN COBOL CRYPT',
    description: '1970s magnetic tape mainframe / Cursed crypt of dead programming languages',
    render: function(ctx, width, height, animTick, isBugmon) {
      if (!isBugmon) {
        // Vintage 1970s Industrial Sepia Room
        ctx.fillStyle = '#141210';
        ctx.fillRect(0, 0, width, 58);
        // 2 Huge Magnetic Tape Drive Cabinets
        const tapeCabinets = [14, 104];
        tapeCabinets.forEach(tcx => {
          ctx.fillStyle = '#2e2822';
          ctx.fillRect(tcx, 6, 42, 50);
          ctx.fillStyle = '#1c1814';
          ctx.fillRect(tcx + 2, 8, 38, 46);
          // Two Spinning Reels per cabinet
          const reelAngle = (animTick * 0.15);
          [tcx + 12, tcx + 30].forEach((rx, ridx) => {
            ctx.fillStyle = '#d4ceb8';
            ctx.beginPath();
            ctx.arc(rx, 22, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1c1814';
            ctx.beginPath();
            ctx.arc(rx, 22, 3, 0, Math.PI * 2);
            ctx.fill();
            // Reel spoke
            const sx = Math.cos(reelAngle + ridx) * 6;
            const sy = Math.sin(reelAngle + ridx) * 6;
            ctx.fillStyle = '#544c42';
            ctx.fillRect(rx + sx - 1, 22 + sy - 1, 2, 2);
          });
          // Tape ribbon slot
          ctx.fillStyle = '#e5e0cf';
          ctx.fillRect(tcx + 10, 34, 22, 2);
        });
        // Warm glowing vacuum tube filaments in center
        ctx.fillStyle = '#2a221b';
        ctx.fillRect(66, 16, 28, 32);
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(72, 24, 4, 16);
        ctx.fillRect(84, 24, 4, 16);
        ctx.fillStyle = '#fde047';
        ctx.fillRect(73, 28, 2, 8);
        ctx.fillRect(85, 28, 2, 8);
        // Horizon: Rusted iron girder
        ctx.fillStyle = '#3d352e';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Riveted steel tile floor
        ctx.fillStyle = '#1c1916';
        ctx.fillRect(0, 60, width, 84);
        ctx.strokeStyle = '#786047';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let fy = 66; fy < 144; fy += 14) {
          ctx.moveTo(0, fy); ctx.lineTo(width, fy);
        }
        for (let fx = 12; fx < width; fx += 24) {
          ctx.moveTo(fx, 60); ctx.lineTo(fx, 144);
        }
        ctx.stroke();
        // Podiums
        ctx.fillStyle = '#332b24'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1f1a15'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#f59e0b'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#29231d'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#181410'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#d97706'; ctx.fillRect(12, 109, 58, 2);
      } else {
        // Scary Bugmon Variant: FORGOTTEN COBOL CRYPT
        ctx.fillStyle = '#0c0d0b';
        ctx.fillRect(0, 0, width, 58);
        // Smashed tape drives with torn cobweb ribbons
        ctx.fillStyle = '#1f1c19';
        ctx.fillRect(14, 6, 42, 50);
        ctx.fillRect(104, 6, 42, 50);
        // Shredded hanging tape ribbons
        ctx.strokeStyle = '#4a443b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(26, 26); ctx.lineTo(24, 48); ctx.lineTo(32, 56);
        ctx.moveTo(116, 26); ctx.lineTo(122, 50); ctx.lineTo(114, 56);
        ctx.stroke();
        // Blood-plasma glowing vacuum tubes
        ctx.fillStyle = '#22080d';
        ctx.fillRect(66, 16, 28, 32);
        ctx.fillStyle = '#ff0033';
        ctx.fillRect(72, 24, 4, 16);
        ctx.fillRect(84, 24, 4, 16);
        // Ancient Programming Language Tombstones
        ctx.fillStyle = '#3b342e';
        // Tombstone 1: COBOL
        ctx.fillRect(20, 28, 18, 28);
        ctx.fillStyle = '#ef4444';
        ctx.font = '5px monospace';
        ctx.fillText('COBOL', 21, 36);
        // Tombstone 2: FORTRAN
        ctx.fillStyle = '#3b342e';
        ctx.fillRect(110, 28, 22, 28);
        ctx.fillStyle = '#ef4444';
        ctx.fillText('FORTRAN', 111, 36);
        // Horizon: Ancient stone crypt altar
        ctx.fillStyle = '#301a20';
        ctx.fillRect(0, 58, width, 2);
        // Floor: Decaying Stone Tomb Floor with spectral mist
        ctx.fillStyle = '#14070a';
        ctx.fillRect(0, 60, width, 84);
        ctx.fillStyle = '#2e1219';
        const horizLines = [64, 71, 80, 91, 104, 120, 138];
        horizLines.forEach(hy => ctx.fillRect(0, hy, width, 1));
        // Spectral green & red mist wisps
        ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ctx.fillRect(10, 90, 60, 8);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fillRect(80, 115, 70, 8);
        // Podiums
        ctx.fillStyle = '#3b0e17'; ctx.fillRect(92, 54, 62, 8);
        ctx.fillStyle = '#1c060a'; ctx.fillRect(94, 55, 58, 6);
        ctx.fillStyle = '#ff0033'; ctx.fillRect(96, 56, 54, 2);
        ctx.fillStyle = '#240a10'; ctx.fillRect(8, 106, 66, 12);
        ctx.fillStyle = '#120407'; ctx.fillRect(10, 108, 62, 8);
        ctx.fillStyle = '#f43f5e'; ctx.fillRect(12, 109, 58, 2);
      }
    }
  }
];

function getBackgroundById(id) {
  return BATTLE_BACKGROUNDS.find(b => b.id === id) || BATTLE_BACKGROUNDS[0];
}

function setBackground(id) {
  const bg = getBackgroundById(id);
  battleVisualState.backgroundId = bg.id;
  updateArenaDisplay();
  return bg;
}

function getNextBackground() {
  const currentId = battleVisualState.backgroundId || 'cyber_grid';
  const currentIndex = BATTLE_BACKGROUNDS.findIndex(b => b.id === currentId);
  const nextIndex = (currentIndex + 1) % BATTLE_BACKGROUNDS.length;
  const nextBg = BATTLE_BACKGROUNDS[nextIndex];
  setBackground(nextBg.id);
  return nextBg;
}

function getBackgroundForEnemy(enemy) {
  if (!enemy) return 'cyber_grid';
  const name = ((enemy.id || '') + ' ' + (enemy.name || enemy.originalName || '')).toLowerCase();
  if (name.includes('404')) return 'deep_terminal';
  if (name.includes('500')) return 'server_core';
  if (name.includes('null_pointer') || name.includes('null pointer')) return 'legacy_grave';
  if (name.includes('stack_overflow') || name.includes('stack overflow')) return 'cloud_tempest';
  if (name.includes('syntax')) return 'fiber_highway';
  if (name.includes('sql')) return 'database_vault';
  if (name.includes('java')) return 'server_core';
  if (name.includes('rubi') || name.includes('ruby')) return 'neon_skyline';
  if (name.includes('pyrawr') || name.includes('python')) return 'motherboard';
  if (name.includes('cplus') || name.includes('c++')) return 'ram_buffer';
  if (name.includes('jaskull') || name.includes('javascript')) return 'cyber_grid';
  return 'cyber_grid';
}

function updateArenaDisplay() {
  const displayEl = document.getElementById('arena-name-display');
  if (!displayEl) return;
  const bg = getBackgroundById(battleVisualState.backgroundId || 'cyber_grid');
  const isBugmon = battleVisualState.isBugmon || (typeof window !== 'undefined' && window.gameState && window.gameState.isBugmonBattle);
  if (isBugmon) {
    displayEl.textContent = `⚠ ${bg.bugmonName} ⚠`;
    displayEl.className = 'text-red font-pixel arena-pulsing';
  } else {
    displayEl.textContent = `■ ${bg.name} ■`;
    displayEl.className = 'text-blue font-pixel';
  }
}

// ---------------------------------------------------------------------------
// 8. 160x144 CANVAS BATTLE SCENE RENDERER
// ---------------------------------------------------------------------------
function renderBattleScene(ctx, animTick = 0) {
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  const width = 160;
  const height = 144;

  // Apply screen shake offset
  const shakeX = Math.round(battleVisualState.screenShake.x);
  const shakeY = Math.round(battleVisualState.screenShake.y);

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Smoothly interpolate HP bars
  ['player', 'enemy'].forEach((key) => {
    const hp = battleVisualState.hp[key];
    const diff = hp.target - hp.display;
    if (Math.abs(diff) > 0.3) {
      hp.display += diff * 0.14;
    } else {
      hp.display = hp.target;
    }
  });

  const isBugmon = battleVisualState.isBugmon || (typeof window !== 'undefined' && window.gameState && window.gameState.isBugmonBattle);

  // 1. Render Active Background & Podiums (Backdrop, Floor, Podiums & Scary Bugmon Variants)
  const activeBg = getBackgroundById(battleVisualState.backgroundId || 'cyber_grid');
  if (activeBg && typeof activeBg.render === 'function') {
    activeBg.render(ctx, width, height, animTick, isBugmon);
  } else if (BATTLE_BACKGROUNDS[0]) {
    BATTLE_BACKGROUNDS[0].render(ctx, width, height, animTick, isBugmon);
  }

  // -------------------------------------------------------------------------
  // 4. TOP-LEFT: ENEMY INFO BOX
  // -------------------------------------------------------------------------
  const enemy = (window.gameState && window.gameState.enemy) || {
    name: 'BUGMON',
    maxHp: 130
  };
  const enemyHp = battleVisualState.hp.enemy;
  const enemyHpPct = Math.max(0, enemyHp.display / enemyHp.max);

  // Outer border & fill
  ctx.fillStyle = isBugmon ? '#150308' : '#0c1015';
  ctx.fillRect(5, 6, 80, 26);
  ctx.fillStyle = isBugmon ? '#941e1e' : '#2c3e50';
  ctx.fillRect(6, 7, 78, 24);
  ctx.fillStyle = isBugmon ? '#300812' : '#1b2632';
  ctx.fillRect(8, 9, 74, 20);

  // Enemy Name & LV (Pixel-perfect crisp bitmap text)
  drawPixelText(ctx, enemy.name.substring(0, 10), 11, 12, isBugmon ? '#ff0055' : '#eef5fc', 1);
  drawPixelText(ctx, isBugmon ? 'BUG' : 'LV 5', 60, 12, isBugmon ? '#ff1744' : '#f4b41b', 1);

  // Enemy HP Bar
  ctx.fillStyle = '#0c1015';
  ctx.fillRect(11, 19, 68, 6);
  drawPixelText(ctx, 'HP', 13, 20, '#f4b41b', 1);

  // Bar groove
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(23, 20, 54, 4);

  // Bar fill
  const enemyFillW = Math.max(0, Math.min(54, Math.round(54 * enemyHpPct)));
  ctx.fillStyle = getHpColor(enemyHpPct);
  ctx.fillRect(23, 20, enemyFillW, 4);

  // -------------------------------------------------------------------------
  // 5. TOP-RIGHT: ENEMY CODEMON SPRITE (16x16 Pixel Grid Array)
  // -------------------------------------------------------------------------
  if (battleVisualState.enemy.visible) {
    const isEffectsOff = (window.isEffectsDisabled && window.isEffectsDisabled());
    const isBobStep = Math.floor(animTick / 24) % 2 === 1;
    const enemyBob = isEffectsOff ? 0 : (isBobStep ? 2 : 0);
    const enemy = (window.gameState && window.gameState.enemy) || { id: 'bugmon', name: 'Bugmon' };
    const eId = ((enemy.id || enemy.name || '') + '').toLowerCase();

    // Pick sprite grid based on enemy identity and Bugmon status
    let enemyGrid;
    if (isBugmon) {
      if (eId.includes('pyrawr') || eId.includes('python')) {
        enemyGrid = SPRITE_BUG_PYRAWR_FRONT;
      } else if (eId.includes('jaskull') || eId.includes('javascript') || eId === 'js') {
        enemyGrid = SPRITE_BUG_JASKULL_FRONT;
      } else if (eId.includes('cplusaur') || eId.includes('c++') || eId.includes('cpp')) {
        enemyGrid = SPRITE_BUG_CPLUSAUR_FRONT;
      } else if (eId.includes('javagron') || eId.includes('java')) {
        enemyGrid = SPRITE_BUG_JAVAGRON_FRONT;
      } else if (eId.includes('rubicorn') || eId.includes('ruby')) {
        enemyGrid = SPRITE_BUG_RUBICORN_FRONT;
      } else if (eId.includes('sqloph') || eId.includes('sql')) {
        enemyGrid = SPRITE_BUG_SQLOPH_FRONT;
      } else if (eId.includes('404')) {
        enemyGrid = SPRITE_ERROR_404_FRONT;
      } else if (eId.includes('syntax')) {
        enemyGrid = SPRITE_SYNTAX_ERROR_FRONT;
      } else if (eId.includes('500')) {
        enemyGrid = SPRITE_ERROR_500_FRONT;
      } else if (eId.includes('null')) {
        enemyGrid = SPRITE_NULL_POINTER_FRONT;
      } else if (eId.includes('stack') || eId.includes('overflow')) {
        enemyGrid = SPRITE_STACK_OVERFLOW_FRONT;
      } else {
        enemyGrid = SPRITE_BUG_BUGMON_FRONT;
      }
    } else {
      if (eId.includes('pyrawr') || eId.includes('python')) {
        enemyGrid = SPRITE_PYRAWR_FRONT;
      } else if (eId.includes('jaskull') || eId.includes('javascript') || eId === 'js') {
        enemyGrid = SPRITE_JASKULL_FRONT;
      } else if (eId.includes('cplusaur') || eId.includes('c++') || eId.includes('cpp')) {
        enemyGrid = SPRITE_CPLUSAUR_FRONT;
      } else if (eId.includes('javagron') || eId.includes('java')) {
        enemyGrid = SPRITE_JAVAGRON_FRONT;
      } else if (eId.includes('rubicorn') || eId.includes('ruby')) {
        enemyGrid = SPRITE_RUBICORN_FRONT;
      } else if (eId.includes('sqloph') || eId.includes('sql')) {
        enemyGrid = SPRITE_SQLOPH_FRONT;
      } else if (eId.includes('404')) {
        enemyGrid = SPRITE_ERROR_404_FRONT;
      } else if (eId.includes('syntax')) {
        enemyGrid = SPRITE_SYNTAX_ERROR_FRONT;
      } else if (eId.includes('500')) {
        enemyGrid = SPRITE_ERROR_500_FRONT;
      } else if (eId.includes('null')) {
        enemyGrid = SPRITE_NULL_POINTER_FRONT;
      } else if (eId.includes('stack') || eId.includes('overflow')) {
        enemyGrid = SPRITE_STACK_OVERFLOW_FRONT;
      } else {
        enemyGrid = SPRITE_BUGMON_FRONT;
      }
    }

    // Bugmons are visibly BIGGER than usual: scale 2.6x (~42x42px vs standard 32x32px)
    const enemyPixelSize = isBugmon ? 2.6 : 2;
    const enemyBaseX = isBugmon ? 104 : 110;
    const enemyBaseY = isBugmon ? 16 : 24;

    const enemyX = enemyBaseX + battleVisualState.enemy.offsetX;
    const enemyY = enemyBaseY + enemyBob + battleVisualState.enemy.offsetY;

    // Draw enlarged boss ground shadow underneath Bugmon variants
    if (isBugmon) {
      ctx.save();
      ctx.fillStyle = 'rgba(84, 13, 26, 0.7)';
      ctx.beginPath();
      ctx.ellipse(enemyBaseX + 21, 57, 22, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const enemyPalette = isBugmon ? BUGMON_PALETTE : SPRITE_PALETTE;
    drawPixelSprite(ctx, enemyGrid, enemyX, enemyY, enemyPixelSize, enemyPalette);
  }

  // -------------------------------------------------------------------------
  // 6. BOTTOM-LEFT: PLAYER CODEMON SPRITE (BACK VIEW, 16x16 Pixel Grid Array)
  // -------------------------------------------------------------------------
  if (battleVisualState.player.visible) {
    const isEffectsOff = (window.isEffectsDisabled && window.isEffectsDisabled());
    const isBobStep = Math.floor(animTick / 24) % 2 === 1;
    const player = (window.gameState && window.gameState.player) || { id: 'pyrawr', name: 'Pyrawr' };
    const playerBob = isEffectsOff ? 0 : (isBobStep ? 0 : 2);
    const playerX = 22 + battleVisualState.player.offsetX;
    const playerY = 76 + playerBob + battleVisualState.player.offsetY;

    // Pick sprite based on chosen starter
    const pId = (player.id || player.name || '').toLowerCase();
    let playerGrid = SPRITE_PYRAWR_BACK;
    if (pId.includes('jaskull') || pId.includes('javascript') || pId === 'js') {
      playerGrid = SPRITE_JASKULL_BACK;
    } else if (pId.includes('cplusaur') || pId.includes('c++') || pId.includes('cpp')) {
      playerGrid = SPRITE_CPLUSAUR_BACK;
    } else if (pId.includes('javagron') || pId.includes('java')) {
      playerGrid = SPRITE_JAVAGRON_BACK;
    } else if (pId.includes('rubicorn') || pId.includes('ruby')) {
      playerGrid = SPRITE_RUBICORN_BACK;
    } else if (pId.includes('sqloph') || pId.includes('sql')) {
      playerGrid = SPRITE_SQLOPH_BACK;
    }

    drawPixelSprite(ctx, playerGrid, playerX, playerY, 2);
  }

  // -------------------------------------------------------------------------
  // 7. BOTTOM-RIGHT: PLAYER INFO BOX (With Numeric HP like 80/100)
  // -------------------------------------------------------------------------
  const player = (window.gameState && window.gameState.player) || {
    name: 'PYRAWR',
    maxHp: 100
  };
  const playerHp = battleVisualState.hp.player;
  const playerHpPct = Math.max(0, playerHp.display / playerHp.max);

  // Outer border & fill
  ctx.fillStyle = '#0c1015';
  ctx.fillRect(72, 68, 83, 34);
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(73, 69, 81, 32);
  ctx.fillStyle = '#1b2632';
  ctx.fillRect(75, 71, 77, 28);

  // Player Name & LV (Pixel-perfect crisp bitmap text)
  drawPixelText(ctx, player.name.substring(0, 8), 78, 73, '#eef5fc', 1);
  drawPixelText(ctx, 'LV 5', 130, 73, '#f4b41b', 1);

  // Player HP Bar
  ctx.fillStyle = '#0c1015';
  ctx.fillRect(78, 81, 70, 6);
  drawPixelText(ctx, 'HP', 80, 82, '#f4b41b', 1);

  // Bar groove
  ctx.fillStyle = '#2c3e50';
  ctx.fillRect(90, 82, 56, 4);

  // Bar fill
  const playerFillW = Math.max(0, Math.min(56, Math.round(56 * playerHpPct)));
  ctx.fillStyle = getHpColor(playerHpPct);
  ctx.fillRect(90, 82, playerFillW, 4);

  // Numeric HP display right-aligned (e.g. "80/100")
  const numHpStr = `${Math.max(0, Math.round(playerHp.display))}/${playerHp.max}`;
  const numWidth = numHpStr.length * 4;
  drawPixelText(ctx, numHpStr, 146 - numWidth, 90, '#eef5fc', 1);

  ctx.restore();
}

// ---------------------------------------------------------------------------
// 9. BATTLE LOGIC & CODE PANEL INTEGRATION
// ---------------------------------------------------------------------------

// Damage mapping per difficulty: easy 10, medium 20, hard 35
const BASE_DAMAGE = {
  easy: 10,
  medium: 20,
  hard: 35
};

// Points mapping per difficulty: easy 10, medium 25, hard 50
const POINTS_AWARDED = (typeof BATTLE_CONFIG !== 'undefined' && BATTLE_CONFIG.points)
  ? BATTLE_CONFIG.points
  : { easy: 10, medium: 25, hard: 50 };

// Enemy base attack power
const ENEMY_BASE_DAMAGE = 16;

/**
 * evaluateBattleConditions(playerHp, enemyHp, points, turnsLeft)
 * Evaluates battle conditions according to BATTLE_CONFIG and battle phase:
 * 
 * Normal Phase:
 * 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
 * 2. If enemy HP <= 0 but points < minPoints: not a true win. Show
 *    "The enemy is still glitching..." and trigger Bugmon transformation.
 * 3. If turns run out and points < minPoints: trigger Bugmon transformation.
 * 4. If player HP <= 0: lose.
 * 
 * Bugmon Phase:
 * - If player HP <= 0 or turns run out without winning: "The bug got away..."
 * - If enemy HP <= 0 AND points >= 150: WIN (double XP, bugmonsDefeated += 1).
 */
function evaluateBattleConditions(playerHp, enemyHp, points, turnsLeft) {
  const isBugmon = (typeof battleVisualState !== 'undefined' && battleVisualState.isBugmon) || 
                   (typeof window !== 'undefined' && window.gameState && window.gameState.isBugmonBattle);
  const minPts = (typeof BATTLE_CONFIG !== 'undefined' && BATTLE_CONFIG.minPoints) || (isBugmon ? 150 : 120);

  // If in Bugmon Battle:
  if (isBugmon) {
    // If player HP <= 0: player failed again -> "The bug got away..."
    if (playerHp <= 0) {
      return { outcome: 'bugmon_escaped', reason: 'player_fainted' };
    }

    // If enemy HP <= 0
    if (enemyHp <= 0) {
      if (points >= minPts) {
        return { outcome: 'victory', reason: 'bugmon_debugged' };
      } else {
        // Defeated HP but failed minPoints: "The bug got away..."
        return { outcome: 'bugmon_escaped', reason: 'points_not_met' };
      }
    }

    // If turns run out
    if (turnsLeft <= 0) {
      if (points >= minPts && enemyHp <= 0) {
        return { outcome: 'victory', reason: 'bugmon_debugged' };
      }
      return { outcome: 'bugmon_escaped', reason: 'turns_exhausted' };
    }

    return null;
  }

  // Normal Battle Rules:
  // 4. If player HP <= 0: lose.
  if (playerHp <= 0) {
    return { outcome: 'defeat', reason: 'player_fainted' };
  }

  // 1 & 2. If enemy HP <= 0
  if (enemyHp <= 0) {
    if (points >= minPts) {
      // 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
      return { outcome: 'victory', reason: 'enemy_debugged' };
    } else {
      // 2. If enemy HP <= 0 but points < minPoints: not a true win.
      // Show "The enemy is still glitching..." and trigger the Bugmon transformation (Piece 7).
      return { outcome: 'transformation', reason: 'enemy_glitching' };
    }
  }

  // 3. If turns run out and points < minPoints: trigger the Bugmon transformation.
  if (turnsLeft <= 0) {
    if (points < minPts) {
      return { outcome: 'transformation', reason: 'timeout_glitching' };
    } else {
      return { outcome: 'defeat', reason: 'turns_exhausted' };
    }
  }

  return null;
}

/**
 * triggerBugmonTransformation()
 * Transformation sequence when triggered:
 * 1. Dialogue: "Oh no... the points weren't enough!"
 * 2. Screen glitch effect: CSS animation with the sprite flickering, horizontal
 *    slicing/offset lines, screen shake, and a short static noise sound.
 * 3. Dialogue: "[Enemy] turned into a BUGMON!"
 * 4. Swap the sprite and name, restore the HP bar to the bugmon's full HP, and
 *    change the battle background tint to a dark red palette.
 * 5. Add a menu after the transformation: "FIGHT" or "RUN".
 */
async function triggerBugmonTransformation() {
  const triggerMsg = window.showMessage || showMessage;
  const enemy = (window.gameState && window.gameState.enemy) || { name: 'Bugmon', maxHp: 130 };
  const player = (window.gameState && window.gameState.player) || { name: 'Codemon', maxHp: 100 };
  const originalEnemyName = enemy.originalName || enemy.name || 'Codemon';

  // 1. Dialogue: "Oh no... the points weren't enough!"
  await triggerMsg("Oh no... the points weren't enough!");
  await new Promise(r => setTimeout(r, 600));

  // 2. Screen glitch effect: CSS animation with the sprite flickering,
  // horizontal slicing/offset lines, screen shake, and a short static noise sound.
  if (window.playSound) {
    window.playSound('static');
  }

  battleVisualState.isGlitching = true;
  battleVisualState.screenShake.duration = 45;

  const canvasFrame = document.getElementById('canvas-frame');
  const battleScreen = document.getElementById('screen-battle');
  if (canvasFrame) {
    canvasFrame.classList.add('screen-glitch-active');
  }
  if (battleScreen) {
    battleScreen.classList.add('bugmon-glitch-active');
  }

  if (window.appendConsoleLine) {
    window.appendConsoleLine('========================================', 'console-error');
    window.appendConsoleLine('⚠ SCREEN GLITCH: SYNTAX INTEGRITY FAILURE ⚠', 'console-error');
    window.appendConsoleLine('> Horizontal slicing detected. Memory pointers corrupting...', 'console-error');
    window.appendConsoleLine('========================================', 'console-error');
  }

  await new Promise(r => setTimeout(r, 1200));

  // 3. Dialogue: "[Enemy] turned into a BUGMON!"
  await triggerMsg(`${originalEnemyName} turned into a BUGMON!`);
  await new Promise(r => setTimeout(r, 600));

  // 4. Swap the sprite and name, restore the HP bar to the bugmon's full HP, and
  // change the battle background tint to a dark red palette.
  const variant = (enemy && enemy.bugmonVariant) || {
    name: `Bug-${originalEnemyName}`,
    sprite: 'assets/bug-pyrawr.svg',
    maxHp: Math.round(((enemy && enemy.maxHp) || 130) * 1.5),
    palette: { primary: '#e03c3c', secondary: '#9b51e0', dark: '#35084a', glow: '#ff1744' }
  };

  enemy.originalName = originalEnemyName;
  enemy.name = variant.name;
  enemy.sprite = variant.sprite;
  enemy.spriteFront = variant.sprite;
  enemy.maxHp = variant.maxHp;
  enemy.hp = variant.maxHp;
  enemy.currentHp = variant.maxHp;
  enemy.isBugmon = true;
  enemy.bugmonVariant = variant;

  battleVisualState.isBugmon = true;
  battleVisualState.isGlitching = false;
  if (window.gameState) {
    window.gameState.isBugmonBattle = true;
    window.gameState.isTransformed = true;
    window.gameState.enemy = enemy;
  }
  updateArenaDisplay();

  const btnBugMode = document.getElementById('btn-bug-mode');
  if (btnBugMode) {
    btnBugMode.disabled = true;
  }

  // Restore the HP bar to the bugmon's full HP
  const triggerSetHp = window.setHp || setHp;
  await triggerSetHp('enemy', variant.maxHp, variant.maxHp, true);

  // Background tint: change to a dark red palette
  if (canvasFrame) {
    canvasFrame.classList.remove('screen-glitch-active');
  }
  if (battleScreen) {
    battleScreen.classList.remove('bugmon-glitch-active');
    battleScreen.classList.add('bugmon-battle-tint');
  }

  const versusTitle = document.getElementById('battle-versus-title');
  if (versusTitle) {
    versusTitle.textContent = `${player.name.toUpperCase()} VS ${enemy.name.toUpperCase()}`;
  }

  if (window.appendConsoleLine) {
    window.appendConsoleLine(`⚠ ${enemy.name.toUpperCase()} HAS AWAKENED! (MAX HP: ${variant.maxHp}) ⚠`, 'console-error');
    window.appendConsoleLine('> Background arena tinted dark red. Challenge matrix locked to Medium & Hard.', 'console-warn');
  }

  if (window.playBgm) {
    window.playBgm('bugmon');
  }

  // 5. Add a menu after the transformation: "FIGHT" or "RUN"
  if (window.showBugmonDecisionModal) {
    window.showBugmonDecisionModal(variant);
  } else {
    const decisionOverlay = document.getElementById('bugmon-decision-overlay');
    if (decisionOverlay) {
      decisionOverlay.style.display = 'flex';
    }
  }
}

/**
 * Update code panel elements to reflect "ENEMY TURN..." state
 */
function setCodePanelEnemyTurnUI(isEnemyTurn) {
  const pickerBadge = document.getElementById('picker-status-badge');
  const challengeBadge = document.getElementById('current-challenge-badge');
  const consoleBadge = document.getElementById('console-status-badge');
  const textarea = document.getElementById('code-textarea');
  const btnRun = document.getElementById('btn-run-tests');
  const btnDevPower = document.getElementById('btn-dev-power');
  const btnInventory = document.getElementById('btn-inventory');
  const btnInventoryBattle = document.getElementById('btn-inventory-battle');
  const btnHolyHeal = document.getElementById('btn-holy-heal');
  const btnHint = document.getElementById('btn-hint');
  const btnReset = document.getElementById('btn-reset-code');
  const pickerContainer = document.getElementById('picker-cards-container');

  if (isEnemyTurn) {
    battleVisualState.isEnemyTurn = true;
    if (typeof window !== 'undefined' && window.gameState) {
      window.gameState.isEnemyTurn = true;
    }
    if (pickerBadge) {
      pickerBadge.textContent = 'ENEMY TURN...';
      pickerBadge.className = 'section-badge font-code text-red';
    }
    if (challengeBadge) {
      challengeBadge.textContent = 'ENEMY TURN...';
      challengeBadge.className = 'badge-difficulty hard font-pixel';
    }
    if (consoleBadge) {
      consoleBadge.textContent = 'SYS: ENEMY TURN';
      consoleBadge.className = 'section-badge font-code text-red';
    }
    if (textarea) textarea.disabled = true;
    if (btnRun) btnRun.disabled = true;
    if (btnDevPower) btnDevPower.disabled = true;
    if (btnInventory) btnInventory.disabled = true;
    if (btnInventoryBattle) btnInventoryBattle.disabled = true;
    if (btnHolyHeal) btnHolyHeal.disabled = true;
    if (btnHint) btnHint.disabled = true;
    if (btnReset) btnReset.disabled = true;

    if (pickerContainer) {
      const cards = pickerContainer.querySelectorAll('.picker-card');
      cards.forEach((c) => {
        c.classList.remove('selected');
        c.classList.add('locked');
        c.style.pointerEvents = 'none';
      });
    }

    const diffBar = document.getElementById('picker-difficulty-bar');
    if (diffBar) {
      const tabs = diffBar.querySelectorAll('.picker-diff-tab');
      tabs.forEach((t) => {
        t.classList.add('locked');
        t.style.pointerEvents = 'none';
      });
    }
  } else {
    battleVisualState.isEnemyTurn = false;
    battleVisualState.isEnemyAttacking = false;
    if (typeof window !== 'undefined' && window.gameState) {
      window.gameState.isEnemyTurn = false;
      window.gameState.isEnemyAttacking = false;
    }
    if (pickerBadge) {
      pickerBadge.textContent = 'SELECT DIFFICULTY TO ATTACK';
      pickerBadge.className = 'section-badge font-code text-yellow';
    }
    if (consoleBadge) {
      consoleBadge.textContent = 'SYS: READY';
      consoleBadge.className = 'section-badge font-code text-green';
    }
    if (btnInventory) btnInventory.disabled = false;
    if (btnInventoryBattle) btnInventoryBattle.disabled = false;
    if (btnHolyHeal) btnHolyHeal.disabled = false;
    if (pickerContainer) {
      const cards = pickerContainer.querySelectorAll('.picker-card');
      cards.forEach((c) => {
        c.style.pointerEvents = 'auto';
      });
    }

    const diffBar = document.getElementById('picker-difficulty-bar');
    if (diffBar) {
      diffBar.classList.remove('question-locked');
      const tabs = diffBar.querySelectorAll('.picker-diff-tab');
      tabs.forEach((t) => {
        if (!t.classList.contains('bugmon-locked')) {
          t.classList.remove('locked');
          t.classList.remove('tab-locked-out');
          t.classList.remove('question-locked-tab');
          t.style.pointerEvents = 'auto';
        }
      });
    }
  }
}

/**
 * handlePlayerCodeSuccess(challenge, outcome)
 * When RUN TESTS returns passed: true, count it as a correct attempt:
 * - damage = baseDamage[difficulty] * player.attackPower (easy 10, medium 20, hard 35)
 * - Call playAttackAnimation("player"), playHitAnimation("enemy")
 * - Animate the enemy HP bar
 * - Award points only on correct answers (easy 10, medium 25, hard 50)
 * - Pop animation on points update
 * - End-of-battle check if enemy HP <= 0
 * - Then start the enemy turn
 */
async function handlePlayerCodeSuccess(challenge, outcome) {
  const player = (window.gameState && window.gameState.player) || { attackPower: 1.0, name: 'Pyrawr' };
  const enemy = (window.gameState && window.gameState.enemy) || { name: 'Bugmon', maxHp: 130 };
  const diff = (challenge && challenge.difficulty) ? challenge.difficulty.toLowerCase() : 'easy';

  // 1. Calculate damage = baseDamage[difficulty] * player.attackPower
  const baseDmg = BASE_DAMAGE[diff] || 10;
  const attackMultiplier = (player && typeof player.attackPower === 'number') ? player.attackPower : 1.0;
  const damage = Math.round(baseDmg * attackMultiplier);

  // 2. Award points only on correct answers (easy 10, medium 25, hard 50)
  const pts = (BATTLE_CONFIG && BATTLE_CONFIG.points && BATTLE_CONFIG.points[diff]) || POINTS_AWARDED[diff] || 10;
  battleVisualState.points += pts;

  // Update HUD with points and small pop animation (turnsLeft updated after full round)
  updateHud(battleVisualState.points, battleVisualState.turnsLeft);

  if (window.gameState) {
    window.gameState.score = battleVisualState.points;
  }

  // Roll heal chip drop on full pass (only when passing all tests)
  // Drop rules:
  // - Chips drop only on a full pass of all tests, never on partial passes.
  // - No drop if the player used the HINT button on that question.
  const hintUsed = (window.gameState && window.gameState.hintUsedThisTurn) ||
                   (typeof hintUsedThisTurn !== 'undefined' && hintUsedThisTurn);

  let droppedChipId = null;
  let chipAdded = false;

  if (!hintUsed) {
    const activeChallenge = challenge || (typeof window !== 'undefined' && window.activeChallenge) || null;
    if (activeChallenge && activeChallenge.willReceiveItem) {
      droppedChipId = activeChallenge.willReceiveItem.id;
    } else if (activeChallenge && activeChallenge.willReceiveItem === null) {
      droppedChipId = null;
    } else if (typeof rollChipDrop === 'function') {
      droppedChipId = rollChipDrop(diff);
    } else if (typeof window !== 'undefined' && typeof window.rollChipDrop === 'function') {
      droppedChipId = window.rollChipDrop(diff);
    }
  }

  // Trigger drop pop animation or dim flicker on question card's chip image
  const dropAnimTrigger = window.triggerCardDropAnimation || (typeof triggerCardDropAnimation === 'function' ? triggerCardDropAnimation : null);
  if (dropAnimTrigger) {
    dropAnimTrigger(diff, droppedChipId);
  }

  if (droppedChipId) {
    if (typeof addChip === 'function') {
      chipAdded = addChip(droppedChipId);
    } else if (typeof window !== 'undefined' && typeof window.addChip === 'function') {
      chipAdded = window.addChip(droppedChipId);
    }

    if (chipAdded) {
      if (window.gameState) {
        window.gameState.stats = window.gameState.stats || {};
        window.gameState.stats.chipsFound = (window.gameState.stats.chipsFound || 0) + 1;
      }
      const showPopup = window.showRewardPopup || (typeof showRewardPopup === 'function' ? showRewardPopup : null);
      if (showPopup) {
        showPopup(droppedChipId);
      }
      const chipsConfig = window.CHIPS || (typeof CHIPS !== 'undefined' ? CHIPS : null);
      const chipConfig = chipsConfig ? chipsConfig[droppedChipId] : null;
      const chipName = chipConfig ? chipConfig.name.toUpperCase() : 'CHIP';
      if (window.appendConsoleLine) {
        window.appendConsoleLine(`> ITEM FOUND! +1 ${chipName} added to inventory.`, 'console-pass');
      }
    } else {
      const chipsConfig = window.CHIPS || (typeof CHIPS !== 'undefined' ? CHIPS : null);
      const chipConfig = chipsConfig ? chipsConfig[droppedChipId] : null;
      const chipName = chipConfig ? chipConfig.name : 'Chip';
      if (window.appendConsoleLine) {
        window.appendConsoleLine(`> Inventory full for ${chipName}!`, 'console-warn');
      }
    }
  }

  // 3. Sequential attack and hit animations
  const triggerAttack = window.playAttackAnimation || playAttackAnimation;
  const triggerHit = window.playHitAnimation || playHitAnimation;
  const triggerSetHp = window.setHp || setHp;
  const triggerMsg = window.showMessage || showMessage;

  await triggerAttack('player');
  const isHeavyPlayerHit = damage >= 20 || diff === 'hard';
  await triggerHit('enemy', damage, isHeavyPlayerHit);

  // 4. Animate the enemy HP bar
  const currentEnemyHp = (window.gameState && window.gameState.enemy && typeof window.gameState.enemy.hp === 'number')
    ? window.gameState.enemy.hp
    : battleVisualState.hp.enemy.current;
  const newEnemyHp = Math.max(0, currentEnemyHp - damage);

  if (window.gameState && window.gameState.enemy) {
    window.gameState.enemy.hp = newEnemyHp;
    window.gameState.enemy.currentHp = newEnemyHp;
  }

  await triggerSetHp('enemy', newEnemyHp, battleVisualState.hp.enemy.max);

  if (window.appendConsoleLine) {
    window.appendConsoleLine(`> Attack hit! Dealt ${damage} DMG to Bugmon. +${pts} PTS awarded.`, 'console-pass');
  }

  await triggerMsg(`${player.name.toUpperCase()} compiled clean code! Dealt ${damage} DMG to ${enemy.name.toUpperCase()}! (+${pts} PTS)`);

  // Dialogue feedback for chip drop (never show "no drop" message)
  if (droppedChipId) {
    await new Promise((r) => setTimeout(r, 600));
    const chipsConfig = window.CHIPS || (typeof CHIPS !== 'undefined' ? CHIPS : null);
    const chipConfig = chipsConfig ? chipsConfig[droppedChipId] : null;
    const chipName = chipConfig ? chipConfig.name : 'Chip';
    if (chipAdded) {
      await triggerMsg(`${chipName} added to inventory!`);
    } else {
      await triggerMsg(`Inventory full for ${chipName}!`);
    }
  }

  // End-of-battle check if enemy HP <= 0:
  if (newEnemyHp <= 0) {
    const isBugmon = battleVisualState.isBugmon || (typeof window !== 'undefined' && window.gameState && window.gameState.isBugmonBattle);
    const minPts = (BATTLE_CONFIG && BATTLE_CONFIG.minPoints) || (isBugmon ? 150 : 120);
    if (battleVisualState.points >= minPts) {
      // 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
      if (window.handleBattleOutcome) {
        window.handleBattleOutcome('victory');
      } else {
        await triggerMsg(`VICTORY! ${enemy.name.toUpperCase()} was debugged! Final Score: ${battleVisualState.points} PTS!`);
      }
      return { outcome: 'victory', damage, points: pts };
    } else {
      if (isBugmon) {
        // In Bugmon battle: failed to achieve minPoints before bug escaped
        if (window.handleBattleOutcome) {
          window.handleBattleOutcome('bugmon_escaped');
        } else {
          await triggerMsg('The bug got away...');
        }
        return { outcome: 'bugmon_escaped', reason: 'points_not_met', damage, points: pts };
      } else {
        // 2. If enemy HP <= 0 but points < minPoints: not a true win. Show
        // "The enemy is still glitching..." and trigger the Bugmon transformation (Piece 7).
        await triggerMsg('The enemy is still glitching...');
        await (window.triggerBugmonTransformation || triggerBugmonTransformation)();
        return { outcome: 'transformation', reason: 'enemy_glitching', damage, points: pts };
      }
    }
  }

  // 5. Enemy survived -> start the enemy turn to complete the full round
  const enemyTurnRes = await startEnemyTurn(false);
  return { outcome: (enemyTurnRes && enemyTurnRes.outcome) || 'turn_complete', damage, points: pts };
}

/**
 * handlePlayerCodePartial(outcome, challenge)
 * Partial passes (some tests pass, not all):
 * - No damage, but show "N/M tests passed" in the console.
 * - Player may keep editing and re-running until the timer ends.
 * - Each failed run costs nothing, but only the first full pass counts.
 */
function handlePlayerCodePartial(outcome, challenge) {
  const results = (outcome && outcome.results) ? outcome.results : [];
  const totalCount = results.length;
  const passedCount = results.filter(r => r.pass).length;
  const passSummaryText = `${passedCount}/${totalCount} tests passed`;

  // Show "N/M tests passed" in console
  if (window.appendConsoleLine) {
    window.appendConsoleLine(passSummaryText, 'console-warn');
    window.appendConsoleLine('> No damage dealt. Keep editing and re-run before time expires!', 'console-info');
  }

  if (window.typeText) {
    window.typeText(`${passSummaryText}. Adjust your code and re-run!`, 18);
  }

  return {
    passedCount,
    totalCount,
    summary: passSummaryText
  };
}

/**
 * handleTurnTimeout()
 * When the timer ends without a full pass:
 * - showMessage("Out of time!")
 * - no damage
 * - enemy attacks with 50% bonus damage
 */
async function handleTurnTimeout() {
  if (window.appendConsoleLine) {
    window.appendConsoleLine('TIMEOUT: Out of time! Turn failed. Bugmon attacks with 50% BONUS DAMAGE!', 'console-error');
  }

  const triggerMsg = window.showMessage || showMessage;

  // showMessage("Out of time!")
  await triggerMsg('Out of time!');

  // Enemy attacks with 50% bonus damage and completes the full round
  await startEnemyTurn(true);
}

/**
 * startEnemyTurn(isBonusDamage = false)
 * - During the enemy turn, disable the editor and show "ENEMY TURN..." in the code panel.
 * - Enemy attacks and damages player.
 * - Updates "Turns left: Y" after every full round.
 * - When 2 turns remain, counter blinks red as a warning.
 * - End-of-battle check (run after every round).
 * - When it's the player's turn again, show 3 new challenge cards.
 */
async function startEnemyTurn(isBonusDamage = false) {
  const player = (window.gameState && window.gameState.player) || { name: 'Codemon', maxHp: 100 };
  const enemy = (window.gameState && window.gameState.enemy) || { name: 'Bugmon', maxHp: 130 };

  const triggerAttack = window.playAttackAnimation || playAttackAnimation;
  const triggerHit = window.playHitAnimation || playHitAnimation;
  const triggerSetHp = window.setHp || setHp;
  const triggerMsg = window.showMessage || showMessage;

  // 1. Disable the editor and show "ENEMY TURN..." in the code panel
  setCodePanelEnemyTurnUI(true);

  if (window.appendConsoleLine) {
    window.appendConsoleLine('> ENEMY TURN...', 'console-warn');
  }

  // 2. Compute damage: normal or with 50% bonus damage
  const isBugmon = battleVisualState.isBugmon || (typeof window !== 'undefined' && window.gameState && window.gameState.isBugmonBattle);
  let enemyDmg;
  if (isBugmon) {
    // Bugmon attacks deal 12-20 damage
    const bugmonRoll = Math.floor(Math.random() * (20 - 12 + 1)) + 12;
    enemyDmg = isBonusDamage ? Math.round(bugmonRoll * 1.5) : bugmonRoll;
  } else {
    const baseDmg = ENEMY_BASE_DAMAGE;
    enemyDmg = isBonusDamage ? Math.round(baseDmg * 1.5) : baseDmg;
  }

  await new Promise(r => setTimeout(r, 600));

  if (window.gameState && window.gameState.battleActive === false) {
    return { outcome: 'aborted' };
  }

  // Pick dynamic move name from active enemy / Bugmon move list
  let moveName = isBugmon ? 'Glitch Strike' : 'Segfault Slam';
  const movePool = (isBugmon && enemy.bugmonVariant && Array.isArray(enemy.bugmonVariant.moves) && enemy.bugmonVariant.moves.length > 0)
    ? enemy.bugmonVariant.moves
    : (Array.isArray(enemy.moves) && enemy.moves.length > 0 ? enemy.moves : null);
  if (movePool && movePool.length > 0) {
    const picked = movePool[Math.floor(Math.random() * movePool.length)];
    if (picked && picked.name) {
      moveName = picked.name;
    }
  }

  if (isBonusDamage) {
    await triggerMsg(`${enemy.name.toUpperCase()} strikes with 50% BONUS DAMAGE via ${moveName} (${enemyDmg} DMG)!`);
  } else if (isBugmon) {
    await triggerMsg(`${enemy.name.toUpperCase()} unleashed ${moveName} (${enemyDmg} DMG)!`);
  } else {
    await triggerMsg(`${enemy.name.toUpperCase()} countered with ${moveName} (${enemyDmg} DMG)!`);
  }

  // 3. Enemy attack animations
  await triggerAttack('enemy');
  const isHeavyEnemyHit = isBonusDamage || isBugmon || enemyDmg >= 18;
  await triggerHit('player', enemyDmg, isHeavyEnemyHit);

  // 4. Animate player HP bar
  const currentPlayerHp = (window.gameState && window.gameState.player && typeof window.gameState.player.hp === 'number')
    ? window.gameState.player.hp
    : battleVisualState.hp.player.current;
  const newPlayerHp = Math.max(0, currentPlayerHp - enemyDmg);

  if (window.gameState && window.gameState.player) {
    window.gameState.player.hp = newPlayerHp;
    window.gameState.player.currentHp = newPlayerHp;
  }

  await triggerSetHp('player', newPlayerHp, battleVisualState.hp.player.max);

  if (window.appendConsoleLine) {
    window.appendConsoleLine(`> ${enemy.name} dealt ${enemyDmg} DMG to ${player.name}!`, 'console-fail');
  }

  // =========================================================================
  // END OF FULL ROUND:
  // Update "Turns left: Y" after every full round.
  // When 2 turns remain, make the counter blink red as a warning.
  // =========================================================================
  battleVisualState.turnsLeft = Math.max(0, battleVisualState.turnsLeft - 1);
  updateHud(battleVisualState.points, battleVisualState.turnsLeft);
  if (window.gameState) {
    window.gameState.turnsLeft = battleVisualState.turnsLeft;
  }

  // =========================================================================
  // END-OF-BATTLE CHECK (Run after every round):
  // 1. If enemy HP <= 0 AND points >= minPoints: WIN. Show a victory screen.
  // 2. If enemy HP <= 0 but points < minPoints: not a true win. Show
  //    "The enemy is still glitching..." and trigger the Bugmon transformation.
  // 3. If turns run out and points < minPoints: trigger the Bugmon transformation.
  // 4. If player HP <= 0: lose.
  // 5. Bugmon battle failure: "The bug got away..."
  // =========================================================================
  const currentEnemyHp = (window.gameState && window.gameState.enemy && typeof window.gameState.enemy.hp === 'number')
    ? window.gameState.enemy.hp
    : battleVisualState.hp.enemy.current;

  const roundEval = evaluateBattleConditions(
    newPlayerHp,
    currentEnemyHp,
    battleVisualState.points,
    battleVisualState.turnsLeft
  );

  if (roundEval) {
    if (roundEval.outcome === 'victory') {
      if (window.handleBattleOutcome) {
        window.handleBattleOutcome('victory');
      } else {
        await triggerMsg(`VICTORY! ${enemy.name.toUpperCase()} was debugged! Final Score: ${battleVisualState.points} PTS!`);
      }
      return roundEval;
    }

    if (roundEval.outcome === 'bugmon_escaped') {
      if (window.handleBattleOutcome) {
        window.handleBattleOutcome('bugmon_escaped');
      } else {
        await triggerMsg('The bug got away...');
      }
      return roundEval;
    }

    if (roundEval.outcome === 'defeat') {
      if (window.handleBattleOutcome) {
        window.handleBattleOutcome('defeat');
      } else {
        await triggerMsg(newPlayerHp <= 0 ? `DEFEAT! ${player.name.toUpperCase()} fainted!` : `DEFEAT! Turns ran out!`);
      }
      return roundEval;
    }

    if (roundEval.outcome === 'transformation') {
      if (roundEval.reason === 'enemy_glitching') {
        await triggerMsg('The enemy is still glitching...');
      }
      await (window.triggerBugmonTransformation || triggerBugmonTransformation)();
      return roundEval;
    }
  }

  // When it's the player's turn again, show 3 new challenge cards
  await new Promise(r => setTimeout(r, 800));
  if (window.startPlayerTurn) {
    window.startPlayerTurn();
  }
  return { outcome: 'player_turn' };
}

// ---------------------------------------------------------------------------
// 10. EXPOSE FUNCTIONS FOR CODE PANEL & GLOBAL SCOPE
// ---------------------------------------------------------------------------
window.BattleEngine = {
  // Constants & Config
  BATTLE_CONFIG,
  BASE_DAMAGE,
  POINTS_AWARDED,
  ENEMY_BASE_DAMAGE,

  // Sprites
  SPRITE_PALETTE,
  BUGMON_PALETTE,
  SPRITE_BUGMON_FRONT,
  SPRITE_PYRAWR_FRONT,
  SPRITE_JASKULL_FRONT,
  SPRITE_CPLUSAUR_FRONT,
  SPRITE_JAVAGRON_FRONT,
  SPRITE_JAVAGRON_BACK,
  SPRITE_BUG_JAVAGRON_FRONT,
  SPRITE_RUBICORN_FRONT,
  SPRITE_RUBICORN_BACK,
  SPRITE_BUG_RUBICORN_FRONT,
  SPRITE_SQLOPH_FRONT,
  SPRITE_SQLOPH_BACK,
  SPRITE_BUG_SQLOPH_FRONT,
  SPRITE_ERROR_404_FRONT,
  SPRITE_SYNTAX_ERROR_FRONT,
  SPRITE_ERROR_500_FRONT,
  SPRITE_NULL_POINTER_FRONT,
  SPRITE_STACK_OVERFLOW_FRONT,
  SPRITE_BUG_PYRAWR_FRONT,
  SPRITE_BUG_JASKULL_FRONT,
  SPRITE_BUG_CPLUSAUR_FRONT,
  SPRITE_BUG_BUGMON_FRONT,
  SPRITE_PYRAWR_BACK,
  SPRITE_JASKULL_BACK,
  SPRITE_CPLUSAUR_BACK,
  drawPixelSprite,

  // Visual & Animation Functions
  playAttackAnimation,
  playHitAnimation,
  showFloatingDamage,
  showFloatingHeal,
  triggerHeavyScreenShake,
  showMessage,
  typeText,
  setHp,
  updateHud,

  // Battle Logic Handlers & Conditions
  evaluateBattleConditions,
  triggerBugmonTransformation,
  handlePlayerCodeSuccess,
  handlePlayerCodePartial,
  handleTurnTimeout,
  startEnemyTurn,
  setCodePanelEnemyTurnUI,

  // Renderer & state
  render: renderBattleScene,
  visualState: battleVisualState,

  // Pixel Font & Text Renderer
  PIXEL_FONT_3X5,
  drawPixelText,

  // Arena Backgrounds & Helpers
  BATTLE_BACKGROUNDS,
  getBackgroundById,
  setBackground,
  getNextBackground,
  getBackgroundForEnemy,
  updateArenaDisplay
};

// Global direct bindings for code panel and external modules
window.BATTLE_CONFIG = BATTLE_CONFIG;
window.evaluateBattleConditions = evaluateBattleConditions;
window.triggerBugmonTransformation = triggerBugmonTransformation;
window.playAttackAnimation = playAttackAnimation;
window.playHitAnimation = playHitAnimation;
window.showFloatingDamage = showFloatingDamage;
window.showFloatingHeal = showFloatingHeal;
window.triggerHeavyScreenShake = triggerHeavyScreenShake;
window.showMessage = showMessage;
window.typeText = typeText;
window.setHp = setHp;
window.updateHud = updateHud;
window.handlePlayerCodeSuccess = handlePlayerCodeSuccess;
window.handlePlayerCodePartial = handlePlayerCodePartial;
window.handleTurnTimeout = handleTurnTimeout;
window.startEnemyTurn = startEnemyTurn;
window.setCodePanelEnemyTurnUI = setCodePanelEnemyTurnUI;
window.BATTLE_BACKGROUNDS = BATTLE_BACKGROUNDS;
window.getBackgroundById = getBackgroundById;
window.setBackground = setBackground;
window.getNextBackground = getNextBackground;
window.getBackgroundForEnemy = getBackgroundForEnemy;
window.updateArenaDisplay = updateArenaDisplay;
window.drawPixelText = drawPixelText;
window.PIXEL_FONT_3X5 = PIXEL_FONT_3X5;
window.BattleScene = window.BattleEngine;

