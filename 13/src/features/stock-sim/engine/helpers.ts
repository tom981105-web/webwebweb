import {
  AI_DECISION_INTERVAL_MAX,
  AI_DECISION_INTERVAL_MIN,
  DEFAULT_SELECTED_STOCK_ID,
  EVENT_MAX_DURATION,
  EVENT_MIN_DURATION,
  INITIAL_PLAYER_CASH,
  MAX_PRICE_HISTORY,
  STARTING_MARKET_MOOD,
  VIRTUAL_MINUTES_PER_TICK,
} from '@/features/stock-sim/constants/config';
import { aiBlueprints, competitorBlueprints } from '@/features/stock-sim/data/aiTraders';
import { stockBlueprints } from '@/features/stock-sim/data/stocks';
import type {
  ActivityItem,
  AiArchetype,
  AiTrader,
  CompetitorBlueprint,
  LeaderboardEntry,
  MarketEvent,
  MarketRegime,
  MarketWorldState,
  PendingOrder,
  Sector,
  SimulationState,
  Stock,
  Trade,
} from '@/features/stock-sim/types';
import { sectors } from '@/features/stock-sim/types';
import { getSeoulClockMinutes } from '@/features/stock-sim/utils/formatters';

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

export function chance(probability: number) {
  return Math.random() < probability;
}

export function pickRandom<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)];
}

export function sampleUnique<T>(items: T[], count: number) {
  const pool = [...items];
  const result: T[] = [];

  while (pool.length > 0 && result.length < count) {
    const index = randomInt(0, pool.length - 1);
    const [picked] = pool.splice(index, 1);

    if (picked !== undefined) {
      result.push(picked);
    }
  }

  return result;
}

export function uid(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function roundPrice(value: number) {
  return Math.max(5, Math.round(value * 100) / 100);
}

export function trimHistory<T>(history: T[]) {
  return history.slice(-MAX_PRICE_HISTORY);
}

function generateStartingHistory(basePrice: number, volatility: number) {
  const history: number[] = [];
  let cursor = basePrice * randomBetween(0.96, 1.04);

  for (let index = 0; index < Math.min(MAX_PRICE_HISTORY, 1_440); index += 1) {
    const delta = randomBetween(-0.013, 0.013) * (0.5 + volatility * 0.7);
    cursor = roundPrice(cursor * (1 + delta));
    history.push(cursor);
  }

  return trimHistory(history);
}

export function createInitialStocks() {
  return stockBlueprints.map<Stock>((blueprint) => {
    const priceHistory = generateStartingHistory(blueprint.basePrice, blueprint.volatility);
    const currentPrice = priceHistory.at(-1) ?? blueprint.basePrice;
    const previousPrice = priceHistory.at(-2) ?? currentPrice;
    const volumeHistory = trimHistory(
      priceHistory.map(() => Math.round(randomBetween(4_500, 18_000))),
    );
    const tradeCountHistory = trimHistory(
      priceHistory.map(() => Math.round(randomBetween(0, 7))),
    );

    return {
      ...blueprint,
      currentPrice,
      previousPrice,
      priceHistory,
      volumeHistory,
      tradeCountHistory,
      lastVolume: randomBetween(18_000, 82_000),
    };
  });
}

function getAiWatchlistSize(archetype: AiArchetype) {
  switch (archetype) {
    case 'scalper':
      return 6;
    case 'theme-chaser':
      return 7;
    case 'whale':
      return 4;
    case 'defensive':
      return 4;
    default:
      return 5;
  }
}

function getAiDecisionTempoOffset(archetype: AiArchetype) {
  switch (archetype) {
    case 'scalper':
      return -4;
    case 'aggressive':
      return -2;
    case 'theme-chaser':
      return -1;
    case 'crowd-follower':
      return 0;
    case 'contrarian':
      return 2;
    case 'fearful':
      return 4;
    case 'defensive':
      return 6;
    case 'whale':
      return 10;
    default:
      return 0;
  }
}

export function createAiWatchStockIds(
  preferredSectors: Sector[],
  stocks: Stock[],
  archetype: AiArchetype,
) {
  const watchlistSize = getAiWatchlistSize(archetype);
  const preferredStocks = stocks.filter((stock) => preferredSectors.includes(stock.sector));
  const highConviction = preferredStocks.filter(
    (stock) =>
      stock.traits.includes('ai-favorite') ||
      stock.traits.includes('news-sensitive') ||
      stock.traits.includes('volume-spike'),
  );
  const result: string[] = [];

  for (const stock of sampleUnique(highConviction, Math.min(highConviction.length, 2))) {
    result.push(stock.id);
  }

  for (const stock of sampleUnique(preferredStocks, watchlistSize)) {
    if (!result.includes(stock.id)) {
      result.push(stock.id);
    }
  }

  for (const stock of sampleUnique(stocks, watchlistSize + 2)) {
    if (!result.includes(stock.id)) {
      result.push(stock.id);
    }

    if (result.length >= watchlistSize) {
      break;
    }
  }

  return result;
}

export function scheduleNextAiDecisionTick(
  aiTrader: Pick<
    AiTrader,
    | 'aggressiveness'
    | 'reactionSpeed'
    | 'tradeFrequency'
    | 'cooldown'
    | 'patience'
    | 'archetype'
    | 'behaviorSeed'
  >,
  currentTick: number,
  justTraded: boolean,
) {
  const baseInterval =
    4 +
    (1 - aiTrader.tradeFrequency) * 12 +
    (1 - aiTrader.reactionSpeed) * 8 +
    aiTrader.patience * 6 +
    aiTrader.cooldown * 1.8 +
    getAiDecisionTempoOffset(aiTrader.archetype);
  const jitter = randomInt(-2, 7) + Math.round(aiTrader.behaviorSeed * 2);
  const restPenalty = justTraded ? randomInt(1, 4) : randomInt(2, 7);
  const rawInterval = Math.round(baseInterval + jitter + restPenalty);

  return currentTick + clamp(rawInterval, AI_DECISION_INTERVAL_MIN, AI_DECISION_INTERVAL_MAX);
}

export function createInitialAiTraders(stocks: Stock[]): AiTrader[] {
  return aiBlueprints.map((blueprint) => {
    const behaviorSeed = randomBetween(-1, 1);
    const baseTrader: AiTrader = {
      id: blueprint.id,
      name: blueprint.name,
      archetype: blueprint.archetype,
      cash: blueprint.startingCash,
      holdings: [],
      aggressiveness: blueprint.aggressiveness,
      fear: blueprint.fear,
      patience: blueprint.patience,
      reactionSpeed: blueprint.reactionSpeed,
      riskTolerance: blueprint.riskTolerance,
      preferredSectors: blueprint.preferredSectors,
      tradeFrequency: blueprint.tradeFrequency,
      cooldown: blueprint.cooldown,
      lastActionTick: -randomInt(2, 10),
      nextDecisionTick: 0,
      watchStockIds: createAiWatchStockIds(
        blueprint.preferredSectors,
        stocks,
        blueprint.archetype,
      ),
      orderSizeBias: randomBetween(0.72, 1.38),
      behaviorSeed,
    };

    return {
      ...baseTrader,
      nextDecisionTick: scheduleNextAiDecisionTick(baseTrader, 0, false),
    };
  });
}

function createLeaderboardEntry(blueprint: CompetitorBlueprint): LeaderboardEntry {
  return {
    id: blueprint.id,
    name: blueprint.name,
    kind: 'friend-preview',
    netWorth: blueprint.startingNetWorth,
    returnRate: 0,
    style: blueprint.style,
    focusSectors: blueprint.focusSectors,
    volatility: blueprint.volatility,
    lastDelta: 0,
  };
}

export function createSectorMoodMap() {
  return Object.fromEntries(
    sectors.map((sector) => [sector, randomBetween(-0.08, 0.18)]),
  ) as Record<Sector, number>;
}

export function pickDominantSector(sectorMood: Record<Sector, number>) {
  return (Object.entries(sectorMood) as [Sector, number][])
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'AI';
}

export function pickCoolingSector(sectorMood: Record<Sector, number>) {
  return (Object.entries(sectorMood) as [Sector, number][])
    .sort((left, right) => left[1] - right[1])[0]?.[0] ?? '바이오';
}

function resolveRegimeFromMood(marketMood: number): MarketRegime {
  if (marketMood >= 0.48) {
    return 'markup';
  }

  if (marketMood >= 0.16) {
    return 'rotation';
  }

  if (marketMood <= -0.52) {
    return 'panic';
  }

  if (marketMood <= -0.18) {
    return 'distribution';
  }

  return 'accumulation';
}

function createSeedTickTimestamps(historyLength: number, now: number) {
  if (historyLength <= 0) {
    return [];
  }

  if (historyLength === 1) {
    return [now];
  }

  const spanMs = 24 * 60 * 60 * 1_000;
  const stepMs = spanMs / Math.max(1, historyLength - 1);

  return trimHistory(
    Array.from({ length: historyLength }, (_, index) =>
      Math.round(now - spanMs + stepMs * index),
    ),
  );
}

export function createInitialWorldState(
  sectorMood: Record<Sector, number>,
  marketMood: number,
  now = Date.now(),
  historyLength = Math.min(MAX_PRICE_HISTORY, 1_440),
): MarketWorldState {
  const marketClockMinutes = getSeoulClockMinutes(now);
  const tickTimestamps = createSeedTickTimestamps(historyLength, now);
  const simulationElapsedMinutes = Math.max(
    1,
    Math.round(
      ((tickTimestamps.at(-1) ?? now) - (tickTimestamps[0] ?? now)) / 60_000,
    ),
  );
  return {
    lastTickAt: now,
    marketClockMinutes,
    simulationElapsedMinutes,
    tickTimestamps,
    dayCount: Math.max(1, Math.floor(simulationElapsedMinutes / 1_440) + 1),
    regime: resolveRegimeFromMood(marketMood),
    liquidityIndex: clamp(0.18 + marketMood * 0.24, -1, 1),
    volatilityIndex: clamp(0.22 + Math.abs(marketMood) * 0.28, 0, 1),
    turnoverIndex: clamp(0.2 + Math.abs(marketMood) * 0.22, 0, 1),
    dominantSector: pickDominantSector(sectorMood),
    coolingSector: pickCoolingSector(sectorMood),
    aiFocusSector: pickDominantSector(sectorMood),
  };
}

export function normalizeWorldState(
  world: Partial<MarketWorldState> | undefined,
  sectorMood: Record<Sector, number>,
  marketMood: number,
  fallbackTime: number,
  historyLength = Math.min(MAX_PRICE_HISTORY, 1_440),
): MarketWorldState {
  const seeded = createInitialWorldState(sectorMood, marketMood, fallbackTime, historyLength);
  const sourceTimestamps = Array.isArray(world?.tickTimestamps)
    ? trimHistory(world.tickTimestamps)
    : [];
  const normalizedTickTimestamps =
    sourceTimestamps.length >= historyLength
      ? sourceTimestamps.slice(-historyLength)
      : [
          ...createSeedTickTimestamps(historyLength - sourceTimestamps.length, fallbackTime),
          ...sourceTimestamps,
        ].slice(-historyLength);
  const derivedElapsedMinutes = Math.max(
    1,
    Math.round(
      ((normalizedTickTimestamps.at(-1) ?? fallbackTime) -
        (normalizedTickTimestamps[0] ?? fallbackTime)) /
        60_000,
    ),
  );

  return {
    ...seeded,
    ...world,
    lastTickAt: world?.lastTickAt ?? fallbackTime,
    marketClockMinutes: world?.marketClockMinutes ?? seeded.marketClockMinutes,
    simulationElapsedMinutes:
      world?.simulationElapsedMinutes ??
      derivedElapsedMinutes,
    tickTimestamps: normalizedTickTimestamps,
    dayCount:
      world?.dayCount ??
      Math.max(1, Math.floor(derivedElapsedMinutes / 1_440) + 1),
    regime: world?.regime ?? seeded.regime,
    liquidityIndex: clamp(world?.liquidityIndex ?? seeded.liquidityIndex, -1, 1),
    volatilityIndex: clamp(world?.volatilityIndex ?? seeded.volatilityIndex, 0, 1),
    turnoverIndex: clamp(world?.turnoverIndex ?? seeded.turnoverIndex, 0, 1),
    dominantSector: world?.dominantSector ?? seeded.dominantSector,
    coolingSector: world?.coolingSector ?? seeded.coolingSector,
    aiFocusSector: world?.aiFocusSector ?? seeded.aiFocusSector,
  };
}

function hasCorruptedText(value: string | undefined) {
  if (!value) {
    return false;
  }

  return /[\uF900-\uFAFF�]/.test(value);
}

function sanitizeTrade(trade: Trade, aiNameMap: Map<string, string>): Trade {
  return {
    ...trade,
    actorName:
      trade.actorType === 'ai'
        ? aiNameMap.get(trade.actorId) ?? trade.actorName
        : hasCorruptedText(trade.actorName)
          ? '플레이어'
          : trade.actorName,
    note: hasCorruptedText(trade.note) ? undefined : trade.note,
  };
}

function sanitizeEvent(event: MarketEvent) {
  return !hasCorruptedText(event.title) && !hasCorruptedText(event.description);
}

function sanitizeActivity(item: ActivityItem) {
  return !hasCorruptedText(item.title) && !hasCorruptedText(item.description);
}

export function normalizeSimulationState(simulation: SimulationState): SimulationState {
  const sectorMood = simulation.sectorMood ?? createSectorMoodMap();
  const marketMood = simulation.marketMood ?? STARTING_MARKET_MOOD;
  const stockBlueprintMap = new Map(stockBlueprints.map((blueprint) => [blueprint.id, blueprint]));
  const stocks = simulation.stocks.map((stock) => {
    const blueprint = stockBlueprintMap.get(stock.id);
    const normalizedPriceHistory = trimHistory(stock.priceHistory);
    const alignNumericHistory = (history: number[] | undefined, fallbackMin: number, fallbackMax: number) => {
      const source = Array.isArray(history) ? trimHistory(history) : [];
      const deficit = Math.max(0, normalizedPriceHistory.length - source.length);
      const padding =
        deficit > 0
          ? Array.from({ length: deficit }, () => Math.round(randomBetween(fallbackMin, fallbackMax)))
          : [];
      return [...padding, ...source].slice(-normalizedPriceHistory.length);
    };
    const baseVolumeHistory = alignNumericHistory(stock.volumeHistory, 3_000, 12_000);
    const baseTradeCountHistory = alignNumericHistory(stock.tradeCountHistory, 0, 4);

    if (!blueprint) {
      return {
        ...stock,
        priceHistory: normalizedPriceHistory,
        volumeHistory: trimHistory(baseVolumeHistory),
        tradeCountHistory: trimHistory(baseTradeCountHistory),
      };
    }

    return {
      ...stock,
      ...blueprint,
      priceHistory: normalizedPriceHistory,
      volumeHistory: trimHistory(baseVolumeHistory),
      tradeCountHistory: trimHistory(baseTradeCountHistory),
    };
  });
  const world = normalizeWorldState(
    (simulation as SimulationState & { world?: Partial<MarketWorldState> }).world,
    sectorMood,
    marketMood,
    Date.now(),
    stocks[0]?.priceHistory.length ?? Math.min(MAX_PRICE_HISTORY, 1_440),
  );
  const stockIdSet = new Set(stocks.map((stock) => stock.id));
  const aiBlueprintMap = new Map(aiBlueprints.map((blueprint) => [blueprint.id, blueprint]));
  const aiNameMap = new Map(aiBlueprints.map((blueprint) => [blueprint.id, blueprint.name]));
  const aiTraders = simulation.aiTraders.map((aiTrader) => {
    const blueprint = aiBlueprintMap.get(aiTrader.id);
    const behaviorSeed =
      Number.isFinite(aiTrader.behaviorSeed) ? aiTrader.behaviorSeed : randomBetween(-1, 1);
    const watchStockIds = Array.isArray(aiTrader.watchStockIds)
      ? aiTrader.watchStockIds.filter((stockId) => stockIdSet.has(stockId))
      : [];
    const normalizedTrader: AiTrader = {
      ...aiTrader,
      ...(blueprint
        ? {
            name: blueprint.name,
            archetype: blueprint.archetype,
            aggressiveness: blueprint.aggressiveness,
            fear: blueprint.fear,
            patience: blueprint.patience,
            reactionSpeed: blueprint.reactionSpeed,
            riskTolerance: blueprint.riskTolerance,
            preferredSectors: blueprint.preferredSectors,
            tradeFrequency: blueprint.tradeFrequency,
            cooldown: blueprint.cooldown,
          }
        : {}),
      behaviorSeed,
      orderSizeBias:
        Number.isFinite(aiTrader.orderSizeBias) && aiTrader.orderSizeBias > 0
          ? aiTrader.orderSizeBias
          : randomBetween(0.72, 1.38),
      watchStockIds:
        watchStockIds.length > 0
          ? watchStockIds
          : createAiWatchStockIds(
              blueprint?.preferredSectors ?? aiTrader.preferredSectors,
              stocks,
              blueprint?.archetype ?? aiTrader.archetype,
            ),
      nextDecisionTick:
        Number.isFinite(aiTrader.nextDecisionTick)
          ? Math.max(0, Math.floor(aiTrader.nextDecisionTick))
          : 0,
    };

    return normalizedTrader.nextDecisionTick > 0
      ? normalizedTrader
      : {
          ...normalizedTrader,
          nextDecisionTick: scheduleNextAiDecisionTick(normalizedTrader, simulation.tick, false),
        };
  });
  const competitorMap = new Map(competitorBlueprints.map((entry) => [entry.id, entry]));

  return {
    ...simulation,
    selectedStockId: simulation.selectedStockId || DEFAULT_SELECTED_STOCK_ID,
    sectorMood,
    marketMood,
    stocks,
    player: {
      ...simulation.player,
      name: hasCorruptedText(simulation.player.name) ? '플레이어' : simulation.player.name,
    },
    pendingOrders: Array.isArray(simulation.pendingOrders)
      ? simulation.pendingOrders
          .filter((order): order is PendingOrder =>
            Boolean(
              order &&
                typeof order === 'object' &&
                typeof order.id === 'string' &&
                typeof order.playerId === 'string' &&
                typeof order.stockId === 'string' &&
                (order.side === 'buy' || order.side === 'sell') &&
                typeof order.quantity === 'number' &&
                typeof order.targetPrice === 'number' &&
                typeof order.createdAt === 'number',
            ),
          )
          .filter((order) => stockIdSet.has(order.stockId))
      : [],
    aiTraders,
    trades: simulation.trades.map((trade) => sanitizeTrade(trade, aiNameMap)),
    events: simulation.events.filter(sanitizeEvent),
    aiActivity: simulation.aiActivity.filter(sanitizeActivity),
    leaderboard: simulation.leaderboard.map((entry) => {
      if (entry.id === 'local-player') {
        return {
          ...entry,
          name: '플레이어',
          style: '로컬 트레이더',
          focusSectors: [],
        };
      }

      const blueprint = competitorMap.get(entry.id);

      if (!blueprint) {
        return entry;
      }

      return {
        ...entry,
        name: blueprint.name,
        style: blueprint.style,
        focusSectors: blueprint.focusSectors,
        volatility: blueprint.volatility,
      };
    }),
    world,
  };
}

export function createInitialSimulationState(): SimulationState {
  const stocks = createInitialStocks();
  const sectorMood = createSectorMoodMap();
  const now = Date.now();
  const world = createInitialWorldState(
    sectorMood,
    STARTING_MARKET_MOOD,
    now,
    stocks[0]?.priceHistory.length ?? Math.min(MAX_PRICE_HISTORY, 1_440),
  );

  return {
    isRunning: true,
    speed: 1,
    tick: 0,
    selectedStockId: DEFAULT_SELECTED_STOCK_ID,
    currentPlayerId: 'local-player',
    marketMood: STARTING_MARKET_MOOD,
    sectorMood,
    stocks,
    player: {
      id: 'local-player',
      name: '플레이어',
      cash: INITIAL_PLAYER_CASH,
      holdings: [],
      realizedPnL: 0,
      tradeHistory: [],
    },
    pendingOrders: [],
    aiTraders: createInitialAiTraders(stocks),
    trades: [],
    events: [],
    aiActivity: [],
    leaderboard: [
      {
        id: 'local-player',
        name: '플레이어',
        kind: 'current-user',
        netWorth: INITIAL_PLAYER_CASH,
        returnRate: 0,
        style: '로컬 트레이더',
        focusSectors: [],
        volatility: 0,
        lastDelta: 0,
      },
      ...competitorBlueprints.map(createLeaderboardEntry),
    ],
    world,
    startedAt: world.tickTimestamps[0] ?? now - VIRTUAL_MINUTES_PER_TICK * 60_000,
  };
}

export function getRandomEventDuration() {
  return randomInt(EVENT_MIN_DURATION, EVENT_MAX_DURATION);
}
