import { MAX_OFFLINE_MS } from '@/data/balance';
import type { SaveState } from '@/types/game';
import { clamp } from '@/utils/format';

export type OfflineSummary = {
  durationMs: number;
  earnedCoins: number;
};

export function applyOfflineProgress(state: SaveState, cps: number, efficiency: number): OfflineSummary | null {
  const now = Date.now();
  const elapsed = now - state.lastOpenedAt;
  if (elapsed <= 15_000) {
    state.lastOpenedAt = now;
    return null;
  }

  const capped = Math.min(elapsed, MAX_OFFLINE_MS);
  const earnedCoins = Math.max(0, Math.floor(cps * (capped / 1000) * clamp(efficiency, 0, 2.5)));
  state.coins += earnedCoins;
  state.stats.totalCoinsEarned += earnedCoins;
  state.stats.automatedCoinsEarned += earnedCoins;
  state.lastOpenedAt = now;

  return {
    durationMs: capped,
    earnedCoins,
  };
}

