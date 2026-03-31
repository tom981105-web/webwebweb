import { Sparkles } from 'lucide-react';

import { PANEL_RARITIES, SYMBOL_DEFINITIONS } from '@/data/balance';
import { ScratchCanvas } from '@/components/ScratchCanvas';
import type { PanelCard } from '@/types/game';
import { formatCompact, formatPercent } from '@/utils/format';

export function ScratchPanel({
  panel,
  brushRadius,
  compactNumbers,
  reducedMotion,
  onScratchProgress,
  onRevealNow,
  onNextPanel,
}: {
  panel: PanelCard;
  brushRadius: number;
  compactNumbers: boolean;
  reducedMotion: boolean;
  onScratchProgress: (percent: number, distance: number) => void;
  onRevealNow: () => void;
  onNextPanel: () => void;
}) {
  const rarityMeta = PANEL_RARITIES[panel.rarity];
  const canForceReveal = !panel.revealed && panel.scratchedPercent >= Math.max(24, panel.autoRevealThreshold - 12);

  return (
    <section className="rg-overflow-hidden rg-rounded-[34px] rg-border rg-border-white/10 rg-bg-[linear-gradient(180deg,rgba(16,23,39,0.94),rgba(9,13,22,0.96))] rg-shadow-card">
      <div className="rg-flex rg-flex-wrap rg-items-center rg-justify-between rg-gap-3 rg-border-b rg-border-white/8 rg-px-5 rg-py-4">
        <div>
          <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">현재 봉인</p>
          <h2 className="rg-mt-1 rg-font-display rg-text-[clamp(1.8rem,3vw,2.5rem)] rg-font-semibold rg-text-white">{panel.statusLine}</h2>
        </div>
        <div className="rg-flex rg-items-center rg-gap-3">
          <span
            className="rg-rounded-full rg-border rg-px-4 rg-py-2 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.18em]"
            style={{ borderColor: rarityMeta.glow, backgroundColor: rarityMeta.glow.replace('0.', '0.16'), color: '#fff6df' }}
          >
            {rarityMeta.label}
          </span>
          <span className="rg-rounded-full rg-border rg-border-white/10 rg-bg-white/[0.04] rg-px-4 rg-py-2 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-mystic-gold">
            브러시 {Math.round(brushRadius)}
          </span>
        </div>
      </div>

      <div className="rg-grid rg-gap-5 rg-p-5 xl:rg-grid-cols-[minmax(0,1.55fr)_320px]">
        <div>
          <div className="rg-relative rg-aspect-[7/4.2] rg-overflow-hidden rg-rounded-[30px] rg-border rg-border-white/10 rg-bg-[radial-gradient(circle_at_top,rgba(113,217,255,0.14),transparent_32%),linear-gradient(180deg,#121a2a,#0a101b)]">
            <div className="rg-absolute rg-inset-0 rg-bg-runes" />
            <div className="rg-absolute rg-inset-0 rg-grid rg-grid-cols-3 rg-gap-4 rg-p-5">
              {panel.symbols.map((symbol, index) => (
                <div key={`${panel.id}_${symbol}_${index}`} className="rg-flex rg-flex-col rg-items-center rg-justify-center rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.05] rg-shadow-soft">
                  <span className="rg-font-display rg-text-[clamp(2rem,5vw,3.25rem)] rg-font-semibold rg-text-white">{SYMBOL_DEFINITIONS[symbol].icon}</span>
                  <span className="rg-mt-2 rg-text-xs rg-font-semibold rg-tracking-[0.18em] rg-text-slate-300">{SYMBOL_DEFINITIONS[symbol].label}</span>
                </div>
              ))}
            </div>

            <div className="rg-pointer-events-none rg-absolute rg-left-5 rg-top-5 rg-rounded-full rg-bg-slate-950/48 rg-px-4 rg-py-2 rg-text-sm rg-font-semibold rg-text-white">
              예상 보상 {formatCompact(panel.previewReward, compactNumbers)}
            </div>

            <ScratchCanvas
              panelId={panel.id}
              scratchedPercent={panel.scratchedPercent}
              revealed={panel.revealed}
              brushRadius={brushRadius}
              reducedMotion={reducedMotion}
              onProgress={onScratchProgress}
            />

            {panel.revealed ? (
              <div className="rg-pointer-events-none rg-absolute rg-inset-x-0 rg-bottom-0 rg-flex rg-flex-col rg-items-center rg-gap-2 rg-bg-[linear-gradient(180deg,transparent,rgba(3,6,12,0.9))] rg-px-5 rg-py-8">
                <div className="rg-inline-flex rg-items-center rg-gap-2 rg-rounded-full rg-bg-mystic-gold/12 rg-px-4 rg-py-2 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.2em] rg-text-mystic-gold">
                  <Sparkles size={14} />
                  공개 완료
                </div>
                <strong className="rg-font-display rg-text-[clamp(2.6rem,7vw,4rem)] rg-font-semibold rg-text-white">+{formatCompact(panel.reward, compactNumbers)}</strong>
                <p className="rg-m-0 rg-text-center rg-text-sm rg-leading-7 rg-text-slate-200">{panel.specialEffect.description}</p>
              </div>
            ) : null}
          </div>

          <div className="rg-mt-4 rg-flex rg-flex-wrap rg-items-center rg-justify-between rg-gap-3">
            <div className="rg-flex-1">
              <div className="rg-mb-2 rg-flex rg-items-center rg-justify-between rg-text-sm rg-text-slate-300">
                <span>긁힘 비율</span>
                <strong className="rg-font-semibold rg-text-white">{formatPercent(panel.scratchedPercent, 1)}</strong>
              </div>
              <div className="rg-h-3 rg-overflow-hidden rg-rounded-full rg-bg-white/[0.06]">
                <div className="rg-h-full rg-rounded-full rg-bg-[linear-gradient(90deg,#53d3c2,#f2cd72,#a98cff)]" style={{ width: `${Math.min(100, panel.scratchedPercent)}%` }} />
              </div>
              <div className="rg-mt-2 rg-flex rg-justify-between rg-text-xs rg-text-slate-400">
                <span>자동 공개 기준 {formatPercent(panel.autoRevealThreshold, 0)}</span>
                <span>{panel.comboLabel}</span>
              </div>
            </div>

            <div className="rg-flex rg-flex-wrap rg-gap-2">
              {!panel.revealed ? (
                <button
                  type="button"
                  onClick={onRevealNow}
                  disabled={!canForceReveal}
                  className={`rg-min-h-[48px] rg-rounded-full rg-px-5 rg-text-sm rg-font-semibold ${
                    canForceReveal
                      ? 'rg-border rg-border-mystic-gold/24 rg-bg-mystic-gold/14 rg-text-mystic-gold'
                      : 'rg-cursor-not-allowed rg-border rg-border-white/8 rg-bg-white/[0.03] rg-text-slate-500'
                  }`}
                >
                  결과 먼저 보기
                </button>
              ) : (
                <button type="button" onClick={onNextPanel} className="rg-min-h-[48px] rg-rounded-full rg-border rg-border-mystic-teal/24 rg-bg-mystic-teal/14 rg-px-5 rg-text-sm rg-font-semibold rg-text-mystic-teal">
                  다음 패널 열기
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="rg-space-y-4">
          <div className="rg-rounded-[28px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
            <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">패널 정보</p>
            <div className="rg-mt-4 rg-space-y-3 rg-text-sm rg-text-slate-300">
              <div className="rg-flex rg-items-center rg-justify-between">
                <span>패널 비용</span>
                <strong className="rg-text-white">{formatCompact(panel.costPaid, compactNumbers)}</strong>
              </div>
              <div className="rg-flex rg-items-center rg-justify-between">
                <span>특수 효과</span>
                <strong className="rg-text-white">{panel.specialEffect.label}</strong>
              </div>
              <div className="rg-flex rg-items-center rg-justify-between">
                <span>최종 보상</span>
                <strong className="rg-text-mystic-gold">{formatCompact(panel.reward, compactNumbers)}</strong>
              </div>
            </div>
          </div>

          <div className="rg-rounded-[28px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
            <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">봉인 해설</p>
            <p className="rg-mt-3 rg-text-sm rg-leading-7 rg-text-slate-300">{panel.specialEffect.description}</p>
            <p className="rg-mb-0 rg-mt-3 rg-text-sm rg-leading-7 rg-text-slate-400">
              결과는 패널 생성 순간 이미 정해집니다. 지금은 그 결과를 손으로 드러내는 과정만 남아 있습니다.
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
