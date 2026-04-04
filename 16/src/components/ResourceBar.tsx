import { BarChart3, Home, RotateCcw, Settings2, Sparkles } from 'lucide-react';

import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';

type ResourceBarProps = {
  onOpenStats: () => void;
  onOpenPrestige: () => void;
  onOpenSettings: () => void;
};

export function ResourceBar({ onOpenSettings, onOpenPrestige, onOpenStats }: ResourceBarProps) {
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const coins = useGameStore((state) => state.coins);
  const sigils = useGameStore((state) => state.sigils);
  const derived = useGameStore((state) => state.derived);
  const selectedTier = useGameStore((state) => state.selectedTier);
  const currentPanel = useGameStore((state) => state.currentPanel);

  return (
    <header className="pg-rounded-[30px] pg-border pg-border-white/12 pg-bg-[linear-gradient(135deg,rgba(10,18,32,0.94),rgba(14,24,40,0.96))] pg-p-4 pg-shadow-shell">
      <div className="pg-flex pg-flex-col pg-gap-4 lg:pg-flex-row lg:pg-items-center lg:pg-justify-between">
        <div>
          <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.26em] pg-text-cyan-200/70">Archive of Fortune</p>
          <div className="pg-mt-2 pg-flex pg-flex-wrap pg-items-center pg-gap-2">
            <h1 className="pg-m-0 pg-font-display pg-text-[clamp(2rem,4vw,3.4rem)] pg-font-semibold pg-text-white">Archive of Fortune</h1>
            <span className="pg-inline-flex pg-items-center pg-rounded-full pg-border pg-border-emerald-300/18 pg-bg-emerald-300/10 pg-px-3 pg-py-1 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.18em] pg-text-emerald-100">
              {selectedTier === 'basic' ? 'Manual Discovery' : 'Growing Loop'}
            </span>
          </div>
          <p className="pg-mb-0 pg-mt-2 pg-max-w-3xl pg-text-sm pg-leading-7 pg-text-slate-300">
            Brush away the sealed dust, uncover hidden runes, and turn each reveal into stronger tools, better odds, and self-running fortune loops.
          </p>
        </div>

        <div className="pg-grid pg-grid-cols-2 pg-gap-3 lg:pg-min-w-[470px] lg:pg-grid-cols-4">
          <MetricChip label="Coins" value={formatNumber(coins, compact)} accent="pg-text-amber-200" />
          <MetricChip label="Sigils" value={formatNumber(sigils, compact)} accent="pg-text-violet-200" />
          <MetricChip label="Income / sec" value={`${formatNumber(derived.currentCpsEstimate, compact)}/s`} accent="pg-text-cyan-200" />
          <MetricChip
            label="Automation"
            value={
              derived.autoLoopUnlocked
                ? 'Full loop'
                : derived.autoScratchUnlocked
                  ? 'Scratch active'
                  : derived.autoBuyUnlocked
                    ? 'Buying only'
                    : 'Manual'
            }
            accent="pg-text-emerald-200"
          />
        </div>
      </div>

      <div className="pg-mt-4 pg-flex pg-flex-wrap pg-items-center pg-justify-between pg-gap-3">
        <div className="pg-flex pg-flex-wrap pg-items-center pg-gap-3">
          <MiniStat label="Current panel" value={currentPanel ? currentPanel.tier : 'Empty'} />
          <MiniStat label="Auto reveal" value={`${Math.round(derived.autoRevealThreshold * 100)}%`} />
          <MiniStat label="Brush" value={`${Math.round(derived.brushRadius)}px`} />
          <MiniStat label="Critical chance" value={`${Math.round(derived.criticalChance * 100)}%`} />
        </div>
        <div className="pg-flex pg-flex-wrap pg-gap-2">
          <ActionButton icon={Home} label="Home" href="/index.html" />
          <ActionButton icon={BarChart3} label="Stats" onClick={onOpenStats} />
          <ActionButton icon={RotateCcw} label="Retune" onClick={onOpenPrestige} />
          <ActionButton icon={Settings2} label="Settings" onClick={onOpenSettings} />
        </div>
      </div>
    </header>
  );
}

function MetricChip({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.05] pg-px-3 pg-py-3">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.18em] pg-text-slate-400">{label}</div>
      <div className={`pg-mt-1 pg-font-display pg-text-xl pg-font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-inline-flex pg-items-center pg-gap-2 pg-rounded-full pg-border pg-border-white/10 pg-bg-white/[0.04] pg-px-3 pg-py-2 pg-text-xs pg-text-slate-300">
      <Sparkles size={14} className="pg-text-slate-400" />
      <span className="pg-text-slate-400">{label}</span>
      <span className="pg-font-semibold pg-text-white">{value}</span>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: typeof Home;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const className =
    'pg-inline-flex pg-min-h-[42px] pg-items-center pg-gap-2 pg-rounded-full pg-border pg-border-white/10 pg-bg-white/[0.05] pg-px-4 pg-text-sm pg-font-semibold pg-text-white pg-no-underline transition hover:pg-border-white/20 hover:pg-bg-white/[0.1]';

  if (href) {
    return (
      <a href={href} className={className}>
        <Icon size={16} />
        <span>{label}</span>
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      <Icon size={16} />
      <span>{label}</span>
    </button>
  );
}
