// Screenshot scenes behind ?shot=chase|city|mission|drive. Each one stages the real
// game — real rules, real world — then steers it forward with a simple autopilot for a
// few seconds, so the frame is what live play looks like and the same seed repeats it.
import { STEP } from './config.js';
import { ROADS_X, ROADS_Y } from './config.js';
import { SCREEN_PLAY } from './hud.js';

// Road-following waypoint: drive/walk along the nearest road toward the target,
// turning at the intersection when aligned, instead of cutting diagonally through
// buildings. Returns the next waypoint for (x, y) heading to (tx, ty).
function waypoint(x, y, tx, ty) {
  let bestRx = ROADS_X[0];
  let bestDx = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestDx) {
      bestDx = d;
      bestRx = rx;
    }
  }
  let bestRy = ROADS_Y[0];
  let bestDy = Infinity;
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestDy) {
      bestDy = d;
      bestRy = ry;
    }
  }
  if (bestDy <= bestDx) {
    // On (or nearest to) a horizontal road: travel along it, then turn up/down.
    if (Math.abs(tx - x) > 120) return { x: tx, y: bestRy };
    return { x: bestRx, y: ty };
  }
  if (Math.abs(ty - y) > 120) return { x: bestRx, y: ty };
  return { x: tx, y: bestRy };
}

function autopilot(G) {
  const p = G.player;
  const t = G.missionTargetPos;
  const tx = t ? t.x : 1800;
  const ty = t ? t.y : 1300;
  if (p.inCar) {
    const car = p.inCar;
    const wp = waypoint(car.x, car.y, tx, ty);
    const want = Math.atan2(wp.y - car.y, wp.x - car.x);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    return {
      axes: { x: Math.max(-1, Math.min(1, diff * 2)), y: -1, run: false },
      aim: { x: 640, y: 360 },
      shoot: false,
      actions: {},
    };
  }
  const wp = waypoint(p.x, p.y, tx, ty);
  const want = Math.atan2(wp.y - p.y, wp.x - p.x);
  return {
    axes: {
      x: Math.abs(Math.cos(want)) > 0.3 ? Math.sign(Math.cos(want)) : 0,
      y: Math.abs(Math.sin(want)) > 0.3 ? Math.sign(Math.sin(want)) : 0,
      run: true,
    },
    aim: { x: 640 + Math.cos(want) * 100, y: 360 + Math.sin(want) * 100 },
    shoot: false,
    actions: {},
  };
}

function runForward(G, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const input = autopilot(G);
    G.step(STEP, input.axes, input.aim, input.shoot, input.actions);
    if (G.player.health <= 0) break;
  }
}

/** Stage the named scene on the live game object and return the screen to draw. */
export function stageShot(name, G) {
  G.reset();
  const p = G.player;
  if (name === 'chase') {
    // Police chase: 3 stars, cruisers closing in, mission 5 active, driving fast.
    G.startMission(4);
    const car = G.cars[0];
    car.x = 1840;
    car.y = 1280;
    car.angle = Math.PI; // west along the 1280 road, toward the safehouse
    car.speed = 320;
    p.inCar = car;
    car.kind = 'player';
    car.stolen = true;
    p.x = car.x;
    p.y = car.y;
    G.wanted = 3;
    G.wantedTimer = 0;
    runForward(G, 2.5);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'mission') {
    // Mission 3 in progress: courier run, first checkpoint ahead, timer ticking.
    G.startMission(2);
    const car = G.cars[1];
    car.x = 640;
    car.y = 320;
    car.angle = -Math.PI / 2; // north along the 640 road, toward drop 1
    car.speed = 200;
    p.inCar = car;
    car.kind = 'player';
    car.stolen = true;
    p.x = car.x;
    p.y = car.y;
    runForward(G, 2.5);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'drive') {
    // Cruising the Marina highway at speed, golden hour, no heat.
    const car = G.cars[2];
    car.x = 2640;
    car.y = 2000;
    car.angle = -Math.PI / 2;
    car.speed = 420;
    p.inCar = car;
    car.kind = 'player';
    car.stolen = true;
    p.x = car.x;
    p.y = car.y;
    G.startMission(1);
    runForward(G, 2.0);
    return { screen: SCREEN_PLAY };
  }
  // Default: 'city' — on foot in Central Plaza among traffic and pedestrians,
  // walking toward Rico (far enough that mission 1 is still in progress).
  p.x = 1100;
  p.y = 1500;
  p.angle = -Math.PI / 2;
  G.startMission(0);
  runForward(G, 1.5);
  return { screen: SCREEN_PLAY };
}
