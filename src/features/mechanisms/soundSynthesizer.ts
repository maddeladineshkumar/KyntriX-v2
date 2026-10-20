import type { EngineType } from './types';

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private noiseNode: AudioBufferSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private isRunning = false;
  private stopTimeout: ReturnType<typeof setTimeout> | null = null;

  private initContext() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch {
      // Audio not supported in test or restricted environment
    }
  }

  private cleanupNodes() {
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
      this.stopTimeout = null;
    }
    try {
      this.osc1?.stop();
      this.osc2?.stop();
    } catch {
      // already stopped
    }
    try {
      this.osc1?.disconnect();
      this.osc2?.disconnect();
      this.noiseNode?.stop();
      this.noiseNode?.disconnect();
    } catch {
      // ignore
    }
    this.osc1 = null;
    this.osc2 = null;
    this.noiseNode = null;
    this.filterNode = null;
    this.isRunning = false;
  }

  start(engine: EngineType) {
    this.initContext();
    if (!this.ctx || !this.masterGain) return;
    if (this.stopTimeout !== null) {
      this.cleanupNodes();
    } else if (this.isRunning) {
      return;
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    try {
      // 1. Spool / Engine fundamental tone
      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();
      this.filterNode = this.ctx.createBiquadFilter();

      const baseFreq =
        engine === 'v8' || engine === 'inline4'
          ? 55
          : engine === 'bldc-motor'
          ? 400
          : 180;

      this.osc1.type = engine.includes('turbo') || engine === 'airplane-jet' ? 'sawtooth' : 'triangle';
      this.osc1.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);

      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(baseFreq * 2.5, this.ctx.currentTime);

      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(800, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

      this.osc1.connect(this.filterNode);
      this.osc2.connect(this.filterNode);
      this.filterNode.connect(oscGain);
      oscGain.connect(this.masterGain);

      this.osc1.start();
      this.osc2.start();

      this.isRunning = true;
      this.masterGain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.3);
    } catch {
      // Fallback
    }
  }

  update(engine: EngineType, throttlePct: number, afterburner = false) {
    if (!this.ctx || !this.isRunning || !this.osc1 || !this.filterNode) return;
    const t = throttlePct / 100;

    let targetFreq = 160 + t * 450;
    if (engine === 'v8' || engine === 'inline4') {
      targetFreq = 45 + t * 180;
    } else if (engine === 'bldc-motor') {
      targetFreq = 300 + t * 900;
    } else if (engine === 'turboprop') {
      targetFreq = 90 + t * 140;
    }

    if (afterburner) targetFreq *= 1.25;

    const now = this.ctx.currentTime;
    this.osc1.frequency.setTargetAtTime(targetFreq, now, 0.1);
    if (this.osc2) {
      this.osc2.frequency.setTargetAtTime(targetFreq * 2.2, now, 0.1);
    }
    this.filterNode.frequency.setTargetAtTime(
      400 + targetFreq * 2.5 + (afterburner ? 1200 : 0),
      now,
      0.1
    );
  }

  stop() {
    if (!this.ctx || !this.masterGain || !this.isRunning) return;
    if (this.stopTimeout !== null) {
      clearTimeout(this.stopTimeout);
    }
    try {
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
      this.stopTimeout = setTimeout(() => {
        this.cleanupNodes();
      }, 250);
    } catch {
      this.cleanupNodes();
    }
  }
}

export const soundSynthesizer = new SoundSynthesizer();
