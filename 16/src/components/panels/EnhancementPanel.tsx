import { CONTROL_MODES, ITEM_DEFINITIONS } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { canUseControlMode, findEquipment, getEnhancementPreview } from '@/game/calculations';
import { useGameStore } from '@/store/useGameStore';
import { formatPercent } from '@/utils/format';

export function EnhancementPanel() {
  const store = useGameStore();
  const equipment = findEquipment(store, store.selectedEquipmentId);

  if (!equipment) {
    return <PanelCard title="강화 패널" subtitle="Enhance">장비를 먼저 선택해 주세요.</PanelCard>;
  }

  const preview = getEnhancementPreview(store, equipment, store.selectedControlMode);

  return (
    <div className="pg-space-y-4">
      <PanelCard title="강화 패널" subtitle="Probability Control">
        <div className="pg-grid pg-gap-4 lg:pg-grid-cols-[1.05fr_0.95fr]">
          <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
            <div className="pg-flex pg-items-center pg-justify-between">
              <div>
                <div className="pg-text-xl pg-font-semibold pg-text-white">{equipment.name}</div>
                <div className="pg-mt-1 pg-text-sm pg-text-slate-400">현재 강화 단계 +{equipment.enhancement}</div>
              </div>
              <StatusBadge label={equipment.heat >= 70 ? '과열 주의' : '가동 가능'} tone={equipment.heat >= 70 ? 'warning' : 'good'} />
            </div>
            <div className="pg-mt-4 pg-space-y-3">
              <ProgressBar value={equipment.durability} label="내구도" tone="teal" />
              <ProgressBar value={equipment.stability} label="안정도" tone="cyan" />
              <ProgressBar value={equipment.heat} label="과열" tone="coral" />
            </div>
            <div className="pg-mt-4 pg-grid pg-grid-cols-2 pg-gap-3">
              <Metric label="성공 확률" value={formatPercent(preview.successChance, 1)} />
              <Metric label="치명 돌파" value={formatPercent(preview.critChance, 1)} />
              <Metric label="단계 하락" value={formatPercent(preview.stageDropChance, 1)} />
              <Metric label="차단 위험" value={formatPercent(preview.blockChance, 1)} />
            </div>
            <button type="button" onClick={() => store.attemptEnhance()} className="pg-mt-4 pg-w-full pg-rounded-2xl pg-bg-gradient-to-r pg-from-sky-300 pg-to-cyan-300 pg-px-4 pg-py-3 pg-text-sm pg-font-semibold pg-text-slate-950">
              강화 실행
            </button>
          </div>
          <div className="pg-space-y-3">
            {CONTROL_MODES.map((mode) => {
              const active = mode.id === store.selectedControlMode;
              const unlocked = canUseControlMode(store, mode.id);
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => store.setControlMode(mode.id)}
                  className={`pg-w-full pg-rounded-2xl pg-border pg-p-4 pg-text-left ${
                    active ? 'pg-border-sky-300/30 pg-bg-sky-300/10' : 'pg-border-white/8 pg-bg-white/[0.03]'
                  } ${!unlocked ? 'pg-opacity-45' : ''}`}
                >
                  <div className="pg-flex pg-items-center pg-justify-between">
                    <div className="pg-text-sm pg-font-semibold pg-text-white">{mode.label}</div>
                    {active ? <StatusBadge label="선택중" tone="good" /> : null}
                  </div>
                  <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{mode.flavor}</div>
                </button>
              );
            })}
          </div>
        </div>
      </PanelCard>

      <PanelCard title="지원 아이템" subtitle="Support Items">
        <div className="pg-grid pg-gap-3 md:pg-grid-cols-2 xl:pg-grid-cols-4">
          {ITEM_DEFINITIONS.map((item) => (
            <button key={item.id} type="button" onClick={() => store.useItem(item.id)} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4 pg-text-left">
              <div className="pg-flex pg-items-center pg-justify-between">
                <div className="pg-text-sm pg-font-semibold pg-text-white">{item.label}</div>
                <StatusBadge label={`보유 ${store.items[item.id]}`} tone="neutral" />
              </div>
              <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{item.effectText}</div>
            </button>
          ))}
        </div>
      </PanelCard>
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
