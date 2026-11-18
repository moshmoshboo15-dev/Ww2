import { assetOverrides } from '../engine/assetLoader';
import type { WeaponDef } from '../../shared/weapons';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private decodedOverrides = new Map<string, AudioBuffer>();

  private masterVol = 0.8;
  private sfxVol = 0.9;
  private musicVol = 0.45;
  private voiceVol = 0.8;

  private ambientStarted = false;
  private musicTimer: number | null = null;
  private musicMode: 'none' | 'menu' | 'battle' = 'none';
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private listenerPos = { x: 0, y: 0, z: 0 };
  private listenerYaw = 0;

  ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -14;
      compressor.knee.value = 18;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.18;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVol;
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol;
      this.voiceGain = this.ctx.createGain();
      this.voiceGain.gain.value = this.voiceVol;

      this.sfxGain.connect(compressor);
      this.musicGain.connect(compressor);
      this.voiceGain.connect(compressor);
      compressor.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.noiseBuffer = this.createNoiseBuffer(2.0);
      this.reverbNode = this.createReverb(1.35);
      const revReturn = this.ctx.createGain();
      revReturn.gain.value = 0.32;
      this.reverbNode.connect(revReturn);
      revReturn.connect(this.sfxGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setVolumes(master: number, sfx: number, music: number, voice: number): void {
    this.masterVol = master;
    this.sfxVol = sfx;
    this.musicVol = music;
    this.voiceVol = voice;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.masterGain?.gain.setTargetAtTime(master, t, 0.05);
    this.sfxGain?.gain.setTargetAtTime(sfx, t, 0.05);
    this.musicGain?.gain.setTargetAtTime(music, t, 0.05);
    this.voiceGain?.gain.setTargetAtTime(voice, t, 0.05);
  }

  setListener(x: number, y: number, z: number, yaw: number): void {
    this.listenerPos.x = x;
    this.listenerPos.y = y;
    this.listenerPos.z = z;
    this.listenerYaw = yaw;
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buf;
  }

  private createReverb(duration: number): ConvolverNode {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * duration);
    const impulse = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const decay = Math.pow(1 - i / len, 2.8);
        data[i] = (Math.random() * 2 - 1) * decay;
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = impulse;
    return conv;
  }

  private computeSpatial(pos?: { x: number; y: number; z: number }): { gain: number; pan: number; lpFreq: number } {
    if (!pos) return { gain: 1, pan: 0, lpFreq: 18000 };
    const dx = pos.x - this.listenerPos.x;
    const dy = pos.y - this.listenerPos.y;
    const dz = pos.z - this.listenerPos.z;
    const dist = Math.hypot(dx, dy, dz);
    if (dist < 2) return { gain: 1, pan: 0, lpFreq: 18000 };
    const gain = Math.max(0.03, Math.min(1, 18 / (dist + 16)));
    const lpFreq = Math.max(550, 16000 * Math.exp(-dist * 0.015));
    // Project onto listener right vector (forward is -sin(yaw), -cos(yaw), right is cos(yaw), -sin(yaw))
    const rx = Math.cos(this.listenerYaw);
    const rz = -Math.sin(this.listenerYaw);
    const pan = Math.max(-0.95, Math.min(0.95, (dx * rx + dz * rz) / Math.max(1, dist)));
    return { gain, pan, lpFreq };
  }

  private async tryPlayOverride(name: string, vol = 0.8, pos?: { x: number; y: number; z: number }): Promise<boolean> {
    if (!assetOverrides.hasAudio(name)) return false;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return false;
    try {
      let decoded = this.decodedOverrides.get(name);
      if (!decoded) {
        const buf = await assetOverrides.loadAudioOverride(name);
        if (!buf) return false;
        decoded = await ctx.decodeAudioData(buf);
        this.decodedOverrides.set(name, decoded);
      }
      const src = ctx.createBufferSource();
      src.buffer = decoded;
      const spatial = this.computeSpatial(pos);
      const gain = ctx.createGain();
      gain.gain.value = vol * spatial.gain;
      const panner = ctx.createStereoPanner();
      panner.pan.value = spatial.pan;
      src.connect(gain);
      gain.connect(panner);
      panner.connect(this.sfxGain);
      src.start();
      return true;
    } catch {
      return false;
    }
  }

  playGunshot(weapon: WeaponDef, pos?: { x: number; y: number; z: number }): void {
    if (assetOverrides.hasAudio(weapon.id)) {
      this.tryPlayOverride(weapon.id, 0.9, pos);
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;

    const now = ctx.currentTime;
    const spatial = this.computeSpatial(pos);
    const jitter = 1 + (Math.random() - 0.5) * (weapon.sound?.pitchJitter || 0.06);

    const out = ctx.createGain();
    out.gain.value = spatial.gain * 0.9;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = spatial.lpFreq;
    const panner = ctx.createStereoPanner();
    panner.pan.value = spatial.pan;

    out.connect(lp);
    lp.connect(panner);
    panner.connect(this.sfxGain);
    if (this.reverbNode) panner.connect(this.reverbNode);

    if (weapon.isFlame) {
      // Roaring propane flame whoosh
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(520 * jitter, now);
      bp.Q.value = 0.8;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.45, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.005, now + 0.16);
      src.connect(bp);
      bp.connect(g);
      g.connect(out);
      src.start(now);
      src.stop(now + 0.18);
      return;
    }

    // Layer 1: Sharp supersonic crack
    const crack = ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'bandpass';
    hp.frequency.setValueAtTime((weapon.sound?.crackFreq || 1750) * jitter, now);
    hp.Q.value = 1.1;
    const crackGain = ctx.createGain();
    crackGain.gain.setValueAtTime(0.95, now);
    crackGain.gain.exponentialRampToValueAtTime(0.005, now + 0.09);
    crack.connect(hp);
    hp.connect(crackGain);
    crackGain.connect(out);
    crack.start(now);
    crack.stop(now + 0.1);

    // Layer 2: Punchy chest thump
    const bodyOsc = ctx.createOscillator();
    bodyOsc.type = 'triangle';
    const baseF = (weapon.sound?.thumpFreq || 145) * jitter;
    bodyOsc.frequency.setValueAtTime(baseF * 1.9, now);
    bodyOsc.frequency.exponentialRampToValueAtTime(baseF * 0.35, now + 0.11);
    const bodyGain = ctx.createGain();
    bodyGain.gain.setValueAtTime(0.85, now);
    bodyGain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);
    bodyOsc.connect(bodyGain);
    bodyGain.connect(out);
    bodyOsc.start(now);
    bodyOsc.stop(now + 0.15);

    // Layer 3: Barrel tail
    const tail = ctx.createBufferSource();
    tail.buffer = this.noiseBuffer;
    const tailLp = ctx.createBiquadFilter();
    tailLp.type = 'lowpass';
    tailLp.frequency.setValueAtTime(1600, now);
    tailLp.frequency.exponentialRampToValueAtTime(240, now + (weapon.sound?.tailDecay || 0.35));
    const tailGain = ctx.createGain();
    tailGain.gain.setValueAtTime(0.45, now + 0.015);
    tailGain.gain.exponentialRampToValueAtTime(0.002, now + (weapon.sound?.tailDecay || 0.35));
    tail.connect(tailLp);
    tailLp.connect(tailGain);
    tailGain.connect(out);
    tail.start(now);
    tail.stop(now + (weapon.sound?.tailDecay || 0.35) + 0.02);
  }

  playReload(style: string): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const click = (delay: number, freq: number, dur = 0.045) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.45, now + delay + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.18, now + delay);
      g.gain.exponentialRampToValueAtTime(0.003, now + delay + dur);
      osc.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now + delay);
      osc.stop(now + delay + dur + 0.01);
    };
    if (style === 'clip_ping') {
      // Iconic M1-style metallic clip ping!
      const ping = ctx.createOscillator();
      ping.type = 'sine';
      ping.frequency.setValueAtTime(2650, now + 0.05);
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0.24, now + 0.05);
      pg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      ping.connect(pg);
      pg.connect(this.sfxGain);
      ping.start(now + 0.05);
      ping.stop(now + 0.56);
    }
    click(0.12, 820);
    click(0.55, 620);
    click(0.95, 1180);
  }

  playExplosion(pos?: { x: number; y: number; z: number }, scale = 1): void {
    if (assetOverrides.hasAudio('explosion')) {
      this.tryPlayOverride('explosion', 1.0, pos);
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const spatial = this.computeSpatial(pos);

    const out = ctx.createGain();
    out.gain.value = spatial.gain * Math.min(1.2, scale);
    const panner = ctx.createStereoPanner();
    panner.pan.value = spatial.pan;
    out.connect(panner);
    panner.connect(this.sfxGain);
    if (this.reverbNode) panner.connect(this.reverbNode);

    // Sub-bass shockwave
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95, now);
    sub.frequency.exponentialRampToValueAtTime(26, now + 0.65);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(1.0, now);
    sg.gain.exponentialRampToValueAtTime(0.004, now + 0.85);
    sub.connect(sg);
    sg.connect(out);
    sub.start(now);
    sub.stop(now + 0.9);

    // Blast noise & debris
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(spatial.lpFreq, 3800), now);
    lp.frequency.exponentialRampToValueAtTime(140, now + 1.15);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.95, now);
    ng.gain.exponentialRampToValueAtTime(0.003, now + 1.2);
    n.connect(lp);
    lp.connect(ng);
    ng.connect(out);
    n.start(now);
    n.stop(now + 1.25);
  }

  playHitMarker(headshot: boolean): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = headshot ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(headshot ? 1680 : 1080, now);
    osc.frequency.exponentialRampToValueAtTime(headshot ? 2350 : 620, now + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.002, now + 0.07);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.075);
  }

  playImpact(surface: 'dirt' | 'metal' | 'water' | 'flesh', pos: { x: number; y: number; z: number }): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;
    const spatial = this.computeSpatial(pos);
    if (spatial.gain < 0.05) return;
    const now = ctx.currentTime;

    if (surface === 'metal') {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(2200 + Math.random() * 900, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.14);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.25 * spatial.gain, now);
      g.gain.exponentialRampToValueAtTime(0.002, now + 0.15);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.16);
      return;
    }

    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = surface === 'water' ? 'bandpass' : 'lowpass';
    f.frequency.value = surface === 'water' ? 1400 : 650;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.24 * spatial.gain, now);
    g.gain.exponentialRampToValueAtTime(0.002, now + (surface === 'water' ? 0.22 : 0.09));
    n.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    n.start(now);
    n.stop(now + 0.25);
  }

  playWhizzBy(pos: { x: number; y: number; z: number }): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const spatial = this.computeSpatial(pos);
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2400, now);
    osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
    const pan = ctx.createStereoPanner();
    pan.pan.value = spatial.pan;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18 * spatial.gain, now);
    g.gain.exponentialRampToValueAtTime(0.002, now + 0.1);
    osc.connect(pan);
    pan.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.11);
  }

  playFootstep(surface: 'dirt' | 'wood' | 'water' | 'stone'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noiseBuffer;
    const f = ctx.createBiquadFilter();
    f.type = surface === 'water' ? 'bandpass' : 'lowpass';
    f.frequency.value = surface === 'wood' ? 540 : surface === 'stone' ? 920 : surface === 'water' ? 1200 : 380;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.002, now + 0.09);
    n.connect(f);
    f.connect(g);
    g.connect(this.sfxGain);
    n.start(now);
    n.stop(now + 0.1);
  }

  playGasSiren(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.voiceGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.linearRampToValueAtTime(680, now + 1.1);
    osc.frequency.linearRampToValueAtTime(340, now + 2.2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1400;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.01, now);
    g.gain.linearRampToValueAtTime(0.24, now + 0.25);
    g.gain.exponentialRampToValueAtTime(0.003, now + 2.3);
    osc.connect(lp);
    lp.connect(g);
    g.connect(this.voiceGain);
    osc.start(now);
    osc.stop(now + 2.35);
  }

  playShipHorn(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    [82, 123].forEach((freq) => {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 320;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.2);
      g.gain.exponentialRampToValueAtTime(0.003, now + 1.7);
      osc.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain!);
      osc.start(now);
      osc.stop(now + 1.8);
    });
  }

  playUIClick(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(760, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.04);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.002, now + 0.045);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  updateVehicleEngine(active: boolean, kind: string | null, speedRatio: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.sfxGain) return;
    if (!active || kind === 'emplacement') {
      if (this.engineGain) {
        this.engineGain.gain.setTargetAtTime(0, ctx.currentTime, 0.08);
      }
      return;
    }
    if (!this.engineOsc) {
      this.engineOsc = ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineSubOsc = ctx.createOscillator();
      this.engineSubOsc.type = 'triangle';
      this.engineFilter = ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineGain = ctx.createGain();
      this.engineGain.gain.value = 0;

      this.engineOsc.connect(this.engineFilter);
      this.engineSubOsc.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.sfxGain);
      this.engineOsc.start();
      this.engineSubOsc.start();
    }
    const base = kind === 'plane' || kind === 'bomber' ? 68 : kind === 'tank' ? 42 : kind === 'ship' || kind === 'carrier' ? 32 : 52;
    const targetFreq = base * (0.85 + Math.abs(speedRatio) * 1.35);
    const t = ctx.currentTime;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, t, 0.08);
    this.engineSubOsc!.frequency.setTargetAtTime(targetFreq * 0.5, t, 0.08);
    this.engineFilter!.frequency.setTargetAtTime(220 + Math.abs(speedRatio) * 480, t, 0.08);
    this.engineGain!.gain.setTargetAtTime(0.13 + Math.abs(speedRatio) * 0.1, t, 0.08);
  }

  startAmbientWarLoop(): void {
    if (this.ambientStarted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || !this.noiseBuffer) return;
    this.ambientStarted = true;

    // Gentle filtered wind noise
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuffer;
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 320;
    bp.Q.value = 0.7;
    const wg = ctx.createGain();
    wg.gain.value = 0.045;
    wind.connect(bp);
    bp.connect(wg);
    wg.connect(this.sfxGain);
    wind.start();

    // Occasional distant muffled artillery rumble
    window.setInterval(() => {
      if (this.musicMode !== 'battle' || !this.ctx || !this.sfxGain || !this.noiseBuffer) return;
      if (Math.random() > 0.35) return;
      const now = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 160;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.01, now);
      g.gain.linearRampToValueAtTime(0.16, now + 0.08);
      g.gain.exponentialRampToValueAtTime(0.002, now + 0.9);
      src.connect(lp);
      lp.connect(g);
      g.connect(this.sfxGain);
      src.start(now);
      src.stop(now + 0.95);
    }, 4500);
  }

  setMusicMode(mode: 'none' | 'menu' | 'battle'): void {
    if (this.musicMode === mode) return;
    this.musicMode = mode;
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    if (mode === 'none') return;
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    const chords = mode === 'menu'
      ? [[146.83, 220, 261.63], [130.81, 196, 246.94], [116.54, 174.61, 220], [110, 164.81, 207.65]]
      : [[110, 164.81, 220], [116.54, 174.61, 233.08], [98, 146.83, 196], [110, 164.81, 207.65]];
    let step = 0;

    const playBar = () => {
      if (!this.ctx || !this.musicGain || this.musicMode === 'none') return;
      const chord = chords[step % chords.length];
      step++;
      const now = this.ctx.currentTime;
      chord.forEach((f) => {
        const osc = this.ctx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);
        const lp = this.ctx!.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = mode === 'menu' ? 420 : 540;
        const g = this.ctx!.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.065, now + 0.8);
        g.gain.linearRampToValueAtTime(0.002, now + 3.8);
        osc.connect(lp);
        lp.connect(g);
        g.connect(this.musicGain!);
        osc.start(now);
        osc.stop(now + 3.9);
      });
    };
    playBar();
    this.musicTimer = window.setInterval(playBar, 4000);
  }
}

export const soundEngine = new SoundEngine();
