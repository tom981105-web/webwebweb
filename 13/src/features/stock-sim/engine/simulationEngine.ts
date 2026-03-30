import {
  AMBIENT_TRADE_LOG_LIMIT_PER_TICK,
  BASE_TICK_INTERVAL_MS,
  DAILY_PRICE_LIMIT_RATIO,
  EVENT_MAX_DURATION,
  EVENT_MIN_DURATION,
  INITIAL_PLAYER_CASH,
  MARKET_DAY_MINUTES,
  MARKET_SYSTEMIC_SHOCK_CHANCE,
  MAX_ACTIVITY_LOG,
  MAX_EVENT_LOG,
  MAX_LISTED_STOCKS,
  MAX_OFFLINE_CATCHUP_TICKS,
  MAX_TRADE_LOG,
  STOCK_BUBBLE_CHANCE,
  STOCK_DELIST_THRESHOLD,
  STOCK_IPO_CHANCE,
  STOCK_REBUILD_CHANCE,
  STOCK_WARNING_THRESHOLD,
  THEME_EVENT_MAX_DURATION,
  THEME_EVENT_MIN_DURATION,
  TRADING_HALT_MAX_TICKS,
  TRADING_HALT_MIN_TICKS,
  VIRTUAL_MINUTES_PER_TICK,
} from '@/features/stock-sim/constants/config';
import {
  chance,
  clamp,
  createAiWatchStockIds,
  normalizeSimulationState,
  pickCoolingSector,
  pickDominantSector,
  pickRandom,
  randomBetween,
  randomInt,
  roundPrice,
  scheduleNextAiDecisionTick,
  trimHistory,
  uid,
} from '@/features/stock-sim/engine/helpers';
import {
  applyImmediateTradeImpact,
  executeAiOrder,
  executePlayerOrder,
} from '@/features/stock-sim/engine/tradeEngine';
import type {
  ActivityItem,
  AiTrader,
  DayPhase,
  EventScope,
  LeaderboardEntry,
  MarketEvent,
  MarketEventType,
  MarketRegime,
  PendingOrder,
  Sector,
  SimulationState,
  Stock,
  StockArchetype,
  StockBlueprint,
  StockLimitState,
  Trade,
  TradeSide,
} from '@/features/stock-sim/types';
import { sectors } from '@/features/stock-sim/types';
import { calculatePlayerNetWorth, calculateReturnRate } from '@/features/stock-sim/utils/portfolio';

type FlowBookEntry = {
  buyNotional: number;
  sellNotional: number;
  visibleTradeCount: number;
};

type StockTransitionResult = {
  stocks: Stock[];
  events: MarketEvent[];
  activityLog: ActivityItem[];
};

const SESSION_OPEN_MINUTES = 9 * 60;
const SESSION_OPENING_END = 10 * 60;
const SESSION_CLOSING_START = 15 * 60 + 10;
const SESSION_CLOSING_END = 15 * 60 + 30;

const THEME_NAMES: Record<Sector, string[]> = {
  AI: ['AI inference cluster', 'Autonomous agent rush', 'Robot supply chain'],
  Semiconductor: ['Memory upcycle', 'Advanced package rush', 'Foundry bottleneck'],
  Robotics: ['Factory automation boom', 'Humanoid contract wave', 'Defense robotics bid'],
  Space: ['Launch window mania', 'Satellite network expansion', 'Space payload bid'],
  Bio: ['Clinical catalyst', 'Rare disease momentum', 'Platform biotech surge'],
  Battery: ['Solid-state momentum', 'Recycling breakthrough', 'Grid storage bid'],
  Game: ['Global launch theme', 'Platform update hype', 'Creator ecosystem rally'],
  Platform: ['Ad-tech recovery', 'Cloud subscription boom', 'Marketplace expansion'],
  Logistics: ['Freight recovery', 'Cold chain theme', 'Last-mile automation'],
  Energy: ['Power grid upgrade', 'Hydrogen narrative', 'Refinery margin swing'],
  Entertainment: ['Streaming content rally', 'Concert demand spike', 'Character IP rush'],
  Defense: ['Export contract buzz', 'Drone procurement wave', 'Naval upgrade cycle'],
};

const REBUILD_NAMES: Record<Sector, string[]> = {
  AI: ['Neural Forge', 'Signal Foundry', 'Aether Logic'],
  Semiconductor: ['Vector Silicon', 'Nano Junction', 'Prime Wafer'],
  Robotics: ['Motion Arc', 'Servo Harbor', 'Atlas Motion'],
  Space: ['Orbital Rise', 'Nova Launch', 'Blue Trajectory'],
  Bio: ['Helix Bloom', 'Cell Frontier', 'Medi Origin'],
  Battery: ['Core Volt', 'Ion Harbor', 'Next Cell'],
  Game: ['Pixel Harbor', 'Play Realm', 'Level Spark'],
  Platform: ['Link Harbor', 'Axis Platform', 'Nexus Grid'],
  Logistics: ['Route Harbor', 'Cargo Flow', 'Swift Lane'],
  Energy: ['Grid Pulse', 'Nova Energy', 'Solar Crest'],
  Entertainment: ['Stage Bloom', 'Prism Story', 'Idol Harbor'],
  Defense: ['Shield Axis', 'Sentinel Forge', 'Iron Harbor'],
};

function getDailyLimits(referencePrice: number) {
  const base = Math.max(1, referencePrice);
  return {
    lower: roundPrice(base * (1 - DAILY_PRICE_LIMIT_RATIO)),
    upper: roundPrice(base * (1 + DAILY_PRICE_LIMIT_RATIO)),
  };
}

function getDayPhase(marketClockMinutes: number): DayPhase {
  if (marketClockMinutes >= SESSION_OPEN_MINUTES && marketClockMinutes < SESSION_OPENING_END) {
    return 'opening';
  }
  if (marketClockMinutes >= SESSION_OPENING_END && marketClockMinutes < SESSION_CLOSING_START) {
    return 'session';
  }
  if (marketClockMinutes >= SESSION_CLOSING_START && marketClockMinutes < SESSION_CLOSING_END) {
    return 'closing';
  }
  return 'overnight';
}

function getPhaseLiquidityMultiplier(phase: DayPhase) {
  switch (phase) {
    case 'opening':
      return 1.25;
    case 'closing':
      return 1.12;
    case 'overnight':
      return 0.38;
    default:
      return 1;
  }
}

function getRegimeFromMood(marketMood: number): MarketRegime {
  if (marketMood >= 0.52) return 'markup';
  if (marketMood >= 0.18) return 'rotation';
  if (marketMood <= -0.58) return 'panic';
  if (marketMood <= -0.2) return 'distribution';
  if (marketMood >= 0.04) return 'rebound';
  return 'accumulation';
}

function buildEmptyFlowBook(stocks: Stock[]) {
  return Object.fromEntries(
    stocks.map((stock) => [
      stock.id,
      {
        buyNotional: 0,
        sellNotional: 0,
        visibleTradeCount: 0,
      } satisfies FlowBookEntry,
    ]),
  ) as Record<string, FlowBookEntry>;
}

function addFlow(
  flowBook: Record<string, FlowBookEntry>,
  stockId: string,
  side: TradeSide,
  notional: number,
  isVisibleTrade = false,
) {
  const target = flowBook[stockId];
  if (!target || notional <= 0) return;

  if (side === 'buy') {
    target.buyNotional += notional;
  } else {
    target.sellNotional += notional;
  }

  if (isVisibleTrade) {
    target.visibleTradeCount += 1;
  }
}

function createEvent(
  type: MarketEventType,
  scope: EventScope,
  title: string,
  description: string,
  impact: number,
  duration: number,
  tick: number,
  affectedStockIds: string[] = [],
  affectedSectors: Sector[] = [],
  options: Partial<Pick<MarketEvent, 'isRumor' | 'themeTag'>> = {},
): MarketEvent {
  return {
    id: uid('event'),
    type,
    scope,
    title,
    description,
    affectedStockIds,
    affectedSectors,
    impact,
    duration,
    remainingDuration: duration,
    createdAt: Date.now(),
    tick,
    isRumor: Boolean(options.isRumor),
    themeTag: options.themeTag,
  };
}

function appendEvent(events: MarketEvent[], event: MarketEvent) {
  return [event, ...events].slice(0, MAX_EVENT_LOG);
}

function createActivity(
  title: string,
  description: string,
  tick: number,
  tone: ActivityItem['tone'],
  type: ActivityItem['type'] = 'alert',
): ActivityItem {
  return {
    id: uid('activity'),
    type,
    title,
    description,
    timestamp: Date.now(),
    tick,
    tone,
  };
}

function appendActivity(log: ActivityItem[], item: ActivityItem) {
  return [item, ...log].slice(0, MAX_ACTIVITY_LOG);
}

function getHoldingValueBySector(simulation: SimulationState) {
  const sectorValues = new Map<Sector, number>();
  const stockMap = new Map(simulation.stocks.map((stock) => [stock.id, stock]));

  simulation.player.holdings.forEach((holding) => {
    const stock = stockMap.get(holding.stockId);
    if (!stock) return;
    const value = holding.quantity * stock.currentPrice;
    sectorValues.set(stock.sector, (sectorValues.get(stock.sector) || 0) + value);
  });

  return Array.from(sectorValues.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([sector]) => sector);
}

function createCurrentUserLeaderboardEntry(simulation: SimulationState): LeaderboardEntry {
  const currentUser =
    typeof globalThis !== 'undefined' && 'window' in globalThis
      ? String(window.localStorage.getItem('current_user') || '').trim()
      : '';
  const totalAssets = calculatePlayerNetWorth(simulation.player, simulation.stocks);

  return {
    id: simulation.currentPlayerId || `stock-sim-${currentUser || 'player'}`,
    name: currentUser || simulation.player.name || '플레이어',
    kind: 'current-user',
    netWorth: totalAssets,
    returnRate: calculateReturnRate(simulation.player, simulation.stocks, INITIAL_PLAYER_CASH),
    style: currentUser.toLowerCase() === 'admin' ? '실시간 관리자' : '실시간 참가자',
    focusSectors: getHoldingValueBySector(simulation),
    volatility: Math.abs(simulation.marketMood),
    lastDelta: simulation.marketMood * 0.06,
  };
}

function syncLocalLeaderboard(simulation: SimulationState) {
  return [createCurrentUserLeaderboardEntry(simulation)];
}

function getStockEventImpulse(stock: Stock, events: MarketEvent[]) {
  return events.reduce((total, event) => {
    if (event.remainingDuration <= 0) return total;
    if (event.scope === 'market') {
      return total + event.impact * 0.36;
    }
    if (event.affectedStockIds.includes(stock.id)) {
      return total + event.impact * (0.52 + stock.newsSensitivity * 0.35);
    }
    if (event.affectedSectors.includes(stock.sector)) {
      return total + event.impact * (0.32 + stock.newsSensitivity * 0.2);
    }
    return total;
  }, 0);
}

function createThemeEvent(simulation: SimulationState) {
  const sector = pickRandom(sectors);
  const themeName = pickRandom(THEME_NAMES[sector]);
  return createEvent(
    'theme',
    'sector',
    `${themeName} 부상`,
    `${sector} 섹터에 자금이 몰리며 테마 순환이 강화되고 있습니다.`,
    randomBetween(0.28, 0.56),
    randomInt(THEME_EVENT_MIN_DURATION, THEME_EVENT_MAX_DURATION),
    simulation.tick,
    [],
    [sector],
    { themeTag: themeName },
  );
}

function createMarketShockEvent(simulation: SimulationState) {
  const bullish = chance(0.58);
  return createEvent(
    bullish ? 'market-bull' : 'market-fear',
    'market',
    bullish ? '시장 위험선호 확대' : '시장 위험회피 확대',
    bullish
      ? '지수 전반에 자금이 유입되며 시장 체력이 강화되고 있습니다.'
      : '시장 전반에 경계 심리가 번지며 방어적 매매가 늘고 있습니다.',
    bullish ? randomBetween(0.12, 0.28) : randomBetween(-0.3, -0.12),
    randomInt(EVENT_MIN_DURATION, EVENT_MAX_DURATION),
    simulation.tick,
  );
}

function maybeAddWorldEvents(simulation: SimulationState) {
  let nextEvents = simulation.events
    .map((event) => ({
      ...event,
      remainingDuration: Math.max(0, event.remainingDuration - 1),
    }))
    .filter((event) => event.remainingDuration > 0);
  let nextActivity = simulation.aiActivity;
  let activeTheme = simulation.world.activeTheme;

  if (activeTheme && !nextEvents.some((event) => event.type === 'theme' && event.themeTag === activeTheme)) {
    activeTheme = null;
  }

  if (!activeTheme && chance(0.02)) {
    const event = createThemeEvent(simulation);
    nextEvents = appendEvent(nextEvents, event);
    activeTheme = event.themeTag || null;
    nextActivity = appendActivity(
      nextActivity,
      createActivity('테마 점화', `${event.title} 이벤트가 시장에 등장했습니다.`, simulation.tick, 'positive'),
    );
  }

  if (chance(MARKET_SYSTEMIC_SHOCK_CHANCE * 0.18)) {
    const event = createMarketShockEvent(simulation);
    nextEvents = appendEvent(nextEvents, event);
    nextActivity = appendActivity(
      nextActivity,
      createActivity('시장 신호', event.title, simulation.tick, event.impact >= 0 ? 'positive' : 'negative'),
    );
  }

  return {
    events: nextEvents,
    aiActivity: nextActivity,
    activeTheme,
  };
}

function clampPriceToLimits(
  stock: Stock,
  nextPrice: number,
): { price: number; limitState: StockLimitState } {
  const bounded = Math.min(Math.max(nextPrice, stock.dailyLowerLimit), stock.dailyUpperLimit);
  const limitState: StockLimitState =
    bounded >= stock.dailyUpperLimit
      ? 'upper-limit'
      : bounded <= stock.dailyLowerLimit
        ? 'lower-limit'
        : 'normal';

  return {
    price: roundPrice(bounded),
    limitState,
  };
}

function rollStockToNextDay(stock: Stock): Stock {
  const referencePrice = stock.status === 'DELISTED' ? Math.max(1, stock.lastClosePrice || 1) : stock.currentPrice;
  const nextLimits = getDailyLimits(referencePrice);
  const averageDailyVolume =
    stock.averageDailyVolume > 0
      ? roundPrice(stock.averageDailyVolume * 0.82 + stock.sessionVolume * 0.18)
      : Math.max(1, stock.sessionVolume);

  return {
    ...stock,
    referencePrice,
    lastClosePrice: referencePrice,
    dayOpenPrice: referencePrice,
    dayHighPrice: referencePrice,
    dayLowPrice: referencePrice,
    dailyUpperLimit: nextLimits.upper,
    dailyLowerLimit: nextLimits.lower,
    dailyLimitState: 'normal' as const,
    sessionVolume: 0,
    averageDailyVolume: Math.max(1000, averageDailyVolume),
    listedDay: stock.listedDay + 1,
    ipoDaysRemaining: Math.max(0, stock.ipoDaysRemaining - 1),
    themeIntensity: clamp(stock.themeIntensity * 0.82, 0, 2),
    warningScore: clamp(stock.warningScore * 0.96, 0, 3),
    distressScore: clamp(stock.distressScore * 0.98, 0, 3),
    eventRisk: clamp(stock.eventRisk * 0.96, 0, 3),
  };
}

function createTickerFromSector(sector: Sector) {
  const head = sector.replace(/[^A-Z]/gi, '').slice(0, 3).toUpperCase() || sector.slice(0, 3).toUpperCase();
  return `${head}${randomInt(10, 99)}`;
}

function createIpoBlueprint(sector: Sector): StockBlueprint {
  const archetype: StockArchetype = chance(0.45)
    ? 'growth'
    : chance(0.2)
      ? 'theme'
      : chance(0.18)
        ? 'distressed'
        : 'bluechip';
  const name = `${pickRandom(REBUILD_NAMES[sector])} ${randomInt(1, 9)}`;
  const basePrice = randomBetween(6, 48);
  const liquidity = randomBetween(0.28, 0.72);
  const volatility =
    archetype === 'growth'
      ? randomBetween(0.7, 1.05)
      : archetype === 'theme'
        ? randomBetween(0.82, 1.18)
        : archetype === 'distressed'
          ? randomBetween(0.8, 1.2)
          : randomBetween(0.32, 0.62);

  const traits = ['news-sensitive', 'volume-spike'];
  if (archetype === 'theme') traits.push('theme-heavy');
  if (archetype === 'growth') traits.push('trend-heavy');
  if (archetype === 'distressed') traits.push('speculative');

  return {
    id: uid('ipo'),
    ticker: createTickerFromSector(sector),
    name,
    sector,
    description: `${sector} 섹터에서 새롭게 상장한 종목입니다.`,
    archetype,
    basePrice,
    volatility,
    momentum: randomBetween(-0.08, 0.12),
    sentiment: randomBetween(0.02, 0.22),
    liquidity,
    traits: Array.from(new Set(traits)) as StockBlueprint['traits'],
    sharesOutstanding: randomInt(12_000_000, 84_000_000),
    aiAffinity: randomBetween(0.3, 0.88),
    newsSensitivity: randomBetween(0.4, 0.92),
    collapseRisk: archetype === 'distressed' ? randomBetween(0.5, 0.9) : randomBetween(0.12, 0.46),
  };
}

function createStockFromBlueprint(blueprint: StockBlueprint, listedDay: number): Stock {
  const opening = roundPrice(blueprint.basePrice * randomBetween(0.96, 1.04));
  const limits = getDailyLimits(opening);

  return {
    ...blueprint,
    currentPrice: opening,
    previousPrice: opening,
    priceHistory: [opening],
    volumeHistory: [Math.round(randomBetween(8_000, 20_000))],
    tradeCountHistory: [0],
    lastVolume: 0,
    referencePrice: opening,
    lastClosePrice: opening,
    dayOpenPrice: opening,
    dayHighPrice: opening,
    dayLowPrice: opening,
    dailyUpperLimit: limits.upper,
    dailyLowerLimit: limits.lower,
    dailyLimitState: 'normal',
    sessionVolume: 0,
    averageDailyVolume: randomBetween(14_000, 34_000),
    status: blueprint.archetype === 'distressed' ? 'WARNING' : 'NORMAL',
    haltRemainingTicks: 0,
    haltReason: null,
    warningScore: blueprint.archetype === 'distressed' ? 0.32 : 0,
    distressScore: blueprint.archetype === 'distressed' ? 0.44 : 0,
    listedDay,
    ipoDaysRemaining: randomInt(2, 4),
    themeTag: blueprint.archetype === 'theme' ? '신규 상장 테마' : null,
    themeIntensity: blueprint.archetype === 'theme' ? 0.2 : 0,
    themeUntilTick: 0,
    bubblePhase: 'idle',
    bubbleTicksRemaining: 0,
    bubbleAnchorPrice: opening,
    eventRisk: blueprint.collapseRisk,
  };
}

function getShortMove(stock: Stock, windowSize: number) {
  if (stock.priceHistory.length <= windowSize) return 0;
  const base = stock.priceHistory.at(-windowSize - 1) ?? stock.previousPrice;
  return (stock.currentPrice - base) / Math.max(base, 1);
}

function startTradingHalt(stock: Stock, reason: string): Stock {
  return {
    ...stock,
    status: 'HALTED' as const,
    haltReason: reason,
    haltRemainingTicks: randomInt(TRADING_HALT_MIN_TICKS, TRADING_HALT_MAX_TICKS),
  };
}

function applyStockBubbleCycle(stock: Stock): Stock {
  let next = { ...stock };

  if (next.status === 'DELISTED') {
    return next;
  }

  if (next.bubblePhase === 'idle') {
    const baseChance =
      STOCK_BUBBLE_CHANCE *
      (next.archetype === 'theme' ? 2.2 : next.archetype === 'distressed' ? 1.6 : 0.8) *
      (0.8 + next.aiAffinity * 0.4);

    if (chance(baseChance)) {
      next.bubblePhase = 'build';
      next.bubbleTicksRemaining = randomInt(36, 96);
      next.bubbleAnchorPrice = next.currentPrice;
      next.themeIntensity = clamp(next.themeIntensity + 0.22, 0, 2);
      next.themeTag = next.themeTag || '작전주';
    }
    return next;
  }

  next.bubbleTicksRemaining = Math.max(0, next.bubbleTicksRemaining - 1);

  if (next.bubblePhase === 'build') {
    next.themeIntensity = clamp(next.themeIntensity + 0.008, 0, 2);
    if (next.bubbleTicksRemaining === 0) {
      next.bubblePhase = 'mania';
      next.bubbleTicksRemaining = randomInt(18, 52);
      next.eventRisk = clamp(next.eventRisk + 0.26, 0, 3);
    }
    return next;
  }

  if (next.bubblePhase === 'mania') {
    next.themeIntensity = clamp(next.themeIntensity + 0.01, 0, 2);
    if (next.bubbleTicksRemaining === 0) {
      next.bubblePhase = 'halted';
    }
    return next;
  }

  if (next.bubblePhase === 'crash') {
    next.themeIntensity = clamp(next.themeIntensity * 0.92, 0, 2);
    next.eventRisk = clamp(next.eventRisk + 0.02, 0, 3);
    if (next.bubbleTicksRemaining === 0) {
      next.bubblePhase = 'idle';
      next.themeTag = chance(0.3) ? next.themeTag : null;
      next.eventRisk = clamp(next.eventRisk * 0.86, 0, 3);
    }
  }

  return next;
}

function updateStatusFromFundamentals(stock: Stock): Stock {
  if (stock.status === 'DELISTED') {
    return {
      ...stock,
      currentPrice: 0,
      previousPrice: 0,
      dayHighPrice: Math.max(stock.dayHighPrice, 0),
      dayLowPrice: 0,
    };
  }

  const priceRatio = stock.referencePrice > 0 ? stock.currentPrice / stock.referencePrice : 1;
  const dailyVolumeRatio = stock.averageDailyVolume > 0 ? stock.sessionVolume / stock.averageDailyVolume : 1;
  const downsideStress = clamp(1 - priceRatio, 0, 1.4);
  const illiquidityStress = clamp(0.42 - dailyVolumeRatio, 0, 1.2);
  const bubbleStress = stock.bubblePhase === 'crash' ? 0.16 : stock.bubblePhase === 'mania' ? 0.08 : 0;
  const recovery = clamp(priceRatio - 1.04, 0, 0.6);

  const warningScore = clamp(
    stock.warningScore * 0.96 +
      downsideStress * 0.08 +
      illiquidityStress * 0.05 +
      stock.eventRisk * 0.015 +
      bubbleStress -
      recovery * 0.06,
    0,
    3,
  );
  const distressScore = clamp(
    stock.distressScore * 0.985 +
      downsideStress * 0.06 +
      illiquidityStress * 0.05 +
      (stock.status === 'HALTED' ? 0.03 : 0) +
      (stock.haltReason === '상장폐지 심사' ? 0.06 : 0) -
      recovery * 0.04,
    0,
    3,
  );

  let nextStatus: Stock['status'] = stock.status;

  if (stock.status !== 'HALTED') {
    if (
      stock.listedDay > 5 &&
      warningScore > STOCK_WARNING_THRESHOLD + 0.28 &&
      distressScore > STOCK_DELIST_THRESHOLD &&
      (priceRatio < 0.2 || dailyVolumeRatio < 0.08)
    ) {
      nextStatus = 'DELISTED';
    } else if (warningScore > STOCK_WARNING_THRESHOLD) {
      nextStatus = 'WARNING';
    } else {
      nextStatus = 'NORMAL';
    }
  }

  if (nextStatus === 'DELISTED') {
    return {
      ...stock,
      status: 'DELISTED',
      warningScore,
      distressScore,
      currentPrice: 0,
      previousPrice: stock.currentPrice,
      haltReason: '상장폐지',
      haltRemainingTicks: 0,
      dailyLimitState: 'normal',
      dayLowPrice: 0,
    };
  }

  return {
    ...stock,
    status: nextStatus,
    warningScore,
    distressScore,
  };
}

function pushTradeLog(trades: Trade[], trade: Trade) {
  return [trade, ...trades].slice(0, MAX_TRADE_LOG);
}

function pushTradeActivity(activityLog: ActivityItem[], trade: Trade, stock: Stock) {
  return appendActivity(
    activityLog,
    createActivity(
      `${trade.actorName} ${trade.side === 'buy' ? '매수' : '매도'}`,
      `${stock.name} ${trade.quantity}주를 ${trade.side === 'buy' ? '매수' : '매도'}했습니다.`,
      trade.tick,
      trade.side === 'buy' ? 'positive' : 'negative',
      'trade',
    ),
  );
}

function processPendingOrders(
  simulation: SimulationState,
  flowBook: Record<string, FlowBookEntry>,
  timestamp: number,
) {
  const stockMap = new Map(simulation.stocks.map((stock) => [stock.id, stock]));
  const nextPending: PendingOrder[] = [];
  let nextPlayer = simulation.player;
  let nextStocks = simulation.stocks;
  let nextTrades = simulation.trades;
  let nextActivity = simulation.aiActivity;

  for (const order of simulation.pendingOrders) {
    const stock = stockMap.get(order.stockId);
    if (!stock || stock.status === 'HALTED' || stock.status === 'DELISTED') {
      nextPending.push(order);
      continue;
    }

    const isTriggered =
      order.side === 'buy'
        ? stock.currentPrice <= order.targetPrice
        : stock.currentPrice >= order.targetPrice;

    if (!isTriggered) {
      nextPending.push(order);
      continue;
    }

    const execution = executePlayerOrder(
      nextPlayer,
      stock,
      order.side,
      order.quantity,
      simulation.tick,
      stock.currentPrice,
      timestamp,
    );

    if ('error' in execution) {
      nextPending.push(order);
      continue;
    }

    nextPlayer = execution.player;
    const impactedStock = applyImmediateTradeImpact(stock, order.side, order.quantity);
    nextStocks = nextStocks.map((candidate) => (candidate.id === stock.id ? impactedStock : candidate));
    stockMap.set(stock.id, impactedStock);
    addFlow(flowBook, stock.id, order.side, execution.trade.notional, true);
    nextTrades = pushTradeLog(nextTrades, execution.trade);
    nextActivity = appendActivity(
      nextActivity,
      createActivity(
        '예약 주문 체결',
        `${stock.name} ${order.quantity}주 예약 ${order.side === 'buy' ? '매수' : '매도'}가 체결됐습니다.`,
        simulation.tick,
        order.side === 'buy' ? 'positive' : 'negative',
      ),
    );
  }

  return {
    ...simulation,
    player: nextPlayer,
    stocks: nextStocks,
    trades: nextTrades,
    aiActivity: nextActivity,
    pendingOrders: nextPending,
  };
}

function evaluateAiScore(
  aiTrader: AiTrader,
  stock: Stock,
  simulation: SimulationState,
  eventImpulse: number,
) {
  const holding = aiTrader.holdings.find((item) => item.stockId === stock.id);
  const priceDeviation = (stock.currentPrice - stock.referencePrice) / Math.max(stock.referencePrice, 1);
  const marketBias = simulation.marketMood * 0.2;
  const sectorBias = simulation.world.sectorFlows[stock.sector] * 0.34;
  const preferenceBias = aiTrader.preferredSectors.includes(stock.sector) ? 0.2 : 0;
  const themeBias = stock.themeIntensity * 0.2 + (stock.themeTag ? 0.06 : 0);
  const archetypeBias =
    stock.archetype === 'bluechip'
      ? aiTrader.archetype === 'defensive'
        ? 0.12
        : 0.02
      : stock.archetype === 'growth'
        ? aiTrader.archetype === 'aggressive'
          ? 0.15
          : 0.05
        : stock.archetype === 'theme'
          ? aiTrader.archetype === 'theme-chaser' || aiTrader.archetype === 'crowd-follower'
            ? 0.2
            : 0.06
          : aiTrader.archetype === 'contrarian'
            ? 0.08
            : -0.04;
  const priceMeanReversion = -priceDeviation * (aiTrader.archetype === 'contrarian' ? 0.26 : 0.08);
  const trendBias = stock.momentum * (aiTrader.archetype === 'scalper' ? 0.24 : 0.14);
  const riskPenalty =
    (stock.status === 'WARNING' ? 0.16 : 0) +
    (stock.dailyLimitState === 'upper-limit' ? 0.18 : 0) +
    stock.eventRisk * 0.06;
  const sellPressure =
    holding && holding.quantity > 0
      ? (priceDeviation > 0 ? priceDeviation * 0.2 : 0) +
        (stock.bubblePhase === 'crash' ? 0.4 : 0) +
        (stock.status === 'WARNING' ? 0.18 : 0)
      : 0;

  const buyScore =
    preferenceBias +
    marketBias +
    sectorBias +
    themeBias +
    archetypeBias +
    eventImpulse * 0.42 +
    priceMeanReversion +
    trendBias -
    riskPenalty;
  const sellScore =
    sellPressure +
    Math.max(0, -eventImpulse * 0.34) +
    Math.max(0, -sectorBias) * 0.4 +
    (stock.dailyLimitState === 'lower-limit' ? 0.12 : 0);

  return {
    holding,
    buyScore,
    sellScore,
  };
}

function processAiOrders(
  simulation: SimulationState,
  flowBook: Record<string, FlowBookEntry>,
  timestamp: number,
) {
  const stockMap = new Map(simulation.stocks.map((stock) => [stock.id, stock]));
  const eventMap = new Map(
    simulation.stocks.map((stock) => [stock.id, getStockEventImpulse(stock, simulation.events)]),
  );

  let nextStocks = simulation.stocks;
  let nextTraders = simulation.aiTraders;
  let nextTrades = simulation.trades;
  let nextActivity = simulation.aiActivity;
  const visibleTradeBudget = { remaining: AMBIENT_TRADE_LOG_LIMIT_PER_TICK };

  nextTraders = nextTraders.map((aiTrader) => {
    if (aiTrader.nextDecisionTick > simulation.tick) {
      return aiTrader;
    }

    const watchedStocks = aiTrader.watchStockIds
      .map((stockId) => stockMap.get(stockId))
      .filter((stock): stock is Stock => Boolean(stock))
      .filter((stock) => stock.status !== 'DELISTED');

    if (watchedStocks.length === 0) {
      return {
        ...aiTrader,
        watchStockIds: createAiWatchStockIds(aiTrader.preferredSectors, nextStocks, aiTrader.archetype),
        nextDecisionTick: scheduleNextAiDecisionTick(aiTrader, simulation.tick, false),
      };
    }

    const scored = watchedStocks
      .map((stock) => ({
        stock,
        ...evaluateAiScore(aiTrader, stock, simulation, eventMap.get(stock.id) || 0),
      }))
      .sort((left, right) => right.buyScore - right.sellScore - (left.buyScore - left.sellScore));

    const best = scored[0];
    let nextTrader = aiTrader;

    if (best.holding && best.sellScore > 0.22 && best.stock.status !== 'HALTED') {
      const maxSell = Math.max(1, Math.floor(best.holding.quantity * randomBetween(0.25, 0.7)));
      const quantity = Math.max(1, Math.min(best.holding.quantity, maxSell));
      const execution = executeAiOrder(
        aiTrader,
        best.stock,
        'sell',
        quantity,
        simulation.tick,
        'ai-flow',
        best.stock.currentPrice,
        timestamp,
      );

      if (execution) {
        nextTrader = {
          ...execution.aiTrader,
          nextDecisionTick: scheduleNextAiDecisionTick(execution.aiTrader, simulation.tick, true),
        };
        const impactedStock = applyImmediateTradeImpact(best.stock, 'sell', quantity);
        nextStocks = nextStocks.map((stock) => (stock.id === best.stock.id ? impactedStock : stock));
        stockMap.set(best.stock.id, impactedStock);
        addFlow(flowBook, best.stock.id, 'sell', execution.trade.notional, visibleTradeBudget.remaining > 0);
        if (visibleTradeBudget.remaining > 0) {
          visibleTradeBudget.remaining -= 1;
          nextTrades = pushTradeLog(nextTrades, execution.trade);
          nextActivity = pushTradeActivity(nextActivity, execution.trade, impactedStock);
        }
        return nextTrader;
      }
    }

    if (best.buyScore > 0.18 && best.stock.status !== 'HALTED') {
      const riskBudget = aiTrader.cash * clamp(aiTrader.riskTolerance * 0.08, 0.015, 0.09);
      const themeBoost = best.stock.ipoDaysRemaining > 0 ? 1.3 : best.stock.themeIntensity > 0.3 ? 1.18 : 1;
      const quantity = Math.max(
        1,
        Math.floor((riskBudget * themeBoost * randomBetween(0.5, 1.1)) / Math.max(best.stock.currentPrice, 1)),
      );
      const execution = executeAiOrder(
        aiTrader,
        best.stock,
        'buy',
        quantity,
        simulation.tick,
        'ai-flow',
        best.stock.currentPrice,
        timestamp,
      );

      if (execution) {
        nextTrader = {
          ...execution.aiTrader,
          nextDecisionTick: scheduleNextAiDecisionTick(execution.aiTrader, simulation.tick, true),
        };
        const impactedStock = applyImmediateTradeImpact(best.stock, 'buy', quantity);
        nextStocks = nextStocks.map((stock) => (stock.id === best.stock.id ? impactedStock : stock));
        stockMap.set(best.stock.id, impactedStock);
        addFlow(flowBook, best.stock.id, 'buy', execution.trade.notional, visibleTradeBudget.remaining > 0);
        if (visibleTradeBudget.remaining > 0) {
          visibleTradeBudget.remaining -= 1;
          nextTrades = pushTradeLog(nextTrades, execution.trade);
          nextActivity = pushTradeActivity(nextActivity, execution.trade, impactedStock);
        }
        return nextTrader;
      }
    }

    return {
      ...nextTrader,
      nextDecisionTick: scheduleNextAiDecisionTick(nextTrader, simulation.tick, false),
    };
  });

  return {
    ...simulation,
    stocks: nextStocks,
    aiTraders: nextTraders,
    trades: nextTrades,
    aiActivity: nextActivity,
  };
}

function buildSectorFlows(
  stocks: Stock[],
  previousFlows: Record<Sector, number>,
  events: MarketEvent[],
  sectorMood: Record<Sector, number>,
  marketMood: number,
) {
  const next = {} as Record<Sector, number>;

  sectors.forEach((sector) => {
    const sectorStocks = stocks.filter((stock) => stock.sector === sector && stock.status !== 'DELISTED');
    const averageDeviation =
      sectorStocks.reduce(
        (sum, stock) => sum + (stock.currentPrice - stock.referencePrice) / Math.max(stock.referencePrice, 1),
        0,
      ) / Math.max(1, sectorStocks.length);
    const averageMomentum =
      sectorStocks.reduce((sum, stock) => sum + stock.momentum, 0) / Math.max(1, sectorStocks.length);
    const eventBias = events.reduce((sum, event) => {
      if (event.remainingDuration <= 0) return sum;
      if (event.scope === 'market') return sum + event.impact * 0.18;
      if (event.affectedSectors.includes(sector)) return sum + event.impact * 0.42;
      return sum;
    }, 0);
    const themeBias = sectorStocks.some((stock) => stock.themeTag) ? 0.08 : 0;
    const haltPenalty = sectorStocks.filter((stock) => stock.status === 'HALTED').length * 0.05;
    next[sector] = clamp(
      (previousFlows[sector] || 0) * 0.8 +
        sectorMood[sector] * 0.34 +
        averageDeviation * 0.55 +
        averageMomentum * 0.15 +
        eventBias +
        themeBias +
        marketMood * 0.12 -
        haltPenalty +
        randomBetween(-0.025, 0.025),
      -1,
      1,
    );
  });

  return next;
}

function buildSectorMood(
  stocks: Stock[],
  previousMood: Record<Sector, number>,
  sectorFlows: Record<Sector, number>,
  events: MarketEvent[],
  marketMood: number,
) {
  const next = {} as Record<Sector, number>;

  sectors.forEach((sector) => {
    const sectorStocks = stocks.filter((stock) => stock.sector === sector && stock.status !== 'DELISTED');
    const performance =
      sectorStocks.reduce(
        (sum, stock) => sum + (stock.currentPrice - stock.referencePrice) / Math.max(stock.referencePrice, 1),
        0,
      ) / Math.max(1, sectorStocks.length);
    const eventBias = events.reduce((sum, event) => {
      if (event.remainingDuration <= 0) return sum;
      if (event.affectedSectors.includes(sector)) return sum + event.impact * 0.3;
      return sum;
    }, 0);

    next[sector] = clamp(
      previousMood[sector] * 0.74 +
        sectorFlows[sector] * 0.5 +
        performance * 0.42 +
        eventBias +
        marketMood * 0.08 +
        randomBetween(-0.03, 0.03),
      -1,
      1,
    );
  });

  return next;
}

function seedBackgroundFlows(
  stocks: Stock[],
  world: SimulationState['world'],
  events: MarketEvent[],
  flowBook: Record<string, FlowBookEntry>,
) {
  const phaseLiquidity = getPhaseLiquidityMultiplier(world.dayPhase);

  stocks.forEach((stock) => {
    if (stock.status === 'HALTED' || stock.status === 'DELISTED') {
      return;
    }

    const eventImpulse = getStockEventImpulse(stock, events);
    const sectorFlow = world.sectorFlows[stock.sector] || 0;
    const themeBias = stock.themeIntensity * 0.2 + (stock.themeTag ? 0.08 : 0);
    const ipoBias = stock.ipoDaysRemaining > 0 ? 0.12 : 0;
    const bubbleBias =
      stock.bubblePhase === 'mania'
        ? 0.42
        : stock.bubblePhase === 'build'
          ? 0.18
          : stock.bubblePhase === 'crash'
            ? -0.6
            : 0;
    const demandScore =
      sectorFlow * 0.55 +
      eventImpulse * 0.8 +
      stock.momentum * 0.18 +
      themeBias +
      ipoBias +
      bubbleBias +
      randomBetween(-0.18, 0.18);
    const baseNotional =
      Math.max(stock.averageDailyVolume * phaseLiquidity * stock.currentPrice * 0.08, stock.currentPrice * 12_000);
    const buyNotional = baseNotional * clamp(0.55 + Math.max(demandScore, 0), 0.12, 1.55);
    const sellNotional = baseNotional * clamp(0.55 + Math.max(-demandScore, 0), 0.12, 1.55);

    addFlow(flowBook, stock.id, 'buy', buyNotional);
    addFlow(flowBook, stock.id, 'sell', sellNotional);
  });
}

function decorateThemeStocks(stocks: Stock[], events: MarketEvent[], tick: number) {
  return stocks.map((stock) => {
    const themeEvent = events.find(
      (event) =>
        event.type === 'theme' &&
        event.remainingDuration > 0 &&
        (event.affectedStockIds.includes(stock.id) || event.affectedSectors.includes(stock.sector)),
    );

    let nextStock = {
      ...stock,
      themeIntensity: clamp(stock.themeIntensity * 0.994, 0, 2),
    };

    if (themeEvent) {
      nextStock = {
        ...nextStock,
        themeTag: themeEvent.themeTag || themeEvent.title,
        themeIntensity: clamp(Math.max(nextStock.themeIntensity, 0.22) + 0.02, 0, 2),
        themeUntilTick: tick + themeEvent.remainingDuration,
      };
    } else if (nextStock.themeUntilTick > 0 && tick > nextStock.themeUntilTick) {
      nextStock = {
        ...nextStock,
        themeIntensity: clamp(nextStock.themeIntensity * 0.96, 0, 2),
        themeTag: nextStock.themeIntensity > 0.08 ? nextStock.themeTag : null,
      };
    }

    return nextStock;
  });
}

function applyAmbientMove(
  stock: Stock,
  flowBook: Record<string, FlowBookEntry>,
  world: SimulationState['world'],
  marketMood: number,
  events: MarketEvent[],
) {
  if (stock.status === 'DELISTED') {
    return {
      ...stock,
      previousPrice: stock.currentPrice,
      currentPrice: 0,
      priceHistory: trimHistory([...stock.priceHistory, 0]),
      volumeHistory: trimHistory([...stock.volumeHistory, 0]),
      tradeCountHistory: trimHistory([...stock.tradeCountHistory, 0]),
      lastVolume: 0,
    };
  }

  if (stock.status === 'HALTED') {
    const remaining = Math.max(0, stock.haltRemainingTicks - 1);
    const resumed = remaining === 0;
    const resumeStatus: Stock['status'] =
      stock.haltReason === '상장폐지 심사'
        ? 'WARNING'
        : stock.warningScore > STOCK_WARNING_THRESHOLD
          ? 'WARNING'
          : 'NORMAL';

    return {
      ...stock,
      haltRemainingTicks: remaining,
      status: resumed ? resumeStatus : stock.status,
      haltReason: resumed ? null : stock.haltReason,
      bubblePhase: resumed && stock.bubblePhase === 'halted' ? 'crash' : stock.bubblePhase,
      bubbleTicksRemaining:
        resumed && stock.bubblePhase === 'halted'
          ? randomInt(30, 88)
          : stock.bubbleTicksRemaining,
      previousPrice: stock.currentPrice,
      priceHistory: trimHistory([...stock.priceHistory, stock.currentPrice]),
      volumeHistory: trimHistory([...stock.volumeHistory, 0]),
      tradeCountHistory: trimHistory([...stock.tradeCountHistory, 0]),
      lastVolume: 0,
    };
  }

  const flow = flowBook[stock.id];
  const grossFlow = (flow?.buyNotional || 0) + (flow?.sellNotional || 0);
  const netFlow = (flow?.buyNotional || 0) - (flow?.sellNotional || 0);
  const phaseLiquidity = getPhaseLiquidityMultiplier(world.dayPhase);
  const backgroundTurnover = stock.averageDailyVolume * phaseLiquidity * randomBetween(0.12, 0.38);
  const imbalanceRatio = netFlow / Math.max(stock.averageDailyVolume * stock.currentPrice, 1);
  const meanReversion =
    ((stock.referencePrice - stock.currentPrice) / Math.max(stock.referencePrice, 1)) *
    (stock.archetype === 'bluechip' ? 0.26 : stock.archetype === 'distressed' ? 0.08 : 0.16);
  const eventImpulse = getStockEventImpulse(stock, events);
  const sectorFlow = world.sectorFlows[stock.sector] || 0;
  const themeBoost = stock.themeIntensity * (stock.archetype === 'theme' ? 0.035 : 0.024);
  const bubbleBoost =
    stock.bubblePhase === 'build'
      ? 0.012
      : stock.bubblePhase === 'mania'
        ? 0.032
        : stock.bubblePhase === 'crash'
          ? -0.046
          : 0;
  const ipoBoost = stock.ipoDaysRemaining > 0 ? randomBetween(-0.018, 0.024) : 0;
  const imbalance =
    marketMood * 0.18 +
    sectorFlow * 0.36 +
    eventImpulse * 0.44 +
    stock.momentum * 0.18 +
    meanReversion +
    themeBoost +
    bubbleBoost +
    ipoBoost +
    imbalanceRatio * 0.24 +
    randomBetween(-0.12, 0.12) * (0.6 + stock.volatility * 0.8);
  const baseMoveScale =
    0.008 +
    stock.volatility * 0.018 +
    (stock.archetype === 'theme' ? 0.01 : 0) +
    (stock.archetype === 'distressed' ? 0.012 : 0);
  const moveRatio = clamp(imbalance * baseMoveScale, -0.17, 0.17);
  const nextPriceCandidate = stock.currentPrice * (1 + moveRatio);
  const { price: nextPrice, limitState } = clampPriceToLimits(stock, nextPriceCandidate);
  const visibleTrades = Math.max(0, flow?.visibleTradeCount || 0);
  const dailyVolume = Math.max(
    0,
    Math.round(backgroundTurnover + grossFlow / Math.max(stock.currentPrice, 1) + Math.abs(moveRatio) * stock.averageDailyVolume * 0.22),
  );
  const tradeCount = Math.max(
    0,
    Math.round(visibleTrades + backgroundTurnover / Math.max(stock.currentPrice * 90, 1)),
  );
  const liquidity = clamp(
    stock.liquidity * 0.992 +
      clamp(dailyVolume / Math.max(stock.averageDailyVolume, 1), 0, 2) * 0.008,
    0.12,
    1.4,
  );
  const nextMomentum = clamp(stock.momentum * 0.84 + imbalance * 0.18, -1.6, 1.6);
  const nextSentiment = clamp(
    stock.sentiment * 0.88 + (marketMood + sectorFlow + eventImpulse) * 0.08,
    -1,
    1,
  );

  let nextStock: Stock = {
    ...stock,
    previousPrice: stock.currentPrice,
    currentPrice: nextPrice,
    dailyLimitState: limitState,
    lastVolume: dailyVolume,
    sessionVolume: stock.sessionVolume + dailyVolume,
    dayHighPrice: Math.max(stock.dayHighPrice, nextPrice),
    dayLowPrice: Math.min(stock.dayLowPrice, nextPrice),
    liquidity,
    momentum: nextMomentum,
    sentiment: nextSentiment,
    priceHistory: trimHistory([...stock.priceHistory, nextPrice]),
    volumeHistory: trimHistory([...stock.volumeHistory, dailyVolume]),
    tradeCountHistory: trimHistory([...stock.tradeCountHistory, tradeCount]),
  };

  nextStock = applyStockBubbleCycle(nextStock);
  nextStock = updateStatusFromFundamentals(nextStock);

  const shortMove = Math.abs(getShortMove(nextStock, 12));
  const thematicOverheat =
    nextStock.themeIntensity > 0.7 &&
    Math.abs(imbalance) > 0.72 &&
    nextStock.dailyLimitState === 'upper-limit';
  const listingReview = nextStock.status === 'WARNING' && nextStock.distressScore > 1.35;

  if (nextStock.status !== 'DELISTED') {
    if (listingReview && chance(0.06)) {
      nextStock = startTradingHalt(nextStock, '상장폐지 심사');
    } else if (thematicOverheat && chance(0.18)) {
      nextStock = startTradingHalt(nextStock, '테마 과열');
      nextStock.bubblePhase = nextStock.bubblePhase === 'mania' ? 'halted' : nextStock.bubblePhase;
    } else if (shortMove > 0.18 && chance(0.22)) {
      nextStock = startTradingHalt(
        nextStock,
        nextStock.currentPrice >= nextStock.previousPrice ? '급등 변동성 완화' : '급락 변동성 완화',
      );
    } else if (nextStock.bubblePhase === 'halted' && nextStock.status !== 'HALTED') {
      nextStock = startTradingHalt(nextStock, '작전주 과열');
      nextStock.bubblePhase = 'halted';
    }
  }

  return nextStock;
}

function maybeSpawnIpo(
  simulation: SimulationState,
  stocks: Stock[],
  events: MarketEvent[],
  activityLog: ActivityItem[],
): StockTransitionResult {
  if (stocks.length >= MAX_LISTED_STOCKS || !chance(STOCK_IPO_CHANCE)) {
    return { stocks, events, activityLog };
  }

  const sector = chance(0.55) ? pickDominantSector(simulation.sectorMood) : pickRandom(sectors);
  const blueprint = createIpoBlueprint(sector);
  const stock = createStockFromBlueprint(blueprint, simulation.world.dayCount);
  const event = createEvent(
    'ipo',
    'stock',
    `${stock.name} 신규 상장`,
    `${stock.name}(${stock.ticker})가 ${sector} 섹터에 신규 상장했습니다. 초기 변동성이 높아 주의가 필요합니다.`,
    randomBetween(0.18, 0.34),
    randomInt(40, 90),
    simulation.tick,
    [stock.id],
    [sector],
    { themeTag: '신규 상장' },
  );

  return {
    stocks: [stock, ...stocks],
    events: appendEvent(events, event),
    activityLog: appendActivity(
      activityLog,
      createActivity('IPO 등장', `${stock.name}이(가) ${sector} 섹터에 새로 상장했습니다.`, simulation.tick, 'positive'),
    ),
  };
}

function maybeSpawnRebuild(
  simulation: SimulationState,
  stocks: Stock[],
  events: MarketEvent[],
  activityLog: ActivityItem[],
): StockTransitionResult {
  if (!chance(STOCK_REBUILD_CHANCE)) {
    return { stocks, events, activityLog };
  }

  const candidates = stocks.filter(
    (stock) =>
      stock.status !== 'DELISTED' &&
      stock.status !== 'HALTED' &&
      stock.listedDay > 3 &&
      (stock.status === 'WARNING' || stock.archetype === 'distressed' || stock.eventRisk > 0.7),
  );

  if (candidates.length === 0) {
    return { stocks, events, activityLog };
  }

  const target = pickRandom(candidates);
  const sectorsExceptCurrent = sectors.filter((sector) => sector !== target.sector);
  const nextSector = chance(0.55) ? pickDominantSector(simulation.sectorMood) : pickRandom(sectorsExceptCurrent);
  const nextName = pickRandom(REBUILD_NAMES[nextSector]);
  const nextTicker = createTickerFromSector(nextSector);
  const nextArchetype: StockArchetype = chance(0.6) ? 'growth' : 'theme';
  const renamed: Stock = {
    ...target,
    name: nextName,
    ticker: nextTicker,
    sector: nextSector,
    archetype: nextArchetype,
    description: `${nextSector} 테마로 체질을 개선한 리빌딩 종목입니다.`,
    themeTag: '리빌딩',
    themeIntensity: clamp(target.themeIntensity + 0.42, 0, 2),
    themeUntilTick: simulation.tick + randomInt(160, 320),
    status: 'NORMAL' as const,
    warningScore: clamp(target.warningScore * 0.42, 0, 3),
    distressScore: clamp(target.distressScore * 0.35, 0, 3),
    eventRisk: clamp(target.eventRisk * 0.72, 0, 3),
    ipoDaysRemaining: 0,
    haltReason: null,
    haltRemainingTicks: 0,
    dailyLimitState: 'normal' as const,
  };
  const event = createEvent(
    'reverse-merger',
    'stock',
    `${target.name} 리빌딩`,
    `${target.name}이(가) ${nextSector} 중심 기업으로 재편되며 ${nextName}(으)로 사명을 변경했습니다.`,
    randomBetween(0.2, 0.42),
    randomInt(120, 240),
    simulation.tick,
    [target.id],
    [nextSector],
    { themeTag: '리빌딩' },
  );

  return {
    stocks: stocks.map((stock) => (stock.id === target.id ? renamed : stock)),
    events: appendEvent(events, event),
    activityLog: appendActivity(
      activityLog,
      createActivity('우회상장/리빌딩', `${target.name}이(가) ${nextName}(으)로 재편됐습니다.`, simulation.tick, 'positive'),
    ),
  };
}

function collectStockStateChanges(
  previousStocks: Stock[],
  nextStocks: Stock[],
  events: MarketEvent[],
  activityLog: ActivityItem[],
  tick: number,
) {
  const previousMap = new Map(previousStocks.map((stock) => [stock.id, stock]));
  let nextEvents = events;
  let nextActivity = activityLog;

  nextStocks.forEach((stock) => {
    const previous = previousMap.get(stock.id);
    if (!previous) return;

    if (previous.dailyLimitState !== stock.dailyLimitState && stock.dailyLimitState !== 'normal') {
      nextActivity = appendActivity(
        nextActivity,
        createActivity(
          stock.dailyLimitState === 'upper-limit' ? '상한가 진입' : '하한가 진입',
          `${stock.name}이(가) ${stock.dailyLimitState === 'upper-limit' ? '상한가' : '하한가'}에 도달했습니다.`,
          tick,
          stock.dailyLimitState === 'upper-limit' ? 'positive' : 'negative',
        ),
      );
    }

    if (previous.status !== stock.status) {
      if (stock.status === 'WARNING') {
        nextEvents = appendEvent(
          nextEvents,
          createEvent(
            'warning',
            'stock',
            `${stock.name} 관리종목 지정`,
            `${stock.name}이(가) 부진한 가격 흐름과 거래 부진으로 관리종목 단계에 들어갔습니다.`,
            -0.18,
            randomInt(60, 180),
            tick,
            [stock.id],
            [stock.sector],
          ),
        );
        nextActivity = appendActivity(
          nextActivity,
          createActivity('관리종목 경고', `${stock.name}이(가) 관리종목으로 전환됐습니다.`, tick, 'negative'),
        );
      } else if (stock.status === 'HALTED') {
        nextEvents = appendEvent(
          nextEvents,
          createEvent(
            'halt',
            'stock',
            `${stock.name} 거래정지`,
            stock.haltReason ? `${stock.name} 거래가 일시 정지되었습니다. 사유: ${stock.haltReason}` : `${stock.name} 거래가 일시 정지되었습니다.`,
            0,
            stock.haltRemainingTicks,
            tick,
            [stock.id],
            [stock.sector],
          ),
        );
        nextActivity = appendActivity(
          nextActivity,
          createActivity('거래정지', `${stock.name} 거래가 정지되었습니다.`, tick, 'negative'),
        );
      } else if ((previous.status as Stock['status']) === 'HALTED') {
        nextEvents = appendEvent(
          nextEvents,
          createEvent(
            'resume',
            'stock',
            `${stock.name} 거래재개`,
            `${stock.name} 거래가 재개되었습니다.`,
            stock.bubblePhase === 'crash' ? -0.14 : 0.08,
            randomInt(20, 60),
            tick,
            [stock.id],
            [stock.sector],
          ),
        );
        nextActivity = appendActivity(
          nextActivity,
          createActivity('거래재개', `${stock.name} 거래가 다시 열렸습니다.`, tick, 'neutral'),
        );
      } else if (stock.status === 'DELISTED') {
        nextEvents = appendEvent(
          nextEvents,
          createEvent(
            'delisting',
            'stock',
            `${stock.name} 상장폐지`,
            `${stock.name}이(가) 상장폐지 단계로 전환되어 더 이상 거래할 수 없습니다.`,
            -0.5,
            randomInt(120, 240),
            tick,
            [stock.id],
            [stock.sector],
          ),
        );
        nextActivity = appendActivity(
          nextActivity,
          createActivity('상장폐지', `${stock.name}이(가) 상장폐지 처리되었습니다.`, tick, 'negative'),
        );
      }
    }

    if (previous.bubblePhase !== stock.bubblePhase) {
      if (stock.bubblePhase === 'build') {
        nextEvents = appendEvent(
          nextEvents,
          createEvent(
            'pump',
            'stock',
            `${stock.name} 작전주 조짐`,
            `${stock.name}에 비정상적인 수급이 몰리며 급등 단계가 시작됐습니다.`,
            0.22,
            randomInt(40, 80),
            tick,
            [stock.id],
            [stock.sector],
          ),
        );
      }
      if (stock.bubblePhase === 'crash') {
        nextEvents = appendEvent(
          nextEvents,
          createEvent(
            'crash',
            'stock',
            `${stock.name} 버블 붕괴`,
            `${stock.name}의 과열 흐름이 꺾이며 급락 압력이 커지고 있습니다.`,
            -0.34,
            randomInt(50, 100),
            tick,
            [stock.id],
            [stock.sector],
          ),
        );
        nextActivity = appendActivity(
          nextActivity,
          createActivity('버블 붕괴', `${stock.name}의 과열이 붕괴되며 급락 압력이 커졌습니다.`, tick, 'negative'),
        );
      }
    }
  });

  return {
    events: nextEvents.slice(0, MAX_EVENT_LOG),
    aiActivity: nextActivity.slice(0, MAX_ACTIVITY_LOG),
  };
}

function applyDayRollover(
  crossedDay: boolean,
  dayCount: number,
  tick: number,
  stocks: Stock[],
  activityLog: ActivityItem[],
): Pick<StockTransitionResult, 'stocks' | 'activityLog'> {
  if (!crossedDay) {
    return { stocks, activityLog };
  }

  return {
    stocks: stocks.map(rollStockToNextDay),
    activityLog: appendActivity(
      activityLog,
      createActivity(
        '가상 거래일 시작',
        `Day ${dayCount} 거래가 시작되었습니다. 기준가와 일일 제한폭이 갱신됩니다.`,
        tick,
        'neutral',
      ),
    ),
  };
}

function stepOneTick(simulation: SimulationState, timestamp: number) {
  const previousStocks = simulation.stocks;
  const nextTick = simulation.tick + 1;
  const totalSimulationMinutes = simulation.world.totalSimulationMinutes + VIRTUAL_MINUTES_PER_TICK;
  const dayTick = ((totalSimulationMinutes % MARKET_DAY_MINUTES) + MARKET_DAY_MINUTES) % MARKET_DAY_MINUTES;
  const dayCount = Math.max(1, Math.floor(totalSimulationMinutes / MARKET_DAY_MINUTES) + 1);
  const dayPhase = getDayPhase(dayTick);
  const crossedDay = dayCount !== simulation.world.dayCount;
  const nextWorldBase = {
    ...simulation.world,
    lastTickAt: timestamp,
    totalSimulationMinutes,
    simulationElapsedMinutes: simulation.world.simulationElapsedMinutes + VIRTUAL_MINUTES_PER_TICK,
    marketClockMinutes: dayTick,
    dayTick,
    dayCount,
    dayPhase,
    tickTimestamps: trimHistory([...simulation.world.tickTimestamps, timestamp]),
  };

  let working: SimulationState = {
    ...simulation,
    tick: nextTick,
    world: nextWorldBase,
  };

  const worldEventState = maybeAddWorldEvents(working);
  working = {
    ...working,
    events: worldEventState.events,
    aiActivity: worldEventState.aiActivity,
    world: {
      ...working.world,
      activeTheme: worldEventState.activeTheme,
    },
  };

  working = {
    ...working,
    stocks: decorateThemeStocks(working.stocks, working.events, nextTick),
  };

  const sectorFlows = buildSectorFlows(
    working.stocks,
    simulation.world.sectorFlows,
    working.events,
    simulation.sectorMood,
    simulation.marketMood,
  );
  working = {
    ...working,
    world: {
      ...working.world,
      sectorFlows,
    },
  };

  const flowBook = buildEmptyFlowBook(working.stocks);
  seedBackgroundFlows(working.stocks, working.world, working.events, flowBook);
  working = processPendingOrders(working, flowBook, timestamp);
  working = processAiOrders(working, flowBook, timestamp);

  let nextStocks = working.stocks.map((stock) =>
    applyAmbientMove(stock, flowBook, working.world, simulation.marketMood, working.events),
  );
  let nextEvents = working.events;
  let nextActivity = working.aiActivity;

  const ipoState = maybeSpawnIpo(working, nextStocks, nextEvents, nextActivity);
  nextStocks = ipoState.stocks;
  nextEvents = ipoState.events;
  nextActivity = ipoState.activityLog;

  const rebuildState = maybeSpawnRebuild(working, nextStocks, nextEvents, nextActivity);
  nextStocks = rebuildState.stocks;
  nextEvents = rebuildState.events;
  nextActivity = rebuildState.activityLog;

  const rolloverState = applyDayRollover(crossedDay, dayCount, nextTick, nextStocks, nextActivity);
  nextStocks = rolloverState.stocks;
  nextActivity = rolloverState.activityLog;

  const stockChangeState = collectStockStateChanges(previousStocks, nextStocks, nextEvents, nextActivity, nextTick);
  nextEvents = stockChangeState.events;
  nextActivity = stockChangeState.aiActivity;

  const sectorMood = buildSectorMood(nextStocks, simulation.sectorMood, sectorFlows, nextEvents, simulation.marketMood);
  const marketEventBias = nextEvents.reduce((sum, event) => {
    if (event.remainingDuration <= 0 || event.scope !== 'market') return sum;
    return sum + event.impact * 0.22;
  }, 0);
  const averageSectorMood =
    Object.values(sectorMood).reduce((sum, value) => sum + value, 0) / Math.max(1, sectors.length);
  const marketMood = clamp(
    simulation.marketMood * 0.82 + averageSectorMood * 0.42 + marketEventBias + randomBetween(-0.025, 0.025),
    -1,
    1,
  );
  const turnoverIndex =
    nextStocks.reduce((sum, stock) => sum + stock.sessionVolume / Math.max(stock.averageDailyVolume, 1), 0) /
    Math.max(1, nextStocks.length);
  const volatilityIndex =
    nextStocks.reduce(
      (sum, stock) =>
        sum +
        Math.abs((stock.currentPrice - stock.referencePrice) / Math.max(stock.referencePrice, 1)) *
          (stock.status === 'HALTED' ? 1.3 : 1),
      0,
    ) /
    Math.max(1, nextStocks.length);
  const liquidityIndex =
    nextStocks.reduce((sum, stock) => sum + stock.liquidity, 0) / Math.max(1, nextStocks.length) - 0.5;

  const nextSimulation: SimulationState = {
    ...working,
    marketMood,
    sectorMood,
    stocks: nextStocks,
    events: nextEvents,
    aiActivity: nextActivity,
    selectedStockId:
      nextStocks.some((stock) => stock.id === working.selectedStockId)
        ? working.selectedStockId
        : nextStocks[0]?.id || working.selectedStockId,
    world: {
      ...working.world,
      regime: getRegimeFromMood(marketMood),
      dominantSector: pickDominantSector(sectorMood),
      coolingSector: pickCoolingSector(sectorMood),
      aiFocusSector: pickDominantSector(sectorFlows),
      marketSentiment: marketMood,
      haltedCount: nextStocks.filter((stock) => stock.status === 'HALTED').length,
      warningCount: nextStocks.filter((stock) => stock.status === 'WARNING').length,
      delistedCount: nextStocks.filter((stock) => stock.status === 'DELISTED').length,
      liquidityIndex: clamp(liquidityIndex, -1, 1),
      volatilityIndex: clamp(volatilityIndex, 0, 1),
      turnoverIndex: clamp(turnoverIndex * 0.18, 0, 1),
      sectorFlows,
    },
  };

  nextSimulation.leaderboard = syncLocalLeaderboard(nextSimulation);
  return nextSimulation;
}

export function hydratePersistentSimulation(simulation: SimulationState) {
  const normalized = normalizeSimulationState(simulation);
  const now = Date.now();
  const elapsedMs = Math.max(0, now - normalized.world.lastTickAt);
  const offlineTicks = clamp(Math.floor(elapsedMs / BASE_TICK_INTERVAL_MS), 0, MAX_OFFLINE_CATCHUP_TICKS);

  if (offlineTicks <= 0) {
    return {
      ...normalized,
      world: {
        ...normalized.world,
        lastTickAt: now,
      },
      leaderboard: syncLocalLeaderboard(normalized),
    };
  }

  return runSimulationBatch(
    {
      ...normalized,
      world: {
        ...normalized.world,
        lastTickAt: now - offlineTicks * BASE_TICK_INTERVAL_MS,
      },
    },
    offlineTicks,
    now,
  );
}

export function runSimulationBatch(simulation: SimulationState, steps: number, now = Date.now()) {
  let nextSimulation = normalizeSimulationState(simulation);
  const safeSteps = Math.max(0, Math.floor(steps));

  for (let step = 0; step < safeSteps; step += 1) {
    const remaining = safeSteps - step - 1;
    const tickTimestamp = now - remaining * BASE_TICK_INTERVAL_MS;
    nextSimulation = stepOneTick(nextSimulation, tickTimestamp);
  }

  return {
    ...nextSimulation,
    world: {
      ...nextSimulation.world,
      lastTickAt: now,
    },
  };
}

export function runSimulationTick(simulation: SimulationState, now = Date.now()) {
  return runSimulationBatch(simulation, 1, now);
}
