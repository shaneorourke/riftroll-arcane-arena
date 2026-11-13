import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
} from 'lucide-react';
import { getRequiredWinsForFormat, getStartingPlayerForBattle } from '../engine/combatEngine';
import { rollCryptographicD20 } from '../engine/dice';
import { MatchState, PlayerId } from '../engine/types';
import { DiceRoller } from './DiceRoller';

interface ArcaneClashOverlayProps {
  state: MatchState;
  onSubmitClashRolls: (p1Roll: number, p2Roll: number) => void;
}

export const ArcaneClashOverlay: React.FC<ArcaneClashOverlayProps> = ({
  state,
  onSubmitClashRolls,
}) => {
  const [p1Roll, setP1Roll] = useState<number | null>(null);
  const [p2Roll, setP2Roll] = useState<number | null>(null);

  useEffect(() => {
    if (p1Roll !== null && p2Roll !== null) {
      const timer = window.setTimeout(() => {
        onSubmitClashRolls(p1Roll, p2Roll);
      }, 650);
      return () => window.clearTimeout(timer);
    }
  }, [p1Roll, p2Roll, onSubmitClashRolls]);

  // If P2 is AI and P1 has rolled, auto-roll for AI
  useEffect(() => {
    if (state.players.p2.isAI && p1Roll !== null && p2Roll === null) {
      const timer = window.setTimeout(() => {
        setP2Roll(rollCryptographicD20());
      }, 450);
      return () => window.clearTimeout(timer);
    }
  }, [state.players.p2.isAI, p1Roll, p2Roll]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-amber-400/60 p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-300 mb-1">
          <Swords className="w-4 h-4" />
          <span>RARE EVENT · NATURAL 18–19 COLLISION</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Arcane Clash in the Arena Center!
        </h2>
        <p className="text-sm text-slate-300 mb-5">
          Both mages rolled 18–19! Your spells are locked in a blinding beam collision. Each mage rolls one additional D20: higher roll deals <strong className="text-amber-300">15 damage</strong>, or equal rolls deal <strong className="text-rose-300">5 damage to both</strong>.
        </p>

        <div className="space-y-4">
          {p1Roll === null ? (
            <DiceRoller
              diceMode={state.settings.diceMode}
              roleLabel="Arcane Clash Roll-Off"
              playerName={state.players.p1.name}
              accentHex="#F59E0B"
              reducedMotion={state.settings.reducedMotion}
              onRollConfirmed={(val) => setP1Roll(val)}
            />
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                {state.players.p1.name} Clash Roll
              </span>
              <span className="font-mono text-lg font-bold text-amber-300">
                {p1Roll}
              </span>
            </div>
          )}

          {p1Roll !== null && p2Roll === null && (
            <DiceRoller
              diceMode={state.settings.diceMode}
              roleLabel="Arcane Clash Roll-Off"
              playerName={state.players.p2.name}
              accentHex="#38BDF8"
              autoRollForAI={state.players.p2.isAI}
              reducedMotion={state.settings.reducedMotion}
              onRollConfirmed={(val) => setP2Roll(val)}
            />
          )}

          {p2Roll !== null && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-200">
                {state.players.p2.name} Clash Roll
              </span>
              <span className="font-mono text-lg font-bold text-sky-300">
                {p2Roll}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface LastStandOverlayProps {
  state: MatchState;
  onSubmitLastStandRoll: (roll: number) => void;
}

export const LastStandOverlay: React.FC<LastStandOverlayProps> = ({
  state,
  onSubmitLastStandRoll,
}) => {
  const saviorId: PlayerId = state.pendingLastStandPlayerId ?? 'p1';
  const savior = state.players[saviorId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-rose-500/60 p-6 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-rose-300 mb-1">
          <ShieldAlert className="w-4 h-4" />
          <span>FINAL DEFIANCE · ONCE PER BATTLE</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">
          Last Stand: {savior.name}!
        </h2>
        <p className="text-sm text-slate-300 mb-5">
          This incoming blow is lethal! Roll a <strong className="text-amber-300">Natural 20</strong> to defy elimination, survive at <strong className="text-emerald-300">1 HP</strong>, and unleash an immediate <strong className="text-amber-300">15 damage counterattack</strong>. Any roll of 1–19 allows elimination to proceed.
        </p>

        <DiceRoller
          diceMode={state.settings.diceMode}
          roleLabel="Last Stand Miracle Roll (Needs Natural 20)"
          playerName={savior.name}
          accentHex="#F43F5E"
          autoRollForAI={savior.isAI}
          reducedMotion={state.settings.reducedMotion}
          onRollConfirmed={onSubmitLastStandRoll}
        />
      </div>
    </div>
  );
};

interface BattleResultsOverlayProps {
  state: MatchState;
  onStartNextBattle: () => void;
  onStartNewMatch: () => void;
  onReturnToMenu: () => void;
}

export const BattleResultsOverlay: React.FC<BattleResultsOverlayProps> = ({
  state,
  onStartNextBattle,
  onStartNewMatch,
  onReturnToMenu,
}) => {
  const isMatchOver = state.phase === 'MATCH_OVER';
  const winnerId = (isMatchOver ? state.matchWinnerId : state.battleWinnerId) ?? 'p1';
  const winner = state.players[winnerId];
  const requiredWins = getRequiredWinsForFormat(state.settings.format);

  const nextBattleNumber = state.battleNumber + 1;
  const nextStarterId = getStartingPlayerForBattle(
    state.firstBattleStarter,
    nextBattleNumber
  );
  const nextStarter = state.players[nextStarterId];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-amber-400/50 p-6 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-2 text-xs font-mono text-amber-300 mb-1">
          <Trophy className="w-4 h-4" />
          <span>
            {isMatchOver
              ? `MATCH COMPLETE · BEST OF ${state.settings.format}`
              : `BATTLE ${state.battleNumber} COMPLETE`}
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          {isMatchOver
            ? `${winner.name} Claims the Arcane Arena!`
            : `${winner.name} Wins Battle ${state.battleNumber}!`}
        </h2>

        <p className="text-sm text-slate-300 mb-5">
          {isMatchOver
            ? `Final Match Score: ${state.players.p1.battlesWon} – ${state.players.p2.battlesWon} (First to ${requiredWins} victories).`
            : `Health resets to ${state.settings.maxHp} HP for Battle ${nextBattleNumber}, while both mages retain their accumulated Arcane Energy!`}
        </p>

        {/* Match Score & Persistent Arcane Energy Summary Card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          {(['p1', 'p2'] as PlayerId[]).map((pid) => {
            const p = state.players[pid];
            const isWin = pid === winnerId;
            return (
              <div
                key={pid}
                className={`p-3.5 rounded-xl border ${
                  isWin
                    ? 'bg-amber-950/25 border-amber-400/60'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-white truncate">
                    {p.name}
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {p.battlesWon} / {requiredWins} Wins
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-300 mt-2">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Remaining Arcane:
                  </span>
                  <span className="font-mono font-bold text-violet-300">
                    {p.arcaneMeter} / 100
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {!isMatchOver && (
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 mb-5 flex items-center justify-between">
            <span>Next Battle Starting Player (Alternating):</span>
            <span className="font-semibold text-amber-300">
              {nextStarter.name}
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center gap-3">
          {!isMatchOver ? (
            <button
              type="button"
              onClick={onStartNextBattle}
              className="w-full py-3 px-5 rounded-lg font-semibold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Start Battle {nextBattleNumber}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartNewMatch}
              className="w-full py-3 px-5 rounded-lg font-semibold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play New Match (Resets Arcane Meters)</span>
            </button>
          )}

          <button
            type="button"
            onClick={onReturnToMenu}
            className="w-full sm:w-auto py-3 px-5 rounded-lg font-semibold text-sm text-slate-200 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};
