// Rendering for Porto Verde: the city, the cars, the people, the sea.
// Everything is drawn on one canvas with a camera that follows the player.

import { WORLD_W, WORLD_H, ROAD_W, ROADS_X, ROADS_Y, SEA_Y, BEACH_H, VIEW_W, VIEW_H, PALETTE, SCREEN_MENU, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED } from './config.js';

// The camera: a viewport into the world, clamped to its edges.
export function createCamera() {
  return { x: 0, y: 0 };
}

export function updateCamera(cam, focusX, focusY) {
  cam.x = Math.max(0, Math.min(WORLD_W - VIEW_W, focusX - VIEW_W / 2));
  cam.y = Math.max(0, Math.min(WORLD_H - VIEW_H, focusY - VIEW_H / 2));
}

// Draw the whole game world for one frame.
export function renderWorld(ctx, game) {
  const cam = game.camera;
  ctx.save();
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.translate(-cam.x, -cam.y);

  drawGround(ctx, game);
  drawRoads(ctx, game);
  drawParks(ctx, game);
  drawPlaza(ctx, game);
  drawBuildings(ctx, game);
  drawBeachAndSea(ctx, game);
  drawMissionMarker(ctx, game);
  drawCars(ctx, game);
  drawPeds(ctx, game);
  drawPlayer(ctx, game);
  drawPolice(ctx, game);

  ctx.restore();
}

function drawGround(ctx, game) {
  // Grass base.
  ctx.fillStyle = PALETTE.grass;
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);
  // A subtle checker of mown grass, so the ground reads as a place.
  ctx.fillStyle = PALETTE.grassDark;
  const step = 220;
  for (let x = 0; x < WORLD_W; x += step) {
    for (let y = 0; y < WORLD_H; y += step) {
      if (((x + y) / step) % 2 === 0) ctx.fillRect(x, y, step, step);
    }
  }
}

function drawRoads(ctx, game) {
  // Asphalt.
  ctx.fillStyle = PALETTE.road;
  for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
  for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
  // Sidewalk edges.
  ctx.fillStyle = PALETTE.sidewalk;
  for (const rx of ROADS_X) {
    ctx.fillRect(rx - ROAD_W / 2 - 8, 0, 8, WORLD_H);
    ctx.fillRect(rx + ROAD_W / 2, 0, 8, WORLD_H);
  }
  for (const ry of ROADS_Y) {
    ctx.fillRect(0, ry - ROAD_W / 2 - 8, WORLD_W, 8);
    ctx.fillRect(0, ry + ROAD_W / 2, WORLD_W, 8);
  }
  // Centre dashes.
  ctx.fillStyle = PALETTE.roadLine;
  for (const rx of ROADS_X) {
    for (let y = 0; y < WORLD_H; y += 70) ctx.fillRect(rx - 2, y, 4, 34);
  }
  for (const ry of ROADS_Y) {
    for (let x = 0; x < WORLD_W; x += 70) ctx.fillRect(x, ry - 2, 34, 4);
  }
}

function drawParks(ctx, game) {
  for (const park of game.city.parks) {
    ctx.fillStyle = '#6fa055';
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.strokeStyle = '#577f45';
    ctx.lineWidth = 3;
    ctx.strokeRect(park.x, park.y, park.w, park.h);
  }
  for (const t of game.city.trees) {
    drawTree(ctx, t.x, t.y, t.r, t.palm);
  }
}

function drawTree(ctx, x, y, r, palm) {
  ctx.fillStyle = '#5a4632';
  ctx.fillRect(x - 2, y - 2, 4, 6);
  ctx.fillStyle = palm ? '#2f8f5b' : PALETTE.tree;
  ctx.beginPath();
  ctx.arc(x, y - 4, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.treeDark;
  ctx.beginPath();
  ctx.arc(x - r * 0.3, y - r * 0.4, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlaza(ctx, game) {
  const pl = game.city.plaza;
  ctx.fillStyle = PALETTE.plaza;
  ctx.fillRect(pl.x, pl.y, pl.w, pl.h);
  ctx.strokeStyle = '#a08c5e';
  ctx.lineWidth = 4;
  ctx.strokeRect(pl.x, pl.y, pl.w, pl.h);
  // A fountain at the plaza's heart.
  ctx.fillStyle = PALETTE.sea;
  ctx.beginPath();
  ctx.arc(pl.x + pl.w / 2, pl.y + pl.h / 2, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#bfe6ef';
  ctx.beginPath();
  ctx.arc(pl.x + pl.w / 2, pl.y + pl.h / 2, 24, 0, Math.PI * 2);
  ctx.fill();
}

function drawBuildings(ctx, game) {
  for (const b of game.city.buildings) {
    // A soft shadow to the south-east.
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(b.x + 8, b.y + 10, b.w, b.h);
    // Walls and a coloured roof.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    // Roof details: a lighter inner rectangle and a vent.
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(b.x + 10, b.y + 10, b.w - 20, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(b.x + b.w / 2 - 8, b.y + b.h / 2 - 8, 16, 16);
    if (b.tall) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(b.x + 6, b.y + 6, 4, b.h - 12);
    }
  }
}

function drawBeachAndSea(ctx, game) {
  // Sand.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, SEA_Y - BEACH_H, WORLD_W, BEACH_H);
  // Sea with slow waves.
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(0, SEA_Y, WORLD_W, WORLD_H - SEA_Y);
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let x = 0; x < WORLD_W; x += 130) {
    const wave = Math.sin(game.time * 1.4 + x * 0.01) * 5;
    ctx.fillRect(x, SEA_Y + 8 + wave, 60, 3);
    ctx.fillRect(x + 40, SEA_Y + 34 - wave, 46, 3);
  }
  ctx.fillStyle = PALETTE.seaDeep;
  ctx.fillRect(0, SEA_Y + 90, WORLD_W, WORLD_H - SEA_Y - 90);
}

// The mission target: a gold beacon with a pulsing ring.
function drawMissionMarker(ctx, game) {
  const t = game.missionTargetPos;
  if (!t) return;
  const pulse = 1 + Math.sin(game.time * 4) * 0.15;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.strokeStyle = '#ffd54a';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,213,74,0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffd54a';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  // A floating diamond above the marker.
  const bob = Math.sin(game.time * 3) * 6;
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.moveTo(0, -58 + bob);
  ctx.lineTo(10, -44 + bob);
  ctx.lineTo(0, -30 + bob);
  ctx.lineTo(-10, -44 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCars(ctx, game) {
  for (const car of game.cars) drawCar(ctx, car, false, game.time);
  for (const car of game.police.cars) drawCar(ctx, car, true, game.time);
}

function drawCar(ctx, car, isPolice, time) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(-car.len / 2 + 3, -car.wid / 2 + 4, car.len, car.wid);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -car.len / 2, -car.wid / 2, car.len, car.wid, 7);
  ctx.fill();
  // Windows.
  ctx.fillStyle = '#bfe3ec';
  ctx.fillRect(-car.len / 2 + 10, -car.wid / 2 + 4, 14, car.wid - 8);
  ctx.fillRect(car.len / 2 - 22, -car.wid / 2 + 4, 12, car.wid - 8);
  // Headlights.
  ctx.fillStyle = '#fff8c9';
  ctx.fillRect(car.len / 2 - 2, -car.wid / 2 + 3, 3, 5);
  ctx.fillRect(car.len / 2 - 2, car.wid / 2 - 8, 3, 5);
  // Brake lights.
  if (car.brakeLight) {
    ctx.fillStyle = '#ff2d2d';
    ctx.fillRect(-car.len / 2 - 1, -car.wid / 2 + 3, 3, 5);
    ctx.fillRect(-car.len / 2 - 1, car.wid / 2 - 8, 3, 5);
  }
  // Wheels.
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(-car.len / 2 + 6, -car.wid / 2 - 3, 12, 5);
  ctx.fillRect(-car.len / 2 + 6, car.wid / 2 - 2, 12, 5);
  ctx.fillRect(car.len / 2 - 18, -car.wid / 2 - 3, 12, 5);
  ctx.fillRect(car.len / 2 - 18, car.wid / 2 - 2, 12, 5);
  // Smoke from a wrecked car.
  if (car.health < 35 && car.health > 0) {
    ctx.fillStyle = 'rgba(120,120,120,0.5)';
    ctx.beginPath();
    ctx.arc(-car.len / 4, 0, 8 + Math.sin(time * 6) * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police light bar, flashing.
  if (isPolice) {
    const flash = Math.floor(time * 6) % 2 === 0;
    ctx.fillStyle = flash ? '#ff2d2d' : '#2d7bff';
    ctx.fillRect(-6, -car.wid / 2 + 2, 12, 6);
    ctx.fillStyle = flash ? '#2d7bff' : '#ff2d2d';
    ctx.fillRect(-6, car.wid / 2 - 8, 12, 6);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PVPD', 0, 3);
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawPeds(ctx, game) {
  for (const ped of game.peds) {
    if (ped.state === 'down') {
      // Lying flat after a punch.
      ctx.save();
      ctx.translate(ped.x, ped.y);
      ctx.fillStyle = ped.shirt;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      continue;
    }
    const bob = Math.sin(ped.phase) * 2;
    ctx.save();
    ctx.translate(ped.x, ped.y + bob * 0.3);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body and head.
    ctx.fillStyle = ped.shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.skin;
    ctx.beginPath();
    ctx.arc(0, -2, 5.5, 0, Math.PI * 2);
    ctx.fill();
    // Direction tick.
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(ped.angle) * 11, Math.sin(ped.angle) * 11);
    ctx.stroke();
    ctx.restore();
  }
}

function drawPlayer(ctx, game) {
  const p = game.player;
  if (!p.onFoot) return; // the player is inside the car, drawn with it
  const bob = p.moving ? Math.sin(p.stepPhase) * 2 : 0;
  ctx.save();
  ctx.translate(p.x, p.y + bob * 0.3);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(0, 9, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  // Milo: teal jacket, dark jeans.
  ctx.fillStyle = '#0e7490';
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1c27d';
  ctx.beginPath();
  ctx.arc(0, -2, 7, 0, Math.PI * 2);
  ctx.fill();
  // Facing tick and a punch flash.
  ctx.strokeStyle = '#083344';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(p.angle) * 15, Math.sin(p.angle) * 15);
  ctx.stroke();
  if (p.punchTimer > 0) {
    ctx.fillStyle = '#ffe45e';
    ctx.beginPath();
    ctx.arc(Math.cos(p.angle) * 26, Math.sin(p.angle) * 26, 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawPolice(ctx, game) {
  for (const o of game.police.officers) {
    ctx.save();
    ctx.translate(o.x, o.y + Math.sin(o.phase) * 1.5);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 9, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // Navy uniform, badge, cap.
    ctx.fillStyle = '#1e3a5f';
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd54a';
    ctx.beginPath();
    ctx.arc(0, -2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#16283f';
    ctx.fillRect(-7, -12, 14, 5);
    ctx.restore();
  }
}

// Full-screen overlays for the menu, pause, busted and wasted states.
export function renderOverlay(ctx, game) {
  const screen = game.screen;
  if (screen === SCREEN_MENU) {
    drawMenu(ctx, game);
  } else if (screen === SCREEN_PAUSED) {
    dim(ctx);
    centerText(ctx, 'PAUSED', VIEW_H / 2 - 40, 44, '#fff');
    centerText(ctx, 'Esc to resume · R to restart · S to save', VIEW_H / 2 + 10, 18, '#ddd');
  } else if (screen === SCREEN_BUSTED) {
    dim(ctx);
    centerText(ctx, 'BUSTED!', VIEW_H / 2 - 40, 54, '#ff6b6b');
    centerText(ctx, 'The PVPD caught you. You lost $150 in fines.', VIEW_H / 2 + 16, 18, '#fff');
    centerText(ctx, 'Press Enter to get back out there', VIEW_H / 2 + 48, 16, '#ddd');
  } else if (screen === SCREEN_WASTED) {
    dim(ctx);
    centerText(ctx, 'WASTED', VIEW_H / 2 - 40, 54, '#ff6b6b');
    centerText(ctx, 'Milo is down. The hospital patched him up — for $200.', VIEW_H / 2 + 16, 18, '#fff');
    centerText(ctx, 'Press Enter to get back out there', VIEW_H / 2 + 48, 16, '#ddd');
  }
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centerText(ctx, text, y, size, color) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.textAlign = 'left';
}

function drawMenu(ctx, game) {
  // A dusk sky gradient over the city behind the title.
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  g.addColorStop(0, 'rgba(20,30,60,0.82)');
  g.addColorStop(0.6, 'rgba(90,40,70,0.72)');
  g.addColorStop(1, 'rgba(20,30,60,0.82)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  centerText(ctx, 'PORTO VERDE', 170, 84, '#ffd54a');
  ctx.fillStyle = '#ff8c42';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('— an open-world crime story —', VIEW_W / 2, 220);
  ctx.textAlign = 'left';

  const lines = [
    'Milo Ferrante drives for Sofia Delgado, the fixer of Porto Verde.',
    'Five jobs. One city. Steal cars, dodge the PVPD, and get paid.',
    '',
    'WASD / Arrows — move & drive      Shift — run',
    'E — steal / exit a car             Space — punch',
    'P — pause   M — mute   (saves automatically)',
    '',
    game.hasSave ? 'A saved game is waiting — press C to continue it.' : '',
  ];
  ctx.font = '17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  let y = 280;
  for (const line of lines) {
    if (!line) { y += 12; continue; }
    ctx.fillStyle = '#f2f2f2';
    ctx.fillText(line, VIEW_W / 2, y);
    y += 30;
  }
  ctx.textAlign = 'left';

  // Blinking start prompt.
  const blink = Math.floor(game.time * 2) % 2 === 0;
  if (blink) centerText(ctx, 'CLICK OR PRESS ENTER TO START', 620, 26, '#fff');
  centerText(ctx, 'A fan-made open-world game. Not affiliated with Rockstar Games.', 700, 13, 'rgba(255,255,255,0.55)');
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
