/// <reference lib="webworker" />

import {
  BASE_TICK_INTERVAL_MS,
  ENGINE_LOOP_INTERVAL_MS,
  MAX_BATCH_TICKS_PER_FRAME,
  UI_REFRESH_INTERVAL_MS,
  WORKER_PERSISTENCE_INTERVAL_MS,
} from '@/features/stock-sim/constants/config';
import {
  applyUserOrderToSimulation,
  cancelPendingOrderInSimulation,
  createSimulationUiSnapshot,
  placePendingOrderInSimulation,
  restoreSimulationState,
} from '@/features/stock-sim/engine/simulationCore';
import { runSimulationBatch } from '@/features/stock-sim/engine/simulationEngine';
import { createPersistedSimulationSnapshot } from '@/features/stock-sim/services/persistence';
import type {
  PersistedSimulationSnapshot,
  SimulationState,
  UiState,
} from '@/features/stock-sim/types';
import {
  isMarketWorkerInboundMessage,
  type MarketWorkerInboundMessage,
  type MarketWorkerOutboundMessage,
  type WorkerPublishReason,
} from '@/features/stock-sim/worker/workerMessages';

const workerScope = self as DedicatedWorkerGlobalScope;

let simulation: SimulationState | null = null;
let persistedUiState: UiState | null = null;
let loopTimerId: number | null = null;
let lastUiPublishedAt = 0;
let lastPersistencePublishedAt = 0;

function postWorkerMessage(message: MarketWorkerOutboundMessage) {
  workerScope.postMessage(message);
}

function ensureSimulation() {
  if (!simulation) {
    throw new Error('Simulation has not been initialized.');
  }

  return simulation;
}

function createPersistenceSnapshot() {
  const currentSimulation = ensureSimulation();

  return createPersistedSimulationSnapshot(
    currentSimulation,
    persistedUiState ?? {
      searchQuery: '',
      sectorFilter: 'ALL',
      stockSort: 'fixed',
      leaderboardSort: 'netWorth',
      chartTimeframe: 'tick',
    },
  );
}

function publishPersistenceSnapshot(force = false) {
  if (!simulation) {
    return;
  }

  const now = Date.now();

  if (!force && now - lastPersistencePublishedAt < WORKER_PERSISTENCE_INTERVAL_MS) {
    return;
  }

  lastPersistencePublishedAt = now;
  postWorkerMessage({
    type: 'WORKER_PERSISTENCE_SNAPSHOT',
    payload: {
      snapshot: createPersistenceSnapshot(),
    },
  });
}

function publishSnapshot(
  reason: WorkerPublishReason,
  previousSimulation?: SimulationState,
  force = false,
) {
  if (!simulation) {
    return;
  }

  const now = Date.now();

  if (!force && now - lastUiPublishedAt < UI_REFRESH_INTERVAL_MS) {
    return;
  }

  lastUiPublishedAt = now;
  const snapshot = createSimulationUiSnapshot(simulation);
  const previousTopTradeId = previousSimulation?.trades[0]?.id;
  const previousTopEventId = previousSimulation?.events[0]?.id;
  const nextTopTradeId = simulation.trades[0]?.id;
  const nextTopEventId = simulation.events[0]?.id;

  if (previousTopTradeId !== nextTopTradeId && nextTopTradeId) {
    postWorkerMessage({
      type: 'WORKER_TRADE_UPDATE',
      payload: {
        snapshot,
        reason,
      },
    });
    return;
  }

  if (previousTopEventId !== nextTopEventId && nextTopEventId) {
    postWorkerMessage({
      type: 'WORKER_EVENT_UPDATE',
      payload: {
        snapshot,
        reason,
      },
    });
    return;
  }

  postWorkerMessage({
    type: 'WORKER_TICK_UPDATE',
    payload: {
      snapshot,
      reason,
    },
  });
}

function scheduleLoop() {
  if (loopTimerId !== null) {
    workerScope.clearTimeout(loopTimerId);
  }

  loopTimerId = workerScope.setTimeout(runLoop, ENGINE_LOOP_INTERVAL_MS);
}

function runLoop() {
  if (!simulation) {
    scheduleLoop();
    return;
  }

  if (simulation.isRunning) {
    const now = Date.now();
    const tickDuration = BASE_TICK_INTERVAL_MS / Math.max(1, simulation.speed);
    const elapsed = Math.max(0, now - simulation.world.lastTickAt);
    const dueSteps = Math.min(
      MAX_BATCH_TICKS_PER_FRAME,
      Math.floor(elapsed / tickDuration),
    );

    if (dueSteps > 0) {
      const previousSimulation = simulation;
      simulation = runSimulationBatch(simulation, dueSteps, now);
      publishSnapshot('tick', previousSimulation);
      publishPersistenceSnapshot();
    }
  }

  scheduleLoop();
}

function initializeSimulation(
  persistedSnapshot: PersistedSimulationSnapshot | null,
) {
  const restored = restoreSimulationState(persistedSnapshot);

  simulation = restored.simulation;
  persistedUiState = restored.ui;
  lastUiPublishedAt = 0;
  lastPersistencePublishedAt = 0;

  postWorkerMessage({
    type: 'WORKER_READY',
    payload: {
      snapshot: createSimulationUiSnapshot(restored.simulation),
    },
  });
  publishPersistenceSnapshot(true);
  scheduleLoop();
}

function updateRuntimeState(
  updater: (current: SimulationState) => SimulationState,
  reason: WorkerPublishReason,
  persist = false,
) {
  const currentSimulation = ensureSimulation();
  simulation = updater(currentSimulation);
  publishSnapshot(reason, currentSimulation, true);

  if (persist) {
    publishPersistenceSnapshot(true);
  }
}

function handleOrder(side: 'buy' | 'sell', quantity: number) {
  const currentSimulation = ensureSimulation();
  const result = applyUserOrderToSimulation(currentSimulation, side, quantity);

  postWorkerMessage({
    type: 'WORKER_TOAST',
    payload: {
      toast: result.toast,
    },
  });

  if (!result.simulation) {
    return;
  }

  simulation = result.simulation;
  publishSnapshot('order', currentSimulation, true);
  publishPersistenceSnapshot(true);
}

function handlePendingOrder(side: 'buy' | 'sell', quantity: number, targetPrice: number) {
  const currentSimulation = ensureSimulation();
  const result = placePendingOrderInSimulation(currentSimulation, side, quantity, targetPrice);

  postWorkerMessage({
    type: 'WORKER_TOAST',
    payload: {
      toast: result.toast,
    },
  });

  if (!result.simulation) {
    return;
  }

  simulation = result.simulation;
  publishSnapshot('order', currentSimulation, true);
  publishPersistenceSnapshot(true);
}

function handlePendingOrderCancel(orderId: string) {
  const currentSimulation = ensureSimulation();
  const result = cancelPendingOrderInSimulation(currentSimulation, orderId);

  postWorkerMessage({
    type: 'WORKER_TOAST',
    payload: {
      toast: result.toast,
    },
  });

  if (!result.simulation) {
    return;
  }

  simulation = result.simulation;
  publishSnapshot('order', currentSimulation, true);
  publishPersistenceSnapshot(true);
}

function handleMessage(message: MarketWorkerInboundMessage) {
  switch (message.type) {
    case 'INIT_SIMULATION':
      initializeSimulation(message.payload.persistedSnapshot);
      return;

    case 'START_SIMULATION':
      updateRuntimeState(
        (current) => ({
          ...current,
          isRunning: true,
          world: {
            ...current.world,
            lastTickAt: Date.now(),
          },
        }),
        'resume',
        true,
      );
      return;

    case 'PAUSE_SIMULATION':
      updateRuntimeState(
        (current) => ({
          ...current,
          isRunning: false,
        }),
        'pause',
        true,
      );
      return;

    case 'SET_SPEED':
      updateRuntimeState(
        (current) => ({
          ...current,
          speed: message.payload.speed,
          world: {
            ...current.world,
            lastTickAt: Date.now(),
          },
        }),
        'speed',
        true,
      );
      return;

    case 'SELECT_STOCK':
      updateRuntimeState(
        (current) => ({
          ...current,
          selectedStockId: message.payload.stockId,
        }),
        'selection',
        true,
      );
      return;

    case 'USER_BUY_ORDER':
      handleOrder('buy', message.payload.quantity);
      return;

    case 'USER_SELL_ORDER':
      handleOrder('sell', message.payload.quantity);
      return;

    case 'PLACE_PENDING_ORDER':
      handlePendingOrder(
        message.payload.side,
        message.payload.quantity,
        message.payload.targetPrice,
      );
      return;

    case 'CANCEL_PENDING_ORDER':
      handlePendingOrderCancel(message.payload.orderId);
      return;

    case 'RESET_SIMULATION':
      initializeSimulation(null);
      publishSnapshot('reset', undefined, true);
      return;

    case 'REQUEST_SNAPSHOT':
      publishSnapshot('manual', undefined, true);
      return;

    case 'REQUEST_PERSISTENCE_SNAPSHOT':
      publishPersistenceSnapshot(true);
      return;

    default:
      postWorkerMessage({
        type: 'WORKER_ERROR',
        payload: {
          message: `처리할 수 없는 워커 메시지입니다: ${JSON.stringify(message)}`,
          recoverable: true,
        },
      });
  }
}

workerScope.addEventListener('message', (event: MessageEvent<unknown>) => {
  try {
    if (!isMarketWorkerInboundMessage(event.data)) {
      postWorkerMessage({
        type: 'WORKER_ERROR',
        payload: {
          message: '워커가 올바르지 않은 메시지 데이터를 받았습니다.',
          recoverable: true,
        },
      });
      return;
    }

    handleMessage(event.data);
  } catch (error) {
    postWorkerMessage({
      type: 'WORKER_ERROR',
      payload: {
        message:
          error instanceof Error
            ? error.message
            : '시뮬레이션 처리 중 알 수 없는 워커 오류가 발생했습니다.',
        recoverable: true,
      },
    });
  }
});

workerScope.addEventListener('error', (event) => {
  postWorkerMessage({
    type: 'WORKER_ERROR',
    payload: {
      message: event.message || '시장 워커가 예기치 않게 중단되었습니다.',
      recoverable: false,
    },
  });
});
