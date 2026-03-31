import type { ScratchFeedback } from '@/types/game';

const toneClass: Record<ScratchFeedback['tone'], string> = {
  reward: 'rg-border-mystic-gold/30 rg-bg-mystic-gold/10 rg-text-mystic-gold',
  rare: 'rg-border-mystic-violet/32 rg-bg-mystic-violet/12 rg-text-mystic-violet',
  warning: 'rg-border-rose-400/25 rg-bg-rose-400/12 rg-text-rose-200',
  system: 'rg-border-cyan-300/24 rg-bg-cyan-300/10 rg-text-cyan-100',
};

const toneLabel: Record<ScratchFeedback['tone'], string> = {
  reward: '획득',
  rare: '희귀 해제',
  warning: '주의',
  system: '안내',
};

export function FeedbackToasts({ entries }: { entries: ScratchFeedback[] }) {
  if (!entries.length) return null;

  return (
    <div className="rg-pointer-events-none rg-fixed rg-bottom-5 rg-right-5 rg-z-40 rg-flex rg-max-w-[calc(100vw-2rem)] rg-flex-col rg-items-end rg-gap-3">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`rg-feedback-toast rg-rounded-2xl rg-border rg-px-4 rg-py-3 rg-shadow-soft ${toneClass[entry.tone]} ${
            entry.tone === 'rare' ? 'rg-feedback-toast--rare' : ''
          }`}
        >
          <div className="rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-opacity-80">{toneLabel[entry.tone]}</div>
          <div className="rg-mt-1 rg-text-sm rg-font-semibold">{entry.label}</div>
        </div>
      ))}
    </div>
  );
}
