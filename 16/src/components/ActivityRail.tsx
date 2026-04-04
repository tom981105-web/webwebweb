import { Bot, MoonStar, ScrollText, Trophy } from 'lucide-react';

import { PANEL_TIERS, TIER_ORDER } from '@/data/balance';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';

export function ActivityRail() {
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const recentResults = useGameStore((state) => state.recentResults);
  const derived = useGameStore((state) => state.derived);
  const stats = useGameStore((state) => state.stats);

  return (
    <div className="pg-grid pg-gap-4">
      <section className="pg-rounded-[28px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-4">
        <div className="pg-flex pg-items-center pg-gap-2">
          <Bot size={16} className="pg-text-cyan-200" />
          <h3 className="pg-m-0 pg-text-lg pg-font-semibold pg-text-white">Automation status</h3>
        </div>
        <div className="pg-mt-4 pg-grid pg-gap-3">
          <AutomationRow label="Auto-buy" value={derived.autoBuyUnlocked ? 'Ready' : 'Locked'} />
          <AutomationRow label="Auto-scratch" value={derived.autoScratchUnlocked ? `${Math.round(derived.autoScratchRate * 100)}%/s` : 'Locked'} />
          <AutomationRow
            label="Auto-reveal"
            value={derived.autoRevealUnlocked ? `Triggers at ${Math.round(derived.autoRevealThreshold * 100)}%` : 'Locked'}
          />
          <AutomationRow label="Auto-loop" value={derived.autoLoopUnlocked ? 'Ready' : 'Locked'} />
        </div>
      </section>

      <section className="pg-rounded-[28px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-4">
        <div className="pg-flex pg-items-center pg-gap-2">
          <ScrollText size={16} className="pg-text-amber-200" />
          <h3 className="pg-m-0 pg-text-lg pg-font-semibold pg-text-white">Recent results</h3>
        </div>
        <div className="pg-mt-4 pg-space-y-3">
          {recentResults.length ? (
            recentResults.map((entry) => (
              <div key={entry.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/10 pg-p-3">
                <div className="pg-flex pg-items-start pg-justify-between pg-gap-3">
                  <div>
                    <div className="pg-text-sm pg-font-semibold pg-text-white">{PANEL_TIERS[entry.tier].label}</div>
                    <div className="pg-mt-1 pg-text-xs pg-leading-5 pg-text-slate-400">{entry.summary}</div>
                  </div>
                  <div className="pg-text-right">
                    <div className="pg-text-sm pg-font-semibold pg-text-emerald-200">+{formatNumber(entry.reward, compact)}</div>
                    <div className="pg-mt-1 pg-text-[11px] pg-text-slate-500">{entry.automated ? 'Auto reveal' : 'Manual reveal'}</div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="pg-rounded-2xl pg-border pg-border-dashed pg-border-white/10 pg-bg-black/10 pg-p-4 pg-text-sm pg-leading-6 pg-text-slate-400">
              No reveal history yet. Your latest panels will settle here once the archive starts opening.
            </div>
          )}
        </div>
      </section>

      <section className="pg-rounded-[28px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-4">
        <div className="pg-flex pg-items-center pg-gap-2">
          <Trophy size={16} className="pg-text-violet-200" />
          <h3 className="pg-m-0 pg-text-lg pg-font-semibold pg-text-white">Panel efficiency</h3>
        </div>
        <div className="pg-mt-4 pg-space-y-3">
          {TIER_ORDER.map((tier) => {
            const opens = stats.perTierOpens[tier];
            const rewards = stats.perTierRewards[tier];
            const avg = opens ? rewards / opens : (PANEL_TIERS[tier].baseRewardMin + PANEL_TIERS[tier].baseRewardMax) / 2;
            const net = avg - PANEL_TIERS[tier].price;
            return (
              <div key={tier} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/10 pg-p-3">
                <div className="pg-flex pg-items-center pg-justify-between">
                  <div className="pg-text-sm pg-font-semibold pg-text-white">{PANEL_TIERS[tier].label}</div>
                  <div className={`pg-text-sm pg-font-semibold ${net >= 0 ? 'pg-text-emerald-200' : 'pg-text-rose-200'}`}>
                    {net >= 0 ? '+' : ''}
                    {formatNumber(net, compact)}
                  </div>
                </div>
                <div className="pg-mt-2 pg-flex pg-items-center pg-justify-between pg-text-xs pg-text-slate-400">
                  <span>Average reward {formatNumber(avg, compact)}</span>
                  <span>{opens ? `${opens} opens` : 'No live data yet'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pg-rounded-[28px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-4">
        <div className="pg-flex pg-items-center pg-gap-2">
          <MoonStar size={16} className="pg-text-emerald-200" />
          <h3 className="pg-m-0 pg-text-lg pg-font-semibold pg-text-white">Next goals</h3>
        </div>
        <ul className="pg-mb-0 pg-mt-4 pg-space-y-2 pg-pl-4 pg-text-sm pg-leading-7 pg-text-slate-300">
          <li>Push reward and brush upgrades until the next tier feels within one or two reveals.</li>
          <li>Once auto-buy and auto-scratch both unlock, the archive starts paying while you browse upgrades.</li>
          <li>Retuning becomes worthwhile when sigil gain offsets the short reset back into the early loop.</li>
        </ul>
      </section>
    </div>
  );
}

function AutomationRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-flex pg-items-center pg-justify-between pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/10 pg-p-3">
      <span className="pg-text-sm pg-text-slate-300">{label}</span>
      <span className="pg-text-sm pg-font-semibold pg-text-white">{value}</span>
    </div>
  );
}
