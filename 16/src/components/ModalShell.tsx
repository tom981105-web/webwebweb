import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';

type ModalShellProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function ModalShell({ open, title, subtitle, onClose, children }: ModalShellProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="pg-fixed pg-inset-0 pg-z-50 pg-flex pg-items-center pg-justify-center pg-bg-black/65 pg-p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="pg-w-full pg-max-w-4xl pg-rounded-[32px] pg-border pg-border-white/12 pg-bg-[linear-gradient(180deg,rgba(14,20,36,0.98),rgba(8,12,23,0.98))] pg-p-6 pg-shadow-[0_30px_90px_rgba(0,0,0,0.5)]"
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 18, opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="pg-flex pg-items-start pg-justify-between pg-gap-4">
              <div>
                <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.24em] pg-text-sky-200/70">Relic console</p>
                <h2 className="pg-mb-0 pg-mt-2 pg-font-display pg-text-3xl pg-font-semibold pg-text-white">{title}</h2>
                {subtitle ? <p className="pg-mb-0 pg-mt-3 pg-text-sm pg-leading-7 pg-text-slate-300">{subtitle}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="pg-rounded-full pg-border pg-border-white/12 pg-bg-white/5 pg-px-4 pg-py-2 pg-text-sm pg-font-semibold pg-text-slate-200 transition hover:pg-border-white/20 hover:pg-bg-white/10"
              >
                Close
              </button>
            </div>
            <div className="pg-mt-5">{children}</div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
