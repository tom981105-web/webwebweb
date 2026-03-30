import {
  AI_DECISION_INTERVAL_MAX,
  AI_DECISION_INTERVAL_MIN,
  DAILY_PRICE_LIMIT_RATIO,
  DEFAULT_SELECTED_STOCK_ID,
  EVENT_MAX_DURATION,
  EVENT_MIN_DURATION,
  INITIAL_PLAYER_CASH,
  MARKET_DAY_MINUTES,
  MARKET_DAY_START_MINUTES,
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
  StockBlueprint,
  StockStatus,
  Trade,
} from '@/features/stock-sim/types';
import { sectors } from '@/features/stock-sim/types';

export { sectors };

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

export function pickRandom<T>(items: readonly T[]) {
  return items[randomInt(0, items.length - 1)];
}

export function sampleUnique<T>(items: readonly T[], count: number) {
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
  return Math.max(1, Math.round(value * 100) / 100);
}

export function trimHistory<T>(history: T[]) {
  return history.slice(-MAX_PRICE_HISTORY);
}

function normalizeDailyLimits(referencePrice: number) {
  const upper = roundPrice(referencePrice * (1 + DAILY_PRICE_LIMIT_RATIO));
  const lower = roundPrice(referencePrice * (1 - DAILY_PRICE_LIMIT_RATIO));

  return {
    upper: Math.max(referencePrice, upper),
    lower: Math.max(1, Math.min(referencePrice, lower)),
  };
}

function generateStartingHistory(basePrice: number, volatility: number) {
  const history: number[] = [];
  let cursor = basePrice * randomBetween(0.96, 1.04);

  for (let index = 0; index < Math.min(MAX_PRICE_HISTORY, 720); index += 1) {
    const delta = randomBetween(-0.012, 0.012) * (0.45 + volatility * 0.72);
    cursor = roundPrice(cursor * (1 + delta));
    history.push(cursor);
  }

  return trimHistory(history);
}

function pickDefaultStatus(archetype: StockBlueprint['archetype']): StockStatus {
  if (archetype === 'distressed') {
    return 'WARNING';
  }

  return 'NORMAL';
}

function createStockFromBlueprint(blueprint: StockBlueprint, listedDay = 1): Stock {
  const priceHistory = generateStartingHistory(blueprint.basePrice, blueprint.volatility);
  const currentPrice = priceHistory.at(-1) ?? blueprint.basePrice;
  const previousPrice = priceHistory.at(-2) ?? currentPrice;
  const referencePrice = previousPrice || currentPrice || blueprint.basePrice;
  const dailyLimits = normalizeDailyLimits(referencePrice);
  const volumeHistory = trimHistory(
    priceHistory.map(() => Math.round(randomBetween(4_500, 18_000))),
  );
  const tradeCountHistory = trimHistory(
    priceHistory.map(() => Math.round(randomBetween(0, 8))),
  );
  const averageDailyVolume =
    volumeHistory.reduce((total, value) => total + value, 0) / Math.max(1, volumeHistory.length);

  return {
    ...blueprint,
    currentPrice,
    previousPrice,
    priceHistory,
    volumeHistory,
    tradeCountHistory,
    lastVolume: volumeHistory.at(-1) ?? 0,
    referencePrice,
    lastClosePrice: referencePrice,
    dayOpenPrice: currentPrice,
    dayHighPrice: Math.max(currentPrice, referencePrice),
    dayLowPrice: Math.min(currentPrice, referencePrice),
    dailyUpperLimit: dailyLimits.upper,
    dailyLowerLimit: dailyLimits.lower,
    dailyLimitState: 'normal',
    sessionVolume: 0,
    averageDailyVolume,
    status: pickDefaultStatus(blueprint.archetype),
    haltRemainingTicks: 0,
    haltReason: null,
    warningScore: blueprint.archetype === 'distressed' ? 0.36 : 0,
    distressScore: blueprint.archetype === 'distressed' ? 0.44 : 0,
    listedDay,
    ipoDaysRemaining: 0,
    themeTag: blueprint.archetype === 'theme' ? '초기 테마 프리미엄' : null,
    themeIntensity: blueprint.archetype === 'theme' ? 0.14 : 0,
    themeUntilTick: 0,
    bubblePhase: 'idle',
    bubbleTicksRemaining: 0,
    bubbleAnchorPrice: currentPrice,
    eventRisk: blueprint.collapseRisk,
  };
}

export function createInitialStocks() {
  return stockBlueprints.map((blueprint) => createStockFromBlueprint(blueprint, 1));
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
    .sort((left, right) => left[1] - right[1])[0]?.[0] ?? 'Bio';
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

  const spanMs = historyLength * VIRTUAL_MINUTES_PER_TICK * 60_000;
  const stepMs = spanMs / Math.max(1, historyLength - 1);

  return trimHistory(
    Array.from({ length: historyLength }, (_, index) =>
      Math.round(now - spanMs + stepMs * index),
    ),
  );
}

function getDayPhase(dayTick: number): MarketWorldState['dayPhase'] {
  if (dayTick < 180) {
    return 'opening';
  }
  if (dayTick < 1_080) {
    return 'session';
  }
  if (dayTick < 1_260) {
    return 'closing';
  }
  return 'overnight';
}

export function createInitialWorldState(
  sectorMood: Record<Sector, number>,
  marketMood: number,
  now = Date.now(),
  historyLength = Math.min(MAX_PRICE_HISTORY, 720),
): MarketWorldState {
  const tickTimestamps = createSeedTickTimestamps(historyLength, now);
  const simulationElapsedMinutes = Math.max(1, historyLength * VIRTUAL_MINUTES_PER_TICK);
  const totalSimulationMinutes = MARKET_DAY_START_MINUTES + simulationElapsedMinutes;
  const dayTick = ((totalSimulationMinutes % MARKET_DAY_MINUTES) + MARKET_DAY_MINUTES) % MARKET_DAY_MINUTES;

  return {
    lastTickAt: now,
    marketClockMinutes: dayTick,
    simulationElapsedMinutes,
    totalSimulationMinutes,
    tickTimestamps,
    dayCount: Math.max(1, Math.floor(totalSimulationMinutes / MARKET_DAY_MINUTES) + 1),
    dayTick,
    dayPhase: getDayPhase(dayTick),
    regime: resolveRegimeFromMood(marketMood),
    liquidityIndex: clamp(0.18 + marketMood * 0.24, -1, 1),
    volatilityIndex: clamp(0.22 + Math.abs(marketMood) * 0.28, 0, 1),
    turnoverIndex: clamp(0.2 + Math.abs(marketMood) * 0.22, 0, 1),
    dominantSector: pickDominantSector(sectorMood),
    coolingSector: pickCoolingSector(sectorMood),
    aiFocusSector: pickDominantSector(sectorMood),
    marketSentiment: marketMood,
    sectorFlows: Object.fromEntries(sectors.map((sector) => [sector, 0])) as Record<Sector, number>,
    activeTheme: null,
    lastIpoDay: 0,
    haltedCount: 0,
    warningCount: 0,
    delistedCount: 0,
  };
}

export function normalizeWorldState(
  world: Partial<MarketWorldState> | undefined,
  sectorMood: Record<Sector, number>,
  marketMood: number,
  fallbackTime: number,
  historyLength = Math.min(MAX_PRICE_HISTORY, 720),
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
  const totalSimulationMinutes =
    Number.isFinite(Number(world?.totalSimulationMinutes))
      ? Number(world?.totalSimulationMinutes)
      : seeded.totalSimulationMinutes;
  const dayTick =
    Number.isFinite(Number(world?.dayTick))
      ? Number(world?.dayTick)
      : ((totalSimulationMinutes % MARKET_DAY_MINUTES) + MARKET_DAY_MINUTES) % MARKET_DAY_MINUTES;

  return {
    ...seeded,
    ...world,
    lastTickAt: world?.lastTickAt ?? fallbackTime,
    tickTimestamps: normalizedTickTimestamps,
    simulationElapsedMinutes:
      Number.isFinite(Number(world?.simulationElapsedMinutes))
        ? Number(world?.simulationElapsedMinutes)
        : seeded.simulationElapsedMinutes,
    totalSimulationMinutes,
    marketClockMinutes:
      Number.isFinite(Number(world?.marketClockMinutes))
        ? Number(world?.marketClockMinutes)
        : dayTick,
    dayCount:
      Number.isFinite(Number(world?.dayCount))
        ? Math.max(1, Number(world?.dayCount))
        : Math.max(1, Math.floor(totalSimulationMinutes / MARKET_DAY_MINUTES) + 1),
    dayTick,
    dayPhase: world?.dayPhase ?? getDayPhase(dayTick),
    regime: world?.regime ?? seeded.regime,
    liquidityIndex: clamp(world?.liquidityIndex ?? seeded.liquidityIndex, -1, 1),
    volatilityIndex: clamp(world?.volatilityIndex ?? seeded.volatilityIndex, 0, 1),
    turnoverIndex: clamp(world?.turnoverIndex ?? seeded.turnoverIndex, 0, 1),
    dominantSector: world?.dominantSector ?? seeded.dominantSector,
    coolingSector: world?.coolingSector ?? seeded.coolingSector,
    aiFocusSector: world?.aiFocusSector ?? seeded.aiFocusSector,
    marketSentiment: clamp(world?.marketSentiment ?? marketMood, -1, 1),
    sectorFlows: sectors.reduce((accumulator, sector) => {
      accumulator[sector] = clamp(Number(world?.sectorFlows?.[sector] ?? 0), -1, 1);
      return accumulator;
    }, {} as Record<Sector, number>),
    activeTheme: typeof world?.activeTheme === 'string' ? world.activeTheme : null,
    lastIpoDay: Math.max(0, Math.round(Number(world?.lastIpoDay ?? seeded.lastIpoDay))),
    haltedCount: Math.max(0, Math.round(Number(world?.haltedCount ?? 0))),
    warningCount: Math.max(0, Math.round(Number(world?.warningCount ?? 0))),
    delistedCount: Math.max(0, Math.round(Number(world?.delistedCount ?? 0))),
  };
}

function normalizeStockFromBlueprint(stock: Stock, tick: number, currentDay: number): Stock {
  const blueprint = stockBlueprints.find((candidate) => candidate.id === stock.id);
  const base = blueprint ?? {
    id: stock.id,
    ticker: stock.ticker,
    name: stock.name,
    sector: stock.sector,
    description: stock.description,
    archetype: stock.archetype,
    basePrice: stock.basePrice,
    volatility: stock.volatility,
    momentum: stock.momentum,
    sentiment: stock.sentiment,
    liquidity: stock.liquidity,
    traits: stock.traits,
    sharesOutstanding: stock.sharesOutstanding,
    aiAffinity: stock.aiAffinity,
    newsSensitivity: stock.newsSensitivity,
    collapseRisk: stock.collapseRisk,
  };

  const normalizedPriceHistory = trimHistory(
    Array.isArray(stock.priceHistory) && stock.priceHistory.length > 0
      ? stock.priceHistory.map((value) => roundPrice(Number(value || base.basePrice)))
      : [base.basePrice],
  );
  const currentPrice = roundPrice(Number(stock.currentPrice || normalizedPriceHistory.at(-1) || base.basePrice));
  const previousPrice = roundPrice(
    Number(stock.previousPrice || normalizedPriceHistory.at(-2) || currentPrice),
  );
  const referencePrice = roundPrice(
    Number(stock.referencePrice || stock.lastClosePrice || previousPrice || currentPrice || base.basePrice),
  );
  const dailyLimits = normalizeDailyLimits(referencePrice);
  const normalizedStatus =
    stock.status === 'WARNING' || stock.status === 'HALTED' || stock.status === 'DELISTED'
      ? stock.status
      : pickDefaultStatus(base.archetype);
  const volumeHistory = trimHistory(
    Array.isArray(stock.volumeHistory) && stock.volumeHistory.length > 0
      ? stock.volumeHistory.map((value) => Math.max(0, Math.round(Number(value || 0))))
      : [Math.round(randomBetween(4_500, 18_000))],
  );
  const tradeCountHistory = trimHistory(
    Array.isArray(stock.tradeCountHistory) && stock.tradeCountHistory.length > 0
      ? stock.tradeCountHistory.map((value) => Math.max(0, Math.round(Number(value || 0))))
      : [Math.round(randomBetween(0, 8))],
  );
  const averageDailyVolume =
    volumeHistory.reduce((total, value) => total + value, 0) / Math.max(1, volumeHistory.length);

  return {
    ...stock,
    ...base,
    currentPrice: normalizedStatus === 'DELISTED' ? 0 : currentPrice,
    previousPrice: normalizedStatus === 'DELISTED' ? 0 : previousPrice,
    priceHistory: normalizedStatus === 'DELISTED'
      ? trimHistory([...normalizedPriceHistory.slice(0, -1), 0])
      : normalizedPriceHistory,
    volumeHistory,
    tradeCountHistory,
    lastVolume: Math.max(0, Number(stock.lastVolume || volumeHistory.at(-1) || 0)),
    referencePrice,
    lastClosePrice: roundPrice(Number(stock.lastClosePrice || referencePrice)),
    dayOpenPrice: roundPrice(Number(stock.dayOpenPrice || currentPrice)),
    dayHighPrice: roundPrice(Number(stock.dayHighPrice || Math.max(currentPrice, referencePrice))),
    dayLowPrice: roundPrice(Number(stock.dayLowPrice || Math.min(currentPrice, referencePrice))),
    dailyUpperLimit: roundPrice(Number(stock.dailyUpperLimit || dailyLimits.upper)),
    dailyLowerLimit: roundPrice(Number(stock.dailyLowerLimit || dailyLimits.lower)),
    dailyLimitState:
      stock.dailyLimitState === 'upper-limit' || stock.dailyLimitState === 'lower-limit'
        ? stock.dailyLimitState
        : 'normal',
    sessionVolume: Math.max(0, Number(stock.sessionVolume || 0)),
    averageDailyVolume,
    status: normalizedStatus,
    haltRemainingTicks: Math.max(0, Math.round(Number(stock.haltRemainingTicks || 0))),
    haltReason: stock.haltReason ? String(stock.haltReason) : null,
    warningScore: clamp(Number(stock.warningScore || 0), 0, 3),
    distressScore: clamp(Number(stock.distressScore || 0), 0, 3),
    listedDay: Math.max(1, Math.round(Number(stock.listedDay || currentDay || 1))),
    ipoDaysRemaining: Math.max(0, Math.round(Number(stock.ipoDaysRemaining || 0))),
    themeTag: stock.themeTag ? String(stock.themeTag) : null,
    themeIntensity: clamp(Number(stock.themeIntensity || 0), 0, 2),
    themeUntilTick: Math.max(0, Math.round(Number(stock.themeUntilTick || tick || 0))),
    bubblePhase:
      stock.bubblePhase === 'build' ||
      stock.bubblePhase === 'mania' ||
      stock.bubblePhase === 'halted' ||
      stock.bubblePhase === 'crash'
        ? stock.bubblePhase
        : 'idle',
    bubbleTicksRemaining: Math.max(0, Math.round(Number(stock.bubbleTicksRemaining || 0))),
    bubbleAnchorPrice: roundPrice(Number(stock.bubbleAnchorPrice || currentPrice)),
    eventRisk: clamp(Number(stock.eventRisk || base.collapseRisk || 0), 0, 3),
  };
}

export function normalizeSimulationState(simulation: SimulationState): SimulationState {
  const sectorMood = sectors.reduce((accumulator, sector) => {
    const nextValue = Number(simulation.sectorMood?.[sector] ?? randomBetween(-0.08, 0.18));
    accumulator[sector] = clamp(nextValue, -1, 1);
    return accumulator;
  }, {} as Record<Sector, number>);
  const marketMood = Number.isFinite(Number(simulation.marketMood))
    ? clamp(Number(simulation.marketMood), -1, 1)
    : STARTING_MARKET_MOOD;
  const preliminaryWorld = normalizeWorldState(
    (simulation as SimulationState & { world?: Partial<MarketWorldState> }).world,
    sectorMood,
    marketMood,
    Date.now(),
    simulation.stocks?.[0]?.priceHistory?.length ?? Math.min(MAX_PRICE_HISTORY, 720),
  );
  const stocks = (Array.isArray(simulation.stocks) ? simulation.stocks : createInitialStocks()).map((stock) =>
    normalizeStockFromBlueprint(stock, simulation.tick || 0, preliminaryWorld.dayCount),
  );
  const stockIdSet = new Set(stocks.map((stock) => stock.id));
  const aiBlueprintMap = new Map(aiBlueprints.map((blueprint) => [blueprint.id, blueprint]));
  const aiTraders = (Array.isArray(simulation.aiTraders) ? simulation.aiTraders : createInitialAiTraders(stocks)).map((aiTrader) => {
    const blueprint = aiBlueprintMap.get(aiTrader.id);
    const behaviorSeed =
      Number.isFinite(aiTrader.behaviorSeed) ? aiTrader.behaviorSeed : randomBetween(-1, 1);
    const normalizedTrader: AiTrader = {
      ...aiTrader,
      ...(blueprint ?? {}),
      cash: Math.max(0, Number(aiTrader.cash || blueprint?.startingCash || 0)),
      holdings: Array.isArray(aiTrader.holdings) ? aiTrader.holdings : [],
      preferredSectors: Array.isArray(aiTrader.preferredSectors)
        ? aiTrader.preferredSectors.filter((sector): sector is Sector =>
            sectors.includes(sector as Sector),
          )
        : blueprint?.preferredSectors ?? ['AI'],
      watchStockIds: Array.isArray(aiTrader.watchStockIds)
        ? aiTrader.watchStockIds.filter((stockId) => stockIdSet.has(stockId))
        : [],
      orderSizeBias:
        Number.isFinite(aiTrader.orderSizeBias) && aiTrader.orderSizeBias > 0
          ? aiTrader.orderSizeBias
          : randomBetween(0.72, 1.38),
      behaviorSeed,
    };

    if (normalizedTrader.watchStockIds.length === 0) {
      normalizedTrader.watchStockIds = createAiWatchStockIds(
        normalizedTrader.preferredSectors,
        stocks,
        normalizedTrader.archetype,
      );
    }

    normalizedTrader.nextDecisionTick =
      Number.isFinite(aiTrader.nextDecisionTick) && aiTrader.nextDecisionTick > 0
        ? Math.round(aiTrader.nextDecisionTick)
        : scheduleNextAiDecisionTick(normalizedTrader, simulation.tick || 0, false);

    return normalizedTrader;
  });

  const world = normalizeWorldState(
    {
      ...preliminaryWorld,
      haltedCount: stocks.filter((stock) => stock.status === 'HALTED').length,
      warningCount: stocks.filter((stock) => stock.status === 'WARNING').length,
      delistedCount: stocks.filter((stock) => stock.status === 'DELISTED').length,
    },
    sectorMood,
    marketMood,
    Date.now(),
    stocks[0]?.priceHistory.length ?? Math.min(MAX_PRICE_HISTORY, 720),
  );

  return {
    ...simulation,
    isRunning: simulation.isRunning !== false,
    speed: (simulation.speed as SimulationState['speed']) || 1,
    tick: Math.max(0, Math.floor(Number(simulation.tick || 0))),
    selectedStockId: stockIdSet.has(simulation.selectedStockId)
      ? simulation.selectedStockId
      : DEFAULT_SELECTED_STOCK_ID,
    currentPlayerId: simulation.currentPlayerId || 'local-player',
    marketMood,
    sectorMood,
    stocks,
    player: {
      ...simulation.player,
      id: simulation.player?.id || 'local-player',
      name: String(simulation.player?.name || '플레이어'),
      cash: Math.max(0, Number(simulation.player?.cash || INITIAL_PLAYER_CASH)),
      holdings: Array.isArray(simulation.player?.holdings) ? simulation.player.holdings : [],
      realizedPnL: Number(simulation.player?.realizedPnL || 0),
      tradeHistory: Array.isArray(simulation.player?.tradeHistory) ? simulation.player.tradeHistory : [],
    },
    pendingOrders: Array.isArray(simulation.pendingOrders)
      ? simulation.pendingOrders.filter((order): order is PendingOrder =>
          Boolean(
            order &&
              typeof order === 'object' &&
              typeof order.id === 'string' &&
              stockIdSet.has(String(order.stockId || '')),
          ),
        )
      : [],
    aiTraders,
    trades: Array.isArray(simulation.trades) ? simulation.trades as Trade[] : [],
    events: Array.isArray(simulation.events) ? simulation.events as MarketEvent[] : [],
    aiActivity: Array.isArray(simulation.aiActivity) ? simulation.aiActivity as ActivityItem[] : [],
    leaderboard: Array.isArray(simulation.leaderboard)
      ? simulation.leaderboard
      : [
          {
            id: 'local-player',
            name: '플레이어',
            kind: 'current-user',
            netWorth: INITIAL_PLAYER_CASH,
            returnRate: 0,
            style: '실시간 참가자',
            focusSectors: [],
            volatility: 0,
            lastDelta: 0,
          },
          ...competitorBlueprints.map(createLeaderboardEntry),
        ],
    world,
    startedAt: Number(simulation.startedAt || world.tickTimestamps[0] || Date.now()),
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
    stocks[0]?.priceHistory.length ?? Math.min(MAX_PRICE_HISTORY, 720),
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
        style: '실시간 참가자',
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
