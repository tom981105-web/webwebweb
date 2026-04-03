import { PanelCard } from '@/components/ui/PanelCard';
import { useGameStore } from '@/store/useGameStore';

export function SettingsPanel() {
  const store = useGameStore();

  return (
    <PanelCard title="설정 / 저장관리" subtitle="Settings / Save">
      <div className="pg-grid pg-gap-3 md:pg-grid-cols-2">
        <button type="button" onClick={() => store.updateAutomationSettings({})} className="pg-rounded-2xl pg-border pg-border-white/10 pg-bg-white/[0.04] pg-p-4 pg-text-left">
          <div className="pg-text-sm pg-font-semibold pg-text-white">저장 구조</div>
          <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">localStorage 기반 버전 저장 구조. 현재 버전의 마이그레이션 함수가 분리되어 있습니다.</div>
        </button>
        <button type="button" onClick={() => store.saveNow()} className="pg-rounded-2xl pg-border pg-border-sky-300/25 pg-bg-sky-300/10 pg-p-4 pg-text-left">
          <div className="pg-text-sm pg-font-semibold pg-text-white">즉시 저장</div>
          <div className="pg-mt-2 pg-text-sm pg-leading-6 pg-text-slate-300">현재 진행 상황을 즉시 브라우저 저장소에 기록합니다.</div>
        </button>
      </div>
      <div className="pg-flex pg-flex-wrap pg-gap-2">
        <button type="button" onClick={() => navigator.clipboard.writeText(store.exportSaveString())} className="pg-rounded-2xl pg-bg-white/10 pg-px-4 pg-py-3 pg-text-sm pg-font-medium pg-text-white">
          세이브 문자열 복사
        </button>
        <button type="button" onClick={() => store.resetProgress()} className="pg-rounded-2xl pg-bg-rose-300/10 pg-px-4 pg-py-3 pg-text-sm pg-font-medium pg-text-rose-100">
          게임 초기화
        </button>
      </div>
    </PanelCard>
  );
}
