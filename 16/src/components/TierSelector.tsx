import { Sparkles, Wand2 } from 'lucide-react';

import { PANEL_TIERS, TIER_ORDER } from '@/data/balance';
import { getTierUnlockReason } from '@/game/economy';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';

export function TierSelector() {
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const selectedTier = useGameStore((state) => state.selectedTier);
  const totalCoinsEarned = useGameStore((state) => state.stats.totalCoinsEarned);
  const setSelectedTier = useGameStore((state) => state.setSelectedTier);

  return (
    <section className="pg-rounded-[28px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-4">
      <div className="pg-flex pg-items-center pg-justify-between pg-gap-3">
        <div>
          <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.22em] pg-text-sky-200/70">Panel tiers</p>
          <h2 className="pg-mb-0 pg-mt-2 pg-font-display pg-text-2xl pg-font-semibold pg-text-white">Choose your panel</h2>
        </div>
        <div className="pg-inline-flex pg-items-center pg-gap-2 pg-rounded-full pg-border pg-border-white/10 pg-bg-white/[0.05] pg-px-3 pg-py-2 pg-text-xs pg-text-slate-300">
          <Sparkles size={14} />
          <span>Each tier shifts price, average reward, and rarity odds.</span>
        </div>
      </div>

      <div className="pg-mt-4 pg-grid pg-gap-3 md:pg-grid-cols-5">
        {TIER_ORDER.map((tier) => {
          const definition = PANEL_TIERS[tier];
          const unlocked = totalCoinsEarned >= definition.unlockAtTotalCoins;
          const active = selectedTier === tier;

          return (
            <button
              key={tier}
              type="button"
              onClick={() => unlocked && setSelectedTier(tier)}
              className={`pg-rounded-[24px] pg-border pg-p-4 pg-text-left transition ${
                active
                  ? 'pg-border-cyan-300/35 pg-bg-cyan-300/[0.08] pg-shadow-[0_0_0_1px_rgba(103,232,249,0.08)]'
                  : 'pg-border-white/10 pg-bg-black/10'
              } ${unlocked ? 'hover:pg-border-white/20 hover:pg-bg-white/[0.05]' : 'pg-opacity-55'}`}
            >
              <div className="pg-flex pg-items-center pg-justify-between">
                <div className="pg-text-sm pg-font-semibold pg-text-white">{definition.label}</div>
                {active ? <Wand2 size={14} className="pg-text-cyan-200" /> : null}
              </div>
              <div className="pg-mt-2 pg-text-xs pg-leading-5 pg-text-slate-400">{definition.description}</div>
              <div className="pg-mt-3 pg-space-y-1 pg-text-xs">
                <div className="pg-flex pg-items-center pg-justify-between">
                  <span className="pg-text-slate-500">Price</span>
                  <span className="pg-font-semibold pg-text-amber-200">{formatNumber(definition.price, compact)}</span>
                </div>
                <div className="pg-flex pg-items-center pg-justify-between">
                  <span className="pg-text-slate-500">Avg reward</span>
                  <span className="pg-font-semibold pg-text-emerald-200">
                    {formatNumber((definition.baseRewardMin + definition.baseRewardMax) / 2, compact)}
                  </span>
                </div>
              </div>
              {!unlocked ? (
                <div className="pg-mt-3 pg-rounded-2xl pg-border pg-border-dashed pg-border-white/10 pg-bg-white/[0.03] pg-p-2 pg-text-[11px] pg-leading-5 pg-text-slate-400">
                  {getTierUnlockReason(tier, totalCoinsEarned)}
                </div>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
