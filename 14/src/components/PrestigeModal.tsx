import { ModalShell } from '@/components/ModalShell';
import type { MetaUpgradeCardState, PrestigePreview } from '@/types/game';
import { formatCompact } from '@/utils/format';

export function PrestigeModal({
  open,
  onClose,
  preview,
  dust,
  compactNumbers,
  metaUpgrades,
  onBuyMetaUpgrade,
  onPrestige,
}: {
  open: boolean;
  onClose: () => void;
  preview: PrestigePreview;
  dust: number;
  compactNumbers: boolean;
  metaUpgrades: MetaUpgradeCardState[];
  onBuyMetaUpgrade: (id: MetaUpgradeCardState['definition']['id']) => void;
  onPrestige: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="운명의 재조율"
      description="현재 코인과 일반 업그레이드를 비우는 대신 영구 자원인 공명 가루를 얻어 다음 순환을 더 빠르게 시작합니다."
      footer={
        <div className="rg-flex rg-flex-wrap rg-items-center rg-justify-between rg-gap-3">
          <div className="rg-text-sm rg-text-slate-300">
            현재 보유 공명 가루 <strong className="rg-text-mystic-violet">{formatCompact(dust, compactNumbers)}</strong>
          </div>
          <button
            type="button"
            disabled={!preview.canPrestige}
            onClick={onPrestige}
            className={`rg-min-h-[48px] rg-rounded-full rg-px-6 rg-text-sm rg-font-semibold ${
              preview.canPrestige
                ? 'rg-border rg-border-mystic-violet/25 rg-bg-mystic-violet/16 rg-text-mystic-violet'
                : 'rg-cursor-not-allowed rg-border rg-border-white/8 rg-bg-white/[0.03] rg-text-slate-500'
            }`}
          >
            {preview.canPrestige ? `재조율 실행 (+${preview.dustGain})` : `다음 기준 ${formatCompact(preview.nextMilestone, compactNumbers)}`}
          </button>
        </div>
      }
    >
      <div className="rg-grid rg-gap-4 lg:rg-grid-cols-[0.92fr_1.08fr]">
        <section className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
          <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">재조율 보상</p>
          <h3 className="rg-mt-3 rg-font-display rg-text-[clamp(2rem,4vw,2.8rem)] rg-font-semibold rg-text-white">
            +{formatCompact(preview.dustGain, compactNumbers)}
          </h3>
          <p className="rg-mt-3 rg-text-sm rg-leading-7 rg-text-slate-300">
            누적 수익이 높을수록 재조율 보상이 커집니다. 일반 업그레이드는 초기화되지만 메타 업그레이드는 그대로 남습니다.
          </p>
          <div className="rg-mt-4 rg-grid rg-gap-3 sm:rg-grid-cols-2">
            <div className="rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
              <div className="rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-slate-400">유지되는 것</div>
              <div className="rg-mt-2 rg-text-sm rg-leading-7 rg-text-slate-200">공명 가루, 메타 업그레이드, 설정</div>
            </div>
            <div className="rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
              <div className="rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-slate-400">초기화되는 것</div>
              <div className="rg-mt-2 rg-text-sm rg-leading-7 rg-text-slate-200">코인, 일반 업그레이드, 현재 패널</div>
            </div>
          </div>
          <div className="rg-mt-4 rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
            <div className="rg-flex rg-items-center rg-justify-between">
              <span className="rg-text-sm rg-text-slate-400">다음 필요 누적 수익</span>
              <strong className="rg-text-white">{formatCompact(preview.nextMilestone, compactNumbers)}</strong>
            </div>
          </div>
        </section>

        <section className="rg-rounded-[24px] rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-5">
          <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">영구 메타 업그레이드</p>
          <div className="rg-mt-4 rg-space-y-3">
            {metaUpgrades.map((card) => {
              const atMax = !Number.isFinite(card.price);
              const disabled = atMax || !card.affordable;
              return (
                <div key={card.definition.id} className="rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                  <div className="rg-flex rg-items-start rg-justify-between rg-gap-3">
                    <div className="rg-min-w-0">
                      <div className="rg-flex rg-items-center rg-gap-2">
                        <strong className="rg-text-base rg-font-semibold rg-text-white">{card.definition.name}</strong>
                        <span className="rg-rounded-full rg-bg-white/6 rg-px-2 rg-py-1 rg-text-[11px] rg-font-semibold rg-text-slate-300">
                          Lv {card.level}
                        </span>
                      </div>
                      <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-6 rg-text-slate-300">{card.definition.description}</p>
                    </div>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onBuyMetaUpgrade(card.definition.id)}
                      className={`rg-min-h-[42px] rg-rounded-2xl rg-px-4 rg-text-sm rg-font-semibold ${
                        disabled
                          ? 'rg-cursor-not-allowed rg-border rg-border-white/8 rg-bg-white/[0.03] rg-text-slate-500'
                          : 'rg-border rg-border-mystic-violet/22 rg-bg-mystic-violet/14 rg-text-mystic-violet'
                      }`}
                    >
                      {atMax ? '완료' : `${formatCompact(card.price, compactNumbers)} 가루`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </ModalShell>
  );
}
