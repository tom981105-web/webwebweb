import { useEffect } from 'react';

export function useAutosave(callback: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return undefined;
    const handle = window.setInterval(() => {
      callback();
    }, 8000);
    return () => window.clearInterval(handle);
  }, [callback, enabled]);
}

