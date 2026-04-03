import { EXPEDITION_DEFINITIONS } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { useGameStore } from '@/store/useGameStore';
import { formatDuration } from '@/utils/format';

export function ExpeditionPanel() {
  const store = useGameStore();

  return (
    <div className="pg-space-y-4">
      <PanelCard title="원정 지도" subtitle="Expedition Map">
        <div className="pg-grid pg-gap-3 xl:pg-grid-cols-2">
          {EXPEDITION_DEFINITIONS.map((region) => (
            <div key={region.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
              <div className="pg-flex pg-items-center pg-justify-between">
                <div className="pg-text-sm pg-font-semibold pg-text-white">{region.label}</div>
                <div className="pg-text-xs pg-text-slate-400">{region.difficulty}</div>
              </div>
              <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{region.description}</div>
              <div className="pg-mt-3 pg-text-xs pg-text-slate-500">
                요구 공방력 {region.requirementPower} · 소요 시간 {formatDuration(region.durationMs)}
              </div>
              <button type="button" onClick={() => store.startExpedition(region.id)} className="pg-mt-3 pg-rounded-xl pg-bg-teal-300/90 pg-px-3 pg-py-2 pg-text-xs pg-font-semibold pg-text-slate-950">
                원정 출발
              </button>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="진행 중 원정" subtitle="Active Expeditions">
        <div className="pg-space-y-3">
          {store.expeditions.length ? (
            store.expeditions.map((expedition) => (
              <div key={expedition.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
                <div className="pg-flex pg-items-center pg-justify-between">
                  <div className="pg-text-sm pg-font-semibold pg-text-white">{expedition.regionId}</div>
                  <div className="pg-text-xs pg-text-slate-400">{formatDuration(expedition.endsAt - Date.now())}</div>
                </div>
                <button type="button" onClick={() => store.claimExpedition(expedition.id)} className="pg-mt-3 pg-rounded-xl pg-border pg-border-white/12 pg-bg-white/[0.06] pg-px-3 pg-py-2 pg-text-xs pg-font-medium pg-text-white">
                  보상 수령
                </button>
              </div>
            ))
          ) : (
            <div className="pg-rounded-2xl pg-border pg-border-dashed pg-border-white/10 pg-bg-white/[0.03] pg-p-5 pg-text-sm pg-text-slate-400">
              아직 출발 중인 원정이 없습니다.
            </div>
          )}
        </div>
      </PanelCard>
    </div>
  );
}
