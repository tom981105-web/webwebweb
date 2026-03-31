import { useEffect, useState } from 'react';

import { ModalShell } from '@/components/ModalShell';
import type { SettingsState } from '@/types/game';
import { formatDuration } from '@/utils/format';

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
  const [importValue, setImportValue] = useState('');
  const [exportValue, setExportValue] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!open) return;
    setExportValue('');
    setImportValue('');
    setMessage('');
  }, [open]);

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="설정"
      description="표시 형식, 모션, 저장 데이터를 관리할 수 있습니다."
    >
      <div className="rg-grid rg-gap-5 lg:rg-grid-cols-[0.88fr_1.12fr]">
        <section className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
          <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">플레이 설정</h3>
          <div className="rg-mt-4 rg-space-y-3">
            {[
              ['compactNumbers', '축약 숫자 표기', '1.2K / 3.4M 형식으로 표시합니다.'],
              ['reducedMotion', '모션 줄이기', '스크래치와 토스트 연출을 더 차분하게 줄입니다.'],
              ['showTooltips', '툴팁 표시', '업그레이드 카드 설명을 hover/title로 표시합니다.'],
            ].map(([key, label, desc]) => (
              <label key={key} className="rg-flex rg-items-start rg-justify-between rg-gap-4 rg-rounded-[18px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div>
                  <div className="rg-font-semibold rg-text-white">{label}</div>
                  <div className="rg-mt-1 rg-text-sm rg-leading-6 rg-text-slate-400">{desc}</div>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key as keyof SettingsState])}
                  onChange={(event) => onUpdate({ [key]: event.target.checked })}
                />
              </label>
            ))}
          </div>

          {offlineSummary ? (
            <div className="rg-mt-5 rg-rounded-[18px] rg-border rg-border-mystic-teal/18 rg-bg-mystic-teal/8 rg-p-4 rg-text-sm rg-leading-7 rg-text-slate-200">
              최근 오프라인 {formatDuration(offlineSummary.durationMs)} 동안 일부 자동 수익이 적용되었습니다.
            </div>
          ) : null}
        </section>

        <section className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
          <h3 className="rg-m-0 rg-font-display rg-text-xl rg-font-semibold rg-text-white">저장 관리</h3>
          <div className="rg-mt-4 rg-space-y-4">
            <button
              type="button"
              onClick={() => {
                setExportValue(onExport());
                setMessage('내보내기 문자열을 생성했습니다.');
              }}
              className="rg-min-h-[46px] rg-rounded-2xl rg-border rg-border-mystic-gold/24 rg-bg-mystic-gold/14 rg-px-4 rg-text-sm rg-font-semibold rg-text-mystic-gold"
            >
              저장 데이터 내보내기
            </button>

            <textarea
              value={exportValue}
              readOnly
              placeholder="내보내기 문자열이 여기에 표시됩니다."
              className="rg-h-28 rg-w-full rg-rounded-[18px] rg-border rg-border-white/10 rg-bg-black/20 rg-p-4 rg-text-sm rg-text-slate-200"
            />

            <textarea
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
              placeholder="가져오기 문자열을 붙여 넣으세요."
              className="rg-h-28 rg-w-full rg-rounded-[18px] rg-border rg-border-white/10 rg-bg-black/20 rg-p-4 rg-text-sm rg-text-slate-200"
            />

            <div className="rg-flex rg-flex-wrap rg-gap-3">
              <button
                type="button"
                onClick={() => {
                  const ok = onImport(importValue);
                  setMessage(ok ? '저장 데이터를 불러왔습니다.' : '불러오기에 실패했습니다.');
                }}
                className="rg-min-h-[46px] rg-rounded-2xl rg-border rg-border-mystic-teal/24 rg-bg-mystic-teal/14 rg-px-4 rg-text-sm rg-font-semibold rg-text-mystic-teal"
              >
                데이터 가져오기
              </button>
              <button
                type="button"
                onClick={() => {
                  onReset();
                  setMessage('모든 진행 데이터를 초기화했습니다.');
                }}
                className="rg-min-h-[46px] rg-rounded-2xl rg-border rg-border-rose-400/24 rg-bg-rose-400/12 rg-px-4 rg-text-sm rg-font-semibold rg-text-rose-200"
              >
                진행 초기화
              </button>
            </div>

            {message ? (
              <div className="rg-rounded-[18px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-3 rg-text-sm rg-text-slate-300">
                {message}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
