import { PANEL_MODIFIERS, PANEL_TIERS, RARITIES, SYMBOLS, TIER_ORDER } from '@/data/balance';
import type { PanelModifier, PanelRevealResult, PanelState, RarityId, SymbolId, TierId } from '@/types/game';
import { clamp, pickWeighted, randomBetween, uid } from '@/utils/format';

function symbolWeightForTier(tier: TierId, rarity: RarityId, luckBonus: number) {
  const tierBias = PANEL_TIERS[tier].symbolBias;
  const weights: Record<SymbolId, number> = {
    coin: 1.25,
    star: 1,
    moon: 0.92,
    gem: 0.82,
    skull: 0.48,
    clover: 0.9 + luckBonus * 0.8,
    crown: 0.56 + luckBonus * 0.5,
    relic: 0.44 + luckBonus * 0.7,
  };

  if (rarity === 'epic' || rarity === 'legendary' || rarity === 'mythic') {
    weights.gem += 0.14;
    weights.crown += 0.12;
    weights.relic += 0.14;
  }

  for (const entry of Object.keys(tierBias) as SymbolId[]) {
    weights[entry] *= tierBias[entry] ?? 1;
  }

  return weights;
}

function rollRarity(tier: TierId, rareBonus: number): RarityId {
  const weights = { ...PANEL_TIERS[tier].rarityWeights };
  weights.rare += rareBonus * 16;
  weights.epic += rareBonus * 10;
  weights.legendary += rareBonus * 6;
  weights.mythic += rareBonus * 4;
  weights.common = Math.max(4, weights.common - rareBonus * 18);
  weights.uncommon = Math.max(5, weights.uncommon - rareBonus * 10);
  return pickWeighted(weights);
}

function rollSymbols(tier: TierId, rarity: RarityId, rareBonus: number) {
  const weights = symbolWeightForTier(tier, rarity, rareBonus);
  return Array.from({ length: 6 }, () => pickWeighted(weights));
}

function countMap(symbols: SymbolId[]) {
  return symbols.reduce<Record<SymbolId, number>>(
    (map, symbol) => {
      map[symbol] += 1;
      return map;
    },
    { coin: 0, star: 0, moon: 0, gem: 0, skull: 0, clover: 0, crown: 0, relic: 0 },
  );
}

export function computePanelResult(
  tier: TierId,
  rarity: RarityId,
  symbols: SymbolId[],
  rewardMultiplier: number,
  jackpotMultiplier: number,
  critChance: number,
): PanelRevealResult {
  const tierDef = PANEL_TIERS[tier];
  const rarityDef = RARITIES[rarity];
  const counts = countMap(symbols);
  const baseReward = Math.round(randomBetween(tierDef.baseRewardMin, tierDef.baseRewardMax) * rarityDef.multiplier);

  let multiplier = rewardMultiplier;
  let modifier: PanelModifier['id'] = 'none';
  let jackpot = false;

  const maxCount = Math.max(...Object.values(counts));
  const duplicateBonus = maxCount >= 3 ? 1.45 : maxCount === 2 ? 1.18 : 1;
  multiplier *= duplicateBonus;

  if (counts.clover >= 2) {
    multiplier *= 1 + counts.clover * 0.12;
    modifier = 'fortune-chain';
  }

  if (counts.moon >= 2) {
    multiplier *= 1.18;
    modifier = modifier === 'fortune-chain' ? modifier : 'lunar-touch';
  }

  if (counts.relic >= 1 && counts.crown >= 1) {
    multiplier *= 1.42;
  }

  if (maxCount >= 4 || (counts.crown >= 2 && counts.relic >= 1)) {
    jackpot = true;
    modifier = 'jackpot';
    multiplier *= 1.9 * jackpotMultiplier;
  }

  if (counts.skull > 0) {
    multiplier *= Math.max(0.46, 1 - counts.skull * 0.22);
    if (!jackpot) modifier = 'omen';
  }

  const critical = Math.random() < critChance;
  if (critical) multiplier *= randomBetween(1.65, 2.35);

  const finalReward = Math.max(1, Math.round(baseReward * multiplier));
  const rareSymbolCount = counts.crown + counts.relic + counts.gem;
  const tone = jackpot ? 'jackpot' : rarityDef.tone;
  const summaryText = jackpot
    ? 'A royal alignment burst through the seal into a jackpot chain.'
    : critical
      ? 'The reveal flared brighter than expected.'
      : modifier === 'omen'
        ? 'A curse mark dulled the payout, but something still remained.'
        : 'The hidden runes resolved into a stable reward.';
  const detailText = `${PANEL_MODIFIERS[modifier].label} · ${SYMBOLS.find((entry) => entry.id === symbols[0])?.label ?? 'Rune'} lead pattern`;

  return {
    finalReward,
    baseReward,
    critical,
    multiplier: clamp(multiplier, 0.25, 999),
    jackpot,
    modifier,
    rareSymbolCount,
    summaryText,
    detailText,
    tone,
  };
}

export function createPanel(
  tier: TierId,
  rewardMultiplier: number,
  rareBonus: number,
  jackpotMultiplier: number,
  critChance: number,
): PanelState {
  const rarity = rollRarity(tier, rareBonus);
  const symbols = rollSymbols(tier, rarity, rareBonus);
  const result = computePanelResult(tier, rarity, symbols, rewardMultiplier, jackpotMultiplier, critChance);

  return {
    id: uid('panel'),
    tier,
    rarity,
    reward: result.finalReward,
    symbols,
    specialEffect: result.modifier,
    revealed: false,
    scratchedPercent: 0,
    createdAt: Date.now(),
    purchaseCost: PANEL_TIERS[tier].price,
    coverSeed: Math.random(),
    result,
  };
}

export function getTierUnlocks(totalCoins: number) {
  return TIER_ORDER.reduce<Record<TierId, boolean>>(
    (acc, tier) => {
      acc[tier] = totalCoins >= PANEL_TIERS[tier].unlockAtTotalCoins;
      return acc;
    },
    { basic: true, advanced: false, rare: false, legendary: false, mythic: false },
  );
}
