import { useEffect, useRef } from 'react';

export function useGameLoop(callback: (deltaMs: number) => void, enabled = true) {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return undefined;
    let frameId = 0;
    let last = performance.now();

    const loop = (now: number) => {
      const delta = now - last;
      last = now;
      callbackRef.current(delta);
      frameId = window.requestAnimationFrame(loop);
    };

    frameId = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled]);
}
