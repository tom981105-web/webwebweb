import { PANEL_TIERS, TIER_ORDER } from '@/data/balance';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';
import { ModalShell } from './ModalShell';

type StatsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function StatsModal({ open, onClose }: StatsModalProps) {
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const stats = useGameStore((state) => state.stats);
  const derived = useGameStore((state) => state.derived);

  return (
    <ModalShell open={open} onClose={onClose} title="Archive stats" subtitle="A clear read on what your hands and automation have built so far.">
      <div className="pg-grid pg-gap-4 lg:pg-grid-cols-2">
        <StatCard label="Total coins earned" value={formatNumber(stats.totalCoinsEarned, compact)} />
        <StatCard label="Total panels opened" value={formatNumber(stats.totalPanelsOpened, compact)} />
        <StatCard label="Best single reward" value={formatNumber(stats.bestSingleReward, compact)} />
        <StatCard label="Rare symbols found" value={formatNumber(stats.rareSymbolsFound, compact)} />
        <StatCard label="Automation income" value={formatNumber(stats.automatedCoinsEarned, compact)} />
        <StatCard label="Critical payouts" value={formatNumber(stats.criticalRewards, compact)} />
        <StatCard label="Jackpot reveals" value={formatNumber(stats.jackpotRewards, compact)} />
        <StatCard label="Estimated income / sec" value={`${formatNumber(derived.currentCpsEstimate, compact)}/s`} />
      </div>

      <div className="pg-mt-5 pg-rounded-[28px] pg-border pg-border-white/10 pg-bg-black/15 pg-p-4">
        <div className="pg-text-sm pg-font-semibold pg-text-white">Tier breakdown</div>
        <div className="pg-mt-4 pg-space-y-3">
          {TIER_ORDER.map((tier) => {
            const opens = stats.perTierOpens[tier];
            const rewards = stats.perTierRewards[tier];
            const average = opens ? rewards / opens : 0;
            return (
              <div key={tier} className="pg-grid pg-gap-2 pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.03] pg-p-3 md:pg-grid-cols-[1.2fr_1fr_1fr_1fr]">
                <div className="pg-font-semibold pg-text-white">{PANEL_TIERS[tier].label}</div>
                <div className="pg-text-sm pg-text-slate-300">Opened {formatNumber(opens, compact)}</div>
                <div className="pg-text-sm pg-text-slate-300">Earned {formatNumber(rewards, compact)}</div>
                <div className="pg-text-sm pg-text-slate-300">Avg {formatNumber(average, compact)}</div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-rounded-[24px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.16em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-2 pg-font-display pg-text-2xl pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}
