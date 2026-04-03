import { useGameStore } from '@/store/useGameStore';
import { formatNumber } from '@/utils/format';

export function TopBar() {
  const account = useGameStore((state) => state.account);
  const computed = useGameStore((state) => state.computed);
  const compact = useGameStore((state) => state.settings.compactNumbers);

  return (
    <header className="pg-rounded-[30px] pg-border pg-border-white/10 pg-bg-[linear-gradient(180deg,rgba(16,24,40,0.96),rgba(7,11,21,0.96))] pg-p-5 pg-shadow-shell">
      <div className="pg-flex pg-flex-col pg-gap-4 lg:pg-flex-row lg:pg-items-end lg:pg-justify-between">
        <div>
          <p className="pg-m-0 pg-text-[11px] pg-font-semibold pg-uppercase pg-tracking-[0.26em] pg-text-sky-200/70">Probability Forge</p>
          <h1 className="pg-mb-0 pg-mt-2 pg-font-display pg-text-[clamp(1.8rem,4vw,3.2rem)] pg-font-semibold pg-text-white">확률조작게임</h1>
          <p className="pg-mb-0 pg-mt-2 pg-max-w-3xl pg-text-sm pg-leading-7 pg-text-slate-300">
            강화, 연구, 제작, 원정, 자동화를 묶어 운용하는 실험형 공방 성장 프로토타입입니다.
          </p>
        </div>
        <div className="pg-grid pg-grid-cols-2 pg-gap-3 sm:pg-grid-cols-4">
          <Metric label="계정 레벨" value={String(account.level)} />
          <Metric label="명성" value={formatNumber(account.fame, compact)} />
          <Metric label="공방 전력" value={formatNumber(computed.workshopPower, compact)} />
          <Metric label="현재 칭호" value={computed.titleLabel} />
        </div>
      </div>
    </header>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/5 pg-px-3 pg-py-3">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-1 pg-font-display pg-text-lg pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}
