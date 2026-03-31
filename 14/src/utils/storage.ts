import { GAME_VERSION, SAVE_STORAGE_PREFIX } from '@/data/balance';
import type { GameSaveState } from '@/types/game';

function getStorageKey() {
  const currentUser = typeof window !== 'undefined' ? String(window.localStorage.getItem('current_user') || '').trim() : '';
  return currentUser ? `${SAVE_STORAGE_PREFIX}:${currentUser}` : `${SAVE_STORAGE_PREFIX}:guest`;
}

export function loadGameSave() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(getStorageKey());
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GameSaveState;
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed.version === GAME_VERSION ? parsed : { ...parsed, version: GAME_VERSION };
  } catch {
    return null;
  }
}

export function saveGameSave(data: GameSaveState) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getStorageKey(), JSON.stringify(data));
  } catch {
  }
}

export function clearGameSave() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getStorageKey());
  } catch {
  }
}

export function exportGameSave(data: GameSaveState) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importGameSave(encoded: string) {
  const decoded = decodeURIComponent(escape(atob(encoded.trim())));
  return JSON.parse(decoded) as GameSaveState;
}
