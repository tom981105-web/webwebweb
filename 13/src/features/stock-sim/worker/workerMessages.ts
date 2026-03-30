import type {
  PersistedSimulationSnapshot,
  SimulationUiSnapshot,
  SpeedSetting,
  ToastMessage,
} from '@/features/stock-sim/types';

export type WorkerPublishReason =
  | 'init'
  | 'tick'
  | 'manual'
  | 'selection'
  | 'order'
  | 'reset'
  | 'speed'
  | 'resume'
  | 'pause';

export type MarketWorkerInboundMessage =
  | {
      type: 'INIT_SIMULATION';
      payload: {
        persistedSnapshot: PersistedSimulationSnapshot | null;
      };
    }
  | { type: 'START_SIMULATION' }
  | { type: 'PAUSE_SIMULATION' }
  | { type: 'RESET_SIMULATION' }
  | {
      type: 'SET_SPEED';
      payload: {
        speed: SpeedSetting;
      };
    }
  | {
      type: 'SELECT_STOCK';
      payload: {
        stockId: string;
      };
    }
  | {
      type: 'USER_BUY_ORDER';
      payload: {
        quantity: number;
      };
    }
  | {
      type: 'USER_SELL_ORDER';
      payload: {
        quantity: number;
      };
    }
  | {
      type: 'PLACE_PENDING_ORDER';
      payload: {
        side: 'buy' | 'sell';
        quantity: number;
        targetPrice: number;
      };
    }
  | {
      type: 'CANCEL_PENDING_ORDER';
      payload: {
        orderId: string;
      };
    }
  | { type: 'REQUEST_SNAPSHOT' }
  | { type: 'REQUEST_PERSISTENCE_SNAPSHOT' };

export type MarketWorkerOutboundMessage =
  | {
      type: 'WORKER_READY';
      payload: {
        snapshot: SimulationUiSnapshot;
      };
    }
  | {
      type: 'WORKER_TICK_UPDATE';
      payload: {
        snapshot: SimulationUiSnapshot;
        reason: WorkerPublishReason;
      };
    }
  | {
      type: 'WORKER_EVENT_UPDATE';
      payload: {
        snapshot: SimulationUiSnapshot;
        reason: WorkerPublishReason;
      };
    }
  | {
      type: 'WORKER_TRADE_UPDATE';
      payload: {
        snapshot: SimulationUiSnapshot;
        reason: WorkerPublishReason;
      };
    }
  | {
      type: 'WORKER_TOAST';
      payload: {
        toast: ToastMessage;
      };
    }
  | {
      type: 'WORKER_PERSISTENCE_SNAPSHOT';
      payload: {
        snapshot: PersistedSimulationSnapshot;
      };
    }
  | {
      type: 'WORKER_ERROR';
      payload: {
        message: string;
        recoverable: boolean;
      };
    };

export function isMarketWorkerInboundMessage(
  value: unknown,
): value is MarketWorkerInboundMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'type' in value &&
      typeof (value as { type?: unknown }).type === 'string',
  );
}
