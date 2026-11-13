import React from 'react';
import { Flame, Shield, Sparkles } from 'lucide-react';
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
          <div className="text-xs text-slate-400">
            <span>{playerName}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className={mode === 'attack' ? 'text-amber-300 font-medium' : 'text-sky-300 font-medium'}>
              {mode === 'attack' ? 'Attacker Phase' : 'Defender Phase'}
            </span>
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">
            {mode === 'attack'
              ? 'Choose Attacking Magic School'
              : `Choose Defensive Ward vs ${
                  opposingAttackElement ? ELEMENT_SCHOOLS[opposingAttackElement].name : 'Attack'
                }`}
          </h3>
        </div>

        {/* Ultimate Toggle when Attacker has 100 Arcane Energy */}
        {canUnleashUltimate && onToggleUltimate && (
          <button
            type="button"
            onClick={() => onToggleUltimate(!useUltimate)}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
              useUltimate
                ? 'bg-amber-400 text-slate-950 shadow-[0_0_20px_rgba(251,191,36,0.65)]'
                : 'bg-amber-950/70 text-amber-300 border border-amber-500/60 hover:bg-amber-900/70'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {useUltimate
                ? 'ULTIMATE ARMED (+15 Base DMG · -100 Arcane)'
                : 'Unleash Ultimate (100 Arcane Ready)'}
            </span>
          </button>
        )}
      </div>

      {/* 8 Elemental Schools Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
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

          const spellDisplayName =
            mode === 'attack'
              ? useUltimate
                ? school.ultimateName
                : school.offensiveSpellName
              : school.defensiveSpellName;

          return (
            <button
              key={el}
              type="button"
              disabled={disabled}
              onClick={() => onSelectElement(el)}
              className={`group relative text-left p-2.5 rounded-lg border transition-all cursor-pointer disabled:opacity-50 ${
                useUltimate && mode === 'attack'
                  ? 'bg-amber-950/40 border-amber-400/70 hover:bg-amber-900/50'
                  : isStrongCounter
                  ? 'bg-emerald-950/40 border-emerald-400/80 hover:bg-emerald-900/50'
                  : `${school.bgTintClass} ${school.borderClass} hover:brightness-125`
              }`}
            >
              <div className="flex items-center justify-between gap-1.5 mb-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span style={{ color: school.primaryHex }} className="shrink-0">
                    <ElementIcon element={el} className="w-4 h-4" />
                  </span>
                  <span className="text-xs font-bold text-white truncate">
                    {school.name}
                  </span>
                </div>

                {isStrongCounter && (
                  <span className="text-[11px] font-mono font-bold text-emerald-300 shrink-0">
                    +2 DEF
                  </span>
                )}
                {isWeakChoice && (
                  <span className="text-[11px] font-mono text-rose-300 shrink-0">
                    -2 Match
                  </span>
                )}
              </div>

              <div className="text-xs font-medium text-slate-200 truncate">
                {spellDisplayName}
              </div>

              <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1 truncate">
                {mode === 'attack' ? (
                  <>
                    <Flame className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">
                      Counters {ELEMENT_SCHOOLS[school.defendsStronglyAgainst].name}
                    </span>
                  </>
                ) : (
                  <>
                    <Shield className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">
                      Wards vs {ELEMENT_SCHOOLS[school.defendsStronglyAgainst].name} (+2)
                    </span>
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
