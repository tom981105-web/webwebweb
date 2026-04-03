import { EMPTY_ITEMS, EMPTY_MATERIALS, EMPTY_RESOURCES, SAVE_VERSION } from '@/config/balance';
import { DAILY_MISSIONS, SEASON_MISSIONS, WEEKLY_MISSIONS } from '@/data';
import { createMissionProgressList, createStarterSave } from '@/game/factories';
import type { EquipmentType, GameSaveState } from '@/types/game';
import { getDayKey, getWeekKey } from '@/utils/time';

export function migrateSave(raw: unknown): GameSaveState {
  const base = createStarterSave();
  if (!raw || typeof raw !== 'object') return base;
  const source = raw as Partial<GameSaveState>;
  const now = Date.now();

  const next: GameSaveState = {
    ...base,
    ...source,
    version: SAVE_VERSION,
    lastOpenedAt: Number(source.lastOpenedAt || source.lastSavedAt || now),
    lastSavedAt: Number(source.lastSavedAt || now),
    account: {
      ...base.account,
      ...(source.account || {}),
      permanentBonuses: {
        ...base.account.permanentBonuses,
        ...((source.account && source.account.permanentBonuses) || {}),
      },
      records: {
        ...base.account.records,
        ...((source.account && source.account.records) || {}),
      },
      stats: {
        ...base.account.stats,
        ...((source.account && source.account.stats) || {}),
      },
      unlockedTitles: Array.isArray(source.account?.unlockedTitles)
        ? source.account.unlockedTitles.filter(Boolean)
        : base.account.unlockedTitles,
    },
    currencies: {
      ...EMPTY_RESOURCES,
      ...(source.currencies || {}),
    },
    materials: {
      ...EMPTY_MATERIALS,
      ...(source.materials || {}),
    },
    items: {
      ...EMPTY_ITEMS,
      ...(source.items || {}),
    },
    facilities: {
      ...base.facilities,
      ...(source.facilities || {}),
    },
    loadout: {
      ...base.loadout,
      ...(source.loadout || {}),
    } as Record<EquipmentType, string | null>,
    researchLevels: {
      ...(source.researchLevels || {}),
    },
    activeResearch: Array.isArray(source.activeResearch) ? source.activeResearch : [],
    expeditions: Array.isArray(source.expeditions) ? source.expeditions : [],
    automation: {
      ...base.automation,
      ...(source.automation || {}),
      settings: {
        ...base.automation.settings,
        ...((source.automation && source.automation.settings) || {}),
      },
      unlocks: {
        ...base.automation.unlocks,
        ...((source.automation && source.automation.unlocks) || {}),
      },
    },
    missions: {
      dailySeed: String(source.missions?.dailySeed || getDayKey(now)),
      weeklySeed: String(source.missions?.weeklySeed || getWeekKey(now)),
      daily: Array.isArray(source.missions?.daily)
        ? source.missions.daily
        : createMissionProgressList(DAILY_MISSIONS.map((entry) => entry.id)),
      weekly: Array.isArray(source.missions?.weekly)
        ? source.missions.weekly
        : createMissionProgressList(WEEKLY_MISSIONS.map((entry) => entry.id)),
    },
    collections: {
      ...base.collections,
      ...(source.collections || {}),
      equipmentTemplates: Array.isArray(source.collections?.equipmentTemplates) ? source.collections.equipmentTemplates : [],
      materials: Array.isArray(source.collections?.materials) ? source.collections.materials : [],
      regions: Array.isArray(source.collections?.regions) ? source.collections.regions : [],
      achievementClaims: Array.isArray(source.collections?.achievementClaims) ? source.collections.achievementClaims : [],
      setRewardClaims: Array.isArray(source.collections?.setRewardClaims) ? source.collections.setRewardClaims : [],
    },
    season: {
      ...base.season,
      ...(source.season || {}),
      missions: Array.isArray(source.season?.missions)
        ? source.season.missions
        : createMissionProgressList(SEASON_MISSIONS.map((entry) => entry.id)),
      claimedRewards: Array.isArray(source.season?.claimedRewards) ? source.season.claimedRewards : [],
    },
    settings: {
      ...base.settings,
      ...(source.settings || {}),
    },
    logs: Array.isArray(source.logs) ? source.logs : base.logs,
    session: {
      ...base.session,
      ...(source.session || {}),
    },
    equipments: Array.isArray(source.equipments) ? source.equipments : base.equipments,
  };

  if (!next.account.unlockedTitles.includes(next.account.selectedTitleId) && next.account.unlockedTitles.length > 0) {
    next.account.selectedTitleId = next.account.unlockedTitles[0]!;
  }

  return next;
}
