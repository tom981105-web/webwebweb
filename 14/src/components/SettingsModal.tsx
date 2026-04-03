import { useMemo, useState } from 'react';

import { ModalShell } from '@/components/ModalShell';
import type { SettingsState } from '@/types/game';
import { formatCompact, formatDuration } from '@/utils/format';

export function SettingsModal({
  open,
  onClose,
  settings,
  offlineSummary,
  onUpdate,
  onExport,
  onImport,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  settings: SettingsState;
  offlineSummary: { gain: number; durationMs: number } | null;
  onUpdate: (patch: Partial<SettingsState>) => void;
  onExport: () => string;
  onImport: (payload: string) => boolean;
  onReset: () => void;
}) {
  const [payload, setPayload] = useState('');
  const exportValue = useMemo(() => (open ? onExport() : ''), [open, onExport]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="서고 설정"
      description="저장 데이터를 관리하고, 표시 방식을 취향에 맞게 조정할 수 있습니다."
    >
      <div className="rg-grid rg-gap-5 lg:rg-grid-cols-[0.92fr_1.08fr]">
        <section className="rg-space-y-4">
          <div className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
            <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">플레이 설정</h3>
            <div className="rg-mt-4 rg-space-y-3">
              {[
                ['reducedMotion', '연출 줄이기', '번쩍임과 패널 반응을 조금 더 차분하게 만듭니다.'],
                ['compactNumbers', '축약 숫자 표시', '1.2K, 3.4M처럼 큰 숫자를 짧게 표시합니다.'],
                ['showTooltips', '툴팁 표시', '잠금 조건과 효과 안내를 더 자주 보여줍니다.'],
              ].map(([key, label, description]) => (
                <label key={key} className="rg-flex rg-items-start rg-justify-between rg-gap-4 rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                  <div>
                    <div className="rg-text-sm rg-font-semibold rg-text-white">{label}</div>
                    <div className="rg-mt-1 rg-text-xs rg-leading-6 rg-text-slate-400">{description}</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={Boolean(settings[key as keyof SettingsState])}
                    onChange={(event) => onUpdate({ [key]: event.target.checked } as Partial<SettingsState>)}
                    className="rg-mt-1 rg-h-4 rg-w-4"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
            <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">오프라인 기록</h3>
            <div className="rg-mt-4 rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
              {offlineSummary ? (
                <>
                  <div className="rg-text-sm rg-text-slate-300">
                    마지막 부재 시간 동안 <strong className="rg-text-mystic-gold">+{formatCompact(offlineSummary.gain, settings.compactNumbers)}</strong> 을 회수했습니다.
                  </div>
                  <div className="rg-mt-2 rg-text-xs rg-text-slate-400">누적 시간 {formatDuration(offlineSummary.durationMs)}</div>
                </>
              ) : (
                <div className="rg-text-sm rg-text-slate-400">아직 계산된 오프라인 보상이 없습니다.</div>
              )}
            </div>
          </div>
        </section>

        <section className="rg-space-y-4">
          <div className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
            <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">저장 내보내기</h3>
            <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-7 rg-text-slate-300">문자열을 복사해 두면 브라우저가 바뀌어도 진행 상황을 복원할 수 있습니다.</p>
            <textarea
              readOnly
              value={exportValue}
              className="rg-mt-4 rg-h-36 rg-w-full rg-rounded-[18px] rg-border rg-border-white/8 rg-bg-slate-950/56 rg-p-4 rg-text-xs rg-leading-6 rg-text-slate-200"
            />
            <div className="rg-mt-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(exportValue);
                  } catch {
                    // clipboard optional
                  }
                }}
                className="rg-rounded-full rg-border rg-border-mystic-teal/24 rg-bg-mystic-teal/14 rg-px-5 rg-py-2 rg-text-sm rg-font-semibold rg-text-mystic-teal"
              >
                내보내기 문자열 복사
              </button>
            </div>
          </div>

          <div className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
            <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">저장 불러오기</h3>
            <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-7 rg-text-slate-300">내보낸 문자열을 붙여 넣으면 현재 진행 대신 그 기록을 불러옵니다.</p>
            <textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              placeholder="여기에 저장 문자열을 붙여 넣으세요"
              className="rg-mt-4 rg-h-32 rg-w-full rg-rounded-[18px] rg-border rg-border-white/8 rg-bg-slate-950/56 rg-p-4 rg-text-xs rg-leading-6 rg-text-slate-200"
            />
            <div className="rg-mt-3 rg-flex rg-flex-wrap rg-gap-2">
              <button
                type="button"
                onClick={() => {
                  if (!payload.trim()) return;
                  const success = onImport(payload);
                  if (success) {
                    setPayload('');
                    onClose();
                  }
                }}
                className="rg-rounded-full rg-border rg-border-mystic-gold/24 rg-bg-mystic-gold/14 rg-px-5 rg-py-2 rg-text-sm rg-font-semibold rg-text-mystic-gold"
              >
                불러오기 실행
              </button>
            </div>
          </div>

          <div className="rg-rounded-[24px] rg-border rg-border-rose-400/18 rg-bg-rose-400/[0.05] rg-p-5">
            <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">진행 초기화</h3>
            <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-7 rg-text-slate-300">현재 브라우저에 저장된 행운의 서고 기록을 모두 지웁니다. 되돌릴 수 없습니다.</p>
            <div className="rg-mt-4">
              <button
                type="button"
                onClick={() => {
                  onReset();
                  onClose();
                }}
                className="rg-rounded-full rg-border rg-border-rose-400/25 rg-bg-rose-400/14 rg-px-5 rg-py-2 rg-text-sm rg-font-semibold rg-text-rose-200"
              >
                저장 초기화
              </button>
            </div>
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
