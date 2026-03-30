import {
  INITIAL_PLAYER_CASH,
  MAX_TRADE_LOG,
} from '@/features/stock-sim/constants/config';
import { createInitialSimulationState, normalizeSimulationState, uid } from '@/features/stock-sim/engine/helpers';
import {
  hydratePersistentSimulation,
  runSimulationBatch,
  runSimulationTick,
} from '@/features/stock-sim/engine/simulationEngine';
import { applyImmediateTradeImpact, executePlayerOrder } from '@/features/stock-sim/engine/tradeEngine';
import type { SimulationGateway } from '@/features/stock-sim/services/contracts';
import type { SimulationState, ToastMessage, UiState } from '@/features/stock-sim/types';
import { calculatePlayerNetWorth, calculateReturnRate } from '@/features/stock-sim/utils/portfolio';

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

function syncPlayerLeaderboard(simulation: SimulationState) {
  return simulation.leaderboard.map((entry) => {
    if (entry.kind !== 'current-user') {
      return entry;
    }

    const netWorth = calculatePlayerNetWorth(simulation.player, simulation.stocks);

    return {
      ...entry,
      netWorth,
      returnRate: calculateReturnRate(simulation.player, simulation.stocks, INITIAL_PLAYER_CASH),
    };
  });
}

export const localSimulationGateway: SimulationGateway = {
  createInitialSimulationState: createInitialSimulationState,
  createDefaultUiState: () => ({ ...defaultUiState }),
  hydrateSimulation: (state) => hydratePersistentSimulation(normalizeSimulationState(state)),
  advanceSimulation: runSimulationTick,
  advanceSimulationBatch: (state, steps, executedAt) =>
    runSimulationBatch(state, steps, executedAt),
  placeUserOrder: (state, side, quantity) => {
    const selectedStock = state.stocks.find((stock) => stock.id === state.selectedStockId);

    if (!selectedStock) {
      return {
        toast: createToast('error', '주문 실패', '선택된 종목을 찾지 못했습니다.'),
      };
    }

    const execution = executePlayerOrder(
      state.player,
      selectedStock,
      side,
      quantity,
      state.tick,
    );

    if ('error' in execution) {
      return {
        toast: createToast('error', '주문 실패', execution.error),
      };
    }

    const stocks = state.stocks.map((stock) =>
      stock.id === selectedStock.id ? applyImmediateTradeImpact(stock, side, quantity) : stock,
    );

    const simulation: SimulationState = {
      ...state,
      player: execution.player,
      stocks,
      trades: [execution.trade, ...state.trades].slice(0, MAX_TRADE_LOG),
    };

    simulation.leaderboard = syncPlayerLeaderboard(simulation);

    return {
      simulation,
      toast: createToast(
        'success',
        side === 'buy' ? '매수 체결' : '매도 체결',
        `${selectedStock.name} ${Math.floor(quantity)}주 ${
          side === 'buy' ? '매수' : '매도'
        } 주문이 반영되었습니다.`,
      ),
    };
  },
};
