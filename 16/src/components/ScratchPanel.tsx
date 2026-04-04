import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Coins, RefreshCw, Sparkles, Wand2 } from 'lucide-react';

import { PANEL_MODIFIERS, PANEL_TIERS, RARITIES, SYMBOLS } from '@/data/balance';
import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';
import { ScratchCanvas } from './ScratchCanvas';

export function ScratchPanel() {
  const panel = useGameStore((state) => state.currentPanel);
  const selectedTier = useGameStore((state) => state.selectedTier);
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const derived = useGameStore((state) => state.derived);
  const buyPanel = useGameStore((state) => state.buyPanel);
  const revealPanel = useGameStore((state) => state.revealCurrentPanel);
  const updateScratchProgress = useGameStore((state) => state.updateScratchProgress);
  const addScratchDistance = useGameStore((state) => state.addScratchDistance);
  const [scratchActive, setScratchActive] = useState(false);

  const tierDef = PANEL_TIERS[panel?.tier ?? selectedTier];
  const revealReady = panel ? panel.scratchedPercent >= derived.autoRevealThreshold * 100 : false;

  if (!panel) {
    return (
      <section className="pg-rounded-[32px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-5">
        <div className="pg-rounded-[28px] pg-border pg-border-dashed pg-border-white/12 pg-bg-black/10 pg-p-8 pg-text-center">
          <div className="pg-font-display pg-text-3xl pg-font-semibold pg-text-white">A fresh seal is ready</div>
          <p className="pg-mb-0 pg-mt-3 pg-text-sm pg-leading-7 pg-text-slate-300">
            Choose a panel tier, scratch the surface, and convert hidden runes into the next wave of upgrades.
          </p>
          <button
            type="button"
            onClick={() => buyPanel(selectedTier, false)}
            className="pg-mt-6 pg-inline-flex pg-min-h-[54px] pg-items-center pg-gap-2 pg-rounded-full pg-bg-[linear-gradient(135deg,#f4d06f,#f59e0b)] pg-px-6 pg-text-base pg-font-semibold pg-text-slate-950 transition hover:pg-scale-[1.01]"
          >
            <Wand2 size={18} />
            <span>Open {tierDef.label}</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="pg-rounded-[32px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-5">
      <div className="pg-flex pg-flex-wrap pg-items-start pg-justify-between pg-gap-3">
        <div>
          <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.22em] pg-text-sky-200/70">Main panel</p>
          <h2 className="pg-mb-0 pg-mt-2 pg-font-display pg-text-3xl pg-font-semibold pg-text-white">{tierDef.label}</h2>
          <p className="pg-mb-0 pg-mt-2 pg-text-sm pg-leading-7 pg-text-slate-300">{tierDef.description}</p>
        </div>
        <div className="pg-flex pg-flex-col pg-items-end pg-gap-2">
          <span className={`pg-inline-flex pg-items-center pg-rounded-full pg-border pg-border-white/12 pg-px-4 pg-py-2 pg-text-sm pg-font-semibold pg-text-white ${RARITIES[panel.rarity].glowClass}`}>
            {RARITIES[panel.rarity].label}
          </span>
          <span className="pg-text-xs pg-text-slate-400">{panel.revealed ? 'Reward revealed' : `${Math.round(panel.scratchedPercent)}% scratched`}</span>
        </div>
      </div>

      <div className={`pg-mt-5 pg-grid pg-gap-4 xl:pg-grid-cols-[minmax(0,1fr)_280px] ${scratchActive ? 'pg-scale-[1.002]' : ''}`}>
        <div className={`pg-relative pg-overflow-hidden pg-rounded-[30px] pg-border pg-border-white/10 pg-bg-[radial-gradient(circle_at_top,rgba(92,255,241,0.12),rgba(17,24,39,0.94)_42%),linear-gradient(180deg,rgba(10,18,30,0.98),rgba(4,8,18,0.98))] pg-p-4 transition ${panel.revealed ? RARITIES[panel.rarity].glowClass : ''}`}>
          <div className="pg-relative pg-overflow-hidden pg-rounded-[28px] pg-border pg-border-white/10 pg-bg-[linear-gradient(180deg,rgba(8,14,24,0.96),rgba(4,8,16,0.98))]">
            <div className="pg-absolute pg-inset-x-0 pg-top-0 pg-z-10 pg-flex pg-items-center pg-justify-between pg-px-4 pg-py-3">
              <div className="pg-inline-flex pg-items-center pg-gap-2 pg-rounded-full pg-bg-black/30 pg-px-3 pg-py-1 pg-text-xs pg-text-slate-200">
                <Sparkles size={14} />
                <span>Reveal at {Math.round(derived.autoRevealThreshold * 100)}%</span>
              </div>
              <div className="pg-inline-flex pg-items-center pg-gap-2 pg-rounded-full pg-bg-black/30 pg-px-3 pg-py-1 pg-text-xs pg-text-slate-200">
                <Coins size={14} />
                <span>Expected {formatNumber(panel.reward, compact)}</span>
              </div>
            </div>

            <div className="pg-relative pg-aspect-[16/10] pg-w-full">
              <div className="pg-absolute pg-inset-0 pg-grid pg-grid-cols-3 pg-grid-rows-2 pg-gap-3 pg-p-6">
                {panel.symbols.map((symbolId, index) => {
                  const symbol = SYMBOLS.find((entry) => entry.id === symbolId)!;
                  return (
                    <motion.div
                      key={`${panel.id}_${index}`}
                      className={`pg-flex pg-items-center pg-justify-center pg-rounded-[24px] pg-border pg-border-white/10 pg-bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] ${panel.revealed ? 'pg-shadow-[0_0_22px_rgba(255,255,255,0.06)]' : ''}`}
                      initial={reducedMotion ? false : { opacity: 0.7, scale: 0.94, y: 8 }}
                      animate={panel.revealed ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0.72, scale: 1, y: 0 }}
                      transition={{ duration: 0.24, delay: reducedMotion ? 0 : index * 0.04 }}
                    >
                      <div className="pg-text-center">
                        <div className={`pg-inline-flex pg-h-16 pg-w-16 pg-items-center pg-justify-center pg-rounded-full bg-gradient-to-br ${symbol.accent} pg-text-3xl pg-font-semibold pg-text-slate-950 shadow-[0_12px_26px_rgba(0,0,0,0.24)]`}>
                          {symbol.glyph}
                        </div>
                        <div className="pg-mt-3 pg-text-xs pg-font-medium pg-text-slate-200">{symbol.label}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <ScratchCanvas
                panelId={panel.id}
                brushRadius={derived.brushRadius}
                externalProgress={panel.scratchedPercent}
                revealed={panel.revealed}
                reducedMotion={reducedMotion}
                onProgress={updateScratchProgress}
                onScratchDistance={addScratchDistance}
                onScratchActiveChange={setScratchActive}
              />

              {!panel.revealed ? (
                <div className="pg-pointer-events-none pg-absolute pg-bottom-4 pg-left-4 pg-right-4 pg-z-20">
                  <div className="pg-overflow-hidden pg-rounded-full pg-border pg-border-white/10 pg-bg-black/35">
                    <div
                      className={`pg-h-3 pg-rounded-full bg-gradient-to-r ${revealReady ? 'from-emerald-300 via-cyan-300 to-violet-300' : 'from-amber-300 via-yellow-400 to-amber-500'} transition-[width] duration-300`}
                      style={{ width: `${panel.scratchedPercent}%` }}
                    />
                  </div>
                  <div className="pg-mt-2 pg-flex pg-items-center pg-justify-between pg-text-xs pg-text-slate-200">
                    <span>{revealReady ? 'The seal is ready. Reveal it now.' : 'Brush away the seal to uncover the hidden layout.'}</span>
                    <span>{Math.round(panel.scratchedPercent)}%</span>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="pg-space-y-4">
          <div className="pg-rounded-[28px] pg-border pg-border-white/12 pg-bg-white/[0.04] pg-p-4">
            <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">Reveal pattern</div>
            <div className="pg-mt-2 pg-text-sm pg-font-semibold pg-text-white">{PANEL_MODIFIERS[panel.specialEffect].label}</div>
            <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{panel.result.summaryText}</div>
            <div className="pg-mt-3 pg-rounded-2xl pg-border pg-border-white/10 pg-bg-black/15 pg-p-4">
              <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.18em] pg-text-slate-400">Claimed reward</div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${panel.id}_${panel.revealed ? 'open' : 'sealed'}`}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.24 }}
                  className={`pg-mt-2 pg-font-display pg-text-4xl pg-font-semibold ${
                    panel.revealed
                      ? panel.result.tone === 'jackpot'
                        ? 'pg-text-amber-200'
                        : panel.result.tone === 'epic'
                          ? 'pg-text-violet-200'
                          : panel.result.tone === 'rare'
                            ? 'pg-text-cyan-200'
                            : 'pg-text-emerald-200'
                      : 'pg-text-slate-500'
                  }`}
                >
                  {panel.revealed ? `+${formatNumber(panel.result.finalReward, compact)}` : 'Seal hidden'}
                </motion.div>
              </AnimatePresence>
              <div className="pg-mt-2 pg-text-xs pg-leading-5 pg-text-slate-400">
                {panel.revealed
                  ? `${panel.result.detailText} · ${panel.result.critical ? 'Critical payout applied' : 'Standard payout'}`
                  : 'Once enough of the cover is gone, the final payout will appear here.'}
              </div>
            </div>
          </div>

          <div className="pg-flex pg-flex-col pg-gap-3">
            <button
              type="button"
              disabled={!revealReady || panel.revealed}
              onClick={() => revealPanel('manual')}
              className="pg-inline-flex pg-min-h-[54px] pg-items-center pg-justify-center pg-gap-2 pg-rounded-full pg-bg-[linear-gradient(135deg,#2dd4bf,#38bdf8)] pg-px-5 pg-text-base pg-font-semibold pg-text-slate-950 transition enabled:hover:pg-scale-[1.01] disabled:pg-cursor-not-allowed disabled:pg-opacity-40"
            >
              <Sparkles size={18} />
              <span>{panel.revealed ? 'Already revealed' : 'Reveal reward'}</span>
            </button>
            <button
              type="button"
              disabled={!panel.revealed}
              onClick={() => buyPanel(selectedTier, false)}
              className="pg-inline-flex pg-min-h-[52px] pg-items-center pg-justify-center pg-gap-2 pg-rounded-full pg-border pg-border-white/12 pg-bg-white/[0.06] pg-px-5 pg-text-sm pg-font-semibold pg-text-white transition enabled:hover:pg-border-white/20 enabled:hover:pg-bg-white/[0.1] disabled:pg-cursor-not-allowed disabled:pg-opacity-40"
            >
              <RefreshCw size={16} />
              <span>Open next panel</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
