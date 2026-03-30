import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createPersistedSimulationSnapshot, localStorageSimulationRepository } from '@/features/stock-sim/services/persistence';
import {
  fetchRemoteStockSimSession,
  saveRemoteStockSimSession,
  type RemoteStockSimSession,
} from '@/features/stock-sim/services/remoteSession';
import { getCurrentUiState, useSimulationUiStore } from '@/features/stock-sim/store/simulationUiStore';
import type { PersistedSimulationSnapshot, SpeedSetting, TradeSide } from '@/features/stock-sim/types';
import { createMarketWorkerBridge, type MarketWorkerBridge } from '@/features/stock-sim/worker/workerBridge';
import type { MarketWorkerOutboundMessage } from '@/features/stock-sim/worker/workerMessages';

const REMOTE_SYNC_DEBOUNCE_MS = 3500;
const REMOTE_SESSION_POLL_MS = 12000;

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

function getSnapshotSavedAt(snapshot: PersistedSimulationSnapshot | null | undefined) {
  const savedAt = Number(snapshot?.savedAt || 0);
  return Number.isFinite(savedAt) ? savedAt : 0;
}

export function useMarketWorker() {
  const bridgeRef = useRef<MarketWorkerBridge | null>(null);
  const latestPersistenceSnapshotRef = useRef<PersistedSimulationSnapshot | null>(null);
  const latestHydratedSnapshotAtRef = useRef(0);
  const saveTimeoutRef = useRef(0);
  const idleCallbackRef = useRef<number | null>(null);
  const remoteSaveTimeoutRef = useRef(0);
  const remoteSaveInFlightRef = useRef(false);
  const initialRemoteSaveQueuedRef = useRef(false);

  const setSnapshot = useSimulationUiStore((state) => state.actions.setSnapshot);
  const setWorkerReady = useSimulationUiStore((state) => state.actions.setWorkerReady);
  const setWorkerError = useSimulationUiStore((state) => state.actions.setWorkerError);
  const touchWorkerMessage = useSimulationUiStore((state) => state.actions.touchWorkerMessage);
  const enqueueToast = useSimulationUiStore((state) => state.actions.enqueueToast);
  const hydrateUi = useSimulationUiStore((state) => state.actions.hydrateUi);
  const setRemoteLeaderboard = useSimulationUiStore(
    (state) => state.actions.setRemoteLeaderboard,
  );
  const updatePersistenceState = useSimulationUiStore(
    (state) => state.actions.updatePersistenceState,
  );

  const flushPersistence = useCallback(() => {
    const latestSnapshot = latestPersistenceSnapshotRef.current;

    if (!latestSnapshot) {
      return null;
    }

    const mergedSnapshot = createPersistedSimulationSnapshot(
      latestSnapshot.simulation,
      getCurrentUiState(),
    );
    latestPersistenceSnapshotRef.current = mergedSnapshot;
    latestHydratedSnapshotAtRef.current = Math.max(
      latestHydratedSnapshotAtRef.current,
      getSnapshotSavedAt(mergedSnapshot),
    );

    const result = localStorageSimulationRepository.save(mergedSnapshot);
    updatePersistenceState(result.savedAt, result.status);
    return mergedSnapshot;
  }, [updatePersistenceState]);

  const applyRemoteSession = useCallback(
    (session: RemoteStockSimSession | null) => {
      if (!session) {
        return;
      }

      setRemoteLeaderboard(session.leaderboard);

      const remoteSnapshot = session.snapshot;
      const remoteSavedAt = getSnapshotSavedAt(remoteSnapshot);
      const localSavedAt = Math.max(
        latestHydratedSnapshotAtRef.current,
        getSnapshotSavedAt(latestPersistenceSnapshotRef.current),
      );

      if (
        remoteSnapshot &&
        remoteSavedAt > localSavedAt &&
        bridgeRef.current
      ) {
        latestPersistenceSnapshotRef.current = remoteSnapshot;
        latestHydratedSnapshotAtRef.current = remoteSavedAt;

        if (remoteSnapshot.ui) {
          hydrateUi(remoteSnapshot.ui);
        }

        bridgeRef.current.send({
          type: 'HYDRATE_PERSISTED_SNAPSHOT',
          payload: {
            persistedSnapshot: remoteSnapshot,
          },
        });

        updatePersistenceState(remoteSavedAt, 'saved', 'primary');
      }
    },
    [hydrateUi, setRemoteLeaderboard, updatePersistenceState],
  );

  const flushRemoteSession = useCallback(async () => {
    if (remoteSaveInFlightRef.current) {
      return;
    }

    const mergedSnapshot =
      flushPersistence() || latestPersistenceSnapshotRef.current;

    if (!mergedSnapshot) {
      return;
    }

    remoteSaveInFlightRef.current = true;

    try {
      const session = await saveRemoteStockSimSession(mergedSnapshot);
      if (session) {
        setRemoteLeaderboard(session.leaderboard);
      }
    } finally {
      remoteSaveInFlightRef.current = false;
    }
  }, [flushPersistence, setRemoteLeaderboard]);

  const schedulePersistence = useCallback(() => {
    window.clearTimeout(saveTimeoutRef.current);
    cancelIdleCallbackSafely(idleCallbackRef.current);

    saveTimeoutRef.current = window.setTimeout(() => {
      idleCallbackRef.current = requestIdleCallbackSafely(() => {
        flushPersistence();
      });
    }, 900);
  }, [flushPersistence]);

  const scheduleRemotePersistence = useCallback(() => {
    window.clearTimeout(remoteSaveTimeoutRef.current);

    remoteSaveTimeoutRef.current = window.setTimeout(() => {
      void flushRemoteSession();
    }, REMOTE_SYNC_DEBOUNCE_MS);
  }, [flushRemoteSession]);

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
          latestHydratedSnapshotAtRef.current = Math.max(
            latestHydratedSnapshotAtRef.current,
            getSnapshotSavedAt(message.payload.snapshot),
          );
          schedulePersistence();
          if (!initialRemoteSaveQueuedRef.current) {
            initialRemoteSaveQueuedRef.current = true;
            void flushRemoteSession();
          } else {
            scheduleRemotePersistence();
          }
          return;

        case 'WORKER_ERROR':
          setWorkerError(message.payload.message);
          return;

        default:
          return;
      }
    },
    [
      enqueueToast,
      schedulePersistence,
      scheduleRemotePersistence,
      setSnapshot,
      setWorkerError,
      setWorkerReady,
      touchWorkerMessage,
    ],
  );

  useEffect(() => {
    const loaded = localStorageSimulationRepository.load();
    latestPersistenceSnapshotRef.current = loaded.snapshot ?? null;
    latestHydratedSnapshotAtRef.current = getSnapshotSavedAt(loaded.snapshot);

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
        message: '브라우저 저장 오류가 감지되어 백업 저장본으로 복구했습니다.',
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

    let isMounted = true;
    let remotePollTimer = 0;

    const syncRemoteSession = async () => {
      const session = await fetchRemoteStockSimSession();
      if (!isMounted) {
        return;
      }

      if (session) {
        applyRemoteSession(session);
      } else {
        setRemoteLeaderboard([]);
      }
    };

    void syncRemoteSession();
    remotePollTimer = window.setInterval(() => {
      void syncRemoteSession();
    }, REMOTE_SESSION_POLL_MS);

    let lastUi = useSimulationUiStore.getState().ui;
    const unsubscribeUi = useSimulationUiStore.subscribe((state) => {
      if (state.ui !== lastUi) {
        lastUi = state.ui;
        schedulePersistence();
        scheduleRemotePersistence();
      }
    });

    const flushOnPageHide = () => {
      flushPersistence();
      void flushRemoteSession();
    };

    const flushOnVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushOnPageHide();
      }
    };

    window.addEventListener('pagehide', flushOnPageHide);
    document.addEventListener('visibilitychange', flushOnVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener('pagehide', flushOnPageHide);
      document.removeEventListener('visibilitychange', flushOnVisibilityChange);
      window.clearInterval(remotePollTimer);
      unsubscribeUi();
      unsubscribeWorker();
      window.clearTimeout(saveTimeoutRef.current);
      window.clearTimeout(remoteSaveTimeoutRef.current);
      cancelIdleCallbackSafely(idleCallbackRef.current);
      flushPersistence();
      bridge.terminate();
      bridgeRef.current = null;
    };
  }, [
    applyRemoteSession,
    enqueueToast,
    flushPersistence,
    flushRemoteSession,
    handleWorkerMessage,
    hydrateUi,
    schedulePersistence,
    scheduleRemotePersistence,
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
