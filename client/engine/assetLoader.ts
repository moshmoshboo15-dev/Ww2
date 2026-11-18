import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface AssetsManifest {
  models: string[];
  textures: string[];
  audio: string[];
}

class AssetOverrideManager {
  private manifest: AssetsManifest = { models: [], textures: [], audio: [] };
  private initialized = false;
  private gltfLoader = new GLTFLoader();
  private textureLoader = new THREE.TextureLoader();
  private modelCache = new Map<string, THREE.Object3D>();
  private textureCache = new Map<string, THREE.Texture>();
  private audioCache = new Map<string, ArrayBuffer>();

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;
    // Only query manifest when served over HTTP/HTTPS (never triggers 404 in file:// APK mode)
    if (typeof window === 'undefined' || window.location.protocol === 'file:') {
      return;
    }
    try {
      const res = await fetch('/api/assets-manifest');
      if (res.ok) {
        const data = await res.json();
        this.manifest = {
          models: Array.isArray(data.models) ? data.models : [],
          textures: Array.isArray(data.textures) ? data.textures : [],
          audio: Array.isArray(data.audio) ? data.audio : [],
        };
      }
    } catch {
      // Static/offline mode — procedural assets used automatically
    }
  }

  hasModel(name: string): string | null {
    const match = this.manifest.models.find(
      (f) => f === `${name}.glb` || f === `${name}.gltf`
    );
    return match ? `/assets/models/${match}` : null;
  }

  hasTexture(name: string): string | null {
    const match = this.manifest.textures.find((f) =>
      f.replace(/\.[^.]+$/, '') === name
    );
    return match ? `/assets/textures/${match}` : null;
  }

  hasAudio(name: string): string | null {
    const match = this.manifest.audio.find((f) =>
      f.replace(/\.[^.]+$/, '') === name
    );
    return match ? `/assets/audio/${match}` : null;
  }

  async loadModelOverride(name: string): Promise<THREE.Object3D | null> {
    const url = this.hasModel(name);
    if (!url) return null;
    if (this.modelCache.has(name)) return this.modelCache.get(name)!.clone();
    return new Promise((resolve) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          gltf.scene.traverse((c) => {
            if ((c as THREE.Mesh).isMesh) {
              c.castShadow = true;
              c.receiveShadow = true;
            }
          });
          this.modelCache.set(name, gltf.scene);
          resolve(gltf.scene.clone());
        },
        undefined,
        () => resolve(null)
      );
    });
  }

  loadTextureOverride(name: string): THREE.Texture | null {
    const url = this.hasTexture(name);
    if (!url) return null;
    if (this.textureCache.has(name)) return this.textureCache.get(name)!;
    const tex = this.textureLoader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    this.textureCache.set(name, tex);
    return tex;
  }

  async loadAudioOverride(name: string): Promise<ArrayBuffer | null> {
    const url = this.hasAudio(name);
    if (!url) return null;
    if (this.audioCache.has(name)) return this.audioCache.get(name)!.slice(0);
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      this.audioCache.set(name, buf.slice(0));
      return buf;
    } catch {
      return null;
    }
  }
}

export const assetOverrides = new AssetOverrideManager();
