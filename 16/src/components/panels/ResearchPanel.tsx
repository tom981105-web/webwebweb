import { RESEARCH_DEFINITIONS } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { getResearchAvailability, getResearchLevel } from '@/game/calculations';
import { useGameStore } from '@/store/useGameStore';
import { formatDuration } from '@/utils/format';

export function ResearchPanel() {
  const store = useGameStore();

  return (
    <div className="pg-space-y-4">
      <PanelCard title="연구실" subtitle="Long Term Growth">
        <div className="pg-grid pg-gap-3 lg:pg-grid-cols-2">
          {RESEARCH_DEFINITIONS.map((research) => {
            const availability = getResearchAvailability(store, research.id);
            const level = getResearchLevel(store, research.id);
            return (
              <div key={research.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
                <div className="pg-flex pg-items-center pg-justify-between">
                  <div className="pg-text-sm pg-font-semibold pg-text-white">{research.label}</div>
                  <StatusBadge label={`Lv.${level}/${research.maxLevel}`} tone={level > 0 ? 'good' : 'neutral'} />
                </div>
                <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{research.description}</div>
                <div className="pg-mt-2 pg-text-xs pg-text-slate-400">완료 효과: {research.effectText}</div>
                <div className="pg-mt-3 pg-flex pg-items-center pg-justify-between">
                  <span className="pg-text-xs pg-text-slate-500">{formatDuration(research.durationMs)}</span>
                  <button
                    type="button"
                    disabled={!availability.unlocked}
                    onClick={() => store.startResearch(research.id)}
                    className="pg-rounded-xl pg-bg-sky-300/90 pg-px-3 pg-py-2 pg-text-xs pg-font-semibold pg-text-slate-950 disabled:pg-cursor-not-allowed disabled:pg-opacity-40"
                  >
                    {availability.unlocked ? '연구 시작' : availability.reason}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </PanelCard>

      <PanelCard title="진행 중 연구" subtitle="Research Queue">
        <div className="pg-space-y-3">
          {store.activeResearch.length ? (
            store.activeResearch.map((entry) => {
              const research = RESEARCH_DEFINITIONS.find((item) => item.id === entry.researchId);
              return (
                <div key={entry.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
                  <div className="pg-flex pg-items-center pg-justify-between">
                    <div className="pg-text-sm pg-font-semibold pg-text-white">{research?.label ?? entry.researchId}</div>
                    <div className="pg-text-xs pg-text-slate-400">{formatDuration(entry.endsAt - Date.now())}</div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="pg-rounded-2xl pg-border pg-border-dashed pg-border-white/10 pg-bg-white/[0.03] pg-p-5 pg-text-sm pg-text-slate-400">
              진행 중인 연구가 없습니다. 강화/확률/자동화 계열 연구를 섞어서 장기 빌드를 설계해 보세요.
            </div>
          )}
        </div>
      </PanelCard>
    </div>
  );
}
