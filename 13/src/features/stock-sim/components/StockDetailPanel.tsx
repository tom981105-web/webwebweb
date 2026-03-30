import {
  memo,
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Bot, CandlestickChart, Minus, Plus, Target } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import { useElementSize } from '@/features/stock-sim/hooks/useElementSize';
import type {
  ActivityItem,
  ChartTimeframe,
  MarketEvent,
  PendingOrder,
  Player,
  SelectedStockSnapshot,
} from '@/features/stock-sim/types';
import {
  CHART_TIMEFRAME_OPTIONS,
  aggregateChartData,
} from '@/features/stock-sim/utils/chart';
import {
  calculateHoldingPnL,
  findHolding,
} from '@/features/stock-sim/utils/portfolio';
import {
  formatClock,
  formatCompactNumber,
  formatCurrency,
  formatPercent,
  formatPrice,
  getTraitLabel,
} from '@/features/stock-sim/utils/formatters';

type StockDetailPanelProps = {
  stock: SelectedStockSnapshot;
  player: Player;
  pendingOrders: PendingOrder[];
  relevantEvents: MarketEvent[];
  aiActivity: ActivityItem[];
  chartTimeframe: ChartTimeframe;
  onChartTimeframeChange: (timeframe: ChartTimeframe) => void;
  onPlaceOrder: (side: 'buy' | 'sell', quantity: number) => void;
  onPlacePendingOrder: (side: 'buy' | 'sell', quantity: number, targetPrice: number) => void;
  onCancelPendingOrder: (orderId: string) => void;
};

type ChartRow = {
  label: string;
  open: number;
  price: number;
  smooth: number;
  high: number;
  low: number;
  volume: number;
  tradeCount: number;
};

function buildRecentTape(priceHistory: number[]) {
  return priceHistory.slice(-8).map((value, index, history) => {
    const previous = index === 0 ? history[0] : history[index - 1];

    return {
      id: `${index}-${value}`,
      value,
      delta: value - previous,
    };
  });
}

function buildChartRows(points: ReturnType<typeof aggregateChartData>): ChartRow[] {
  return points.map((point, index, history) => {
    const sample = history.slice(Math.max(0, index - 3), index + 1);
    const smooth = sample.reduce((sum, entry) => sum + entry.close, 0) / sample.length;

    return {
      label: point.label,
      open: Number(point.open.toFixed(2)),
      price: Number(point.close.toFixed(2)),
      smooth: Number(smooth.toFixed(2)),
      high: Number(point.high.toFixed(2)),
      low: Number(point.low.toFixed(2)),
      volume: point.volume,
      tradeCount: point.tradeCount,
    };
  });
}

export const StockDetailPanel = memo(function StockDetailPanel({
  stock,
  player,
  pendingOrders,
  relevantEvents,
  aiActivity,
  chartTimeframe,
  onChartTimeframeChange,
  onPlaceOrder,
  onPlacePendingOrder,
  onCancelPendingOrder,
}: StockDetailPanelProps) {
  const [quantity, setQuantity] = useState(1);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [pendingTargetPrice, setPendingTargetPrice] = useState(() =>
    Number(stock.currentPrice.toFixed(2)),
  );
  const holding = findHolding(player.holdings, stock.id);
  const deferredPriceHistory = useDeferredValue(stock.priceHistory);
  const deferredVolumeHistory = useDeferredValue(stock.volumeHistory);
  const deferredTradeCountHistory = useDeferredValue(stock.tradeCountHistory);
  const { elementRef, size } = useElementSize<HTMLDivElement>();

  const maxBuy = Math.floor(player.cash / stock.currentPrice);
  const maxSell = holding?.quantity ?? 0;
  const orderLimit = side === 'buy' ? maxBuy : maxSell;
  const estimatedCost = stock.currentPrice * quantity;
  const holdingValue = (holding?.quantity ?? 0) * stock.currentPrice;
  const unrealizedPnL = holding ? calculateHoldingPnL(holding, stock) : 0;
  const projectedCash =
    side === 'buy' ? player.cash - estimatedCost : player.cash + estimatedCost;
  const changeRate =
    ((stock.currentPrice - stock.previousPrice) / Math.max(stock.previousPrice, 1)) * 100;
  const positive = changeRate >= 0;
  const timeframeLabel =
    CHART_TIMEFRAME_OPTIONS.find((option) => option.value === chartTimeframe)?.label ?? '1틱';

  const aggregated = useMemo(
    () =>
      aggregateChartData(
        deferredPriceHistory,
        deferredVolumeHistory,
        deferredTradeCountHistory,
        stock.tickTimestamps,
        chartTimeframe,
      ),
    [
      chartTimeframe,
      deferredPriceHistory,
      deferredTradeCountHistory,
      deferredVolumeHistory,
      stock.tickTimestamps,
    ],
  );
  const chartData = useMemo(() => buildChartRows(aggregated), [aggregated]);
  const deferredChartData = useDeferredValue(chartData);
  const latestBucket = deferredChartData.at(-1);
  const recentTape = useMemo(() => buildRecentTape(stock.priceHistory), [stock.priceHistory]);
  const relatedAiActivity = useMemo(
    () =>
      aiActivity
        .filter(
          (item) =>
            item.title.includes(stock.name) ||
            item.description.includes(stock.name) ||
            item.description.includes(stock.ticker) ||
            item.description.includes(stock.sector),
        )
        .slice(0, 6),
    [aiActivity, stock.name, stock.sector, stock.ticker],
  );
  const stockPendingOrders = useMemo(
    () =>
      pendingOrders
        .filter((order) => order.stockId === stock.id)
        .sort((left, right) => right.createdAt - left.createdAt),
    [pendingOrders, stock.id],
  );

  const sessionSource =
    aggregated.length > 0 ? aggregated.map((point) => point.close) : stock.priceHistory;
  const sessionHigh = Math.max(
    ...(aggregated.length > 0 ? aggregated.map((point) => point.high) : stock.priceHistory),
  );
  const sessionLow = Math.min(
    ...(aggregated.length > 0 ? aggregated.map((point) => point.low) : stock.priceHistory),
  );
  const sessionAverage =
    sessionSource.reduce((sum, price) => sum + price, 0) / Math.max(sessionSource.length, 1);
  const sessionRange =
    ((sessionHigh - sessionLow) / Math.max(sessionAverage, 1)) * 100;

  const orderWarning =
    side === 'buy'
      ? maxBuy <= 0
        ? '주문 가능한 현금이 부족합니다.'
        : quantity > maxBuy
          ? '주문 수량이 보유 현금을 초과합니다.'
          : null
      : maxSell <= 0
        ? '보유 수량이 없어 매도할 수 없습니다.'
        : quantity > maxSell
          ? '주문 수량이 보유 수량을 초과합니다.'
          : null;
  const pendingOrderWarning =
    side === 'buy'
      ? pendingTargetPrice > stock.currentPrice
        ? '예약 매수는 현재가 이하에서만 설정할 수 있습니다.'
        : quantity > maxBuy
          ? '예약 수량이 현재 보유 현금을 초과합니다.'
          : null
      : pendingTargetPrice < stock.currentPrice
        ? '예약 매도는 현재가 이상에서만 설정할 수 있습니다.'
        : quantity > maxSell
          ? '예약 수량이 현재 보유 수량을 초과합니다.'
          : null;

  useEffect(() => {
    setQuantity(1);
    setSide('buy');
    setPendingTargetPrice(Number(stock.currentPrice.toFixed(2)));
  }, [stock.id]);

  return (
    <Panel
      title={`${stock.name} (${stock.ticker})`}
      subtitle={stock.description}
      icon={<CandlestickChart className="ss-h-5 ss-w-5" />}
      className="ss-h-full"
      bodyClassName="ss-flex ss-h-full ss-min-h-0 ss-flex-col"
      tone="feature"
    >
      <div className="ss-grid ss-flex-1 ss-min-h-0 ss-gap-5 2xl:ss-grid-cols-[minmax(0,1.18fr)_minmax(320px,0.82fr)]">
        <div className="ss-flex ss-min-h-0 ss-flex-col ss-gap-4">
          <section className="ss-ui-soft-card-strong ss-rounded-[28px] ss-p-5">
            <div className="ss-flex ss-flex-col ss-gap-5 xl:ss-flex-row xl:ss-items-start xl:ss-justify-between">
              <div className="ss-min-w-0">
                <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
                  <span className="ss-ui-chip ss-ui-chip-info">{stock.sector}</span>
                  {stock.traits.map((trait) => (
                    <span key={trait} className="ss-ui-chip">
                      {getTraitLabel(trait)}
                    </span>
                  ))}
                </div>
                <div className="ss-mt-5 ss-flex ss-flex-wrap ss-items-end ss-gap-3">
                  <p className="ss-font-display ss-text-4xl ss-font-semibold ss-leading-none ss-text-white lg:ss-text-[3.2rem]">
                    {formatPrice(stock.currentPrice)}
                  </p>
                  <span
                    className={`ss-ui-chip ${
                      positive ? 'ss-ui-chip-positive' : 'ss-ui-chip-negative'
                    } ss-mb-1`}
                  >
                    {formatPercent(changeRate)}
                  </span>
                </div>
                <p
                  className={`ss-mt-3 ss-text-sm ss-font-medium ${
                    positive ? 'ss-ui-number-up' : 'ss-ui-number-down'
                  }`}
                >
                  직전 가격 {formatPrice(stock.previousPrice)} 대비{' '}
                  {formatPrice(stock.currentPrice - stock.previousPrice)}
                </p>
              </div>

              <div className="ss-grid ss-grid-cols-2 ss-gap-3 xl:ss-w-[320px]">
                {[
                  ['구간 고가', formatPrice(sessionHigh)],
                  ['구간 저가', formatPrice(sessionLow)],
                  ['변동 범위', formatPercent(sessionRange, 1)],
                  ['유동성', formatPercent(stock.liquidity * 100, 0)],
                ].map(([label, value]) => (
                  <div key={label} className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
                    <p className="ss-ui-kpi-label">{label}</p>
                    <p className="ss-mt-2 ss-text-base ss-font-semibold ss-text-white">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="ss-mt-5 ss-grid ss-gap-3 md:ss-grid-cols-4">
              {[
                ['변동성', formatPercent(stock.volatility * 100, 0), 'neutral'],
                [
                  '모멘텀',
                  formatPercent(stock.momentum * 12, 1),
                  stock.momentum >= 0 ? 'up' : 'down',
                ],
                ['보유 수량', `${holding?.quantity ?? 0}주`, 'neutral'],
                ['평균 단가', holding ? formatPrice(holding.averageCost) : '-', 'neutral'],
              ].map(([label, value, tone]) => (
                <div key={label} className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
                  <p className="ss-ui-kpi-label">{label}</p>
                  <p
                    className={`ss-mt-2 ss-font-semibold ${
                      tone === 'up'
                        ? 'ss-ui-number-up'
                        : tone === 'down'
                          ? 'ss-ui-number-down'
                          : 'ss-text-white'
                    }`}
                  >
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="ss-ui-soft-card-strong ss-flex ss-min-h-0 ss-flex-1 ss-flex-col ss-rounded-[28px] ss-p-4">
            <div className="ss-flex ss-flex-col ss-gap-3 xl:ss-flex-row xl:ss-items-start xl:ss-justify-between">
              <div>
                <p className="ss-ui-kpi-label">실시간 가격 흐름</p>
                <p className="ss-mt-1 ss-text-sm ss-leading-6 ss-text-slate-300/78">
                  원본 tick 가격을 기준으로 선택한 시간대에 맞춰 집계한 차트입니다.
                  작은 흔들림은 미세 수급과 배경 유동성을 반영하고, 큰 움직임은
                  체결 압력이 더 크게 반영됩니다.
                </p>
              </div>
              <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
                <span className="ss-ui-chip ss-ui-chip-info">
                  평균가 {formatPrice(sessionAverage)}
                </span>
                <span
                  className={`ss-ui-chip ${
                    positive ? 'ss-ui-chip-positive' : 'ss-ui-chip-negative'
                  }`}
                >
                  {positive ? '상승 압력' : '하락 압력'}
                </span>
              </div>
            </div>

            <div className="ss-mt-3 ss-flex ss-flex-wrap ss-items-center ss-justify-between ss-gap-3">
              <span className="ss-ui-chip ss-ui-chip-info">{timeframeLabel} 차트</span>
              <div className="ss-inline-flex ss-items-center ss-gap-1 ss-rounded-[18px] ss-border ss-border-white/10 ss-bg-slate-950/58 ss-p-1 ss-shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                {CHART_TIMEFRAME_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      startTransition(() => {
                        onChartTimeframeChange(option.value);
                      })
                    }
                    className={`ss-rounded-full ss-px-3 ss-py-1.5 ss-text-xs ss-font-medium ss-transition ${
                      chartTimeframe === option.value
                        ? 'ss-bg-cyan-300/20 ss-text-cyan-50 ss-shadow-[0_0_0_1px_rgba(103,232,249,0.16)]'
                        : 'ss-text-slate-300/88 hover:ss-bg-white/7 hover:ss-text-white'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={elementRef} className="ss-mt-4 ss-h-[320px] ss-w-full md:ss-h-[360px]">
              {size.width > 0 && size.height > 0 ? (
                <AreaChart
                  width={Math.max(320, Math.floor(size.width))}
                  height={Math.max(320, Math.floor(size.height))}
                  data={deferredChartData}
                  margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id={`${stock.id}-price-fill`} x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={positive ? '#9cff7b' : '#ff7c6b'}
                        stopOpacity={0.36}
                      />
                      <stop
                        offset="100%"
                        stopColor={positive ? '#9cff7b' : '#ff7c6b'}
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148, 163, 184, 0.08)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    minTickGap={24}
                  />
                  <YAxis
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    width={58}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    isAnimationActive={false}
                    cursor={{ stroke: 'rgba(148,163,184,0.28)', strokeWidth: 1 }}
                    contentStyle={{
                      background: '#081120',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '18px',
                      color: '#f8fafc',
                    }}
                    formatter={(value, name) => [
                      formatPrice(Number(value ?? 0)),
                      name === 'price' ? '종가' : '추세선',
                    ]}
                    labelFormatter={(label, payload) => {
                      const item = payload?.[0]?.payload as ChartRow | undefined;

                      if (!item) {
                        return `${timeframeLabel} ${label}`;
                      }

                      return `${timeframeLabel} ${label} · 시가 ${formatPrice(
                        item.open,
                      )} · 고가 ${formatPrice(item.high)} · 저가 ${formatPrice(
                        item.low,
                      )} · 거래량 ${formatCompactNumber(item.volume)} · 체결 ${
                        item.tradeCount
                      }건`;
                    }}
                  />
                  <ReferenceLine
                    y={Number(sessionAverage.toFixed(2))}
                    stroke="rgba(148, 163, 184, 0.34)"
                    strokeDasharray="4 4"
                  />
                  <Area
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="price"
                    stroke={positive ? '#9cff7b' : '#ff7c6b'}
                    strokeWidth={2.5}
                    fill={`url(#${stock.id}-price-fill)`}
                    dot={false}
                    activeDot={{ r: 5, fill: positive ? '#9cff7b' : '#ff7c6b' }}
                  />
                  <Line
                    isAnimationActive={false}
                    type="monotone"
                    dataKey="smooth"
                    stroke="rgba(148, 163, 184, 0.8)"
                    strokeWidth={1.4}
                    dot={false}
                    strokeDasharray="4 4"
                  />
                </AreaChart>
              ) : null}
            </div>

            <div className="ss-mt-4 ss-grid ss-gap-3 md:ss-grid-cols-[minmax(0,1fr)_auto] md:ss-items-end">
              <div className="ss-grid ss-grid-cols-4 ss-gap-2 lg:ss-grid-cols-8">
                {recentTape.map((entry) => (
                  <div
                    key={entry.id}
                    className={`ss-rounded-[18px] ss-border ss-px-3 ss-py-2.5 ss-text-center ${
                      entry.delta >= 0
                        ? 'ss-border-lime-300/12 ss-bg-lime-300/8'
                        : 'ss-border-rose-300/12 ss-bg-rose-300/8'
                    }`}
                  >
                    <p className="ss-text-[11px] ss-uppercase ss-tracking-[0.16em] ss-text-slate-400">
                      틱
                    </p>
                    <p className="ss-mt-1 ss-text-sm ss-font-medium ss-text-white">
                      {formatPrice(entry.value)}
                    </p>
                    <p
                      className={`ss-mt-1 ss-text-[11px] ${
                        entry.delta >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'
                      }`}
                    >
                      {formatPrice(entry.delta)}
                    </p>
                  </div>
                ))}
              </div>
              <div className="ss-ui-soft-card ss-rounded-[20px] ss-px-4 ss-py-3.5">
                <p className="ss-ui-kpi-label">{timeframeLabel} 거래량</p>
                <p className="ss-mt-1 ss-text-base ss-font-semibold ss-text-white">
                  {formatCompactNumber(latestBucket?.volume ?? stock.lastVolume)}
                </p>
                <p className="ss-mt-1 ss-text-xs ss-text-slate-400">
                  체결 {latestBucket?.tradeCount ?? 0}건
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="ss-flex ss-min-h-0 ss-flex-col ss-gap-4">
          <section className="ss-ui-soft-card-strong ss-rounded-[28px] ss-p-5">
            <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label">주문 티켓</p>
                <p className="ss-mt-1 ss-text-sm ss-leading-6 ss-text-slate-300/78">
                  즉시 주문은 현재가로 체결되고, 예약 주문은 지정 가격 도달 시 자동으로 체결됩니다.
                </p>
              </div>
              <div className="ss-ui-soft-card ss-inline-flex ss-rounded-full ss-p-1">
                {['buy', 'sell'].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setSide(value as 'buy' | 'sell')}
                    className={`ss-rounded-full ss-px-3 ss-py-1.5 ss-text-xs ss-font-medium ss-transition ${
                      side === value
                        ? value === 'buy'
                          ? 'ss-bg-lime-300/14 ss-text-lime-50'
                          : 'ss-bg-rose-300/14 ss-text-rose-50'
                        : 'ss-text-slate-300 hover:ss-text-white'
                    }`}
                  >
                    {value === 'buy' ? '매수' : '매도'}
                  </button>
                ))}
              </div>
            </div>

            <div className="ss-mt-4 ss-grid ss-gap-3 sm:ss-grid-cols-2">
              <div className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
                <p className="ss-ui-kpi-label">평가 금액</p>
                <p className="ss-mt-2 ss-text-base ss-font-semibold ss-text-white">
                  {holding ? formatCurrency(holdingValue) : '-'}
                </p>
              </div>
              <div className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
                <p className="ss-ui-kpi-label">미실현 손익</p>
                <p
                  className={`ss-mt-2 ss-text-base ss-font-semibold ${
                    unrealizedPnL >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'
                  }`}
                >
                  {holding
                    ? `${unrealizedPnL >= 0 ? '+' : ''}${formatCurrency(unrealizedPnL)}`
                    : '-'}
                </p>
              </div>
            </div>

            <div className="ss-mt-4 ss-space-y-3">
              <div className="ss-flex ss-items-center ss-gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="ss-inline-flex ss-h-11 ss-w-11 ss-items-center ss-justify-center ss-rounded-2xl ss-border ss-border-white/10 ss-bg-white/5 ss-text-slate-100 ss-transition hover:ss-bg-white/10"
                >
                  <Minus className="ss-h-4 ss-w-4" />
                </button>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(Math.max(1, Math.floor(Number(event.target.value) || 1)))
                  }
                  className="ss-h-11 ss-flex-1 ss-rounded-2xl ss-border ss-border-white/10 ss-bg-slate-950/40 ss-px-4 ss-text-center ss-text-white ss-outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((current) => current + 1)}
                  className="ss-inline-flex ss-h-11 ss-w-11 ss-items-center ss-justify-center ss-rounded-2xl ss-border ss-border-white/10 ss-bg-white/5 ss-text-slate-100 ss-transition hover:ss-bg-white/10"
                >
                  <Plus className="ss-h-4 ss-w-4" />
                </button>
              </div>

              <div className="ss-grid ss-grid-cols-4 ss-gap-2">
                {[1, 5, 10].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setQuantity((current) => current + value)}
                    className="ss-rounded-2xl ss-border ss-border-white/10 ss-bg-white/5 ss-px-3 ss-py-2.5 ss-text-xs ss-font-medium ss-text-slate-200 ss-transition hover:ss-bg-white/10"
                  >
                    +{value}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, orderLimit))}
                  className="ss-rounded-2xl ss-border ss-border-cyan-300/14 ss-bg-cyan-300/10 ss-px-3 ss-py-2.5 ss-text-xs ss-font-medium ss-text-cyan-50 ss-transition hover:ss-bg-cyan-300/16"
                >
                  최대
                </button>
              </div>

              <div className="ss-grid ss-gap-3 sm:ss-grid-cols-2">
                <div className="ss-ui-soft-card ss-rounded-[22px] ss-p-4 ss-text-sm">
                  <div className="ss-flex ss-items-center ss-justify-between">
                    <span className="ss-text-slate-400">가능 수량</span>
                    <span className="ss-text-white">{orderLimit}주</span>
                  </div>
                  <div className="ss-mt-2 ss-flex ss-items-center ss-justify-between">
                    <span className="ss-text-slate-400">예상 체결 금액</span>
                    <span className="ss-font-medium ss-text-white">
                      {formatCurrency(estimatedCost)}
                    </span>
                  </div>
                </div>
                <div className="ss-ui-soft-card ss-rounded-[22px] ss-p-4 ss-text-sm">
                  <div className="ss-flex ss-items-center ss-justify-between">
                    <span className="ss-text-slate-400">주문 후 현금</span>
                    <span
                      className={`${projectedCash >= 0 ? 'ss-text-white' : 'ss-ui-number-down'}`}
                    >
                      {formatCurrency(projectedCash)}
                    </span>
                  </div>
                  <div className="ss-mt-2 ss-flex ss-items-center ss-justify-between">
                    <span className="ss-text-slate-400">보유 수량</span>
                    <span className="ss-text-white">{maxSell}주</span>
                  </div>
                </div>
              </div>

              <div
                className={`ss-rounded-[20px] ss-border ss-px-4 ss-py-3 ss-text-sm ${
                  orderWarning
                    ? 'ss-border-amber-300/16 ss-bg-amber-300/10 ss-text-amber-50'
                    : 'ss-border-white/8 ss-bg-white/5 ss-text-slate-300'
                }`}
              >
                {orderWarning ?? '주문 조건이 정상입니다. 현재가로 즉시 체결됩니다.'}
              </div>

              <button
                type="button"
                onClick={() => onPlaceOrder(side, quantity)}
                disabled={!(orderLimit > 0 && quantity >= 1 && quantity <= orderLimit)}
                className={`ss-inline-flex ss-w-full ss-items-center ss-justify-center ss-gap-2 ss-rounded-[22px] ss-px-4 ss-py-3.5 ss-font-medium ss-transition active:ss-scale-[0.98] ${
                  side === 'buy'
                    ? 'ss-bg-lime-300/85 ss-text-slate-950 hover:ss-bg-lime-200 disabled:ss-bg-lime-300/30'
                    : 'ss-bg-rose-300/85 ss-text-slate-950 hover:ss-bg-rose-200 disabled:ss-bg-rose-300/30'
                } disabled:ss-cursor-not-allowed disabled:ss-text-slate-300`}
              >
                <Target className="ss-h-4 ss-w-4" />
                {side === 'buy' ? '즉시 매수' : '즉시 매도'}
              </button>

              <div className="ss-rounded-[24px] ss-border ss-border-white/8 ss-bg-slate-950/36 ss-p-4">
                <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
                  <div>
                    <p className="ss-ui-kpi-label">예약 주문</p>
                    <p className="ss-mt-1 ss-text-xs ss-leading-5 ss-text-slate-400">
                      {side === 'buy'
                        ? '현재가 이하 도달 시 매수 예약이 체결됩니다.'
                        : '현재가 이상 도달 시 매도 예약이 체결됩니다.'}
                    </p>
                  </div>
                  <span className="ss-ui-chip ss-ui-chip-info">{stockPendingOrders.length}건 대기</span>
                </div>

                <div className="ss-mt-3 ss-grid ss-gap-3 sm:ss-grid-cols-[minmax(0,1fr)_auto]">
                  <label className="ss-ui-soft-card ss-flex ss-flex-col ss-rounded-[20px] ss-p-3">
                    <span className="ss-ui-kpi-label">예약 가격</span>
                    <input
                      type="number"
                      min={1}
                      step="0.01"
                      inputMode="decimal"
                      value={pendingTargetPrice}
                      onChange={(event) =>
                        setPendingTargetPrice(Number(event.target.value) || stock.currentPrice)
                      }
                      className="ss-mt-2 ss-h-10 ss-rounded-2xl ss-border ss-border-white/8 ss-bg-slate-950/42 ss-px-3 ss-text-sm ss-text-white ss-outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => onPlacePendingOrder(side, quantity, pendingTargetPrice)}
                    disabled={
                      !(
                        orderLimit > 0 &&
                        quantity >= 1 &&
                        quantity <= orderLimit &&
                        !pendingOrderWarning
                      )
                    }
                    className={`ss-inline-flex ss-items-center ss-justify-center ss-gap-2 ss-rounded-[22px] ss-px-4 ss-py-3.5 ss-text-sm ss-font-medium ss-transition active:ss-scale-[0.98] ${
                      side === 'buy'
                        ? 'ss-bg-cyan-300/18 ss-text-cyan-50 hover:ss-bg-cyan-300/24 disabled:ss-bg-cyan-300/8'
                        : 'ss-bg-fuchsia-300/16 ss-text-fuchsia-50 hover:ss-bg-fuchsia-300/24 disabled:ss-bg-fuchsia-300/8'
                    } disabled:ss-cursor-not-allowed disabled:ss-text-slate-400`}
                  >
                    <Target className="ss-h-4 ss-w-4" />
                    {side === 'buy' ? '예약 매수 등록' : '예약 매도 등록'}
                  </button>
                </div>

                <div
                  className={`ss-mt-3 ss-rounded-[18px] ss-border ss-px-3.5 ss-py-3 ss-text-sm ${
                    pendingOrderWarning
                      ? 'ss-border-amber-300/16 ss-bg-amber-300/10 ss-text-amber-50'
                      : 'ss-border-white/8 ss-bg-white/5 ss-text-slate-300'
                  }`}
                >
                  {pendingOrderWarning ??
                    `예약 ${side === 'buy' ? '매수' : '매도'} 가격 ${formatPrice(
                      pendingTargetPrice,
                    )}에 ${quantity}주 대기 주문을 등록합니다.`}
                </div>

                <div className="ss-mt-3 ss-space-y-2">
                  {stockPendingOrders.length > 0 ? (
                    stockPendingOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className="ss-flex ss-items-center ss-justify-between ss-gap-3 ss-rounded-[18px] ss-border ss-border-white/8 ss-bg-white/4 ss-px-3.5 ss-py-3"
                      >
                        <div className="ss-min-w-0">
                          <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
                            <span
                              className={`ss-ui-chip ${
                                order.side === 'buy'
                                  ? 'ss-ui-chip-positive'
                                  : 'ss-ui-chip-negative'
                              }`}
                            >
                              {order.side === 'buy' ? '예약 매수' : '예약 매도'}
                            </span>
                            <span className="ss-text-xs ss-text-slate-400">
                              {formatClock(order.createdAt)} 등록
                            </span>
                          </div>
                          <p className="ss-mt-2 ss-text-sm ss-font-medium ss-text-white">
                            {formatPrice(order.targetPrice)} · {order.quantity}주
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onCancelPendingOrder(order.id)}
                          className="ss-rounded-full ss-border ss-border-white/10 ss-bg-white/5 ss-px-3 ss-py-1.5 ss-text-xs ss-font-medium ss-text-slate-200 ss-transition hover:ss-bg-white/10 hover:ss-text-white"
                        >
                          취소
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="ss-rounded-[18px] ss-border ss-border-dashed ss-border-white/10 ss-bg-white/3 ss-px-3.5 ss-py-3 ss-text-sm ss-text-slate-400">
                      현재 종목에 등록된 예약 주문이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="ss-ui-soft-card-strong ss-rounded-[28px] ss-p-5">
            <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label">AI 활동 피드</p>
                <p className="ss-mt-1 ss-text-sm ss-leading-6 ss-text-slate-300/78">
                  선택 종목과 가까운 AI 수급 흐름을 빠르게 확인할 수 있습니다.
                </p>
              </div>
              <span className="ss-ui-chip ss-ui-chip-info">{relatedAiActivity.length}건</span>
            </div>
            {relatedAiActivity.length > 0 ? (
              <div data-scrollable-x="true" className="ss-mt-4 ss-flex ss-gap-3 ss-overflow-x-auto ss-pb-1">
                {relatedAiActivity.map((item) => (
                  <article
                    key={item.id}
                    className={`ss-min-w-[240px] ss-max-w-[280px] ss-shrink-0 ss-rounded-[22px] ss-border ss-p-4 ${
                      item.tone === 'positive'
                        ? 'ss-border-lime-300/12 ss-bg-lime-300/8'
                        : item.tone === 'negative'
                          ? 'ss-border-rose-300/12 ss-bg-rose-300/8'
                          : 'ss-border-white/8 ss-bg-white/5'
                    }`}
                  >
                    <div className="ss-flex ss-items-start ss-justify-between ss-gap-3">
                      <div className="ss-min-w-0">
                        <div className="ss-flex ss-items-center ss-gap-2">
                          <div className="ss-flex ss-h-8 ss-w-8 ss-items-center ss-justify-center ss-rounded-2xl ss-border ss-border-white/10 ss-bg-white/6 ss-text-cyan-100">
                            <Bot className="ss-h-4 ss-w-4" />
                          </div>
                          <span
                            className={`ss-ui-chip ${
                              item.tone === 'positive'
                                ? 'ss-ui-chip-positive'
                                : item.tone === 'negative'
                                  ? 'ss-ui-chip-negative'
                                  : 'ss-ui-chip-info'
                            }`}
                          >
                            {item.type === 'trade'
                              ? '체결'
                              : item.type === 'rotation'
                                ? '순환'
                                : '경보'}
                          </span>
                        </div>
                        <h3 className="ss-mt-3 ss-line-clamp-2 ss-text-sm ss-font-medium ss-leading-6 ss-text-white">
                          {item.title}
                        </h3>
                        <p className="ss-mt-2 ss-line-clamp-3 ss-text-[12px] ss-leading-6 ss-text-slate-300/84">
                          {item.description}
                        </p>
                      </div>
                      <div className="ss-shrink-0 ss-text-right ss-text-[11px] ss-text-slate-400">
                        <p>{formatClock(item.timestamp)}</p>
                        <p className="ss-mt-1">T+{item.tick}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ss-mt-4 ss-rounded-[22px] ss-border ss-border-dashed ss-border-white/12 ss-bg-white/4 ss-p-4 ss-text-sm ss-text-slate-400">
                아직 이 종목에 가까운 AI 활동이 충분히 포착되지 않았습니다.
              </div>
            )}
          </section>

          <section className="ss-ui-soft-card-strong ss-flex ss-min-h-[260px] ss-flex-1 ss-min-h-0 ss-flex-col ss-rounded-[28px] ss-p-5">
            <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label">관련 뉴스 흐름</p>
                <p className="ss-mt-1 ss-text-sm ss-leading-6 ss-text-slate-300/78">
                  선택 종목과 직접 연결된 이슈와 루머를 모아 보여줍니다.
                </p>
              </div>
              <span className="ss-ui-chip ss-ui-chip-info">{relevantEvents.length}건</span>
            </div>
            <div data-scrollable="true" className="ss-mt-4 ss-flex-1 ss-space-y-3 ss-overflow-y-auto ss-pr-1">
              {relevantEvents.length > 0 ? (
                relevantEvents.slice(0, 5).map((event) => (
                  <article key={event.id} className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
                    <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
                      <span
                        className={`ss-ui-chip ${
                          event.impact >= 0 ? 'ss-ui-chip-positive' : 'ss-ui-chip-negative'
                        }`}
                      >
                        {event.scope === 'market'
                          ? '시장'
                          : event.scope === 'sector'
                            ? '섹터'
                            : '종목'}
                      </span>
                      {event.isRumor ? <span className="ss-ui-chip">루머</span> : null}
                    </div>
                    <p className="ss-mt-3 ss-font-medium ss-leading-6 ss-text-white">
                      {event.title}
                    </p>
                    <p className="ss-mt-1 ss-text-sm ss-leading-6 ss-text-slate-300/85">
                      {event.description}
                    </p>
                  </article>
                ))
              ) : (
                <div className="ss-rounded-[24px] ss-border ss-border-dashed ss-border-white/12 ss-bg-white/4 ss-p-4 ss-text-sm ss-leading-6 ss-text-slate-400">
                  아직 이 종목에 직접 연결된 뉴스가 없습니다. 다만 미세 수급과 시장 심리
                  변화로 작은 가격 흔들림은 이어질 수 있습니다.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </Panel>
  );
});
