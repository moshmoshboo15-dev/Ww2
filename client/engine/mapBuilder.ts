import * as THREE from 'three';
import { MAPS, TIME_VARIANTS, getTerrainHeight } from '../../shared/maps';
import { textureBank } from './textures';

export interface ColliderBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  topY: number;
}

export interface TargetDummy {
  id: string;
  mesh: THREE.Group;
  baseX: number;
  baseZ: number;
  moving: boolean;
  phase: number;
  hp: number;
  downTimer: number;
}

export interface BuiltMap {
  root: THREE.Group;
  colliders: ColliderBox[];
  flagMeshes: Map<string, THREE.Mesh>;
  gasGroup: THREE.Group;
  waterMesh: THREE.Mesh | null;
  rainPoints: THREE.Points | null;
  dummies: TargetDummy[];
  windUniforms: { uTime: { value: number } };
  dispose: () => void;
}

function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function buildMapScene(
  scene: THREE.Scene,
  mapId: string,
  timeId: string,
  enableShadows: boolean
): BuiltMap {
  const map = MAPS[mapId] || MAPS.ww1_trench;
  const timeVar = TIME_VARIANTS[timeId] || TIME_VARIANTS[map.defaultTime] || TIME_VARIANTS.noon;

  const root = new THREE.Group();
  const colliders: ColliderBox[] = [];
  const flagMeshes = new Map<string, THREE.Mesh>();
  const dummies: TargetDummy[] = [];
  const windUniforms = { uTime: { value: 0 } };

  // Scene Fog & Background
  scene.background = new THREE.Color(timeVar.skyHorizon);
  scene.fog = new THREE.FogExp2(timeVar.skyHorizon, timeVar.fogDensity);

  // Sky Dome with sun disc & layered horizon gradient
  const skyGeo = new THREE.SphereGeometry(520, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(timeVar.skyTop) },
      uHorizon: { value: new THREE.Color(timeVar.skyHorizon) },
      uSunColor: { value: new THREE.Color(timeVar.sunColor) },
      uSunDir: { value: new THREE.Vector3(...timeVar.sunPos).normalize() },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uTop;
      uniform vec3 uHorizon;
      uniform vec3 uSunColor;
      uniform vec3 uSunDir;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
        float sunAmt = max(0.0, dot(normalize(vDir), uSunDir));
        col += uSunColor * pow(sunAmt, 24.0) * 0.45;
        col += uSunColor * smoothstep(0.996, 0.9992, sunAmt) * 1.1;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  root.add(new THREE.Mesh(skyGeo, skyMat));

  // Soft God-Ray Sun Beams (translucent atmospheric cones)
  const rayMat = new THREE.MeshBasicMaterial({
    color: timeVar.sunColor,
    transparent: true,
    opacity: 0.05,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  for (let i = 0; i < 4; i++) {
    const beam = new THREE.Mesh(new THREE.ConeGeometry(28, 130, 10, 1, true), rayMat);
    beam.position.set((i - 1.5) * 45, 55, (i % 2 === 0 ? -30 : 30));
    beam.rotation.z = 0.35;
    beam.rotation.x = 0.2;
    root.add(beam);
  }

  // Warm Key Sun + Cool Sky Hemisphere Fill
  const hemi = new THREE.HemisphereLight(timeVar.hemiSky, timeVar.hemiGround, timeVar.hemiIntensity);
  root.add(hemi);

  const sun = new THREE.DirectionalLight(timeVar.sunColor, timeVar.sunIntensity);
  sun.position.set(...timeVar.sunPos);
  if (enableShadows) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const d = 135;
    sun.shadow.camera.left = -d;
    sun.shadow.camera.right = d;
    sun.shadow.camera.top = d;
    sun.shadow.camera.bottom = -d;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 360;
    sun.shadow.bias = -0.0005;
    sun.shadow.normalBias = 0.03;
  }
  root.add(sun);

  // Extended Terrain Mesh (playable + horizon extension so there is never an abrupt edge)
  const terrainExtent = map.size + 220;
  const segs = 130;
  const terrainGeo = new THREE.PlaneGeometry(terrainExtent, terrainExtent, segs, segs);
  terrainGeo.rotateX(-Math.PI / 2);
  const posAttr = terrainGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const baseCol = new THREE.Color(map.groundTint);
  const accCol = new THREE.Color(map.accentTint);
  const tmpCol = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const vx = posAttr.getX(i);
    const vz = posAttr.getZ(i);
    const h = getTerrainHeight(mapId, vx, vz);
    posAttr.setY(i, h);

    // Baked-style ambient occlusion & elevation tint in vertex colors
    const ao = THREE.MathUtils.clamp(0.7 + h * 0.05, 0.45, 1.15);
    const blend = THREE.MathUtils.clamp((h + 2) * 0.14, 0, 1);
    tmpCol.copy(baseCol).lerp(accCol, blend).multiplyScalar(ao);
    colors[i * 3] = tmpCol.r;
    colors[i * 3 + 1] = tmpCol.g;
    colors[i * 3 + 2] = tmpCol.b;
  }
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.computeVertexNormals();

  const groundTexKind = mapId === 'ww2_armor' || mapId === 'ww2_naval'
    ? 'sand'
    : mapId === 'ww1_village'
      ? 'cobble'
      : 'mud';

  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: textureBank.get(groundTexKind, 28, 28),
    roughness: 0.92,
    metalness: 0.02,
  });
  const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
  terrainMesh.receiveShadow = true;
  root.add(terrainMesh);

  // Water Plane (ocean for ww2_naval, shallow creek/mud pools for others)
  let waterMesh: THREE.Mesh | null = null;
  if (mapId === 'ww2_naval' || mapId === 'ww1_village') {
    const wGeo = new THREE.PlaneGeometry(terrainExtent, terrainExtent, 48, 48);
    wGeo.rotateX(-Math.PI / 2);
    const wMat = new THREE.MeshStandardMaterial({
      color: mapId === 'ww2_naval' ? '#1e5273' : '#3a4b44',
      normalMap: textureBank.get('water_normal', 24, 24),
      roughness: 0.18,
      metalness: 0.42,
      transparent: true,
      opacity: 0.86,
    });
    wMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = windUniforms.uTime;
      shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\ntransformed.y += sin(position.x * 0.08 + uTime * 1.4) * 0.16 + cos(position.z * 0.09 + uTime * 1.1) * 0.14;`
      );
    };
    waterMesh = new THREE.Mesh(wGeo, wMat);
    waterMesh.position.y = map.waterLevel;
    waterMesh.receiveShadow = true;
    root.add(waterMesh);
  }

  // Materials for structures & props
  const brickMat = new THREE.MeshStandardMaterial({
    map: textureBank.get('brick', 2, 2),
    roughness: 0.88,
    metalness: 0.04,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: '#737570',
    map: textureBank.get('concrete', 2, 2),
    roughness: 0.86,
    metalness: 0.05,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: textureBank.get('wood', 2, 2),
    roughness: 0.84,
    metalness: 0.04,
  });
  const sandbagMat = new THREE.MeshStandardMaterial({
    color: '#9b8864',
    map: textureBank.get('cloth', 1, 1),
    roughness: 0.94,
    metalness: 0.02,
  });

  const addBoxObstacle = (x: number, z: number, w: number, h: number, d: number, mat: THREE.Material, yOff = 0) => {
    const gy = getTerrainHeight(mapId, x, z);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, gy + h * 0.5 + yOff, z);
    m.castShadow = true;
    m.receiveShadow = true;
    root.add(m);
    colliders.push({
      minX: x - w * 0.5,
      maxX: x + w * 0.5,
      minZ: z - d * 0.5,
      maxZ: z + d * 0.5,
      topY: gy + h + yOff,
    });
  };

  const addRuinedHouse = (x: number, z: number, w: number, d: number, floors = 2) => {
    const gy = getTerrainHeight(mapId, x, z);
    const h = floors * 3.1;
    const g = new THREE.Group();
    g.position.set(x, gy, z);
    // Floor slab
    const floor = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), concreteMat);
    floor.position.y = 0.15;
    floor.receiveShadow = true;
    // Left & Right walls
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.45, h, d), brickMat);
    wallL.position.set(-w * 0.5 + 0.22, h * 0.5, 0);
    const wallR = wallL.clone();
    wallR.position.x = w * 0.5 - 0.22;
    // Back wall (partial broken height)
    const wallB = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.78, 0.45), brickMat);
    wallB.position.set(0, h * 0.39, -d * 0.5 + 0.22);
    // Second floor partial loft
    if (floors > 1) {
      const loft = new THREE.Mesh(new THREE.BoxGeometry(w - 0.6, 0.25, d * 0.5), woodMat);
      loft.position.set(0, 3.1, -d * 0.2);
      g.add(loft);
    }
    [wallL, wallR, wallB].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    g.add(floor, wallL, wallR, wallB);
    root.add(g);

    colliders.push(
      { minX: x - w * 0.5, maxX: x - w * 0.5 + 0.55, minZ: z - d * 0.5, maxZ: z + d * 0.5, topY: gy + h },
      { minX: x + w * 0.5 - 0.55, maxX: x + w * 0.5, minZ: z - d * 0.5, maxZ: z + d * 0.5, topY: gy + h },
      { minX: x - w * 0.5, maxX: x + w * 0.5, minZ: z - d * 0.5, maxZ: z - d * 0.5 + 0.55, topY: gy + h * 0.78 }
    );
  };

  const addBunker = (x: number, z: number) => {
    const gy = getTerrainHeight(mapId, x, z);
    const g = new THREE.Group();
    g.position.set(x, gy, z);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.8, 6.2), concreteMat);
    roof.position.y = 2.6;
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.5, 6.0), concreteMat);
    p1.position.set(-2.9, 1.25, 0);
    const p2 = p1.clone();
    p2.position.x = 2.9;
    const back = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.5, 1.0), concreteMat);
    back.position.set(0, 1.25, 2.5);
    const frontApron = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.0, 0.9), concreteMat);
    frontApron.position.set(0, 0.5, -2.5);
    [roof, p1, p2, back, frontApron].forEach((m) => {
      m.castShadow = true;
      m.receiveShadow = true;
    });
    g.add(roof, p1, p2, back, frontApron);
    root.add(g);
    colliders.push(
      { minX: x - 3.6, maxX: x - 2.2, minZ: z - 3.0, maxZ: z + 3.0, topY: gy + 3.0 },
      { minX: x + 2.2, maxX: x + 3.6, minZ: z - 3.0, maxZ: z + 3.0, topY: gy + 3.0 }
    );
  };

  // Map-specific Hero Architecture
  if (mapId === 'ww1_trench') {
    addBunker(-28, 32);
    addBunker(28, 32);
    addBunker(0, 32);
    addBunker(-65, -28);
    addBunker(65, 28);
    // Wooden trench duckboards along trench lines
    const duckGeo = new THREE.BoxGeometry(1.6, 0.08, 4.0);
    const duckInst = new THREE.InstancedMesh(duckGeo, woodMat, 96);
    const dummy = new THREE.Object3D();
    let idx = 0;
    [-65, -32, 32, 65].forEach((tx, ti) => {
      for (let z = -60; z <= 60; z += 5.2) {
        if (idx >= 96) break;
        const x = tx + Math.sin(z * 0.14 + ti) * 3.5;
        dummy.position.set(x, getTerrainHeight(mapId, x, z) + 0.05, z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        duckInst.setMatrixAt(idx++, dummy.matrix);
      }
    });
    duckInst.count = idx;
    duckInst.computeBoundingSphere();
    root.add(duckInst);
  } else if (mapId === 'ww1_village') {
    addRuinedHouse(-24, -18, 9, 8, 2);
    addRuinedHouse(24, 18, 9, 8, 2);
    addRuinedHouse(-28, 22, 8, 7, 1);
    addRuinedHouse(28, -22, 8, 7, 1);
    addRuinedHouse(-58, -14, 9, 8, 2);
    addRuinedHouse(58, 14, 9, 8, 2);
    // Shattered Bell-Tower Church at center
    addBoxObstacle(0, -14, 8, 11, 8, brickMat);
    // Wooden creek bridge
    addBoxObstacle(12, -54, 7.5, 0.5, 14, woodMat, 1.4);
  } else if (mapId === 'ww2_armor') {
    addRuinedHouse(-20, 32, 10, 8, 1);
    addRuinedHouse(24, -38, 10, 8, 2);
    addBunker(-68, 12);
    addBunker(68, -12);
    addBoxObstacle(-24, 24, 3.2, 2.2, 6.2, concreteMat); // fuel depot tanks
    addBoxObstacle(-15, 24, 3.2, 2.2, 6.2, concreteMat);
  } else if (mapId === 'ww2_naval') {
    // Central Airstrip Runway
    const runway = new THREE.Mesh(
      new THREE.BoxGeometry(92, 0.25, 14),
      concreteMat
    );
    runway.position.set(0, getTerrainHeight(mapId, 0, -8) + 0.15, -8);
    runway.receiveShadow = true;
    root.add(runway);
    // Coastal Radar Bunker & West Harbor Pier
    addBunker(56, -12);
    addBoxObstacle(-76, 12, 24, 1.2, 6.5, woodMat, 1.2);
    addRuinedHouse(-42, 8, 8, 7, 1);
  } else if (mapId === 'training_range') {
    // Firing line shelter & weapon bench
    addBoxObstacle(0, 30, 24, 1.0, 2.2, woodMat);
    // Distance boards (25m, 50m, 80m)
    [-25, -50, -80].forEach((z) => {
      addBoxObstacle(-26, z, 1.8, 1.8, 0.3, woodMat);
    });
    // Target Dummies (static + moving)
    const dummyBodyMat = new THREE.MeshStandardMaterial({ color: '#8f4739', roughness: 0.8 });
    const dummyHeadMat = new THREE.MeshStandardMaterial({ color: '#d4b483', roughness: 0.7 });
    for (let i = 0; i < 8; i++) {
      const moving = i >= 4;
      const dx = -16 + (i % 4) * 10;
      const dz = moving ? -38 : -16;
      const dg = new THREE.Group();
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), woodMat);
      post.position.y = 0.35;
      const torso = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.22), dummyBodyMat);
      torso.position.y = 1.1;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), dummyHeadMat);
      head.position.y = 1.72;
      dg.add(post, torso, head);
      dg.position.set(dx, getTerrainHeight(mapId, dx, dz), dz);
      root.add(dg);
      dummies.push({
        id: `dummy_${i}`,
        mesh: dg,
        baseX: dx,
        baseZ: dz,
        moving,
        phase: i * 1.1,
        hp: 100,
        downTimer: 0,
      });
    }
  }

  // Instanced Sandbags, Rocks, Crates, Barbed Wire & Wind-Swaying Trees
  const sandCount = 65;
  const sandInst = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.9, 0.85), sandbagMat, sandCount);
  const crateInst = new THREE.InstancedMesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), woodMat, 45);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#6b6760', map: textureBank.get('concrete'), roughness: 0.92 });
  const rockInst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1.3, 0), rockMat, 55);

  const dummyObj = new THREE.Object3D();
  const cTmp = new THREE.Color();
  const spread = map.size * 0.42;

  for (let i = 0; i < sandCount; i++) {
    const x = (seededRand(i * 11 + 3) - 0.5) * spread * 1.8;
    const z = (seededRand(i * 17 + 7) - 0.5) * spread * 1.8;
    const y = getTerrainHeight(mapId, x, z);
    if (y < map.waterLevel + 0.3) continue;
    dummyObj.position.set(x, y + 0.42, z);
    dummyObj.rotation.set(0, seededRand(i * 5) * Math.PI, 0);
    dummyObj.scale.set(0.9 + seededRand(i) * 0.3, 1, 1);
    dummyObj.updateMatrix();
    sandInst.setMatrixAt(i, dummyObj.matrix);
    colliders.push({ minX: x - 1.0, maxX: x + 1.0, minZ: z - 0.6, maxZ: z + 0.6, topY: y + 0.9 });
  }
  sandInst.castShadow = true;
  sandInst.receiveShadow = true;
  sandInst.computeBoundingSphere();
  root.add(sandInst);

  for (let i = 0; i < 45; i++) {
    const x = (seededRand(i * 23 + 9) - 0.5) * spread * 1.7;
    const z = (seededRand(i * 29 + 11) - 0.5) * spread * 1.7;
    const y = getTerrainHeight(mapId, x, z);
    if (y < map.waterLevel + 0.4) continue;
    dummyObj.position.set(x, y + 0.52, z);
    dummyObj.rotation.set(0, seededRand(i * 7) * Math.PI, 0);
    dummyObj.scale.setScalar(0.85 + seededRand(i * 3) * 0.4);
    dummyObj.updateMatrix();
    crateInst.setMatrixAt(i, dummyObj.matrix);
  }
  crateInst.castShadow = true;
  crateInst.computeBoundingSphere();
  root.add(crateInst);

  for (let i = 0; i < 55; i++) {
    const x = (seededRand(i * 31 + 2) - 0.5) * spread * 2.1;
    const z = (seededRand(i * 37 + 5) - 0.5) * spread * 2.1;
    const y = getTerrainHeight(mapId, x, z);
    if (y < map.waterLevel + 0.2) continue;
    dummyObj.position.set(x, y + 0.55, z);
    dummyObj.rotation.set(seededRand(i) * 2, seededRand(i + 1) * 3, 0);
    const s = 0.7 + seededRand(i * 9) * 1.6;
    dummyObj.scale.set(s * 1.2, s * 0.85, s);
    dummyObj.updateMatrix();
    rockInst.setMatrixAt(i, dummyObj.matrix);
    cTmp.setHex(0x6d6961).offsetHSL(0, 0, (seededRand(i * 19) - 0.5) * 0.14);
    rockInst.setColorAt(i, cTmp);
  }
  rockInst.castShadow = true;
  rockInst.receiveShadow = true;
  rockInst.computeBoundingSphere();
  root.add(rockInst);

  // Wind-Swaying Foliage (Trees / Palms / Charred WW1 Trunks)
  const treeCount = mapId === 'ww2_armor' ? 40 : 60;
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4c3625', map: textureBank.get('wood'), roughness: 0.9 });
  const leafColor = mapId === 'ww2_naval' ? '#3f6e2f' : mapId === 'ww2_armor' ? '#586939' : '#3d4d2c';
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85 });
  leafMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = `uniform float uTime;\n` + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\nfloat sway = sin(uTime * 1.8 + position.y * 0.6) * max(0.0, position.y) * 0.06;\ntransformed.x += sway;`
    );
  };

  const trunkInst = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.36, 4.4, 7), trunkMat, treeCount);
  const canopyInst = new THREE.InstancedMesh(
    mapId === 'ww2_naval' ? new THREE.ConeGeometry(2.4, 1.4, 7) : new THREE.ConeGeometry(1.9, 4.6, 7),
    leafMat,
    treeCount
  );

  let tPlaced = 0;
  for (let i = 0; i < treeCount * 2 && tPlaced < treeCount; i++) {
    const x = (seededRand(i * 41 + 13) - 0.5) * spread * 2.15;
    const z = (seededRand(i * 43 + 17) - 0.5) * spread * 2.15;
    // Keep center airstrip/village square clear
    if (Math.hypot(x, z) < 18) continue;
    const y = getTerrainHeight(mapId, x, z);
    if (y < map.waterLevel + 0.6) continue;
    const sc = 0.8 + seededRand(i * 7) * 0.6;
    dummyObj.position.set(x, y + 2.1 * sc, z);
    dummyObj.rotation.set(0, seededRand(i) * Math.PI * 2, 0);
    dummyObj.scale.setScalar(sc);
    dummyObj.updateMatrix();
    trunkInst.setMatrixAt(tPlaced, dummyObj.matrix);

    if (mapId === 'ww1_trench' && i % 2 === 0) {
      // Charred barren WW1 trees have shrunken dead tops
      dummyObj.scale.set(0.1, 0.1, 0.1);
    } else {
      dummyObj.position.set(x, y + (mapId === 'ww2_naval' ? 4.4 : 4.8) * sc, z);
    }
    dummyObj.updateMatrix();
    canopyInst.setMatrixAt(tPlaced, dummyObj.matrix);
    cTmp.set(leafColor).offsetHSL(0, 0, (seededRand(i * 29) - 0.5) * 0.12);
    canopyInst.setColorAt(tPlaced, cTmp);
    tPlaced++;
  }
  trunkInst.count = tPlaced;
  canopyInst.count = tPlaced;
  trunkInst.castShadow = true;
  canopyInst.castShadow = true;
  trunkInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  root.add(trunkInst, canopyInst);

  // Capture Point Flagpoles
  map.capturePoints.forEach((cp) => {
    const gy = getTerrainHeight(mapId, cp.x, cp.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.3, 12), concreteMat);
    base.position.set(cp.x, gy + 0.15, cp.z);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 7.5, 8),
      new THREE.MeshStandardMaterial({ color: '#464a4f', metalness: 0.7, roughness: 0.4 })
    );
    pole.position.set(cp.x, gy + 3.75, cp.z);
    const flagMat = new THREE.MeshStandardMaterial({
      color: cp.initialOwner === 1 ? '#2563eb' : cp.initialOwner === 2 ? '#dc2626' : '#d4d4d8',
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5, 6, 2), flagMat);
    flag.position.set(cp.x + 1.35, gy + 6.4, cp.z);
    root.add(base, pole, flag);
    flagMeshes.set(cp.id, flag);
  });

  // Dynamic WW1 Gas Cloud Container
  const gasGroup = new THREE.Group();
  root.add(gasGroup);

  // Rain Particles (Overcast storm variant)
  let rainPoints: THREE.Points | null = null;
  if (timeVar.rain) {
    const count = 900;
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 140;
      arr[i * 3 + 1] = Math.random() * 45;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    const rGeo = new THREE.BufferGeometry();
    rGeo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const rMat = new THREE.PointsMaterial({ color: '#b4c6d4', size: 0.25, transparent: true, opacity: 0.55 });
    rainPoints = new THREE.Points(rGeo, rMat);
    root.add(rainPoints);
  }

  scene.add(root);

  return {
    root,
    colliders,
    flagMeshes,
    gasGroup,
    waterMesh,
    rainPoints,
    dummies,
    windUniforms,
    dispose: () => {
      scene.remove(root);
      root.traverse((obj) => {
        const m = obj as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        if (m.material) {
          if (Array.isArray(m.material)) m.material.forEach((mm) => mm.dispose());
          else m.material.dispose();
        }
      });
    },
  };
}
