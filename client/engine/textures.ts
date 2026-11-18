import * as THREE from 'three';
import { assetOverrides } from './assetLoader';

export type TextureKind =
  | 'mud'
  | 'grass'
  | 'sand'
  | 'cobble'
  | 'brick'
  | 'concrete'
  | 'wood'
  | 'steel'
  | 'brass'
  | 'cloth'
  | 'rust'
  | 'water_normal'
  | 'camo_winter'
  | 'camo_desert'
  | 'camo_mud';

class ProceduralTextureBank {
  private cache = new Map<string, THREE.Texture>();
  private maxAniso = 4;

  setMaxAnisotropy(val: number): void {
    this.maxAniso = Math.max(1, Math.min(8, val));
  }

  get(kind: TextureKind, repeatX = 1, repeatY = 1): THREE.Texture {
    const key = `${kind}_${repeatX}_${repeatY}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    // Check optional disk override first
    const override = assetOverrides.loadTextureOverride(kind);
    if (override) {
      override.repeat.set(repeatX, repeatY);
      override.anisotropy = this.maxAniso;
      this.cache.set(key, override);
      return override;
    }

    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    this.paintTexture(ctx, size, kind);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = this.maxAniso;
    if (kind !== 'water_normal') {
      tex.colorSpace = THREE.SRGBColorSpace;
    }
    this.cache.set(key, tex);
    return tex;
  }

  private paintTexture(ctx: CanvasRenderingContext2D, size: number, kind: TextureKind): void {
    const rand = (seed: number) => {
      const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return x - Math.floor(x);
    };

    if (kind === 'water_normal') {
      ctx.fillStyle = '#8080ff';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < 180; i++) {
        const x = rand(i * 3) * size;
        const y = rand(i * 7 + 1) * size;
        const r = 10 + rand(i * 11) * 28;
        const g = ctx.createRadialGradient(x, y, 1, x, y, r);
        g.addColorStop(0, 'rgba(155, 165, 255, 0.35)');
        g.addColorStop(0.5, 'rgba(105, 115, 255, 0.25)');
        g.addColorStop(1, 'rgba(128, 128, 255, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      }
      return;
    }

    const basePalette: Record<string, [string, string]> = {
      mud: ['#4c3e2c', '#362a1d'],
      grass: ['#4f5f37', '#3b4a28'],
      sand: ['#c4a46e', '#a98954'],
      cobble: ['#67645c', '#4b4942'],
      brick: ['#7d4433', '#5c2f23'],
      concrete: ['#787a75', '#5d5f5a'],
      wood: ['#6b4223', '#4e2d16'],
      steel: ['#333941', '#21262c'],
      brass: ['#b6923c', '#886a26'],
      cloth: ['#535d44', '#414935'],
      rust: ['#6b3e26', '#462618'],
      camo_winter: ['#dce1e3', '#9aa4aa'],
      camo_desert: ['#cfb07c', '#9d7f53'],
      camo_mud: ['#68533b', '#3f3122'],
    };

    const [c1, c2] = basePalette[kind] || ['#666666', '#444444'];
    ctx.fillStyle = c1;
    ctx.fillRect(0, 0, size, size);

    // Subtle grunge / mottling
    for (let i = 0; i < 420; i++) {
      const x = rand(i * 13.1) * size;
      const y = rand(i * 17.3) * size;
      const rad = 2 + rand(i * 23.7) * 18;
      ctx.globalAlpha = 0.08 + rand(i * 5) * 0.14;
      ctx.fillStyle = i % 2 === 0 ? c2 : c1;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    if (kind === 'wood') {
      ctx.strokeStyle = '#2d180a';
      for (let y = 0; y < size; y += 6) {
        ctx.globalAlpha = 0.18 + rand(y) * 0.16;
        ctx.lineWidth = 1 + rand(y + 9) * 2;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(size * 0.33, y + (rand(y + 1) - 0.5) * 10, size * 0.66, y + (rand(y + 2) - 0.5) * 10, size, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (kind === 'brick') {
      const bh = 32;
      const bw = 64;
      ctx.strokeStyle = '#9b9589';
      ctx.lineWidth = 3;
      for (let row = 0; row < size / bh; row++) {
        const y = row * bh;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
        const off = (row % 2) * (bw / 2);
        for (let col = 0; col <= size / bw; col++) {
          const x = (col * bw + off) % size;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y + bh);
          ctx.stroke();
        }
      }
    } else if (kind === 'cobble') {
      const s = 32;
      for (let r = 0; r < size / s; r++) {
        for (let c = 0; c < size / s; c++) {
          const x = c * s + (r % 2) * 14;
          const y = r * s;
          ctx.fillStyle = rand(r * 31 + c) > 0.5 ? '#757168' : '#59564f';
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect((x % size) + 2, y + 2, s - 4, s - 4, 6);
          } else {
            ctx.rect((x % size) + 2, y + 2, s - 4, s - 4);
          }
          ctx.fill();
        }
      }
    } else if (kind === 'steel' || kind === 'brass') {
      // Brushed scratches & edge wear
      for (let i = 0; i < 160; i++) {
        ctx.strokeStyle = i % 3 === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        const x = rand(i * 3) * size;
        const y = rand(i * 9) * size;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 8 + rand(i * 15) * 28, y + (rand(i * 19) - 0.5) * 6);
        ctx.stroke();
      }
    } else if (kind === 'cloth') {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i < size; i += 4) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, size);
        ctx.moveTo(0, i);
        ctx.lineTo(size, i);
        ctx.stroke();
      }
    } else if (kind.startsWith('camo_')) {
      const blobs = kind === 'camo_winter'
        ? ['#c2ccd1', '#7d8a91', '#eef2f3']
        : kind === 'camo_desert'
          ? ['#b48e58', '#83673f', '#e0c699']
          : ['#4e412e', '#32291c', '#7c6b4d'];
      for (let i = 0; i < 45; i++) {
        ctx.fillStyle = blobs[i % blobs.length];
        ctx.globalAlpha = 0.65;
        ctx.beginPath();
        ctx.ellipse(
          rand(i * 11) * size,
          rand(i * 17) * size,
          14 + rand(i * 7) * 26,
          10 + rand(i * 13) * 18,
          rand(i * 5) * Math.PI,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Fine micro-grain
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(rand(i * 29) * size, rand(i * 37) * size, 2, 2);
    }
  }
}

export const textureBank = new ProceduralTextureBank();
