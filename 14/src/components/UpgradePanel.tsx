import { useMemo, useState } from 'react';
import { LockKeyhole, WandSparkles } from 'lucide-react';

import type { MetaUpgradeCardState, UpgradeCardState, UpgradeCategory } from '@/types/game';
import { formatCompact } from '@/utils/format';

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  manual: '직접 긁기',
  fortune: '보상 강화',
  automation: '자동화',
  utility: '보조 장치',
};

export function UpgradePanel({
  upgrades,
  metaUpgrades,
  coins,
  dust,
  compactNumbers,
  onBuyUpgrade,
  onBuyMetaUpgrade,
}: {
  upgrades: UpgradeCardState[];
  metaUpgrades: MetaUpgradeCardState[];
  coins: number;
  dust: number;
  compactNumbers: boolean;
  onBuyUpgrade: (id: UpgradeCardState['definition']['id']) => void;
  onBuyMetaUpgrade: (id: MetaUpgradeCardState['definition']['id']) => void;
}) {
  const [category, setCategory] = useState<UpgradeCategory>('manual');

  const grouped = useMemo(
    () => upgrades.filter((item) => item.definition.category === category),
    [category, upgrades],
  );

  return (
    <section className="rg-rounded-[30px] rg-border rg-border-white/10 rg-bg-[linear-gradient(180deg,rgba(15,21,37,0.94),rgba(9,13,22,0.95))] rg-p-5 rg-shadow-card">
      <div className="rg-flex rg-flex-wrap rg-items-center rg-justify-between rg-gap-3">
        <div>
          <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">성장 패널</p>
          <h2 className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">업그레이드</h2>
        </div>
        <div className="rg-flex rg-items-center rg-gap-2 rg-rounded-full rg-border rg-border-white/8 rg-bg-white/[0.03] rg-p-1">
          {(Object.keys(CATEGORY_LABELS) as UpgradeCategory[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className={`rg-rounded-full rg-px-3 rg-py-2 rg-text-xs rg-font-semibold ${
                category === key ? 'rg-bg-mystic-gold/14 rg-text-mystic-gold' : 'rg-text-slate-300'
              }`}
            >
              {CATEGORY_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      <div className="rg-mt-4 rg-space-y-3">
        {grouped.map((card) => {
          const atMax = !Number.isFinite(card.price);
          const locked = card.locked;
          const disabled = locked || atMax || !card.affordable;

          return (
            <div
              key={card.definition.id}
              className={`rg-rounded-[24px] rg-border rg-p-4 ${
                locked ? 'rg-border-white/8 rg-bg-white/[0.03]' : 'rg-border-white/10 rg-bg-white/[0.04]'
              }`}
              title={card.definition.description}
            >
              <div className="rg-flex rg-items-start rg-justify-between rg-gap-3">
                <div className="rg-min-w-0">
                  <div className="rg-flex rg-items-center rg-gap-2">
                    <strong className="rg-text-base rg-font-semibold rg-text-white">{card.definition.name}</strong>
                    <span className="rg-rounded-full rg-bg-white/6 rg-px-2 rg-py-1 rg-text-[11px] rg-font-semibold rg-text-slate-300">
                      Lv {card.level}
                    </span>
                    {locked ? <LockKeyhole size={14} className="rg-text-slate-500" /> : null}
                  </div>
                  <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-6 rg-text-slate-300">{card.definition.description}</p>
                  <div className="rg-mt-3 rg-flex rg-flex-wrap rg-gap-3 rg-text-xs rg-text-slate-400">
                    <span>효과: {card.definition.effectLabel}</span>
                    <span>{atMax ? '최대 레벨' : `다음 가격 ${formatCompact(card.price, compactNumbers)}`}</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onBuyUpgrade(card.definition.id)}
                  className={`rg-min-h-[46px] rg-min-w-[94px] rg-rounded-2xl rg-px-4 rg-text-sm rg-font-semibold ${
                    disabled
                      ? 'rg-cursor-not-allowed rg-border rg-border-white/8 rg-bg-white/[0.03] rg-text-slate-500'
                      : 'rg-border rg-border-mystic-teal/25 rg-bg-mystic-teal/14 rg-text-mystic-teal'
                  }`}
                >
                  {locked ? '잠김' : atMax ? '완료' : formatCompact(card.price, compactNumbers)}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rg-mt-6 rg-rounded-[24px] rg-border rg-border-mystic-violet/18 rg-bg-mystic-violet/8 rg-p-4">
        <div className="rg-flex rg-items-center rg-justify-between">
          <div>
            <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-mystic-violet/75">메타 강화</p>
            <h3 className="rg-mt-2 rg-font-display rg-text-xl rg-font-semibold rg-text-white">재조율 상점</h3>
          </div>
          <div className="rg-rounded-full rg-bg-black/20 rg-px-4 rg-py-2 rg-text-sm rg-font-semibold rg-text-mystic-violet">
            공명 가루 {formatCompact(dust, compactNumbers)}
          </div>
        </div>
        <div className="rg-mt-4 rg-space-y-3">
          {metaUpgrades.map((card) => {
            const atMax = !Number.isFinite(card.price);
            const disabled = atMax || !card.affordable;

            return (
              <div key={card.definition.id} className="rg-rounded-[20px] rg-border rg-border-white/8 rg-bg-white/[0.04] rg-p-4">
                <div className="rg-flex rg-items-start rg-justify-between rg-gap-3">
                  <div className="rg-min-w-0">
                    <div className="rg-flex rg-items-center rg-gap-2">
                      <WandSparkles size={15} className="rg-text-mystic-violet" />
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
        <p className="rg-mb-0 rg-mt-4 rg-text-xs rg-leading-6 rg-text-slate-400">
          보유 코인 {formatCompact(coins, compactNumbers)} · 재조율 후에도 메타 강화는 유지됩니다.
        </p>
      </div>
    </section>
  );
}
