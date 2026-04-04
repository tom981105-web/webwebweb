import { useMemo, useState } from 'react';
import { LockKeyhole, Sparkles, Wand2 } from 'lucide-react';

import { UPGRADES } from '@/data/upgrades';
import { getUpgradeCost, getUpgradeEffectPreview, getUpgradeLevel, getUpgradeUnlockReason } from '@/game/economy';
import { useGameStore } from '@/store/gameStore';
import type { UpgradeCategory } from '@/types/game';
import { formatNumber } from '@/utils/format';

const CATEGORY_LABELS: Record<UpgradeCategory, { title: string; icon: typeof Wand2; description: string }> = {
  scratch: {
    title: 'Scratch',
    icon: Wand2,
    description: 'Improve control, brush comfort, and reveal timing.',
  },
  reward: {
    title: 'Reward',
    icon: Sparkles,
    description: 'Push higher payouts, better symbols, and bigger spikes.',
  },
  automation: {
    title: 'Automation',
    icon: LockKeyhole,
    description: 'Turn the archive into a self-feeding loop over time.',
  },
};

type UpgradeFilter = 'all' | 'available' | 'locked';

export function UpgradePanel() {
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const coins = useGameStore((state) => state.coins);
  const stats = useGameStore((state) => state.stats);
  const upgrades = useGameStore((state) => state.upgrades);
  const buyUpgrade = useGameStore((state) => state.buyUpgrade);

  const [category, setCategory] = useState<UpgradeCategory>('scratch');
  const [filter, setFilter] = useState<UpgradeFilter>('all');

  const grouped = useMemo(() => {
    const items = UPGRADES.filter((entry) => entry.category === category).map((entry) => {
      const level = getUpgradeLevel(upgrades, entry.id);
      const cost = getUpgradeCost(entry, level);
      const unlockReason = getUpgradeUnlockReason(entry, {
        version: 0,
        coins,
        sigils: 0,
        selectedTier: 'basic',
        currentPanel: null,
        upgrades,
        metaUpgrades: {},
        stats,
        recentResults: [],
        tutorial: { dismissed: true },
        settings: { compactNumbers: true, reducedMotion: false },
        automation: { lastTickAt: 0, nextAutoBuyAt: 0, nextAutoLoopAt: 0, nextAutoScratchAt: 0 },
        lastSavedAt: 0,
        lastOpenedAt: 0,
      });
      const preview = getUpgradeEffectPreview(entry.id, level);
      const affordable = Number.isFinite(cost) && coins >= cost;
      const maxed = level >= entry.maxLevel;
      const available = !unlockReason && !maxed;
      return {
        entry,
        level,
        cost,
        unlockReason,
        preview,
        affordable,
        maxed,
        available,
      };
    });

    return items.filter((item) => {
      if (filter === 'available') return item.available;
      if (filter === 'locked') return Boolean(item.unlockReason) || item.maxed;
      return true;
    });
  }, [category, coins, filter, stats, upgrades]);

  const categoryCounts = useMemo(() => {
    return (Object.keys(CATEGORY_LABELS) as UpgradeCategory[]).reduce<Record<UpgradeCategory, number>>((acc, key) => {
      acc[key] = UPGRADES.filter((entry) => entry.category === key).filter((entry) => {
        const level = getUpgradeLevel(upgrades, entry.id);
        return !getUpgradeUnlockReason(entry, {
          version: 0,
          coins,
          sigils: 0,
          selectedTier: 'basic',
          currentPanel: null,
          upgrades,
          metaUpgrades: {},
          stats,
          recentResults: [],
          tutorial: { dismissed: true },
          settings: { compactNumbers: true, reducedMotion: false },
          automation: { lastTickAt: 0, nextAutoBuyAt: 0, nextAutoLoopAt: 0, nextAutoScratchAt: 0 },
          lastSavedAt: 0,
          lastOpenedAt: 0,
        }) && level < entry.maxLevel;
      }).length;
      return acc;
    }, { scratch: 0, reward: 0, automation: 0 });
  }, [coins, stats, upgrades]);

  return (
    <section className="pg-rounded-[32px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-5">
      <div className="pg-flex pg-flex-wrap pg-items-start pg-justify-between pg-gap-3">
        <div>
          <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.22em] pg-text-sky-200/70">Upgrade vault</p>
          <h2 className="pg-mb-0 pg-mt-2 pg-font-display pg-text-3xl pg-font-semibold pg-text-white">Upgrade Path</h2>
          <p className="pg-mb-0 pg-mt-2 pg-text-sm pg-leading-7 pg-text-slate-300">
            Keep the next purchase close. Strong loops come from a steady rhythm of brush, payout, and automation upgrades.
          </p>
        </div>

        <div className="pg-flex pg-flex-wrap pg-gap-2">
          {(['all', 'available', 'locked'] as UpgradeFilter[]).map((entry) => (
            <button
              key={entry}
              type="button"
              onClick={() => setFilter(entry)}
              className={`pg-rounded-full pg-border pg-px-4 pg-py-2 pg-text-xs pg-font-semibold pg-uppercase pg-tracking-[0.16em] transition ${
                filter === entry
                  ? 'pg-border-cyan-300/30 pg-bg-cyan-300/12 pg-text-cyan-100'
                  : 'pg-border-white/10 pg-bg-white/[0.04] pg-text-slate-300 hover:pg-border-white/20 hover:pg-text-white'
              }`}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>

      <div className="pg-mt-5 pg-flex pg-flex-wrap pg-gap-3">
        {(Object.keys(CATEGORY_LABELS) as UpgradeCategory[]).map((entry) => {
          const meta = CATEGORY_LABELS[entry];
          const Icon = meta.icon;
          const active = category === entry;
          return (
            <button
              key={entry}
              type="button"
              onClick={() => setCategory(entry)}
              className={`pg-flex pg-min-w-[190px] pg-flex-1 pg-items-start pg-gap-3 pg-rounded-[24px] pg-border pg-p-4 pg-text-left transition ${
                active
                  ? 'pg-border-cyan-300/30 pg-bg-cyan-300/10'
                  : 'pg-border-white/10 pg-bg-black/10 hover:pg-border-white/20 hover:pg-bg-white/[0.05]'
              }`}
            >
              <span className="pg-mt-1 pg-inline-flex pg-h-10 pg-w-10 pg-items-center pg-justify-center pg-rounded-2xl pg-bg-white/[0.06] pg-text-cyan-200">
                <Icon size={18} />
              </span>
              <span className="pg-block">
                <span className="pg-flex pg-items-center pg-gap-2 pg-text-sm pg-font-semibold pg-text-white">
                  {meta.title}
                  {categoryCounts[entry] > 0 ? (
                    <span className="pg-rounded-full pg-bg-emerald-400/12 pg-px-2 pg-py-0.5 pg-text-[11px] pg-font-semibold pg-text-emerald-200">
                      {categoryCounts[entry]} ready
                    </span>
                  ) : null}
                </span>
                <span className="pg-mt-1 pg-block pg-text-xs pg-leading-5 pg-text-slate-400">{meta.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="pg-mt-5 pg-grid pg-gap-3">
        {grouped.length ? (
          grouped.map(({ entry, level, cost, unlockReason, preview, affordable, maxed, available }) => (
            <div
              key={entry.id}
              className={`pg-rounded-[26px] pg-border pg-p-4 transition ${
                available ? 'pg-border-white/12 pg-bg-white/[0.05]' : 'pg-border-white/8 pg-bg-black/12'
              }`}
            >
              <div className="pg-flex pg-flex-wrap pg-items-start pg-justify-between pg-gap-3">
                <div>
                  <div className="pg-flex pg-flex-wrap pg-items-center pg-gap-2">
                    <h3 className="pg-m-0 pg-text-base pg-font-semibold pg-text-white">{entry.label}</h3>
                    <span className="pg-rounded-full pg-bg-white/[0.06] pg-px-2.5 pg-py-1 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.16em] pg-text-slate-300">
                      Lv {level}/{entry.maxLevel}
                    </span>
                  </div>
                  <p className="pg-mb-0 pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{entry.description}</p>
                </div>
                <button
                  type="button"
                  disabled={!available || !affordable}
                  onClick={() => buyUpgrade(entry.id)}
                  className={`pg-min-h-[46px] pg-rounded-full pg-px-5 pg-text-sm pg-font-semibold transition ${
                    available && affordable
                      ? 'pg-bg-[linear-gradient(135deg,#2dd4bf,#38bdf8)] pg-text-slate-950 hover:pg-scale-[1.01]'
                      : 'pg-cursor-not-allowed pg-border pg-border-white/10 pg-bg-white/[0.04] pg-text-slate-500'
                  }`}
                >
                  {maxed ? 'Maxed' : `Buy ${formatNumber(cost, compact)}`}
                </button>
              </div>

              <div className="pg-mt-4 pg-grid pg-gap-3 lg:pg-grid-cols-[1fr_1fr]">
                <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/10 pg-p-3">
                  <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.16em] pg-text-slate-400">Current effect</div>
                  <div className="pg-mt-1 pg-text-sm pg-font-semibold pg-text-white">{preview.current}</div>
                </div>
                <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/10 pg-p-3">
                  <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.16em] pg-text-slate-400">Next effect</div>
                  <div className="pg-mt-1 pg-text-sm pg-font-semibold pg-text-cyan-200">{maxed ? 'Reached cap' : preview.next}</div>
                </div>
              </div>

              <div className="pg-mt-3 pg-flex pg-flex-wrap pg-items-center pg-justify-between pg-gap-2">
                <div className="pg-text-xs pg-text-slate-400">
                  {maxed ? 'This upgrade is already capped.' : unlockReason ? unlockReason : affordable ? 'Ready to purchase.' : 'Need more coins.'}
                </div>
                <div className="pg-h-2 pg-w-full pg-max-w-[180px] pg-overflow-hidden pg-rounded-full pg-bg-white/[0.06]">
                  <div
                    className="pg-h-full pg-rounded-full pg-bg-[linear-gradient(90deg,#38bdf8,#22c55e)]"
                    style={{ width: `${(level / entry.maxLevel) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="pg-rounded-[26px] pg-border pg-border-dashed pg-border-white/12 pg-bg-black/12 pg-p-6 pg-text-sm pg-leading-7 pg-text-slate-400">
            No upgrades match this filter right now. Keep scratching or switch tabs to see what is ready next.
          </div>
        )}
      </div>
    </section>
  );
}
