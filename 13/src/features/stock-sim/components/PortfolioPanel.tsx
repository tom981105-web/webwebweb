import { memo, useMemo } from 'react';
import { BriefcaseBusiness } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type { Holding, Player, StockSummary } from '@/features/stock-sim/types';
import {
  formatCurrency,
  formatPercent,
  formatPrice,
} from '@/features/stock-sim/utils/formatters';
import {
  calculateHoldingPnL,
  calculateHoldingValue,
} from '@/features/stock-sim/utils/portfolio';

type PortfolioPanelProps = {
  player: Player;
  stocks: StockSummary[];
  totalAssets: number;
  unrealizedPnL: number;
  investedCapital: number;
  onSelectStock: (stockId: string) => void;
};

type PortfolioRowData = NonNullable<ReturnType<typeof toRow>>;

function toRow(
  holding: Holding,
  stockMap: Map<string, StockSummary>,
  totalAssets: number,
) {
  const stock = stockMap.get(holding.stockId);

  if (!stock) {
    return null;
  }

  const marketValue = calculateHoldingValue(holding, stock);
  const pnl = calculateHoldingPnL(holding, stock);
  const weight = totalAssets > 0 ? (marketValue / totalAssets) * 100 : 0;
  const bookValue = holding.quantity * holding.averageCost;
  const pnlRate = bookValue > 0 ? (pnl / bookValue) * 100 : 0;

  return {
    stock,
    holding,
    marketValue,
    pnl,
    weight,
    bookValue,
    pnlRate,
  };
}

export function PortfolioPanel({
  player,
  stocks,
  totalAssets,
  unrealizedPnL,
  investedCapital,
  onSelectStock,
}: PortfolioPanelProps) {
  const stockMap = useMemo(() => new Map(stocks.map((stock) => [stock.id, stock])), [stocks]);
  const rows = useMemo(
    () =>
      player.holdings
        .map((holding) => toRow(holding, stockMap, totalAssets))
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((left, right) => right.marketValue - left.marketValue),
    [player.holdings, stockMap, totalAssets],
  );

  return (
    <Panel
      title="포트폴리오"
      subtitle="보유 종목의 비중과 손익을 빠르게 읽을 수 있도록 정리했습니다."
      icon={<BriefcaseBusiness className="ss-h-5 ss-w-5" />}
      className="ss-h-full"
      bodyClassName="ss-flex ss-h-full ss-min-h-0 ss-flex-col"
      tone="accent"
    >
      <div className="ss-flex ss-flex-1 ss-min-h-0 ss-flex-col ss-gap-4">
        <div className="ss-grid ss-gap-3 md:ss-grid-cols-4">
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">보유 종목 수</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">{rows.length}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">투입 자금</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">
              {formatCurrency(investedCapital)}
            </p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">평가 손익</p>
            <p
              className={`ss-mt-2 ss-text-lg ss-font-semibold ${
                unrealizedPnL >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'
              }`}
            >
              {unrealizedPnL >= 0 ? '+' : ''}
              {formatCurrency(unrealizedPnL)}
            </p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">실현 손익</p>
            <p
              className={`ss-mt-2 ss-text-lg ss-font-semibold ${
                player.realizedPnL >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'
              }`}
            >
              {player.realizedPnL >= 0 ? '+' : ''}
              {formatCurrency(player.realizedPnL)}
            </p>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="ss-rounded-[24px] ss-border ss-border-dashed ss-border-white/12 ss-bg-white/4 ss-p-6 ss-text-center ss-text-sm ss-leading-6 ss-text-slate-400">
            아직 보유 중인 종목이 없습니다.
            <br />
            관심 종목을 고른 뒤 첫 주문을 넣어 보세요.
          </div>
        ) : (
          <div className="ss-ui-soft-card-strong ss-flex-1 ss-min-h-0 ss-rounded-[24px] ss-p-3">
            <div className="ss-hidden ss-grid-cols-[minmax(0,1.25fr)_0.52fr_0.68fr_0.68fr_0.76fr_0.76fr] ss-gap-3 ss-rounded-[18px] ss-px-3 ss-py-2 ss-text-[11px] ss-uppercase ss-tracking-[0.16em] ss-text-slate-500 lg:ss-grid">
              <span>자산</span>
              <span className="ss-text-right">수량</span>
              <span className="ss-text-right">평균 단가</span>
              <span className="ss-text-right">현재가</span>
              <span className="ss-text-right">평가 금액</span>
              <span className="ss-text-right">손익</span>
            </div>

            <div data-scrollable="true" className="ss-flex-1 ss-space-y-2 ss-overflow-y-auto ss-pr-1">
              {rows.map((row) => (
                <PortfolioRow key={row.stock.id} row={row} onSelectStock={onSelectStock} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

const PortfolioRow = memo(function PortfolioRow({
  row,
  onSelectStock,
}: {
  row: PortfolioRowData;
  onSelectStock: (stockId: string) => void;
}) {
  const { stock, holding, marketValue, pnl, weight, bookValue, pnlRate } = row;

  return (
    <button
      type="button"
      onClick={() => onSelectStock(stock.id)}
      className="ss-group ss-w-full ss-rounded-[22px] ss-border ss-border-white/8 ss-bg-white/5 ss-p-3.5 ss-text-left ss-transition hover:ss-border-cyan-300/20 hover:ss-bg-white/8"
    >
      <div className="ss-hidden ss-grid-cols-[minmax(0,1.25fr)_0.52fr_0.68fr_0.68fr_0.76fr_0.76fr] ss-items-center ss-gap-3 lg:ss-grid">
        <div className="ss-min-w-0">
          <div className="ss-flex ss-items-center ss-gap-2">
            <p className="ss-truncate ss-font-medium ss-text-white">{stock.name}</p>
            <span className="ss-rounded-full ss-bg-white/8 ss-px-2 ss-py-0.5 ss-text-[11px] ss-text-slate-300">
              {stock.ticker}
            </span>
            <span className="ss-ui-chip ss-ui-chip-info">{stock.sector}</span>
          </div>
          <div className="ss-mt-2 ss-space-y-1">
            <div className="ss-flex ss-items-center ss-justify-between ss-text-xs ss-text-slate-400">
              <span>자산 비중</span>
              <span>{formatPercent(weight)}</span>
            </div>
            <div className="ss-h-2.5 ss-overflow-hidden ss-rounded-full ss-bg-white/10">
              <div
                className={`ss-h-full ss-rounded-full ${
                  pnl >= 0
                    ? 'ss-bg-gradient-to-r ss-from-cyan-300 ss-to-lime-300'
                    : 'ss-bg-gradient-to-r ss-from-rose-300 ss-to-amber-300'
                }`}
                style={{ width: `${Math.min(100, Math.max(8, weight))}%` }}
              />
            </div>
          </div>
        </div>
        <p className="ss-text-right ss-text-sm ss-font-medium ss-text-white">{holding.quantity}주</p>
        <p className="ss-text-right ss-text-sm ss-text-slate-100">{formatPrice(holding.averageCost)}</p>
        <p className="ss-text-right ss-text-sm ss-text-slate-100">{formatPrice(stock.currentPrice)}</p>
        <div className="ss-text-right">
          <p className="ss-text-sm ss-font-medium ss-text-white">{formatCurrency(marketValue)}</p>
          <p className="ss-mt-1 ss-text-[11px] ss-text-slate-500">원금 {formatCurrency(bookValue)}</p>
        </div>
        <div className="ss-text-right">
          <p className={`ss-text-sm ss-font-semibold ${pnl >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'}`}>
            {pnl >= 0 ? '+' : ''}
            {formatCurrency(pnl)}
          </p>
          <p className={`ss-mt-1 ss-text-[11px] ${pnl >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'}`}>
            {formatPercent(pnlRate)}
          </p>
        </div>
      </div>

      <div className="ss-space-y-3 lg:ss-hidden">
        <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
          <p className="ss-font-medium ss-text-white">{stock.name}</p>
          <span className="ss-rounded-full ss-bg-white/8 ss-px-2 ss-py-0.5 ss-text-[11px] ss-text-slate-300">
            {stock.ticker}
          </span>
          <span className="ss-ui-chip ss-ui-chip-info">{stock.sector}</span>
        </div>

        <div className="ss-grid ss-grid-cols-2 ss-gap-3">
          <div className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <p className="ss-ui-kpi-label">수량 / 평균 단가</p>
            <p className="ss-mt-2 ss-text-sm ss-font-semibold ss-text-white">{holding.quantity}주</p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-400">{formatPrice(holding.averageCost)}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <p className="ss-ui-kpi-label">현재가 / 평가 금액</p>
            <p className="ss-mt-2 ss-text-sm ss-font-semibold ss-text-white">{formatPrice(stock.currentPrice)}</p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-400">{formatCurrency(marketValue)}</p>
          </div>
        </div>

        <div className="ss-flex ss-items-center ss-justify-between">
          <span className="ss-text-xs ss-text-slate-400">자산 비중 {formatPercent(weight)}</span>
          <span className={`ss-text-sm ss-font-semibold ${pnl >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'}`}>
            {pnl >= 0 ? '+' : ''}
            {formatCurrency(pnl)}
          </span>
        </div>
        <div className="ss-h-2.5 ss-overflow-hidden ss-rounded-full ss-bg-white/10">
          <div
            className={`ss-h-full ss-rounded-full ${
              pnl >= 0
                ? 'ss-bg-gradient-to-r ss-from-cyan-300 ss-to-lime-300'
                : 'ss-bg-gradient-to-r ss-from-rose-300 ss-to-amber-300'
            }`}
            style={{ width: `${Math.min(100, Math.max(8, weight))}%` }}
          />
        </div>
      </div>
    </button>
  );
});
