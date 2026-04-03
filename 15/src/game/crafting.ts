import { GRADE_MULTIPLIER } from '@/config/balance';
import { RECIPE_DEFINITIONS } from '@/data';
import {
  appendLog,
  grantMaterials,
  grantResources,
  grantXp,
  hasEnoughMaterials,
  hasEnoughResources,
  markMaterialDiscovery,
  spendMaterials,
  spendResources,
} from '@/game/calculations';
import { createEquipmentFromTemplate } from '@/game/factories';
import { addEquipment, meetsRecipeUnlock } from '@/game/stateHelpers';
import type { GameSaveState } from '@/types/game';

export function craftOnState(state: GameSaveState, recipeId: string, automated = false) {
  const recipe = RECIPE_DEFINITIONS.find((entry) => entry.id === recipeId);
  if (!recipe || !meetsRecipeUnlock(state, recipeId)) return false;
  if (!hasEnoughResources(state.currencies, recipe.costResources) || !hasEnoughMaterials(state.materials, recipe.costMaterials)) {
    return false;
  }

  spendResources(state.currencies, recipe.costResources);
  spendMaterials(state.materials, recipe.costMaterials);
  if (recipe.outputs.resources) {
    grantResources(state.currencies, recipe.outputs.resources);
    state.account.stats.goldEarned += recipe.outputs.resources.gold ?? 0;
  }
  if (recipe.outputs.materials) {
    grantMaterials(state.materials, recipe.outputs.materials);
    for (const key of Object.keys(recipe.outputs.materials) as Array<keyof typeof recipe.outputs.materials>) {
      markMaterialDiscovery(state.collections, key);
    }
  }
  if (recipe.outputs.items) {
    for (const [key, value] of Object.entries(recipe.outputs.items)) {
      state.items[key as keyof typeof state.items] += Number(value);
    }
  }
  if (recipe.outputs.equipmentTemplateId) {
    const bonusQuality = Math.round((state.account.permanentBonuses.craftQuality + state.facilities.fabricationBay.level * 0.01) * 100);
    addEquipment(state, createEquipmentFromTemplate(recipe.outputs.equipmentTemplateId, recipe.label, bonusQuality), recipe.label);
  }

  state.account.stats.itemsCrafted += 1;
  grantXp(state, 18 + state.facilities.fabricationBay.level * 4);
  appendLog(state, 'craft', 'good', `${automated ? '[자동] ' : ''}${recipe.label} 완료`);
  return true;
}

export function dismantleOnState(state: GameSaveState, equipmentId: string, automated = false) {
  const index = state.equipments.findIndex((entry) => entry.id === equipmentId);
  if (index < 0) return false;
  const equipment = state.equipments[index]!;
  if (equipment.equipped) return false;

  const yieldMultiplier = 1 + state.facilities.dismantleBay.level * 0.04 + state.account.permanentBonuses.dismantleYield;
  const gold = Math.round((50 + equipment.quality * 2) * yieldMultiplier);
  const alloy = Math.round((10 + GRADE_MULTIPLIER[equipment.grade] * 8 + equipment.enhancement * 1.4) * yieldMultiplier);
  const data = Math.round((6 + equipment.options.length * 5 + equipment.enhancement * 1.3) * yieldMultiplier);

  state.currencies.gold += gold;
  state.currencies.alloyScrap += alloy;
  state.currencies.dataShards += data;
  state.account.stats.goldEarned += gold;
  state.materials.mnemonicDust += 1 + Math.floor(GRADE_MULTIPLIER[equipment.grade] * 2);
  markMaterialDiscovery(state.collections, 'mnemonicDust');
  state.account.stats.itemsDismantled += 1;
  appendLog(state, 'craft', 'neutral', `${automated ? '[자동] ' : ''}${equipment.name} 분해 완료: 골드 ${gold}, 데이터 ${data}`);

  state.equipments.splice(index, 1);
  Object.keys(state.loadout).forEach((slot) => {
    if (state.loadout[slot as keyof typeof state.loadout] === equipment.id) {
      state.loadout[slot as keyof typeof state.loadout] = null;
    }
  });
  if (state.selectedEquipmentId === equipment.id) {
    state.selectedEquipmentId = state.equipments[0]?.id ?? null;
  }
  return true;
}
