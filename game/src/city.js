// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// The city of Solmar Bay: a road grid, building blocks, a park, the docks and a beach.
// All geometry is generated from a seed, so the same seed always builds the same city.
import { BEACH_TOP, COLORS, ROADS_X, ROADS_Y, ROAD_W, WORLD_H, WORLD_W } from './config.js';

const BUILDING_COLORS = ['#c98f5f', '#b7a99a', '#8fa3b8', '#d9b36c', '#9a8f7a', '#7d9b7a', '#c47f7f', '#6f8fa8'];
const ROOF_COLORS = ['#5a4a3a', '#4a5a6a', '#6a4a4a', '#3f4a3f'];

export function districtAt(x, y) {
  if (y > BEACH_TOP) return 'Boardwalk Beach';
  if (x > 2800 && y > 1600) return 'The Docks';
  if (x > 2400) return 'Marina District';
  if (x < 900 && y < 900) return 'Old Town';
  if (y < 600) return 'Palm Heights';
  if (x > 1800 && x < 2600 && y > 900 && y < 1700) return 'Central Plaza';
  return 'Downtown Solmar';
}

export function createCity(rng) {
  const buildings = [];
  const trees = [];
  const parks = [];
  // One block = the space between two neighbouring roads.
  for (let ix = 0; ix < ROADS_X.length - 1; ix += 1) {
    for (let iy = 0; iy < ROADS_Y.length - 1; iy += 1) {
      const x0 = ROADS_X[ix] + ROAD_W / 2 + 14;
      const x1 = ROADS_X[ix + 1] - ROAD_W / 2 - 14;
      const y0 = ROADS_Y[iy] + ROAD_W / 2 + 14;
      const y1 = ROADS_Y[iy + 1] - ROAD_W / 2 - 14;
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 60 || h < 60) continue;
      // The central block is the plaza park; the south-east block is the docks yard.
      const isPlaza = ix === 4 && iy === 2;
      const isDocks = ix === 7 && iy === 5;
      if (isPlaza || isDocks) {
        parks.push({ x: x0, y: y0, w, h, kind: isPlaza ? 'plaza' : 'docks' });
        for (let t = 0; t < 8; t += 1) {
          trees.push({ x: x0 + rng.range(20, w - 20), y: y0 + rng.range(20, h - 20), r: rng.range(9, 14) });
        }
        continue;
      }
      const count = rng.int(1, 3);
      for (let b = 0; b < count; b += 1) {
        const bw = rng.range(90, Math.max(100, w / count - 24));
        const bh = rng.range(80, Math.max(90, h - 40));
        const bx = x0 + (b * w) / count + rng.range(6, 18);
        const by = y0 + rng.range(8, Math.max(10, h - bh - 8));
        buildings.push({
          x: bx,
          y: by,
          w: Math.min(bw, x1 - bx - 8),
          h: Math.min(bh, y1 - by - 8),
          color: rng.pick(BUILDING_COLORS),
          roof: rng.pick(ROOF_COLORS),
          floors: rng.int(1, 4),
        });
      }
      if (rng.chance(0.6)) {
        trees.push({ x: x0 + rng.range(20, w - 20), y: y0 + rng.range(20, h - 20), r: rng.range(9, 13) });
      }
    }
  }
  return { buildings, trees, parks };
}

function onRoadAxis(value, roads) {
  for (const road of roads) if (Math.abs(value - road) < ROAD_W / 2) return true;
  return false;
}

export function isOnRoad(x, y) {
  return onRoadAxis(x, ROADS_X) || onRoadAxis(y, ROADS_Y);
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) {
      bestD = d;
      best = { x: rx, y: Math.max(80, Math.min(WORLD_H - 200, y)) };
    }
  }
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) {
      bestD = d;
      best = { x: Math.max(80, Math.min(WORLD_W - 80, x)), y: ry };
    }
  }
  return best;
}

/** Push a circle out of every building it overlaps; returns true if it hit one. */
export function collideBuildings(city, x, y, radius) {
  let hit = false;
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      hit = true;
      const d = Math.sqrt(d2) || 0.001;
      const push = radius - d;
      // Move the caller-side position via the returned offset.
      x += (dx / d) * push;
      y += (dy / d) * push;
    }
  }
  return { x, y, hit };
}

export function clampToWorld(x, y) {
  return {
    x: Math.max(30, Math.min(WORLD_W - 30, x)),
    y: Math.max(30, Math.min(WORLD_H - 40, y)),
  };
}

export { COLORS };
