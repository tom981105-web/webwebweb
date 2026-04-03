import type { PropsWithChildren, ReactNode } from 'react';

type PanelCardProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}>;

export function PanelCard({ title, subtitle, action, className = '', children }: PanelCardProps) {
  return (
    <section className={`pg-rounded-[28px] pg-border pg-border-white/10 pg-bg-panel pg-p-5 pg-shadow-card ${className}`}>
      <div className="pg-flex pg-items-start pg-justify-between pg-gap-4">
        <div>
          <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.22em] pg-text-slate-400">{subtitle ?? 'Workshop Panel'}</p>
          <h2 className="pg-mb-0 pg-mt-2 pg-font-display pg-text-xl pg-font-semibold pg-text-white">{title}</h2>
        </div>
        {action}
      </div>
      <div className="pg-mt-4 pg-space-y-4">{children}</div>
    </section>
  );
}
