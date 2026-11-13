import { ARCANE_METER_MAX } from './combatEngine';
import { rollCryptographicD20 } from './dice';
import { ELEMENT_ORDER, ELEMENT_SCHOOLS, hasDefensiveElementalAdvantage } from './elements';
import { AIDifficulty, ElementSchool, MatchState, PlayerState } from './types';

/**
 * Selects the AI's attacking element and whether to unleash an Ultimate.
 * Difficulty influences tactical spell selection and ultimate timing,
 * NEVER altering dice probabilities.
 */
export function chooseAIAttackDecision(
  state: MatchState,
  aiPlayer: PlayerState,
  humanPlayer: PlayerState
): { element: ElementSchool; useUltimate: boolean } {
  const difficulty: AIDifficulty = state.settings.aiDifficulty;
  const canUltimate = aiPlayer.arcaneMeter >= ARCANE_METER_MAX;

  // Pick an element
  const randomIdx = (rollCryptographicD20() - 1) % ELEMENT_ORDER.length;
  let chosenElement: ElementSchool = ELEMENT_ORDER[randomIdx];

  if (difficulty === 'sorcerer' || difficulty === 'archmage') {
    // Rotate schools intelligently to avoid repeating the exact same attack school every turn
    const recentAttacks = state.combatLog
      .filter((entry) => entry.attackerId === aiPlayer.id)
      .slice(0, 2)
      .map((e) => e.attackElement);

    const freshSchools = ELEMENT_ORDER.filter((el) => !recentAttacks.includes(el));
    if (freshSchools.length > 0) {
      const idx = (rollCryptographicD20() - 1) % freshSchools.length;
      chosenElement = freshSchools[idx];
    }
  }

  // Decide Ultimate timing
  let useUltimate = false;
  if (canUltimate) {
    if (difficulty === 'apprentice') {
      // Apprentice fires Ultimate immediately 60% of the time, or saves accidentally
      useUltimate = rollCryptographicD20() <= 12;
    } else if (difficulty === 'sorcerer') {
      // Sorcerer unleashes Ultimate unless human is already at critical low HP (<= 10 HP)
      // where saving 100 Arcane Energy for the next battle is smarter!
      useUltimate = humanPlayer.hp > 10 || humanPlayer.battlesWon === state.settings.format - 1;
    } else {
      // Archmage tactical Ultimate management:
      // If human is very low HP (<= 12) and this is not the final match-point battle for human,
      // Archmage saves the full 100 Arcane Meter for the next battle!
      const isHumanOnMatchPoint =
        humanPlayer.battlesWon + 1 >= Math.ceil(state.settings.format / 2);
      if (humanPlayer.hp <= 12 && !isHumanOnMatchPoint) {
        useUltimate = false;
      } else {
        useUltimate = true;
      }
    }
  }

  return { element: chosenElement, useUltimate };
}

/**
 * Selects the AI's defending element after seeing the attacker's chosen school.
 * Note: Players may see each other's selected magic (Section 5).
 * Difficulty governs how consistently the AI identifies the +2 elemental counter.
 */
export function chooseAIDefenceElement(
  attackElement: ElementSchool,
  difficulty: AIDifficulty
): ElementSchool {
  // Find the school that defends strongly against `attackElement` (+2 effective defence roll)
  const idealCounter =
    ELEMENT_ORDER.find((el) =>
      hasDefensiveElementalAdvantage(attackElement, el)
    ) ?? 'earth';

  // Find schools that do NOT give the attacker a +2 advantage
  const neutralSchools = ELEMENT_ORDER.filter(
    (el) =>
      el !== idealCounter &&
      ELEMENT_SCHOOLS[attackElement].defendsStronglyAgainst !== el
  );

  const d20 = rollCryptographicD20();

  if (difficulty === 'apprentice') {
    // Apprentice picks the ideal counter ~25% of the time, neutral ~50%, or random ~25%
    if (d20 <= 5) return idealCounter;
    if (d20 <= 15 && neutralSchools.length > 0) {
      return neutralSchools[d20 % neutralSchools.length];
    }
    return ELEMENT_ORDER[d20 % ELEMENT_ORDER.length];
  }

  if (difficulty === 'sorcerer') {
    // Sorcerer picks the ideal +2 counter ~65% of the time, neutral otherwise
    if (d20 <= 13) return idealCounter;
    return neutralSchools[d20 % neutralSchools.length] ?? idealCounter;
  }

  // Archmage picks the optimal +2 elemental counter 90% of the time, neutral 10%
  if (d20 <= 18) {
    return idealCounter;
  }
  return neutralSchools[d20 % neutralSchools.length] ?? idealCounter;
}
