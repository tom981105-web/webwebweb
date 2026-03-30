import { Bot, Radar, Siren, Sparkles, TrendingUp } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type { ActivityItem } from '@/features/stock-sim/types';
import { formatClock } from '@/features/stock-sim/utils/formatters';

type AiActivityPanelProps = {
  activity: ActivityItem[];
};

function getToneClass(tone: ActivityItem['tone']) {
  if (tone === 'positive') {
    return 'ss-border-lime-300/12 ss-bg-lime-300/6';
  }

  if (tone === 'negative') {
    return 'ss-border-rose-300/12 ss-bg-rose-300/6';
  }

  return 'ss-border-white/8 ss-bg-white/5';
}

function getToneBarClass(tone: ActivityItem['tone']) {
  if (tone === 'positive') {
    return 'ss-bg-lime-300/80';
  }

  if (tone === 'negative') {
    return 'ss-bg-rose-300/80';
  }

  return 'ss-bg-cyan-300/70';
}

function getActivityTypeLabel(type: ActivityItem['type']) {
  switch (type) {
    case 'trade':
      return '체결';
    case 'rotation':
      return '순환';
    case 'alert':
      return '경보';
    default:
      return type;
  }
}

export function AiActivityPanel({ activity }: AiActivityPanelProps) {
  const hero = activity[0];
  const rest = activity.slice(1);
  const positiveCount = activity.filter((item) => item.tone === 'positive').length;
  const negativeCount = activity.filter((item) => item.tone === 'negative').length;
  const neutralCount = Math.max(0, activity.length - positiveCount - negativeCount);
  const sentimentShare = activity.length > 0 ? (positiveCount / activity.length) * 100 : 0;
  const rotationCount = activity.filter((item) => item.type === 'rotation').length;
  const alertCount = activity.filter((item) => item.type === 'alert').length;
  const tradeCount = activity.filter((item) => item.type === 'trade').length;

  return (
    <Panel
      title="AI 활동 피드"
      subtitle="AI 참여자들이 어디로 자금을 옮기고 있는지, 지금 어떤 판단을 내렸는지 실시간으로 보여줍니다."
      icon={<Bot className="ss-h-5 ss-w-5" />}
      className="ss-h-full"
      bodyClassName="ss-flex ss-h-full ss-min-h-0 ss-flex-col"
      tone="feature"
    >
      <div className="ss-flex ss-flex-1 ss-min-h-0 ss-flex-col ss-gap-4">
        <div className="ss-grid ss-gap-3 sm:ss-grid-cols-3">
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">라이브 피드</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">{activity.length}</p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-400">실시간 활동 로그</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">매수 우위</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-ui-number-up">
              {sentimentShare.toFixed(0)}%
            </p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-400">긍정 톤 비중</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
            <p className="ss-ui-kpi-label">활동 강도</p>
            <p className="ss-mt-2 ss-text-lg ss-font-semibold ss-text-white">
              {tradeCount + rotationCount}
            </p>
            <p className="ss-mt-1 ss-text-xs ss-text-slate-400">순환 + 체결 발생 수</p>
          </div>
        </div>

        {hero ? (
          <article className="ss-relative ss-overflow-hidden ss-rounded-[30px] ss-border ss-border-cyan-300/12 ss-bg-[radial-gradient(circle_at_top_left,rgba(86,212,255,0.24),transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.04))] ss-p-5">
            <div className="ss-pointer-events-none ss-absolute ss-right-[-28px] ss-top-[-18px] ss-h-36 ss-w-36 ss-rounded-full ss-border ss-border-cyan-300/10 ss-bg-cyan-300/6 ss-animate-pulseSoft" />
            <div className="ss-flex ss-items-center ss-gap-2 ss-text-cyan-100">
              <Radar className="ss-h-4 ss-w-4" />
              <span className="ss-text-xs ss-uppercase ss-tracking-[0.18em]">AI WATCH</span>
              <span className="ss-ui-chip ss-ui-chip-info">실시간</span>
            </div>

            <h3 className="ss-mt-4 ss-max-w-[80%] ss-font-display ss-text-[1.42rem] ss-font-semibold ss-leading-8 ss-text-white">
              {hero.title}
            </h3>
            <p className="ss-mt-3 ss-max-w-[82%] ss-text-sm ss-leading-7 ss-text-slate-100/84">
              {hero.description}
            </p>

            <div className="ss-mt-5 ss-grid ss-gap-3 md:ss-grid-cols-3">
              <div className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
                <p className="ss-ui-kpi-label">감지 시각</p>
                <p className="ss-mt-1 ss-text-sm ss-font-semibold ss-text-white">
                  {formatClock(hero.timestamp)}
                </p>
              </div>
              <div className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
                <p className="ss-ui-kpi-label">진행 틱</p>
                <p className="ss-mt-1 ss-text-sm ss-font-semibold ss-text-white">T+{hero.tick}</p>
              </div>
              <div className="ss-ui-soft-card ss-rounded-[18px] ss-p-3">
                <p className="ss-ui-kpi-label">현재 판단</p>
                <p
                  className={`ss-mt-1 ss-text-sm ss-font-semibold ${
                    hero.tone === 'positive'
                      ? 'ss-ui-number-up'
                      : hero.tone === 'negative'
                        ? 'ss-ui-number-down'
                        : 'ss-ui-number-neutral'
                  }`}
                >
                  {hero.tone === 'positive'
                    ? '매수 우위'
                    : hero.tone === 'negative'
                      ? '매도 우위'
                      : '중립 조정'}
                </p>
              </div>
            </div>

            <div className="ss-mt-5 ss-space-y-2">
              <div className="ss-flex ss-items-center ss-justify-between ss-text-xs ss-text-slate-300/72">
                <span>AI 심리 비율</span>
                <span>
                  +{positiveCount} / -{negativeCount} / ={neutralCount}
                </span>
              </div>
              <div className="ss-h-2.5 ss-overflow-hidden ss-rounded-full ss-bg-white/10">
                <div className="ss-flex ss-h-full">
                  <div
                    className="ss-bg-lime-300/80"
                    style={{ width: `${activity.length ? (positiveCount / activity.length) * 100 : 0}%` }}
                  />
                  <div
                    className="ss-bg-cyan-300/70"
                    style={{ width: `${activity.length ? (neutralCount / activity.length) * 100 : 0}%` }}
                  />
                  <div
                    className="ss-bg-rose-300/80"
                    style={{ width: `${activity.length ? (negativeCount / activity.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </article>
        ) : (
          <div className="ss-rounded-[24px] ss-border ss-border-dashed ss-border-white/12 ss-bg-white/4 ss-p-6 ss-text-center ss-text-sm ss-text-slate-400">
            아직 추적된 AI 활동이 충분하지 않습니다.
          </div>
        )}

        <div className="ss-grid ss-gap-3 sm:ss-grid-cols-3">
          <div className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
            <div className="ss-flex ss-items-center ss-gap-2 ss-text-cyan-100">
              <TrendingUp className="ss-h-4 ss-w-4" />
              <p className="ss-ui-kpi-label">체결 수</p>
            </div>
            <p className="ss-mt-2 ss-text-base ss-font-semibold ss-text-white">{tradeCount}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
            <div className="ss-flex ss-items-center ss-gap-2 ss-text-cyan-100">
              <Sparkles className="ss-h-4 ss-w-4" />
              <p className="ss-ui-kpi-label">순환 수</p>
            </div>
            <p className="ss-mt-2 ss-text-base ss-font-semibold ss-text-white">{rotationCount}</p>
          </div>
          <div className="ss-ui-soft-card ss-rounded-[20px] ss-p-3.5">
            <div className="ss-flex ss-items-center ss-gap-2 ss-text-cyan-100">
              <Siren className="ss-h-4 ss-w-4" />
              <p className="ss-ui-kpi-label">경보 수</p>
            </div>
            <p className="ss-mt-2 ss-text-base ss-font-semibold ss-text-white">{alertCount}</p>
          </div>
        </div>

        <div data-scrollable="true" className="ss-flex-1 ss-space-y-3 ss-overflow-y-auto ss-pr-1">
          {rest.map((item) => (
            <article
              key={item.id}
              className={`ss-relative ss-overflow-hidden ss-rounded-[22px] ss-border ss-p-4 ${getToneClass(item.tone)}`}
            >
              <div
                className={`ss-pointer-events-none ss-absolute ss-inset-y-0 ss-left-0 ss-w-1.5 ${getToneBarClass(item.tone)}`}
              />
              <div className="ss-flex ss-items-start ss-justify-between ss-gap-3">
                <div className="ss-min-w-0">
                  <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
                    <span
                      className={`ss-ui-chip ${
                        item.tone === 'positive'
                          ? 'ss-ui-chip-positive'
                          : item.tone === 'negative'
                            ? 'ss-ui-chip-negative'
                            : 'ss-ui-chip-info'
                      }`}
                    >
                      {getActivityTypeLabel(item.type)}
                    </span>
                  </div>
                  <h3 className="ss-mt-3 ss-font-medium ss-leading-6 ss-text-white">
                    {item.title}
                  </h3>
                  <p className="ss-mt-2 ss-text-sm ss-leading-6 ss-text-slate-300/84">
                    {item.description}
                  </p>
                </div>
                <div className="ss-shrink-0 ss-text-right ss-text-xs ss-text-slate-500">
                  <p>{formatClock(item.timestamp)}</p>
                  <p className="ss-mt-1">T+{item.tick}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}
