import { EQUIPMENT_TEMPLATES } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useGameStore } from '@/store/useGameStore';
import { getEquipmentPower } from '@/game/calculations';
import { formatNumber } from '@/utils/format';

export function EquipmentPanel() {
  const equipments = useGameStore((state) => state.equipments);
  const selectedEquipmentId = useGameStore((state) => state.selectedEquipmentId);
  const selectEquipment = useGameStore((state) => state.selectEquipment);
  const equipItem = useGameStore((state) => state.equipItem);
  const dismantleEquipment = useGameStore((state) => state.dismantleEquipment);
  const compact = useGameStore((state) => state.settings.compactNumbers);

  return (
    <PanelCard title="장비 관리" subtitle="Inventory / Loadout">
      <div className="pg-grid pg-gap-4 lg:pg-grid-cols-[1.15fr_0.85fr]">
        <div className="pg-space-y-3">
          {equipments.map((equipment) => (
            <button
              key={equipment.id}
              type="button"
              onClick={() => selectEquipment(equipment.id)}
              className={`pg-w-full pg-rounded-2xl pg-border pg-p-4 pg-text-left ${
                selectedEquipmentId === equipment.id ? 'pg-border-sky-300/30 pg-bg-sky-300/10' : 'pg-border-white/8 pg-bg-white/[0.03]'
              }`}
            >
              <div className="pg-flex pg-items-start pg-justify-between pg-gap-3">
                <div>
                  <div className="pg-flex pg-items-center pg-gap-2">
                    <div className="pg-text-sm pg-font-semibold pg-text-white">{equipment.name}</div>
                    {equipment.equipped ? <StatusBadge label="장착중" tone="good" /> : null}
                  </div>
                  <div className="pg-mt-1 pg-text-xs pg-text-slate-400">
                    {equipment.type} · {equipment.grade} · +{equipment.enhancement}
                  </div>
                </div>
                <div className="pg-text-right">
                  <div className="pg-font-display pg-text-lg pg-font-semibold pg-text-white">{formatNumber(getEquipmentPower(equipment), compact)}</div>
                  <div className="pg-text-[11px] pg-text-slate-500">공방력 기여</div>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
          {equipments
            .filter((entry) => entry.id === selectedEquipmentId)
            .map((equipment) => {
              const template = EQUIPMENT_TEMPLATES.find((entry) => entry.id === equipment.templateId);
              return (
                <div key={equipment.id} className="pg-space-y-4">
                  <div>
                    <div className="pg-text-xl pg-font-semibold pg-text-white">{equipment.name}</div>
                    <div className="pg-mt-2 pg-text-sm pg-leading-7 pg-text-slate-300">{template?.role ?? equipment.role}</div>
                  </div>
                  <div className="pg-grid pg-grid-cols-2 pg-gap-3">
                    <Stat label="품질" value={String(equipment.quality)} />
                    <Stat label="모듈 슬롯" value={String(equipment.moduleSlots)} />
                    <Stat label="내구도" value={String(Math.round(equipment.durability))} />
                    <Stat label="안정도" value={String(Math.round(equipment.stability))} />
                  </div>
                  <div>
                    <div className="pg-text-xs pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">옵션</div>
                    <div className="pg-mt-2 pg-space-y-2">
                      {equipment.options.map((option) => (
                        <div key={option.key} className="pg-rounded-xl pg-border pg-border-white/8 pg-bg-white/[0.03] pg-p-3 pg-text-sm pg-text-slate-200">
                          {option.label} +{option.value}
                          {option.unit}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pg-flex pg-gap-2">
                    <button type="button" onClick={() => equipItem(equipment.id)} className="pg-flex-1 pg-rounded-2xl pg-bg-sky-300/90 pg-px-4 pg-py-3 pg-text-sm pg-font-semibold pg-text-slate-950">
                      장착
                    </button>
                    <button type="button" onClick={() => dismantleEquipment(equipment.id)} className="pg-rounded-2xl pg-border pg-border-rose-300/25 pg-bg-rose-300/10 pg-px-4 pg-py-3 pg-text-sm pg-font-medium pg-text-rose-100">
                      분해
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </PanelCard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="pg-rounded-2xl pg-border pg-border-white/8 pg-bg-white/[0.03] pg-p-3">
      <div className="pg-text-[11px] pg-uppercase pg-tracking-[0.2em] pg-text-slate-400">{label}</div>
      <div className="pg-mt-2 pg-font-display pg-text-lg pg-font-semibold pg-text-white">{value}</div>
    </div>
  );
}
