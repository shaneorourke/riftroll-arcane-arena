export type ElementSchool =
  | 'fire'
  | 'water'
  | 'earth'
  | 'lightning'
  | 'wind'
  | 'ice'
  | 'dark'
  | 'light';

export type PlayerId = 'p1' | 'p2';

export type MatchFormat = 1 | 3 | 5; // Single (1), Best of 3 (first to 2), Best of 5 (first to 3)

export type HealthPreset = 50 | 75 | 100; // Blitz (50), Standard (75), Extended (100)

export type DiceMode = 'digital' | 'physical';

export type GameMode = 'solo' | 'local' | 'online';

export type LocalLayoutMode = 'side-by-side' | 'tabletop';

export type AIDifficulty = 'apprentice' | 'sorcerer' | 'archmage';

export type AttackTier =
  | 'critical_failure'
  | 'weak'
  | 'normal'
  | 'strong'
  | 'devastating'
  | 'critical_strike';

export type DefenceOutcome =
  | 'attack_fumbled'
  | 'full_damage'
  | 'half_damage'
  | 'perfect_block'
  | 'parry'
  | 'arcane_clash';

export type BattlePhase =
  | 'SELECT_ATTACK_MAGIC'
  | 'SELECT_DEFENCE_MAGIC'
  | 'ROLL_ATTACK_D20'
  | 'ROLL_DEFENCE_D20'
  | 'ARCANE_CLASH_ROLL'
  | 'LAST_STAND_PROMPT'
  | 'ANIMATING_EXCHANGE'
  | 'BATTLE_OVER'
  | 'MATCH_OVER';

export interface PlayerState {
  id: PlayerId;
  name: string;
  title: string;
  isAI: boolean;
  hp: number;
  maxHp: number;
  arcaneMeter: number; // 0 to 100, persists across battles in the same match
  battlesWon: number;
  lastStandUsedThisBattle: boolean;
  avatarColor: string;
}

export interface ExchangeResolutionInput {
  attackerId: PlayerId;
  defenderId: PlayerId;
  attackElement: ElementSchool;
  defenceElement: ElementSchool;
  isUltimate: boolean;
  naturalAttackRoll: number; // 1..20
  naturalDefenceRoll: number; // 1..20
  attackerState: PlayerState;
  defenderState: PlayerState;
}

export interface ExchangeResolutionResult {
  attackerId: PlayerId;
  defenderId: PlayerId;
  attackElement: ElementSchool;
  defenceElement: ElementSchool;
  isUltimate: boolean;
  naturalAttackRoll: number;
  naturalDefenceRoll: number;
  attackModifier: number;
  defenceModifier: number;
  effectiveAttackRoll: number;
  effectiveDefenceRoll: number;
  elementalAdvantage: 'attacker' | 'defender' | 'none';
  attackTier: AttackTier;
  rawAttackDamage: number;
  defenceOutcome: DefenceOutcome;
  damageToDefender: number;
  counterDamageToAttacker: number;
  attackerMeterBefore: number;
  defenderMeterBefore: number;
  attackerMeterAfter: number;
  defenderMeterAfter: number;
  attackerMeterDelta: number;
  defenderMeterDelta: number;
  triggersArcaneClash: boolean;
  triggersDefenderLastStandPrompt: boolean;
  triggersAttackerLastStandPrompt: boolean;
  summaryText: string;
  detailText: string;
}

export interface ArcaneClashResolutionResult {
  p1Roll: number;
  p2Roll: number;
  winnerId: PlayerId | 'tie';
  damageToP1: number;
  damageToP2: number;
  triggersP1LastStand: boolean;
  triggersP2LastStand: boolean;
  summaryText: string;
}

export interface LastStandResolutionResult {
  saviorId: PlayerId;
  opponentId: PlayerId;
  naturalRoll: number;
  succeeded: boolean;
  saviorNewHp: number;
  counterDamageToOpponent: number;
  opponentNewHp: number;
  summaryText: string;
}

export interface CombatLogEntry {
  id: string;
  battleNumber: number;
  turnNumber: number;
  attackerId: PlayerId;
  attackElement: ElementSchool;
  defenceElement: ElementSchool;
  isUltimate: boolean;
  naturalAttackRoll: number;
  naturalDefenceRoll: number;
  effectiveAttackRoll: number;
  effectiveDefenceRoll: number;
  outcome: DefenceOutcome;
  damageToDefender: number;
  counterDamageToAttacker: number;
  summary: string;
  detail: string;
  clashResult?: ArcaneClashResolutionResult;
  lastStandResult?: LastStandResolutionResult;
  wasSuddenDeath?: boolean;
}

export interface MatchSettings {
  mode: GameMode;
  format: MatchFormat; // 1, 3, 5
  maxHp: HealthPreset; // 50, 75, 100
  diceMode: DiceMode;
  aiDifficulty: AIDifficulty;
  localLayout: LocalLayoutMode;
  reducedMotion: boolean;
  soundEnabled: boolean;
}

export interface MatchState {
  matchId: string;
  settings: MatchSettings;
  battleNumber: number;
  turnNumber: number;
  phase: BattlePhase;
  startingPlayerThisBattle: PlayerId;
  firstBattleStarter: PlayerId;
  activeAttackerId: PlayerId;
  selectedAttackElement: ElementSchool | null;
  selectedUseUltimate: boolean;
  selectedDefenceElement: ElementSchool | null;
  attackRollResult: number | null;
  defenceRollResult: number | null;
  pendingResolution: ExchangeResolutionResult | null;
  pendingClashP1Roll: number | null;
  pendingClashP2Roll: number | null;
  pendingLastStandPlayerId: PlayerId | null;
  suddenDeathCount: number;
  battleWinnerId: PlayerId | null;
  matchWinnerId: PlayerId | null;
  players: Record<PlayerId, PlayerState>;
  combatLog: CombatLogEntry[];
}
