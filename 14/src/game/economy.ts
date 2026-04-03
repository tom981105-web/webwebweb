import {
  INITIAL_SETTINGS,
  INITIAL_STATS,
  INITIAL_UPGRADES,
  META_UPGRADE_DEFAULTS,
  PANEL_TIERS,
  RECENT_LOG_LIMIT,
} from '@/data/balance';
import { META_UPGRADE_DEFINITIONS, UPGRADE_DEFINITIONS } from '@/data/upgrades';
import { createPanel } from '@/game/panelFactory';
import { countRareSymbols } from '@/game/rewardRules';
import type {
  GameComputed,
  GameSaveState,
  MetaUpgradeCardState,
  MetaUpgradeId,
  PanelCard,
  PanelTierId,
  ResultLogEntry,
  ScratchFeedback,
  StatsState,
  UpgradeCardState,
  UpgradeId,
} from '@/types/game';
import { clamp } from '@/utils/random';

export function createEmptySave(): GameSaveState {
  return {
    version: 1,
    coins: 42,
    resonanceDust: 0,
    selectedTier: 'basic',
    currentPanel: null,
    upgrades: { ...INITIAL_UPGRADES },
    metaUpgrades: { ...META_UPGRADE_DEFAULTS },
    stats: structuredClone(INITIAL_STATS),
    recentResults: [],
    settings: { ...INITIAL_SETTINGS },
    tutorial: { dismissed: false, step: 0 },
    sessionId: `session_${Date.now().toString(36)}`,
    lastSavedAt: Date.now(),
    lastOpenedAt: Date.now(),
  };
}

export function normalizeSaveState(input: Partial<GameSaveState> | null | undefined): GameSaveState {
  const base = createEmptySave();
  if (!input) return base;

  return {
    ...base,
    ...input,
    upgrades: { ...base.upgrades, ...(input.upgrades || {}) },
    metaUpgrades: { ...base.metaUpgrades, ...(input.metaUpgrades || {}) },
    stats: {
      ...base.stats,
      ...(input.stats || {}),
      tierRewards: { ...base.stats.tierRewards, ...(input.stats?.tierRewards || {}) },
      tierOpenCount: { ...base.stats.tierOpenCount, ...(input.stats?.tierOpenCount || {}) },
    },
    settings: { ...base.settings, ...(input.settings || {}) },
    tutorial: { ...base.tutorial, ...(input.tutorial || {}) },
  };
}

export function getUpgradeLevel(state: GameSaveState, id: UpgradeId) {
  return Number(state.upgrades[id] || 0);
}

export function getMetaUpgradeLevel(state: GameSaveState, id: MetaUpgradeId) {
  return Number(state.metaUpgrades[id] || 0);
}

export function getUpgradePrice(id: UpgradeId, level: number) {
  const def = UPGRADE_DEFINITIONS.find((entry) => entry.id === id);
  if (!def) return Infinity;
  if (level >= def.maxLevel) return Infinity;
  if (def.kind === 'unlock' && level > 0) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costGrowth, level));
}

export function getMetaUpgradePrice(id: MetaUpgradeId, level: number) {
  const def = META_UPGRADE_DEFINITIONS.find((entry) => entry.id === id);
  if (!def) return Infinity;
  if (level >= def.maxLevel) return Infinity;
  return Math.floor(def.baseCost * Math.pow(def.costGrowth, level));
}

export function deriveComputedState(state: GameSaveState): GameComputed {
  const brushRadius = 24 + getUpgradeLevel(state, 'brushRadius') * 3.2;
  const scratchPower = 1 + getUpgradeLevel(state, 'scratchFlow') * 0.16;
  const revealThreshold = clamp(
    56 - getUpgradeLevel(state, 'revealEase') * 1.75 - getMetaUpgradeLevel(state, 'fortuneAtlas') * 0.8,
    39,
    56,
  );
  const payoutMultiplier =
    1 +
    getUpgradeLevel(state, 'payoutBoost') * 0.09 +
    getMetaUpgradeLevel(state, 'legacyMint') * 0.1 +
    getUpgradeLevel(state, 'glimmerBeacon') * 0.03;
  const critChance = clamp(
    0.05 + getUpgradeLevel(state, 'criticalGleam') * 0.026 + getUpgradeLevel(state, 'glimmerBeacon') * 0.005,
    0.05,
    0.42,
  );
  const critMultiplier = 2.05 + getUpgradeLevel(state, 'criticalGleam') * 0.1 + getMetaUpgradeLevel(state, 'legacyMint') * 0.08;
  const jackpotMultiplier = 1.9 + getUpgradeLevel(state, 'jackpotLens') * 0.14;
  const rareBoost =
    getUpgradeLevel(state, 'rareSight') * 1.45 +
    getMetaUpgradeLevel(state, 'fortuneAtlas') * 1.9 +
    getUpgradeLevel(state, 'glimmerBeacon') * 0.65;
  const autoBuyEnabled = getUpgradeLevel(state, 'autoBuyer') > 0 || getMetaUpgradeLevel(state, 'awakenedServo') >= 2;
  const autoScratchEnabled = getUpgradeLevel(state, 'autoScratch') > 0 || getMetaUpgradeLevel(state, 'awakenedServo') >= 1;
  const autoRevealEnabled = getUpgradeLevel(state, 'autoReveal') > 0;
  const autoLoopEnabled = getUpgradeLevel(state, 'autoLoop') > 0;
  const autoScratchPerSecond =
    (autoScratchEnabled ? 12.5 : 0) +
    getUpgradeLevel(state, 'droneRig') * 5 +
    getMetaUpgradeLevel(state, 'awakenedServo') * 2.4;
  const autoBuyIntervalMs = clamp(
    3200 - getUpgradeLevel(state, 'droneRig') * 220 - getMetaUpgradeLevel(state, 'awakenedServo') * 180,
    700,
    3200,
  );
  const offlineEfficiency = clamp(
    0.32 + getUpgradeLevel(state, 'offlineLedger') * 0.1 + getMetaUpgradeLevel(state, 'legacyMint') * 0.03,
    0.32,
    0.92,
  );
  const currentTier = PANEL_TIERS[state.selectedTier];
  const averageReward = currentTier.cost * currentTier.expectedValue * payoutMultiplier;
  const currentCpsEstimate =
    autoBuyEnabled && autoScratchEnabled ? (1000 / autoBuyIntervalMs) * averageReward * 0.58 : 0;

  return {
    brushRadius,
    scratchPower,
    revealThreshold,
    payoutMultiplier,
    critChance,
    critMultiplier,
    jackpotMultiplier,
    rareBoost,
    autoBuyEnabled,
    autoScratchEnabled,
    autoRevealEnabled,
    autoLoopEnabled,
    autoScratchPerSecond,
    autoBuyIntervalMs,
    offlineEfficiency,
    currentCpsEstimate,
    manualStrengthScore: scratchPower * brushRadius,
  };
}

export function getTierCost(state: GameSaveState, tier: PanelTierId) {
  const base = PANEL_TIERS[tier].cost;
  if (state.stats.totalPanelsScratched === 0 && tier === 'basic') return 0;
  const freeSigilLevel = getMetaUpgradeLevel(state, 'freeSigil');
  const discountRate = Math.min(0.55, freeSigilLevel * 0.05);
  return Math.max(0, Math.floor(base * (1 - discountRate)));
}

export function createTierPanel(state: GameSaveState, tier: PanelTierId, manualDiscount = 0) {
  const computed = deriveComputedState(state);
  return createPanel(tier, computed, manualDiscount);
}

export function createStarterPanel(state: GameSaveState) {
  return createTierPanel(state, 'basic', PANEL_TIERS.basic.cost);
}

export function buildUpgradeCards(state: GameSaveState): UpgradeCardState[] {
  return UPGRADE_DEFINITIONS.map((definition) => {
    const level = getUpgradeLevel(state, definition.id);
    const price = getUpgradePrice(definition.id, level);
    const locked = Boolean(
      state.stats.totalCoinsEarned < definition.unlockAtCoins ||
      (definition.unlockAtScratches && state.stats.totalPanelsScratched < definition.unlockAtScratches) ||
      (definition.unlockAtPrestige && state.stats.prestigeCount < definition.unlockAtPrestige),
    );
    return {
      definition,
      level,
      price,
      locked,
      affordable: !locked && state.coins >= price,
    };
  });
}

export function buildMetaUpgradeCards(state: GameSaveState): MetaUpgradeCardState[] {
  return META_UPGRADE_DEFINITIONS.map((definition) => {
    const level = getMetaUpgradeLevel(state, definition.id);
    const price = getMetaUpgradePrice(definition.id, level);
    return {
      definition,
      level,
      price,
      affordable: state.resonanceDust >= price,
    };
  });
}

export function appendLog(list: ResultLogEntry[], entry: ResultLogEntry) {
  return [entry, ...list].slice(0, RECENT_LOG_LIMIT);
}

export function appendToast(list: ScratchFeedback[], toast: ScratchFeedback) {
  return [...list.slice(-2), toast];
}

export function applyRewardToStats(
  stats: StatsState,
  panel: PanelCard,
  reward: number,
  options: { automated: boolean; automationShare: number },
) {
  return {
    ...stats,
    totalCoinsEarned: stats.totalCoinsEarned + reward,
    totalPanelsScratched: stats.totalPanelsScratched + 1,
    highestReward: Math.max(stats.highestReward, reward),
    rareSymbolsFound: stats.rareSymbolsFound + countRareSymbols(panel.symbols),
    automationCoinsEarned: stats.automationCoinsEarned + options.automationShare,
    totalManualReveals: stats.totalManualReveals + (options.automated ? 0 : 1),
    tierRewards: {
      ...stats.tierRewards,
      [panel.tier]: stats.tierRewards[panel.tier] + reward,
    },
    tierOpenCount: {
      ...stats.tierOpenCount,
      [panel.tier]: stats.tierOpenCount[panel.tier] + 1,
    },
  };
}
