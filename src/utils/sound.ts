/**
 * Synthesized Web Audio API sound effects for RIFTROLL: Arcane Arena.
 * Zero external audio files required; respects user mute/sound settings.
 */

import type { ElementSchool, ExchangeResolutionResult } from '../engine/types';

type SpellVoice = [OscillatorType, number, number, number, number];
const spellVoices: Record<ElementSchool, SpellVoice[]> = {
  fire: [['sawtooth', 180, 46, .28, 0], ['triangle', 340, 80, .14, .035]],
  water: [['sine', 230, 690, .2, 0], ['sine', 680, 320, .28, .075]],
  earth: [['triangle', 110, 31, .38, 0], ['triangle', 74, 39, .26, .095]],
  lightning: [['square', 590, 130, .11, 0], ['sawtooth', 310, 76, .25, .07]],
  wind: [['sine', 280, 890, .19, 0], ['triangle', 520, 170, .23, .1]],
  ice: [['sine', 1180, 820, .28, 0], ['triangle', 1620, 1100, .22, .045], ['sine', 2040, 1470, .2, .085]],
  dark: [['sine', 110, 39, .46, 0], ['triangle', 153, 54, .36, .08]],
  light: [['sine', 523, 523, .3, 0], ['sine', 659, 659, .31, .045], ['triangle', 1047, 1047, .34, .09]],
};

class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  public enabled = true;

  private getContext(): AudioContext | null {
    if (!this.enabled || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public playGlacierRift(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    for (const [index, frequency] of [523, 784, 1047].entries()) {
      const start = ctx.currentTime + index * 0.08;
      const tone = ctx.createOscillator();
      const gain = ctx.createGain();
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0.04, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
      tone.connect(gain);
      gain.connect(ctx.destination);
      tone.start(start);
      tone.stop(start + 0.3);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    }
  }

  public unlock(): void {
    this.getContext();
  }

  public playExchange(resolution: ExchangeResolutionResult): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const voice = (tone: SpellVoice, volume: number, offset = 0) => {
      const [type, from, to, duration, delay] = tone;
      const start = ctx.currentTime + offset + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, start);
      osc.frequency.exponentialRampToValueAtTime(to, start + duration);
      gain.gain.setValueAtTime(.001, start);
      gain.gain.linearRampToValueAtTime(volume, start + .015);
      gain.gain.exponentialRampToValueAtTime(.001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); };
    };

    const { attackElement, defenceOutcome, isUltimate } = resolution;
    if (defenceOutcome === 'attack_fumbled') {
      voice(['triangle', 310, 72, .22, .12], .045);
      return;
    }

    voice(spellVoices[attackElement][0], .035, .06);
    for (const tone of spellVoices[attackElement]) {
      voice(tone, defenceOutcome === 'perfect_block' || defenceOutcome === 'parry' ? .027 : .052, .35);
    }
    if (isUltimate) voice(['sine', 72, 33, .62, 0], .09, .15);
    if (defenceOutcome === 'parry') {
      voice(['sine', 990, 1480, .3, 0], .065, .35);
      voice(['triangle', 740, 220, .25, 0], .046, .52);
    } else if (defenceOutcome === 'half_damage' || defenceOutcome === 'perfect_block') {
      voice(['triangle', 470, 190, .2, 0], .055, .35);
    }
  }

  public playSelectMagic(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playDiceRoll(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // Play a quick series of crystalline clicks
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + i * 0.055;
      osc.frequency.setValueAtTime(300 + i * 95, start);
      gain.gain.setValueAtTime(0.06, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.05);
    }
  }

  public playSpellImpact(isHeavy: boolean): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isHeavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isHeavy ? 180 : 260, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + (isHeavy ? 0.45 : 0.25));
    gain.gain.setValueAtTime(isHeavy ? 0.16 : 0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isHeavy ? 0.46 : 0.26));
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (isHeavy ? 0.48 : 0.28));
  }

  public playParryOrClash(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    // High metallic astral ring
    const freqs = [587.33, 880, 1174.66];
    freqs.forEach((f) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now);
      osc.frequency.exponentialRampToValueAtTime(f * 1.04, now + 0.55);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.56);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.58);
    });
  }

  public playVictoryFanfare(): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const start = now + idx * 0.11;
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.1, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.38);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  }
}

export const soundFX = new SoundEffectsManager();
