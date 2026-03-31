import { PANEL_RARITIES, SYMBOL_DEFINITIONS } from '@/data/balance';
import type { PanelCard, SymbolId } from '@/types/game';

export function countSymbols(symbols: SymbolId[]) {
  return symbols.reduce<Record<SymbolId, number>>(
    (acc, symbol) => {
      acc[symbol] += 1;
      return acc;
    },
    { coin: 0, star: 0, moon: 0, gem: 0, skull: 0, clover: 0, crown: 0, relic: 0 },
  );
}

export function buildComboLabel(symbols: SymbolId[]) {
  const counts = countSymbols(symbols);
  const entries = Object.entries(counts).sort((left, right) => right[1] - left[1]) as Array<[SymbolId, number]>;
  const [topSymbol, topCount] = entries[0];

  if (topCount >= 4) return `${SYMBOL_DEFINITIONS[topSymbol].label} 완전 공명`;
  if (topCount === 3) return `${SYMBOL_DEFINITIONS[topSymbol].label} 3중 결속`;
  if (counts.relic >= 1 && counts.crown >= 1) return '왕관 유물 교감';
  if (counts.skull >= 2) return '균열 과다 반응';
  if (counts.clover >= 2) return '행운엽 군집';
  if (counts.moon >= 1 && counts.star >= 1) return '천체 상응';
  return '잔향 분포';
}

export function buildStatusLine(panel: PanelCard) {
  const rarity = PANEL_RARITIES[panel.rarity];
  return `${rarity.label} 등급 · ${panel.comboLabel}`;
}

export function countRareSymbols(symbols: SymbolId[]) {
  const rareSet = new Set<SymbolId>(['relic', 'crown', 'gem', 'clover']);
  return symbols.filter((symbol) => rareSet.has(symbol)).length;
}
