import { memo, startTransition, useDeferredValue, useMemo, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import {
  sectors,
  type Sector,
  type StockSortMode,
  type StockSummary,
} from '@/features/stock-sim/types';
import {
  formatCompactNumber,
  formatPercent,
  formatPrice,
  getSectorLabel,
  getLimitStateLabel,
  getStockArchetypeLabel,
  getStockStatusLabel,
} from '@/features/stock-sim/utils/formatters';
import { getFilteredStocks } from '@/features/stock-sim/utils/selectors';

type StockListPanelProps = {
  stocks: StockSummary[];
  selectedStockId: string;
  searchQuery: string;
  sectorFilter: Sector | 'ALL';
  sortMode: StockSortMode;
  isCollapsed: boolean;
  onSelectStock: (stockId: string) => void;
  onSearchQueryChange: (value: string) => void;
  onSectorFilterChange: (value: Sector | 'ALL') => void;
  onSortModeChange: (value: StockSortMode) => void;
  onToggleCollapsed: () => void;
};

type StockCardProps = {
  stock: StockSummary;
  isSelected: boolean;
  onSelectStock: (stockId: string) => void;
};

function getSortLabel(sortMode: StockSortMode) {
  switch (sortMode) {
    case 'fixed':
      return '기본';
    case 'gainers':
      return '상승률';
    case 'losers':
      return '하락률';
    case 'volume':
      return '거래량';
    default:
      return '기본';
  }
}

const sortOptions: Array<{
  label: string;
  value: StockSortMode;
  icon: ReactNode;
}> = [
  { label: '기본', value: 'fixed', icon: <Sparkles className="ss-h-3.5 ss-w-3.5" /> },
  { label: '상승', value: 'gainers', icon: <ArrowUp className="ss-h-3.5 ss-w-3.5" /> },
  { label: '하락', value: 'losers', icon: <ArrowDown className="ss-h-3.5 ss-w-3.5" /> },
  { label: '거래량', value: 'volume', icon: <BarChart3 className="ss-h-3.5 ss-w-3.5" /> },
];

function buildSparkline(history: number[], width = 132, height = 42, padding = 5) {
  if (history.length === 0) {
    return { linePath: '', areaPath: '', lastX: width - padding, lastY: height / 2 };
  }

  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = Math.max(1, max - min);
  const points = history.map((value, index) => {
    const x =
      history.length === 1
        ? width / 2
        : padding + (index / (history.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
  const areaPath = `${linePath} L ${points.at(-1)?.x ?? width - padding} ${height - padding} L ${
    points[0]?.x ?? padding
  } ${height - padding} Z`;
  const lastPoint = points.at(-1) ?? { x: width - padding, y: height / 2 };

  return {
    linePath,
    areaPath,
    lastX: lastPoint.x,
    lastY: lastPoint.y,
  };
}

function Chip({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'positive' | 'negative' | 'warning';
}) {
  const className =
    tone === 'positive'
      ? 'ss-ui-chip ss-ui-chip-positive'
      : tone === 'negative'
        ? 'ss-ui-chip ss-ui-chip-negative'
        : tone === 'warning'
          ? 'ss-ui-chip ss-border-amber-300/18 ss-bg-amber-300/10 ss-text-amber-50'
          : 'ss-ui-chip';

  return <span className={className}>{label}</span>;
}

const StockCard = memo(function StockCard({
  stock,
  isSelected,
  onSelectStock,
}: StockCardProps) {
  const changeRate = ((stock.currentPrice - stock.previousPrice) / Math.max(stock.previousPrice, 1)) * 100;
  const positive = changeRate >= 0;
  const { linePath, areaPath, lastX, lastY } = useMemo(
    () => buildSparkline(stock.miniHistory),
    [stock.miniHistory],
  );

  return (
    <button
      type="button"
      onClick={() => onSelectStock(stock.id)}
      className={`ss-group ss-flex ss-h-full ss-flex-col ss-rounded-[18px] ss-border ss-p-3 ss-text-left ss-transition ${
        isSelected
          ? 'ss-border-cyan-300/30 ss-bg-[linear-gradient(180deg,rgba(18,34,60,0.98),rgba(8,15,28,0.96))] ss-shadow-[0_12px_30px_rgba(8,20,40,0.35)]'
          : 'ss-border-slate-300/14 ss-bg-[linear-gradient(180deg,rgba(10,16,28,0.96),rgba(6,10,20,0.94))] hover:ss-border-cyan-300/16 hover:ss-bg-[linear-gradient(180deg,rgba(14,23,40,0.98),rgba(8,14,25,0.96))]'
      }`}
    >
      <div className="ss-flex ss-items-start ss-justify-between ss-gap-3">
        <div className="ss-min-w-0">
          <p className="ss-truncate ss-text-[14px] ss-font-semibold ss-text-slate-50">{stock.name}</p>
          <p className="ss-mt-1 ss-truncate ss-text-[11px] ss-font-medium ss-tracking-[0.08em] ss-text-slate-300">
            {stock.ticker}
          </p>
          <p className="ss-mt-1 ss-text-[11px] ss-font-medium ss-text-slate-400">{getSectorLabel(stock.sector)}</p>
        </div>
        <span
          className={`ss-shrink-0 ss-rounded-full ss-px-2 ss-py-1 ss-text-[11px] ss-font-semibold ${
            positive ? 'ss-bg-lime-300/16 ss-text-lime-50' : 'ss-bg-rose-300/16 ss-text-rose-50'
          }`}
        >
          {formatPercent(changeRate)}
        </span>
      </div>

      <div className="ss-mt-2 ss-flex ss-flex-wrap ss-gap-1.5">
        <Chip
          label={getStockStatusLabel(stock.status)}
          tone={
            stock.status === 'WARNING'
              ? 'warning'
              : stock.status === 'HALTED' || stock.status === 'DELISTED'
                ? 'negative'
                : 'neutral'
          }
        />
        <Chip label={getStockArchetypeLabel(stock.archetype)} />
        {stock.dailyLimitState !== 'normal' ? (
          <Chip
            label={getLimitStateLabel(stock.dailyLimitState)}
            tone={stock.dailyLimitState === 'upper-limit' ? 'positive' : 'negative'}
          />
        ) : null}
        {stock.ipoDaysRemaining > 0 ? <Chip label="신규 상장" tone="warning" /> : null}
      </div>

      <div className="ss-mt-3 ss-flex ss-items-end ss-justify-between ss-gap-3">
        <div>
          <p className="ss-text-[15px] ss-font-semibold ss-text-white">
            {formatPrice(stock.currentPrice)}
          </p>
          <p className="ss-mt-1 ss-text-[11px] ss-text-slate-300/82">
            기준가 {formatPrice(stock.referencePrice)}
          </p>
        </div>
        <div className="ss-text-right">
          <p className="ss-text-[12px] ss-font-medium ss-text-slate-100">
            {formatCompactNumber(stock.sessionVolume || stock.lastVolume)}
          </p>
          <p className="ss-mt-1 ss-text-[10px] ss-text-slate-300/72">거래대금</p>
        </div>
      </div>

      <div className="ss-mt-3 ss-rounded-[16px] ss-border ss-border-white/8 ss-bg-slate-950/55 ss-p-2">
        <svg viewBox="0 0 132 42" className="ss-h-10 ss-w-full">
          <path
            d={areaPath}
            fill={positive ? 'rgba(156,255,123,0.16)' : 'rgba(255,124,107,0.16)'}
          />
          <path
            d={linePath}
            fill="none"
            stroke={positive ? '#b7ff9b' : '#ff978c'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx={lastX} cy={lastY} r="2.8" fill={positive ? '#b7ff9b' : '#ff978c'} />
        </svg>
      </div>

      <p className="ss-mt-2.5 ss-line-clamp-2 ss-text-[11px] ss-leading-5 ss-text-slate-200/78">
        {stock.description}
      </p>
    </button>
  );
});

export function StockListPanel({
  stocks,
  selectedStockId,
  searchQuery,
  sectorFilter,
  sortMode,
  isCollapsed,
  onSelectStock,
  onSearchQueryChange,
  onSectorFilterChange,
  onSortModeChange,
  onToggleCollapsed,
}: StockListPanelProps) {
  const deferredQuery = useDeferredValue(searchQuery);
  const filteredStocks = useMemo(
    () => getFilteredStocks(stocks, deferredQuery, sectorFilter, sortMode),
    [deferredQuery, sectorFilter, sortMode, stocks],
  );
  const positiveCount = filteredStocks.filter((stock) => stock.currentPrice >= stock.previousPrice).length;
  const negativeCount = Math.max(0, filteredStocks.length - positiveCount);

  return (
    <Panel
      title="종목 보드"
      subtitle="하루 기준가, 상하한, 거래정지, 신규 상장 상태를 카드 단위로 빠르게 비교할 수 있습니다."
      icon={<ArrowDownUp className="ss-h-5 ss-w-5" />}
      action={
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="ss-inline-flex ss-h-9 ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-border-white/10 ss-bg-white/6 ss-px-3 ss-text-[11px] ss-font-medium ss-text-slate-100 ss-transition hover:ss-bg-white/10"
          aria-label={isCollapsed ? '종목 보드 펼치기' : '종목 보드 접기'}
        >
          {isCollapsed ? <ChevronDown className="ss-h-4 ss-w-4" /> : <ChevronUp className="ss-h-4 ss-w-4" />}
          {isCollapsed ? '펼치기' : '접기'}
        </button>
      }
      collapsed={isCollapsed}
      className={isCollapsed ? '' : 'ss-h-full'}
      bodyClassName="ss-flex ss-flex-col ss-gap-3"
      tone="feature"
    >
      <div className="ss-grid ss-gap-2 xl:ss-grid-cols-[minmax(0,1fr)_220px]">
        <label className="ss-ui-soft-card-strong ss-flex ss-items-center ss-gap-1.5 ss-rounded-[14px] ss-px-2.5 ss-py-1.5">
          <Search className="ss-h-3 ss-w-3 ss-text-slate-300" />
          <input
            value={searchQuery}
            onChange={(event) =>
              startTransition(() => {
                onSearchQueryChange(event.target.value);
              })
            }
            placeholder="종목명, 티커, 섹터 검색"
            className="ss-w-full ss-border-none ss-bg-transparent ss-text-xs ss-text-slate-50 ss-outline-none placeholder:ss-text-slate-400"
          />
          {searchQuery.length > 0 ? (
            <button
              type="button"
              onClick={() => onSearchQueryChange('')}
              className="ss-inline-flex ss-h-5 ss-w-5 ss-items-center ss-justify-center ss-rounded-full ss-border ss-border-white/10 ss-bg-white/6 ss-text-slate-200 ss-transition hover:ss-bg-white/12"
              aria-label="검색어 지우기"
            >
              <X className="ss-h-3 ss-w-3" />
            </button>
          ) : null}
        </label>

        <div className="ss-ui-soft-card ss-flex ss-items-center ss-justify-between ss-rounded-[14px] ss-px-3 ss-py-2">
          <div>
            <p className="ss-ui-kpi-label">표시 종목 수</p>
            <p className="ss-mt-0.5 ss-text-sm ss-font-semibold ss-text-white">
              {filteredStocks.length}
            </p>
          </div>
          <div className="ss-text-right">
            <p className="ss-text-[10px] ss-text-lime-100/88">상승 {positiveCount}</p>
            <p className="ss-mt-0.5 ss-text-[10px] ss-text-rose-100/88">하락 {negativeCount}</p>
          </div>
        </div>
      </div>

      <div data-scrollable-x="true" className="ss-flex ss-gap-2 ss-overflow-x-auto ss-pb-1">
        <button
          type="button"
          onClick={() => onSectorFilterChange('ALL')}
          className={`ss-shrink-0 ss-rounded-full ss-border ss-px-3.5 ss-py-2 ss-text-xs ss-font-medium ss-transition ${
            sectorFilter === 'ALL'
              ? 'ss-border-cyan-300/25 ss-bg-cyan-300/12 ss-text-cyan-50'
              : 'ss-border-white/10 ss-bg-white/5 ss-text-slate-200 hover:ss-bg-white/10'
          }`}
        >
          전체
        </button>
        {sectors.map((sector) => (
          <button
            key={sector}
            type="button"
            onClick={() => onSectorFilterChange(sector)}
            className={`ss-shrink-0 ss-rounded-full ss-border ss-px-3.5 ss-py-2 ss-text-xs ss-font-medium ss-transition ${
              sectorFilter === sector
                ? 'ss-border-cyan-300/25 ss-bg-cyan-300/12 ss-text-cyan-50'
                : 'ss-border-white/10 ss-bg-white/5 ss-text-slate-200 hover:ss-bg-white/10'
            }`}
          >
            {getSectorLabel(sector)}
          </button>
        ))}
      </div>

      <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
        {sortOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onSortModeChange(option.value)}
            className={`ss-inline-flex ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-px-3 ss-py-1.5 ss-text-xs ss-font-medium ss-transition ${
              sortMode === option.value
                ? 'ss-border-cyan-300/20 ss-bg-cyan-300/12 ss-text-cyan-50'
                : 'ss-border-white/10 ss-bg-white/5 ss-text-slate-200 hover:ss-bg-white/10'
            }`}
          >
            {option.icon}
            {option.label}
          </button>
        ))}
        <span className="ss-ml-auto ss-text-xs ss-text-slate-300/78">
          {sectorFilter === 'ALL' ? '전체 시장' : `${getSectorLabel(sectorFilter)} 섹터`} · {getSortLabel(sortMode)} 정렬
        </span>
      </div>

      <div className="ss-grid ss-gap-3 sm:ss-grid-cols-2 md:ss-grid-cols-3 lg:ss-grid-cols-4 xl:ss-grid-cols-6 2xl:ss-grid-cols-8">
        {filteredStocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            isSelected={selectedStockId === stock.id}
            onSelectStock={onSelectStock}
          />
        ))}
      </div>

      {filteredStocks.length === 0 ? (
        <div className="ss-rounded-[24px] ss-border ss-border-dashed ss-border-white/12 ss-bg-white/4 ss-p-6 ss-text-center ss-text-sm ss-text-slate-300/78">
          검색 조건에 맞는 종목이 없습니다.
        </div>
      ) : null}
    </Panel>
  );
}
