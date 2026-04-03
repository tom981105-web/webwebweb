import type { PropsWithChildren, ReactNode } from 'react';

type ModalShellProps = PropsWithChildren<{
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
}>;

export function ModalShell({ open, title, description, onClose, footer, children }: ModalShellProps) {
  if (!open) return null;

  return (
    <div className="rg-fixed rg-inset-0 rg-z-50 rg-flex rg-items-center rg-justify-center rg-bg-slate-950/82 rg-px-4 rg-py-8">
      <div className="rg-absolute rg-inset-0" onClick={onClose} />
      <div className="rg-relative rg-w-full rg-max-w-4xl rg-overflow-hidden rg-rounded-[32px] rg-border rg-border-white/10 rg-bg-[linear-gradient(180deg,rgba(15,20,34,0.98),rgba(10,14,25,0.98))] rg-shadow-card">
        <div className="rg-flex rg-items-start rg-justify-between rg-gap-4 rg-border-b rg-border-white/8 rg-px-6 rg-py-5">
          <div className="rg-min-w-0">
            <h2 className="rg-m-0 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">{title}</h2>
            {description ? <p className="rg-mt-2 rg-text-sm rg-leading-7 rg-text-slate-300">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rg-rounded-full rg-border rg-border-white/10 rg-bg-white/5 rg-px-4 rg-py-2 rg-text-xs rg-font-semibold rg-text-slate-200 hover:rg-border-white/20 hover:rg-bg-white/10"
          >
            닫기
          </button>
        </div>
        <div className="rg-scrollbar rg-max-h-[78vh] rg-overflow-y-auto rg-px-6 rg-py-5">{children}</div>
        {footer ? <div className="rg-border-t rg-border-white/8 rg-bg-white/[0.02] rg-px-6 rg-py-4">{footer}</div> : null}
      </div>
    </div>
  );
}
