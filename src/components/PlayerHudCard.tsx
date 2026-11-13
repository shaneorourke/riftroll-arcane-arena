import React from 'react';
import { Heart, ShieldAlert, Sparkles } from 'lucide-react';
import { ARCANE_METER_MAX } from '../engine/combatEngine';
import { ELEMENT_SCHOOLS } from '../engine/elements';
import { ElementSchool, PlayerState } from '../engine/types';
import { ElementIcon } from './ElementIcon';

interface PlayerHudCardProps {
  player: PlayerState;
  role: 'attacker' | 'defender';
  selectedElement: ElementSchool | null;
  isUltimateSelected?: boolean;
  requiredWins: number;
  compact?: boolean;
}

export const PlayerHudCard: React.FC<PlayerHudCardProps> = ({
  player,
  role,
  selectedElement,
  isUltimateSelected = false,
  requiredWins,
  compact = false,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const meterPercent = Math.max(
    0,
    Math.min(100, (player.arcaneMeter / ARCANE_METER_MAX) * 100)
  );
  const isUltimateReady = player.arcaneMeter >= ARCANE_METER_MAX;
  const school = selectedElement ? ELEMENT_SCHOOLS[selectedElement] : null;

  return (
    <div
      className={`rounded-xl bg-slate-900/90 border transition-all ${
        isUltimateReady
          ? 'border-amber-400/70 shadow-[0_0_20px_rgba(251,191,36,0.18)]'
          : 'border-slate-800'
      } ${compact ? 'p-3' : 'p-4'}`}
    >
      {/* Top Row: Name, Role & Match Score Wins */}
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span
              className={
                role === 'attacker'
                  ? 'text-amber-300 font-semibold'
                  : 'text-sky-300 font-semibold'
              }
            >
              {role === 'attacker' ? 'Attacking Mage' : 'Defending Mage'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Wins: {player.battlesWon}/{requiredWins}
            </span>
            {!player.lastStandUsedThisBattle && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-300/90 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  Last Stand Ready
                </span>
              </>
            )}
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white truncate">
            {player.name}
          </h3>
        </div>

        {/* Selected Element Indicator */}
        {school && (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-950 border text-xs font-semibold text-white shrink-0"
            style={{ borderColor: school.primaryHex }}
          >
            <span style={{ color: school.primaryHex }}>
              <ElementIcon element={school.id} className="w-3.5 h-3.5" />
            </span>
            <span>
              {isUltimateSelected && role === 'attacker'
                ? school.ultimateName
                : school.name}
            </span>
          </div>
        )}
      </div>

      {/* Health Bar */}
      <div className="mb-2.5">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>Health</span>
          </span>
          <span className="font-mono font-bold text-white">
            {player.hp} / {player.maxHp} HP
            <span className="text-slate-400 font-normal ml-1.5">
              · {player.hp <= 15 ? 'CRITICAL' : player.hp <= player.maxHp * 0.4 ? 'WOUNDED' : 'STABLE'}
            </span>
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              player.hp <= 15
                ? 'bg-gradient-to-r from-red-600 to-rose-400'
                : 'bg-gradient-to-r from-emerald-600 to-teal-400'
            }`}
            style={{ width: `${hpPercent}%` }}
          />
        </div>
      </div>

      {/* Persistent Arcane Meter Bar */}
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Arcane Meter (Persists in Match)</span>
          </span>
          <span
            className={`font-mono font-bold ${
              isUltimateReady ? 'text-amber-300' : 'text-violet-300'
            }`}
          >
            {player.arcaneMeter} / {ARCANE_METER_MAX}
            {isUltimateReady && ' · ULTIMATE READY'}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isUltimateReady
                ? 'bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-400'
                : 'bg-gradient-to-r from-violet-600 via-fuchsia-500 to-amber-400'
            }`}
            style={{ width: `${meterPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
