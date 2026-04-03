import { AnimatePresence, motion } from 'framer-motion';

import { useGameStore } from '@/store/useGameStore';
import { formatDateTime } from '@/utils/format';

export function ToastRail() {
  const logs = useGameStore((state) => state.logs.slice(0, 4));

  return (
    <div className="pg-fixed pg-bottom-4 pg-right-4 pg-z-50 pg-space-y-3">
      <AnimatePresence>
        {logs.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="pg-w-[min(360px,calc(100vw-2rem))] pg-rounded-2xl pg-border pg-border-white/10 pg-bg-forge-900/92 pg-p-4 pg-shadow-card"
          >
            <div className="pg-flex pg-items-center pg-justify-between pg-gap-3">
              <div className="pg-text-xs pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{entry.type}</div>
              <div className="pg-text-[11px] pg-text-slate-500">{formatDateTime(entry.at)}</div>
            </div>
            <p className="pg-mb-0 pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-200">{entry.message}</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
