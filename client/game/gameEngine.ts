import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { io, type Socket } from 'socket.io-client';

import { MAPS, getTerrainHeight } from '../../shared/maps';
import { WEAPONS_BY_ID } from '../../shared/weapons';
import { VEHICLES } from '../../shared/vehicles';
import { CLASSES } from '../../shared/classes';
import { EVENTS } from '../../shared/protocol';

import type {
  ChatMessage,
  GameSettings,
  HUDTelemetry,
  KillFeedItem,
  MatchLaunchConfig,
  MinimapBlip,
  PlayerLoadout,
} from '../types';
import { textureBank } from '../engine/textures';
import { assetOverrides } from '../engine/assetLoader';
import { buildMapScene, type BuiltMap } from '../engine/mapBuilder';
import { VFXPool } from '../engine/vfxPool';
import { FirstPersonWeaponRig } from '../models/weaponModels';
import { animateSoldierRig, createSoldierRig, setSoldierWeapon, type SoldierRig } from '../models/soldierModel';
import { buildVehicleVisual, type VehicleVisual } from '../models/vehicleModels';
import { soundEngine } from '../audio/soundEngine';

// Pre-allocated scratch math objects (zero GC in render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();

interface LocalActor {
  id: string;
  name: string;
  isBot: boolean;
  team: 1 | 2;
  classId: string;
  outfitId: string;
  activeWeaponId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  crouch: boolean;
  gasMask: boolean;
  hp: number;
  maxHp: number;
  alive: boolean;
  downed: boolean;
  downedTimer: number;
  respawnTimer: number;
  vehicleId: string | null;
  seatIdx: number;
  kills: number;
  deaths: number;
  score: number;
  lastShotAt: number;
  targetCp: number;
}

interface LocalVehicle {
  id: string;
  type: string;
  team: number;
  x: number;
  y: number;
  z: number;
  speed: number;
  rotY: number;
  pitch: number;
  roll: number;
  turretYaw: number;
  hp: number;
  maxHp: number;
  alive: boolean;
  respawnTimer: number;
  submergeDepth: number;
  seats: (string | null)[];
  spawn: { x: number; y: number; z: number; rotY: number };
  visual: VehicleVisual;
}

interface LocalProjectile {
  ownerId: string;
  team: number;
  weaponId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  damage: number;
  splash: number;
  isGas: boolean;
  isMine: boolean;
  ttl: number;
  mesh: THREE.Mesh;
}

export interface EngineCallbacks {
  onHudUpdate: (hud: HUDTelemetry) => void;
  onKillFeed: (item: KillFeedItem) => void;
  onChat: (msg: ChatMessage) => void;
  onProgressionEvent: (ev: 'kill' | 'headshot' | 'capture' | 'vehicle' | 'revive') => void;
  onPauseRequest: () => void;
}

export class AshfrontEngine {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private composer: EffectComposer | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private isSoftwareGl: boolean;

  private builtMap: BuiltMap | null = null;
  private vfx: VFXPool;
  private fpRig: FirstPersonWeaponRig;
  private soldierRigs = new Map<string, SoldierRig>();
  private vehicles = new Map<string, LocalVehicle>();
  private actors = new Map<string, LocalActor>();
  private projectiles: LocalProjectile[] = [];
  private capturePoints: { id: string; name: string; x: number; z: number; owner: number; progress: number }[] = [];
  private gasClouds: { x: number; y: number; z: number; radius: number; ttl: number; mesh: THREE.Mesh }[] = [];

  private settings: GameSettings;
  private loadout: PlayerLoadout;
  private callbacks: EngineCallbacks;
  private config: MatchLaunchConfig | null = null;

  private mode: 'menu' | 'playing' = 'menu';
  private paused = false;
  private menuYaw = 0;
  private frameId = 0;
  private lastTime = performance.now();
  private hudTimer = 0;
  private fpsSamples: number[] = [];
  private currentFps = 60;
  private currentPing = 0;
  private adaptiveScale = 1.0;

  // Player combat state
  private localId = 'local_player';
  private magAmmo = 30;
  private reserveAmmo = 150;
  private secondaryMag = 7;
  private secondaryReserve = 42;
  private explosiveAmmo = 2;
  private activeSlot: 0 | 1 | 2 = 0;
  private reloadTimer = 0;
  private hitMarkerType: 'none' | 'normal' | 'headshot' = 'none';
  private hitMarkerTimer = 0;
  private damageFlash = 0;
  private cameraShake = 0;
  private tickets: Record<1 | 2, number> = { 1: 300, 2: 300 };
  private roundTime = 900;
  private winner = 0;
  private gasActive = false;
  private gasCycleTimer = 45;
  private footstepTimer = 0;
  private gadgetCooldown = 0;
  private adrenalineTimer = 0;
  private reconFlareTimer = 0;
  private resupplyAuraTimer = 0;

  // Tutorial state for Training Range
  private tutorialStep = 0;
  private movedDistance = 0;
  private dummiesHit = 0;
  private reloadedOnce = false;
  private boardedVehicle = false;

  // Input state (continuous held + edge-triggered)
  private keys = new Set<string>();
  private touchMove = { x: 0, y: 0 };
  private touchFire = false;
  private touchAds = false;
  private touchVehicleControl = { throttle: 0, steer: 0, pitch: 0 };
  private isFiringMouse = false;
  private isAdsMouse = false;
  private lastFireTime = 0;
  private lastVehFireTime = 0;
  private seqCounter = 0;

  // Online socket
  private socket: Socket | null = null;
  private netSendTimer = 0;

  constructor(
    container: HTMLElement,
    settings: GameSettings,
    loadout: PlayerLoadout,
    callbacks: EngineCallbacks
  ) {
    this.container = container;
    this.settings = settings;
    this.loadout = loadout;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas').getContext('webgl2');
      if (!probe) return true;
      const ext = probe.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
      const gpu = String(probe.getParameter(param));
      probe.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && settings.antiAliasing,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && settings.shadows;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    textureBank.setMaxAnisotropy(this.renderer.capabilities.getMaxAnisotropy());
    this.applyRendererScale();
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      settings.fov,
      (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight),
      0.1,
      settings.drawDistance + 300
    );
    this.scene.add(this.camera);

    // Mandatory Studio Environment Reflection (RoomEnvironment)
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    if (!this.isSoftwareGl) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2),
        0.35,
        0.35,
        0.88
      );
      this.composer.addPass(this.bloomPass);
    }

    this.vfx = new VFXPool(this.scene);
    this.fpRig = new FirstPersonWeaponRig(1);
    this.fpRig.group.visible = false;
    this.camera.add(this.fpRig.group);

    assetOverrides.init();
    this.bindEvents();
    this.startLoop();
  }

  private applyRendererScale(): void {
    const baseRatio = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    const scale = (this.settings.resolutionScale / 100) * this.adaptiveScale;
    this.renderer.setPixelRatio(Math.max(0.5, baseRatio * scale));
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onContextMenu = (e: MouseEvent) => {
    if (this.mode === 'playing') e.preventDefault();
  };

  private onPointerLockChange = () => {
    if (this.mode === 'playing' && !this.paused && !document.pointerLockElement && !this.isTouchDevice()) {
      // Allow clicking canvas to re-lock pointer without interrupting touch play
    }
  };

  private isTouchDevice(): boolean {
    return this.settings.forceTouchControls || ('ontouchstart' in window && window.innerWidth < 1100);
  }

  private onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.composer) this.composer.setSize(w, h);
  };

  private onBlur = () => {
    this.keys.clear();
    this.isFiringMouse = false;
    this.isAdsMouse = false;
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (this.mode !== 'playing') return;
    if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    this.keys.add(e.code);
    if (e.code === 'Escape') {
      this.setPaused(!this.paused);
      this.callbacks.onPauseRequest();
    } else if (e.code === 'KeyR') {
      this.triggerReload();
    } else if (e.code === 'Digit1') {
      this.switchSlot(0);
    } else if (e.code === 'Digit2') {
      this.switchSlot(1);
    } else if (e.code === 'Digit3') {
      this.switchSlot(2);
    } else if (e.code === 'KeyG') {
      this.toggleGasMask();
    } else if (e.code === 'KeyE') {
      this.handleInteract();
    } else if (e.code === 'KeyC') {
      const me = this.actors.get(this.localId);
      if (me && !me.vehicleId) me.crouch = !me.crouch;
    } else if (e.code === 'KeyF') {
      this.cycleVehicleSeat();
    } else if (e.code === 'Digit4' || e.code === 'KeyX') {
      this.triggerGadget();
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.mode !== 'playing' || this.paused) return;
    if (document.pointerLockElement !== this.renderer.domElement && !this.isFiringMouse) return;
    this.applyLookDelta(e.movementX, e.movementY);
  };

  private onMouseDown = (e: MouseEvent) => {
    if (this.mode !== 'playing' || this.paused) return;
    if (e.target !== this.renderer.domElement) return;
    soundEngine.ensureContext();
    if (!this.isTouchDevice() && document.pointerLockElement !== this.renderer.domElement) {
      this.renderer.domElement.requestPointerLock?.();
    }
    if (e.button === 0) this.isFiringMouse = true;
    if (e.button === 2) this.isAdsMouse = true;
  };

  private onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) this.isFiringMouse = false;
    if (e.button === 2) this.isAdsMouse = false;
  };

  public applyLookDelta(dx: number, dy: number): void {
    const me = this.actors.get(this.localId);
    if (!me || !me.alive || me.downed) return;
    const isAds = this.isAdsActive();
    const w = this.getActiveWeaponDef();
    const isScoped = isAds && w?.model.scope === 'optic';
    const v = me.vehicleId ? this.vehicles.get(me.vehicleId) : null;
    const vDef = v ? VEHICLES[v.type] : null;

    let sens = isScoped ? this.settings.sensScope : isAds ? this.settings.sensAds : this.settings.sensHip;
    if (vDef?.domain === 'air') sens = this.settings.sensAircraft;
    else if (vDef) sens = this.settings.sensVehicle;

    const factor = 0.0024 * sens;
    const ySign = this.settings.invertY ? 1 : -1;

    me.yaw -= dx * factor;
    me.pitch = THREE.MathUtils.clamp(me.pitch + dy * factor * ySign, -1.35, 1.35);

    if (v && me.seatIdx >= 0) {
      v.turretYaw -= dx * factor * 0.85;
    }
    this.fpRig.addLookSway(dx * 0.15, dy * 0.15);
  }

  public setTouchMove(x: number, y: number): void {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }

  public setTouchFire(active: boolean): void {
    this.touchFire = active;
  }

  public setTouchAds(active: boolean): void {
    this.touchAds = active;
  }

  public setTouchVehicle(throttle: number, steer: number, pitch = 0): void {
    this.touchVehicleControl.throttle = throttle;
    this.touchVehicleControl.steer = steer;
    this.touchVehicleControl.pitch = pitch;
  }

  public triggerJump(): void {
    const me = this.actors.get(this.localId);
    if (!me || !me.alive || me.downed) return;
    if (me.vehicleId) {
      const v = this.vehicles.get(me.vehicleId);
      if (v && VEHICLES[v.type].canSubmerge) {
        v.submergeDepth = Math.max(0, v.submergeDepth - 1.5);
      }
      return;
    }
    const ground = getTerrainHeight(this.config?.mapId || 'ww1_trench', me.x, me.z);
    if (me.y <= ground + 0.18) {
      me.vy = 6.8;
    }
  }

  public triggerCrouch(): void {
    const me = this.actors.get(this.localId);
    if (!me) return;
    if (me.vehicleId) {
      const v = this.vehicles.get(me.vehicleId);
      if (v && VEHICLES[v.type].canSubmerge) {
        v.submergeDepth = Math.min(7, v.submergeDepth + 1.5);
      }
      return;
    }
    me.crouch = !me.crouch;
  }

  public toggleGasMask(): void {
    const me = this.actors.get(this.localId);
    if (!me || !me.alive) return;
    me.gasMask = !me.gasMask;
    soundEngine.playUIClick();
  }

  public triggerGadget(): void {
    const me = this.actors.get(this.localId);
    if (!me || !me.alive || me.downed || this.gadgetCooldown > 0) return;
    this.gadgetCooldown = 12;
    soundEngine.playUIClick();
    if (this.config?.online && this.socket) {
      this.socket.emit(EVENTS.PLAYER_GADGET);
    }
    if (me.classId === 'assault') {
      me.hp = Math.min(me.maxHp, me.hp + 30);
      this.adrenalineTimer = 6;
    } else if (me.classId === 'medic') {
      me.hp = Math.min(me.maxHp, me.hp + 45);
      for (const ally of this.actors.values()) {
        if (ally.alive && ally.team === me.team && Math.hypot(ally.x - me.x, ally.z - me.z) < 8) {
          ally.hp = Math.min(ally.maxHp, ally.hp + 35);
        }
      }
    } else if (me.classId === 'support') {
      const pDef = WEAPONS_BY_ID[this.loadout.primaryId];
      const sDef = WEAPONS_BY_ID[this.loadout.secondaryId];
      if (pDef) this.reserveAmmo = Math.min(pDef.reserveMax, this.reserveAmmo + pDef.magSize * 2);
      if (sDef) this.secondaryReserve = Math.min(sDef.reserveMax, this.secondaryReserve + sDef.magSize * 2);
      this.explosiveAmmo = Math.min(4, this.explosiveAmmo + 1);
      for (const v of this.vehicles.values()) {
        if (v.alive && v.team === me.team && Math.hypot(v.x - me.x, v.z - me.z) < 10) {
          v.hp = Math.min(v.maxHp, v.hp + 140);
        }
      }
    } else if (me.classId === 'scout') {
      this.reconFlareTimer = 10;
    } else if (me.classId === 'anti_armor') {
      this.explosiveAmmo = Math.min(4, this.explosiveAmmo + 1);
      const mineId = this.loadout.era === 'ww1' ? 'ww1_mine_atbox' : 'ww2_mine_teller';
      this.spawnProjectile(me.id, me.team, mineId, me.x, me.y + 0.5, me.z, 0, -1, 0, 18, 220, 6.5, false, true);
    }
  }

  public switchSlot(slot?: 0 | 1 | 2): void {
    const next = slot !== undefined ? slot : (((this.activeSlot + 1) % 3) as 0 | 1 | 2);
    this.activeSlot = next;
    this.reloadTimer = 0;
    const me = this.actors.get(this.localId);
    if (me) {
      me.activeWeaponId = this.getSlotWeaponId(next);
      const w = WEAPONS_BY_ID[me.activeWeaponId];
      if (w) this.fpRig.setWeapon(w, this.loadout.skinId);
    }
    soundEngine.playUIClick();
  }

  private getSlotWeaponId(slot: 0 | 1 | 2): string {
    if (slot === 0) return this.loadout.primaryId;
    if (slot === 1) return this.loadout.secondaryId;
    return this.loadout.explosiveId;
  }

  private getActiveWeaponDef() {
    const me = this.actors.get(this.localId);
    const id = me?.activeWeaponId || this.loadout.primaryId;
    return WEAPONS_BY_ID[id] || WEAPONS_BY_ID.ww2_smg_typewriter;
  }

  public triggerReload(): void {
    const w = this.getActiveWeaponDef();
    if (!w || this.reloadTimer > 0) return;
    if (this.activeSlot === 0 && (this.magAmmo >= w.magSize || this.reserveAmmo <= 0)) return;
    if (this.activeSlot === 1 && (this.secondaryMag >= w.magSize || this.secondaryReserve <= 0)) return;
    this.reloadTimer = w.reloadTime;
    this.fpRig.triggerReload(w.reloadTime);
    soundEngine.playReload(w.reloadStyle);
    this.reloadedOnce = true;
  }

  public cycleVehicleSeat(): void {
    const me = this.actors.get(this.localId);
    if (!me || !me.vehicleId) return;
    const v = this.vehicles.get(me.vehicleId);
    if (!v) return;
    const nextSeat = v.seats.findIndex((s, i) => i > me.seatIdx && s === null);
    const wrapSeat = nextSeat !== -1 ? nextSeat : v.seats.findIndex((s) => s === null);
    if (wrapSeat !== -1) {
      v.seats[me.seatIdx] = null;
      v.seats[wrapSeat] = me.id;
      me.seatIdx = wrapSeat;
      soundEngine.playUIClick();
    }
  }

  public handleInteract(): void {
    const me = this.actors.get(this.localId);
    if (!me || !me.alive || me.downed) return;

    if (me.vehicleId) {
      if (this.config?.online && this.socket) {
        this.socket.emit(EVENTS.VEHICLE_EXIT);
      } else {
        this.exitLocalVehicle(me);
      }
      return;
    }

    // Check nearby downed teammate to revive
    for (const other of this.actors.values()) {
      if (other.id === me.id || !other.alive || !other.downed || other.team !== me.team) continue;
      if (Math.hypot(other.x - me.x, other.z - me.z) < 4.2) {
        if (this.config?.online && this.socket) {
          this.socket.emit(EVENTS.PLAYER_REVIVE, other.id);
        } else {
          other.downed = false;
          other.hp = Math.round(other.maxHp * 0.7);
          me.score += 100;
          this.callbacks.onProgressionEvent('revive');
        }
        soundEngine.playUIClick();
        return;
      }
    }

    // Check nearby vehicle to enter
    let closestV: LocalVehicle | null = null;
    let closestD = 8.5;
    for (const v of this.vehicles.values()) {
      if (!v.alive) continue;
      const d = Math.hypot(v.x - me.x, v.z - me.z) - VEHICLES[v.type].radius * 0.4;
      if (d < closestD) {
        closestD = d;
        closestV = v;
      }
    }
    if (closestV) {
      if (this.config?.online && this.socket) {
        this.socket.emit(EVENTS.VEHICLE_ENTER, closestV.id);
      } else {
        this.enterLocalVehicle(me, closestV);
      }
      this.boardedVehicle = true;
      soundEngine.playUIClick();
    }
  }

  private enterLocalVehicle(actor: LocalActor, v: LocalVehicle): void {
    const idx = v.seats.findIndex((s) => s === null);
    if (idx === -1) return;
    v.seats[idx] = actor.id;
    actor.vehicleId = v.id;
    actor.seatIdx = idx;
    if (VEHICLES[v.type].domain === 'sea') soundEngine.playShipHorn();
  }

  private exitLocalVehicle(actor: LocalActor): void {
    if (!actor.vehicleId) return;
    const v = this.vehicles.get(actor.vehicleId);
    if (v) {
      if (v.seats[actor.seatIdx] === actor.id) v.seats[actor.seatIdx] = null;
      const r = VEHICLES[v.type].radius + 1.5;
      actor.x = v.x + Math.cos(v.rotY) * r;
      actor.z = v.z - Math.sin(v.rotY) * r;
      actor.y = Math.max((MAPS[this.config?.mapId || 'ww1_trench']?.waterLevel ?? -4) + 0.3, getTerrainHeight(this.config?.mapId || 'ww1_trench', actor.x, actor.z));
    }
    actor.vehicleId = null;
    actor.seatIdx = -1;
  }

  public updateSettings(s: GameSettings): void {
    this.settings = s;
    this.camera.fov = s.fov;
    this.camera.far = s.drawDistance + 300;
    this.camera.updateProjectionMatrix();
    this.renderer.shadowMap.enabled = !this.isSoftwareGl && s.shadows;
    this.applyRendererScale();
    soundEngine.setVolumes(s.masterVol, s.sfxVol, s.musicVol, s.voiceVol);
  }

  public updateLoadout(l: PlayerLoadout): void {
    this.loadout = l;
    const me = this.actors.get(this.localId);
    if (me) {
      me.classId = l.classId;
      me.outfitId = l.outfitId;
      me.activeWeaponId = this.getSlotWeaponId(this.activeSlot);
      const w = WEAPONS_BY_ID[me.activeWeaponId];
      if (w) {
        this.fpRig.setWeapon(w, l.skinId);
      }
    }
  }

  public setPaused(p: boolean): void {
    this.paused = p;
    if (p && document.pointerLockElement) {
      document.exitPointerLock?.();
    }
  }

  public sendChat(text: string): void {
    if (!text.trim()) return;
    if (this.config?.online && this.socket) {
      this.socket.emit(EVENTS.CHAT_MSG, text);
    } else {
      this.callbacks.onChat({
        id: `${Date.now()}`,
        sender: this.loadout.playerName,
        team: 1,
        text: text.trim(),
        ts: Date.now(),
      });
    }
  }

  public swapTrainingWeapon(weaponId: string): void {
    const w = WEAPONS_BY_ID[weaponId];
    if (!w) return;
    if (w.category === 'pistol') {
      this.loadout.secondaryId = w.id;
      this.secondaryMag = w.magSize;
      this.secondaryReserve = w.reserveMax;
      this.switchSlot(1);
    } else if (w.isGrenade || w.isMine) {
      this.loadout.explosiveId = w.id;
      this.explosiveAmmo = w.magSize;
      this.switchSlot(2);
    } else {
      this.loadout.primaryId = w.id;
      this.magAmmo = w.magSize;
      this.reserveAmmo = w.reserveMax;
      this.switchSlot(0);
    }
  }

  public startMenuShowcase(mapId: string, timeId: string): void {
    this.cleanupMatch();
    this.mode = 'menu';
    this.fpRig.group.visible = false;
    this.builtMap = buildMapScene(this.scene, mapId, timeId, !this.isSoftwareGl && this.settings.shadows);
    soundEngine.setMusicMode('menu');
  }

  public async launchMatch(cfg: MatchLaunchConfig): Promise<void> {
    this.cleanupMatch();
    this.config = cfg;
    this.mode = 'playing';
    this.paused = false;
    this.tickets = { 1: 300, 2: 300 };
    this.roundTime = 900;
    this.winner = 0;
    this.gasActive = false;
    this.gasCycleTimer = 42;
    this.tutorialStep = 0;
    this.movedDistance = 0;
    this.dummiesHit = 0;
    this.reloadedOnce = false;
    this.boardedVehicle = false;

    const mapId = cfg.mode === 'training' ? 'training_range' : cfg.mapId;
    this.config.mapId = mapId;
    const mapDef = MAPS[mapId] || MAPS.ww1_trench;

    this.builtMap = buildMapScene(
      this.scene,
      mapId,
      cfg.timeOfDay || mapDef.defaultTime,
      !this.isSoftwareGl && this.settings.shadows
    );
    this.capturePoints = mapDef.capturePoints.map((cp) => ({
      id: cp.id,
      name: cp.name,
      x: cp.x,
      z: cp.z,
      owner: cp.initialOwner,
      progress: cp.initialOwner === 1 ? 100 : cp.initialOwner === 2 ? -100 : 0,
    }));

    this.fpRig = new FirstPersonWeaponRig(1);
    this.camera.add(this.fpRig.group);
    this.fpRig.group.visible = true;

    const pDef = WEAPONS_BY_ID[this.loadout.primaryId] || WEAPONS_BY_ID.ww2_smg_typewriter;
    const sDef = WEAPONS_BY_ID[this.loadout.secondaryId] || WEAPONS_BY_ID.ww2_pistol_m45;
    const eDef = WEAPONS_BY_ID[this.loadout.explosiveId] || WEAPONS_BY_ID.ww2_grenade_pineapple;
    this.magAmmo = pDef.magSize;
    this.reserveAmmo = pDef.reserveMax;
    this.secondaryMag = sDef.magSize;
    this.secondaryReserve = sDef.reserveMax;
    this.explosiveAmmo = eDef.magSize;
    this.activeSlot = 0;
    this.fpRig.setWeapon(pDef, this.loadout.skinId);

    soundEngine.ensureContext();
    soundEngine.startAmbientWarLoop();
    soundEngine.setMusicMode('battle');

    if (cfg.online && cfg.serverUrl) {
      this.connectOnline(cfg);
    } else {
      this.setupOfflineEntities(mapId, cfg.botCount);
    }
  }

  private setupOfflineEntities(mapId: string, botCount: number): void {
    const mapDef = MAPS[mapId] || MAPS.ww1_trench;
    const cDef = CLASSES[this.loadout.classId] || CLASSES.assault;
    const sp = mapDef.spawns[1][0];
    const sy = Math.max(mapDef.waterLevel + 0.4, getTerrainHeight(mapId, sp[0], sp[1]));

    this.localId = 'local_player';
    this.actors.set(this.localId, {
      id: this.localId,
      name: this.loadout.playerName,
      isBot: false,
      team: 1,
      classId: this.loadout.classId,
      outfitId: this.loadout.outfitId,
      activeWeaponId: this.loadout.primaryId,
      x: sp[0],
      y: sy,
      z: sp[1],
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: mapId === 'training_range' ? 0 : -Math.PI / 2,
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
      targetCp: 0,
    });

    // Spawn vehicles
    mapDef.vehicleSpawns.forEach((vs, idx) => {
      const def = VEHICLES[vs.type];
      if (!def) return;
      const vid = `veh_${idx}_${vs.type}`;
      const y = def.domain === 'air'
        ? getTerrainHeight(mapId, vs.x, vs.z) + 1.5
        : def.domain === 'sea'
          ? mapDef.waterLevel
          : getTerrainHeight(mapId, vs.x, vs.z);
      const visual = buildVehicleVisual(vs.type, vs.team);
      visual.root.position.set(vs.x, y, vs.z);
      visual.root.rotation.y = vs.rotY || 0;
      this.scene.add(visual.root);
      this.vehicles.set(vid, {
        id: vid,
        type: vs.type,
        team: vs.team,
        x: vs.x,
        y,
        z: vs.z,
        speed: 0,
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
        visual,
      });
    });

    // Spawn Offline AI Bots
    const classKeys = Object.keys(CLASSES);
    const era = this.config?.era || mapDef.era;
    const totalBots = this.config?.mode === 'training' ? Math.max(3, botCount) : botCount;
    for (let i = 0; i < totalBots; i++) {
      const team: 1 | 2 = this.config?.mode === 'training' ? 2 : (i % 2 === 0 ? 2 : 1);
      const spList = mapDef.spawns[team];
      const pick = spList[i % spList.length];
      const bx = pick[0] + (Math.random() - 0.5) * 10;
      const bz = pick[1] + (Math.random() - 0.5) * 10;
      const by = Math.max(mapDef.waterLevel + 0.4, getTerrainHeight(mapId, bx, bz));
      const cls = classKeys[i % classKeys.length];
      const botCDef = CLASSES[cls];
      const bId = `bot_${i}`;
      const wId = botCDef.defaultPrimary[era];
      this.actors.set(bId, {
        id: bId,
        name: `[BOT] ${team === 1 ? 'Cpl.' : 'Gefr.'} ${['Miller', 'Vance', 'Keller', 'Rossi', 'Kovacs', 'Laurent', 'Weber', 'Hayes'][i % 8]}`,
        isBot: true,
        team,
        classId: cls,
        outfitId: 'standard',
        activeWeaponId: wId,
        x: bx,
        y: by,
        z: bz,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: team === 1 ? -Math.PI / 2 : Math.PI / 2,
        pitch: 0,
        crouch: false,
        gasMask: false,
        hp: botCDef.maxHp,
        maxHp: botCDef.maxHp,
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
        targetCp: i % Math.max(1, this.capturePoints.length),
      });
    }
  }

  private connectOnline(cfg: MatchLaunchConfig): void {
    const addr = cfg.serverUrl!.startsWith('http') ? cfg.serverUrl! : `http://${cfg.serverUrl}`;
    this.socket = io(addr, { transports: ['websocket', 'polling'] });

    this.socket.on('connect', () => {
      this.socket!.emit(EVENTS.ROOM_JOIN, {
        roomId: cfg.roomId,
        name: this.loadout.playerName,
        classId: this.loadout.classId,
        outfitId: this.loadout.outfitId,
        skinId: this.loadout.skinId,
        primaryId: this.loadout.primaryId,
        secondaryId: this.loadout.secondaryId,
        explosiveId: this.loadout.explosiveId,
      });
    });

    this.socket.on(EVENTS.ROOM_JOINED, (payload: { playerId: string; state: Record<string, unknown> }) => {
      this.localId = payload.playerId;
      this.applyServerWorldState(payload.state);
    });

    this.socket.on(EVENTS.WORLD_STATE, (state: Record<string, unknown>) => {
      this.applyServerWorldState(state);
    });

    this.socket.on(EVENTS.HIT_CONFIRM, (d: { headshot: boolean }) => {
      this.hitMarkerType = d.headshot ? 'headshot' : 'normal';
      this.hitMarkerTimer = 0.18;
      soundEngine.playHitMarker(d.headshot);
      if (d.headshot) this.callbacks.onProgressionEvent('headshot');
    });

    this.socket.on(EVENTS.KILL_FEED, (item: KillFeedItem) => {
      this.callbacks.onKillFeed({ ...item, id: `${Date.now()}_${Math.random()}`, ts: Date.now() });
      if (item.killerName === this.loadout.playerName) {
        this.callbacks.onProgressionEvent(item.isVehicle ? 'vehicle' : 'kill');
      }
    });

    this.socket.on(EVENTS.CHAT_MSG, (msg: ChatMessage) => {
      this.callbacks.onChat({ ...msg, id: `${Date.now()}_${Math.random()}` });
    });

    this.socket.on(EVENTS.GAS_EVENT, (ev: { active: boolean }) => {
      if (ev.active && !this.gasActive) soundEngine.playGasSiren();
      this.gasActive = ev.active;
    });

    this.socket.on(EVENTS.PING_RES, (ts: number) => {
      this.currentPing = Math.max(1, Date.now() - ts);
    });
  }

  private applyServerWorldState(state: any): void {
    if (!state) return;
    this.tickets = state.tickets || this.tickets;
    this.roundTime = state.roundTime ?? this.roundTime;
    this.winner = state.winner ?? 0;
    this.gasActive = Boolean(state.gasActive);
    if (Array.isArray(state.capturePoints)) this.capturePoints = state.capturePoints;

    // Sync actors
    const seenActors = new Set<string>();
    for (const sa of state.actors || []) {
      seenActors.add(sa.id);
      const existing = this.actors.get(sa.id);
      if (!existing) {
        this.actors.set(sa.id, { ...sa, vx: 0, vy: 0, vz: 0, downedTimer: 0, respawnTimer: 0, lastShotAt: 0, targetCp: 0 });
      } else if (sa.id === this.localId) {
        // Reconcile vital server state while keeping client predicted position unless respawned/forced
        if ((!existing.alive && sa.alive) || existing.vehicleId !== sa.vehicleId || Math.hypot(existing.x - sa.x, existing.z - sa.z) > 12) {
          existing.x = sa.x;
          existing.y = sa.y;
          existing.z = sa.z;
        }
        if (sa.hp < existing.hp && sa.alive) {
          this.damageFlash = 0.7;
          this.cameraShake = Math.max(this.cameraShake, 0.25);
        }
        existing.hp = sa.hp;
        existing.maxHp = sa.maxHp;
        existing.alive = sa.alive;
        existing.downed = sa.downed;
        existing.team = sa.team;
        existing.vehicleId = sa.vehicleId;
        existing.seatIdx = sa.seatIdx;
        existing.kills = sa.kills;
        existing.deaths = sa.deaths;
        existing.score = sa.score;
      } else {
        existing.x = THREE.MathUtils.lerp(existing.x, sa.x, 0.45);
        existing.y = THREE.MathUtils.lerp(existing.y, sa.y, 0.45);
        existing.z = THREE.MathUtils.lerp(existing.z, sa.z, 0.45);
        existing.yaw = sa.yaw;
        existing.pitch = sa.pitch;
        existing.crouch = sa.crouch;
        existing.gasMask = sa.gasMask;
        existing.hp = sa.hp;
        existing.alive = sa.alive;
        existing.downed = sa.downed;
        existing.activeWeaponId = sa.activeWeaponId;
        existing.vehicleId = sa.vehicleId;
        existing.seatIdx = sa.seatIdx;
        existing.kills = sa.kills;
        existing.deaths = sa.deaths;
        existing.score = sa.score;
      }
    }
    for (const id of this.actors.keys()) {
      if (!seenActors.has(id)) this.actors.delete(id);
    }

    // Sync vehicles
    for (const sv of state.vehicles || []) {
      let lv = this.vehicles.get(sv.id);
      if (!lv) {
        const visual = buildVehicleVisual(sv.type, sv.team);
        this.scene.add(visual.root);
        lv = {
          ...sv,
          speed: 0,
          respawnTimer: 0,
          spawn: { x: sv.x, y: sv.y, z: sv.z, rotY: sv.rotY },
          visual,
        };
        this.vehicles.set(sv.id, lv!);
      } else {
        const me = this.actors.get(this.localId);
        const drivingThis = me?.vehicleId === sv.id && me?.seatIdx === 0;
        if (!drivingThis) {
          lv.x = THREE.MathUtils.lerp(lv.x, sv.x, 0.45);
          lv.y = THREE.MathUtils.lerp(lv.y, sv.y, 0.45);
          lv.z = THREE.MathUtils.lerp(lv.z, sv.z, 0.45);
          lv.rotY = sv.rotY;
          lv.pitch = sv.pitch;
          lv.roll = sv.roll;
          lv.submergeDepth = sv.submergeDepth;
        }
        lv.turretYaw = sv.turretYaw;
        lv.hp = sv.hp;
        lv.alive = sv.alive;
        lv.seats = sv.seats;
      }
    }
  }

  private isAdsActive(): boolean {
    const me = this.actors.get(this.localId);
    if (!me || me.vehicleId) return false;
    return this.isAdsMouse || this.touchAds || this.keys.has('KeyQ');
  }

  private startLoop(): void {
    const tick = () => {
      const now = performance.now();
      const rawDt = (now - this.lastTime) / 1000;
      this.lastTime = now;
      const dt = Math.min(rawDt, 0.05);

      if (rawDt > 0.001) {
        this.fpsSamples.push(1 / rawDt);
        if (this.fpsSamples.length > 25) this.fpsSamples.shift();
        this.currentFps = Math.round(this.fpsSamples.reduce((a, b) => a + b, 0) / this.fpsSamples.length);
        if (this.settings.graphicsPreset === 'auto' && this.fpsSamples.length === 25) {
          if (this.currentFps < 38 && this.adaptiveScale > 0.65) {
            this.adaptiveScale = Math.max(0.65, this.adaptiveScale - 0.05);
            this.applyRendererScale();
          } else if (this.currentFps > 56 && this.adaptiveScale < 1.0) {
            this.adaptiveScale = Math.min(1.0, this.adaptiveScale + 0.05);
            this.applyRendererScale();
          }
        }
      }

      if (this.mode === 'menu') {
        this.updateMenuCamera(dt);
      } else if (!this.paused) {
        this.updateMatch(dt);
      }

      if (this.composer && !this.isSoftwareGl && this.settings.graphicsPreset !== 'low') {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private updateMenuCamera(dt: number): void {
    this.menuYaw += dt * 0.08;
    const rad = 68;
    const cx = Math.cos(this.menuYaw) * rad;
    const cz = Math.sin(this.menuYaw) * rad;
    const mapId = this.builtMap ? (this.config?.mapId || 'ww1_trench') : 'ww1_trench';
    const gy = getTerrainHeight(mapId, cx, cz);
    this.camera.position.set(cx, Math.max(gy + 16, 18), cz);
    this.camera.lookAt(0, 4, 0);
    if (this.builtMap) {
      this.builtMap.windUniforms.uTime.value += dt;
    }
  }

  private updateMatch(dt: number): void {
    const mapId = this.config?.mapId || 'ww1_trench';
    const mapDef = MAPS[mapId] || MAPS.ww1_trench;

    if (this.builtMap) {
      this.builtMap.windUniforms.uTime.value += dt;
      if (this.builtMap.rainPoints) {
        const pos = this.builtMap.rainPoints.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < pos.count; i++) {
          let y = pos.getY(i) - 38 * dt;
          if (y < 0) y = 45;
          pos.setY(i, y);
        }
        pos.needsUpdate = true;
      }
      // Animate target dummies in Training Range
      for (const d of this.builtMap.dummies) {
        if (d.downTimer > 0) {
          d.downTimer -= dt;
          d.mesh.rotation.x = THREE.MathUtils.damp(d.mesh.rotation.x, -Math.PI / 2, 12, dt);
          if (d.downTimer <= 0) d.hp = 100;
        } else {
          d.mesh.rotation.x = THREE.MathUtils.damp(d.mesh.rotation.x, 0, 10, dt);
          if (d.moving) {
            d.phase += dt * 1.4;
            d.mesh.position.x = d.baseX + Math.sin(d.phase) * 4.5;
          }
        }
      }
    }

    // Update Capture Flag Colors
    if (this.builtMap) {
      for (const cp of this.capturePoints) {
        const flag = this.builtMap.flagMeshes.get(cp.id);
        if (flag) {
          const mat = flag.material as THREE.MeshStandardMaterial;
          mat.color.set(cp.owner === 1 ? '#2563eb' : cp.owner === 2 ? '#dc2626' : '#d4d4d8');
        }
      }
    }

    const me = this.actors.get(this.localId);
    if (me) {
      this.updateLocalPlayer(me, dt, mapDef);
    }

    // Offline simulation when not connected to server
    if (!this.config?.online) {
      this.tickOfflineSimulation(dt, mapDef);
    }

    this.updateProjectiles(dt, mapId);
    this.syncSoldierVisuals(dt);
    this.syncVehicleVisuals(dt);
    this.vfx.update(dt);

    // Online network sync (20 Hz)
    if (this.config?.online && this.socket && me) {
      this.netSendTimer += dt;
      if (this.netSendTimer >= 0.05) {
        this.netSendTimer = 0;
        this.seqCounter++;
        if (me.vehicleId) {
          const v = this.vehicles.get(me.vehicleId);
          if (v) {
            this.socket.emit(EVENTS.VEHICLE_INPUT, {
              x: v.x, y: v.y, z: v.z, rotY: v.rotY, pitch: v.pitch, roll: v.roll,
              turretYaw: v.turretYaw, submergeDepth: v.submergeDepth,
            });
          }
        } else {
          this.socket.emit(EVENTS.PLAYER_INPUT, {
            seq: this.seqCounter,
            x: me.x, y: me.y, z: me.z, yaw: me.yaw, pitch: me.pitch,
            crouch: me.crouch, gasMask: me.gasMask, activeWeaponId: me.activeWeaponId,
          });
        }
      }
    }

    // Throttled React HUD update (15 Hz)
    this.hudTimer += dt;
    if (this.hudTimer >= 0.066) {
      this.hudTimer = 0;
      if (this.config?.online && this.socket) {
        this.socket.emit(EVENTS.PING_REQ, Date.now());
      }
      this.emitHudTelemetry();
    }
  }

  private updateLocalPlayer(me: LocalActor, dt: number, mapDef: typeof MAPS.ww1_trench): void {
    this.hitMarkerTimer = Math.max(0, this.hitMarkerTimer - dt);
    if (this.hitMarkerTimer <= 0) this.hitMarkerType = 'none';
    this.damageFlash = THREE.MathUtils.damp(this.damageFlash, 0, 6, dt);
    this.cameraShake = THREE.MathUtils.damp(this.cameraShake, 0, 10, dt);
    this.gadgetCooldown = Math.max(0, this.gadgetCooldown - dt);
    this.adrenalineTimer = Math.max(0, this.adrenalineTimer - dt);
    this.reconFlareTimer = Math.max(0, this.reconFlareTimer - dt);

    // Friendly Troop Truck resupply aura
    this.resupplyAuraTimer -= dt;
    if (this.resupplyAuraTimer <= 0) {
      this.resupplyAuraTimer = 1.5;
      for (const v of this.vehicles.values()) {
        if (v.alive && v.type === 'troop_truck' && v.team === me.team && Math.hypot(v.x - me.x, v.z - me.z) < 12) {
          const pDef = WEAPONS_BY_ID[this.loadout.primaryId];
          if (pDef) this.reserveAmmo = Math.min(pDef.reserveMax, this.reserveAmmo + pDef.magSize);
          me.hp = Math.min(me.maxHp, me.hp + 6);
          break;
        }
      }
    }

    if (!me.alive || me.downed) {
      this.fpRig.group.visible = false;
      soundEngine.updateVehicleEngine(false, null, 0);
      this.camera.position.set(me.x, me.y + 3.5, me.z + 5.5);
      this.camera.lookAt(me.x, me.y + 0.5, me.z);
      return;
    }

    soundEngine.setListener(me.x, me.y + 1.6, me.z, me.yaw);

    // Reload timer
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) {
        this.reloadTimer = 0;
        const w = this.getActiveWeaponDef();
        if (this.activeSlot === 0) {
          const need = Math.min(w.magSize - this.magAmmo, this.reserveAmmo);
          this.magAmmo += need;
          this.reserveAmmo -= need;
        } else if (this.activeSlot === 1) {
          const need = Math.min(w.magSize - this.secondaryMag, this.secondaryReserve);
          this.secondaryMag += need;
          this.secondaryReserve -= need;
        }
      }
    }

    if (me.vehicleId) {
      this.updatePlayerInVehicle(me, dt, mapDef);
      return;
    }

    this.fpRig.group.visible = true;
    soundEngine.updateVehicleEngine(false, null, 0);

    // Movement Input
    let moveFwd = 0;
    let moveRight = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveFwd += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveFwd -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveRight -= 1;

    moveFwd -= this.touchMove.y;
    moveRight += this.touchMove.x;

    const len = Math.hypot(moveFwd, moveRight);
    if (len > 1) {
      moveFwd /= len;
      moveRight /= len;
    }

    const cDef = CLASSES[me.classId] || CLASSES.assault;
    const isAds = this.isAdsActive();
    const sprint = (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight')) && !isAds && !me.crouch && moveFwd > 0.2;
    const adrenalineMult = this.adrenalineTimer > 0 ? 1.24 : 1.0;
    const baseSpeed = 6.6 * cDef.speedMult * adrenalineMult * (me.crouch ? 0.58 : sprint ? 1.38 : isAds ? 0.72 : 1.0);

    const sinY = Math.sin(me.yaw);
    const cosY = Math.cos(me.yaw);
    const dirX = -sinY * moveFwd + cosY * moveRight;
    const dirZ = -cosY * moveFwd - sinY * moveRight;

    const nextX = me.x + dirX * baseSpeed * dt;
    const nextZ = me.z + dirZ * baseSpeed * dt;

    // Collide with static map obstacles & clamp to map bounds
    const half = mapDef.size * 0.47;
    let resolvedX = THREE.MathUtils.clamp(nextX, -half, half);
    let resolvedZ = THREE.MathUtils.clamp(nextZ, -half, half);

    if (this.builtMap) {
      for (const box of this.builtMap.colliders) {
        if (me.y + 0.6 < box.topY) {
          if (resolvedX > box.minX - 0.45 && resolvedX < box.maxX + 0.45 && resolvedZ > box.minZ - 0.45 && resolvedZ < box.maxZ + 0.45) {
            // Slide along nearest axis
            if (me.x <= box.minX - 0.4 || me.x >= box.maxX + 0.4) resolvedX = me.x;
            else resolvedZ = me.z;
          }
        }
      }
    }

    const stepDist = Math.hypot(resolvedX - me.x, resolvedZ - me.z);
    this.movedDistance += stepDist;
    me.x = resolvedX;
    me.z = resolvedZ;

    // Footstep Audio
    const groundY = getTerrainHeight(mapDef.id, me.x, me.z);
    const floorY = Math.max(mapDef.waterLevel - 0.5, groundY);
    if (this.keys.has('Space') && me.y <= floorY + 0.16) {
      me.vy = 6.8;
    }
    me.vy -= 18.5 * dt;
    me.y += me.vy * dt;
    if (me.y <= floorY) {
      me.y = floorY;
      me.vy = 0;
    }

    if (stepDist > 0.02 && me.y <= floorY + 0.15) {
      this.footstepTimer -= dt * (sprint ? 1.45 : 1.0);
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.36;
        soundEngine.playFootstep(me.y <= mapDef.waterLevel + 0.25 ? 'water' : 'dirt');
      }
    }

    // Camera + ADS Zoom + Recoil/Shake
    const eyeH = me.crouch ? 1.15 : 1.66;
    const shakeX = (Math.random() - 0.5) * this.cameraShake * 0.12;
    const shakeY = (Math.random() - 0.5) * this.cameraShake * 0.12;
    this.camera.position.set(me.x + shakeX, me.y + eyeH + shakeY, me.z);
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = me.yaw;
    this.camera.rotation.x = me.pitch;
    this.camera.rotation.z = 0;

    const w = this.getActiveWeaponDef();
    const targetFov = isAds ? this.settings.fov / (w?.adsZoom || 1.3) : this.settings.fov;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.damp(this.camera.fov, targetFov, 14, dt);
      this.camera.updateProjectionMatrix();
    }

    const isScoped = isAds && w?.model.scope === 'optic';
    this.fpRig.update(dt, stepDist / Math.max(0.001, dt), isAds, isScoped);

    // Firing check
    if (this.isFiringMouse || this.touchFire) {
      this.tryFireFootWeapon(me);
    }

    // Update Training Tutorial progression
    if (this.config?.mode === 'training') {
      if (this.tutorialStep === 0 && this.movedDistance > 6) this.tutorialStep = 1;
      else if (this.tutorialStep === 1 && this.dummiesHit >= 2) this.tutorialStep = 2;
      else if (this.tutorialStep === 2 && this.reloadedOnce) this.tutorialStep = 3;
      else if (this.tutorialStep === 3 && this.boardedVehicle) this.tutorialStep = 4;
    }
  }

  private updatePlayerInVehicle(me: LocalActor, dt: number, mapDef: typeof MAPS.ww1_trench): void {
    const v = this.vehicles.get(me.vehicleId!);
    if (!v || !v.alive) {
      me.vehicleId = null;
      return;
    }
    this.fpRig.group.visible = false;
    const def = VEHICLES[v.type];
    soundEngine.updateVehicleEngine(true, def.kind, v.speed / Math.max(1, def.maxSpeed));

    if (me.seatIdx === 0 && def.domain !== 'stationary') {
      let throttle = 0;
      let steer = 0;
      let altInput = 0;
      if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) throttle += 1;
      if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) throttle -= 1;
      if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) steer += 1;
      if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) steer -= 1;
      if (this.keys.has('Space')) altInput += 1;
      if (this.keys.has('KeyC')) altInput -= 1;

      throttle = THREE.MathUtils.clamp(throttle + this.touchVehicleControl.throttle, -1, 1);
      steer = THREE.MathUtils.clamp(steer + this.touchVehicleControl.steer, -1, 1);
      altInput = THREE.MathUtils.clamp(altInput + this.touchVehicleControl.pitch, -1, 1);

      if (def.domain === 'air') {
        const minSpd = def.minSpeed || 18;
        v.speed = THREE.MathUtils.clamp(v.speed + throttle * def.accel * dt, minSpd * 0.6, def.maxSpeed);
        if (v.y < getTerrainHeight(mapDef.id, v.x, v.z) + 3 && throttle > 0) {
          v.pitch = THREE.MathUtils.damp(v.pitch, 0.25, 4, dt);
        } else {
          v.pitch = THREE.MathUtils.clamp(v.pitch + altInput * 1.1 * dt, -0.75, 0.75);
        }
        v.rotY += steer * def.turnRate * dt;
        v.roll = THREE.MathUtils.damp(v.roll, steer * 0.55, 6, dt);

        const fx = -Math.sin(v.rotY) * Math.cos(v.pitch);
        const fy = Math.sin(v.pitch);
        const fz = -Math.cos(v.rotY) * Math.cos(v.pitch);
        v.x += fx * v.speed * dt;
        v.y += fy * v.speed * dt;
        v.z += fz * v.speed * dt;

        const floor = getTerrainHeight(mapDef.id, v.x, v.z) + 1.5;
        if (v.y < floor) {
          v.y = floor;
          v.pitch = Math.max(0, v.pitch);
        }
        v.y = Math.min(130, v.y);
      } else {
        // Land or Sea vehicle
        const targetSpd = throttle >= 0 ? throttle * def.maxSpeed : throttle * (def.reverseSpeed || 6);
        v.speed = THREE.MathUtils.damp(v.speed, targetSpd, 3.5, dt);
        const turnSign = v.speed >= -0.5 ? 1 : -1;
        v.rotY += steer * def.turnRate * turnSign * dt;

        const nextX = v.x - Math.sin(v.rotY) * v.speed * dt;
        const nextZ = v.z - Math.cos(v.rotY) * v.speed * dt;
        const half = mapDef.size * 0.48;
        const cx = THREE.MathUtils.clamp(nextX, -half, half);
        const cz = THREE.MathUtils.clamp(nextZ, -half, half);
        const gh = getTerrainHeight(mapDef.id, cx, cz);

        if (def.domain === 'sea') {
          if (gh < mapDef.waterLevel - 0.6) {
            v.x = cx;
            v.z = cz;
          } else {
            v.speed *= 0.2;
          }
          if (def.canSubmerge) {
            v.submergeDepth = THREE.MathUtils.clamp(v.submergeDepth - altInput * 3.0 * dt, 0, 6.5);
          }
          v.y = mapDef.waterLevel - v.submergeDepth;
        } else {
          if (gh >= mapDef.waterLevel - 0.6) {
            v.x = cx;
            v.z = cz;
            v.y = gh;
          } else {
            v.speed *= 0.2;
          }
        }
      }
      const half = mapDef.size * 0.48;
      v.x = THREE.MathUtils.clamp(v.x, -half, half);
      v.z = THREE.MathUtils.clamp(v.z, -half, half);
    }

    me.x = v.x;
    me.y = v.y;
    me.z = v.z;

    // 3rd-person chase / turret camera
    const camDist = def.kind === 'carrier' ? 44 : def.kind === 'ship' ? 28 : def.domain === 'air' ? 14 : 9.5;
    const camHeight = def.kind === 'carrier' ? 16 : def.kind === 'ship' ? 11 : def.domain === 'air' ? 4.2 : 4.4;
    const lookYaw = def.domain === 'air' ? v.rotY : me.yaw;
    this.camera.position.set(
      v.x + Math.sin(lookYaw) * camDist,
      v.y + camHeight - Math.sin(me.pitch) * 3.5,
      v.z + Math.cos(lookYaw) * camDist
    );
    this.camera.lookAt(v.x, v.y + def.height * 0.75, v.z);

    if (this.isFiringMouse || this.touchFire) {
      this.tryFireVehicleWeapon(me, v);
    }
  }

  private tryFireVehicleWeapon(me: LocalActor, v: LocalVehicle): void {
    const def = VEHICLES[v.type];
    const seat = def.seats[me.seatIdx];
    const w = (this.isAdsActive() && seat?.secondary) ? seat.secondary : seat?.weapon;
    if (!w) return;
    const now = performance.now();
    if (now - this.lastVehFireTime < (60 / w.fireRate) * 1000) return;
    this.lastVehFireTime = now;

    const aimYaw = def.domain === 'air' ? v.rotY : v.turretYaw;
    const aimPitch = def.domain === 'air' ? v.pitch : me.pitch * 0.5;
    const dx = -Math.sin(aimYaw) * Math.cos(aimPitch);
    const dy = Math.sin(aimPitch);
    const dz = -Math.cos(aimYaw) * Math.cos(aimPitch);

    const ox = v.x + dx * (def.radius + 0.8);
    const oy = v.y + def.height * 0.75;
    const oz = v.z + dz * (def.radius + 0.8);

    const dir = _v1.set(dx, dy, dz).normalize();
    this.vfx.spawnTracer(_v2.set(ox, oy, oz), dir, w.speed, false);
    soundEngine.playGunshot(WEAPONS_BY_ID[w.isExplosive ? 'ww2_launcher_bazooka' : 'ww2_mg_1919']);
    this.cameraShake = Math.max(this.cameraShake, w.isExplosive ? 0.32 : 0.08);

    if (this.config?.online && this.socket) {
      this.socket.emit(EVENTS.VEHICLE_FIRE, {
        ox, oy, oz, dx: dir.x, dy: dir.y, dz: dir.z,
        secondary: Boolean(this.isAdsActive() && seat?.secondary),
      });
    } else if (w.isExplosive) {
      this.spawnProjectile(me.id, me.team, w.name, ox, oy, oz, dir.x * w.speed, dir.y * w.speed, dir.z * w.speed, w.isBomb ? 18 : w.isTorpedo ? 0 : 4.5, w.damage, w.splash || 6, false, false);
    } else {
      this.resolveOfflineRayShot(me, ox, oy, oz, dir.x, dir.y, dir.z, w.damage, 260, w.name);
    }
  }

  private tryFireFootWeapon(me: LocalActor): void {
    if (this.reloadTimer > 0) return;
    const w = this.getActiveWeaponDef();
    if (!w) return;
    const now = performance.now();
    if (now - this.lastFireTime < (60 / w.fireRate) * 1000) return;

    if (this.activeSlot === 0) {
      if (this.magAmmo <= 0) {
        this.triggerReload();
        return;
      }
      this.magAmmo--;
    } else if (this.activeSlot === 1) {
      if (this.secondaryMag <= 0) {
        this.triggerReload();
        return;
      }
      this.secondaryMag--;
    } else {
      if (this.explosiveAmmo <= 0) return;
      this.explosiveAmmo--;
    }

    this.lastFireTime = now;
    soundEngine.playGunshot(w);
    this.fpRig.triggerFire(w.recoilY, w.reloadStyle === 'bolt');
    if (this.settings.haptics && navigator.vibrate) {
      navigator.vibrate(w.isLauncher ? 35 : 12);
    }

    // Calculate look direction with spread & optional subtle mobile aim assist
    const isAds = this.isAdsActive();
    let dir = _v1.set(0, 0, -1).applyEuler(this.camera.rotation).normalize();
    if (this.settings.aimAssist > 0) {
      let bestDot = 0.965;
      let aimTarget: THREE.Vector3 | null = null;
      for (const other of this.actors.values()) {
        if (!other.alive || other.team === me.team) continue;
        _v2.set(other.x - this.camera.position.x, other.y + 1.25 - this.camera.position.y, other.z - this.camera.position.z);
        const dist = _v2.length();
        if (dist > 75 || dist < 1) continue;
        _v2.divideScalar(dist);
        const d = dir.dot(_v2);
        if (d > bestDot) {
          bestDot = d;
          aimTarget = _v2.clone();
        }
      }
      if (aimTarget) {
        dir.lerp(aimTarget, this.settings.aimAssist * 0.45).normalize();
      }
    }

    const spread = isAds ? w.spreadAds : w.spreadHip;
    const pellets = w.pellets || 1;
    const ox = this.camera.position.x;
    const oy = this.camera.position.y;
    const oz = this.camera.position.z;

    for (let p = 0; p < pellets; p++) {
      const sx = dir.x + (Math.random() - 0.5) * spread;
      const sy = dir.y + (Math.random() - 0.5) * spread;
      const sz = dir.z + (Math.random() - 0.5) * spread;
      const sDir = _v3.set(sx, sy, sz).normalize();

      this.vfx.spawnTracer(_v2.set(ox + sDir.x * 0.9, oy - 0.1 + sDir.y * 0.9, oz + sDir.z * 0.9), sDir, w.projectileSpeed, w.isFlame);

      if (this.config?.online && this.socket) {
        this.socket.emit(EVENTS.PLAYER_SHOOT, {
          weaponId: w.id,
          ox, oy, oz,
          dx: sDir.x, dy: sDir.y, dz: sDir.z,
        });
      } else if (w.isGrenade || w.isLauncher || w.isMine) {
        this.spawnProjectile(
          me.id, me.team, w.id,
          ox + sDir.x * 0.9, oy - 0.1 + sDir.y * 0.9, oz + sDir.z * 0.9,
          sDir.x * w.projectileSpeed, sDir.y * w.projectileSpeed + (w.isGrenade ? 5.5 : 0), sDir.z * w.projectileSpeed,
          w.isGrenade ? 15 : w.isMine ? 18 : 2.5,
          w.damage, w.splashRadius || 5, w.isGas, w.isMine
        );
      } else {
        this.resolveOfflineRayShot(me, ox, oy, oz, sDir.x, sDir.y, sDir.z, w.damage, w.range, w.id, w.headshotMult);
      }
    }

    // Apply visible recoil kick to player aim
    me.pitch = THREE.MathUtils.clamp(me.pitch + w.recoilY * 0.0085, -1.35, 1.35);
    me.yaw += (Math.random() - 0.5) * w.recoilX * 0.006;
  }

  private resolveOfflineRayShot(
    attacker: LocalActor,
    ox: number, oy: number, oz: number,
    dx: number, dy: number, dz: number,
    damage: number,
    maxRange: number,
    weaponId: string,
    headshotMult = 1.8
  ): void {
    const mapId = this.config?.mapId || 'ww1_trench';
    let bestDist = maxRange;
    let hitActor: LocalActor | null = null;
    let hitVehicle: LocalVehicle | null = null;
    let hitHead = false;

    for (const other of this.actors.values()) {
      if (other.id === attacker.id || !other.alive || other.vehicleId) continue;
      if (this.config?.mode !== 'freeroam' && other.team === attacker.team) continue;
      const tx = other.x - ox;
      const ty = other.y + 0.9 - oy;
      const tz = other.z - oz;
      const proj = tx * dx + ty * dy + tz * dz;
      if (proj < 0 || proj > bestDist) continue;
      const cx = ox + dx * proj;
      const cy = oy + dy * proj;
      const cz = oz + dz * proj;
      const radial = Math.hypot(cx - other.x, cz - other.z);
      const hOff = cy - other.y;
      const maxH = other.crouch ? 1.35 : 1.85;
      if (radial < 0.7 && hOff >= -0.2 && hOff <= maxH) {
        bestDist = proj;
        hitActor = other;
        hitVehicle = null;
        hitHead = hOff > maxH - 0.38;
      }
    }

    for (const v of this.vehicles.values()) {
      if (!v.alive) continue;
      const def = VEHICLES[v.type];
      const tx = v.x - ox;
      const ty = v.y + def.height * 0.5 - oy;
      const tz = v.z - oz;
      const proj = tx * dx + ty * dy + tz * dz;
      if (proj < 0 || proj > bestDist) continue;
      const cx = ox + dx * proj;
      const cy = oy + dy * proj;
      const cz = oz + dz * proj;
      if (Math.hypot(cx - v.x, cz - v.z) < def.radius && Math.abs(cy - (v.y + def.height * 0.5)) < def.height * 0.8) {
        bestDist = proj;
        hitVehicle = v;
        hitActor = null;
      }
    }

    // Training Range Dummies
    if (this.builtMap) {
      for (const dum of this.builtMap.dummies) {
        if (dum.downTimer > 0) continue;
        const tx = dum.mesh.position.x - ox;
        const ty = dum.mesh.position.y + 1.0 - oy;
        const tz = dum.mesh.position.z - oz;
        const proj = tx * dx + ty * dy + tz * dz;
        if (proj < 0 || proj > bestDist) continue;
        const cx = ox + dx * proj;
        const cy = oy + dy * proj;
        const cz = oz + dz * proj;
        if (Math.hypot(cx - dum.mesh.position.x, cz - dum.mesh.position.z) < 0.6 && cy >= dum.mesh.position.y && cy <= dum.mesh.position.y + 2.0) {
          dum.hp -= damage;
          this.vfx.spawnImpact(new THREE.Vector3(cx, cy, cz), 'dirt');
          if (attacker.id === this.localId) {
            this.hitMarkerType = cy > dum.mesh.position.y + 1.45 ? 'headshot' : 'normal';
            this.hitMarkerTimer = 0.18;
            soundEngine.playHitMarker(this.hitMarkerType === 'headshot');
            if (dum.hp <= 0) {
              dum.downTimer = 3.5;
              this.dummiesHit++;
            }
          }
          return;
        }
      }
    }

    // Terrain hit check
    for (let d = 2; d < bestDist; d += 2.5) {
      const sx = ox + dx * d;
      const sy = oy + dy * d;
      const sz = oz + dz * d;
      const th = getTerrainHeight(mapId, sx, sz);
      if (sy <= th) {
        this.vfx.spawnImpact(new THREE.Vector3(sx, th, sz), 'dirt');
        soundEngine.playImpact('dirt', { x: sx, y: th, z: sz });
        return;
      }
    }

    if (hitActor) {
      const dmg = damage * (hitHead ? headshotMult : 1);
      this.vfx.spawnImpact(new THREE.Vector3(ox + dx * bestDist, oy + dy * bestDist, oz + dz * bestDist), 'blood');
      this.damageLocalActor(hitActor, dmg, attacker, weaponId, hitHead);
      if (attacker.id === this.localId) {
        this.hitMarkerType = hitHead ? 'headshot' : 'normal';
        this.hitMarkerTimer = 0.18;
        soundEngine.playHitMarker(hitHead);
        if (hitHead) this.callbacks.onProgressionEvent('headshot');
      }
    } else if (hitVehicle) {
      this.vfx.spawnImpact(new THREE.Vector3(ox + dx * bestDist, oy + dy * bestDist, oz + dz * bestDist), 'metal');
      soundEngine.playImpact('metal', { x: hitVehicle.x, y: hitVehicle.y + 1, z: hitVehicle.z });
      this.damageLocalVehicle(hitVehicle, damage * 0.22, attacker, weaponId);
      if (attacker.id === this.localId) {
        this.hitMarkerType = 'normal';
        this.hitMarkerTimer = 0.15;
        soundEngine.playHitMarker(false);
      }
    }
  }

  private damageLocalActor(target: LocalActor, amount: number, attacker: LocalActor | null, weaponId: string, headshot: boolean): void {
    if (!target.alive) return;
    target.hp -= amount;
    if (target.id === this.localId) {
      this.damageFlash = 0.75;
      this.cameraShake = Math.max(this.cameraShake, 0.25);
    }
    if (target.hp <= 0) {
      if (!target.downed && amount < 180) {
        target.downed = true;
        target.hp = 25;
        target.downedTimer = 9.0;
        return;
      }
      this.killLocalActor(target, attacker, weaponId, headshot);
    }
  }

  private killLocalActor(target: LocalActor, attacker: LocalActor | null, weaponId: string, headshot: boolean): void {
    if (!target.alive) return;
    target.alive = false;
    target.downed = false;
    target.hp = 0;
    target.deaths++;
    target.respawnTimer = 4.0;
    if (target.vehicleId) this.exitLocalVehicle(target);
    if (attacker && attacker.id !== target.id) {
      attacker.kills++;
      attacker.score += headshot ? 150 : 100;
      if (attacker.id === this.localId) this.callbacks.onProgressionEvent('kill');
    }
    if (this.config?.mode !== 'freeroam' && this.config?.mode !== 'training') {
      this.tickets[target.team] = Math.max(0, this.tickets[target.team] - 1);
    }
    this.callbacks.onKillFeed({
      id: `${Date.now()}_${Math.random()}`,
      killerName: attacker?.name || 'Battlefield',
      killerTeam: attacker?.team || 0,
      victimName: target.name,
      victimTeam: target.team,
      weapon: WEAPONS_BY_ID[weaponId]?.name || weaponId,
      headshot,
      ts: Date.now(),
    });
  }

  private damageLocalVehicle(v: LocalVehicle, amount: number, attacker: LocalActor | null, weaponId: string): void {
    if (!v.alive) return;
    v.hp -= amount;
    if (v.hp <= 0) {
      v.hp = 0;
      v.alive = false;
      v.respawnTimer = VEHICLES[v.type].respawnTime;
      this.vfx.spawnExplosion(new THREE.Vector3(v.x, v.y + 1.5, v.z), 10);
      soundEngine.playExplosion({ x: v.x, y: v.y, z: v.z }, 1.2);
      for (let i = 0; i < v.seats.length; i++) {
        const occId = v.seats[i];
        v.seats[i] = null;
        if (occId) {
          const occ = this.actors.get(occId);
          if (occ) {
            occ.vehicleId = null;
            occ.seatIdx = -1;
            this.killLocalActor(occ, attacker, weaponId, false);
          }
        }
      }
      if (attacker) {
        attacker.score += 250;
        if (attacker.id === this.localId) this.callbacks.onProgressionEvent('vehicle');
      }
      this.callbacks.onKillFeed({
        id: `${Date.now()}_${Math.random()}`,
        killerName: attacker?.name || 'Ordnance',
        killerTeam: attacker?.team || 0,
        victimName: VEHICLES[v.type].name,
        victimTeam: v.team,
        weapon: WEAPONS_BY_ID[weaponId]?.name || weaponId,
        headshot: false,
        isVehicle: true,
        ts: Date.now(),
      });
    }
  }

  private spawnProjectile(
    ownerId: string, team: number, weaponId: string,
    x: number, y: number, z: number,
    vx: number, vy: number, vz: number,
    gravity: number, damage: number, splash: number,
    isGas: boolean, isMine: boolean
  ): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(isMine ? 0.16 : 0.12, 8, 6),
      new THREE.MeshStandardMaterial({ color: isGas ? '#a8b03c' : '#2d3136', emissive: isMine ? '#000000' : '#ff6600', emissiveIntensity: isMine ? 0 : 0.4 })
    );
    mesh.position.set(x, y, z);
    this.scene.add(mesh);
    this.projectiles.push({
      ownerId, team, weaponId, x, y, z, vx, vy, vz, gravity, damage, splash, isGas, isMine,
      ttl: isMine ? 60 : 3.2,
      mesh,
    });
  }

  private updateProjectiles(dt: number, mapId: string): void {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.ttl -= dt;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.mesh.position.set(p.x, p.y, p.z);

      const g = getTerrainHeight(mapId, p.x, p.z);
      if (p.isMine) {
        if (p.y <= g + 0.1) {
          p.y = g + 0.1;
          p.vx = 0; p.vy = 0; p.vz = 0; p.gravity = 0;
        }
        let trip = false;
        for (const a of this.actors.values()) {
          if (a.alive && a.team !== p.team && Math.hypot(a.x - p.x, a.z - p.z) < 2.2) { trip = true; break; }
        }
        if (!trip) {
          for (const v of this.vehicles.values()) {
            if (v.alive && v.team !== p.team && Math.hypot(v.x - p.x, v.z - p.z) < VEHICLES[v.type].radius + 0.8) { trip = true; break; }
          }
        }
        if (trip || p.ttl <= 0) {
          if (trip) this.explodeOffline(p);
          this.scene.remove(p.mesh);
          this.projectiles.splice(i, 1);
        }
        continue;
      }

      if (p.y <= g || p.ttl <= 0) {
        this.explodeOffline(p);
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  private explodeOffline(p: LocalProjectile): void {
    const owner = this.actors.get(p.ownerId) || null;
    if (p.isGas) {
      const gm = new THREE.Mesh(
        new THREE.SphereGeometry(p.splash, 12, 10),
        new THREE.MeshBasicMaterial({ color: '#9ca832', transparent: true, opacity: 0.28, depthWrite: false })
      );
      gm.position.set(p.x, p.y + 1.5, p.z);
      this.builtMap?.gasGroup.add(gm);
      this.gasClouds.push({ x: p.x, y: p.y, z: p.z, radius: p.splash, ttl: 15, mesh: gm });
      return;
    }
    this.vfx.spawnExplosion(new THREE.Vector3(p.x, p.y, p.z), p.splash);
    soundEngine.playExplosion({ x: p.x, y: p.y, z: p.z }, p.splash / 6);
    for (const a of this.actors.values()) {
      if (!a.alive || a.vehicleId) continue;
      const d = Math.hypot(a.x - p.x, a.y + 0.8 - p.y, a.z - p.z);
      if (d < p.splash) {
        this.damageLocalActor(a, p.damage * (1 - d / p.splash), owner, p.weaponId, false);
      }
    }
    for (const v of this.vehicles.values()) {
      if (!v.alive) continue;
      const d = Math.max(0, Math.hypot(v.x - p.x, v.z - p.z) - VEHICLES[v.type].radius * 0.5);
      if (d < p.splash) {
        this.damageLocalVehicle(v, p.damage * (1 - d / p.splash), owner, p.weaponId);
      }
    }
  }

  private tickOfflineSimulation(dt: number, mapDef: typeof MAPS.ww1_trench): void {
    if (this.winner !== 0) return;
    this.roundTime = Math.max(0, this.roundTime - dt);

    // WW1 Gas Attack cycle
    if (mapDef.hasGasAttack && this.config?.mode !== 'training') {
      this.gasCycleTimer -= dt;
      if (this.gasCycleTimer <= 0) {
        this.gasActive = !this.gasActive;
        this.gasCycleTimer = this.gasActive ? 22 : 50;
        if (this.gasActive) {
          soundEngine.playGasSiren();
          [-18, 18].forEach((gx) => {
            const gm = new THREE.Mesh(
              new THREE.SphereGeometry(20, 14, 10),
              new THREE.MeshBasicMaterial({ color: '#9ca832', transparent: true, opacity: 0.28, depthWrite: false })
            );
            gm.position.set(gx, getTerrainHeight(mapDef.id, gx, 0) + 2, 0);
            this.builtMap?.gasGroup.add(gm);
            this.gasClouds.push({ x: gx, y: 0, z: 0, radius: 20, ttl: 22, mesh: gm });
          });
        }
      }
    }

    for (let i = this.gasClouds.length - 1; i >= 0; i--) {
      const g = this.gasClouds[i];
      g.ttl -= dt;
      g.x += Math.sin(performance.now() * 0.0005 + i) * 1.1 * dt;
      g.mesh.position.x = g.x;
      for (const a of this.actors.values()) {
        if (a.alive && !a.downed && !a.gasMask && !a.vehicleId && Math.hypot(a.x - g.x, a.z - g.z) < g.radius) {
          this.damageLocalActor(a, 14 * dt, null, 'Mustard Gas', false);
        }
      }
      if (g.ttl <= 0) {
        this.builtMap?.gasGroup.remove(g.mesh);
        this.gasClouds.splice(i, 1);
      }
    }

    // Update Actors & Bots
    const all = [...this.actors.values()];
    for (const a of all) {
      if (!a.alive) {
        a.respawnTimer -= dt;
        if (a.respawnTimer <= 0) {
          const spList = mapDef.spawns[a.team];
          const sp = spList[Math.floor(Math.random() * spList.length)];
          a.x = sp[0] + (Math.random() - 0.5) * 6;
          a.z = sp[1] + (Math.random() - 0.5) * 6;
          a.y = Math.max(mapDef.waterLevel + 0.3, getTerrainHeight(mapDef.id, a.x, a.z));
          a.hp = a.maxHp;
          a.alive = true;
          a.downed = false;
          if (a.id === this.localId) {
            const pDef = WEAPONS_BY_ID[this.loadout.primaryId];
            if (pDef) { this.magAmmo = pDef.magSize; this.reserveAmmo = pDef.reserveMax; }
          }
        }
        continue;
      }
      if (a.downed) {
        a.downedTimer -= dt;
        if (a.downedTimer <= 0) this.killLocalActor(a, null, 'Bleedout', false);
        continue;
      }
      if (a.isBot) {
        a.gasMask = this.gasActive;
        let enemy: LocalActor | null = null;
        let minD = 75;
        for (const other of all) {
          if (other.alive && !other.downed && other.team !== a.team && !other.vehicleId) {
            const d = Math.hypot(other.x - a.x, other.z - a.z);
            if (d < minD) { minD = d; enemy = other; }
          }
        }
        if (enemy && this.config?.mode !== 'training') {
          const dx = enemy.x - a.x;
          const dz = enemy.z - a.z;
          a.yaw = Math.atan2(-dx, -dz);
          if (minD > 18) {
            a.x += (dx / minD) * 4.2 * dt;
            a.z += (dz / minD) * 4.2 * dt;
          }
          const now = performance.now();
          if (now - a.lastShotAt > 750 + Math.random() * 600) {
            a.lastShotAt = now;
            const dy = enemy.y + 1.2 - (a.y + 1.45);
            const l = Math.hypot(dx, dy, dz) || 1;
            const w = WEAPONS_BY_ID[a.activeWeaponId] || WEAPONS_BY_ID.ww2_rifle_garand;
            const sdx = dx / l + (Math.random() - 0.5) * 0.1;
            const sdy = dy / l + (Math.random() - 0.5) * 0.06;
            const sdz = dz / l + (Math.random() - 0.5) * 0.1;
            this.vfx.spawnTracer(new THREE.Vector3(a.x, a.y + 1.45, a.z), new THREE.Vector3(sdx, sdy, sdz), 220, false);
            soundEngine.playGunshot(w, { x: a.x, y: a.y + 1.4, z: a.z });
            if (enemy.id === this.localId && Math.hypot(enemy.x - a.x, enemy.z - a.z) < 40) {
              soundEngine.playWhizzBy({ x: a.x, y: a.y + 1.4, z: a.z });
            }
            this.resolveOfflineRayShot(a, a.x, a.y + 1.45, a.z, sdx, sdy, sdz, w.damage * 0.45, w.range, w.id, 1.4);
          }
        } else if (this.capturePoints.length > 0 && this.config?.mode !== 'training') {
          const cp = this.capturePoints[a.targetCp % this.capturePoints.length];
          const dx = cp.x - a.x;
          const dz = cp.z - a.z;
          const d = Math.hypot(dx, dz);
          if (d > 6) {
            a.yaw = Math.atan2(-dx, -dz);
            a.x += (dx / d) * 4.5 * dt;
            a.z += (dz / d) * 4.5 * dt;
          } else {
            a.targetCp = (a.targetCp + 1) % this.capturePoints.length;
          }
        }
        a.y = Math.max(mapDef.waterLevel + 0.2, getTerrainHeight(mapDef.id, a.x, a.z));
      }
    }

    // Vehicle respawns
    for (const v of this.vehicles.values()) {
      if (!v.alive) {
        v.respawnTimer -= dt;
        if (v.respawnTimer <= 0) {
          v.alive = true;
          v.hp = v.maxHp;
          v.x = v.spawn.x; v.y = v.spawn.y; v.z = v.spawn.z; v.rotY = v.spawn.rotY;
          v.speed = 0; v.pitch = 0; v.roll = 0;
        }
      }
    }

    // Conquest Capture Logic
    if (this.config?.mode === 'conquest') {
      let t1 = 0; let t2 = 0;
      for (const cp of this.capturePoints) {
        let bal = 0;
        for (const a of all) {
          if (a.alive && !a.downed && Math.hypot(a.x - cp.x, a.z - cp.z) < 14) {
            bal += a.team === 1 ? 1 : -1;
          }
        }
        if (bal !== 0) {
          const prevOwner = cp.owner;
          cp.progress = THREE.MathUtils.clamp(cp.progress + Math.sign(bal) * 14 * dt, -100, 100);
          if (cp.progress >= 70) cp.owner = 1;
          else if (cp.progress <= -70) cp.owner = 2;
          else if (Math.abs(cp.progress) < 15) cp.owner = 0;
          if (prevOwner !== 1 && cp.owner === 1) {
            const me = this.actors.get(this.localId);
            if (me && Math.hypot(me.x - cp.x, me.z - cp.z) < 16) this.callbacks.onProgressionEvent('capture');
          }
        }
        if (cp.owner === 1) t1++;
        if (cp.owner === 2) t2++;
      }
      if (t1 > t2) this.tickets[2] = Math.max(0, this.tickets[2] - (t1 - t2) * 0.45 * dt);
      if (t2 > t1) this.tickets[1] = Math.max(0, this.tickets[1] - (t2 - t1) * 0.45 * dt);
    }

    if (this.config?.mode !== 'freeroam' && this.config?.mode !== 'training') {
      if (this.tickets[1] <= 0) this.winner = 2;
      else if (this.tickets[2] <= 0) this.winner = 1;
      else if (this.roundTime <= 0) this.winner = this.tickets[1] >= this.tickets[2] ? 1 : 2;
    }
  }

  private syncSoldierVisuals(dt: number): void {
    const activeIds = new Set<string>();
    for (const a of this.actors.values()) {
      if (a.id === this.localId || a.vehicleId) continue;
      activeIds.add(a.id);
      let rig = this.soldierRigs.get(a.id);
      if (!rig) {
        rig = createSoldierRig(a.team, a.classId, a.outfitId, this.config?.era || 'ww2');
        this.scene.add(rig.root);
        this.soldierRigs.set(a.id, rig);
      }
      setSoldierWeapon(rig, a.activeWeaponId);
      const distMoved = Math.hypot(a.x - rig.root.position.x, a.z - rig.root.position.z);
      const speed = distMoved / Math.max(0.001, dt);
      rig.root.position.set(a.x, a.y, a.z);
      rig.root.rotation.y = a.yaw;
      animateSoldierRig(rig, dt, speed, a.crouch, a.pitch, a.alive, a.downed, a.gasMask);
    }
    for (const [id, rig] of this.soldierRigs.entries()) {
      if (!activeIds.has(id)) {
        this.scene.remove(rig.root);
        this.soldierRigs.delete(id);
      }
    }
  }

  private syncVehicleVisuals(dt: number): void {
    for (const v of this.vehicles.values()) {
      v.visual.root.visible = v.alive;
      if (!v.alive) continue;
      v.visual.root.position.set(v.x, v.y, v.z);
      v.visual.root.rotation.set(v.pitch, v.rotY, v.roll);
      if (v.visual.turret) {
        v.visual.turret.rotation.y = v.turretYaw - v.rotY;
      }
      v.visual.wheels.forEach((w) => {
        w.rotation.x -= v.speed * dt * 1.4;
      });
      v.visual.propellers.forEach((p) => {
        p.rotation.z += dt * 28;
      });
    }
  }

  private emitHudTelemetry(): void {
    const me = this.actors.get(this.localId);
    const w = this.getActiveWeaponDef();
    const mapDef = MAPS[this.config?.mapId || 'ww1_trench'] || MAPS.ww1_trench;
    const isAds = this.isAdsActive();

    let interactPrompt: string | null = null;
    let reviveTargetId: string | null = null;
    if (me && me.alive && !me.downed) {
      if (me.vehicleId) {
        interactPrompt = 'exit';
      } else {
        for (const other of this.actors.values()) {
          if (other.id !== me.id && other.alive && other.downed && other.team === me.team && Math.hypot(other.x - me.x, other.z - me.z) < 4.2) {
            interactPrompt = 'revive';
            reviveTargetId = other.id;
            break;
          }
        }
        if (!interactPrompt) {
          for (const v of this.vehicles.values()) {
            if (v.alive && Math.hypot(v.x - me.x, v.z - me.z) - VEHICLES[v.type].radius * 0.4 < 8.5) {
              interactPrompt = `vehicle:${VEHICLES[v.type].name}`;
              break;
            }
          }
        }
      }
    }

    const v = me?.vehicleId ? this.vehicles.get(me.vehicleId) : null;
    const vDef = v ? VEHICLES[v.type] : null;
    const inGas = Boolean(me && this.gasClouds.some((g) => Math.hypot(me.x - g.x, me.z - g.z) < g.radius));

    const blips: MinimapBlip[] = [];
    for (const cp of this.capturePoints) {
      blips.push({ x: cp.x, z: cp.z, kind: 'cp', owner: cp.owner, label: cp.id });
    }
    const radarRadius = this.reconFlareTimer > 0 ? 180 : 65;
    for (const a of this.actors.values()) {
      if (!a.alive || a.id === this.localId) continue;
      if (a.team === (me?.team || 1)) blips.push({ x: a.x, z: a.z, kind: 'ally' });
      else if (me && Math.hypot(a.x - me.x, a.z - me.z) < radarRadius) blips.push({ x: a.x, z: a.z, kind: 'enemy' });
    }
    for (const veh of this.vehicles.values()) {
      if (veh.alive) blips.push({ x: veh.x, z: veh.z, kind: 'vehicle', owner: veh.team });
    }
    for (const g of this.gasClouds) {
      blips.push({ x: g.x, z: g.z, kind: 'gas' });
    }

    const tutorials = [
      'STEP 1/4: Move around using WASD or the Left Joystick.',
      'STEP 2/4: Aim (Right-Click / ADS) and eliminate 2 Target Dummies downrange.',
      'STEP 3/4: Press [R] (or Reload button) to reload your weapon.',
      'STEP 4/4: Walk up to any Tank, Jeep, or Aircraft and press [E] to pilot it!',
      'TRAINING COMPLETE: All weapons & vehicles are unlocked to test freely.',
    ];

    this.callbacks.onHudUpdate({
      hp: Math.max(0, Math.round(me?.hp ?? 100)),
      maxHp: me?.maxHp ?? 100,
      ammoMag: this.activeSlot === 0 ? this.magAmmo : this.activeSlot === 1 ? this.secondaryMag : this.explosiveAmmo,
      ammoReserve: this.activeSlot === 0 ? this.reserveAmmo : this.activeSlot === 1 ? this.secondaryReserve : 0,
      weaponName: w?.name || 'Rifle',
      weaponCategory: w?.category || 'rifle',
      isReloading: this.reloadTimer > 0,
      isAds,
      isScoped: isAds && w?.model.scope === 'optic',
      gasActive: this.gasActive,
      inGas,
      gasMaskOn: Boolean(me?.gasMask),
      downed: Boolean(me?.downed),
      respawnTimer: Math.max(0, Math.ceil(me?.respawnTimer ?? 0)),
      tickets1: Math.round(this.tickets[1]),
      tickets2: Math.round(this.tickets[2]),
      roundTime: Math.round(this.roundTime),
      winner: this.winner,
      playerTeam: me?.team || 1,
      vehicleName: vDef?.name || null,
      vehicleHp: Math.round(v?.hp ?? 0),
      vehicleMaxHp: v?.maxHp ?? 0,
      vehicleDomain: vDef?.domain || null,
      vehicleSpeed: Math.round(Math.abs(v?.speed ?? 0) * 3.6),
      vehicleSeatLabel: vDef && me ? (vDef.seats[me.seatIdx]?.label || null) : null,
      vehicleCanSubmerge: Boolean(vDef?.canSubmerge),
      submerged: (v?.submergeDepth ?? 0) > 1.2,
      interactPrompt,
      reviveTargetId,
      hitMarker: this.hitMarkerType,
      damageFlash: this.damageFlash,
      fps: this.currentFps,
      ping: this.currentPing,
      mapSize: mapDef.size,
      playerX: me?.x ?? 0,
      playerZ: me?.z ?? 0,
      playerYaw: me?.yaw ?? 0,
      blips,
      scoreboard: [...this.actors.values()]
        .sort((a, b) => b.score - a.score)
        .map((a) => ({ id: a.id, name: a.name, team: a.team, kills: a.kills, deaths: a.deaths, score: a.score, isBot: a.isBot })),
      tutorialStep: this.tutorialStep,
      tutorialText: tutorials[this.tutorialStep] || tutorials[4],
      gadgetCooldown: Math.ceil(this.gadgetCooldown),
      gadgetLabel: (CLASSES[me?.classId || this.loadout.classId] || CLASSES.assault).gadgetLabel,
    });
  }

  public cleanupMatch(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    if (this.builtMap) {
      this.builtMap.dispose();
      this.builtMap = null;
    }
    this.soldierRigs.forEach((r) => this.scene.remove(r.root));
    this.soldierRigs.clear();
    this.vehicles.forEach((v) => this.scene.remove(v.visual.root));
    this.vehicles.clear();
    this.projectiles.forEach((p) => this.scene.remove(p.mesh));
    this.projectiles = [];
    this.gasClouds = [];
    this.actors.clear();
    this.vfx.dispose();
    soundEngine.updateVehicleEngine(false, null, 0);
  }

  public dispose(): void {
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.cleanupMatch();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
