import React, { useEffect, useState } from 'react';
import { Dices, Hash, Sparkles } from 'lucide-react';
import { rollCryptographicD20 } from '../engine/dice';
import { DiceMode } from '../engine/types';
import { soundFX } from '../utils/sound';

interface DiceRollerProps {
  diceMode: DiceMode;
  roleLabel: string;
  playerName: string;
  accentHex: string;
  modifier?: number;
  disabled?: boolean;
  autoRollForAI?: boolean;
  reducedMotion?: boolean;
  onRollConfirmed: (naturalRoll: number) => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  diceMode,
  roleLabel,
  playerName,
  accentHex,
  modifier = 0,
  disabled = false,
  autoRollForAI = false,
  reducedMotion = false,
  onRollConfirmed,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [displayValue, setDisplayValue] = useState<number>(20);
  const [finalResult, setFinalResult] = useState<number | null>(null);

  const triggerDigitalRoll = () => {
    if (disabled || isRolling || finalResult !== null) return;

    // Generate genuine cryptographic D20 predetermined outcome first (Section 8)
    const predetermined = rollCryptographicD20();
    soundFX.playDiceRoll();

    if (reducedMotion) {
      setDisplayValue(predetermined);
      setFinalResult(predetermined);
      setTimeout(() => {
        onRollConfirmed(predetermined);
      }, 280);
      return;
    }

    setIsRolling(true);
    let ticks = 0;
    const totalTicks = 11;

    const interval = window.setInterval(() => {
      ticks += 1;
      if (ticks < totalTicks) {
        setDisplayValue(((ticks * 7 + predetermined) % 20) + 1);
      } else {
        window.clearInterval(interval);
        setDisplayValue(predetermined);
        setFinalResult(predetermined);
        setIsRolling(false);
        window.setTimeout(() => {
          onRollConfirmed(predetermined);
        }, 420);
      }
    }, 50);
  };

  useEffect(() => {
    setFinalResult(null);
    setIsRolling(false);
    setDisplayValue(20);
  }, [roleLabel, playerName]);

  useEffect(() => {
    if (autoRollForAI && !disabled && !isRolling && finalResult === null) {
      const timer = window.setTimeout(() => {
        triggerDigitalRoll();
      }, 500);
      return () => window.clearTimeout(timer);
    }
  }, [autoRollForAI, disabled, isRolling, finalResult]);

  const handlePhysicalSelect = (val: number) => {
    if (disabled || finalResult !== null) return;
    soundFX.playSelectMagic();
    setDisplayValue(val);
    setFinalResult(val);
    window.setTimeout(() => {
      onRollConfirmed(val);
    }, 220);
  };

  const isCrit20 = finalResult === 20;
  const isFumble1 = finalResult === 1;

  return (
    <div className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <div className="text-xs text-slate-400">
            <span>{playerName}</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span className="text-amber-300 font-medium">{roleLabel}</span>
          </div>
          <h4 className="text-base font-bold text-white tracking-tight">
            {autoRollForAI
              ? 'Opponent Casting D20...'
              : diceMode === 'digital'
              ? 'Cast Astral D20 Die'
              : 'Enter Physical D20 Roll (1–20)'}
          </h4>
        </div>

        {modifier !== 0 && (
          <div className="text-xs font-mono text-emerald-300">
            Elemental Mastery: {modifier > 0 ? `+${modifier}` : modifier} Effective Roll
          </div>
        )}
      </div>

      {diceMode === 'digital' || autoRollForAI ? (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Faceted SVG Icosahedron D20 Visual */}
          <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
            <svg
              viewBox="0 0 100 100"
              className={`w-24 h-24 transition-transform duration-150 ${
                isRolling ? 'scale-110 rotate-45' : finalResult ? 'scale-105' : ''
              }`}
              style={{
                filter: `drop-shadow(0 0 14px ${
                  isCrit20
                    ? 'rgba(251, 191, 36, 0.85)'
                    : isFumble1
                    ? 'rgba(239, 68, 68, 0.85)'
                    : accentHex
                })`,
              }}
            >
              {/* Outer Hexagon of Icosahedron */}
              <polygon
                points="50,5 93,28 93,72 50,95 7,72 7,28"
                fill="#111022"
                stroke={
                  isCrit20 ? '#FBBF24' : isFumble1 ? '#EF4444' : accentHex
                }
                strokeWidth="3"
              />
              {/* Inner Triangle Facets */}
              <polygon
                points="50,18 80,68 20,68"
                fill="#191730"
                stroke={
                  isCrit20 ? '#FDE68A' : isFumble1 ? '#FCA5A5' : accentHex
                }
                strokeWidth="1.75"
                strokeOpacity="0.8"
              />
              <line x1="50" y1="5" x2="50" y2="18" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="93" y1="28" x2="50" y2="18" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="7" y1="28" x2="50" y2="18" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="93" y1="28" x2="80" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="7" y1="28" x2="20" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="93" y1="72" x2="80" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="7" y1="72" x2="20" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="50" y1="95" x2="80" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
              <line x1="50" y1="95" x2="20" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
            </svg>
            <span
              className={`absolute font-mono text-2xl font-bold tracking-tighter translate-y-1.5 ${
                isCrit20
                  ? 'text-amber-300 scale-110'
                  : isFumble1
                  ? 'text-red-400'
                  : 'text-white'
              }`}
            >
              {displayValue}
            </span>
          </div>

          <div className="flex-1 w-full">
            {finalResult !== null ? (
              <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Natural Roll: <span className="font-mono text-amber-300">{finalResult}</span>
                  </span>
                  {modifier !== 0 && (
                    <span className="text-xs font-mono text-emerald-300">
                      Effective Total: {finalResult + modifier}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {finalResult === 20
                    ? 'NATURAL 20! Maximum critical resonance!'
                    : finalResult === 1
                    ? 'NATURAL 1! Critical instability!'
                    : finalResult === 18 || finalResult === 19
                    ? 'High resonance roll (18–19) — potential Arcane Clash!'
                    : 'Resolving spell outcome...'}
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={disabled || isRolling || autoRollForAI}
                onClick={triggerDigitalRoll}
                className="w-full py-3.5 px-6 rounded-lg font-semibold text-sm text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.99] disabled:opacity-50 transition-all flex items-center justify-center gap-2.5 shadow-md cursor-pointer whitespace-nowrap shrink-0"
              >
                <Dices className="w-5 h-5" />
                <span>
                  {autoRollForAI
                    ? 'AI Rolling D20...'
                    : isRolling
                    ? 'Rolling Astral D20...'
                    : 'Roll Digital D20'}
                </span>
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Physical Dice 1-20 Grid Input (Section 8) */
        <div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => {
              const isSelected = finalResult === num;
              const isSpecial = num === 20 || num === 1;
              return (
                <button
                  key={num}
                  type="button"
                  disabled={disabled || finalResult !== null}
                  onClick={() => handlePhysicalSelect(num)}
                  className={`h-11 rounded-lg font-mono text-sm font-bold transition-all flex items-center justify-center cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-200'
                      : num === 20
                      ? 'bg-amber-950/60 border border-amber-500/60 text-amber-300 hover:bg-amber-900/70'
                      : num === 1
                      ? 'bg-red-950/50 border border-red-500/50 text-red-300 hover:bg-red-900/60'
                      : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800'
                  } ${isSpecial ? 'font-extrabold' : ''}`}
                >
                  {num}
                </button>
              );
            })}
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5 text-amber-400" />
              Roll your physical tabletop D20 and tap the exact number rolled.
            </span>
            <span className="flex items-center gap-1 text-amber-300/90">
              <Sparkles className="w-3.5 h-3.5" />
              Identical combat engine rules
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
