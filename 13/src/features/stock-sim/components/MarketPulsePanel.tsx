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
  StockSummary,
  VolatilityLeaderSnapshot,
} from '@/features/stock-sim/types';
import {
  formatPercent,
  formatPrice,
  getMarketMoodLabel,
  getMarketRegimeDescription,
  getMarketRegimeLabel,
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
      subtitle="시장 심리와 섹터 순환, 오늘의 강한 흐름을 한 번에 읽을 수 있도록 정리했습니다."
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
                <p className="ss-ui-kpi-label ss-text-[12px]">시장 국면</p>
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
                  {world.dominantSector}
                </p>
              </div>
              <MoveRight className="ss-h-4 ss-w-4 ss-text-cyan-100" />
            </div>
            <p className="ss-mt-3 ss-text-[11px] ss-text-slate-300/78">
              AI 집중 {world.aiFocusSector}
            </p>
          </article>

          <article className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
            <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
              <div>
                <p className="ss-ui-kpi-label ss-text-[12px]">냉각 섹터</p>
                <p className="ss-mt-1 ss-text-[16px] ss-font-semibold ss-text-white">
                  {world.coolingSector}
                </p>
              </div>
              <Flame className="ss-h-4 ss-w-4 ss-text-amber-200" />
            </div>
            <p className="ss-mt-3 ss-text-[11px] ss-text-slate-300/78">
              차익 실현과 매도 압력이 강한 구간
            </p>
          </article>
        </div>

        <section className="ss-ui-soft-card ss-rounded-[18px] ss-p-3.5">
          <div className="ss-flex ss-items-center ss-justify-between ss-gap-3">
            <div>
              <p className="ss-ui-kpi-label ss-text-[12px]">섹터 순환 보드</p>
              <p className="ss-mt-1 ss-text-[12px] ss-text-slate-300/80">상위 섹터 흐름 요약</p>
            </div>
            <span className="ss-ui-chip ss-ui-chip-info">실시간</span>
          </div>

          <div className="ss-mt-3 ss-grid ss-grid-cols-3 ss-gap-2.5">
            {sectorPreview.map(([sector, mood]) => (
              <div key={sector} className="ss-ui-soft-card ss-rounded-[14px] ss-p-3">
                <div className="ss-flex ss-items-center ss-justify-between ss-gap-2">
                  <div className="ss-flex ss-items-center ss-gap-1">
                    <span className="ss-text-[13px] ss-font-medium ss-text-white">{sector}</span>
                    {sector === world.aiFocusSector ? (
                      <span className="ss-ui-chip ss-ui-chip-info">AI</span>
                    ) : null}
                    {sector === world.dominantSector ? (
                      <span className="ss-ui-chip ss-ui-chip-positive">주도</span>
                    ) : null}
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
                  ((stock.currentPrice - stock.previousPrice) / stock.previousPrice) * 100;

                return (
                  <div
                    key={stock.id}
                    className="ss-ui-soft-card ss-flex ss-items-center ss-justify-between ss-rounded-[16px] ss-px-3 ss-py-2.5"
                  >
                    <div className="ss-min-w-0">
                      <p className="ss-truncate ss-text-sm ss-font-medium ss-text-white">
                        {stock.name}
                      </p>
                      <p className="ss-mt-1 ss-text-[11px] ss-text-slate-400">
                        {stock.ticker} · {stock.sector}
                      </p>
                    </div>
                    <div className="ss-text-right">
                      <p className="ss-text-sm ss-text-slate-100">
                        {formatPrice(stock.currentPrice)}
                      </p>
                      <p
                        className={`ss-mt-1 ss-text-[11px] ${
                          changeRate >= 0 ? 'ss-ui-number-up' : 'ss-ui-number-down'
                        }`}
                      >
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
                    <p className="ss-truncate ss-text-sm ss-font-medium ss-text-white">
                      {stock.name}
                    </p>
                    <p className="ss-mt-1 ss-text-[11px] ss-text-slate-400">
                      {stock.ticker} · {stock.sector}
                    </p>
                  </div>
                  <div className="ss-text-right">
                    <p className="ss-text-sm ss-text-slate-100">{formatPrice(stock.range)}</p>
                    <p className="ss-mt-1 ss-text-[11px] ss-text-slate-400">최근 120틱 범위</p>
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
                유동성, 변동성, 회전율
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
              <p className="ss-mt-1 ss-text-sm ss-font-semibold ss-text-white">
                {strongest?.[0] ?? '-'}
              </p>
              <p className="ss-mt-1 ss-text-[10px] ss-ui-number-up">
                {formatPercent((strongest?.[1] ?? 0) * 12, 1)}
              </p>
            </div>
            <div className="ss-ui-soft-card ss-rounded-[16px] ss-p-2.5">
              <p className="ss-ui-kpi-label">가장 약한 흐름</p>
              <p className="ss-mt-1 ss-text-sm ss-font-semibold ss-text-white">
                {weakest?.[0] ?? '-'}
              </p>
              <p className="ss-mt-1 ss-text-[10px] ss-ui-number-down">
                {formatPercent((weakest?.[1] ?? 0) * 12, 1)}
              </p>
            </div>
          </div>
        </section>
      </div>
    </Panel>
  );
}
