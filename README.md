# Ashfront — WW1 & WW2 3D Mobile & Desktop Shooter

**Ashfront** is a fast-paced first-person 3D shooter inspired by classic arcade WW1/WW2 mobile & desktop combat. All 3D weapons, soldiers, vehicles, maps, textures, and WebAudio effects are generated procedurally out of the box (zero external asset downloads required), with automatic support for custom `assets/` folder overrides.

---

## Quick Start: Laptop (Windows / macOS / Linux)

1. Install **Node.js 20+** and **npm**.
2. Install dependencies and build the static client bundle:
   ```bash
   npm install
   npm run build
   ```
3. Start the authoritative multiplayer & web server:
   ```bash
   npm start
   ```
   *(Or `npm run dev` for Vite development middleware.)*
4. The terminal will print your local and LAN/WiFi URLs, for example:
   ```text
   ASHFRONT SERVER ONLINE (Max 40 players/room)
   Local:    http://localhost:3000
   LAN/WiFi: http://192.168.1.42:3000
   ```
5. Open `http://localhost:3000` on the host machine, and open `http://<LAN_IP>:3000` in Chrome on any Android phone on the same WiFi or mobile hotspot.

---

## Quick Start: Hosting on Android via Termux

You can run the Node.js game server directly on an Android phone using **Termux** so friends on your hotspot or local WiFi can join:

1. Install **Termux** (F-Droid / GitHub release recommended).
2. Update packages and install Node.js:
   ```bash
   pkg update && pkg upgrade -y
   pkg install nodejs git -y
   ```
3. Clone or copy the project folder into Termux storage, then install & build:
   ```bash
   cd ashfront
   npm install
   npm run build
   ```
4. Launch the server:
   ```bash
   node server/server.js
   ```
   *(Tip: run `termux-wake-lock` beforehand so Android does not sleep the hotspot/server.)*
5. Have players on your hotspot open Chrome and enter the `http://192.168.x.x:3000` address printed in Termux (either directly in the browser or via the in-game **Play Online → Connect** screen).

---

## Offline Single Player & Android APK Wrapping

Running `npm run build` produces a self-contained static bundle using relative paths (`base: './'`) in both:
- `dist/`
- `client/dist/` (`index.html` + `assets/`)

You can play **Single Player** and **Training Range** completely offline without any Node server, and wrap `client/dist/` as a standalone Android APK using Capacitor:

```bash
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap init "Ashfront" "com.ashfront.game" --web-dir=client/dist
npx cap add android
npx cap copy android
npx cap open android   # Build & sign APK in Android Studio (set screenOrientation="landscape" in AndroidManifest.xml)
```

Inside the APK, players can play **Single Player** & **Training Range** offline anytime, or tap **Play Online**, type any LAN host's `IP:3000` (the last 5 servers are saved automatically), and join up to 40 players per room.

---

## Optional `assets/` Override Directory

If you place custom `.glb`/`.gltf`, texture, or audio files inside an `assets/` folder in the project root, Ashfront automatically loads them instead of the procedural generators (and cleanly falls back to procedural assets for anything omitted).

### Folder Layout
```text
assets/
  models/
    <weapon_id>.glb      # e.g. ww1_rifle_g98.glb, ww2_smg_typewriter.glb
    <vehicle_id>.glb     # e.g. ww2_medium_tank.glb, ww2_fighter.glb, destroyer.glb
  textures/
    <texture_kind>.png   # Supported: mud, grass, sand, cobble, brick, concrete, wood,
                         # steel, brass, cloth, rust, water_normal,
                         # camo_winter, camo_desert, camo_mud
  audio/
    <sound_key>.mp3      # or .wav / .ogg
                         # Supported sound_keys:
                         # - Weapon IDs (e.g. ww2_rifle_garand.mp3, ww1_smg_mp18.wav)
                         # - explosion.mp3
```

---

## Controls Summary

### Mobile / Touch (Landscape Dual-Thumb)
- **Left Thumb Joystick**: Move (on foot) / Throttle & Steer (land/sea/air vehicles).
- **Right Side Swipe**: Aim / Camera Look / Turret rotation.
- **On-Screen Action Buttons**: Fire (`FIRE`), Aim/Bomb (`AIM`/`BOMB`), Reload (`RLD`), Jump/Surface (`JUMP`/`SURF`/`UP`), Crouch/Dive (`CRCH`/`DIVE`/`DOWN`), Swap/Seat (`SWAP`/`SEAT`), Explosive (`FRAG`), Gas Mask (`MASK`), Interact/Revive (`ENTER`/`EXIT`/`REVIVE`).
- **Custom HUD Editor**: Settings → Controls → *Customize Touch HUD Layout* lets you drag every control button anywhere on screen.

### Desktop (Mouse & Keyboard)
- **Click Canvas**: Lock pointer for FPS mouselook (`Esc` to pause).
- **WASD / Arrows**: Move / Drive / Pilot
- **Mouse Look / Left Click**: Aim / Fire
- **Right Click or Q**: Aim Down Sights (ADS) / Sniper Scope / Bomber Bomb Drop
- **Shift**: Sprint
- **Space / C**: Jump & Climb (Surface / Pitch Up in air & sub) / Crouch (Dive / Pitch Down)
- **R**: Reload
- **1 / 2 / 3**: Primary / Sidearm / Grenade or Mine
- **4 or X**: Active Class Gadget (Adrenaline / Medkit / Ammo+Repair / Recon Flare / AT Mine)
- **E**: Enter / Exit Vehicle or Revive Downed Teammate
- **F**: Switch Vehicle Seat
- **G**: Toggle WW1 Gas Mask
- **Tab**: Scoreboard • **Enter**: Team/All Chat
