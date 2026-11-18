import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import os from 'os';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { MAPS, getTerrainHeight } from '../shared/maps.js';
import { WEAPONS_BY_ID } from '../shared/weapons.js';
import { VEHICLES } from '../shared/vehicles.js';
import { CLASSES } from '../shared/classes.js';
import { EVENTS, MAX_PLAYERS_PER_ROOM, TICK_RATE } from '../shared/protocol.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

function getLocalIPs() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

function scanAssetsFolder() {
  const assetsDir = path.join(ROOT_DIR, 'assets');
  const result = { models: [], textures: [], audio: [] };
  if (!fs.existsSync(assetsDir)) return result;
  const sub = (dir, exts) => {
    const p = path.join(assetsDir, dir);
    if (!fs.existsSync(p)) return [];
    return fs.readdirSync(p).filter((f) => exts.some((e) => f.toLowerCase().endsWith(e)));
  };
  result.models = sub('models', ['.glb', '.gltf']);
  result.textures = sub('textures', ['.png', '.jpg', '.jpeg', '.webp']);
  result.audio = sub('audio', ['.mp3', '.wav', '.ogg']);
  return result;
}

class GameRoom {
  constructor(id, opts) {
    this.id = id;
    this.name = (opts.name || 'Ashfront Server').slice(0, 32);
    this.mapId = MAPS[opts.mapId] ? opts.mapId : 'ww1_trench';
    this.map = MAPS[this.mapId];
    this.mode = ['conquest', 'tdm', 'freeroam'].includes(opts.mode) ? opts.mode : 'conquest';
    this.era = opts.era === 'ww1' || opts.era === 'ww2' ? opts.era : this.map.era;
    this.timeOfDay = opts.timeOfDay || this.map.defaultTime;
    this.maxPlayers = Math.min(MAX_PLAYERS_PER_ROOM, Math.max(4, Number(opts.maxPlayers || 40)));
    this.botCount = Math.min(20, Math.max(0, Number(opts.botCount ?? 8)));
    this.hostSocketId = opts.hostSocketId || null;

    this.players = new Map(); // id -> playerState
    this.bots = new Map(); // id -> botState
    this.vehicles = new Map(); // id -> vehicleState
    this.projectiles = []; // explosive/rocket/grenade/mine/gas projectiles
    this.capturePoints = this.map.capturePoints.map((cp) => ({
      id: cp.id,
      name: cp.name,
      x: cp.x,
      z: cp.z,
      owner: cp.initialOwner,
      progress: cp.initialOwner === 1 ? 100 : cp.initialOwner === 2 ? -100 : 0,
    }));

    this.tickets = { 1: 300, 2: 300 };
    this.roundTime = 900;
    this.winner = 0;
    this.gasTimer = 45;
    this.gasActive = false;
    this.gasClouds = [];
    this.lastTick = Date.now();

    this.initVehicles();
    this.syncBots();
  }

  initVehicles() {
    this.map.vehicleSpawns.forEach((vs, idx) => {
      const def = VEHICLES[vs.type];
      if (!def) return;
      const vid = `veh_${idx}_${vs.type}`;
      const y = def.domain === 'air' ? getTerrainHeight(this.mapId, vs.x, vs.z) + 1.5
        : def.domain === 'sea' ? this.map.waterLevel
          : getTerrainHeight(this.mapId, vs.x, vs.z);
      this.vehicles.set(vid, {
        id: vid,
        type: vs.type,
        team: vs.team,
        x: vs.x,
        y,
        z: vs.z,
        vx: 0,
        vy: 0,
        vz: 0,
        rotY: vs.rotY || 0,
        pitch: 0,
        roll: 0,
        turretYaw: vs.rotY || 0,
        hp: def.maxHp,
        maxHp: def.maxHp,
        alive: true,
        respawnTimer: 0,
        submergeDepth: 0,
        seats: def.seats.map(() => null),
        spawn: { x: vs.x, y, z: vs.z, rotY: vs.rotY || 0 },
        lastFire: [0, 0, 0, 0],
      });
    });
  }

  pickTeam() {
    let t1 = 0;
    let t2 = 0;
    for (const p of this.players.values()) {
      if (p.team === 1) t1++;
      else t2++;
    }
    return t1 <= t2 ? 1 : 2;
  }

  getSpawnPoint(team) {
    const list = this.map.spawns[team] || this.map.spawns[1];
    const pick = list[Math.floor(Math.random() * list.length)];
    const x = pick[0] + (Math.random() - 0.5) * 6;
    const z = pick[1] + (Math.random() - 0.5) * 6;
    const y = Math.max(this.map.waterLevel + 0.5, getTerrainHeight(this.mapId, x, z));
    return { x, y, z };
  }

  addPlayer(socket, info) {
    const team = info.team === 1 || info.team === 2 ? info.team : this.pickTeam();
    const spawn = this.getSpawnPoint(team);
    const cls = CLASSES[info.classId] ? info.classId : 'assault';
    const classDef = CLASSES[cls];
    const primaryId = WEAPONS_BY_ID[info.primaryId] ? info.primaryId : classDef.defaultPrimary[this.era];
    const secondaryId = WEAPONS_BY_ID[info.secondaryId] ? info.secondaryId : classDef.defaultSecondary[this.era];
    const explosiveId = WEAPONS_BY_ID[info.explosiveId] ? info.explosiveId : classDef.defaultExplosive[this.era];

    const player = {
      id: socket.id,
      name: (info.name || `Soldier_${socket.id.slice(0, 4)}`).slice(0, 18),
      isBot: false,
      team,
      classId: cls,
      outfitId: info.outfitId || 'standard',
      skinId: info.skinId || 'standard',
      primaryId,
      secondaryId,
      explosiveId,
      activeWeaponId: primaryId,
      x: spawn.x,
      y: spawn.y,
      z: spawn.z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: team === 1 ? -Math.PI / 2 : Math.PI / 2,
      pitch: 0,
      crouch: false,
      gasMask: false,
      hp: classDef.maxHp,
      maxHp: classDef.maxHp,
      alive: true,
      downed: false,
      downedTimer: 0,
      respawnTimer: 0,
      vehicleId: null,
      seatIdx: -1,
      kills: 0,
      deaths: 0,
      score: 0,
      lastShotAt: 0,
      lastSeq: 0,
    };
    this.players.set(socket.id, player);
    this.syncBots();
    return player;
  }

  removePlayer(socketId) {
    const p = this.players.get(socketId);
    if (p && p.vehicleId) {
      this.exitVehicle(p);
    }
    this.players.delete(socketId);
    if (this.hostSocketId === socketId) {
      const next = this.players.keys().next();
      this.hostSocketId = next.done ? null : next.value;
    }
    this.syncBots();
  }

  syncBots() {
    const humanCount = this.players.size;
    const targetBots = Math.max(0, Math.min(this.botCount, this.maxPlayers - humanCount));
    while (this.bots.size > targetBots) {
      const firstKey = this.bots.keys().next().value;
      const bot = this.bots.get(firstKey);
      if (bot && bot.vehicleId) this.exitVehicle(bot);
      this.bots.delete(firstKey);
    }
    let idx = 1;
    while (this.bots.size < targetBots) {
      const id = `bot_${idx++}_${Math.random().toString(36).slice(2, 6)}`;
      let t1 = 0;
      let t2 = 0;
      for (const p of [...this.players.values(), ...this.bots.values()]) {
        if (p.team === 1) t1++;
        else t2++;
      }
      const team = t1 <= t2 ? 1 : 2;
      const spawn = this.getSpawnPoint(team);
      const classKeys = Object.keys(CLASSES);
      const cls = classKeys[Math.floor(Math.random() * classKeys.length)];
      const cDef = CLASSES[cls];
      const primaryId = cDef.defaultPrimary[this.era];
      this.bots.set(id, {
        id,
        name: `[BOT] ${team === 1 ? 'Sgt.' : 'Kpl.'} ${['Miller', 'Vance', 'Keller', 'Rossi', 'Kovacs', 'Laurent', 'Weber', 'Hayes'][Math.floor(Math.random() * 8)]}`,
        isBot: true,
        team,
        classId: cls,
        outfitId: 'standard',
        skinId: 'standard',
        primaryId,
        secondaryId: cDef.defaultSecondary[this.era],
        explosiveId: cDef.defaultExplosive[this.era],
        activeWeaponId: primaryId,
        x: spawn.x,
        y: spawn.y,
        z: spawn.z,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: team === 1 ? -Math.PI / 2 : Math.PI / 2,
        pitch: 0,
        crouch: false,
        gasMask: false,
        hp: cDef.maxHp,
        maxHp: cDef.maxHp,
        alive: true,
        downed: false,
        downedTimer: 0,
        respawnTimer: 0,
        vehicleId: null,
        seatIdx: -1,
        kills: 0,
        deaths: 0,
        score: 0,
        lastShotAt: 0,
        aiTimer: 0,
        targetCp: Math.floor(Math.random() * this.capturePoints.length),
      });
    }
  }

  getAllActors() {
    return [...this.players.values(), ...this.bots.values()];
  }

  getActor(id) {
    return this.players.get(id) || this.bots.get(id) || null;
  }

  enterVehicle(actor, vehicleId) {
    if (!actor || !actor.alive || actor.downed || actor.vehicleId) return false;
    const v = this.vehicles.get(vehicleId);
    if (!v || !v.alive) return false;
    if (Math.hypot(actor.x - v.x, actor.z - v.z) > 12) return false;
    const seatIdx = v.seats.findIndex((s) => s === null);
    if (seatIdx === -1) return false;
    v.seats[seatIdx] = actor.id;
    actor.vehicleId = v.id;
    actor.seatIdx = seatIdx;
    return true;
  }

  exitVehicle(actor) {
    if (!actor || !actor.vehicleId) return;
    const v = this.vehicles.get(actor.vehicleId);
    if (v && actor.seatIdx >= 0 && actor.seatIdx < v.seats.length) {
      if (v.seats[actor.seatIdx] === actor.id) v.seats[actor.seatIdx] = null;
    }
    if (v) {
      const def = VEHICLES[v.type];
      actor.x = v.x + Math.cos(v.rotY) * (def.radius + 1.4);
      actor.z = v.z - Math.sin(v.rotY) * (def.radius + 1.4);
      actor.y = Math.max(this.map.waterLevel + 0.5, getTerrainHeight(this.mapId, actor.x, actor.z));
    }
    actor.vehicleId = null;
    actor.seatIdx = -1;
  }

  damageActor(io, target, amount, attacker, weaponId, isHeadshot = false) {
    if (!target || !target.alive) return;
    if (this.mode !== 'freeroam' && attacker && attacker.team === target.team && attacker.id !== target.id) return;
    target.hp -= amount;
    if (target.hp <= 0) {
      if (!target.downed && amount < 180) {
        // Enter downed state briefly so Medics can revive!
        target.downed = true;
        target.hp = 25;
        target.downedTimer = 9.0;
        if (target.vehicleId) this.exitVehicle(target);
        return;
      }
      this.killActor(io, target, attacker, weaponId, isHeadshot);
    }
  }

  killActor(io, target, attacker, weaponId, isHeadshot) {
    if (!target.alive) return;
    target.alive = false;
    target.downed = false;
    target.hp = 0;
    target.deaths++;
    target.respawnTimer = 4.0;
    if (target.vehicleId) this.exitVehicle(target);

    if (attacker && attacker.id !== target.id) {
      attacker.kills++;
      attacker.score += isHeadshot ? 150 : 100;
      if (this.mode === 'tdm') {
        this.tickets[attacker.team] = Math.max(0, this.tickets[attacker.team]);
      }
    }
    if (this.mode !== 'freeroam') {
      this.tickets[target.team] = Math.max(0, this.tickets[target.team] - 1);
    }

    const wName = WEAPONS_BY_ID[weaponId]?.name || weaponId || 'Combat';
    io.to(this.id).emit(EVENTS.KILL_FEED, {
      killerId: attacker?.id || null,
      killerName: attacker?.name || 'Battlefield',
      killerTeam: attacker?.team || 0,
      victimId: target.id,
      victimName: target.name,
      victimTeam: target.team,
      weapon: wName,
      headshot: isHeadshot,
    });
  }

  damageVehicle(io, v, amount, attacker, weaponId) {
    if (!v || !v.alive) return;
    v.hp -= amount;
    if (v.hp <= 0) {
      v.hp = 0;
      v.alive = false;
      const def = VEHICLES[v.type];
      v.respawnTimer = def.respawnTime;
      for (let i = 0; i < v.seats.length; i++) {
        const occId = v.seats[i];
        if (occId) {
          const occ = this.getActor(occId);
          v.seats[i] = null;
          if (occ) {
            occ.vehicleId = null;
            occ.seatIdx = -1;
            this.killActor(io, occ, attacker, weaponId, false);
          }
        }
      }
      if (attacker) attacker.score += 250;
      io.to(this.id).emit(EVENTS.KILL_FEED, {
        killerId: attacker?.id || null,
        killerName: attacker?.name || 'Explosion',
        killerTeam: attacker?.team || 0,
        victimId: v.id,
        victimName: def.name,
        victimTeam: v.team,
        weapon: WEAPONS_BY_ID[weaponId]?.name || weaponId || 'Ordnance',
        headshot: false,
        isVehicle: true,
      });
    }
  }

  handleShoot(io, actor, payload) {
    if (!actor || !actor.alive || actor.downed || actor.vehicleId) return;
    const weapon = WEAPONS_BY_ID[payload.weaponId] || WEAPONS_BY_ID[actor.activeWeaponId];
    if (!weapon) return;
    const now = Date.now();
    const minInterval = (60 / weapon.fireRate) * 850; // slight jitter tolerance
    if (now - actor.lastShotAt < minInterval) return;
    actor.lastShotAt = now;

    const origin = {
      x: Number(payload.ox ?? actor.x),
      y: Number(payload.oy ?? (actor.y + 1.55)),
      z: Number(payload.oz ?? actor.z),
    };
    const dirLen = Math.hypot(payload.dx || 0, payload.dy || 0, payload.dz || -1) || 1;
    const dir = {
      x: (payload.dx || 0) / dirLen,
      y: (payload.dy || 0) / dirLen,
      z: (payload.dz || -1) / dirLen,
    };

    if (weapon.isGrenade || weapon.isLauncher || weapon.isMine) {
      this.projectiles.push({
        id: `prj_${now}_${Math.random().toString(36).slice(2, 6)}`,
        ownerId: actor.id,
        team: actor.team,
        weaponId: weapon.id,
        x: origin.x + dir.x * 0.8,
        y: origin.y + dir.y * 0.8,
        z: origin.z + dir.z * 0.8,
        vx: dir.x * weapon.projectileSpeed,
        vy: dir.y * weapon.projectileSpeed + (weapon.isGrenade ? 5.5 : 0),
        vz: dir.z * weapon.projectileSpeed,
        gravity: weapon.isGrenade ? 15 : weapon.isMine ? 18 : 2.5,
        damage: weapon.damage,
        splash: weapon.splashRadius || 5,
        isGas: weapon.isGas,
        isMine: weapon.isMine,
        ttl: weapon.isMine ? 60 : weapon.isGrenade ? 2.4 : 4.5,
      });
      return;
    }

    // Raycast hit validation against actors & vehicles
    const maxRange = weapon.range || 150;
    const pellets = weapon.pellets || 1;
    let confirmedHit = false;
    let confirmedHeadshot = false;

    for (let p = 0; p < pellets; p++) {
      let bestDist = maxRange;
      let hitTarget = null;
      let hitVehicle = null;
      let hitHead = false;

      // Check players/bots
      for (const other of this.getAllActors()) {
        if (other.id === actor.id || !other.alive || other.vehicleId) continue;
        if (this.mode !== 'freeroam' && other.team === actor.team) continue;

        const tx = other.x - origin.x;
        const ty = other.y + 0.9 - origin.y;
        const tz = other.z - origin.z;
        const proj = tx * dir.x + ty * dir.y + tz * dir.z;
        if (proj < 0 || proj > bestDist) continue;
        const cx = origin.x + dir.x * proj;
        const cy = origin.y + dir.y * proj;
        const cz = origin.z + dir.z * proj;
        const radial = Math.hypot(cx - other.x, cz - other.z);
        const heightOffset = cy - other.y;
        const maxH = other.crouch ? 1.35 : 1.85;
        const hitRadius = 0.65 + (pellets > 1 ? 0.25 : 0);
        if (radial < hitRadius && heightOffset >= -0.2 && heightOffset <= maxH) {
          bestDist = proj;
          hitTarget = other;
          hitVehicle = null;
          hitHead = heightOffset > maxH - 0.38;
        }
      }

      // Check vehicles
      for (const v of this.vehicles.values()) {
        if (!v.alive) continue;
        const def = VEHICLES[v.type];
        const tx = v.x - origin.x;
        const ty = v.y + def.height * 0.5 - origin.y;
        const tz = v.z - origin.z;
        const proj = tx * dir.x + ty * dir.y + tz * dir.z;
        if (proj < 0 || proj > bestDist) continue;
        const cx = origin.x + dir.x * proj;
        const cy = origin.y + dir.y * proj;
        const cz = origin.z + dir.z * proj;
        if (Math.hypot(cx - v.x, cz - v.z) < def.radius && Math.abs(cy - (v.y + def.height * 0.5)) < def.height * 0.8) {
          bestDist = proj;
          hitVehicle = v;
          hitTarget = null;
        }
      }

      // Terrain occlusion check (coarse march)
      let terrainBlocked = false;
      const step = 4;
      for (let d = 2; d < bestDist; d += step) {
        const sx = origin.x + dir.x * d;
        const sy = origin.y + dir.y * d;
        const sz = origin.z + dir.z * d;
        if (sy < getTerrainHeight(this.mapId, sx, sz) - 0.2) {
          terrainBlocked = true;
          break;
        }
      }
      if (terrainBlocked) continue;

      if (hitTarget) {
        const dmg = weapon.damage * (hitHead ? weapon.headshotMult : 1) * (weapon.isFlame ? 0.7 : 1);
        this.damageActor(io, hitTarget, dmg, actor, weapon.id, hitHead);
        confirmedHit = true;
        if (hitHead) confirmedHeadshot = true;
      } else if (hitVehicle) {
        const armorMult = weapon.isLauncher ? 1.5 : 0.22;
        this.damageVehicle(io, hitVehicle, weapon.damage * armorMult, actor, weapon.id);
        confirmedHit = true;
      }
    }

    if (confirmedHit && !actor.isBot) {
      io.to(actor.id).emit(EVENTS.HIT_CONFIRM, { headshot: confirmedHeadshot });
    }
  }

  explode(io, x, y, z, damage, splash, owner, weaponId, isGas = false) {
    if (isGas) {
      this.gasClouds.push({ x, y, z, radius: splash, ttl: 16 });
      return;
    }
    for (const actor of this.getAllActors()) {
      if (!actor.alive || actor.vehicleId) continue;
      const dist = Math.hypot(actor.x - x, actor.y + 0.8 - y, actor.z - z);
      if (dist < splash) {
        const falloff = 1 - dist / splash;
        this.damageActor(io, actor, damage * falloff, owner, weaponId, false);
      }
    }
    for (const v of this.vehicles.values()) {
      if (!v.alive) continue;
      const def = VEHICLES[v.type];
      const dist = Math.hypot(v.x - x, v.z - z) - def.radius * 0.5;
      if (dist < splash) {
        const falloff = Math.max(0.25, 1 - Math.max(0, dist) / splash);
        this.damageVehicle(io, v, damage * falloff, owner, weaponId);
      }
    }
  }

  tick(io) {
    const now = Date.now();
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    if (this.winner !== 0) {
      this.roundTime -= dt;
      if (this.roundTime <= 0) {
        // Restart round
        this.tickets = { 1: 300, 2: 300 };
        this.winner = 0;
        this.roundTime = 900;
      }
      return;
    }

    this.roundTime = Math.max(0, this.roundTime - dt);

    // WW1 Gas Attack cycle
    if (this.map.hasGasAttack) {
      this.gasTimer -= dt;
      if (this.gasTimer <= 0) {
        this.gasActive = !this.gasActive;
        this.gasTimer = this.gasActive ? 24 : 55;
        if (this.gasActive) {
          this.gasClouds = [
            { x: -18, y: getTerrainHeight(this.mapId, -18, 0), z: -12, radius: 22, ttl: 24 },
            { x: 18, y: getTerrainHeight(this.mapId, 18, 0), z: 14, radius: 22, ttl: 24 },
          ];
          io.to(this.id).emit(EVENTS.GAS_EVENT, { active: true });
        } else {
          io.to(this.id).emit(EVENTS.GAS_EVENT, { active: false });
        }
      }
    }

    // Update gas clouds & damage unprotected actors
    for (let i = this.gasClouds.length - 1; i >= 0; i--) {
      const g = this.gasClouds[i];
      g.ttl -= dt;
      g.x += Math.sin(now * 0.0005 + i) * 1.2 * dt;
      for (const a of this.getAllActors()) {
        if (!a.alive || a.downed || a.gasMask || a.vehicleId) continue;
        if (Math.hypot(a.x - g.x, a.z - g.z) < g.radius) {
          this.damageActor(io, a, 14 * dt, null, 'Mustard Gas', false);
        }
      }
      if (g.ttl <= 0) this.gasClouds.splice(i, 1);
    }

    // Update actors (respawn, bleedout, bots AI)
    const allActors = this.getAllActors();
    for (const a of allActors) {
      if (!a.alive) {
        a.respawnTimer -= dt;
        if (a.respawnTimer <= 0) {
          const sp = this.getSpawnPoint(a.team);
          a.x = sp.x;
          a.y = sp.y;
          a.z = sp.z;
          a.hp = a.maxHp;
          a.alive = true;
          a.downed = false;
        }
        continue;
      }
      if (a.downed) {
        a.downedTimer -= dt;
        if (a.downedTimer <= 0) {
          this.killActor(io, a, null, 'Bleedout', false);
        }
        continue;
      }

      if (a.isBot) {
        this.updateBot(io, a, dt, allActors);
      }
    }

    // Update vehicles (respawns + coasting)
    for (const v of this.vehicles.values()) {
      if (!v.alive) {
        v.respawnTimer -= dt;
        if (v.respawnTimer <= 0) {
          v.alive = true;
          v.hp = v.maxHp;
          v.x = v.spawn.x;
          v.y = v.spawn.y;
          v.z = v.spawn.z;
          v.rotY = v.spawn.rotY;
          v.vx = 0;
          v.vy = 0;
          v.vz = 0;
        }
      }
    }

    // Update projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const prj = this.projectiles[i];
      prj.ttl -= dt;
      prj.vy -= prj.gravity * dt;
      prj.x += prj.vx * dt;
      prj.y += prj.vy * dt;
      prj.z += prj.vz * dt;
      const ground = getTerrainHeight(this.mapId, prj.x, prj.z);
      const owner = this.getActor(prj.ownerId);

      if (prj.isMine) {
        if (prj.y <= ground + 0.15) {
          prj.y = ground + 0.1;
          prj.vx = 0;
          prj.vy = 0;
          prj.vz = 0;
          prj.gravity = 0;
        }
        // Trigger proximity
        let triggered = false;
        for (const other of allActors) {
          if (!other.alive || other.team === prj.team) continue;
          if (Math.hypot(other.x - prj.x, other.z - prj.z) < 2.2) {
            triggered = true;
            break;
          }
        }
        if (!triggered) {
          for (const v of this.vehicles.values()) {
            if (!v.alive || v.team === prj.team) continue;
            if (Math.hypot(v.x - prj.x, v.z - prj.z) < VEHICLES[v.type].radius + 0.8) {
              triggered = true;
              break;
            }
          }
        }
        if (triggered || prj.ttl <= 0) {
          if (triggered) this.explode(io, prj.x, prj.y, prj.z, prj.damage, prj.splash, owner, prj.weaponId, prj.isGas);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (prj.y <= ground || prj.ttl <= 0) {
        this.explode(io, prj.x, Math.max(prj.y, ground), prj.z, prj.damage, prj.splash, owner, prj.weaponId, prj.isGas);
        this.projectiles.splice(i, 1);
      }
    }

    // Conquest capture points
    if (this.mode === 'conquest') {
      let t1Flags = 0;
      let t2Flags = 0;
      for (const cp of this.capturePoints) {
        let balance = 0;
        for (const a of allActors) {
          if (!a.alive || a.downed) continue;
          if (Math.hypot(a.x - cp.x, a.z - cp.z) < 14) {
            balance += a.team === 1 ? 1 : -1;
          }
        }
        if (balance !== 0) {
          cp.progress = Math.max(-100, Math.min(100, cp.progress + Math.sign(balance) * Math.min(3, Math.abs(balance)) * 12 * dt));
          if (cp.progress >= 70) cp.owner = 1;
          else if (cp.progress <= -70) cp.owner = 2;
          else if (Math.abs(cp.progress) < 15) cp.owner = 0;
        }
        if (cp.owner === 1) t1Flags++;
        if (cp.owner === 2) t2Flags++;
      }
      if (t1Flags > t2Flags) this.tickets[2] = Math.max(0, this.tickets[2] - (t1Flags - t2Flags) * 0.45 * dt);
      if (t2Flags > t1Flags) this.tickets[1] = Math.max(0, this.tickets[1] - (t2Flags - t1Flags) * 0.45 * dt);
    }

    if (this.mode !== 'freeroam') {
      if (this.tickets[1] <= 0) { this.winner = 2; this.roundTime = 12; }
      else if (this.tickets[2] <= 0) { this.winner = 1; this.roundTime = 12; }
      else if (this.roundTime <= 0) {
        this.winner = this.tickets[1] >= this.tickets[2] ? 1 : 2;
        this.roundTime = 12;
      }
    }
  }

  updateBot(io, bot, dt, allActors) {
    bot.gasMask = this.gasActive;
    // Find nearest visible enemy
    let nearestEnemy = null;
    let nearestDist = 90;
    for (const other of allActors) {
      if (!other.alive || other.downed || other.team === bot.team || other.vehicleId) continue;
      const d = Math.hypot(other.x - bot.x, other.z - bot.z);
      if (d < nearestDist) {
        nearestDist = d;
        nearestEnemy = other;
      }
    }

    if (nearestEnemy) {
      const dx = nearestEnemy.x - bot.x;
      const dz = nearestEnemy.z - bot.z;
      bot.yaw = Math.atan2(-dx, -dz);
      if (nearestDist > 18) {
        const spd = 4.6;
        bot.x += (dx / nearestDist) * spd * dt;
        bot.z += (dz / nearestDist) * spd * dt;
      }
      // Shoot with slight accuracy spread
      const now = Date.now();
      if (now - bot.lastShotAt > 550 + Math.random() * 500) {
        const dy = nearestEnemy.y + 1.2 - (bot.y + 1.5);
        const len = Math.hypot(dx, dy, dz) || 1;
        this.handleShoot(io, bot, {
          weaponId: bot.activeWeaponId,
          ox: bot.x,
          oy: bot.y + 1.5,
          oz: bot.z,
          dx: dx / len + (Math.random() - 0.5) * 0.08,
          dy: dy / len + (Math.random() - 0.5) * 0.05,
          dz: dz / len + (Math.random() - 0.5) * 0.08,
        });
      }
    } else if (this.capturePoints.length > 0) {
      const cp = this.capturePoints[bot.targetCp % this.capturePoints.length];
      const dx = cp.x - bot.x;
      const dz = cp.z - bot.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 6) {
        bot.yaw = Math.atan2(-dx, -dz);
        const spd = 5.0;
        bot.x += (dx / dist) * spd * dt;
        bot.z += (dz / dist) * spd * dt;
      } else {
        bot.targetCp = (bot.targetCp + 1) % this.capturePoints.length;
      }
    }
    const half = this.map.size * 0.45;
    bot.x = Math.max(-half, Math.min(half, bot.x));
    bot.z = Math.max(-half, Math.min(half, bot.z));
    bot.y = Math.max(this.map.waterLevel + 0.2, getTerrainHeight(this.mapId, bot.x, bot.z));
  }

  serialize() {
    return {
      id: this.id,
      name: this.name,
      mapId: this.mapId,
      mode: this.mode,
      era: this.era,
      timeOfDay: this.timeOfDay,
      tickets: { 1: Math.round(this.tickets[1]), 2: Math.round(this.tickets[2]) },
      roundTime: Math.round(this.roundTime),
      winner: this.winner,
      gasActive: this.gasActive,
      gasClouds: this.gasClouds.map((g) => ({ x: g.x, y: g.y, z: g.z, radius: g.radius })),
      capturePoints: this.capturePoints,
      actors: this.getAllActors().map((a) => ({
        id: a.id,
        name: a.name,
        isBot: a.isBot,
        team: a.team,
        classId: a.classId,
        outfitId: a.outfitId,
        activeWeaponId: a.activeWeaponId,
        x: a.x,
        y: a.y,
        z: a.z,
        yaw: a.yaw,
        pitch: a.pitch,
        crouch: a.crouch,
        gasMask: a.gasMask,
        hp: Math.round(a.hp),
        maxHp: a.maxHp,
        alive: a.alive,
        downed: a.downed,
        vehicleId: a.vehicleId,
        seatIdx: a.seatIdx,
        kills: a.kills,
        deaths: a.deaths,
        score: a.score,
        lastSeq: a.lastSeq || 0,
      })),
      vehicles: [...this.vehicles.values()].map((v) => ({
        id: v.id,
        type: v.type,
        team: v.team,
        x: v.x,
        y: v.y,
        z: v.z,
        rotY: v.rotY,
        pitch: v.pitch,
        roll: v.roll,
        turretYaw: v.turretYaw,
        hp: Math.round(v.hp),
        maxHp: v.maxHp,
        alive: v.alive,
        submergeDepth: v.submergeDepth,
        seats: v.seats,
      })),
      projectiles: this.projectiles.map((p) => ({
        id: p.id,
        weaponId: p.weaponId,
        x: p.x,
        y: p.y,
        z: p.z,
      })),
    };
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  const server = http.createServer(app);
  const io = new SocketIOServer(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  const rooms = new Map();
  // Create default public room
  const defaultRoom = new GameRoom('room_main', {
    name: 'Ashfront Official #1 (Somme Trench)',
    mapId: 'ww1_trench',
    mode: 'conquest',
    era: 'ww1',
    botCount: 10,
  });
  rooms.set(defaultRoom.id, defaultRoom);

  app.get('/api/server-info', (_req, res) => {
    res.json({
      name: 'Ashfront LAN Server',
      port: PORT,
      ips: getLocalIPs(),
      rooms: rooms.size,
      maxPlayersPerRoom: MAX_PLAYERS_PER_ROOM,
    });
  });

  app.get('/api/assets-manifest', (_req, res) => {
    res.json(scanAssetsFolder());
  });

  const assetsDiskDir = path.join(ROOT_DIR, 'assets');
  if (fs.existsSync(assetsDiskDir)) {
    app.use('/assets', express.static(assetsDiskDir));
  }

  // Dev Vite middleware OR static production serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd && fs.existsSync(path.join(ROOT_DIR, 'vite.config.ts'))) {
    const vite = await import('vite');
    const viteServer = await vite.createServer({
      root: ROOT_DIR,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(viteServer.middlewares);
  } else {
    const distDir = fs.existsSync(path.join(ROOT_DIR, 'dist'))
      ? path.join(ROOT_DIR, 'dist')
      : path.join(ROOT_DIR, 'client');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  function getRoomsSummary() {
    return [...rooms.values()].map((r) => ({
      id: r.id,
      name: r.name,
      mapId: r.mapId,
      mode: r.mode,
      era: r.era,
      players: r.players.size,
      bots: r.bots.size,
      maxPlayers: r.maxPlayers,
    }));
  }

  io.on('connection', (socket) => {
    let currentRoomId = null;

    socket.on(EVENTS.ROOMS_LIST, () => {
      socket.emit(EVENTS.ROOMS_LIST, getRoomsSummary());
    });

    socket.on(EVENTS.ROOM_CREATE, (opts = {}) => {
      const id = `room_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const room = new GameRoom(id, { ...opts, hostSocketId: socket.id });
      rooms.set(id, room);
      io.emit(EVENTS.ROOMS_LIST, getRoomsSummary());
      socket.emit(EVENTS.ROOM_CREATE, { roomId: id });
    });

    socket.on(EVENTS.ROOM_JOIN, (payload = {}) => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const old = rooms.get(currentRoomId);
        old.removePlayer(socket.id);
        socket.leave(currentRoomId);
      }
      const room = rooms.get(payload.roomId) || rooms.get('room_main') || [...rooms.values()][0];
      if (!room) {
        socket.emit(EVENTS.ROOM_ERROR, { message: 'Room not found' });
        return;
      }
      if (room.players.size >= room.maxPlayers) {
        socket.emit(EVENTS.ROOM_ERROR, { message: 'Room is full (40/40)' });
        return;
      }
      currentRoomId = room.id;
      socket.join(room.id);
      const player = room.addPlayer(socket, payload);
      socket.emit(EVENTS.ROOM_JOINED, {
        roomId: room.id,
        playerId: socket.id,
        team: player.team,
        state: room.serialize(),
      });
      io.emit(EVENTS.ROOMS_LIST, getRoomsSummary());
    });

    socket.on(EVENTS.ROOM_LEAVE, () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        rooms.get(currentRoomId).removePlayer(socket.id);
        socket.leave(currentRoomId);
        currentRoomId = null;
        io.emit(EVENTS.ROOMS_LIST, getRoomsSummary());
      }
    });

    socket.on(EVENTS.PLAYER_INPUT, (data) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (!p || !p.alive || p.downed || p.vehicleId) return;
      // Sanity speed validation against client prediction
      const dx = Number(data.x ?? p.x) - p.x;
      const dz = Number(data.z ?? p.z) - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 14) {
        const half = room.map.size * 0.48;
        p.x = Math.max(-half, Math.min(half, Number(data.x ?? p.x)));
        p.z = Math.max(-half, Math.min(half, Number(data.z ?? p.z)));
        const minTerrain = getTerrainHeight(room.mapId, p.x, p.z);
        p.y = Math.max(minTerrain - 0.5, Number(data.y ?? minTerrain));
      }
      p.yaw = Number(data.yaw ?? p.yaw);
      p.pitch = Number(data.pitch ?? p.pitch);
      p.crouch = Boolean(data.crouch);
      p.gasMask = Boolean(data.gasMask);
      if (data.activeWeaponId && WEAPONS_BY_ID[data.activeWeaponId]) {
        p.activeWeaponId = data.activeWeaponId;
      }
      p.lastSeq = Number(data.seq || 0);
    });

    socket.on(EVENTS.PLAYER_SHOOT, (payload) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (p) room.handleShoot(io, p, payload || {});
    });

    socket.on(EVENTS.PLAYER_REVIVE, (targetId) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const medic = room?.players.get(socket.id);
      const target = room?.getActor(targetId);
      if (!medic || !target || !target.downed || medic.team !== target.team) return;
      if (Math.hypot(medic.x - target.x, medic.z - target.z) < 5) {
        target.downed = false;
        target.hp = Math.round(target.maxHp * 0.65);
        medic.score += 100;
      }
    });

    socket.on(EVENTS.PLAYER_GADGET, () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (!p || !p.alive || p.downed) return;
      if (p.classId === 'medic' || p.classId === 'assault') {
        p.hp = Math.min(p.maxHp, p.hp + 35);
      }
      if (p.classId === 'medic') {
        for (const ally of room.getAllActors()) {
          if (ally.alive && ally.team === p.team && Math.hypot(ally.x - p.x, ally.z - p.z) < 8) {
            ally.hp = Math.min(ally.maxHp, ally.hp + 30);
          }
        }
      } else if (p.classId === 'support') {
        for (const v of room.vehicles.values()) {
          if (v.alive && v.team === p.team && Math.hypot(v.x - p.x, v.z - p.z) < 10) {
            v.hp = Math.min(v.maxHp, v.hp + 120);
          }
        }
      }
    });

    socket.on(EVENTS.VEHICLE_ENTER, (vehicleId) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (p) room.enterVehicle(p, vehicleId);
    });

    socket.on(EVENTS.VEHICLE_EXIT, () => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (p) room.exitVehicle(p);
    });

    socket.on(EVENTS.VEHICLE_INPUT, (data) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (!p || !p.vehicleId) return;
      const v = room.vehicles.get(p.vehicleId);
      if (!v || !v.alive) return;
      if (p.seatIdx === 0) {
        v.x = Number(data.x ?? v.x);
        v.y = Number(data.y ?? v.y);
        v.z = Number(data.z ?? v.z);
        v.rotY = Number(data.rotY ?? v.rotY);
        v.pitch = Number(data.pitch ?? v.pitch);
        v.roll = Number(data.roll ?? v.roll);
        v.submergeDepth = Number(data.submergeDepth ?? v.submergeDepth);
      }
      v.turretYaw = Number(data.turretYaw ?? v.turretYaw);
    });

    socket.on(EVENTS.VEHICLE_FIRE, (payload = {}) => {
      if (!currentRoomId) return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (!p || !p.vehicleId) return;
      const v = room.vehicles.get(p.vehicleId);
      if (!v || !v.alive) return;
      const def = VEHICLES[v.type];
      const seat = def.seats[p.seatIdx];
      const w = payload.secondary && seat?.secondary ? seat.secondary : seat?.weapon;
      if (!w) return;
      if (w.isExplosive) {
        room.projectiles.push({
          id: `vprj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ownerId: p.id,
          team: p.team,
          weaponId: w.name,
          x: Number(payload.ox ?? v.x),
          y: Number(payload.oy ?? (v.y + 2)),
          z: Number(payload.oz ?? v.z),
          vx: Number(payload.dx ?? 0) * w.speed,
          vy: Number(payload.dy ?? 0) * w.speed,
          vz: Number(payload.dz ?? -1) * w.speed,
          gravity: w.isBomb ? 18 : w.isTorpedo ? 0 : 4.5,
          damage: w.damage,
          splash: w.splash || 6,
          isGas: false,
          isMine: false,
          ttl: 5.0,
        });
      } else {
        room.handleShoot(io, { ...p, vehicleId: null }, {
          weaponId: 'ww2_mg_1919',
          ox: payload.ox ?? v.x,
          oy: payload.oy ?? v.y + 2,
          oz: payload.oz ?? v.z,
          dx: payload.dx,
          dy: payload.dy,
          dz: payload.dz,
        });
      }
    });

    socket.on(EVENTS.CHAT_MSG, (text) => {
      if (!currentRoomId || typeof text !== 'string') return;
      const room = rooms.get(currentRoomId);
      const p = room?.players.get(socket.id);
      if (!p) return;
      io.to(currentRoomId).emit(EVENTS.CHAT_MSG, {
        sender: p.name,
        team: p.team,
        text: text.trim().slice(0, 140),
        ts: Date.now(),
      });
    });

    socket.on(EVENTS.PING_REQ, (ts) => {
      socket.emit(EVENTS.PING_RES, ts);
    });

    socket.on('disconnect', () => {
      if (currentRoomId && rooms.has(currentRoomId)) {
        const room = rooms.get(currentRoomId);
        room.removePlayer(socket.id);
        if (room.id !== 'room_main' && room.players.size === 0) {
          rooms.delete(room.id);
        }
        io.emit(EVENTS.ROOMS_LIST, getRoomsSummary());
      }
    });
  });

  // Authoritative simulation tick (20 Hz)
  setInterval(() => {
    for (const room of rooms.values()) {
      if (room.players.size === 0) continue;
      room.tick(io);
      io.to(room.id).emit(EVENTS.WORLD_STATE, room.serialize());
    }
  }, 1000 / TICK_RATE);

  server.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIPs();
    console.log('\n==================================================');
    console.log('  ASHFRONT SERVER ONLINE (Max 40 players/room)');
    console.log(`  Local:   http://localhost:${PORT}`);
    ips.forEach((ip) => console.log(`  LAN/WiFi: http://${ip}:${PORT}`));
    console.log('==================================================\n');
  });
}

startServer().catch((err) => {
  console.error('Failed to start Ashfront server:', err);
  process.exit(1);
});
