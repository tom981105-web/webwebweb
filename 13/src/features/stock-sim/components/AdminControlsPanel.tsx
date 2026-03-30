import { useState } from 'react';
import { Pause, Play, RotateCcw, ShieldCheck, Waves, X } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type { RuntimeState, Sector, SpeedSetting } from '@/features/stock-sim/types';
import { getSectorLabel } from '@/features/stock-sim/utils/formatters';

type AdminControlsPanelProps = {
  isRunning: boolean;
  speed: SpeedSetting;
  tick: number;
  marketMoodLabel: string;
  dominantSector: string;
  runtime: RuntimeState;
  onToggleRunning: () => void;
  onSpeedChange: (speed: SpeedSetting) => void;
  onReset: () => void;
};

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ss-ui-soft-card ss-rounded-[18px] ss-px-4 ss-py-3">
      <p className="ss-ui-kpi-label">{label}</p>
      <p className="ss-mt-1 ss-text-sm ss-font-semibold ss-text-white">{value}</p>
    </div>
  );
}

export function AdminControlsPanel({
  isRunning,
  speed,
  tick,
  marketMoodLabel,
  dominantSector,
  runtime,
  onToggleRunning,
  onSpeedChange,
  onReset,
}: AdminControlsPanelProps) {
  const [isResetArmed, setIsResetArmed] = useState(false);

  return (
    <Panel
      title="관리자 시장 제어"
      subtitle="일반 사용자 화면에서는 숨겨지고, 운영자만 실시간 엔진과 초기화 기능을 제어할 수 있습니다."
      icon={<ShieldCheck className="ss-h-5 ss-w-5" />}
      tone="accent"
    >
      <div className="ss-grid ss-gap-3 xl:ss-grid-cols-[minmax(0,1fr)_320px]">
        <div className="ss-ui-soft-card-strong ss-rounded-[24px] ss-p-3.5">
          <div className="ss-flex ss-flex-wrap ss-items-center ss-justify-between ss-gap-3">
            <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2">
              <button
                type="button"
                onClick={onToggleRunning}
                className={`ss-inline-flex ss-items-center ss-gap-2 ss-rounded-full ss-border ss-px-4 ss-py-2.5 ss-text-sm ss-font-medium ss-transition ${
                  isRunning
                    ? 'ss-border-cyan-300/22 ss-bg-cyan-300/14 ss-text-cyan-50 hover:ss-bg-cyan-300/18'
                    : 'ss-border-amber-300/22 ss-bg-amber-300/14 ss-text-amber-50 hover:ss-bg-amber-300/18'
                }`}
              >
                {isRunning ? <Pause className="ss-h-4 ss-w-4" /> : <Play className="ss-h-4 ss-w-4" />}
                {isRunning ? '일시 정지' : '재개'}
              </button>

              <div className="ss-ui-soft-card ss-grid ss-grid-cols-3 ss-gap-1.5 ss-rounded-full ss-p-1">
                {[1, 2, 4].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onSpeedChange(option as SpeedSetting)}
                    className={`ss-rounded-full ss-px-3 ss-py-2 ss-text-xs ss-font-medium ss-transition ${
                      speed === option
                        ? 'ss-border-lime-300/28 ss-bg-lime-300/16 ss-text-lime-50'
                        : 'ss-text-slate-300 hover:ss-bg-white/6 hover:ss-text-white'
                    }`}
                  >
                    {option}배속
                  </button>
                ))}
              </div>
            </div>

            {isResetArmed ? (
              <div className="ss-flex ss-items-center ss-gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetArmed(false)}
                  className="ss-inline-flex ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-border-white/10 ss-bg-white/6 ss-px-3 ss-py-2 ss-text-xs ss-font-medium ss-text-slate-100"
                >
                  <X className="ss-h-3.5 ss-w-3.5" />
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsResetArmed(false);
                    onReset();
                  }}
                  className="ss-inline-flex ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-border-rose-300/25 ss-bg-rose-300/16 ss-px-3 ss-py-2 ss-text-xs ss-font-medium ss-text-rose-50"
                >
                  <RotateCcw className="ss-h-3.5 ss-w-3.5" />
                  지금 초기화
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsResetArmed(true)}
                className="ss-inline-flex ss-items-center ss-gap-1.5 ss-rounded-full ss-border ss-border-rose-300/20 ss-bg-rose-300/10 ss-px-3 ss-py-2 ss-text-xs ss-font-medium ss-text-rose-50"
              >
                <RotateCcw className="ss-h-3.5 ss-w-3.5" />
                시장 초기화
              </button>
            )}
          </div>
        </div>

        <div className="ss-grid ss-gap-2 sm:ss-grid-cols-3 xl:ss-grid-cols-1">
          <MiniStat label="시장 심리" value={marketMoodLabel} />
          <MiniStat label="주도 섹터" value={getSectorLabel(dominantSector as Sector)} />
          <MiniStat label="엔진 상태" value={`${speed}배속 · 틱 ${tick.toLocaleString('ko-KR')}`} />
        </div>
      </div>

      <div className="ss-mt-4 ss-ui-soft-card ss-rounded-[22px] ss-px-4 ss-py-3.5">
        <div className="ss-flex ss-flex-wrap ss-items-center ss-gap-2 ss-text-sm ss-text-slate-300/82">
          <Waves className="ss-h-4 ss-w-4 ss-text-cyan-100" />
          <span>저장 상태: {runtime.persistenceStatus}</span>
          <span className="ss-text-slate-500">·</span>
          <span>워커 상태: {runtime.workerStatus}</span>
        </div>
      </div>
    </Panel>
  );
}
