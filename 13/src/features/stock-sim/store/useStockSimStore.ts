import { create } from 'zustand';
import { MAX_TOAST_MESSAGES } from '@/features/stock-sim/constants/config';
import type {
  LeaderboardSortMode,
  RuntimeState,
  Sector,
  SimulationState,
  StockSortMode,
  ToastMessage,
  UiState,
} from '@/features/stock-sim/types';
import type {
  PersistenceStatus,
  StockSimDependencies,
} from '@/features/stock-sim/services/contracts';
import { defaultStockSimDependencies } from '@/features/stock-sim/services/defaultDependencies';

function limitToasts(toasts: ToastMessage[]) {
  return toasts.slice(0, MAX_TOAST_MESSAGES);
}

function createInitialRuntime(): RuntimeState {
  return {
    persistenceStatus: 'idle',
    lastSavedAt: null,
    hydratedFrom: 'fresh',
    multiplayerMode: 'api-ready',
    leaderboardMode: 'preview',
    workerStatus: 'ready',
    workerError: null,
    lastWorkerMessageAt: null,
    lastSnapshotAt: null,
  };
}

function bootstrapState(dependencies: StockSimDependencies) {
  const loaded = typeof window !== 'undefined' ? dependencies.repository.load() : null;

  const simulation =
    loaded?.snapshot?.simulation
      ? dependencies.gateway.hydrateSimulation(loaded.snapshot.simulation)
      : dependencies.gateway.createInitialSimulationState();
  const ui = loaded?.snapshot?.ui ?? dependencies.gateway.createDefaultUiState();
  const runtime: RuntimeState = {
    ...createInitialRuntime(),
    persistenceStatus: loaded?.status ?? 'idle',
    lastSavedAt: loaded?.snapshot?.savedAt ?? null,
    hydratedFrom: loaded?.source ?? 'fresh',
  };

  return {
    simulation,
    ui,
    runtime,
  };
}

export type StockSimStore = {
  simulation: SimulationState;
  engineSimulation: SimulationState;
  ui: UiState;
  runtime: RuntimeState;
  toasts: ToastMessage[];
  actions: {
    advanceEngineBatch: (steps: number, executedAt?: number) => void;
    publishSimulationFrame: () => void;
    toggleRunning: () => void;
    setSpeed: (speed: SimulationState['speed']) => void;
    resetSimulation: () => void;
    selectStock: (stockId: string) => void;
    setSearchQuery: (query: string) => void;
    setSectorFilter: (sector: Sector | 'ALL') => void;
    setStockSort: (sort: StockSortMode) => void;
    setLeaderboardSort: (sort: LeaderboardSortMode) => void;
    placeUserOrder: (side: 'buy' | 'sell', quantity: number) => void;
    dismissToast: (toastId: string) => void;
    updatePersistenceState: (savedAt: number | null, status: PersistenceStatus) => void;
  };
};

export function createStockSimStore(
  dependencies: StockSimDependencies = defaultStockSimDependencies,
) {
  const bootstrapped = bootstrapState(dependencies);

  return create<StockSimStore>((set) => ({
    simulation: bootstrapped.simulation,
    engineSimulation: bootstrapped.simulation,
    ui: bootstrapped.ui,
    runtime: bootstrapped.runtime,
    toasts:
      bootstrapped.runtime.persistenceStatus === 'recovered'
        ? [
            {
              id: 'toast-storage-recovered',
              tone: 'info',
              title: '저장 데이터 복구',
              message: '백업 스냅샷에서 이전 시장 상태를 복구했습니다.',
            },
          ]
        : [],
    actions: {
      advanceEngineBatch: (steps, executedAt) =>
        set((state) => {
          if (!state.engineSimulation.isRunning) {
            return state;
          }

          return {
            engineSimulation: dependencies.gateway.advanceSimulationBatch(
              state.engineSimulation,
              steps,
              executedAt,
            ),
          };
        }),
      publishSimulationFrame: () =>
        set((state) => {
          if (state.simulation === state.engineSimulation) {
            return state;
          }

          return {
            simulation: state.engineSimulation,
          };
        }),
      toggleRunning: () =>
        set((state) => {
          const nextValue = !state.engineSimulation.isRunning;

          return {
            simulation: {
              ...state.simulation,
              isRunning: nextValue,
            },
            engineSimulation: {
              ...state.engineSimulation,
              isRunning: nextValue,
            },
          };
        }),
      setSpeed: (speed) =>
        set((state) => ({
          simulation: {
            ...state.simulation,
            speed,
          },
          engineSimulation: {
            ...state.engineSimulation,
            speed,
          },
        })),
      resetSimulation: () =>
        set(() => {
          dependencies.repository.clear();
          const nextSimulation = dependencies.gateway.createInitialSimulationState();
          const nextUi = dependencies.gateway.createDefaultUiState();

          return {
            simulation: nextSimulation,
            engineSimulation: nextSimulation,
            ui: nextUi,
            runtime: {
              ...createInitialRuntime(),
              multiplayerMode: 'api-ready',
              leaderboardMode: 'preview',
            },
            toasts: [
              {
                id: 'toast-reset',
                tone: 'info',
                title: '시장 재정렬 완료',
                message: '월드 상태와 포트폴리오를 기본 운영 상태로 복구했습니다.',
              },
            ],
          };
        }),
      selectStock: (stockId) =>
        set((state) => ({
          simulation: {
            ...state.simulation,
            selectedStockId: stockId,
          },
          engineSimulation: {
            ...state.engineSimulation,
            selectedStockId: stockId,
          },
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
      placeUserOrder: (side, quantity) =>
        set((state) => {
          const result = dependencies.gateway.placeUserOrder(state.engineSimulation, side, quantity);

          if (!result.simulation) {
            return {
              toasts: limitToasts([result.toast, ...state.toasts]),
            };
          }

          return {
            simulation: result.simulation,
            engineSimulation: result.simulation,
            toasts: limitToasts([result.toast, ...state.toasts]),
          };
        }),
      dismissToast: (toastId) =>
        set((state) => ({
          toasts: state.toasts.filter((toast) => toast.id !== toastId),
        })),
      updatePersistenceState: (savedAt, status) =>
        set((state) => ({
          runtime: {
            ...state.runtime,
            persistenceStatus: status,
            lastSavedAt: savedAt ?? state.runtime.lastSavedAt,
          },
        })),
    },
  }));
}

export const useStockSimStore = createStockSimStore();

export function getCurrentPersistencePayload() {
  const state = useStockSimStore.getState();

  return {
    simulation: state.engineSimulation,
    ui: state.ui,
  };
}
