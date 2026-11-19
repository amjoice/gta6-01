// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// Solmar Bay — shared constants. A sun-soaked coastal city, invented for this game.
// Nothing here comes from any commercial game: all names, places and people are original.
export const STEP = 1 / 60;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const WORLD_W = 3600;
export const WORLD_H = 2600;
export const ROAD_W = 96;
export const SAVE_KEY = 'solmar-bay-save-v1';

// City grid: roads run at these coordinates; blocks sit between them.
export const ROADS_X = [240, 640, 1040, 1440, 1840, 2240, 2640, 3040, 3360];
export const ROADS_Y = [200, 560, 920, 1280, 1640, 2000, 2280];
export const BEACH_TOP = 2280; // south of the last road: sand, then the sea.

export const PLAYER = {
  radius: 13,
  walkSpeed: 210,
  runSpeed: 320,
  maxHealth: 100,
  punchDamage: 25,
  punchRange: 46,
  punchArc: 1.2,
};

export const CAR = {
  length: 64,
  width: 30,
  accel: 430,
  brake: 720,
  maxSpeed: 560,
  reverseMax: 180,
  turnRate: 2.7,
  drag: 0.5,
};

export const WANTED_MAX = 5;
// Wanted stars decay after this many quiet seconds per star.
export const WANTED_DECAY = 22;

export const COLORS = {
  grass: '#7fae5a',
  grassDark: '#74a24f',
  road: '#3a3f46',
  roadLine: '#e8d44d',
  sidewalk: '#b9b3a4',
  sand: '#e6cf9a',
  sea: '#2f7fb8',
  seaDeep: '#256a9e',
  park: '#5d9b4a',
};
