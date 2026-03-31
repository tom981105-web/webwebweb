import { OFFLINE_CAP_MS, PANEL_TIERS, PRESTIGE_BASE_REQUIREMENT } from '@/data/balance';
import type { GameComputed, GameSaveState, PrestigePreview } from '@/types/game';
import { clamp } from '@/utils/random';

export function estimateOfflineGain(state: GameSaveState, computed: GameComputed, elapsedMs: number) {
  const capped = clamp(elapsedMs, 0, OFFLINE_CAP_MS);
  if (!computed.autoBuyEnabled || !computed.autoScratchEnabled) {
    return { gain: 0, durationMs: capped };
  }

  const tier = PANEL_TIERS[state.selectedTier];
  const cyclesPerSecond = 1000 / computed.autoBuyIntervalMs;
  const averageReward = Math.max(tier.cost * tier.expectedValue, tier.baseReward);
  const cps = cyclesPerSecond * averageReward * 0.5 * computed.offlineEfficiency;
  return { gain: Math.floor(cps * (capped / 1000)), durationMs: capped };
}

export function getPrestigePreview(totalCoinsEarned: number, prestigeCount: number): PrestigePreview {
  const requirement = PRESTIGE_BASE_REQUIREMENT * Math.max(1, Math.pow(2.15, prestigeCount));
  const dustGain = Math.max(0, Math.floor(Math.sqrt(totalCoinsEarned / requirement)));
  return {
    dustGain,
    nextMilestone: requirement,
    canPrestige: dustGain > 0,
  };
}
