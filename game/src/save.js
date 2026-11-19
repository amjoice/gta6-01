// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// Save / load through localStorage: money, health, story progress and position.
// A corrupt or missing save is treated as "no save", never as an error.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function writeSave(state) {
  try {
    const data = {
      money: state.money,
      health: state.player.health,
      missionIndex: state.missionIndex,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      time: state.clockMinutes, // the in-game clock, in minutes — applySave loads this into clockMinutes (was state.time, elapsed seconds, which reset the clock on load)
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch { /* ignore */ }
}
