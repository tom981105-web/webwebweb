import { MARKET_MOOD_CYCLE } from '@/data/balance';
import type { ResultLogEntry, StatsState } from '@/types/game';
import { formatCompact, formatDateTime, formatTierLabel } from '@/utils/format';

export function ActivityRail({
  moodIndex,
  currentCps,
  recentResults,
  stats,
  compactNumbers,
}: {
  moodIndex: number;
  currentCps: number;
  recentResults: ResultLogEntry[];
  stats: StatsState;
  compactNumbers: boolean;
}) {
  const mood = MARKET_MOOD_CYCLE[moodIndex % MARKET_MOOD_CYCLE.length];
  const hotTier = (Object.entries(stats.tierRewards).sort((a, b) => b[1] - a[1])[0]?.[0] || 'basic') as keyof typeof stats.tierRewards;
  const autoRevealCount = Math.max(0, stats.totalPanelsScratched - stats.totalManualReveals);
  const autoShare = stats.totalCoinsEarned > 0 ? (stats.automationCoinsEarned / stats.totalCoinsEarned) * 100 : 0;

  return (
    <aside className="rg-space-y-4">
      <section className="rg-rounded-[28px] rg-border rg-border-white/10 rg-bg-white/[0.03] rg-p-5">
        <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">현재 흐름</p>
        <div className="rg-mt-4 rg-grid rg-gap-3 sm:rg-grid-cols-2 xl:rg-grid-cols-1">
          <div className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
            <div className="rg-text-sm rg-text-slate-400">공명 분위기</div>
            <div className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">{mood.label}</div>
            <p className="rg-mb-0 rg-mt-2 rg-text-xs rg-leading-6 rg-text-slate-400">이번 흐름 보정 x{mood.multiplier.toFixed(2)}</p>
          </div>
          <div className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
            <div className="rg-text-sm rg-text-slate-400">자동화 수익</div>
            <div className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-mystic-teal">
              {formatCompact(currentCps, compactNumbers)}/s
            </div>
            <p className="rg-mb-0 rg-mt-2 rg-text-xs rg-leading-6 rg-text-slate-400">총 수익 중 자동화 기여 {autoShare.toFixed(1)}%</p>
          </div>
          <div className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
            <div className="rg-text-sm rg-text-slate-400">가장 뜨거운 패널</div>
            <div className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-mystic-gold">{formatTierLabel(hotTier)}</div>
            <p className="rg-mb-0 rg-mt-2 rg-text-xs rg-leading-6 rg-text-slate-400">
              수동 공개 {formatCompact(stats.totalManualReveals, compactNumbers)}회 · 자동 공개 {formatCompact(autoRevealCount, compactNumbers)}회
            </p>
          </div>
        </div>
      </section>

      <section className="rg-rounded-[28px] rg-border rg-border-white/10 rg-bg-white/[0.03] rg-p-5">
        <div className="rg-flex rg-items-center rg-justify-between">
          <div>
            <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">최근 10개 결과</p>
            <h3 className="rg-mt-2 rg-font-display rg-text-xl rg-font-semibold rg-text-white">행운 기록</h3>
          </div>
        </div>
        <div className="rg-scrollbar rg-mt-4 rg-max-h-[420px] rg-space-y-3 rg-overflow-y-auto">
          {recentResults.length ? (
            recentResults.map((entry) => (
              <div key={entry.id} className="rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-flex rg-items-start rg-justify-between rg-gap-3">
                  <div>
                    <div className="rg-flex rg-items-center rg-gap-2">
                      <strong className="rg-text-sm rg-font-semibold rg-text-white">{entry.comboLabel}</strong>
                      <span className="rg-rounded-full rg-bg-white/6 rg-px-2 rg-py-1 rg-text-[11px] rg-font-semibold rg-text-slate-300">{entry.rarity}</span>
                    </div>
                    <p className="rg-mb-0 rg-mt-2 rg-text-xs rg-leading-6 rg-text-slate-400">{entry.specialLabel}</p>
                  </div>
                  <div className="rg-text-right">
                    <strong className="rg-block rg-text-sm rg-font-semibold rg-text-mystic-gold">+{formatCompact(entry.reward, compactNumbers)}</strong>
                    <span className="rg-text-[11px] rg-text-slate-500">{formatDateTime(entry.createdAt)}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rg-rounded-[20px] rg-border rg-border-dashed rg-border-white/10 rg-bg-white/[0.02] rg-p-4 rg-text-sm rg-leading-7 rg-text-slate-400">
              아직 기록이 없습니다. 첫 패널을 긁고 결과를 확인해 보세요.
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}
