// Porto Verde — configuration and tuning constants.
// A sun-soaked coastal city: warm sand, terracotta roofs, teal sea.

export const WORLD_W = 2600;
export const WORLD_H = 2600;

// Road grid: vertical and horizontal avenues. Roads are 92 wide.
export const ROAD_W = 92;
export const ROADS_X = [260, 660, 1060, 1460, 1860, 2260];
export const ROADS_Y = [260, 660, 1060, 1460, 1860, 2260];

// The sea begins at this y; the strip just above it is sand beach.
export const SEA_Y = 2420;
export const BEACH_H = 70;

// Canvas / camera
export const VIEW_W = 1280;
export const VIEW_H = 800;

// Player on foot
export const PLAYER_WALK = 175;
export const PLAYER_RUN = 285;
export const PLAYER_RADIUS = 14;
export const PLAYER_MAX_HEALTH = 100;

// Cars
export const CAR_TYPES = {
  sedan: { accel: 420, top: 330, grip: 2.6, len: 52, wid: 26, color: '#c94f43' },
  taxi: { accel: 400, top: 310, grip: 2.6, len: 52, wid: 26, color: '#f2b705' },
  truck: { accel: 260, top: 220, grip: 2.0, len: 66, wid: 30, color: '#5b7a99' },
  sport: { accel: 620, top: 470, grip: 3.4, len: 54, wid: 26, color: '#1fbf75' },
  police: { accel: 560, top: 430, grip: 3.1, len: 54, wid: 26, color: '#20242e' },
};

// Wanted / police
export const WANTED_MAX = 5;
export const WANTED_DECAY_SECONDS = 14;
export const BUSTED_RADIUS = 46;
export const POLICE_SPAWN_DIST = 620;

// Missions pay out in dollars; the story is worth $3,050 in all.
export const MISSION_REWARDS = [200, 350, 500, 600, 1000];

// Screen states
export const SCREEN_MENU = 'menu';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';

// Palette: sun-soaked Porto Verde
export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#6d9c54',
  sand: '#e8d5a3',
  sea: '#2e8fa8',
  seaDeep: '#1f6f8b',
  road: '#3d3a38',
  roadLine: '#e8d44d',
  sidewalk: '#b9b2a4',
  plaza: '#c9b896',
  roofA: '#c96f4a',
  roofB: '#d9a05b',
  roofC: '#8a6f8e',
  roofD: '#5f8a6b',
  wall: '#e6ddc9',
  tree: '#3f7d44',
  treeDark: '#2f6334',
};

// Key bindings (KeyboardEvent.code)
export const KEYS = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  enterCar: ['KeyE'],
  punch: ['Space'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  start: ['Enter'],
};
