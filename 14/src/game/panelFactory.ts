import { PANEL_RARITIES, PANEL_SYMBOL_SLOTS, PANEL_TIERS, SPECIAL_EFFECTS, SYMBOL_DEFINITIONS } from '@/data/balance';
import { buildComboLabel, buildStatusLine } from '@/game/rewardRules';
import type { GameComputed, PanelCard, PanelRarityId, PanelTierId, SpecialEffectId, SymbolId } from '@/types/game';
import { clamp, createSeed, pickWeighted, randomBetween, randomInt, shuffle } from '@/utils/random';

function buildRarityWeights(tier: PanelTierId, rareBoost: number) {
  const base = PANEL_TIERS[tier].rarityWeights;
  return {
    common: Math.max(1, base.common - rareBoost * 1.6),
    uncommon: Math.max(1, base.uncommon),
    rare: base.rare + rareBoost * 1.25,
    epic: base.epic + rareBoost * 0.92,
    legendary: base.legendary + rareBoost * 0.58,
    mythic: base.mythic + rareBoost * 0.26,
  } as Record<PanelRarityId, number>;
}

function buildSpecialWeights(tier: PanelTierId, luckBias: number) {
  const base = PANEL_TIERS[tier].specialWeights;
  return {
    none: Math.max(28, base.none - luckBias * 1.15),
    jackpot: base.jackpot + luckBias * 0.52,
    echo: base.echo + luckBias * 0.3,
    surge: base.surge + luckBias * 0.38,
    omen: base.omen + luckBias * 0.42,
    curse: Math.max(1, base.curse - luckBias * 0.18),
  } as Record<SpecialEffectId, number>;
}

function pickSymbols(rarity: PanelRarityId, rareBoost: number, specialId: SpecialEffectId) {
  const weights = Object.fromEntries(
    Object.values(SYMBOL_DEFINITIONS).map((symbol) => {
      let modifier = 1;
      if (symbol.family === 'curse' && specialId === 'curse') modifier = 1.75;
      if (symbol.id === 'relic' || symbol.id === 'crown') modifier += rareBoost * 0.05;
      if (rarity === 'legendary' || rarity === 'mythic') modifier += symbol.rarityBias * 0.24;
      return [symbol.id, Math.max(1, symbol.weight * modifier)];
    }),
  ) as Record<SymbolId, number>;

  const focusSymbol = pickWeighted(weights);
  const duplicateTarget = randomInt(1, rarity === 'mythic' ? 4 : rarity === 'legendary' ? 3 : 2);
  const pool: SymbolId[] = [];

  for (let index = 0; index < PANEL_SYMBOL_SLOTS; index += 1) {
    if (index < duplicateTarget) pool.push(focusSymbol);
    else pool.push(pickWeighted(weights));
  }

  return shuffle(pool);
}

export function createPanel(tier: PanelTierId, computed: GameComputed, manualDiscount = 0) {
  const tierConfig = PANEL_TIERS[tier];
  const rarity = pickWeighted(buildRarityWeights(tier, computed.rareBoost)) as PanelRarityId;
  const specialEffectId = pickWeighted(buildSpecialWeights(tier, computed.rareBoost)) as SpecialEffectId;
  const symbols = pickSymbols(rarity, computed.rareBoost, specialEffectId);
  const rarityMultiplier = PANEL_RARITIES[rarity].multiplier;
  const special = SPECIAL_EFFECTS[specialEffectId];

  const counts = symbols.reduce<Record<SymbolId, number>>(
    (acc, symbol) => {
      acc[symbol] += 1;
      return acc;
    },
    { coin: 0, star: 0, moon: 0, gem: 0, skull: 0, clover: 0, crown: 0, relic: 0 },
  );

  let reward = tierConfig.baseReward * rarityMultiplier * special.modifier * randomBetween(0.98, 1.24);
  const highestMatch = Math.max(...Object.values(counts));
  if (highestMatch >= 4) reward *= 2.9;
  else if (highestMatch === 3) reward *= 1.88;

  if (counts.relic >= 1 && counts.crown >= 1) reward *= 1.48;
  if (counts.clover >= 2) reward *= 1.26;
  if (counts.gem >= 2) reward *= 1.22;
  if (counts.moon >= 1 && counts.star >= 1) reward *= 1.16;
  if (counts.skull >= 1) reward *= Math.max(0.62, 1 - counts.skull * 0.1);

  reward *= computed.payoutMultiplier;
  const critTriggered = Math.random() < computed.critChance;
  if (critTriggered) reward *= computed.critMultiplier;
  if (highestMatch >= 3 && specialEffectId === 'jackpot') reward *= computed.jackpotMultiplier;

  const finalReward = Math.max(Math.ceil(tierConfig.cost * 0.56), Math.floor(reward));
  const costPaid = Math.max(0, Math.floor(tierConfig.cost - manualDiscount));

  const panel: PanelCard = {
    id: `panel_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    tier,
    rarity,
    costPaid,
    symbols,
    reward: finalReward,
    previewReward: Math.max(1, Math.floor(finalReward * randomBetween(0.92, 1.06))),
    scratchedPercent: 0,
    revealed: false,
    autoRevealThreshold: clamp(tierConfig.revealThreshold - (56 - computed.revealThreshold), 35, 60),
    createdAt: Date.now(),
    seed: createSeed(),
    specialEffect: { id: specialEffectId, label: special.label, description: special.description, modifier: special.modifier },
    comboLabel: buildComboLabel(symbols),
    statusLine: '',
  };

  panel.statusLine = buildStatusLine(panel);
  return panel;
}
