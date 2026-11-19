// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// The story: five missions for Lena "Vex" Marlowe, a courier fresh off the ferry in
// Solmar Bay who owes the wrong people money. Each mission has a target marker, an
// objective line for the HUD, and a check that runs every frame.
import { ROADS_X, ROADS_Y } from './config.js';

export const MISSIONS = [
  {
    id: 'meet-rico',
    title: 'Mission 1 — New in Town',
    briefing: 'Rico waits for you at Central Plaza. Walk or drive to the yellow marker and say hello.',
    reward: 200,
    // The plaza centre: the park has no buildings, so this is reachable on every seed.
    // (The old target 1640,1100 sat inside a building block and was unreachable on some seeds.)
    target: () => ({ x: 2040, y: 1100, label: 'Meet Rico at Central Plaza' }),
    objective: () => 'Meet Rico at Central Plaza',
    onStart(G) {
      G.message = 'New mission: meet Rico at Central Plaza.';
      G.messageTimer = 4;
    },
    check(G) {
      const t = this.target();
      const d = Math.hypot(G.player.x - t.x, G.player.y - t.y);
      return d < 70 ? 'done' : 'active';
    },
  },
  {
    id: 'borrowed-wheels',
    title: 'Mission 2 — Borrowed Wheels',
    briefing: 'Rico needs wheels. Take any parked car (press F beside one) and bring it to the garage on Marina Row.',
    reward: 300,
    target: () => ({ x: 2840, y: 560, label: 'Garage on Marina Row' }),
    objective: (G) => (G.player.inCar ? 'Drive the car to the garage' : 'Steal a car — press F beside one'),
    onStart(G) {
      G.message = 'New mission: borrow a car, any car.';
      G.messageTimer = 4;
    },
    check(G) {
      if (!G.player.inCar) return 'active';
      const t = this.target();
      const d = Math.hypot(G.player.inCar.x - t.x, G.player.inCar.y - t.y);
      return d < 90 ? 'done' : 'active';
    },
  },
  {
    id: 'sunset-courier',
    title: 'Mission 3 — Sunset Courier',
    briefing: 'A package, three drops, one sunset. Drive through every checkpoint before the timer runs out.',
    reward: 500,
    target: (G) => {
      const points = [
        { x: 640, y: 200, label: 'Drop 1 — Palm Heights' },
        { x: 3040, y: 1280, label: 'Drop 2 — Marina District' },
        { x: 1040, y: 2000, label: 'Drop 3 — Old Town docks' },
      ];
      return points[Math.min(G.missionState.stage, points.length - 1)];
    },
    objective: (G) => `Courier drop ${Math.min(G.missionState.stage + 1, 3)} of 3 — ${Math.ceil(G.missionState.timer)}s left`,
    onStart(G) {
      G.missionState = { stage: 0, timer: 150 };
      G.message = 'Courier run! Three drops, 150 seconds.';
      G.messageTimer = 4;
    },
    check(G) {
      G.missionState.timer -= 1 / 60;
      if (G.missionState.timer <= 0) return 'failed';
      const t = this.target(G);
      const px = G.player.inCar ? G.player.inCar.x : G.player.x;
      const py = G.player.inCar ? G.player.inCar.y : G.player.y;
      if (Math.hypot(px - t.x, py - t.y) < 90) {
        G.missionState.stage += 1;
        G.money += 100;
        G.audio.cash();
        G.message = `Drop ${G.missionState.stage} of 3 done — +$100`;
        G.messageTimer = 2.5;
        if (G.missionState.stage >= 3) return 'done';
      }
      return 'active';
    },
  },
  {
    id: 'rival-trouble',
    title: 'Mission 4 — Rival Trouble',
    briefing: 'The Coral Vipers are shaking down Rico’s corner near the docks. Deal with all four of them.',
    reward: 700,
    target: () => ({ x: 3100, y: 1900, label: 'The Docks — Coral Vipers' }),
    objective: (G) => `Deal with the Coral Vipers: ${4 - G.missionState.kills} left`,
    onStart(G) {
      G.missionState = { stage: 0, kills: 0 };
      G.gang = [];
      const spots = [
        { x: 3060, y: 1860 },
        { x: 3160, y: 1940 },
        { x: 3000, y: 2000 },
        { x: 3180, y: 1840 },
      ];
      for (const s of spots) {
        G.gang.push({ x: s.x, y: s.y, kind: 'gang', name: 'Coral Viper', angle: 0, hp: 60, down: false, speed: 150, shootTimer: 2, bob: 0 });
      }
      G.message = 'Four Coral Vipers at the docks. Deal with them.';
      G.messageTimer = 4;
    },
    check(G) {
      if (G.missionState.kills >= 4) return 'done';
      return 'active';
    },
  },
  {
    id: 'heat-wave',
    title: 'Mission 5 — Heat Wave',
    briefing: 'The whole city is looking for you. Three stars and counting — reach the safehouse in Old Town and lay low until the heat dies.',
    reward: 1000,
    target: () => ({ x: 640, y: 560, label: 'Safehouse — Old Town' }),
    objective: (G) => (G.wanted > 0 ? 'Lose the heat at the safehouse!' : 'Heat is off — reach the safehouse'),
    onStart(G) {
      G.wanted = 3;
      G.wantedTimer = 0;
      G.message = 'HEAT WAVE — 3 stars! Reach the safehouse in Old Town.';
      G.messageTimer = 5;
    },
    check(G) {
      const t = this.target();
      const d = Math.hypot(G.player.x - t.x, G.player.y - t.y);
      if (d < 80 && G.wanted === 0) return 'done';
      return 'active';
    },
  },
];

export function missionObjective(G) {
  const m = MISSIONS[G.missionIndex];
  if (!m) return 'Story complete — Solmar Bay is yours. Free roam!';
  return m.objective(G);
}

export function missionTarget(G) {
  const m = MISSIONS[G.missionIndex];
  if (!m) return null;
  return m.target(G);
}
