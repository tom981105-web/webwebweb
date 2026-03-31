export type PanelTierId = 'basic' | 'advanced' | 'rare' | 'legendary' | 'mythic';
export type PanelRarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type SymbolId = 'coin' | 'star' | 'moon' | 'gem' | 'skull' | 'clover' | 'crown' | 'relic';
export type SpecialEffectId = 'none' | 'jackpot' | 'echo' | 'surge' | 'omen' | 'curse';
export type ToastTone = 'reward' | 'rare' | 'warning' | 'system';

export type PanelSpecialEffect = {
  id: SpecialEffectId;
  label: string;
  description: string;
  modifier: number;
};

export type PanelCard = {
  id: string;
  tier: PanelTierId;
  rarity: PanelRarityId;
  costPaid: number;
  symbols: SymbolId[];
  reward: number;
  previewReward: number;
  scratchedPercent: number;
  revealed: boolean;
  autoRevealThreshold: number;
  createdAt: number;
  seed: number;
  specialEffect: PanelSpecialEffect;
  comboLabel: string;
  statusLine: string;
};

export type ResultLogEntry = {
  id: string;
  tier: PanelTierId;
  rarity: PanelRarityId;
  reward: number;
  netProfit: number;
  comboLabel: string;
  specialLabel: string;
  createdAt: number;
};

export type UpgradeCategory = 'manual' | 'fortune' | 'automation' | 'utility';
export type UpgradeKind = 'level' | 'unlock';

export type UpgradeId =
  | 'brushRadius'
  | 'scratchFlow'
  | 'payoutBoost'
  | 'rareSight'
  | 'revealEase'
  | 'criticalGleam'
  | 'jackpotLens'
  | 'autoBuyer'
  | 'autoScratch'
  | 'autoReveal'
  | 'autoLoop'
  | 'droneRig'
  | 'offlineLedger'
  | 'glimmerBeacon';

export type MetaUpgradeId = 'legacyMint' | 'fortuneAtlas' | 'awakenedServo' | 'freeSigil';

export type UpgradeDefinition = {
  id: UpgradeId;
  name: string;
  kind: UpgradeKind;
  category: UpgradeCategory;
  description: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  effectLabel: string;
  unlockAtCoins: number;
  unlockAtScratches?: number;
  unlockAtPrestige?: number;
};

export type MetaUpgradeDefinition = {
  id: MetaUpgradeId;
  name: string;
  description: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
  effectLabel: string;
};

export type PanelTierDefinition = {
  id: PanelTierId;
  name: string;
  flavor: string;
  cost: number;
  baseReward: number;
  expectedValue: number;
  revealThreshold: number;
  rarityWeights: Record<PanelRarityId, number>;
  specialWeights: Record<SpecialEffectId, number>;
};

export type PanelRarityDefinition = {
  id: PanelRarityId;
  label: string;
  multiplier: number;
  glow: string;
};

export type SymbolDefinition = {
  id: SymbolId;
  icon: string;
  label: string;
  family: 'fortune' | 'celestial' | 'royal' | 'curse';
  weight: number;
  rarityBias: number;
};

export type MarketMood = 'calm' | 'bright' | 'frenzy' | 'omen';

export type StatsState = {
  totalCoinsEarned: number;
  totalPanelsScratched: number;
  highestReward: number;
  rareSymbolsFound: number;
  automationCoinsEarned: number;
  prestigeCount: number;
  totalScratchDistance: number;
  totalManualReveals: number;
  tierRewards: Record<PanelTierId, number>;
  tierOpenCount: Record<PanelTierId, number>;
};

export type SettingsState = {
  reducedMotion: boolean;
  compactNumbers: boolean;
  showTooltips: boolean;
};

export type TutorialState = {
  dismissed: boolean;
  step: number;
};

export type ScratchFeedback = {
  id: string;
  label: string;
  tone: ToastTone;
};

export type GameSaveState = {
  version: number;
  coins: number;
  resonanceDust: number;
  selectedTier: PanelTierId;
  currentPanel: PanelCard | null;
  upgrades: Record<UpgradeId, number>;
  metaUpgrades: Record<MetaUpgradeId, number>;
  stats: StatsState;
  recentResults: ResultLogEntry[];
  settings: SettingsState;
  tutorial: TutorialState;
  sessionId: string;
  lastSavedAt: number;
  lastOpenedAt: number;
};

export type GameComputed = {
  brushRadius: number;
  scratchPower: number;
  revealThreshold: number;
  payoutMultiplier: number;
  critChance: number;
  critMultiplier: number;
  jackpotMultiplier: number;
  rareBoost: number;
  autoBuyEnabled: boolean;
  autoScratchEnabled: boolean;
  autoRevealEnabled: boolean;
  autoLoopEnabled: boolean;
  autoScratchPerSecond: number;
  autoBuyIntervalMs: number;
  offlineEfficiency: number;
  currentCpsEstimate: number;
  manualStrengthScore: number;
};

export type PrestigePreview = {
  dustGain: number;
  nextMilestone: number;
  canPrestige: boolean;
};

export type UpgradeCardState = {
  definition: UpgradeDefinition;
  level: number;
  price: number;
  locked: boolean;
  affordable: boolean;
};

export type MetaUpgradeCardState = {
  definition: MetaUpgradeDefinition;
  level: number;
  price: number;
  affordable: boolean;
};
