import type { ReactNode } from 'react';
import {
  Activity,
  Clock3,
  Gauge,
  House,
  RadioTower,
  Save,
  TrendingDown,
  TrendingUp,
  Wallet,
  Waves,
} from 'lucide-react';
import type { RuntimeState, Sector } from '@/features/stock-sim/types';
import {
  formatCurrency,
  formatPercent,
  formatRelativeTime,
  getSectorLabel,
} from '@/features/stock-sim/utils/formatters';

type TopBarProps = {
  cash: number;
  totalAssets: number;
  unrealizedPnL: number;
  returnRate: number;
  isRunning: boolean;
  speed: number;
  tick: number;
  marketMoodLabel: string;
  marketRegimeLabel: string;
  marketRegimeDescription: string;
  marketClock: string;
  dayPhaseLabel: string;
  dominantSector: string;
  aiFocusSector: string;
  activeTheme: string | null;
  haltedCount: number;
  warningCount: number;
  delistedCount: number;
  runtime: RuntimeState;
};

function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  accent: 'cyan' | 'lime' | 'rose' | 'amber' | 'slate';
  icon: ReactNode;
}) {
  const accentClass =
    accent === 'lime'
      ? 'ss-border-lime-300/14 ss-bg-lime-300/8'
      : accent === 'rose'
        ? 'ss-border-rose-300/14 ss-bg-rose-300/8'
        : accent === 'amber'
          ? 'ss-border-amber-300/14 ss-bg-amber-300/8'
          : accent === 'slate'
            ? 'ss-border-white/10 ss-bg-white/5'
            : 'ss-border-cyan-300/14 ss-bg-cyan-300/8';

  return (
    <div className={`ss-ui-soft-card ss-rounded-[20px] ss-p-4 ${accentClass}`}>
      <div className="ss-flex ss-items-start ss-justify-between ss-gap-3">
        <div className="ss-min-w-0">
          <p className="ss-ui-kpi-label">{label}</p>
          <p className="ss-mt-2 ss-font-display ss-text-[1.15rem] ss-font-semibold ss-leading-none ss-text-white">
            {value}
          </p>
          <p className="ss-mt-2 ss-text-[11px] ss-leading-5 ss-text-slate-300/72">{hint}</p>
        </div>
        <div className="ss-flex ss-h-9 ss-w-9 ss-items-center ss-justify-center ss-rounded-[15px] ss-border ss-border-white/10 ss-bg-white/6 ss-text-white">
          {icon}
        </div>
      </div>
    </div>
  );
}

function getPersistenceTone(runtime: RuntimeState) {
  if (runtime.persistenceStatus === 'error') {
    return 'ss-border-rose-300/20 ss-bg-rose-300/10 ss-text-rose-100';
  }

  if (runtime.persistenceStatus === 'recovered') {
    return 'ss-border-amber-300/20 ss-bg-amber-300/10 ss-text-amber-50';
  }

  return 'ss-border-cyan-300/18 ss-bg-cyan-300/10 ss-text-cyan-50';
}

function MiniStat({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="ss-ui-soft-card ss-rounded-[18px] ss-px-4 ss-py-3">
      <p className="ss-ui-kpi-label">{label}</p>
      <p className={`ss-mt-1 ss-text-sm ss-font-semibold ${emphasis ? 'ss-text-cyan-50' : 'ss-text-white'}`}>
        {value}
      </p>
    </div>
  );
}

export function TopBar({
  cash,
  totalAssets,
  unrealizedPnL,
  returnRate,
  isRunning,
  speed,
  tick,
  marketMoodLabel,
  marketRegimeLabel,
  marketRegimeDescription,
  marketClock,
  dayPhaseLabel,
  dominantSector,
  aiFocusSector,
  activeTheme,
  haltedCount,
  warningCount,
  delistedCount,
  runtime,
}: TopBarProps) {
  const pnlPositive = unrealizedPnL >= 0;
  const returnPositive = returnRate >= 0;
  const homeUrl =
    typeof window !== 'undefined'
      ? new URL('/index.html', window.location.origin).href
      : '/index.html';

  return (
    <div className="ss-ui-panel-surface ss-rounded-[28px] ss-p-4 lg:ss-p-5">
      <div className="ss-flex ss-flex-col ss-gap-4">
        <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
          <span className="ss-ui-chip ss-ui-chip-info">
            <RadioTower className="ss-h-3.5 ss-w-3.5" />
            영속 시장 가동 중
          </span>
          <span className="ss-ui-chip">
            <Clock3 className="ss-h-3.5 ss-w-3.5" />
            {dayPhaseLabel}
          </span>
          <span className={`ss-ui-chip ${getPersistenceTone(runtime)}`}>
            <Save className="ss-h-3.5 ss-w-3.5" />
            최근 저장 {formatRelativeTime(runtime.lastSavedAt)}
          </span>
        </div>

        <div className="ss-flex ss-flex-col ss-gap-4 xl:ss-flex-row xl:ss-items-end xl:ss-justify-between">
          <div className="ss-min-w-0">
            <div className="ss-flex ss-flex-wrap ss-items-end ss-gap-3">
              <h1 className="ss-font-display ss-text-[1.45rem] ss-font-semibold ss-text-white lg:ss-text-[1.8rem]">
                영원히 움직이는 가상 주식시장
              </h1>
              <span className={`ss-ui-chip ${isRunning ? 'ss-ui-chip-positive' : 'ss-ui-chip-negative'}`}>
                {isRunning ? `${speed}배속 운영 중` : '일시 정지'}
              </span>
            </div>
            <p className="ss-mt-2 ss-max-w-3xl ss-text-sm ss-leading-6 ss-text-slate-300/80">
              {marketRegimeDescription}
            </p>
          </div>

          <div className="ss-flex ss-flex-col ss-items-start ss-gap-2">
            <a
              href={homeUrl}
              className="ss-inline-flex ss-items-center ss-gap-2 ss-self-start ss-rounded-full ss-border ss-border-white/12 ss-bg-white/6 ss-px-4 ss-py-2 ss-text-sm ss-font-medium ss-text-white ss-no-underline ss-transition hover:ss-bg-white/10"
            >
              <House className="ss-h-4 ss-w-4 ss-text-cyan-100" />
              홈으로
            </a>
            <div className="ss-ui-soft-card ss-inline-flex ss-items-center ss-gap-3 ss-self-start ss-rounded-full ss-px-4 ss-py-2.5">
              <Activity className="ss-h-4 ss-w-4 ss-text-cyan-100" />
              <span className="ss-text-sm ss-font-medium ss-text-white">
                엔진 상태 {speed}배속 · 틱 {tick.toLocaleString('ko-KR')}
              </span>
            </div>
          </div>
        </div>

        <div className="ss-grid ss-gap-3 sm:ss-grid-cols-2 xl:ss-grid-cols-4 2xl:ss-grid-cols-8">
          <MiniStat label="가상 시각" value={marketClock} emphasis />
          <MiniStat label="시장 심리" value={marketMoodLabel} />
          <MiniStat label="시장 구간" value={marketRegimeLabel} />
          <MiniStat label="주도 섹터" value={getSectorLabel(dominantSector as Sector)} />
          <MiniStat label="AI 집중 섹터" value={getSectorLabel(aiFocusSector as Sector)} />
          <MiniStat label="활성 테마" value={activeTheme || '없음'} />
          <MiniStat label="거래정지" value={`${haltedCount}개`} />
          <MiniStat label="관리/퇴출" value={`${warningCount} / ${delistedCount}`} />
        </div>

        <div className="ss-grid ss-gap-3 sm:ss-grid-cols-2 lg:ss-grid-cols-3 2xl:ss-grid-cols-6">
          <MetricCard
            label="보유 현금"
            value={formatCurrency(cash)}
            hint="즉시 주문에 사용할 수 있는 현금"
            accent="cyan"
            icon={<Wallet className="ss-h-4.5 ss-w-4.5" />}
          />
          <MetricCard
            label="총 자산"
            value={formatCurrency(totalAssets)}
            hint="현금과 보유 종목 가치를 합친 값"
            accent="amber"
            icon={<Gauge className="ss-h-4.5 ss-w-4.5" />}
          />
          <MetricCard
            label="평가 손익"
            value={`${pnlPositive ? '+' : ''}${formatCurrency(unrealizedPnL)}`}
            hint="현재 보유 포지션 기준 평가 손익"
            accent={pnlPositive ? 'lime' : 'rose'}
            icon={pnlPositive ? <TrendingUp className="ss-h-4.5 ss-w-4.5" /> : <TrendingDown className="ss-h-4.5 ss-w-4.5" />}
          />
          <MetricCard
            label="수익률"
            value={formatPercent(returnRate)}
            hint="초기 자본 대비 누적 수익률"
            accent={returnPositive ? 'lime' : 'rose'}
            icon={returnPositive ? <TrendingUp className="ss-h-4.5 ss-w-4.5" /> : <TrendingDown className="ss-h-4.5 ss-w-4.5" />}
          />
          <MetricCard
            label="시장 흐름"
            value={marketRegimeLabel}
            hint="현재 시장의 전체 흐름과 자금 성격"
            accent="slate"
            icon={<Waves className="ss-h-4.5 ss-w-4.5" />}
          />
          <MetricCard
            label="저장 상태"
            value={formatRelativeTime(runtime.lastSavedAt)}
            hint={runtime.hydratedFrom === 'backup' ? '백업 상태에서 복구된 세션입니다.' : '진행 상태가 계속 저장되고 있습니다.'}
            accent="slate"
            icon={<Save className="ss-h-4.5 ss-w-4.5" />}
          />
        </div>
      </div>
    </div>
  );
}
