type ResourceChipProps = {
  label: string;
  value: string;
  accent?: string;
};

export function ResourceChip({ label, value, accent = 'pg-border-white/10 pg-bg-white/5' }: ResourceChipProps) {
  return (
    <div className={`pg-rounded-2xl pg-border pg-px-3 pg-py-2 ${accent}`}>
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-1 pg-font-display pg-text-lg pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}
