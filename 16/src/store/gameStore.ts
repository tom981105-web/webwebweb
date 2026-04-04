import { create } from 'zustand';

import { META_UPGRADES, UPGRADES } from '@/data/upgrades';
import { PANEL_TIERS, SAVE_VERSION, TIER_ORDER } from '@/data/balance';
import {
  deriveValues,
  getHighestUnlockedTier,
  getMetaDefinition,
  getMetaLevel,
  getMetaUpgradeCost,
  getUpgradeCost,
  getUpgradeDefinition,
  getUpgradeLevel,
  getUpgradeUnlockReason,
} from '@/game/economy';
import { applyOfflineProgress } from '@/game/offline';
import { createPanel } from '@/game/panelFactory';
import { clearSave, exportSave, importSave, loadSave, saveGame } from '@/game/save';
import type { FeedbackBurst, FeedbackTone, GameState, RecentResultLog, SaveState, TierId, UpgradeProgress } from '@/types/game';
import { clamp, uid } from '@/utils/format';

function createUpgradeProgress() {
  return UPGRADES.reduce<UpgradeProgress>((acc, upgrade) => {
    acc[upgrade.id] = 0;
    return acc;
  }, {});
}

function createMetaProgress() {
  return META_UPGRADES.reduce<UpgradeProgress>((acc, upgrade) => {
    acc[upgrade.id] = 0;
    return acc;
  }, {});
}

function createStarterSave(): SaveState {
  const now = Date.now();
  return {
    version: SAVE_VERSION,
    coins: 36,
    sigils: 0,
    selectedTier: 'basic',
    currentPanel: null,
    upgrades: createUpgradeProgress(),
    metaUpgrades: createMetaProgress(),
    stats: {
      totalCoinsEarned: 36,
      totalPanelsOpened: 0,
      totalScratchActions: 0,
      totalScratchDistance: 0,
      bestSingleReward: 0,
      rareSymbolsFound: 0,
      automatedCoinsEarned: 0,
      prestigeCount: 0,
      criticalRewards: 0,
      jackpotRewards: 0,
      perTierOpens: { basic: 0, advanced: 0, rare: 0, legendary: 0, mythic: 0 },
      perTierRewards: { basic: 0, advanced: 0, rare: 0, legendary: 0, mythic: 0 },
    },
    recentResults: [],
    tutorial: { dismissed: false },
    settings: {
      compactNumbers: true,
      reducedMotion: false,
    },
    automation: {
      lastTickAt: now,
      nextAutoBuyAt: now,
      nextAutoLoopAt: now,
      nextAutoScratchAt: now,
    },
    lastSavedAt: now,
    lastOpenedAt: now,
  };
}

function snapshot(state: GameState): SaveState {
  return {
    version: state.version,
    coins: state.coins,
    sigils: state.sigils,
    selectedTier: state.selectedTier,
    currentPanel: state.currentPanel,
    upgrades: state.upgrades,
    metaUpgrades: state.metaUpgrades,
    stats: state.stats,
    recentResults: state.recentResults,
    tutorial: state.tutorial,
    settings: state.settings,
    automation: state.automation,
    lastSavedAt: state.lastSavedAt,
    lastOpenedAt: state.lastOpenedAt,
  };
}

function pushFeedback(queue: FeedbackBurst[], label: string, tone: FeedbackTone, amount?: number) {
  return [...queue, { id: uid('fx'), label, tone, amount }].slice(-6);
}

function spawnStarterPanel(state: SaveState) {
  const derived = deriveValues(state);
  const panel = createPanel('basic', derived.rewardMultiplier, derived.rareChanceBonus, derived.jackpotMultiplier, derived.criticalChance);
  panel.purchaseCost = 0;
  state.currentPanel = panel;
  state.stats.totalPanelsOpened += 1;
  state.stats.perTierOpens.basic += 1;
}

function ensurePanel(state: SaveState) {
  if (!state.currentPanel) {
    spawnStarterPanel(state);
  }
}

function createRecentResult(state: SaveState, automated: boolean): RecentResultLog | null {
  if (!state.currentPanel) return null;
  return {
    id: uid('log'),
    at: Date.now(),
    tier: state.currentPanel.tier,
    rarity: state.currentPanel.rarity,
    reward: state.currentPanel.result.finalReward,
    summary: state.currentPanel.result.summaryText,
    tone: state.currentPanel.result.tone,
    automated,
  };
}

export const useGameStore = create<GameState>((set, get) => {
  const commit = (next: SaveState, feedbackBursts?: FeedbackBurst[]) => {
    next.lastSavedAt = Date.now();
    set({
      ...next,
      hydrated: true,
      derived: deriveValues(next),
      feedbackBursts: feedbackBursts ?? get().feedbackBursts,
    });
  };

  const buyPanelInternal = (next: SaveState, tier: TierId, automated: boolean, feedbackBursts: FeedbackBurst[]) => {
    const highestTier = getHighestUnlockedTier(next.stats.totalCoinsEarned);
    const targetTier = TIER_ORDER.indexOf(tier) <= TIER_ORDER.indexOf(highestTier) ? tier : highestTier;
    const firstFree = next.stats.totalPanelsOpened === 0 && targetTier === 'basic';
    const price = firstFree ? 0 : PANEL_TIERS[targetTier].price;
    if (!firstFree && next.coins < price) return { next, feedbackBursts };

    if (!firstFree) next.coins -= price;
    const derived = deriveValues(next);
      next.currentPanel = createPanel(targetTier, derived.rewardMultiplier, derived.rareChanceBonus, derived.jackpotMultiplier, derived.criticalChance);
    next.stats.totalPanelsOpened += 1;
    next.stats.perTierOpens[targetTier] += 1;
    next.automation.nextAutoScratchAt = Date.now();

    return {
      next,
      feedbackBursts: automated
        ? pushFeedback(feedbackBursts, `${PANEL_TIERS[targetTier].label} started automatically`, 'normal')
        : feedbackBursts,
    };
  };

  return {
    ...createStarterSave(),
    hydrated: false,
    feedbackBursts: [],
    derived: deriveValues(createStarterSave()),
    initialize: () => {
      const loaded = structuredClone(loadSave() ?? createStarterSave());
      loaded.selectedTier = TIER_ORDER.includes(loaded.selectedTier) ? loaded.selectedTier : 'basic';
      const highestUnlockedTier = getHighestUnlockedTier(loaded.stats.totalCoinsEarned);
      if (TIER_ORDER.indexOf(loaded.selectedTier) > TIER_ORDER.indexOf(highestUnlockedTier)) {
        loaded.selectedTier = highestUnlockedTier;
      }
      ensurePanel(loaded);
      const derived = deriveValues(loaded);
      const offline = applyOfflineProgress(loaded, derived.currentCpsEstimate, derived.offlineEfficiency);
      saveGame(loaded);
      const feedback = offline && offline.earnedCoins > 0
        ? pushFeedback([], 'Offline gains recovered', 'rare', offline.earnedCoins)
        : [];
      commit(loaded, feedback);
    },
    tick: (deltaMs) => {
      const current = get();
      if (!current.hydrated) return;

      const next = structuredClone(snapshot(current));
      let feedbackBursts = current.feedbackBursts;
      const now = Date.now();
      const derived = deriveValues(next);

      if (!next.currentPanel) {
        if (derived.autoBuyUnlocked && now >= next.automation.nextAutoBuyAt) {
          const bought = buyPanelInternal(next, next.selectedTier, true, feedbackBursts);
          feedbackBursts = bought.feedbackBursts;
          next.automation.nextAutoBuyAt = now + 420;
        }
      }

      if (next.currentPanel && !next.currentPanel.revealed && derived.autoScratchUnlocked) {
        const nextPercent = clamp(next.currentPanel.scratchedPercent + derived.autoScratchRate * (deltaMs / 1000) * 100, 0, 100);
        next.currentPanel.scratchedPercent = Math.max(next.currentPanel.scratchedPercent, nextPercent);
      }

      if (next.currentPanel && !next.currentPanel.revealed && derived.autoRevealUnlocked) {
        if (next.currentPanel.scratchedPercent >= derived.autoRevealThreshold * 100) {
          next.currentPanel.revealed = true;
          next.coins += next.currentPanel.result.finalReward;
          next.stats.totalCoinsEarned += next.currentPanel.result.finalReward;
          next.stats.automatedCoinsEarned += next.currentPanel.result.finalReward;
          next.stats.perTierRewards[next.currentPanel.tier] += next.currentPanel.result.finalReward;
          next.stats.bestSingleReward = Math.max(next.stats.bestSingleReward, next.currentPanel.result.finalReward);
          next.stats.rareSymbolsFound += next.currentPanel.result.rareSymbolCount;
          if (next.currentPanel.result.critical) next.stats.criticalRewards += 1;
          if (next.currentPanel.result.jackpot) next.stats.jackpotRewards += 1;
          const log = createRecentResult(next, true);
          if (log) next.recentResults = [log, ...next.recentResults].slice(0, 10);
          feedbackBursts = pushFeedback(
            feedbackBursts,
            next.currentPanel.result.jackpot ? 'Jackpot burst' : 'Auto reveal finished',
            next.currentPanel.result.tone,
            next.currentPanel.result.finalReward,
          );
          next.automation.nextAutoLoopAt = now + 900;
        }
      }

      if (next.currentPanel?.revealed && derived.autoLoopUnlocked && now >= next.automation.nextAutoLoopAt) {
        next.currentPanel = null;
        next.automation.nextAutoBuyAt = now + 260;
      }

      commit(next, feedbackBursts);
    },
    saveNow: () => {
      const next = structuredClone(snapshot(get()));
      next.lastSavedAt = Date.now();
      saveGame(next);
      set({ lastSavedAt: next.lastSavedAt });
    },
    dismissTutorial: () => {
      const next = structuredClone(snapshot(get()));
      next.tutorial.dismissed = true;
      commit(next);
    },
    setSelectedTier: (selectedTier) => {
      const next = structuredClone(snapshot(get()));
      const unlockedTier = getHighestUnlockedTier(next.stats.totalCoinsEarned);
      next.selectedTier = TIER_ORDER.indexOf(selectedTier) <= TIER_ORDER.indexOf(unlockedTier) ? selectedTier : unlockedTier;
      commit(next);
    },
    buyPanel: (tier, automated = false) => {
      const next = structuredClone(snapshot(get()));
      if (next.currentPanel && !next.currentPanel.revealed) return;
      const result = buyPanelInternal(next, tier ?? next.selectedTier, automated, get().feedbackBursts);
      commit(result.next, result.feedbackBursts);
    },
    updateScratchProgress: (percent) => {
      const current = get();
      const next = structuredClone(snapshot(current));
      if (!next.currentPanel || next.currentPanel.revealed) return;
      const derived = deriveValues(next);
      const effectivePercent = clamp(percent * derived.scratchEfficiency, 0, 100);
      const crossedRevealLine =
        next.currentPanel.scratchedPercent < derived.autoRevealThreshold * 100 &&
        effectivePercent >= derived.autoRevealThreshold * 100;
      next.currentPanel.scratchedPercent = Math.max(next.currentPanel.scratchedPercent, effectivePercent);
      const feedback = crossedRevealLine
        ? pushFeedback(current.feedbackBursts, 'The seal is loosening', 'normal')
        : current.feedbackBursts;
      commit(next, feedback);
    },
    addScratchDistance: (distance) => {
      if (!Number.isFinite(distance) || distance <= 0) return;
      const next = structuredClone(snapshot(get()));
      next.stats.totalScratchActions += 1;
      next.stats.totalScratchDistance += distance;
      commit(next);
    },
    revealCurrentPanel: (source) => {
      const current = get();
      const next = structuredClone(snapshot(current));
      if (!next.currentPanel || next.currentPanel.revealed) return;

      const derived = deriveValues(next);
      if (next.currentPanel.scratchedPercent < derived.autoRevealThreshold * 100) return;

      next.currentPanel.revealed = true;
      next.coins += next.currentPanel.result.finalReward;
      next.stats.totalCoinsEarned += next.currentPanel.result.finalReward;
      next.stats.perTierRewards[next.currentPanel.tier] += next.currentPanel.result.finalReward;
      next.stats.bestSingleReward = Math.max(next.stats.bestSingleReward, next.currentPanel.result.finalReward);
      next.stats.rareSymbolsFound += next.currentPanel.result.rareSymbolCount;
      if (source === 'auto') next.stats.automatedCoinsEarned += next.currentPanel.result.finalReward;
      if (next.currentPanel.result.critical) next.stats.criticalRewards += 1;
      if (next.currentPanel.result.jackpot) next.stats.jackpotRewards += 1;

      const log = createRecentResult(next, source === 'auto');
      if (log) next.recentResults = [log, ...next.recentResults].slice(0, 10);

      const feedback = pushFeedback(
        current.feedbackBursts,
        next.currentPanel.result.jackpot ? 'Jackpot revealed' : next.currentPanel.result.critical ? 'Critical reward' : 'Reward claimed',
        next.currentPanel.result.tone,
        next.currentPanel.result.finalReward,
      );

      next.automation.nextAutoLoopAt = Date.now() + 900;
      commit(next, feedback);
    },
    buyUpgrade: (id) => {
      const current = get();
      const next = structuredClone(snapshot(current));
      const definition = getUpgradeDefinition(id);
      if (!definition) return;
      const unlockReason = getUpgradeUnlockReason(definition, next);
      if (unlockReason) return;
      const level = getUpgradeLevel(next.upgrades, id);
      const cost = getUpgradeCost(definition, level);
      if (!Number.isFinite(cost) || next.coins < cost) return;
      next.coins -= cost;
      next.upgrades[id] = level + 1;
      const feedback = pushFeedback(current.feedbackBursts, `${definition.label} upgraded`, 'rare');
      commit(next, feedback);
    },
    buyMetaUpgrade: (id) => {
      const current = get();
      const next = structuredClone(snapshot(current));
      const definition = getMetaDefinition(id);
      if (!definition) return;
      const level = getMetaLevel(next.metaUpgrades, id);
      const cost = getMetaUpgradeCost(definition, level);
      if (!Number.isFinite(cost) || next.sigils < cost) return;
      next.sigils -= cost;
      next.metaUpgrades[id] = level + 1;
      const feedback = pushFeedback(current.feedbackBursts, `${definition.label} aligned`, 'epic');
      commit(next, feedback);
    },
    toggleCompactNumbers: () => {
      const next = structuredClone(snapshot(get()));
      next.settings.compactNumbers = !next.settings.compactNumbers;
      commit(next);
    },
    toggleReducedMotion: () => {
      const next = structuredClone(snapshot(get()));
      next.settings.reducedMotion = !next.settings.reducedMotion;
      commit(next);
    },
    exportSaveString: () => exportSave(snapshot(get())),
    importSaveString: (payload) => {
      try {
        const imported = importSave(payload);
        imported.lastOpenedAt = Date.now();
        saveGame(imported);
        commit(imported, []);
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error instanceof Error ? error.message : 'Failed to import save.' };
      }
    },
    resetProgress: () => {
      clearSave();
      const fresh = createStarterSave();
      ensurePanel(fresh);
      saveGame(fresh);
      commit(fresh, []);
    },
    performPrestige: () => {
      const current = get();
      const next = structuredClone(snapshot(current));
      const derived = deriveValues(next);
      if (derived.prestigeGain <= 0) return;

      const nextMeta = { ...next.metaUpgrades };
      const nextSettings = { ...next.settings };
      const nextTutorial = { ...next.tutorial, dismissed: true };
      const nextSigils = next.sigils + derived.prestigeGain;
      const nextPrestigeCount = next.stats.prestigeCount + 1;

      const fresh = createStarterSave();
      fresh.sigils = nextSigils;
      fresh.metaUpgrades = nextMeta;
      fresh.settings = nextSettings;
      fresh.tutorial = nextTutorial;
      fresh.stats.prestigeCount = nextPrestigeCount;
      fresh.stats.totalCoinsEarned = 48 + getMetaLevel(nextMeta, 'legacy-automation') * 24;
      fresh.coins = 48 + getMetaLevel(nextMeta, 'legacy-automation') * 24;
      ensurePanel(fresh);
      saveGame(fresh);
      const feedback = pushFeedback([], 'Archive retuned', 'jackpot', derived.prestigeGain);
      commit(fresh, feedback);
    },
    consumeFeedbackBurst: (id) => set((state) => ({ feedbackBursts: state.feedbackBursts.filter((entry) => entry.id !== id) })),
  };
});
