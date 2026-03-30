import { create } from 'zustand';
import { MAX_TOAST_MESSAGES } from '@/features/stock-sim/constants/config';
import type {
  ChartTimeframe,
  LeaderboardSortMode,
  RuntimeState,
  Sector,
  SimulationUiSnapshot,
  StockSortMode,
  ToastMessage,
  UiState,
  LeaderboardEntry,
} from '@/features/stock-sim/types';
import { sectors } from '@/features/stock-sim/types';

function limitToasts(toasts: ToastMessage[]) {
  return toasts.slice(0, MAX_TOAST_MESSAGES);
}

function createDefaultRuntime(): RuntimeState {
  return {
    persistenceStatus: 'idle',
    lastSavedAt: null,
    hydratedFrom: 'fresh',
    multiplayerMode: 'api-ready',
    leaderboardMode: 'preview',
    remoteLeaderboardReady: false,
    workerStatus: 'booting',
    workerError: null,
    lastWorkerMessageAt: null,
    lastSnapshotAt: null,
  };
}

function createDefaultUiState(): UiState {
  return {
    searchQuery: '',
    sectorFilter: 'ALL',
    stockSort: 'fixed',
    leaderboardSort: 'netWorth',
    chartTimeframe: 'tick',
  };
}

function normalizeStockSort(sort: string): StockSortMode {
  if (sort === 'featured') {
    return 'fixed';
  }

  if (sort === 'gainers' || sort === 'losers' || sort === 'volume' || sort === 'fixed') {
    return sort;
  }

  return 'fixed';
}

function normalizeSectorFilter(sector: string): Sector | 'ALL' {
  if (sector === 'ALL') {
    return sector;
  }

  return sectors.includes(sector as Sector) ? (sector as Sector) : 'ALL';
}

export type SimulationUiStore = {
  snapshot: SimulationUiSnapshot | null;
  ui: UiState;
  runtime: RuntimeState;
  toasts: ToastMessage[];
  remoteLeaderboard: LeaderboardEntry[];
  actions: {
    hydrateUi: (ui: Partial<UiState>) => void;
    setSnapshot: (snapshot: SimulationUiSnapshot) => void;
    setWorkerReady: () => void;
    setWorkerError: (message: string) => void;
    touchWorkerMessage: () => void;
    enqueueToast: (toast: ToastMessage) => void;
    dismissToast: (toastId: string) => void;
    setSearchQuery: (query: string) => void;
    setSectorFilter: (sector: Sector | 'ALL') => void;
    setStockSort: (sort: StockSortMode) => void;
    setLeaderboardSort: (sort: LeaderboardSortMode) => void;
    setChartTimeframe: (timeframe: ChartTimeframe) => void;
    setRemoteLeaderboard: (entries: LeaderboardEntry[]) => void;
    updatePersistenceState: (
      savedAt: number | null,
      status: RuntimeState['persistenceStatus'],
      hydratedFrom?: RuntimeState['hydratedFrom'],
    ) => void;
  };
};

export const useSimulationUiStore = create<SimulationUiStore>((set) => ({
  snapshot: null,
  ui: createDefaultUiState(),
  runtime: createDefaultRuntime(),
  toasts: [],
  remoteLeaderboard: [],
  actions: {
    hydrateUi: (ui) =>
      set((state) => ({
        ui: {
          ...state.ui,
          ...ui,
          sectorFilter:
            ui.sectorFilter !== undefined
              ? normalizeSectorFilter(ui.sectorFilter)
              : state.ui.sectorFilter,
          stockSort:
            ui.stockSort !== undefined ? normalizeStockSort(ui.stockSort) : state.ui.stockSort,
          chartTimeframe:
            ui.chartTimeframe === 'tick' ||
            ui.chartTimeframe === '1m' ||
            ui.chartTimeframe === '1h' ||
            ui.chartTimeframe === '3h' ||
            ui.chartTimeframe === '24h'
              ? ui.chartTimeframe
              : state.ui.chartTimeframe,
        },
      })),
    setSnapshot: (snapshot) =>
      set((state) => ({
        snapshot,
        runtime: {
          ...state.runtime,
          workerStatus: 'ready',
          workerError: null,
          lastWorkerMessageAt: Date.now(),
          lastSnapshotAt: Date.now(),
        },
      })),
    setWorkerReady: () =>
      set((state) => ({
        runtime: {
          ...state.runtime,
          workerStatus: 'ready',
          workerError: null,
          lastWorkerMessageAt: Date.now(),
        },
      })),
    setWorkerError: (message) =>
      set((state) => ({
        runtime: {
          ...state.runtime,
          workerStatus: 'error',
          workerError: message,
          lastWorkerMessageAt: Date.now(),
        },
        toasts: limitToasts([
          {
            id: `worker-error-${Date.now()}`,
            tone: 'error',
            title: '워커 오류',
            message,
          },
          ...state.toasts,
        ]),
      })),
    touchWorkerMessage: () =>
      set((state) => ({
        runtime: {
          ...state.runtime,
          lastWorkerMessageAt: Date.now(),
        },
      })),
    enqueueToast: (toast) =>
      set((state) => ({
        toasts: limitToasts([toast, ...state.toasts]),
      })),
    dismissToast: (toastId) =>
      set((state) => ({
        toasts: state.toasts.filter((toast) => toast.id !== toastId),
      })),
    setSearchQuery: (query) =>
      set((state) => ({
        ui: {
          ...state.ui,
          searchQuery: query,
        },
      })),
    setSectorFilter: (sector) =>
      set((state) => ({
        ui: {
          ...state.ui,
          sectorFilter: sector,
        },
      })),
    setStockSort: (sort) =>
      set((state) => ({
        ui: {
          ...state.ui,
          stockSort: sort,
        },
      })),
    setLeaderboardSort: (sort) =>
      set((state) => ({
        ui: {
          ...state.ui,
          leaderboardSort: sort,
        },
      })),
    setChartTimeframe: (timeframe) =>
      set((state) => ({
        ui: {
          ...state.ui,
          chartTimeframe: timeframe,
        },
      })),
    setRemoteLeaderboard: (entries) =>
      set((state) => ({
        remoteLeaderboard: entries,
        runtime: {
          ...state.runtime,
          leaderboardMode: 'remote',
          remoteLeaderboardReady: true,
        },
      })),
    updatePersistenceState: (savedAt, status, hydratedFrom) =>
      set((state) => ({
        runtime: {
          ...state.runtime,
          persistenceStatus: status,
          lastSavedAt: savedAt ?? state.runtime.lastSavedAt,
          hydratedFrom: hydratedFrom ?? state.runtime.hydratedFrom,
        },
      })),
  },
}));

export function getCurrentUiState() {
  return useSimulationUiStore.getState().ui;
}
