import { PanelCard } from '@/components/ui/PanelCard';
import { useGameStore } from '@/store/useGameStore';
import { formatDateTime } from '@/utils/format';

export function RecordsPanel() {
  const account = useGameStore((state) => state.account);
  const logs = useGameStore((state) => state.logs);

  return (
    <div className="pg-space-y-4">
      <PanelCard title="기록실" subtitle="Records">
        <div className="pg-grid pg-gap-3 md:pg-grid-cols-2 xl:pg-grid-cols-4">
          <Tile label="강화 시도" value={String(account.stats.enhanceAttempts)} />
          <Tile label="강화 성공" value={String(account.stats.enhanceSuccesses)} />
          <Tile label="연구 완료" value={String(account.stats.researchCompleted)} />
          <Tile label="원정 완료" value={String(account.stats.expeditionsCompleted)} />
        </div>
      </PanelCard>
      <PanelCard title="최근 로그" subtitle="Recent Activity">
        <div className="pg-space-y-3">
          {logs.slice(0, 16).map((log) => (
            <div key={log.id} className="pg-rounded-2xl pg-border pg-border-white/8 pg-bg-white/[0.03] pg-p-3">
              <div className="pg-flex pg-items-center pg-justify-between">
                <div className="pg-text-xs pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{log.type}</div>
                <div className="pg-text-[11px] pg-text-slate-500">{formatDateTime(log.at)}</div>
              </div>
              <div className="pg-mt-2 pg-text-sm pg-text-slate-200">{log.message}</div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-2 pg-font-display pg-text-2xl pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}
