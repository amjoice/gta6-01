// The HUD of Porto Verde: health, money, wanted stars, mission text,
// a minimap, and toast messages. Drawn on the main canvas and a small map canvas.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, PALETTE, ROADS_X, ROADS_Y } from './config.js';

// Draw the whole HUD onto the main canvas context.
export function drawHud(ctx, game) {
  const p = game.player;
  const pad = 16;

  // Health bar (top left).
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, pad, pad, 230, 26, 6);
  ctx.fill();
  ctx.fillStyle = p.health > 30 ? '#4caf50' : '#e74c3c';
  const w = 224 * Math.max(0, p.health / 100);
  roundRect(ctx, pad + 3, pad + 3, Math.max(0, w), 20, 5);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`HP ${Math.round(p.health)}`, pad + 10, pad + 13);

  // Money (below health).
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, pad, pad + 34, 230, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#7ee787';
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.fillText(`$ ${p.money.toLocaleString('en-US')}`, pad + 10, pad + 47);

  // Wanted stars (top centre).
  const stars = game.police.wanted;
  ctx.font = '26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < stars ? '#ffd54a' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', VIEW_W / 2 - 52 + i * 26, pad + 16);
  }
  ctx.textAlign = 'left';

  // Mission line (top, under the stars).
  const objective = game.missionObjective;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  const mw = ctx.measureText(objective).width + 24;
  roundRect(ctx, VIEW_W / 2 - mw / 2, pad + 44, mw, 26, 6);
  ctx.fill();
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(objective, VIEW_W / 2, pad + 57);
  ctx.textAlign = 'left';

  // Timer for timed missions.
  if (game.missionTimeLeft !== null && game.missionTimeLeft !== undefined) {
    const t = Math.max(0, Math.ceil(game.missionTimeLeft));
    ctx.fillStyle = t < 15 ? '#ff6b6b' : '#fff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, VIEW_W / 2, pad + 92);
    ctx.textAlign = 'left';
  }

  // Toast messages (centre, fading).
  if (game.toast && game.toastT > 0) {
    ctx.globalAlpha = Math.min(1, game.toastT);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const tw = ctx.measureText(game.toast).width + 28;
    roundRect(ctx, VIEW_W / 2 - tw / 2, VIEW_H - 110, tw, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(game.toast, VIEW_W / 2, VIEW_H - 95);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }

  // Controls hint (bottom left, small).
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  roundRect(ctx, pad, VIEW_H - 44, 330, 28, 6);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD move · Shift run · E car · Space punch · P pause · M mute', pad + 10, VIEW_H - 30);

  // Speed when driving (bottom right).
  if (!p.onFoot && p.car) {
    const kmh = Math.round(Math.abs(p.car.speed) * 0.55);
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, VIEW_W - 150, VIEW_H - 64, 134, 48, 8);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${kmh}`, VIEW_W - 46, VIEW_H - 40);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('km/h', VIEW_W - 24, VIEW_H - 40);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

// Draw the minimap onto its own small canvas.
export function drawMinimap(mapCtx, mapW, mapH, game) {
  const sx = mapW / WORLD_W;
  const sy = mapH / WORLD_H;
  mapCtx.save();
  mapCtx.clearRect(0, 0, mapW, mapH);
  // Land.
  mapCtx.fillStyle = PALETTE.grass;
  mapCtx.fillRect(0, 0, mapW, mapH);
  // Sea.
  mapCtx.fillStyle = PALETTE.sea;
  mapCtx.fillRect(0, 2420 * sy, mapW, mapH - 2420 * sy);
  // Roads.
  mapCtx.fillStyle = '#55504c';
  for (const rx of ROADS_X) mapCtx.fillRect(rx * sx - 3, 0, 6, mapH);
  for (const ry of ROADS_Y) mapCtx.fillRect(0, ry * sy - 3, mapW, 6);
  // Plaza.
  mapCtx.fillStyle = PALETTE.plaza;
  mapCtx.fillRect(1180 * sx, 1180 * sy, 240 * sx, 240 * sy);
  // Mission target (blinking gold).
  const target = game.missionTargetPos;
  if (target) {
    const pulse = 3 + Math.sin(game.time * 5) * 1.5;
    mapCtx.fillStyle = '#ffd54a';
    mapCtx.beginPath();
    mapCtx.arc(target.x * sx, target.y * sy, pulse + 3, 0, Math.PI * 2);
    mapCtx.fill();
    mapCtx.fillStyle = '#7a5b00';
    mapCtx.beginPath();
    mapCtx.arc(target.x * sx, target.y * sy, 2.5, 0, Math.PI * 2);
    mapCtx.fill();
  }
  // Police (red dots).
  mapCtx.fillStyle = '#ff3b30';
  for (const c of game.police.cars) {
    mapCtx.beginPath();
    mapCtx.arc(c.x * sx, c.y * sy, 3, 0, Math.PI * 2);
    mapCtx.fill();
  }
  // Player (white arrow).
  const p = game.player;
  mapCtx.save();
  mapCtx.translate(p.x * sx, p.y * sy);
  mapCtx.rotate(p.angle);
  mapCtx.fillStyle = '#fff';
  mapCtx.strokeStyle = '#000';
  mapCtx.lineWidth = 1;
  mapCtx.beginPath();
  mapCtx.moveTo(7, 0);
  mapCtx.lineTo(-5, -4.5);
  mapCtx.lineTo(-5, 4.5);
  mapCtx.closePath();
  mapCtx.fill();
  mapCtx.stroke();
  mapCtx.restore();
  // Border.
  mapCtx.strokeStyle = 'rgba(0,0,0,0.6)';
  mapCtx.lineWidth = 2;
  mapCtx.strokeRect(1, 1, mapW - 2, mapH - 2);
  mapCtx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
