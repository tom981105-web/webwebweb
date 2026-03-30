import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Flame,
  MoveRight,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type {
  MarketWorldState,
  Sector,
  StockSummary,
  VolatilityLeaderSnapshot,
} from '@/features/stock-sim/types';
import {
  formatPercent,
  formatPrice,
  getSectorLabel,
  getMarketMoodLabel,
  getMarketRegimeDescription,
  getMarketRegimeLabel,
  getStockStatusLabel,
  getLimitStateLabel,
  getStockArchetypeLabel,
} from '@/features/stock-sim/utils/formatters';

type MarketPulsePanelProps = {
  world: MarketWorldState;
  marketMood: number;
  sectorMood: Record<string, number>;
  hotStocks: StockSummary[];
  volatilityLeaders: VolatilityLeaderSnapshot[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

function getBarWidth(value: number) {
  return `${Math.max(8, Math.min(100, Math.abs(value) * 100))}%`;
}

function getMoodBarWidth(value: number) {
  return `${Math.min(100, Math.max(10, ((value + 1) / 2) * 100))}%`;
}

function getMoodBarClass(value: number) {
  if (value >= 0.2) {
    return 'ss-bg-gradient-to-r ss-from-lime-300 ss-via-cyan-300 ss-to-cyan-200';
  }

  if (value <= -0.2) {
    return 'ss-bg-gradient-to-r ss-from-rose-400 ss-via-amber-300 ss-to-amber-200';
  }

  return 'ss-bg-gradient-to-r ss-from-slate-300 ss-to-cyan-300';
}

function StatusChip({
  label,
  tone,
}: {
  label: string;
  tone: 'neutral' | 'positive' | 'negative' | 'warning';
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

function getStatusTone(stock: Pick<StockSummary, 'status'>) {
  if (stock.status === 'WARNING') return 'warning' as const;
  if (stock.status === 'HALTED' || stock.status === 'DELISTED') return 'negative' as const;
  return 'neutral' as const;
}

export function MarketPulsePanel({
  world,
  marketMood,
  sectorMood,
  hotStocks,
  volatilityLeaders,
  isCollapsed,
  onToggleCollapsed,
}: MarketPulsePanelProps) {
  const sectorEntries = Object.entries(sectorMood).sort((left, right) => right[1] - left[1]);
  const strongest = sectorEntries[0];
  const weakest = sectorEntries.at(-1);
  const breadth = sectorEntries.filter(([, mood]) => mood >= 0).length;
  const sectorPreview = sectorEntries.slice(0, 6);

  return (
    <Panel
      title="시장 펄스"
      subtitle="시장 심리, 섹터 자금 흐름, 오늘의 테마와 과열 종목을 한 번에 살펴볼 수 있습니다."
      icon={<Sparkles className="ss-h-5 ss-w-5" />}
      action={
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="ss-inline-flex ss-h-9 ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-border-white/10 ss-bg-white/6 ss-px-3 ss-text-[11px] ss-font-medium ss-text-slate-100 ss-transition hover:ss-bg-white/10"
          aria-label={isCollapsed ? '시장 펄스 펼치기' : '시장 펄스 접기'}
        >
          {isCollapsed ? <ChevronDown className="ss-h-4 ss-w-4" /> : <ChevronUp className="ss-h-4 ss-w-4" />}
          {isCollapsed ? '펼치기' : '접기'}
        </button>
      }
      collapsed={isCollapsed}
      className={isCollapsed ? '' : 'ss-h-full'}
      bodyClassName="ss-flex ss-flex-col ss-gap-3.5"
      tone="feature"
    >
      <div className="ss-grid ss-gap-3 xl:ss-grid-cols-[680px_minmax(0,1fr)] 2xl:ss-grid-cols-[720px_minmax(0,1fr)]">
        <div className="ss-grid ss-gap-2.5 sm:ss-grid-cols-2 2xl:ss-grid-cols-4">
          <article className="ss-ui-soft-card-strong ss-rounded-[18px] ss-p-3">
            <div className="ss-flex ss-items-start ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label ss-text-[12px]">시장 심리</p>
                <p className="ss-mt-1 ss-text-[18px] ss-font-semibold ss-text-white">
                  {getMarketMoodLabel(marketMood)}
                </p>
              </div>
              <Waves className="ss-h-4 ss-w-4 ss-text-cyan-100" />
            </div>
            <div className="ss-mt-2.5 ss-h-2 ss-overflow-hidden ss-rounded-full ss-bg-white/10">
              <div
                className={`ss-h-full ss-rounded-full ${getMoodBarClass(marketMood)}`}
                style={{ width: getMoodBarWidth(marketMood) }}
              />
            </div>
            <p className="ss-mt-2 ss-line-clamp-2 ss-text-[11px] ss-leading-5 ss-text-slate-300/78">
              {getMarketRegimeDescription(world.regime)}
            </p>
          </article>

          <article className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label ss-text-[12px]">시장 구간</p>
                <p className="ss-mt-1 ss-text-[16px] ss-font-semibold ss-text-white">
                  {getMarketRegimeLabel(world.regime)}
                </p>
              </div>
              <Zap className="ss-h-4 ss-w-4 ss-text-cyan-100" />
            </div>
            <p className="ss-mt-3 ss-text-[11px] ss-text-slate-300/78">
              강세 섹터 {breadth} / {sectorEntries.length}
            </p>
          </article>

          <article className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label ss-text-[12px]">주도 섹터</p>
                <p className="ss-mt-1 ss-text-[16px] ss-font-semibold ss-text-white">
                  {getSectorLabel(world.dominantSector)}
                </p>
              </div>
              <MoveRight className="ss-h-4 ss-w-4 ss-text-cyan-100" />
            </div>
            <p className="ss-mt-3 ss-text-[11px] ss-text-slate-300/78">
              AI 집중 {getSectorLabel(world.aiFocusSector)}
            </p>
          </article>

          <article className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label ss-text-[12px]">활성 테마</p>
                <p className="ss-mt-1 ss-text-[16px] ss-font-semibold ss-text-white">
                  {world.activeTheme || '없음'}
                </p>
              </div>
              <Flame className="ss-h-4 ss-w-4 ss-text-amber-200" />
            </div>
            <p className="ss-mt-3 ss-text-[11px] ss-text-slate-300/78">
              거래정지 {world.haltedCount} · 관리 {world.warningCount} · 상장폐지 {world.delistedCount}
            </p>
          </article>
        </div>

        <section className="ss-ui-soft-card ss-rounded-[18px] ss-p-3.5">
          <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
            <div>
              <p className="ss-ui-kpi-label ss-text-[12px]">섹터 자금 흐름</p>
              <p className="ss-mt-1 ss-text-[12px] ss-text-slate-300/80">
                테마, 이벤트, 시장 심리를 반영한 자금 흐름 강도를 보여줍니다.
              </p>
            </div>
            <span className="ss-ui-chip ss-ui-chip-info">실시간</span>
          </div>

          <div className="ss-mt-3 ss-grid ss-grid-cols-3 ss-gap-2.5">
            {sectorPreview.map(([sector, mood]) => (
              <div key={sector} className="ss-ui-soft-card ss-rounded-[14px] ss-p-3">
                <div className="ss-flex ss-items-center ss-justify-between ss-gap-2">
                  <div className="ss-flex ss-items-center ss-gap-1">
                    <span className="ss-text-[13px] ss-font-medium ss-text-white">{getSectorLabel(sector as Sector)}</span>
                    {sector === world.aiFocusSector ? <StatusChip label="AI 집중" tone="neutral" /> : null}
                    {sector === world.dominantSector ? <StatusChip label="주도" tone="positive" /> : null}
                  </div>
                  <span
                    className={`ss-text-[11px] ss-font-semibold ${
                      mood >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'
                    }`}
                  >
                    {formatPercent(mood * 12, 1)}
                  </span>
                </div>
                <div className="ss-mt-2 ss-h-2 ss-overflow-hidden ss-rounded-full ss-bg-white/10">
                  <div
                    className={`ss-h-full ss-rounded-full ${
                      mood >= 0
                        ? 'ss-bg-gradient-to-r ss-from-cyan-300 ss-to-lime-300'
                        : 'ss-bg-gradient-to-r ss-from-rose-300 ss-to-amber-300'
                    }`}
                    style={{ width: getBarWidth(mood) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="ss-grid ss-gap-3 xl:ss-grid-cols-[680px_minmax(0,1fr)] 2xl:ss-grid-cols-[720px_minmax(0,1fr)]">
        <div className="ss-grid ss-gap-3 lg:ss-grid-cols-2">
          <section className="ss-ui-soft-card ss-rounded-[18px] ss-p-3.5">
            <div className="ss-mb-2.5 ss-flex ss-items-center ss-gap-2">
              <Flame className="ss-h-4 ss-w-4 ss-text-amber-200" />
              <h3 className="ss-text-sm ss-font-medium ss-text-slate-100">오늘의 핫 종목</h3>
            </div>
            <div className="ss-space-y-2">
              {hotStocks.map((stock) => {
                const changeRate =
                  ((stock.currentPrice - stock.previousPrice) / Math.max(stock.previousPrice, 1)) * 100;

                return (
                  <div
                    key={stock.id}
                    className="ss-ui-soft-card ss-flex ss-items-center ss-justify-between ss-rounded-[16px] ss-px-3 ss-py-2.5"
                  >
                    <div className="ss-min-w-0">
                      <p className="ss-truncate ss-text-sm ss-font-medium ss-text-white">{stock.name}</p>
                      <div className="ss-mt-1 ss-flex ss-flex-wrap ss-items-center ss-gap-1.5">
                        <span className="ss-text-[11px] ss-text-slate-400">
                          {stock.ticker} · {getSectorLabel(stock.sector)} · {getStockArchetypeLabel(stock.archetype)}
                        </span>
                        <StatusChip label={getStockStatusLabel(stock.status)} tone={getStatusTone(stock)} />
                        {stock.dailyLimitState !== 'normal' ? (
                          <StatusChip
                            label={getLimitStateLabel(stock.dailyLimitState)}
                            tone={stock.dailyLimitState === 'upper-limit' ? 'positive' : 'negative'}
                          />
                        ) : null}
                        {stock.ipoDaysRemaining > 0 ? <StatusChip label="신규 상장" tone="warning" /> : null}
                        {stock.themeTag ? <StatusChip label={stock.themeTag} tone="warning" /> : null}
                      </div>
                    </div>
                    <div className="ss-text-right">
                      <p className="ss-text-sm ss-text-slate-100">{formatPrice(stock.currentPrice)}</p>
                      <p className={`ss-mt-1 ss-text-[11px] ${changeRate >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'}`}>
                        {formatPercent(changeRate)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="ss-ui-soft-card ss-rounded-[18px] ss-p-3.5">
            <div className="ss-mb-2.5 ss-flex ss-items-center ss-gap-2">
              <Sparkles className="ss-h-4 ss-w-4 ss-text-cyan-200" />
              <h3 className="ss-text-sm ss-font-medium ss-text-slate-100">변동성 상위</h3>
            </div>
            <div className="ss-space-y-2">
              {volatilityLeaders.map((stock) => (
                <div
                  key={stock.stockId}
                  className="ss-ui-soft-card ss-flex ss-items-center ss-justify-between ss-rounded-[16px] ss-px-3 ss-py-2.5"
                >
                  <div className="ss-min-w-0">
                    <p className="ss-truncate ss-text-sm ss-font-medium ss-text-white">{stock.name}</p>
                    <div className="ss-mt-1 ss-flex ss-flex-wrap ss-items-center ss-gap-1.5">
                      <span className="ss-text-[11px] ss-text-slate-400">
                        {stock.ticker} · {getSectorLabel(stock.sector)}
                      </span>
                      <StatusChip
                        label={getStockStatusLabel(stock.status)}
                        tone={
                          stock.status === 'WARNING'
                            ? 'warning'
                            : stock.status === 'HALTED' || stock.status === 'DELISTED'
                              ? 'negative'
                              : 'neutral'
                        }
                      />
                    </div>
                  </div>
                  <div className="ss-text-right">
                    <p className="ss-text-sm ss-text-slate-100">{formatPrice(stock.range)}</p>
                    <p className="ss-mt-1 ss-text-[11px] ss-text-slate-400">최근 범위</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="ss-ui-soft-card ss-rounded-[18px] ss-p-3.5">
          <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
            <div>
              <p className="ss-ui-kpi-label">시장 지표</p>
              <p className="ss-mt-1 ss-text-[11px] ss-text-slate-300/78">
                유동성, 변동성, 회전율과 섹터 강도 비교로 오늘 시장의 결을 읽습니다.
              </p>
            </div>
            <BarChart3 className="ss-h-4 ss-w-4 ss-text-cyan-100" />
          </div>

          <div className="ss-mt-3 ss-space-y-2.5">
            {[
              { label: '유동성', value: world.liquidityIndex },
              { label: '변동성', value: world.volatilityIndex },
              { label: '회전율', value: world.turnoverIndex },
            ].map((entry) => (
              <div key={entry.label} className="ss-ui-soft-card ss-rounded-[16px] ss-p-2.5">
                <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
                  <span className="ss-text-[11px] ss-font-medium ss-text-slate-300">{entry.label}</span>
                  <span
                    className={`ss-text-[11px] ss-font-semibold ${
                      entry.value >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'
                    }`}
                  >
                    {formatPercent(entry.value * 100, 0)}
                  </span>
                </div>
                <div className="ss-mt-2 ss-h-2 ss-overflow-hidden ss-rounded-full ss-bg-white/10">
                  <div
                    className={`ss-h-full ss-rounded-full ${
                      entry.value >= 0
                        ? 'ss-bg-gradient-to-r ss-from-cyan-300 ss-to-lime-300'
                        : 'ss-bg-gradient-to-r ss-from-rose-300 ss-to-amber-300'
                    }`}
                    style={{ width: getBarWidth(entry.value) }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="ss-mt-2.5 ss-grid ss-gap-2 sm:ss-grid-cols-2">
            <div className="ss-ui-soft-card ss-rounded-[16px] ss-p-2.5">
              <p className="ss-ui-kpi-label">가장 강한 흐름</p>
              <p className="ss-mt-1 ss-text-sm ss-font-semibold ss-text-white">{strongest ? getSectorLabel(strongest[0] as Sector) : '-'}</p>
              <p className="ss-mt-1 ss-text-[10px] ss-ui-number-up">{formatPercent((strongest?.[1] ?? 0) * 12, 1)}</p>
            </div>
            <div className="ss-ui-soft-card ss-rounded-[16px] ss-p-2.5">
              <p className="ss-ui-kpi-label">가장 약한 흐름</p>
              <p className="ss-mt-1 ss-text-sm ss-font-semibold ss-text-white">{weakest ? getSectorLabel(weakest[0] as Sector) : '-'}</p>
              <p className="ss-mt-1 ss-text-[10px] ss-ui-number-down">{formatPercent((weakest?.[1] ?? 0) * 12, 1)}</p>
            </div>
          </div>
        </section>
      </div>
    </Panel>
  );
}
