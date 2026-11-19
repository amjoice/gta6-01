// Re-authored 2026-11-19 for the gta6-01 resubmission (fresh recording).
// Drawing only: the city, the sea and beach, cars, people, bullets, particles and the
// mission marker, seen through a camera that follows the player. Flat vector art, drawn
// fresh every frame from the world state — no image assets at all.
import { BEACH_TOP, COLORS, ROADS_X, ROADS_Y, ROAD_W, VIEW_H, VIEW_W, WORLD_H, WORLD_W } from './config.js';
import { drawHud, drawScreenPanel, SCREEN_BUSTED, SCREEN_DONE, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY } from './hud.js';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
    view.x = (canvas.width - VIEW_W * view.scale) / 2;
    view.y = (canvas.height - VIEW_H * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${weight || 400}:${size}`;
    if (!fonts.has(key)) fonts.set(key, `${weight || 400} ${size}px system-ui, sans-serif`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function drawCity(G) {
    const cam = G.camera;
    // Ground.
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(cam.x - 40, cam.y - 40, VIEW_W + 80, VIEW_H + 80);
    // Sea and beach (south).
    if (cam.y + VIEW_H > BEACH_TOP) {
      ctx.fillStyle = COLORS.sand;
      ctx.fillRect(cam.x - 40, BEACH_TOP, VIEW_W + 80, 180);
      ctx.fillStyle = COLORS.sea;
      ctx.fillRect(cam.x - 40, 2460, VIEW_W + 80, WORLD_H - 2460 + 80);
      ctx.fillStyle = COLORS.seaDeep;
      for (let i = 0; i < 5; i += 1) {
        const wy = 2500 + i * 18;
        ctx.fillRect(cam.x - 40 + ((G.time * 20 + i * 260) % (VIEW_W + 200)) - 100, wy, 90, 3);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fillRect(cam.x - 40, 2452, VIEW_W + 80, 5);
    }
    // Roads.
    ctx.fillStyle = COLORS.road;
    for (const rx of ROADS_X) ctx.fillRect(rx - ROAD_W / 2, 0, ROAD_W, WORLD_H);
    for (const ry of ROADS_Y) ctx.fillRect(0, ry - ROAD_W / 2, WORLD_W, ROAD_W);
    // Sidewalks.
    ctx.fillStyle = COLORS.sidewalk;
    for (const rx of ROADS_X) {
      ctx.fillRect(rx - ROAD_W / 2 - 12, 0, 12, WORLD_H);
      ctx.fillRect(rx + ROAD_W / 2, 0, 12, WORLD_H);
    }
    for (const ry of ROADS_Y) {
      ctx.fillRect(0, ry - ROAD_W / 2 - 12, WORLD_W, 12);
      ctx.fillRect(0, ry + ROAD_W / 2, WORLD_W, 12);
    }
    // Centre dashes.
    ctx.fillStyle = COLORS.roadLine;
    for (const rx of ROADS_X) {
      for (let y = 0; y < WORLD_H; y += 64) ctx.fillRect(rx - 3, y, 6, 30);
    }
    for (const ry of ROADS_Y) {
      for (let x = 0; x < WORLD_W; x += 64) ctx.fillRect(x, ry - 3, 30, 6);
    }
    // Parks / plaza / docks.
    for (const park of G.city.parks) {
      ctx.fillStyle = park.kind === 'docks' ? '#8a7a5a' : COLORS.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      if (park.kind === 'plaza') {
        ctx.fillStyle = '#c9b896';
        ctx.beginPath();
        ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4f7fb8';
        ctx.beginPath();
        ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 26, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = '#5a4a3a';
        for (let i = 0; i < 4; i += 1) ctx.fillRect(park.x + 20 + i * 60, park.y + 30, 44, 26);
        text('DOCKS', park.x + park.w / 2, park.y + park.h - 16, 22, '#e8e8e8', 'center', 800);
      }
    }
    // Buildings with roof shading and windows.
    for (const b of G.city.buildings) {
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      ctx.fillStyle = 'rgba(255,255,200,0.75)';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor(b.h / 26));
      for (let cx = 0; cx < cols; cx += 1) {
        for (let cy = 0; cy < rows; cy += 1) {
          if ((cx + cy) % 2 === 0) ctx.fillRect(b.x + 10 + cx * 26, b.y + 10 + cy * 26, 10, 12);
        }
      }
    }
    // Trees.
    for (const t of G.city.trees) {
      ctx.fillStyle = '#5a4a2a';
      ctx.fillRect(t.x - 2, t.y - 2, 4, 5);
      ctx.fillStyle = '#3f7a34';
      ctx.beginPath();
      ctx.arc(t.x, t.y - 6, t.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#57a047';
      ctx.beginPath();
      ctx.arc(t.x - 3, t.y - 9, t.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(-34, -16, 68, 34);
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.roundRect(-32, -15, 64, 30, 8);
    ctx.fill();
    ctx.fillStyle = '#222a33';
    ctx.beginPath();
    ctx.roundRect(-8, -12, 18, 24, 4);
    ctx.fill();
    ctx.fillStyle = '#e8f4ff';
    ctx.fillRect(24, -11, 5, 22);
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(-33, -12, 3, 7);
    ctx.fillRect(-33, 5, 3, 7);
    if (car.kind === 'police') {
      ctx.fillStyle = '#e8e8e8';
      ctx.fillRect(-2, -15, 16, 30);
      ctx.fillStyle = '#d94f4f';
      ctx.fillRect(8, -15, 4, 6);
      ctx.fillStyle = '#4f7fd9';
      ctx.fillRect(8, 9, 4, 6);
      text('PD', 2, 5, 11, '#111', 'center', 800);
    }
    ctx.restore();
  }

  function drawPerson(x, y, angle, color, down, bob, label) {
    ctx.save();
    ctx.translate(x, y);
    if (down) {
      ctx.rotate(Math.PI / 2);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }
    const wobble = Math.sin(bob || 0) * 2;
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 12, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(7, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(4, -8 + wobble * 0.4, 7, 3);
    ctx.fillRect(4, 5 - wobble * 0.4, 7, 3);
    ctx.restore();
    if (label) text(label, x, y - 20, 12, '#fff', 'center', 700);
  }

  function drawWorld(G) {
    drawCity(G);
    // Cash / health pickups.
    for (const pk of G.pickups) {
      ctx.save();
      ctx.translate(pk.x, pk.y + Math.sin(G.time * 4 + pk.x) * 3);
      if (pk.kind === 'cash') {
        ctx.fillStyle = '#58c96b';
        ctx.fillRect(-11, -7, 22, 14);
        ctx.fillStyle = '#fff';
        ctx.font = '700 12px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('$', 0, 5);
      } else {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-10, -10, 20, 20);
        ctx.fillStyle = '#e5534b';
        ctx.fillRect(-3, -8, 6, 16);
        ctx.fillRect(-8, -3, 16, 6);
      }
      ctx.restore();
    }
    // Mission marker: a pulsing beacon + a floating diamond.
    const t = G.missionTargetPos;
    if (t) {
      const pulse = 26 + Math.sin(G.time * 4) * 6;
      ctx.strokeStyle = 'rgba(255, 211, 77, 0.9)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd34d';
      ctx.save();
      ctx.translate(t.x, t.y - 34 + Math.sin(G.time * 3) * 4);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-9, -9, 18, 18);
      ctx.restore();
      text(t.label || '', t.x, t.y - 52, 14, '#ffd34d', 'center', 700);
    }
    // Traffic, parked cars, police cars.
    for (const car of G.traffic) drawCar(car);
    for (const car of G.cars) drawCar(car);
    // Gang members (mission 4) with a red marker.
    for (const g of G.gang) {
      if (g.down) {
        drawPerson(g.x, g.y, g.angle, '#c94f4f', true, 0);
        continue;
      }
      drawPerson(g.x, g.y, g.angle, '#c94f4f', false, g.bob, 'VIPER');
      ctx.fillStyle = '#e5534b';
      ctx.fillRect(g.x - 14, g.y - 26, 28, 5);
      ctx.fillStyle = '#58c96b';
      ctx.fillRect(g.x - 14, g.y - 26, 28 * Math.max(0, g.hp / 60), 5);
    }
    // Pedestrians.
    for (const ped of G.peds) drawPerson(ped.x, ped.y, ped.angle, ped.color, ped.down, ped.bob);
    // Foot police.
    for (const cop of G.cops) {
      if (cop.kind !== 'foot' || cop.down) continue;
      drawPerson(cop.x, cop.y, cop.angle, '#1a2a4a', false, G.time * 10, 'POLICE');
    }
    // Player.
    const p = G.player;
    if (!p.inCar) {
      drawPerson(p.x, p.y, p.angle, '#e8b04b', false, p.moving ? G.time * 12 : 0);
      // Aim line + gun.
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 16, p.y + Math.sin(p.angle) * 16);
      ctx.lineTo(p.x + Math.cos(p.angle) * 34, p.y + Math.sin(p.angle) * 34);
      ctx.stroke();
      // Name tag.
      text('VEX', p.x, p.y - 22, 12, '#ffd34d', 'center', 800);
    }
    // Bullets.
    ctx.fillStyle = '#ffe9a8';
    for (const b of G.bullets) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.fillRect(-8, -2, 16, 4);
      ctx.restore();
    }
    // Particles.
    for (const pt of G.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - 3, pt.y - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
    // Wanted flash: red edges while the heat is on.
    if (G.wanted > 0) {
      const a = 0.10 + Math.sin(G.time * 5) * 0.05;
      ctx.strokeStyle = `rgba(229, 83, 75, ${a})`;
      ctx.lineWidth = 14;
      ctx.strokeRect(G.camera.x + 7, G.camera.y + 7, VIEW_W - 14, VIEW_H - 14);
    }
    // Golden-hour tint that deepens toward dusk as the in-game clock advances.
    const dusk = G.duskAmount;
    if (dusk > 0) {
      ctx.fillStyle = `rgba(80, 40, 120, ${dusk * 0.16})`;
      ctx.fillRect(G.camera.x - 40, G.camera.y - 40, VIEW_W + 80, VIEW_H + 80);
      ctx.fillStyle = `rgba(255, 160, 60, ${dusk * 0.06})`;
      ctx.fillRect(G.camera.x - 40, G.camera.y - 40, VIEW_W + 80, VIEW_H + 80);
    }
  }

  function draw(G, screen) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#11141b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    // Camera transform: world is drawn in view space offset by the camera.
    ctx.save();
    ctx.translate(-G.camera.x, -G.camera.y);
    drawWorld(G);
    ctx.restore();
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED || screen === SCREEN_BUSTED || screen === SCREEN_OVER || screen === SCREEN_DONE) {
      drawHud(ctx, G);
    }
    if (screen !== SCREEN_PLAY) drawScreenPanel(ctx, screen, G);
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
