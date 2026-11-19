// Save and load for Porto Verde — a single localStorage slot.
// Stores money, mission progress, health, position and wanted level.

const SAVE_KEY = 'porto-verde-save-v1';

export function saveGame(state) {
  try {
    const data = {
      money: state.money,
      missionIndex: state.missionIndex,
      missionsDone: state.missionsDone,
      health: state.player.health,
      x: Math.round(state.player.x),
      y: Math.round(state.player.y),
      wanted: state.wanted,
      totalEarned: state.totalEarned,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.money !== 'number' || typeof data.missionIndex !== 'number') return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return loadGame() !== null;
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // Storage may be unavailable; a missing save is not fatal.
  }
}
