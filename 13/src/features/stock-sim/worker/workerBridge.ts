import type {
  MarketWorkerInboundMessage,
  MarketWorkerOutboundMessage,
} from '@/features/stock-sim/worker/workerMessages';

type WorkerListener = (message: MarketWorkerOutboundMessage) => void;

export type MarketWorkerBridge = {
  send: (message: MarketWorkerInboundMessage) => void;
  subscribe: (listener: WorkerListener) => () => void;
  terminate: () => void;
};

export function createMarketWorkerBridge(): MarketWorkerBridge {
  const worker = new Worker(
    new URL('./marketWorker.ts', import.meta.url),
    {
      type: 'module',
      name: 'stock-sim-market-worker',
    },
  );
  const listeners = new Set<WorkerListener>();

  worker.onmessage = (event: MessageEvent<MarketWorkerOutboundMessage>) => {
    listeners.forEach((listener) => listener(event.data));
  };

  return {
    send: (message) => {
      worker.postMessage(message);
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
    terminate: () => {
      listeners.clear();
      worker.terminate();
    },
  };
}
