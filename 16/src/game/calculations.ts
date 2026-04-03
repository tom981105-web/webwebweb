import {
  CONTROL_MODE_NAMES,
  EMPTY_PASSIVES,
  EMPTY_MATERIALS,
  GRADE_MULTIPLIER,
  LOG_LIMIT,
  getEnhancementBaseChance,
  getEnhancementCost,
  getExpeditionSlots,
  getFacilityUpgradeScale,
  getResearchSlots,
  getStorageCapacity,
  getXpForLevel,
} from '@/config/balance';
import {
  ACHIEVEMENT_DEFINITIONS,
  CONTROL_MODES,
  DAILY_MISSIONS,
  EQUIPMENT_TEMPLATES,
  EXPEDITION_DEFINITIONS,
  RESEARCH_DEFINITIONS,
  SEASON_MISSIONS,
  SEASON_REWARDS,
  SET_DEFINITIONS,
  TITLE_DEFINITIONS,
  WEEKLY_MISSIONS,
} from '@/data';
import type {
  ActiveExpedition,
  ActiveResearch,
  CollectionState,
  ControlModeDefinition,
  ControlModeId,
  DerivedState,
  EnhancePreview,
  EquipmentInstance,
  GameSaveState,
  LogEntry,
  LogTone,
  LogType,
  MaterialId,
  MaterialState,
  PassiveBonuses,
  ResourceId,
  ResourceState,
  RewardPayload,
} from '@/types/game';
import { clamp } from '@/utils/format';

export function getResearchLevel(state: GameSaveState, id: string) {
  return Number(state.researchLevels[id] || 0);
}

export function getTitleDefinition(id: string) {
  return TITLE_DEFINITIONS.find((entry) => entry.id === id) ?? null;
}

export function getTemplate(templateId: string) {
  return EQUIPMENT_TEMPLATES.find((entry) => entry.id === templateId) ?? null;
}

export function getEquipmentPower(item: EquipmentInstance) {
  const template = getTemplate(item.templateId);
  const optionPower = item.options.reduce((sum, option) => sum + (option.unit === '%' ? option.value * 1.6 : option.value), 0);
  const traitPower = item.traits.length * 4;
  const basePower = template?.basePower ?? 40;
  const gradeScale = GRADE_MULTIPLIER[item.grade];
  return Math.round(basePower * gradeScale * (1 + item.quality / 110) * (1 + item.enhancement * 0.075) + optionPower + traitPower);
}

export function getLoadoutPower(state: GameSaveState) {
  return state.equipments.filter((entry) => entry.equipped).reduce((sum, entry) => sum + getEquipmentPower(entry), 0);
}

function getFacilityBonus(state: GameSaveState) {
  return Object.values(state.facilities).reduce((sum, facility) => sum + facility.level * 8, 0);
}

export function getPassiveTotals(state: GameSaveState): PassiveBonuses {
  const totals: PassiveBonuses = { ...EMPTY_PASSIVES, ...state.account.permanentBonuses };
  const title = getTitleDefinition(state.account.selectedTitleId);
  if (title) {
    for (const [key, value] of Object.entries(title.bonus) as Array<[keyof PassiveBonuses, number]>) {
      totals[key] += value;
    }
  }

  for (const setId of state.collections.setRewardClaims) {
    const set = SET_DEFINITIONS.find((entry) => entry.id === setId);
    if (!set) continue;
    for (const [key, value] of Object.entries(set.bonus) as Array<[keyof PassiveBonuses, number]>) {
      totals[key] += value;
    }
  }

  totals.successRate += getResearchLevel(state, 'reinforcement-matrix') * 0.02;
  totals.heatMitigation += getResearchLevel(state, 'thermal-damping') * 0.03;
  totals.researchSpeed += getResearchLevel(state, 'trade-bureau') * 0.01;
  totals.protectionChance += getResearchLevel(state, 'guard-schematics') * 0.03;
  totals.expeditionYield += getResearchLevel(state, 'expedition-routing') * 0.03;
  totals.offlineEfficiency += getResearchLevel(state, 'servo-routine') * 0.02;
  totals.craftQuality += state.facilities.fabricationBay.level * 0.008;
  totals.stabilityRecovery += state.facilities.researchLab.level * 0.004;

  return totals;
}

export function getAutomationUnlocks(state: GameSaveState) {
  return {
    enhanceQueue: state.facilities.automationLine.level >= 2 && getResearchLevel(state, 'servo-routine') >= 1,
    autoDismantle: state.facilities.automationLine.level >= 4,
    autoCraft: state.facilities.automationLine.level >= 5,
    autoExpedition: state.facilities.automationLine.level >= 6 && state.facilities.expeditionControl.level >= 4,
    offlineRewards: state.facilities.automationLine.level >= 7 && getResearchLevel(state, 'servo-routine') >= 2,
  };
}

export function deriveState(state: GameSaveState): DerivedState {
  const passiveBonuses = getPassiveTotals(state);
  const loadoutPower = getLoadoutPower(state);
  const workshopPower =
    loadoutPower +
    getFacilityBonus(state) +
    Object.keys(state.researchLevels).reduce((sum, key) => sum + getResearchLevel(state, key) * 15, 0) +
    state.account.level * 14;

  const dailyTotal = state.missions.daily.length || 1;
  const weeklyTotal = state.missions.weekly.length || 1;
  const missionCompletionRate =
    (state.missions.daily.filter((entry) => entry.claimed).length + state.missions.weekly.filter((entry) => entry.claimed).length) /
    (dailyTotal + weeklyTotal);

  const collectionCompletionRate =
    (state.collections.equipmentTemplates.length + state.collections.materials.length + state.collections.regions.length) /
    (EQUIPMENT_TEMPLATES.length + Object.keys(EMPTY_MATERIALS).length + EXPEDITION_DEFINITIONS.length);

  return {
    workshopPower: Math.round(workshopPower),
    loadoutPower: Math.round(loadoutPower),
    equipmentCapacity: getStorageCapacity(state.facilities.vault.level),
    researchSlots: getResearchSlots(state.facilities.researchLab.level),
    expeditionSlots: getExpeditionSlots(state.facilities.expeditionControl.level),
    passiveBonuses,
    automationUnlocks: getAutomationUnlocks(state),
    missionCompletionRate,
    collectionCompletionRate,
    titleLabel: getTitleDefinition(state.account.selectedTitleId)?.label ?? '무칭호',
  };
}

function getControlModeConfig(state: GameSaveState, controlMode: ControlModeId) {
  const base = {
    successRate: 0,
    critChance: 0.04,
    heat: 0,
    durability: 0,
    stageDrop: 0,
    block: 0,
  };

  switch (controlMode) {
    case 'stable':
      base.successRate += 0.06;
      base.heat -= 4;
      base.durability -= 4;
      base.critChance -= 0.01;
      break;
    case 'focused':
      base.successRate += 0.015;
      base.critChance += 0.06;
      base.heat += 4;
      break;
    case 'wild':
      base.successRate -= 0.06;
      base.critChance += 0.14;
      base.heat += 10;
      base.durability += 8;
      base.stageDrop += 0.08;
      break;
    case 'pity':
      base.successRate += Math.min(0.14, state.session.failureStreak * 0.03);
      base.heat += 2;
      break;
    case 'reversal':
      base.successRate += state.session.distortionStacks * 0.06;
      base.critChance += 0.03;
      base.heat += 6;
      break;
    case 'guard':
      base.successRate -= 0.02;
      base.heat += 1;
      base.stageDrop -= 0.16;
      base.block -= 0.12;
      break;
    case 'auto':
      base.successRate -= 0.01;
      base.heat -= 6;
      base.durability -= 3;
      base.block -= 0.05;
      break;
    case 'general':
    default:
      break;
  }

  if (controlMode === 'wild' && getResearchLevel(state, 'entropy-breaker') >= 1) {
    base.critChance += 0.04;
  }
  if (controlMode === 'reversal' && getResearchLevel(state, 'reversal-gate') >= 1) {
    base.successRate += 0.04;
  }
  if (controlMode === 'guard' && getResearchLevel(state, 'guard-schematics') >= 1) {
    base.stageDrop -= 0.06;
  }

  return base;
}

export function getControlModeDefinition(id: ControlModeId): ControlModeDefinition {
  return CONTROL_MODES.find((entry) => entry.id === id) ?? CONTROL_MODES[0]!;
}

export function canUseControlMode(state: GameSaveState, id: ControlModeId) {
  const definition = getControlModeDefinition(id);
  if (!definition.unlockResearchId) return true;
  return getResearchLevel(state, definition.unlockResearchId) > 0;
}

export function getEnhancementPreview(state: GameSaveState, item: EquipmentInstance, controlMode: ControlModeId): EnhancePreview {
  const passives = getPassiveTotals(state);
  const control = getControlModeConfig(state, controlMode);
  const baseCost = getEnhancementCost(item.enhancement, item.grade);
  const equipmentSuccessBonus = item.options.find((entry) => entry.key === 'successRate')?.value ?? 0;
  const equipmentProtectionBonus = item.options.find((entry) => entry.key === 'guardRate')?.value ?? 0;

  const durabilityPenalty = Math.max(0, (80 - item.durability) * 0.0022);
  const heatPenalty = item.heat * 0.0027;
  const stabilityPenalty = Math.max(0, (70 - item.stability) * 0.0018);
  const facilityBonus = state.facilities.enhancementBay.level * 0.012;
  const researchBonus = getResearchLevel(state, 'reinforcement-matrix') * 0.02;
  const amplifierBonus = state.session.amplifierCharges > 0 ? 0.05 : 0;
  const baseChance = getEnhancementBaseChance(item.enhancement, item.grade);
  const successChance = clamp(
    baseChance +
      facilityBonus +
      researchBonus +
      passives.successRate +
      control.successRate +
      equipmentSuccessBonus / 100 +
      amplifierBonus -
      durabilityPenalty -
      heatPenalty -
      stabilityPenalty,
    0.05,
    0.97,
  );

  const critChance = clamp(
    0.05 +
      control.critChance +
      (item.options.find((entry) => entry.key === 'critForge')?.value ?? 0) / 100 +
      (item.grade === 'legendary' || item.grade === 'mythic' ? 0.02 : 0),
    0.01,
    0.42,
  );

  const stageDropChance = clamp(
    (item.enhancement >= 7 ? 0.18 + (item.enhancement - 7) * 0.018 : 0.04) +
      control.stageDrop -
      passives.protectionChance -
      equipmentProtectionBonus / 100,
    0,
    0.7,
  );

  const blockChance = clamp(
    (item.enhancement >= 12 ? 0.08 + (item.enhancement - 12) * 0.008 : 0.02) +
      control.block -
      passives.protectionChance,
    0,
    0.35,
  );

  const heatGain = Math.max(4, 9 + item.enhancement * 0.7 + control.heat - passives.heatMitigation * 35);
  const durabilityLoss = Math.max(3, 8 + item.enhancement * 0.45 + control.durability - passives.heatMitigation * 12);

  return {
    successChance,
    critChance,
    goldCost: baseCost.gold,
    alloyCost: baseCost.alloyScrap,
    coreCost: baseCost.probabilityCores,
    heatGain,
    durabilityLoss,
    stageDropChance,
    blockChance,
  };
}

export function hasEnoughResources(pool: ResourceState, cost: Partial<ResourceState>) {
  return (Object.keys(cost) as ResourceId[]).every((key) => (pool[key] ?? 0) >= (cost[key] ?? 0));
}

export function hasEnoughMaterials(pool: MaterialState, cost: Partial<MaterialState>) {
  return (Object.keys(cost) as MaterialId[]).every((key) => (pool[key] ?? 0) >= (cost[key] ?? 0));
}

export function spendResources(pool: ResourceState, cost: Partial<ResourceState>) {
  for (const key of Object.keys(cost) as ResourceId[]) {
    pool[key] -= cost[key] ?? 0;
  }
}

export function spendMaterials(pool: MaterialState, cost: Partial<MaterialState>) {
  for (const key of Object.keys(cost) as MaterialId[]) {
    pool[key] -= cost[key] ?? 0;
  }
}

export function grantResources(pool: ResourceState, value?: Partial<ResourceState>) {
  if (!value) return;
  for (const key of Object.keys(value) as ResourceId[]) {
    pool[key] += value[key] ?? 0;
  }
}

export function grantMaterials(pool: MaterialState, value?: Partial<MaterialState>) {
  if (!value) return;
  for (const key of Object.keys(value) as MaterialId[]) {
    pool[key] += value[key] ?? 0;
  }
}

export function appendLog(state: GameSaveState, type: LogType, tone: LogTone, message: string) {
  const entry: LogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    at: Date.now(),
    type,
    tone,
    message,
  };
  state.logs = [entry, ...state.logs].slice(0, LOG_LIMIT);
}

export function grantXp(state: GameSaveState, amount: number) {
  if (amount <= 0) return;
  state.account.xp += amount;
  while (state.account.xp >= getXpForLevel(state.account.level)) {
    state.account.xp -= getXpForLevel(state.account.level);
    state.account.level += 1;
    appendLog(state, 'system', 'good', `계정 레벨이 ${state.account.level}로 상승했습니다.`);
  }
}

export function grantRewardPayload(state: GameSaveState, reward: RewardPayload) {
  grantXp(state, reward.xp ?? 0);
  state.account.fame += reward.fame ?? 0;
  grantResources(state.currencies, reward.resources);
  grantMaterials(state.materials, reward.materials);
  if (reward.seasonCurrency) state.season.currency += reward.seasonCurrency;
  if (reward.titleId && !state.account.unlockedTitles.includes(reward.titleId)) {
    state.account.unlockedTitles.push(reward.titleId);
  }
  if (reward.permanentBonuses) {
    for (const [key, value] of Object.entries(reward.permanentBonuses) as Array<[keyof PassiveBonuses, number]>) {
      state.account.permanentBonuses[key] += value;
    }
  }
}

export function markMaterialDiscovery(collections: CollectionState, materialId: MaterialId) {
  if (!collections.materials.includes(materialId)) {
    collections.materials.push(materialId);
  }
}

export function markEquipmentDiscovery(state: GameSaveState, item: EquipmentInstance) {
  if (!state.collections.equipmentTemplates.includes(item.templateId)) {
    state.collections.equipmentTemplates.push(item.templateId);
    state.account.stats.equipmentDiscovered = state.collections.equipmentTemplates.length;
  }
  if (item.grade === 'legendary' || item.grade === 'mythic') {
    state.account.stats.legendaryFinds += 1;
  }
}

export function updateCollectionScore(state: GameSaveState) {
  state.account.stats.collectionScore =
    state.collections.equipmentTemplates.length +
    state.collections.materials.length +
    state.collections.regions.length +
    state.collections.achievementClaims.length +
    state.collections.setRewardClaims.length;
}

export function syncMissionProgress(state: GameSaveState) {
  const resolveStat = (statKey: keyof typeof state.account.stats) => state.account.stats[statKey] ?? 0;

  for (const definition of DAILY_MISSIONS) {
    const current = state.missions.daily.find((entry) => entry.id === definition.id);
    if (current) current.progress = Math.min(definition.target, resolveStat(definition.statKey));
  }
  for (const definition of WEEKLY_MISSIONS) {
    const current = state.missions.weekly.find((entry) => entry.id === definition.id);
    if (current) current.progress = Math.min(definition.target, resolveStat(definition.statKey));
  }
  for (const definition of SEASON_MISSIONS) {
    const current = state.season.missions.find((entry) => entry.id === definition.id);
    if (current) current.progress = Math.min(definition.target, resolveStat(definition.statKey));
  }
  updateCollectionScore(state);
}

export function refreshSessionWindows(state: GameSaveState, now: number, dailySeed: string, weeklySeed: string) {
  if (state.missions.dailySeed !== dailySeed) {
    state.missions.dailySeed = dailySeed;
    state.missions.daily = DAILY_MISSIONS.map((entry) => ({
      id: entry.id,
      progress: Math.min(entry.target, state.account.stats[entry.statKey] ?? 0),
      claimed: false,
    }));
    appendLog(state, 'system', 'neutral', '일일 미션이 갱신되었습니다.');
  }

  if (state.missions.weeklySeed !== weeklySeed) {
    state.missions.weeklySeed = weeklySeed;
    state.missions.weekly = WEEKLY_MISSIONS.map((entry) => ({
      id: entry.id,
      progress: Math.min(entry.target, state.account.stats[entry.statKey] ?? 0),
      claimed: false,
    }));
    appendLog(state, 'system', 'neutral', '주간 프로젝트가 갱신되었습니다.');
  }

  state.session.lastDailyKey = dailySeed;
  state.session.lastWeeklyKey = weeklySeed;
  state.lastOpenedAt = now;
}

export function getUpgradeCost(baseCost: Partial<ResourceState>, level: number) {
  const scale = getFacilityUpgradeScale(level);
  return Object.fromEntries(
    Object.entries(baseCost).map(([key, value]) => [key, Math.round(Number(value) * scale)]),
  ) as Partial<ResourceState>;
}

export function findEquipment(state: GameSaveState, equipmentId: string | null) {
  return state.equipments.find((entry) => entry.id === equipmentId) ?? null;
}

export function canClaimAchievement(state: GameSaveState, achievementId: string) {
  const definition = ACHIEVEMENT_DEFINITIONS.find((entry) => entry.id === achievementId);
  if (!definition || state.collections.achievementClaims.includes(achievementId)) return false;
  return (state.account.stats[definition.statKey] ?? 0) >= definition.target;
}

export function canClaimSetReward(state: GameSaveState, setId: string) {
  if (state.collections.setRewardClaims.includes(setId)) return false;
  const set = SET_DEFINITIONS.find((entry) => entry.id === setId);
  return Boolean(set && set.pieces.every((piece) => state.collections.equipmentTemplates.includes(piece)));
}

export function getExpeditionDefinition(regionId: string) {
  return EXPEDITION_DEFINITIONS.find((entry) => entry.id === regionId) ?? null;
}

export function getResearchDefinition(researchId: string) {
  return RESEARCH_DEFINITIONS.find((entry) => entry.id === researchId) ?? null;
}

export function getMissionDefinition(track: 'daily' | 'weekly' | 'season', missionId: string) {
  const list = track === 'daily' ? DAILY_MISSIONS : track === 'weekly' ? WEEKLY_MISSIONS : SEASON_MISSIONS;
  return list.find((entry) => entry.id === missionId) ?? null;
}

export function getSeasonRewardState(state: GameSaveState) {
  return SEASON_REWARDS.map((reward) => ({
    ...reward,
    unlocked: state.season.currency >= reward.threshold,
    claimed: state.season.claimedRewards.includes(reward.id),
  }));
}

export function getResearchAvailability(state: GameSaveState, researchId: string) {
  const definition = getResearchDefinition(researchId);
  if (!definition) return { unlocked: false, reason: '연구 없음' };
  if (getResearchLevel(state, definition.id) >= definition.maxLevel) return { unlocked: false, reason: '완료' };
  const inProgress = state.activeResearch.some((entry) => entry.researchId === definition.id);
  if (inProgress) return { unlocked: false, reason: '진행 중' };
  if (state.activeResearch.length >= getResearchSlots(state.facilities.researchLab.level)) {
    return { unlocked: false, reason: '연구 슬롯 부족' };
  }
  return { unlocked: true, reason: '' };
}

export function isResearchComplete(now: number, research: ActiveResearch) {
  return research.endsAt <= now;
}

export function isExpeditionComplete(now: number, expedition: ActiveExpedition) {
  return expedition.endsAt <= now;
}

export function refreshEquipmentStatus(state: GameSaveState, deltaMs: number) {
  const passive = getPassiveTotals(state);
  for (const equipment of state.equipments) {
    equipment.heat = clamp(equipment.heat - (deltaMs / 1000) * (3 + passive.heatMitigation * 12), 0, 100);
    equipment.stability = clamp(
      equipment.stability + (deltaMs / 1000) * (1.2 + passive.stabilityRecovery * 12),
      10,
      100,
    );
  }
}

export function getControlModeBadge(id: ControlModeId) {
  return CONTROL_MODE_NAMES[id] ?? id;
}

export function getAchievementDefinitions() {
  return ACHIEVEMENT_DEFINITIONS;
}

export function getFacilityDefinitions() {
  return RESEARCH_DEFINITIONS;
}
