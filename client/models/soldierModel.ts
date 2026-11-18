import * as THREE from 'three';
import { OUTFITS } from '../../shared/classes';
import { WEAPONS_BY_ID } from '../../shared/weapons';
import { textureBank } from '../engine/textures';
import { buildWeaponMesh } from './weaponModels';

export interface SoldierRig {
  root: THREE.Group;
  torso: THREE.Group;
  head: THREE.Group;
  gasMask: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  weaponMount: THREE.Group;
  teamRing: THREE.Mesh;
  currentWeaponId: string;
  walkPhase: number;
}

export function createSoldierRig(team: 1 | 2, classId: string, outfitId = 'standard', era: 'ww1' | 'ww2' = 'ww2'): SoldierRig {
  const outfit = OUTFITS.find((o) => o.id === outfitId) || OUTFITS[0];
  const clothColor = team === 1 ? outfit.alliesColor : outfit.axisColor;
  const helmColor = team === 1 ? outfit.helmColor : '#3b4046';

  const clothMat = new THREE.MeshStandardMaterial({
    color: clothColor,
    map: textureBank.get('cloth'),
    roughness: 0.85,
    metalness: 0.05,
    emissive: team === 1 ? '#17263a' : '#2e1612',
    emissiveIntensity: 0.28, // Subtle readable team rim contrast
  });

  const leatherMat = new THREE.MeshStandardMaterial({
    color: '#3b281a',
    roughness: 0.72,
    metalness: 0.08,
  });

  const skinMat = new THREE.MeshStandardMaterial({
    color: '#c99b78',
    roughness: 0.75,
    metalness: 0.02,
  });

  const helmMat = new THREE.MeshStandardMaterial({
    color: helmColor,
    map: textureBank.get('steel'),
    roughness: 0.45,
    metalness: 0.55,
  });

  const root = new THREE.Group();

  // Team ground ring / indicator for clear teammate vs enemy readability
  const teamRing = new THREE.Mesh(
    new THREE.RingGeometry(0.45, 0.55, 20),
    new THREE.MeshBasicMaterial({
      color: team === 1 ? '#3b82f6' : '#ef4444',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    })
  );
  teamRing.rotation.x = -Math.PI / 2;
  teamRing.position.y = 0.03;
  root.add(teamRing);

  // Legs (pivoted at hip y = 0.85)
  const makeLeg = (xOff: number) => {
    const leg = new THREE.Group();
    leg.position.set(xOff, 0.85, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.095, 0.44, 10), clothMat);
    thigh.position.y = -0.22;
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.075, 0.36, 10), clothMat);
    shin.position.y = -0.58;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.24), leatherMat);
    boot.position.set(0, -0.78, -0.04);
    thigh.castShadow = true;
    shin.castShadow = true;
    leg.add(thigh, shin, boot);
    return leg;
  };
  const legL = makeLeg(-0.14);
  const legR = makeLeg(0.14);
  root.add(legL, legR);

  // Torso (pivoted at pelvis y = 0.85)
  const torso = new THREE.Group();
  torso.position.set(0, 0.85, 0);

  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.56, 0.26), clothMat);
  chest.position.y = 0.29;
  chest.castShadow = true;
  torso.add(chest);

  // Belt & ammo pouches
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.07, 0.28), leatherMat);
  belt.position.y = 0.05;
  const pouchL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 0.08), leatherMat);
  pouchL.position.set(-0.14, 0.09, -0.15);
  const pouchR = pouchL.clone();
  pouchR.position.x = 0.14;
  torso.add(belt, pouchL, pouchR);

  // Class-distinct backpack silhouette
  const packColor = classId === 'medic' ? '#dce2e6' : classId === 'anti_armor' ? '#4d4635' : '#5c523b';
  const pack = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.36, 0.15),
    new THREE.MeshStandardMaterial({ color: packColor, roughness: 0.8, metalness: 0.08 })
  );
  pack.position.set(0, 0.3, 0.19);
  torso.add(pack);
  if (classId === 'medic') {
    const crossH = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.05, 0.02),
      new THREE.MeshBasicMaterial({ color: '#dc2626' })
    );
    crossH.position.set(0, 0.3, 0.27);
    const crossV = crossH.clone();
    crossV.rotation.z = Math.PI / 2;
    torso.add(crossH, crossV);
  } else if (classId === 'support') {
    const drumPack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.34, 10), helmMat);
    drumPack.rotation.z = Math.PI / 2;
    drumPack.position.set(0, 0.48, 0.2);
    torso.add(drumPack);
  }

  // Head + Era-authentic Helmet
  const head = new THREE.Group();
  head.position.set(0, 0.62, 0);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.145, 12, 10), skinMat);
  skull.position.y = 0.12;
  head.add(skull);

  if (era === 'ww1' && team === 1) {
    // Brodie flat saucer trench helmet
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.158, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), helmMat);
    dome.position.y = 0.15;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.015, 16), helmMat);
    brim.position.y = 0.14;
    head.add(dome, brim);
  } else {
    // M1 / Stahlhelm flared pot helmet
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.165, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), helmMat);
    dome.position.y = 0.14;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.185, 0.08, 14, 1, true), helmMat);
    skirt.position.set(0, 0.11, 0.02);
    head.add(dome, skirt);
  }

  // Gas mask attachment (toggled visible during WW1 gas attacks!)
  const gasMask = new THREE.Group();
  const maskRubber = new THREE.MeshStandardMaterial({ color: '#2b2d26', roughness: 0.78, metalness: 0.1 });
  const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.09, 10), maskRubber);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.06, -0.15);
  const goggleL = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.025, 10),
    new THREE.MeshStandardMaterial({ color: '#9ab4c2', roughness: 0.2, metalness: 0.6 })
  );
  goggleL.rotation.x = Math.PI / 2;
  goggleL.position.set(-0.055, 0.13, -0.13);
  const goggleR = goggleL.clone();
  goggleR.position.x = 0.055;
  gasMask.add(snout, goggleL, goggleR);
  gasMask.visible = false;
  head.add(gasMask);
  torso.add(head);

  // Arms
  const makeArm = (xOff: number) => {
    const arm = new THREE.Group();
    arm.position.set(xOff, 0.52, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.34, 8), clothMat);
    upper.position.set(0, -0.14, -0.06);
    upper.rotation.x = 0.7;
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.28, 8), clothMat);
    fore.position.set(0, -0.22, -0.22);
    fore.rotation.x = 1.25;
    arm.add(upper, fore);
    return arm;
  };
  const armL = makeArm(-0.27);
  const armR = makeArm(0.27);

  const weaponMount = new THREE.Group();
  weaponMount.position.set(0.14, 0.34, -0.28);
  torso.add(armL, armR, weaponMount);
  root.add(torso);

  return {
    root,
    torso,
    head,
    gasMask,
    armL,
    armR,
    legL,
    legR,
    weaponMount,
    teamRing,
    currentWeaponId: '',
    walkPhase: 0,
  };
}

export function setSoldierWeapon(rig: SoldierRig, weaponId: string): void {
  if (rig.currentWeaponId === weaponId) return;
  rig.currentWeaponId = weaponId;
  rig.weaponMount.clear();
  const def = WEAPONS_BY_ID[weaponId];
  if (def) {
    const built = buildWeaponMesh(def, 'standard');
    rig.weaponMount.add(built.root);
  }
}

export function animateSoldierRig(
  rig: SoldierRig,
  dt: number,
  speed: number,
  crouch: boolean,
  pitch: number,
  alive: boolean,
  downed: boolean,
  gasMask: boolean
): void {
  rig.gasMask.visible = gasMask;

  if (!alive) {
    rig.root.rotation.x = THREE.MathUtils.damp(rig.root.rotation.x, -Math.PI / 2, 10, dt);
    rig.torso.position.y = 0.85;
    return;
  }
  if (downed) {
    rig.root.rotation.x = THREE.MathUtils.damp(rig.root.rotation.x, -1.25, 10, dt);
    return;
  }

  rig.root.rotation.x = THREE.MathUtils.damp(rig.root.rotation.x, 0, 12, dt);
  const targetTorsoY = crouch ? 0.56 : 0.85;
  rig.torso.position.y = THREE.MathUtils.damp(rig.torso.position.y, targetTorsoY, 12, dt);
  rig.head.rotation.x = THREE.MathUtils.clamp(-pitch * 0.65, -0.6, 0.6);
  rig.weaponMount.rotation.x = THREE.MathUtils.clamp(-pitch * 0.75, -0.7, 0.7);

  if (speed > 0.35) {
    rig.walkPhase += dt * (4.5 + speed * 1.3);
    const swing = Math.sin(rig.walkPhase) * Math.min(0.75, speed * 0.14);
    rig.legL.rotation.x = swing;
    rig.legR.rotation.x = -swing;
    rig.armL.rotation.x = -swing * 0.25;
    rig.armR.rotation.x = swing * 0.25;
    rig.torso.position.y += Math.abs(Math.cos(rig.walkPhase)) * 0.03;
  } else {
    rig.legL.rotation.x = THREE.MathUtils.damp(rig.legL.rotation.x, crouch ? 0.45 : 0, 10, dt);
    rig.legR.rotation.x = THREE.MathUtils.damp(rig.legR.rotation.x, crouch ? -0.35 : 0, 10, dt);
    rig.armL.rotation.x = THREE.MathUtils.damp(rig.armL.rotation.x, 0, 10, dt);
    rig.armR.rotation.x = THREE.MathUtils.damp(rig.armR.rotation.x, 0, 10, dt);
  }
}
