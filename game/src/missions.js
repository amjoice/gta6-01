// The story of Porto Verde: five jobs from Sofia Delgado, the fixer.
// Each job pays; finish them all and Milo owns the city.

import { MISSION_REWARDS } from './config.js';

// A job: where to go, what to do, what it pays.
export const MISSIONS = [
  {
    name: 'First Job',
    giver: 'Sofia Delgado',
    brief: 'Sofia needs a package picked up at the Marina. Drive or walk to the gold marker.',
    kind: 'goto',
    target: { x: 2260, y: 260 },
    reward: MISSION_REWARDS[0],
  },
  {
    name: 'Getaway Driver',
    giver: 'Sofia Delgado',
    brief: 'A car is waiting at the plaza. Steal it and reach the drop-off before the clock runs out — the cops are already looking.',
    kind: 'steal-and-deliver',
    target: { x: 260, y: 2260 },
    carAt: { x: 1300, y: 1300 },
    timeLimit: 75,
    reward: MISSION_REWARDS[1],
  },
  {
    name: 'The Delivery',
    giver: 'Sofia Delgado',
    brief: 'Three drops, one night. Hit every gold marker across the city.',
    kind: 'multi-goto',
    targets: [
      { x: 660, y: 660 },
      { x: 1860, y: 1060 },
      { x: 1060, y: 1860 },
    ],
    reward: MISSION_REWARDS[2],
  },
  {
    name: 'Hot Pursuit',
    giver: 'Sofia Delgado',
    brief: 'The heat is on — three stars. Lose the cops and stay free for 60 seconds.',
    kind: 'evade',
    evadeSeconds: 60,
    reward: MISSION_REWARDS[3],
  },
  {
    name: 'The Big Score',
    giver: 'Sofia Delgado',
    brief: 'The Banco Verde vault. Grab the cash at the bank, then escape to the safehouse at the north docks.',
    kind: 'heist',
    target: { x: 660, y: 260 },
    escape: { x: 2260, y: 260 },
    reward: MISSION_REWARDS[4],
  },
];

export function createMissionState() {
  return {
    index: 0, // which mission is active (0..4); 5 means the story is done
    stage: 0, // progress within a multi-stage mission
    timer: 0, // counts down for timed missions, up for evade missions
    done: false,
  };
}

export function currentMission(state) {
  if (state.index >= MISSIONS.length) return null;
  return MISSIONS[state.index];
}

// The active target point for the HUD arrow and the minimap.
export function missionTarget(state) {
  const m = currentMission(state);
  if (!m) return null;
  if (m.kind === 'multi-goto') return m.targets[Math.min(state.stage, m.targets.length - 1)];
  if (m.kind === 'steal-and-deliver') return state.stage === 0 ? m.carAt : m.target;
  if (m.kind === 'heist') return state.stage === 0 ? m.target : m.escape;
  if (m.kind === 'goto') return m.target;
  return null; // evade missions have no destination
}

// A short line for the HUD describing what to do right now.
export function missionObjective(state) {
  const m = currentMission(state);
  if (!m) return 'Story complete — free roam. Enjoy Porto Verde!';
  if (m.kind === 'goto') return 'Reach the gold marker at the Marina';
  if (m.kind === 'steal-and-deliver' && state.stage === 0) return 'Steal the car at the plaza';
  if (m.kind === 'heist' && state.stage === 0) return 'Reach the bank and grab the cash';
  if (m.kind === 'heist' && state.stage === 1) return 'Escape to the safehouse at the north docks';
  if (m.kind === 'evade') return `Lose the cops — stay free for ${Math.max(0, Math.ceil(m.evadeSeconds - state.timer))}s`;
  if (m.kind === 'multi-goto') return `Drop ${state.stage + 1} of ${m.targets.length}`;
  return m.brief;
}

// Start a mission: reset its timer and stage.
export function startMission(state) {
  const m = currentMission(state);
  if (!m) return;
  state.stage = 0;
  state.timer = 0;
  state.done = false;
}

// Distance from the player to the active target (Infinity when none).
export function distanceToTarget(state, x, y) {
  const t = missionTarget(state);
  if (!t) return Infinity;
  return Math.hypot(t.x - x, t.y - y);
}

// Advance the mission. Returns 'complete' when the mission is finished,
// 'stage' when a stage advanced, or null when nothing happened.
export function advanceMission(state, x, y, inCar, wanted, dt) {
  const m = currentMission(state);
  if (!m) return null;

  if (m.kind === 'goto') {
    if (Math.hypot(m.target.x - x, m.target.y - y) < 60) return 'complete';
  } else if (m.kind === 'steal-and-deliver') {
    if (state.stage === 0) {
      if (inCar && Math.hypot(m.carAt.x - x, m.carAt.y - y) < 120) state.stage = 1;
    } else if (Math.hypot(m.target.x - x, m.target.y - y) < 60) {
      return 'complete';
    }
  } else if (m.kind === 'multi-goto') {
    const t = m.targets[state.stage];
    if (Math.hypot(t.x - x, t.y - y) < 60) {
      state.stage += 1;
      if (state.stage >= m.targets.length) return 'complete';
      return 'stage';
    }
  } else if (m.kind === 'evade') {
    if (wanted === 0) {
      state.timer += dt;
      if (state.timer >= m.evadeSeconds) return 'complete';
    } else {
      state.timer = Math.max(0, state.timer - dt * 0.5);
    }
  } else if (m.kind === 'heist') {
    if (state.stage === 0) {
      if (Math.hypot(m.target.x - x, m.target.y - y) < 60) state.stage = 1;
    } else if (Math.hypot(m.escape.x - x, m.escape.y - y) < 60) {
      return 'complete';
    }
  }
  return null;
}

// Tick a timed mission's countdown. Returns true when time runs out.
export function tickMissionTimer(state, dt) {
  const m = currentMission(state);
  if (!m || !m.timeLimit) return false;
  state.timer += dt;
  return state.timer >= m.timeLimit;
}

export function missionTimeLeft(state) {
  const m = currentMission(state);
  if (!m || !m.timeLimit) return null;
  return Math.max(0, m.timeLimit - state.timer);
}
