export const STORAGE_KEY = 'auto_pvp_prototype_save_v1';
export const SAVE_VERSION = 1;
export const OFFLINE_CAP_MS = 1000 * 60 * 60 * 12;
export const BATTLE_INTERVAL_MS = 1000 * 60 * 20;
export const MAX_BATTLE_TURNS = 18;
export const MAX_BATTLE_REPORTS = 36;
export const MAX_KEY_LOGS = 8;
export const DAILY_LOGIN_REWARD_GOLD = 420;
export const DAILY_LOGIN_REWARD_GROWTH = 55;

export const TEAM_SLOT_ORDER = ['front-1', 'front-2', 'front-3', 'back-1', 'back-2'] as const;
export const FORMATION_LABELS = {
  balanced: '균형 진형',
  assault: '돌파 진형',
  sustain: '유지 진형',
} as const;

export const ROLE_LABELS = {
  tank: '탱커',
  bruiser: '브루저',
  assassin: '암살자',
  ranger: '원거리 딜러',
  mage: '메이지',
  healer: '힐러',
  support: '서포터',
} as const;

export const RARITY_LABELS = {
  common: '일반',
  advanced: '고급',
  rare: '희귀',
  epic: '영웅',
  legendary: '전설',
} as const;

export const EQUIPMENT_SLOT_LABELS = {
  weapon: '무기',
  armor: '방어구',
  accessory: '장신구',
} as const;

export const TIER_RULES = [
  { tier: 'Bronze', minScore: 0, accent: '#b97e60' },
  { tier: 'Silver', minScore: 1000, accent: '#bfc9da' },
  { tier: 'Gold', minScore: 1200, accent: '#f2c46c' },
  { tier: 'Platinum', minScore: 1420, accent: '#74d7d1' },
  { tier: 'Diamond', minScore: 1640, accent: '#9bb4ff' },
] as const;

export const QUICK_BATTLE_OPTIONS = [3, 10] as const;
