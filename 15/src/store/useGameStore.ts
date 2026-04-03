import { create } from 'zustand';

import {
  ACHIEVEMENT_DEFINITIONS,
  DAILY_MISSIONS,
  FACILITY_DEFINITIONS,
  ITEM_DEFINITIONS,
  SEASON_MISSIONS,
  SET_DEFINITIONS,
  WEEKLY_MISSIONS,
} from '@/data';
import { createOfflineSummary, runAutomationCycle } from '@/game/automation';
import {
  appendLog,
  canClaimAchievement,
  canClaimSetReward,
  deriveState,
  getSeasonRewardState,
  getUpgradeCost,
  hasEnoughResources,
  refreshEquipmentStatus,
  spendResources,
} from '@/game/calculations';
import { craftOnState, dismantleOnState } from '@/game/crafting';
import { attemptEnhanceOnState, useItemOnState } from '@/game/enhancement';
import { createStarterSave } from '@/game/factories';
import { processResearchCompletion, resolveExpedition, startExpeditionOnState, startResearchOnState } from '@/game/researchExpedition';
import { clearSave, exportSave, importSave, loadSave, saveGame } from '@/game/save';
import { finalizeState } from '@/game/stateHelpers';
import type {
  AutomationSettings,
  ControlModeId,
  DerivedState,
  FacilityId,
  GameSaveState,
  ItemId,
  NavView,
  OfflineSummary,
} from '@/types/game';

type StoreState = GameSaveState & {
  hydrated: boolean;
  computed: DerivedState;
  offlineSummary: OfflineSummary | null;
  initialize: () => void;
  tick: (deltaMs: number) => void;
  saveNow: () => void;
  changeView: (view: NavView) => void;
  selectEquipment: (equipmentId: string) => void;
  equipItem: (equipmentId: string) => void;
  setControlMode: (controlMode: ControlModeId) => void;
  attemptEnhance: (controlMode?: ControlModeId, automated?: boolean) => void;
  useItem: (itemId: ItemId) => void;
  upgradeFacility: (facilityId: FacilityId) => void;
  startResearch: (researchId: string) => void;
  claimMission: (track: 'daily' | 'weekly' | 'season', missionId: string) => void;
  claimAchievement: (achievementId: string) => void;
  claimSetReward: (setId: string) => void;
  claimSeasonReward: (rewardId: string) => void;
  selectTitle: (titleId: string) => void;
  craftRecipe: (recipeId: string) => void;
  dismantleEquipment: (equipmentId: string) => void;
  startExpedition: (regionId: string) => void;
  claimExpedition: (expeditionId: string) => void;
  buyShopItem: (itemId: ItemId) => void;
  updateAutomationSettings: (patch: Partial<AutomationSettings>) => void;
  exportSaveString: () => string;
  importSaveString: (payload: string) => boolean;
  resetProgress: () => void;
};

function snapshot(state: StoreState): GameSaveState {
  return {
    version: state.version,
    createdAt: state.createdAt,
    lastSavedAt: state.lastSavedAt,
    lastOpenedAt: state.lastOpenedAt,
    selectedView: state.selectedView,
    selectedEquipmentId: state.selectedEquipmentId,
    selectedControlMode: state.selectedControlMode,
    account: state.account,
    currencies: state.currencies,
    materials: state.materials,
    items: state.items,
    facilities: state.facilities,
    equipments: state.equipments,
    loadout: state.loadout,
    researchLevels: state.researchLevels,
    activeResearch: state.activeResearch,
    expeditions: state.expeditions,
    automation: state.automation,
    missions: state.missions,
    collections: state.collections,
    season: state.season,
    settings: state.settings,
    logs: state.logs,
    session: state.session,
  };
}

function missionDef(track: 'daily' | 'weekly' | 'season', missionId: string) {
  const list = track === 'daily' ? DAILY_MISSIONS : track === 'weekly' ? WEEKLY_MISSIONS : SEASON_MISSIONS;
  return list.find((entry) => entry.id === missionId) ?? null;
}

function grantBasicReward(next: GameSaveState, reward: NonNullable<ReturnType<typeof missionDef>>['reward']) {
  next.account.fame += reward.fame ?? 0;
  next.account.xp += reward.xp ?? 0;
  if (reward.resources) {
    for (const [key, value] of Object.entries(reward.resources)) {
      next.currencies[key as keyof typeof next.currencies] += Number(value);
    }
    next.account.stats.goldEarned += reward.resources.gold ?? 0;
  }
  if (reward.items) {
    for (const [key, value] of Object.entries(reward.items)) {
      next.items[key as keyof typeof next.items] += Number(value);
    }
  }
  if (reward.permanentBonuses) {
    for (const [key, value] of Object.entries(reward.permanentBonuses)) {
      next.account.permanentBonuses[key as keyof typeof next.account.permanentBonuses] += Number(value);
    }
  }
  if (reward.titleId && !next.account.unlockedTitles.includes(reward.titleId)) {
    next.account.unlockedTitles.push(reward.titleId);
  }
  if (reward.seasonCurrency) next.season.currency += reward.seasonCurrency;
}

export const useGameStore = create<StoreState>((set, get) => {
  const base = createStarterSave();

  return {
    ...base,
    hydrated: false,
    computed: deriveState(base),
    offlineSummary: null,
    initialize: () => {
      const next = structuredClone(loadSave() ?? createStarterSave());
      next.lastOpenedAt = Date.now();
      const offlineSummary = createOfflineSummary(next, Date.now() - next.lastSavedAt);
      set({ ...next, computed: finalizeState(next), offlineSummary, hydrated: true });
    },
    tick: (deltaMs) => {
      const current = get();
      if (!current.hydrated) return;
      const next = structuredClone(snapshot(current));
      refreshEquipmentStatus(next, deltaMs);
      let changed = processResearchCompletion(next) > 0;
      if (Date.now() - next.automation.lastAutomationAt >= 3500) {
        next.automation.lastAutomationAt = Date.now();
        changed = runAutomationCycle(next) || changed;
      }
      if (changed) set({ ...next, computed: finalizeState(next) });
    },
    saveNow: () => {
      const next = structuredClone(snapshot(get()));
      next.lastSavedAt = Date.now();
      saveGame(next);
      set({ lastSavedAt: next.lastSavedAt });
    },
    changeView: (selectedView) => set({ selectedView }),
    selectEquipment: (selectedEquipmentId) => set({ selectedEquipmentId }),
    equipItem: (equipmentId) => {
      const next = structuredClone(snapshot(get()));
      const equipment = next.equipments.find((entry) => entry.id === equipmentId);
      if (!equipment) return;
      next.loadout[equipment.type] = equipment.id;
      next.selectedEquipmentId = equipment.id;
      appendLog(next, 'system', 'good', `${equipment.name} 장착 완료`);
      set({ ...next, computed: finalizeState(next) });
    },
    setControlMode: (selectedControlMode) => set({ selectedControlMode }),
    attemptEnhance: (controlMode, automated = false) => {
      const next = structuredClone(snapshot(get()));
      if (!attemptEnhanceOnState(next, controlMode ?? next.selectedControlMode, automated)) {
        set({ logs: next.logs });
        return;
      }
      set({ ...next, computed: finalizeState(next) });
    },
    useItem: (itemId) => {
      const next = structuredClone(snapshot(get()));
      if (!useItemOnState(next, itemId)) return;
      set({ ...next, computed: finalizeState(next) });
    },
    upgradeFacility: (facilityId) => {
      const next = structuredClone(snapshot(get()));
      const definition = FACILITY_DEFINITIONS.find((entry) => entry.id === facilityId);
      const facility = next.facilities[facilityId];
      if (!definition || !facility || facility.level >= definition.maxLevel) return;
      const cost = getUpgradeCost(definition.baseCost, facility.level);
      if (!hasEnoughResources(next.currencies, cost)) {
        appendLog(next, 'system', 'bad', `${definition.label} 업그레이드 재화 부족`);
        set({ logs: next.logs });
        return;
      }
      spendResources(next.currencies, cost);
      facility.level += 1;
      appendLog(next, 'system', 'good', `${definition.label} Lv.${facility.level}`);
      set({ ...next, computed: finalizeState(next) });
    },
    startResearch: (researchId) => {
      const next = structuredClone(snapshot(get()));
      if (!startResearchOnState(next, researchId)) {
        set({ logs: next.logs });
        return;
      }
      set({ ...next, computed: finalizeState(next) });
    },
    claimMission: (track, missionId) => {
      const next = structuredClone(snapshot(get()));
      const bucket = track === 'daily' ? next.missions.daily : track === 'weekly' ? next.missions.weekly : next.season.missions;
      const progress = bucket.find((entry) => entry.id === missionId);
      const definition = missionDef(track, missionId);
      if (!progress || !definition || progress.claimed || progress.progress < definition.target) return;
      progress.claimed = true;
      next.account.stats.missionsClaimed += 1;
      grantBasicReward(next, definition.reward);
      appendLog(next, 'mission', 'good', `${definition.label} 보상 수령`);
      set({ ...next, computed: finalizeState(next) });
    },
    claimAchievement: (achievementId) => {
      const next = structuredClone(snapshot(get()));
      if (!canClaimAchievement(next, achievementId)) return;
      const definition = ACHIEVEMENT_DEFINITIONS.find((entry) => entry.id === achievementId);
      if (!definition) return;
      next.collections.achievementClaims.push(achievementId);
      grantBasicReward(next, definition.reward);
      appendLog(next, 'achievement', 'good', `${definition.label} 달성`);
      set({ ...next, computed: finalizeState(next) });
    },
    claimSetReward: (setId) => {
      const next = structuredClone(snapshot(get()));
      if (!canClaimSetReward(next, setId)) return;
      const definition = SET_DEFINITIONS.find((entry) => entry.id === setId);
      if (!definition) return;
      next.collections.setRewardClaims.push(setId);
      grantBasicReward(next, { permanentBonuses: definition.bonus, titleId: definition.titleId });
      appendLog(next, 'achievement', 'good', `${definition.label} 세트 보상 수령`);
      set({ ...next, computed: finalizeState(next) });
    },
    claimSeasonReward: (rewardId) => {
      const next = structuredClone(snapshot(get()));
      const reward = getSeasonRewardState(next).find((entry) => entry.id === rewardId);
      if (!reward || reward.claimed || !reward.unlocked) return;
      next.season.claimedRewards.push(rewardId);
      grantBasicReward(next, reward.reward);
      appendLog(next, 'mission', 'good', `${reward.label} 시즌 보상 수령`);
      set({ ...next, computed: finalizeState(next) });
    },
    selectTitle: (titleId) => {
      const next = structuredClone(snapshot(get()));
      if (!next.account.unlockedTitles.includes(titleId)) return;
      next.account.selectedTitleId = titleId;
      set({ ...next, computed: finalizeState(next) });
    },
    craftRecipe: (recipeId) => {
      const next = structuredClone(snapshot(get()));
      if (!craftOnState(next, recipeId, false)) return;
      set({ ...next, computed: finalizeState(next) });
    },
    dismantleEquipment: (equipmentId) => {
      const next = structuredClone(snapshot(get()));
      if (!dismantleOnState(next, equipmentId, false)) return;
      set({ ...next, computed: finalizeState(next) });
    },
    startExpedition: (regionId) => {
      const next = structuredClone(snapshot(get()));
      if (!startExpeditionOnState(next, regionId, false)) return;
      set({ ...next, computed: finalizeState(next) });
    },
    claimExpedition: (expeditionId) => {
      const next = structuredClone(snapshot(get()));
      if (!resolveExpedition(next, expeditionId, false)) return;
      set({ ...next, computed: finalizeState(next) });
    },
    buyShopItem: (itemId) => {
      const next = structuredClone(snapshot(get()));
      const item = ITEM_DEFINITIONS.find((entry) => entry.id === itemId);
      if (!item || !hasEnoughResources(next.currencies, item.shopCost)) return;
      spendResources(next.currencies, item.shopCost);
      next.items[itemId] += 1;
      appendLog(next, 'system', 'good', `${item.label} 구매`);
      set({ ...next, computed: finalizeState(next) });
    },
    updateAutomationSettings: (patch) => {
      const next = structuredClone(snapshot(get()));
      next.automation.settings = { ...next.automation.settings, ...patch };
      set({ ...next, computed: finalizeState(next) });
    },
    exportSaveString: () => exportSave(snapshot(get())),
    importSaveString: (payload) => {
      try {
        const imported = importSave(payload);
        set({ ...imported, computed: finalizeState(imported), offlineSummary: null, hydrated: true });
        return true;
      } catch {
        return false;
      }
    },
    resetProgress: () => {
      clearSave();
      const fresh = createStarterSave();
      set({ ...fresh, computed: finalizeState(fresh), offlineSummary: null, hydrated: true });
    },
  };
});
