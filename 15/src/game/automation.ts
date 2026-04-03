import { OFFLINE_CAP_MS } from '@/config/balance';
import {
  appendLog,
  deriveState,
  getPassiveTotals,
  grantMaterials,
  isExpeditionComplete,
  markMaterialDiscovery,
  refreshSessionWindows,
} from '@/game/calculations';
import { craftOnState, dismantleOnState } from '@/game/crafting';
import { attemptEnhanceOnState } from '@/game/enhancement';
import { processResearchCompletion, resolveExpedition, startExpeditionOnState } from '@/game/researchExpedition';
import { gradeRank } from '@/game/stateHelpers';
import type { GameSaveState, OfflineSummary } from '@/types/game';
import { getDayKey, getWeekKey } from '@/utils/time';

function tryAutoEnhance(state: GameSaveState) {
  if (!state.automation.unlocks.enhanceQueue || !state.automation.settings.enhanceEnabled) return false;
  const equipment = state.equipments.find((entry) => entry.id === state.selectedEquipmentId);
  if (!equipment) return false;
  if (equipment.enhancement >= state.automation.settings.targetEnhancement) return false;
  if (equipment.heat > state.automation.settings.maxHeat) return false;
  if (equipment.durability < state.automation.settings.minDurability) return false;
  return attemptEnhanceOnState(state, state.automation.settings.controlMode, true);
}

function tryAutoDismantle(state: GameSaveState) {
  if (!state.automation.unlocks.autoDismantle || !state.automation.settings.autoDismantleEnabled) return false;
  const target = state.equipments.find(
    (equipment) =>
      !equipment.equipped &&
      equipment.id !== state.selectedEquipmentId &&
      gradeRank(equipment.grade) <= gradeRank(state.automation.settings.dismantleBelowGrade),
  );
  if (!target) return false;
  return dismantleOnState(state, target.id, true);
}

function tryAutoCraft(state: GameSaveState) {
  if (!state.automation.unlocks.autoCraft || !state.automation.settings.autoCraftEnabled) return false;
  if (state.items.coolant < 2) {
    return craftOnState(state, 'craft-coolant', true);
  }
  if (state.items.protectionTicket < 1 && Number(state.researchLevels['guard-schematics'] || 0) > 0) {
    return craftOnState(state, 'craft-protection-ticket', true);
  }
  return false;
}

function tryAutoExpedition(state: GameSaveState) {
  if (!state.automation.unlocks.autoExpedition || !state.automation.settings.autoExpeditionEnabled) return false;
  let changed = false;
  const finished = state.expeditions.filter((entry) => isExpeditionComplete(Date.now(), entry));
  for (const expedition of finished) {
    changed = resolveExpedition(state, expedition.id, true) || changed;
  }
  while (state.expeditions.length < deriveState(state).expeditionSlots) {
    const started = startExpeditionOnState(state, state.automation.settings.expeditionRegionId, true);
    if (!started) break;
    changed = true;
  }
  return changed;
}

export function runAutomationCycle(state: GameSaveState) {
  let changed = false;
  changed = tryAutoEnhance(state) || changed;
  changed = tryAutoCraft(state) || changed;
  changed = tryAutoDismantle(state) || changed;
  changed = tryAutoExpedition(state) || changed;
  return changed;
}

export function createOfflineSummary(state: GameSaveState, elapsedMs: number): OfflineSummary | null {
  if (elapsedMs <= 0) return null;
  const capped = Math.min(elapsedMs, OFFLINE_CAP_MS);
  const now = Date.now();
  refreshSessionWindows(state, now, getDayKey(now), getWeekKey(now));
  const hours = capped / (1000 * 60 * 60);
  let goldEarned = 0;
  const materialsGained: OfflineSummary['materialsGained'] = {};

  if (deriveState(state).automationUnlocks.offlineRewards) {
    const passive = getPassiveTotals(state);
    goldEarned = Math.round((36 + deriveState(state).workshopPower * 0.09) * hours * (1 + passive.offlineEfficiency));
    state.currencies.gold += goldEarned;
    state.account.stats.goldEarned += goldEarned;
    materialsGained.coolantGel = Math.round(2 * hours);
    materialsGained.stabilityFiber = Math.round(2 * hours);
    grantMaterials(state.materials, materialsGained);
    if ((materialsGained.coolantGel ?? 0) > 0) markMaterialDiscovery(state.collections, 'coolantGel');
    if ((materialsGained.stabilityFiber ?? 0) > 0) markMaterialDiscovery(state.collections, 'stabilityFiber');
    appendLog(state, 'system', 'good', `오프라인 정산으로 골드 ${goldEarned}를 획득했습니다.`);
  }

  const readyExpeditions = state.expeditions.filter((entry) => isExpeditionComplete(now, entry)).length;
  const researchFinished = processResearchCompletion(state);

  return {
    durationMs: capped,
    goldEarned,
    materialsGained,
    expeditionsFinished: readyExpeditions,
    researchFinished,
  };
}
