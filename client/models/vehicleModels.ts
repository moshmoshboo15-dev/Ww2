import * as THREE from 'three';
import { textureBank } from '../engine/textures';
import { assetOverrides } from '../engine/assetLoader';

export interface VehicleVisual {
  root: THREE.Group;
  turret: THREE.Object3D | null;
  barrel: THREE.Object3D | null;
  wheels: THREE.Object3D[];
  propellers: THREE.Object3D[];
}

export function buildVehicleVisual(type: string, team: number): VehicleVisual {
  const root = new THREE.Group();
  const wheels: THREE.Object3D[] = [];
  const propellers: THREE.Object3D[] = [];
  let turret: THREE.Object3D | null = null;
  let barrel: THREE.Object3D | null = null;

  if (assetOverrides.hasModel(type)) {
    assetOverrides.loadModelOverride(type).then((glb) => {
      if (glb) {
        root.clear();
        root.add(glb);
      }
    });
  }

  const paintHex = team === 1 ? '#4d5d3f' : team === 2 ? '#5d584b' : '#535852';
  const desertHex = team === 1 ? '#9d895d' : '#85724c';
  const hullColor = type.startsWith('ww2_') && !type.includes('naval') ? paintHex : paintHex;

  const hullMat = new THREE.MeshStandardMaterial({
    color: type === 'ww2_heavy_tank' ? desertHex : hullColor,
    map: textureBank.get('steel'),
    roughness: 0.56,
    metalness: 0.45,
    emissive: team === 1 ? '#122238' : team === 2 ? '#2e1410' : '#000000',
    emissiveIntensity: team === 0 ? 0 : 0.16,
  });

  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: '#22262b',
    map: textureBank.get('steel'),
    roughness: 0.45,
    metalness: 0.78,
  });

  const rubberMat = new THREE.MeshStandardMaterial({
    color: '#1f2022',
    roughness: 0.9,
    metalness: 0.05,
  });

  const woodMat = new THREE.MeshStandardMaterial({
    color: '#6b4223',
    map: textureBank.get('wood'),
    roughness: 0.8,
    metalness: 0.05,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#7ab3d1',
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.65,
    clearcoat: 1.0,
  });

  const makeWheel = (r: number, w: number, x: number, y: number, z: number) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 14), rubberMat);
    tire.rotation.z = Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.52, r * 0.52, w + 0.04, 10), hullMat);
    hub.rotation.z = Math.PI / 2;
    wg.add(tire, hub);
    wg.position.set(x, y, z);
    wheels.push(wg);
    root.add(wg);
  };

  if (type === 'ww1_tank') {
    // Classic Rhomboid WW1 Landship with side sponsons & wrap-around tracks
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.85, 6.2), hullMat);
    body.position.y = 1.25;
    body.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.3, 1.6), hullMat);
    nose.position.set(0, 1.35, -3.1);
    nose.rotation.x = -0.35;
    const trackL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 2.1, 6.8), darkMetalMat);
    trackL.position.set(-1.55, 1.1, 0);
    const trackR = trackL.clone();
    trackR.position.x = 1.55;
    const sponsonL = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 1.5), hullMat);
    sponsonL.position.set(-2.05, 1.25, 0.2);
    const sponsonR = sponsonL.clone();
    sponsonR.position.x = 2.05;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.48, 1.6), hullMat);
    cab.position.set(0, 2.35, -0.7);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.9, 10), darkMetalMat);
    gun.rotation.x = Math.PI / 2;
    gun.position.set(0, 1.55, -3.6);
    root.add(body, nose, trackL, trackR, sponsonL, sponsonR, cab, gun);
    barrel = gun;
  } else if (type === 'ww2_light_tank' || type === 'ww2_medium_tank' || type === 'ww2_heavy_tank') {
    const scale = type === 'ww2_light_tank' ? 0.85 : type === 'ww2_heavy_tank' ? 1.22 : 1.0;
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.4 * scale, 1.05 * scale, 5.2 * scale), hullMat);
    hull.position.y = 1.05 * scale;
    hull.castShadow = true;
    const glacis = new THREE.Mesh(new THREE.BoxGeometry(2.35 * scale, 0.85 * scale, 1.4 * scale), hullMat);
    glacis.position.set(0, 1.05 * scale, -2.4 * scale);
    glacis.rotation.x = -0.55;
    const trackL = new THREE.Mesh(new THREE.BoxGeometry(0.58 * scale, 0.92 * scale, 5.4 * scale), darkMetalMat);
    trackL.position.set(-1.32 * scale, 0.65 * scale, 0);
    const trackR = trackL.clone();
    trackR.position.x = 1.32 * scale;
    root.add(hull, glacis, trackL, trackR);
    for (let i = -2; i <= 2; i++) {
      makeWheel(0.36 * scale, 0.52 * scale, -1.32 * scale, 0.42 * scale, i * 1.02 * scale);
      makeWheel(0.36 * scale, 0.52 * scale, 1.32 * scale, 0.42 * scale, i * 1.02 * scale);
    }

    const tur = new THREE.Group();
    tur.position.set(0, 1.78 * scale, -0.1 * scale);
    const turMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05 * scale, 1.2 * scale, 0.78 * scale, 8),
      hullMat
    );
    turMesh.castShadow = true;
    const cupola = new THREE.Mesh(new THREE.CylinderGeometry(0.34 * scale, 0.36 * scale, 0.28 * scale, 10), hullMat);
    cupola.position.set(-0.3 * scale, 0.48 * scale, 0.25 * scale);
    const mantlet = new THREE.Mesh(new THREE.BoxGeometry(0.68 * scale, 0.44 * scale, 0.45 * scale), darkMetalMat);
    mantlet.position.set(0, 0.05, -1.1 * scale);
    const bGroup = new THREE.Group();
    bGroup.position.set(0, 0.05, -1.1 * scale);
    const mainBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 3.3 * scale, 12),
      darkMetalMat
    );
    mainBarrel.rotation.x = Math.PI / 2;
    mainBarrel.position.z = -1.65 * scale;
    const brake = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.2 * scale, 0.34 * scale), darkMetalMat);
    brake.position.z = -3.3 * scale;
    bGroup.add(mainBarrel, brake);
    tur.add(turMesh, cupola, mantlet, bGroup);
    root.add(tur);
    turret = tur;
    barrel = bGroup;
  } else if (type === 'armored_car') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.05, 4.4), hullMat);
    hull.position.y = 1.1;
    hull.castShadow = true;
    const nose = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, 1.2), hullMat);
    nose.position.set(0, 1.0, -2.2);
    nose.rotation.x = -0.35;
    root.add(hull, nose);
    [-1.4, 1.4].forEach((z) => {
      makeWheel(0.5, 0.36, -1.1, 0.5, z);
      makeWheel(0.5, 0.36, 1.1, 0.5, z);
    });
    const tur = new THREE.Group();
    tur.position.set(0, 1.85, -0.1);
    const turBody = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.85, 0.62, 6), hullMat);
    const gun = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.6, 10), darkMetalMat);
    gun.rotation.x = Math.PI / 2;
    gun.position.z = -1.1;
    tur.add(turBody, gun);
    root.add(tur);
    turret = tur;
    barrel = gun;
  } else if (type === 'halftrack' || type === 'mobile_aa') {
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.9, 5.1), hullMat);
    chassis.position.y = 1.05;
    chassis.castShadow = true;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.8, 1.4), hullMat);
    hood.position.set(0, 1.2, -2.1);
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 0.12), hullMat);
    shield.position.set(0, 1.85, -1.2);
    const trackL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.8, 2.4), darkMetalMat);
    trackL.position.set(-1.08, 0.5, 1.0);
    const trackR = trackL.clone();
    trackR.position.x = 1.08;
    root.add(chassis, hood, shield, trackL, trackR);
    makeWheel(0.48, 0.32, -1.05, 0.48, -1.8);
    makeWheel(0.48, 0.32, 1.05, 0.48, -1.8);

    const tur = new THREE.Group();
    tur.position.set(0, 1.75, type === 'mobile_aa' ? 0.9 : -0.4);
    if (type === 'mobile_aa') {
      const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 0.55, 10), darkMetalMat);
      tur.add(mount);
      const bG = new THREE.Group();
      bG.position.y = 0.3;
      [-0.22, -0.08, 0.08, 0.22].forEach((bx) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.038, 1.9, 8), darkMetalMat);
        b.rotation.x = Math.PI / 2;
        b.position.set(bx, 0, -0.95);
        bG.add(b);
      });
      tur.add(bG);
      barrel = bG;
    } else {
      const hmg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.1, 8), darkMetalMat);
      hmg.rotation.x = Math.PI / 2;
      hmg.position.set(0, 0.45, -0.5);
      tur.add(hmg);
      barrel = hmg;
    }
    root.add(tur);
    turret = tur;
  } else if (type === 'jeep') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.65, 3.45), hullMat);
    body.position.y = 0.85;
    body.castShadow = true;
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 1.15), hullMat);
    hood.position.set(0, 1.12, -1.1);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.48, 0.08), glassMat);
    windshield.position.set(0, 1.48, -0.5);
    windshield.rotation.x = -0.2;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.0, 8), darkMetalMat);
    post.position.set(0, 1.5, 0.7);
    const mg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.95, 8), darkMetalMat);
    mg.rotation.x = Math.PI / 2;
    mg.position.set(0, 2.0, 0.3);
    root.add(body, hood, windshield, post, mg);
    [-1.1, 1.1].forEach((z) => {
      makeWheel(0.42, 0.28, -0.92, 0.42, z);
      makeWheel(0.42, 0.28, 0.92, 0.42, z);
    });
    turret = mg;
  } else if (type === 'troop_truck' || type === 'rocket_truck') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 4.2), type === 'rocket_truck' ? hullMat : woodMat);
    bed.position.set(0, 1.35, 0.7);
    bed.castShadow = true;
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.45, 1.7), hullMat);
    cab.position.set(0, 1.55, -1.9);
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.55, 0.08), glassMat);
    windshield.position.set(0, 1.85, -2.76);
    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.85, 1.1), hullMat);
    hood.position.set(0, 1.2, -2.95);
    root.add(bed, cab, windshield, hood);
    [-2.5, 0.3, 1.7].forEach((z) => {
      makeWheel(0.5, 0.34, -1.18, 0.5, z);
      makeWheel(0.5, 0.34, 1.18, 0.5, z);
    });
    if (type === 'rocket_truck') {
      const tur = new THREE.Group();
      tur.position.set(0, 2.1, 0.8);
      for (let r = 0; r < 2; r++) {
        for (let c = -3; c <= 3; c++) {
          const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.6, 8), darkMetalMat);
          tube.rotation.x = Math.PI / 2 - 0.32;
          tube.position.set(c * 0.24, r * 0.24, -0.2);
          tur.add(tube);
        }
      }
      root.add(tur);
      turret = tur;
    } else {
      // Canvas troop canopy
      const canopy = new THREE.Mesh(
        new THREE.CylinderGeometry(1.15, 1.15, 3.9, 10, 1, true, 0, Math.PI),
        new THREE.MeshStandardMaterial({ color: '#6b644b', roughness: 0.9, side: THREE.DoubleSide })
      );
      canopy.rotation.z = Math.PI / 2;
      canopy.rotation.y = Math.PI / 2;
      canopy.position.set(0, 2.0, 0.7);
      root.add(canopy);
    }
  } else if (type === 'biplane' || type === 'ww2_fighter' || type === 'ww2_bomber') {
    const isBomber = type === 'ww2_bomber';
    const isBi = type === 'biplane';
    const fLen = isBomber ? 11.5 : 7.4;
    const span = isBomber ? 15.5 : isBi ? 8.6 : 9.8;

    const fuselage = new THREE.Mesh(
      new THREE.CylinderGeometry(isBomber ? 0.85 : 0.55, isBomber ? 0.5 : 0.32, fLen, 12),
      hullMat
    );
    fuselage.rotation.x = Math.PI / 2;
    fuselage.position.y = 1.45;
    fuselage.castShadow = true;
    root.add(fuselage);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(span, 0.14, isBomber ? 2.4 : 1.6), hullMat);
    wing.position.set(0, isBi ? 1.05 : 1.45, -0.4);
    wing.castShadow = true;
    root.add(wing);

    if (isBi) {
      const topWing = new THREE.Mesh(new THREE.BoxGeometry(span, 0.14, 1.5), hullMat);
      topWing.position.set(0, 2.35, -0.5);
      root.add(topWing);
      [-2.8, -1.1, 1.1, 2.8].forEach((sx) => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6), woodMat);
        strut.position.set(sx, 1.7, -0.45);
        root.add(strut);
      });
    }

    const tailPlane = new THREE.Mesh(new THREE.BoxGeometry(span * 0.36, 0.1, 1.1), hullMat);
    tailPlane.position.set(0, 1.55, fLen * 0.44);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1.2), hullMat);
    fin.position.set(0, 2.0, fLen * 0.44);
    const canopy = new THREE.Mesh(new THREE.SphereGeometry(isBomber ? 0.72 : 0.45, 10, 8), glassMat);
    canopy.scale.set(0.9, 0.75, 1.7);
    canopy.position.set(0, 1.85, isBomber ? -2.2 : 0.2);
    root.add(tailPlane, fin, canopy);

    // Landing gear wheels
    makeWheel(0.32, 0.18, -1.1, 0.35, -1.2);
    makeWheel(0.32, 0.18, 1.1, 0.35, -1.2);

    const addProp = (px: number, py: number, pz: number) => {
      const pGroup = new THREE.Group();
      pGroup.position.set(px, py, pz);
      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.14, 0.05), woodMat);
      const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 1.75, 0.05), woodMat);
      const spinner = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.45, 10), darkMetalMat);
      spinner.rotation.x = -Math.PI / 2;
      pGroup.add(blade1, blade2, spinner);
      propellers.push(pGroup);
      root.add(pGroup);
    };
    if (isBomber) {
      addProp(-2.6, 1.45, -1.8);
      addProp(2.6, 1.45, -1.8);
    } else {
      addProp(0, 1.45, -fLen * 0.5 - 0.15);
    }
  } else if (type === 'patrol_boat' || type === 'destroyer' || type === 'battleship' || type === 'submarine' || type === 'aircraft_carrier') {
    const isCarrier = type === 'aircraft_carrier';
    const isBB = type === 'battleship';
    const isDD = type === 'destroyer';
    const isSub = type === 'submarine';

    const len = isCarrier ? 54 : isBB ? 40 : isDD ? 26 : isSub ? 20 : 11;
    const beam = isCarrier ? 13 : isBB ? 7.5 : isDD ? 4.6 : isSub ? 2.6 : 2.8;
    const freeboard = isCarrier ? 5.2 : isBB ? 3.2 : isDD ? 2.2 : isSub ? 1.2 : 1.4;

    const navalMat = new THREE.MeshStandardMaterial({
      color: isSub ? '#2f383f' : team === 1 ? '#4d5d6b' : '#4a5259',
      map: textureBank.get('steel'),
      roughness: 0.48,
      metalness: 0.58,
    });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(beam, freeboard, len * 0.78), navalMat);
    hull.position.y = freeboard * 0.35;
    hull.castShadow = true;
    const bow = new THREE.Mesh(new THREE.ConeGeometry(beam * 0.52, len * 0.28, 4), navalMat);
    bow.rotation.y = Math.PI / 4;
    bow.rotation.x = -Math.PI / 2;
    bow.scale.set(1, 1, freeboard / (beam * 0.7));
    bow.position.set(0, freeboard * 0.35, -len * 0.46);
    root.add(hull, bow);

    if (isCarrier) {
      const deckMat = new THREE.MeshStandardMaterial({ color: '#393d42', map: textureBank.get('concrete'), roughness: 0.8 });
      const deck = new THREE.Mesh(new THREE.BoxGeometry(beam * 1.15, 0.5, len * 0.96), deckMat);
      deck.position.set(0, freeboard * 0.9, 0);
      deck.receiveShadow = true;
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(0.6, len * 0.88), new THREE.MeshBasicMaterial({ color: '#e5e0d3' }));
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(0, freeboard * 0.9 + 0.27, 0);
      const island = new THREE.Mesh(new THREE.BoxGeometry(2.6, 5.2, 8.5), navalMat);
      island.position.set(beam * 0.44, freeboard * 0.9 + 2.6, 1.5);
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 4.5, 8), darkMetalMat);
      mast.position.set(beam * 0.44, freeboard * 0.9 + 7.2, 2.0);
      root.add(deck, stripe, island, mast);
    } else if (isSub) {
      const conning = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.0, 4.2), navalMat);
      conning.position.set(0, 1.9, 0.5);
      const periscope = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), darkMetalMat);
      periscope.position.set(0, 3.4, 0.2);
      const deckGun = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 2.4, 8), darkMetalMat);
      deckGun.rotation.x = Math.PI / 2;
      deckGun.position.set(0, 1.6, -4.5);
      root.add(conning, periscope, deckGun);
      turret = deckGun;
    } else {
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.55, freeboard * 1.15, len * 0.22), navalMat);
      bridge.position.set(0, freeboard * 1.15, 0);
      const funnel = new THREE.Mesh(new THREE.CylinderGeometry(beam * 0.14, beam * 0.18, freeboard * 0.9, 10), darkMetalMat);
      funnel.position.set(0, freeboard * 1.35, len * 0.12);
      root.add(bridge, funnel);

      const tur = new THREE.Group();
      tur.position.set(0, freeboard * 0.95, -len * 0.24);
      const tHead = new THREE.Mesh(new THREE.BoxGeometry(beam * 0.42, 1.1, beam * 0.48), navalMat);
      const gunCount = isBB ? 3 : isDD ? 2 : 1;
      for (let g = 0; g < gunCount; g++) {
        const gx = (g - (gunCount - 1) / 2) * 0.42;
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, isBB ? 5.2 : 3.2, 8), darkMetalMat);
        bar.rotation.x = Math.PI / 2;
        bar.position.set(gx, 0.1, isBB ? -2.8 : -1.8);
        tur.add(bar);
      }
      tur.add(tHead);
      root.add(tur);
      turret = tur;
    }
  } else {
    // Stationary Emplacements: aa_20mm, aa_40mm, aa_88mm, mg_nest
    const sandbagMat = new THREE.MeshStandardMaterial({
      color: '#8f7d5b',
      map: textureBank.get('cloth'),
      roughness: 0.92,
      metalness: 0.02,
    });
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 1.4 - Math.PI * 0.7;
      const bag = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.42, 0.42), sandbagMat);
      bag.position.set(Math.sin(ang) * 1.4, 0.25, -Math.cos(ang) * 1.4);
      bag.rotation.y = ang;
      root.add(bag);
    }
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.65, 0.85, 10), darkMetalMat);
    base.position.y = 0.45;
    const tur = new THREE.Group();
    tur.position.y = 1.15;
    const shield = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.9, 0.08), hullMat);
    shield.position.set(0, 0.2, -0.35);
    const barLen = type === 'aa_88mm' ? 3.1 : type === 'aa_40mm' ? 2.1 : 1.5;
    const barRad = type === 'aa_88mm' ? 0.08 : 0.045;
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(barRad * 0.8, barRad, barLen, 10), darkMetalMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(0, 0.22, -barLen * 0.5 - 0.1);
    tur.add(shield, bar);
    root.add(base, tur);
    turret = tur;
    barrel = bar;
  }

  return { root, turret, barrel, wheels, propellers };
}
