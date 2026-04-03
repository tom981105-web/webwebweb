import { useEffect } from 'react';

export function useGameLoop(onTick: (deltaMs: number) => void) {
  useEffect(() => {
    let frame = 0;
    let previous = performance.now();

    const loop = (now: number) => {
      const delta = now - previous;
      previous = now;
      onTick(delta);
      frame = window.requestAnimationFrame(loop);
    };

    frame = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frame);
  }, [onTick]);
}
