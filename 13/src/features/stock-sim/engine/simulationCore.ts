import {
  INITIAL_PLAYER_CASH,
  MAX_TRADE_LOG,
} from '@/features/stock-sim/constants/config';
import {
  createInitialSimulationState,
  normalizeSimulationState,
  uid,
} from '@/features/stock-sim/engine/helpers';
import { hydratePersistentSimulation } from '@/features/stock-sim/engine/simulationEngine';
import {
  applyImmediateTradeImpact,
  executePlayerOrder,
} from '@/features/stock-sim/engine/tradeEngine';
import type {
  MarketEvent,
  PendingOrder,
  PersistedSimulationSnapshot,
  PortfolioSummary,
  SelectedStockSnapshot,
  SimulationState,
  SimulationUiSnapshot,
  Stock,
  StockSummary,
  ToastMessage,
  TradeSide,
  UiState,
  VolatilityLeaderSnapshot,
} from '@/features/stock-sim/types';
import {
  calculatePlayerNetWorth,
  calculateReturnRate,
  calculateUnrealizedPnL,
} from '@/features/stock-sim/utils/portfolio';

const defaultUiState: UiState = {
  searchQuery: '',
  sectorFilter: 'ALL',
  stockSort: 'fixed',
  leaderboardSort: 'netWorth',
  chartTimeframe: 'tick',
};

function createToast(
  tone: ToastMessage['tone'],
  title: string,
  message: string,
): ToastMessage {
  return {
    id: uid('toast'),
    tone,
    title,
    message,
  };
}

function createStockSummary(stock: Stock): StockSummary {
  const sampleCount = 18;
  const miniHistory =
    stock.priceHistory.length <= sampleCount
      ? stock.priceHistory
      : Array.from({ length: sampleCount }, (_, index) => {
          const position = Math.round(
            (index / (sampleCount - 1)) * (stock.priceHistory.length - 1),
          );

          return stock.priceHistory[position];
        });

  return {
    id: stock.id,
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    description: stock.description,
    basePrice: stock.basePrice,
    currentPrice: stock.currentPrice,
    previousPrice: stock.previousPrice,
    volatility: stock.volatility,
    momentum: stock.momentum,
    sentiment: stock.sentiment,
    liquidity: stock.liquidity,
    traits: stock.traits,
    lastVolume: stock.lastVolume,
    miniHistory,
  };
}

function createSelectedStockSnapshot(stock: Stock | undefined): SelectedStockSnapshot | null {
  if (!stock) {
    return null;
  }

  return {
    ...createStockSummary(stock),
    priceHistory: stock.priceHistory,
    volumeHistory: stock.volumeHistory,
    tradeCountHistory: stock.tradeCountHistory,
    simulationElapsedMinutes: 0,
    tickTimestamps: [],
  };
}

function getSelectedStockEvents(stock: Stock | undefined, events: MarketEvent[]) {
  if (!stock) {
    return [];
  }

  return events.filter(
    (event) =>
      event.scope === 'market' ||
      event.affectedStockIds.includes(stock.id) ||
      event.affectedSectors.includes(stock.sector),
  );
}

function createHotStocks(stocks: Stock[]) {
  return [...stocks]
    .sort((left, right) => {
      const leftMove = Math.abs((left.currentPrice - left.previousPrice) / left.previousPrice);
      const rightMove = Math.abs((right.currentPrice - right.previousPrice) / right.previousPrice);
      return rightMove - leftMove;
    })
    .slice(0, 3)
    .map(createStockSummary);
}

function createVolatilityLeaders(stocks: Stock[]): VolatilityLeaderSnapshot[] {
  return [...stocks]
    .map((stock) => ({
      stockId: stock.id,
      ticker: stock.ticker,
      name: stock.name,
      sector: stock.sector,
      currentPrice: stock.currentPrice,
      previousPrice: stock.previousPrice,
      range: Math.max(...stock.priceHistory) - Math.min(...stock.priceHistory),
    }))
    .sort((left, right) => right.range - left.range)
    .slice(0, 3);
}

function createPortfolioSummary(simulation: SimulationState): PortfolioSummary {
  const totalAssets = calculatePlayerNetWorth(simulation.player, simulation.stocks);
  const unrealizedPnL = calculateUnrealizedPnL(simulation.player, simulation.stocks);
  const investedCapital = simulation.player.holdings.reduce((sum, holding) => {
    return sum + holding.quantity * holding.averageCost;
  }, 0);

  return {
    totalAssets,
    unrealizedPnL,
    returnRate: calculateReturnRate(
      simulation.player,
      simulation.stocks,
      INITIAL_PLAYER_CASH,
    ),
    investedCapital,
  };
}

function syncPlayerLeaderboard(simulation: SimulationState) {
  return simulation.leaderboard.map((entry) => {
    if (entry.kind !== 'current-user') {
      return entry;
    }

    const totalAssets = calculatePlayerNetWorth(simulation.player, simulation.stocks);

    return {
      ...entry,
      netWorth: totalAssets,
      returnRate: calculateReturnRate(
        simulation.player,
        simulation.stocks,
        INITIAL_PLAYER_CASH,
      ),
    };
  });
}

export function createDefaultUiState() {
  return { ...defaultUiState };
}

export function restoreSimulationState(
  persistedSnapshot: PersistedSimulationSnapshot | null | undefined,
) {
  if (!persistedSnapshot) {
    return {
      simulation: createInitialSimulationState(),
      ui: createDefaultUiState(),
    };
  }

  return {
    simulation: hydratePersistentSimulation(
      normalizeSimulationState(persistedSnapshot.simulation),
    ),
    ui: persistedSnapshot.ui ?? createDefaultUiState(),
  };
}

export function createSimulationUiSnapshot(
  simulation: SimulationState,
): SimulationUiSnapshot {
  const selectedStock =
    simulation.stocks.find((stock) => stock.id === simulation.selectedStockId) ??
    simulation.stocks[0];

  return {
    isRunning: simulation.isRunning,
    speed: simulation.speed,
    tick: simulation.tick,
    selectedStockId: selectedStock?.id ?? simulation.selectedStockId,
    currentPlayerId: simulation.currentPlayerId,
    marketMood: simulation.marketMood,
    sectorMood: simulation.sectorMood,
    stocks: simulation.stocks.map(createStockSummary),
    selectedStock: selectedStock
        ? {
            ...createSelectedStockSnapshot(selectedStock)!,
            simulationElapsedMinutes: simulation.world.simulationElapsedMinutes,
            tickTimestamps: simulation.world.tickTimestamps,
          }
        : null,
    selectedStockEvents: getSelectedStockEvents(selectedStock, simulation.events).slice(0, 6),
    player: simulation.player,
    pendingOrders: simulation.pendingOrders,
    portfolioSummary: createPortfolioSummary(simulation),
    trades: simulation.trades,
    events: simulation.events,
    aiActivity: simulation.aiActivity,
    leaderboard: simulation.leaderboard,
    world: simulation.world,
    hotStocks: createHotStocks(simulation.stocks),
    volatilityLeaders: createVolatilityLeaders(simulation.stocks),
    startedAt: simulation.startedAt,
  };
}

export function applyUserOrderToSimulation(
  simulation: SimulationState,
  side: TradeSide,
  quantity: number,
): { simulation?: SimulationState; toast: ToastMessage } {
  const selectedStock = simulation.stocks.find(
    (stock) => stock.id === simulation.selectedStockId,
  );

  if (!selectedStock) {
    return {
      toast: createToast('error', '주문 실패', '선택한 종목을 찾지 못했습니다.'),
    };
  }

  const execution = executePlayerOrder(
    simulation.player,
    selectedStock,
    side,
    quantity,
    simulation.tick,
  );

  if ('error' in execution) {
    return {
      toast: createToast('error', '주문 실패', execution.error),
    };
  }

  const stocks = simulation.stocks.map((stock) =>
    stock.id === selectedStock.id
      ? applyImmediateTradeImpact(stock, side, quantity)
      : stock,
  );

  const nextSimulation: SimulationState = {
    ...simulation,
    player: execution.player,
    stocks,
    trades: [execution.trade, ...simulation.trades].slice(0, MAX_TRADE_LOG),
  };

  nextSimulation.leaderboard = syncPlayerLeaderboard(nextSimulation);

  return {
    simulation: nextSimulation,
    toast: createToast(
      'success',
      side === 'buy' ? '즉시 매수 체결' : '즉시 매도 체결',
      `${selectedStock.name} ${Math.floor(quantity)}주를 ${
        side === 'buy' ? '매수' : '매도'
      }했습니다.`,
    ),
  };
}

export function placePendingOrderInSimulation(
  simulation: SimulationState,
  side: TradeSide,
  quantity: number,
  targetPrice: number,
): { simulation?: SimulationState; toast: ToastMessage } {
  const selectedStock = simulation.stocks.find(
    (stock) => stock.id === simulation.selectedStockId,
  );

  if (!selectedStock) {
    return {
      toast: createToast('error', '예약 주문 실패', '선택한 종목을 찾지 못했습니다.'),
    };
  }

  const normalizedQuantity = Math.floor(quantity);
  const normalizedTargetPrice = Number(targetPrice);

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    return {
      toast: createToast('error', '예약 주문 실패', '예약 수량은 1주 이상이어야 합니다.'),
    };
  }

  if (!Number.isFinite(normalizedTargetPrice) || normalizedTargetPrice <= 0) {
    return {
      toast: createToast('error', '예약 주문 실패', '목표 가격을 올바르게 입력해 주세요.'),
    };
  }

  if (side === 'buy' && normalizedTargetPrice > selectedStock.currentPrice) {
    return {
      toast: createToast(
        'error',
        '예약 주문 실패',
        '예약 매수는 현재가 이하의 가격으로만 설정할 수 있습니다.',
      ),
    };
  }

  if (side === 'sell' && normalizedTargetPrice < selectedStock.currentPrice) {
    return {
      toast: createToast(
        'error',
        '예약 주문 실패',
        '예약 매도는 현재가 이상의 가격으로만 설정할 수 있습니다.',
      ),
    };
  }

  const pendingOrder: PendingOrder = {
    id: uid('pending-order'),
    playerId: simulation.player.id,
    stockId: selectedStock.id,
    side,
    quantity: normalizedQuantity,
    targetPrice: normalizedTargetPrice,
    createdAt: Date.now(),
  };

  return {
    simulation: {
      ...simulation,
      pendingOrders: [pendingOrder, ...simulation.pendingOrders].slice(0, 32),
    },
    toast: createToast(
      'success',
      side === 'buy' ? '예약 매수 등록' : '예약 매도 등록',
      `${selectedStock.name} ${normalizedQuantity}주를 ${side === 'buy' ? '₩ 이하 도달 시 매수' : '₩ 이상 도달 시 매도'} 예약했습니다.`.replace(
        '₩',
        `${Math.round(normalizedTargetPrice).toLocaleString('ko-KR')}원`,
      ),
    ),
  };
}

export function cancelPendingOrderInSimulation(
  simulation: SimulationState,
  orderId: string,
): { simulation?: SimulationState; toast: ToastMessage } {
  const targetOrder = simulation.pendingOrders.find((order) => order.id === orderId);

  if (!targetOrder) {
    return {
      toast: createToast('error', '예약 취소 실패', '이미 처리되었거나 없는 예약 주문입니다.'),
    };
  }

  return {
    simulation: {
      ...simulation,
      pendingOrders: simulation.pendingOrders.filter((order) => order.id !== orderId),
    },
    toast: createToast('success', '예약 취소 완료', '예약 주문을 취소했습니다.'),
  };
}
