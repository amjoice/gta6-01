// The player on foot: WASD movement, running, punching, shooting at the mouse aim,
// taking damage, and getting into / out of cars. Stealing a car is a crime — it raises
// the wanted level, unless the car already belongs to the player.
import { PLAYER, WORLD_H } from './config.js';
import { clampToWorld, collideBuildings } from './city.js';
import { nearestCar } from './vehicles.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: -Math.PI / 2,
    health: PLAYER.maxHealth,
    inCar: null,
    ammo: 120,
    punchCooldown: 0,
    shootCooldown: 0,
    hurtTimer: 0,
    moving: false,
    running: false,
  };
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

/**
 * One step on foot. Returns an event bag: { punched, shot, enteredCar, exitedCar }.
 * `aim` is the world position the mouse points at; `shootHeld` fires the pistol.
 */
export function stepPlayer(G, dt, axes, aim, shootHeld, actions) {
  const p = G.player;
  const events = { punched: false, shot: false, enteredCar: null, exitedCar: false, stole: false };
  if (p.punchCooldown > 0) p.punchCooldown -= dt;
  if (p.shootCooldown > 0) p.shootCooldown -= dt;
  if (p.hurtTimer > 0) p.hurtTimer -= dt;
  if (p.inCar) return events; // driving is handled by vehicles.js through the world step

  const speed = axes.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  p.running = axes.run && (axes.x !== 0 || axes.y !== 0);
  let mx = axes.x;
  let my = axes.y;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= len;
    my /= len;
    p.moving = true;
    p.angle = angleTo(0, 0, mx, my);
  } else {
    p.moving = false;
    // Standing still: face the mouse aim.
    p.angle = angleTo(p.x, p.y, aim.x, aim.y);
  }
  const nx = p.x + mx * speed * dt;
  const ny = p.y + my * speed * dt;
  const hit = collideBuildings(G.city, nx, ny, PLAYER.radius);
  const clamped = clampToWorld(hit.x, hit.y);
  p.x = clamped.x;
  p.y = Math.min(clamped.y, WORLD_H - 60); // the deep sea is out of bounds on foot too

  // Punch: a short arc in front of the player.
  if (actions.punch && p.punchCooldown <= 0) {
    p.punchCooldown = 0.45;
    events.punched = true;
    const victims = [...G.peds, ...G.cops.filter((c) => c.kind === 'foot'), ...G.gang];
    for (const v of victims) {
      if (v.down || v.hp <= 0) continue;
      const d = Math.hypot(v.x - p.x, v.y - p.y);
      if (d < PLAYER.punchRange && Math.abs(angleDiff(p.angle, angleTo(p.x, p.y, v.x, v.y))) < PLAYER.punchArc) {
        v.hp -= PLAYER.punchDamage;
        v.x += Math.cos(p.angle) * 26;
        v.y += Math.sin(p.angle) * 26;
        if (v.hp <= 0) {
          v.down = true;
          if (v.kind === 'ped') {
            G.addWanted(1, 'attacked a pedestrian');
          } else if (v.kind === 'cop') {
            G.addWanted(2, 'attacked police');
          }
          G.onDefeated(v);
        }
        G.spawnParticles(v.x, v.y, '#ffd34d', 8);
      }
    }
  }

  // Shoot: a bullet toward the mouse aim.
  if (shootHeld && p.shootCooldown <= 0 && p.ammo > 0) {
    p.shootCooldown = 0.22;
    p.ammo -= 1;
    p.angle = angleTo(p.x, p.y, aim.x, aim.y);
    G.bullets.push({
      x: p.x + Math.cos(p.angle) * 20,
      y: p.y + Math.sin(p.angle) * 20,
      angle: p.angle,
      speed: 900,
      life: 0.9,
      from: 'player',
      damage: 34,
    });
    events.shot = true;
    G.audio.shot();
  }

  // Enter / exit a car.
  if (actions.enter) {
    const car = nearestCar(G.cars, p.x, p.y, 70);
    if (car) {
      p.inCar = car;
      car.kind = 'player';
      events.enteredCar = car;
      if (!car.stolen) {
        car.stolen = true;
        events.stole = true;
        if (car.name !== 'Sun Taxi') G.addWanted(1, 'stole a car');
      }
      G.audio.pickup();
    }
  }
  return events;
}

/** Leave the car beside it, on foot. */
export function exitCar(G) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  p.inCar = null;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
  const clamped = clampToWorld(p.x, p.y);
  p.x = clamped.x;
  p.y = clamped.y;
  car.speed = 0;
}

export function damagePlayer(G, amount, source) {
  const p = G.player;
  if (p.hurtTimer > 0 || p.health <= 0) return;
  p.health -= amount;
  p.hurtTimer = 0.5;
  G.spawnParticles(p.x, p.y, '#e5534b', 10);
  if (p.health <= 0) {
    p.health = 0;
    G.onPlayerDown(source);
  }
}
