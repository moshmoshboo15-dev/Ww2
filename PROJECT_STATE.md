# Ashfront — Project State

## Architecture Overview
Ashfront is a full-stack Three.js + Node.js/Express/Socket.io WW1 & WW2 first-person shooter with full offline Single Player & Training Range modes, procedural 3D models/textures/WebAudio synthesis, landscape touch controls, and 40-player-per-room LAN/WiFi multiplayer.

## Implemented Features
- **Main Menu & Navigation (`client/ui/MainMenu.tsx`)**: Play Online (IP:port connect with 5-server history, Room Browser, Create/Host Room), Single Player Match Setup, Training Range, Loadout Editor, Barracks & Progression, and Settings (Graphics / Controls / Audio + English/Arabic RTL i18n).
- **Maps & Weather (`shared/maps.js`, `client/engine/mapBuilder.ts`)**:
  - `ww1_trench` — Muddy No Man's Land (Trenches, craters, barbed wire, bunkers, drifting mustard gas attacks)
  - `ww1_village` — Shattered Crossroads (Ruined brick buildings, cobble streets, craters, bunkers)
  - `ww2_armor` — Bocage & Sands (Rolling dunes/countryside, armor corridors, fortified compounds)
  - `ww2_naval` — Coral Atoll & Harbor (Airfield, naval docks, open sea channel, island capture zones)
  - `training_range` — Boot Camp Grounds (Moving & static target dummies, weapon rack drawer, 4-step tutorial, vehicles)
  - Time-of-day variants: `noon`, `dawn`, `dusk`, `overcast` (with rain & layered fog/sky shaders/god rays).
- **Game Modes**: Team Conquest, Team Deathmatch, Free Roam, Training Range.
- **Weapons (`shared/weapons.js`, `client/models/weaponModels.ts`)**: 100 original weapons (10 categories × 5 weapons × 2 eras: pistol, rifle, smg, mg, shotgun, sniper, grenade, launcher, mine, flamethrower) with 6 skins, first-person arms/rig, sway, ADS, scope overlay, bolt/reload animations, muzzle flash light, and tracers.
- **Vehicles & Emplacements (`shared/vehicles.js`, `client/models/vehicleModels.ts`)**: 18 drivable multi-seat vehicles across land/air/sea (WW1 tank, WW2 light/medium/heavy tanks, armored car, halftrack, jeep, troop truck with resupply aura, rocket truck, mobile AA, biplane, WW2 fighter, WW2 bomber, patrol boat, destroyer, battleship, submergible submarine, aircraft carrier) plus 4 stationary AA/MG emplacements.
- **Classes, Soldiers & Gas (`shared/classes.js`, `client/models/soldierModel.ts`)**: 5 classes (`assault`, `medic`, `support`, `scout`, `anti_armor`) with active `[4]/[X]` gadgets, 6 unlockable outfits, articulated procedural soldiers, downed/revive mechanics, and WW1 mustard gas attacks with drifting clouds, siren, and gas mask protection.
- **Audio & VFX (`client/audio/soundEngine.ts`, `client/engine/vfxPool.ts`)**: WebAudio multi-layer spatialized gunfire with convolution reverb, reloads, M1 clip ping, explosions, whizz-bys, surface impacts, vehicle engines, ship horn, gas siren, footsteps, ambient war loop, menu/battle music, pooled explosions/tracers/flames/craters/decals.
- **Multiplayer (`server/server.js`, `shared/protocol.js`)**: Express + Socket.io server on port `3000` (binds `0.0.0.0`, prints LAN IPs), 20 Hz authoritative simulation, max 40 players/room, client prediction & remote interpolation, server-side raycast/projectile hit validation, bots, capture points, chat, kill feed.

## File List
- `/index.html`, `/metadata.json`, `/package.json`, `/vite.config.ts`, `/tsconfig.json`, `/README.md`, `/PROJECT_STATE.md`
- `/src/App.tsx`, `/src/index.css`, `/src/main.tsx`
- `/shared/weapons.js`, `/shared/weapons.d.ts`
- `/shared/vehicles.js`, `/shared/vehicles.d.ts`
- `/shared/maps.js`, `/shared/maps.d.ts`
- `/shared/classes.js`, `/shared/classes.d.ts`
- `/shared/i18n.js`, `/shared/i18n.d.ts`
- `/shared/protocol.js`, `/shared/protocol.d.ts`
- `/server/server.js`
- `/client/App.tsx`, `/client/types.ts`, `/client/storage.ts`
- `/client/audio/soundEngine.ts`
- `/client/engine/assetLoader.ts`, `/client/engine/textures.ts`, `/client/engine/vfxPool.ts`, `/client/engine/mapBuilder.ts`
- `/client/models/weaponModels.ts`, `/client/models/soldierModel.ts`, `/client/models/vehicleModels.ts`
- `/client/game/gameEngine.ts`
- `/client/ui/MainMenu.tsx`, `/client/ui/GameHUD.tsx`, `/client/ui/TouchControls.tsx`
