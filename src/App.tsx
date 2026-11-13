import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  BookOpen,
  Dices,
  Play,
  RotateCcw,
  Settings as SettingsIcon,
  Shield,
  Sliders,
  Sparkles,
  Swords,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { ArenaStage } from './components/ArenaStage';
import {
  ArcaneClashOverlay,
  BattleResultsOverlay,
  LastStandOverlay,
} from './components/BattleModals';
import { DiceRoller } from './components/DiceRoller';
import { ElementIcon } from './components/ElementIcon';
import {
  HowToPlayAndTestsPanel,
  OnlineLobbyPreviewPanel,
} from './components/InfoPanels';
import { PlayerHudCard } from './components/PlayerHudCard';
import { SpellSelector } from './components/SpellSelector';
import {
  chooseAIAttackDecision,
  chooseAIDefenceElement,
} from './engine/aiController';
import { getRequiredWinsForFormat } from './engine/combatEngine';
import {
  ELEMENT_ORDER,
  ELEMENT_SCHOOLS,
  evaluateElementalModifier,
} from './engine/elements';
import {
  completeExchangeAnimation,
  createInitialMatchState,
  selectAttackMagic,
  selectDefenceMagic,
  startNextBattle,
  submitArcaneClashRolls,
  submitAttackRoll,
  submitDefenceRoll,
  submitLastStandRoll,
} from './engine/matchController';
import {
  AIDifficulty,
  DiceMode,
  ElementSchool,
  HealthPreset,
  LocalLayoutMode,
  MatchFormat,
  MatchSettings,
  MatchState,
  PlayerId,
} from './engine/types';
import { soundFX } from './utils/sound';

type ScreenView = 'MENU' | 'BATTLE' | 'ONLINE_LOBBY' | 'SETTINGS' | 'HOW_TO_PLAY';

export default function App() {
  const [view, setView] = useState<ScreenView>('MENU');

  const [settings, setSettings] = useState<MatchSettings>({
    mode: 'solo',
    format: 3, // Best of 3 default
    maxHp: 75, // Standard 75 HP default
    diceMode: 'digital',
    aiDifficulty: 'sorcerer',
    localLayout: 'side-by-side',
    reducedMotion: false,
    soundEnabled: true,
  });

  const [matchState, setMatchState] = useState<MatchState>(() =>
    createInitialMatchState({
      mode: 'solo',
      format: 3,
      maxHp: 75,
      diceMode: 'digital',
      aiDifficulty: 'sorcerer',
      localLayout: 'side-by-side',
      reducedMotion: false,
      soundEnabled: true,
    })
  );

  // Local toggle state for Attacker's Ultimate button before selecting the element
  const [armedUltimateDraft, setArmedUltimateDraft] = useState(false);

  useEffect(() => {
    soundFX.enabled = settings.soundEnabled;
  }, [settings.soundEnabled]);

  // Launch a fresh match with the chosen mode & settings
  const launchNewMatch = (overrideSettings?: Partial<MatchSettings>) => {
    const merged: MatchSettings = { ...settings, ...overrideSettings };
    setSettings(merged);
    const fresh = createInitialMatchState(merged);
    setMatchState(fresh);
    setArmedUltimateDraft(false);
    setView('BATTLE');
    soundFX.playSelectMagic();
  };

  // AI Automated Turn Progression for Spell Selection
  useEffect(() => {
    if (view !== 'BATTLE') return;

    const attackerId = matchState.activeAttackerId;
    const defenderId: PlayerId = attackerId === 'p1' ? 'p2' : 'p1';
    const attacker = matchState.players[attackerId];
    const defender = matchState.players[defenderId];

    if (matchState.phase === 'SELECT_ATTACK_MAGIC' && attacker.isAI) {
      const timer = window.setTimeout(() => {
        const decision = chooseAIAttackDecision(matchState, attacker, defender);
        soundFX.playSelectMagic();
        setMatchState((prev) =>
          selectAttackMagic(prev, decision.element, decision.useUltimate)
        );
      }, 650);
      return () => window.clearTimeout(timer);
    }

    if (
      matchState.phase === 'SELECT_DEFENCE_MAGIC' &&
      defender.isAI &&
      matchState.selectedAttackElement
    ) {
      const timer = window.setTimeout(() => {
        const defElement = chooseAIDefenceElement(
          matchState.selectedAttackElement!,
          matchState.settings.aiDifficulty,
          matchState.settings.defenceLockout ? defender.defenceLock : undefined
        );
        soundFX.playSelectMagic();
        setMatchState((prev) => selectDefenceMagic(prev, defElement));
      }, 650);
      return () => window.clearTimeout(timer);
    }
  }, [
    view,
    matchState.phase,
    matchState.activeAttackerId,
    matchState.selectedAttackElement,
  ]);

  // Automatically complete the exchange animation after it plays (with guaranteed completion & Skip option)
  useEffect(() => {
    if (view !== 'BATTLE' || matchState.phase !== 'ANIMATING_EXCHANGE') return;

    const res = matchState.pendingResolution;
    if (res) {
      if (res.defenceOutcome === 'parry') {
        soundFX.playParryOrClash();
      } else {
        soundFX.playSpellImpact(
          res.isUltimate ||
            res.attackTier === 'critical_strike' ||
            res.attackTier === 'devastating'
        );
      }
    }

    const duration = matchState.settings.reducedMotion
      ? 450
      : res?.isUltimate || res?.attackTier === 'critical_strike'
      ? 2100
      : 1500;

    const timer = window.setTimeout(() => {
      setMatchState((prev) => completeExchangeAnimation(prev));
    }, duration);

    return () => window.clearTimeout(timer);
  }, [view, matchState.phase, matchState.pendingResolution, matchState.settings.reducedMotion]);

  // Fire victory fanfare / confetti when a match finishes
  useEffect(() => {
    if (view === 'BATTLE' && matchState.phase === 'MATCH_OVER') {
      soundFX.playVictoryFanfare();
      if (!matchState.settings.reducedMotion) {
        try {
          confetti({
            particleCount: 70,
            spread: 65,
            origin: { y: 0.6 },
          });
        } catch {
          // Ignore confetti errors in headless environments
        }
      }
    }
  }, [view, matchState.phase, matchState.settings.reducedMotion]);

  const handleSelectAttack = (element: ElementSchool) => {
    soundFX.playSelectMagic();
    setMatchState((prev) =>
      selectAttackMagic(prev, element, armedUltimateDraft)
    );
    setArmedUltimateDraft(false);
  };

  const handleSelectDefence = (element: ElementSchool) => {
    soundFX.playSelectMagic();
    setMatchState((prev) => selectDefenceMagic(prev, element));
  };

  const handleAttackRollConfirmed = (roll: number) => {
    setMatchState((prev) => submitAttackRoll(prev, roll));
  };

  const handleDefenceRollConfirmed = (roll: number) => {
    setMatchState((prev) => submitDefenceRoll(prev, roll));
  };

  const attackerId = matchState.activeAttackerId;
  const defenderId: PlayerId = attackerId === 'p1' ? 'p2' : 'p1';
  const attacker = matchState.players[attackerId];
  const defender = matchState.players[defenderId];
  const requiredWins = getRequiredWinsForFormat(matchState.settings.format);

  const currentMod =
    matchState.selectedAttackElement && matchState.selectedDefenceElement
      ? evaluateElementalModifier(
          matchState.selectedAttackElement,
          matchState.selectedDefenceElement
        )
      : { attackModifier: 0, defenceModifier: 0, advantage: 'none' as const };

  const isTabletopRotated =
    matchState.settings.mode === 'local' &&
    matchState.settings.localLayout === 'tabletop';

  const activeActorId =
    matchState.phase === 'SELECT_ATTACK_MAGIC' || matchState.phase === 'ROLL_ATTACK_D20'
      ? attackerId
      : matchState.phase === 'SELECT_DEFENCE_MAGIC' || matchState.phase === 'ROLL_DEFENCE_D20'
      ? defenderId
      : null;
  const controlsAtTop = isTabletopRotated && activeActorId === 'p2';

  return (
    <div className="min-h-screen flex flex-col bg-[#090812] text-slate-100">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/90 bg-[#0c0a18]/90 backdrop-blur-md sticky top-0 z-40">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => setView('MENU')}
          className="text-lg font-extrabold tracking-wider text-amber-300 font-display whitespace-nowrap shrink-0 cursor-pointer"
        >
          RIFTROLL
        </button>

        {/* Zone 2: 4–5 single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300">
          <button
            type="button"
            onClick={() => launchNewMatch({ mode: 'solo' })}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Play Solo
          </button>
          <button
            type="button"
            onClick={() => launchNewMatch({ mode: 'local' })}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Local Multiplayer
          </button>
          <button
            type="button"
            onClick={() => setView('ONLINE_LOBBY')}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Online Rooms
          </button>
          <button
            type="button"
            onClick={() => setView('SETTINGS')}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={() => setView('HOW_TO_PLAY')}
            className="hover:text-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            How to Play
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() =>
              view === 'BATTLE'
                ? setView('MENU')
                : launchNewMatch({ mode: settings.mode })
            }
            className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {view === 'BATTLE' ? 'Arena Menu' : 'Enter Arena'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        {view === 'MENU' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Hero Split Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-10">
              <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-[#121024] to-slate-950 border border-slate-800 shadow-2xl">
                <div>
                  <div className="flex items-center gap-2 text-xs text-amber-300 mb-3">
                    <span>Arcane Arena D20 Battler</span>
                    <span aria-hidden="true">·</span>
                    <span>8 Elemental Schools</span>
                    <span aria-hidden="true">·</span>
                    <span>Digital & Physical Dice</span>
                  </div>
                  <h1
                    className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight leading-tight mb-4"
                    style={{ textWrap: 'balance' }}
                  >
                    RIFTROLL: Arcane Arena
                  </h1>
                  <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mb-6">
                    Command all eight schools of magic in fast-paced best-of-three D20 duels. Outsmart your rival with +2 elemental wards, build persistent Arcane Energy across battles, trigger natural 20 parries, and survive with miracle Last Stand reversals.
                  </p>
                </div>

                {/* Primary Game Mode Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => launchNewMatch({ mode: 'solo' })}
                    className="p-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-left transition-all shadow-lg cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Swords className="w-5 h-5 text-slate-950" />
                      <span className="text-[11px] font-mono font-bold">
                        SOLO VS AI
                      </span>
                    </div>
                    <div className="text-base font-extrabold">Play Solo</div>
                    <div className="text-xs text-slate-800 mt-0.5">
                      Duel Apprentice, Sorcerer, or Archmage AI
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => launchNewMatch({ mode: 'local' })}
                    className="p-4 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700 text-white text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Users className="w-5 h-5 text-sky-400" />
                      <span className="text-[11px] font-mono text-sky-300">
                        2 PLAYERS
                      </span>
                    </div>
                    <div className="text-base font-bold">Local Duel</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Shared screen or 180° Tabletop mode
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('ONLINE_LOBBY')}
                    className="p-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800 text-white text-left transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <Sparkles className="w-5 h-5 text-violet-400" />
                      <span className="text-[11px] font-mono text-slate-400">
                        2–4 ROOMS
                      </span>
                    </div>
                    <div className="text-base font-bold">Online Rooms</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Private room architecture & roadmap
                    </div>
                  </button>
                </div>
              </div>

              {/* Right Column: Quick Match Configuration Panel */}
              <div className="lg:col-span-5 p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-400" />
                      <span>Match Format & Dice Setup</span>
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        setSettings((s) => ({
                          ...s,
                          soundEnabled: !s.soundEnabled,
                        }))
                      }
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                      title="Toggle Sound Effects"
                    >
                      {settings.soundEnabled ? (
                        <Volume2 className="w-4 h-4 text-amber-300" />
                      ) : (
                        <VolumeX className="w-4 h-4 text-slate-500" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    {/* Match Length */}
                    <div>
                      <label className="block text-slate-400 mb-1.5">
                        Match Format (Arcane Meter Persists Between Battles)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                        {([1, 3, 5] as MatchFormat[]).map((fmt) => (
                          <button
                            key={fmt}
                            type="button"
                            onClick={() =>
                              setSettings((s) => ({ ...s, format: fmt }))
                            }
                            className={`py-2 px-2.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              settings.format === fmt
                                ? 'bg-amber-400 text-slate-950'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {fmt === 1 ? 'Single Battle' : `Best of ${fmt}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Health Presets */}
                    <div>
                      <label className="block text-slate-400 mb-1.5">
                        Mage Health Preset
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                        {(
                          [
                            { hp: 50, label: 'Blitz (50 HP)' },
                            { hp: 75, label: 'Standard (75)' },
                            { hp: 100, label: 'Extended (100)' },
                          ] as { hp: HealthPreset; label: string }[]
                        ).map((preset) => (
                          <button
                            key={preset.hp}
                            type="button"
                            onClick={() =>
                              setSettings((s) => ({ ...s, maxHp: preset.hp }))
                            }
                            className={`py-2 px-2 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              settings.maxHp === preset.hp
                                ? 'bg-amber-400 text-slate-950'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Dice Mode */}
                    <div>
                      <label className="block text-slate-400 mb-1.5">
                        D20 Dice Mode
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-lg border border-slate-800">
                        {(
                          [
                            { id: 'digital', label: 'Digital D20 (Crypto)' },
                            { id: 'physical', label: 'Physical D20 Input' },
                          ] as { id: DiceMode; label: string }[]
                        ).map((dm) => (
                          <button
                            key={dm.id}
                            type="button"
                            onClick={() =>
                              setSettings((s) => ({ ...s, diceMode: dm.id }))
                            }
                            className={`py-2 px-2.5 rounded-md font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                              settings.diceMode === dm.id
                                ? 'bg-amber-400 text-slate-950'
                                : 'text-slate-300 hover:text-white'
                            }`}
                          >
                            {dm.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* AI Difficulty & Local Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 mb-1.5">
                          Solo AI Difficulty
                        </label>
                        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                          {(
                            ['apprentice', 'sorcerer', 'archmage'] as AIDifficulty[]
                          ).map((diff) => (
                            <button
                              key={diff}
                              type="button"
                              onClick={() =>
                                setSettings((s) => ({
                                  ...s,
                                  aiDifficulty: diff,
                                }))
                              }
                              className={`py-1.5 px-1.5 rounded font-semibold capitalize transition-colors cursor-pointer text-[11px] whitespace-nowrap shrink-0 ${
                                settings.aiDifficulty === diff
                                  ? 'bg-sky-400 text-slate-950'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {diff}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 mb-1.5">
                          Local 2P Screen Layout
                        </label>
                        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800">
                          {(
                            [
                              { id: 'side-by-side', label: 'Standard' },
                              { id: 'tabletop', label: '180° Tabletop' },
                            ] as { id: LocalLayoutMode; label: string }[]
                          ).map((ly) => (
                            <button
                              key={ly.id}
                              type="button"
                              onClick={() =>
                                setSettings((s) => ({
                                  ...s,
                                  localLayout: ly.id,
                                }))
                              }
                              className={`py-1.5 px-2 rounded font-semibold transition-colors cursor-pointer text-[11px] whitespace-nowrap shrink-0 ${
                                settings.localLayout === ly.id
                                  ? 'bg-sky-400 text-slate-950'
                                  : 'text-slate-300 hover:text-white'
                              }`}
                            >
                              {ly.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setView('HOW_TO_PLAY')}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Rules & Engine Tests</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setView('SETTINGS')}
                    className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-sky-400" />
                    <span>Accessibility</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Eight Schools of Magic Showcase Strip */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    The Eight Schools of Magic
                  </h2>
                  <p className="text-xs text-slate-400">
                    Every mage commands all eight elements on every turn. Master the +2 defensive counter cycle.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
                {ELEMENT_ORDER.map((el) => {
                  const s = ELEMENT_SCHOOLS[el];
                  const counters = ELEMENT_SCHOOLS[s.defendsStronglyAgainst];
                  return (
                    <div
                      key={el}
                      className={`p-3 rounded-xl border ${s.bgTintClass} ${s.borderClass} flex flex-col justify-between`}
                    >
                      <div>
                        <div
                          className="mb-1.5"
                          style={{ color: s.primaryHex }}
                        >
                          <ElementIcon element={el} className="w-5 h-5" />
                        </div>
                        <div className="text-xs font-bold text-white">
                          {s.name}
                        </div>
                        <div className="text-[11px] text-amber-200/90 font-medium truncate mt-0.5">
                          Ult: {s.ultimateName}
                        </div>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-white/10 text-[11px] text-emerald-300 truncate">
                        +2 Def vs {counters.name}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {view === 'BATTLE' && (
          <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 space-y-4">
            {/* Match Score & Battle Sub-Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                <span className="font-bold text-amber-300">
                  Battle {matchState.battleNumber}
                </span>
                <span aria-hidden="true">·</span>
                <span>Turn {matchState.turnNumber}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {matchState.settings.format === 1
                    ? 'Single Battle'
                    : `Best of ${matchState.settings.format} (First to ${requiredWins})`}
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-white">
                  Score: {matchState.players.p1.battlesWon} –{' '}
                  {matchState.players.p2.battlesWon}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Quick Switch Dice Mode in Battle */}
                <button
                  type="button"
                  onClick={() => {
                    const nextDice: DiceMode =
                      matchState.settings.diceMode === 'digital'
                        ? 'physical'
                        : 'digital';
                    setSettings((s) => ({ ...s, diceMode: nextDice }));
                    setMatchState((m) => ({
                      ...m,
                      settings: { ...m.settings, diceMode: nextDice },
                    }));
                  }}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {matchState.settings.diceMode === 'digital'
                      ? 'Digital D20'
                      : 'Physical D20'}
                  </span>
                </button>

                {matchState.settings.mode === 'local' && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextLayout: LocalLayoutMode =
                        matchState.settings.localLayout === 'side-by-side'
                          ? 'tabletop'
                          : 'side-by-side';
                      setSettings((s) => ({ ...s, localLayout: nextLayout }));
                      setMatchState((m) => ({
                        ...m,
                        settings: { ...m.settings, localLayout: nextLayout },
                      }));
                    }}
                    className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 font-medium cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {isTabletopRotated ? '180° Tabletop' : 'Side-by-Side'}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => launchNewMatch()}
                  className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Match</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* If Tabletop 180-Degree Mode is active, show Player 2 HUD rotated at the top */}
              {isTabletopRotated ? (
                <div className="space-y-3">
                  <div className="rotate-180">
                    <PlayerHudCard
                      player={matchState.players.p2}
                      role={
                        matchState.activeAttackerId === 'p2'
                          ? 'attacker'
                          : 'defender'
                      }
                      selectedElement={
                        matchState.activeAttackerId === 'p2'
                          ? matchState.selectedAttackElement
                          : matchState.selectedDefenceElement
                      }
                      isUltimateSelected={
                        matchState.activeAttackerId === 'p2' &&
                        (matchState.selectedUseUltimate || armedUltimateDraft)
                      }
                      requiredWins={requiredWins}
                      compact
                    />
                  </div>
                </div>
              ) : (
                /* Standard Side-by-Side Dual HUD */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <PlayerHudCard
                    player={matchState.players.p1}
                    role={
                      matchState.activeAttackerId === 'p1'
                        ? 'attacker'
                        : 'defender'
                    }
                    selectedElement={
                      matchState.activeAttackerId === 'p1'
                        ? matchState.selectedAttackElement
                        : matchState.selectedDefenceElement
                    }
                    isUltimateSelected={
                      matchState.activeAttackerId === 'p1' &&
                      (matchState.selectedUseUltimate || armedUltimateDraft)
                    }
                    requiredWins={requiredWins}
                  />

                  <PlayerHudCard
                    player={matchState.players.p2}
                    role={
                      matchState.activeAttackerId === 'p2'
                        ? 'attacker'
                        : 'defender'
                    }
                    selectedElement={
                      matchState.activeAttackerId === 'p2'
                        ? matchState.selectedAttackElement
                        : matchState.selectedDefenceElement
                    }
                    isUltimateSelected={
                      matchState.activeAttackerId === 'p2' &&
                      (matchState.selectedUseUltimate || armedUltimateDraft)
                    }
                    requiredWins={requiredWins}
                  />
                </div>
              )}

              {/* Central Magical Arena Stage */}
              <ArenaStage
                p1={matchState.players.p1}
                p2={matchState.players.p2}
                activeAttackerId={matchState.activeAttackerId}
                activeActorId={activeActorId}
                tabletop={isTabletopRotated}
                selectedAttackElement={matchState.selectedAttackElement}
                selectedDefenceElement={matchState.selectedDefenceElement}
                selectedUseUltimate={
                  matchState.selectedUseUltimate || armedUltimateDraft
                }
                isAnimatingExchange={matchState.phase === 'ANIMATING_EXCHANGE'}
                pendingResolution={matchState.pendingResolution}
                reducedMotion={matchState.settings.reducedMotion}
                onSkipAnimation={() =>
                  setMatchState((prev) => completeExchangeAnimation(prev))
                }
              />

              {/* Tabletop Bottom Player 1 HUD */}
              {isTabletopRotated && (
                <PlayerHudCard
                  player={matchState.players.p1}
                  role={
                    matchState.activeAttackerId === 'p1' ? 'attacker' : 'defender'
                  }
                  selectedElement={
                    matchState.activeAttackerId === 'p1'
                      ? matchState.selectedAttackElement
                      : matchState.selectedDefenceElement
                  }
                  isUltimateSelected={
                    matchState.activeAttackerId === 'p1' &&
                    (matchState.selectedUseUltimate || armedUltimateDraft)
                  }
                  requiredWins={requiredWins}
                  compact
                />
              )}

              {/* Keep one set of controls and move it to the active player’s edge. */}
              {activeActorId && (
                <div
                  className={`rounded-xl ring-1 ring-amber-400/50 ${controlsAtTop ? 'order-first rotate-180' : ''}`}
                >
                  {matchState.phase === 'SELECT_ATTACK_MAGIC' && (
                    <SpellSelector
                      mode="attack"
                      playerName={attacker.name}
                      arcaneMeter={attacker.arcaneMeter}
                      useUltimate={armedUltimateDraft}
                      onToggleUltimate={setArmedUltimateDraft}
                      disabled={attacker.isAI}
                      onSelectElement={handleSelectAttack}
                    />
                  )}

                  {matchState.phase === 'SELECT_DEFENCE_MAGIC' && (
                    <SpellSelector
                      mode="defence"
                      playerName={defender.name}
                      arcaneMeter={defender.arcaneMeter}
                      useUltimate={false}
                      opposingAttackElement={matchState.selectedAttackElement}
                      lockedElement={matchState.settings.defenceLockout ? defender.defenceLock : undefined}
                      disabled={defender.isAI}
                      onSelectElement={handleSelectDefence}
                    />
                  )}

                  {matchState.phase === 'ROLL_ATTACK_D20' &&
                    matchState.selectedAttackElement && (
                      <DiceRoller
                        diceMode={matchState.settings.diceMode}
                        roleLabel={`Attack Roll (${
                          matchState.selectedUseUltimate
                            ? ELEMENT_SCHOOLS[matchState.selectedAttackElement]
                                .ultimateName
                            : ELEMENT_SCHOOLS[matchState.selectedAttackElement]
                                .offensiveSpellName
                        })`}
                        playerName={attacker.name}
                        accentHex={
                          ELEMENT_SCHOOLS[matchState.selectedAttackElement]
                            .primaryHex
                        }
                        modifier={currentMod.attackModifier}
                        autoRollForAI={attacker.isAI}
                        reducedMotion={matchState.settings.reducedMotion}
                        onRollConfirmed={handleAttackRollConfirmed}
                      />
                    )}

                  {matchState.phase === 'ROLL_DEFENCE_D20' &&
                    matchState.selectedDefenceElement && (
                      <DiceRoller
                        diceMode={matchState.settings.diceMode}
                        roleLabel={`Defence Roll (${
                          ELEMENT_SCHOOLS[matchState.selectedDefenceElement]
                            .defensiveSpellName
                        } vs Natural ${matchState.attackRollResult} Attack)`}
                        playerName={defender.name}
                        accentHex={
                          ELEMENT_SCHOOLS[matchState.selectedDefenceElement]
                            .primaryHex
                        }
                        modifier={currentMod.defenceModifier}
                        autoRollForAI={defender.isAI}
                        reducedMotion={matchState.settings.reducedMotion}
                        onRollConfirmed={handleDefenceRollConfirmed}
                      />
                    )}
              </div>
              )}
            </div>

            {matchState.combatLog.length > 0 && (
              <details className="rounded-xl bg-slate-900/80 border border-slate-800 p-4">
                <summary className="cursor-pointer text-xs font-bold text-slate-300">
                  Combat log
                </summary>
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {matchState.combatLog.slice(0, 6).map((entry) => (
                    <div
                      key={entry.id}
                      className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
                    >
                      <div>
                        <span className="font-mono text-slate-400 mr-2">
                          [B{entry.battleNumber}·T{entry.turnNumber}]
                        </span>
                        <span className="font-semibold text-white">
                          {entry.summary}
                        </span>
                        <span className="text-slate-400 block sm:inline sm:ml-2">
                          {entry.detail}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-amber-300 shrink-0">
                        ATK {entry.naturalAttackRoll}({entry.effectiveAttackRoll}) vs DEF{' '}
                        {entry.naturalDefenceRoll}({entry.effectiveDefenceRoll})
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Special Event & Battle Over Modals */}
            {matchState.phase === 'ARCANE_CLASH_ROLL' && (
              <ArcaneClashOverlay
                state={matchState}
                onSubmitClashRolls={(p1Roll, p2Roll) => {
                  soundFX.playParryOrClash();
                  setMatchState((prev) =>
                    submitArcaneClashRolls(prev, p1Roll, p2Roll)
                  );
                }}
              />
            )}

            {matchState.phase === 'LAST_STAND_PROMPT' && (
              <LastStandOverlay
                state={matchState}
                onSubmitLastStandRoll={(roll) => {
                  if (roll === 20) {
                    soundFX.playParryOrClash();
                  } else {
                    soundFX.playSpellImpact(true);
                  }
                  setMatchState((prev) => submitLastStandRoll(prev, roll));
                }}
              />
            )}

            {(matchState.phase === 'BATTLE_OVER' ||
              matchState.phase === 'MATCH_OVER') && (
              <BattleResultsOverlay
                state={matchState}
                onStartNextBattle={() => {
                  soundFX.playSelectMagic();
                  setMatchState((prev) => startNextBattle(prev));
                }}
                onStartNewMatch={() => launchNewMatch()}
                onReturnToMenu={() => setView('MENU')}
              />
            )}
          </div>
        )}

        {view === 'ONLINE_LOBBY' && (
          <OnlineLobbyPreviewPanel
            onClose={() => setView('MENU')}
            onPlayLocalInstead={() => launchNewMatch({ mode: 'local' })}
          />
        )}

        {view === 'HOW_TO_PLAY' && (
          <HowToPlayAndTestsPanel onClose={() => setView('MENU')} />
        )}

        {view === 'SETTINGS' && (
          <div className="max-w-2xl mx-auto px-4 py-10">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">
                    Arena Preferences & Accessibility
                  </div>
                  <h2 className="text-2xl font-bold text-white">Settings</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setView('MENU')}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer"
                >
                  Save & Close
                </button>
              </div>

              <div className="space-y-4 divide-y divide-slate-800 text-sm">
                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <div className="font-semibold text-white">Spell recharge</div>
                    <p className="text-xs text-slate-400">Your attack spell rests during your next defence. Applies to new matches.</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-label="Spell recharge"
                    aria-checked={settings.defenceLockout === true}
                    onClick={() => setSettings((current) => ({ ...current, defenceLockout: !current.defenceLockout }))}
                    className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white"
                  >
                    {settings.defenceLockout ? 'On' : 'Off'}
                  </button>
                </div>
                <div className="pt-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">
                      Reduced Motion & Reduced Particles
                    </div>
                    <div className="text-xs text-slate-400">
                      Disables camera shake, continuous floating animations, and heavy particle bursts for comfort and mobile battery life.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !settings.reducedMotion;
                      setSettings((s) => ({ ...s, reducedMotion: next }));
                      setMatchState((m) => ({
                        ...m,
                        settings: { ...m.settings, reducedMotion: next },
                      }));
                    }}
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                      settings.reducedMotion
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {settings.reducedMotion ? 'Enabled' : 'Off'}
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">
                      Synthesized Arcane Audio FX
                    </div>
                    <div className="text-xs text-slate-400">
                      Web Audio API chimes for spell selection, D20 rolls, parries, and impacts.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings((s) => ({
                        ...s,
                        soundEnabled: !s.soundEnabled,
                      }))
                    }
                    className={`px-4 py-2 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap shrink-0 ${
                      settings.soundEnabled
                        ? 'bg-amber-400 text-slate-950'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {settings.soundEnabled ? 'Sound On' : 'Muted'}
                  </button>
                </div>

                <div className="pt-4 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">
                      Default D20 Input Mode
                    </div>
                    <div className="text-xs text-slate-400">
                      Choose between animated cryptographic digital D20 rolls or physical tabletop D20 number entry.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next: DiceMode =
                        settings.diceMode === 'digital'
                          ? 'physical'
                          : 'digital';
                      setSettings((s) => ({ ...s, diceMode: next }));
                      setMatchState((m) => ({
                        ...m,
                        settings: { ...m.settings, diceMode: next },
                      }));
                    }}
                    className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-800 text-amber-300 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    {settings.diceMode === 'digital'
                      ? 'Digital D20'
                      : 'Physical D20'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
