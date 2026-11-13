import {
  chooseAIAttackDecision,
  chooseAIDefenceElement,
} from './aiController';
import {
  ARCANE_METER_MAX,
  getAttackDamageAndTier,
  getStartingPlayerForBattle,
  isArcaneClashTrigger,
  resolveArcaneClash,
  resolveCombatExchange,
  resolveLastStand,
  resolvePostDamageHealth,
} from './combatEngine';
import { evaluateElementalModifier } from './elements';
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
} from './matchController';
import { MatchSettings, PlayerState } from './types';

export interface TestCaseResult {
  id: string;
  category: string;
  name: string;
  passed: boolean;
  details: string;
}

function makeDummyPlayer(
  id: 'p1' | 'p2',
  hp = 75,
  arcaneMeter = 0,
  lastStandUsedThisBattle = false
): PlayerState {
  return {
    id,
    name: id === 'p1' ? 'Archmage Kaelen' : 'Magister Lyra',
    title: 'Test Mage',
    isAI: false,
    hp,
    maxHp: 75,
    arcaneMeter,
    battlesWon: 0,
    lastStandUsedThisBattle,
    avatarColor: '#F59E0B',
  };
}

const DEFAULT_SETTINGS: MatchSettings = {
  mode: 'local',
  format: 3,
  maxHp: 75,
  diceMode: 'digital',
  aiDifficulty: 'sorcerer',
  localLayout: 'side-by-side',
  reducedMotion: false,
  soundEnabled: false,
};

export function runCombatEngineTestSuite(): TestCaseResult[] {
  const results: TestCaseResult[] = [];

  const assertTest = (
    id: string,
    category: string,
    name: string,
    condition: boolean,
    details: string
  ) => {
    results.push({
      id,
      category,
      name,
      passed: Boolean(condition),
      details,
    });
  };

  // 1. All attack damage ranges
  const dmg1 = getAttackDamageAndTier(1, false);
  const dmg4 = getAttackDamageAndTier(4, false);
  const dmg8 = getAttackDamageAndTier(8, false);
  const dmg13 = getAttackDamageAndTier(13, false);
  const dmg17 = getAttackDamageAndTier(17, false);
  const dmg20 = getAttackDamageAndTier(20, false);

  assertTest(
    'dmg-ranges',
    'Attack Damage Table',
    'All 6 D20 damage tiers resolve accurately (1→0, 2–5→6, 6–10→12, 11–15→18, 16–19→25, 20→35)',
    dmg1.damage === 0 &&
      dmg4.damage === 6 &&
      dmg8.damage === 12 &&
      dmg13.damage === 18 &&
      dmg17.damage === 25 &&
      dmg20.damage === 35,
    `Got [1:${dmg1.damage}, 4:${dmg4.damage}, 8:${dmg8.damage}, 13:${dmg13.damage}, 17:${dmg17.damage}, 20:${dmg20.damage}]`
  );

  // 2. Natural 1 Critical Failures
  const nat1Exchange = resolveCombatExchange({
    attackerId: 'p1',
    defenderId: 'p2',
    attackElement: 'water', // Even with +2 offensive elemental advantage vs fire!
    defenceElement: 'fire',
    isUltimate: true, // Even on an Ultimate!
    naturalAttackRoll: 1,
    naturalDefenceRoll: 2,
    attackerState: makeDummyPlayer('p1', 75, 100),
    defenderState: makeDummyPlayer('p2', 75, 0),
  });

  assertTest(
    'nat-1-fumble',
    'Critical Rules',
    'Natural 1 attack always fails (0 damage), even with elemental bonus or Ultimate active',
    nat1Exchange.defenceOutcome === 'attack_fumbled' &&
      nat1Exchange.damageToDefender === 0,
    `Outcome: ${nat1Exchange.defenceOutcome}, Damage: ${nat1Exchange.damageToDefender}`
  );

  // 3. Natural 20 Critical Strikes
  const nat20Attack = resolveCombatExchange({
    attackerId: 'p1',
    defenderId: 'p2',
    attackElement: 'fire',
    defenceElement: 'fire',
    isUltimate: false,
    naturalAttackRoll: 20,
    naturalDefenceRoll: 10,
    attackerState: makeDummyPlayer('p1', 75, 0),
    defenderState: makeDummyPlayer('p2', 75, 0),
  });

  assertTest(
    'nat-20-crit',
    'Critical Rules',
    'Natural 20 attack deals 35 Critical Strike damage when unblocked',
    nat20Attack.attackTier === 'critical_strike' &&
      nat20Attack.damageToDefender === 35,
    `Tier: ${nat20Attack.attackTier}, Damage: ${nat20Attack.damageToDefender}`
  );

  // 4. Natural 20 Parries (including priority over Natural 20 Attack)
  const nat20Parry = resolveCombatExchange({
    attackerId: 'p1',
    defenderId: 'p2',
    attackElement: 'lightning',
    defenceElement: 'earth',
    isUltimate: true,
    naturalAttackRoll: 20,
    naturalDefenceRoll: 20,
    attackerState: makeDummyPlayer('p1', 75, 100),
    defenderState: makeDummyPlayer('p2', 75, 10),
  });

  assertTest(
    'nat-20-parry',
    'Defence Resolution',
    'Natural 20 defence takes priority over Natural 20 attack, dealing 0 damage to defender and 12 counter damage',
    nat20Parry.defenceOutcome === 'parry' &&
      nat20Parry.damageToDefender === 0 &&
      nat20Parry.counterDamageToAttacker === 12 &&
      nat20Parry.defenderMeterDelta === 15,
    `Outcome: ${nat20Parry.defenceOutcome}, Counter: ${nat20Parry.counterDamageToAttacker}, DefMeterGain: +${nat20Parry.defenderMeterDelta}`
  );

  // 5. Elemental Modifiers
  const waterDefFire = evaluateElementalModifier('fire', 'water');
  const lightDefDark = evaluateElementalModifier('dark', 'light');
  const darkDefLight = evaluateElementalModifier('light', 'dark');
  const neutralMatch = evaluateElementalModifier('fire', 'earth');

  assertTest(
    'elemental-modifiers',
    'Elemental System',
    'Advantageous defensive matchups grant +2 to effective roll (including mutual Light/Dark wards)',
    waterDefFire.defenceModifier === 2 &&
      lightDefDark.defenceModifier === 2 &&
      darkDefLight.defenceModifier === 2 &&
      neutralMatch.defenceModifier === 0 &&
      neutralMatch.attackModifier === 0,
    `Water vs Fire: +${waterDefFire.defenceModifier} Def, Light/Dark mutual: +${lightDefDark.defenceModifier}/+${darkDefLight.defenceModifier}`
  );

  // 6. Perfect Blocks and Partial Blocks (with rounded-up half damage)
  const partialBlockOdd = resolveCombatExchange({
    attackerId: 'p1',
    defenderId: 'p2',
    attackElement: 'fire',
    defenceElement: 'fire',
    isUltimate: false,
    naturalAttackRoll: 17, // 25 raw damage (odd number!)
    naturalDefenceRoll: 14, // Within 4 points -> ceil(25 / 2) = 13
    attackerState: makeDummyPlayer('p1', 75, 0),
    defenderState: makeDummyPlayer('p2', 75, 0),
  });

  const perfectBlock = resolveCombatExchange({
    attackerId: 'p1',
    defenderId: 'p2',
    attackElement: 'fire',
    defenceElement: 'water', // +2 defence modifier!
    isUltimate: false,
    naturalAttackRoll: 10, // Effective 10
    naturalDefenceRoll: 13, // Effective 13 + 2 = 15 (5 above attack -> Perfect Block!)
    attackerState: makeDummyPlayer('p1', 75, 0),
    defenderState: makeDummyPlayer('p2', 75, 0),
  });

  assertTest(
    'blocks-resolution',
    'Defence Resolution',
    'Partial block halves damage rounded up (25→13) and +2 elemental modifier upgrades border roll into Perfect Block (0 dmg)',
    partialBlockOdd.defenceOutcome === 'half_damage' &&
      partialBlockOdd.damageToDefender === 13 &&
      perfectBlock.defenceOutcome === 'perfect_block' &&
      perfectBlock.damageToDefender === 0,
    `Partial(25): ${partialBlockOdd.damageToDefender} dmg; Elemental Perfect Block: ${perfectBlock.damageToDefender} dmg`
  );

  // 7. Arcane Meter Gains & Caps
  const cappedExchange = resolveCombatExchange({
    attackerId: 'p1',
    defenderId: 'p2',
    attackElement: 'ice',
    defenceElement: 'wind',
    isUltimate: false,
    naturalAttackRoll: 12,
    naturalDefenceRoll: 10, // Partial block: Defender gets +10 block and +5 take damage = +15
    attackerState: makeDummyPlayer('p1', 75, 96), // +8 capped at 100
    defenderState: makeDummyPlayer('p2', 75, 90), // +15 capped at 100
  });

  assertTest(
    'meter-gains-and-cap',
    'Arcane Meter',
    'Arcane Meter gains (+8 attack, +10 block, +5 damage) apply accurately and cap at 100',
    cappedExchange.attackerMeterAfter === ARCANE_METER_MAX &&
      cappedExchange.defenderMeterAfter === ARCANE_METER_MAX,
    `Attacker: 96→${cappedExchange.attackerMeterAfter}, Defender: 90→${cappedExchange.defenderMeterAfter}`
  );

  // 8. Ultimate Consumption & +15 Bonus Damage
  const ultExchange = resolveCombatExchange({
    attackerId: 'p1',
    defenderId: 'p2',
    attackElement: 'fire',
    defenceElement: 'earth',
    isUltimate: true,
    naturalAttackRoll: 12, // Strong (18) + 15 Ultimate = 33 raw damage
    naturalDefenceRoll: 3, // Full damage
    attackerState: makeDummyPlayer('p1', 75, 100),
    defenderState: makeDummyPlayer('p2', 75, 20),
  });

  assertTest(
    'ultimate-consumption',
    'Arcane Meter',
    'Ultimate consumes 100 Arcane Energy, adds +15 base damage (18+15=33), and awards +8 attack energy afterward',
    ultExchange.rawAttackDamage === 33 &&
      ultExchange.damageToDefender === 33 &&
      ultExchange.attackerMeterAfter === 8,
    `Ult Damage: ${ultExchange.damageToDefender}, Post-Ult Meter: ${ultExchange.attackerMeterAfter}`
  );

  // 9. Meter Persistence Between Battles & Reset Between Matches + Alternating Starters
  let match = createInitialMatchState(DEFAULT_SETTINGS, 'p1');
  // Simulate P1 winning Battle 1 with 45 meter and P2 having 85 meter
  match = {
    ...match,
    phase: 'BATTLE_OVER',
    battleWinnerId: 'p1',
    players: {
      p1: { ...match.players.p1, hp: 30, arcaneMeter: 45, battlesWon: 1 },
      p2: { ...match.players.p2, hp: 0, arcaneMeter: 85, battlesWon: 0 },
    },
  };
  const battle2State = startNextBattle(match);
  const freshMatchState = createInitialMatchState(DEFAULT_SETTINGS, 'p1');

  assertTest(
    'meter-persistence-and-reset',
    'Match Progression',
    'Arcane Meter persists between battles (45 & 85 retained, HP reset to 75) and resets to 0 on a new match',
    battle2State.players.p1.hp === 75 &&
      battle2State.players.p2.hp === 75 &&
      battle2State.players.p1.arcaneMeter === 45 &&
      battle2State.players.p2.arcaneMeter === 85 &&
      freshMatchState.players.p1.arcaneMeter === 0 &&
      freshMatchState.players.p2.arcaneMeter === 0,
    `Battle 2 Meters: P1=${battle2State.players.p1.arcaneMeter}, P2=${battle2State.players.p2.arcaneMeter}; HP=${battle2State.players.p1.hp}/${battle2State.players.p2.hp}`
  );

  // 10. Alternating Starting Players
  const b1Starter = getStartingPlayerForBattle('p1', 1);
  const b2Starter = getStartingPlayerForBattle('p1', 2);
  const b3Starter = getStartingPlayerForBattle('p1', 3);

  assertTest(
    'alternating-starters',
    'Match Progression',
    'Starting player alternates cleanly across battles (B1: P1 → B2: P2 → B3: P1)',
    b1Starter === 'p1' &&
      b2Starter === 'p2' &&
      b3Starter === 'p1' &&
      battle2State.startingPlayerThisBattle === 'p2',
    `Starters: B1=${b1Starter}, B2=${b2Starter}, B3=${b3Starter}`
  );

  // 11. Best-of-Three Match Completion
  let bo3 = createInitialMatchState({ ...DEFAULT_SETTINGS, maxHp: 50 }, 'p1');
  // P1 already won 1 battle, P2 has 15 HP and Last Stand already used
  bo3 = {
    ...bo3,
    players: {
      p1: { ...bo3.players.p1, battlesWon: 1 },
      p2: { ...bo3.players.p2, hp: 15, lastStandUsedThisBattle: true },
    },
  };
  bo3 = selectAttackMagic(bo3, 'fire', false);
  bo3 = selectDefenceMagic(bo3, 'fire');
  bo3 = submitAttackRoll(bo3, 20); // 35 damage
  bo3 = submitDefenceRoll(bo3, 2);
  bo3 = completeExchangeAnimation(bo3);

  assertTest(
    'best-of-three-completion',
    'Match Progression',
    'Best-of-three match concludes in MATCH_OVER when a mage secures 2 battle victories',
    bo3.phase === 'MATCH_OVER' &&
      bo3.matchWinnerId === 'p1' &&
      bo3.players.p1.battlesWon === 2,
    `Phase: ${bo3.phase}, Winner: ${bo3.matchWinnerId}, P1 Wins: ${bo3.players.p1.battlesWon}`
  );

  // 12. Arcane Clash Outcomes
  const clashTrigger18_19 = isArcaneClashTrigger(18, 19);
  const clashTrigger19_20 = isArcaneClashTrigger(19, 20); // False: Nat 20 is Parry
  const clashWin = resolveArcaneClash(
    16,
    9,
    makeDummyPlayer('p1', 50),
    makeDummyPlayer('p2', 50)
  );
  const clashTie = resolveArcaneClash(
    14,
    14,
    makeDummyPlayer('p1', 50),
    makeDummyPlayer('p2', 50)
  );

  assertTest(
    'arcane-clash',
    'Special Mechanics',
    'Arcane Clash triggers strictly on natural 18/19 vs 18/19, dealing 15 damage on win or 5 to both on tie',
    clashTrigger18_19 === true &&
      clashTrigger19_20 === false &&
      clashWin.damageToP2 === 15 &&
      clashWin.damageToP1 === 0 &&
      clashTie.damageToP1 === 5 &&
      clashTie.damageToP2 === 5,
    `18v19=${clashTrigger18_19}, 19v20=${clashTrigger19_20}, WinDmg=${clashWin.damageToP2}, TieDmg=${clashTie.damageToP1}/${clashTie.damageToP2}`
  );

  // 13. Last Stand Success and Failure
  const lsSuccess = resolveLastStand(
    makeDummyPlayer('p2', 10, 40, false),
    makeDummyPlayer('p1', 30, 50, false),
    20
  );
  const lsFail = resolveLastStand(
    makeDummyPlayer('p2', 10, 40, false),
    makeDummyPlayer('p1', 30, 50, false),
    19
  );

  assertTest(
    'last-stand',
    'Special Mechanics',
    'Last Stand Natural 20 leaves defender at 1 HP and deals 15 counter damage; 1–19 allows elimination',
    lsSuccess.succeeded &&
      lsSuccess.saviorNewHp === 1 &&
      lsSuccess.opponentNewHp === 15 &&
      !lsFail.succeeded &&
      lsFail.saviorNewHp === 0,
    `Nat20 HP=${lsSuccess.saviorNewHp} & OppHP=${lsSuccess.opponentNewHp}; Roll 19 HP=${lsFail.saviorNewHp}`
  );

  // 14. Sudden Death
  const sdOutcome = resolvePostDamageHealth(5, 5, 5, 5, 'p1', 0);
  const sdLoopBreaker = resolvePostDamageHealth(1, 1, 5, 5, 'p1', 3);

  assertTest(
    'sudden-death',
    'Special Mechanics',
    'Simultaneous elimination triggers Sudden Death (both return to 1 HP) and prevents infinite loops',
    sdOutcome.triggeredSuddenDeath === true &&
      sdOutcome.p1Hp === 1 &&
      sdOutcome.p2Hp === 1 &&
      sdLoopBreaker.battleWinnerId === 'p1',
    `SD Reset: P1=${sdOutcome.p1Hp} HP, P2=${sdOutcome.p2Hp} HP; Loop Cap Winner=${sdLoopBreaker.battleWinnerId}`
  );

  // 15. AI Turn Progression
  const soloMatch = createInitialMatchState(
    { ...DEFAULT_SETTINGS, mode: 'solo', aiDifficulty: 'archmage' },
    'p2'
  );
  const aiAtk = chooseAIAttackDecision(
    soloMatch,
    soloMatch.players.p2,
    soloMatch.players.p1
  );
  const aiDef = chooseAIDefenceElement('fire', 'archmage');
  const sorcererMatch = createInitialMatchState(
    { ...DEFAULT_SETTINGS, mode: 'solo', format: 3, aiDifficulty: 'sorcerer' },
    'p2'
  );
  const chargedSorcerer = { ...sorcererMatch.players.p2, arcaneMeter: 100 };
  const weakenedHuman = { ...sorcererMatch.players.p1, hp: 10 };
  const savesBeforeMatchPoint = !chooseAIAttackDecision(
    sorcererMatch, chargedSorcerer, weakenedHuman
  ).useUltimate;
  const spendsAtMatchPoint = chooseAIAttackDecision(
    sorcererMatch, chargedSorcerer, { ...weakenedHuman, battlesWon: 1 }
  ).useUltimate;

  assertTest(
    'ai-turn-progression',
    'AI Controller',
    'AI selects valid spells and the Sorcerer spends a charged Ultimate at match point',
    typeof aiAtk.element === 'string' &&
      aiAtk.useUltimate === false &&
      typeof aiDef === 'string' &&
      savesBeforeMatchPoint &&
      spendsAtMatchPoint,
    `Sorcerer saves before match point: ${savesBeforeMatchPoint}; spends at match point: ${spendsAtMatchPoint}`
  );

  const rechargeMatch = createInitialMatchState({ ...DEFAULT_SETTINGS, defenceLockout: true }, 'p1');
  const firstCast = selectAttackMagic(rechargeMatch, 'ice', false);
  const firstDefence = selectDefenceMagic(firstCast, 'ice');
  const nextTurn = completeExchangeAnimation(submitDefenceRoll(submitAttackRoll(firstDefence, 4), 12));
  const nextCast = selectAttackMagic(nextTurn, 'wind', false);
  const blocked = selectDefenceMagic(nextCast, 'ice');
  const accepted = selectDefenceMagic(nextCast, 'fire');
  const aiAvoidsLock = Array.from({ length: 30 }, () => chooseAIDefenceElement('wind', 'archmage', 'ice')).every((element) => element !== 'ice');
  assertTest(
    'spell-recharge',
    'Match Progression',
    'An attack locks only its caster’s next defence, and the AI respects the lock',
    firstDefence.phase === 'ROLL_ATTACK_D20' && blocked === nextCast &&
      accepted.phase === 'ROLL_ATTACK_D20' && accepted.players.p1.defenceLock === undefined &&
      accepted.players.p2.defenceLock === 'wind' && aiAvoidsLock,
    `Blocked Ice: ${blocked === nextCast}; AI avoids Ice: ${aiAvoidsLock}`
  );

  return results;
}
