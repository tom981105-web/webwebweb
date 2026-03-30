import type { SPEED_OPTIONS } from '@/features/stock-sim/constants/config';

export const sectors = [
  'AI',
  '반도체',
  '로봇',
  '우주',
  '바이오',
  '배터리',
  '게임',
  '플랫폼',
  '물류',
  '에너지',
  '엔터테인먼트',
  '방산',
] as const;

export type Sector = (typeof sectors)[number];
export type SpeedSetting = (typeof SPEED_OPTIONS)[number];

export type StockTrait =
  | 'stable'
  | 'news-sensitive'
  | 'ai-favorite'
  | 'speculative'
  | 'defensive'
  | 'theme-heavy'
  | 'trend-heavy'
  | 'volume-spike'
  | 'rumor-prone';

export type StockSortMode = 'fixed' | 'gainers' | 'losers' | 'volume';
export type LeaderboardSortMode = 'netWorth' | 'returnRate';
export type ChartTimeframe = 'tick' | '1m' | '1h' | '3h' | '24h';
export type TradeSide = 'buy' | 'sell';
export type TradeActorType = 'user' | 'ai';
export type MarketRegime =
  | 'accumulation'
  | 'markup'
  | 'rotation'
  | 'distribution'
  | 'panic'
  | 'rebound';

export interface StockBlueprint {
  id: string;
  ticker: string;
  name: string;
  sector: Sector;
  description: string;
  basePrice: number;
  volatility: number;
  momentum: number;
  sentiment: number;
  liquidity: number;
  traits: StockTrait[];
}

export interface Stock {
  id: string;
  ticker: string;
  name: string;
  sector: Sector;
  description: string;
  basePrice: number;
  currentPrice: number;
  previousPrice: number;
  volatility: number;
  momentum: number;
  sentiment: number;
  liquidity: number;
  priceHistory: number[];
  volumeHistory: number[];
  tradeCountHistory: number[];
  traits: StockTrait[];
  lastVolume: number;
}

export interface Holding {
  stockId: string;
  quantity: number;
  averageCost: number;
}

export interface Player {
  id: string;
  name: string;
  cash: number;
  holdings: Holding[];
  realizedPnL: number;
  tradeHistory: string[];
}

export type AiArchetype =
  | 'aggressive'
  | 'defensive'
  | 'scalper'
  | 'fearful'
  | 'contrarian'
  | 'theme-chaser'
  | 'whale'
  | 'crowd-follower';

export interface AiBlueprint {
  id: string;
  name: string;
  archetype: AiArchetype;
  startingCash: number;
  aggressiveness: number;
  fear: number;
  patience: number;
  reactionSpeed: number;
  riskTolerance: number;
  preferredSectors: Sector[];
  tradeFrequency: number;
  cooldown: number;
}

export interface AiTrader {
  id: string;
  name: string;
  archetype: AiArchetype;
  cash: number;
  holdings: Holding[];
  aggressiveness: number;
  fear: number;
  patience: number;
  reactionSpeed: number;
  riskTolerance: number;
  preferredSectors: Sector[];
  tradeFrequency: number;
  cooldown: number;
  lastActionTick: number;
  nextDecisionTick: number;
  watchStockIds: string[];
  orderSizeBias: number;
  behaviorSeed: number;
}

export type MarketEventType =
  | 'bullish-stock'
  | 'bearish-stock'
  | 'sector-boom'
  | 'sector-scare'
  | 'market-bull'
  | 'market-fear'
  | 'liquidity-rush'
  | 'rumor';

export type EventScope = 'stock' | 'sector' | 'market';

export interface MarketEvent {
  id: string;
  type: MarketEventType;
  scope: EventScope;
  title: string;
  description: string;
  affectedStockIds: string[];
  affectedSectors: Sector[];
  impact: number;
  duration: number;
  remainingDuration: number;
  createdAt: number;
  tick: number;
  isRumor: boolean;
}

export interface Trade {
  id: string;
  actorType: TradeActorType;
  actorId: string;
  actorName: string;
  stockId: string;
  side: TradeSide;
  quantity: number;
  price: number;
  timestamp: number;
  tick: number;
  notional: number;
  note?: string;
}

export interface PendingOrder {
  id: string;
  playerId: string;
  stockId: string;
  side: TradeSide;
  quantity: number;
  targetPrice: number;
  createdAt: number;
}

export interface ActivityItem {
  id: string;
  type: 'trade' | 'rotation' | 'alert';
  title: string;
  description: string;
  timestamp: number;
  tick: number;
  tone: 'positive' | 'negative' | 'neutral';
}

export interface CompetitorBlueprint {
  id: string;
  name: string;
  style: string;
  focusSectors: Sector[];
  startingNetWorth: number;
  volatility: number;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  kind: 'current-user' | 'friend-preview';
  netWorth: number;
  returnRate: number;
  style: string;
  focusSectors: Sector[];
  volatility: number;
  lastDelta: number;
}

export interface MarketWorldState {
  lastTickAt: number;
  marketClockMinutes: number;
  simulationElapsedMinutes: number;
  tickTimestamps: number[];
  dayCount: number;
  regime: MarketRegime;
  liquidityIndex: number;
  volatilityIndex: number;
  turnoverIndex: number;
  dominantSector: Sector;
  coolingSector: Sector;
  aiFocusSector: Sector;
}

export interface SimulationState {
  isRunning: boolean;
  speed: SpeedSetting;
  tick: number;
  selectedStockId: string;
  currentPlayerId: string;
  marketMood: number;
  sectorMood: Record<Sector, number>;
  stocks: Stock[];
  player: Player;
  pendingOrders: PendingOrder[];
  aiTraders: AiTrader[];
  trades: Trade[];
  events: MarketEvent[];
  aiActivity: ActivityItem[];
  leaderboard: LeaderboardEntry[];
  world: MarketWorldState;
  startedAt: number;
}

export interface UiState {
  searchQuery: string;
  sectorFilter: Sector | 'ALL';
  stockSort: StockSortMode;
  leaderboardSort: LeaderboardSortMode;
  chartTimeframe: ChartTimeframe;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  tone: 'success' | 'error' | 'info';
}

export interface PersistenceMeta {
  appId: string;
  checksum: number;
  engine: 'local-engine' | 'worker-engine';
  leaderboardMode: 'preview';
}

export interface PersistedSimulationSnapshot {
  version: number;
  savedAt: number;
  simulation: SimulationState;
  ui: UiState;
  meta: PersistenceMeta;
}

export interface RuntimeState {
  persistenceStatus: 'idle' | 'saved' | 'recovered' | 'error';
  lastSavedAt: number | null;
  hydratedFrom: 'primary' | 'backup' | 'fresh';
  multiplayerMode: 'local-preview' | 'api-ready';
  leaderboardMode: 'preview' | 'remote';
  workerStatus: 'booting' | 'ready' | 'error';
  workerError: string | null;
  lastWorkerMessageAt: number | null;
  lastSnapshotAt: number | null;
}

export interface StockSummary {
  id: string;
  ticker: string;
  name: string;
  sector: Sector;
  description: string;
  basePrice: number;
  currentPrice: number;
  previousPrice: number;
  volatility: number;
  momentum: number;
  sentiment: number;
  liquidity: number;
  traits: StockTrait[];
  lastVolume: number;
  miniHistory: number[];
}

export interface SelectedStockSnapshot extends StockSummary {
  priceHistory: number[];
  volumeHistory: number[];
  tradeCountHistory: number[];
  simulationElapsedMinutes: number;
  tickTimestamps: number[];
}

export interface AggregatedChartPoint {
  bucketStartTime: number;
  label: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
}

export interface VolatilityLeaderSnapshot {
  stockId: string;
  ticker: string;
  name: string;
  sector: Sector;
  currentPrice: number;
  previousPrice: number;
  range: number;
}

export interface PortfolioSummary {
  totalAssets: number;
  unrealizedPnL: number;
  returnRate: number;
  investedCapital: number;
}

export interface SimulationUiSnapshot {
  isRunning: boolean;
  speed: SpeedSetting;
  tick: number;
  selectedStockId: string;
  currentPlayerId: string;
  marketMood: number;
  sectorMood: Record<Sector, number>;
  stocks: StockSummary[];
  selectedStock: SelectedStockSnapshot | null;
  selectedStockEvents: MarketEvent[];
  player: Player;
  pendingOrders: PendingOrder[];
  portfolioSummary: PortfolioSummary;
  trades: Trade[];
  events: MarketEvent[];
  aiActivity: ActivityItem[];
  leaderboard: LeaderboardEntry[];
  world: MarketWorldState;
  hotStocks: StockSummary[];
  volatilityLeaders: VolatilityLeaderSnapshot[];
  startedAt: number;
}
