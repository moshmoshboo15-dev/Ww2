import * as THREE from 'three';

interface TracerItem {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  ttl: number;
}

interface BurstParticle {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  gravity: number;
  ttl: number;
  maxTtl: number;
  grow: number;
}

interface ShockwaveItem {
  mesh: THREE.Mesh;
  ttl: number;
  maxTtl: number;
  maxScale: number;
}

export class VFXPool {
  private scene: THREE.Scene;
  private tracers: TracerItem[] = [];
  private particles: BurstParticle[] = [];
  private shockwaves: ShockwaveItem[] = [];
  private decals: THREE.Mesh[] = [];

  private tracerGeo = new THREE.BoxGeometry(0.05, 0.05, 1.9);
  private tracerMat = new THREE.MeshBasicMaterial({ color: '#ffd97d' });
  private flameMat = new THREE.MeshBasicMaterial({ color: '#ff6a1a', transparent: true, opacity: 0.85 });
  private sparkGeo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  private smokeGeo = new THREE.IcosahedronGeometry(0.45, 0);
  private decalGeo = new THREE.CircleGeometry(0.14, 8);
  private decalMat = new THREE.MeshBasicMaterial({
    color: '#1b1a18',
    transparent: true,
    opacity: 0.78,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    depthWrite: false,
  });
  private craterMat = new THREE.MeshBasicMaterial({
    color: '#1f1913',
    transparent: true,
    opacity: 0.72,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    depthWrite: false,
  });

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnTracer(origin: THREE.Vector3, dir: THREE.Vector3, speed: number, isFlame = false): void {
    const mesh = new THREE.Mesh(
      isFlame ? this.smokeGeo : this.tracerGeo,
      isFlame ? this.flameMat : this.tracerMat
    );
    mesh.position.copy(origin);
    if (!isFlame) {
      mesh.lookAt(origin.x + dir.x, origin.y + dir.y, origin.z + dir.z);
    } else {
      mesh.scale.setScalar(0.5);
    }
    this.scene.add(mesh);
    this.tracers.push({
      mesh,
      vel: dir.clone().multiplyScalar(Math.min(220, speed)),
      ttl: isFlame ? 0.45 : 0.4,
    });
  }

  spawnImpact(pos: THREE.Vector3, kind: 'dirt' | 'metal' | 'blood' | 'water'): void {
    const color = kind === 'metal' ? '#ffd166' : kind === 'blood' ? '#9e1c1c' : kind === 'water' ? '#d4ebf7' : '#6c5a44';
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 });
    const count = kind === 'metal' ? 6 : 5;
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(this.sparkGeo, mat);
      m.position.copy(pos);
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 8, 2 + Math.random() * 5, (Math.random() - 0.5) * 8),
        gravity: 16,
        ttl: 0.35 + Math.random() * 0.25,
        maxTtl: 0.6,
        grow: 0,
      });
    }
    if (kind === 'dirt' || kind === 'metal') {
      const dec = new THREE.Mesh(this.decalGeo, this.decalMat);
      dec.rotation.x = -Math.PI / 2;
      dec.position.set(pos.x, pos.y + 0.03, pos.z);
      this.scene.add(dec);
      this.decals.push(dec);
      if (this.decals.length > 80) {
        const old = this.decals.shift();
        if (old) this.scene.remove(old);
      }
    }
  }

  spawnExplosion(pos: THREE.Vector3, radius = 6): void {
    const scale = Math.max(0.7, radius / 5);

    // Bright flash ball
    const flash = new THREE.Mesh(
      new THREE.SphereGeometry(0.9 * scale, 10, 8),
      new THREE.MeshBasicMaterial({ color: '#ffcf66', transparent: true, opacity: 0.95 })
    );
    flash.position.copy(pos);
    this.scene.add(flash);
    this.particles.push({
      mesh: flash,
      vel: new THREE.Vector3(0, 1, 0),
      gravity: 0,
      ttl: 0.18,
      maxTtl: 0.18,
      grow: 3.5,
    });

    // Shockwave ring
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 1.0, 24),
      new THREE.MeshBasicMaterial({ color: '#ffae42', side: THREE.DoubleSide, transparent: true, opacity: 0.8, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.15, pos.z);
    this.scene.add(ring);
    this.shockwaves.push({ mesh: ring, ttl: 0.45, maxTtl: 0.45, maxScale: radius * 1.4 });

    // Smoke & flying debris
    const smokeMat = new THREE.MeshStandardMaterial({ color: '#3b3733', roughness: 0.95, transparent: true, opacity: 0.8 });
    const debrisMat = new THREE.MeshStandardMaterial({ color: '#2b241d', roughness: 0.9 });
    for (let i = 0; i < 10; i++) {
      const isSmoke = i < 6;
      const m = new THREE.Mesh(isSmoke ? this.smokeGeo : this.sparkGeo, isSmoke ? smokeMat : debrisMat);
      m.position.copy(pos);
      if (isSmoke) m.scale.setScalar(scale * (0.8 + Math.random()));
      this.scene.add(m);
      this.particles.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 14 * scale, (3 + Math.random() * 10) * scale, (Math.random() - 0.5) * 14 * scale),
        gravity: isSmoke ? -1.5 : 20,
        ttl: isSmoke ? 1.4 : 0.9,
        maxTtl: isSmoke ? 1.4 : 0.9,
        grow: isSmoke ? 2.2 : 0,
      });
    }

    // Scorch crater decal
    const crater = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.45, 12), this.craterMat);
    crater.rotation.x = -Math.PI / 2;
    crater.position.set(pos.x, pos.y + 0.04, pos.z);
    this.scene.add(crater);
    this.decals.push(crater);
    if (this.decals.length > 80) {
      const old = this.decals.shift();
      if (old) this.scene.remove(old);
    }
  }

  update(dt: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.ttl -= dt;
      t.mesh.position.addScaledVector(t.vel, dt);
      if (t.ttl <= 0) {
        this.scene.remove(t.mesh);
        this.tracers.splice(i, 1);
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.ttl -= dt;
      p.vel.y -= p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      if (p.grow !== 0) {
        p.mesh.scale.addScalar(p.grow * dt);
      }
      if (p.ttl <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
      }
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const s = this.shockwaves[i];
      s.ttl -= dt;
      const prog = 1 - s.ttl / s.maxTtl;
      s.mesh.scale.setScalar(1 + prog * s.maxScale);
      (s.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.8 * (1 - prog));
      if (s.ttl <= 0) {
        this.scene.remove(s.mesh);
        this.shockwaves.splice(i, 1);
      }
    }
  }

  dispose(): void {
    this.tracers.forEach((t) => this.scene.remove(t.mesh));
    this.particles.forEach((p) => this.scene.remove(p.mesh));
    this.shockwaves.forEach((s) => this.scene.remove(s.mesh));
    this.decals.forEach((d) => this.scene.remove(d));
    this.tracers = [];
    this.particles = [];
    this.shockwaves = [];
    this.decals = [];
  }
}
