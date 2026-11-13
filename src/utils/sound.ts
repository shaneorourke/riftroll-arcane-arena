import { rollBand, rollPresentation } from './rollPresentation';
/**
 * Synthesized Web Audio API sound effects for RIFTROLL: Arcane Arena.
 * Zero external audio files required; respects user mute/sound settings.
 */

import type { ArenaId, ElementSchool, ExchangeResolutionResult } from '../engine/types';

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

const ultimateVoices: Record<ElementSchool, SpellVoice[]> = {
  fire: [['sawtooth', 102, 34, .62, .10], ['triangle', 190, 50, .4, .33]],
  water: [['sine', 170, 420, .45, .06], ['sine', 490, 68, .58, .29]],
  earth: [['triangle', 81, 28, .65, .06], ['triangle', 58, 32, .46, .34]],
  lightning: [['sawtooth', 860, 230, .19, .10], ['triangle', 143, 35, .63, .28]],
  wind: [['sine', 215, 930, .48, .05], ['triangle', 720, 140, .41, .31]],
  ice: [['sine', 700, 1260, .48, .05], ['sine', 1760, 980, .53, .32]],
  dark: [['sine', 96, 27, .72, .08], ['triangle', 130, 37, .52, .30]],
  light: [['sine', 392, 523, .48, .08], ['sine', 659, 784, .61, .27], ['triangle', 1047, 1319, .48, .34]],
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

  public playArenaShift(arena: ArenaId): void {
    const ctx = this.getContext();
    if (!ctx) return;
    const frequencies = { forge: [95, 62, 42], glacier: [523, 784, 1047], storm: [740, 105, 55], temple: [290, 460, 620] }[arena];
    for (const [index, frequency] of frequencies.entries()) {
      const start = ctx.currentTime + index * 0.08;
      const tone = ctx.createOscillator();
      const gain = ctx.createGain();
      tone.type = arena === 'storm' && index === 0 ? 'sawtooth' : (arena === 'glacier' || arena === 'temple') ? 'sine' : 'triangle';
      tone.frequency.setValueAtTime(frequency, start);
      if (arena === 'temple') tone.frequency.exponentialRampToValueAtTime(frequency * 1.8, start + .08);
      else if (arena !== 'glacier') tone.frequency.exponentialRampToValueAtTime(frequency * .6, start + .3);
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

    const attack = rollPresentation[rollBand(resolution.naturalAttackRoll)];
    const defence = rollPresentation[rollBand(resolution.naturalDefenceRoll)];
    const shape = ([type, from, to, duration, delay]: SpellVoice, profile: typeof attack): SpellVoice =>
      [type, from * profile.pitch, to * profile.pitch, duration * profile.duration, delay];
    voice(shape(spellVoices[attackElement][0], attack), .035, .06);
    for (const tone of spellVoices[attackElement]) {
      voice(shape(tone, attack), defenceOutcome === 'perfect_block' || defenceOutcome === 'parry' ? .027 : .052, .35);
    }
    if (isUltimate) {
      for (const tone of ultimateVoices[attackElement]) voice(tone, .065);
    }
    if (defenceOutcome === 'parry') {
      voice(['sine', 990, 1480, .3, 0], .065, .35);
      voice(['triangle', 740, 220, .25, 0], .046, .52);
    } else if (defenceOutcome === 'half_damage') {
      voice(shape(['sawtooth', 510, 135, .18, 0], defence), .04, .35);
    } else if (defenceOutcome === 'perfect_block') {
      voice(shape(['triangle', 370, 84, .3, 0], defence), .055, .35);
      voice(shape(['sine', 680, 420, .26, .04], defence), .038, .35);
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
