// Porto Verde — the city itself: roads, blocks, buildings, parks, beach, sea.
// Generated once from a seed, so the same seed always builds the same streets.

import { WORLD_W, WORLD_H, ROAD_W, ROADS_X, ROADS_Y, SEA_Y, BEACH_H, PALETTE } from './config.js';
import { makeRng, range, rangeInt, pick } from './rng.js';

const ROOF_COLORS = [PALETTE.roofA, PALETTE.roofB, PALETTE.roofC, PALETTE.roofD];

// Build the whole city from a seed. Returns an object the game keeps.
export function buildCity(seed) {
  const rng = makeRng(seed);
  const buildings = [];
  const parks = [];
  const trees = [];
  const parkingLots = [];

  // The blocks are the cells between neighbouring avenues.
  const xs = [0, ...ROADS_X, WORLD_W];
  const ys = [0, ...ROADS_Y, WORLD_H];

  for (let bi = 0; bi < xs.length - 1; bi++) {
    for (let bj = 0; bj < ys.length - 1; bj++) {
      const x0 = xs[bi] + ROAD_W / 2 + 14;
      const x1 = xs[bi + 1] - ROAD_W / 2 - 14;
      const y0 = ys[bj] + ROAD_W / 2 + 14;
      const y1 = ys[bj + 1] - ROAD_W / 2 - 14;
      if (x1 - x0 < 90 || y1 - y0 < 90) continue;
      // Nothing is built on the sand: the bottom row of blocks is beach.
      if (y0 > SEA_Y - BEACH_H - 40) continue;

      const roll = rng();
      if (roll < 0.16) {
        // A park with trees.
        const park = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
        parks.push(park);
        const n = rangeInt(rng, 5, 9);
        for (let i = 0; i < n; i++) {
          trees.push({
            x: range(rng, park.x + 16, park.x + park.w - 16),
            y: range(rng, park.y + 16, park.y + park.h - 16),
            r: range(rng, 9, 15),
          });
        }
      } else if (roll < 0.28) {
        // An open parking lot with a few parked cars marked out.
        parkingLots.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
      } else {
        // A block of buildings: one or two per block, with a courtyard gap.
        const split = rng() < 0.5;
        if (split && x1 - x0 > 220) {
          const mid = (x0 + x1) / 2 + range(rng, -20, 20);
          buildings.push(makeBuilding(rng, x0, y0, mid - x0 - 12, y1 - y0));
          buildings.push(makeBuilding(rng, mid + 12, y0, x1 - mid - 12, y1 - y0));
        } else {
          buildings.push(makeBuilding(rng, x0, y0, x1 - x0, y1 - y0));
        }
      }
    }
  }

  // The central plaza: a paved square with palm trees at the city's heart.
  const plaza = { x: 1180, y: 1180, w: 240, h: 240 };
  // Clear any building that overlaps the plaza.
  for (let i = buildings.length - 1; i >= 0; i--) {
    const b = buildings[i];
    if (rectsOverlap(b, plaza)) buildings.splice(i, 1);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    trees.push({ x: 1300 + Math.cos(a) * 96, y: 1300 + Math.sin(a) * 96, r: 12, palm: true });
  }

  return { buildings, parks, trees, parkingLots, plaza, seed };
}

function makeBuilding(rng, x, y, w, h) {
  return {
    x, y,
    w: Math.max(60, w),
    h: Math.max(60, h),
    roof: pick(rng, ROOF_COLORS),
    tall: rng() < 0.3,
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Is a point on a road (within the asphalt)?
export function onRoad(x, y) {
  for (const rx of ROADS_X) if (Math.abs(x - rx) <= ROAD_W / 2) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) <= ROAD_W / 2) return true;
  return false;
}

// The nearest avenue centre to a point, on one axis.
export function nearestRoadX(x) {
  let best = ROADS_X[0];
  for (const rx of ROADS_X) if (Math.abs(rx - x) < Math.abs(best - x)) best = rx;
  return best;
}

export function nearestRoadY(y) {
  let best = ROADS_Y[0];
  for (const ry of ROADS_Y) if (Math.abs(ry - y) < Math.abs(best - y)) best = ry;
  return best;
}

// Does a circle of radius r at (x, y) hit a building?
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return b;
  }
  return null;
}

// Push a circle out of any building it overlaps. Returns true if it moved.
export function resolveBuilding(city, p, r) {
  const b = hitsBuilding(city, p.x, p.y, r);
  if (!b) return false;
  const dxLeft = p.x + r - b.x;
  const dxRight = b.x + b.w - (p.x - r);
  const dyTop = p.y + r - b.y;
  const dyBottom = b.y + b.h - (p.y - r);
  const m = Math.min(dxLeft, dxRight, dyTop, dyBottom);
  if (m === dxLeft) p.x = b.x - r;
  else if (m === dxRight) p.x = b.x + b.w + r;
  else if (m === dyTop) p.y = b.y - r;
  else p.y = b.y + b.h + r;
  return true;
}

// A random point on a road, for spawning traffic.
export function randomRoadPoint(rng) {
  if (rng() < 0.5) {
    return { x: pick(rng, ROADS_X) + (rng() < 0.5 ? -22 : 22), y: range(rng, 120, SEA_Y - 120) };
  }
  return { x: range(rng, 120, WORLD_W - 120), y: pick(rng, ROADS_Y) + (rng() < 0.5 ? -22 : 22) };
}

// A random point on a sidewalk (just off a road), for pedestrians.
export function randomSidewalkPoint(rng) {
  const p = randomRoadPoint(rng);
  p.x += pick(rng, [-58, 58]);
  p.y += pick(rng, [-58, 58]);
  p.x = Math.max(40, Math.min(WORLD_W - 40, p.x));
  p.y = Math.max(40, Math.min(SEA_Y - 40, p.y));
  return p;
}

// A random free point inside a parking lot, for a parked car.
export function randomParkingSpot(city, rng) {
  if (city.parkingLots.length === 0) return null;
  const lot = pick(rng, city.parkingLots);
  return {
    x: range(rng, lot.x + 30, lot.x + lot.w - 30),
    y: range(rng, lot.y + 30, lot.y + lot.h - 30),
    angle: pick(rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]),
  };
}
