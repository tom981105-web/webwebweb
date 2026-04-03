export type NavView =
  | 'dashboard'
  | 'equipment'
  | 'enhancement'
  | 'research'
  | 'crafting'
  | 'expeditions'
  | 'workshop'
  | 'collection'
  | 'shop'
  | 'records'
  | 'settings';

export type ResourceId =
  | 'gold'
  | 'dataShards'
  | 'alloyScrap'
  | 'probabilityCores'
  | 'fameBadges'
  | 'relicFragments';

export type MaterialId =
  | 'stabilityFiber'
  | 'coolantGel'
  | 'phaseLens'
  | 'entropyResidue'
  | 'mnemonicDust'
  | 'sigilSteel'
  | 'voidCircuit'
  | 'relicResidue';

export type ItemId =
  | 'protectionTicket'
  | 'probabilityAmplifier'
  | 'stabilityDevice'
  | 'coolant'
  | 'distortionDice'
  | 'durabilityKit'
  | 'researchBooster'
  | 'expeditionAccelerator';

export type FacilityId =
  | 'enhancementBay'
  | 'researchLab'
  | 'dismantleBay'
  | 'fabricationBay'
  | 'vault'
  | 'expeditionControl'
  | 'automationLine';

export type EquipmentType = 'weapon' | 'armor' | 'auxiliary' | 'artifact' | 'core' | 'relic';
export type EquipmentGrade = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type ControlModeId = 'general' | 'stable' | 'focused' | 'wild' | 'pity' | 'reversal' | 'guard' | 'auto';
export type ResearchCategory = 'enhancement' | 'protection' | 'probability' | 'automation' | 'expedition' | 'relic' | 'commerce';
export type RecipeCategory = 'equipment' | 'utility' | 'recombination';
export type LogType = 'system' | 'enhance' | 'research' | 'expedition' | 'craft' | 'mission' | 'achievement';
export type LogTone = 'good' | 'bad' | 'neutral';
export type StatKey =
  | 'enhanceAttempts'
  | 'enhanceSuccesses'
  | 'enhanceFailures'
  | 'highestEnhancement'
  | 'researchCompleted'
  | 'expeditionsCompleted'
  | 'itemsCrafted'
  | 'itemsDismantled'
  | 'legendaryFinds'
  | 'equipmentDiscovered'
  | 'goldEarned'
  | 'missionsClaimed'
  | 'collectionScore';

export type ResourceState = Record<ResourceId, number>;
export type MaterialState = Record<MaterialId, number>;
export type ItemInventory = Record<ItemId, number>;

export type PassiveBonuses = {
  successRate: number;
  researchSpeed: number;
  expeditionYield: number;
  dismantleYield: number;
  heatMitigation: number;
  offlineEfficiency: number;
  protectionChance: number;
  craftQuality: number;
  stabilityRecovery: number;
};

export type AccountStats = Record<StatKey, number>;

export type AccountRecords = {
  highestEnhancement: number;
  highestWorkshopPower: number;
  bestExpeditionRegionId: string;
  longestSuccessStreak: number;
  longestFailureStreak: number;
  totalSessions: number;
};

export type AccountState = {
  level: number;
  xp: number;
  fame: number;
  selectedTitleId: string;
  unlockedTitles: string[];
  permanentBonuses: PassiveBonuses;
  records: AccountRecords;
  stats: AccountStats;
};

export type EquipmentAffix = {
  key: string;
  label: string;
  value: number;
  unit: '%' | 'flat';
};

export type EquipmentInstance = {
  id: string;
  templateId: string;
  name: string;
  type: EquipmentType;
  grade: EquipmentGrade;
  quality: number;
  enhancement: number;
  durability: number;
  maxDurability: number;
  heat: number;
  stability: number;
  options: EquipmentAffix[];
  traits: string[];
  moduleSlots: number;
  modules: string[];
  setId: string | null;
  uniqueEffect: string;
  role: string;
  equipped: boolean;
  createdAt: number;
  source: string;
  blockedUntil: number;
  protectionCharges: number;
};

export type FacilityState = {
  level: number;
};

export type ActiveResearch = {
  id: string;
  researchId: string;
  startedAt: number;
  endsAt: number;
};

export type ActiveExpedition = {
  id: string;
  regionId: string;
  slotIndex: number;
  startedAt: number;
  endsAt: number;
  seed: number;
};

export type MissionProgress = {
  id: string;
  progress: number;
  claimed: boolean;
};

export type CollectionState = {
  equipmentTemplates: string[];
  materials: MaterialId[];
  regions: string[];
  achievementClaims: string[];
  setRewardClaims: string[];
};

export type AutomationUnlocks = {
  enhanceQueue: boolean;
  autoDismantle: boolean;
  autoCraft: boolean;
  autoExpedition: boolean;
  offlineRewards: boolean;
};

export type AutomationSettings = {
  enhanceEnabled: boolean;
  controlMode: ControlModeId;
  targetEnhancement: number;
  maxHeat: number;
  minDurability: number;
  autoDismantleEnabled: boolean;
  dismantleBelowGrade: EquipmentGrade;
  autoCraftEnabled: boolean;
  autoExpeditionEnabled: boolean;
  expeditionRegionId: string;
  useProtection: boolean;
};

export type AutomationState = {
  unlocks: AutomationUnlocks;
  settings: AutomationSettings;
  lastAutomationAt: number;
};

export type SettingsState = {
  reducedMotion: boolean;
  compactNumbers: boolean;
  advancedTooltips: boolean;
};

export type LogEntry = {
  id: string;
  at: number;
  type: LogType;
  tone: LogTone;
  message: string;
};

export type SessionState = {
  successStreak: number;
  failureStreak: number;
  lastActionAt: number;
  lastDailyKey: string;
  lastWeeklyKey: string;
  amplifierCharges: number;
  distortionStacks: number;
};

export type OfflineSummary = {
  durationMs: number;
  goldEarned: number;
  materialsGained: Partial<MaterialState>;
  expeditionsFinished: number;
  researchFinished: number;
};

export type SeasonState = {
  currentSeasonId: string;
  currency: number;
  missions: MissionProgress[];
  claimedRewards: string[];
  startedAt: number;
};

export type GameSaveState = {
  version: number;
  createdAt: number;
  lastSavedAt: number;
  lastOpenedAt: number;
  selectedView: NavView;
  selectedEquipmentId: string | null;
  selectedControlMode: ControlModeId;
  account: AccountState;
  currencies: ResourceState;
  materials: MaterialState;
  items: ItemInventory;
  facilities: Record<FacilityId, FacilityState>;
  equipments: EquipmentInstance[];
  loadout: Record<EquipmentType, string | null>;
  researchLevels: Record<string, number>;
  activeResearch: ActiveResearch[];
  expeditions: ActiveExpedition[];
  automation: AutomationState;
  missions: {
    dailySeed: string;
    weeklySeed: string;
    daily: MissionProgress[];
    weekly: MissionProgress[];
  };
  collections: CollectionState;
  season: SeasonState;
  settings: SettingsState;
  logs: LogEntry[];
  session: SessionState;
};

export type ResourceDefinition = {
  id: ResourceId;
  label: string;
  accent: string;
  description: string;
};

export type MaterialDefinition = {
  id: MaterialId;
  label: string;
  accent: string;
  description: string;
};

export type ItemDefinition = {
  id: ItemId;
  label: string;
  description: string;
  effectText: string;
  shopCost: Partial<ResourceState>;
};

export type FacilityDefinition = {
  id: FacilityId;
  label: string;
  description: string;
  effectText: string;
  baseCost: Partial<ResourceState>;
  maxLevel: number;
};

export type ControlModeDefinition = {
  id: ControlModeId;
  label: string;
  summary: string;
  flavor: string;
  accent: string;
  unlockResearchId?: string;
};

export type EquipmentTemplate = {
  id: string;
  name: string;
  type: EquipmentType;
  grade: EquipmentGrade;
  basePower: number;
  role: string;
  uniqueEffect: string;
  setId: string | null;
  traitPool: string[];
  optionPool: Array<{ key: string; label: string; min: number; max: number; unit: '%' | 'flat' }>;
  moduleSlots: number;
  sources: string[];
};

export type SetDefinition = {
  id: string;
  label: string;
  pieces: string[];
  rewardText: string;
  bonus: Partial<PassiveBonuses>;
  titleId?: string;
};

export type ResearchDefinition = {
  id: string;
  label: string;
  category: ResearchCategory;
  description: string;
  effectText: string;
  maxLevel: number;
  durationMs: number;
  costResources: Partial<ResourceState>;
  costMaterials: Partial<MaterialState>;
};

export type ExpeditionDefinition = {
  id: string;
  label: string;
  description: string;
  durationMs: number;
  difficulty: string;
  requirementPower: number;
  uniqueMaterial: MaterialId;
  uniqueDropTemplateIds: string[];
  rewardResources: Partial<ResourceState>;
  rewardMaterials: Partial<MaterialState>;
  events: string[];
};

export type RecipeDefinition = {
  id: string;
  label: string;
  category: RecipeCategory;
  description: string;
  costResources: Partial<ResourceState>;
  costMaterials: Partial<MaterialState>;
  outputs: {
    resources?: Partial<ResourceState>;
    materials?: Partial<MaterialState>;
    items?: Partial<ItemInventory>;
    equipmentTemplateId?: string;
  };
  unlockFacilityId?: FacilityId;
  unlockFacilityLevel?: number;
  unlockResearchId?: string;
};

export type TitleDefinition = {
  id: string;
  label: string;
  description: string;
  bonusText: string;
  bonus: Partial<PassiveBonuses>;
};

export type RewardPayload = {
  xp?: number;
  fame?: number;
  resources?: Partial<ResourceState>;
  materials?: Partial<MaterialState>;
  items?: Partial<ItemInventory>;
  titleId?: string;
  seasonCurrency?: number;
  permanentBonuses?: Partial<PassiveBonuses>;
};

export type AchievementDefinition = {
  id: string;
  label: string;
  description: string;
  statKey: StatKey;
  target: number;
  reward: RewardPayload;
};

export type MissionDefinition = {
  id: string;
  label: string;
  description: string;
  statKey: StatKey;
  target: number;
  reward: RewardPayload;
};

export type SeasonRewardDefinition = {
  id: string;
  threshold: number;
  label: string;
  reward: RewardPayload;
};

export type EnhancePreview = {
  successChance: number;
  critChance: number;
  goldCost: number;
  alloyCost: number;
  coreCost: number;
  heatGain: number;
  durabilityLoss: number;
  stageDropChance: number;
  blockChance: number;
};

export type DerivedState = {
  workshopPower: number;
  loadoutPower: number;
  equipmentCapacity: number;
  researchSlots: number;
  expeditionSlots: number;
  passiveBonuses: PassiveBonuses;
  automationUnlocks: AutomationUnlocks;
  missionCompletionRate: number;
  collectionCompletionRate: number;
  titleLabel: string;
};
