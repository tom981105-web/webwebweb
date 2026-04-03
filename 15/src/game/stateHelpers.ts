import { GRADE_MULTIPLIER, getStorageCapacity } from '@/config/balance';
import { RECIPE_DEFINITIONS } from '@/data';
import {
  appendLog,
  deriveState,
  markEquipmentDiscovery,
  syncMissionProgress,
} from '@/game/calculations';
import type {
  DerivedState,
  EquipmentGrade,
  EquipmentInstance,
  GameSaveState,
} from '@/types/game';

export function gradeRank(grade: EquipmentGrade) {
  return ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'].indexOf(grade);
}

export function ensureEquipmentSelection(state: GameSaveState) {
  if (state.selectedEquipmentId && state.equipments.some((entry) => entry.id === state.selectedEquipmentId)) return;
  state.selectedEquipmentId = state.equipments[0]?.id ?? null;
}

export function syncLoadoutFlags(state: GameSaveState) {
  state.equipments.forEach((equipment) => {
    equipment.equipped = Object.values(state.loadout).includes(equipment.id);
  });
}

export function finalizeState(state: GameSaveState): DerivedState {
  state.account.stats.highestEnhancement = Math.max(
    state.account.stats.highestEnhancement,
    ...state.equipments.map((entry) => entry.enhancement),
  );
  state.account.records.highestEnhancement = Math.max(
    state.account.records.highestEnhancement,
    state.account.stats.highestEnhancement,
  );
  syncMissionProgress(state);
  ensureEquipmentSelection(state);
  syncLoadoutFlags(state);
  const computed = deriveState(state);
  state.automation.unlocks = computed.automationUnlocks;
  state.account.records.highestWorkshopPower = Math.max(state.account.records.highestWorkshopPower, computed.workshopPower);
  state.account.records.longestSuccessStreak = Math.max(state.account.records.longestSuccessStreak, state.session.successStreak);
  state.account.records.longestFailureStreak = Math.max(state.account.records.longestFailureStreak, state.session.failureStreak);
  return computed;
}

export function addEquipment(state: GameSaveState, equipment: EquipmentInstance, sourceLabel: string) {
  if (state.equipments.length >= getStorageCapacity(state.facilities.vault.level)) {
    const salvageGold = 60 + equipment.enhancement * 12;
    const salvageAlloy = 10 + Math.round(GRADE_MULTIPLIER[equipment.grade] * 8);
    state.currencies.gold += salvageGold;
    state.currencies.alloyScrap += salvageAlloy;
    state.account.stats.goldEarned += salvageGold;
    appendLog(state, 'system', 'neutral', `${equipment.name}은(는) 보관고가 가득 차 자동 환전되었습니다.`);
    return;
  }

  state.equipments.unshift(equipment);
  markEquipmentDiscovery(state, equipment);
  appendLog(state, 'system', 'good', `${sourceLabel}: ${equipment.name}을(를) 획득했습니다.`);
}

export function meetsRecipeUnlock(state: GameSaveState, recipeId: string) {
  const recipe = RECIPE_DEFINITIONS.find((entry) => entry.id === recipeId);
  if (!recipe) return false;
  if (recipe.unlockFacilityId && recipe.unlockFacilityLevel) {
    if ((state.facilities[recipe.unlockFacilityId]?.level ?? 0) < recipe.unlockFacilityLevel) return false;
  }
  if (recipe.unlockResearchId && Number(state.researchLevels[recipe.unlockResearchId] || 0) <= 0) return false;
  return true;
}
