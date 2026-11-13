import React from 'react';
import { Swords, Shield, Sparkles } from 'lucide-react';
import { ARCANE_METER_MAX } from '../engine/combatEngine';
import {
  ELEMENT_ORDER,
  ELEMENT_SCHOOLS,
  hasDefensiveElementalAdvantage,
} from '../engine/elements';
import { ElementSchool } from '../engine/types';
import { ElementIcon } from './ElementIcon';

interface SpellSelectorProps {
  mode: 'attack' | 'defence';
  playerName: string;
  arcaneMeter: number;
  useUltimate: boolean;
  onToggleUltimate?: (val: boolean) => void;
  opposingAttackElement?: ElementSchool | null;
  disabled?: boolean;
  onSelectElement: (element: ElementSchool) => void;
}

export const SpellSelector: React.FC<SpellSelectorProps> = ({
  mode,
  playerName,
  arcaneMeter,
  useUltimate,
  onToggleUltimate,
  opposingAttackElement,
  disabled = false,
  onSelectElement,
}) => {
  const canUnleashUltimate = mode === 'attack' && arcaneMeter >= ARCANE_METER_MAX;

  return (
    <div className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="text-xs text-slate-400">{playerName}</div>
          <h3 className="flex items-center gap-2 text-base font-bold text-white">
            {mode === 'attack' ? <Swords className="size-4" /> : <Shield className="size-4" />}
            {disabled ? 'Choosing…' : mode === 'attack' ? 'Pick a spell' : 'Pick a shield'}
          </h3>
        </div>

        {/* Ultimate Toggle when Attacker has 100 Arcane Energy */}
        {canUnleashUltimate && onToggleUltimate && (
          <button
            type="button"
            aria-pressed={useUltimate}
            onClick={() => onToggleUltimate(!useUltimate)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              useUltimate
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.65)]'
                : 'bg-amber-950/70 text-amber-300 border border-amber-500/60 hover:bg-amber-900/70'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Ultimate</span>
          </button>
        )}
      </div>

      {/* 8 Elemental Schools Grid */}
      <div className="grid grid-cols-4 gap-2">
        {ELEMENT_ORDER.map((el) => {
          const school = ELEMENT_SCHOOLS[el];
          const isStrongCounter =
            mode === 'defence' &&
            opposingAttackElement !== null &&
            opposingAttackElement !== undefined &&
            hasDefensiveElementalAdvantage(opposingAttackElement, el);

          const isWeakChoice =
            mode === 'defence' &&
            opposingAttackElement !== null &&
            opposingAttackElement !== undefined &&
            !isStrongCounter &&
            hasDefensiveElementalAdvantage(el, opposingAttackElement);

          const label = el === 'dark' ? 'Dark' : el === 'light' ? 'Light' : school.name;
          const advantage = isStrongCounter ? '+2' : isWeakChoice ? '−2' : null;

          return (
            <button
              key={el}
              type="button"
              disabled={disabled}
              onClick={() => onSelectElement(el)}
              aria-label={advantage ? `${label}, ${isStrongCounter ? "defence bonus" : "opponent attack bonus"}` : label}
              className={`relative flex min-h-18 flex-col items-center justify-center gap-1 rounded-lg border p-1 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-white disabled:opacity-50 ${
                useUltimate && mode === 'attack'
                  ? 'bg-amber-950/40 border-amber-400/70 hover:bg-amber-900/50'
                  : isStrongCounter
                  ? 'bg-emerald-950/40 border-emerald-400/80 hover:bg-emerald-900/50'
                  : `${school.bgTintClass} ${school.borderClass} hover:brightness-125`
              }`}
            >
              <span style={{ color: school.primaryHex }} aria-hidden="true">
                <ElementIcon element={el} className="size-7 sm:size-9" />
              </span>
              <span className="text-xs font-bold text-white">{label}</span>
              {advantage && (
                <span aria-hidden="true" className={`absolute right-1 top-1 text-[10px] font-bold ${isStrongCounter ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {advantage}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
