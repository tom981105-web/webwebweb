import type {
  Holding,
  Player,
  SelectedStockSnapshot,
  Stock,
  StockSummary,
} from '@/features/stock-sim/types';

type PriceAwareStock = Stock | StockSummary | SelectedStockSnapshot;

export function findHolding(holdings: Holding[], stockId: string) {
  return holdings.find((holding) => holding.stockId === stockId);
}

export function getHoldingQuantity(holdings: Holding[], stockId: string) {
  return findHolding(holdings, stockId)?.quantity ?? 0;
}

export function calculateHoldingValue(holding: Holding, stock: PriceAwareStock) {
  return holding.quantity * stock.currentPrice;
}

export function calculateHoldingPnL(holding: Holding, stock: PriceAwareStock) {
  const marketValue = calculateHoldingValue(holding, stock);
  const costBasis = holding.quantity * holding.averageCost;
  return marketValue - costBasis;
}

export function calculateUnrealizedPnL(player: Player, stocks: Stock[]) {
  return player.holdings.reduce((total, holding) => {
    const stock = stocks.find((item) => item.id === holding.stockId);

    if (!stock) {
      return total;
    }

    return total + calculateHoldingPnL(holding, stock);
  }, 0);
}

export function calculatePlayerNetWorth(player: Player, stocks: Stock[]) {
  const positionsValue = player.holdings.reduce((total, holding) => {
    const stock = stocks.find((item) => item.id === holding.stockId);
    return total + (stock ? calculateHoldingValue(holding, stock) : 0);
  }, 0);

  return player.cash + positionsValue;
}

export function calculateReturnRate(player: Player, stocks: Stock[], initialCapital: number) {
  const totalAsset = calculatePlayerNetWorth(player, stocks);
  return ((totalAsset - initialCapital) / initialCapital) * 100;
}
