import { rollBand, rollPresentation } from '../utils/rollPresentation';
import { soundFX } from '../utils/sound';
import React, { useEffect, useRef } from 'react';
import { Sparkles, FastForward, Shield, CornerUpLeft, X } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { LAST_STAND_COUNTER_DAMAGE, resolveArcaneClash } from '../engine/combatEngine';
import { SHIFT_ARENAS } from '../engine/matchController';
import { ELEMENT_SCHOOLS } from '../engine/elements';
import {
  ArenaId,
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
  tabletop?: boolean;
  shiftArena?: ArenaId;
  shiftTurns?: number;
  lastStandId?: PlayerId | null;
  lastStandRoll?: number | null;
  clashRolls?: Partial<Record<PlayerId, number>> | null;
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

const arenaBackdrops: Record<ArenaId, string> = {
  glacier: 'glacier-frost',
  forge: 'forge-heat',
  storm: 'storm-sky',
  temple: 'temple-depths',
};

const CAST_WINDUP_MS = 100;
const IMPACT_MS = 350;
const PARRY_REBOUND_MS = 220;

function CastingCircle({ element, color, active }: {
  element: ElementSchool | null;
  color: string;
  active: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={`relative grid size-19 place-items-center rounded-full border-2 sm:size-23 ${active ? 'opacity-100' : 'opacity-75'}`}
      style={{ color, borderColor: color, boxShadow: `0 0 22px ${color}77, inset 0 0 24px ${color}44`, background: `radial-gradient(circle, ${color}55, #100a20 70%)` }}
    >
      <span className="absolute inset-2 rotate-45 rounded-xl border border-current opacity-60" />
      <span className="absolute inset-3 rounded-full border border-dashed border-current opacity-70" />
      {element ? <ElementIcon element={element} className="size-8" /> : <Sparkles className="size-7" />}
    </div>
  );
}

export const ArenaStage: React.FC<ArenaStageProps> = ({
  p1,
  p2,
  activeAttackerId,
  activeActorId,
  tabletop = false,
  shiftArena,
  shiftTurns = 0,
  lastStandId = null,
  lastStandRoll = null,
  clashRolls = null,
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
  useEffect(() => {
    if (isAnimatingExchange && pendingResolution) soundFX.playExchange(pendingResolution);
  }, [isAnimatingExchange, pendingResolution]);

  useEffect(() => {
    if (shiftTurns === 2 && shiftArena) soundFX.playArenaShift(shiftArena);
  }, [shiftArena, shiftTurns]);

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
    let iceReturnShown = false;

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

        const fromLeft = pendingResolution.attackerId === 'p1';
        const fromX = canvas.width * (fromLeft ? 0.22 : 0.78);
        const defenderX = canvas.width * (fromLeft ? 0.78 : 0.22);
        const beamY = canvas.height * 0.48;

        const fumbled = pendingResolution.defenceOutcome === 'attack_fumbled';
        const parried = pendingResolution.defenceOutcome === 'parry';
        const ice = pendingResolution.attackElement === 'ice' && !fumbled;
        const direction = fromLeft ? 1 : -1;
        const attack = rollPresentation[rollBand(pendingResolution.naturalAttackRoll)];
        const defence = rollPresentation[rollBand(pendingResolution.naturalDefenceRoll)];
        const warded = pendingResolution.defenceOutcome !== 'full_damage';
        const toX = defenderX - direction * canvas.width * (ice && !warded ? 0 : 0.05);
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
            fumbled ? 10 : pendingResolution.isUltimate ? 75 : attack.particles,
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
        const iceReturning = ice && parried && atImpact;
        const iceRebound = reducedMotion ? 0.55 : Math.min(1, Math.max(0, (elapsed - IMPACT_MS) / PARRY_REBOUND_MS));
        const showIncoming = progress > 0 && (!atImpact || (reducedMotion && !iceReturning));
        if (signatureProjectile && (showIncoming || (iceReturning && (reducedMotion || iceRebound < 1)))) {
          ctx.save();
          const shardX = iceReturning ? toX + (fromX - toX) * iceRebound : castEnd;
          ctx.translate(shardX, beamY);
          ctx.scale((iceReturning ? -direction : direction) * attack.size, attack.size);
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

        if (iceReturning && iceRebound === 1 && !iceReturnShown) {
          iceReturnShown = true;
          spawnBurst(fromX, beamY, '#dffaff', '#60a5fa', 24, 0.9);
        }

        if (parried && atImpact && !ice) {
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
        if (!fumbled && !ice && warded && (reducedMotion || elapsed >= 240)) {
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
            (parried ? 48 : 38) * defence.size;
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
          if (defence.size > 1) {
            ctx.globalAlpha = .48;
            ctx.beginPath();
            ctx.arc(0, 0, shieldRadius + 12, startAngle, endAngle);
            ctx.stroke();
          }
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
      className={`absolute -bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-1 whitespace-nowrap rounded-full border border-slate-600 bg-slate-950 px-2 py-0.5 text-base font-black ${damage ? 'text-rose-200' : 'text-sky-200'} ${reducedMotion ? '' : 'animate-impact-cue'}`}
      style={{ animationDelay: `${IMPACT_MS + (outcome === 'parry' ? PARRY_REBOUND_MS : 0)}ms` }}
    >
      {ImpactIcon && <ImpactIcon className="size-4" />}
      {damage ? `−${damage}` : outcome === 'attack_fumbled' ? 'Miss' : 'Block'}
    </div>
  );

  const clashP1 = clashRolls?.p1;
  const clashP2 = clashRolls?.p2;
  const clash = clashP1 !== undefined && clashP2 !== undefined
    ? resolveArcaneClash(clashP1, clashP2, p1, p2)
    : null;
  const clashResult = clash?.winnerId === 'tie' ? 'tie'
    : clash?.winnerId === 'p1' ? 'p2'
    : clash?.winnerId === 'p2' ? 'p1' : null;

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
      {shiftArena && shiftTurns > 0 && (
        <>
          <div aria-hidden="true" className={`pointer-events-none absolute inset-0 ${arenaBackdrops[shiftArena]}`} data-static={reducedMotion} />
          {shiftArena === 'temple' && (
            <svg aria-hidden="true" className="temple-arrival pointer-events-none absolute inset-0 h-full w-full"
              data-static={reducedMotion} viewBox="0 0 600 260" preserveAspectRatio="none">
              <path d="M76 211V68h47v143m354 0V68h47v143M249 209v-60a51 51 0 0 1 102 0v60"
                fill="#123443" stroke="#4e8993" strokeWidth="4" opacity=".65" />
              <path d="M65 68h68m334 0h68M225 209h150" stroke="#91c6c8" strokeWidth="5" opacity=".55" />
              <g className="temple-water">
                <path d="M0 176q50-18 100 0t100 0 100 0 100 0 100 0 100 0v84H0Z" fill="#087eab" fillOpacity=".42" />
                <path d="M0 176q50-18 100 0t100 0 100 0 100 0 100 0 100 0M0 203q50 13 100 0t100 0 100 0 100 0 100 0 100 0"
                  fill="none" stroke="#7cecf0" strokeOpacity=".65" strokeWidth="2" />
                <ellipse cx="300" cy="195" rx="75" ry="12" fill="none" stroke="#cffafe" strokeOpacity=".5" />
              </g>
            </svg>
          )}
          {shiftArena === 'storm' && (
            <svg aria-hidden="true" className="storm-spire pointer-events-none absolute inset-0 h-full w-full"
              data-static={reducedMotion} viewBox="0 0 600 260" preserveAspectRatio="none">
              <path d="M0 232 155 211 224 225 274 187 286 147 301 99 313 147 327 187 378 224 445 211 600 232V260H0Z"
                fill="#151331" stroke="#625ba4" strokeWidth="2" />
              <path className="storm-bolt" d="M347 0 297 49 322 45 288 85 310 78 301 101M310 46l-43-6-24 20m57 11 46-8 22 13"
                fill="none" stroke="#f5e9ff" strokeWidth="4" strokeLinejoin="round" />
              <path d="M14 38Q90 15 150 38T286 38M390 47q90-28 194-7"
                fill="none" stroke="#9289c3" strokeOpacity=".38" strokeWidth="7" strokeLinecap="round" />
            </svg>
          )}
          {shiftArena === 'forge' && (
            <div aria-hidden="true" className="forge-arrival pointer-events-none absolute inset-0" data-static={reducedMotion}>
              <svg className="forge-crack" viewBox="0 0 320 100">
                <path d="m4 69 77-14 29 11 43-19 24 9 38-20 34 11 67-14M153 47l-19-19-23-6m104 14 16-15 44-6M81 55 62 39" fill="none" stroke="#f97316" strokeWidth="8" />
                <path d="m4 69 77-14 29 11 43-19 24 9 38-20 34 11 67-14" fill="none" stroke="#ffedab" strokeWidth="2" />
              </svg>
              {Array.from({ length: 12 }, (_, index) => (
                <i key={index} className="forge-ember" style={{ left: `${12 + index * 7}%`, animationDelay: `${index * 35}ms` }} />
              ))}
            </div>
          )}
          <div role="status" className="pointer-events-none absolute inset-x-0 bottom-2 z-20 text-center">
            <span className="rounded-full bg-slate-950/90 px-2 py-1 text-xs font-bold text-cyan-100">
              {SHIFT_ARENAS[shiftArena].icon} {SHIFT_ARENAS[shiftArena].name} · {SHIFT_ARENAS[shiftArena].label} attack +2 · {shiftTurns === 2 ? '●●' : '●'}
              <span className="sr-only"> {shiftTurns} {shiftTurns === 1 ? 'exchange' : 'exchanges'} left</span>
            </span>
          </div>
        </>
      )}
      {resolution && <SignatureSpell resolution={resolution} reducedMotion={reducedMotion} />}
      {clashRolls && (
        <>
          <div className="pointer-events-none absolute inset-0 z-[1]" aria-hidden="true">
            <div className="clash-beam clash-beam-left" style={{ color: p1AuraHex }} />
            <div className="clash-beam clash-beam-right" style={{ color: p2AuraHex }} />
            <div className="clash-core" data-result={clashResult ?? 'pending'} data-static={reducedMotion} />
            {(['p1', 'p2'] as const).map((id) => (
              <div key={id} className={`absolute bottom-5 -translate-x-1/2 rounded-full border border-violet-400/60 bg-slate-950 px-2 py-1 font-mono text-sm font-bold text-white ${id === 'p1' ? 'left-[22%]' : 'left-[78%]'} ${tabletop && id === 'p2' ? 'rotate-180' : ''}`}>
                {clashRolls[id] ?? '–'}
                {(clashResult === id || clashResult === 'tie') && (
                  <span className="ml-2 text-rose-200">−{id === 'p1' ? clash?.damageToP1 : clash?.damageToP2}</span>
                )}
              </div>
            ))}
          </div>
          <h2 className="pointer-events-none absolute inset-x-0 top-2 z-10 text-center text-sm font-bold text-violet-200">
            Arcane Clash
          </h2>
        </>
      )}
      {lastStandId && (
        <>
          <div
            aria-hidden="true"
            className="last-stand-aura pointer-events-none absolute z-[11]"
            data-static={reducedMotion}
            data-result={lastStandRoll === null ? 'pending' : lastStandRoll === 20 ? 'saved' : 'fallen'}
            style={{ left: lastStandId === 'p1' ? '22%' : '78%' }}
          />
          {lastStandRoll === 20 && (
            <div aria-hidden="true" className="last-stand-counter pointer-events-none absolute z-[1]"
              data-static={reducedMotion} data-from={lastStandId} />
          )}
          <div className="pointer-events-none absolute inset-x-0 top-2 z-10 text-center">
            <h2 className="text-sm font-bold text-rose-200">Last Stand</h2>
            {lastStandRoll !== null && (
              <p className="text-sm font-bold text-white">
                {lastStandRoll === 20 ? '20 · 1 HP' : `${lastStandRoll} · Fallen`}
              </p>
            )}
          </div>
          {lastStandRoll === 20 && (
            <span aria-hidden="true" className={`pointer-events-none absolute bottom-5 z-10 -translate-x-1/2 rounded-full border border-rose-400/60 bg-slate-950 px-2 py-1 text-sm font-bold text-rose-200 ${lastStandId === 'p1' ? 'left-[78%]' : 'left-[22%]'}`}>
              −{LAST_STAND_COUNTER_DAMAGE}
            </span>
          )}
        </>
      )}
      <div role="status" className="sr-only">{
        lastStandId && lastStandRoll !== null
          ? lastStandRoll === 20
            ? `Survived at 1 HP. Counterattack for ${LAST_STAND_COUNTER_DAMAGE} damage.`
            : `Rolled ${lastStandRoll}. Last Stand failed.`
          : clash?.summaryText ?? resolution?.summaryText
      }</div>
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
          {activeActorId && !clashRolls && !lastStandId && (
            <span className="font-semibold text-amber-300">
              {activeActorId === 'p1' && p2.isAI ? 'Your turn' : `${activeActorId === 'p1' ? p1.name : p2.name}’s turn`}
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
      <div className="relative z-10 h-full">
        {/* Left Mage: Player 1 */}
        <div className="absolute left-[22%] top-[48%] flex w-[40%] -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          {p1Element && (
            <div
              className="absolute bottom-[calc(100%-12px)] flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-700/80 text-xs font-semibold text-white shadow"
              style={{ borderColor: p1AuraHex }}
            >
              <span style={{ color: p1AuraHex }}>
                <ElementIcon element={p1Element} className="w-3.5 h-3.5" />
              </span>
              <span>{ELEMENT_SCHOOLS[p1Element].name}</span>
            </div>
          )}

          <div
            className={`relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center ${
              reducedMotion ? '' : 'animate-float-slow'
            }`}
            style={{
              filter: `drop-shadow(0 0 18px ${p1AuraHex}66)`,
            }}
          >
            <CastingCircle element={p1Element} color={p1AuraHex} active={activeActorId === 'p1'} />
          </div>
          <span className="absolute top-full mt-1 max-w-full truncate text-xs font-semibold text-slate-200">
            {p2.isAI ? 'You' : p1.name}
          </span>
          {activeActorId === 'p1' && (
            <span aria-hidden="true" className="absolute -bottom-6 h-1 w-12 rounded-full bg-amber-300 shadow-[0_0_12px_#fcd34d]" />
          )}
          {impactPlayer === 'p1' && impactBadge}
        </div>

        {/* Right Mage: Player 2 */}
        <div className="absolute left-[78%] top-[48%] flex w-[40%] -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          {p2Element && (
            <div
              className="absolute bottom-[calc(100%-12px)] flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950/85 border border-slate-700/80 text-xs font-semibold text-white shadow"
              style={{ borderColor: p2AuraHex }}
            >
              <span style={{ color: p2AuraHex }}>
                <ElementIcon element={p2Element} className="w-3.5 h-3.5" />
              </span>
              <span>{ELEMENT_SCHOOLS[p2Element].name}</span>
            </div>
          )}

          <div
            className={`relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center ${
              reducedMotion ? '' : 'animate-float-slow'
            }`}
            style={{
              filter: `drop-shadow(0 0 18px ${p2AuraHex}66)`,
            }}
          >
            {p2.isAI ? (
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
            ) : (
              <CastingCircle element={p2Element} color={p2AuraHex} active={activeActorId === 'p2'} />
            )}
          </div>
          <span className={`absolute top-full mt-1 max-w-full truncate text-xs font-semibold text-slate-200 ${tabletop ? "rotate-180" : ""}`}>
            {p2.name}
          </span>
          {activeActorId === 'p2' && (
            <span aria-hidden="true" className="absolute -bottom-6 h-1 w-12 rounded-full bg-amber-300 shadow-[0_0_12px_#fcd34d]" />
          )}
          {impactPlayer === 'p2' && impactBadge}
        </div>
      </div>
    </div>
  );
};
