// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// Traffic and pedestrians: the city feels alive. Traffic cars cruise the road grid in
// their lanes and brake for the car ahead; pedestrians stroll the sidewalks and flee
// when a gun goes off or a car comes at them.
import { ROADS_X, ROADS_Y, ROAD_W, WORLD_H, WORLD_W } from './config.js';
import { collideBuildings } from './city.js';

const TRAFFIC_COLORS = ['#c94f4f', '#4f7fd9', '#e8c33a', '#7a9a4f', '#e8e8e8', '#3a3a4a', '#c96fd9', '#d98a3a'];
const PED_COLORS = ['#e8b04b', '#4b9e8a', '#9a4b8a', '#5a7a3a', '#b05a5a', '#4a5a8a', '#d9d9d9', '#8a6a3a'];
const PED_NAMES = ['Mara', 'Tomas', 'Lena', 'Ivo', 'Nina', 'Dario', 'Sofia', 'Petar', 'Ana', 'Luka'];

export function makeTrafficCar(rng) {
  const vertical = rng.chance(0.5);
  let x;
  let y;
  let angle;
  let road;
  let dir;
  if (vertical) {
    road = rng.pick(ROADS_X);
    dir = rng.chance(0.5) ? 1 : -1;
    x = road + dir * 22;
    y = rng.range(100, WORLD_H - 300);
    angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
  } else {
    road = rng.pick(ROADS_Y);
    dir = rng.chance(0.5) ? 1 : -1;
    x = rng.range(100, WORLD_W - 100);
    y = road + dir * 22;
    angle = dir > 0 ? 0 : Math.PI;
  }
  return {
    x, y, angle, road, dir,
    axis: vertical ? 'v' : 'h',
    speed: rng.range(120, 210),
    cruise: rng.range(140, 220),
    color: rng.pick(TRAFFIC_COLORS),
    brake: 0,
  };
}

export function makePed(rng) {
  // Start on a sidewalk beside a road.
  const vertical = rng.chance(0.5);
  let x;
  let y;
  if (vertical) {
    x = rng.pick(ROADS_X) + (rng.chance(0.5) ? 62 : -62);
    y = rng.range(100, WORLD_H - 300);
  } else {
    x = rng.range(100, WORLD_W - 100);
    y = rng.pick(ROADS_Y) + (rng.chance(0.5) ? 62 : -62);
  }
  return {
    x, y,
    kind: 'ped',
    name: rng.pick(PED_NAMES),
    angle: rng.range(0, Math.PI * 2),
    speed: rng.range(28, 55),
    color: rng.pick(PED_COLORS),
    hp: 50,
    down: false,
    flee: 0,
    target: null,
    bob: rng.range(0, 6),
  };
}

function nearestAhead(list, car) {
  let best = null;
  let bestD = 130;
  for (const other of list) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
    const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
    if (ahead > 0 && ahead < bestD && side < 34) {
      bestD = ahead;
      best = other;
    }
  }
  return best;
}

export function stepTraffic(G, dt) {
  const allCars = [...G.traffic, ...G.cars.filter((c) => c.kind === 'player' || c.kind === 'police')];
  for (const car of G.traffic) {
    const ahead = nearestAhead(allCars, car);
    const want = ahead ? 0 : car.cruise;
    car.speed += (want - car.speed) * Math.min(1, 1.6 * dt);
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    // Wrap around the city edge so traffic never runs out.
    if (car.axis === 'v') {
      if (car.y < 60) car.y = WORLD_H - 320;
      if (car.y > WORLD_H - 300) car.y = 80;
    } else {
      if (car.x < 60) car.x = WORLD_W - 120;
      if (car.x > WORLD_W - 100) car.x = 80;
    }
  }
  // Pedestrians: wander, flee from danger, never walk through buildings or the sea.
  for (const ped of G.peds) {
    if (ped.down) continue;
    if (ped.flee > 0) ped.flee -= dt;
    if (!ped.target || Math.hypot(ped.target.x - ped.x, ped.target.y - ped.y) < 24) {
      const vertical = G.rng.chance(0.5);
      if (vertical) {
        const road = G.rng.pick(ROADS_X);
        ped.target = { x: road + (G.rng.chance(0.5) ? 62 : -62), y: G.rng.range(100, WORLD_H - 320) };
      } else {
        const road = G.rng.pick(ROADS_Y);
        ped.target = { x: G.rng.range(100, WORLD_W - 100), y: road + (G.rng.chance(0.5) ? 62 : -62) };
      }
    }
    const speed = ped.flee > 0 ? ped.speed * 2.6 : ped.speed;
    const a = Math.atan2(ped.target.y - ped.y, ped.target.x - ped.x);
    ped.angle = a;
    const nx = ped.x + Math.cos(a) * speed * dt;
    const ny = ped.y + Math.sin(a) * speed * dt;
    const hit = collideBuildings(G.city, nx, ny, 10);
    ped.x = Math.max(40, Math.min(WORLD_W - 40, hit.x));
    ped.y = Math.max(40, Math.min(WORLD_H - 260, hit.y));
    ped.bob += dt * (ped.flee > 0 ? 14 : 8);
  }
}

/** Every pedestrian nearby runs away from (x, y). */
export function scarePeds(G, x, y, radius) {
  for (const ped of G.peds) {
    if (ped.down) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < radius) {
      ped.flee = 3;
      const a = Math.atan2(ped.y - y, ped.x - x);
      ped.target = { x: ped.x + Math.cos(a) * 300, y: ped.y + Math.sin(a) * 300 };
    }
  }
}
