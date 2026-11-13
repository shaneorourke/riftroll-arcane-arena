import { ELEMENT_SCHOOLS, evaluateElementalModifier } from './elements';
import { isValidD20Roll } from './dice';
import {
  ArcaneClashResolutionResult,
  AttackTier,
  DefenceOutcome,
  ExchangeResolutionInput,
  ExchangeResolutionResult,
  LastStandResolutionResult,
  MatchFormat,
  PlayerId,
  PlayerState,
} from './types';

export const ARCANE_METER_MAX = 100;

export const METER_GAIN = {
  PERFORM_ATTACK: 8,
  PARTIAL_OR_PERFECT_BLOCK: 10,
  PERFECT_PARRY: 15,
  TAKE_DAMAGE: 5,
} as const;

export const ULTIMATE_BONUS_DAMAGE = 15;
export const PARRY_COUNTER_DAMAGE = 12;
export const CLASH_WIN_DAMAGE = 15;
export const CLASH_TIE_DAMAGE = 5;
export const LAST_STAND_COUNTER_DAMAGE = 15;

/**
 * Computes base attack tier and damage from the NATURAL D20 attack roll.
 * Note: Elemental modifiers never change the natural dice values used to identify
 * critical failures (1) or critical strikes (20), though effective attack roll
 * is used when comparing against effective defence roll.
 *
 * Attack damage table:
 * - Natural 1: Critical failure, 0 damage
 * - 2-5: Weak attack, 6 damage
 * - 6-10: Normal attack, 12 damage
 * - 11-15: Strong attack, 18 damage
 * - 16-19: Devastating attack, 25 damage
 * - Natural 20: Critical strike, 35 damage
 *
 * For an Ultimate: +15 base-damage bonus, except on a natural 1, which still fails (0 damage).
 */
export function getAttackDamageAndTier(
  naturalAttackRoll: number,
  isUltimate: boolean
): { tier: AttackTier; damage: number } {
  if (!isValidD20Roll(naturalAttackRoll)) {
    throw new Error(`Invalid D20 attack roll: ${naturalAttackRoll}`);
  }

  if (naturalAttackRoll === 1) {
    return { tier: 'critical_failure', damage: 0 };
  }

  let baseDamage = 0;
  let tier: AttackTier = 'weak';

  if (naturalAttackRoll <= 5) {
    tier = 'weak';
    baseDamage = 6;
  } else if (naturalAttackRoll <= 10) {
    tier = 'normal';
    baseDamage = 12;
  } else if (naturalAttackRoll <= 15) {
    tier = 'strong';
    baseDamage = 18;
  } else if (naturalAttackRoll <= 19) {
    tier = 'devastating';
    baseDamage = 25;
  } else {
    tier = 'critical_strike';
    baseDamage = 35;
  }

  const finalBaseDamage = isUltimate ? baseDamage + ULTIMATE_BONUS_DAMAGE : baseDamage;
  return { tier, damage: finalBaseDamage };
}

/**
 * Checks if both natural rolls trigger an Arcane Clash.
 * Rule (Section 10): "If both natural D20 results are 18 or 19, trigger an Arcane Clash."
 */
export function isArcaneClashTrigger(
  naturalAttackRoll: number,
  naturalDefenceRoll: number
): boolean {
  const isAtk18Or19 = naturalAttackRoll === 18 || naturalAttackRoll === 19;
  const isDef18Or19 = naturalDefenceRoll === 18 || naturalDefenceRoll === 19;
  return isAtk18Or19 && isDef18Or19;
}

/**
 * Clamps Arcane Meter to [0, 100].
 */
export function clampArcaneMeter(value: number): number {
  return Math.max(0, Math.min(ARCANE_METER_MAX, Math.round(value)));
}

/**
 * Pure, deterministic combat exchange resolution function.
 * Dice results are supplied in `input` rather than generated inside.
 */
export function resolveCombatExchange(
  input: ExchangeResolutionInput
): ExchangeResolutionResult {
  const {
    attackerId,
    defenderId,
    attackElement,
    defenceElement,
    isUltimate,
    naturalAttackRoll,
    naturalDefenceRoll,
    attackerState,
    defenderState,
  } = input;

  if (!isValidD20Roll(naturalAttackRoll) || !isValidD20Roll(naturalDefenceRoll)) {
    throw new Error(
      `Invalid dice values supplied to resolveCombatExchange: atk=${naturalAttackRoll}, def=${naturalDefenceRoll}`
    );
  }

  if (isUltimate && attackerState.arcaneMeter < ARCANE_METER_MAX) {
    throw new Error('Cannot unleash an Ultimate attack without 100 Arcane Energy.');
  }

  const { attackModifier, defenceModifier, advantage } = evaluateElementalModifier(
    attackElement,
    defenceElement
  );

  const effectiveAttackRoll = naturalAttackRoll + attackModifier;
  const effectiveDefenceRoll = naturalDefenceRoll + defenceModifier;

  const { tier: attackTier, damage: rawAttackDamage } = getAttackDamageAndTier(
    naturalAttackRoll,
    isUltimate
  );

  const attackerMeterBefore = attackerState.arcaneMeter;
  const defenderMeterBefore = defenderState.arcaneMeter;

  // If attacker unleashed an Ultimate, 100 Arcane Energy is consumed first.
  const attackerBaseMeterAfterSpend = isUltimate ? 0 : attackerMeterBefore;

  let defenceOutcome: DefenceOutcome = 'full_damage';
  let damageToDefender = 0;
  let counterDamageToAttacker = 0;
  let triggersArcaneClash = false;

  // Priority 1: Natural 1 Attack always fails (Critical Failure)
  // Wait: What if Defender rolled Natural 20 against a Natural 1?
  // Section 5: "A natural attack 1 always fails. A natural defence 20 takes priority over an attack critical."
  // Let's check: If Defender rolls Natural 20, does Parry trigger, or if Attacker rolled 1 does attack just fail?
  // Wait: If Natural 20 Defence is rolled, Parry gives 0 damage and 12 counterattack damage.
  // Let's handle Natural 1 first if defence is not 20, or if defence IS 20, Parry still does 0 damage to defender and 12 counterattack!
  // Wait: "A natural attack 1 always fails. A natural defence 20 takes priority over an attack critical."
  // If naturalAttackRoll === 1 and naturalDefenceRoll !== 20 -> 'attack_fumbled', 0 damage to both.
  // What if naturalDefenceRoll === 20? Parry! Zero damage to defender and 12 counterattack damage to attacker.
  if (naturalDefenceRoll === 20) {
    defenceOutcome = 'parry';
    damageToDefender = 0;
    counterDamageToAttacker = PARRY_COUNTER_DAMAGE;
  } else if (naturalAttackRoll === 1) {
    defenceOutcome = 'attack_fumbled';
    damageToDefender = 0;
    counterDamageToAttacker = 0;
  } else if (isArcaneClashTrigger(naturalAttackRoll, naturalDefenceRoll)) {
    // Both natural rolls are 18 or 19 -> Arcane Clash!
    defenceOutcome = 'arcane_clash';
    triggersArcaneClash = true;
    damageToDefender = 0;
    counterDamageToAttacker = 0;
  } else {
    // Compare effective attack and defence rolls:
    // - Defence 5 or more below attack (effectiveDefenceRoll <= effectiveAttackRoll - 5): Full damage
    // - Defence within 4 points of attack (Math.abs(effectiveDefenceRoll - effectiveAttackRoll) <= 4): Half damage, rounded up
    // - Defence 5 or more above attack (effectiveDefenceRoll >= effectiveAttackRoll + 5): Perfect block, zero damage
    const diff = effectiveDefenceRoll - effectiveAttackRoll;
    if (diff <= -5) {
      defenceOutcome = 'full_damage';
      damageToDefender = rawAttackDamage;
    } else if (diff <= 4) {
      defenceOutcome = 'half_damage';
      damageToDefender = Math.ceil(rawAttackDamage / 2);
    } else {
      defenceOutcome = 'perfect_block';
      damageToDefender = 0;
    }
  }

  // Arcane Meter gains (Section 6):
  // - Performing an attack: +8
  // - Successful partial or perfect block: +10
  // - Perfect parry: +15 instead of the normal block gain
  // - Taking damage: +5
  // Meter gains applied once per qualifying event.
  let attackerGain = METER_GAIN.PERFORM_ATTACK;
  let defenderGain = 0;

  if (defenceOutcome === 'parry') {
    defenderGain += METER_GAIN.PERFECT_PARRY;
    if (counterDamageToAttacker > 0) {
      attackerGain += METER_GAIN.TAKE_DAMAGE;
    }
  } else if (defenceOutcome === 'perfect_block') {
    defenderGain += METER_GAIN.PARTIAL_OR_PERFECT_BLOCK;
  } else if (defenceOutcome === 'half_damage') {
    defenderGain += METER_GAIN.PARTIAL_OR_PERFECT_BLOCK;
    if (damageToDefender > 0) {
      defenderGain += METER_GAIN.TAKE_DAMAGE;
    }
  } else if (defenceOutcome === 'full_damage') {
    if (damageToDefender > 0) {
      defenderGain += METER_GAIN.TAKE_DAMAGE;
    }
  }

  const attackerMeterAfter = clampArcaneMeter(attackerBaseMeterAfterSpend + attackerGain);
  const defenderMeterAfter = clampArcaneMeter(defenderMeterBefore + defenderGain);

  // Check if incoming damage would eliminate Defender or Attacker (for Last Stand eligibility)
  const triggersDefenderLastStandPrompt =
    !triggersArcaneClash &&
    damageToDefender >= defenderState.hp &&
    defenderState.hp > 0 &&
    !defenderState.lastStandUsedThisBattle;

  const triggersAttackerLastStandPrompt =
    !triggersArcaneClash &&
    counterDamageToAttacker >= attackerState.hp &&
    attackerState.hp > 0 &&
    !attackerState.lastStandUsedThisBattle;

  const atkSchool = ELEMENT_SCHOOLS[attackElement];
  const defSchool = ELEMENT_SCHOOLS[defenceElement];
  const spellUsed = isUltimate ? atkSchool.ultimateName : atkSchool.offensiveSpellName;

  let summaryText = '';
  let detailText = '';

  if (triggersArcaneClash) {
    summaryText = `ARCANE CLASH! ${atkSchool.name} (${naturalAttackRoll}) collides with ${defSchool.name} (${naturalDefenceRoll})!`;
    detailText = 'Both mages rolled 18–19! Roll an Arcane Clash D20 to break the deadlock.';
  } else if (defenceOutcome === 'parry') {
    summaryText = `PERFECT PARRY! ${defenderState.name} parries ${spellUsed} with a Natural 20!`;
    detailText = `Zero damage taken and ${PARRY_COUNTER_DAMAGE} counterattack damage dealt to ${attackerState.name}.`;
  } else if (defenceOutcome === 'attack_fumbled') {
    summaryText = `CRITICAL FAILURE! ${attackerState.name}'s ${spellUsed} fizzles on a Natural 1!`;
    detailText = 'The spell destabilizes harmlessly in mid-air (0 damage).';
  } else if (defenceOutcome === 'perfect_block') {
    summaryText = `PERFECT BLOCK! ${defenderState.name}'s ${defSchool.defensiveSpellName} nullifies ${spellUsed}!`;
    detailText = `Effective Defence (${effectiveDefenceRoll}) exceeded Attack (${effectiveAttackRoll}) by ${effectiveDefenceRoll - effectiveAttackRoll}. Zero damage!`;
  } else if (defenceOutcome === 'half_damage') {
    summaryText = `PARTIAL BLOCK! ${defSchool.defensiveSpellName} absorbs half of ${spellUsed} (${damageToDefender} DMG).`;
    detailText = `Effective Defence (${effectiveDefenceRoll}) stayed within 4 of Attack (${effectiveAttackRoll}). Raw ${rawAttackDamage} reduced to ${damageToDefender}.`;
  } else {
    const critPrefix = naturalAttackRoll === 20 ? 'CRITICAL STRIKE! ' : '';
    summaryText = `${critPrefix}${spellUsed} hits ${defenderState.name} for ${damageToDefender} damage!`;
    detailText = `Effective Attack (${effectiveAttackRoll}) overwhelmed Defence (${effectiveDefenceRoll}). Full ${damageToDefender} damage dealt.`;
  }

  return {
    attackerId,
    defenderId,
    attackElement,
    defenceElement,
    isUltimate,
    naturalAttackRoll,
    naturalDefenceRoll,
    attackModifier,
    defenceModifier,
    effectiveAttackRoll,
    effectiveDefenceRoll,
    elementalAdvantage: advantage,
    attackTier,
    rawAttackDamage,
    defenceOutcome,
    damageToDefender,
    counterDamageToAttacker,
    attackerMeterBefore,
    defenderMeterBefore,
    attackerMeterAfter,
    defenderMeterAfter,
    attackerMeterDelta: attackerMeterAfter - attackerMeterBefore,
    defenderMeterDelta: defenderMeterAfter - defenderMeterBefore,
    triggersArcaneClash,
    triggersDefenderLastStandPrompt,
    triggersAttackerLastStandPrompt,
    summaryText,
    detailText,
  };
}

/**
 * Resolves an Arcane Clash roll-off (Section 10).
 * - Higher roll wins and deals 15 damage to the opponent.
 * - Equal rolls deal 5 damage to both players.
 * - No additional defence roll occurs during the clash.
 * - Replaces normal damage outcome for that exchange.
 */
export function resolveArcaneClash(
  p1Roll: number,
  p2Roll: number,
  p1State: PlayerState,
  p2State: PlayerState
): ArcaneClashResolutionResult {
  if (!isValidD20Roll(p1Roll) || !isValidD20Roll(p2Roll)) {
    throw new Error(`Invalid D20 roll in Arcane Clash: p1=${p1Roll}, p2=${p2Roll}`);
  }

  let winnerId: PlayerId | 'tie' = 'tie';
  let damageToP1 = 0;
  let damageToP2 = 0;
  let summaryText = '';

  if (p1Roll > p2Roll) {
    winnerId = 'p1';
    damageToP2 = CLASH_WIN_DAMAGE;
    summaryText = `${p1State.name} overpowers the Arcane Clash (${p1Roll} vs ${p2Roll}) for ${CLASH_WIN_DAMAGE} damage!`;
  } else if (p2Roll > p1Roll) {
    winnerId = 'p2';
    damageToP1 = CLASH_WIN_DAMAGE;
    summaryText = `${p2State.name} overpowers the Arcane Clash (${p2Roll} vs ${p1Roll}) for ${CLASH_WIN_DAMAGE} damage!`;
  } else {
    winnerId = 'tie';
    damageToP1 = CLASH_TIE_DAMAGE;
    damageToP2 = CLASH_TIE_DAMAGE;
    summaryText = `Deadlocked Arcane Clash (${p1Roll} vs ${p2Roll})! The unstable shockwave deals ${CLASH_TIE_DAMAGE} damage to both mages!`;
  }

  // Check if Last Stand can trigger for a single eliminated player (not simultaneous tie elimination)
  const p1WouldDie = damageToP1 >= p1State.hp && p1State.hp > 0;
  const p2WouldDie = damageToP2 >= p2State.hp && p2State.hp > 0;

  return {
    p1Roll,
    p2Roll,
    winnerId,
    damageToP1,
    damageToP2,
    triggersP1LastStand: p1WouldDie && !p2WouldDie && !p1State.lastStandUsedThisBattle,
    triggersP2LastStand: p2WouldDie && !p1WouldDie && !p2State.lastStandUsedThisBattle,
    summaryText,
  };
}

/**
 * Resolves a Last Stand roll (Section 11).
 * - Natural 20: Prevents elimination, leaves player at 1 HP, deals 15 counterattack damage.
 * - Any other result (1..19): Original damage and elimination proceed (0 HP).
 * - Can trigger only once per player per battle.
 * - Does NOT generate additional Arcane Energy.
 */
export function resolveLastStand(
  saviorState: PlayerState,
  opponentState: PlayerState,
  naturalRoll: number
): LastStandResolutionResult {
  if (!isValidD20Roll(naturalRoll)) {
    throw new Error(`Invalid Last Stand D20 roll: ${naturalRoll}`);
  }

  if (saviorState.lastStandUsedThisBattle) {
    throw new Error(`${saviorState.name} has already used Last Stand in this battle.`);
  }

  const succeeded = naturalRoll === 20;

  if (succeeded) {
    const opponentNewHp = Math.max(0, opponentState.hp - LAST_STAND_COUNTER_DAMAGE);
    return {
      saviorId: saviorState.id,
      opponentId: opponentState.id,
      naturalRoll,
      succeeded: true,
      saviorNewHp: 1,
      counterDamageToOpponent: LAST_STAND_COUNTER_DAMAGE,
      opponentNewHp,
      summaryText: `MIRACLE LAST STAND! ${saviorState.name} rolls a NATURAL 20, defies defeat at 1 HP, and blasts ${opponentState.name} for ${LAST_STAND_COUNTER_DAMAGE} damage!`,
    };
  }

  return {
    saviorId: saviorState.id,
    opponentId: opponentState.id,
    naturalRoll,
    succeeded: false,
    saviorNewHp: 0,
    counterDamageToOpponent: 0,
    opponentNewHp: opponentState.hp,
    summaryText: `Last Stand failed (${naturalRoll}). ${saviorState.name} falls in the Arcane Arena!`,
  };
}

/**
 * Helper to compute how many battle wins are required for a given MatchFormat.
 * - Single Battle (1) -> 1 win
 * - Best of 3 (3) -> 2 wins
 * - Best of 5 (5) -> 3 wins
 */
export function getRequiredWinsForFormat(format: MatchFormat): number {
  return Math.ceil(format / 2);
}

/**
 * Determines the starting player for a given battle number (1-indexed),
 * alternating from the Battle 1 starter (Section 7).
 */
export function getStartingPlayerForBattle(
  firstBattleStarter: PlayerId,
  battleNumber: number
): PlayerId {
  if (battleNumber % 2 === 1) {
    return firstBattleStarter;
  }
  return firstBattleStarter === 'p1' ? 'p2' : 'p1';
}

/**
 * Resolves post-damage HP state for both players, including Sudden Death
 * when both players reach 0 HP simultaneously (Section 7):
 * "In sudden death, both players return to 1 HP, retain their meters, and continue
 * until there is one survivor. Prevent repeated simultaneous elimination from causing an infinite loop."
 */
export function resolvePostDamageHealth(
  p1CurrentHp: number,
  p2CurrentHp: number,
  damageToP1: number,
  damageToP2: number,
  activeAttackerId: PlayerId,
  currentSuddenDeathCount: number
): {
  p1Hp: number;
  p2Hp: number;
  triggeredSuddenDeath: boolean;
  newSuddenDeathCount: number;
  battleWinnerId: PlayerId | null;
} {
  const rawP1Hp = Math.max(0, p1CurrentHp - damageToP1);
  const rawP2Hp = Math.max(0, p2CurrentHp - damageToP2);

  if (rawP1Hp === 0 && rawP2Hp === 0) {
    // Cap sudden death resets at 3 per battle to guarantee no infinite loop
    if (currentSuddenDeathCount < 3) {
      return {
        p1Hp: 1,
        p2Hp: 1,
        triggeredSuddenDeath: true,
        newSuddenDeathCount: currentSuddenDeathCount + 1,
        battleWinnerId: null,
      };
    } else {
      // Tie-breaker after 3 consecutive simultaneous eliminations: active attacker prevails with 1 HP
      const winner = activeAttackerId;
      return {
        p1Hp: winner === 'p1' ? 1 : 0,
        p2Hp: winner === 'p2' ? 1 : 0,
        triggeredSuddenDeath: false,
        newSuddenDeathCount: currentSuddenDeathCount,
        battleWinnerId: winner,
      };
    }
  }

  if (rawP1Hp === 0) {
    return {
      p1Hp: 0,
      p2Hp: rawP2Hp,
      triggeredSuddenDeath: false,
      newSuddenDeathCount: currentSuddenDeathCount,
      battleWinnerId: 'p2',
    };
  }

  if (rawP2Hp === 0) {
    return {
      p1Hp: rawP1Hp,
      p2Hp: 0,
      triggeredSuddenDeath: false,
      newSuddenDeathCount: currentSuddenDeathCount,
      battleWinnerId: 'p1',
    };
  }

  return {
    p1Hp: rawP1Hp,
    p2Hp: rawP2Hp,
    triggeredSuddenDeath: false,
    newSuddenDeathCount: currentSuddenDeathCount,
    battleWinnerId: null,
  };
}
