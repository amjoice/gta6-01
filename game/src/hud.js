// HUD and menus, drawn on the canvas: health bar, money, wanted stars, mission
// objective, speed, district, minimap, messages, and the title / pause / busted /
// story-complete panels. No DOM UI, so it all shows up in screenshots.
import { VIEW_H, VIEW_W, WANTED_MAX, WORLD_H, WORLD_W } from './config.js';
import { districtAt } from './city.js';
import { MISSIONS } from './missions.js';

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_DONE = 'done';

function text(ctx, value, x, y, size, color, align, weight) {
  ctx.font = `${weight || 400} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(value, x, y);
}

function panel(ctx, title, lines, prompt, accent) {
  const width = 740;
  const height = 150 + lines.length * 32;
  const x = (VIEW_W - width) / 2;
  const y = (VIEW_H - height) / 2;
  ctx.fillStyle = 'rgba(12, 16, 24, 0.88)';
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = accent || '#e8c33a';
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, height);
  text(ctx, title, VIEW_W / 2, y + 62, 40, '#f5f1e6', 'center', 800);
  lines.forEach((line, i) => text(ctx, line, VIEW_W / 2, y + 112 + i * 32, 19, '#c8ccd4', 'center'));
  text(ctx, prompt, VIEW_W / 2, y + height - 26, 20, accent || '#e8c33a', 'center', 700);
}

export function drawHud(ctx, G) {
  const p = G.player;
  // Health bar, top left.
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(18, 16, 220, 26);
  ctx.fillStyle = p.health > 50 ? '#58c96b' : p.health > 25 ? '#e8c33a' : '#e5534b';
  ctx.fillRect(20, 18, 216 * Math.max(0, p.health / 100), 22);
  ctx.strokeStyle = '#f5f1e6';
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 16, 220, 26);
  text(ctx, `♥ ${Math.ceil(p.health)}`, 28, 35, 17, '#ffffff', 'left', 700);
  text(ctx, `$${G.money.toLocaleString('en-US')}`, 18, 66, 26, '#7be07b', 'left', 800);
  text(ctx, `Ammo ${p.ammo}`, 18, 92, 16, '#e8e8e8', 'left', 600);

  // Wanted stars, top centre.
  for (let i = 0; i < WANTED_MAX; i += 1) {
    const x = VIEW_W / 2 - 70 + i * 30;
    const on = i < G.wanted;
    ctx.font = '700 28px ' + FONT;
    ctx.fillStyle = on ? '#ffd34d' : 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText('★', x, 42);
    if (on) {
      ctx.strokeStyle = '#8a6a00';
      ctx.lineWidth = 1;
      ctx.strokeText('★', x, 42);
    }
  }

  // Mission objective bar, under the stars.
  const m = MISSIONS[G.missionIndex];
  const obj = m ? `${m.title}  —  ${m.objective(G)}` : 'Story complete — free roam!';
  ctx.font = '600 17px ' + FONT;
  const w = Math.min(760, ctx.measureText(obj).width + 28);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect((VIEW_W - w) / 2, 52, w, 30);
  ctx.fillStyle = '#ffd34d';
  ctx.textAlign = 'center';
  ctx.fillText(obj, VIEW_W / 2, 73);

  // District + clock, bottom left.
  text(ctx, districtAt(p.x, p.y), 18, VIEW_H - 44, 17, '#ffffff', 'left', 700);
  text(ctx, G.clockLabel, 18, VIEW_H - 20, 15, '#d8dce2', 'left');

  // Speed, bottom right (when driving).
  if (p.inCar) {
    const kmh = Math.round(Math.abs(p.inCar.speed) * 0.36);
    text(ctx, `${kmh} km/h`, VIEW_W - 18, VIEW_H - 44, 30, '#ffffff', 'right', 800);
    text(ctx, p.inCar.name, VIEW_W - 18, VIEW_H - 20, 15, '#d8dce2', 'right');
  } else {
    text(ctx, 'WASD move · Mouse aim · Click shoot · E punch · F car · P pause', VIEW_W - 18, VIEW_H - 20, 14, 'rgba(255,255,255,0.75)', 'right');
  }

  // Toast message.
  if (G.messageTimer > 0 && G.message) {
    ctx.font = '700 19px ' + FONT;
    const mw = ctx.measureText(G.message).width + 30;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect((VIEW_W - mw) / 2, VIEW_H - 108, mw, 34);
    ctx.fillStyle = '#ffd34d';
    ctx.textAlign = 'center';
    ctx.fillText(G.message, VIEW_W / 2, VIEW_H - 84);
  }

  drawMinimap(ctx, G);
}

function drawMinimap(ctx, G) {
  const mw = 210;
  const mh = 150;
  const x0 = VIEW_W - mw - 16;
  const y0 = 16;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
  ctx.fillRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#2f7fb8';
  ctx.fillRect(x0, y0 + mh * (2280 / WORLD_H), mw, mh - mh * (2280 / WORLD_H));
  ctx.fillStyle = '#7fae5a';
  ctx.fillRect(x0, y0, mw, mh * (2280 / WORLD_H));
  ctx.fillStyle = '#3a3f46';
  for (const rx of [240, 640, 1040, 1440, 1840, 2240, 2640, 3040, 3360]) ctx.fillRect(x0 + rx * sx - 2, y0, 4, mh);
  for (const ry of [200, 560, 920, 1280, 1640, 2000, 2280]) ctx.fillRect(x0, y0 + ry * sy - 2, mw, 4);
  // Mission marker.
  const t = G.missionTargetPos;
  if (t) {
    ctx.fillStyle = '#ffd34d';
    ctx.beginPath();
    ctx.arc(x0 + t.x * sx, y0 + t.y * sy, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  // Police, red dots.
  ctx.fillStyle = '#ff4d4d';
  for (const cop of G.cops) {
    if (cop.down) continue;
    ctx.beginPath();
    ctx.arc(x0 + cop.x * sx, y0 + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player, white dot with dark ring.
  const p = G.player;
  const px = p.inCar ? p.inCar.x : p.x;
  const py = p.inCar ? p.inCar.y : p.y;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x0 + px * sx, y0 + py * sy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x0 - 4, y0 - 4, mw + 8, mh + 8);
}

export function drawScreenPanel(ctx, screen, G) {
  if (screen === SCREEN_TITLE) {
    panel(
      ctx,
      'SOLMAR BAY',
      [
        'An open-world crime story on the sunny coast. Original city, original crew.',
        'Lena “Vex” Marlowe owes the wrong people money. Five missions. One way out.',
        'WASD / arrows — move & drive · Mouse — aim · Click — shoot · E — punch',
        'F — steal / exit a car · Shift — run · P — pause · Progress saves automatically',
        G.hasSave ? 'A saved game was found — press Space to continue it.' : '',
      ].filter(Boolean),
      'Press Space or click to start',
      '#e8c33a',
    );
    return;
  }
  if (screen === SCREEN_PAUSED) {
    panel(ctx, 'Paused', ['The city waits for you.', `Money $${G.money.toLocaleString('en-US')} · Mission ${Math.min(G.missionIndex + 1, 5)} of 5`], 'Press P to resume', '#7fb8d9');
    return;
  }
  if (screen === SCREEN_BUSTED) {
    panel(ctx, 'BUSTED', [G.bustedReason || 'The police caught you.', 'You lost $150 in fines and woke up at the safehouse.'], 'Press Space to get back out there', '#ff6b5e');
    return;
  }
  if (screen === SCREEN_OVER) {
    panel(ctx, 'WASTED', ['Lena went down in the streets of Solmar Bay.', 'The city does not wait.'], 'Press Space to try again', '#ff6b5e');
    return;
  }
  if (screen === SCREEN_DONE) {
    panel(ctx, 'STORY COMPLETE', ['All five missions done. Solmar Bay is yours, Vex.', `Final take: $${G.money.toLocaleString('en-US')}`], 'Press Space to keep free-roaming', '#7be07b');
  }
}
