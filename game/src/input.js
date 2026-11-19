// Keyboard and mouse input for Porto Verde.
// Tracks held keys, just-pressed keys, and the mouse position / clicks.

export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, down: false };

  function onKeyDown(e) {
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
    if (!held.has(e.code)) pressed.add(e.code);
    held.add(e.code);
  }

  function onKeyUp(e) {
    held.delete(e.code);
  }

  function onMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
  }

  function onMouseDown(e) {
    onMouseMove(e);
    mouse.down = true;
    mouse.clicked = true;
  }

  function onMouseUp() {
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    // Is any of the given codes held down right now?
    isDown(codes) {
      for (const c of codes) if (held.has(c)) return true;
      return false;
    },
    // Was any of the given codes pressed since the last frame?
    wasPressed(codes) {
      for (const c of codes) if (pressed.has(c)) return true;
      return false;
    },
    // Clear the just-pressed set at the end of each frame.
    endFrame() {
      pressed.clear();
      mouse.clicked = false;
    },
    mouse,
  };
}
