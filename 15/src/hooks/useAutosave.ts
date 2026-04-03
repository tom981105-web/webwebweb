import { useEffect } from 'react';

export function useAutosave(onSave: () => void, intervalMs = 15000) {
  useEffect(() => {
    const timer = window.setInterval(() => {
      onSave();
    }, intervalMs);

    const handleBeforeUnload = () => onSave();
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [intervalMs, onSave]);
}
