import { useId } from 'react';
import { createPortal } from 'react-dom';
import { ElementImpact } from './ElementImpact';
import { ELEMENT_SCHOOLS } from '../engine/elements';
import { ExchangeResolutionResult } from '../engine/types';

export function SignatureSpell({
  resolution,
  reducedMotion,
}: {
  resolution: ExchangeResolutionResult;
  reducedMotion: boolean;
}) {
  const gradient = useId();
  const { attackElement, attackerId, defenceOutcome, isUltimate } = resolution;
  if (defenceOutcome === 'attack_fumbled') return null;

  const fromLeft = attackerId === 'p1';
  const ice = attackElement === 'ice';
  const blocked = defenceOutcome === 'perfect_block';
  const cracked = defenceOutcome === 'half_damage';
  const impact = ice && defenceOutcome === 'full_damage'
    ? fromLeft ? '78%' : '22%'
    : fromLeft ? '73%' : '27%';
  const reflected = defenceOutcome === 'parry';

  if (attackElement === 'dark' && isUltimate) {
    return createPortal(
      <div
        aria-hidden="true"
        className="dark-ultimate pointer-events-none fixed inset-0 z-40 overflow-hidden"
        data-static={reducedMotion}
        data-reflected={reflected}
        style={{ transform: fromLeft ? undefined : 'scaleX(-1)' }}
      >
        <div className="dark-ultimate-shadow absolute inset-0" />
        <svg className="dark-ultimate-eclipse" viewBox="0 0 320 320">
          <defs>
            <radialGradient id={gradient}>
              <stop offset=".48" stopColor="#090313" />
              <stop offset=".57" stopColor="#120522" />
              <stop offset=".61" stopColor="#e9b6ff" />
              <stop offset=".7" stopColor="#8b34de" stopOpacity=".8" />
              <stop offset="1" stopColor="#581c87" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="160" cy="160" r="155" fill={`url(#${gradient})`} />
          <ellipse cx="160" cy="160" rx="146" ry="49" fill="none" stroke="#d8b4fe" strokeWidth="2" transform="rotate(-29 160 160)" />
          <ellipse cx="160" cy="160" rx="136" ry="36" fill="none" stroke="#a855f7" transform="rotate(25 160 160)" />
        </svg>
        <div className="dark-ultimate-wave" />
      </div>,
      document.body
    );
  }

  const color = ELEMENT_SCHOOLS[attackElement].primaryHex;

  const ultimateOverlay = isUltimate && createPortal(
      <div aria-hidden="true" className={`element-ultimate element-ultimate-${attackElement} pointer-events-none fixed inset-0 z-40`}
        data-static={reducedMotion} style={{ color }} />,
      document.body
    );

  if (ice && (blocked || cracked || reflected)) {
    const wardColor = reflected ? '#fde68a' : ELEMENT_SCHOOLS[resolution.defenceElement].primaryHex;
    return (
      <>
      {ultimateOverlay}
      <svg
        aria-hidden="true"
        className="ice-ward pointer-events-none absolute z-[11]"
        data-static={reducedMotion}
        data-outcome={defenceOutcome}
        style={{ left: impact, color: wardColor }}
        viewBox="0 0 160 160"
      >
        <g transform={fromLeft ? undefined : 'translate(160 0) scale(-1 1)'}>
          <g className="ice-ward-shield">
            <path d="M81 19 111 35 108 87Q105 118 81 140 57 118 54 87L51 35Z" fill="currentColor" fillOpacity=".22" stroke="currentColor" strokeWidth="5" />
            <path d="M81 34 99 44 97 84Q94 107 81 124 67 107 65 84L63 44Z" fill="none" stroke="#effaff" strokeOpacity=".85" strokeWidth="2" />
            <path d="m81 56 17 24-17 24-17-24Z" fill="currentColor" />
            {cracked && <path d="m81 48-8 30 15 4-12 32" fill="none" stroke="#fff" strokeWidth="3" />}
          </g>
          {!reflected && (
            <g className="ice-ward-shards" fill="#b7f5ff" stroke="#fff" strokeWidth="1.5">
              <path d="m59 62-25-30 8 29Z" />
              <path d="m60 75-38-10 27 23Z" />
              <path d="m59 88-27 25 27-10Z" />
              <path d="m65 97-8 33 18-22Z" />
            </g>
          )}
        </g>
      </svg>
      </>
    );
  }


  return (
    <>
    {ultimateOverlay}
    <svg
      aria-hidden="true"
      className={`signature-impact signature-${attackElement} pointer-events-none absolute z-[1] ${isUltimate ? 'signature-large' : ''}`}
      data-static={reducedMotion}
      style={{ left: impact, color }}
      viewBox="0 0 200 200"
    >
      <g transform={fromLeft ? undefined : 'translate(200 0) scale(-1 1)'}>
        {attackElement === 'fire' ? (
          <>
            <defs>
              <radialGradient id={gradient}>
                <stop stopColor="#fff7c2" />
                <stop offset=".43" stopColor="#ffbe45" />
                <stop offset=".72" stopColor="#f4511e" />
                <stop offset="1" stopColor="#9f1239" stopOpacity=".2" />
              </radialGradient>
            </defs>
            <circle className="fire-ring" cx="100" cy="100" r="77" fill="none" stroke="#ff9444" strokeWidth="3" />
            <path className="fire-bloom" d="M18 108 53 84 41 54 78 65 92 24 111 58 143 36 139 74 182 69 161 102 185 129 145 129 145 165 115 145 94 177 82 145 48 160 56 127Z" fill={`url(#${gradient})`} />
            <path d="m72 103 18-12 9-23 12 21 26 7-18 13-8 21-14-17Z" fill="#fff2b0" />
          </>
        ) : ice ? (
          <>
            <path d="m19 137 42-6 26 6 35-7 56 8-52 9-30-3-36 7Z" fill="#67e8f9" opacity=".5" />
            <path d="m62 137-15-40 4-24 25 14 17 50m-4 0-5-70 18-41 20 37-7 74m-3 0 20-50 30-19-2 37-25 32" fill="#67e8f9" stroke="#e0faff" strokeWidth="2" />
            <path d="m51 73 11 42 12 22m28-111 5 69-8 42m63-69-23 45-10 24" fill="none" stroke="#fff" strokeWidth="2" />
            <path d="m36 85-9-11 13 2m114-25 6-18 6 16m10 71 15-9-3 13" fill="#dffaff" />
          </>
        ) : <ElementImpact element={attackElement} />}
      </g>
    </svg>
    </>
  );
}
