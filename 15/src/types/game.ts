import type { FORMATION_LABELS, TEAM_SLOT_ORDER } from '@/config/gameConfig';

export type CharacterRole =
  | 'tank'
  | 'bruiser'
  | 'assassin'
  | 'ranger'
  | 'mage'
  | 'healer'
  | 'support';

export type Rarity = 'common' | 'advanced' | 'rare' | 'epic' | 'legendary';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type TeamSlotId = (typeof TEAM_SLOT_ORDER)[number];
export type TeamFormation = keyof typeof FORMATION_LABELS;
export type TierName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond';
export type BattleMode = 'pvp' | 'pve';
export type BattleResult = 'win' | 'loss';
export type RewardType = 'gold' | 'growth' | 'gearCore' | 'arenaToken' | 'gem' | 'equipment';
export type SkillTarget =
  | 'frontline'
  | 'backline'
  | 'lowestHpEnemy'
  | 'randomEnemy'
  | 'allEnemies'
  | 'self'
  | 'lowestHpAlly'
  | 'allAllies'
  | 'frontlineAllies'
  | 'backlineAllies';
export type StatusEffectKind =
  | 'stun'
  | 'bleed'
  | 'defenseBreak'
  | 'attackUp'
  | 'speedUp'
  | 'guardUp'
  | 'healUp';

export type ActivityMetric =
  | 'dailyBattles'
  | 'dailyWins'
  | 'dailyPveClears'
  | 'dailyGrowths'
  | 'dailyEquipmentUpgrades'
  | 'dailyRewardsClaimed'
  | 'weeklyBattles'
  | 'weeklyWins'
  | 'weeklyPveClears'
  | 'weeklyGrowths'
  | 'collectionCount'
  | 'bestScore';

export type AppTab = 'home' | 'characters' | 'team' | 'equipment' | 'reports' | 'ranking' | 'missions';

export interface StatBlock {
  hp: number;
  attack: number;
  defense: number;
  speed: number;
  critRate: number;
  critDamage: number;
  accuracy: number;
  evasion: number;
  resistance: number;
}

export interface PassiveEffectDefinition {
  kind:
    | 'statBonus'
    | 'battleStartShield'
    | 'battleStartStatus'
    | 'healBoost'
    | 'damageReduction'
    | 'backlineHunter'
    | 'lifesteal'
    | 'lowHpGuard'
    | 'execute'
    | 'selfRegen'
    | 'critBleed'
    | 'onUltimateHealLowest';
  target?: 'self' | 'allies' | 'frontlineAllies' | 'backlineAllies';
  mode?: 'flat' | 'percent';
  stats?: Partial<StatBlock>;
  value?: number;
  threshold?: number;
  duration?: number;
  statusKind?: StatusEffectKind;
}

export interface PassiveDefinition {
  id: string;
  name: string;
  description: string;
  effects: PassiveEffectDefinition[];
}

export interface SkillStatusPayload {
  kind: StatusEffectKind;
  chance: number;
  value: number;
  duration: number;
}

export interface SkillActionDefinition {
  kind: 'attack' | 'heal' | 'shield' | 'buff' | 'cleanse';
  target: SkillTarget;
  scaling?: number;
  basedOn?: 'attack' | 'maxHp';
  hits?: number;
  ignoreDefense?: number;
  status?: SkillStatusPayload;
  buffKind?: Extract<StatusEffectKind, 'attackUp' | 'speedUp' | 'guardUp' | 'healUp'>;
  cleanseCount?: number;
}

export interface SkillDefinition {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  priority: number;
  actions: SkillActionDefinition[];
}

export interface CharacterDefinition {
  id: string;
  name: string;
  epithet: string;
  role: CharacterRole;
  rarity: Rarity;
  summary: string;
  artAccent: string;
  baseStats: StatBlock;
  passive: PassiveDefinition;
  activeSkills: [SkillDefinition, SkillDefinition];
  ultimate: SkillDefinition;
}

export interface UserCharacter {
  id: string;
  definitionId: string;
  level: number;
  stars: number;
  growthRank: number;
  equipmentIds: Partial<Record<EquipmentSlot, string>>;
  bonusStats: Partial<StatBlock>;
  wins: number;
  battles: number;
}

export interface EquipmentEffectDefinition {
  kind:
    | 'lowHpShield'
    | 'critBleed'
    | 'battleStartSpeed'
    | 'healingBoost'
    | 'damageReduction'
    | 'battleStartShield'
    | 'lifesteal'
    | 'statusWard';
  value: number;
  threshold?: number;
  duration?: number;
}

export interface EquipmentDefinition {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  description: string;
  statBonuses: Partial<StatBlock>;
  effect?: EquipmentEffectDefinition;
}

export interface UserEquipment {
  id: string;
  definitionId: string;
  level: number;
  equippedByCharacterId?: string;
  locked: boolean;
}

export interface TeamSlot {
  slotId: TeamSlotId;
  characterId?: string;
}

export interface TeamPreset {
  id: string;
  name: string;
  formation: TeamFormation;
  slots: TeamSlot[];
}

export interface Reward {
  id: string;
  type: RewardType;
  amount?: number;
  equipmentDefinitionId?: string;
  label: string;
  rarity?: Rarity;
}

export interface BattleLog {
  turn: number;
  type: 'action' | 'damage' | 'heal' | 'status' | 'system';
  actorName: string;
  text: string;
}

export interface BattleSummary {
  id: string;
  mode: BattleMode;
  result: BattleResult;
  opponent: {
    id: string;
    name: string;
    teamName: string;
    tier: TierName;
    score: number;
  };
  happenedAt: number;
  turnCount: number;
  survivors: {
    ally: number;
    enemy: number;
  };
  totalDamage: number;
  totalHealing: number;
  mvpCharacterId: string;
  keyLog: string[];
  defeatReason: string;
  rewards: Reward[];
  tierDelta: number;
  logs: BattleLog[];
}

export interface Mission {
  id: string;
  cadence: 'daily' | 'weekly';
  title: string;
  description: string;
  metric: ActivityMetric;
  target: number;
  rewards: Reward[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  metric: ActivityMetric;
  target: number;
  rewards: Reward[];
}

export interface PvEStage {
  stage: number;
  recommendedPower: number;
  rivalId: string;
  rewardTable: Reward[];
}

export interface PvEDungeonDefinition {
  id: string;
  name: string;
  description: string;
  stages: PvEStage[];
}

export interface PvERun {
  id: string;
  dungeonId: string;
  stage: number;
  result: BattleResult;
  summaryId: string;
  happenedAt: number;
  rewards: Reward[];
}

export interface RankingEntry {
  rank: number;
  userId: string;
  displayName: string;
  tier: TierName;
  score: number;
  winRate: number;
  teamPower: number;
  isCurrentUser: boolean;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  tier: TierName;
  score: number;
  bestScore: number;
  level: number;
  experience: number;
  currencies: {
    gold: number;
    growth: number;
    gearCore: number;
    arenaToken: number;
    gem: number;
  };
  seasonId: string;
  guildName: string;
  title: string;
  avatarFrame: string;
}

export interface CollectionState {
  discoveredCharacterIds: string[];
  discoveredEquipmentDefinitionIds: string[];
}

export interface MissionBoardState {
  dailyClaimedIds: string[];
  weeklyClaimedIds: string[];
  achievementClaimedIds: string[];
}

export interface ActivityCounters {
  dailyKey: string;
  weeklyKey: string;
  dailyBattles: number;
  dailyWins: number;
  dailyPveClears: number;
  dailyGrowths: number;
  dailyEquipmentUpgrades: number;
  dailyRewardsClaimed: number;
  weeklyBattles: number;
  weeklyWins: number;
  weeklyPveClears: number;
  weeklyGrowths: number;
  totalBattles: number;
  totalWins: number;
  totalLosses: number;
}

export interface DailyLoginState {
  lastClaimedDay: string;
  streak: number;
}

export interface SeasonState {
  id: string;
  name: string;
  endsAt: number;
  subtitle: string;
}

export interface RivalProfile {
  id: string;
  name: string;
  teamName: string;
  tier: TierName;
  score: number;
  members: Array<{
    definitionId: string;
    level: number;
    slotId: TeamSlotId;
    equipmentDefinitionIds: string[];
  }>;
  winRateHint: number;
}

export interface AutoPvpSaveState {
  version: number;
  userProfile: UserProfile;
  roster: UserCharacter[];
  inventory: UserEquipment[];
  teamPresets: TeamPreset[];
  activeTeamId: string;
  battleReports: BattleSummary[];
  pendingRewards: Reward[];
  pveRuns: PvERun[];
  missionBoard: MissionBoardState;
  collection: CollectionState;
  activity: ActivityCounters;
  dailyLogin: DailyLoginState;
  season: SeasonState;
  lastProcessedAt: number;
  lastOpenedAt: number;
}

export interface OfflineProgressResult {
  simulatedBattles: number;
  cappedDurationMs: number;
  reports: BattleSummary[];
}

export interface ResolvedStats extends StatBlock {
  healBoost: number;
  damageReduction: number;
  lifesteal: number;
}

export interface TeamAnalysis {
  power: number;
  notes: string[];
  missingRoles: CharacterRole[];
}

export interface MissionStatus {
  definition: Mission | Achievement;
  progress: number;
  target: number;
  completed: boolean;
  claimed: boolean;
}

export interface TodaySummary {
  battles: number;
  wins: number;
  losses: number;
  winRate: number;
  tierDelta: number;
  standoutCharacterId?: string;
  recentLoot: Reward[];
  defeatReasons: string[];
  recommendedActions: string[];
}
