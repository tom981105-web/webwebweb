import { STORAGE_KEY } from '@/config/balance';
import { migrateSave } from '@/game/migrations';
import type { GameSaveState } from '@/types/game';

export function loadSave(): GameSaveState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveGame(state: GameSaveState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearSave() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function exportSave(state: GameSaveState) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importSave(payload: string) {
  const decoded = decodeURIComponent(escape(atob(payload)));
  return migrateSave(JSON.parse(decoded));
}
