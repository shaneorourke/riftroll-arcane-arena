import {
  ARCANE_METER_MAX,
  getRequiredWinsForFormat,
  getStartingPlayerForBattle,
  resolveArcaneClash,
  resolveCombatExchange,
  resolveLastStand,
  resolvePostDamageHealth,
} from './combatEngine';
import { chooseRandomStarter } from './dice';
import {
  BattlePhase,
  CombatLogEntry,
  ElementSchool,
  MatchSettings,
  MatchState,
  PlayerId,
  PlayerState,
} from './types';

export function createInitialMatchState(
  settings: MatchSettings,
  explicitFirstStarter?: PlayerId
): MatchState {
  const firstStarter = explicitFirstStarter ?? chooseRandomStarter();

  const p1: PlayerState = {
    id: 'p1',
    name: settings.playerNames?.p1?.trim() || 'Archmage Kaelen',
    title: 'Scion of the Astral Rift',
    isAI: false,
    hp: settings.maxHp,
    maxHp: settings.maxHp,
    arcaneMeter: 0,
    battlesWon: 0,
    lastStandUsedThisBattle: false,
    avatarColor: '#F59E0B',
  };

  const p2: PlayerState = {
    id: 'p2',
    name: settings.mode === 'solo' ? getAIName(settings.aiDifficulty) : settings.playerNames?.p2?.trim() || 'Magister Lyra',
    title: settings.mode === 'solo' ? getAITitle(settings.aiDifficulty) : 'Warden of the Obsidian Spire',
    isAI: settings.mode === 'solo',
    hp: settings.maxHp,
    maxHp: settings.maxHp,
    arcaneMeter: 0,
    battlesWon: 0,
    lastStandUsedThisBattle: false,
    avatarColor: '#38BDF8',
  };

  return {
    matchId: `match_${Date.now()}`,
    settings,
    battleNumber: 1,
    turnNumber: 1,
    phase: 'SELECT_ATTACK_MAGIC',
    startingPlayerThisBattle: firstStarter,
    firstBattleStarter: firstStarter,
    activeAttackerId: firstStarter,
    selectedAttackElement: null,
    selectedUseUltimate: false,
    selectedDefenceElement: null,
    attackRollResult: null,
    defenceRollResult: null,
    pendingResolution: null,
    pendingClashP1Roll: null,
    pendingClashP2Roll: null,
    pendingLastStandPlayerId: null,
    suddenDeathCount: 0,
    battleWinnerId: null,
    matchWinnerId: null,
    players: { p1, p2 },
    combatLog: [],
  };
}

function getAIName(difficulty: MatchSettings['aiDifficulty']): string {
  switch (difficulty) {
    case 'apprentice':
      return 'Initiate Orin (AI)';
    case 'sorcerer':
      return 'Sorceress Vespera (AI)';
    case 'archmage':
      return 'Grand Archmage Malakor (AI)';
  }
}

function getAITitle(difficulty: MatchSettings['aiDifficulty']): string {
  switch (difficulty) {
    case 'apprentice':
      return 'Apprentice of the Novice Circle';
    case 'sorcerer':
      return 'High Sorceress of the Conclave';
    case 'archmage':
      return 'Supreme Arbiter of the Eight Schools';
  }
}

export function selectAttackMagic(
  state: MatchState,
  element: ElementSchool,
  useUltimate: boolean
): MatchState {
  if (state.phase !== 'SELECT_ATTACK_MAGIC') {
    return state;
  }

  const attacker = state.players[state.activeAttackerId];
  const validUltimate = useUltimate && attacker.arcaneMeter >= ARCANE_METER_MAX;

  return {
    ...state,
    players: {
      ...state.players,
      [attacker.id]: { ...attacker, defenceLock: element },
    },
    selectedAttackElement: element,
    selectedUseUltimate: validUltimate,
    phase: 'SELECT_DEFENCE_MAGIC',
  };
}

export function selectDefenceMagic(
  state: MatchState,
  element: ElementSchool
): MatchState {
  if (state.phase !== 'SELECT_DEFENCE_MAGIC' || !state.selectedAttackElement) {
    return state;
  }

  const defenderId = state.activeAttackerId === 'p1' ? 'p2' : 'p1';
  const defender = state.players[defenderId];
  if (defender.defenceLock === element) {
    return state;
  }

  return {
    ...state,
    players: {
      ...state.players,
      [defenderId]: { ...defender, defenceLock: undefined },
    },
    selectedDefenceElement: element,
    phase: 'ROLL_ATTACK_D20',
  };
}

export function submitAttackRoll(
  state: MatchState,
  naturalRoll: number
): MatchState {
  if (state.phase !== 'ROLL_ATTACK_D20') {
    return state;
  }

  return {
    ...state,
    attackRollResult: naturalRoll,
    phase: 'ROLL_DEFENCE_D20',
  };
}

export function submitDefenceRoll(
  state: MatchState,
  naturalRoll: number
): MatchState {
  if (
    state.phase !== 'ROLL_DEFENCE_D20' ||
    !state.selectedAttackElement ||
    !state.selectedDefenceElement ||
    state.attackRollResult === null
  ) {
    return state;
  }

  const attackerId = state.activeAttackerId;
  const defenderId: PlayerId = attackerId === 'p1' ? 'p2' : 'p1';

  const resolution = resolveCombatExchange({
    attackerId,
    defenderId,
    attackElement: state.selectedAttackElement,
    defenceElement: state.selectedDefenceElement,
    isUltimate: state.selectedUseUltimate,
    naturalAttackRoll: state.attackRollResult,
    naturalDefenceRoll: naturalRoll,
    attackerState: state.players[attackerId],
    defenderState: state.players[defenderId],
  });

  // Update Arcane Meters immediately on exchange resolution
  const updatedAttacker: PlayerState = {
    ...state.players[attackerId],
    arcaneMeter: resolution.attackerMeterAfter,
  };
  const updatedDefender: PlayerState = {
    ...state.players[defenderId],
    arcaneMeter: resolution.defenderMeterAfter,
  };

  const nextPlayers = {
    ...state.players,
    [attackerId]: updatedAttacker,
    [defenderId]: updatedDefender,
  };

  if (resolution.triggersArcaneClash) {
    return {
      ...state,
      defenceRollResult: naturalRoll,
      pendingResolution: resolution,
      pendingClashP1Roll: null,
      pendingClashP2Roll: null,
      players: nextPlayers,
      phase: 'ARCANE_CLASH_ROLL',
    };
  }

  // Go to ANIMATING_EXCHANGE first so the spell & shield impact plays out
  return {
    ...state,
    defenceRollResult: naturalRoll,
    pendingResolution: resolution,
    players: nextPlayers,
    phase: 'ANIMATING_EXCHANGE',
  };
}

/**
 * Completes the visual exchange animation and either triggers Last Stand prompt
 * or applies final HP changes and progresses the turn / battle.
 */
export function completeExchangeAnimation(state: MatchState): MatchState {
  if (state.phase !== 'ANIMATING_EXCHANGE' || !state.pendingResolution) {
    return state;
  }

  const res = state.pendingResolution;

  // Check if Last Stand should be offered before finalizing elimination
  if (res.triggersDefenderLastStandPrompt) {
    return {
      ...state,
      pendingLastStandPlayerId: res.defenderId,
      phase: 'LAST_STAND_PROMPT',
    };
  }

  if (res.triggersAttackerLastStandPrompt) {
    return {
      ...state,
      pendingLastStandPlayerId: res.attackerId,
      phase: 'LAST_STAND_PROMPT',
    };
  }

  return applyDamageAndAdvanceTurn(
    state,
    res.attackerId === 'p1' ? res.counterDamageToAttacker : res.damageToDefender,
    res.attackerId === 'p2' ? res.counterDamageToAttacker : res.damageToDefender,
    res.summaryText,
    res.detailText
  );
}

/**
 * Submits Arcane Clash rolls for P1 and P2 and resolves the clash outcome.
 */
export function submitArcaneClashRolls(
  state: MatchState,
  p1Roll: number,
  p2Roll: number
): MatchState {
  if (state.phase !== 'ARCANE_CLASH_ROLL' || !state.pendingResolution) {
    return state;
  }

  const clashResult = resolveArcaneClash(
    p1Roll,
    p2Roll,
    state.players.p1,
    state.players.p2
  );

  const updatedResolution = {
    ...state.pendingResolution,
    summaryText: clashResult.summaryText,
    detailText: `Arcane Clash Roll-Off: ${state.players.p1.name} rolled ${p1Roll} · ${state.players.p2.name} rolled ${p2Roll}.`,
  };

  const stateWithClash: MatchState = {
    ...state,
    pendingClashP1Roll: p1Roll,
    pendingClashP2Roll: p2Roll,
    pendingResolution: updatedResolution,
  };

  if (clashResult.triggersP1LastStand) {
    return {
      ...stateWithClash,
      pendingLastStandPlayerId: 'p1',
      phase: 'LAST_STAND_PROMPT',
    };
  }

  if (clashResult.triggersP2LastStand) {
    return {
      ...stateWithClash,
      pendingLastStandPlayerId: 'p2',
      phase: 'LAST_STAND_PROMPT',
    };
  }

  return applyDamageAndAdvanceTurn(
    stateWithClash,
    clashResult.damageToP1,
    clashResult.damageToP2,
    clashResult.summaryText,
    updatedResolution.detailText,
    clashResult
  );
}

/**
 * Resolves a Last Stand D20 roll for the endangered player.
 */
export function submitLastStandRoll(
  state: MatchState,
  naturalRoll: number
): MatchState {
  if (
    state.phase !== 'LAST_STAND_PROMPT' ||
    !state.pendingLastStandPlayerId ||
    !state.pendingResolution
  ) {
    return state;
  }

  const saviorId = state.pendingLastStandPlayerId;
  const opponentId: PlayerId = saviorId === 'p1' ? 'p2' : 'p1';

  const saviorState = state.players[saviorId];
  const opponentState = state.players[opponentId];

  const lsResult = resolveLastStand(saviorState, opponentState, naturalRoll);

  // Mark Last Stand used for this battle
  const updatedSavior: PlayerState = {
    ...saviorState,
    lastStandUsedThisBattle: true,
    hp: lsResult.saviorNewHp,
  };

  const updatedOpponent: PlayerState = {
    ...opponentState,
    hp: lsResult.opponentNewHp,
  };

  const updatedPlayers: Record<PlayerId, PlayerState> = {
    ...state.players,
    [saviorId]: updatedSavior,
    [opponentId]: updatedOpponent,
  };

  const res = state.pendingResolution;
  const logEntry: CombatLogEntry = {
    id: `log_${state.battleNumber}_${state.turnNumber}`,
    battleNumber: state.battleNumber,
    turnNumber: state.turnNumber,
    attackerId: res.attackerId,
    attackElement: res.attackElement,
    defenceElement: res.defenceElement,
    isUltimate: res.isUltimate,
    naturalAttackRoll: res.naturalAttackRoll,
    naturalDefenceRoll: res.naturalDefenceRoll,
    effectiveAttackRoll: res.effectiveAttackRoll,
    effectiveDefenceRoll: res.effectiveDefenceRoll,
    outcome: res.defenceOutcome,
    damageToDefender: res.damageToDefender,
    counterDamageToAttacker: res.counterDamageToAttacker,
    summary: lsResult.summaryText,
    detail: `${res.summaryText} → ${lsResult.summaryText}`,
    lastStandResult: lsResult,
  };

  const nextLog = [logEntry, ...state.combatLog];

  // Check if someone was eliminated after Last Stand
  let battleWinnerId: PlayerId | null = null;
  if (updatedPlayers.p1.hp === 0) {
    battleWinnerId = 'p2';
  } else if (updatedPlayers.p2.hp === 0) {
    battleWinnerId = 'p1';
  }

  if (battleWinnerId) {
    return finalizeBattleWin(
      {
        ...state,
        players: updatedPlayers,
        combatLog: nextLog,
        pendingLastStandPlayerId: null,
      },
      battleWinnerId
    );
  }

  // Otherwise savior survived at 1 HP and opponent also survived! Switch roles for next turn
  const nextAttackerId: PlayerId = state.activeAttackerId === 'p1' ? 'p2' : 'p1';
  return {
    ...state,
    players: updatedPlayers,
    combatLog: nextLog,
    turnNumber: state.turnNumber + 1,
    activeAttackerId: nextAttackerId,
    selectedAttackElement: null,
    selectedUseUltimate: false,
    selectedDefenceElement: null,
    attackRollResult: null,
    defenceRollResult: null,
    pendingResolution: null,
    pendingClashP1Roll: null,
    pendingClashP2Roll: null,
    pendingLastStandPlayerId: null,
    phase: 'SELECT_ATTACK_MAGIC',
  };
}

function applyDamageAndAdvanceTurn(
  state: MatchState,
  damageToP1: number,
  damageToP2: number,
  summaryText: string,
  detailText: string,
  clashResult?: ReturnType<typeof resolveArcaneClash>
): MatchState {
  const res = state.pendingResolution!;
  const hpOutcome = resolvePostDamageHealth(
    state.players.p1.hp,
    state.players.p2.hp,
    damageToP1,
    damageToP2,
    state.activeAttackerId,
    state.suddenDeathCount
  );

  const updatedPlayers: Record<PlayerId, PlayerState> = {
    p1: { ...state.players.p1, hp: hpOutcome.p1Hp },
    p2: { ...state.players.p2, hp: hpOutcome.p2Hp },
  };

  const finalSummary = hpOutcome.triggeredSuddenDeath
    ? `SUDDEN DEATH! Both mages fell simultaneously and surge back to 1 HP!`
    : summaryText;

  const logEntry: CombatLogEntry = {
    id: `log_${state.battleNumber}_${state.turnNumber}`,
    battleNumber: state.battleNumber,
    turnNumber: state.turnNumber,
    attackerId: res.attackerId,
    attackElement: res.attackElement,
    defenceElement: res.defenceElement,
    isUltimate: res.isUltimate,
    naturalAttackRoll: res.naturalAttackRoll,
    naturalDefenceRoll: res.naturalDefenceRoll,
    effectiveAttackRoll: res.effectiveAttackRoll,
    effectiveDefenceRoll: res.effectiveDefenceRoll,
    outcome: res.defenceOutcome,
    damageToDefender: res.damageToDefender,
    counterDamageToAttacker: res.counterDamageToAttacker,
    summary: finalSummary,
    detail: detailText,
    clashResult,
    wasSuddenDeath: hpOutcome.triggeredSuddenDeath,
  };

  const nextLog = [logEntry, ...state.combatLog];

  if (hpOutcome.battleWinnerId) {
    return finalizeBattleWin(
      {
        ...state,
        players: updatedPlayers,
        combatLog: nextLog,
        suddenDeathCount: hpOutcome.newSuddenDeathCount,
      },
      hpOutcome.battleWinnerId
    );
  }

  const nextAttackerId: PlayerId = state.activeAttackerId === 'p1' ? 'p2' : 'p1';

  return {
    ...state,
    players: updatedPlayers,
    combatLog: nextLog,
    suddenDeathCount: hpOutcome.newSuddenDeathCount,
    turnNumber: state.turnNumber + 1,
    activeAttackerId: nextAttackerId,
    selectedAttackElement: null,
    selectedUseUltimate: false,
    selectedDefenceElement: null,
    attackRollResult: null,
    defenceRollResult: null,
    pendingResolution: null,
    pendingClashP1Roll: null,
    pendingClashP2Roll: null,
    pendingLastStandPlayerId: null,
    phase: 'SELECT_ATTACK_MAGIC',
  };
}

function finalizeBattleWin(state: MatchState, winnerId: PlayerId): MatchState {
  const winner = state.players[winnerId];
  const newBattlesWon = winner.battlesWon + 1;
  const requiredWins = getRequiredWinsForFormat(state.settings.format);

  const updatedPlayers: Record<PlayerId, PlayerState> = {
    ...state.players,
    [winnerId]: {
      ...winner,
      battlesWon: newBattlesWon,
    },
  };

  const isMatchOver = newBattlesWon >= requiredWins;

  return {
    ...state,
    players: updatedPlayers,
    battleWinnerId: winnerId,
    matchWinnerId: isMatchOver ? winnerId : null,
    phase: isMatchOver ? 'MATCH_OVER' : 'BATTLE_OVER',
  };
}

/**
 * Starts the next battle within the same match.
 * CRITICAL REQUIREMENT (Section 6 & 7):
 * - Health resets to maxHp at the beginning of every new battle.
 * - Arcane Meter PERSISTS between battles within the same match!
 * - Starting player alternates from previous battle.
 * - Last Stand resets for the new battle.
 */
export function startNextBattle(state: MatchState): MatchState {
  if (state.phase !== 'BATTLE_OVER' || state.matchWinnerId !== null) {
    return state;
  }

  const nextBattleNumber = state.battleNumber + 1;
  const nextStarter = getStartingPlayerForBattle(
    state.firstBattleStarter,
    nextBattleNumber
  );

  return {
    ...state,
    battleNumber: nextBattleNumber,
    turnNumber: 1,
    phase: 'SELECT_ATTACK_MAGIC',
    startingPlayerThisBattle: nextStarter,
    activeAttackerId: nextStarter,
    selectedAttackElement: null,
    selectedUseUltimate: false,
    selectedDefenceElement: null,
    attackRollResult: null,
    defenceRollResult: null,
    pendingResolution: null,
    pendingClashP1Roll: null,
    pendingClashP2Roll: null,
    pendingLastStandPlayerId: null,
    suddenDeathCount: 0,
    battleWinnerId: null,
    players: {
      p1: {
        ...state.players.p1,
        hp: state.settings.maxHp,
        lastStandUsedThisBattle: false,
        defenceLock: undefined,
        // arcaneMeter intentionally preserved!
      },
      p2: {
        ...state.players.p2,
        hp: state.settings.maxHp,
        lastStandUsedThisBattle: false,
        defenceLock: undefined,
        // arcaneMeter intentionally preserved!
      },
    },
  };
}
