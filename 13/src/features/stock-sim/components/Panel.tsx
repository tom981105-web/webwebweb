import type { PropsWithChildren, ReactNode } from 'react';

type PanelProps = PropsWithChildren<{
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
  collapsed?: boolean;
  className?: string;
  bodyClassName?: string;
  tone?: 'default' | 'feature' | 'accent';
}>;

export function Panel({
  title,
  subtitle,
  icon,
  action,
  collapsed = false,
  className = '',
  bodyClassName = '',
  tone = 'default',
  children,
}: PanelProps) {
  const toneClass =
    tone === 'feature'
      ? 'ss-border-cyan-300/16'
      : tone === 'accent'
        ? 'ss-border-amber-300/16'
        : '';

  return (
    <section
      className={`ss-ui-panel-surface ss-flex ss-h-full ss-min-h-0 ss-flex-col ss-rounded-[30px] ${toneClass} ${className}`}
    >
      <div className="ss-pointer-events-none ss-absolute ss-inset-x-6 ss-top-0 ss-h-px ss-bg-gradient-to-r ss-from-transparent ss-via-cyan-200/50 ss-to-transparent" />
      <header
        className={`ss-relative ss-flex ss-items-start ss-justify-between ss-gap-3 ss-bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] ss-px-4 ss-py-4 sm:ss-px-5 ${
          collapsed ? '' : 'ss-border-b ss-border-white/8'
        }`}
      >
        <div className="ss-flex ss-items-start ss-gap-3">
          {icon ? (
            <div className="ss-flex ss-h-11 ss-w-11 ss-items-center ss-justify-center ss-rounded-[18px] ss-border ss-border-cyan-300/16 ss-bg-[radial-gradient(circle_at_top,rgba(86,212,255,0.2),rgba(86,212,255,0.06))] ss-text-cyan-100">
              {icon}
            </div>
          ) : null}
          <div className="ss-min-w-0">
            <h2 className="ss-font-display ss-text-[1.05rem] ss-font-semibold ss-tracking-[0.01em] ss-text-white">
              {title}
            </h2>
            {subtitle ? (
              <p className="ss-mt-1 ss-max-w-3xl ss-text-[12px] ss-leading-6 ss-text-slate-300/78">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="ss-flex ss-shrink-0 ss-items-center ss-gap-2">{action}</div> : null}
      </header>
      {collapsed ? null : (
        <div className={`ss-relative ss-flex-1 ss-min-h-0 ss-p-4 sm:ss-p-5 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </section>
  );
}
