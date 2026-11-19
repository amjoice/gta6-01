// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// The world: all state in one object, advanced one fixed step at a time. No drawing
// and no DOM here except through the audio/save helpers the caller hands in.
import { STEP, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './config.js';
import { createCity, districtAt } from './city.js';
import { createPlayer, damagePlayer, exitCar, stepPlayer } from './player.js';
import { driveCar, spawnParkedCars } from './vehicles.js';
import { makePed, makeTrafficCar, scarePeds, stepTraffic } from './traffic.js';
import { addWanted, stepPolice } from './police.js';
import { MISSIONS, missionTarget } from './missions.js';

export const EVENT_NONE = 0;

export function createGame(rng, audio) {
  const city = createCity(rng);
  const G = {
    rng,
    audio,
    city,
    player: createPlayer(1640, 1240),
    cars: spawnParkedCars(rng, 16),
    traffic: [],
    peds: [],
    cops: [],
    gang: [],
    bullets: [],
    particles: [],
    pickups: [],
    money: 250,
    wanted: 0,
    wantedTimer: 0,
    missionIndex: 0,
    missionState: { stage: 0, timer: 0, kills: 0 },
    time: 0,
    clockMinutes: 16 * 60 + 40, // golden afternoon in Solmar Bay
    clockLabel: '',
    duskAmount: 0,
    camera: { x: 0, y: 0 },
    message: '',
    messageTimer: 0,
    busted: false,
    bustedReason: '',
    missionTargetPos: null,
    storyDone: false,
    hasSave: false,
    district: '',
  };
  for (let i = 0; i < 14; i += 1) G.traffic.push(makeTrafficCar(rng));
  for (let i = 0; i < 26; i += 1) G.peds.push(makePed(rng));
  // A few pickups scattered around the city.
  const pickupSpots = [
    { x: 1040, y: 560, kind: 'cash' },
    { x: 2240, y: 920, kind: 'health' },
    { x: 640, y: 1640, kind: 'cash' },
    { x: 2640, y: 1640, kind: 'health' },
    { x: 1840, y: 2000, kind: 'cash' },
    { x: 3040, y: 560, kind: 'cash' },
  ];
  for (const s of pickupSpots) G.pickups.push({ ...s, amount: s.kind === 'cash' ? 75 : 40 });

  G.addWanted = (stars, reason) => addWanted(G, stars, reason);
  G.spawnParticles = (x, y, color, n) => {
    for (let i = 0; i < n; i += 1) {
      G.particles.push({
        x, y,
        vx: rng.range(-90, 90),
        vy: rng.range(-90, 90),
        life: rng.range(0.3, 0.7),
        maxLife: 0.7,
        color,
      });
    }
  };
  G.onDefeated = (v) => {
    if (v.kind === 'gang') {
      G.missionState.kills += 1;
      G.money += 50;
      G.message = `Viper down — ${4 - G.missionState.kills} left (+$50)`;
      G.messageTimer = 2.5;
      G.audio.cash();
    } else if (v.kind === 'cop') {
      G.message = 'You took down an officer — the heat will come harder.';
      G.messageTimer = 3;
    }
  };
  G.onPlayerDown = (source) => {
    G.message = `Wasted — ${source || 'down in the streets'}`;
    G.messageTimer = 4;
  };

  function startMission(index) {
    G.missionIndex = index;
    G.missionState = { stage: 0, timer: 0, kills: 0 };
    const m = MISSIONS[index];
    if (m) m.onStart(G);
    updateMissionTarget();
  }

  function updateMissionTarget() {
    const t = missionTarget(G);
    G.missionTargetPos = t ? { x: t.x, y: t.y, label: t.label } : null;
  }

  function completeMission() {
    const m = MISSIONS[G.missionIndex];
    G.money += m.reward;
    G.audio.mission();
    G.message = `${m.title} complete! +$${m.reward}`;
    G.messageTimer = 4;
    G.missionIndex += 1;
    if (G.missionIndex >= MISSIONS.length) {
      G.storyDone = true;
    } else {
      startMission(G.missionIndex);
    }
    updateMissionTarget();
  }

  function failMission(reason) {
    G.message = `Mission failed — ${reason}. Try again.`;
    G.messageTimer = 4;
    startMission(G.missionIndex);
  }

  function reset() {
    const fresh = createGame(G.rng, G.audio);
    // Keep the same object identity so the renderer/loop keep their reference.
    for (const key of Object.keys(G)) delete G[key];
    Object.assign(G, fresh);
    // The fresh object's closures point at the fresh object; rebind to this one.
    G.reset = reset;
    G.step = step;
    G.startMission = startMission;
    G.completeMission = completeMission;
    startMission(0);
  }

  function step(dt, axes, aim, shootHeld, actions) {
    G.time += dt;
    G.clockMinutes += dt * 0.9; // ~1 game hour per 67 real seconds
    const hours = Math.floor(G.clockMinutes / 60) % 24;
    const mins = Math.floor(G.clockMinutes % 60);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    G.clockLabel = `${h12}:${String(mins).padStart(2, '0')} ${ampm} — Solmar Bay`;
    G.duskAmount = Math.max(0, Math.min(1, (G.clockMinutes - 17 * 60) / 120));
    if (G.messageTimer > 0) G.messageTimer -= dt;

    // Missions.
    const m = MISSIONS[G.missionIndex];
    if (m) {
      const result = m.check(G);
      if (result === 'done') completeMission();
      else if (result === 'failed') failMission('time ran out');
      updateMissionTarget();
    } else {
      G.missionTargetPos = null;
    }

    // Player: on foot, or driving.
    const p = G.player;
    const wasInCar = !!p.inCar; // entering a car this step must not trigger the exit below
    const events = stepPlayer(G, dt, axes, aim, shootHeld, actions);
    if (p.inCar) {
      // Driving: W/S throttle, A/D steer.
      const throttle = axes.y < 0 ? 1 : axes.y > 0 ? -1 : 0;
      const steer = axes.x;
      const hitWall = driveCar(G.city, p.inCar, throttle, steer, dt);
      if (hitWall && Math.abs(p.inCar.speed) > 200) G.audio.crash();
      if (wasInCar && actions.enter) exitCar(G);
      // Running over a pedestrian is a crime (only while still driving — the car may have just been exited).
      if (p.inCar) {
        for (const ped of G.peds) {
          if (ped.down) continue;
          const d = Math.hypot(ped.x - p.inCar.x, ped.y - p.inCar.y);
          if (d < 34 && Math.abs(p.inCar.speed) > 60) {
            ped.down = true;
            ped.hp = 0;
            G.addWanted(1, 'hit a pedestrian');
            G.spawnParticles(ped.x, ped.y, '#e5534b', 10);
            scarePeds(G, ped.x, ped.y, 260);
          }
        }
      }
    }

    // Gang members (mission 4) chase and shoot at the player.
    for (const g of G.gang) {
      if (g.down) continue;
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      g.bob += dt * 8;
      if (d > 60) {
        const a = Math.atan2(p.y - g.y, p.x - g.x);
        g.angle = a;
        g.x += Math.cos(a) * g.speed * dt;
        g.y += Math.sin(a) * g.speed * dt;
      }
      g.shootTimer -= dt;
      if (g.shootTimer <= 0 && d < 520) {
        g.shootTimer = 1.4;
        const a = Math.atan2(p.y - g.y, p.x - g.x) + G.rng.range(-0.12, 0.12);
        G.bullets.push({ x: g.x, y: g.y, angle: a, speed: 700, life: 0.9, from: 'gang', damage: 8 });
        G.audio.shot();
      }
    }

    // Bullets.
    for (const b of G.bullets) {
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;
      if (b.life <= 0) continue;
      const targets = b.from === 'player'
        ? [...G.peds, ...G.cops.filter((c) => c.kind === 'foot'), ...G.gang]
        : [G.player];
      for (const t of targets) {
        if (t.down || t.hp === undefined || t.hp <= 0) continue;
        const tx = t.inCar ? t.inCar.x : t.x;
        const ty = t.inCar ? t.inCar.y : t.y;
        const radius = t.inCar ? 30 : 14;
        if (Math.hypot(b.x - tx, b.y - ty) < radius) {
          b.life = 0;
          if (b.from === 'player') {
            t.hp -= b.damage;
            G.spawnParticles(b.x, b.y, '#ffd34d', 6);
            if (t.hp <= 0) {
              t.down = true;
              if (t.kind === 'ped') G.addWanted(1, 'shot a pedestrian');
              else if (t.kind === 'cop') G.addWanted(2, 'shot an officer');
              G.onDefeated(t);
            }
          } else {
            damagePlayer(G, b.damage, 'shot by a Viper');
          }
          break;
        }
      }
      // Bullets stop at buildings.
      if (b.life > 0) {
        for (const bd of G.city.buildings) {
          if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) {
            b.life = 0;
            G.spawnParticles(b.x, b.y, '#c9c9c9', 4);
            break;
          }
        }
      }
    }
    G.bullets = G.bullets.filter((b) => b.life > 0);

    // Pickups.
    for (const pk of G.pickups) {
      const d = Math.hypot(p.x - pk.x, p.y - pk.y);
      const inCarD = p.inCar ? Math.hypot(p.inCar.x - pk.x, p.inCar.y - pk.y) : 9999;
      if (d < 30 || inCarD < 44) {
        if (pk.kind === 'cash') {
          G.money += pk.amount;
          G.message = `+$${pk.amount} found`;
          G.audio.cash();
        } else {
          p.health = Math.min(100, p.health + pk.amount);
          G.message = `+${pk.amount} health`;
          G.audio.pickup();
        }
        G.messageTimer = 2;
        G.pickups = G.pickups.filter((q) => q !== pk);
      }
    }

    stepTraffic(G, dt);
    stepPolice(G, dt);

    // Scare pedestrians when the player fires.
    if (events.shot) scarePeds(G, p.x, p.y, 320);

    // Particles.
    for (const pt of G.particles) {
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.life -= dt;
    }
    G.particles = G.particles.filter((pt) => pt.life > 0);

    // Camera follows the player (or their car), clamped to the world.
    const fx = p.inCar ? p.inCar.x : p.x;
    const fy = p.inCar ? p.inCar.y : p.y;
    G.camera.x = Math.max(0, Math.min(WORLD_W - VIEW_W, fx - VIEW_W / 2));
    G.camera.y = Math.max(0, Math.min(WORLD_H - VIEW_H, fy - VIEW_H / 2));
    G.district = districtAt(fx, fy);

    // Busted: lose money, wake at the safehouse, heat cleared.
    if (G.busted) {
      G.money = Math.max(0, G.money - 150);
      G.wanted = 0;
      G.cops = [];
      G.cars = G.cars.filter((c) => c.kind !== 'police');
      p.health = 100;
      if (p.inCar) {
        p.inCar.kind = 'parked';
        p.inCar = null;
      }
      p.x = 640;
      p.y = 560;
      G.busted = false;
    }
    return EVENT_NONE;
  }

  G.reset = reset;
  G.step = step;
  G.startMission = startMission;
  G.completeMission = completeMission;
  startMission(0);
  updateMissionTarget();
  return G;
}
