# Porto Verde

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/amjoice/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/amjoice/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01)

**Porto Verde** is an open-world crime game in the spirit of GTA 6, built for the
[make.fun GTA 6 bounty](https://make.fun/bounty/gta6-01). Milo Ferrante drives for
Sofia Delgado, the fixer of a sun-soaked coastal city. Steal cars, dodge the
Porto Verde Police Department, run five story jobs, and get paid.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 — no build step, no network requests, just
static files under `game/`.

## The game

- **A city to explore** — Porto Verde: avenues, blocks, parks, a central plaza
  with a fountain, and a beach on the teal sea. On foot and by car.
- **Traffic and pedestrians** — cars cruise the avenues and turn at crossings;
  pedestrians stroll the sidewalks and flee from trouble.
- **Cars to steal and drive** — sedans, taxis, trucks and sports cars. Press `E`
  beside one to take it; the PVPD notices.
- **Wanted level and police** — five stars of heat. Interceptors chase and ram;
  officers on foot arrest you. Lay low and the heat fades.
- **Missions and a story** — five jobs from Sofia: a pickup, a getaway, three
  deliveries, a hot pursuit, and the Banco Verde heist. $3,050 in all.
- **Combat** — punch with `Space`. Running someone over is a crime too.
- **HUD with a minimap** — health, money, wanted stars, mission objective, a
  live minimap, and a speedometer while driving.
- **Start screen, pause, save** — the game saves itself when a job is done and
  offers to continue a saved game from the menu.
- **Sound** — synthesized engine, sirens, punches and jingles (WebAudio, no
  audio files). `M` mutes.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrows | Move on foot, drive a car |
| Shift | Run |
| E | Steal / exit a car |
| Space | Punch |
| P / Esc | Pause |
| M | Mute |

## Files

- `game/index.html` — the page (canvas + minimap).
- `game/src/config.js` — constants: world, roads, cars, palette, keys.
- `game/src/rng.js` — seeded random numbers.
- `game/src/city.js` — the city: roads, blocks, buildings, parks, beach.
- `game/src/input.js` — keyboard and mouse.
- `game/src/audio.js` — synthesized sound (WebAudio).
- `game/src/save.js` — localStorage save / load.
- `game/src/player.js` — Milo on foot: walk, run, punch, enter cars.
- `game/src/cars.js` — car physics and driving.
- `game/src/actors.js` — pedestrians and traffic AI.
- `game/src/police.js` — the wanted level, pursuit, busted / wasted.
- `game/src/missions.js` — the five story jobs.
- `game/src/hud.js` — HUD and minimap.
- `game/src/render.js` — canvas rendering of the world.
- `game/src/shots.js` — screenshot staging via `?shot=`.
- `game/src/main.js` — game loop and state machine.
- `main.ts` — builds the dossier (`node main.ts`).
- `serve.ts` — static file server for local play.

## Referral

New to make.fun? Sign up with my link: https://make.fun/r/wab5mbny
