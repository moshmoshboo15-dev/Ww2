import type { Era } from '../shared/weapons';
import type { LanguageCode } from '../shared/i18n';

export type GraphicsPreset = 'low' | 'medium' | 'high' | 'auto';
export type CrosshairStyle = 'cross' | 'dot' | 'chevron' | 'circle';

export interface HUDButtonPos {
  xPct: number; // 0..100 from left
  yPct: number; // 0..100 from top
  scale: number;
}

export interface HUDLayout {
  joystick: HUDButtonPos;
  fire: HUDButtonPos;
  ads: HUDButtonPos;
  reload: HUDButtonPos;
  jump: HUDButtonPos;
  crouch: HUDButtonPos;
  swap: HUDButtonPos;
  grenade: HUDButtonPos;
  interact: HUDButtonPos;
  gasMask: HUDButtonPos;
}

export interface GameSettings {
  graphicsPreset: GraphicsPreset;
  resolutionScale: number; // 50..100
  fpsCap: 30 | 45 | 60 | 90 | 120;
  shadows: boolean;
  drawDistance: number; // 120..420
  antiAliasing: boolean;
  showFpsPing: boolean;
  sensHip: number;
  sensAds: number;
  sensScope: number;
  sensVehicle: number;
  sensAircraft: number;
  invertY: boolean;
  aimAssist: number; // 0..1
  joystickSize: number; // 0.7..1.5
  joystickOpacity: number; // 0.25..1.0
  forceTouchControls: boolean;
  haptics: boolean;
  masterVol: number;
  sfxVol: number;
  musicVol: number;
  voiceVol: number;
  fov: number; // 60..105
  crosshairStyle: CrosshairStyle;
  crosshairColor: string;
  language: LanguageCode;
  hudLayout: HUDLayout;
}

export interface PlayerLoadout {
  playerName: string;
  era: Era;
  classId: 'assault' | 'medic' | 'support' | 'scout' | 'anti_armor';
  primaryId: string;
  secondaryId: string;
  explosiveId: string;
  skinId: string;
  outfitId: string;
}

export interface ProgressionData {
  xp: number;
  stats: {
    kills: number;
    headshots: number;
    captures: number;
    vehiclesDestroyed: number;
    revives: number;
  };
  claimedChallenges: string[];
}

export interface MatchLaunchConfig {
  mode: 'conquest' | 'tdm' | 'freeroam' | 'training';
  mapId: string;
  era: Era;
  timeOfDay: 'noon' | 'dawn' | 'dusk' | 'overcast';
  botCount: number;
  online: boolean;
  serverUrl?: string;
  roomId?: string;
}

export interface KillFeedItem {
  id: string;
  killerName: string;
  killerTeam: number;
  victimName: string;
  victimTeam: number;
  weapon: string;
  headshot: boolean;
  isVehicle?: boolean;
  ts: number;
}

export interface ChatMessage {
  id: string;
  sender: string;
  team: number;
  text: string;
  ts: number;
}

export interface MinimapBlip {
  x: number;
  z: number;
  kind: 'ally' | 'enemy' | 'vehicle' | 'cp' | 'gas';
  owner?: number;
  label?: string;
  yaw?: number;
}

export interface HUDTelemetry {
  hp: number;
  maxHp: number;
  ammoMag: number;
  ammoReserve: number;
  weaponName: string;
  weaponCategory: string;
  isReloading: boolean;
  isAds: boolean;
  isScoped: boolean;
  gasActive: boolean;
  inGas: boolean;
  gasMaskOn: boolean;
  downed: boolean;
  respawnTimer: number;
  tickets1: number;
  tickets2: number;
  roundTime: number;
  winner: number;
  playerTeam: number;
  vehicleName: string | null;
  vehicleHp: number;
  vehicleMaxHp: number;
  vehicleDomain: 'land' | 'air' | 'sea' | 'stationary' | null;
  vehicleSpeed: number;
  vehicleSeatLabel: string | null;
  vehicleCanSubmerge: boolean;
  submerged: boolean;
  interactPrompt: string | null;
  reviveTargetId: string | null;
  hitMarker: 'none' | 'normal' | 'headshot';
  damageFlash: number;
  fps: number;
  ping: number;
  mapSize: number;
  playerX: number;
  playerZ: number;
  playerYaw: number;
  blips: MinimapBlip[];
  scoreboard: { id: string; name: string; team: number; kills: number; deaths: number; score: number; isBot: boolean }[];
  tutorialStep: number; // 0..4 for Training Range
  tutorialText: string;
  gadgetCooldown: number;
  gadgetLabel: string;
}

