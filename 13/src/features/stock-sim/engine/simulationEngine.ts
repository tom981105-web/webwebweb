import {
  AMBIENT_TRADE_LOG_LIMIT_PER_TICK,
  BASE_TICK_INTERVAL_MS,
  EVENT_ROLL_CHANCE,
  INITIAL_PLAYER_CASH,
  MARKET_SYSTEMIC_SHOCK_CHANCE,
  MARKET_ROTATION_CHANCE,
  MAX_ACTIVITY_LOG,
  MAX_EVENT_LOG,
  MAX_OFFLINE_CATCHUP_TICKS,
  MAX_TRADE_LOG,
  MICRO_PRICE_MOVE_THRESHOLD,
  SIGNIFICANT_PRICE_MOVE_THRESHOLD,
} from '@/features/stock-sim/constants/config';
import { competitorBlueprints } from '@/features/stock-sim/data/aiTraders';
import {
  chance,
  clamp,
  getRandomEventDuration,
  normalizeSimulationState,
  pickCoolingSector,
  pickDominantSector,
  pickRandom,
  randomBetween,
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
  AiArchetype,
  AiTrader,
  Holding,
  LeaderboardEntry,
  MarketEvent,
  MarketRegime,
  Sector,
  SimulationState,
  Stock,
  Trade,
  TradeSide,
} from '@/features/stock-sim/types';
import {
  getArchetypeLabel,
  getSeoulClockMinutes,
  withSubjectParticle,
} from '@/features/stock-sim/utils/formatters';
import { calculatePlayerNetWorth, calculateReturnRate } from '@/features/stock-sim/utils/portfolio';

function buildEmptyNumberMap(stocks: Stock[]) {
  return Object.fromEntries(stocks.map((stock) => [stock.id, 0])) as Record<string, number>;
}

function buildSectorNumberMap(sectors: Sector[]) {
  return Object.fromEntries(sectors.map((sector) => [sector, 0])) as Record<Sector, number>;
}

type StockSignal = {
  distanceFromBase: number;
  recentChange: number;
  eventBias: number;
  sectorBias: number;
  marketBias: number;
  momentumSignal: number;
  reversionSignal: number;
  fearSignal: number;
  overheating: number;
  bargainSignal: number;
  rumorHeat: number;
};

type ScoredStock = {
  stock: Stock;
  holding?: Holding;
  signal: StockSignal;
  buyScore: number;
  sellScore: number;
  holdScore: number;
  conviction: number;
};

type FlowAccumulator = {
  buyNotional: number;
  sellNotional: number;
  buyCount: number;
  sellCount: number;
  visibleTradeCount: number;
};

type AmbientTradeBundle = {
  significance: number;
  trades: Trade[];
  activity?: ActivityItem;
};

type AiStyleWeights = {
  momentum: number;
  reversion: number;
  event: number;
  sector: number;
  market: number;
  stable: number;
  rumor: number;
  profit: number;
  fear: number;
  hold: number;
  liquiditySupply: number;
};

function buildEmptyFlowBook(stocks: Stock[]) {
  return Object.fromEntries(
    stocks.map((stock) => [
      stock.id,
      {
        buyNotional: 0,
        sellNotional: 0,
        buyCount: 0,
        sellCount: 0,
        visibleTradeCount: 0,
      } satisfies FlowAccumulator,
    ]),
  ) as Record<string, FlowAccumulator>;
}

function recordFlow(
  flowBook: Record<string, FlowAccumulator>,
  stockId: string,
  side: TradeSide,
  notional: number,
  isVisibleTrade: boolean,
) {
  const flow = flowBook[stockId];

  if (!flow || notional <= 0) {
    return;
  }

  if (side === 'buy') {
    flow.buyNotional += notional;
    flow.buyCount += 1;
  } else {
    flow.sellNotional += notional;
    flow.sellCount += 1;
  }

  if (isVisibleTrade) {
    flow.visibleTradeCount += 1;
  }
}

function getFlowSummary(flow: FlowAccumulator) {
  const grossNotional = flow.buyNotional + flow.sellNotional;
  const netNotional = flow.buyNotional - flow.sellNotional;

  return {
    grossNotional,
    netNotional,
    imbalanceRatio: grossNotional > 0 ? netNotional / grossNotional : 0,
  };
}

function getStockReactionProfile(stock: Stock) {
  const isStable = stock.traits.includes('stable');
  const isSpeculative = stock.traits.includes('speculative');
  const isTrendHeavy = stock.traits.includes('trend-heavy');
  const isThemeHeavy = stock.traits.includes('theme-heavy');
  const isNewsSensitive = stock.traits.includes('news-sensitive');
  const isRumorProne = stock.traits.includes('rumor-prone');
  const isVolumeSpike = stock.traits.includes('volume-spike');
  const isDefensive = stock.traits.includes('defensive');

  return {
    marketBeta: clamp(
      0.12 +
        stock.liquidity * 0.16 +
        (isStable ? 0.05 : 0) +
        (isDefensive ? 0.04 : 0) -
        (isRumorProne ? 0.03 : 0),
      0.08,
      0.38,
    ),
    sectorSensitivity: clamp(
      0.42 +
        stock.volatility * 0.24 +
        (isTrendHeavy ? 0.11 : 0) +
        (isThemeHeavy ? 0.08 : 0) -
        (isStable ? 0.07 : 0),
      0.32,
      0.88,
    ),
    eventSensitivity: clamp(
      0.55 +
        stock.volatility * 0.22 +
        (isNewsSensitive ? 0.26 : 0) +
        (isRumorProne ? 0.18 : 0) -
        (isStable ? 0.08 : 0),
      0.45,
      1.28,
    ),
    noiseScale:
      0.0022 +
      stock.volatility * 0.0054 +
      (isSpeculative ? 0.0015 : 0) +
      (isVolumeSpike ? 0.0008 : 0) -
      (isStable ? 0.0008 : 0),
    flowSensitivity: clamp(
      0.46 +
        (1 - stock.liquidity) * 0.42 +
        (isVolumeSpike ? 0.22 : 0) +
        (isSpeculative ? 0.12 : 0),
      0.4,
      1.24,
    ),
    momentumWeight:
      0.0007 +
      (isTrendHeavy ? 0.0007 : 0) +
      (isThemeHeavy ? 0.00035 : 0) +
      (isSpeculative ? 0.00025 : 0),
    marketWeight:
      0.00022 + (isStable ? 0.00008 : 0) + (isDefensive ? 0.00006 : 0),
    sectorWeight:
      0.0006 +
      (isTrendHeavy ? 0.00026 : 0) +
      (isThemeHeavy ? 0.00024 : 0) -
      (isStable ? 0.00014 : 0),
    eventResidualWeight:
      0.0008 +
      (isNewsSensitive ? 0.00035 : 0) +
      (isRumorProne ? 0.00022 : 0),
  };
}

function getEventImpact(stock: Stock, events: MarketEvent[]) {
  const profile = getStockReactionProfile(stock);

  return events.reduce((total, event) => {
    if (event.remainingDuration <= 0) {
      return total;
    }

    if (event.scope === 'market') {
      return total + event.impact * (0.18 + profile.marketBeta * 0.34);
    }

    if (event.affectedStockIds.includes(stock.id)) {
      return total + event.impact * profile.eventSensitivity;
    }

    if (event.affectedSectors.includes(stock.sector)) {
      return total + event.impact * (0.34 + profile.sectorSensitivity * 0.42);
    }

    return total;
  }, 0);
}

function getAiStyleWeights(archetype: AiArchetype): AiStyleWeights {
  switch (archetype) {
    case 'aggressive':
      return {
        momentum: 0.92,
        reversion: 0.18,
        event: 0.58,
        sector: 0.42,
        market: 0.3,
        stable: 0.06,
        rumor: 0.2,
        profit: 0.34,
        fear: 0.24,
        hold: 0.22,
        liquiditySupply: 0.05,
      };
    case 'defensive':
      return {
        momentum: 0.16,
        reversion: 0.64,
        event: 0.18,
        sector: 0.28,
        market: 0.18,
        stable: 0.34,
        rumor: 0.04,
        profit: 0.38,
        fear: 0.18,
        hold: 0.74,
        liquiditySupply: 0.52,
      };
    case 'scalper':
      return {
        momentum: 0.98,
        reversion: 0.16,
        event: 0.36,
        sector: 0.34,
        market: 0.2,
        stable: 0.04,
        rumor: 0.22,
        profit: 0.78,
        fear: 0.32,
        hold: 0.18,
        liquiditySupply: 0.08,
      };
    case 'fearful':
      return {
        momentum: 0.2,
        reversion: 0.18,
        event: 0.24,
        sector: 0.16,
        market: 0.18,
        stable: 0.1,
        rumor: 0.08,
        profit: 0.46,
        fear: 1.04,
        hold: 0.58,
        liquiditySupply: 0.06,
      };
    case 'contrarian':
      return {
        momentum: -0.14,
        reversion: 1.08,
        event: 0.28,
        sector: 0.22,
        market: 0.12,
        stable: 0.12,
        rumor: 0.1,
        profit: 0.62,
        fear: -0.18,
        hold: 0.42,
        liquiditySupply: 0.36,
      };
    case 'theme-chaser':
      return {
        momentum: 0.58,
        reversion: 0.08,
        event: 1.08,
        sector: 0.78,
        market: 0.16,
        stable: 0.02,
        rumor: 0.92,
        profit: 0.42,
        fear: 0.28,
        hold: 0.26,
        liquiditySupply: 0.02,
      };
    case 'whale':
      return {
        momentum: 0.42,
        reversion: 0.44,
        event: 0.54,
        sector: 0.46,
        market: 0.24,
        stable: 0.12,
        rumor: 0.18,
        profit: 0.48,
        fear: 0.2,
        hold: 0.62,
        liquiditySupply: 0.28,
      };
    case 'crowd-follower':
      return {
        momentum: 0.74,
        reversion: 0.14,
        event: 0.42,
        sector: 0.62,
        market: 0.38,
        stable: 0.04,
        rumor: 0.26,
        profit: 0.36,
        fear: 0.46,
        hold: 0.28,
        liquiditySupply: 0.04,
      };
    default:
      return {
        momentum: 0.4,
        reversion: 0.34,
        event: 0.38,
        sector: 0.3,
        market: 0.2,
        stable: 0.08,
        rumor: 0.12,
        profit: 0.34,
        fear: 0.3,
        hold: 0.4,
        liquiditySupply: 0.1,
      };
  }
}

function buildStockSignal(
  stock: Stock,
  sectorMood: SimulationState['sectorMood'],
  marketMood: number,
  activeEvents: MarketEvent[],
  world: SimulationState['world'],
) {
  const distanceFromBase = (stock.currentPrice - stock.basePrice) / stock.basePrice;
  const recentChange = (stock.currentPrice - stock.previousPrice) / stock.previousPrice;
  const eventBias = getEventImpact(stock, activeEvents);
  const sectorBias =
    sectorMood[stock.sector] +
    (stock.sector === world.aiFocusSector ? 0.08 : 0) +
    (stock.sector === world.dominantSector ? 0.06 : 0) -
    (stock.sector === world.coolingSector ? 0.06 : 0);
  const marketBias = marketMood;
  const momentumSignal = clamp(stock.momentum * 0.82 + recentChange * 16, -1.2, 1.2);
  const reversionSignal = clamp(-distanceFromBase * 1.85 - recentChange * 3.2, -1.2, 1.2);
  const fearSignal = clamp(Math.max(0, -recentChange * (5.8 + stock.volatility * 3.2)), 0, 1.2);
  const overheating = clamp(
    Math.max(0, distanceFromBase * 1.7 + Math.max(0, momentumSignal - 0.12)),
    0,
    1.5,
  );
  const bargainSignal = clamp(
    Math.max(0, -distanceFromBase * 1.55 + Math.max(0, -momentumSignal * 0.24)),
    0,
    1.5,
  );
  const rumorHeat = activeEvents.some(
    (event) => event.isRumor && event.affectedStockIds.includes(stock.id),
  )
    ? 1
    : stock.traits.includes('rumor-prone')
      ? clamp(Math.abs(eventBias) * 0.8, 0, 0.8)
      : 0;

  return {
    distanceFromBase,
    recentChange,
    eventBias,
    sectorBias,
    marketBias,
    momentumSignal,
    reversionSignal,
    fearSignal,
    overheating,
    bargainSignal,
    rumorHeat,
  } satisfies StockSignal;
}

function pickWeightedScoreEntry(items: ScoredStock[], direction: 'buy' | 'sell') {
  if (items.length === 0) {
    return null;
  }

  const weighted = items
    .map((entry) => {
      return {
        entry,
        weight: Math.max(
          0.04,
          direction === 'buy' ? entry.buyScore + 0.08 : entry.sellScore + 0.08,
        ),
      };
    })
    .filter((item) => item.weight > 0);

  if (weighted.length === 0) {
    return items[0] ?? null;
  }

  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomBetween(0, totalWeight);

  for (const item of weighted) {
    cursor -= item.weight;

    if (cursor <= 0) {
      return item.entry;
    }
  }

  return weighted.at(-1)?.entry ?? null;
}

function getAiHoldingsValue(aiTrader: AiTrader, stocks: Stock[]) {
  const stockMap = new Map(stocks.map((stock) => [stock.id, stock]));

  return aiTrader.holdings.reduce((sum, holding) => {
    const stock = stockMap.get(holding.stockId);
    return sum + (stock ? holding.quantity * stock.currentPrice : 0);
  }, 0);
}

function scoreStockForAi(
  aiTrader: AiTrader,
  stock: Stock,
  sectorMood: SimulationState['sectorMood'],
  marketMood: number,
  activeEvents: MarketEvent[],
  world: SimulationState['world'],
) {
  const style = getAiStyleWeights(aiTrader.archetype);
  const signal = buildStockSignal(stock, sectorMood, marketMood, activeEvents, world);
  const holding = aiTrader.holdings.find((item) => item.stockId === stock.id);
  const holdingsValue = getAiHoldingsValue(aiTrader, [stock]) + Math.max(aiTrader.cash, 1);
  const stockExposure = holding
    ? (holding.quantity * stock.currentPrice) / Math.max(holdingsValue, stock.currentPrice)
    : 0;
  const preferredSector = aiTrader.preferredSectors.includes(stock.sector) ? 0.18 : 0;
  const watchBonus = aiTrader.watchStockIds.includes(stock.id) ? 0.08 : 0;
  const stableBonus = stock.traits.includes('stable') ? style.stable : 0;
  const volumeBonus = stock.traits.includes('volume-spike') ? 0.06 : 0;
  const aiFavoriteBonus = stock.traits.includes('ai-favorite') ? 0.05 : 0;
  const rumorBias = stock.traits.includes('rumor-prone') ? signal.rumorHeat * style.rumor : 0;
  const overheatPenalty =
    signal.overheating *
    (aiTrader.archetype === 'theme-chaser' || aiTrader.archetype === 'aggressive' ? 0.1 : 0.28);
  const buyScore =
    0.12 +
    preferredSector +
    watchBonus +
    stableBonus +
    volumeBonus +
    aiFavoriteBonus +
    Math.max(0, signal.momentumSignal) * style.momentum +
    Math.max(0, signal.reversionSignal) * style.reversion +
    Math.max(-0.2, signal.eventBias) * style.event +
    Math.max(-0.18, signal.sectorBias) * style.sector +
    Math.max(-0.15, signal.marketBias) * style.market +
    rumorBias +
    signal.bargainSignal * style.reversion * 0.32 -
    stockExposure * 0.3 -
    overheatPenalty +
    randomBetween(-0.06, 0.06);
  const realizedEdge = holding
    ? (stock.currentPrice - holding.averageCost) / holding.averageCost
    : 0;
  const sellScore = holding
    ? 0.08 +
      Math.max(0, realizedEdge) * style.profit +
      Math.max(0, -signal.momentumSignal) * style.fear +
      Math.max(0, -signal.eventBias) * (0.34 + style.event * 0.3) +
      Math.max(0, signal.overheating) * (0.18 + style.liquiditySupply * 0.42) +
      signal.fearSignal * Math.max(0.06, style.fear) +
      stockExposure * 0.46 +
      (world.regime === 'panic' ? Math.max(0, style.fear) * 0.24 : 0) +
      randomBetween(-0.05, 0.05)
    : Number.NEGATIVE_INFINITY;
  const holdScore =
    0.24 +
    style.hold +
    aiTrader.patience * 0.22 +
    Math.max(0, 0.18 - Math.max(buyScore, sellScore)) * 0.4 +
    randomBetween(0, 0.06);

  return {
    stock,
    holding,
    signal,
    buyScore,
    sellScore,
    holdScore,
    conviction: Math.max(buyScore, sellScore) - holdScore,
  } satisfies ScoredStock;
}

function decideAiAction(
  aiTrader: AiTrader,
  scoredStocks: ScoredStock[],
  stocks: Stock[],
  marketMood: number,
  regime: MarketRegime,
) {
  const holdingsValue = getAiHoldingsValue(aiTrader, stocks);
  const totalCapital = aiTrader.cash + holdingsValue;
  const exposure = totalCapital > 0 ? holdingsValue / totalCapital : 0;
  const buyCandidates = scoredStocks
    .filter((entry) => entry.buyScore > 0.12)
    .sort((left, right) => right.buyScore - left.buyScore)
    .slice(0, 4);
  const sellCandidates = scoredStocks
    .filter((entry) => entry.holding && entry.sellScore > 0.1)
    .sort((left, right) => right.sellScore - left.sellScore)
    .slice(0, 3);
  const bestBuyScore = buyCandidates[0]?.buyScore ?? 0;
  const bestSellScore = sellCandidates[0]?.sellScore ?? 0;
  const regimeStress =
    regime === 'panic' ? 0.22 : regime === 'distribution' ? 0.1 : regime === 'rebound' ? -0.06 : 0;
  const buyWeight =
    aiTrader.cash > (buyCandidates[0]?.stock.currentPrice ?? Number.POSITIVE_INFINITY)
      ? Math.max(
          0.02,
          bestBuyScore * (0.72 + aiTrader.aggressiveness * 0.48) * (1 - exposure * 0.4),
        )
      : 0;
  const sellWeight =
    sellCandidates.length > 0
      ? Math.max(
          0.02,
          bestSellScore * (0.76 + aiTrader.fear * 0.26 + exposure * 0.28 + regimeStress),
        )
      : 0;
  const holdWeight = Math.max(
    0.16,
    0.22 +
      aiTrader.patience * 0.38 +
      (1 - aiTrader.tradeFrequency) * 0.24 +
      Math.max(0, 0.26 - Math.max(bestBuyScore, bestSellScore)) * 0.5 -
      aiTrader.aggressiveness * 0.1 -
      Math.abs(marketMood) * 0.04,
  );

  const weightedActions = [
    {
      action: 'buy' as const,
      weight: buyWeight,
    },
    {
      action: 'sell' as const,
      weight: sellWeight,
    },
    {
      action: 'hold' as const,
      weight: holdWeight,
    },
  ].filter((item) => item.weight > 0);
  const totalWeight = weightedActions.reduce((sum, item) => sum + item.weight, 0);
  let cursor = randomBetween(0, totalWeight);

  for (const item of weightedActions) {
    cursor -= item.weight;

    if (cursor <= 0) {
      return {
        action: item.action,
        buyCandidates,
        sellCandidates,
      };
    }
  }

  return {
    action: 'hold' as const,
    buyCandidates,
    sellCandidates,
  };
}

function resolveAiBuyQuantity(aiTrader: AiTrader, target: ScoredStock) {
  const stock = target.stock;
  const convictionBoost = clamp(target.buyScore * 0.42 + target.conviction * 0.32, 0.08, 0.9);
  const archetypeBase =
    aiTrader.archetype === 'whale'
      ? 0.09
      : aiTrader.archetype === 'scalper'
        ? 0.018
        : aiTrader.archetype === 'defensive'
          ? 0.022
          : aiTrader.archetype === 'fearful'
            ? 0.02
            : 0.034;
  const eventLift = Math.max(0, target.signal.eventBias) * 0.42;
  const bargainLift = target.signal.bargainSignal * 0.18;
  const overheatPenalty =
    target.signal.overheating *
    (aiTrader.archetype === 'theme-chaser' ? 0.04 : 0.16);
  const randomLift =
    aiTrader.archetype === 'whale' && chance(0.14)
      ? randomBetween(1.8, 3.2)
      : randomBetween(0.72, 1.4);
  const budgetFraction = clamp(
    (archetypeBase + aiTrader.aggressiveness * 0.035 + eventLift + bargainLift - overheatPenalty) *
      aiTrader.orderSizeBias *
      randomLift *
      convictionBoost,
    0.004,
    aiTrader.archetype === 'whale' ? 0.24 : 0.11,
  );
  const budget = aiTrader.cash * budgetFraction;

  return Math.max(1, Math.floor(budget / stock.currentPrice));
}

function resolveAiSellQuantity(
  aiTrader: AiTrader,
  target: ScoredStock,
  quantity: number,
  regime: MarketRegime,
) {
  const holding = target.holding;
  const stock = target.stock;
  const realizedEdge = holding
    ? (stock.currentPrice - holding.averageCost) / holding.averageCost
    : 0;
  const regimeStress =
    regime === 'panic' ? 0.24 : regime === 'distribution' ? 0.1 : regime === 'rebound' ? -0.06 : 0;
  const archetypeBase =
    aiTrader.archetype === 'whale'
      ? randomBetween(0.14, 0.42)
      : aiTrader.archetype === 'scalper'
        ? randomBetween(0.08, 0.22)
        : aiTrader.archetype === 'defensive'
          ? randomBetween(0.12, 0.28)
          : aiTrader.archetype === 'fearful'
            ? randomBetween(0.18, 0.48)
            : randomBetween(0.14, 0.36);
  const stress =
    Math.max(0, target.sellScore) * 0.34 +
    target.signal.fearSignal * Math.max(0, aiTrader.fear) * 0.38 +
    Math.max(0, realizedEdge) * 0.18 +
    regimeStress;
  const fraction = clamp(
    archetypeBase * aiTrader.orderSizeBias * (0.78 + stress),
    0.06,
    aiTrader.archetype === 'whale' ? 0.9 : 0.68,
  );

  return Math.max(1, Math.floor(quantity * fraction));
}

function resolveTradeReasonTag(
  aiTrader: AiTrader,
  target: ScoredStock,
  side: TradeSide,
) {
  const holding = target.holding;
  const realizedEdge = holding
    ? (target.stock.currentPrice - holding.averageCost) / holding.averageCost
    : 0;

  if (side === 'buy') {
    if (target.signal.eventBias > 0.14 && target.signal.rumorHeat > 0.18) {
      return pickRandom(['루머추종', '테마편승']);
    }

    if (target.signal.eventBias > 0.16) {
      return pickRandom(['이슈추종', '호재선반영']);
    }

    if (target.signal.momentumSignal > 0.22) {
      return aiTrader.archetype === 'scalper'
        ? pickRandom(['단기추격', '초단타진입'])
        : pickRandom(['추격매수', '강세추종']);
    }

    if (target.signal.bargainSignal > 0.18 || aiTrader.archetype === 'contrarian') {
      return pickRandom(['저가매수', '반등선점']);
    }

    if (aiTrader.preferredSectors.includes(target.stock.sector)) {
      return pickRandom(['섹터집중', '주도섹터편입']);
    }

    return pickRandom(['포지션구축', '분할진입']);
  }

  if (realizedEdge > 0.05) {
    return pickRandom(['차익실현', '수익확정']);
  }

  if (target.signal.eventBias < -0.12 || target.signal.fearSignal > 0.22) {
    return aiTrader.archetype === 'fearful'
      ? pickRandom(['공포매도', '손절정리'])
      : pickRandom(['리스크축소', '방어전환']);
  }

  if (target.signal.overheating > 0.2) {
    return pickRandom(['과열정리', '고점경계']);
  }

  return pickRandom(['비중조절', '유동성회수']);
}

function generateStockHeadline(stock: Stock, isPositive: boolean) {
  const positiveTemplates = [
    `${stock.name}, 체결 집중으로 가격 탄력 확대`,
    `${stock.name}, 단기 모멘텀 개선에 자금 유입`,
    `${stock.name}, AI 관심 회복과 함께 매수세 강화`,
  ];

  const negativeTemplates = [
    `${stock.name}, 단기 과열 해소 구간 진입`,
    `${stock.name}, 리스크 회피성 매물로 변동성 확대`,
    `${stock.name}, 차익 실현 물량 증가로 눌림`,
  ];

  return pickRandom(isPositive ? positiveTemplates : negativeTemplates);
}

function generateStockDescription(stock: Stock, isPositive: boolean, dominantSector: Sector) {
  if (isPositive) {
    return `${stock.sector} 안에서도 ${stock.name} 쪽으로 체결이 몰리며 ${dominantSector} 중심 자금 선호가 강화되고 있습니다.`;
  }

  return `${stock.name}에는 단기 매도 압력이 유입되고 있으며 ${stock.sector} 섹터 안에서도 보수적인 자금 배분이 늘고 있습니다.`;
}

function generateSectorHeadline(sector: Sector, isPositive: boolean) {
  return isPositive
    ? `${sector} 섹터, 순환 매수 유입으로 체결 집중`
    : `${sector} 섹터, 차익 실현과 리스크 관리 확산`;
}

function generateSectorDescription(sector: Sector, isPositive: boolean) {
  return isPositive
    ? `${sector} 종목 전반으로 자금이 재유입되고 있으며 단기 추세도 다시 우상향하고 있습니다.`
    : `${sector} 종목군에서는 리스크 축소가 늘고 방어적인 자금 구조가 형성되고 있습니다.`;
}

function generateMarketHeadline(regime: MarketRegime, isPositive: boolean) {
  if (isPositive) {
    return regime === 'rotation' ? '시장 전반 섹터 순환 확장' : '시장 전반 매수 온도 상승';
  }

  return regime === 'panic' ? '시장 전반 리스크 오프 강화' : '시장 전반 차익 실현 확대';
}

function generateMarketDescription(regime: MarketRegime, isPositive: boolean) {
  if (isPositive) {
    return regime === 'rotation'
      ? '섹터 간 자금 이동이 빨라지며 단기 기회가 넓어지고 있습니다.'
      : '광범위한 매수세가 유입되며 추세 주도 섹터의 강도가 살아나고 있습니다.';
  }

  return regime === 'panic'
    ? '공포 신호가 급격히 강해지며 고변동 종목 중심으로 변동성이 커지고 있습니다.'
    : '상승 이후 숨 고르기가 이어지며 보수적인 자금 운용이 늘고 있습니다.';
}

function generateMarketEvent(
  state: SimulationState,
  tick: number,
  timestamp: number,
): MarketEvent | null {
  if (!chance(EVENT_ROLL_CHANCE)) {
    return null;
  }

  const roll = Math.random();
  const dominantSector = state.world.dominantSector;
  const coolingSector = state.world.coolingSector;
  const favoredStocks = state.stocks.filter((stock) => stock.sector === dominantSector);
  const pressuredStocks = state.stocks.filter((stock) => stock.sector === coolingSector);

  if (roll < 0.32) {
    const stockPool = Math.random() > 0.38 && favoredStocks.length > 0 ? favoredStocks : state.stocks;
    const stock = pickRandom(stockPool);
    const duration = getRandomEventDuration();

    return {
      id: uid('event'),
      type: 'bullish-stock',
      scope: 'stock',
      title: generateStockHeadline(stock, true),
      description: generateStockDescription(stock, true, dominantSector),
      affectedStockIds: [stock.id],
      affectedSectors: [stock.sector],
      impact: randomBetween(0.08, 0.16),
      duration,
      remainingDuration: duration,
      createdAt: timestamp,
      tick,
      isRumor: false,
    };
  }

  if (roll < 0.56) {
    const stockPool = pressuredStocks.length > 0 ? pressuredStocks : state.stocks;
    const stock = pickRandom(stockPool);
    const duration = getRandomEventDuration();

    return {
      id: uid('event'),
      type: 'bearish-stock',
      scope: 'stock',
      title: generateStockHeadline(stock, false),
      description: generateStockDescription(stock, false, coolingSector),
      affectedStockIds: [stock.id],
      affectedSectors: [stock.sector],
      impact: -randomBetween(0.08, 0.16),
      duration,
      remainingDuration: duration,
      createdAt: timestamp,
      tick,
      isRumor: false,
    };
  }

  if (roll < 0.78) {
    const sector = Math.random() > 0.45 ? dominantSector : coolingSector;
    const isPositive = sector === dominantSector;
    const duration = getRandomEventDuration();

    return {
      id: uid('event'),
      type: isPositive ? 'sector-boom' : 'sector-scare',
      scope: 'sector',
      title: generateSectorHeadline(sector, isPositive),
      description: generateSectorDescription(sector, isPositive),
      affectedStockIds: [],
      affectedSectors: [sector],
      impact: randomBetween(0.08, 0.15) * (isPositive ? 1 : -1),
      duration,
      remainingDuration: duration,
      createdAt: timestamp,
      tick,
      isRumor: false,
    };
  }

  if (roll < 0.9) {
    const rumorCandidates = state.stocks.filter((item) => item.traits.includes('rumor-prone'));
    const stock = rumorCandidates.length > 0 ? pickRandom(rumorCandidates) : pickRandom(state.stocks);
    const duration = getRandomEventDuration();

    return {
      id: uid('event'),
      type: 'rumor',
      scope: 'stock',
      title: `${stock.name}, 루머와 공식 신호가 엇갈리는 구간`,
      description: `${stock.name} 관련 확인되지 않은 소식이 돌며 단기 체결 강도가 급격히 커지고 있습니다.`,
      affectedStockIds: [stock.id],
      affectedSectors: [stock.sector],
      impact: randomBetween(-0.13, 0.15),
      duration,
      remainingDuration: duration,
      createdAt: timestamp,
      tick,
      isRumor: true,
    };
  }

  const isPositive = state.marketMood >= 0 ? Math.random() > 0.34 : Math.random() > 0.58;
  const duration = getRandomEventDuration();

  return {
    id: uid('event'),
    type: isPositive ? 'market-bull' : 'market-fear',
    scope: 'market',
    title: generateMarketHeadline(state.world.regime, isPositive),
    description: generateMarketDescription(state.world.regime, isPositive),
    affectedStockIds: [],
    affectedSectors: [],
    impact: randomBetween(0.06, 0.13) * (isPositive ? 1 : -1),
    duration,
    remainingDuration: duration,
    createdAt: timestamp,
    tick,
    isRumor: false,
  };
}

function buildAiActivity(
  aiTrader: AiTrader,
  stock: Stock,
  quantity: number,
  side: 'buy' | 'sell',
  tick: number,
  timestamp: number,
  reason: string,
) {
  const sizeLabel =
    quantity >= 70 ? '대량' : quantity >= 35 ? '집중' : quantity >= 15 ? '중간 규모' : '소량';

  const title =
    side === 'buy'
      ? `${getArchetypeLabel(aiTrader.archetype)} AI가 ${stock.name} ${reason}`
      : `${getArchetypeLabel(aiTrader.archetype)} AI가 ${stock.name} ${reason}`;

  const description =
    side === 'buy'
      ? `${withSubjectParticle(aiTrader.name)} ${stock.ticker} ${quantity}주를 ${sizeLabel}로 모으며 ${reason} 흐름을 만들고 있습니다.`
      : `${withSubjectParticle(aiTrader.name)} ${stock.ticker} ${quantity}주를 덜어내며 ${reason} 성격의 매도 압력을 만들고 있습니다.`;

  return {
    id: uid('activity'),
    type: 'trade',
    title,
    description,
    timestamp,
    tick,
    tone: side === 'buy' ? 'positive' : 'negative',
  } satisfies ActivityItem;
}

function buildEventAlert(event: MarketEvent): ActivityItem {
  return {
    id: uid('activity'),
    type: 'alert',
    title: event.title,
    description: event.description,
    timestamp: event.createdAt,
    tick: event.tick,
    tone: event.impact >= 0 ? 'positive' : 'negative',
  };
}

function maybeCreateRotationActivity(
  sectorMood: SimulationState['sectorMood'],
  aiFocusSector: Sector,
  tick: number,
  timestamp: number,
) {
  if (!chance(MARKET_ROTATION_CHANCE)) {
    return null;
  }

  const hottest = pickDominantSector(sectorMood);
  return {
    id: uid('activity'),
    type: 'rotation',
    title: 'AI 자금이 섹터 순환에 맞춰 이동 중',
    description: '강세 섹터에서 냉각 섹터로 일부 자금이 이동하는 순환 장세입니다.',
    timestamp,
    tick,
    tone: hottest === aiFocusSector ? 'positive' : 'neutral',
  } satisfies ActivityItem;
}

function maybeCreateRegimeActivity(
  previousRegime: MarketRegime,
  nextRegime: MarketRegime,
  tick: number,
  timestamp: number,
) {
  if (previousRegime === nextRegime) {
    return null;
  }

  return {
    id: uid('activity'),
    type: 'alert',
    title: '시장 국면 전환 감지',
    description: '시장 중심축이 이전 국면에서 새로운 국면으로 이동하고 있습니다.',
    timestamp,
    tick,
    tone:
      nextRegime === 'markup' || nextRegime === 'rebound'
        ? 'positive'
        : nextRegime === 'panic'
          ? 'negative'
          : 'neutral',
  } satisfies ActivityItem;
}

function buildAmbientReason(signal: StockSignal, dominantSide: TradeSide) {
  if (dominantSide === 'buy') {
    if (signal.eventBias > 0.12 && signal.rumorHeat > 0.12) {
      return pickRandom(['루머추종', '테마유입']);
    }

    if (signal.eventBias > 0.12) {
      return pickRandom(['이슈매수', '뉴스반응']);
    }

    if (signal.bargainSignal > 0.18) {
      return pickRandom(['저가매수 유입', '반등대기 매수']);
    }

    if (signal.momentumSignal > 0.2) {
      return pickRandom(['추격매수', '강세편승']);
    }

    return pickRandom(['기타 시장 매수', '분산 매수 유입']);
  }

  if (signal.eventBias < -0.12) {
    return pickRandom(['악재반응', '뉴스성 매도']);
  }

  if (signal.overheating > 0.18) {
    return pickRandom(['차익실현', '과열 해소']);
  }

  if (signal.fearSignal > 0.2) {
    return pickRandom(['리스크축소', '불안심리 매도']);
  }

  return pickRandom(['익명 매도 물량', '분산 매도 출회']);
}

function buildAmbientFlowForStock(
  stock: Stock,
  signal: StockSignal,
  world: SimulationState['world'],
  systemicOrderBias: number,
) {
  const quietProbability = clamp(
    0.52 -
      world.turnoverIndex * 0.34 -
      Math.abs(signal.eventBias) * 0.9 -
      Math.abs(signal.sectorBias) * 0.42 -
      Math.abs(signal.momentumSignal) * 0.18,
    0.12,
    0.64,
  );

  if (chance(quietProbability)) {
    return {
      buyNotional: 0,
      sellNotional: 0,
      dominantSide: 'buy' as const,
    };
  }

  const eventLinkStrength =
    Math.abs(signal.eventBias) * (stock.traits.includes('news-sensitive') ? 1.18 : 0.94);
  const sectorLinkStrength = Math.abs(signal.sectorBias) * 0.62;
  const themeBoost =
    eventLinkStrength +
    sectorLinkStrength +
    Math.abs(signal.momentumSignal) * 0.2;
  const turnoverBoost = 0.84 + world.turnoverIndex * 0.42;
  const baseShares =
    randomBetween(8, 34) *
    (0.8 + stock.liquidity * 0.55) *
    turnoverBoost *
    (1 + themeBoost);
  const matchedNotional = Math.max(stock.currentPrice * 1.5, baseShares * stock.currentPrice);
  const eventDirectionalBias = signal.eventBias * 0.58;
  const sectorDirectionalBias = signal.sectorBias * 0.3;
  const marketDirectionalBias = signal.marketBias * 0.06;
  const momentumDirectionalBias = signal.momentumSignal * 0.14;
  const reversionDirectionalBias = signal.reversionSignal * 0.07;
  const directionalBias = clamp(
    eventDirectionalBias +
      sectorDirectionalBias +
      marketDirectionalBias +
      momentumDirectionalBias +
      reversionDirectionalBias +
      systemicOrderBias +
      randomBetween(-0.14, 0.14),
    -0.92,
    0.92,
  );
  const liquiditySupplyBias =
    -signal.overheating * 0.16 + signal.bargainSignal * 0.12 + signal.reversionSignal * 0.08;
  const balanceFriction =
    Math.abs(signal.eventBias) < 0.08 &&
    Math.abs(signal.sectorBias) < 0.14 &&
    Math.abs(signal.marketBias) < 0.2
      ? 0.72
      : 1;
  const bias = clamp((directionalBias + liquiditySupplyBias) * balanceFriction, -0.92, 0.92);
  const imbalanceNotional =
    matchedNotional * bias * (0.42 + (1 - stock.liquidity) * 0.28 + stock.volatility * 0.18);
  const buyNotional = Math.max(
    0,
    matchedNotional * 0.5 + Math.max(0, imbalanceNotional),
  );
  const sellNotional = Math.max(
    0,
    matchedNotional * 0.5 + Math.max(0, -imbalanceNotional),
  );

  return {
    buyNotional,
    sellNotional,
    dominantSide: buyNotional >= sellNotional ? ('buy' as const) : ('sell' as const),
  };
}

function createAmbientTrade(
  stock: Stock,
  tick: number,
  timestamp: number,
  side: TradeSide,
  quantity: number,
  note: string,
  actorName: string,
) {
  const normalizedQuantity = Math.max(1, Math.floor(quantity));

  return {
    id: uid('trade'),
    actorType: 'ai',
    actorId: actorName === '유동성 공급자' ? 'ambient-maker' : 'ambient-market',
    actorName,
    stockId: stock.id,
    side,
    quantity: normalizedQuantity,
    price: stock.currentPrice,
    timestamp,
    tick,
    notional: normalizedQuantity * stock.currentPrice,
    note,
  } satisfies Trade;
}

function createAmbientTradeBundle(
  stock: Stock,
  flow: FlowAccumulator,
  signal: StockSignal,
  tick: number,
  timestamp: number,
  changeRate: number,
  isSelectedStock: boolean,
) {
  const { grossNotional, netNotional } = getFlowSummary(flow);

  if (grossNotional <= 0) {
    return null;
  }

  const dominantSide = netNotional >= 0 ? ('buy' as const) : ('sell' as const);
  const dominantNotional = dominantSide === 'buy' ? flow.buyNotional : flow.sellNotional;
  const opposingNotional = dominantSide === 'buy' ? flow.sellNotional : flow.buyNotional;
  const moveMagnitude = Math.abs(changeRate);
  const significance =
    moveMagnitude * 11 +
    Math.abs(netNotional) / Math.max(1, grossNotional) +
    grossNotional / (stock.currentPrice * 120);
  const isBalancedTape =
    grossNotional >= stock.currentPrice * 36 &&
    Math.abs(netNotional) / Math.max(grossNotional, 1) < 0.12;
  const shouldShow =
    isSelectedStock ||
    moveMagnitude >= SIGNIFICANT_PRICE_MOVE_THRESHOLD ||
    dominantNotional >= stock.currentPrice * 20 ||
    isBalancedTape;

  if (!shouldShow) {
    return null;
  }

  const trades: Trade[] = [];
  const dominantReason = buildAmbientReason(signal, dominantSide);
  const actorName =
    moveMagnitude < 0.0012 && opposingNotional > dominantNotional * 0.72
      ? '유동성 공급자'
      : '기타 시장 참여자';
  trades.push(
    createAmbientTrade(
      stock,
      tick,
      timestamp,
      dominantSide,
      dominantNotional / stock.currentPrice,
      dominantReason,
      actorName,
    ),
  );

  if (
    opposingNotional >= stock.currentPrice * 10 &&
    (moveMagnitude < 0.0022 || grossNotional >= stock.currentPrice * 55 || isBalancedTape)
  ) {
    trades.push(
      createAmbientTrade(
        stock,
        tick,
        timestamp + 1,
        dominantSide === 'buy' ? 'sell' : 'buy',
        opposingNotional / stock.currentPrice,
        dominantSide === 'buy' ? '유동성 응답' : '반대매수 대응',
        '유동성 공급자',
      ),
    );
  }

  const activity =
    isSelectedStock || (significance > 1.45 && !isBalancedTape)
      ? ({
          id: uid('activity'),
          type: 'trade',
          title:
            dominantSide === 'buy'
              ? `${stock.name}에 익명 매수세 유입`
              : `${stock.name}에 익명 매도 물량 출회`,
          description:
            dominantSide === 'buy'
              ? `${stock.ticker}에 배경 유동성이 유입되며 ${dominantReason} 성격의 체결이 누적되고 있습니다.`
              : `${stock.ticker}에서 ${dominantReason} 성격의 매도가 누적되며 가격 압박이 형성되고 있습니다.`,
          timestamp,
          tick,
          tone: dominantSide === 'buy' ? 'positive' : 'negative',
        } satisfies ActivityItem)
      : undefined;

  return {
    significance,
    trades,
    activity,
  } satisfies AmbientTradeBundle;
}

function maybeCreateSectorFlowActivity(
  sectorNetOrderFlow: Record<Sector, number>,
  sectorGrossOrderFlow: Record<Sector, number>,
  tick: number,
  timestamp: number,
) {
  const leader = (Object.entries(sectorNetOrderFlow) as [Sector, number][])
    .map(([sector, netFlow]) => ({
      sector,
      netFlow,
      grossFlow: sectorGrossOrderFlow[sector],
    }))
    .sort((left, right) => Math.abs(right.netFlow) - Math.abs(left.netFlow))[0];

  if (!leader || leader.grossFlow < 18_000) {
    return null;
  }

  return {
    id: uid('activity'),
    type: 'rotation',
    title:
      leader.netFlow >= 0
        ? `${leader.sector} 섹터로 매수 우위 유입`
        : `${leader.sector} 섹터에서 매도 압력 확대`,
    description:
      leader.netFlow >= 0
        ? `${leader.sector} 섹터에서 순매수 흐름이 우세해지며 체결 강도가 살아나고 있습니다.`
        : `${leader.sector} 섹터에서 차익 실현과 리스크 축소가 이어지고 있습니다.`,
    timestamp,
    tick,
    tone: leader.netFlow >= 0 ? 'positive' : 'negative',
  } satisfies ActivityItem;
}

function buildAiCandidateStocks(
  aiTrader: AiTrader,
  stocks: Stock[],
  world: SimulationState['world'],
  selectedStockId: string,
) {
  const watchSet = new Set(aiTrader.watchStockIds);
  const heldStockIds = new Set(aiTrader.holdings.map((holding) => holding.stockId));
  const priorityStocks = stocks.filter(
    (stock) =>
      stock.id === selectedStockId ||
      heldStockIds.has(stock.id) ||
      watchSet.has(stock.id) ||
      aiTrader.preferredSectors.includes(stock.sector) ||
      stock.sector === world.aiFocusSector ||
      stock.sector === world.dominantSector ||
      stock.sector === world.coolingSector ||
      stock.traits.includes('ai-favorite'),
  );
  const priorityIds = new Set(priorityStocks.map((stock) => stock.id));
  const remainingStocks = stocks.filter((stock) => !priorityIds.has(stock.id));
  const candidateLimit = Math.min(
    stocks.length,
    aiTrader.archetype === 'whale'
      ? 5
      : aiTrader.archetype === 'theme-chaser'
        ? 8
        : aiTrader.archetype === 'scalper'
          ? 7
          : 6,
  );
  const candidates = [...priorityStocks];

  while (candidates.length < candidateLimit && remainingStocks.length > 0) {
    const randomIndex = Math.floor(Math.random() * remainingStocks.length);
    const [candidate] = remainingStocks.splice(randomIndex, 1);

    if (candidate) {
      candidates.push(candidate);
    }
  }

  if (remainingStocks.length > 0 && chance(0.18)) {
    const surprisePick = pickRandom(remainingStocks);

    if (!candidates.some((item) => item.id === surprisePick.id)) {
      candidates.push(surprisePick);
    }
  }

  return candidates;
}

function updateLeaderboard(
  leaderboard: LeaderboardEntry[],
  stocks: Stock[],
  player: SimulationState['player'],
  sectorMood: SimulationState['sectorMood'],
  marketMood: number,
) {
  return leaderboard.map((entry) => {
    if (entry.kind === 'current-user') {
      const netWorth = calculatePlayerNetWorth(player, stocks);

      return {
        ...entry,
        netWorth,
        returnRate: calculateReturnRate(player, stocks, INITIAL_PLAYER_CASH),
        lastDelta: 0,
      };
    }

    const blueprint = competitorBlueprints.find((candidate) => candidate.id === entry.id);
    const focusCount = blueprint?.focusSectors.length ?? 1;
    const sectorLift =
      blueprint?.focusSectors.reduce((total, sector) => total + sectorMood[sector], 0) ?? marketMood;
    const averageSectorLift = sectorLift / Math.max(1, focusCount);
    const delta =
      marketMood * 0.005 +
      averageSectorLift * (entry.volatility * 0.58) +
      randomBetween(-entry.volatility, entry.volatility);
    const netWorth = roundPrice(entry.netWorth * (1 + delta));
    const baseNetWorth = blueprint?.startingNetWorth ?? INITIAL_PLAYER_CASH;

    return {
      ...entry,
      netWorth,
      returnRate: ((netWorth - baseNetWorth) / baseNetWorth) * 100,
      lastDelta: delta * 100,
    };
  });
}

function resolveNextRegime(
  previous: MarketRegime,
  marketMood: number,
  averageMove: number,
  volatilityIndex: number,
) {
  if (marketMood <= -0.5) {
    return volatilityIndex > 0.55 ? 'panic' : 'distribution';
  }

  if (previous === 'panic' && averageMove > 0.001) {
    return 'rebound';
  }

  if (marketMood >= 0.48) {
    return 'markup';
  }

  if (Math.abs(marketMood) <= 0.14 && Math.abs(averageMove) < 0.0018) {
    return 'accumulation';
  }

  if (marketMood > 0.12 || averageMove > 0) {
    return 'rotation';
  }

  return previous === 'rebound' && marketMood > -0.08 ? 'rebound' : 'distribution';
}

function shouldFillPendingOrder(
  order: SimulationState['pendingOrders'][number],
  stock: Stock,
) {
  if (order.side === 'buy') {
    return stock.currentPrice <= order.targetPrice;
  }

  return stock.currentPrice >= order.targetPrice;
}

function processPendingOrders(
  player: SimulationState['player'],
  pendingOrders: SimulationState['pendingOrders'],
  stocks: Stock[],
  tick: number,
  timestamp: number,
  flowBook: Record<string, FlowAccumulator>,
  sectorGrossOrderFlow: Record<Sector, number>,
  sectorNetOrderFlow: Record<Sector, number>,
  trades: Trade[],
) {
  let nextPlayer = player;
  let nextTrades = trades;
  const nextStocks = [...stocks];
  const remainingOrders: SimulationState['pendingOrders'] = [];

  for (const order of [...pendingOrders].sort((left, right) => left.createdAt - right.createdAt)) {
    const stockIndex = nextStocks.findIndex((stock) => stock.id === order.stockId);

    if (stockIndex < 0) {
      continue;
    }

    const stock = nextStocks[stockIndex];

    if (!shouldFillPendingOrder(order, stock)) {
      remainingOrders.push(order);
      continue;
    }

    const execution = executePlayerOrder(
      nextPlayer,
      stock,
      order.side,
      order.quantity,
      tick,
      stock.currentPrice,
      timestamp,
    );

    if ('error' in execution) {
      remainingOrders.push(order);
      continue;
    }

    nextPlayer = execution.player;
    nextStocks[stockIndex] = applyImmediateTradeImpact(stock, order.side, order.quantity);
    nextTrades = [execution.trade, ...nextTrades].slice(0, MAX_TRADE_LOG);
    recordFlow(flowBook, stock.id, order.side, execution.trade.notional, true);
    sectorGrossOrderFlow[stock.sector] += execution.trade.notional;
    sectorNetOrderFlow[stock.sector] += order.side === 'buy' ? execution.trade.notional : -execution.trade.notional;
  }

  return {
    player: nextPlayer,
    pendingOrders: remainingOrders,
    stocks: nextStocks,
    trades: nextTrades,
  };
}

export function runSimulationTick(
  previousState: SimulationState,
  executedAt = Date.now(),
): SimulationState {
  const state = normalizeSimulationState(previousState);
  const tick = state.tick + 1;
  const flowBook = buildEmptyFlowBook(state.stocks);
  const sectorGrossOrderFlow = buildSectorNumberMap(Object.keys(state.sectorMood) as Sector[]);
  const sectorNetOrderFlow = buildSectorNumberMap(Object.keys(state.sectorMood) as Sector[]);
  const activeEvents = state.events
    .map((event) => ({
      ...event,
      remainingDuration: Math.max(0, event.remainingDuration - 1),
    }))
    .filter((event) => event.remainingDuration > 0);

  const nextEvent = generateMarketEvent(state, tick, executedAt);
  const events = nextEvent
    ? [nextEvent, ...activeEvents].slice(0, MAX_EVENT_LOG)
    : activeEvents.slice(0, MAX_EVENT_LOG);
  const liveEvents = events.filter((event) => event.remainingDuration > 0);

  const nextAiTraders: AiTrader[] = [];
  let nextTrades = state.trades;
  let nextActivity = state.aiActivity;

  if (nextEvent) {
    nextActivity = [buildEventAlert(nextEvent), ...nextActivity].slice(0, MAX_ACTIVITY_LOG);
  }

  for (const aiTrader of state.aiTraders) {
    if (tick < aiTrader.nextDecisionTick) {
      nextAiTraders.push(aiTrader);
      continue;
    }

    const candidateStocks = buildAiCandidateStocks(
      aiTrader,
      state.stocks,
      state.world,
      state.selectedStockId,
    );
    const scoredStocks = candidateStocks
      .map((stock) =>
        scoreStockForAi(
          aiTrader,
          stock,
          state.sectorMood,
          state.marketMood,
          liveEvents,
          state.world,
        ),
      )
      .sort(
        (left, right) =>
          Math.max(right.buyScore, right.sellScore) - Math.max(left.buyScore, left.sellScore),
      );

    const decision = decideAiAction(
      aiTrader,
      scoredStocks,
      state.stocks,
      state.marketMood,
      state.world.regime,
    );
    let updatedAiTrader = aiTrader;
    let didTrade = false;

    if (decision.action === 'sell' && decision.sellCandidates.length > 0) {
      const target = pickWeightedScoreEntry(decision.sellCandidates, 'sell');

      if (target?.holding) {
        const sellSize = resolveAiSellQuantity(
          aiTrader,
          target,
          target.holding.quantity,
          state.world.regime,
        );
        const reason = resolveTradeReasonTag(aiTrader, target, 'sell');
        const execution = executeAiOrder(aiTrader, target.stock, 'sell', sellSize, tick, reason);

        if (execution) {
          didTrade = true;
          updatedAiTrader = execution.aiTrader;
          nextTrades = [execution.trade, ...nextTrades].slice(0, MAX_TRADE_LOG);
          recordFlow(flowBook, target.stock.id, 'sell', execution.trade.notional, true);
          sectorGrossOrderFlow[target.stock.sector] += execution.trade.notional;
          sectorNetOrderFlow[target.stock.sector] -= execution.trade.notional;
          nextActivity = [
            buildAiActivity(aiTrader, target.stock, sellSize, 'sell', tick, executedAt, reason),
            ...nextActivity,
          ].slice(0, MAX_ACTIVITY_LOG);
        }
      }
    } else if (decision.action === 'buy' && decision.buyCandidates.length > 0) {
      const target = pickWeightedScoreEntry(decision.buyCandidates, 'buy');

      if (target && aiTrader.cash > target.stock.currentPrice) {
        const buySize = resolveAiBuyQuantity(aiTrader, target);
        const reason = resolveTradeReasonTag(aiTrader, target, 'buy');
        const execution = executeAiOrder(aiTrader, target.stock, 'buy', buySize, tick, reason);

        if (execution) {
          didTrade = true;
          updatedAiTrader = execution.aiTrader;
          nextTrades = [execution.trade, ...nextTrades].slice(0, MAX_TRADE_LOG);
          recordFlow(flowBook, target.stock.id, 'buy', execution.trade.notional, true);
          sectorGrossOrderFlow[target.stock.sector] += execution.trade.notional;
          sectorNetOrderFlow[target.stock.sector] += execution.trade.notional;
          nextActivity = [
            buildAiActivity(aiTrader, target.stock, buySize, 'buy', tick, executedAt, reason),
            ...nextActivity,
          ].slice(0, MAX_ACTIVITY_LOG);
        }
      }
    }

    nextAiTraders.push({
      ...updatedAiTrader,
      nextDecisionTick: scheduleNextAiDecisionTick(updatedAiTrader, tick, didTrade),
    });
  }

  const activeEventStockIds = new Set(liveEvents.flatMap((event) => event.affectedStockIds));
  const marketEventLift = liveEvents
    .filter((event) => event.scope === 'market')
    .reduce((total, event) => total + event.impact, 0);
  const systemicOrderBias =
    chance(MARKET_SYSTEMIC_SHOCK_CHANCE) || Math.abs(marketEventLift) > 0.08
      ? clamp(marketEventLift * 0.4 + randomBetween(-0.1, 0.1), -0.16, 0.16)
      : randomBetween(-0.03, 0.03);

  const ambientTradeBundles: AmbientTradeBundle[] = [];

  let nextStocks = state.stocks.map((stock) => {
    const signal = buildStockSignal(
      stock,
      state.sectorMood,
      state.marketMood,
      liveEvents,
      state.world,
    );
    const ambientFlow = buildAmbientFlowForStock(stock, signal, state.world, systemicOrderBias);
    recordFlow(flowBook, stock.id, 'buy', ambientFlow.buyNotional, false);
    recordFlow(flowBook, stock.id, 'sell', ambientFlow.sellNotional, false);
    sectorGrossOrderFlow[stock.sector] += ambientFlow.buyNotional + ambientFlow.sellNotional;
    sectorNetOrderFlow[stock.sector] += ambientFlow.buyNotional - ambientFlow.sellNotional;

    const flow = flowBook[stock.id];
    const flowSummary = getFlowSummary(flow);
    const profile = getStockReactionProfile(stock);
    const liquidityDepth =
      stock.currentPrice *
      (95 + stock.liquidity * 220 + Math.min(160, stock.lastVolume / 1_250));
    const grossPressureRatio = flowSummary.grossNotional / Math.max(liquidityDepth, 1);
    const directionalPressureRatio = Math.abs(flowSummary.netNotional) / Math.max(liquidityDepth, 1);
    const balancedTape =
      grossPressureRatio > 0.11 &&
      Math.abs(flowSummary.imbalanceRatio) < 0.11;
    const hasNarrativeSupport =
      activeEventStockIds.has(stock.id) ||
      Math.abs(signal.eventBias) > 0.08 ||
      Math.abs(signal.sectorBias) > 0.18;
    const hasVisibleTape =
      flow.visibleTradeCount > 0 || flowSummary.grossNotional >= stock.currentPrice * 10;
    const imbalanceImpact = clamp(
      (flowSummary.netNotional / Math.max(liquidityDepth, 1)) *
        (0.54 + profile.flowSensitivity * 0.72),
      -0.052,
      0.052,
    );
    const momentumCarry = stock.momentum * profile.momentumWeight;
    const sectorDrift =
      signal.sectorBias *
      profile.sectorWeight *
      (Math.abs(signal.eventBias) > 0.06 || Math.abs(signal.sectorBias) > 0.16 ? 1 : 0.55);
    const marketDrift =
      signal.marketBias *
      profile.marketWeight *
      (Math.abs(signal.eventBias) > 0.08 ? 0.72 : 0.38);
    const eventResidual =
      signal.eventBias *
      profile.eventResidualWeight *
      (directionalPressureRatio > 0.018 ? 1 : 0.42);
    const microNoise =
      flowSummary.grossNotional > stock.currentPrice * 3
        ? randomBetween(-1, 1) * profile.noiseScale * 0.16
        : randomBetween(-1, 1) * 0.00018;
    const hasMeaningfulFlow = directionalPressureRatio >= 0.012 || grossPressureRatio >= 0.085;
    const quietDrift =
      momentumCarry * 0.05 +
      sectorDrift * (hasNarrativeSupport ? 0.18 : 0.08) +
      marketDrift * 0.05 +
      eventResidual * (hasNarrativeSupport ? 0.2 : 0.06) +
      microNoise * (hasNarrativeSupport ? 1 : 0.72);
    const silentMoveCap = hasNarrativeSupport
      ? MICRO_PRICE_MOVE_THRESHOLD * 0.92
      : MICRO_PRICE_MOVE_THRESHOLD * 0.62;
    const hasTradeVolume =
      flow.buyCount + flow.sellCount > 0 || flowSummary.grossNotional >= stock.currentPrice * 0.35;
    const changeRate = clamp(
      hasMeaningfulFlow
        ? imbalanceImpact +
            momentumCarry +
            sectorDrift +
            marketDrift +
            eventResidual +
            microNoise
        : quietDrift,
      hasMeaningfulFlow ? -0.05 : -silentMoveCap,
      hasMeaningfulFlow ? 0.05 : silentMoveCap,
    );
    const finalChangeRate = !hasTradeVolume
      ? 0
      : balancedTape
        ? clamp(changeRate * 0.24, -0.0009, 0.0009)
        : !hasVisibleTape && !hasNarrativeSupport
          ? clamp(changeRate, -MICRO_PRICE_MOVE_THRESHOLD * 0.75, MICRO_PRICE_MOVE_THRESHOLD * 0.75)
          : directionalPressureRatio < 0.009
            ? clamp(changeRate, -0.00105, 0.00105)
            : changeRate;

    const nextPrice = finalChangeRate === 0
      ? stock.currentPrice
      : roundPrice(stock.currentPrice * (1 + finalChangeRate));

    const ambientTradeBundle = hasTradeVolume
      ? createAmbientTradeBundle(
          stock,
          flow,
          signal,
          tick,
          executedAt,
          finalChangeRate,
          stock.id === state.selectedStockId || activeEventStockIds.has(stock.id),
        )
      : null;

    if (
      ambientTradeBundle &&
      (flow.visibleTradeCount === 0 || Math.abs(finalChangeRate) >= SIGNIFICANT_PRICE_MOVE_THRESHOLD)
    ) {
      ambientTradeBundles.push(ambientTradeBundle);
    }
    const netOrderBias = flowSummary.imbalanceRatio;

    return {
      ...stock,
      previousPrice: stock.currentPrice,
      currentPrice: nextPrice,
      momentum: clamp(
        stock.momentum * 0.74 + finalChangeRate * 4.2 + netOrderBias * 0.34,
        -1.25,
        1.25,
      ),
      sentiment: clamp(
        stock.sentiment * 0.84 +
          signal.eventBias * 0.14 +
          signal.sectorBias * 0.05 +
          signal.marketBias * 0.018 +
          netOrderBias * 0.12,
        -1,
        1,
      ),
      lastVolume: Math.max(
        4_000,
        stock.lastVolume * 0.36 +
          flowSummary.grossNotional * 0.62 +
          Math.abs(flowSummary.netNotional) * 0.08,
      ),
      priceHistory: trimHistory([...stock.priceHistory, nextPrice]),
      volumeHistory: trimHistory([
        ...stock.volumeHistory,
        Math.max(0, Math.round(flowSummary.grossNotional)),
      ]),
      tradeCountHistory: trimHistory([
        ...stock.tradeCountHistory,
        flow.buyCount + flow.sellCount,
      ]),
    };
  });

  const appliedAmbientTrades = ambientTradeBundles
    .sort((left, right) => right.significance - left.significance)
    .slice(0, AMBIENT_TRADE_LOG_LIMIT_PER_TICK);

  for (const bundle of appliedAmbientTrades) {
    for (const trade of bundle.trades.reverse()) {
      nextTrades = [trade, ...nextTrades].slice(0, MAX_TRADE_LOG);
    }

    if (bundle.activity) {
      nextActivity = [bundle.activity, ...nextActivity].slice(0, MAX_ACTIVITY_LOG);
    }
  }

  const pendingResolution = processPendingOrders(
    state.player,
    state.pendingOrders,
    nextStocks,
    tick,
    executedAt,
    flowBook,
    sectorGrossOrderFlow,
    sectorNetOrderFlow,
    nextTrades,
  );
  nextStocks = pendingResolution.stocks;
  nextTrades = pendingResolution.trades;

  const stockMoveMap = buildEmptyNumberMap(nextStocks);
  const sectorMoves = Object.fromEntries(
    Object.keys(state.sectorMood).map((sector) => [sector, [] as number[]]),
  ) as Record<Sector, number[]>;

  for (const stock of nextStocks) {
    const move = (stock.currentPrice - stock.previousPrice) / Math.max(stock.previousPrice, 1);
    stockMoveMap[stock.id] = move;
    sectorMoves[stock.sector].push(move);
  }

  const averageMove =
    Object.values(stockMoveMap).reduce((total, value) => total + value, 0) / nextStocks.length;
  const averageAbsMove =
    Object.values(stockMoveMap).reduce((total, value) => total + Math.abs(value), 0) /
    nextStocks.length;
  const totalNetOrderFlow = Object.values(flowBook).reduce(
    (total, flow) => total + flow.buyNotional - flow.sellNotional,
    0,
  );
  const totalGrossOrderFlow = Object.values(flowBook).reduce(
    (total, flow) => total + flow.buyNotional + flow.sellNotional,
    0,
  );
  const marketMood = clamp(
    state.marketMood * 0.9 +
      averageMove * 1.24 +
      clamp(totalNetOrderFlow / Math.max(totalGrossOrderFlow, 1), -1, 1) * 0.24 +
      marketEventLift * 0.1 +
      randomBetween(-0.014, 0.014),
    -1,
    1,
  );

  const sectorMood = Object.fromEntries(
    (Object.keys(state.sectorMood) as Sector[]).map((sector) => {
      const moves = sectorMoves[sector];
      const sectorAverage =
        moves.length > 0 ? moves.reduce((total, value) => total + value, 0) / moves.length : 0;
      const sectorEventImpact = liveEvents
        .filter((event) => event.affectedSectors.includes(sector))
        .reduce((total, event) => total + event.impact, 0);
      const sectorNetBias = clamp(
        sectorNetOrderFlow[sector] / Math.max(sectorGrossOrderFlow[sector], 1),
        -1,
        1,
      );

      return [
        sector,
        clamp(
          state.sectorMood[sector] * 0.86 +
            sectorAverage * 1.95 +
            sectorEventImpact * 0.22 +
            sectorNetBias * 0.28 +
            randomBetween(-0.016, 0.016),
          -1,
          1,
        ),
      ];
    }),
  ) as SimulationState['sectorMood'];

  const dominantSector = pickDominantSector(sectorMood);
  const coolingSector = pickCoolingSector(sectorMood);
  const aiFocusSector = (Object.entries(sectorGrossOrderFlow) as [Sector, number][])
    .sort((left, right) => right[1] - left[1])[0]?.[0] ?? dominantSector;
  const turnoverIndex = clamp(
    state.world.turnoverIndex * 0.74 +
      Math.min(1, totalGrossOrderFlow / 620_000) * 0.48 +
      averageAbsMove * 3.6,
    0,
    1,
  );
  const volatilityIndex = clamp(
    state.world.volatilityIndex * 0.72 +
      averageAbsMove * 8.8 +
      liveEvents.length * 0.012,
    0,
    1,
  );
  const liquidityIndex = clamp(
    state.world.liquidityIndex * 0.82 +
      marketMood * 0.1 +
      turnoverIndex * 0.12 -
      volatilityIndex * 0.04,
    -1,
    1,
  );
  const nextRegime = resolveNextRegime(
    state.world.regime,
    marketMood,
    averageMove,
    volatilityIndex,
  );
  const nextClockMinutes = getSeoulClockMinutes(executedAt);
  const nextTickTimestamps = trimHistory([...state.world.tickTimestamps, executedAt]);
  const nextSimulationElapsedMinutes = Math.max(
    1,
    Math.round(
      ((nextTickTimestamps.at(-1) ?? executedAt) -
        (nextTickTimestamps[0] ?? executedAt)) /
        60_000,
    ),
  );

  const rotationActivity = maybeCreateRotationActivity(
    sectorMood,
    aiFocusSector,
    tick,
    executedAt,
  );
  const regimeActivity = maybeCreateRegimeActivity(
    state.world.regime,
    nextRegime,
    tick,
    executedAt,
  );
  const sectorFlowActivity = maybeCreateSectorFlowActivity(
    sectorNetOrderFlow,
    sectorGrossOrderFlow,
    tick,
    executedAt,
  );

  if (rotationActivity) {
    nextActivity = [rotationActivity, ...nextActivity].slice(0, MAX_ACTIVITY_LOG);
  }

  if (regimeActivity) {
    nextActivity = [regimeActivity, ...nextActivity].slice(0, MAX_ACTIVITY_LOG);
  }

  if (sectorFlowActivity) {
    nextActivity = [sectorFlowActivity, ...nextActivity].slice(0, MAX_ACTIVITY_LOG);
  }

  const leaderboard =
    tick % 4 === 0
      ? updateLeaderboard(
          state.leaderboard,
          nextStocks,
          pendingResolution.player,
          sectorMood,
          marketMood,
        )
      : state.leaderboard;

  return {
    ...state,
    tick,
    marketMood,
    sectorMood,
    stocks: nextStocks,
    player: pendingResolution.player,
    pendingOrders: pendingResolution.pendingOrders,
    aiTraders: nextAiTraders,
    trades: nextTrades,
    events,
    aiActivity: nextActivity,
    leaderboard,
    world: {
      ...state.world,
      lastTickAt: executedAt,
      marketClockMinutes: nextClockMinutes,
      simulationElapsedMinutes: nextSimulationElapsedMinutes,
      tickTimestamps: nextTickTimestamps,
      dayCount: Math.max(1, Math.floor(nextSimulationElapsedMinutes / 1_440) + 1),
      regime: nextRegime,
      liquidityIndex,
      volatilityIndex,
      turnoverIndex,
      dominantSector,
      coolingSector,
      aiFocusSector,
    },
  };
}

export function runSimulationBatch(
  state: SimulationState,
  steps: number,
  executedAt = Date.now(),
) {
  const normalized = normalizeSimulationState(state);
  const safeSteps = Math.max(0, Math.floor(steps));

  if (safeSteps === 0) {
    return normalized;
  }

  let nextState = normalized;
  const tickDuration = BASE_TICK_INTERVAL_MS / Math.max(1, normalized.speed);
  const startTime = normalized.world.lastTickAt;

  for (let index = 0; index < safeSteps; index += 1) {
    const tickTimestamp = Math.min(executedAt, startTime + tickDuration * (index + 1));
    nextState = runSimulationTick(nextState, tickTimestamp);
  }

  return nextState;
}

export function hydratePersistentSimulation(
  state: SimulationState,
  executedAt = Date.now(),
) {
  const normalized = normalizeSimulationState(state);

  if (!normalized.isRunning) {
    return normalized;
  }

  const tickDuration = BASE_TICK_INTERVAL_MS / Math.max(1, normalized.speed);
  const elapsed = Math.max(0, executedAt - normalized.world.lastTickAt);
  const dueSteps = Math.min(MAX_OFFLINE_CATCHUP_TICKS, Math.floor(elapsed / tickDuration));

  if (dueSteps <= 0) {
    return normalized;
  }

  return runSimulationBatch(
    normalized,
    dueSteps,
    normalized.world.lastTickAt + dueSteps * tickDuration,
  );
}
