import {
  DEFAULT_AUTOMATION_SETTINGS,
  DEFAULT_AUTOMATION_UNLOCKS,
  DEFAULT_SETTINGS,
  EMPTY_ITEMS,
  EMPTY_MATERIALS,
  EMPTY_PASSIVES,
  EMPTY_RESOURCES,
  SAVE_VERSION,
} from '@/config/balance';
import {
  DAILY_MISSIONS,
  EQUIPMENT_TEMPLATES,
  EXPEDITION_DEFINITIONS,
  SEASON_MISSIONS,
  TITLE_DEFINITIONS,
  WEEKLY_MISSIONS,
} from '@/data';
import type {
  AccountState,
  CollectionState,
  EquipmentAffix,
  EquipmentInstance,
  EquipmentTemplate,
  GameSaveState,
  LogEntry,
  MaterialId,
  MissionProgress,
} from '@/types/game';
import { pickMany, randomInt } from '@/utils/random';
import { getDayKey, getWeekKey } from '@/utils/time';

function createAccountState(): AccountState {
  return {
    level: 1,
    xp: 0,
    fame: 0,
    selectedTitleId: TITLE_DEFINITIONS[0]?.id ?? '',
    unlockedTitles: TITLE_DEFINITIONS[0] ? [TITLE_DEFINITIONS[0].id] : [],
    permanentBonuses: { ...EMPTY_PASSIVES },
    records: {
      highestEnhancement: 0,
      highestWorkshopPower: 0,
      bestExpeditionRegionId: '',
      longestSuccessStreak: 0,
      longestFailureStreak: 0,
      totalSessions: 1,
    },
    stats: {
      enhanceAttempts: 0,
      enhanceSuccesses: 0,
      enhanceFailures: 0,
      highestEnhancement: 0,
      researchCompleted: 0,
      expeditionsCompleted: 0,
      itemsCrafted: 0,
      itemsDismantled: 0,
      legendaryFinds: 0,
      equipmentDiscovered: 0,
      goldEarned: 0,
      missionsClaimed: 0,
      collectionScore: 0,
    },
  };
}

function createCollectionState(): CollectionState {
  return {
    equipmentTemplates: [],
    materials: [],
    regions: [],
    achievementClaims: [],
    setRewardClaims: [],
  };
}

function rollAffixes(template: EquipmentTemplate, quality: number) {
  const rolled = pickMany(template.optionPool, Math.min(template.optionPool.length, 2));
  return rolled.map<EquipmentAffix>((option) => ({
    key: option.key,
    label: option.label,
    unit: option.unit,
    value: randomInt(option.min, option.max) + Math.round((quality - 60) / 8),
  }));
}

export function createEquipmentInstance(template: EquipmentTemplate, source: string, quality = randomInt(58, 92)): EquipmentInstance {
  return {
    id: `${template.id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    templateId: template.id,
    name: template.name,
    type: template.type,
    grade: template.grade,
    quality,
    enhancement: 0,
    durability: 100,
    maxDurability: 100,
    heat: 0,
    stability: 100,
    options: rollAffixes(template, quality),
    traits: pickMany(template.traitPool, Math.min(2, template.traitPool.length)),
    moduleSlots: template.moduleSlots,
    modules: Array.from({ length: template.moduleSlots }, () => '빈 슬롯'),
    setId: template.setId,
    uniqueEffect: template.uniqueEffect,
    role: template.role,
    equipped: false,
    createdAt: Date.now(),
    source,
    blockedUntil: 0,
    protectionCharges: 0,
  };
}

export function createEquipmentFromTemplate(templateId: string, source: string, bonusQuality = 0) {
  const template = EQUIPMENT_TEMPLATES.find((entry) => entry.id === templateId);
  if (!template) {
    throw new Error(`Unknown equipment template: ${templateId}`);
  }
  return createEquipmentInstance(template, source, randomInt(58, 96) + bonusQuality);
}

export function createMissionProgressList(ids: string[]): MissionProgress[] {
  return ids.map((id) => ({ id, progress: 0, claimed: false }));
}

export function createInitialLogs(): LogEntry[] {
  return [
    {
      id: `log_${Date.now()}_welcome`,
      at: Date.now(),
      type: 'system',
      tone: 'neutral',
      message: '공방이 가동을 시작했습니다. 첫 강화와 첫 연구를 준비하세요.',
    },
  ];
}

export function createStarterSave(): GameSaveState {
  const now = Date.now();
  const starterWeapon = createEquipmentFromTemplate('phase-cutter', 'starter-kit', 8);
  const starterArmor = createEquipmentFromTemplate('lucky-filament-suit', 'starter-kit', 6);
  const starterCore = createEquipmentFromTemplate('workshop-heart', 'starter-kit', 4);
  starterWeapon.equipped = true;
  starterArmor.equipped = true;
  starterCore.equipped = true;

  const save: GameSaveState = {
    version: SAVE_VERSION,
    createdAt: now,
    lastSavedAt: now,
    lastOpenedAt: now,
    selectedView: 'dashboard',
    selectedEquipmentId: starterWeapon.id,
    selectedControlMode: 'general',
    account: createAccountState(),
    currencies: {
      ...EMPTY_RESOURCES,
      gold: 900,
      dataShards: 120,
      alloyScrap: 90,
      probabilityCores: 3,
      fameBadges: 4,
    },
    materials: {
      ...EMPTY_MATERIALS,
      stabilityFiber: 12,
      coolantGel: 10,
      phaseLens: 6,
      mnemonicDust: 4,
    },
    items: {
      ...EMPTY_ITEMS,
      coolant: 2,
      stabilityDevice: 1,
      protectionTicket: 1,
    },
    facilities: {
      enhancementBay: { level: 1 },
      researchLab: { level: 1 },
      dismantleBay: { level: 1 },
      fabricationBay: { level: 1 },
      vault: { level: 1 },
      expeditionControl: { level: 1 },
      automationLine: { level: 0 },
    },
    equipments: [
      starterWeapon,
      starterArmor,
      starterCore,
      createEquipmentFromTemplate('relay-visor', 'starter-cache', 2),
      createEquipmentFromTemplate('echo-talisman', 'starter-cache', 2),
    ],
    loadout: {
      weapon: starterWeapon.id,
      armor: starterArmor.id,
      auxiliary: null,
      artifact: null,
      core: starterCore.id,
      relic: null,
    },
    researchLevels: {},
    activeResearch: [],
    expeditions: [],
    automation: {
      unlocks: { ...DEFAULT_AUTOMATION_UNLOCKS },
      settings: { ...DEFAULT_AUTOMATION_SETTINGS },
      lastAutomationAt: now,
    },
    missions: {
      dailySeed: getDayKey(now),
      weeklySeed: getWeekKey(now),
      daily: createMissionProgressList(DAILY_MISSIONS.map((entry) => entry.id)),
      weekly: createMissionProgressList(WEEKLY_MISSIONS.map((entry) => entry.id)),
    },
    collections: createCollectionState(),
    season: {
      currentSeasonId: 'season-zero',
      currency: 0,
      missions: createMissionProgressList(SEASON_MISSIONS.map((entry) => entry.id)),
      claimedRewards: [],
      startedAt: now,
    },
    settings: { ...DEFAULT_SETTINGS },
    logs: createInitialLogs(),
    session: {
      successStreak: 0,
      failureStreak: 0,
      lastActionAt: now,
      lastDailyKey: getDayKey(now),
      lastWeeklyKey: getWeekKey(now),
      amplifierCharges: 0,
      distortionStacks: 0,
    },
  };

  for (const material of Object.keys(save.materials) as MaterialId[]) {
    if (save.materials[material] > 0) {
      save.collections.materials.push(material);
    }
  }

  for (const equipment of save.equipments) {
    if (!save.collections.equipmentTemplates.includes(equipment.templateId)) {
      save.collections.equipmentTemplates.push(equipment.templateId);
    }
  }

  save.collections.regions.push(EXPEDITION_DEFINITIONS[0]!.id);
  save.account.stats.equipmentDiscovered = save.collections.equipmentTemplates.length;
  save.account.stats.collectionScore =
    save.collections.equipmentTemplates.length + save.collections.materials.length + save.collections.regions.length;

  return save;
}
