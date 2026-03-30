import { memo, useMemo } from 'react';
import { ChevronDown, ChevronUp, ReceiptText } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type { SelectedStockSnapshot, StockSummary, Trade } from '@/features/stock-sim/types';
import {
  formatClock,
  formatCurrency,
  formatPrice,
} from '@/features/stock-sim/utils/formatters';

type TradeLogPanelProps = {
  trades: Trade[];
  stocks: StockSummary[];
  selectedStock: SelectedStockSnapshot | null;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

export function TradeLogPanel({
  trades,
  stocks,
  selectedStock,
  isCollapsed,
  onToggleCollapsed,
}: TradeLogPanelProps) {
  const userTrades = useMemo(
    () => trades.filter((trade) => trade.actorType === 'user').length,
    [trades],
  );
  const stockMap = useMemo(() => new Map(stocks.map((stock) => [stock.id, stock])), [stocks]);
  const aiTrades = trades.length - userTrades;
  const lastTrade = trades[0];

  return (
    <Panel
      title="최근 거래 로그"
      subtitle={
        selectedStock
          ? `${selectedStock.name} 관련 체결만 최근 40건까지 보여줍니다.`
          : '선택한 종목의 최근 체결을 최대 40건까지 보여줍니다.'
      }
      icon={<ReceiptText className="ss-h-5 ss-w-5" />}
      action={
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="ss-inline-flex ss-h-9 ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-border-white/10 ss-bg-white/6 ss-px-3 ss-text-[11px] ss-font-medium ss-text-slate-100 ss-transition hover:ss-bg-white/10"
          aria-label={isCollapsed ? '최근 거래 로그 펼치기' : '최근 거래 로그 접기'}
        >
          {isCollapsed ? <ChevronDown className="ss-h-4 ss-w-4" /> : <ChevronUp className="ss-h-4 ss-w-4" />}
          {isCollapsed ? '펼치기' : '접기'}
        </button>
      }
      collapsed={isCollapsed}
      className={isCollapsed ? '' : 'ss-h-full'}
      bodyClassName="ss-flex ss-h-full ss-min-h-0 ss-flex-col"
    >
      <div className="ss-flex ss-flex-1 ss-min-h-0 ss-flex-col ss-gap-4">
        <div className="ss-grid ss-gap-3 md:ss-grid-cols-4">
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">표시 로그</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">{trades.length}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">내 주문</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-cyan-100">{userTrades}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">AI 주문</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">{aiTrades}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">마지막 체결</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">
              {lastTrade ? formatClock(lastTrade.timestamp) : '-'}
            </p>
          </div>
        </div>

        {trades.length === 0 ? (
          <div className="ss-rounded-[24px] ss-border ss-border-dashed ss-border-white/12 ss-bg-white/4 ss-p-6 ss-text-center ss-text-sm ss-text-slate-400">
            {selectedStock
              ? `${selectedStock.name} 관련 최근 체결이 아직 없습니다.`
              : '선택한 종목의 최근 체결이 아직 없습니다.'}
          </div>
        ) : (
          <div className="ss-ui-soft-card-strong ss-flex-1 ss-min-h-0 ss-rounded-[24px] ss-p-3">
            <div className="ss-hidden ss-grid-cols-[0.82fr_1.2fr_0.58fr_0.74fr_0.66fr_0.84fr] ss-gap-3 ss-rounded-[18px] ss-px-3 ss-py-2 ss-text-[11px] ss-uppercase ss-tracking-[0.16em] ss-text-slate-500 lg:ss-grid">
              <span>시간 / 주체</span>
              <span>종목</span>
              <span className="ss-text-right">구분</span>
              <span className="ss-text-right">수량</span>
              <span className="ss-text-right">가격</span>
              <span className="ss-text-right">거래 금액</span>
            </div>

            <div data-scrollable="true" className="ss-flex-1 ss-space-y-2 ss-overflow-y-auto ss-pr-1">
              {trades.map((trade) => (
                <TradeRow key={trade.id} trade={trade} stock={stockMap.get(trade.stockId)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Panel>
  );
}

const TradeRow = memo(function TradeRow({
  trade,
  stock,
}: {
  trade: Trade;
  stock?: StockSummary;
}) {
  return (
    <article
      className={`ss-w-full ss-rounded-[22px] ss-border ss-p-3.5 ${
        trade.actorType === 'user'
          ? 'ss-border-cyan-300/14 ss-bg-cyan-300/6'
          : 'ss-border-white/8 ss-bg-white/5'
      }`}
    >
      <div className="ss-hidden ss-grid-cols-[0.82fr_1.2fr_0.58fr_0.74fr_0.66fr_0.84fr] ss-items-center ss-gap-3 lg:ss-grid">
        <div>
          <p className="ss-text-sm ss-font-medium ss-text-white">{trade.actorName}</p>
          <p className="ss-mt-1 ss-text-xs ss-text-slate-500">
            {formatClock(trade.timestamp)} · T+{trade.tick}
          </p>
        </div>
        <div>
          <div className="ss-flex ss-items-center ss-gap-2">
            <p className="ss-font-medium ss-text-white">{stock?.name ?? trade.stockId}</p>
            <span className="ss-rounded-full ss-bg-white/8 ss-px-2 ss-py-0.5 ss-text-[11px] ss-text-slate-300">
              {stock?.ticker ?? trade.stockId}
            </span>
          </div>
          {trade.note ? <p className="ss-mt-1 ss-text-xs ss-text-slate-500">{trade.note}</p> : null}
        </div>
        <div className="ss-text-right">
          <span className={`ss-ui-chip ${trade.side === 'buy' ? 'ss-ui-chip-positive' : 'ss-ui-chip-negative'}`}>
            {trade.side === 'buy' ? '매수' : '매도'}
          </span>
        </div>
        <p className="ss-text-right ss-text-sm ss-font-medium ss-text-white">{trade.quantity}주</p>
        <p className="ss-text-right ss-text-sm ss-text-slate-100">{formatPrice(trade.price)}</p>
        <p className="ss-text-right ss-text-sm ss-font-semibold ss-text-white">
          {formatCurrency(trade.notional)}
        </p>
      </div>

      <div className="ss-space-y-3 lg:ss-hidden">
        <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
          <div>
            <p className="ss-text-sm ss-font-medium ss-text-white">{trade.actorName}</p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-500">
              {formatClock(trade.timestamp)} · T+{trade.tick}
            </p>
          </div>
          <div className="ss-flex ss-items-center ss-gap-2">
            <span className="ss-ui-chip ss-ui-chip-info">
              {trade.actorType === 'user' ? '사용자' : 'AI'}
            </span>
            <span className={`ss-ui-chip ${trade.side === 'buy' ? 'ss-ui-chip-positive' : 'ss-ui-chip-negative'}`}>
              {trade.side === 'buy' ? '매수' : '매도'}
            </span>
          </div>
        </div>

        <div className="ss-grid ss-grid-cols-2 ss-gap-3">
          <div className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <p className="ss-ui-kpi-label">종목</p>
            <p className="ss-mt-2 ss-text-sm ss-font-semibold ss-text-white">
              {stock?.name ?? trade.stockId}
            </p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-500">{stock?.ticker ?? trade.stockId}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <p className="ss-ui-kpi-label">수량 / 가격</p>
            <p className="ss-mt-2 ss-text-sm ss-font-semibold ss-text-white">{trade.quantity}주</p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-500">{formatPrice(trade.price)}</p>
          </div>
        </div>

        <div className="ss-flex ss-items-center ss-justify-between">
          <span className="ss-text-xs ss-text-slate-400">거래 금액</span>
          <span className="ss-text-sm ss-font-semibold ss-text-white">
            {formatCurrency(trade.notional)}
          </span>
        </div>
        {trade.note ? <p className="ss-text-xs ss-leading-5 ss-text-slate-500">{trade.note}</p> : null}
      </div>
    </article>
  );
});
