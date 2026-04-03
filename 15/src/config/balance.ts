import type {
  AutomationSettings,
  AutomationUnlocks,
  ControlModeId,
  EquipmentGrade,
  ItemInventory,
  MaterialState,
  PassiveBonuses,
  ResourceState,
  SettingsState,
} from '@/types/game';

export const SAVE_VERSION = 1;
export const STORAGE_KEY = 'probability_forge_save_v1';
export const LOG_LIMIT = 60;
export const MAX_ENHANCEMENT = 30;
export const OFFLINE_CAP_MS = 1000 * 60 * 60 * 10;

export const EMPTY_RESOURCES: ResourceState = {
  gold: 0,
  dataShards: 0,
  alloyScrap: 0,
  probabilityCores: 0,
  fameBadges: 0,
  relicFragments: 0,
};

export const EMPTY_MATERIALS: MaterialState = {
  stabilityFiber: 0,
  coolantGel: 0,
  phaseLens: 0,
  entropyResidue: 0,
  mnemonicDust: 0,
  sigilSteel: 0,
  voidCircuit: 0,
  relicResidue: 0,
};

export const EMPTY_ITEMS: ItemInventory = {
  protectionTicket: 0,
  probabilityAmplifier: 0,
  stabilityDevice: 0,
  coolant: 0,
  distortionDice: 0,
  durabilityKit: 0,
  researchBooster: 0,
  expeditionAccelerator: 0,
};

export const EMPTY_PASSIVES: PassiveBonuses = {
  successRate: 0,
  researchSpeed: 0,
  expeditionYield: 0,
  dismantleYield: 0,
  heatMitigation: 0,
  offlineEfficiency: 0,
  protectionChance: 0,
  craftQuality: 0,
  stabilityRecovery: 0,
};

export const DEFAULT_AUTOMATION_UNLOCKS: AutomationUnlocks = {
  enhanceQueue: false,
  autoDismantle: false,
  autoCraft: false,
  autoExpedition: false,
  offlineRewards: false,
};

export const DEFAULT_AUTOMATION_SETTINGS: AutomationSettings = {
  enhanceEnabled: false,
  controlMode: 'stable',
  targetEnhancement: 12,
  maxHeat: 65,
  minDurability: 38,
  autoDismantleEnabled: false,
  dismantleBelowGrade: 'rare',
  autoCraftEnabled: false,
  autoExpeditionEnabled: false,
  expeditionRegionId: 'scrap-yard',
  useProtection: true,
};

export const DEFAULT_SETTINGS: SettingsState = {
  reducedMotion: false,
  compactNumbers: false,
  advancedTooltips: true,
};

export const GRADE_MULTIPLIER: Record<EquipmentGrade, number> = {
  common: 1,
  uncommon: 1.12,
  rare: 1.28,
  epic: 1.52,
  legendary: 1.82,
  mythic: 2.2,
};

export const GRADE_COLOR: Record<EquipmentGrade, string> = {
  common: '#9ca3af',
  uncommon: '#7dd3fc',
  rare: '#5ce4c5',
  epic: '#b694ff',
  legendary: '#f9bc5d',
  mythic: '#ff8b6a',
};

export const CONTROL_MODE_NAMES: Record<ControlModeId, string> = {
  general: '일반 제어',
  stable: '안정 제어',
  focused: '집중 제어',
  wild: '난수폭주 제어',
  pity: '누적보정 제어',
  reversal: '역전보정 제어',
  guard: '보호특화 제어',
  auto: '자동화 제어',
};

export function getXpForLevel(level: number) {
  return 120 + (level - 1) * 70;
}

export function getFacilityUpgradeScale(level: number) {
  return 1 + level * 0.62;
}

export function getEnhancementBaseChance(stage: number, grade: EquipmentGrade) {
  const gradePenalty =
    {
      common: 0,
      uncommon: 0.018,
      rare: 0.045,
      epic: 0.085,
      legendary: 0.13,
      mythic: 0.165,
    }[grade] ?? 0;

  let value = 0.93 - stage * 0.022 - gradePenalty;
  if (stage >= 10) value -= 0.045;
  if (stage >= 20) value -= 0.065;
  return value;
}

export function getEnhancementCost(stage: number, grade: EquipmentGrade) {
  const gradeScale = GRADE_MULTIPLIER[grade];
  return {
    gold: Math.round(70 * gradeScale * Math.pow(stage + 1.4, 1.35)),
    alloyScrap: Math.max(4, Math.round(6 * gradeScale * Math.pow(stage + 1.2, 1.15))),
    probabilityCores: stage >= 8 ? Math.max(0, Math.floor((stage - 6) / 4)) : 0,
  };
}

export function getStorageCapacity(vaultLevel: number) {
  return 24 + vaultLevel * 7;
}

export function getResearchSlots(labLevel: number) {
  return 1 + Math.floor(labLevel / 4);
}

export function getExpeditionSlots(controlLevel: number) {
  return 1 + Math.floor(controlLevel / 4);
}

export function getFacilityEffectValue(id: string, level: number) {
  switch (id) {
    case 'enhancementBay':
      return `${(level * 1.8).toFixed(1)}% 고강화 보정`;
    case 'researchLab':
      return `${getResearchSlots(level)} 동시 연구 슬롯`;
    case 'dismantleBay':
      return `${(12 + level * 3).toFixed(0)}% 분해 수율`;
    case 'fabricationBay':
      return `${(6 + level * 2.5).toFixed(0)}% 제작 품질 보너스`;
    case 'vault':
      return `${getStorageCapacity(level)} 보관 한도`;
    case 'expeditionControl':
      return `${getExpeditionSlots(level)} 동시 원정 슬롯`;
    case 'automationLine':
      return `${Math.min(100, 18 + level * 6)} 자동화 지수`;
    default:
      return '-';
  }
}
