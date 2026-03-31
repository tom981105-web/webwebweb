import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';

import { PANEL_RARITIES, SYMBOL_DEFINITIONS } from '@/data/balance';
import { ScratchCanvas } from '@/components/ScratchCanvas';
import type { PanelCard } from '@/types/game';
import { formatCompact, formatPercent } from '@/utils/format';

const RARE_SET = new Set(['epic', 'legendary', 'mythic']);
const JACKPOT_SET = new Set(['legendary', 'mythic']);

function buildSparkOffsets(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${12 + ((index * 73) % 76)}%`,
    top: `${10 + ((index * 29) % 58)}%`,
    delay: `${index * 0.08}s`,
    duration: `${1.35 + (index % 4) * 0.18}s`,
  }));
}

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
  const revealHint = Math.max(0, panel.autoRevealThreshold - panel.scratchedPercent);
  const isRareHit = RARE_SET.has(panel.rarity);
  const isJackpotHit = JACKPOT_SET.has(panel.rarity) || panel.specialEffect.id === 'jackpot';
  const [bursting, setBursting] = useState(false);
  const previousRevealStateRef = useRef(panel.revealed);
  const thresholdMarker = Math.max(0, Math.min(100, panel.autoRevealThreshold));
  const sparkOffsets = buildSparkOffsets(isJackpotHit ? 12 : 8);

  useEffect(() => {
    const didRevealNow = !previousRevealStateRef.current && panel.revealed;
    previousRevealStateRef.current = panel.revealed;

    if (!didRevealNow) return;
    setBursting(true);
    const timer = window.setTimeout(() => setBursting(false), reducedMotion ? 850 : 1800);
    return () => window.clearTimeout(timer);
  }, [panel.revealed, panel.id, reducedMotion]);

  useEffect(() => {
    if (!panel.revealed) {
      previousRevealStateRef.current = false;
      setBursting(false);
    }
  }, [panel.id, panel.revealed]);

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
          <div
            className={`rg-scratch-shell rg-relative rg-aspect-[7/4.2] rg-overflow-hidden rg-rounded-[30px] rg-border rg-border-white/10 rg-bg-[radial-gradient(circle_at_top,rgba(113,217,255,0.14),transparent_32%),linear-gradient(180deg,#121a2a,#0a101b)] ${
              panel.revealed ? 'rg-scratch-shell--revealed' : ''
            } ${bursting && isRareHit ? 'rg-scratch-shell--rare' : ''}`}
            style={
              panel.revealed
                ? ({
                    '--relic-glow': rarityMeta.glow,
                  } as CSSProperties)
                : undefined
            }
          >
            <div className="rg-absolute rg-inset-0 rg-bg-runes" />
            <div className="rg-absolute rg-inset-0 rg-grid rg-grid-cols-3 rg-gap-4 rg-p-5">
              {panel.symbols.map((symbol, index) => (
                <div
                  key={`${panel.id}_${symbol}_${index}`}
                  className={`rg-flex rg-flex-col rg-items-center rg-justify-center rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.05] rg-shadow-soft ${
                    panel.revealed ? 'rg-symbol-slot--revealed' : ''
                  }`}
                >
                  <span className="rg-font-display rg-text-[clamp(2rem,5vw,3.25rem)] rg-font-semibold rg-text-white">
                    {SYMBOL_DEFINITIONS[symbol].icon}
                  </span>
                  <span className="rg-mt-2 rg-text-xs rg-font-semibold rg-tracking-[0.18em] rg-text-slate-300">
                    {SYMBOL_DEFINITIONS[symbol].label}
                  </span>
                </div>
              ))}
            </div>

            <div className="rg-pointer-events-none rg-absolute rg-left-5 rg-top-5 rg-rounded-full rg-bg-slate-950/48 rg-px-4 rg-py-2 rg-text-sm rg-font-semibold rg-text-white">
              예상 보상 {formatCompact(panel.previewReward, compactNumbers)}
            </div>

            {!panel.revealed && panel.scratchedPercent < 6 ? (
              <div className="rg-pointer-events-none rg-absolute rg-inset-x-0 rg-top-1/2 rg-flex rg--translate-y-1/2 rg-justify-center">
                <div className="rg-rounded-full rg-border rg-border-white/12 rg-bg-slate-950/52 rg-px-5 rg-py-3 rg-text-sm rg-font-medium rg-text-slate-100">
                  패널을 문질러 숨겨진 룬을 드러내세요
                </div>
              </div>
            ) : null}

            {bursting ? (
              <div className={`rg-pointer-events-none rg-absolute rg-inset-0 ${isJackpotHit ? 'rg-rare-burst--jackpot' : 'rg-rare-burst'}`}>
                {sparkOffsets.map((spark) => (
                  <span
                    key={`${panel.id}_spark_${spark.id}`}
                    className="rg-rare-spark"
                    style={
                      {
                        left: spark.left,
                        top: spark.top,
                        animationDelay: spark.delay,
                        animationDuration: spark.duration,
                    } as CSSProperties
                  }
                />
                ))}
              </div>
            ) : null}

            <ScratchCanvas
              panelId={panel.id}
              scratchedPercent={panel.scratchedPercent}
              revealed={panel.revealed}
              brushRadius={brushRadius}
              reducedMotion={reducedMotion}
              onProgress={onScratchProgress}
            />

            {panel.revealed ? (
              <div className="rg-reveal-veil rg-pointer-events-none rg-absolute rg-inset-x-0 rg-bottom-0 rg-flex rg-flex-col rg-items-center rg-gap-3 rg-px-5 rg-py-8">
                <div className={`rg-inline-flex rg-items-center rg-gap-2 rg-rounded-full rg-px-4 rg-py-2 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.2em] ${
                  isRareHit ? 'rg-bg-mystic-violet/16 rg-text-mystic-violet' : 'rg-bg-mystic-gold/12 rg-text-mystic-gold'
                }`}>
                  <Sparkles size={14} />
                  {isRareHit ? '희귀 봉인 해제' : '공개 완료'}
                </div>
                <strong className={`rg-result-value rg-font-display rg-text-[clamp(2.8rem,7vw,4.6rem)] rg-font-semibold ${isRareHit ? 'rg-text-mystic-violet' : 'rg-text-white'}`}>
                  +{formatCompact(panel.reward, compactNumbers)}
                </strong>
                <p className="rg-m-0 rg-max-w-[560px] rg-text-center rg-text-sm rg-leading-7 rg-text-slate-100">
                  {panel.specialEffect.description}
                </p>
              </div>
            ) : null}
          </div>

          <div className="rg-mt-4 rg-grid rg-gap-4 lg:rg-grid-cols-[minmax(0,1fr)_auto] lg:rg-items-end">
            <div>
              <div className="rg-mb-2 rg-flex rg-items-center rg-justify-between rg-text-sm rg-text-slate-300">
                <span>긁힌 비율</span>
                <strong className="rg-font-semibold rg-text-white">{formatPercent(panel.scratchedPercent, 1)}</strong>
              </div>
              <div className="rg-relative rg-h-3 rg-overflow-hidden rg-rounded-full rg-bg-white/[0.06]">
                <div
                  className="rg-h-full rg-rounded-full rg-bg-[linear-gradient(90deg,#53d3c2,#f2cd72,#a98cff)] rg-transition-[width] rg-duration-200"
                  style={{ width: `${Math.min(100, panel.scratchedPercent)}%` }}
                />
                <span
                  className="rg-absolute rg-top-1/2 rg-h-5 rg-w-[2px] rg--translate-y-1/2 rg-bg-white/80"
                  style={{ left: `calc(${thresholdMarker}% - 1px)` }}
                />
              </div>
              <div className="rg-mt-2 rg-flex rg-flex-wrap rg-justify-between rg-gap-2 rg-text-xs rg-text-slate-400">
                <span>자동 공개 기준 {formatPercent(panel.autoRevealThreshold, 0)}</span>
                <span>{panel.comboLabel}</span>
                {!panel.revealed ? (
                  <span className="rg-text-mystic-teal">
                    {canForceReveal ? '지금 공개 가능' : `${formatPercent(revealHint, 1)}만 더 긁으면 공개 가능`}
                  </span>
                ) : null}
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
                <button
                  type="button"
                  onClick={onNextPanel}
                  className="rg-min-h-[48px] rg-rounded-full rg-border rg-border-mystic-teal/24 rg-bg-mystic-teal/14 rg-px-5 rg-text-sm rg-font-semibold rg-text-mystic-teal"
                >
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
                <strong className={isRareHit ? 'rg-text-mystic-violet' : 'rg-text-mystic-gold'}>
                  {formatCompact(panel.reward, compactNumbers)}
                </strong>
              </div>
            </div>
          </div>

          <div className="rg-rounded-[28px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
            <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">플레이 힌트</p>
            <div className="rg-mt-3 rg-space-y-3">
              <div className="rg-flex rg-items-start rg-gap-3 rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-flex rg-h-10 rg-w-10 rg-items-center rg-justify-center rg-rounded-2xl rg-bg-mystic-teal/16 rg-text-mystic-teal">
                  <Wand2 size={16} />
                </div>
                <div className="rg-text-sm rg-leading-7 rg-text-slate-300">
                  덮개를 전부 지울 필요는 없습니다. 기준선 근처까지만 밀어도 보상을 먼저 열 수 있습니다.
                </div>
              </div>
              <div className="rg-rounded-[22px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4 rg-text-sm rg-leading-7 rg-text-slate-300">
                결과는 패널이 생성되는 순간 이미 정해집니다. 지금은 그 결과를 손으로 드러내는 과정만 남아 있습니다.
              </div>
              {isRareHit ? (
                <div className="rg-rounded-[22px] rg-border rg-border-mystic-violet/18 rg-bg-mystic-violet/10 rg-p-4 rg-text-sm rg-leading-7 rg-text-mystic-violet">
                  희귀 봉인은 업그레이드 체감이 크게 느껴지는 구간입니다. 다음 패널을 열기 전에 여운을 한번 즐겨보세요.
                </div>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
