// The wanted system: stars 0-5, police cars and foot officers who chase, ram and
// arrest. Crimes raise stars; lying low lets them cool off. At high stars, more and
// faster police arrive. Getting caught on foot means BUSTED.
import { WANTED_DECAY, WANTED_MAX, WORLD_H, WORLD_W } from './config.js';
import { driveCar, makeCar } from './vehicles.js';
import { damagePlayer } from './player.js';

export function addWanted(G, stars, reason) {
  if (G.wanted >= WANTED_MAX) return;
  G.wanted = Math.min(WANTED_MAX, G.wanted + stars);
  G.wantedTimer = 0;
  G.message = `Wanted! ${reason} — ${G.wanted} star${G.wanted > 1 ? 's' : ''}`;
  G.messageTimer = 3;
}

export function wantedPoliceCount(wanted) {
  return wanted <= 0 ? 0 : wanted <= 1 ? 1 : wanted <= 2 ? 2 : wanted <= 3 ? 3 : wanted <= 4 ? 4 : 5;
}

function spawnEdgePoint(G) {
  const p = G.player;
  const side = G.rng.int(0, 3);
  const dist = 700;
  if (side === 0) return { x: p.x - dist, y: p.y + G.rng.range(-300, 300) };
  if (side === 1) return { x: p.x + dist, y: p.y + G.rng.range(-300, 300) };
  if (side === 2) return { x: p.x + G.rng.range(-300, 300), y: p.y - dist };
  return { x: p.x + G.rng.range(-300, 300), y: p.y + dist };
}

function spawnPolice(G) {
  const pos = spawnEdgePoint(G);
  const useCar = G.wanted >= 2 || G.player.inCar || G.rng.chance(0.5);
  if (useCar) {
    const car = makeCar(G.rng, pos.x, pos.y, 0, 'police');
    car.color = '#1a1a22';
    car.name = 'Police Cruiser';
    car.topSpeed = 520 + G.wanted * 22;
    G.cars.push(car);
    G.cops.push({ kind: 'car', car, x: pos.x, y: pos.y, angle: 0, hp: 100, down: false });
  } else {
    G.cops.push({ kind: 'foot', car: null, x: pos.x, y: pos.y, angle: 0, hp: 100, down: false, speed: 240 });
  }
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function stepPolice(G, dt) {
  // Cool off when the player stays out of trouble.
  if (G.wanted > 0) {
    G.wantedTimer += dt;
    if (G.wantedTimer > WANTED_DECAY) {
      G.wantedTimer = 0;
      G.wanted -= 1;
      if (G.wanted === 0) {
        G.message = 'You lost the heat. Stay clean.';
        G.messageTimer = 3;
      }
    }
  }
  const want = wantedPoliceCount(G.wanted);
  const active = G.cops.filter((c) => !c.down).length;
  if (active < want && G.wanted > 0) spawnPolice(G);

  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  for (const cop of G.cops) {
    if (cop.down) continue;
    if (cop.kind === 'car') {
      const car = cop.car;
      if (!car || car.hp <= 0) {
        cop.down = true;
        continue;
      }
      const targetAngle = angleTo(car.x, car.y, px, py);
      const diff = angleDiff(car.angle, targetAngle);
      const steer = Math.max(-1, Math.min(1, diff * 2.2));
      const d = Math.hypot(px - car.x, py - car.y);
      driveCar(G.city, car, d > 90 ? 1 : 0.4, steer, dt);
      cop.x = car.x;
      cop.y = car.y;
      cop.angle = car.angle;
      // Ram the player's car — or the player on foot.
      if (d < 52) {
        if (p.inCar) {
          p.inCar.speed *= 0.7;
          if (G.rng.chance(dt * 2)) {
            G.audio.crash();
            G.spawnParticles(car.x, car.y, '#ffd34d', 6);
          }
        } else {
          damagePlayer(G, 12 * dt * 4, 'rammed by a police car');
        }
      }
    } else {
      const d = Math.hypot(px - cop.x, py - cop.y);
      const a = angleTo(cop.x, cop.y, px, py);
      cop.angle = a;
      const speed = cop.speed * (1 + G.wanted * 0.04);
      cop.x += Math.cos(a) * speed * dt;
      cop.y += Math.sin(a) * speed * dt;
      // Close enough on foot: arrest.
      if (!p.inCar && d < 30) {
        G.busted = true;
        G.bustedReason = 'Arrested by the Solmar Bay police.';
        G.audio.busted();
      }
      // A foot cop next to the player's car tries to pull the player out.
      if (p.inCar && d < 46) {
        damagePlayer(G, 6 * dt, 'dragged by an officer');
      }
    }
  }
  // Drop cops that fell far behind and are off-screen, so the chase stays fair.
  G.cops = G.cops.filter((c) => {
    if (c.down) return false;
    const d = Math.hypot(c.x - px, c.y - py);
    return d < 1600 || G.wanted === 0;
  });
  // Remove wrecked police cars from the car list.
  G.cars = G.cars.filter((c) => !(c.kind === 'police' && c.hp <= 0));
}
