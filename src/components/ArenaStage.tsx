import React, { useEffect, useRef } from 'react';
import { Sparkles, FastForward, Shield, CornerUpLeft, X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { ELEMENT_SCHOOLS } from '../engine/elements';
import {
  ElementSchool,
  ExchangeResolutionResult,
  PlayerId,
  PlayerState,
} from '../engine/types';
import { SignatureSpell } from './SignatureSpell';
import { ElementIcon } from './ElementIcon';

interface ArenaStageProps {
  p1: PlayerState;
  p2: PlayerState;
  activeAttackerId: PlayerId;
  activeActorId: PlayerId | null;
  selectedAttackElement: ElementSchool | null;
  selectedDefenceElement: ElementSchool | null;
  selectedUseUltimate: boolean;
  isAnimatingExchange: boolean;
  pendingResolution: ExchangeResolutionResult | null;
  reducedMotion: boolean;
  onSkipAnimation: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
}

const CAST_WINDUP_MS = 100;
const IMPACT_MS = 350;
const PARRY_REBOUND_MS = 220;

export const ArenaStage: React.FC<ArenaStageProps> = ({
  p1,
  p2,
  activeAttackerId,
  activeActorId,
  selectedAttackElement,
  selectedDefenceElement,
  selectedUseUltimate,
  isAnimatingExchange,
  pendingResolution,
  reducedMotion: reduceArenaMotion,
  onSkipAnimation,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const reducedMotion = reduceArenaMotion || prefersReducedMotion === true;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Determine active aura colors for each mage
  const p1Element =
    activeAttackerId === 'p1' ? selectedAttackElement : selectedDefenceElement;
  const p2Element =
    activeAttackerId === 'p2' ? selectedAttackElement : selectedDefenceElement;

  const p1AuraHex = p1Element
    ? ELEMENT_SCHOOLS[p1Element].primaryHex
    : '#F59E0B';
  const p2AuraHex = p2Element
    ? ELEMENT_SCHOOLS[p2Element].primaryHex
    : '#38BDF8';

  const isHeavyImpact =
    isAnimatingExchange &&
    pendingResolution &&
    (pendingResolution.isUltimate ||
      pendingResolution.attackTier === 'critical_strike' ||
      pendingResolution.attackTier === 'devastating' ||
      pendingResolution.defenceOutcome === 'parry');

  // Procedural Canvas Particle & Spell Beam Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const particles: Particle[] = [];
    let frame = 0;

    // Seed ambient floating runes/motes
    const ambientCount = reducedMotion ? 10 : 38;
    for (let i = 0; i < ambientCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 0.6 - 0.15,
        radius: Math.random() * 2.2 + 0.8,
        color: i % 2 === 0 ? p1AuraHex : p2AuraHex,
        alpha: Math.random() * 0.6 + 0.2,
        decay: 0,
      });
    }

    const spawnBurst = (
      x: number,
      y: number,
      color1: string,
      color2: string,
      count: number,
      speedScale: number
    ) => {
      if (reducedMotion) return;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 4.5 + 1.2) * speedScale;
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: Math.random() * 4 + 1.5,
          color: i % 2 === 0 ? color1 : color2,
          alpha: 1,
          decay: Math.random() * 0.02 + 0.014,
        });
      }
    };

    const startedAt = performance.now();
    let impactShown = false;

    const render = () => {
      frame += 1;
      const elapsed = performance.now() - startedAt;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle glowing astral floor grid / rune circle in center
      const cx = canvas.width * 0.5;
      const cy = canvas.height * 0.76;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.32);
      ctx.beginPath();
      ctx.arc(0, 0, 145, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.22)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 95, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // If animating exchange, draw elemental spell projectile / beam and defensive shield
      if (isAnimatingExchange && pendingResolution) {
        const atkCfg = ELEMENT_SCHOOLS[pendingResolution.attackElement];
        const defCfg = ELEMENT_SCHOOLS[pendingResolution.defenceElement];

        const fromX =
          pendingResolution.attackerId === 'p1'
            ? canvas.width * 0.22
            : canvas.width * 0.78;
        const toX =
          pendingResolution.attackerId === 'p1'
            ? canvas.width * 0.73
            : canvas.width * 0.27;
        const beamY = canvas.height * 0.48;

        const fumbled = pendingResolution.defenceOutcome === 'attack_fumbled';
        const parried = pendingResolution.defenceOutcome === 'parry';
        const direction = Math.sign(toX - fromX);
        const progress = reducedMotion ? 1 : Math.max(0, Math.min(1, (elapsed - CAST_WINDUP_MS) / (IMPACT_MS - CAST_WINDUP_MS)));
        const atImpact = progress === 1;
        const castEnd = fromX + (toX - fromX) * progress * (fumbled ? 0.12 : 1);

        if (atImpact && !impactShown) {
          impactShown = true;
          spawnBurst(
            fumbled ? castEnd : toX,
            beamY,
            atkCfg.primaryHex,
            defCfg.primaryHex,
            fumbled ? 10 : pendingResolution.isUltimate ? 75 : 40,
            pendingResolution.isUltimate ? 1.6 : 1.1
          );
        }

        // Beam thickness scales with attack tier & ultimate
        const baseThickness =
          pendingResolution.defenceOutcome === 'attack_fumbled'
            ? 3
            : pendingResolution.isUltimate
            ? 30
            : pendingResolution.attackTier === 'critical_strike'
            ? 24
            : pendingResolution.attackTier === 'devastating'
            ? 18
            : pendingResolution.attackTier === 'strong'
            ? 13
            : pendingResolution.attackTier === 'normal'
            ? 9
            : 5;

        const signatureProjectile = !fumbled &&
          (pendingResolution.attackElement === 'fire' || pendingResolution.attackElement === 'ice');
        if (signatureProjectile && progress > 0 && (!atImpact || reducedMotion)) {
          ctx.save();
          ctx.translate(castEnd, beamY);
          ctx.scale(direction, 1);
          ctx.shadowColor = atkCfg.primaryHex;
          ctx.shadowBlur = 20;
          const trail = ctx.createLinearGradient(-115, 0, 12, 0);
          trail.addColorStop(0, `${atkCfg.primaryHex}00`);
          trail.addColorStop(1, atkCfg.primaryHex);
          ctx.fillStyle = trail;
          ctx.beginPath();
          ctx.moveTo(-110, 0);
          ctx.quadraticCurveTo(-25, -24, 10, 0);
          ctx.quadraticCurveTo(-25, 24, -110, 0);
          ctx.fill();
          ctx.fillStyle = pendingResolution.attackElement === 'fire' ? '#fff2b0' : '#dbfaff';
          ctx.beginPath();
          if (pendingResolution.attackElement === 'fire') {
            ctx.ellipse(0, 0, 20, 13, 0, 0, Math.PI * 2);
          } else {
            ctx.moveTo(24, 0);
            ctx.lineTo(-7, -13);
            ctx.lineTo(-24, 0);
            ctx.lineTo(-7, 13);
            ctx.closePath();
          }
          ctx.fill();
          ctx.restore();
        }

        if (!signatureProjectile && progress > 0 && (!fumbled || elapsed < 520)) {
          ctx.save();
          const grad = ctx.createLinearGradient(fromX, beamY, toX, beamY);
          grad.addColorStop(0, atkCfg.primaryHex);
          grad.addColorStop(0.7, atkCfg.secondaryHex);
          grad.addColorStop(1, defCfg.primaryHex);

          ctx.strokeStyle = grad;
          ctx.lineWidth =
            baseThickness + (reducedMotion ? 0 : Math.sin(frame * 0.35) * 3);
          ctx.lineCap = 'round';
          ctx.shadowColor = atkCfg.primaryHex;
          ctx.shadowBlur = pendingResolution.isUltimate ? 32 : 18;

          ctx.beginPath();
          ctx.moveTo(fromX, beamY);

          // Element-specific waveform (e.g. jagged lightning vs sine wave water/wind)
          const segments = 12;
          for (let s = 1; s <= segments; s++) {
            const t = s / segments;
            const px = fromX + (castEnd - fromX) * t;
            let pyOffset = 0;
            if (!reducedMotion && s < segments) {
              if (pendingResolution.attackElement === 'lightning') {
                pyOffset = (Math.random() - 0.5) * 26;
              } else if (
                pendingResolution.attackElement === 'water' ||
                pendingResolution.attackElement === 'wind'
              ) {
                pyOffset = Math.sin(t * Math.PI * 4 + frame * 0.25) * 10;
              }
            }
            ctx.lineTo(px, beamY + pyOffset);
          }
          ctx.globalAlpha = reducedMotion ? 1 : Math.max(0.12, 1 - Math.max(0, elapsed - IMPACT_MS) / 400);
          ctx.stroke();
          ctx.restore();
        }

        if (parried && atImpact) {
          const rebound = reducedMotion ? 0.7 : Math.min(1, (elapsed - IMPACT_MS) / PARRY_REBOUND_MS);
          const sparkX = toX + (fromX - toX) * rebound;
          if (reducedMotion || elapsed < 700) {
            ctx.save();
            ctx.strokeStyle = '#FBBF24';
            ctx.shadowColor = '#FBBF24';
            ctx.shadowBlur = 14;
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(sparkX + 46 * direction, beamY + 10);
            ctx.lineTo(sparkX + 18 * direction, beamY + 5);
            ctx.lineTo(sparkX, beamY - 4);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Draw Defender's Elemental Barrier at `toX`
        if (!fumbled && (reducedMotion || elapsed >= 240)) {
          ctx.save();
          ctx.translate(toX, beamY);
          ctx.strokeStyle =
            pendingResolution.defenceOutcome === 'parry'
              ? '#FBBF24'
              : defCfg.primaryHex;
          ctx.lineWidth =
            pendingResolution.defenceOutcome === 'parry'
              ? 6
              : pendingResolution.defenceOutcome === 'perfect_block'
              ? 4.5
              : 2.5;
          ctx.shadowColor = defCfg.primaryHex;
          ctx.shadowBlur = 22;

          ctx.beginPath();
          const shieldRadius =
            pendingResolution.defenceOutcome === 'parry' ? 48 : 38;
          const startAngle =
            pendingResolution.attackerId === 'p1'
              ? Math.PI * 0.65
              : -Math.PI * 0.35;
          const endAngle =
            pendingResolution.attackerId === 'p1'
              ? Math.PI * 1.35
              : Math.PI * 0.35;
          ctx.arc(0, 0, shieldRadius, startAngle, endAngle);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;

        if (pt.decay > 0) {
          pt.alpha -= pt.decay;
          if (pt.alpha <= 0) {
            particles.splice(i, 1);
            continue;
          }
        } else {
          // Wrap ambient particles
          if (pt.y < 0) pt.y = canvas.height;
          if (pt.x < 0) pt.x = canvas.width;
          if (pt.x > canvas.width) pt.x = 0;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, pt.alpha);
        ctx.fillStyle = pt.color;
        ctx.shadowColor = pt.color;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      if (!reducedMotion) {
        animId = window.requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) window.cancelAnimationFrame(animId);
    };
  }, [
    isAnimatingExchange,
    pendingResolution,
    p1AuraHex,
    p2AuraHex,
    reducedMotion,
  ]);

  const resolution = isAnimatingExchange ? pendingResolution : null;
  const outcome = resolution?.defenceOutcome;
  const ImpactIcon = outcome === 'parry' ? CornerUpLeft
    : outcome === 'attack_fumbled' ? X
    : outcome === 'perfect_block' || outcome === 'half_damage' ? Shield
    : null;
  const impactPlayer = resolution && (
    outcome === 'parry' || outcome === 'attack_fumbled'
      ? resolution.attackerId
      : resolution.defenderId
  );
  const damage = outcome === 'parry' ? resolution?.counterDamageToAttacker : resolution?.damageToDefender;
  const impactBadge = resolution && (
    <div
      aria-hidden="true"
      className={`absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-600 bg-slate-950 px-2 py-0.5 text-base font-black ${damage ? 'text-rose-200' : 'text-sky-200'} ${reducedMotion ? '' : 'animate-impact-cue'}`}
      style={{ animationDelay: `${IMPACT_MS + (outcome === 'parry' ? PARRY_REBOUND_MS : 0)}ms` }}
    >
      {ImpactIcon && <ImpactIcon className="size-4" />}
      {damage ? `−${damage}` : outcome === 'attack_fumbled' ? 'Miss' : 'Block'}
    </div>
  );

  return (
    <div
      className={`relative w-full h-64 sm:h-76 rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-b from-[#131026] via-[#0d0b1a] to-[#080711] shadow-2xl ${
        !reducedMotion && isHeavyImpact
          ? 'animate-shake-heavy'
          : !reducedMotion && isAnimatingExchange
          ? 'animate-shake-light'
          : ''
      }`}
    >
      {resolution && <SignatureSpell resolution={resolution} reducedMotion={reducedMotion} />}
      <div role="status" className="sr-only">{resolution?.summaryText}</div>
      {/* Interactive Canvas Particle & Spell Beam Layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        width={960}
        height={320}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Top Arena Status Banner */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 pt-3 text-xs text-slate-300">
        <div className="flex items-center gap-2">
          {activeActorId && (
            <span className="font-semibold text-amber-300">
              {activeActorId === 'p1' ? p1.name : p2.name}’s turn
            </span>
          )}
          {selectedUseUltimate && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                ULTIMATE ARMED
              </span>
            </>
          )}
        </div>

        {/* Skip Animation Button when spell animation is playing (Section 12) */}
        {isAnimatingExchange && (
          <button
            type="button"
            onClick={onSkipAnimation}
            className="px-3 py-1 rounded-md bg-slate-900/90 hover:bg-slate-800 text-xs font-medium text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <FastForward className="w-3.5 h-3.5 text-amber-400" />
            <span>Skip</span>
          </button>
        )}
      </div>

      {/* Two Facing Stylized Mages */}
      <div className="relative z-10 flex h-full items-center justify-between px-3 pt-5 sm:px-14">
        {/* Left Mage: Player 1 */}
        <div className="relative flex min-w-0 flex-col items-center">
          {p1Element && (
            <div
              className="mb-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-700/80 text-xs font-semibold text-white shadow"
              style={{ borderColor: p1AuraHex }}
            >
              <span style={{ color: p1AuraHex }}>
                <ElementIcon element={p1Element} className="w-3.5 h-3.5" />
              </span>
              <span>{ELEMENT_SCHOOLS[p1Element].name}</span>
            </div>
          )}

          <div
            className={`relative w-24 h-28 sm:w-28 sm:h-32 flex items-center justify-center ${
              reducedMotion ? '' : 'animate-float-slow'
            }`}
            style={{
              filter: `drop-shadow(0 0 18px ${p1AuraHex}66)`,
            }}
          >
            {/* Stylized Astral Battlemage SVG (Player 1 Facing Right) */}
            <svg viewBox="0 0 120 140" className="w-full h-full">
              {/* Arcane Halo behind Mage */}
              <circle
                cx="55"
                cy="65"
                r="42"
                fill="none"
                stroke={p1AuraHex}
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.55"
              />
              {/* Flowing Cloak */}
              <path
                d="M30,55 L18,125 L75,125 L68,55 Z"
                fill="#1E1B4B"
                stroke={p1AuraHex}
                strokeWidth="2"
              />
              {/* Shoulder Pauldrons */}
              <path
                d="M25,56 Q52,44 76,58 L70,74 L30,72 Z"
                fill="#312E81"
                stroke="#F59E0B"
                strokeWidth="2"
              />
              {/* Hooded Head & Glowing Eyes */}
              <path
                d="M36,24 Q55,14 68,32 L64,54 L38,54 Z"
                fill="#0F172A"
                stroke={p1AuraHex}
                strokeWidth="2"
              />
              <circle cx="58" cy="40" r="3" fill="#FDE68A" />
              {/* Grand Battlestaff Held Forward */}
              <line
                x1="84"
                y1="16"
                x2="76"
                y2="132"
                stroke="#D97706"
                strokeWidth="4"
                strokeLinecap="round"
              />
              {/* Staff Crystal Orb */}
              <circle
                cx="85"
                cy="20"
                r="9"
                fill={p1AuraHex}
                stroke="#FEF08A"
                strokeWidth="2"
              />
            </svg>
          </div>
          <span className="mt-1 max-w-full truncate text-xs font-semibold text-slate-200">
            {p1.name}
          </span>
          {activeActorId === 'p1' && (
            <span aria-hidden="true" className="absolute -bottom-3 h-1 w-12 rounded-full bg-amber-300 shadow-[0_0_12px_#fcd34d]" />
          )}
          {impactPlayer === 'p1' && impactBadge}
        </div>

        {/* Right Mage: Player 2 */}
        <div className="relative flex min-w-0 flex-col items-center">
          {p2Element && (
            <div
              className="mb-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-700/80 text-xs font-semibold text-white shadow"
              style={{ borderColor: p2AuraHex }}
            >
              <span style={{ color: p2AuraHex }}>
                <ElementIcon element={p2Element} className="w-3.5 h-3.5" />
              </span>
              <span>{ELEMENT_SCHOOLS[p2Element].name}</span>
            </div>
          )}

          <div
            className={`relative w-24 h-28 sm:w-28 sm:h-32 flex items-center justify-center ${
              reducedMotion ? '' : 'animate-float-slow'
            }`}
            style={{
              filter: `drop-shadow(0 0 18px ${p2AuraHex}66)`,
            }}
          >
            {/* Stylized Obsidian Spire Magister SVG (Player 2 Facing Left) */}
            <svg viewBox="0 0 120 140" className="w-full h-full">
              <circle
                cx="65"
                cy="65"
                r="42"
                fill="none"
                stroke={p2AuraHex}
                strokeWidth="1.5"
                strokeDasharray="6 4"
                opacity="0.55"
              />
              {/* Flowing Robe */}
              <path
                d="M90,55 L102,125 L45,125 L52,55 Z"
                fill="#0F172A"
                stroke={p2AuraHex}
                strokeWidth="2"
              />
              {/* Astral Mantle */}
              <path
                d="M95,56 Q68,44 44,58 L50,74 L90,72 Z"
                fill="#1E293B"
                stroke="#38BDF8"
                strokeWidth="2"
              />
              {/* Crowned/Hooded Head Facing Left */}
              <path
                d="M84,24 Q65,14 52,32 L56,54 L82,54 Z"
                fill="#090D16"
                stroke={p2AuraHex}
                strokeWidth="2"
              />
              <circle cx="62" cy="40" r="3" fill="#7DD3FC" />
              {/* Scepter Held Forward (Left) */}
              <line
                x1="36"
                y1="16"
                x2="44"
                y2="132"
                stroke="#38BDF8"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <polygon
                points="35,9 44,20 35,31 26,20"
                fill={p2AuraHex}
                stroke="#E0F2FE"
                strokeWidth="2"
              />
            </svg>
          </div>
          <span className="mt-1 max-w-full truncate text-xs font-semibold text-slate-200">
            {p2.name}
          </span>
          {activeActorId === 'p2' && (
            <span aria-hidden="true" className="absolute -bottom-3 h-1 w-12 rounded-full bg-amber-300 shadow-[0_0_12px_#fcd34d]" />
          )}
          {impactPlayer === 'p2' && impactBadge}
        </div>
      </div>
    </div>
  );
};
