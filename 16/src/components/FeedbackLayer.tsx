import { AnimatePresence, motion } from 'framer-motion';

import { useGameStore } from '@/store/gameStore';
import { formatNumber } from '@/utils/format';

export function FeedbackLayer() {
  const compact = useGameStore((state) => state.settings.compactNumbers);
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);
  const feedbackBursts = useGameStore((state) => state.feedbackBursts);
  const consumeFeedbackBurst = useGameStore((state) => state.consumeFeedbackBurst);

  return (
    <div className="pg-pointer-events-none pg-fixed pg-bottom-4 pg-right-4 pg-z-50 pg-flex pg-w-[min(360px,calc(100vw-2rem))] pg-flex-col pg-gap-3">
      <AnimatePresence>
        {feedbackBursts.map((entry) => (
          <motion.div
            key={entry.id}
            initial={reducedMotion ? false : { opacity: 0, y: 22, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.24 }}
            onAnimationComplete={() => {
              window.setTimeout(() => consumeFeedbackBurst(entry.id), 1700);
            }}
            className={`pg-rounded-[22px] pg-border pg-p-4 pg-shadow-card ${
              entry.tone === 'jackpot'
                ? 'pg-border-amber-300/30 pg-bg-amber-300/10'
                : entry.tone === 'epic'
                  ? 'pg-border-violet-300/30 pg-bg-violet-300/10'
                  : entry.tone === 'rare'
                    ? 'pg-border-cyan-300/30 pg-bg-cyan-300/10'
                    : 'pg-border-white/12 pg-bg-white/[0.08]'
            }`}
          >
            <div className="pg-text-sm pg-font-semibold pg-text-white">{entry.label}</div>
            {typeof entry.amount === 'number' ? (
              <div className="pg-mt-1 pg-font-display pg-text-2xl pg-font-semibold pg-text-white">+{formatNumber(entry.amount, compact)}</div>
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
