import { useEffect } from 'react';

import { AUTOSAVE_INTERVAL_MS } from '@/data/balance';

export function useAutosave(save: () => void) {
  useEffect(() => {
    const timer = window.setInterval(save, AUTOSAVE_INTERVAL_MS);
    const handleBeforeUnload = () => save();
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [save]);
}
