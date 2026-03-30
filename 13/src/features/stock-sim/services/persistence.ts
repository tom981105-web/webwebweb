import {
  STORAGE_APP_ID,
  STORAGE_BACKUP_KEY,
  STORAGE_KEY,
  STORAGE_STAGING_KEY,
  STORAGE_VERSION,
} from '@/features/stock-sim/constants/config';
import type {
  RepositoryLoadResult,
  RepositorySaveResult,
  SimulationRepository,
} from '@/features/stock-sim/services/contracts';
import type {
  PersistedSimulationSnapshot,
  PersistenceMeta,
  SimulationState,
  UiState,
} from '@/features/stock-sim/types';

function isValidSimulationState(value: unknown): value is SimulationState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as SimulationState;

  return (
    Array.isArray(candidate.stocks) &&
    Array.isArray(candidate.aiTraders) &&
    Array.isArray(candidate.trades) &&
    Array.isArray(candidate.events) &&
    Array.isArray(candidate.aiActivity) &&
    Array.isArray(candidate.leaderboard) &&
    typeof candidate.player === 'object' &&
    typeof candidate.selectedStockId === 'string' &&
    typeof candidate.tick === 'number'
  );
}

function isValidUiState(value: unknown): value is UiState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as UiState;

  return (
    typeof candidate.searchQuery === 'string' &&
    typeof candidate.sectorFilter === 'string' &&
    typeof candidate.stockSort === 'string' &&
    typeof candidate.leaderboardSort === 'string' &&
    typeof candidate.chartTimeframe === 'string'
  );
}

function isValidMeta(value: unknown): value is PersistenceMeta {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as PersistenceMeta;

  return (
    candidate.appId === STORAGE_APP_ID &&
    typeof candidate.checksum === 'number' &&
    (candidate.engine === 'local-engine' || candidate.engine === 'worker-engine') &&
    candidate.leaderboardMode === 'preview'
  );
}

function createChecksum(payload: string) {
  let hash = 0;

  for (let index = 0; index < payload.length; index += 1) {
    hash = (hash << 5) - hash + payload.charCodeAt(index);
    hash |= 0;
  }

  return hash;
}

function getCurrentSimulationUserId() {
  if (typeof window === 'undefined') {
    return 'guest';
  }

  try {
    const currentUser = String(window.localStorage.getItem('current_user') || '')
      .trim()
      .toLowerCase();
    return currentUser || 'guest';
  } catch {
    return 'guest';
  }
}

function getScopedStorageKeys() {
  const scope = getCurrentSimulationUserId().replace(/[^a-z0-9_-]/gi, '_');

  return {
    primary: `${STORAGE_KEY}::${scope}`,
    backup: `${STORAGE_BACKUP_KEY}::${scope}`,
    staging: `${STORAGE_STAGING_KEY}::${scope}`,
  };
}

function getStorage() {
  try {
    const storage = window.localStorage;
    const probeKey = `${STORAGE_APP_ID}::probe`;
    storage.setItem(probeKey, '1');
    storage.removeItem(probeKey);
    return storage;
  } catch {
    return null;
  }
}

function validateSnapshot(snapshot: unknown): snapshot is PersistedSimulationSnapshot {
  if (!snapshot || typeof snapshot !== 'object') {
    return false;
  }

  const candidate = snapshot as PersistedSimulationSnapshot;

  if (
    candidate.version !== STORAGE_VERSION ||
    typeof candidate.savedAt !== 'number' ||
    !isValidSimulationState(candidate.simulation) ||
    !isValidUiState(candidate.ui) ||
    !isValidMeta(candidate.meta)
  ) {
    return false;
  }

  const payload = JSON.stringify({
    simulation: candidate.simulation,
    ui: candidate.ui,
  });

  return createChecksum(payload) === candidate.meta.checksum;
}

function readSnapshot(key: string) {
  try {
    const storage = getStorage();

    if (!storage) {
      return null;
    }

    const raw = storage.getItem(key);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedSimulationSnapshot;
    return validateSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function createPersistedSimulationSnapshot(
  simulation: SimulationState,
  ui: UiState,
): PersistedSimulationSnapshot {
  const payload = JSON.stringify({ simulation, ui });

  return {
    version: STORAGE_VERSION,
    savedAt: Date.now(),
    simulation,
    ui,
    meta: {
      appId: STORAGE_APP_ID,
      checksum: createChecksum(payload),
      engine: 'worker-engine',
      leaderboardMode: 'preview',
    },
  };
}

export const localStorageSimulationRepository: SimulationRepository = {
  load: (): RepositoryLoadResult => {
    const storage = getStorage();
    const keys = getScopedStorageKeys();

    if (!storage) {
      return {
        snapshot: null,
        source: 'fresh',
        status: 'idle',
      };
    }

    const primary = readSnapshot(keys.primary);

    if (primary) {
      return {
        snapshot: primary,
        source: 'primary',
        status: 'saved',
      };
    }

    const backup = readSnapshot(keys.backup);

    if (backup) {
      try {
        storage.setItem(keys.primary, JSON.stringify(backup));
        storage.removeItem(keys.staging);
      } catch {
        // Ignore self-healing failures and still return the recovered snapshot.
      }

      return {
        snapshot: backup,
        source: 'backup',
        status: 'recovered',
      };
    }

    return {
      snapshot: null,
      source: 'fresh',
      status: 'idle',
    };
  },
  save: (snapshot): RepositorySaveResult => {
    try {
      const storage = getStorage();
      const keys = getScopedStorageKeys();

      if (!storage) {
        return {
          savedAt: null,
          status: 'error',
        };
      }

      const payload = JSON.stringify(snapshot);
      const current = storage.getItem(keys.primary);
      let currentPrimary: string | null = null;

      if (current) {
        try {
          const parsed = JSON.parse(current) as PersistedSimulationSnapshot;
          currentPrimary = validateSnapshot(parsed) ? current : null;
        } catch {
          currentPrimary = null;
        }
      }

      storage.setItem(keys.staging, payload);

      if (currentPrimary) {
        storage.setItem(keys.backup, currentPrimary);
      }

      storage.setItem(keys.primary, payload);
      storage.removeItem(keys.staging);

      return {
        savedAt: snapshot.savedAt,
        status: 'saved',
      };
    } catch {
      return {
        savedAt: null,
        status: 'error',
      };
    }
  },
  clear: () => {
    try {
      const storage = getStorage();
      const keys = getScopedStorageKeys();

      if (!storage) {
        return false;
      }

      storage.removeItem(keys.primary);
      storage.removeItem(keys.backup);
      storage.removeItem(keys.staging);
      return true;
    } catch {
      return false;
    }
  },
};
