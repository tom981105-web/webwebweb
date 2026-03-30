import { useCallback, useEffect, useMemo, useRef } from 'react';
import { localStorageSimulationRepository } from '@/features/stock-sim/services/persistence';
import { createPersistedSimulationSnapshot } from '@/features/stock-sim/services/persistence';
import { getCurrentUiState, useSimulationUiStore } from '@/features/stock-sim/store/simulationUiStore';
import type { PersistedSimulationSnapshot, SpeedSetting, TradeSide } from '@/features/stock-sim/types';
import { createMarketWorkerBridge, type MarketWorkerBridge } from '@/features/stock-sim/worker/workerBridge';
import type { MarketWorkerOutboundMessage } from '@/features/stock-sim/worker/workerMessages';

function cancelIdleCallbackSafely(id: number | null) {
  if (id === null) {
    return;
  }

  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  }
}

function requestIdleCallbackSafely(callback: () => void) {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout: 1_000 });
  }

  callback();
  return null;
}

export function useMarketWorker() {
  const bridgeRef = useRef<MarketWorkerBridge | null>(null);
  const latestPersistenceSnapshotRef = useRef<PersistedSimulationSnapshot | null>(null);
  const saveTimeoutRef = useRef(0);
  const idleCallbackRef = useRef<number | null>(null);

  const setSnapshot = useSimulationUiStore((state) => state.actions.setSnapshot);
  const setWorkerReady = useSimulationUiStore((state) => state.actions.setWorkerReady);
  const setWorkerError = useSimulationUiStore((state) => state.actions.setWorkerError);
  const touchWorkerMessage = useSimulationUiStore((state) => state.actions.touchWorkerMessage);
  const enqueueToast = useSimulationUiStore((state) => state.actions.enqueueToast);
  const hydrateUi = useSimulationUiStore((state) => state.actions.hydrateUi);
  const updatePersistenceState = useSimulationUiStore(
    (state) => state.actions.updatePersistenceState,
  );

  const flushPersistence = useCallback(() => {
    const latestSnapshot = latestPersistenceSnapshotRef.current;

    if (!latestSnapshot) {
      return;
    }

    const mergedSnapshot = createPersistedSimulationSnapshot(
      latestSnapshot.simulation,
      getCurrentUiState(),
    );
    const result = localStorageSimulationRepository.save(mergedSnapshot);
    updatePersistenceState(result.savedAt, result.status);
  }, [updatePersistenceState]);

  const schedulePersistence = useCallback(() => {
    window.clearTimeout(saveTimeoutRef.current);
    cancelIdleCallbackSafely(idleCallbackRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      idleCallbackRef.current = requestIdleCallbackSafely(flushPersistence);
    }, 900);
  }, [flushPersistence]);

  const handleWorkerMessage = useCallback(
    (message: MarketWorkerOutboundMessage) => {
      touchWorkerMessage();

      switch (message.type) {
        case 'WORKER_READY':
          setWorkerReady();
          setSnapshot(message.payload.snapshot);
          return;

        case 'WORKER_TICK_UPDATE':
        case 'WORKER_EVENT_UPDATE':
        case 'WORKER_TRADE_UPDATE':
          setSnapshot(message.payload.snapshot);
          return;

        case 'WORKER_TOAST':
          enqueueToast(message.payload.toast);
          return;

        case 'WORKER_PERSISTENCE_SNAPSHOT':
          latestPersistenceSnapshotRef.current = message.payload.snapshot;
          schedulePersistence();
          return;

        case 'WORKER_ERROR':
          setWorkerError(message.payload.message);
          return;

        default:
          return;
      }
    },
    [enqueueToast, schedulePersistence, setSnapshot, setWorkerError, setWorkerReady, touchWorkerMessage],
  );

  useEffect(() => {
    const loaded = localStorageSimulationRepository.load();

    if (loaded.snapshot?.ui) {
      hydrateUi(loaded.snapshot.ui);
    }

    updatePersistenceState(
      loaded.snapshot?.savedAt ?? null,
      loaded.status,
      loaded.source,
    );

    if (loaded.status === 'recovered') {
      enqueueToast({
        id: 'toast-storage-recovered',
        tone: 'info',
        title: '저장본 복구 완료',
        message: '저장 오류가 감지되어 백업된 시장 스냅샷으로 복구했습니다.',
      });
    }

    const bridge = createMarketWorkerBridge();
    bridgeRef.current = bridge;

    const unsubscribeWorker = bridge.subscribe(handleWorkerMessage);

    bridge.send({
      type: 'INIT_SIMULATION',
      payload: {
        persistedSnapshot: loaded.snapshot,
      },
    });

    let lastUi = useSimulationUiStore.getState().ui;
    const unsubscribeUi = useSimulationUiStore.subscribe((state) => {
      if (state.ui !== lastUi) {
        lastUi = state.ui;
        schedulePersistence();
      }
    });

    const flushOnPageHide = () => {
      flushPersistence();
    };

    const flushOnVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPersistence();
      }
    };

    window.addEventListener('pagehide', flushOnPageHide);
    document.addEventListener('visibilitychange', flushOnVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushOnPageHide);
      document.removeEventListener('visibilitychange', flushOnVisibilityChange);
      unsubscribeUi();
      unsubscribeWorker();
      window.clearTimeout(saveTimeoutRef.current);
      cancelIdleCallbackSafely(idleCallbackRef.current);
      flushPersistence();
      bridge.terminate();
      bridgeRef.current = null;
    };
  }, [
    enqueueToast,
    flushPersistence,
    handleWorkerMessage,
    hydrateUi,
    schedulePersistence,
    updatePersistenceState,
  ]);

  const commands = useMemo(
    () => ({
      toggleRunning() {
        const snapshot = useSimulationUiStore.getState().snapshot;

        if (!snapshot) {
          return;
        }

        bridgeRef.current?.send({
          type: snapshot.isRunning ? 'PAUSE_SIMULATION' : 'START_SIMULATION',
        });
      },
      setSpeed(speed: SpeedSetting) {
        bridgeRef.current?.send({
          type: 'SET_SPEED',
          payload: { speed },
        });
      },
      selectStock(stockId: string) {
        bridgeRef.current?.send({
          type: 'SELECT_STOCK',
          payload: { stockId },
        });
      },
      placeOrder(side: TradeSide, quantity: number) {
        bridgeRef.current?.send({
          type: side === 'buy' ? 'USER_BUY_ORDER' : 'USER_SELL_ORDER',
          payload: { quantity },
        });
      },
      placePendingOrder(side: TradeSide, quantity: number, targetPrice: number) {
        bridgeRef.current?.send({
          type: 'PLACE_PENDING_ORDER',
          payload: {
            side,
            quantity,
            targetPrice,
          },
        });
      },
      cancelPendingOrder(orderId: string) {
        bridgeRef.current?.send({
          type: 'CANCEL_PENDING_ORDER',
          payload: { orderId },
        });
      },
      resetSimulation() {
        bridgeRef.current?.send({
          type: 'RESET_SIMULATION',
        });
      },
      requestSnapshot() {
        bridgeRef.current?.send({
          type: 'REQUEST_SNAPSHOT',
        });
      },
    }),
    [],
  );

  return commands;
}
