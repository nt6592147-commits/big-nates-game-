import { BiomeType, SurfaceType } from './types';

export class WildroadAudio {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  private noiseBuffer: AudioBuffer | null = null;
  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;

  private riverGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private rainGain: GainNode | null = null;

  private muted = false;
  private volume = 0.65;
  private birdCooldown = 1.5;
  private thunderCooldown = 8;
  private sirenCooldown = 0;
  private sirenHigh = false;
  private initialized = false;

  public unlock(): void {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.volume;
      master.connect(ctx.destination);
      this.masterGain = master;

      // Create shared white noise buffer
      const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buf;

      // Engine synthesizer
      const engFilter = ctx.createBiquadFilter();
      engFilter.type = 'lowpass';
      engFilter.frequency.value = 260;

      const engGain = ctx.createGain();
      engGain.gain.value = 0;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 60;

      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 120;

      osc1.connect(engFilter);
      osc2.connect(engFilter);
      engFilter.connect(engGain);
      engGain.connect(master);
      osc1.start();
      osc2.start();

      this.engineOsc1 = osc1;
      this.engineOsc2 = osc2;
      this.engineFilter = engFilter;
      this.engineGain = engGain;

      // Tire / Surface noise loop
      const tireSrc = ctx.createBufferSource();
      tireSrc.buffer = buf;
      tireSrc.loop = true;
      const tireFlt = ctx.createBiquadFilter();
      tireFlt.type = 'bandpass';
      tireFlt.frequency.value = 900;
      tireFlt.Q.value = 1.8;
      const tGain = ctx.createGain();
      tGain.gain.value = 0;
      tireSrc.connect(tireFlt);
      tireFlt.connect(tGain);
      tGain.connect(master);
      tireSrc.start();
      this.tireFilter = tireFlt;
      this.tireGain = tGain;

      // River ambience loop
      const rivSrc = ctx.createBufferSource();
      rivSrc.buffer = buf;
      rivSrc.loop = true;
      const rivFlt = ctx.createBiquadFilter();
      rivFlt.type = 'bandpass';
      rivFlt.frequency.value = 460;
      rivFlt.Q.value = 0.7;
      const rGain = ctx.createGain();
      rGain.gain.value = 0;
      rivSrc.connect(rivFlt);
      rivFlt.connect(rGain);
      rGain.connect(master);
      rivSrc.start();
      this.riverGain = rGain;

      // Wind loop
      const windSrc = ctx.createBufferSource();
      windSrc.buffer = buf;
      windSrc.loop = true;
      const windFlt = ctx.createBiquadFilter();
      windFlt.type = 'lowpass';
      windFlt.frequency.value = 320;
      const wGain = ctx.createGain();
      wGain.gain.value = 0;
      windSrc.connect(windFlt);
      windFlt.connect(wGain);
      wGain.connect(master);
      windSrc.start();
      this.windGain = wGain;

      // Rain loop
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = buf;
      rainSrc.loop = true;
      const rainFlt = ctx.createBiquadFilter();
      rainFlt.type = 'highpass';
      rainFlt.frequency.value = 1400;
      const rnGain = ctx.createGain();
      rnGain.gain.value = 0;
      rainSrc.connect(rainFlt);
      rainFlt.connect(rnGain);
      rnGain.connect(master);
      rainSrc.start();
      this.rainGain = rnGain;

      this.initialized = true;
    } catch {
      // Ignore environments without Web Audio API
    }
  }

  public setMuted(muted: boolean, volume: number): void {
    this.muted = muted;
    this.volume = volume;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : volume, this.ctx.currentTime, 0.06);
    }
  }

  public silenceLoops(): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain?.gain.setTargetAtTime(0, t, 0.05);
    this.tireGain?.gain.setTargetAtTime(0, t, 0.05);
    this.riverGain?.gain.setTargetAtTime(0, t, 0.08);
    this.windGain?.gain.setTargetAtTime(0, t, 0.08);
    this.rainGain?.gain.setTargetAtTime(0, t, 0.08);
  }

  public update(params: {
    active: boolean;
    rpmRatio: number;
    enginePitch: number;
    speedMs: number;
    slipRatio: number;
    surface: SurfaceType;
    biome: BiomeType;
    riverProximity: number; // 0..1 (1 = right next to river)
    rainIntensity: number; // 0..1
    isNight: boolean;
    dt: number;
  }): void {
    if (!this.ctx || !this.initialized) return;
    if (!params.active) {
      this.silenceLoops();
      return;
    }

    const t = this.ctx.currentTime;
    const baseFreq = (42 + params.rpmRatio * 135) * params.enginePitch;
    this.engineOsc1?.frequency.setTargetAtTime(baseFreq, t, 0.04);
    this.engineOsc2?.frequency.setTargetAtTime(baseFreq * 1.98, t, 0.04);
    this.engineFilter?.frequency.setTargetAtTime(220 + params.rpmRatio * 680, t, 0.05);
    this.engineGain?.gain.setTargetAtTime(0.065 + params.rpmRatio * 0.06, t, 0.05);

    // Tire sound
    const absSpeed = Math.abs(params.speedMs);
    const tireVol =
      params.surface === 'water'
        ? Math.min(0.14, absSpeed * 0.008)
        : params.slipRatio > 0.25 && absSpeed > 3
          ? Math.min(0.12, params.slipRatio * 0.12)
          : Math.min(0.035, absSpeed * 0.0012);
    const tireFreq =
      params.surface === 'asphalt' || params.surface === 'bridge'
        ? 1450
        : params.surface === 'water'
          ? 650
          : 420;
    this.tireFilter?.frequency.setTargetAtTime(tireFreq, t, 0.08);
    this.tireGain?.gain.setTargetAtTime(tireVol, t, 0.06);

    // Environmental ambience
    this.riverGain?.gain.setTargetAtTime(params.riverProximity * 0.09, t, 0.2);
    const windLevel = 0.015 + Math.min(0.06, absSpeed * 0.0014) + (params.biome === 'mountain' ? 0.035 : 0);
    this.windGain?.gain.setTargetAtTime(windLevel, t, 0.2);
    this.rainGain?.gain.setTargetAtTime(params.rainIntensity * 0.085, t, 0.2);

    // Periodic forest birdsong & rain thunder
    if (!this.muted) {
      this.birdCooldown -= params.dt;
      if (this.birdCooldown <= 0 && !params.isNight && params.rainIntensity < 0.4) {
        if (params.biome === 'forest' || params.biome === 'grassland' || params.biome === 'river') {
          this.playBirdChirp();
        }
        this.birdCooldown = 3.2 + Math.random() * 4.5;
      }

      if (params.rainIntensity > 0.65) {
        this.thunderCooldown -= params.dt;
        if (this.thunderCooldown <= 0) {
          this.playThunder();
          this.thunderCooldown = 12 + Math.random() * 14;
        }
      }
    }
  }

  public updatePoliceSiren(active: boolean, dt: number): void {
    if (!this.ctx || !this.masterGain || this.muted || !active) {
      this.sirenCooldown = 0;
      return;
    }
    this.sirenCooldown -= dt;
    if (this.sirenCooldown <= 0) {
      this.sirenCooldown = 0.42;
      this.sirenHigh = !this.sirenHigh;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(this.sirenHigh ? 860 : 620, t);
      osc.frequency.linearRampToValueAtTime(this.sirenHigh ? 640 : 880, t + 0.36);
      gain.gain.setValueAtTime(0.065, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.39);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.4);
    }
  }

  public playHorn(isEmergency = false): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    if (isEmergency) {
      // Short siren chirp
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(640, t);
      osc.frequency.linearRampToValueAtTime(920, t + 0.16);
      osc.frequency.linearRampToValueAtTime(640, t + 0.34);
      gain.gain.setValueAtTime(0.14, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.4);
      return;
    }

    [349.23, 440].forEach((freq) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      const flt = this.ctx.createBiquadFilter();
      flt.type = 'lowpass';
      flt.frequency.value = 1400;
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(flt);
      flt.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.3);
    });
  }

  public playCollision(intensity: number): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer || this.muted) return;
    const t = this.ctx.currentTime;
    const vol = Math.min(0.28, 0.08 + intensity * 0.18);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(520, t);
    flt.frequency.exponentialRampToValueAtTime(110, t + 0.25);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    src.connect(flt);
    flt.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
    src.stop(t + 0.3);
  }

  public playCheckpoint(): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    const t = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.07);
      gain.gain.setValueAtTime(0.09, t + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + idx * 0.07);
      osc.stop(t + idx * 0.07 + 0.24);
    });
  }

  public playAnimalChime(species: string): void {
    if (!this.ctx || !this.masterGain || this.muted) return;
    if (species === 'bird_flying' || species === 'bird_perched') {
      this.playBirdChirp();
      return;
    }
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(species === 'cow' || species === 'dog' ? 190 : 420, t);
    osc.frequency.exponentialRampToValueAtTime(species === 'cow' ? 140 : 620, t + 0.22);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.28);
  }

  private playBirdChirp(): void {
    if (!this.ctx || !this.masterGain) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const base = 1900 + Math.random() * 900;
    osc.frequency.setValueAtTime(base, t);
    osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.06);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.14);
    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.18);
  }

  private playThunder(): void {
    if (!this.ctx || !this.masterGain || !this.noiseBuffer) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const flt = this.ctx.createBiquadFilter();
    flt.type = 'lowpass';
    flt.frequency.setValueAtTime(140, t);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    src.connect(flt);
    flt.connect(gain);
    gain.connect(this.masterGain);
    src.start(t);
    src.stop(t + 1.9);
  }

  public dispose(): void {
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.initialized = false;
  }
}
