// The player of Porto Verde: Milo Ferrante, a getaway driver.
// On foot he walks, runs and punches; in a car he drives it.

import {
  PLAYER_WALK, PLAYER_RUN, PLAYER_RADIUS, PLAYER_MAX_HEALTH,
  WORLD_W, WORLD_H, SEA_Y, KEYS,
} from './config.js';
import { resolveBuilding, onRoad } from './city.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    health: PLAYER_MAX_HEALTH,
    money: 250,
    onFoot: true,
    car: null,
    speed: 0,
    moving: false,
    punchTimer: 0,
    punchCooldown: 0,
    stepPhase: 0,
  };
}

// Move the player on foot. Returns nothing; mutates the player.
export function updatePlayerOnFoot(p, city, input, dt) {
  let dx = 0;
  let dy = 0;
  if (input.isDown(KEYS.up)) dy -= 1;
  if (input.isDown(KEYS.down)) dy += 1;
  if (input.isDown(KEYS.left)) dx -= 1;
  if (input.isDown(KEYS.right)) dx += 1;

  p.moving = dx !== 0 || dy !== 0;
  if (!p.moving) {
    p.speed = 0;
    return;
  }

  const len = Math.hypot(dx, dy);
  dx /= len;
  dy /= len;
  const running = input.isDown(KEYS.run);
  const speed = running ? PLAYER_RUN : PLAYER_WALK;
  p.speed = speed;
  p.angle = Math.atan2(dy, dx);
  p.stepPhase += dt * (running ? 13 : 9);

  p.x += dx * speed * dt;
  p.y += dy * speed * dt;

  // Stay inside the city and out of the sea.
  p.x = Math.max(PLAYER_RADIUS, Math.min(WORLD_W - PLAYER_RADIUS, p.x));
  p.y = Math.max(PLAYER_RADIUS, Math.min(SEA_Y - 14, p.y));
  resolveBuilding(city, p, PLAYER_RADIUS);
}

// A punch: a short arc in front of the player. Returns the punch point.
export function playerPunch(p) {
  if (p.punchCooldown > 0) return null;
  p.punchCooldown = 0.45;
  p.punchTimer = 0.22;
  return {
    x: p.x + Math.cos(p.angle) * 30,
    y: p.y + Math.sin(p.angle) * 30,
    r: 34,
  };
}

export function tickPlayerTimers(p, dt) {
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.punchTimer > 0) p.punchTimer -= dt;
}

// Step into a car: the player stops walking and the car becomes his.
export function enterCar(p, car) {
  p.onFoot = false;
  p.car = car;
  car.driver = p;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
}

// Step out beside the car, on the side with free ground.
export function exitCar(p, city) {
  const car = p.car;
  if (!car) return;
  car.driver = null;
  p.car = null;
  p.onFoot = true;
  // Try the driver's side first, then the other side.
  const side = Math.PI / 2;
  for (const s of [side, -side]) {
    const nx = car.x + Math.cos(car.angle + s) * 34;
    const ny = car.y + Math.sin(car.angle + s) * 34;
    if (nx > 20 && nx < WORLD_W - 20 && ny > 20 && ny < SEA_Y - 20) {
      p.x = nx;
      p.y = ny;
      p.angle = car.angle;
      resolveBuilding(city, p, PLAYER_RADIUS);
      return;
    }
  }
  p.x = car.x;
  p.y = car.y;
}

export function hurtPlayer(p, amount) {
  p.health = Math.max(0, p.health - amount);
  return p.health <= 0;
}

export function healPlayer(p, amount) {
  p.health = Math.min(PLAYER_MAX_HEALTH, p.health + amount);
}

// Is the player standing on a road (for the "jaywalking" flavour, unused by law)?
export function playerOnRoad(p) {
  return onRoad(p.x, p.y);
}
