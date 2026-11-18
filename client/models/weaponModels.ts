import * as THREE from 'three';
import { WEAPON_SKINS, type WeaponDef } from '../../shared/weapons';
import { textureBank } from '../engine/textures';
import { assetOverrides } from '../engine/assetLoader';

export interface BuiltWeaponMesh {
  root: THREE.Group;
  bolt: THREE.Object3D;
  magazine: THREE.Object3D;
  muzzlePoint: THREE.Object3D;
}

export function buildWeaponMesh(weapon: WeaponDef, skinId = 'standard'): BuiltWeaponMesh {
  const skin = WEAPON_SKINS.find((s) => s.id === skinId) || WEAPON_SKINS[0];

  const metalTex = skin.camo === 'winter'
    ? textureBank.get('camo_winter')
    : skin.camo === 'desert'
      ? textureBank.get('camo_desert')
      : skin.camo === 'mud'
        ? textureBank.get('camo_mud')
        : textureBank.get('steel');

  const woodTex = textureBank.get('wood');
  const brassTex = textureBank.get('brass');

  const metalMat = new THREE.MeshStandardMaterial({
    color: skin.id === 'standard' ? weapon.model.metal : skin.metalColor,
    map: metalTex,
    roughness: skin.roughness,
    metalness: skin.metalness,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: skin.id === 'standard' ? weapon.model.wood : skin.woodColor,
    map: woodTex,
    roughness: 0.78,
    metalness: 0.06,
  });

  const brassMat = new THREE.MeshStandardMaterial({
    color: skin.id === 'battle_gold' ? '#f2c85b' : '#b7913d',
    map: brassTex,
    roughness: 0.25,
    metalness: 0.9,
  });

  const root = new THREE.Group();
  const bolt = new THREE.Group();
  const magazine = new THREE.Group();
  const muzzlePoint = new THREE.Object3D();

  // Check if user dropped a custom GLB in assets/models/<weapon.id>.glb
  if (assetOverrides.hasModel(weapon.id)) {
    assetOverrides.loadModelOverride(weapon.id).then((glb) => {
      if (glb) {
        root.clear();
        root.add(glb);
      }
    });
  }

  if (weapon.isGrenade) {
    if (weapon.model.stock === 'wood_handle') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.22, 10), woodMat);
      handle.position.y = -0.05;
      const head = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.1, 12), metalMat);
      head.position.y = 0.09;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.03, 10), brassMat);
      cap.position.y = -0.16;
      root.add(handle, head, cap);
    } else {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.052, 12, 10), metalMat);
      body.scale.set(0.88, 1.15, 0.88);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.03, 10), brassMat);
      collar.position.y = 0.06;
      const lever = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.075, 0.02), metalMat);
      lever.position.set(0.04, 0.03, 0);
      lever.rotation.z = -0.25;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.003, 6, 12), brassMat);
      ring.position.set(-0.022, 0.065, 0);
      root.add(body, collar, lever, ring);
    }
    muzzlePoint.position.set(0, 0.05, -0.15);
    root.add(muzzlePoint, bolt, magazine);
    return { root, bolt, magazine, muzzlePoint };
  }

  if (weapon.isMine) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.055, 16), metalMat);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.02, 12), brassMat);
    plate.position.y = 0.032;
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 8), metalMat);
    prong.position.y = 0.05;
    root.add(disc, plate, prong);
    muzzlePoint.position.set(0, 0.05, -0.15);
    root.add(muzzlePoint, bolt, magazine);
    return { root, bolt, magazine, muzzlePoint };
  }

  const bodyLen = weapon.model.bodyLen || 0.36;
  const barrelLen = weapon.model.barrelLen || 0.4;
  const isLauncher = weapon.isLauncher && weapon.model.mag === 'tube';
  const isPistol = weapon.category === 'pistol';

  if (isLauncher) {
    // Rocket / Anti-Tank Tube Launcher
    const tube = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.046, bodyLen + barrelLen, 16),
      metalMat
    );
    tube.rotation.x = Math.PI / 2;
    tube.position.z = -(bodyLen * 0.2);

    const blastBell = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.062, 0.14, 14),
      metalMat
    );
    blastBell.rotation.x = Math.PI / 2;
    blastBell.position.z = (bodyLen + barrelLen) * 0.5 - bodyLen * 0.2 + 0.05;

    const frontRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.049, 0.007, 8, 16),
      brassMat
    );
    frontRing.position.z = -(bodyLen * 0.2 + (bodyLen + barrelLen) * 0.5 - 0.02);

    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.12, 0.042), woodMat);
    grip.position.set(0, -0.09, 0.02);
    grip.rotation.x = 0.2;

    const sight = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.06, 0.012), brassMat);
    sight.position.set(0.045, 0.05, -0.25);

    muzzlePoint.position.set(0, 0, -(bodyLen * 0.2 + (bodyLen + barrelLen) * 0.5 + 0.04));
    root.add(tube, blastBell, frontRing, grip, sight, muzzlePoint, bolt, magazine);
    return { root, bolt, magazine, muzzlePoint };
  }

  // Standard Firearm Construction (10+ sub-parts)
  const recH = isPistol ? 0.038 : 0.058;
  const recW = isPistol ? 0.028 : 0.044;
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(recW, recH, bodyLen), metalMat);
  receiver.castShadow = true;
  root.add(receiver);

  // Tapered / Stepped Barrel
  const bRad = isPistol ? 0.011 : weapon.category === 'shotgun' ? 0.017 : 0.013;
  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(bRad * 0.88, bRad, barrelLen, 12),
    metalMat
  );
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, recH * 0.22, -(bodyLen * 0.5 + barrelLen * 0.5));
  root.add(barrel);

  // Cooling shroud for SMGs / MGs / Flamethrowers
  if (weapon.category === 'mg' || weapon.category === 'smg' || weapon.isFlame) {
    const shroud = new THREE.Mesh(
      new THREE.CylinderGeometry(bRad * 1.65, bRad * 1.65, barrelLen * 0.65, 12),
      metalMat
    );
    shroud.rotation.x = Math.PI / 2;
    shroud.position.set(0, recH * 0.22, -(bodyLen * 0.5 + barrelLen * 0.32));
    root.add(shroud);
  }

  // Front Sight & Muzzle Device
  const muzzleZ = -(bodyLen * 0.5 + barrelLen);
  const frontPost = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.024, 0.014), brassMat);
  frontPost.position.set(0, recH * 0.22 + bRad + 0.01, muzzleZ + 0.02);
  root.add(frontPost);

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.018, 0.014), metalMat);
  rearSight.position.set(0, recH * 0.5 + 0.009, bodyLen * 0.3);
  root.add(rearSight);

  // Grip + Trigger Guard
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(recW * 0.85, isPistol ? 0.1 : 0.11, 0.042),
    woodMat
  );
  grip.position.set(0, -recH * 0.5 - 0.042, isPistol ? bodyLen * 0.26 : bodyLen * 0.34);
  grip.rotation.x = 0.26;
  root.add(grip);

  const trigGuard = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.0035, 6, 12, Math.PI), metalMat);
  trigGuard.rotation.y = Math.PI / 2;
  trigGuard.rotation.z = Math.PI;
  trigGuard.position.set(0, -recH * 0.5 - 0.008, bodyLen * 0.14);
  root.add(trigGuard);

  // Stock / Forend
  if (weapon.model.stock === 'full_wood' || weapon.model.stock === 'wood_carbine') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(recW * 0.9, 0.085, 0.28), woodMat);
    stock.position.set(0, -0.032, bodyLen * 0.5 + 0.13);
    stock.rotation.x = 0.08;
    const buttplate = new THREE.Mesh(new THREE.BoxGeometry(recW * 0.92, 0.09, 0.014), brassMat);
    buttplate.position.set(0, -0.042, bodyLen * 0.5 + 0.27);
    root.add(stock, buttplate);

    const forendLen = weapon.model.stock === 'full_wood' ? barrelLen * 0.68 : barrelLen * 0.35;
    const forend = new THREE.Mesh(new THREE.BoxGeometry(recW * 0.95, 0.042, forendLen), woodMat);
    forend.position.set(0, -0.008, -(bodyLen * 0.5 + forendLen * 0.45));
    root.add(forend);
  } else if (weapon.model.stock === 'wire') {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.24, 8), metalMat);
    rod.rotation.x = Math.PI / 2;
    rod.position.set(0, -0.01, bodyLen * 0.5 + 0.12);
    const pad = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.015), metalMat);
    pad.position.set(0, -0.02, bodyLen * 0.5 + 0.24);
    root.add(rod, pad);
  }

  // Animated Bolt Handle
  const boltBody = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 10), brassMat);
  boltBody.rotation.x = Math.PI / 2;
  const boltKnob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), metalMat);
  boltKnob.position.set(0.032, 0, 0);
  const boltStem = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.032, 8), metalMat);
  boltStem.rotation.z = Math.PI / 2;
  boltStem.position.set(0.016, 0, 0);
  bolt.add(boltBody, boltKnob, boltStem);
  bolt.position.set(recW * 0.35, recH * 0.22, -bodyLen * 0.05);
  root.add(bolt);

  // Magazine Variants
  const mType = weapon.model.mag;
  if (mType === 'box' || mType === 'curved_box' || mType === 'front_box') {
    const magMesh = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.15, 0.052), metalMat);
    magMesh.position.set(0, -0.095, mType === 'front_box' ? -0.06 : -0.02);
    if (mType === 'curved_box') magMesh.rotation.x = 0.2;
    magazine.add(magMesh);
  } else if (mType === 'drum') {
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.042, 16), metalMat);
    drum.rotation.x = Math.PI / 2;
    drum.position.set(0, -0.09, -0.03);
    magazine.add(drum);
  } else if (mType === 'top_pan') {
    const pan = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.036, 18), metalMat);
    pan.position.set(0, recH * 0.5 + 0.022, -0.02);
    magazine.add(pan);
  } else if (mType === 'top_box') {
    const tbox = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.14, 0.048), metalMat);
    tbox.position.set(0, recH * 0.5 + 0.075, -0.02);
    tbox.rotation.x = -0.15;
    magazine.add(tbox);
  } else if (mType === 'side_drum') {
    const sdrum = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.038, 16), metalMat);
    sdrum.rotation.z = Math.PI / 2;
    sdrum.position.set(-0.07, -0.01, -0.06);
    magazine.add(sdrum);
  } else if (mType === 'side_box') {
    const sbox = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.026, 0.044), metalMat);
    sbox.position.set(-0.085, 0, -0.06);
    magazine.add(sbox);
  } else if (mType === 'cylinder') {
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.045, 12), brassMat);
    cyl.rotation.x = Math.PI / 2;
    cyl.position.set(0, 0.005, -0.01);
    magazine.add(cyl);
  } else if (mType === 'tube') {
    const tubeMag = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, barrelLen * 0.85, 10), metalMat);
    tubeMag.rotation.x = Math.PI / 2;
    tubeMag.position.set(0, -0.014, -(bodyLen * 0.5 + barrelLen * 0.42));
    magazine.add(tubeMag);
  } else if (mType === 'belt') {
    const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.11, 0.085), brassMat);
    ammoBox.position.set(-0.065, -0.05, 0.02);
    magazine.add(ammoBox);
  } else if (mType === 'tank') {
    const cyl1 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.24, 12), brassMat);
    cyl1.rotation.x = Math.PI / 2;
    cyl1.position.set(0, -0.04, -0.06);
    magazine.add(cyl1);
  }
  root.add(magazine);

  // Optical Sniper Scope
  if (weapon.model.scope === 'optic') {
    const scopeTube = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.017, 0.26, 14), brassMat);
    scopeTube.rotation.x = Math.PI / 2;
    scopeTube.position.set(0, recH * 0.5 + 0.036, -0.02);
    const lensMat = new THREE.MeshPhysicalMaterial({
      color: '#4ea3d8',
      roughness: 0.08,
      metalness: 0.1,
      clearcoat: 1.0,
    });
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.017, 12), lensMat);
    lens.position.set(0, recH * 0.5 + 0.036, 0.112);
    const ring1 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.03, 0.016), metalMat);
    ring1.position.set(0, recH * 0.5 + 0.018, 0.05);
    const ring2 = ring1.clone();
    ring2.position.z = -0.09;
    root.add(scopeTube, lens, ring1, ring2);
  }

  muzzlePoint.position.set(0, recH * 0.22, muzzleZ - 0.02);
  root.add(muzzlePoint);

  return { root, bolt, magazine, muzzlePoint };
}

export class FirstPersonWeaponRig {
  public group = new THREE.Group();
  private weaponAnchor = new THREE.Group();
  private currentBuilt: BuiltWeaponMesh | null = null;
  private muzzleFlashMesh: THREE.Mesh;
  private muzzleLight: THREE.PointLight;
  private currentWeaponId = '';
  private currentSkinId = '';

  private recoilKick = 0;
  private recoilPitch = 0;
  private boltAnim = 0;
  private reloadTimer = 0;
  private reloadDuration = 1.5;
  private bobTime = 0;
  private swayX = 0;
  private swayY = 0;
  private adsBlend = 0;
  private flashTimer = 0;

  constructor(team = 1) {
    // First-person sleeves & gloved hands
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: team === 1 ? '#4b5a3c' : '#565c54',
      map: textureBank.get('cloth'),
      roughness: 0.86,
      metalness: 0.04,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: '#c99c7a',
      roughness: 0.72,
      metalness: 0.02,
    });
    const gloveMat = new THREE.MeshStandardMaterial({
      color: '#322820',
      roughness: 0.75,
      metalness: 0.05,
    });

    // Right Arm (Trigger Hand)
    const rightForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.052, 0.36, 10), sleeveMat);
    rightForearm.rotation.x = Math.PI / 2 - 0.35;
    rightForearm.rotation.z = 0.25;
    rightForearm.position.set(0.14, -0.14, 0.22);
    const rightHand = new THREE.Mesh(new THREE.BoxGeometry(0.056, 0.055, 0.08), gloveMat);
    rightHand.position.set(0.01, -0.05, 0.14);

    // Left Arm (Support Hand)
    const leftForearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.38, 10), sleeveMat);
    leftForearm.rotation.x = Math.PI / 2 - 0.32;
    leftForearm.rotation.z = -0.55;
    leftForearm.position.set(-0.18, -0.16, 0.06);
    const leftWrist = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.05, 10), skinMat);
    leftWrist.rotation.x = Math.PI / 2;
    leftWrist.position.set(-0.04, -0.05, -0.09);
    const leftHand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.08), gloveMat);
    leftHand.position.set(-0.01, -0.03, -0.15);

    this.weaponAnchor.add(rightForearm, rightHand, leftForearm, leftWrist, leftHand);
    this.group.add(this.weaponAnchor);

    // Muzzle flash star + dynamic point light
    const flashGeo = new THREE.OctahedronGeometry(0.09, 0);
    const flashMat = new THREE.MeshBasicMaterial({
      color: '#ffca66',
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.visible = false;
    this.weaponAnchor.add(this.muzzleFlashMesh);

    this.muzzleLight = new THREE.PointLight('#ffaa44', 0, 8, 2);
    this.weaponAnchor.add(this.muzzleLight);
  }

  setWeapon(weapon: WeaponDef, skinId: string): void {
    if (this.currentWeaponId === weapon.id && this.currentSkinId === skinId) return;
    this.currentWeaponId = weapon.id;
    this.currentSkinId = skinId;
    if (this.currentBuilt) {
      this.weaponAnchor.remove(this.currentBuilt.root);
    }
    this.currentBuilt = buildWeaponMesh(weapon, skinId);
    this.weaponAnchor.add(this.currentBuilt.root);
    this.reloadTimer = 0;
  }

  triggerFire(recoilAmount: number, isBolt = false): void {
    this.recoilKick = Math.min(0.11, this.recoilKick + 0.045 + recoilAmount * 0.01);
    this.recoilPitch = Math.min(0.24, this.recoilPitch + 0.08 + recoilAmount * 0.02);
    this.flashTimer = 0.045;
    if (isBolt) this.boltAnim = 0.45;
    if (this.currentBuilt) {
      const mp = this.currentBuilt.muzzlePoint.position;
      this.muzzleFlashMesh.position.copy(mp);
      this.muzzleFlashMesh.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
      this.muzzleFlashMesh.scale.setScalar(0.8 + Math.random() * 0.5);
      this.muzzleLight.position.copy(mp);
    }
  }

  triggerReload(duration: number): void {
    this.reloadDuration = Math.max(0.5, duration);
    this.reloadTimer = this.reloadDuration;
  }

  addLookSway(dx: number, dy: number): void {
    this.swayX = THREE.MathUtils.clamp(this.swayX - dx * 0.012, -0.055, 0.055);
    this.swayY = THREE.MathUtils.clamp(this.swayY + dy * 0.012, -0.045, 0.045);
  }

  update(dt: number, moveSpeed: number, isAds: boolean, isScoped: boolean): void {
    this.adsBlend = THREE.MathUtils.damp(this.adsBlend, isAds ? 1 : 0, 14, dt);
    this.group.visible = !(isScoped && this.adsBlend > 0.72);

    this.recoilKick = THREE.MathUtils.damp(this.recoilKick, 0, 18, dt);
    this.recoilPitch = THREE.MathUtils.damp(this.recoilPitch, 0, 14, dt);
    this.swayX = THREE.MathUtils.damp(this.swayX, 0, 10, dt);
    this.swayY = THREE.MathUtils.damp(this.swayY, 0, 10, dt);

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      this.muzzleFlashMesh.visible = true;
      this.muzzleLight.intensity = 4.5;
    } else {
      this.muzzleFlashMesh.visible = false;
      this.muzzleLight.intensity = 0;
    }

    if (this.boltAnim > 0 && this.currentBuilt) {
      this.boltAnim = Math.max(0, this.boltAnim - dt);
      const t = Math.sin((this.boltAnim / 0.45) * Math.PI);
      this.currentBuilt.bolt.position.z = t * 0.06;
      this.currentBuilt.bolt.rotation.z = -t * 0.7;
    }

    let reloadDrop = 0;
    let reloadTilt = 0;
    if (this.reloadTimer > 0) {
      this.reloadTimer = Math.max(0, this.reloadTimer - dt);
      const p = 1 - this.reloadTimer / this.reloadDuration;
      const arch = Math.sin(p * Math.PI);
      reloadDrop = -arch * 0.14;
      reloadTilt = arch * 0.45;
      if (this.currentBuilt) {
        this.currentBuilt.magazine.position.y = -arch * 0.12;
      }
    } else if (this.currentBuilt) {
      this.currentBuilt.magazine.position.y = 0;
    }

    if (moveSpeed > 0.4) {
      this.bobTime += dt * (4.5 + moveSpeed * 0.9);
    }
    const bobAmp = Math.min(1, moveSpeed / 6) * (1 - this.adsBlend * 0.75);
    const bobX = Math.cos(this.bobTime) * 0.012 * bobAmp;
    const bobY = Math.abs(Math.sin(this.bobTime)) * -0.014 * bobAmp;

    // Hipfire position vs ADS centered sight position
    const hipX = 0.22;
    const hipY = -0.21;
    const hipZ = -0.38;
    const adsX = 0.0;
    const adsY = -0.095;
    const adsZ = -0.28;

    this.weaponAnchor.position.set(
      THREE.MathUtils.lerp(hipX, adsX, this.adsBlend) + this.swayX + bobX,
      THREE.MathUtils.lerp(hipY, adsY, this.adsBlend) + this.swayY + bobY + reloadDrop,
      THREE.MathUtils.lerp(hipZ, adsZ, this.adsBlend) + this.recoilKick
    );
    this.weaponAnchor.rotation.set(
      this.recoilPitch - reloadTilt * 0.5,
      -this.swayX * 1.5,
      reloadTilt
    );
  }
}
