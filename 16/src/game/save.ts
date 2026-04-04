import { SAVE_KEY, SAVE_VERSION } from '@/data/balance';
import type { SaveState } from '@/types/game';
import { safeParseJson } from '@/utils/format';

export function loadSave(): SaveState | null {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    const parsed = safeParseJson<SaveState | null>(raw, null);
    if (!parsed || parsed.version !== SAVE_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveGame(state: SaveState) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch {
    // local-only game: ignore storage edge cases quietly
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // ignore
  }
}

export function exportSave(state: SaveState) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
}

export function importSave(payload: string): SaveState {
  const decoded = decodeURIComponent(escape(atob(payload.trim())));
  const parsed = JSON.parse(decoded) as SaveState;
  if (!parsed || parsed.version !== SAVE_VERSION) {
    throw new Error('This backup string is invalid or out of date.');
  }
  return parsed;
}
