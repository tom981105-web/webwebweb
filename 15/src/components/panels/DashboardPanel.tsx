import { PanelCard } from '@/components/ui/PanelCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ResourceChip } from '@/components/ui/ResourceChip';
import { useGameStore } from '@/store/useGameStore';
import { formatNumber, formatPercent } from '@/utils/format';

export function DashboardPanel() {
  const account = useGameStore((state) => state.account);
  const currencies = useGameStore((state) => state.currencies);
  const computed = useGameStore((state) => state.computed);
  const missions = useGameStore((state) => state.missions);
  const season = useGameStore((state) => state.season);
  const offlineSummary = useGameStore((state) => state.offlineSummary);
  const compact = useGameStore((state) => state.settings.compactNumbers);

  return (
    <div className="pg-space-y-4">
      <PanelCard title="메인 대시보드" subtitle="Daily Loop">
        <div className="pg-grid pg-gap-3 md:pg-grid-cols-3 xl:pg-grid-cols-6">
          <ResourceChip label="골드" value={formatNumber(currencies.gold, compact)} />
          <ResourceChip label="데이터 조각" value={formatNumber(currencies.dataShards, compact)} />
          <ResourceChip label="합금 파편" value={formatNumber(currencies.alloyScrap, compact)} />
          <ResourceChip label="확률 코어" value={formatNumber(currencies.probabilityCores, compact)} />
          <ResourceChip label="명성 배지" value={formatNumber(currencies.fameBadges, compact)} />
          <ResourceChip label="유물 파편" value={formatNumber(currencies.relicFragments, compact)} />
        </div>
        <div className="pg-grid pg-gap-4 lg:pg-grid-cols-[1.2fr_0.8fr]">
          <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
            <div className="pg-flex pg-items-center pg-justify-between">
              <div className="pg-text-sm pg-font-medium pg-text-white">계정 성장</div>
              <div className="pg-text-xs pg-text-slate-400">레벨 {account.level}</div>
            </div>
            <div className="pg-mt-2 pg-text-sm pg-text-slate-300">실패해도 계정은 계속 전진합니다. 미션, 업적, 연구 완료가 모두 영구 성장으로 연결됩니다.</div>
            <div className="pg-mt-4">
              <ProgressBar value={account.xp} max={120 + (account.level - 1) * 70} label="다음 레벨 진행도" />
            </div>
          </div>
          <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
            <div className="pg-text-sm pg-font-medium pg-text-white">장기 지표</div>
            <div className="pg-mt-3 pg-grid pg-grid-cols-2 pg-gap-3">
              <Metric label="미션 달성률" value={formatPercent(computed.missionCompletionRate)} />
              <Metric label="컬렉션 달성률" value={formatPercent(computed.collectionCompletionRate)} />
              <Metric label="최고 강화" value={`+${account.records.highestEnhancement}`} />
              <Metric label="최고 공방력" value={formatNumber(account.records.highestWorkshopPower, compact)} />
            </div>
          </div>
        </div>
      </PanelCard>

      <div className="pg-grid pg-gap-4 xl:pg-grid-cols-[1fr_1fr]">
        <PanelCard title="오늘의 운영 루프" subtitle="Daily / Weekly">
          <div className="pg-space-y-3">
            {missions.daily.map((mission) => (
              <div key={mission.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
                <div className="pg-flex pg-items-center pg-justify-between">
                  <div className="pg-text-sm pg-font-medium pg-text-white">{mission.id}</div>
                  <div className="pg-text-xs pg-text-slate-400">{mission.claimed ? '완료' : `${mission.progress}`}</div>
                </div>
                <ProgressBar value={mission.progress} max={Math.max(1, mission.progress || 1)} tone={mission.claimed ? 'lime' : 'cyan'} />
              </div>
            ))}
          </div>
        </PanelCard>

        <PanelCard title="시즌 목표" subtitle="Season Zero">
          <div className="pg-rounded-2xl pg-border pg-border-violet-300/20 pg-bg-violet-300/10 pg-p-4">
            <div className="pg-text-sm pg-font-medium pg-text-white">현재 시즌 통화</div>
            <div className="pg-mt-2 pg-font-display pg-text-3xl pg-font-semibold pg-text-violet-100">{formatNumber(season.currency, compact)}</div>
            <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">연구, 원정, 강화 최고기록을 밀어 올릴수록 시즌 보급이 열립니다.</div>
          </div>
          {offlineSummary ? (
            <div className="pg-rounded-2xl pg-border pg-border-emerald-400/20 pg-bg-emerald-400/10 pg-p-4">
              <div className="pg-text-sm pg-font-medium pg-text-white">오프라인 정산</div>
              <div className="pg-mt-2 pg-text-sm pg-leading-7 pg-text-slate-200">
                골드 {formatNumber(offlineSummary.goldEarned, compact)}, 완료된 연구 {offlineSummary.researchFinished}개, 준비된 원정 {offlineSummary.expeditionsFinished}개
              </div>
            </div>
          ) : null}
        </PanelCard>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/8 pg-bg-white/[0.03] pg-p-3">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-2 pg-font-display pg-text-lg pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}
