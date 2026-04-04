import { useEffect, useState } from 'react';

import { useGameStore } from '@/store/gameStore';
import { ModalShell } from './ModalShell';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const compactNumbers = useGameStore((state) => state.settings.compactNumbers);
  const reducedMotion = useGameStore((state) => state.settings.reducedMotion);
  const exportSaveString = useGameStore((state) => state.exportSaveString);
  const importSaveString = useGameStore((state) => state.importSaveString);
  const resetProgress = useGameStore((state) => state.resetProgress);
  const toggleCompactNumbers = useGameStore((state) => state.toggleCompactNumbers);
  const toggleReducedMotion = useGameStore((state) => state.toggleReducedMotion);

  const [payload, setPayload] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setPayload(exportSaveString());
    setMessage('');
  }, [exportSaveString, open]);

  return (
    <ModalShell open={open} onClose={onClose} title="Settings" subtitle="Control your display, backups, and reset options without leaving the archive.">
      <div className="pg-grid pg-gap-4 lg:pg-grid-cols-[320px_minmax(0,1fr)]">
        <div className="pg-space-y-4">
          <ToggleCard
            title="Compact numbers"
            description="Show values as 1.2K, 3.4M, and so on."
            enabled={compactNumbers}
            onToggle={toggleCompactNumbers}
          />
          <ToggleCard
            title="Reduced motion"
            description="Tone down bursts and transitions if you want a calmer view."
            enabled={reducedMotion}
            onToggle={toggleReducedMotion}
          />
          <div className="pg-rounded-[24px] pg-border pg-border-rose-400/20 pg-bg-rose-500/8 pg-p-4">
            <div className="pg-text-sm pg-font-semibold pg-text-white">Reset archive</div>
            <p className="pg-mb-0 pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">
              Clears coins, upgrades, and current seals. Sigils and meta progress are also wiped.
            </p>
            <button
              type="button"
              onClick={() => {
                resetProgress();
                setPayload(exportSaveString());
                setMessage('Progress reset.');
              }}
              className="pg-mt-4 pg-rounded-full pg-border pg-border-rose-300/30 pg-bg-rose-400/12 pg-px-4 pg-py-2 pg-text-sm pg-font-semibold pg-text-rose-100 transition hover:pg-bg-rose-400/20"
            >
              Reset all progress
            </button>
          </div>
        </div>

        <div className="pg-space-y-4">
          <div className="pg-rounded-[24px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
            <div className="pg-text-sm pg-font-semibold pg-text-white">Save string</div>
            <p className="pg-mb-0 pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">
              Export a backup or paste one below to restore your archive on this device.
            </p>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              className="pg-mt-4 pg-h-48 pg-w-full pg-rounded-[18px] pg-border pg-border-white/10 pg-bg-black/20 pg-p-4 pg-text-sm pg-text-slate-200 outline-none placeholder:pg-text-slate-500 focus:pg-border-cyan-300/30"
              spellCheck={false}
            />
            <div className="pg-mt-4 pg-flex pg-flex-wrap pg-gap-3">
              <button
                type="button"
                onClick={() => {
                  const next = exportSaveString();
                  setPayload(next);
                  navigator.clipboard?.writeText(next).catch(() => undefined);
                  setMessage('Backup copied to clipboard.');
                }}
                className="pg-rounded-full pg-bg-[linear-gradient(135deg,#2dd4bf,#38bdf8)] pg-px-5 pg-py-2 pg-text-sm pg-font-semibold pg-text-slate-950 transition hover:pg-scale-[1.01]"
              >
                Export backup
              </button>
              <button
                type="button"
                onClick={() => {
                  const result = importSaveString(payload);
                  setMessage(result.ok ? 'Backup imported successfully.' : result.error ?? 'Import failed.');
                }}
                className="pg-rounded-full pg-border pg-border-white/12 pg-bg-white/[0.06] pg-px-5 pg-py-2 pg-text-sm pg-font-semibold pg-text-white transition hover:pg-border-white/20 hover:pg-bg-white/[0.1]"
              >
                Import backup
              </button>
            </div>
            {message ? <div className="pg-mt-3 pg-text-sm pg-text-cyan-200">{message}</div> : null}
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

function ToggleCard({
  title,
  description,
  enabled,
  onToggle,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="pg-rounded-[24px] pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
      <div className="pg-flex pg-items-start pg-justify-between pg-gap-4">
        <div>
          <div className="pg-text-sm pg-font-semibold pg-text-white">{title}</div>
          <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{description}</div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`pg-inline-flex pg-h-10 pg-w-[74px] pg-items-center pg-rounded-full pg-border pg-px-1 transition ${
            enabled ? 'pg-border-cyan-300/30 pg-bg-cyan-300/12' : 'pg-border-white/10 pg-bg-white/[0.04]'
          }`}
        >
          <span
            className={`pg-inline-block pg-h-8 pg-w-8 pg-rounded-full pg-bg-white transition ${enabled ? 'pg-translate-x-[30px]' : 'pg-translate-x-0'}`}
          />
        </button>
      </div>
    </div>
  );
}
