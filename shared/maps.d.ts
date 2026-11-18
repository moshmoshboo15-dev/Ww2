export interface TimeVariant {
  id: 'noon' | 'dawn' | 'dusk' | 'overcast';
  name: string;
  skyTop: string;
  skyHorizon: string;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  fogDensity: number;
  sunPos: [number, number, number];
  rain: boolean;
}

export interface CapturePointDef {
  id: string;
  name: string;
  x: number;
  z: number;
  initialOwner: 0 | 1 | 2;
}

export interface VehicleSpawnDef {
  type: string;
  team: 0 | 1 | 2;
  x: number;
  z: number;
  rotY: number;
}

export interface MapDef {
  id: string;
  name: string;
  era: 'ww1' | 'ww2';
  subtitle: string;
  size: number;
  waterLevel: number;
  defaultTime: 'noon' | 'dawn' | 'dusk' | 'overcast';
  hasGasAttack: boolean;
  groundTint: string;
  accentTint: string;
  capturePoints: CapturePointDef[];
  spawns: Record<1 | 2, [number, number][]>;
  vehicleSpawns: VehicleSpawnDef[];
}

export const TIME_VARIANTS: Record<string, TimeVariant>;
export const MAPS: Record<string, MapDef>;
export const MAP_LIST: MapDef[];
export const GAME_MODES: { id: string; name: string }[];
export function getTerrainHeight(mapId: string, x: number, z: number): number;
