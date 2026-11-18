export const WEAPON_CATEGORIES = [
  'pistol',
  'rifle',
  'smg',
  'mg',
  'shotgun',
  'sniper',
  'grenade',
  'launcher',
  'mine',
  'flamethrower',
];

export const WEAPON_SKINS = [
  { id: 'standard', name: 'Standard Issue', unlockLevel: 1, colorTint: '#ffffff', metalColor: '#2c3138', woodColor: '#6d4427', roughness: 0.55, metalness: 0.72, camo: 'none' },
  { id: 'mud_brass', name: 'Mud & Brass', unlockLevel: 3, colorTint: '#b99b6b', metalColor: '#8d733e', woodColor: '#4c3523', roughness: 0.68, metalness: 0.65, camo: 'mud' },
  { id: 'alpine', name: 'Alpine Frost', unlockLevel: 6, colorTint: '#dce3e6', metalColor: '#56626a', woodColor: '#909aa1', roughness: 0.5, metalness: 0.55, camo: 'winter' },
  { id: 'desert_tan', name: 'Desert Dune', unlockLevel: 10, colorTint: '#d4b483', metalColor: '#6e5c45', woodColor: '#9c7c54', roughness: 0.72, metalness: 0.45, camo: 'desert' },
  { id: 'blued_officer', name: 'Blued Officer', unlockLevel: 15, colorTint: '#3b4f69', metalColor: '#1e2c3f', woodColor: '#432016', roughness: 0.25, metalness: 0.92, camo: 'none' },
  { id: 'battle_gold', name: 'Command Gold', unlockLevel: 22, colorTint: '#e5bc55', metalColor: '#d9a432', woodColor: '#2a1a12', roughness: 0.2, metalness: 0.96, camo: 'etched' },
];

function makeWeapon(cfg) {
  return {
    pellets: 1,
    burstCount: 1,
    splashRadius: 0,
    isGas: false,
    isFlame: false,
    isMine: false,
    isLauncher: false,
    isGrenade: false,
    adsZoom: 1.25,
    reloadStyle: 'box',
    ...cfg,
    skins: WEAPON_SKINS.map((s) => s.id),
  };
}

export const WEAPONS = [
  // ================= WW1 PISTOLS (5) =================
  makeWeapon({
    id: 'ww1_pistol_trench45', name: 'Trench .45 Automatic', era: 'ww1', category: 'pistol',
    damage: 34, headshotMult: 1.8, fireRate: 360, magSize: 7, reserveMax: 42, reloadTime: 1.45,
    recoilX: 0.6, recoilY: 2.1, spreadHip: 0.025, spreadAds: 0.006, adsZoom: 1.2, range: 65, projectileSpeed: 320,
    reloadStyle: 'pistol_mag', sound: { crackFreq: 1650, thumpFreq: 135, tailDecay: 0.28, pitchJitter: 0.06 },
    model: { barrelLen: 0.19, bodyLen: 0.21, stock: 'none', mag: 'grip', scope: 'iron', metal: '#2f343a', wood: '#5f3720' },
  }),
  makeWeapon({
    id: 'ww1_pistol_toggle08', name: 'Toggle-Lock 08', era: 'ww1', category: 'pistol',
    damage: 29, headshotMult: 1.8, fireRate: 420, magSize: 8, reserveMax: 48, reloadTime: 1.35,
    recoilX: 0.45, recoilY: 1.6, spreadHip: 0.02, spreadAds: 0.005, adsZoom: 1.2, range: 65, projectileSpeed: 330,
    reloadStyle: 'pistol_mag', sound: { crackFreq: 1850, thumpFreq: 120, tailDecay: 0.25, pitchJitter: 0.07 },
    model: { barrelLen: 0.22, bodyLen: 0.19, stock: 'none', mag: 'grip', scope: 'iron', metal: '#242930', wood: '#52301d' },
  }),
  makeWeapon({
    id: 'ww1_pistol_revolver_mk4', name: 'Service Break-Top Mk.IV', era: 'ww1', category: 'pistol',
    damage: 44, headshotMult: 2.0, fireRate: 220, magSize: 6, reserveMax: 36, reloadTime: 1.9,
    recoilX: 0.8, recoilY: 3.1, spreadHip: 0.028, spreadAds: 0.005, adsZoom: 1.25, range: 70, projectileSpeed: 310,
    reloadStyle: 'revolver', sound: { crackFreq: 1450, thumpFreq: 155, tailDecay: 0.34, pitchJitter: 0.05 },
    model: { barrelLen: 0.2, bodyLen: 0.16, stock: 'none', mag: 'cylinder', scope: 'iron', metal: '#353a42', wood: '#4e2b19' },
  }),
  makeWeapon({
    id: 'ww1_pistol_clip12', name: 'Top-Loader M12', era: 'ww1', category: 'pistol',
    damage: 31, headshotMult: 1.75, fireRate: 390, magSize: 8, reserveMax: 48, reloadTime: 1.55,
    recoilX: 0.5, recoilY: 1.8, spreadHip: 0.023, spreadAds: 0.006, adsZoom: 1.2, range: 60, projectileSpeed: 325,
    reloadStyle: 'stripper', sound: { crackFreq: 1750, thumpFreq: 130, tailDecay: 0.26, pitchJitter: 0.06 },
    model: { barrelLen: 0.18, bodyLen: 0.22, stock: 'none', mag: 'internal', scope: 'iron', metal: '#2c3136', wood: '#6e4325' },
  }),
  makeWeapon({
    id: 'ww1_pistol_broom', name: 'Broomhandle Machine Pistol', era: 'ww1', category: 'pistol',
    damage: 25, headshotMult: 1.7, fireRate: 620, magSize: 10, reserveMax: 60, reloadTime: 1.75,
    recoilX: 0.9, recoilY: 1.9, spreadHip: 0.032, spreadAds: 0.01, adsZoom: 1.2, range: 65, projectileSpeed: 335,
    reloadStyle: 'stripper', sound: { crackFreq: 1920, thumpFreq: 115, tailDecay: 0.24, pitchJitter: 0.08 },
    model: { barrelLen: 0.24, bodyLen: 0.2, stock: 'none', mag: 'front_box', scope: 'iron', metal: '#292e33', wood: '#704524' },
  }),

  // ================= WW1 RIFLES (5) =================
  makeWeapon({
    id: 'ww1_rifle_enfield14', name: 'Highland Pattern 14', era: 'ww1', category: 'rifle',
    damage: 66, headshotMult: 2.2, fireRate: 78, magSize: 10, reserveMax: 60, reloadTime: 2.25,
    recoilX: 0.7, recoilY: 3.0, spreadHip: 0.045, spreadAds: 0.002, adsZoom: 1.65, range: 185, projectileSpeed: 480,
    reloadStyle: 'bolt', sound: { crackFreq: 2100, thumpFreq: 165, tailDecay: 0.45, pitchJitter: 0.04 },
    model: { barrelLen: 0.62, bodyLen: 0.46, stock: 'full_wood', mag: 'internal', scope: 'iron', metal: '#272b30', wood: '#693d20' },
  }),
  makeWeapon({
    id: 'ww1_rifle_gewehr98', name: 'Imperial Gewehr-98', era: 'ww1', category: 'rifle',
    damage: 72, headshotMult: 2.3, fireRate: 68, magSize: 5, reserveMax: 50, reloadTime: 2.05,
    recoilX: 0.65, recoilY: 3.3, spreadHip: 0.048, spreadAds: 0.0018, adsZoom: 1.7, range: 200, projectileSpeed: 510,
    reloadStyle: 'bolt', sound: { crackFreq: 2250, thumpFreq: 175, tailDecay: 0.48, pitchJitter: 0.04 },
    model: { barrelLen: 0.68, bodyLen: 0.45, stock: 'full_wood', mag: 'internal', scope: 'iron', metal: '#2d3238', wood: '#7a4b29' },
  }),
  makeWeapon({
    id: 'ww1_rifle_spring03', name: 'Frontier Bolt M03', era: 'ww1', category: 'rifle',
    damage: 68, headshotMult: 2.25, fireRate: 74, magSize: 5, reserveMax: 50, reloadTime: 2.0,
    recoilX: 0.6, recoilY: 3.1, spreadHip: 0.045, spreadAds: 0.002, adsZoom: 1.65, range: 190, projectileSpeed: 495,
    reloadStyle: 'bolt', sound: { crackFreq: 2050, thumpFreq: 160, tailDecay: 0.44, pitchJitter: 0.04 },
    model: { barrelLen: 0.6, bodyLen: 0.44, stock: 'full_wood', mag: 'internal', scope: 'iron', metal: '#25292e', wood: '#64391d' },
  }),
  makeWeapon({
    id: 'ww1_rifle_berthier', name: 'Trench Carbine M16', era: 'ww1', category: 'rifle',
    damage: 58, headshotMult: 2.1, fireRate: 92, magSize: 5, reserveMax: 55, reloadTime: 1.85,
    recoilX: 0.55, recoilY: 2.6, spreadHip: 0.036, spreadAds: 0.0028, adsZoom: 1.55, range: 165, projectileSpeed: 465,
    reloadStyle: 'bolt', sound: { crackFreq: 1950, thumpFreq: 150, tailDecay: 0.4, pitchJitter: 0.05 },
    model: { barrelLen: 0.48, bodyLen: 0.42, stock: 'full_wood', mag: 'box', scope: 'iron', metal: '#31363d', wood: '#734422' },
  }),
  makeWeapon({
    id: 'ww1_rifle_mosin91', name: 'Eastern Infantry M91', era: 'ww1', category: 'rifle',
    damage: 70, headshotMult: 2.2, fireRate: 70, magSize: 5, reserveMax: 50, reloadTime: 2.15,
    recoilX: 0.72, recoilY: 3.2, spreadHip: 0.046, spreadAds: 0.0022, adsZoom: 1.65, range: 195, projectileSpeed: 490,
    reloadStyle: 'bolt', sound: { crackFreq: 2150, thumpFreq: 170, tailDecay: 0.47, pitchJitter: 0.04 },
    model: { barrelLen: 0.66, bodyLen: 0.46, stock: 'full_wood', mag: 'internal', scope: 'iron', metal: '#2a2d31', wood: '#5b331a' },
  }),

  // ================= WW1 SMGS (5) =================
  makeWeapon({
    id: 'ww1_smg_mp18', name: 'Trench Sweeper M18', era: 'ww1', category: 'smg',
    damage: 24, headshotMult: 1.65, fireRate: 540, magSize: 32, reserveMax: 160, reloadTime: 2.1,
    recoilX: 0.8, recoilY: 1.4, spreadHip: 0.028, spreadAds: 0.011, adsZoom: 1.3, range: 85, projectileSpeed: 360,
    reloadStyle: 'side_mag', sound: { crackFreq: 1500, thumpFreq: 120, tailDecay: 0.22, pitchJitter: 0.08 },
    model: { barrelLen: 0.28, bodyLen: 0.34, stock: 'wood_carbine', mag: 'side_drum', scope: 'iron', metal: '#2a2f36', wood: '#663c20' },
  }),
  makeWeapon({
    id: 'ww1_smg_villar', name: 'Twin-Barrel Automatico', era: 'ww1', category: 'smg',
    damage: 19, headshotMult: 1.55, fireRate: 900, magSize: 25, reserveMax: 175, reloadTime: 1.9,
    recoilX: 1.1, recoilY: 1.6, spreadHip: 0.036, spreadAds: 0.015, adsZoom: 1.25, range: 70, projectileSpeed: 350,
    reloadStyle: 'box', sound: { crackFreq: 1720, thumpFreq: 105, tailDecay: 0.18, pitchJitter: 0.09 },
    model: { barrelLen: 0.25, bodyLen: 0.3, stock: 'wood_carbine', mag: 'top_box', scope: 'iron', metal: '#333840', wood: '#704528' },
  }),
  makeWeapon({
    id: 'ww1_smg_ribey', name: 'Experimental Carbine-18', era: 'ww1', category: 'smg',
    damage: 28, headshotMult: 1.75, fireRate: 480, magSize: 25, reserveMax: 150, reloadTime: 2.2,
    recoilX: 0.75, recoilY: 1.6, spreadHip: 0.026, spreadAds: 0.008, adsZoom: 1.35, range: 105, projectileSpeed: 380,
    reloadStyle: 'box', sound: { crackFreq: 1620, thumpFreq: 130, tailDecay: 0.26, pitchJitter: 0.07 },
    model: { barrelLen: 0.34, bodyLen: 0.36, stock: 'full_wood', mag: 'box', scope: 'iron', metal: '#282d33', wood: '#5f371e' },
  }),
  makeWeapon({
    id: 'ww1_smg_annihilator', name: 'Protector Prototype-19', era: 'ww1', category: 'smg',
    damage: 27, headshotMult: 1.7, fireRate: 680, magSize: 20, reserveMax: 140, reloadTime: 1.95,
    recoilX: 1.0, recoilY: 1.8, spreadHip: 0.03, spreadAds: 0.012, adsZoom: 1.28, range: 80, projectileSpeed: 355,
    reloadStyle: 'box', sound: { crackFreq: 1480, thumpFreq: 135, tailDecay: 0.24, pitchJitter: 0.08 },
    model: { barrelLen: 0.24, bodyLen: 0.32, stock: 'none', mag: 'box', scope: 'iron', metal: '#22262b', wood: '#754825' },
  }),
  makeWeapon({
    id: 'ww1_smg_bergmann', name: 'Stormtroop Carbine M17', era: 'ww1', category: 'smg',
    damage: 25, headshotMult: 1.65, fireRate: 510, magSize: 30, reserveMax: 150, reloadTime: 2.05,
    recoilX: 0.72, recoilY: 1.35, spreadHip: 0.025, spreadAds: 0.009, adsZoom: 1.3, range: 90, projectileSpeed: 365,
    reloadStyle: 'side_mag', sound: { crackFreq: 1560, thumpFreq: 122, tailDecay: 0.23, pitchJitter: 0.07 },
    model: { barrelLen: 0.29, bodyLen: 0.34, stock: 'wood_carbine', mag: 'side_box', scope: 'iron', metal: '#2d3138', wood: '#683f22' },
  }),

  // ================= WW1 MACHINE GUNS (5) =================
  makeWeapon({
    id: 'ww1_mg_lewis', name: 'Pan-Feed Air-Cool LMG', era: 'ww1', category: 'mg',
    damage: 33, headshotMult: 1.75, fireRate: 520, magSize: 47, reserveMax: 188, reloadTime: 3.0,
    recoilX: 1.05, recoilY: 1.7, spreadHip: 0.048, spreadAds: 0.012, adsZoom: 1.35, range: 135, projectileSpeed: 430,
    reloadStyle: 'top_pan', sound: { crackFreq: 1700, thumpFreq: 155, tailDecay: 0.35, pitchJitter: 0.06 },
    model: { barrelLen: 0.5, bodyLen: 0.44, stock: 'full_wood', mag: 'top_pan', scope: 'iron', metal: '#262b31', wood: '#62391d' },
  }),
  makeWeapon({
    id: 'ww1_mg_chauchat', name: 'Crescent-Mag Chauchat', era: 'ww1', category: 'mg',
    damage: 38, headshotMult: 1.8, fireRate: 300, magSize: 20, reserveMax: 140, reloadTime: 2.6,
    recoilX: 1.15, recoilY: 2.1, spreadHip: 0.044, spreadAds: 0.011, adsZoom: 1.35, range: 140, projectileSpeed: 435,
    reloadStyle: 'box', sound: { crackFreq: 1600, thumpFreq: 165, tailDecay: 0.38, pitchJitter: 0.06 },
    model: { barrelLen: 0.48, bodyLen: 0.45, stock: 'wood_carbine', mag: 'curved_box', scope: 'iron', metal: '#333840', wood: '#6c4223' },
  }),
  makeWeapon({
    id: 'ww1_mg_madsen', name: 'Top-Slot Field LMG', era: 'ww1', category: 'mg',
    damage: 34, headshotMult: 1.75, fireRate: 450, magSize: 30, reserveMax: 150, reloadTime: 2.5,
    recoilX: 0.95, recoilY: 1.65, spreadHip: 0.042, spreadAds: 0.01, adsZoom: 1.35, range: 140, projectileSpeed: 440,
    reloadStyle: 'top_box', sound: { crackFreq: 1750, thumpFreq: 150, tailDecay: 0.33, pitchJitter: 0.06 },
    model: { barrelLen: 0.46, bodyLen: 0.42, stock: 'full_wood', mag: 'top_box', scope: 'iron', metal: '#282d33', wood: '#6a3e20' },
  }),
  makeWeapon({
    id: 'ww1_mg_hotchkiss', name: 'Strip-Feed Trench MG', era: 'ww1', category: 'mg',
    damage: 36, headshotMult: 1.8, fireRate: 480, magSize: 30, reserveMax: 180, reloadTime: 2.8,
    recoilX: 1.0, recoilY: 1.8, spreadHip: 0.046, spreadAds: 0.011, adsZoom: 1.35, range: 145, projectileSpeed: 445,
    reloadStyle: 'belt', sound: { crackFreq: 1680, thumpFreq: 160, tailDecay: 0.36, pitchJitter: 0.06 },
    model: { barrelLen: 0.52, bodyLen: 0.44, stock: 'wood_carbine', mag: 'belt', scope: 'iron', metal: '#393e46', wood: '#5f371e' },
  }),
  makeWeapon({
    id: 'ww1_mg_maxim0815', name: 'Water-Cooled Portable 08/15', era: 'ww1', category: 'mg',
    damage: 31, headshotMult: 1.7, fireRate: 550, magSize: 100, reserveMax: 200, reloadTime: 3.6,
    recoilX: 1.15, recoilY: 1.6, spreadHip: 0.055, spreadAds: 0.013, adsZoom: 1.32, range: 140, projectileSpeed: 440,
    reloadStyle: 'belt', sound: { crackFreq: 1550, thumpFreq: 168, tailDecay: 0.37, pitchJitter: 0.05 },
    model: { barrelLen: 0.54, bodyLen: 0.46, stock: 'full_wood', mag: 'belt', scope: 'iron', metal: '#292f36', wood: '#653b20' },
  }),

  // ================= WW1 SHOTGUNS (5) =================
  makeWeapon({
    id: 'ww1_shotgun_trench97', name: 'Trench Slam-Fire M97', era: 'ww1', category: 'shotgun',
    damage: 18, pellets: 8, headshotMult: 1.5, fireRate: 115, magSize: 6, reserveMax: 36, reloadTime: 2.3,
    recoilX: 1.2, recoilY: 4.2, spreadHip: 0.065, spreadAds: 0.042, adsZoom: 1.18, range: 42, projectileSpeed: 360,
    reloadStyle: 'pump', sound: { crackFreq: 1300, thumpFreq: 185, tailDecay: 0.42, pitchJitter: 0.05 },
    model: { barrelLen: 0.46, bodyLen: 0.38, stock: 'full_wood', mag: 'tube', scope: 'iron', metal: '#24292e', wood: '#663c1f' },
  }),
  makeWeapon({
    id: 'ww1_shotgun_auto5', name: 'Recoil-Action Field 5', era: 'ww1', category: 'shotgun',
    damage: 16, pellets: 8, headshotMult: 1.45, fireRate: 190, magSize: 5, reserveMax: 35, reloadTime: 2.2,
    recoilX: 1.1, recoilY: 3.8, spreadHip: 0.068, spreadAds: 0.045, adsZoom: 1.18, range: 40, projectileSpeed: 355,
    reloadStyle: 'pump', sound: { crackFreq: 1360, thumpFreq: 175, tailDecay: 0.39, pitchJitter: 0.06 },
    model: { barrelLen: 0.48, bodyLen: 0.38, stock: 'full_wood', mag: 'tube', scope: 'iron', metal: '#2a2f36', wood: '#704424' },
  }),
  makeWeapon({
    id: 'ww1_shotgun_double', name: 'Side-by-Side Trench Coach', era: 'ww1', category: 'shotgun',
    damage: 21, pellets: 9, headshotMult: 1.55, fireRate: 160, magSize: 2, reserveMax: 32, reloadTime: 1.75,
    recoilX: 1.4, recoilY: 4.8, spreadHip: 0.072, spreadAds: 0.048, adsZoom: 1.15, range: 38, projectileSpeed: 350,
    reloadStyle: 'break', sound: { crackFreq: 1250, thumpFreq: 195, tailDecay: 0.45, pitchJitter: 0.05 },
    model: { barrelLen: 0.44, bodyLen: 0.34, stock: 'full_wood', mag: 'none', scope: 'iron', metal: '#31363c', wood: '#5c3419' },
  }),
  makeWeapon({
    id: 'ww1_shotgun_sawed', name: 'Trench Raider Breacher', era: 'ww1', category: 'shotgun',
    damage: 20, pellets: 9, headshotMult: 1.45, fireRate: 180, magSize: 2, reserveMax: 30, reloadTime: 1.55,
    recoilX: 1.6, recoilY: 5.0, spreadHip: 0.09, spreadAds: 0.065, adsZoom: 1.12, range: 30, projectileSpeed: 335,
    reloadStyle: 'break', sound: { crackFreq: 1200, thumpFreq: 190, tailDecay: 0.4, pitchJitter: 0.06 },
    model: { barrelLen: 0.28, bodyLen: 0.28, stock: 'wood_carbine', mag: 'none', scope: 'iron', metal: '#2c3035', wood: '#693c1e' },
  }),
  makeWeapon({
    id: 'ww1_shotgun_riot12', name: 'Hammerless Trench M12', era: 'ww1', category: 'shotgun',
    damage: 17, pellets: 8, headshotMult: 1.5, fireRate: 130, magSize: 6, reserveMax: 36, reloadTime: 2.25,
    recoilX: 1.15, recoilY: 4.0, spreadHip: 0.062, spreadAds: 0.04, adsZoom: 1.2, range: 44, projectileSpeed: 365,
    reloadStyle: 'pump', sound: { crackFreq: 1320, thumpFreq: 180, tailDecay: 0.41, pitchJitter: 0.05 },
    model: { barrelLen: 0.47, bodyLen: 0.38, stock: 'full_wood', mag: 'tube', scope: 'iron', metal: '#25292f', wood: '#6e4222' },
  }),

  // ================= WW1 SNIPERS (5) =================
  makeWeapon({
    id: 'ww1_sniper_gewehr98s', name: 'Optic Gewehr-98S', era: 'ww1', category: 'sniper',
    damage: 94, headshotMult: 2.5, fireRate: 52, magSize: 5, reserveMax: 35, reloadTime: 2.35,
    recoilX: 0.7, recoilY: 4.0, spreadHip: 0.075, spreadAds: 0.0006, adsZoom: 3.6, range: 260, projectileSpeed: 560,
    reloadStyle: 'bolt', sound: { crackFreq: 2350, thumpFreq: 175, tailDecay: 0.55, pitchJitter: 0.03 },
    model: { barrelLen: 0.72, bodyLen: 0.46, stock: 'full_wood', mag: 'internal', scope: 'optic', metal: '#262b31', wood: '#744626' },
  }),
  makeWeapon({
    id: 'ww1_sniper_enfield_t', name: 'Marksman SMLE Optic', era: 'ww1', category: 'sniper',
    damage: 88, headshotMult: 2.5, fireRate: 62, magSize: 10, reserveMax: 40, reloadTime: 2.45,
    recoilX: 0.65, recoilY: 3.6, spreadHip: 0.07, spreadAds: 0.0007, adsZoom: 3.4, range: 245, projectileSpeed: 540,
    reloadStyle: 'bolt', sound: { crackFreq: 2200, thumpFreq: 170, tailDecay: 0.52, pitchJitter: 0.03 },
    model: { barrelLen: 0.68, bodyLen: 0.46, stock: 'full_wood', mag: 'box', scope: 'optic', metal: '#292e34', wood: '#643a1f' },
  }),
  makeWeapon({
    id: 'ww1_sniper_longtom', name: 'Long-Tom Scope M03', era: 'ww1', category: 'sniper',
    damage: 92, headshotMult: 2.5, fireRate: 55, magSize: 5, reserveMax: 35, reloadTime: 2.25,
    recoilX: 0.68, recoilY: 3.8, spreadHip: 0.072, spreadAds: 0.0006, adsZoom: 3.8, range: 255, projectileSpeed: 550,
    reloadStyle: 'bolt', sound: { crackFreq: 2280, thumpFreq: 172, tailDecay: 0.54, pitchJitter: 0.03 },
    model: { barrelLen: 0.7, bodyLen: 0.45, stock: 'full_wood', mag: 'internal', scope: 'optic', metal: '#23282d', wood: '#6b3f21' },
  }),
  makeWeapon({
    id: 'ww1_sniper_vetterli', name: 'Alpine Vetterli Optic', era: 'ww1', category: 'sniper',
    damage: 85, headshotMult: 2.4, fireRate: 64, magSize: 4, reserveMax: 36, reloadTime: 2.1,
    recoilX: 0.6, recoilY: 3.4, spreadHip: 0.068, spreadAds: 0.0008, adsZoom: 3.2, range: 235, projectileSpeed: 530,
    reloadStyle: 'bolt', sound: { crackFreq: 2150, thumpFreq: 165, tailDecay: 0.5, pitchJitter: 0.04 },
    model: { barrelLen: 0.68, bodyLen: 0.44, stock: 'full_wood', mag: 'box', scope: 'optic', metal: '#2d3239', wood: '#593218' },
  }),
  makeWeapon({
    id: 'ww1_sniper_ross', name: 'Straight-Pull Match M10', era: 'ww1', category: 'sniper',
    damage: 90, headshotMult: 2.5, fireRate: 66, magSize: 5, reserveMax: 35, reloadTime: 2.2,
    recoilX: 0.62, recoilY: 3.5, spreadHip: 0.07, spreadAds: 0.0006, adsZoom: 3.5, range: 250, projectileSpeed: 555,
    reloadStyle: 'bolt', sound: { crackFreq: 2300, thumpFreq: 168, tailDecay: 0.52, pitchJitter: 0.03 },
    model: { barrelLen: 0.7, bodyLen: 0.46, stock: 'full_wood', mag: 'internal', scope: 'optic', metal: '#272b30', wood: '#704224' },
  }),

  // ================= WW1 GRENADES (5) =================
  makeWeapon({
    id: 'ww1_grenade_mills', name: 'Serrated Frag Bomb', era: 'ww1', category: 'grenade', isGrenade: true,
    damage: 120, headshotMult: 1.0, fireRate: 60, magSize: 2, reserveMax: 4, reloadTime: 1.2,
    recoilX: 0, recoilY: 1.2, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 45, projectileSpeed: 24, splashRadius: 7.5,
    reloadStyle: 'throw', sound: { crackFreq: 500, thumpFreq: 60, tailDecay: 0.65, pitchJitter: 0.08 },
    model: { barrelLen: 0.08, bodyLen: 0.11, stock: 'none', mag: 'none', scope: 'none', metal: '#3c4338', wood: '#5f4b32' },
  }),
  makeWeapon({
    id: 'ww1_grenade_stick15', name: 'Long-Handle Stick Charge', era: 'ww1', category: 'grenade', isGrenade: true,
    damage: 115, headshotMult: 1.0, fireRate: 65, magSize: 2, reserveMax: 4, reloadTime: 1.2,
    recoilX: 0, recoilY: 1.2, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 55, projectileSpeed: 28, splashRadius: 7.0,
    reloadStyle: 'throw', sound: { crackFreq: 520, thumpFreq: 62, tailDecay: 0.62, pitchJitter: 0.08 },
    model: { barrelLen: 0.1, bodyLen: 0.28, stock: 'wood_handle', mag: 'none', scope: 'none', metal: '#3c4146', wood: '#734b2a' },
  }),
  makeWeapon({
    id: 'ww1_grenade_gas', name: 'Mustard Gas Canister', era: 'ww1', category: 'grenade', isGrenade: true, isGas: true,
    damage: 18, headshotMult: 1.0, fireRate: 55, magSize: 2, reserveMax: 4, reloadTime: 1.2,
    recoilX: 0, recoilY: 1.0, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 45, projectileSpeed: 24, splashRadius: 9.0,
    reloadStyle: 'throw', sound: { crackFreq: 800, thumpFreq: 90, tailDecay: 0.5, pitchJitter: 0.08 },
    model: { barrelLen: 0.09, bodyLen: 0.14, stock: 'none', mag: 'none', scope: 'none', metal: '#7d823b', wood: '#555533' },
  }),
  makeWeapon({
    id: 'ww1_grenade_cluster', name: 'Siege Bundle Charge', era: 'ww1', category: 'grenade', isGrenade: true,
    damage: 165, headshotMult: 1.0, fireRate: 45, magSize: 1, reserveMax: 3, reloadTime: 1.4,
    recoilX: 0, recoilY: 1.5, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 35, projectileSpeed: 20, splashRadius: 9.5,
    reloadStyle: 'throw', sound: { crackFreq: 420, thumpFreq: 50, tailDecay: 0.85, pitchJitter: 0.06 },
    model: { barrelLen: 0.14, bodyLen: 0.28, stock: 'wood_handle', mag: 'none', scope: 'none', metal: '#474c52', wood: '#6e4728' },
  }),
  makeWeapon({
    id: 'ww1_grenade_incendiary', name: 'Phosphorus Flask', era: 'ww1', category: 'grenade', isGrenade: true, isFlame: true,
    damage: 75, headshotMult: 1.0, fireRate: 60, magSize: 2, reserveMax: 4, reloadTime: 1.2,
    recoilX: 0, recoilY: 1.1, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 44, projectileSpeed: 24, splashRadius: 6.5,
    reloadStyle: 'throw', sound: { crackFreq: 950, thumpFreq: 75, tailDecay: 0.55, pitchJitter: 0.08 },
    model: { barrelLen: 0.08, bodyLen: 0.13, stock: 'none', mag: 'none', scope: 'none', metal: '#8c4427', wood: '#663c20' },
  }),

  // ================= WW1 ANTI-TANK LAUNCHERS (5) =================
  makeWeapon({
    id: 'ww1_launcher_tgewehr', name: 'Anti-Armor 13mm Rifle', era: 'ww1', category: 'launcher', isLauncher: true,
    damage: 155, headshotMult: 1.5, fireRate: 35, magSize: 1, reserveMax: 10, reloadTime: 2.3,
    recoilX: 1.5, recoilY: 5.5, spreadHip: 0.06, spreadAds: 0.002, adsZoom: 1.5, range: 210, projectileSpeed: 420, splashRadius: 1.8,
    reloadStyle: 'bolt', sound: { crackFreq: 1800, thumpFreq: 75, tailDecay: 0.65, pitchJitter: 0.04 },
    model: { barrelLen: 0.92, bodyLen: 0.5, stock: 'full_wood', mag: 'none', scope: 'iron', metal: '#24292f', wood: '#5f371e' },
  }),
  makeWeapon({
    id: 'ww1_launcher_buster', name: 'Heavy Elephant AT Rifle', era: 'ww1', category: 'launcher', isLauncher: true,
    damage: 170, headshotMult: 1.4, fireRate: 30, magSize: 1, reserveMax: 8, reloadTime: 2.5,
    recoilX: 1.7, recoilY: 6.0, spreadHip: 0.065, spreadAds: 0.002, adsZoom: 1.55, range: 200, projectileSpeed: 400, splashRadius: 2.2,
    reloadStyle: 'bolt', sound: { crackFreq: 1650, thumpFreq: 68, tailDecay: 0.7, pitchJitter: 0.04 },
    model: { barrelLen: 0.88, bodyLen: 0.48, stock: 'full_wood', mag: 'none', scope: 'iron', metal: '#2b3036', wood: '#6e4223' },
  }),
  makeWeapon({
    id: 'ww1_launcher_cup', name: 'Cup-Discharger AT Mortar', era: 'ww1', category: 'launcher', isLauncher: true,
    damage: 185, headshotMult: 1.0, fireRate: 28, magSize: 1, reserveMax: 6, reloadTime: 2.7,
    recoilX: 1.2, recoilY: 4.5, spreadHip: 0.04, spreadAds: 0.012, adsZoom: 1.25, range: 110, projectileSpeed: 55, splashRadius: 5.0,
    reloadStyle: 'tube', sound: { crackFreq: 720, thumpFreq: 65, tailDecay: 0.55, pitchJitter: 0.06 },
    model: { barrelLen: 0.56, bodyLen: 0.42, stock: 'full_wood', mag: 'tube', scope: 'iron', metal: '#353a42', wood: '#663d21' },
  }),
  makeWeapon({
    id: 'ww1_launcher_satchel', name: 'Armor-Piercing Rocket Tube', era: 'ww1', category: 'launcher', isLauncher: true,
    damage: 200, headshotMult: 1.0, fireRate: 25, magSize: 1, reserveMax: 5, reloadTime: 2.9,
    recoilX: 1.0, recoilY: 3.5, spreadHip: 0.035, spreadAds: 0.01, adsZoom: 1.25, range: 120, projectileSpeed: 65, splashRadius: 5.8,
    reloadStyle: 'tube', sound: { crackFreq: 640, thumpFreq: 55, tailDecay: 0.65, pitchJitter: 0.06 },
    model: { barrelLen: 0.76, bodyLen: 0.48, stock: 'none', mag: 'tube', scope: 'iron', metal: '#43493e', wood: '#5a3a22' },
  }),
  makeWeapon({
    id: 'ww1_launcher_bunker', name: 'Trench Siege Bomb-Thrower', era: 'ww1', category: 'launcher', isLauncher: true,
    damage: 210, headshotMult: 1.0, fireRate: 22, magSize: 1, reserveMax: 5, reloadTime: 3.1,
    recoilX: 1.4, recoilY: 4.8, spreadHip: 0.045, spreadAds: 0.014, adsZoom: 1.2, range: 95, projectileSpeed: 48, splashRadius: 6.5,
    reloadStyle: 'tube', sound: { crackFreq: 580, thumpFreq: 52, tailDecay: 0.72, pitchJitter: 0.06 },
    model: { barrelLen: 0.64, bodyLen: 0.44, stock: 'wood_carbine', mag: 'tube', scope: 'iron', metal: '#393f46', wood: '#684023' },
  }),

  // ================= WW1 MINES (5) =================
  makeWeapon({
    id: 'ww1_mine_trip', name: 'Trench Trip-Wire Mine', era: 'ww1', category: 'mine', isMine: true,
    damage: 140, headshotMult: 1.0, fireRate: 60, magSize: 2, reserveMax: 4, reloadTime: 1.5,
    recoilX: 0, recoilY: 0.4, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 8, splashRadius: 5.0,
    reloadStyle: 'place', sound: { crackFreq: 650, thumpFreq: 95, tailDecay: 0.3, pitchJitter: 0.05 },
    model: { barrelLen: 0.05, bodyLen: 0.16, stock: 'none', mag: 'none', scope: 'none', metal: '#41473b', wood: '#5c4228' },
  }),
  makeWeapon({
    id: 'ww1_mine_sapper', name: 'Sapper Pressure Plate', era: 'ww1', category: 'mine', isMine: true,
    damage: 155, headshotMult: 1.0, fireRate: 60, magSize: 2, reserveMax: 4, reloadTime: 1.5,
    recoilX: 0, recoilY: 0.4, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 8, splashRadius: 5.5,
    reloadStyle: 'place', sound: { crackFreq: 620, thumpFreq: 90, tailDecay: 0.3, pitchJitter: 0.05 },
    model: { barrelLen: 0.05, bodyLen: 0.18, stock: 'none', mag: 'none', scope: 'none', metal: '#393d42', wood: '#554129' },
  }),
  makeWeapon({
    id: 'ww1_mine_atbox', name: 'Anti-Armor Wooden Box Mine', era: 'ww1', category: 'mine', isMine: true,
    damage: 280, headshotMult: 1.0, fireRate: 50, magSize: 2, reserveMax: 4, reloadTime: 1.7,
    recoilX: 0, recoilY: 0.5, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 7, splashRadius: 4.5,
    reloadStyle: 'place', sound: { crackFreq: 550, thumpFreq: 85, tailDecay: 0.35, pitchJitter: 0.05 },
    model: { barrelLen: 0.08, bodyLen: 0.22, stock: 'none', mag: 'none', scope: 'none', metal: '#4a4f44', wood: '#704b2b' },
  }),
  makeWeapon({
    id: 'ww1_mine_shrapnel', name: 'Shrapnel Stake Mine', era: 'ww1', category: 'mine', isMine: true,
    damage: 135, headshotMult: 1.0, fireRate: 65, magSize: 2, reserveMax: 5, reloadTime: 1.4,
    recoilX: 0, recoilY: 0.4, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 8, splashRadius: 6.0,
    reloadStyle: 'place', sound: { crackFreq: 680, thumpFreq: 95, tailDecay: 0.3, pitchJitter: 0.05 },
    model: { barrelLen: 0.06, bodyLen: 0.16, stock: 'none', mag: 'none', scope: 'none', metal: '#3e4449', wood: '#5a3a22' },
  }),
  makeWeapon({
    id: 'ww1_mine_mustard', name: 'Gas Trip-Canister', era: 'ww1', category: 'mine', isMine: true, isGas: true,
    damage: 20, headshotMult: 1.0, fireRate: 55, magSize: 2, reserveMax: 4, reloadTime: 1.5,
    recoilX: 0, recoilY: 0.4, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 8, splashRadius: 8.5,
    reloadStyle: 'place', sound: { crackFreq: 750, thumpFreq: 90, tailDecay: 0.4, pitchJitter: 0.05 },
    model: { barrelLen: 0.07, bodyLen: 0.17, stock: 'none', mag: 'none', scope: 'none', metal: '#767a3a', wood: '#584b2c' },
  }),

  // ================= WW1 FLAMETHROWERS (5) =================
  makeWeapon({
    id: 'ww1_flame_m15', name: 'Trench Projector M15', era: 'ww1', category: 'flamethrower', isFlame: true,
    damage: 18, headshotMult: 1.0, fireRate: 720, magSize: 80, reserveMax: 160, reloadTime: 2.9,
    recoilX: 0.25, recoilY: 0.35, spreadHip: 0.04, spreadAds: 0.025, adsZoom: 1.1, range: 19, projectileSpeed: 34, splashRadius: 2.0,
    reloadStyle: 'tank', sound: { crackFreq: 480, thumpFreq: 95, tailDecay: 0.22, pitchJitter: 0.12 },
    model: { barrelLen: 0.62, bodyLen: 0.38, stock: 'none', mag: 'tank', scope: 'none', metal: '#3d4239', wood: '#4c3220' },
  }),
  makeWeapon({
    id: 'ww1_flame_kleif', name: 'Lightweight Pack-Flamer', era: 'ww1', category: 'flamethrower', isFlame: true,
    damage: 16, headshotMult: 1.0, fireRate: 780, magSize: 75, reserveMax: 150, reloadTime: 2.6,
    recoilX: 0.2, recoilY: 0.3, spreadHip: 0.045, spreadAds: 0.028, adsZoom: 1.1, range: 17, projectileSpeed: 32, splashRadius: 2.0,
    reloadStyle: 'tank', sound: { crackFreq: 520, thumpFreq: 100, tailDecay: 0.2, pitchJitter: 0.12 },
    model: { barrelLen: 0.56, bodyLen: 0.36, stock: 'none', mag: 'tank', scope: 'none', metal: '#454a40', wood: '#563924' },
  }),
  makeWeapon({
    id: 'ww1_flame_siege', name: 'Siege Siphon Torch', era: 'ww1', category: 'flamethrower', isFlame: true,
    damage: 22, headshotMult: 1.0, fireRate: 640, magSize: 90, reserveMax: 180, reloadTime: 3.2,
    recoilX: 0.3, recoilY: 0.4, spreadHip: 0.035, spreadAds: 0.022, adsZoom: 1.1, range: 22, projectileSpeed: 38, splashRadius: 2.2,
    reloadStyle: 'tank', sound: { crackFreq: 440, thumpFreq: 88, tailDecay: 0.24, pitchJitter: 0.1 },
    model: { barrelLen: 0.68, bodyLen: 0.4, stock: 'none', mag: 'tank', scope: 'none', metal: '#363b40', wood: '#4a311e' },
  }),
  makeWeapon({
    id: 'ww1_flame_storm', name: 'Storm-Sapper Jet Mk.II', era: 'ww1', category: 'flamethrower', isFlame: true,
    damage: 19, headshotMult: 1.0, fireRate: 750, magSize: 70, reserveMax: 140, reloadTime: 2.7,
    recoilX: 0.22, recoilY: 0.32, spreadHip: 0.042, spreadAds: 0.024, adsZoom: 1.1, range: 18, projectileSpeed: 35, splashRadius: 2.0,
    reloadStyle: 'tank', sound: { crackFreq: 500, thumpFreq: 92, tailDecay: 0.21, pitchJitter: 0.12 },
    model: { barrelLen: 0.58, bodyLen: 0.37, stock: 'none', mag: 'tank', scope: 'none', metal: '#4f483a', wood: '#593b25' },
  }),
  makeWeapon({
    id: 'ww1_flame_bunker', name: 'Pillbox Napalm Hose', era: 'ww1', category: 'flamethrower', isFlame: true,
    damage: 21, headshotMult: 1.0, fireRate: 690, magSize: 85, reserveMax: 170, reloadTime: 3.0,
    recoilX: 0.28, recoilY: 0.38, spreadHip: 0.038, spreadAds: 0.024, adsZoom: 1.1, range: 20, projectileSpeed: 36, splashRadius: 2.2,
    reloadStyle: 'tank', sound: { crackFreq: 460, thumpFreq: 90, tailDecay: 0.23, pitchJitter: 0.11 },
    model: { barrelLen: 0.65, bodyLen: 0.39, stock: 'none', mag: 'tank', scope: 'none', metal: '#3b4039', wood: '#4f3521' },
  }),

  // ================= WW2 PISTOLS (5) =================
  makeWeapon({
    id: 'ww2_pistol_m45', name: 'M45 Service Sidearm', era: 'ww2', category: 'pistol',
    damage: 36, headshotMult: 1.85, fireRate: 380, magSize: 7, reserveMax: 49, reloadTime: 1.35,
    recoilX: 0.55, recoilY: 2.0, spreadHip: 0.022, spreadAds: 0.005, adsZoom: 1.2, range: 70, projectileSpeed: 335,
    reloadStyle: 'pistol_mag', sound: { crackFreq: 1680, thumpFreq: 140, tailDecay: 0.28, pitchJitter: 0.06 },
    model: { barrelLen: 0.19, bodyLen: 0.21, stock: 'none', mag: 'grip', scope: 'iron', metal: '#2a2f36', wood: '#5a341e' },
  }),
  makeWeapon({
    id: 'ww2_pistol_p38', name: 'Field Pistol P-38', era: 'ww2', category: 'pistol',
    damage: 30, headshotMult: 1.8, fireRate: 440, magSize: 8, reserveMax: 56, reloadTime: 1.3,
    recoilX: 0.45, recoilY: 1.6, spreadHip: 0.02, spreadAds: 0.005, adsZoom: 1.2, range: 68, projectileSpeed: 340,
    reloadStyle: 'pistol_mag', sound: { crackFreq: 1840, thumpFreq: 122, tailDecay: 0.24, pitchJitter: 0.06 },
    model: { barrelLen: 0.21, bodyLen: 0.2, stock: 'none', mag: 'grip', scope: 'iron', metal: '#22262c', wood: '#3b2b22' },
  }),
  makeWeapon({
    id: 'ww2_pistol_tt33', name: 'Armor-Core TT-33', era: 'ww2', category: 'pistol',
    damage: 33, headshotMult: 1.85, fireRate: 410, magSize: 8, reserveMax: 56, reloadTime: 1.35,
    recoilX: 0.5, recoilY: 1.75, spreadHip: 0.021, spreadAds: 0.005, adsZoom: 1.2, range: 74, projectileSpeed: 360,
    reloadStyle: 'pistol_mag', sound: { crackFreq: 1940, thumpFreq: 130, tailDecay: 0.26, pitchJitter: 0.06 },
    model: { barrelLen: 0.2, bodyLen: 0.2, stock: 'none', mag: 'grip', scope: 'iron', metal: '#2f343b', wood: '#4f2c19' },
  }),
  makeWeapon({
    id: 'ww2_pistol_hicap', name: 'Hi-Cap 13 Automatic', era: 'ww2', category: 'pistol',
    damage: 28, headshotMult: 1.75, fireRate: 460, magSize: 13, reserveMax: 65, reloadTime: 1.4,
    recoilX: 0.42, recoilY: 1.45, spreadHip: 0.02, spreadAds: 0.005, adsZoom: 1.2, range: 68, projectileSpeed: 340,
    reloadStyle: 'pistol_mag', sound: { crackFreq: 1800, thumpFreq: 118, tailDecay: 0.23, pitchJitter: 0.07 },
    model: { barrelLen: 0.2, bodyLen: 0.21, stock: 'none', mag: 'grip', scope: 'iron', metal: '#272c32', wood: '#57331d' },
  }),
  makeWeapon({
    id: 'ww2_pistol_commando', name: 'Commando Suppressed .45', era: 'ww2', category: 'pistol',
    damage: 35, headshotMult: 1.9, fireRate: 360, magSize: 8, reserveMax: 48, reloadTime: 1.4,
    recoilX: 0.4, recoilY: 1.4, spreadHip: 0.018, spreadAds: 0.004, adsZoom: 1.22, range: 65, projectileSpeed: 310,
    reloadStyle: 'pistol_mag', sound: { crackFreq: 1100, thumpFreq: 95, tailDecay: 0.14, pitchJitter: 0.05 },
    model: { barrelLen: 0.3, bodyLen: 0.21, stock: 'none', mag: 'grip', scope: 'iron', metal: '#1d2126', wood: '#432717' },
  }),

  // ================= WW2 RIFLES (5) =================
  makeWeapon({
    id: 'ww2_rifle_garand', name: 'Clip-Eject Semi M1', era: 'ww2', category: 'rifle',
    damage: 48, headshotMult: 2.0, fireRate: 260, magSize: 8, reserveMax: 64, reloadTime: 1.95,
    recoilX: 0.55, recoilY: 2.2, spreadHip: 0.032, spreadAds: 0.0025, adsZoom: 1.5, range: 175, projectileSpeed: 490,
    reloadStyle: 'clip_ping', sound: { crackFreq: 2050, thumpFreq: 155, tailDecay: 0.4, pitchJitter: 0.05 },
    model: { barrelLen: 0.58, bodyLen: 0.46, stock: 'full_wood', mag: 'internal', scope: 'iron', metal: '#292e34', wood: '#6e4021' },
  }),
  makeWeapon({
    id: 'ww2_rifle_k98', name: 'Short Karabiner 98S', era: 'ww2', category: 'rifle',
    damage: 74, headshotMult: 2.3, fireRate: 74, magSize: 5, reserveMax: 50, reloadTime: 2.0,
    recoilX: 0.65, recoilY: 3.2, spreadHip: 0.044, spreadAds: 0.0018, adsZoom: 1.65, range: 195, projectileSpeed: 505,
    reloadStyle: 'bolt', sound: { crackFreq: 2220, thumpFreq: 170, tailDecay: 0.46, pitchJitter: 0.04 },
    model: { barrelLen: 0.58, bodyLen: 0.44, stock: 'full_wood', mag: 'internal', scope: 'iron', metal: '#262b30', wood: '#744525' },
  }),
  makeWeapon({
    id: 'ww2_rifle_no4', name: 'Infantry Pattern No.4', era: 'ww2', category: 'rifle',
    damage: 67, headshotMult: 2.2, fireRate: 84, magSize: 10, reserveMax: 60, reloadTime: 2.2,
    recoilX: 0.6, recoilY: 2.9, spreadHip: 0.042, spreadAds: 0.002, adsZoom: 1.6, range: 185, projectileSpeed: 485,
    reloadStyle: 'bolt', sound: { crackFreq: 2100, thumpFreq: 162, tailDecay: 0.44, pitchJitter: 0.04 },
    model: { barrelLen: 0.6, bodyLen: 0.45, stock: 'full_wood', mag: 'box', scope: 'iron', metal: '#282d33', wood: '#663c20' },
  }),
  makeWeapon({
    id: 'ww2_rifle_svt40', name: 'Tokarev-Pattern Semi 40', era: 'ww2', category: 'rifle',
    damage: 45, headshotMult: 1.95, fireRate: 280, magSize: 10, reserveMax: 70, reloadTime: 2.1,
    recoilX: 0.6, recoilY: 2.1, spreadHip: 0.034, spreadAds: 0.003, adsZoom: 1.5, range: 170, projectileSpeed: 480,
    reloadStyle: 'box', sound: { crackFreq: 2000, thumpFreq: 152, tailDecay: 0.39, pitchJitter: 0.05 },
    model: { barrelLen: 0.58, bodyLen: 0.45, stock: 'full_wood', mag: 'box', scope: 'iron', metal: '#2d3238', wood: '#693d1f' },
  }),
  makeWeapon({
    id: 'ww2_rifle_carbine', name: 'Paratroop Light Carbine', era: 'ww2', category: 'rifle',
    damage: 34, headshotMult: 1.85, fireRate: 390, magSize: 15, reserveMax: 90, reloadTime: 1.7,
    recoilX: 0.45, recoilY: 1.5, spreadHip: 0.025, spreadAds: 0.004, adsZoom: 1.4, range: 135, projectileSpeed: 425,
    reloadStyle: 'box', sound: { crackFreq: 1880, thumpFreq: 130, tailDecay: 0.3, pitchJitter: 0.06 },
    model: { barrelLen: 0.42, bodyLen: 0.38, stock: 'wood_carbine', mag: 'box', scope: 'iron', metal: '#2c3138', wood: '#704425' },
  }),

  // ================= WW2 SMGS (5) =================
  makeWeapon({
    id: 'ww2_smg_typewriter', name: 'Chicago Squad M1A', era: 'ww2', category: 'smg',
    damage: 27, headshotMult: 1.7, fireRate: 700, magSize: 30, reserveMax: 150, reloadTime: 2.0,
    recoilX: 0.85, recoilY: 1.55, spreadHip: 0.027, spreadAds: 0.01, adsZoom: 1.3, range: 85, projectileSpeed: 360,
    reloadStyle: 'box', sound: { crackFreq: 1460, thumpFreq: 135, tailDecay: 0.24, pitchJitter: 0.08 },
    model: { barrelLen: 0.28, bodyLen: 0.34, stock: 'wood_carbine', mag: 'box', scope: 'iron', metal: '#242930', wood: '#724524' },
  }),
  makeWeapon({
    id: 'ww2_smg_mp40', name: 'Folding-Stock MP-40', era: 'ww2', category: 'smg',
    damage: 25, headshotMult: 1.65, fireRate: 550, magSize: 32, reserveMax: 160, reloadTime: 1.95,
    recoilX: 0.68, recoilY: 1.25, spreadHip: 0.024, spreadAds: 0.0085, adsZoom: 1.32, range: 95, projectileSpeed: 370,
    reloadStyle: 'box', sound: { crackFreq: 1540, thumpFreq: 120, tailDecay: 0.22, pitchJitter: 0.07 },
    model: { barrelLen: 0.27, bodyLen: 0.33, stock: 'wire', mag: 'box', scope: 'iron', metal: '#262b32', wood: '#3b2b23' },
  }),
  makeWeapon({
    id: 'ww2_smg_ppsh', name: 'Drum-71 Bullet Hose', era: 'ww2', category: 'smg',
    damage: 20, headshotMult: 1.6, fireRate: 950, magSize: 71, reserveMax: 213, reloadTime: 2.65,
    recoilX: 1.05, recoilY: 1.45, spreadHip: 0.034, spreadAds: 0.013, adsZoom: 1.25, range: 78, projectileSpeed: 375,
    reloadStyle: 'drum', sound: { crackFreq: 1780, thumpFreq: 110, tailDecay: 0.2, pitchJitter: 0.09 },
    model: { barrelLen: 0.3, bodyLen: 0.36, stock: 'full_wood', mag: 'drum', scope: 'iron', metal: '#2b3036', wood: '#6e4222' },
  }),
  makeWeapon({
    id: 'ww2_smg_sten', name: 'Tube-Frame Mk.II', era: 'ww2', category: 'smg',
    damage: 24, headshotMult: 1.65, fireRate: 560, magSize: 32, reserveMax: 160, reloadTime: 1.9,
    recoilX: 0.72, recoilY: 1.3, spreadHip: 0.026, spreadAds: 0.0095, adsZoom: 1.3, range: 90, projectileSpeed: 365,
    reloadStyle: 'side_mag', sound: { crackFreq: 1580, thumpFreq: 118, tailDecay: 0.21, pitchJitter: 0.08 },
    model: { barrelLen: 0.26, bodyLen: 0.32, stock: 'wire', mag: 'side_box', scope: 'iron', metal: '#31363d', wood: '#3b3b3b' },
  }),
  makeWeapon({
    id: 'ww2_smg_suomi', name: 'Nordic Drum-50 SMG', era: 'ww2', category: 'smg',
    damage: 24, headshotMult: 1.65, fireRate: 760, magSize: 50, reserveMax: 200, reloadTime: 2.4,
    recoilX: 0.88, recoilY: 1.4, spreadHip: 0.029, spreadAds: 0.01, adsZoom: 1.3, range: 88, projectileSpeed: 370,
    reloadStyle: 'drum', sound: { crackFreq: 1650, thumpFreq: 122, tailDecay: 0.22, pitchJitter: 0.08 },
    model: { barrelLen: 0.31, bodyLen: 0.36, stock: 'full_wood', mag: 'drum', scope: 'iron', metal: '#282c32', wood: '#7a4d2c' },
  }),

  // ================= WW2 MACHINE GUNS (5) =================
  makeWeapon({
    id: 'ww2_mg_bar', name: 'Automatic Squad Rifle 18A2', era: 'ww2', category: 'mg',
    damage: 38, headshotMult: 1.85, fireRate: 500, magSize: 20, reserveMax: 160, reloadTime: 2.25,
    recoilX: 0.9, recoilY: 1.75, spreadHip: 0.04, spreadAds: 0.008, adsZoom: 1.4, range: 150, projectileSpeed: 460,
    reloadStyle: 'box', sound: { crackFreq: 1760, thumpFreq: 162, tailDecay: 0.36, pitchJitter: 0.06 },
    model: { barrelLen: 0.52, bodyLen: 0.44, stock: 'full_wood', mag: 'box', scope: 'iron', metal: '#252a30', wood: '#663c20' },
  }),
  makeWeapon({
    id: 'ww2_mg_buzzsaw', name: 'High-Cyclic Buzzsaw-42', era: 'ww2', category: 'mg',
    damage: 28, headshotMult: 1.7, fireRate: 1100, magSize: 100, reserveMax: 250, reloadTime: 3.4,
    recoilX: 1.25, recoilY: 1.7, spreadHip: 0.058, spreadAds: 0.014, adsZoom: 1.32, range: 145, projectileSpeed: 460,
    reloadStyle: 'belt', sound: { crackFreq: 1850, thumpFreq: 148, tailDecay: 0.3, pitchJitter: 0.09 },
    model: { barrelLen: 0.54, bodyLen: 0.46, stock: 'wood_carbine', mag: 'belt', scope: 'iron', metal: '#272c33', wood: '#57331d' },
  }),
  makeWeapon({
    id: 'ww2_mg_bren', name: 'Top-Feed Bren LMG', era: 'ww2', category: 'mg',
    damage: 35, headshotMult: 1.8, fireRate: 520, magSize: 30, reserveMax: 180, reloadTime: 2.4,
    recoilX: 0.85, recoilY: 1.5, spreadHip: 0.04, spreadAds: 0.0085, adsZoom: 1.38, range: 155, projectileSpeed: 465,
    reloadStyle: 'top_box', sound: { crackFreq: 1720, thumpFreq: 155, tailDecay: 0.35, pitchJitter: 0.06 },
    model: { barrelLen: 0.5, bodyLen: 0.44, stock: 'full_wood', mag: 'top_box', scope: 'iron', metal: '#292e35', wood: '#6c4122' },
  }),
  makeWeapon({
    id: 'ww2_mg_dp28', name: 'Platter-Pan DP-28', era: 'ww2', category: 'mg',
    damage: 34, headshotMult: 1.75, fireRate: 550, magSize: 47, reserveMax: 188, reloadTime: 2.85,
    recoilX: 0.92, recoilY: 1.55, spreadHip: 0.044, spreadAds: 0.0095, adsZoom: 1.35, range: 150, projectileSpeed: 455,
    reloadStyle: 'top_pan', sound: { crackFreq: 1680, thumpFreq: 158, tailDecay: 0.35, pitchJitter: 0.06 },
    model: { barrelLen: 0.52, bodyLen: 0.45, stock: 'full_wood', mag: 'top_pan', scope: 'iron', metal: '#2a2f36', wood: '#643b1e' },
  }),
  makeWeapon({
    id: 'ww2_mg_1919', name: 'Air-Cooled Belt-1919', era: 'ww2', category: 'mg',
    damage: 33, headshotMult: 1.75, fireRate: 600, magSize: 100, reserveMax: 250, reloadTime: 3.5,
    recoilX: 1.1, recoilY: 1.6, spreadHip: 0.052, spreadAds: 0.012, adsZoom: 1.35, range: 150, projectileSpeed: 460,
    reloadStyle: 'belt', sound: { crackFreq: 1640, thumpFreq: 165, tailDecay: 0.36, pitchJitter: 0.06 },
    model: { barrelLen: 0.55, bodyLen: 0.46, stock: 'none', mag: 'belt', scope: 'iron', metal: '#23282e', wood: '#4e2f1b' },
  }),

  // ================= WW2 SHOTGUNS (5) =================
  makeWeapon({
    id: 'ww2_shotgun_m37', name: 'Bottom-Eject Trench M37', era: 'ww2', category: 'shotgun',
    damage: 19, pellets: 8, headshotMult: 1.5, fireRate: 120, magSize: 6, reserveMax: 36, reloadTime: 2.2,
    recoilX: 1.15, recoilY: 4.1, spreadHip: 0.062, spreadAds: 0.04, adsZoom: 1.18, range: 44, projectileSpeed: 365,
    reloadStyle: 'pump', sound: { crackFreq: 1320, thumpFreq: 185, tailDecay: 0.42, pitchJitter: 0.05 },
    model: { barrelLen: 0.47, bodyLen: 0.38, stock: 'full_wood', mag: 'tube', scope: 'iron', metal: '#252a30', wood: '#673d20' },
  }),
  makeWeapon({
    id: 'ww2_shotgun_drilling', name: 'Luft-Survival Triple M30', era: 'ww2', category: 'shotgun',
    damage: 22, pellets: 9, headshotMult: 1.55, fireRate: 165, magSize: 2, reserveMax: 32, reloadTime: 1.7,
    recoilX: 1.35, recoilY: 4.6, spreadHip: 0.064, spreadAds: 0.042, adsZoom: 1.2, range: 42, projectileSpeed: 360,
    reloadStyle: 'break', sound: { crackFreq: 1280, thumpFreq: 192, tailDecay: 0.44, pitchJitter: 0.05 },
    model: { barrelLen: 0.48, bodyLen: 0.36, stock: 'full_wood', mag: 'none', scope: 'iron', metal: '#2c3138', wood: '#704425' },
  }),
  makeWeapon({
    id: 'ww2_shotgun_combat12', name: 'Combat Pump Model 12', era: 'ww2', category: 'shotgun',
    damage: 18, pellets: 8, headshotMult: 1.5, fireRate: 135, magSize: 6, reserveMax: 42, reloadTime: 2.15,
    recoilX: 1.1, recoilY: 3.9, spreadHip: 0.06, spreadAds: 0.038, adsZoom: 1.2, range: 45, projectileSpeed: 370,
    reloadStyle: 'pump', sound: { crackFreq: 1340, thumpFreq: 180, tailDecay: 0.4, pitchJitter: 0.05 },
    model: { barrelLen: 0.46, bodyLen: 0.38, stock: 'full_wood', mag: 'tube', scope: 'iron', metal: '#24282e', wood: '#62391d' },
  }),
  makeWeapon({
    id: 'ww2_shotgun_a5tac', name: 'Semi-Auto Tactical A5', era: 'ww2', category: 'shotgun',
    damage: 16, pellets: 8, headshotMult: 1.45, fireRate: 210, magSize: 5, reserveMax: 35, reloadTime: 2.1,
    recoilX: 1.05, recoilY: 3.6, spreadHip: 0.066, spreadAds: 0.044, adsZoom: 1.18, range: 40, projectileSpeed: 360,
    reloadStyle: 'pump', sound: { crackFreq: 1380, thumpFreq: 174, tailDecay: 0.38, pitchJitter: 0.06 },
    model: { barrelLen: 0.45, bodyLen: 0.37, stock: 'full_wood', mag: 'tube', scope: 'iron', metal: '#2a2f36', wood: '#6e4222' },
  }),
  makeWeapon({
    id: 'ww2_shotgun_para', name: 'Airborne Folding Breacher', era: 'ww2', category: 'shotgun',
    damage: 20, pellets: 9, headshotMult: 1.5, fireRate: 145, magSize: 4, reserveMax: 32, reloadTime: 1.9,
    recoilX: 1.25, recoilY: 4.3, spreadHip: 0.075, spreadAds: 0.052, adsZoom: 1.15, range: 36, projectileSpeed: 350,
    reloadStyle: 'pump', sound: { crackFreq: 1290, thumpFreq: 186, tailDecay: 0.4, pitchJitter: 0.06 },
    model: { barrelLen: 0.34, bodyLen: 0.34, stock: 'wire', mag: 'tube', scope: 'iron', metal: '#2e333a', wood: '#57331d' },
  }),

  // ================= WW2 SNIPERS (5) =================
  makeWeapon({
    id: 'ww2_sniper_k98zf', name: 'ZF-39 Precision K98', era: 'ww2', category: 'sniper',
    damage: 96, headshotMult: 2.5, fireRate: 54, magSize: 5, reserveMax: 35, reloadTime: 2.25,
    recoilX: 0.68, recoilY: 3.9, spreadHip: 0.072, spreadAds: 0.0005, adsZoom: 4.0, range: 265, projectileSpeed: 570,
    reloadStyle: 'bolt', sound: { crackFreq: 2350, thumpFreq: 175, tailDecay: 0.55, pitchJitter: 0.03 },
    model: { barrelLen: 0.68, bodyLen: 0.45, stock: 'full_wood', mag: 'internal', scope: 'optic', metal: '#252a30', wood: '#704224' },
  }),
  makeWeapon({
    id: 'ww2_sniper_m1903a4', name: 'A4 Marksman Rifle', era: 'ww2', category: 'sniper',
    damage: 92, headshotMult: 2.5, fireRate: 58, magSize: 5, reserveMax: 35, reloadTime: 2.15,
    recoilX: 0.65, recoilY: 3.7, spreadHip: 0.07, spreadAds: 0.0005, adsZoom: 3.8, range: 255, projectileSpeed: 560,
    reloadStyle: 'bolt', sound: { crackFreq: 2280, thumpFreq: 170, tailDecay: 0.53, pitchJitter: 0.03 },
    model: { barrelLen: 0.68, bodyLen: 0.45, stock: 'full_wood', mag: 'internal', scope: 'optic', metal: '#282d33', wood: '#663c20' },
  }),
  makeWeapon({
    id: 'ww2_sniper_pu', name: 'PU-Optic Infantry Rifle', era: 'ww2', category: 'sniper',
    damage: 94, headshotMult: 2.5, fireRate: 55, magSize: 5, reserveMax: 35, reloadTime: 2.2,
    recoilX: 0.68, recoilY: 3.8, spreadHip: 0.072, spreadAds: 0.0006, adsZoom: 3.6, range: 260, projectileSpeed: 560,
    reloadStyle: 'bolt', sound: { crackFreq: 2300, thumpFreq: 172, tailDecay: 0.54, pitchJitter: 0.03 },
    model: { barrelLen: 0.7, bodyLen: 0.46, stock: 'full_wood', mag: 'internal', scope: 'optic', metal: '#2a2e34', wood: '#5f371e' },
  }),
  makeWeapon({
    id: 'ww2_sniper_no4t', name: 'No.4(T) Sharpshooter', era: 'ww2', category: 'sniper',
    damage: 88, headshotMult: 2.45, fireRate: 64, magSize: 10, reserveMax: 40, reloadTime: 2.4,
    recoilX: 0.62, recoilY: 3.5, spreadHip: 0.068, spreadAds: 0.0006, adsZoom: 3.5, range: 245, projectileSpeed: 545,
    reloadStyle: 'bolt', sound: { crackFreq: 2200, thumpFreq: 168, tailDecay: 0.52, pitchJitter: 0.03 },
    model: { barrelLen: 0.67, bodyLen: 0.45, stock: 'full_wood', mag: 'box', scope: 'optic', metal: '#272c32', wood: '#6a3e20' },
  }),
  makeWeapon({
    id: 'ww2_sniper_g43', name: 'ZF-4 Semi-Auto Marksman', era: 'ww2', category: 'sniper',
    damage: 64, headshotMult: 2.25, fireRate: 220, magSize: 10, reserveMax: 50, reloadTime: 2.1,
    recoilX: 0.7, recoilY: 2.7, spreadHip: 0.055, spreadAds: 0.0012, adsZoom: 3.2, range: 230, projectileSpeed: 520,
    reloadStyle: 'box', sound: { crackFreq: 2150, thumpFreq: 158, tailDecay: 0.46, pitchJitter: 0.04 },
    model: { barrelLen: 0.62, bodyLen: 0.45, stock: 'full_wood', mag: 'box', scope: 'optic', metal: '#252a30', wood: '#6e4223' },
  }),

  // ================= WW2 GRENADES (5) =================
  makeWeapon({
    id: 'ww2_grenade_pineapple', name: 'Pineapple Frag Mk.II', era: 'ww2', category: 'grenade', isGrenade: true,
    damage: 125, headshotMult: 1.0, fireRate: 62, magSize: 2, reserveMax: 4, reloadTime: 1.15,
    recoilX: 0, recoilY: 1.2, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 48, projectileSpeed: 26, splashRadius: 7.5,
    reloadStyle: 'throw', sound: { crackFreq: 510, thumpFreq: 58, tailDecay: 0.65, pitchJitter: 0.08 },
    model: { barrelLen: 0.08, bodyLen: 0.11, stock: 'none', mag: 'none', scope: 'none', metal: '#3c4937', wood: '#5a4e36' },
  }),
  makeWeapon({
    id: 'ww2_grenade_masher', name: 'M24 Stick Charge', era: 'ww2', category: 'grenade', isGrenade: true,
    damage: 118, headshotMult: 1.0, fireRate: 65, magSize: 2, reserveMax: 4, reloadTime: 1.15,
    recoilX: 0, recoilY: 1.2, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 56, projectileSpeed: 29, splashRadius: 7.2,
    reloadStyle: 'throw', sound: { crackFreq: 530, thumpFreq: 60, tailDecay: 0.62, pitchJitter: 0.08 },
    model: { barrelLen: 0.1, bodyLen: 0.28, stock: 'wood_handle', mag: 'none', scope: 'none', metal: '#434843', wood: '#704929' },
  }),
  makeWeapon({
    id: 'ww2_grenade_gammon', name: 'Impact Armor Bomb', era: 'ww2', category: 'grenade', isGrenade: true,
    damage: 155, headshotMult: 1.0, fireRate: 50, magSize: 1, reserveMax: 3, reloadTime: 1.3,
    recoilX: 0, recoilY: 1.3, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 38, projectileSpeed: 22, splashRadius: 6.5,
    reloadStyle: 'throw', sound: { crackFreq: 460, thumpFreq: 54, tailDecay: 0.72, pitchJitter: 0.07 },
    model: { barrelLen: 0.1, bodyLen: 0.14, stock: 'none', mag: 'none', scope: 'none', metal: '#5a5643', wood: '#4c4638' },
  }),
  makeWeapon({
    id: 'ww2_grenade_smoke', name: 'Tactical Smoke M18', era: 'ww2', category: 'grenade', isGrenade: true,
    damage: 10, headshotMult: 1.0, fireRate: 65, magSize: 2, reserveMax: 4, reloadTime: 1.1,
    recoilX: 0, recoilY: 1.0, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 50, projectileSpeed: 26, splashRadius: 8.5,
    reloadStyle: 'throw', sound: { crackFreq: 850, thumpFreq: 95, tailDecay: 0.45, pitchJitter: 0.08 },
    model: { barrelLen: 0.08, bodyLen: 0.14, stock: 'none', mag: 'none', scope: 'none', metal: '#556151', wood: '#4f4f4f' },
  }),
  makeWeapon({
    id: 'ww2_grenade_thermite', name: 'Thermite Breach Charge', era: 'ww2', category: 'grenade', isGrenade: true, isFlame: true,
    damage: 95, headshotMult: 1.0, fireRate: 58, magSize: 2, reserveMax: 4, reloadTime: 1.2,
    recoilX: 0, recoilY: 1.1, spreadHip: 0.01, spreadAds: 0.01, adsZoom: 1.05, range: 44, projectileSpeed: 24, splashRadius: 6.5,
    reloadStyle: 'throw', sound: { crackFreq: 980, thumpFreq: 75, tailDecay: 0.6, pitchJitter: 0.08 },
    model: { barrelLen: 0.09, bodyLen: 0.13, stock: 'none', mag: 'none', scope: 'none', metal: '#78412b', wood: '#4c382a' },
  }),

  // ================= WW2 ANTI-TANK LAUNCHERS (5) =================
  makeWeapon({
    id: 'ww2_launcher_bazooka', name: 'Shoulder Tube M1A1', era: 'ww2', category: 'launcher', isLauncher: true,
    damage: 215, headshotMult: 1.0, fireRate: 28, magSize: 1, reserveMax: 6, reloadTime: 2.7,
    recoilX: 0.8, recoilY: 2.8, spreadHip: 0.03, spreadAds: 0.008, adsZoom: 1.3, range: 150, projectileSpeed: 74, splashRadius: 5.5,
    reloadStyle: 'tube', sound: { crackFreq: 680, thumpFreq: 58, tailDecay: 0.6, pitchJitter: 0.06 },
    model: { barrelLen: 0.92, bodyLen: 0.52, stock: 'wood_carbine', mag: 'tube', scope: 'iron', metal: '#434b3b', wood: '#5c3c22' },
  }),
  makeWeapon({
    id: 'ww2_launcher_schreck', name: 'Shielded 88mm Launcher', era: 'ww2', category: 'launcher', isLauncher: true,
    damage: 240, headshotMult: 1.0, fireRate: 24, magSize: 1, reserveMax: 5, reloadTime: 3.0,
    recoilX: 0.9, recoilY: 3.2, spreadHip: 0.032, spreadAds: 0.009, adsZoom: 1.3, range: 155, projectileSpeed: 72, splashRadius: 6.0,
    reloadStyle: 'tube', sound: { crackFreq: 620, thumpFreq: 52, tailDecay: 0.65, pitchJitter: 0.06 },
    model: { barrelLen: 0.96, bodyLen: 0.54, stock: 'none', mag: 'tube', scope: 'iron', metal: '#5a5648', wood: '#43382e' },
  }),
  makeWeapon({
    id: 'ww2_launcher_faust', name: 'Disposable AT-60 Faust', era: 'ww2', category: 'launcher', isLauncher: true,
    damage: 255, headshotMult: 1.0, fireRate: 34, magSize: 1, reserveMax: 4, reloadTime: 2.4,
    recoilX: 0.6, recoilY: 2.4, spreadHip: 0.035, spreadAds: 0.01, adsZoom: 1.25, range: 90, projectileSpeed: 58, splashRadius: 5.2,
    reloadStyle: 'tube', sound: { crackFreq: 710, thumpFreq: 62, tailDecay: 0.52, pitchJitter: 0.07 },
    model: { barrelLen: 0.72, bodyLen: 0.4, stock: 'none', mag: 'tube', scope: 'iron', metal: '#6a654f', wood: '#4a4337' },
  }),
  makeWeapon({
    id: 'ww2_launcher_piat', name: 'Spring-Spigot AT Projector', era: 'ww2', category: 'launcher', isLauncher: true,
    damage: 205, headshotMult: 1.0, fireRate: 30, magSize: 1, reserveMax: 6, reloadTime: 2.6,
    recoilX: 1.1, recoilY: 3.6, spreadHip: 0.036, spreadAds: 0.011, adsZoom: 1.25, range: 115, projectileSpeed: 56, splashRadius: 5.5,
    reloadStyle: 'tube', sound: { crackFreq: 590, thumpFreq: 64, tailDecay: 0.54, pitchJitter: 0.06 },
    model: { barrelLen: 0.78, bodyLen: 0.48, stock: 'none', mag: 'tube', scope: 'iron', metal: '#474c3f', wood: '#42382e' },
  }),
  makeWeapon({
    id: 'ww2_launcher_boys', name: 'Anti-Armor .55 Boys Rifle', era: 'ww2', category: 'launcher', isLauncher: true,
    damage: 145, headshotMult: 1.6, fireRate: 44, magSize: 5, reserveMax: 20, reloadTime: 2.5,
    recoilX: 1.4, recoilY: 4.8, spreadHip: 0.055, spreadAds: 0.002, adsZoom: 1.6, range: 215, projectileSpeed: 445, splashRadius: 1.6,
    reloadStyle: 'bolt', sound: { crackFreq: 1860, thumpFreq: 78, tailDecay: 0.62, pitchJitter: 0.04 },
    model: { barrelLen: 0.9, bodyLen: 0.5, stock: 'full_wood', mag: 'top_box', scope: 'iron', metal: '#24292e', wood: '#57361f' },
  }),

  // ================= WW2 MINES (5) =================
  makeWeapon({
    id: 'ww2_mine_smine', name: 'Bouncing S-Mine', era: 'ww2', category: 'mine', isMine: true,
    damage: 150, headshotMult: 1.0, fireRate: 60, magSize: 2, reserveMax: 4, reloadTime: 1.4,
    recoilX: 0, recoilY: 0.4, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 8, splashRadius: 6.2,
    reloadStyle: 'place', sound: { crackFreq: 660, thumpFreq: 95, tailDecay: 0.3, pitchJitter: 0.05 },
    model: { barrelLen: 0.06, bodyLen: 0.16, stock: 'none', mag: 'none', scope: 'none', metal: '#494e43', wood: '#44443b' },
  }),
  makeWeapon({
    id: 'ww2_mine_teller', name: 'Teller Armor Disc', era: 'ww2', category: 'mine', isMine: true,
    damage: 310, headshotMult: 1.0, fireRate: 50, magSize: 2, reserveMax: 4, reloadTime: 1.6,
    recoilX: 0, recoilY: 0.5, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 7, splashRadius: 5.0,
    reloadStyle: 'place', sound: { crackFreq: 560, thumpFreq: 84, tailDecay: 0.34, pitchJitter: 0.05 },
    model: { barrelLen: 0.05, bodyLen: 0.22, stock: 'none', mag: 'none', scope: 'none', metal: '#5b5645', wood: '#474337' },
  }),
  makeWeapon({
    id: 'ww2_mine_hawkins', name: 'Hawkins Track-Breaker', era: 'ww2', category: 'mine', isMine: true,
    damage: 260, headshotMult: 1.0, fireRate: 55, magSize: 2, reserveMax: 4, reloadTime: 1.5,
    recoilX: 0, recoilY: 0.4, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 8, splashRadius: 4.8,
    reloadStyle: 'place', sound: { crackFreq: 590, thumpFreq: 88, tailDecay: 0.32, pitchJitter: 0.05 },
    model: { barrelLen: 0.06, bodyLen: 0.18, stock: 'none', mag: 'none', scope: 'none', metal: '#4d4637', wood: '#574a37' },
  }),
  makeWeapon({
    id: 'ww2_mine_magnetic', name: 'Magnetic Hull Charge', era: 'ww2', category: 'mine', isMine: true,
    damage: 330, headshotMult: 1.0, fireRate: 48, magSize: 1, reserveMax: 3, reloadTime: 1.7,
    recoilX: 0, recoilY: 0.5, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 7, splashRadius: 4.5,
    reloadStyle: 'place', sound: { crackFreq: 540, thumpFreq: 80, tailDecay: 0.36, pitchJitter: 0.05 },
    model: { barrelLen: 0.07, bodyLen: 0.19, stock: 'none', mag: 'none', scope: 'none', metal: '#3c4046', wood: '#453e33' },
  }),
  makeWeapon({
    id: 'ww2_mine_tripfrag', name: 'Tripwire Frag Stake', era: 'ww2', category: 'mine', isMine: true,
    damage: 140, headshotMult: 1.0, fireRate: 65, magSize: 2, reserveMax: 5, reloadTime: 1.35,
    recoilX: 0, recoilY: 0.4, spreadHip: 0, spreadAds: 0, adsZoom: 1.0, range: 4, projectileSpeed: 8, splashRadius: 6.0,
    reloadStyle: 'place', sound: { crackFreq: 690, thumpFreq: 95, tailDecay: 0.3, pitchJitter: 0.05 },
    model: { barrelLen: 0.06, bodyLen: 0.16, stock: 'none', mag: 'none', scope: 'none', metal: '#434b3c', wood: '#553a24' },
  }),

  // ================= WW2 FLAMETHROWERS (5) =================
  makeWeapon({
    id: 'ww2_flame_m2', name: 'Dual-Tank M2 Projector', era: 'ww2', category: 'flamethrower', isFlame: true,
    damage: 20, headshotMult: 1.0, fireRate: 760, magSize: 90, reserveMax: 180, reloadTime: 2.8,
    recoilX: 0.24, recoilY: 0.34, spreadHip: 0.038, spreadAds: 0.022, adsZoom: 1.1, range: 21, projectileSpeed: 37, splashRadius: 2.2,
    reloadStyle: 'tank', sound: { crackFreq: 490, thumpFreq: 95, tailDecay: 0.22, pitchJitter: 0.12 },
    model: { barrelLen: 0.62, bodyLen: 0.38, stock: 'none', mag: 'tank', scope: 'none', metal: '#3e4738', wood: '#4c3420' },
  }),
  makeWeapon({
    id: 'ww2_flame_einstoss', name: 'Compact Assault Torch 46', era: 'ww2', category: 'flamethrower', isFlame: true,
    damage: 18, headshotMult: 1.0, fireRate: 840, magSize: 65, reserveMax: 195, reloadTime: 2.2,
    recoilX: 0.18, recoilY: 0.28, spreadHip: 0.045, spreadAds: 0.028, adsZoom: 1.1, range: 17, projectileSpeed: 35, splashRadius: 2.0,
    reloadStyle: 'tank', sound: { crackFreq: 540, thumpFreq: 102, tailDecay: 0.2, pitchJitter: 0.12 },
    model: { barrelLen: 0.5, bodyLen: 0.34, stock: 'none', mag: 'tank', scope: 'none', metal: '#5a5646', wood: '#483b2c' },
  }),
  makeWeapon({
    id: 'ww2_flame_croc', name: 'Heavy Bunker Burner', era: 'ww2', category: 'flamethrower', isFlame: true,
    damage: 24, headshotMult: 1.0, fireRate: 680, magSize: 100, reserveMax: 200, reloadTime: 3.1,
    recoilX: 0.28, recoilY: 0.38, spreadHip: 0.034, spreadAds: 0.02, adsZoom: 1.1, range: 24, projectileSpeed: 40, splashRadius: 2.4,
    reloadStyle: 'tank', sound: { crackFreq: 450, thumpFreq: 86, tailDecay: 0.25, pitchJitter: 0.11 },
    model: { barrelLen: 0.68, bodyLen: 0.4, stock: 'none', mag: 'tank', scope: 'none', metal: '#373e34', wood: '#4a321f' },
  }),
  makeWeapon({
    id: 'ww2_flame_roks3', name: 'Rifle-Disguised Flamer-3', era: 'ww2', category: 'flamethrower', isFlame: true,
    damage: 19, headshotMult: 1.0, fireRate: 740, magSize: 80, reserveMax: 160, reloadTime: 2.75,
    recoilX: 0.22, recoilY: 0.32, spreadHip: 0.04, spreadAds: 0.024, adsZoom: 1.12, range: 20, projectileSpeed: 36, splashRadius: 2.1,
    reloadStyle: 'tank', sound: { crackFreq: 500, thumpFreq: 92, tailDecay: 0.22, pitchJitter: 0.11 },
    model: { barrelLen: 0.62, bodyLen: 0.4, stock: 'full_wood', mag: 'tank', scope: 'none', metal: '#34393f', wood: '#663c20' },
  }),
  makeWeapon({
    id: 'ww2_flame_marine', name: 'Pacific Raider Flamer', era: 'ww2', category: 'flamethrower', isFlame: true,
    damage: 21, headshotMult: 1.0, fireRate: 780, magSize: 85, reserveMax: 170, reloadTime: 2.7,
    recoilX: 0.25, recoilY: 0.35, spreadHip: 0.038, spreadAds: 0.022, adsZoom: 1.1, range: 22, projectileSpeed: 38, splashRadius: 2.3,
    reloadStyle: 'tank', sound: { crackFreq: 480, thumpFreq: 90, tailDecay: 0.23, pitchJitter: 0.12 },
    model: { barrelLen: 0.6, bodyLen: 0.38, stock: 'none', mag: 'tank', scope: 'none', metal: '#434b3b', wood: '#4e3522' },
  }),
];

export const WEAPONS_BY_ID = Object.fromEntries(WEAPONS.map((w) => [w.id, w]));

export function getWeaponsForEraAndCategory(era, category) {
  return WEAPONS.filter((w) => w.era === era && w.category === category);
}
