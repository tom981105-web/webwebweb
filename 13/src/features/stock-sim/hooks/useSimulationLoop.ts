import { useEffect } from 'react';
import {
  BASE_TICK_INTERVAL_MS,
  ENGINE_LOOP_INTERVAL_MS,
  MAX_BATCH_TICKS_PER_FRAME,
  UI_REFRESH_INTERVAL_MS,
} from '@/features/stock-sim/constants/config';
import { useStockSimStore } from '@/features/stock-sim/store/useStockSimStore';

export function useSimulationLoop() {
  const isRunning = useStockSimStore((state) => state.engineSimulation.isRunning);
  const speed = useStockSimStore((state) => state.engineSimulation.speed);
  const advanceEngineBatch = useStockSimStore((state) => state.actions.advanceEngineBatch);
  const publishSimulationFrame = useStockSimStore((state) => state.actions.publishSimulationFrame);

  useEffect(() => {
    if (!isRunning) {
      return undefined;
    }

    let timeoutId = 0;
    let cancelled = false;
    let lastPublishedAt = performance.now();

    const scheduleFrame = () => {
      timeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        const now = Date.now();
        const loopNow = performance.now();
        const { engineSimulation, simulation } = useStockSimStore.getState();
        const tickDuration = BASE_TICK_INTERVAL_MS / Math.max(1, speed);
        const elapsed = Math.max(0, now - engineSimulation.world.lastTickAt);
        const dueSteps = Math.min(
          MAX_BATCH_TICKS_PER_FRAME,
          Math.floor(elapsed / tickDuration),
        );

        if (dueSteps > 0) {
          advanceEngineBatch(dueSteps, now);
        }

        const hasNewFrame = simulation !== useStockSimStore.getState().engineSimulation;

        if (hasNewFrame && loopNow - lastPublishedAt >= UI_REFRESH_INTERVAL_MS) {
          publishSimulationFrame();
          lastPublishedAt = loopNow;
        }

        scheduleFrame();
      }, ENGINE_LOOP_INTERVAL_MS);
    };

    scheduleFrame();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [advanceEngineBatch, isRunning, publishSimulationFrame, speed]);
}
