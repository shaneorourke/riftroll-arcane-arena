import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Shield,
  Sparkles,
  Swords,
  XCircle,
} from 'lucide-react';
import { runCombatEngineTestSuite, TestCaseResult } from '../engine/combatEngine.test';
import { ELEMENT_ORDER, ELEMENT_SCHOOLS } from '../engine/elements';
import { ElementIcon } from './ElementIcon';

export const HowToPlayAndTestsPanel: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'rules' | 'schools' | 'tests'>('rules');
  const [testResults, setTestResults] = useState<TestCaseResult[]>(() =>
    runCombatEngineTestSuite()
  );

  const passedCount = testResults.filter((t) => t.passed).length;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="text-xs text-slate-400 mb-1">
            <span>Codex & Verification Suite</span>
            <span className="mx-1.5" aria-hidden="true">·</span>
            <span>Deterministic D20 Ruleset</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            How to Play & Engine Diagnostics
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab('rules')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'rules'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Combat Rules
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('schools')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'schools'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              8 Magic Schools
            </button>
            <button
              type="button"
              onClick={() => {
                setTestResults(runCombatEngineTestSuite());
                setActiveTab('tests');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'tests'
                  ? 'bg-amber-400 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Engine Tests ({passedCount}/{testResults.length})
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            Back to Arena
          </button>
        </div>
      </div>

      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-amber-400" />
              <span>1. D20 Attack Damage Table</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Each exchange, the Attacker chooses any of the 8 magic schools, followed by the Defender choosing a defensive school. Both roll a D20 (digital or physical):
            </p>
            <div className="divide-y divide-slate-800 text-xs font-mono">
              <div className="py-2 flex justify-between">
                <span className="text-rose-300">Natural 1 (Critical Failure)</span>
                <span className="font-bold text-white">0 Damage (Always Fails)</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-300">Roll 2 – 5 (Weak Attack)</span>
                <span className="font-bold text-white">6 Damage</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-slate-300">Roll 6 – 10 (Normal Attack)</span>
                <span className="font-bold text-white">12 Damage</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-amber-200">Roll 11 – 15 (Strong Attack)</span>
                <span className="font-bold text-white">18 Damage</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-amber-300">Roll 16 – 19 (Devastating)</span>
                <span className="font-bold text-white">25 Damage</span>
              </div>
              <div className="py-2 flex justify-between">
                <span className="text-amber-400 font-bold">Natural 20 (Critical Strike)</span>
                <span className="font-bold text-amber-300">35 Damage</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-sky-400" />
              <span>2. Defence & Parry Resolution</span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Compare Effective Attack and Effective Defence rolls (including +2 Elemental Advantage):
            </p>
            <div className="divide-y divide-slate-800 text-xs">
              <div className="py-2 flex justify-between gap-2">
                <span className="text-slate-300">Defence ≥ 5 below Attack</span>
                <span className="font-mono font-bold text-rose-300">Full Damage</span>
              </div>
              <div className="py-2 flex justify-between gap-2">
                <span className="text-slate-300">Defence within ±4 of Attack</span>
                <span className="font-mono font-bold text-amber-300">Half Damage (Rounded Up)</span>
              </div>
              <div className="py-2 flex justify-between gap-2">
                <span className="text-slate-300">Defence ≥ 5 above Attack</span>
                <span className="font-mono font-bold text-emerald-300">Perfect Block (0 DMG)</span>
              </div>
              <div className="py-2 flex justify-between gap-2">
                <span className="text-amber-300 font-semibold">Natural Defence 20 (Parry)</span>
                <span className="font-mono font-bold text-amber-300">0 DMG + 12 Counter DMG</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 pt-1">
              Note: Natural Defence 20 takes priority over a Natural 20 Attack. Elemental modifiers (+2) never alter natural 1 or natural 20 status.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              <span>3. Persistent Arcane Meter & Ultimates</span>
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>
                <strong className="text-white">Meter Gains (0–100):</strong> Performing an attack (<span className="font-mono text-amber-300">+8</span>), partial or perfect block (<span className="font-mono text-sky-300">+10</span>), perfect parry (<span className="font-mono text-amber-300">+15</span>), taking damage (<span className="font-mono text-rose-300">+5</span>).
              </li>
              <li>
                <strong className="text-white">Ultimates (100 Arcane Energy):</strong> Adds <span className="font-mono text-amber-300">+15 Base Damage</span> to any non-fumble attack roll and triggers an elemental cataclysm. Can still be blocked or parried!
              </li>
              <li>
                <strong className="text-amber-300">Persists Across Battles:</strong> Health resets between battles in a Best-of-3 or Best-of-5 match, but Arcane Energy carries over into the next battle!
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-emerald-400" />
              <span>4. Arcane Clash, Last Stand & Sudden Death</span>
            </h3>
            <ul className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <li>
                <strong className="text-amber-300">Arcane Clash:</strong> Triggered when both natural D20 rolls are 18 or 19. Both mages roll one Clash D20: higher roll deals 15 damage; tie deals 5 damage to both.
              </li>
              <li>
                <strong className="text-rose-300">Last Stand:</strong> Once per battle when a blow would eliminate a mage, they roll a Last Stand D20. A <span className="font-mono text-amber-300">Natural 20</span> leaves them at 1 HP and deals 15 counterattack damage!
              </li>
              <li>
                <strong className="text-sky-300">Sudden Death:</strong> If both mages reach 0 HP simultaneously, both return to 1 HP and continue until one survivor remains.
              </li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === 'schools' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {ELEMENT_ORDER.map((el) => {
            const s = ELEMENT_SCHOOLS[el];
            const defendsVs = ELEMENT_SCHOOLS[s.defendsStronglyAgainst];
            return (
              <div
                key={el}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className="flex items-center gap-2 font-bold text-base text-white"
                    >
                      <span style={{ color: s.primaryHex }}>
                        <ElementIcon element={el} className="w-5 h-5" />
                      </span>
                      {s.name}
                    </span>
                    <span className="text-xs text-slate-400">{s.shortTitle}</span>
                  </div>
                  <p className="text-xs text-slate-300 mb-3">{s.tagline}</p>
                  <div className="space-y-1.5 text-xs border-t border-slate-800 pt-2.5">
                    <div>
                      <span className="text-slate-400">Attack: </span>
                      <span className="text-white font-medium">{s.offensiveSpellName}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Ward: </span>
                      <span className="text-white font-medium">{s.defensiveSpellName}</span>
                    </div>
                    <div>
                      <span className="text-amber-300">Ultimate: </span>
                      <span className="text-amber-200 font-semibold">{s.ultimateName}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-800 text-xs text-emerald-300 flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>+2 Effective Defence vs {defendsVs.name}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {activeTab === 'tests' && (
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white">
                Deterministic Combat Engine Verification Suite
              </h3>
              <p className="text-xs text-slate-400">
                Live execution of the combat engine checks against pure TypeScript engine functions.
              </p>
            </div>
            <div className="font-mono text-sm font-bold text-emerald-300">
              {passedCount} / {testResults.length} PASSED
            </div>
          </div>

          <div className="divide-y divide-slate-800">
            {testResults.map((t) => (
              <div
                key={t.id}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-start gap-2.5">
                  {t.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {t.category} · {t.name}
                    </div>
                    <div className="text-xs font-mono text-slate-400 mt-0.5">
                      {t.details}
                    </div>
                  </div>
                </div>
                <span
                  className={`text-xs font-mono font-bold shrink-0 ${
                    t.passed ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  {t.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
