import { ModalShell } from '@/components/ModalShell';
import type { PanelTierId, ResultLogEntry, StatsState } from '@/types/game';
import { formatCompact, formatDateTime, formatTierLabel } from '@/utils/format';

export function StatsModal({
  open,
  onClose,
  stats,
  recentResults,
  cps,
  compactNumbers,
}: {
  open: boolean;
  onClose: () => void;
  stats: StatsState;
  recentResults: ResultLogEntry[];
  cps: number;
  compactNumbers: boolean;
}) {
  const bestTierRows = Object.entries(stats.tierOpenCount).map(([tier, openCount]) => {
    const totalReward = stats.tierRewards[tier as keyof typeof stats.tierRewards];
    const efficiency = openCount > 0 ? totalReward / openCount : 0;
    return { tier, openCount, totalReward, efficiency };
  });
  const autoRevealCount = Math.max(0, stats.totalPanelsScratched - stats.totalManualReveals);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="서고 통계"
      description="지금까지 어떤 패널이 효율적이었고, 수동과 자동화가 얼마나 기여했는지 한눈에 확인합니다."
    >
      <div className="rg-grid rg-gap-3 md:rg-grid-cols-2 xl:rg-grid-cols-4">
        {[
          ['총 획득 코인', formatCompact(stats.totalCoinsEarned, compactNumbers)],
          ['총 긁은 횟수', formatCompact(stats.totalPanelsScratched, compactNumbers)],
          ['최고 단일 보상', formatCompact(stats.highestReward, compactNumbers)],
          ['현재 초당 수익', `${formatCompact(cps, compactNumbers)}/s`],
          ['희귀 룬 발견', formatCompact(stats.rareSymbolsFound, compactNumbers)],
          ['자동화 수익', formatCompact(stats.automationCoinsEarned, compactNumbers)],
          ['수동 공개', formatCompact(stats.totalManualReveals, compactNumbers)],
          ['자동 공개', formatCompact(autoRevealCount, compactNumbers)],
        ].map(([label, value]) => (
          <div key={label} className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
            <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-slate-400">{label}</p>
            <strong className="rg-mt-2 rg-block rg-text-xl rg-font-semibold rg-text-white">{value}</strong>
          </div>
        ))}
      </div>

      <div className="rg-mt-6 rg-grid rg-gap-5 lg:rg-grid-cols-[1.1fr_0.9fr]">
        <section className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-4">
          <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">패널별 효율</h3>
          <div className="rg-mt-4 rg-space-y-3">
            {bestTierRows.map((row) => (
              <div key={row.tier} className="rg-rounded-[18px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-flex rg-items-center rg-justify-between rg-gap-3">
                  <strong className="rg-text-white">{formatTierLabel(row.tier as PanelTierId)}</strong>
                  <span className="rg-text-sm rg-font-semibold rg-text-mystic-gold">{formatCompact(row.efficiency, compactNumbers)} / 회</span>
                </div>
                <div className="rg-mt-2 rg-grid rg-gap-2 rg-text-sm rg-text-slate-400 sm:rg-grid-cols-2">
                  <span>오픈 횟수 {formatCompact(row.openCount, compactNumbers)}</span>
                  <span>누적 수익 {formatCompact(row.totalReward, compactNumbers)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-4">
          <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">최근 결과 로그</h3>
          <div className="rg-scrollbar rg-mt-4 rg-max-h-[420px] rg-space-y-3 rg-overflow-y-auto">
            {recentResults.map((entry) => (
              <div key={entry.id} className="rg-rounded-[18px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-flex rg-items-center rg-justify-between rg-gap-3">
                  <strong className="rg-text-sm rg-font-semibold rg-text-white">{entry.comboLabel}</strong>
                  <span className="rg-text-xs rg-text-slate-400">{formatDateTime(entry.createdAt)}</span>
                </div>
                <div className="rg-mt-2 rg-flex rg-items-center rg-justify-between rg-text-sm">
                  <span className="rg-text-slate-400">{entry.specialLabel}</span>
                  <span className="rg-font-semibold rg-text-mystic-gold">+{formatCompact(entry.reward, compactNumbers)}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
