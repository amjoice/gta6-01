// Cars: parked cars to steal, the player's car, and police cars. Driving is simple
// arcade physics — accelerate, steer by speed, drag, and a push-out against buildings.
import { CAR, ROADS_X, ROADS_Y, WORLD_H, WORLD_W } from './config.js';
import { collideBuildings, isOnRoad } from './city.js';

const CAR_MODELS = [
  { name: 'Coral Coupe', color: '#d94f4f', top: 580 },
  { name: 'Palm Sedan', color: '#4f7fd9', top: 520 },
  { name: 'Sun Taxi', color: '#e8c33a', top: 500 },
  { name: 'Dune Pickup', color: '#7a9a4f', top: 500 },
  { name: 'Marina Van', color: '#e8e8e8', top: 460 },
  { name: 'Night Cruiser', color: '#3a3a4a', top: 540 },
  { name: 'Bay Runner', color: '#c96fd9', top: 600 },
];

export function makeCar(rng, x, y, angle, kind) {
  const model = rng.pick(CAR_MODELS);
  return {
    x, y, angle, speed: 0,
    kind: kind || 'parked',
    name: model.name,
    color: model.color,
    topSpeed: model.top,
    stolen: false,
    hp: 100,
  };
}

/** Parked cars along the roads, waiting to be borrowed. */
export function spawnParkedCars(rng, count) {
  const cars = [];
  for (let i = 0; i < count; i += 1) {
    const vertical = rng.chance(0.5);
    let x;
    let y;
    let angle;
    if (vertical) {
      x = rng.pick(ROADS_X) + (rng.chance(0.5) ? 30 : -30);
      y = rng.range(120, WORLD_H - 300);
      angle = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    } else {
      x = rng.range(120, WORLD_W - 120);
      y = rng.pick(ROADS_Y) + (rng.chance(0.5) ? 30 : -30);
      angle = rng.chance(0.5) ? 0 : Math.PI;
    }
    cars.push(makeCar(rng, x, y, angle, 'parked'));
  }
  return cars;
}

export function nearestCar(cars, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

/** One driving step for a car the player (or a police driver) controls. */
export function driveCar(city, car, throttle, steer, dt) {
  // throttle: -1 reverse/brake, 0 coast, 1 accelerate. steer: -1..1.
  if (throttle > 0) car.speed += CAR.accel * throttle * dt;
  else if (throttle < 0) {
    if (car.speed > 20) car.speed -= CAR.brake * dt;
    else car.speed -= CAR.accel * 0.5 * dt;
  }
  car.speed -= car.speed * CAR.drag * dt;
  const max = car.topSpeed || CAR.maxSpeed;
  if (car.speed > max) car.speed = max;
  if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
  if (Math.abs(car.speed) < 4 && throttle === 0) car.speed = 0;
  const turn = steer * CAR.turnRate * dt * Math.min(1, Math.abs(car.speed) / 140) * (car.speed >= 0 ? 1 : -1);
  car.angle += turn;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = collideBuildings(city, nx, ny, 26);
  if (hit.hit) {
    car.speed *= 0.45;
    car.x = hit.x;
    car.y = hit.y;
  } else {
    car.x = nx;
    car.y = ny;
  }
  // The sea stops cars; the beach slows them hard.
  if (car.y > 2460) {
    car.y = 2460;
    car.speed *= 0.5;
  } else if (car.y > 2320) {
    car.speed *= 1 - 1.4 * dt;
  }
  car.x = Math.max(30, Math.min(WORLD_W - 30, car.x));
  car.y = Math.max(30, Math.min(WORLD_H - 30, car.y));
  return hit.hit;
}

export function carOnRoad(car) {
  return isOnRoad(car.x, car.y);
}
