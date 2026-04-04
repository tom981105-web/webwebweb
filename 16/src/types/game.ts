export type PrototypeAccessMode = 'open' | 'admin' | 'maintenance';

export type ServiceAccessSettings = {
  board: PrototypeAccessMode;
  mountain: PrototypeAccessMode;
  ai: PrototypeAccessMode;
  stockSim: PrototypeAccessMode;
};

export type PrototypeSlotState = {
  activeKey: string;
};

export type TierId = 'basic' | 'advanced' | 'rare' | 'legendary' | 'mythic';
export type RarityId = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type SymbolId = 'coin' | 'star' | 'moon' | 'gem' | 'skull' | 'clover' | 'crown' | 'relic';
export type UpgradeCategory = 'scratch' | 'reward' | 'automation';
export type FeedbackTone = 'normal' | 'rare' | 'epic' | 'jackpot';

export type SymbolDefinition = {
  id: SymbolId;
  label: string;
  glyph: string;
  description: string;
  accent: string;
};

export type PanelTierDefinition = {
  id: TierId;
  label: string;
  description: string;
  price: number;
  baseRewardMin: number;
  baseRewardMax: number;
  unlockAtTotalCoins: number;
  autoScratchRate: number;
  rarityWeights: Record<RarityId, number>;
  symbolBias: Partial<Record<SymbolId, number>>;
  themeClass: string;
};

export type RarityDefinition = {
  id: RarityId;
  label: string;
  multiplier: number;
  glowClass: string;
  tone: FeedbackTone;
};

export type PanelModifier = {
  id: 'jackpot' | 'omen' | 'fortune-chain' | 'lunar-touch' | 'none';
  label: string;
  description: string;
};

export type PanelRevealResult = {
  finalReward: number;
  baseReward: number;
  critical: boolean;
  multiplier: number;
  jackpot: boolean;
  modifier: PanelModifier['id'];
  rareSymbolCount: number;
  summaryText: string;
  detailText: string;
  tone: FeedbackTone;
};

export type PanelState = {
  id: string;
  tier: TierId;
  rarity: RarityId;
  reward: number;
  symbols: SymbolId[];
  specialEffect: PanelModifier['id'];
  revealed: boolean;
  scratchedPercent: number;
  createdAt: number;
  purchaseCost: number;
  coverSeed: number;
  result: PanelRevealResult;
};

export type UpgradeDefinition = {
  id: string;
  category: UpgradeCategory;
  label: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costScale: number;
  unlockAtTotalCoins?: number;
  unlockAtPrestige?: number;
  kind: 'level' | 'unlock';
  effectLabel: string;
};

export type MetaUpgradeDefinition = {
  id: string;
  label: string;
  description: string;
  maxLevel: number;
  baseCost: number;
  costScale: number;
  effectLabel: string;
};

export type UpgradeProgress = Record<string, number>;
export type MetaUpgradeProgress = Record<string, number>;

export type RecentResultLog = {
  id: string;
  at: number;
  tier: TierId;
  rarity: RarityId;
  reward: number;
  summary: string;
  tone: FeedbackTone;
  automated: boolean;
};

export type StatisticsState = {
  totalCoinsEarned: number;
  totalPanelsOpened: number;
  totalScratchActions: number;
  totalScratchDistance: number;
  bestSingleReward: number;
  rareSymbolsFound: number;
  automatedCoinsEarned: number;
  prestigeCount: number;
  criticalRewards: number;
  jackpotRewards: number;
  perTierOpens: Record<TierId, number>;
  perTierRewards: Record<TierId, number>;
};

export type TutorialState = {
  dismissed: boolean;
};

export type SettingsState = {
  compactNumbers: boolean;
  reducedMotion: boolean;
};

export type FeedbackBurst = {
  id: string;
  label: string;
  amount?: number;
  tone: FeedbackTone;
};

export type AutomationState = {
  lastTickAt: number;
  nextAutoBuyAt: number;
  nextAutoLoopAt: number;
  nextAutoScratchAt: number;
};

export type SaveState = {
  version: number;
  coins: number;
  sigils: number;
  selectedTier: TierId;
  currentPanel: PanelState | null;
  upgrades: UpgradeProgress;
  metaUpgrades: MetaUpgradeProgress;
  stats: StatisticsState;
  recentResults: RecentResultLog[];
  tutorial: TutorialState;
  settings: SettingsState;
  automation: AutomationState;
  lastSavedAt: number;
  lastOpenedAt: number;
};

export type DerivedValues = {
  brushRadius: number;
  scratchEfficiency: number;
  rewardMultiplier: number;
  rareChanceBonus: number;
  autoRevealThreshold: number;
  criticalChance: number;
  jackpotMultiplier: number;
  offlineEfficiency: number;
  autoBuyUnlocked: boolean;
  autoScratchUnlocked: boolean;
  autoLoopUnlocked: boolean;
  autoRevealUnlocked: boolean;
  autoScratchRate: number;
  currentCpsEstimate: number;
  prestigeGain: number;
};

export type GameState = SaveState & {
  hydrated: boolean;
  feedbackBursts: FeedbackBurst[];
  derived: DerivedValues;
  initialize: () => void;
  tick: (deltaMs: number) => void;
  saveNow: () => void;
  dismissTutorial: () => void;
  setSelectedTier: (tier: TierId) => void;
  buyPanel: (tier?: TierId, automated?: boolean) => void;
  updateScratchProgress: (percent: number) => void;
  addScratchDistance: (distance: number) => void;
  revealCurrentPanel: (source: 'manual' | 'auto') => void;
  buyUpgrade: (id: string) => void;
  buyMetaUpgrade: (id: string) => void;
  toggleCompactNumbers: () => void;
  toggleReducedMotion: () => void;
  exportSaveString: () => string;
  importSaveString: (payload: string) => { ok: boolean; error?: string };
  resetProgress: () => void;
  performPrestige: () => void;
  consumeFeedbackBurst: (id: string) => void;
};
