// The people and traffic of Porto Verde.
// Pedestrians stroll the sidewalks and flee from trouble; traffic cars
// cruise the avenues, turn at intersections, and brake for jams.

import { WORLD_W, SEA_Y, ROAD_W } from './config.js';
import { randomSidewalkPoint, randomRoadPoint, nearestRoadX, nearestRoadY, onRoad } from './city.js';
import { createCar, driveCar, distToCar } from './cars.js';
import { pick, range } from './rng.js';

const PED_SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#2ecc71'];
const PED_SKINS = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac'];

// A pedestrian: walks the sidewalks, flees when scared.
export function createPed(rng, city) {
  const p = randomSidewalkPoint(rng);
  return {
    x: p.x, y: p.y,
    angle: rng() * Math.PI * 2,
    speed: range(rng, 28, 52),
    shirt: pick(rng, PED_SHIRTS),
    skin: pick(rng, PED_SKINS),
    state: 'walk', // walk | flee | down
    stateT: range(rng, 2, 8),
    targetX: p.x, targetY: p.y,
    phase: rng() * Math.PI * 2,
  };
}

export function updatePed(ped, city, danger, dt) {
  if (ped.state === 'down') return;
  ped.phase += dt * 8;

  // Flee from a danger point (a punch, a speeding car, a crash).
  if (danger) {
    const d = Math.hypot(ped.x - danger.x, ped.y - danger.y);
    if (d < danger.r) {
      ped.state = 'flee';
      ped.stateT = 1.6;
      ped.angle = Math.atan2(ped.y - danger.y, ped.x - danger.x);
    }
  }

  if (ped.state === 'flee') {
    ped.stateT -= dt;
    ped.x += Math.cos(ped.angle) * 120 * dt;
    ped.y += Math.sin(ped.angle) * 120 * dt;
    if (ped.stateT <= 0) ped.state = 'walk';
  } else {
    // Stroll toward a target, then pick a new one.
    ped.stateT -= dt;
    const dx = ped.targetX - ped.x;
    const dy = ped.targetY - ped.y;
    const d = Math.hypot(dx, dy);
    if (d < 12 || ped.stateT <= 0) {
      const t = randomSidewalkPoint(Math.random);
      ped.targetX = t.x;
      ped.targetY = t.y;
      ped.stateT = range(Math.random, 4, 10);
    } else {
      ped.angle = Math.atan2(dy, dx);
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
    }
  }

  ped.x = Math.max(20, Math.min(WORLD_W - 20, ped.x));
  ped.y = Math.max(20, Math.min(SEA_Y - 20, ped.y));
}

// A traffic car: a car with a simple driver that follows the avenues.
export function createTrafficCar(rng, city) {
  const p = randomRoadPoint(rng);
  const car = createCar(pick(rng, ['sedan', 'sedan', 'taxi', 'truck']), p.x, p.y, 0);
  // Start aligned with the road it sits on.
  if (Math.abs(p.x - nearestRoadX(p.x)) < 4) {
    car.angle = rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    car.angle = rng() < 0.5 ? 0 : Math.PI;
  }
  car.driver = { ai: true, cruise: range(rng, 90, 150), turnAt: null };
  return car;
}

// Steer a traffic car along the grid: keep to its lane, turn at crossings.
export function updateTrafficCar(car, city, cars, dt) {
  const ai = car.driver;
  if (!ai) return;

  // Pick a turning point when the car reaches an intersection.
  const onX = Math.abs(car.x - nearestRoadX(car.x)) < 30;
  const onY = Math.abs(car.y - nearestRoadY(car.y)) < 30;
  if (onX && onY && !ai.turnAt) {
    ai.turnAt = { x: nearestRoadX(car.x), y: nearestRoadY(car.y) };
  }
  if (ai.turnAt) {
    const dx = ai.turnAt.x - car.x;
    const dy = ai.turnAt.y - car.y;
    if (Math.hypot(dx, dy) < 26) {
      // Turn left, right, or straight ahead.
      const options = [0, Math.PI / 2, -Math.PI / 2];
      const turn = pick(Math.random, options);
      car.angle += turn;
      ai.turnAt = null;
    }
  }

  // Ease toward the right-hand lane so cars do not drift across the road.
  const laneX = nearestRoadX(car.x);
  const laneY = nearestRoadY(car.y);
  const vertical = Math.abs(Math.sin(car.angle)) > Math.abs(Math.cos(car.angle));
  if (vertical) {
    // Facing south, the right lane is west (x - 22); facing north, east (x + 22).
    const offset = Math.sin(car.angle) > 0 ? -22 : 22;
    car.x += (laneX + offset - car.x) * 0.5 * dt;
  } else {
    // Facing east, the right lane is south (y + 22); facing west, north (y - 22).
    const offset = Math.cos(car.angle) > 0 ? 22 : -22;
    car.y += (laneY + offset - car.y) * 0.5 * dt;
  }

  // Brake for the car ahead.
  let throttle = 0.55;
  for (const other of cars) {
    if (other === car) continue;
    const ahead = (other.x - car.x) * Math.cos(car.angle) + (other.y - car.y) * Math.sin(car.angle);
    const side = Math.abs((other.x - car.x) * -Math.sin(car.angle) + (other.y - car.y) * Math.cos(car.angle));
    if (ahead > 0 && ahead < 70 && side < 30) throttle = -0.6;
  }

  const crashed = driveCar(car, throttle, 0, dt);
  if (crashed) {
    // Nudge the car around after a bump so traffic never wedges itself.
    car.angle += 0.5;
    car.speed = 30;
  }
  // Cap the cruise speed.
  if (car.speed > ai.cruise) car.speed = ai.cruise;
}

// Are there too many cars near a point (for spawn throttling)?
export function carsNear(cars, x, y, r) {
  let n = 0;
  for (const c of cars) if (distToCar(c, x, y) < r) n++;
  return n;
}
