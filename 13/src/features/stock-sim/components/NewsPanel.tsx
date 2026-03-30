import { ChevronDown, ChevronUp, Newspaper } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type { MarketEvent } from '@/features/stock-sim/types';
import { formatClock } from '@/features/stock-sim/utils/formatters';

type NewsPanelProps = {
  events: MarketEvent[];
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
};

export function NewsPanel({
  events,
  isCollapsed,
  onToggleCollapsed,
}: NewsPanelProps) {
  const positiveCount = events.filter((event) => event.impact >= 0).length;

  return (
    <Panel
      title="뉴스 / 이벤트"
      subtitle="시장과 종목 가격에 직접 영향을 주는 이슈를 시간순으로 정리했습니다."
      icon={<Newspaper className="ss-h-5 ss-w-5" />}
      action={
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="ss-inline-flex ss-h-9 ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-border-white/10 ss-bg-white/6 ss-px-3 ss-text-[11px] ss-font-medium ss-text-slate-100 ss-transition hover:ss-bg-white/10"
          aria-label={isCollapsed ? '뉴스 / 이벤트 펼치기' : '뉴스 / 이벤트 접기'}
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
        <div className="ss-grid ss-gap-3 sm:ss-grid-cols-3 lg:ss-grid-cols-6">
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5 lg:ss-col-span-2">
            <p className="ss-ui-kpi-label">전체 이벤트</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">{events.length}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5 lg:ss-col-span-2">
            <p className="ss-ui-kpi-label">호재</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-ui-number-up">{positiveCount}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5 lg:ss-col-span-2">
            <p className="ss-ui-kpi-label">악재</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-ui-number-down">
              {events.length - positiveCount}
            </p>
          </div>
        </div>

        <div data-scrollable="true" className="ss-flex-1 ss-overflow-y-auto ss-pr-1">
          {events.length === 0 ? (
            <div className="ss-rounded-[24px] ss-border ss-border-dashed ss-border-white/12 ss-bg-white/4 ss-p-6 ss-text-center ss-text-sm ss-text-slate-400">
              아직 발생한 뉴스가 없습니다. 시장은 다음 재료를 기다리는 중입니다.
            </div>
          ) : null}

          <div className="ss-grid ss-gap-3 lg:ss-grid-cols-2 2xl:ss-grid-cols-3">
            {events.map((event) => (
              <article key={event.id} className="ss-relative">
                <div
                  className={`ss-rounded-[24px] ss-border ss-p-4 ${
                    event.impact >= 0
                      ? 'ss-border-lime-300/10 ss-bg-lime-300/6'
                      : 'ss-border-rose-300/10 ss-bg-rose-300/6'
                  }`}
                >
                  <div className="ss-flex ss-items-start ss-justify-between ss-gap-3">
                    <div className="ss-min-w-0">
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
                        <span className="ss-ui-chip ss-ui-chip-info">
                          잔여 {event.remainingDuration}틱
                        </span>
                      </div>
                      <h3 className="ss-mt-3 ss-font-medium ss-leading-6 ss-text-white">
                        {event.title}
                      </h3>
                      <p className="ss-mt-2 ss-text-sm ss-leading-6 ss-text-slate-300/85">
                        {event.description}
                      </p>
                    </div>
                    <div className="ss-text-right ss-text-xs ss-text-slate-500">
                      <p>{formatClock(event.createdAt)}</p>
                      <p className="ss-mt-1">T+{event.tick}</p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}
