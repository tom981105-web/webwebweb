import { useEffect } from 'react';

import { TICK_INTERVAL_MS } from '@/data/balance';

export function useGameLoop(tick: (deltaMs: number) => void) {
  useEffect(() => {
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = now - previous;
      previous = now;
      tick(delta);
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [tick]);
}
