type ProgressBarProps = {
  value: number;
  max?: number;
  tone?: 'cyan' | 'teal' | 'amber' | 'coral' | 'violet' | 'lime';
  label?: string;
};

const toneClass = {
  cyan: 'pg-from-sky-400 pg-to-cyan-300',
  teal: 'pg-from-emerald-400 pg-to-teal-300',
  amber: 'pg-from-amber-400 pg-to-orange-300',
  coral: 'pg-from-orange-400 pg-to-rose-400',
  violet: 'pg-from-violet-400 pg-to-fuchsia-400',
  lime: 'pg-from-lime-400 pg-to-emerald-400',
};

export function ProgressBar({ value, max = 100, tone = 'cyan', label }: ProgressBarProps) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="pg-space-y-2">
      {label ? <div className="pg-text-xs pg-text-slate-400">{label}</div> : null}
      <div className="pg-h-2.5 pg-overflow-hidden pg-rounded-full pg-bg-white/8">
        <div className={`pg-h-full pg-rounded-full pg-bg-gradient-to-r ${toneClass[tone]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
