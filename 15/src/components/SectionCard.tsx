import type { ReactNode } from 'react';

type SectionCardProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ kicker, title, subtitle, action, children, className = '' }: SectionCardProps) {
  return (
    <section className={`ap-card ${className}`.trim()}>
      <header className="ap-card-header">
        <div>
          {kicker ? <p className="ap-kicker">{kicker}</p> : null}
          <h2 className="ap-card-title">{title}</h2>
          {subtitle ? <p className="ap-card-subtitle">{subtitle}</p> : null}
        </div>
        {action ? <div className="ap-card-action">{action}</div> : null}
      </header>
      {children}
    </section>
  );
}
