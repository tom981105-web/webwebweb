import type {
  PersistedSimulationSnapshot,
  SimulationState,
  ToastMessage,
  TradeSide,
  UiState,
} from '@/features/stock-sim/types';

export type PersistedSource = 'primary' | 'backup' | 'fresh';
export type PersistenceStatus = 'idle' | 'saved' | 'recovered' | 'error';

export interface RepositoryLoadResult {
  snapshot: PersistedSimulationSnapshot | null;
  source: PersistedSource;
  status: PersistenceStatus;
}

export interface RepositorySaveResult {
  savedAt: number | null;
  status: Exclude<PersistenceStatus, 'recovered'>;
}

export interface SimulationRepository {
  load: () => RepositoryLoadResult;
  save: (snapshot: PersistedSimulationSnapshot) => RepositorySaveResult;
  clear: () => boolean;
}

export interface UserOrderGatewayResult {
  simulation?: SimulationState;
  toast: ToastMessage;
}

export interface SimulationGateway {
  createInitialSimulationState: () => SimulationState;
  createDefaultUiState: () => UiState;
  hydrateSimulation: (state: SimulationState) => SimulationState;
  advanceSimulation: (state: SimulationState) => SimulationState;
  advanceSimulationBatch: (
    state: SimulationState,
    steps: number,
    executedAt?: number,
  ) => SimulationState;
  placeUserOrder: (
    state: SimulationState,
    side: TradeSide,
    quantity: number,
  ) => UserOrderGatewayResult;
}

export interface StockSimDependencies {
  repository: SimulationRepository;
  gateway: SimulationGateway;
}
