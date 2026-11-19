// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// Keyboard + mouse input. Held keys steer; one-shot presses (confirm, pause, enter car,
// punch, interact) are queued as bit flags and taken once by the loop. A scripted override
// (used by the screenshot autopilot) can drive the same interface without a keyboard.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_INTERACT = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyF']);
const PUNCH = new Set(['KeyE']);
const INTERACT = new Set(['KeyQ']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 640;
  let mouseY = 360;
  let mouseDown = false;
  // Scripted override: {up,down,left,right,run,mouseX,mouseY,mouseDown} or null.
  let script = null;

  window.addEventListener('keydown', (event) => {
    keys.add(event.code);
    if (CONFIRM.has(event.code) && !event.repeat) actions |= ACTION_CONFIRM;
    else if (PAUSE.has(event.code) && !event.repeat) actions |= ACTION_PAUSE;
    else if (ENTER.has(event.code) && !event.repeat) actions |= ACTION_ENTER;
    else if (PUNCH.has(event.code) && !event.repeat) actions |= ACTION_PUNCH;
    else if (INTERACT.has(event.code) && !event.repeat) actions |= ACTION_INTERACT;
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || CONFIRM.has(event.code) || event.code === 'Space') event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => {
    keys.clear();
    mouseDown = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    mouseY = ((event.clientY - rect.top) / rect.height) * 720;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = ((event.clientX - rect.left) / rect.width) * 1280;
    mouseY = ((event.clientY - rect.top) / rect.height) * 720;
    mouseDown = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => {
    mouseDown = false;
  });
  // Right mouse also shoots; keep the context menu away from the game.
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function held(codeSet) {
    for (const code of codeSet) if (keys.has(code)) return true;
    return false;
  }

  return {
    setScript(next) {
      script = next;
    },
    clearScript() {
      script = null;
    },
    /** -1..1 steering on each axis, from keys or the scripted override. */
    axes() {
      if (script) {
        return {
          x: (script.right ? 1 : 0) - (script.left ? 1 : 0),
          y: (script.down ? 1 : 0) - (script.up ? 1 : 0),
          run: !!script.run,
        };
      }
      return {
        x: (held(RIGHT) ? 1 : 0) - (held(LEFT) ? 1 : 0),
        y: (held(DOWN) ? 1 : 0) - (held(UP) ? 1 : 0),
        run: held(RUN),
      };
    },
    aim() {
      if (script && script.mouseX !== undefined) return { x: script.mouseX, y: script.mouseY };
      return { x: mouseX, y: mouseY };
    },
    shooting() {
      return script ? !!script.mouseDown : mouseDown;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
