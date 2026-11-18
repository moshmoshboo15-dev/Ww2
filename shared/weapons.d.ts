export type Era = 'ww1' | 'ww2';
export type WeaponCategory =
  | 'pistol'
  | 'rifle'
  | 'smg'
  | 'mg'
  | 'shotgun'
  | 'sniper'
  | 'grenade'
  | 'launcher'
  | 'mine'
  | 'flamethrower';

export interface WeaponSkin {
  id: string;
  name: string;
  unlockLevel: number;
  colorTint: string;
  metalColor: string;
  woodColor: string;
  roughness: number;
  metalness: number;
  camo: string;
}

export interface WeaponDef {
  id: string;
  name: string;
  era: Era;
  category: WeaponCategory;
  damage: number;
  headshotMult: number;
  fireRate: number;
  magSize: number;
  reserveMax: number;
  reloadTime: number;
  recoilX: number;
  recoilY: number;
  spreadHip: number;
  spreadAds: number;
  adsZoom: number;
  range: number;
  projectileSpeed: number;
  pellets: number;
  burstCount: number;
  splashRadius: number;
  isGas: boolean;
  isFlame: boolean;
  isMine: boolean;
  isLauncher: boolean;
  isGrenade: boolean;
  reloadStyle: string;
  sound: {
    crackFreq: number;
    thumpFreq: number;
    tailDecay: number;
    pitchJitter: number;
  };
  model: {
    barrelLen: number;
    bodyLen: number;
    stock: string;
    mag: string;
    scope: string;
    metal: string;
    wood: string;
  };
  skins: string[];
}

export const WEAPON_CATEGORIES: WeaponCategory[];
export const WEAPON_SKINS: WeaponSkin[];
export const WEAPONS: WeaponDef[];
export const WEAPONS_BY_ID: Record<string, WeaponDef>;
export function getWeaponsForEraAndCategory(era: Era, category: WeaponCategory): WeaponDef[];
