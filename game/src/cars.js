// Cars of Porto Verde: physics, driving, stealing, damage.
// A car is a body with a heading, a speed and a type; the driver steers it.

import { CAR_TYPES, WORLD_W, WORLD_H, SEA_Y } from './config.js';
import { hitsBuilding } from './city.js';
import { pick } from './rng.js';

let nextCarId = 1;

export function createCar(type, x, y, angle) {
  const spec = CAR_TYPES[type] || CAR_TYPES.sedan;
  return {
    id: nextCarId++,
    type,
    x, y,
    angle: angle || 0,
    speed: 0,
    health: 100,
    color: spec.color,
    len: spec.len,
    wid: spec.wid,
    driver: null, // the player, a traffic AI object, or null (parked)
    brakeLight: false,
    skid: 0,
    smoke: 0,
  };
}

export function randomCarType(rng) {
  return pick(rng, ['sedan', 'sedan', 'sedan', 'taxi', 'taxi', 'truck', 'sport']);
}

// Drive a car with throttle (-1..1) and steering (-1..1).
export function driveCar(car, throttle, steer, dt) {
  const spec = CAR_TYPES[car.type];
  const forward = { x: Math.cos(car.angle), y: Math.sin(car.angle) };

  // Accelerate along the heading; reverse is slower than forward.
  const accel = throttle >= 0 ? spec.accel : spec.accel * 0.65;
  car.speed += throttle * accel * dt;
  // Drag and rolling resistance.
  car.speed -= car.speed * 0.9 * dt;
  if (car.speed > spec.top) car.speed = spec.top;
  if (car.speed < -spec.top * 0.45) car.speed = -spec.top * 0.45;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;

  // Steering bites harder the faster the car goes, up to a point.
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 90);
  car.angle += steer * spec.grip * steerAuthority * dt * Math.sign(car.speed || 1);
  car.brakeLight = throttle < 0 && car.speed > 30;

  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;

  // Buildings stop a car cold (with a thud the caller can hear).
  // The car is a circle of radius 18 at its centre for collision.
  if (currentCity && hitsBuilding(currentCity, nx, ny, 18)) {
    car.speed *= -0.25;
    car.health = Math.max(0, car.health - Math.abs(car.speed) * 0.02 - 2);
    car.skid = 0.4;
    return true;
  }
  car.x = nx;
  car.y = ny;

  // Stay in the world and out of the sea.
  car.x = Math.max(30, Math.min(WORLD_W - 30, car.x));
  car.y = Math.max(30, Math.min(SEA_Y - 24, car.y));
  if (car.skid > 0) car.skid -= dt;
  if (car.health < 35) car.smoke += dt;
  return false;
}

// The city the cars currently drive in (set once per frame by the game).
let currentCity = null;
export function setCarCity(city) {
  currentCity = city;
}

// A car is wrecked when its health runs out.
export function isWrecked(car) {
  return car.health <= 0;
}

// Distance from a point to a car, for "nearest car" checks.
export function distToCar(car, x, y) {
  const dx = car.x - x;
  const dy = car.y - y;
  return Math.hypot(dx, dy);
}

// The closest car to a point within maxDist, or null.
export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const c of cars) {
    if (isWrecked(c)) continue;
    const d = distToCar(c, x, y);
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best;
}
