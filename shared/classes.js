export const CLASSES = {
  assault: {
    id: 'assault',
    name: 'Assault',
    maxHp: 110,
    speedMult: 1.06,
    allowedCategories: ['rifle', 'smg', 'shotgun', 'flamethrower'],
    defaultPrimary: { ww1: 'ww1_smg_mp18', ww2: 'ww2_smg_typewriter' },
    defaultSecondary: { ww1: 'ww1_pistol_trench45', ww2: 'ww2_pistol_m45' },
    defaultExplosive: { ww1: 'ww1_grenade_mills', ww2: 'ww2_grenade_pineapple' },
    gadget: 'adrenaline',
    gadgetLabel: 'Adrenaline Surge (+Speed/Heal)',
  },
  medic: {
    id: 'medic',
    name: 'Medic',
    maxHp: 100,
    speedMult: 1.04,
    allowedCategories: ['smg', 'rifle', 'shotgun'],
    defaultPrimary: { ww1: 'ww1_rifle_berthier', ww2: 'ww2_rifle_carbine' },
    defaultSecondary: { ww1: 'ww1_pistol_toggle08', ww2: 'ww2_pistol_p38' },
    defaultExplosive: { ww1: 'ww1_grenade_gas', ww2: 'ww2_grenade_smoke' },
    gadget: 'medkit',
    gadgetLabel: 'Field Medkit & Fast Revive',
  },
  support: {
    id: 'support',
    name: 'Support',
    maxHp: 115,
    speedMult: 0.96,
    allowedCategories: ['mg', 'shotgun', 'flamethrower'],
    defaultPrimary: { ww1: 'ww1_mg_lewis', ww2: 'ww2_mg_bar' },
    defaultSecondary: { ww1: 'ww1_pistol_revolver_mk4', ww2: 'ww2_pistol_tt33' },
    defaultExplosive: { ww1: 'ww1_grenade_stick15', ww2: 'ww2_grenade_masher' },
    gadget: 'ammobox',
    gadgetLabel: 'Ammo Crate & Vehicle Repair',
  },
  scout: {
    id: 'scout',
    name: 'Scout',
    maxHp: 95,
    speedMult: 1.08,
    allowedCategories: ['sniper', 'rifle'],
    defaultPrimary: { ww1: 'ww1_sniper_gewehr98s', ww2: 'ww2_sniper_k98zf' },
    defaultSecondary: { ww1: 'ww1_pistol_broom', ww2: 'ww2_pistol_commando' },
    defaultExplosive: { ww1: 'ww1_mine_trip', ww2: 'ww2_mine_smine' },
    gadget: 'flare',
    gadgetLabel: 'Recon Flare (Spots Enemies)',
  },
  anti_armor: {
    id: 'anti_armor',
    name: 'Anti-Armor',
    maxHp: 110,
    speedMult: 0.98,
    allowedCategories: ['launcher', 'shotgun', 'smg', 'mine'],
    defaultPrimary: { ww1: 'ww1_shotgun_trench97', ww2: 'ww2_smg_mp40' },
    defaultSecondary: { ww1: 'ww1_launcher_tgewehr', ww2: 'ww2_launcher_bazooka' },
    defaultExplosive: { ww1: 'ww1_mine_atbox', ww2: 'ww2_mine_teller' },
    gadget: 'at_mine',
    gadgetLabel: 'Heavy AT Launcher & Mines',
  },
};

export const CLASS_LIST = Object.values(CLASSES);

export const OUTFITS = [
  { id: 'standard', name: 'Standard Infantry', unlockLevel: 1, alliesColor: '#546444', axisColor: '#565c54', helmColor: '#434a39' },
  { id: 'trench_mud', name: 'Mud Trench Coat', unlockLevel: 2, alliesColor: '#63533d', axisColor: '#4e4841', helmColor: '#4a4337' },
  { id: 'desert_khaki', name: 'Desert Khaki', unlockLevel: 5, alliesColor: '#b59969', axisColor: '#9f875e', helmColor: '#917a53' },
  { id: 'winter_coat', name: 'Winter Overcoat', unlockLevel: 9, alliesColor: '#c3c9cc', axisColor: '#9ea6ab', helmColor: '#b0b8bc' },
  { id: 'storm_elite', name: 'Assault Stormtroop', unlockLevel: 14, alliesColor: '#3e4a38', axisColor: '#30343a', helmColor: '#25292e' },
  { id: 'naval_officer', name: 'Naval Fleet Officer', unlockLevel: 18, alliesColor: '#29384d', axisColor: '#26303d', helmColor: '#364457' },
];

export const CHALLENGES = [
  { id: 'ch_kills', name: 'Frontline Infantry', desc: 'Eliminate 25 enemy soldiers', stat: 'kills', target: 25, rewardXp: 600 },
  { id: 'ch_headshots', name: 'Deadeye Marksman', desc: 'Score 10 headshots', stat: 'headshots', target: 10, rewardXp: 750 },
  { id: 'ch_captures', name: 'Flag Bearer', desc: 'Capture 6 objectives', stat: 'captures', target: 6, rewardXp: 650 },
  { id: 'ch_vehicles', name: 'Armor Hunter', desc: 'Destroy 3 enemy vehicles', stat: 'vehiclesDestroyed', target: 3, rewardXp: 900 },
  { id: 'ch_revives', name: 'Angel of the Trenches', desc: 'Revive 4 teammates', stat: 'revives', target: 4, rewardXp: 700 },
];

export function xpForLevel(level) {
  return Math.floor(250 * Math.pow(level, 1.35));
}

export function getLevelFromXp(xp) {
  let lvl = 1;
  let remaining = xp;
  while (lvl < 50) {
    const need = xpForLevel(lvl);
    if (remaining < need) break;
    remaining -= need;
    lvl++;
  }
  return { level: lvl, currentXp: remaining, nextLevelXp: xpForLevel(lvl) };
}
