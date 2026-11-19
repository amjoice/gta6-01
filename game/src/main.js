// Boot and the one loop for SOLMAR BAY, an original open-world crime game: a coastal
// city to explore on foot and by car, traffic and pedestrians, cars to steal, a wanted
// level with police, five story missions, combat, a HUD with minimap, a start screen,
// pause, and localStorage saves. Sound is synthesized with WebAudio; all art is drawn
// in code — no external assets, no network requests.
//
// ?seed=N fixes the city. ?shot=chase|city|mission|drive (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createGame } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_INTERACT, ACTION_PAUSE, ACTION_PUNCH, createInput } from './input.js';
import { createRenderer } from './render.js';
import { SCREEN_BUSTED, SCREEN_DONE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './save.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const audio = createAudio();
const game = createGame(createRandom(seed), audio);
const renderer = createRenderer(canvas);

function runShot(name) {
  const scene = stageShot(name, game);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveTimer = 0;
  // One-shot combat/interact presses are queued here by handleActions (which takes
  // the raw flags first) so they survive into the next simulation step.
  const pending = { punch: false, enter: false, interact: false };

  const saved = loadSave();
  game.hasSave = !!saved;

  function announce(message) {
    status.textContent = message;
  }

  function applySave(data) {
    if (!data) return;
    game.money = typeof data.money === 'number' ? data.money : game.money;
    game.player.health = typeof data.health === 'number' ? data.health : 100;
    game.player.x = typeof data.x === 'number' ? data.x : game.player.x;
    game.player.y = typeof data.y === 'number' ? data.y : game.player.y;
    if (typeof data.missionIndex === 'number' && data.missionIndex >= 0 && data.missionIndex < 5) {
      game.startMission(data.missionIndex);
    }
    if (typeof data.time === 'number') game.clockMinutes = data.time;
  }

  function startGame(fresh) {
    audio.unlock();
    if (fresh || !saved) {
      game.reset();
    } else {
      game.reset();
      applySave(saved);
    }
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing Solmar Bay. Mission 1: meet Rico at Central Plaza.');
  }

  function step() {
    const axes = input.axes();
    // Mouse aim in world coordinates.
    const aimView = input.aim();
    const aim = {
      x: game.camera.x + aimView.x,
      y: game.camera.y + aimView.y,
    };
    const stepActions = { punch: pending.punch, enter: pending.enter, interact: pending.interact };
    pending.punch = false;
    pending.enter = false;
    pending.interact = false;
    game.step(STEP, axes, aim, input.shooting(), stepActions);
    if (stepActions.punch) audio.punch();
    const speed = game.player.inCar ? Math.abs(game.player.inCar.speed) : 0;
    audio.update(STEP, !!game.player.inCar, speed, game.wanted);
    if (game.player.health <= 0) {
      screen = SCREEN_OVER;
      announce('Wasted. Press Space to try again.');
    } else if (game.storyDone && screen === SCREEN_PLAY) {
      screen = SCREEN_DONE;
      announce('Story complete. Press Space to keep free-roaming.');
    }
    // Autosave every 10 seconds of play.
    saveTimer += STEP;
    if (saveTimer > 10) {
      saveTimer = 0;
      writeSave(game);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM) audio.unlock();
    if (actions & ACTION_PUNCH) pending.punch = true;
    if (actions & ACTION_ENTER) pending.enter = true;
    if (actions & ACTION_INTERACT) pending.interact = true;
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER || screen === SCREEN_BUSTED || screen === SCREEN_DONE)) {
      startGame(screen === SCREEN_TITLE ? !saved : true);
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      writeSave(game);
      announce('Paused. Progress saved.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_TITLE) {
      // A living backdrop behind the title: traffic rolls on, nobody gets hurt.
      while (accumulator >= STEP) {
        game.step(STEP, { x: 0, y: 0, run: false }, { x: game.player.x, y: game.player.y }, false, {});
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(game, screen);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      writeSave(game);
      announce('Paused. Progress saved.');
    }
  });

  announce('Solmar Bay. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
