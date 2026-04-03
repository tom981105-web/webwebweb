import { MAX_ENHANCEMENT } from '@/config/balance';
import {
  appendLog,
  canUseControlMode,
  findEquipment,
  getControlModeBadge,
  getEnhancementPreview,
  grantXp,
  hasEnoughResources,
  spendResources,
} from '@/game/calculations';
import type { ControlModeId, GameSaveState, ItemId } from '@/types/game';
import { clamp } from '@/utils/format';

export function attemptEnhanceOnState(state: GameSaveState, controlMode: ControlModeId, automated = false) {
  const equipment = findEquipment(state, state.selectedEquipmentId);
  if (!equipment) return false;
  if (!canUseControlMode(state, controlMode)) return false;
  if (Date.now() < equipment.blockedUntil) {
    appendLog(state, 'enhance', 'bad', `${equipment.name}은(는) 아직 과열 차단 상태입니다.`);
    return false;
  }
  if (equipment.durability <= 8) {
    appendLog(state, 'enhance', 'bad', `${equipment.name}의 내구도가 너무 낮아 강화할 수 없습니다.`);
    return false;
  }
  if (equipment.enhancement >= MAX_ENHANCEMENT) {
    appendLog(state, 'enhance', 'neutral', `${equipment.name}은(는) 최고 강화 단계에 도달했습니다.`);
    return false;
  }

  const preview = getEnhancementPreview(state, equipment, controlMode);
  const cost = { gold: preview.goldCost, alloyScrap: preview.alloyCost, probabilityCores: preview.coreCost };
  if (!hasEnoughResources(state.currencies, cost)) {
    appendLog(state, 'enhance', 'bad', '강화 재화가 부족합니다.');
    return false;
  }

  spendResources(state.currencies, cost);
  state.account.stats.enhanceAttempts += 1;
  state.session.lastActionAt = Date.now();

  const success = Math.random() < preview.successChance;
  const crit = success && Math.random() < preview.critChance;
  const previousStage = equipment.enhancement;
  let stageDropApplied = false;
  let protectionTriggered = false;

  if (state.session.amplifierCharges > 0) state.session.amplifierCharges -= 1;

  if (success) {
    const gain = crit ? 2 : 1;
    equipment.enhancement = clamp(equipment.enhancement + gain, 0, MAX_ENHANCEMENT);
    equipment.heat = clamp(equipment.heat + preview.heatGain - (equipment.name === '위상 절단기' ? 4 : 0), 0, 100);
    equipment.stability = clamp(equipment.stability - (6 + equipment.enhancement * 0.4), 8, 100);
    state.account.stats.enhanceSuccesses += 1;
    state.session.successStreak += 1;
    state.session.failureStreak = 0;
    state.session.distortionStacks = Math.max(0, state.session.distortionStacks - 1);
    grantXp(state, 18 + equipment.enhancement * 2);
    if (crit) state.season.currency += 1;
    appendLog(
      state,
      'enhance',
      'good',
      `${automated ? '[자동] ' : ''}${equipment.name} 강화 ${previousStage} -> ${equipment.enhancement} (${getControlModeBadge(controlMode)}${crit ? ', 치명 돌파' : ''})`,
    );
  } else {
    equipment.heat = clamp(equipment.heat + preview.heatGain + 4, 0, 100);
    equipment.stability = clamp(equipment.stability - 10, 5, 100);
    equipment.durability = clamp(equipment.durability - preview.durabilityLoss, 1, equipment.maxDurability);
    state.currencies.dataShards += 6 + Math.round(previousStage * 1.8);
    state.account.stats.enhanceFailures += 1;
    state.session.failureStreak += 1;
    state.session.successStreak = 0;
    state.session.distortionStacks = clamp(state.session.distortionStacks + 1, 0, 5);
    grantXp(state, 10 + previousStage);

    if (equipment.protectionCharges > 0) {
      equipment.protectionCharges -= 1;
      protectionTriggered = true;
    } else if (Math.random() < preview.stageDropChance) {
      equipment.enhancement = Math.max(0, equipment.enhancement - (previousStage >= 20 ? 2 : 1));
      stageDropApplied = true;
    }

    if (Math.random() < preview.blockChance) {
      equipment.blockedUntil = Date.now() + 1000 * (12 + previousStage * 2);
    }

    appendLog(
      state,
      'enhance',
      'bad',
      `${automated ? '[자동] ' : ''}${equipment.name} 강화 실패${protectionTriggered ? ' (보호권 작동)' : stageDropApplied ? `, ${equipment.enhancement} 단계로 하락` : ''}`,
    );
  }

  if (equipment.name === '유물 바늘' && !success && state.session.failureStreak >= 2) {
    state.session.distortionStacks = clamp(state.session.distortionStacks + 1, 0, 5);
  }

  return true;
}

export function useItemOnState(state: GameSaveState, itemId: ItemId) {
  const equipment = findEquipment(state, state.selectedEquipmentId);
  if ((state.items[itemId] ?? 0) <= 0) return false;

  switch (itemId) {
    case 'protectionTicket':
      if (!equipment) return false;
      state.items[itemId] -= 1;
      equipment.protectionCharges += 1;
      appendLog(state, 'system', 'good', `${equipment.name}에 보호권을 장착했습니다.`);
      return true;
    case 'probabilityAmplifier':
      state.items[itemId] -= 1;
      state.session.amplifierCharges += 3;
      appendLog(state, 'system', 'good', '확률 증폭기가 다음 3회 강화에 적용됩니다.');
      return true;
    case 'stabilityDevice':
      if (!equipment) return false;
      state.items[itemId] -= 1;
      equipment.stability = clamp(equipment.stability + 18, 0, 100);
      appendLog(state, 'system', 'good', `${equipment.name}의 안정도를 회복했습니다.`);
      return true;
    case 'coolant':
      if (!equipment) return false;
      state.items[itemId] -= 1;
      equipment.heat = clamp(equipment.heat - 28, 0, 100);
      appendLog(state, 'system', 'good', `${equipment.name}의 과열을 냉각했습니다.`);
      return true;
    case 'distortionDice':
      state.items[itemId] -= 1;
      state.session.distortionStacks = clamp(state.session.distortionStacks + 1, 0, 5);
      appendLog(state, 'system', 'good', '왜곡 주사위를 사용해 역전 스택을 확보했습니다.');
      return true;
    case 'durabilityKit':
      if (!equipment) return false;
      state.items[itemId] -= 1;
      equipment.durability = clamp(equipment.durability + 26, 0, equipment.maxDurability);
      appendLog(state, 'system', 'good', `${equipment.name}의 내구도를 복원했습니다.`);
      return true;
    case 'researchBooster': {
      const target = state.activeResearch[0];
      if (!target) return false;
      state.items[itemId] -= 1;
      const remaining = target.endsAt - Date.now();
      target.endsAt -= remaining * 0.2;
      appendLog(state, 'research', 'good', '연구 촉진제로 진행 중 연구 시간을 압축했습니다.');
      return true;
    }
    case 'expeditionAccelerator': {
      const target = state.expeditions[0];
      if (!target) return false;
      state.items[itemId] -= 1;
      const remaining = target.endsAt - Date.now();
      target.endsAt -= remaining * 0.25;
      appendLog(state, 'expedition', 'good', '원정 가속 장치로 귀환 시간을 줄였습니다.');
      return true;
    }
    default:
      return false;
  }
}
