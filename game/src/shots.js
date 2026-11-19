// Screenshot staging for Porto Verde.
// The dossier's screenshots are real renders of the game, staged through a
// URL query: ?shot=<name>&seed=<n>. Each name sets up one scene — the city,
// a chase, a mission, a drive — so the shot shows the game at its best.

import { SCREEN_PLAY } from './config.js';
import { createCar } from './cars.js';
import { addWanted } from './police.js';
import { startMission } from './missions.js';

// The scenes the dossier uses. The name is the shot, the seed fixes the city.
export const SHOT_NAMES = ['chase', 'city', 'mission', 'drive', 'start'];

export function readShotParams() {
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      shot: params.get('shot') || null,
      seed: parseInt(params.get('seed') || '7', 10) || 7,
    };
  } catch (e) {
    return { shot: null, seed: 7 };
  }
}

// Stage one scene on a fresh game. Returns true when a scene was staged.
export function stageShot(game, name) {
  if (!SHOT_NAMES.includes(name)) return false;

  // Every staged scene skips the menu and starts playing.
  game.screen = SCREEN_PLAY;
  game.time = 2;

  if (name === 'start') {
    // The title screen itself.
    game.screen = 'menu';
    return true;
  }

  if (name === 'city') {
    // Milo on foot downtown, traffic and pedestrians around him.
    game.player.x = 1060;
    game.player.y = 660;
    game.player.angle = Math.PI / 4;
    game.player.onFoot = true;
    game.player.car = null;
    game.police.wanted = 0;
    return true;
  }

  if (name === 'chase') {
    // Milo in a sports car on the avenue, three stars, two interceptors on him.
    const car = createCar('sport', 1460, 1060, 0);
    car.speed = 380;
    game.cars.push(car);
    game.player.x = car.x;
    game.player.y = car.y;
    game.player.angle = 0;
    game.player.onFoot = false;
    game.player.car = car;
    car.driver = game.player;
    addWanted(game.police, 3);
    // Put the interceptors close behind so the chase reads in one frame.
    for (const pc of game.police.cars) {
      pc.x = car.x - 150 - Math.random() * 80;
      pc.y = car.y + (Math.random() < 0.5 ? -46 : 46);
      pc.angle = 0;
      pc.speed = 380;
    }
    return true;
  }

  if (name === 'mission') {
    // The Delivery in progress: Milo driving toward the second drop.
    game.mission.index = 2;
    game.mission.stage = 1;
    startMission(game.mission);
    game.mission.stage = 1;
    const car = createCar('sedan', 1060, 1460, Math.PI / 2);
    car.speed = 220;
    game.cars.push(car);
    game.player.x = car.x;
    game.player.y = car.y;
    game.player.angle = Math.PI / 2;
    game.player.onFoot = false;
    game.player.car = car;
    car.driver = game.player;
    addWanted(game.police, 1);
    return true;
  }

  if (name === 'drive') {
    // A calm coastal drive along the south avenue at golden hour.
    const car = createCar('sport', 660, 2260, 0);
    car.speed = 300;
    game.cars.push(car);
    game.player.x = car.x;
    game.player.y = car.y;
    game.player.angle = 0;
    game.player.onFoot = false;
    game.player.car = car;
    car.driver = game.player;
    game.police.wanted = 0;
    return true;
  }

  return false;
}
