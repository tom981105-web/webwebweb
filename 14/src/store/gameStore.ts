import { create } from 'zustand';

import { INITIAL_SETTINGS, PANEL_TIERS } from '@/data/balance';
import { estimateOfflineGain, getPrestigePreview } from '@/game/offline';
import {
  appendLog,
  appendToast,
  applyRewardToStats,
  buildMetaUpgradeCards,
  buildUpgradeCards,
  createEmptySave,
  createStarterPanel,
  createTierPanel,
  deriveComputedState,
  getMetaUpgradePrice,
  getTierCost,
  getUpgradeLevel,
  getUpgradePrice,
} from '@/game/economy';
import { clearGameSave, exportGameSave, importGameSave, loadGameSave, saveGameSave } from '@/utils/storage';
import type {
  GameComputed,
  GameSaveState,
  MetaUpgradeId,
  PanelTierId,
  ScratchFeedback,
  SettingsState,
  UpgradeId,
} from '@/types/game';

type StoreState = GameSaveState & {
  hydrated: boolean;
  lastRevealAt: number;
  moodIndex: number;
  feedbacks: ScratchFeedback[];
  offlineSummary: { gain: number; durationMs: number } | null;
  computed: GameComputed;
  initialize: () => void;
  tick: (deltaMs: number) => void;
  setSelectedTier: (tier: PanelTierId) => void;
  purchasePanel: (tier?: PanelTierId) => boolean;
  applyScratchProgress: (nextPercent: number, distance: number) => void;
  revealCurrentPanel: (source?: 'manual' | 'auto') => void;
  buyUpgrade: (id: UpgradeId) => void;
  buyMetaUpgrade: (id: MetaUpgradeId) => void;
  performPrestige: () => void;
  dismissTutorial: () => void;
  updateSettings: (patch: Partial<SettingsState>) => void;
  exportSaveString: () => string;
  importSaveString: (payload: string) => boolean;
  resetProgress: () => void;
  removeFeedback: (id: string) => void;
  saveNow: () => void;
};

function persistSnapshot(state: StoreState) {
  const snapshot: GameSaveState = {
    version: state.version,
    coins: state.coins,
    resonanceDust: state.resonanceDust,
    selectedTier: state.selectedTier,
    currentPanel: state.currentPanel,
    upgrades: state.upgrades,
    metaUpgrades: state.metaUpgrades,
    stats: state.stats,
    recentResults: state.recentResults,
    settings: state.settings,
    tutorial: state.tutorial,
    sessionId: state.sessionId,
    lastSavedAt: Date.now(),
    lastOpenedAt: state.lastOpenedAt,
  };
  saveGameSave(snapshot);
}

function withComputed(state: GameSaveState) {
  return {
    ...state,
    computed: deriveComputedState(state),
  };
}

function ensurePanel(state: GameSaveState) {
  if (state.currentPanel) return state;
  return {
    ...state,
    currentPanel: createStarterPanel(state),
  };
}

export const useGameStore = create<StoreState>((set, get) => {
  const base = ensurePanel(createEmptySave());

  return {
    ...withComputed(base),
    hydrated: false,
    lastRevealAt: 0,
    moodIndex: 0,
    feedbacks: [],
    offlineSummary: null,
    initialize: () => {
      const loaded = loadGameSave();
      const initial = ensurePanel(loaded || createEmptySave());
      const computed = deriveComputedState(initial);
      const offlineSummary =
        loaded && loaded.lastSavedAt
          ? estimateOfflineGain(initial, computed, Date.now() - loaded.lastSavedAt)
          : { gain: 0, durationMs: 0 };

      const withOffline = {
        ...initial,
        coins: initial.coins + offlineSummary.gain,
        lastOpenedAt: Date.now(),
      };

      set({
        ...withComputed(withOffline),
        hydrated: true,
        offlineSummary: offlineSummary.gain > 0 ? offlineSummary : null,
        feedbacks:
          offlineSummary.gain > 0
            ? [
                {
                  id: `offline_${Date.now()}`,
                  label: `오프라인 수익 +${offlineSummary.gain.toLocaleString('ko-KR')}`,
                  tone: 'system',
                },
              ]
            : [],
      });
    },
    tick: (deltaMs) => {
      const state = get();
      const now = Date.now();
      const nextState: Partial<StoreState> = {
        moodIndex: state.currentPanel?.revealed ? (state.moodIndex + 1) % 4 : state.moodIndex,
      };

      if (!state.currentPanel) {
        if (state.computed.autoBuyEnabled) {
          get().purchasePanel(state.selectedTier);
        }
        return;
      }

      if (!state.currentPanel.revealed && state.computed.autoScratchEnabled) {
        const autoGain = state.computed.autoScratchPerSecond * (deltaMs / 1000);
        const nextPercent = Math.min(100, state.currentPanel.scratchedPercent + autoGain);
        nextState.currentPanel = {
          ...state.currentPanel,
          scratchedPercent: nextPercent,
        };
      }

      const panel = nextState.currentPanel || state.currentPanel;
      if (panel && !panel.revealed && panel.scratchedPercent >= panel.autoRevealThreshold) {
        set(nextState);
        get().revealCurrentPanel(state.computed.autoRevealEnabled ? 'auto' : 'manual');
        return;
      }

      if (panel?.revealed && state.computed.autoLoopEnabled && now - state.lastRevealAt > 850) {
        set(nextState);
        get().purchasePanel(state.selectedTier);
        return;
      }

      set(nextState);
    },
    setSelectedTier: (tier) => set({ selectedTier: tier }),
    purchasePanel: (tier) => {
      const state = get();
      const targetTier = tier || state.selectedTier;
      const cost = getTierCost(state, targetTier);

      if (state.currentPanel && !state.currentPanel.revealed) return false;
      if (state.coins < cost) return false;

      const panel = createTierPanel(state, targetTier, PANEL_TIERS[targetTier].cost - cost);
      set({
        currentPanel: panel,
        coins: state.coins - cost,
      });
      return true;
    },
    applyScratchProgress: (nextPercent, distance) => {
      const state = get();
      if (!state.currentPanel || state.currentPanel.revealed) return;

      const capped = Math.max(state.currentPanel.scratchedPercent, nextPercent);
      set({
        currentPanel: {
          ...state.currentPanel,
          scratchedPercent: capped,
        },
        stats: {
          ...state.stats,
          totalScratchDistance: state.stats.totalScratchDistance + distance,
        },
      });

      if (capped >= state.currentPanel.autoRevealThreshold) {
        get().revealCurrentPanel('manual');
      }
    },
    revealCurrentPanel: (source = 'manual') => {
      const state = get();
      const panel = state.currentPanel;
      if (!panel || panel.revealed) return;

      const revealedPanel = {
        ...panel,
        revealed: true,
        scratchedPercent: 100,
      };
      const automationShare = source === 'auto' ? panel.reward : 0;
      const nextCoins = state.coins + panel.reward;
      const nextStats = applyRewardToStats(state.stats, revealedPanel, panel.reward, automationShare);
      const resultEntry = {
        id: `${revealedPanel.id}_result`,
        tier: revealedPanel.tier,
        rarity: revealedPanel.rarity,
        reward: revealedPanel.reward,
        netProfit: revealedPanel.reward - revealedPanel.costPaid,
        comboLabel: revealedPanel.comboLabel,
        specialLabel: revealedPanel.specialEffect.label,
        createdAt: Date.now(),
      };
      const tone = revealedPanel.rarity === 'legendary' || revealedPanel.rarity === 'mythic' ? 'rare' : 'reward';

      set({
        coins: nextCoins,
        currentPanel: revealedPanel,
        stats: nextStats,
        recentResults: appendLog(state.recentResults, resultEntry),
        lastRevealAt: Date.now(),
        feedbacks: appendToast(state.feedbacks, {
          id: `reward_${Date.now()}`,
          label: `${revealedPanel.specialEffect.label} +${revealedPanel.reward.toLocaleString('ko-KR')}`,
          tone,
        }),
      });
    },
    buyUpgrade: (id) => {
      const state = get();
      const level = getUpgradeLevel(state, id);
      const price = getUpgradePrice(id, level);
      if (state.coins < price || !Number.isFinite(price)) return;

      const upgrades = { ...state.upgrades, [id]: level + 1 };
      const nextCore = {
        ...state,
        upgrades,
        coins: state.coins - price,
      };

      set({
        upgrades,
        coins: state.coins - price,
        computed: deriveComputedState(nextCore),
        feedbacks: appendToast(state.feedbacks, {
          id: `upgrade_${Date.now()}`,
          label: '업그레이드 강화',
          tone: 'system',
        }),
      });
    },
    buyMetaUpgrade: (id) => {
      const state = get();
      const level = Number(state.metaUpgrades[id] || 0);
      const price = getMetaUpgradePrice(id, level);
      if (state.resonanceDust < price || !Number.isFinite(price)) return;

      const metaUpgrades = { ...state.metaUpgrades, [id]: level + 1 };
      const nextCore = {
        ...state,
        metaUpgrades,
        resonanceDust: state.resonanceDust - price,
      };

      set({
        metaUpgrades,
        resonanceDust: state.resonanceDust - price,
        computed: deriveComputedState(nextCore),
      });
    },
    performPrestige: () => {
      const state = get();
      const preview = getPrestigePreview(state.stats.totalCoinsEarned, state.stats.prestigeCount);
      if (!preview.canPrestige) return;

      const fresh = createEmptySave();
      const nextCore = ensurePanel({
        ...fresh,
        resonanceDust: state.resonanceDust + preview.dustGain,
        metaUpgrades: { ...state.metaUpgrades },
        settings: { ...state.settings },
        tutorial: { ...state.tutorial, dismissed: true },
        stats: {
          ...fresh.stats,
          prestigeCount: state.stats.prestigeCount + 1,
        },
      });

      set({
        ...withComputed(nextCore),
        hydrated: true,
        feedbacks: appendToast(state.feedbacks, {
          id: `prestige_${Date.now()}`,
          label: `재조율 완료 +공명 가루 ${preview.dustGain}`,
          tone: 'rare',
        }),
      });
    },
    dismissTutorial: () => {
      const state = get();
      set({ tutorial: { ...state.tutorial, dismissed: true } });
    },
    updateSettings: (patch) => {
      const state = get();
      set({
        settings: {
          ...state.settings,
          ...patch,
        },
      });
    },
    exportSaveString: () => exportGameSave(get()),
    importSaveString: (payload) => {
      try {
        const imported = importGameSave(payload);
        const merged = ensurePanel({
          ...createEmptySave(),
          ...imported,
          settings: { ...INITIAL_SETTINGS, ...(imported.settings || {}) },
        });
        set({
          ...withComputed(merged),
          hydrated: true,
          feedbacks: [{ id: `import_${Date.now()}`, label: '데이터를 불러왔습니다.', tone: 'system' }],
        });
        return true;
      } catch {
        return false;
      }
    },
    resetProgress: () => {
      clearGameSave();
      const fresh = ensurePanel(createEmptySave());
      set({
        ...withComputed(fresh),
        hydrated: true,
        feedbacks: [{ id: `reset_${Date.now()}`, label: '서고를 초기화했습니다.', tone: 'warning' }],
      });
    },
    removeFeedback: (id) => {
      const state = get();
      set({ feedbacks: state.feedbacks.filter((entry) => entry.id !== id) });
    },
    saveNow: () => {
      persistSnapshot(get());
    },
  };
});

export function useUpgradeCards() {
  return useGameStore((state) => buildUpgradeCards(state));
}

export function useMetaUpgradeCards() {
  return useGameStore((state) => buildMetaUpgradeCards(state));
}

export function usePrestigePreview() {
  return useGameStore((state) => getPrestigePreview(state.stats.totalCoinsEarned, state.stats.prestigeCount));
}
