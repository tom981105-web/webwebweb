import { EXPEDITION_DEFINITIONS, RESEARCH_DEFINITIONS } from '@/data';
import {
  appendLog,
  getExpeditionDefinition,
  getPassiveTotals,
  getResearchAvailability,
  getResearchDefinition,
  getResearchLevel,
  grantMaterials,
  grantResources,
  grantXp,
  hasEnoughMaterials,
  hasEnoughResources,
  isExpeditionComplete,
  isResearchComplete,
  markMaterialDiscovery,
  spendMaterials,
  spendResources,
} from '@/game/calculations';
import { createEquipmentFromTemplate } from '@/game/factories';
import { addEquipment, finalizeState } from '@/game/stateHelpers';
import type { GameSaveState } from '@/types/game';
import { pickOne } from '@/utils/random';

export function completeResearch(state: GameSaveState, researchId: string) {
  const definition = getResearchDefinition(researchId);
  if (!definition) return;
  state.researchLevels[researchId] = getResearchLevel(state, researchId) + 1;
  state.account.stats.researchCompleted += 1;
  const bonusGold = 40 + state.facilities.researchLab.level * 10;
  state.currencies.dataShards += 14 + getResearchLevel(state, researchId) * 6;
  state.currencies.gold += bonusGold;
  state.account.stats.goldEarned += bonusGold;
  grantXp(state, 32 + getResearchLevel(state, researchId) * 12);
  appendLog(state, 'research', 'good', `${definition.label} 연구가 완료되었습니다.`);
}

export function processResearchCompletion(state: GameSaveState) {
  const now = Date.now();
  const completed = state.activeResearch.filter((entry) => isResearchComplete(now, entry));
  if (!completed.length) return 0;
  state.activeResearch = state.activeResearch.filter((entry) => !isResearchComplete(now, entry));
  completed.forEach((entry) => completeResearch(state, entry.researchId));
  return completed.length;
}

export function startResearchOnState(state: GameSaveState, researchId: string) {
  const definition = getResearchDefinition(researchId);
  const availability = getResearchAvailability(state, researchId);
  if (!definition || !availability.unlocked) {
    appendLog(state, 'research', 'bad', `${definition?.label ?? '연구'} 시작 불가: ${availability.reason}`);
    return false;
  }
  if (!hasEnoughResources(state.currencies, definition.costResources) || !hasEnoughMaterials(state.materials, definition.costMaterials)) {
    appendLog(state, 'research', 'bad', '연구 자원이 부족합니다.');
    return false;
  }

  spendResources(state.currencies, definition.costResources);
  spendMaterials(state.materials, definition.costMaterials);
  const speed = Math.min(0.48, getPassiveTotals(state).researchSpeed + state.facilities.researchLab.level * 0.02);
  state.activeResearch.push({
    id: `research_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    researchId,
    startedAt: Date.now(),
    endsAt: Date.now() + Math.round(definition.durationMs * (1 - speed)),
  });
  appendLog(state, 'research', 'neutral', `${definition.label} 연구를 시작했습니다.`);
  return true;
}

export function startExpeditionOnState(state: GameSaveState, regionId: string, automated = false) {
  const region = getExpeditionDefinition(regionId);
  if (!region) return false;
  if (finalizeState(state).workshopPower < region.requirementPower) return false;
  if (state.expeditions.length >= finalizeState(state).expeditionSlots) return false;

  const durationReduction = getResearchLevel(state, 'expedition-routing') * 0.05 + state.facilities.expeditionControl.level * 0.02;
  const duration = Math.round(region.durationMs * (1 - Math.min(0.45, durationReduction)));
  state.expeditions.push({
    id: `exp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    regionId,
    slotIndex: state.expeditions.length,
    startedAt: Date.now(),
    endsAt: Date.now() + duration,
    seed: Math.random(),
  });

  if (!state.collections.regions.includes(region.id)) {
    state.collections.regions.push(region.id);
  }
  appendLog(state, 'expedition', 'neutral', `${automated ? '[자동] ' : ''}${region.label} 원정을 출발시켰습니다.`);
  return true;
}

export function resolveExpedition(state: GameSaveState, expeditionId: string, automated = false) {
  const index = state.expeditions.findIndex((entry) => entry.id === expeditionId);
  if (index < 0) return false;
  const expedition = state.expeditions[index]!;
  if (!isExpeditionComplete(Date.now(), expedition)) return false;
  const definition = getExpeditionDefinition(expedition.regionId);
  if (!definition) return false;

  const passive = getPassiveTotals(state);
  const multiplier = 1 + passive.expeditionYield + getResearchLevel(state, 'expedition-routing') * 0.03;
  const gold = Math.round((definition.rewardResources.gold ?? 0) * multiplier);
  const dataShards = Math.round((definition.rewardResources.dataShards ?? 0) * multiplier);
  const alloyScrap = Math.round((definition.rewardResources.alloyScrap ?? 0) * multiplier);
  const probabilityCores = Math.random() < 0.28 + state.facilities.expeditionControl.level * 0.01 ? definition.rewardResources.probabilityCores ?? 0 : 0;
  const relicFragments = Math.random() < 0.24 ? definition.rewardResources.relicFragments ?? 0 : 0;
  const fameBadges = definition.rewardResources.fameBadges ?? 0;

  grantResources(state.currencies, {
    gold,
    dataShards,
    alloyScrap,
    probabilityCores,
    relicFragments,
    fameBadges,
  });
  state.account.stats.goldEarned += gold;

  grantMaterials(
    state.materials,
    Object.fromEntries(
      Object.entries(definition.rewardMaterials).map(([key, value]) => [key, Math.round(Number(value) * multiplier)]),
    ),
  );
  for (const key of Object.keys(definition.rewardMaterials) as Array<keyof typeof definition.rewardMaterials>) {
    markMaterialDiscovery(state.collections, key);
  }

  if (Math.random() < 0.55) {
    const templateId = pickOne(definition.uniqueDropTemplateIds);
    const crafted = createEquipmentFromTemplate(templateId, definition.label, Math.round(state.facilities.fabricationBay.level * 0.7));
    addEquipment(state, crafted, definition.label);
  }

  state.account.stats.expeditionsCompleted += 1;
  appendLog(state, 'expedition', 'good', `${definition.label} 보상을 ${automated ? '자동 회수' : '수령'}했습니다. ${pickOne(definition.events)}`);
  state.expeditions.splice(index, 1);
  grantXp(state, 40 + Math.round(definition.requirementPower / 16));
  return true;
}

export function getResearchAndExpeditionCatalog() {
  return {
    researches: RESEARCH_DEFINITIONS,
    expeditions: EXPEDITION_DEFINITIONS,
  };
}
