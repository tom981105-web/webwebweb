import type {
  MetaUpgradeId,
  PanelRarityDefinition,
  PanelTierDefinition,
  PanelTierId,
  SpecialEffectId,
  SymbolDefinition,
} from '@/types/game';

export const GAME_VERSION = 1;
export const SAVE_STORAGE_PREFIX = 'relic-seal-save';
export const OFFLINE_CAP_MS = 1000 * 60 * 60 * 8;
export const AUTOSAVE_INTERVAL_MS = 2500;
export const TICK_INTERVAL_MS = 100;
export const PANEL_SYMBOL_SLOTS = 6;
export const RECENT_LOG_LIMIT = 10;

export const TUTORIAL_MESSAGES = [
  '패널을 문질러 숨겨진 룬을 드러내세요.',
  '보상 코인으로 업그레이드를 구입하세요.',
  '자동화를 해금하면 성장이 훨씬 빨라집니다.',
];

export const PANEL_TIERS: Record<PanelTierId, PanelTierDefinition> = {
  basic: {
    id: 'basic',
    name: '기본 패널',
    flavor: '처음 손맛을 익히기에 좋은 얇은 봉인막입니다.',
    cost: 10,
    baseReward: 16,
    expectedValue: 1.2,
    revealThreshold: 55,
    rarityWeights: { common: 50, uncommon: 27, rare: 13, epic: 6, legendary: 3, mythic: 1 },
    specialWeights: { none: 72, jackpot: 6, echo: 8, surge: 7, omen: 4, curse: 3 },
  },
  advanced: {
    id: 'advanced',
    name: '고급 패널',
    flavor: '룬의 반짝임이 짙어져 희귀 결과가 자주 스며듭니다.',
    cost: 68,
    baseReward: 104,
    expectedValue: 1.22,
    revealThreshold: 53,
    rarityWeights: { common: 33, uncommon: 28, rare: 20, epic: 11, legendary: 6, mythic: 2 },
    specialWeights: { none: 66, jackpot: 8, echo: 8, surge: 9, omen: 6, curse: 3 },
  },
  rare: {
    id: 'rare',
    name: '희귀 패널',
    flavor: '보상과 조합이 본격적으로 살아나는 중반 핵심 구간입니다.',
    cost: 330,
    baseReward: 510,
    expectedValue: 1.25,
    revealThreshold: 51,
    rarityWeights: { common: 21, uncommon: 27, rare: 24, epic: 16, legendary: 9, mythic: 3 },
    specialWeights: { none: 58, jackpot: 10, echo: 9, surge: 10, omen: 8, curse: 5 },
  },
  legendary: {
    id: 'legendary',
    name: '전설 패널',
    flavor: '한 번의 공개가 성장 방향을 크게 바꿀 수 있는 상위 패널입니다.',
    cost: 1560,
    baseReward: 2520,
    expectedValue: 1.29,
    revealThreshold: 49,
    rarityWeights: { common: 8, uncommon: 16, rare: 27, epic: 24, legendary: 17, mythic: 8 },
    specialWeights: { none: 52, jackpot: 12, echo: 10, surge: 12, omen: 9, curse: 5 },
  },
  mythic: {
    id: 'mythic',
    name: '신화 패널',
    flavor: '거대한 보상과 강한 광원 연출을 품은 최상위 패널입니다.',
    cost: 7100,
    baseReward: 12200,
    expectedValue: 1.33,
    revealThreshold: 47,
    rarityWeights: { common: 3, uncommon: 10, rare: 22, epic: 25, legendary: 25, mythic: 15 },
    specialWeights: { none: 46, jackpot: 15, echo: 11, surge: 12, omen: 10, curse: 6 },
  },
};

export const PANEL_RARITIES: Record<string, PanelRarityDefinition> = {
  common: { id: 'common', label: '평범', multiplier: 1, glow: 'rgba(255,255,255,0.22)' },
  uncommon: { id: 'uncommon', label: '희미', multiplier: 1.24, glow: 'rgba(83,211,194,0.28)' },
  rare: { id: 'rare', label: '희귀', multiplier: 1.72, glow: 'rgba(113,217,255,0.34)' },
  epic: { id: 'epic', label: '영롱', multiplier: 2.42, glow: 'rgba(169,140,255,0.4)' },
  legendary: { id: 'legendary', label: '전설', multiplier: 3.5, glow: 'rgba(242,205,114,0.46)' },
  mythic: { id: 'mythic', label: '신화', multiplier: 5.28, glow: 'rgba(255,122,162,0.5)' },
};

export const SYMBOL_DEFINITIONS: Record<string, SymbolDefinition> = {
  coin: { id: 'coin', icon: '◉', label: '코인', family: 'fortune', weight: 22, rarityBias: 0.2 },
  star: { id: 'star', icon: '✦', label: '별문', family: 'celestial', weight: 18, rarityBias: 0.8 },
  moon: { id: 'moon', icon: '☾', label: '월흔', family: 'celestial', weight: 16, rarityBias: 0.6 },
  gem: { id: 'gem', icon: '◆', label: '보석핵', family: 'fortune', weight: 14, rarityBias: 1 },
  skull: { id: 'skull', icon: '✕', label: '균열흔', family: 'curse', weight: 9, rarityBias: -0.3 },
  clover: { id: 'clover', icon: '✤', label: '행운잎', family: 'fortune', weight: 11, rarityBias: 1.2 },
  crown: { id: 'crown', icon: '♛', label: '왕관룬', family: 'royal', weight: 7, rarityBias: 1.8 },
  relic: { id: 'relic', icon: '⬡', label: '유물핵', family: 'royal', weight: 3, rarityBias: 2.4 },
};

export const SPECIAL_EFFECTS: Record<SpecialEffectId, { label: string; description: string; modifier: number }> = {
  none: { label: '잔향 없음', description: '추가 변조 없이 안정적인 결과가 나옵니다.', modifier: 1 },
  jackpot: { label: '황금 공명', description: '완전 일치 계열 보상이 크게 강화됩니다.', modifier: 1.24 },
  echo: { label: '메아리 룬', description: '이번 패널이 남기는 여운이 보상을 살짝 밀어 올립니다.', modifier: 1.12 },
  surge: { label: '광채 폭주', description: '고점 보상이 터질 확률이 조금 더 살아납니다.', modifier: 1.18 },
  omen: { label: '예언 조각', description: '희귀 룬과 높은 등급 결과가 더 자주 연결됩니다.', modifier: 1.1 },
  curse: { label: '균열 저주', description: '해골 문양이 많을수록 보상이 크게 깎입니다.', modifier: 0.84 },
};

export const PRESTIGE_BASE_REQUIREMENT = 30000;

export const META_UPGRADE_DEFAULTS: Record<MetaUpgradeId, number> = {
  legacyMint: 0,
  fortuneAtlas: 0,
  awakenedServo: 0,
  freeSigil: 0,
};

export const INITIAL_UPGRADES = {
  brushRadius: 0,
  scratchFlow: 0,
  payoutBoost: 0,
  rareSight: 0,
  revealEase: 0,
  criticalGleam: 0,
  jackpotLens: 0,
  autoBuyer: 0,
  autoScratch: 0,
  autoReveal: 0,
  autoLoop: 0,
  droneRig: 0,
  offlineLedger: 0,
  glimmerBeacon: 0,
};

export const INITIAL_SETTINGS = {
  reducedMotion: false,
  compactNumbers: true,
  showTooltips: true,
};

export const INITIAL_STATS = {
  totalCoinsEarned: 0,
  totalPanelsScratched: 0,
  highestReward: 0,
  rareSymbolsFound: 0,
  automationCoinsEarned: 0,
  prestigeCount: 0,
  totalScratchDistance: 0,
  totalManualReveals: 0,
  tierRewards: { basic: 0, advanced: 0, rare: 0, legendary: 0, mythic: 0 },
  tierOpenCount: { basic: 0, advanced: 0, rare: 0, legendary: 0, mythic: 0 },
};

export const MARKET_MOOD_CYCLE = [
  { id: 'calm', label: '고요한 금고', multiplier: 1 },
  { id: 'bright', label: '빛나는 파동', multiplier: 1.12 },
  { id: 'frenzy', label: '과열 공명', multiplier: 1.24 },
  { id: 'omen', label: '불안한 그림자', multiplier: 0.92 },
] as const;
