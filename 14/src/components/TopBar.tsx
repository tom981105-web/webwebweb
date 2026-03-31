import { BarChart3, Home, RotateCcw, Settings2, Sparkles } from 'lucide-react';

import { formatCompact } from '@/utils/format';

export function TopBar({
  coins,
  dust,
  cps,
  compactNumbers,
  autoLabel,
  onOpenStats,
  onOpenPrestige,
  onOpenSettings,
}: {
  coins: number;
  dust: number;
  cps: number;
  compactNumbers: boolean;
  autoLabel: string;
  onOpenStats: () => void;
  onOpenPrestige: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="rg-rounded-[32px] rg-border rg-border-white/10 rg-bg-[linear-gradient(180deg,rgba(17,24,42,0.92),rgba(10,15,26,0.92))] rg-px-5 rg-py-4 rg-shadow-card">
      <div className="rg-flex rg-flex-col rg-gap-4 lg:rg-flex-row lg:rg-items-center lg:rg-justify-between">
        <div>
          <div className="rg-flex rg-items-center rg-gap-3">
            <div className="rg-flex rg-h-11 rg-w-11 rg-items-center rg-justify-center rg-rounded-2xl rg-bg-mystic-gold/16 rg-text-mystic-gold">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-mystic-gold/76">Relic Scratch Incremental</p>
              <h1 className="rg-mt-1 rg-font-display rg-text-[clamp(1.7rem,3vw,2.35rem)] rg-font-semibold rg-text-white">봉인된 행운의 서고</h1>
            </div>
          </div>
          <p className="rg-mb-0 rg-mt-3 rg-text-sm rg-leading-7 rg-text-slate-300">
            패널을 직접 긁어 룬을 깨우고, 자동화와 재조율로 서고를 확장해 보세요.
          </p>
        </div>

        <div className="rg-grid rg-gap-3 sm:rg-grid-cols-2 xl:rg-grid-cols-4">
          <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-white/[0.04] rg-px-4 rg-py-3">
            <p className="rg-m-0 rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">코인</p>
            <strong className="rg-mt-2 rg-block rg-text-xl rg-font-semibold rg-text-white">{formatCompact(coins, compactNumbers)}</strong>
          </div>
          <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-white/[0.04] rg-px-4 rg-py-3">
            <p className="rg-m-0 rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">공명 가루</p>
            <strong className="rg-mt-2 rg-block rg-text-xl rg-font-semibold rg-text-mystic-violet">{formatCompact(dust, compactNumbers)}</strong>
          </div>
          <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-white/[0.04] rg-px-4 rg-py-3">
            <p className="rg-m-0 rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">예상 초당 수익</p>
            <strong className="rg-mt-2 rg-block rg-text-xl rg-font-semibold rg-text-mystic-teal">{formatCompact(cps, compactNumbers)}/s</strong>
          </div>
          <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-white/[0.04] rg-px-4 rg-py-3">
            <p className="rg-m-0 rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">자동화</p>
            <strong className="rg-mt-2 rg-block rg-text-sm rg-font-semibold rg-text-slate-100">{autoLabel}</strong>
          </div>
        </div>
      </div>

      <div className="rg-mt-4 rg-flex rg-flex-wrap rg-gap-2">
        <a
          href="/index.html"
          className="rg-inline-flex rg-min-h-[42px] rg-items-center rg-gap-2 rg-rounded-full rg-border rg-border-white/10 rg-bg-white/[0.04] rg-px-4 rg-text-sm rg-font-semibold rg-text-slate-100 rg-no-underline"
        >
          <Home size={16} />
          홈으로
        </a>
        <button type="button" onClick={onOpenStats} className="rg-inline-flex rg-min-h-[42px] rg-items-center rg-gap-2 rg-rounded-full rg-border rg-border-white/10 rg-bg-white/[0.04] rg-px-4 rg-text-sm rg-font-semibold rg-text-slate-100">
          <BarChart3 size={16} />
          통계
        </button>
        <button type="button" onClick={onOpenPrestige} className="rg-inline-flex rg-min-h-[42px] rg-items-center rg-gap-2 rg-rounded-full rg-border rg-border-mystic-violet/20 rg-bg-mystic-violet/12 rg-px-4 rg-text-sm rg-font-semibold rg-text-mystic-violet">
          <RotateCcw size={16} />
          재조율
        </button>
        <button type="button" onClick={onOpenSettings} className="rg-inline-flex rg-min-h-[42px] rg-items-center rg-gap-2 rg-rounded-full rg-border rg-border-white/10 rg-bg-white/[0.04] rg-px-4 rg-text-sm rg-font-semibold rg-text-slate-100">
          <Settings2 size={16} />
          설정
        </button>
      </div>
    </header>
  );
}
