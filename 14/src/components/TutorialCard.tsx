import { TUTORIAL_MESSAGES } from '@/data/balance';

export function TutorialCard({
  hidden,
  onClose,
}: {
  hidden: boolean;
  onClose: () => void;
}) {
  if (hidden) return null;

  return (
    <section className="rg-rounded-[28px] rg-border rg-border-mystic-gold/18 rg-bg-[linear-gradient(135deg,rgba(242,205,114,0.12),rgba(169,140,255,0.08))] rg-p-5 rg-shadow-glow">
      <div className="rg-flex rg-items-start rg-justify-between rg-gap-4">
        <div>
          <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-mystic-gold/78">빠른 안내</p>
          <h3 className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">패널을 긁고, 보상을 받고, 더 빠르게 성장하세요</h3>
        </div>
        <button type="button" onClick={onClose} className="rg-rounded-full rg-border rg-border-white/10 rg-bg-white/5 rg-px-4 rg-py-2 rg-text-xs rg-font-semibold rg-text-slate-200 hover:rg-bg-white/10">
          닫기
        </button>
      </div>
      <div className="rg-mt-4 rg-grid rg-gap-3 md:rg-grid-cols-3">
        {TUTORIAL_MESSAGES.map((message, index) => (
          <div key={message} className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-4 rg-text-sm rg-leading-7 rg-text-slate-200">
            <span className="rg-mr-2 rg-inline-flex rg-h-6 rg-w-6 rg-items-center rg-justify-center rg-rounded-full rg-bg-mystic-gold/18 rg-text-xs rg-font-bold rg-text-mystic-gold">
              {index + 1}
            </span>
            {message}
          </div>
        ))}
      </div>
    </section>
  );
}
