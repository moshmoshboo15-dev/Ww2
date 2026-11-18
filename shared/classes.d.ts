export interface ClassDef {
  id: 'assault' | 'medic' | 'support' | 'scout' | 'anti_armor';
  name: string;
  maxHp: number;
  speedMult: number;
  allowedCategories: string[];
  defaultPrimary: { ww1: string; ww2: string };
  defaultSecondary: { ww1: string; ww2: string };
  defaultExplosive: { ww1: string; ww2: string };
  gadget: string;
  gadgetLabel: string;
}

export interface OutfitDef {
  id: string;
  name: string;
  unlockLevel: number;
  alliesColor: string;
  axisColor: string;
  helmColor: string;
}

export interface ChallengeDef {
  id: string;
  name: string;
  desc: string;
  stat: 'kills' | 'headshots' | 'captures' | 'vehiclesDestroyed' | 'revives';
  target: number;
  rewardXp: number;
}

export const CLASSES: Record<string, ClassDef>;
export const CLASS_LIST: ClassDef[];
export const OUTFITS: OutfitDef[];
export const CHALLENGES: ChallengeDef[];
export function xpForLevel(level: number): number;
export function getLevelFromXp(xp: number): { level: number; currentXp: number; nextLevelXp: number };
