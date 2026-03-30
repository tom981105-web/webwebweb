import { useEffect } from 'react';
import { PERSISTENCE_DEBOUNCE_MS } from '@/features/stock-sim/constants/config';
import { defaultStockSimDependencies } from '@/features/stock-sim/services/defaultDependencies';
import { createPersistedSimulationSnapshot } from '@/features/stock-sim/services/persistence';
import {
  getCurrentPersistencePayload,
  useStockSimStore,
} from '@/features/stock-sim/store/useStockSimStore';

function flushSimulationSnapshot() {
  const { simulation: currentSimulation, ui: currentUi } = getCurrentPersistencePayload();

  return defaultStockSimDependencies.repository.save(
    createPersistedSimulationSnapshot(currentSimulation, currentUi),
  );
}

function cancelIdleFlush(id: number | null) {
  if (id === null) {
    return;
  }

  if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  }
}

function scheduleIdleFlush(callback: () => void) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout: 900 });
  }

  callback();
  return null;
}

export function useSimulationPersistence() {
  const updatePersistenceState = useStockSimStore((state) => state.actions.updatePersistenceState);

  useEffect(() => {
    let timeoutId = 0;
    let idleCallbackId: number | null = null;
    let lastSimulation = useStockSimStore.getState().simulation;
    let lastUi = useStockSimStore.getState().ui;

    const scheduleFlush = () => {
      window.clearTimeout(timeoutId);
      cancelIdleFlush(idleCallbackId);
      timeoutId = window.setTimeout(() => {
        idleCallbackId = scheduleIdleFlush(() => {
          const result = flushSimulationSnapshot();
          updatePersistenceState(result.savedAt, result.status);
        });
      }, PERSISTENCE_DEBOUNCE_MS);
    };

    const unsubscribe = useStockSimStore.subscribe((state) => {
      if (state.simulation !== lastSimulation || state.ui !== lastUi) {
        lastSimulation = state.simulation;
        lastUi = state.ui;
        scheduleFlush();
      }
    });

    return () => {
      unsubscribe();
      window.clearTimeout(timeoutId);
      cancelIdleFlush(idleCallbackId);
    };
  }, [updatePersistenceState]);

  useEffect(() => {
    const flushOnPageHide = () => {
      const result = flushSimulationSnapshot();
      updatePersistenceState(result.savedAt, result.status);
    };

    const flushOnVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushOnPageHide();
      }
    };

    window.addEventListener('pagehide', flushOnPageHide);
    document.addEventListener('visibilitychange', flushOnVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushOnPageHide);
      document.removeEventListener('visibilitychange', flushOnVisibilityChange);
    };
  }, [updatePersistenceState]);
}
