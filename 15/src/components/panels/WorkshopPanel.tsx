import { FACILITY_DEFINITIONS } from '@/data';
import { PanelCard } from '@/components/ui/PanelCard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useGameStore } from '@/store/useGameStore';

export function WorkshopPanel() {
  const store = useGameStore();

  return (
    <div className="pg-space-y-4">
      <PanelCard title="공방 시설 관리" subtitle="Facilities">
        <div className="pg-grid pg-gap-3 xl:pg-grid-cols-2">
          {FACILITY_DEFINITIONS.map((facility) => (
            <div key={facility.id} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4">
              <div className="pg-flex pg-items-center pg-justify-between">
                <div className="pg-text-sm pg-font-semibold pg-text-white">{facility.label}</div>
                <div className="pg-text-xs pg-text-slate-400">Lv.{store.facilities[facility.id].level}</div>
              </div>
              <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">{facility.description}</div>
              <div className="pg-mt-3">
                <ProgressBar value={store.facilities[facility.id].level} max={facility.maxLevel} tone="violet" />
              </div>
              <button type="button" onClick={() => store.upgradeFacility(facility.id)} className="pg-mt-3 pg-rounded-xl pg-bg-violet-300/90 pg-px-3 pg-py-2 pg-text-xs pg-font-semibold pg-text-slate-950">
                시설 업그레이드
              </button>
            </div>
          ))}
        </div>
      </PanelCard>

      <PanelCard title="자동화 라인" subtitle="Automation">
        <div className="pg-grid pg-gap-3 md:pg-grid-cols-2">
          <ToggleCard title="자동 강화 큐" enabled={store.automation.settings.enhanceEnabled} onToggle={() => store.updateAutomationSettings({ enhanceEnabled: !store.automation.settings.enhanceEnabled })} />
          <ToggleCard title="자동 분해" enabled={store.automation.settings.autoDismantleEnabled} onToggle={() => store.updateAutomationSettings({ autoDismantleEnabled: !store.automation.settings.autoDismantleEnabled })} />
          <ToggleCard title="자동 제작" enabled={store.automation.settings.autoCraftEnabled} onToggle={() => store.updateAutomationSettings({ autoCraftEnabled: !store.automation.settings.autoCraftEnabled })} />
          <ToggleCard title="자동 원정" enabled={store.automation.settings.autoExpeditionEnabled} onToggle={() => store.updateAutomationSettings({ autoExpeditionEnabled: !store.automation.settings.autoExpeditionEnabled })} />
        </div>
      </PanelCard>
    </div>
  );
}

function ToggleCard({ title, enabled, onToggle }: { title: string; enabled: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className={`pg-rounded-2xl pg-border pg-p-4 pg-text-left ${enabled ? 'pg-border-emerald-300/30 pg-bg-emerald-300/10' : 'pg-border-white/10 pg-bg-white/[0.04]'}`}>
      <div className="pg-text-sm pg-font-semibold pg-text-white">{title}</div>
      <div className="pg-mt-2 pg-text-sm pg-text-slate-300">{enabled ? '활성화됨' : '비활성화됨'}</div>
    </button>
  );
}
