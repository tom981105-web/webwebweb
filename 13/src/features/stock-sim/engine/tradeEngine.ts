import { clamp, roundPrice, trimHistory, uid } from '@/features/stock-sim/engine/helpers';
import type {
  AiTrader,
  Holding,
  Player,
  Stock,
  StockLimitState,
  Trade,
  TradeSide,
} from '@/features/stock-sim/types';

function upsertHolding(
  holdings: Holding[],
  stockId: string,
  nextHolding: Holding | null,
) {
  const withoutCurrent = holdings.filter((holding) => holding.stockId !== stockId);

  if (!nextHolding || nextHolding.quantity <= 0) {
    return withoutCurrent;
  }

  return [...withoutCurrent, nextHolding];
}

function getTradeBlockReason(stock: Stock, side: TradeSide) {
  if (stock.status === 'DELISTED') {
    return '상장폐지 종목은 거래할 수 없습니다.';
  }

  if (stock.status === 'HALTED') {
    return stock.haltReason
      ? `거래정지 중입니다. (${stock.haltReason})`
      : '거래정지 종목은 거래할 수 없습니다.';
  }

  if (stock.dailyLimitState === 'upper-limit' && side === 'buy') {
    return '상한가 상태에서는 추가 매수가 제한됩니다.';
  }

  if (stock.dailyLimitState === 'lower-limit' && side === 'sell') {
    return '하한가 상태에서는 추가 매도가 제한됩니다.';
  }

  return null;
}

export function executePlayerOrder(
  player: Player,
  stock: Stock,
  side: TradeSide,
  quantity: number,
  tick: number,
  executionPrice = stock.currentPrice,
  timestamp = Date.now(),
): { player: Player; trade: Trade } | { error: string } {
  const normalizedQuantity = Math.floor(quantity);

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    return { error: '수량은 1주 이상이어야 합니다.' };
  }

  const blockedReason = getTradeBlockReason(stock, side);
  if (blockedReason) {
    return { error: blockedReason };
  }

  const existingHolding = player.holdings.find((holding) => holding.stockId === stock.id);

  if (side === 'buy') {
    const cost = normalizedQuantity * executionPrice;

    if (player.cash < cost) {
      return { error: '보유 현금이 부족합니다.' };
    }

    const existingQuantity = existingHolding?.quantity ?? 0;
    const existingCost = (existingHolding?.averageCost ?? 0) * existingQuantity;
    const nextQuantity = existingQuantity + normalizedQuantity;
    const nextAverageCost = (existingCost + cost) / nextQuantity;
    const updatedHolding: Holding = {
      stockId: stock.id,
      quantity: nextQuantity,
      averageCost: nextAverageCost,
    };

    const trade: Trade = {
      id: uid('trade'),
      actorType: 'user',
      actorId: player.id,
      actorName: player.name,
      stockId: stock.id,
      side,
      quantity: normalizedQuantity,
      price: executionPrice,
      timestamp,
      tick,
      notional: cost,
    };

    return {
      player: {
        ...player,
        cash: roundPrice(player.cash - cost),
        holdings: upsertHolding(player.holdings, stock.id, updatedHolding),
        tradeHistory: [trade.id, ...player.tradeHistory].slice(0, 40),
      },
      trade,
    };
  }

  if (!existingHolding || existingHolding.quantity < normalizedQuantity) {
    return { error: '보유 수량보다 많이 매도할 수 없습니다.' };
  }

  const realizedPnL = (executionPrice - existingHolding.averageCost) * normalizedQuantity;
  const nextQuantity = existingHolding.quantity - normalizedQuantity;
  const updatedHolding =
    nextQuantity > 0
      ? {
          ...existingHolding,
          quantity: nextQuantity,
        }
      : null;

  const proceeds = normalizedQuantity * executionPrice;
  const trade: Trade = {
    id: uid('trade'),
    actorType: 'user',
    actorId: player.id,
    actorName: player.name,
    stockId: stock.id,
    side,
    quantity: normalizedQuantity,
    price: executionPrice,
    timestamp,
    tick,
    notional: proceeds,
  };

  return {
    player: {
      ...player,
      cash: roundPrice(player.cash + proceeds),
      holdings: upsertHolding(player.holdings, stock.id, updatedHolding),
      realizedPnL: roundPrice(player.realizedPnL + realizedPnL),
      tradeHistory: [trade.id, ...player.tradeHistory].slice(0, 40),
    },
    trade,
  };
}

export function executeAiOrder(
  aiTrader: AiTrader,
  stock: Stock,
  side: TradeSide,
  quantity: number,
  tick: number,
  note?: string,
  executionPrice = stock.currentPrice,
  timestamp = Date.now(),
): { aiTrader: AiTrader; trade: Trade } | null {
  const normalizedQuantity = Math.floor(quantity);

  if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
    return null;
  }

  if (getTradeBlockReason(stock, side)) {
    return null;
  }

  const existingHolding = aiTrader.holdings.find((holding) => holding.stockId === stock.id);

  if (side === 'buy') {
    const cost = normalizedQuantity * executionPrice;

    if (aiTrader.cash < cost) {
      return null;
    }

    const existingQuantity = existingHolding?.quantity ?? 0;
    const existingCost = (existingHolding?.averageCost ?? 0) * existingQuantity;
    const nextQuantity = existingQuantity + normalizedQuantity;
    const nextAverageCost = (existingCost + cost) / nextQuantity;

    const trade: Trade = {
      id: uid('trade'),
      actorType: 'ai',
      actorId: aiTrader.id,
      actorName: aiTrader.name,
      stockId: stock.id,
      side,
      quantity: normalizedQuantity,
      price: executionPrice,
      timestamp,
      tick,
      notional: cost,
      note,
    };

    return {
      aiTrader: {
        ...aiTrader,
        cash: roundPrice(aiTrader.cash - cost),
        holdings: upsertHolding(aiTrader.holdings, stock.id, {
          stockId: stock.id,
          quantity: nextQuantity,
          averageCost: nextAverageCost,
        }),
        lastActionTick: tick,
      },
      trade,
    };
  }

  if (!existingHolding || existingHolding.quantity < normalizedQuantity) {
    return null;
  }

  const remainingQuantity = existingHolding.quantity - normalizedQuantity;
  const proceeds = normalizedQuantity * executionPrice;
  const trade: Trade = {
    id: uid('trade'),
    actorType: 'ai',
    actorId: aiTrader.id,
    actorName: aiTrader.name,
    stockId: stock.id,
    side,
    quantity: normalizedQuantity,
    price: executionPrice,
    timestamp,
    tick,
    notional: proceeds,
    note,
  };

  return {
    aiTrader: {
      ...aiTrader,
      cash: roundPrice(aiTrader.cash + proceeds),
      holdings: upsertHolding(
        aiTrader.holdings,
        stock.id,
        remainingQuantity > 0 ? { ...existingHolding, quantity: remainingQuantity } : null,
      ),
      lastActionTick: tick,
    },
    trade,
  };
}

export function applyImmediateTradeImpact(
  stock: Stock,
  side: TradeSide,
  quantity: number,
): Stock {
  const orderDepth = clamp((quantity * Math.max(stock.currentPrice, 1)) / (stock.liquidity * 110_000), 0, 0.015);
  const direction = side === 'buy' ? 1 : -1;
  const nextPrice = roundPrice(stock.currentPrice * (1 + orderDepth * direction));
  const clampedPrice = Math.min(
    Math.max(nextPrice, stock.dailyLowerLimit),
    stock.dailyUpperLimit,
  );
  const dailyLimitState: StockLimitState =
    clampedPrice >= stock.dailyUpperLimit
      ? 'upper-limit'
      : clampedPrice <= stock.dailyLowerLimit
        ? 'lower-limit'
        : 'normal';
  const notional = quantity * stock.currentPrice;
  const replaceLast = <T,>(history: T[], nextValue: T) => {
    if (history.length === 0) {
      return [nextValue];
    }

    return [...history.slice(0, -1), nextValue];
  };

  return {
    ...stock,
    previousPrice: stock.currentPrice,
    currentPrice: stock.status === 'DELISTED' ? 0 : clampedPrice,
    momentum: clamp(stock.momentum + direction * orderDepth * 3.6, -1.2, 1.2),
    sentiment: clamp(stock.sentiment + direction * orderDepth * 2.2, -1, 1),
    lastVolume: stock.lastVolume + notional,
    dailyLimitState,
    dayHighPrice: Math.max(stock.dayHighPrice, clampedPrice),
    dayLowPrice: Math.min(stock.dayLowPrice, clampedPrice),
    sessionVolume: stock.sessionVolume + notional,
    priceHistory: trimHistory(replaceLast(stock.priceHistory, clampedPrice)),
    volumeHistory: trimHistory(
      replaceLast(stock.volumeHistory, (stock.volumeHistory.at(-1) ?? 0) + Math.round(notional)),
    ),
    tradeCountHistory: trimHistory(
      replaceLast(stock.tradeCountHistory, (stock.tradeCountHistory.at(-1) ?? 0) + 1),
    ),
  };
}
