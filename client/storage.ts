import type { GameSettings, HUDLayout, PlayerLoadout, ProgressionData } from './types';

const SETTINGS_KEY = 'ashfront_settings_v1';
const LOADOUT_KEY = 'ashfront_loadout_v1';
const PROGRESSION_KEY = 'ashfront_progression_v1';
const SERVERS_KEY = 'ashfront_recent_servers_v1';

export const DEFAULT_HUD_LAYOUT: HUDLayout = {
  joystick: { xPct: 14, yPct: 72, scale: 1 },
  fire: { xPct: 86, yPct: 68, scale: 1.15 },
  ads: { xPct: 75, yPct: 58, scale: 0.95 },
  reload: { xPct: 74, yPct: 78, scale: 0.9 },
  jump: { xPct: 88, yPct: 46, scale: 0.9 },
  crouch: { xPct: 77, yPct: 88, scale: 0.85 },
  swap: { xPct: 64, yPct: 85, scale: 0.85 },
  grenade: { xPct: 64, yPct: 68, scale: 0.85 },
  interact: { xPct: 50, yPct: 74, scale: 0.95 },
  gasMask: { xPct: 28, yPct: 84, scale: 0.85 },
};

export const DEFAULT_SETTINGS: GameSettings = {
  graphicsPreset: 'auto',
  resolutionScale: 85,
  fpsCap: 60,
  shadows: true,
  drawDistance: 280,
  antiAliasing: true,
  showFpsPing: true,
  sensHip: 1.0,
  sensAds: 0.65,
  sensScope: 0.35,
  sensVehicle: 1.0,
  sensAircraft: 1.1,
  invertY: false,
  aimAssist: 0.55,
  joystickSize: 1.0,
  joystickOpacity: 0.72,
  forceTouchControls: false,
  haptics: true,
  masterVol: 0.8,
  sfxVol: 0.9,
  musicVol: 0.45,
  voiceVol: 0.8,
  fov: 75,
  crosshairStyle: 'cross',
  crosshairColor: '#f5f2eb',
  language: 'en',
  hudLayout: DEFAULT_HUD_LAYOUT,
};

export const DEFAULT_LOADOUT: PlayerLoadout = {
  playerName: 'Vanguard',
  era: 'ww2',
  classId: 'assault',
  primaryId: 'ww2_smg_typewriter',
  secondaryId: 'ww2_pistol_m45',
  explosiveId: 'ww2_grenade_pineapple',
  skinId: 'standard',
  outfitId: 'standard',
};

export const DEFAULT_PROGRESSION: ProgressionData = {
  xp: 0,
  stats: {
    kills: 0,
    headshots: 0,
    captures: 0,
    vehiclesDestroyed: 0,
    revives: 0,
  },
  claimedChallenges: [],
};

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return structuredClone(DEFAULT_SETTINGS);
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      hudLayout: { ...DEFAULT_HUD_LAYOUT, ...(parsed.hudLayout || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_SETTINGS);
  }
}

export function saveSettings(s: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore storage quota errors
  }
}

export function loadLoadout(): PlayerLoadout {
  try {
    const raw = localStorage.getItem(LOADOUT_KEY);
    if (!raw) return structuredClone(DEFAULT_LOADOUT);
    return { ...DEFAULT_LOADOUT, ...JSON.parse(raw) };
  } catch {
    return structuredClone(DEFAULT_LOADOUT);
  }
}

export function saveLoadout(l: PlayerLoadout): void {
  try {
    localStorage.setItem(LOADOUT_KEY, JSON.stringify(l));
  } catch {
    // ignore
  }
}

export function loadProgression(): ProgressionData {
  try {
    const raw = localStorage.getItem(PROGRESSION_KEY);
    if (!raw) return structuredClone(DEFAULT_PROGRESSION);
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PROGRESSION,
      ...parsed,
      stats: { ...DEFAULT_PROGRESSION.stats, ...(parsed.stats || {}) },
    };
  } catch {
    return structuredClone(DEFAULT_PROGRESSION);
  }
}

export function saveProgression(p: ProgressionData): void {
  try {
    localStorage.setItem(PROGRESSION_KEY, JSON.stringify(p));
  } catch {
    // ignore
  }
}

export function loadRecentServers(): string[] {
  try {
    const raw = localStorage.getItem(SERVERS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function rememberServer(addr: string): string[] {
  const clean = addr.trim();
  if (!clean) return loadRecentServers();
  const prev = loadRecentServers().filter((s) => s !== clean);
  const next = [clean, ...prev].slice(0, 5);
  try {
    localStorage.setItem(SERVERS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}
