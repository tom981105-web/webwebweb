export const STORAGE_KEY = 'stock-sim-webapp::snapshot';
export const STORAGE_BACKUP_KEY = 'stock-sim-webapp::snapshot::backup';
export const STORAGE_STAGING_KEY = 'stock-sim-webapp::snapshot::staging';
export const STORAGE_VERSION = 1;
export const STORAGE_APP_ID = 'stock-sim-webapp';

export const INITIAL_PLAYER_CASH = 3_000_000 / 1_350;
export const BASE_TICK_INTERVAL_MS = 900;
export const ENGINE_LOOP_INTERVAL_MS = 200;
export const UI_REFRESH_INTERVAL_MS = 900;
export const WORKER_PERSISTENCE_INTERVAL_MS = 4000;
export const MAX_BATCH_TICKS_PER_FRAME = 4;
export const MAX_OFFLINE_CATCHUP_TICKS = 240;
export const VIRTUAL_MINUTES_PER_TICK = 1;
export const MARKET_DAY_MINUTES = 1_440;
export const MARKET_DAY_START_MINUTES = 9 * 60;
export const DAILY_PRICE_LIMIT_RATIO = 0.3;
export const MAX_PRICE_HISTORY = 1_560;
export const MAX_TRADE_LOG = 80;
export const MAX_EVENT_LOG = 28;
export const MAX_ACTIVITY_LOG = 24;
export const MAX_LEADERBOARD_ENTRIES = 3;
export const STARTING_MARKET_MOOD = 0.12;
export const DEFAULT_SELECTED_STOCK_ID = 'neochips';
export const MAX_TOAST_MESSAGES = 4;
export const PERSISTENCE_DEBOUNCE_MS = 1500;
export const AI_EVALUATION_RATIO = 0.3;
export const AI_EVALUATION_GROUPS = 3;
export const STOCK_UPDATE_RATIO = 0.45;
export const AI_DECISION_INTERVAL_MIN = 2;
export const AI_DECISION_INTERVAL_MAX = 32;
export const MARKET_SYSTEMIC_SHOCK_CHANCE = 0.08;
export const AMBIENT_TRADE_LOG_LIMIT_PER_TICK = 6;
export const SIGNIFICANT_PRICE_MOVE_THRESHOLD = 0.0014;
export const MICRO_PRICE_MOVE_THRESHOLD = 0.00075;

export const SPEED_OPTIONS = [1, 2, 4] as const;

export const EVENT_ROLL_CHANCE = 0.15;
export const MARKET_ROTATION_CHANCE = 0.16;
export const EVENT_MIN_DURATION = 8;
export const EVENT_MAX_DURATION = 20;
export const THEME_EVENT_MIN_DURATION = 90;
export const THEME_EVENT_MAX_DURATION = 300;
export const TRADING_HALT_MIN_TICKS = 8;
export const TRADING_HALT_MAX_TICKS = 26;
export const STOCK_WARNING_THRESHOLD = 0.9;
export const STOCK_DELIST_THRESHOLD = 1.9;
export const STOCK_BUBBLE_CHANCE = 0.01;
export const STOCK_IPO_CHANCE = 0.003;
export const STOCK_REBUILD_CHANCE = 0.0018;
export const MAX_LISTED_STOCKS = 24;

export const MARKET_MOOD_LABELS = [
  { min: 0.55, label: 'Overheated Rally' },
  { min: 0.2, label: 'Bullish Bid' },
  { min: -0.2, label: 'Balanced Range' },
  { min: -0.55, label: 'Risk-Off Drift' },
  { min: Number.NEGATIVE_INFINITY, label: 'Fear Wave' },
] as const;

export const MARKET_REGIME_LABELS = {
  accumulation: 'Accumulation',
  markup: 'Markup',
  rotation: 'Rotation',
  distribution: 'Distribution',
  panic: 'Panic',
  rebound: 'Rebound',
} as const;
