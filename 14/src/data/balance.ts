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
  '자동화를 해금하면 더 빠르게 성장합니다.',
];

export const PANEL_TIERS: Record<PanelTierId, PanelTierDefinition> = {
  basic: {
    id: 'basic',
    name: '기본 패널',
    flavor: '처음 손맛을 익히는 가벼운 봉인판입니다.',
    cost: 12,
    baseReward: 16,
    expectedValue: 1.08,
    revealThreshold: 56,
    rarityWeights: { common: 55, uncommon: 25, rare: 12, epic: 5, legendary: 2.5, mythic: 0.5 },
    specialWeights: { none: 74, jackpot: 5, echo: 7, surge: 6, omen: 4, curse: 4 },
  },
  advanced: {
    id: 'advanced',
    name: '고급 패널',
    flavor: '빛나는 문양과 함께 희귀 심볼이 조금 더 고개를 듭니다.',
    cost: 90,
    baseReward: 118,
    expectedValue: 1.12,
    revealThreshold: 54,
    rarityWeights: { common: 38, uncommon: 27, rare: 18, epic: 10, legendary: 5, mythic: 2 },
    specialWeights: { none: 69, jackpot: 7, echo: 7, surge: 8, omen: 5, curse: 4 },
  },
  rare: {
    id: 'rare',
    name: '희귀 패널',
    flavor: '희귀 룬 조합과 배율이 본격적으로 살아나는 구간입니다.',
    cost: 480,
    baseReward: 640,
    expectedValue: 1.16,
    revealThreshold: 52,
    rarityWeights: { common: 24, uncommon: 27, rare: 22, epic: 15, legendary: 9, mythic: 3 },
    specialWeights: { none: 61, jackpot: 9, echo: 8, surge: 9, omen: 7, curse: 6 },
  },
  legendary: {
    id: 'legendary',
    name: '전설 패널',
    flavor: '자동화와 고배율이 동시에 존재감을 드러내는 상위 등급입니다.',
    cost: 2400,
    baseReward: 3300,
    expectedValue: 1.19,
    revealThreshold: 50,
    rarityWeights: { common: 10, uncommon: 18, rare: 27, epic: 22, legendary: 16, mythic: 7 },
    specialWeights: { none: 56, jackpot: 11, echo: 9, surge: 11, omen: 7, curse: 6 },
  },
  mythic: {
    id: 'mythic',
    name: '신화 패널',
    flavor: '거대한 배율과 유물 공명을 품은 최상위 유물 패널입니다.',
    cost: 12000,
    baseReward: 17200,
    expectedValue: 1.23,
    revealThreshold: 48,
    rarityWeights: { common: 4, uncommon: 12, rare: 23, epic: 25, legendary: 24, mythic: 12 },
    specialWeights: { none: 50, jackpot: 13, echo: 10, surge: 11, omen: 9, curse: 7 },
  },
};

export const PANEL_RARITIES: Record<string, PanelRarityDefinition> = {
  common: { id: 'common', label: '평범', multiplier: 1, glow: 'rgba(255,255,255,0.22)' },
  uncommon: { id: 'uncommon', label: '희미', multiplier: 1.24, glow: 'rgba(83,211,194,0.28)' },
  rare: { id: 'rare', label: '희귀', multiplier: 1.72, glow: 'rgba(113,217,255,0.34)' },
  epic: { id: 'epic', label: '영롱', multiplier: 2.4, glow: 'rgba(169,140,255,0.4)' },
  legendary: { id: 'legendary', label: '전설', multiplier: 3.45, glow: 'rgba(242,205,114,0.46)' },
  mythic: { id: 'mythic', label: '신화', multiplier: 5.2, glow: 'rgba(255,122,162,0.5)' },
};

export const SYMBOL_DEFINITIONS: Record<string, SymbolDefinition> = {
  coin: { id: 'coin', icon: '◌', label: '금전', family: 'fortune', weight: 22, rarityBias: 0.2 },
  star: { id: 'star', icon: '✦', label: '별빛', family: 'celestial', weight: 18, rarityBias: 0.8 },
  moon: { id: 'moon', icon: '☾', label: '달무늬', family: 'celestial', weight: 16, rarityBias: 0.6 },
  gem: { id: 'gem', icon: '◆', label: '보석핵', family: 'fortune', weight: 14, rarityBias: 1 },
  skull: { id: 'skull', icon: '✕', label: '균열흔', family: 'curse', weight: 9, rarityBias: -0.3 },
  clover: { id: 'clover', icon: '✤', label: '행운엽', family: 'fortune', weight: 11, rarityBias: 1.2 },
  crown: { id: 'crown', icon: '♛', label: '왕관인', family: 'royal', weight: 7, rarityBias: 1.8 },
  relic: { id: 'relic', icon: '✧', label: '유물핵', family: 'royal', weight: 3, rarityBias: 2.4 },
};

export const SPECIAL_EFFECTS: Record<SpecialEffectId, { label: string; description: string; modifier: number }> = {
  none: { label: '잔온 없음', description: '추가 변동 없이 안정적인 결과를 냅니다.', modifier: 1 },
  jackpot: { label: '왕관 폭주', description: '완전 일치에 가까울수록 더 큰 배율을 얻습니다.', modifier: 1.24 },
  echo: { label: '메아리 공명', description: '다음 패널의 희귀 체감이 조금 더 살아납니다.', modifier: 1.14 },
  surge: { label: '급등 분출', description: '패널 보상과 크리티컬 계수를 함께 밀어 올립니다.', modifier: 1.18 },
  omen: { label: '예언 조각', description: '희귀 결과와 룬 조합이 살짝 더 잘 이어집니다.', modifier: 1.12 },
  curse: { label: '균열 저주', description: '저주 흔적이 많을수록 보상이 줄어듭니다.', modifier: 0.84 },
};

export const PRESTIGE_BASE_REQUIREMENT = 120000;

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
  { id: 'calm', label: '고요한 창고', multiplier: 1 },
  { id: 'bright', label: '빛나는 진동', multiplier: 1.14 },
  { id: 'frenzy', label: '분출 공명', multiplier: 1.28 },
  { id: 'omen', label: '불안한 그림자', multiplier: 0.92 },
] as const;
