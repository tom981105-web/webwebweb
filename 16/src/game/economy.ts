import { PANEL_TIERS, PRESTIGE_THRESHOLD, TIER_ORDER } from '@/data/balance';
import { META_UPGRADES, UPGRADES } from '@/data/upgrades';
import type {
  DerivedValues,
  MetaUpgradeDefinition,
  MetaUpgradeProgress,
  SaveState,
  TierId,
  UpgradeDefinition,
  UpgradeProgress,
} from '@/types/game';
import { clamp } from '@/utils/format';

export function getUpgradeCost(definition: UpgradeDefinition, level: number) {
  if (level >= definition.maxLevel) return Infinity;
  return Math.round(definition.baseCost * Math.pow(definition.costScale, level));
}

export function getMetaUpgradeCost(definition: MetaUpgradeDefinition, level: number) {
  if (level >= definition.maxLevel) return Infinity;
  return Math.round(definition.baseCost * Math.pow(definition.costScale, level));
}

export function getUpgradeLevel(progress: UpgradeProgress, id: string) {
  return progress[id] ?? 0;
}

export function getMetaLevel(progress: MetaUpgradeProgress, id: string) {
  return progress[id] ?? 0;
}

export function getUpgradeUnlockReason(definition: UpgradeDefinition, state: SaveState) {
  if (definition.unlockAtPrestige && state.stats.prestigeCount < definition.unlockAtPrestige) {
    return `Unlocks after ${definition.unlockAtPrestige} retunes.`;
  }
  if (definition.unlockAtTotalCoins && state.stats.totalCoinsEarned < definition.unlockAtTotalCoins) {
    return `Earn ${definition.unlockAtTotalCoins.toLocaleString('en-US')} total coins to unlock.`;
  }
  return '';
}

export function getTierUnlockReason(tier: TierId, totalCoins: number) {
  const tierDef = PANEL_TIERS[tier];
  if (totalCoins >= tierDef.unlockAtTotalCoins) return '';
  return `Unlock at ${tierDef.unlockAtTotalCoins.toLocaleString('en-US')} total coins.`;
}

export function isTierUnlocked(tier: TierId, totalCoins: number) {
  return totalCoins >= PANEL_TIERS[tier].unlockAtTotalCoins;
}

export function getHighestUnlockedTier(totalCoins: number): TierId {
  return [...TIER_ORDER].reverse().find((tier) => isTierUnlocked(tier, totalCoins)) ?? 'basic';
}

export function deriveValues(state: SaveState): DerivedValues {
  const brushLevel = getUpgradeLevel(state.upgrades, 'brush-size');
  const scratchEfficiencyLevel = getUpgradeLevel(state.upgrades, 'scratch-efficiency');
  const rewardLevel = getUpgradeLevel(state.upgrades, 'reward-multiplier');
  const luckLevel = getUpgradeLevel(state.upgrades, 'symbol-luck');
  const thresholdLevel = getUpgradeLevel(state.upgrades, 'auto-reveal-threshold');
  const autoScratchLevel = getUpgradeLevel(state.upgrades, 'auto-scratch');
  const critLevel = getUpgradeLevel(state.upgrades, 'crit-chance');
  const jackpotLevel = getUpgradeLevel(state.upgrades, 'jackpot-boost');
  const offlineLevel = getUpgradeLevel(state.upgrades, 'offline-efficiency');

  const legacyReward = getMetaLevel(state.metaUpgrades, 'legacy-reward');
  const legacyLuck = getMetaLevel(state.metaUpgrades, 'legacy-luck');
  const legacyAuto = getMetaLevel(state.metaUpgrades, 'legacy-automation');
  const legacySigil = getMetaLevel(state.metaUpgrades, 'legacy-sigil');

  const selectedTier = PANEL_TIERS[state.selectedTier];
  const brushRadius = 18 + brushLevel * 3.5 + legacyAuto * 2;
  const scratchEfficiency = 1 + scratchEfficiencyLevel * 0.085 + legacyAuto * 0.03;
  const rewardMultiplier = 1 + rewardLevel * 0.12 + legacyReward * 0.09;
  const rareChanceBonus = luckLevel * 0.022 + legacyLuck * 0.03;
  const autoRevealThreshold = clamp(0.58 - thresholdLevel * 0.035 - legacyAuto * 0.01, 0.26, 0.6);
  const criticalChance = clamp(0.02 + critLevel * 0.03 + legacyLuck * 0.01, 0.02, 0.42);
  const jackpotMultiplier = 1 + jackpotLevel * 0.36 + legacyReward * 0.08;
  const offlineEfficiency = clamp(0.25 + offlineLevel * 0.16 + legacyAuto * 0.08, 0.25, 1.4);
  const autoBuyUnlocked = getUpgradeLevel(state.upgrades, 'auto-buy') > 0 || legacyAuto >= 2;
  const autoScratchUnlocked = autoScratchLevel > 0 || legacyAuto >= 1;
  const autoLoopUnlocked = getUpgradeLevel(state.upgrades, 'auto-loop') > 0 || legacyAuto >= 3;
  const autoRevealUnlocked = getUpgradeLevel(state.upgrades, 'auto-reveal') > 0 || legacyAuto >= 2;
  const autoScratchRate = autoScratchUnlocked
    ? selectedTier.autoScratchRate + autoScratchLevel * 0.05 + legacyAuto * 0.028
    : 0;

  const expectedBaseReward = (selectedTier.baseRewardMin + selectedTier.baseRewardMax) / 2;
  const expectedGross = expectedBaseReward * 1.42 * rewardMultiplier;
  const expectedNet = Math.max(0, expectedGross - selectedTier.price);
  const cycleSeconds = autoScratchUnlocked ? autoRevealThreshold / Math.max(0.08, autoScratchRate) + 0.8 : 0;
  const currentCpsEstimate = autoBuyUnlocked && autoScratchUnlocked ? expectedNet / Math.max(1.4, cycleSeconds) : 0;
  const prestigeGain =
    state.stats.totalCoinsEarned >= PRESTIGE_THRESHOLD
      ? Math.max(1, Math.floor(Math.sqrt(state.stats.totalCoinsEarned / PRESTIGE_THRESHOLD) * (1 + legacySigil * 0.18)))
      : 0;

  return {
    brushRadius,
    scratchEfficiency,
    rewardMultiplier,
    rareChanceBonus,
    autoRevealThreshold,
    criticalChance,
    jackpotMultiplier,
    offlineEfficiency,
    autoBuyUnlocked,
    autoScratchUnlocked,
    autoLoopUnlocked,
    autoRevealUnlocked,
    autoScratchRate,
    currentCpsEstimate,
    prestigeGain,
  };
}

export function getUpgradeEffectPreview(definitionId: string, level: number) {
  switch (definitionId) {
    case 'brush-size':
      return { current: `${18 + level * 3.5}px`, next: `${18 + (level + 1) * 3.5}px` };
    case 'scratch-efficiency':
      return { current: `${((1 + level * 0.085) * 100).toFixed(0)}%`, next: `${((1 + (level + 1) * 0.085) * 100).toFixed(0)}%` };
    case 'auto-reveal-threshold':
      return {
        current: `${Math.round((0.58 - level * 0.035) * 100)}%`,
        next: `${Math.round((0.58 - (level + 1) * 0.035) * 100)}%`,
      };
    case 'reward-multiplier':
      return { current: `${Math.round((1 + level * 0.12) * 100)}%`, next: `${Math.round((1 + (level + 1) * 0.12) * 100)}%` };
    case 'symbol-luck':
      return { current: `+${(level * 2.2).toFixed(1)}%`, next: `+${((level + 1) * 2.2).toFixed(1)}%` };
    case 'crit-chance':
      return { current: `${(2 + level * 3).toFixed(0)}%`, next: `${(2 + (level + 1) * 3).toFixed(0)}%` };
    case 'jackpot-boost':
      return { current: `${(1 + level * 0.36).toFixed(2)}x`, next: `${(1 + (level + 1) * 0.36).toFixed(2)}x` };
    case 'auto-buy':
      return { current: level ? 'Unlocked' : 'Locked', next: 'Unlocked' };
    case 'auto-scratch':
      return { current: `+${(level * 5).toFixed(0)}%/s`, next: `+${((level + 1) * 5).toFixed(0)}%/s` };
    case 'auto-reveal':
      return { current: level ? 'Active' : 'Locked', next: 'Active' };
    case 'auto-loop':
      return { current: level ? 'Active' : 'Locked', next: 'Active' };
    case 'offline-efficiency':
      return { current: `${Math.round((0.25 + level * 0.16) * 100)}%`, next: `${Math.round((0.25 + (level + 1) * 0.16) * 100)}%` };
    default:
      return { current: `${level}`, next: `${level + 1}` };
  }
}

export function getMetaEffectPreview(definitionId: string, level: number) {
  switch (definitionId) {
    case 'legacy-reward':
      return { current: `${Math.round((1 + level * 0.09) * 100)}%`, next: `${Math.round((1 + (level + 1) * 0.09) * 100)}%` };
    case 'legacy-luck':
      return { current: `+${(level * 3).toFixed(0)}%`, next: `+${((level + 1) * 3).toFixed(0)}%` };
    case 'legacy-automation':
      return { current: `+${level}`, next: `+${level + 1}` };
    case 'legacy-sigil':
      return { current: `${Math.round((1 + level * 0.18) * 100)}%`, next: `${Math.round((1 + (level + 1) * 0.18) * 100)}%` };
    default:
      return { current: `${level}`, next: `${level + 1}` };
  }
}

export function getUpgradeDefinition(id: string) {
  return UPGRADES.find((entry) => entry.id === id) ?? null;
}

export function getMetaDefinition(id: string) {
  return META_UPGRADES.find((entry) => entry.id === id) ?? null;
}
