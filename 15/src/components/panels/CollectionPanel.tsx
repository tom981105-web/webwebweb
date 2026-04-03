import { ACHIEVEMENT_DEFINITIONS, SET_DEFINITIONS, TITLE_DEFINITIONS } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useGameStore } from '@/store/useGameStore';

export function CollectionPanel() {
  const store = useGameStore();

  return (
    <div className="pg-space-y-4">
      <PanelCard title="도감 / 업적" subtitle="Collections">
        <div className="pg-grid pg-gap-3 md:pg-grid-cols-3">
          <Box label="장비 도감" value={`${store.collections.equipmentTemplates.length}`} />
          <Box label="재료 도감" value={`${store.collections.materials.length}`} />
          <Box label="지역 도감" value={`${store.collections.regions.length}`} />
        </div>
      </PanelCard>

      <PanelCard title="업적 보상" subtitle="Achievements">
        <div className="pg-space-y-3">
          {ACHIEVEMENT_DEFINITIONS.map((achievement) => {
            const claimed = store.collections.achievementClaims.includes(achievement.id);
            const ready = (store.account.stats[achievement.statKey] ?? 0) >= achievement.target;
            return (
              <div key={achievement.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
                <div className="pg-flex pg-items-center pg-justify-between">
                  <div className="pg-text-sm pg-font-semibold pg-text-white">{achievement.label}</div>
                  <StatusBadge label={claimed ? '수령 완료' : ready ? '수령 가능' : '진행중'} tone={claimed ? 'good' : ready ? 'warning' : 'neutral'} />
                </div>
                <div className="pg-mt-2 pg-text-sm pg-text-slate-300">{achievement.description}</div>
                <button type="button" onClick={() => store.claimAchievement(achievement.id)} className="pg-mt-3 pg-rounded-xl pg-bg-amber-300/90 pg-px-3 pg-py-2 pg-text-xs pg-font-semibold pg-text-slate-950">
                  업적 수령
                </button>
              </div>
            );
          })}
        </div>
      </PanelCard>

      <PanelCard title="세트 / 칭호" subtitle="Sets / Titles">
        <div className="pg-grid pg-gap-3 lg:pg-grid-cols-2">
          {SET_DEFINITIONS.map((setDef) => (
            <div key={setDef.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
              <div className="pg-text-sm pg-font-semibold pg-text-white">{setDef.label}</div>
              <div className="pg-mt-2 pg-text-sm pg-text-slate-300">{setDef.rewardText}</div>
              <button type="button" onClick={() => store.claimSetReward(setDef.id)} className="pg-mt-3 pg-rounded-xl pg-border pg-border-white/12 pg-bg-white/[0.06] pg-px-3 pg-py-2 pg-text-xs pg-font-medium pg-text-white">
                세트 보상
              </button>
            </div>
          ))}
          <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
            <div className="pg-text-sm pg-font-semibold pg-text-white">칭호 선택</div>
            <div className="pg-mt-3 pg-space-y-2">
              {TITLE_DEFINITIONS.filter((title) => store.account.unlockedTitles.includes(title.id)).map((title) => (
                <button key={title.id} type="button" onClick={() => store.selectTitle(title.id)} className="pg-flex pg-w-full pg-items-center pg-justify-between pg-rounded-xl pg-border pg-border-white/8 pg-bg-white/[0.03] pg-p-3 pg-text-left">
                  <span className="pg-text-sm pg-text-white">{title.label}</span>
                  {store.account.selectedTitleId === title.id ? <StatusBadge label="활성" tone="good" /> : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      </PanelCard>
    </div>
  );
}

function Box({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-2 pg-font-display pg-text-2xl pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}
