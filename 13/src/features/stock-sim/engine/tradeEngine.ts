import { clamp, roundPrice, trimHistory, uid } from '@/features/stock-sim/engine/helpers';
import type { AiTrader, Holding, Player, Stock, Trade, TradeSide } from '@/features/stock-sim/types';

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

export function applyImmediateTradeImpact(stock: Stock, side: TradeSide, quantity: number) {
  const orderDepth = clamp((quantity * stock.currentPrice) / (stock.liquidity * 110_000), 0, 0.015);
  const direction = side === 'buy' ? 1 : -1;
  const nextPrice = roundPrice(stock.currentPrice * (1 + orderDepth * direction));
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
    currentPrice: nextPrice,
    momentum: clamp(stock.momentum + direction * orderDepth * 3.6, -1.2, 1.2),
    sentiment: clamp(stock.sentiment + direction * orderDepth * 2.2, -1, 1),
    lastVolume: stock.lastVolume + notional,
    priceHistory: trimHistory(replaceLast(stock.priceHistory, nextPrice)),
    volumeHistory: trimHistory(
      replaceLast(stock.volumeHistory, (stock.volumeHistory.at(-1) ?? 0) + Math.round(notional)),
    ),
    tradeCountHistory: trimHistory(
      replaceLast(stock.tradeCountHistory, (stock.tradeCountHistory.at(-1) ?? 0) + 1),
    ),
  };
}
