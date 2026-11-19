// Porto Verde — the game itself: state, loop, crimes, missions, save.
// Milo Ferrante drives for Sofia Delgado. Five jobs, one city.

import {
  VIEW_W, VIEW_H, WORLD_W, SEA_Y, SCREEN_MENU, SCREEN_PLAY, SCREEN_PAUSED,
  SCREEN_BUSTED, SCREEN_WASTED, KEYS, PLAYER_MAX_HEALTH,
} from './config.js';
import { makeRng, rangeInt } from './rng.js';
import { buildCity, randomRoadPoint, randomParkingSpot } from './city.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { saveGame, loadGame, hasSave, clearSave } from './save.js';
import { createPlayer, updatePlayerOnFoot, playerPunch, tickPlayerTimers, enterCar, exitCar, hurtPlayer } from './player.js';
import { createCar, driveCar, nearestCar, isWrecked, setCarCity, randomCarType } from './cars.js';
import { createPed, updatePed, createTrafficCar, updateTrafficCar } from './actors.js';
import { createPolice, addWanted, balanceUnits, updatePoliceCar, updateOfficer, decayWanted } from './police.js';
import { createMissionState, currentMission, missionTarget, missionObjective, startMission, advanceMission, tickMissionTimer, missionTimeLeft } from './missions.js';
import { drawHud, drawMinimap } from './hud.js';
import { createCamera, updateCamera, renderWorld, renderOverlay } from './render.js';
import { readShotParams, stageShot } from './shots.js';

const TRAFFIC_COUNT = 14;
const PED_COUNT = 26;
const PARKED_COUNT = 10;

export function createGame(seed) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const player = createPlayer(1300, 1300);
  const police = createPolice();
  const mission = createMissionState();

  // Parked cars in the lots and along the kerb.
  const cars = [];
  for (let i = 0; i < PARKED_COUNT; i++) {
    const spot = randomParkingSpot(city, rng);
    if (spot) cars.push(createCar(randomCarType(rng), spot.x, spot.y, spot.angle));
  }
  // The mission car for job two waits at the plaza.
  cars.push(createCar('sport', 1300, 1240, 0));

  // Traffic.
  for (let i = 0; i < TRAFFIC_COUNT; i++) cars.push(createTrafficCar(rng, city));

  // Pedestrians.
  const peds = [];
  for (let i = 0; i < PED_COUNT; i++) peds.push(createPed(rng, city));

  return {
    seed,
    rng,
    city,
    player,
    cars,
    peds,
    police,
    mission,
    camera: createCamera(),
    screen: SCREEN_MENU,
    time: 0,
    toast: '',
    toastT: 0,
    hasSave: hasSave(),
    missionObjective: '',
    missionTargetPos: null,
    missionTimeLeft: null,
  };
}

function showToast(game, text, seconds) {
  game.toast = text;
  game.toastT = seconds || 3;
}

// Put Milo back on his feet after a bust or a trip to the hospital.
function respawn(game, x, y, fine, label) {
  const p = game.player;
  if (p.car) {
    p.car.driver = null;
    p.car = null;
  }
  p.onFoot = true;
  p.x = x;
  p.y = y;
  p.health = Math.max(50, p.health);
  p.money = Math.max(0, p.money - fine);
  game.police.wanted = 0;
  game.police.cars = [];
  game.police.officers = [];
  showToast(game, `${label} — fined $${fine}`, 4);
}

function completeMission(game) {
  const m = currentMission(game.mission);
  const reward = m ? m.reward : 0;
  game.player.money += reward;
  game.totalEarned = (game.totalEarned || 0) + reward;
  game.mission.index += 1;
  game.mission.stage = 0;
  game.mission.timer = 0;
  showToast(game, `Job done! +$${reward}`, 4);
  saveGame(game);
  // The next job may need the heat turned up.
  const next = currentMission(game.mission);
  if (next && next.kind === 'evade') {
    addWanted(game.police, 3);
    showToast(game, 'The PVPD is onto you — lose them!', 4);
  }
}

function failMission(game) {
  showToast(game, 'Job failed — time ran out. Try again.', 4);
  startMission(game.mission);
}

function updatePlaying(game, input, audio, dt) {
  const p = game.player;
  const city = game.city;

  setCarCity(city);
  tickPlayerTimers(p, dt);

  // --- Player ---
  if (p.onFoot) {
    updatePlayerOnFoot(p, city, input, dt);
    // Enter a car.
    if (input.wasPressed(KEYS.enterCar)) {
      const car = nearestCar(game.cars, p.x, p.y, 64);
      if (car && !car.driver) {
        enterCar(p, car);
        audio.door();
        if (car.type !== 'police') addWanted(game.police, 1);
        showToast(game, car.type === 'police' ? 'You stole a PVPD interceptor!' : 'Car stolen — the PVPD noticed', 2.5);
      }
    }
    // Punch.
    if (input.wasPressed(KEYS.punch)) {
      const hit = playerPunch(p);
      if (hit) {
        audio.punch();
        for (const ped of game.peds) {
          if (ped.state !== 'down' && Math.hypot(ped.x - hit.x, ped.y - hit.y) < hit.r + 10) {
            ped.state = 'down';
            addWanted(game.police, 1);
            showToast(game, 'Assault! The PVPD noticed', 2);
          }
        }
      }
    }
  } else if (p.car) {
    // Driving.
    const car = p.car;
    let throttle = 0;
    let steer = 0;
    if (input.isDown(KEYS.up)) throttle += 1;
    if (input.isDown(KEYS.down)) throttle -= 1;
    if (input.isDown(KEYS.left)) steer -= 1;
    if (input.isDown(KEYS.right)) steer += 1;
    const crashed = driveCar(car, throttle, steer, dt);
    if (crashed) audio.crash();
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = car.speed;
    audio.engine(Math.abs(car.speed) / 470, true);
    // Running over a pedestrian is a crime.
    for (const ped of game.peds) {
      if (ped.state !== 'down' && Math.abs(car.speed) > 120 && Math.hypot(ped.x - car.x, ped.y - car.y) < 30) {
        ped.state = 'down';
        addWanted(game.police, 1);
        showToast(game, 'You ran someone over!', 2);
      }
    }
    // A wrecked car throws Milo out.
    if (isWrecked(car)) {
      exitCar(p, city);
      showToast(game, 'Your car is wrecked!', 3);
    }
    // Exit the car.
    if (input.wasPressed(KEYS.enterCar)) {
      exitCar(p, city);
      audio.door();
    }
  }

  // --- Traffic and pedestrians ---
  for (const car of game.cars) {
    if (car.driver && car.driver.ai && !car.driver.police) {
      updateTrafficCar(car, city, game.cars, dt);
    }
  }
  const danger = !p.onFoot && p.car && Math.abs(p.car.speed) > 150
    ? { x: p.car.x, y: p.car.y, r: 130 }
    : null;
  for (const ped of game.peds) updatePed(ped, city, danger, dt);

  // --- Police ---
  balanceUnits(game.police, game.rng, p.x, p.y);
  for (const pc of game.police.cars) {
    const dist = updatePoliceCar(pc, p.x, p.y, dt);
    // A police car ramming Milo's car damages it; ramming Milo hurts him.
    if (dist < 46) {
      if (!p.onFoot && p.car) {
        p.car.health = Math.max(0, p.car.health - 12 * dt);
        p.car.speed *= 0.995;
      } else if (p.onFoot) {
        if (hurtPlayer(p, 22 * dt)) {
          game.screen = SCREEN_WASTED;
          audio.busted();
          return;
        }
      }
    }
  }
  // Officers arrest Milo on foot.
  for (const officer of game.police.officers) {
    if (p.onFoot && game.police.wanted > 0) {
      if (updateOfficer(officer, p.x, p.y, dt)) {
        game.screen = SCREEN_BUSTED;
        audio.busted();
        return;
      }
    }
  }
  decayWanted(game.police, dt);
  audio.siren(game.police.wanted, dt);

  // --- Missions ---
  const result = advanceMission(game.mission, p.x, p.y, !p.onFoot, game.police.wanted, dt);
  if (result === 'complete') {
    audio.missionDone();
    completeMission(game);
  } else if (result === 'stage') {
    audio.pickup();
    showToast(game, 'Drop complete — next one!', 2.5);
  }
  if (tickMissionTimer(game.mission, dt)) failMission(game);
  game.missionObjective = missionObjective(game.mission);
  game.missionTargetPos = missionTarget(game.mission);
  game.missionTimeLeft = missionTimeLeft(game.mission);

  // --- Camera and clock ---
  const focusX = p.onFoot ? p.x : p.car.x;
  const focusY = p.onFoot ? p.y : p.car.y;
  updateCamera(game.camera, focusX, focusY);
  if (game.toastT > 0) game.toastT -= dt;

  // Pause.
  if (input.wasPressed(KEYS.pause)) {
    game.screen = SCREEN_PAUSED;
    audio.engine(0, false);
  }
  // The game saves itself when a job is done; there is no manual save key
  // in play, so S stays free for driving south.
}

function updateMenu(game, input, audio) {
  // Click or Enter starts; C continues a saved game.
  const start = input.wasPressed(KEYS.start) || input.mouse.clicked;
  if (start) {
    audio.unlock();
    audio.click();
    game.screen = SCREEN_PLAY;
    startMission(game.mission);
    return;
  }
  if (input.wasPressed(['KeyC']) && game.hasSave) {
    const data = loadGame();
    if (data) {
      audio.unlock();
      game.player.money = data.money;
      game.player.health = data.health;
      game.player.x = data.x;
      game.player.y = data.y;
      game.police.wanted = data.wanted || 0;
      game.mission.index = data.missionIndex || 0;
      game.mission.missionsDone = data.missionsDone || 0;
      game.totalEarned = data.totalEarned || 0;
      game.screen = SCREEN_PLAY;
      startMission(game.mission);
      showToast(game, 'Save loaded — welcome back', 3);
    }
  }
}

function updateEndScreen(game, input, audio, label) {
  if (input.wasPressed(KEYS.start) || input.mouse.clicked) {
    audio.click();
    if (label === 'busted') respawn(game, 1300, 1300, 150, 'Busted');
    else respawn(game, 260, 260, 200, 'Wasted');
    game.player.health = PLAYER_MAX_HEALTH;
    game.screen = SCREEN_PLAY;
  }
}

// Boot the game: build the world, wire the loop, and run.
export function boot() {
  const canvas = document.getElementById('game');
  const mapCanvas = document.getElementById('minimap');
  const ctx = canvas.getContext('2d');
  const mapCtx = mapCanvas.getContext('2d');
  const input = createInput(canvas);
  const audio = createAudio();

  const params = readShotParams();
  const game = createGame(params.seed);
  game.audio = audio;

  // A staged screenshot scene starts playing at once.
  if (params.shot) stageShot(game, params.shot);

  let last = performance.now();

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.time += dt;

    if (game.screen === SCREEN_PLAY) {
      updatePlaying(game, input, audio, dt);
    } else if (game.screen === SCREEN_MENU) {
      updateMenu(game, input, audio);
    } else if (game.screen === SCREEN_PAUSED) {
      if (input.wasPressed(KEYS.pause) || input.mouse.clicked) {
        game.screen = SCREEN_PLAY;
        audio.click();
      }
      if (input.wasPressed(['KeyR'])) {
        const fresh = createGame(game.seed);
        Object.assign(game, fresh);
        game.screen = SCREEN_PLAY;
        startMission(game.mission);
      }
    } else if (game.screen === SCREEN_BUSTED) {
      updateEndScreen(game, input, audio, 'busted');
    } else if (game.screen === SCREEN_WASTED) {
      updateEndScreen(game, input, audio, 'wasted');
    }

    // Mute toggle works on every screen.
    if (input.wasPressed(KEYS.mute)) audio.toggleMute();

    // Draw.
    if (game.screen === SCREEN_MENU) {
      renderWorld(ctx, game);
      renderOverlay(ctx, game);
    } else {
      renderWorld(ctx, game);
      drawHud(ctx, game);
      drawMinimap(mapCtx, mapCanvas.width, mapCanvas.height, game);
      renderOverlay(ctx, game);
    }

    input.endFrame();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
