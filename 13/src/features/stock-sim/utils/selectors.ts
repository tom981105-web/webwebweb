import type {
  MarketEvent,
  Sector,
  Stock,
  StockSortMode,
  StockSummary,
} from '@/features/stock-sim/types';

type FilterableStock = Stock | StockSummary;

export function getFilteredStocks<T extends FilterableStock>(
  stocks: T[],
  query: string,
  sectorFilter: Sector | 'ALL',
  sortMode: StockSortMode,
) {
  const normalizedQuery = query.trim().toLowerCase();

  const filtered = stocks.filter((stock) => {
    const matchesQuery =
      normalizedQuery.length === 0 ||
      stock.name.toLowerCase().includes(normalizedQuery) ||
      stock.ticker.toLowerCase().includes(normalizedQuery) ||
      stock.sector.toLowerCase().includes(normalizedQuery);

    const matchesSector = sectorFilter === 'ALL' || stock.sector === sectorFilter;

    return matchesQuery && matchesSector;
  });

  if (sortMode === 'fixed') {
    return filtered;
  }

  return [...filtered].sort((left, right) => {
    const leftChange = ((left.currentPrice - left.previousPrice) / left.previousPrice) * 100;
    const rightChange = ((right.currentPrice - right.previousPrice) / right.previousPrice) * 100;

    switch (sortMode) {
      case 'gainers':
        return rightChange - leftChange;
      case 'losers':
        return leftChange - rightChange;
      case 'volume':
        return right.lastVolume - left.lastVolume;
      default:
        return 0;
    }
  });
}

export function getRelevantEvents(stock: Stock, events: MarketEvent[]) {
  return events.filter(
    (event) =>
      event.affectedStockIds.includes(stock.id) ||
      event.affectedSectors.includes(stock.sector) ||
      event.scope === 'market',
  );
}

export function getTopMovers(stocks: Stock[]) {
  return [...stocks]
    .sort((left, right) => {
      const leftMove = Math.abs((left.currentPrice - left.previousPrice) / left.previousPrice);
      const rightMove = Math.abs((right.currentPrice - right.previousPrice) / right.previousPrice);
      return rightMove - leftMove;
    })
    .slice(0, 3);
}

export function getTopVolatilityLeaders(stocks: Stock[]) {
  return [...stocks]
    .sort((left, right) => {
      const leftRange = Math.max(...left.priceHistory) - Math.min(...left.priceHistory);
      const rightRange = Math.max(...right.priceHistory) - Math.min(...right.priceHistory);
      return rightRange - leftRange;
    })
    .slice(0, 3);
}
