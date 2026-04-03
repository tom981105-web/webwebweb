import { create } from 'zustand';

import { STORAGE_KEY } from '@/config/gameConfig';
import {
  assignCharacterToTeam,
  claimDailyLogin,
  claimMissionReward,
  claimPendingRewards,
  equipItemToCharacter,
  growCharacter,
  initializeState,
  loadGameSave,
  runArenaBurst,
  runPveStage,
  saveGameSave,
  unequipItem,
  upgradeEquipment,
} from '@/game/progression';
import type { AutoPvpSaveState, OfflineProgressResult } from '@/types/game';

type GameStoreState = AutoPvpSaveState & {
  hydrated: boolean;
  offlineResult: OfflineProgressResult | null;
  initialize: (userId: string) => void;
  runQuickBattles: (count: number) => void;
  claimArenaRewards: () => void;
  claimDailyAttendance: () => void;
  growRosterCharacter: (characterId: string) => void;
  assignSlot: (slotId: AutoPvpSaveState['teamPresets'][number]['slots'][number]['slotId'], characterId?: string) => void;
  equipToCharacter: (itemId: string, characterId: string) => void;
  unequipFromCharacter: (itemId: string) => void;
  upgradeInventoryItem: (itemId: string) => void;
  claimMissionItem: (missionId: string, group: 'daily' | 'weekly' | 'achievement') => void;
  runDungeonStage: (dungeonId: string, stage: number) => void;
};

function persist(state: GameStoreState) {
  saveGameSave(STORAGE_KEY, {
    version: state.version,
    userProfile: state.userProfile,
    roster: state.roster,
    inventory: state.inventory,
    teamPresets: state.teamPresets,
    activeTeamId: state.activeTeamId,
    battleReports: state.battleReports,
    pendingRewards: state.pendingRewards,
    pveRuns: state.pveRuns,
    missionBoard: state.missionBoard,
    collection: state.collection,
    activity: state.activity,
    dailyLogin: state.dailyLogin,
    season: state.season,
    lastProcessedAt: state.lastProcessedAt,
    lastOpenedAt: state.lastOpenedAt,
  });
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...initializeState('guest', null, Date.now()).state,
  hydrated: false,
  offlineResult: null,
  initialize: (userId) => {
    const loaded = loadGameSave(STORAGE_KEY);
    const initialized = initializeState(userId, loaded, Date.now());
    set({
      ...initialized.state,
      hydrated: true,
      offlineResult: initialized.offlineResult.simulatedBattles > 0 ? initialized.offlineResult : null,
    });
    persist(get());
  },
  runQuickBattles: (count) => {
    const next = runArenaBurst(get(), count, Date.now());
    set({ ...next });
    persist(get());
  },
  claimArenaRewards: () => {
    const next = claimPendingRewards(get(), Date.now());
    set({ ...next });
    persist(get());
  },
  claimDailyAttendance: () => {
    const next = claimDailyLogin(get(), Date.now());
    set({ ...next });
    persist(get());
  },
  growRosterCharacter: (characterId) => {
    const next = growCharacter(get(), characterId, Date.now());
    set({ ...next });
    persist(get());
  },
  assignSlot: (slotId, characterId) => {
    const next = assignCharacterToTeam(get(), slotId, characterId, Date.now());
    set({ ...next });
    persist(get());
  },
  equipToCharacter: (itemId, characterId) => {
    const next = equipItemToCharacter(get(), itemId, characterId, Date.now());
    set({ ...next });
    persist(get());
  },
  unequipFromCharacter: (itemId) => {
    const next = unequipItem(get(), itemId, Date.now());
    set({ ...next });
    persist(get());
  },
  upgradeInventoryItem: (itemId) => {
    const next = upgradeEquipment(get(), itemId, Date.now());
    set({ ...next });
    persist(get());
  },
  claimMissionItem: (missionId, group) => {
    const next = claimMissionReward(get(), missionId, group, Date.now());
    set({ ...next });
    persist(get());
  },
  runDungeonStage: (dungeonId, stage) => {
    const next = runPveStage(get(), dungeonId, stage, Date.now());
    set({ ...next });
    persist(get());
  },
}));
