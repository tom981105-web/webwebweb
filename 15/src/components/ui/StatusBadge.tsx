type StatusBadgeProps = {
  label: string;
  tone?: 'neutral' | 'good' | 'bad' | 'warning';
};

const toneMap = {
  neutral: 'pg-border-white/10 pg-bg-white/5 pg-text-slate-300',
  good: 'pg-border-emerald-400/25 pg-bg-emerald-400/10 pg-text-emerald-200',
  bad: 'pg-border-rose-400/25 pg-bg-rose-400/10 pg-text-rose-200',
  warning: 'pg-border-amber-400/25 pg-bg-amber-400/10 pg-text-amber-100',
};

export function StatusBadge({ label, tone = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`pg-inline-flex pg-items-center pg-rounded-full pg-border pg-px-2.5 pg-py-1 pg-text-[11px] pg-font-medium ${toneMap[tone]}`}>
      {label}
    </span>
  );
}
