import { PANEL_TIERS } from '@/data/balance';
import type { PanelTierId } from '@/types/game';
import { formatCompact, formatPercent } from '@/utils/format';

export function TierSelector({
  selectedTier,
  onSelect,
  compactNumbers,
}: {
  selectedTier: PanelTierId;
  onSelect: (tier: PanelTierId) => void;
  compactNumbers: boolean;
}) {
  return (
    <section className="rg-rounded-[28px] rg-border rg-border-white/10 rg-bg-white/[0.03] rg-p-5">
      <div className="rg-flex rg-items-end rg-justify-between rg-gap-4">
        <div>
          <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">패널 티어</p>
          <h2 className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">오늘 긁어볼 봉인판</h2>
        </div>
        <p className="rg-m-0 rg-text-sm rg-text-slate-400">비싼 티어가 항상 정답은 아닙니다.</p>
      </div>

      <div className="rg-mt-4 rg-grid rg-gap-3 lg:rg-grid-cols-5">
        {Object.values(PANEL_TIERS).map((tier) => {
          const active = selectedTier === tier.id;
          return (
            <button
              type="button"
              key={tier.id}
              onClick={() => onSelect(tier.id)}
              className={`rg-rounded-[24px] rg-border rg-p-4 rg-text-left rg-transition ${
                active
                  ? 'rg-border-mystic-gold/40 rg-bg-mystic-gold/10 rg-shadow-glow'
                  : 'rg-border-white/8 rg-bg-white/[0.02] hover:rg-border-white/20 hover:rg-bg-white/[0.05]'
              }`}
            >
              <div className="rg-flex rg-items-center rg-justify-between">
                <strong className="rg-text-base rg-font-semibold rg-text-white">{tier.name}</strong>
                <span className="rg-rounded-full rg-bg-white/6 rg-px-3 rg-py-1 rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-slate-300">
                  EV {formatPercent((tier.expectedValue - 1) * 100, 0)}
                </span>
              </div>
              <p className="rg-mb-0 rg-mt-2 rg-min-h-[42px] rg-text-sm rg-leading-6 rg-text-slate-300">{tier.flavor}</p>
              <div className="rg-mt-4 rg-flex rg-items-center rg-justify-between rg-text-sm">
                <span className="rg-text-slate-400">가격</span>
                <span className="rg-font-semibold rg-text-mystic-gold">{formatCompact(tier.cost, compactNumbers)}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
