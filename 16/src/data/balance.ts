import type { PanelModifier, PanelTierDefinition, RarityDefinition, SymbolDefinition, TierId } from '@/types/game';

export const SAVE_VERSION = 2;
export const SAVE_KEY = 'probability_forge_save_v2';
export const SCRATCH_COMPLETE_THRESHOLD = 0.52;
export const MAX_OFFLINE_MS = 1000 * 60 * 60 * 6;
export const PRESTIGE_THRESHOLD = 24_000;

export const SYMBOLS: SymbolDefinition[] = [
  { id: 'coin', label: 'Coin Sigil', glyph: '◎', description: 'Steady gold payout.', accent: 'from-amber-300 to-yellow-500' },
  { id: 'star', label: 'Star Rune', glyph: '✦', description: 'A bright sign of bonus value.', accent: 'from-cyan-300 to-sky-500' },
  { id: 'moon', label: 'Moon Seal', glyph: '☾', description: 'Adds a calm lunar multiplier.', accent: 'from-indigo-300 to-violet-500' },
  { id: 'gem', label: 'Gem Crest', glyph: '◆', description: 'Raises the premium payout floor.', accent: 'from-fuchsia-300 to-pink-500' },
  { id: 'skull', label: 'Curse Mark', glyph: '☠', description: 'Shaves value off the panel.', accent: 'from-rose-400 to-red-500' },
  { id: 'clover', label: 'Fortune Leaf', glyph: '☘', description: 'Chains lucky bonuses together.', accent: 'from-emerald-300 to-lime-400' },
  { id: 'crown', label: 'Royal Crest', glyph: '♛', description: 'Pushes the reveal toward jackpots.', accent: 'from-yellow-200 to-amber-400' },
  { id: 'relic', label: 'Relic Shard', glyph: '◈', description: 'A high-tier fragment of hidden power.', accent: 'from-teal-300 to-cyan-500' },
];

export const RARITIES: Record<string, RarityDefinition> = {
  common: { id: 'common', label: 'Common', multiplier: 1, glowClass: 'shadow-[0_0_0_rgba(0,0,0,0)]', tone: 'normal' },
  uncommon: { id: 'uncommon', label: 'Uncommon', multiplier: 1.16, glowClass: 'shadow-[0_0_18px_rgba(34,211,238,0.18)]', tone: 'normal' },
  rare: { id: 'rare', label: 'Rare', multiplier: 1.42, glowClass: 'shadow-[0_0_22px_rgba(45,212,191,0.22)]', tone: 'rare' },
  epic: { id: 'epic', label: 'Epic', multiplier: 1.92, glowClass: 'shadow-[0_0_28px_rgba(168,85,247,0.28)]', tone: 'epic' },
  legendary: { id: 'legendary', label: 'Legendary', multiplier: 2.7, glowClass: 'shadow-[0_0_36px_rgba(251,191,36,0.34)]', tone: 'jackpot' },
  mythic: { id: 'mythic', label: 'Mythic', multiplier: 4.1, glowClass: 'shadow-[0_0_48px_rgba(96,165,250,0.38)]', tone: 'jackpot' },
};

export const PANEL_MODIFIERS: Record<PanelModifier['id'], PanelModifier> = {
  none: { id: 'none', label: 'Calm Pattern', description: 'A clean reveal with no extra condition.' },
  jackpot: { id: 'jackpot', label: 'Royal Alignment', description: 'A near-perfect sequence ignited a jackpot cascade.' },
  omen: { id: 'omen', label: 'Shadow Omen', description: 'A curse mark slipped into the seal and reduced the yield.' },
  'fortune-chain': { id: 'fortune-chain', label: 'Fortune Chain', description: 'Lucky leaves chained together for an escalating bonus.' },
  'lunar-touch': { id: 'lunar-touch', label: 'Lunar Touch', description: 'Moon symbols smoothed the reveal with a soft multiplier.' },
};

export const PANEL_TIERS: Record<TierId, PanelTierDefinition> = {
  basic: {
    id: 'basic',
    label: 'Dust Seal',
    description: 'A forgiving starter panel with quick opens and dependable coin flow.',
    price: 10,
    baseRewardMin: 14,
    baseRewardMax: 30,
    unlockAtTotalCoins: 0,
    autoScratchRate: 0.08,
    rarityWeights: { common: 58, uncommon: 26, rare: 10, epic: 4, legendary: 1.5, mythic: 0.5 },
    symbolBias: { coin: 2, clover: 1.18 },
    themeClass: 'from-slate-800 via-slate-700 to-slate-800',
  },
  advanced: {
    id: 'advanced',
    label: 'Azure Plate',
    description: 'A cleaner plate with better return bands and more uncommon echoes.',
    price: 72,
    baseRewardMin: 92,
    baseRewardMax: 184,
    unlockAtTotalCoins: 180,
    autoScratchRate: 0.1,
    rarityWeights: { common: 34, uncommon: 31, rare: 18, epic: 10, legendary: 5, mythic: 2 },
    symbolBias: { gem: 1.25, star: 1.2 },
    themeClass: 'from-sky-900 via-cyan-800 to-slate-900',
  },
  rare: {
    id: 'rare',
    label: 'Relic Sheet',
    description: 'A deeper relic slab with stronger spikes and premium symbol tables.',
    price: 360,
    baseRewardMin: 460,
    baseRewardMax: 920,
    unlockAtTotalCoins: 1_100,
    autoScratchRate: 0.12,
    rarityWeights: { common: 20, uncommon: 24, rare: 26, epic: 16, legendary: 9, mythic: 5 },
    symbolBias: { relic: 1.2, crown: 1.16, gem: 1.1 },
    themeClass: 'from-violet-950 via-fuchsia-900 to-slate-950',
  },
  legendary: {
    id: 'legendary',
    label: 'Sunken Codex',
    description: 'A lavish codex plate where jackpots start to feel within reach.',
    price: 1_680,
    baseRewardMin: 2_200,
    baseRewardMax: 4_700,
    unlockAtTotalCoins: 6_800,
    autoScratchRate: 0.145,
    rarityWeights: { common: 8, uncommon: 16, rare: 22, epic: 24, legendary: 18, mythic: 12 },
    symbolBias: { crown: 1.28, relic: 1.2, moon: 1.15 },
    themeClass: 'from-amber-950 via-orange-900 to-slate-950',
  },
  mythic: {
    id: 'mythic',
    label: 'Astral Archive',
    description: 'A myth-grade panel built for explosive chains, rare shards, and late-game automation.',
    price: 7_600,
    baseRewardMin: 10_100,
    baseRewardMax: 22_500,
    unlockAtTotalCoins: 24_000,
    autoScratchRate: 0.17,
    rarityWeights: { common: 4, uncommon: 8, rare: 18, epic: 24, legendary: 26, mythic: 20 },
    symbolBias: { relic: 1.35, crown: 1.3, gem: 1.14 },
    themeClass: 'from-emerald-950 via-teal-900 to-slate-950',
  },
};

export const TIER_ORDER: TierId[] = ['basic', 'advanced', 'rare', 'legendary', 'mythic'];
