export const TIME_VARIANTS = {
  noon: {
    id: 'noon',
    name: 'Clear Daylight',
    skyTop: '#3e73a8',
    skyHorizon: '#c5d4df',
    sunColor: '#fff2d8',
    sunIntensity: 2.3,
    hemiSky: '#9dc2e6',
    hemiGround: '#594e3f',
    hemiIntensity: 0.85,
    fogDensity: 0.0028,
    sunPos: [80, 110, 55],
    rain: false,
  },
  dawn: {
    id: 'dawn',
    name: 'Amber Dawn',
    skyTop: '#2e3e5c',
    skyHorizon: '#e09a6c',
    sunColor: '#ffb578',
    sunIntensity: 2.0,
    hemiSky: '#a890a6',
    hemiGround: '#42332a',
    hemiIntensity: 0.72,
    fogDensity: 0.0042,
    sunPos: [120, 38, -70],
    rain: false,
  },
  dusk: {
    id: 'dusk',
    name: 'Blood Dusk',
    skyTop: '#1d2438',
    skyHorizon: '#b95f49',
    sunColor: '#ff7d52',
    sunIntensity: 1.75,
    hemiSky: '#6b5e7a',
    hemiGround: '#2f2320',
    hemiIntensity: 0.65,
    fogDensity: 0.0048,
    sunPos: [-115, 28, 80],
    rain: false,
  },
  overcast: {
    id: 'overcast',
    name: 'Storm Overcast',
    skyTop: '#4a545e',
    skyHorizon: '#8b959c',
    sunColor: '#d0dae0',
    sunIntensity: 1.35,
    hemiSky: '#8c969e',
    hemiGround: '#3d3c37',
    hemiIntensity: 0.9,
    fogDensity: 0.0062,
    sunPos: [40, 85, 30],
    rain: true,
  },
};

export const MAPS = {
  ww1_trench: {
    id: 'ww1_trench',
    name: 'Somme Mud & Wire',
    era: 'ww1',
    subtitle: 'WW1 Trench Front • Gas Attacks • Landships',
    size: 260,
    waterLevel: -4.0,
    defaultTime: 'overcast',
    hasGasAttack: true,
    groundTint: '#4d4131',
    accentTint: '#3b3225',
    capturePoints: [
      { id: 'A', name: 'Allied Trench Line', x: -65, z: 0, initialOwner: 1 },
      { id: 'B', name: "Cratered No Man's Land", x: 0, z: -22, initialOwner: 0 },
      { id: 'C', name: 'Shattered Bunker', x: 0, z: 32, initialOwner: 0 },
      { id: 'D', name: 'Forward Redoubt', x: 65, z: 0, initialOwner: 2 },
    ],
    spawns: {
      1: [[-105, -25], [-108, 0], [-105, 25], [-95, -42], [-95, 42]],
      2: [[105, -25], [108, 0], [105, 25], [95, -42], [95, 42]],
    },
    vehicleSpawns: [
      { type: 'ww1_tank', team: 1, x: -96, z: -18, rotY: Math.PI / 2 },
      { type: 'ww1_tank', team: 2, x: 96, z: 18, rotY: -Math.PI / 2 },
      { type: 'biplane', team: 1, x: -115, z: 58, rotY: Math.PI / 2 },
      { type: 'biplane', team: 2, x: 115, z: -58, rotY: -Math.PI / 2 },
      { type: 'mg_nest', team: 1, x: -45, z: -16, rotY: Math.PI / 2 },
      { type: 'mg_nest', team: 1, x: -45, z: 18, rotY: Math.PI / 2 },
      { type: 'mg_nest', team: 2, x: 45, z: -18, rotY: -Math.PI / 2 },
      { type: 'mg_nest', team: 2, x: 45, z: 16, rotY: -Math.PI / 2 },
      { type: 'aa_20mm', team: 0, x: -20, z: 52, rotY: 0 },
    ],
  },
  ww1_village: {
    id: 'ww1_village',
    name: 'Verdun Stone Ruin',
    era: 'ww1',
    subtitle: 'WW1 Ruined Village • House-to-House Combat',
    size: 240,
    waterLevel: -2.5,
    defaultTime: 'dawn',
    hasGasAttack: true,
    groundTint: '#5b5648',
    accentTint: '#48453a',
    capturePoints: [
      { id: 'A', name: 'Orchard Gate', x: -62, z: -20, initialOwner: 1 },
      { id: 'B', name: 'Bell-Tower Square', x: 0, z: 0, initialOwner: 0 },
      { id: 'C', name: 'Stone Mill Bridge', x: 12, z: -54, initialOwner: 0 },
      { id: 'D', name: 'Eastern Garrison', x: 64, z: 18, initialOwner: 2 },
    ],
    spawns: {
      1: [[-98, -32], [-100, 0], [-96, 30], [-88, 48], [-88, -48]],
      2: [[98, 32], [100, 0], [96, -30], [88, -48], [88, 48]],
    },
    vehicleSpawns: [
      { type: 'ww1_tank', team: 1, x: -88, z: 12, rotY: Math.PI / 2 },
      { type: 'ww1_tank', team: 2, x: 88, z: -12, rotY: -Math.PI / 2 },
      { type: 'armored_car', team: 1, x: -90, z: -26, rotY: Math.PI / 2 },
      { type: 'armored_car', team: 2, x: 90, z: 26, rotY: -Math.PI / 2 },
      { type: 'mg_nest', team: 0, x: -16, z: 16, rotY: 0 },
      { type: 'mg_nest', team: 0, x: 16, z: -16, rotY: Math.PI },
      { type: 'aa_20mm', team: 1, x: -60, z: 42, rotY: Math.PI / 2 },
      { type: 'aa_20mm', team: 2, x: 60, z: -42, rotY: -Math.PI / 2 },
    ],
  },
  ww2_armor: {
    id: 'ww2_armor',
    name: 'Kasserine Ridge',
    era: 'ww2',
    subtitle: 'WW2 Desert & Countryside Armor Battle • Aircraft & Tanks',
    size: 380,
    waterLevel: -6.0,
    defaultTime: 'noon',
    hasGasAttack: false,
    groundTint: '#b89763',
    accentTint: '#8e7349',
    capturePoints: [
      { id: 'A', name: 'Allied Forward Base', x: -105, z: -20, initialOwner: 1 },
      { id: 'B', name: 'Fuel Depot Crossroads', x: -20, z: 32, initialOwner: 0 },
      { id: 'C', name: 'Oasis Farmhouse', x: 24, z: -38, initialOwner: 0 },
      { id: 'D', name: 'Axis Ridge Outpost', x: 105, z: 20, initialOwner: 2 },
    ],
    spawns: {
      1: [[-150, -35], [-152, 0], [-148, 35], [-135, -60], [-135, 60]],
      2: [[150, 35], [152, 0], [148, -35], [135, 60], [135, -60]],
    },
    vehicleSpawns: [
      { type: 'ww2_heavy_tank', team: 1, x: -140, z: -15, rotY: Math.PI / 2 },
      { type: 'ww2_medium_tank', team: 1, x: -135, z: 18, rotY: Math.PI / 2 },
      { type: 'ww2_light_tank', team: 1, x: -125, z: 45, rotY: Math.PI / 2 },
      { type: 'jeep', team: 1, x: -138, z: -42, rotY: Math.PI / 2 },
      { type: 'halftrack', team: 1, x: -125, z: -55, rotY: Math.PI / 2 },
      { type: 'troop_truck', team: 1, x: -145, z: 50, rotY: Math.PI / 2 },
      { type: 'rocket_truck', team: 1, x: -145, z: -60, rotY: Math.PI / 2 },
      { type: 'mobile_aa', team: 1, x: -120, z: 5, rotY: Math.PI / 2 },
      { type: 'ww2_fighter', team: 1, x: -162, z: -82, rotY: Math.PI / 2 },
      { type: 'ww2_bomber', team: 1, x: -162, z: 82, rotY: Math.PI / 2 },

      { type: 'ww2_heavy_tank', team: 2, x: 140, z: 15, rotY: -Math.PI / 2 },
      { type: 'ww2_medium_tank', team: 2, x: 135, z: -18, rotY: -Math.PI / 2 },
      { type: 'ww2_light_tank', team: 2, x: 125, z: -45, rotY: -Math.PI / 2 },
      { type: 'armored_car', team: 2, x: 138, z: 42, rotY: -Math.PI / 2 },
      { type: 'halftrack', team: 2, x: 125, z: 55, rotY: -Math.PI / 2 },
      { type: 'troop_truck', team: 2, x: 145, z: -50, rotY: -Math.PI / 2 },
      { type: 'rocket_truck', team: 2, x: 145, z: 60, rotY: -Math.PI / 2 },
      { type: 'mobile_aa', team: 2, x: 120, z: -5, rotY: -Math.PI / 2 },
      { type: 'ww2_fighter', team: 2, x: 162, z: 82, rotY: -Math.PI / 2 },
      { type: 'ww2_bomber', team: 2, x: 162, z: -82, rotY: -Math.PI / 2 },

      { type: 'aa_88mm', team: 0, x: 0, z: 75, rotY: Math.PI },
      { type: 'aa_40mm', team: 0, x: 0, z: -75, rotY: 0 },
    ],
  },
  ww2_naval: {
    id: 'ww2_naval',
    name: 'Wake Atoll Combined Ops',
    era: 'ww2',
    subtitle: 'WW2 Island & Naval Fleet • Carriers, Destroyers, Subs & Planes',
    size: 460,
    waterLevel: 0.0,
    defaultTime: 'dusk',
    hasGasAttack: false,
    groundTint: '#c8b382',
    accentTint: '#4f6d3a',
    capturePoints: [
      { id: 'A', name: 'West Harbor Pier', x: -58, z: 12, initialOwner: 1 },
      { id: 'B', name: 'Central Airstrip', x: 0, z: -8, initialOwner: 0 },
      { id: 'C', name: 'Coastal Radar Bunker', x: 56, z: -12, initialOwner: 0 },
      { id: 'D', name: 'North Lagoon Cove', x: 4, z: -74, initialOwner: 2 },
    ],
    spawns: {
      1: [[-72, 24], [-68, -6], [-80, 12], [-135, 80], [-145, 50]],
      2: [[72, -24], [68, 6], [80, -12], [135, -80], [145, -50]],
    },
    vehicleSpawns: [
      { type: 'aircraft_carrier', team: 1, x: -165, z: 95, rotY: Math.PI * 0.6 },
      { type: 'battleship', team: 1, x: -140, z: -90, rotY: Math.PI * 0.4 },
      { type: 'destroyer', team: 1, x: -115, z: 45, rotY: Math.PI * 0.5 },
      { type: 'submarine', team: 1, x: -125, z: -30, rotY: Math.PI * 0.5 },
      { type: 'patrol_boat', team: 1, x: -85, z: 32, rotY: Math.PI * 0.5 },
      { type: 'ww2_fighter', team: 1, x: -165, z: 95, rotY: Math.PI * 0.6 },
      { type: 'jeep', team: 1, x: -52, z: 22, rotY: Math.PI / 2 },
      { type: 'ww2_light_tank', team: 1, x: -46, z: -18, rotY: Math.PI / 2 },

      { type: 'aircraft_carrier', team: 2, x: 165, z: -95, rotY: -Math.PI * 0.4 },
      { type: 'battleship', team: 2, x: 140, z: 90, rotY: -Math.PI * 0.6 },
      { type: 'destroyer', team: 2, x: 115, z: -45, rotY: -Math.PI * 0.5 },
      { type: 'submarine', team: 2, x: 125, z: 30, rotY: -Math.PI * 0.5 },
      { type: 'patrol_boat', team: 2, x: 85, z: -32, rotY: -Math.PI * 0.5 },
      { type: 'ww2_fighter', team: 2, x: 165, z: -95, rotY: -Math.PI * 0.4 },
      { type: 'jeep', team: 2, x: 52, z: -22, rotY: -Math.PI / 2 },
      { type: 'ww2_light_tank', team: 2, x: 46, z: 18, rotY: -Math.PI / 2 },

      { type: 'aa_40mm', team: 0, x: -24, z: 36, rotY: 0 },
      { type: 'aa_88mm', team: 0, x: 26, z: -42, rotY: Math.PI },
    ],
  },
  training_range: {
    id: 'training_range',
    name: 'Proving Grounds & Range',
    era: 'ww2',
    subtitle: 'Target Range • Weapon Wall • Vehicle Motor Pool • Tutorial',
    size: 260,
    waterLevel: -3.0,
    defaultTime: 'noon',
    hasGasAttack: false,
    groundTint: '#656c4b',
    accentTint: '#4d5339',
    capturePoints: [
      { id: 'A', name: 'Range Practice Zone', x: 0, z: -45, initialOwner: 0 },
    ],
    spawns: {
      1: [[0, 40], [-8, 42], [8, 42]],
      2: [[0, -68], [-22, -68], [22, -68]],
    },
    vehicleSpawns: [
      { type: 'ww2_medium_tank', team: 1, x: -34, z: 22, rotY: 0 },
      { type: 'ww1_tank', team: 1, x: -46, z: 22, rotY: 0 },
      { type: 'jeep', team: 1, x: -22, z: 22, rotY: 0 },
      { type: 'rocket_truck', team: 1, x: -58, z: 22, rotY: 0 },
      { type: 'ww2_fighter', team: 1, x: 44, z: 34, rotY: 0 },
      { type: 'biplane', team: 1, x: 58, z: 34, rotY: 0 },
      { type: 'aa_40mm', team: 1, x: 20, z: 22, rotY: Math.PI },
      { type: 'mg_nest', team: 1, x: 10, z: 22, rotY: Math.PI },
    ],
  },
};

export const MAP_LIST = [MAPS.ww1_trench, MAPS.ww1_village, MAPS.ww2_armor, MAPS.ww2_naval];

export const GAME_MODES = [
  { id: 'conquest', name: 'Team Conquest' },
  { id: 'tdm', name: 'Team Deathmatch' },
  { id: 'freeroam', name: 'Free Roam' },
  { id: 'training', name: 'Training Range' },
];

/**
 * Deterministic shared terrain heightmap used identically by server physics/LOS
 * and client rendering/collision.
 */
export function getTerrainHeight(mapId, x, z) {
  if (mapId === 'ww1_trench') {
    const base = Math.sin(x * 0.03) * Math.cos(z * 0.03) * 1.4 + Math.sin(x * 0.08 + z * 0.05) * 0.35;
    // Trench cuts along x = -65, x = -30, x = 30, x = 65
    let trench = 0;
    const trenchLines = [-65, -32, 32, 65];
    for (let i = 0; i < trenchLines.length; i++) {
      const zig = Math.sin(z * 0.14 + i) * 3.5;
      const dist = Math.abs(x - (trenchLines[i] + zig));
      if (dist < 2.6 && Math.abs(z) < 75) {
        trench -= (1 - dist / 2.6) * 1.65;
      }
    }
    // Shell craters in no man's land
    const c1 = Math.hypot(x - 0, z + 22);
    const c2 = Math.hypot(x - 10, z - 12);
    const c3 = Math.hypot(x + 12, z - 28);
    if (c1 < 7) trench -= (1 - c1 / 7) * 1.1;
    if (c2 < 6) trench -= (1 - c2 / 6) * 1.0;
    if (c3 < 6) trench -= (1 - c3 / 6) * 1.0;
    // Perimeter ridges
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    const ridge = edgeDist > 110 ? (edgeDist - 110) * 0.35 : 0;
    return base + trench + ridge;
  }
  if (mapId === 'ww1_village') {
    const flatCenter = Math.max(0, Math.min(1, (Math.hypot(x, z) - 24) / 30));
    const hills = (Math.sin(x * 0.035) * Math.cos(z * 0.04) * 2.2 + Math.cos(x * 0.07) * 0.6) * flatCenter;
    // Creek channel near z = -54
    const creekDist = Math.abs(z + 54 - Math.sin(x * 0.06) * 6);
    const creek = creekDist < 6 ? -(1 - creekDist / 6) * 2.4 : 0;
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    const ridge = edgeDist > 105 ? (edgeDist - 105) * 0.32 : 0;
    return hills + creek + ridge;
  }
  if (mapId === 'ww2_armor') {
    // Sweeping desert dunes and flanking ridges
    const dunes = Math.sin(x * 0.022 + z * 0.015) * 3.2 + Math.cos(z * 0.03 - x * 0.012) * 2.4 + Math.sin(x * 0.06) * 0.7;
    // Flatten spawn airfields slightly
    const spawnFlat = Math.max(0, Math.min(1, (Math.abs(x) - 140) < 0 ? 1 : 0.4));
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    const ridge = edgeDist > 168 ? (edgeDist - 168) * 0.45 : 0;
    return dunes * (0.65 + 0.35 * spawnFlat) + ridge;
  }
  if (mapId === 'ww2_naval') {
    // Central island surrounded by ocean (waterLevel = 0)
    const r = Math.hypot(x * 0.85, z * 1.15);
    if (r > 105) {
      return -8.5 + Math.sin(x * 0.05) * 0.5;
    }
    const norm = Math.max(0, 1 - r / 98);
    // Flat central airstrip corridor around z = -8
    const airstripBlend = Math.abs(z + 8) < 10 && Math.abs(x) < 48 ? 0.15 : 1.0;
    const peak = Math.pow(norm, 1.35) * 14.0 * airstripBlend + norm * 2.6;
    const detail = (Math.sin(x * 0.07) * Math.cos(z * 0.07) * 1.4) * airstripBlend;
    return peak + detail - 1.2;
  }
  // training_range
  const edgeDist = Math.max(Math.abs(x), Math.abs(z));
  const berm = edgeDist > 102 ? (edgeDist - 102) * 0.45 : 0;
  return Math.sin(x * 0.03) * 0.3 + berm;
}
