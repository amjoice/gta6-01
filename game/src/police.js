// The Porto Verde police: the wanted level, pursuit, busted and wasted.
// The more stars, the more units chase you; lay low and the heat fades.

import { WANTED_MAX, WANTED_DECAY_SECONDS, BUSTED_RADIUS, WORLD_W, SEA_Y } from './config.js';
import { createCar, driveCar, distToCar } from './cars.js';
import { nearestRoadX, nearestRoadY } from './city.js';
import { range } from './rng.js';

// How many police cars hunt at each wanted level.
const UNITS_PER_STAR = [0, 1, 2, 3, 4, 5];

export function createPolice() {
  return {
    wanted: 0,
    decayTimer: WANTED_DECAY_SECONDS,
    cars: [], // police cars
    officers: [], // officers on foot
    bustedTimer: 0,
  };
}

// Raise the heat (clamped to the max). Returns the new level.
export function addWanted(police, n) {
  police.wanted = Math.max(0, Math.min(WANTED_MAX, police.wanted + n));
  police.decayTimer = WANTED_DECAY_SECONDS;
  return police.wanted;
}

// A police car: a black-and-white interceptor with a light bar.
// It spawns on a road near the player, facing them, so it can actually drive.
export function spawnPoliceCar(rng, playerX, playerY) {
  const roadX = nearestRoadX(playerX);
  const roadY = nearestRoadY(playerY);
  let x, y, angle;
  if (Math.abs(playerX - roadX) < Math.abs(playerY - roadY)) {
    // The nearest road runs north-south; spawn on it, ahead or behind.
    x = roadX + (rng() < 0.5 ? -22 : 22);
    const dir = rng() < 0.5 ? -1 : 1;
    y = playerY + dir * range(rng, 450, 650);
    angle = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    // The nearest road runs east-west.
    y = roadY + (rng() < 0.5 ? -22 : 22);
    const dir = rng() < 0.5 ? -1 : 1;
    x = playerX + dir * range(rng, 450, 650);
    angle = dir > 0 ? Math.PI : 0;
  }
  x = Math.max(40, Math.min(WORLD_W - 40, x));
  y = Math.max(40, Math.min(SEA_Y - 40, y));
  const car = createCar('police', x, y, angle);
  car.driver = { ai: true, police: true };
  return car;
}

// An officer on foot who chases the player to arrest him.
export function spawnOfficer(rng, playerX, playerY) {
  const angle = rng() * Math.PI * 2;
  return {
    x: Math.max(30, Math.min(WORLD_W - 30, playerX + Math.cos(angle) * 300)),
    y: Math.max(30, Math.min(SEA_Y - 30, playerY + Math.sin(angle) * 300)),
    angle: 0,
    speed: 200,
    phase: rng() * Math.PI * 2,
  };
}

// Keep the right number of police cars on the street for the wanted level.
export function balanceUnits(police, rng, playerX, playerY) {
  const want = UNITS_PER_STAR[police.wanted] || 0;
  while (police.cars.length < want) {
    police.cars.push(spawnPoliceCar(rng, playerX, playerY));
  }
  while (police.cars.length > want) {
    // The furthest unit gives up and drives off.
    let far = 0;
    let farD = -1;
    for (let i = 0; i < police.cars.length; i++) {
      const d = distToCar(police.cars[i], playerX, playerY);
      if (d > farD) { farD = d; far = i; }
    }
    police.cars.splice(far, 1);
  }
  // Officers only appear when the player is on foot and wanted.
  const wantOfficers = police.wanted >= 2 ? 1 : 0;
  while (police.officers.length < wantOfficers) {
    police.officers.push(spawnOfficer(rng, playerX, playerY));
  }
  while (police.officers.length > wantOfficers) police.officers.pop();
}

// A police car chases the player's position, ramming when it gets close.
export function updatePoliceCar(car, targetX, targetY, dt) {
  const dx = targetX - car.x;
  const dy = targetY - car.y;
  const dist = Math.hypot(dx, dy);
  const wantAngle = Math.atan2(dy, dx);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  // Ram at full throttle when close, cruise when far.
  const throttle = dist < 90 ? 1 : 0.85;
  driveCar(car, throttle, steer, dt);
  return dist;
}

// An officer runs at the player; if he gets close, the player is busted.
export function updateOfficer(officer, playerX, playerY, dt) {
  officer.phase += dt * 10;
  const dx = playerX - officer.x;
  const dy = playerY - officer.y;
  const d = Math.hypot(dx, dy);
  if (d > 4) {
    officer.angle = Math.atan2(dy, dx);
    officer.x += Math.cos(officer.angle) * officer.speed * dt;
    officer.y += Math.sin(officer.angle) * officer.speed * dt;
  }
  return d < BUSTED_RADIUS;
}

// Fade the wanted level when the player stays out of trouble.
export function decayWanted(police, dt) {
  if (police.wanted <= 0) return;
  police.decayTimer -= dt;
  if (police.decayTimer <= 0) {
    police.wanted -= 1;
    police.decayTimer = WANTED_DECAY_SECONDS;
  }
}

// The nearest police car to a point, for the minimap and the HUD.
export function nearestPoliceCar(police, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const c of police.cars) {
    const d = distToCar(c, x, y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
