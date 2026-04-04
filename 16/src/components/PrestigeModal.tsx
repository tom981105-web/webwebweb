import { META_UPGRADES } from '@/data/upgrades';
import { getMetaEffectPreview, getMetaLevel, getMetaUpgradeCost } from '@/game/economy';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';
import { ModalShell } from './ModalShell';

type PrestigeModalProps = {
  open: boolean;
  onClose: () => void;
};

export function PrestigeModal({ open, onClose }: PrestigeModalProps) {
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const sigils = useGameStore((state) => state.sigils);
  const derived = useGameStore((state) => state.derived);
  const metaUpgrades = useGameStore((state) => state.metaUpgrades);
  const stats = useGameStore((state) => state.stats);
  const buyMetaUpgrade = useGameStore((state) => state.buyMetaUpgrade);
  const performPrestige = useGameStore((state) => state.performPrestige);

  return (
    <ModalShell open={open} onClose={onClose} title="Retune the archive" subtitle="Fold your current run into sigils, then spend those sigils on permanent resonance.">
      <div className="pg-grid pg-gap-4 xl:pg-grid-cols-[340px_minmax(0,1fr)]">
        <div className="pg-space-y-4">
          <div className="pg-rounded-[28px] pg-border pg-border-amber-300/18 pg-bg-amber-300/8 pg-p-5">
            <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.18em] pg-text-amber-200/80">Retune now</div>
            <div className="pg-mt-2 pg-font-display pg-text-4xl pg-font-semibold pg-text-amber-100">
              +{formatNumber(derived.prestigeGain, compact)} sigils
            </div>
            <p className="pg-mb-0 pg-mt-3 pg-text-sm pg-leading-7 pg-text-slate-200">
              Retuning resets your coins and upgrades, but it keeps your sigils and permanent resonance upgrades.
            </p>
            <div className="pg-mt-4 pg-grid pg-gap-3">
              <MiniFact label="Current sigils" value={formatNumber(sigils, compact)} />
              <MiniFact label="Retunes completed" value={formatNumber(stats.prestigeCount, compact)} />
              <MiniFact label="Total coins earned" value={formatNumber(stats.totalCoinsEarned, compact)} />
            </div>
            <button
              type="button"
              onClick={performPrestige}
              disabled={derived.prestigeGain <= 0}
              className={`pg-mt-5 pg-w-full pg-rounded-full pg-px-5 pg-py-3 pg-text-sm pg-font-semibold transition ${
                derived.prestigeGain > 0
                  ? 'pg-bg-[linear-gradient(135deg,#f4d06f,#fb7185)] pg-text-slate-950 hover:pg-scale-[1.01]'
                  : 'pg-cursor-not-allowed pg-border pg-border-white/10 pg-bg-white/[0.04] pg-text-slate-500'
              }`}
            >
              {derived.prestigeGain > 0 ? 'Retune and claim sigils' : 'Earn more total coins to retune'}
            </button>
          </div>
        </div>

        <div className="pg-grid pg-gap-3 md:pg-grid-cols-2">
          {META_UPGRADES.map((entry) => {
            const level = getMetaLevel(metaUpgrades, entry.id);
            const cost = getMetaUpgradeCost(entry, level);
            const preview = getMetaEffectPreview(entry.id, level);
            const maxed = level >= entry.maxLevel;
            const affordable = sigils >= cost && !maxed;

            return (
              <div key={entry.id} className="pg-rounded-[24px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
                <div className="pg-flex pg-items-center pg-justify-between pg-gap-3">
                  <h3 className="pg-m-0 pg-text-base pg-font-semibold pg-text-white">{entry.label}</h3>
                  <span className="pg-rounded-full pg-bg-white/[0.06] pg-px-2.5 pg-py-1 pg-text-[11px] pg-font-semibold pg-text-slate-300">
                    Lv {level}/{entry.maxLevel}
                  </span>
                </div>
                <p className="pg-mb-0 pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{entry.description}</p>
                <div className="pg-mt-4 pg-grid pg-gap-2">
                  <UpgradeMetric label="Current" value={preview.current} />
                  <UpgradeMetric label="Next" value={maxed ? 'Reached cap' : preview.next} emphasis />
                </div>
                <button
                  type="button"
                  disabled={!affordable}
                  onClick={() => buyMetaUpgrade(entry.id)}
                  className={`pg-mt-4 pg-w-full pg-rounded-full pg-px-4 pg-py-2 pg-text-sm pg-font-semibold transition ${
                    affordable
                      ? 'pg-bg-[linear-gradient(135deg,#2dd4bf,#8b5cf6)] pg-text-slate-950 hover:pg-scale-[1.01]'
                      : 'pg-cursor-not-allowed pg-border pg-border-white/10 pg-bg-white/[0.04] pg-text-slate-500'
                  }`}
                >
                  {maxed ? 'Maxed' : `Spend ${formatNumber(cost, compact)} sigils`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
}

function MiniFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/15 pg-p-3">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.16em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-1 pg-text-sm pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}

function UpgradeMetric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/10 pg-p-3">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.16em] pg-text-slate-400">{label}</div>
      <div className={`pg-mt-1 pg-text-sm pg-font-semibold ${emphasis ? 'pg-text-cyan-200' : 'pg-text-white'}`}>{value}</div>
    </div>
  );
}
