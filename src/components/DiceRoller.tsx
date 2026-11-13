import { D20Face } from "./D20Face";
import React, { useEffect, useRef, useState } from 'react';
import { Dices } from 'lucide-react';
import { rollCryptographicD20 } from '../engine/dice';
import { DiceMode } from '../engine/types';
import { soundFX } from '../utils/sound';

interface DiceRollerProps {
  diceMode: DiceMode;
  roleLabel: string;
  rollLabel?: string;
  targetRoll?: number;
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
  rollLabel = 'Roll',
  targetRoll,
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

  const animationTimer = useRef<number | undefined>(undefined);
  const confirmationTimer = useRef<number | undefined>(undefined);

  const triggerDigitalRoll = () => {
    if (disabled || isRolling || finalResult !== null) return;

    // Generate genuine cryptographic D20 predetermined outcome first (Section 8)
    const predetermined = rollCryptographicD20();
    soundFX.playDiceRoll();

    if (reducedMotion) {
      setDisplayValue(predetermined);
      setFinalResult(predetermined);
      confirmationTimer.current = window.setTimeout(() => {
        onRollConfirmed(predetermined);
      }, 280);
      return;
    }

    setIsRolling(true);
    let ticks = 0;
    const totalTicks = 11;

    animationTimer.current = window.setInterval(() => {
      ticks += 1;
      if (ticks < totalTicks) {
        setDisplayValue(((ticks * 7 + predetermined) % 20) + 1);
      } else {
        window.clearInterval(animationTimer.current);
        setDisplayValue(predetermined);
        setFinalResult(predetermined);
        setIsRolling(false);
        confirmationTimer.current = window.setTimeout(() => {
          onRollConfirmed(predetermined);
        }, 420);
      }
    }, 50);
  };

  useEffect(() => {
    setFinalResult(null);
    setIsRolling(false);
    setDisplayValue(20);
    return () => {
      window.clearInterval(animationTimer.current);
      window.clearTimeout(confirmationTimer.current);
    };
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
    if (disabled || isRolling || finalResult !== null) return;
    soundFX.playSelectMagic();
    setDisplayValue(val);
    setFinalResult(val);
    confirmationTimer.current = window.setTimeout(() => {
      onRollConfirmed(val);
    }, 220);
  };


  return (
    <div className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg">
      <div className="flex items-center justify-between gap-4 mb-3">
        <div>
          <div className="text-xs text-slate-400">{playerName}</div>
          {(targetRoll !== undefined || (diceMode === 'physical' && !autoRollForAI)) && (
            <h4 className="text-base font-bold text-white">{targetRoll !== undefined ? `Roll ${targetRoll} to survive` : rollLabel === 'Roll' ? 'Tap your roll' : rollLabel}</h4>
          )}
        </div>
        {modifier !== 0 && (
          <span aria-label={`Roll bonus: ${modifier}`} className="font-mono text-sm text-emerald-300">
            +{modifier}
          </span>
        )}
      </div>

      {diceMode === 'digital' || autoRollForAI ? (
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <D20Face value={isRolling || finalResult !== null ? displayValue : 'D20'} isRolling={isRolling} accentHex={accentHex} />

          <div className="flex-1 w-full">
            {finalResult !== null ? (
              <span role="status" className="sr-only">Rolled {finalResult}</span>
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
                    ? 'Rolling…'
                    : isRolling
                    ? 'Rolling…'
                    : rollLabel}
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
                  disabled={disabled || isRolling || finalResult !== null}
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
        </div>
      )}
    </div>
  );
};
