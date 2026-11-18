export interface VehicleWeaponDef {
  name: string;
  damage: number;
  splash: number;
  fireRate: number;
  speed: number;
  isExplosive: boolean;
  isBomb?: boolean;
  isTorpedo?: boolean;
  caliber: string;
}

export interface VehicleSeatDef {
  role: 'driver' | 'gunner' | 'passenger';
  label: string;
  weapon: VehicleWeaponDef | null;
  secondary?: VehicleWeaponDef;
  offset: [number, number, number];
}

export interface VehicleDef {
  id: string;
  name: string;
  era: 'ww1' | 'ww2';
  domain: 'land' | 'air' | 'sea' | 'stationary';
  kind: 'tank' | 'wheeled' | 'halftrack' | 'plane' | 'bomber' | 'boat' | 'ship' | 'submarine' | 'carrier' | 'emplacement';
  maxHp: number;
  maxSpeed: number;
  minSpeed?: number;
  reverseSpeed?: number;
  turnRate: number;
  accel: number;
  radius: number;
  height: number;
  respawnTime: number;
  resupplyAura?: number;
  canSubmerge?: boolean;
  isMobileSpawn?: boolean;
  seats: VehicleSeatDef[];
}

export const VEHICLES: Record<string, VehicleDef>;
export const VEHICLE_LIST: VehicleDef[];
