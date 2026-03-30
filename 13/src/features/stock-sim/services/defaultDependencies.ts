import type { StockSimDependencies } from '@/features/stock-sim/services/contracts';
import { localSimulationGateway } from '@/features/stock-sim/services/localSimulationGateway';
import { localStorageSimulationRepository } from '@/features/stock-sim/services/persistence';

export const defaultStockSimDependencies: StockSimDependencies = {
  repository: localStorageSimulationRepository,
  gateway: localSimulationGateway,
};
