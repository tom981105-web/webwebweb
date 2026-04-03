import { useMemo, useState } from 'react';
import { LockKeyhole, WandSparkles } from 'lucide-react';

import type {
  MetaUpgradeCardState,
  UpgradeCardState,
  UpgradeCategory,
} from '@/types/game';
import { formatCompact } from '@/utils/format';

const CATEGORY_LABELS: Record<UpgradeCategory, string> = {
  manual: '직접 긁기',
  fortune: '보상 강화',
  automation: '자동화',
  utility: '보조 장치',
};

type FilterMode = 'all' | 'ready' | 'locked';

function clampPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function formatPercentValue(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function describeUpgradeEffect(id: UpgradeCardState['definition']['id'], level: number) {
  switch (id) {
    case 'brushRadius':
      return {
        current: `브러시 ${Math.round(26 + level * 2.7)}`,
        next: `브러시 ${Math.round(26 + (level + 1) * 2.7)}`,
      };
    case 'scratchFlow':
      return {
        current: `긁기 효율 +${formatPercentValue(level * 17)}`,
        next: `긁기 효율 +${formatPercentValue((level + 1) * 17)}`,
      };
    case 'payoutBoost':
      return {
        current: `보상 배율 +${formatPercentValue(level * 8.5)}`,
        next: `보상 배율 +${formatPercentValue((level + 1) * 8.5)}`,
      };
    case 'rareSight':
      return {
        current: `희귀 감지 +${(level * 1.4).toFixed(1)}`,
        next: `희귀 감지 +${((level + 1) * 1.4).toFixed(1)}`,
      };
    case 'revealEase':
      return {
        current: `자동 공개 기준 -${formatPercentValue(level * 1.6)}`,
        next: `자동 공개 기준 -${formatPercentValue((level + 1) * 1.6)}`,
      };
    case 'criticalGleam':
      return {
        current: `치명타 확률 ${formatPercentValue(4 + level * 2.6)}`,
        next: `치명타 확률 ${formatPercentValue(4 + (level + 1) * 2.6)}`,
      };
    case 'jackpotLens':
      return {
        current: `잭팟 배율 x${(1.85 + level * 0.13).toFixed(2)}`,
        next: `잭팟 배율 x${(1.85 + (level + 1) * 0.13).toFixed(2)}`,
      };
    case 'autoBuyer':
      return {
        current: level > 0 ? '자동 구매 활성화' : '잠금',
        next: '다음 패널 자동 구매 해금',
      };
    case 'autoScratch':
      return {
        current: level > 0 ? '자동 긁기 활성화' : '잠금',
        next: '자동 긁기 해금',
      };
    case 'droneRig':
      return {
        current: `자동 긁기 +${(level * 3.5).toFixed(1)}/s`,
        next: `자동 긁기 +${((level + 1) * 3.5).toFixed(1)}/s`,
      };
    case 'autoReveal':
      return {
        current: level > 0 ? '자동 공개 활성화' : '잠금',
        next: '기준 도달 시 즉시 공개',
      };
    case 'autoLoop':
      return {
        current: level > 0 ? '자동 순환 활성화' : '잠금',
        next: '정산 후 다음 패널 자동 진입',
      };
    case 'offlineLedger':
      return {
        current: `오프라인 효율 ${formatPercentValue((0.22 + level * 0.11) * 100)}`,
        next: `오프라인 효율 ${formatPercentValue((0.22 + (level + 1) * 0.11) * 100)}`,
      };
    case 'glimmerBeacon':
      return {
        current: `희귀 보정 +${(level * 0.6).toFixed(1)}`,
        next: `희귀 보정 +${((level + 1) * 0.6).toFixed(1)}`,
      };
    default:
      return {
        current: `Lv ${level}`,
        next: `Lv ${level + 1}`,
      };
  }
}

function describeMetaEffect(id: MetaUpgradeCardState['definition']['id'], level: number) {
  switch (id) {
    case 'legacyMint':
      return {
        current: `전체 보상 +${formatPercentValue(level * 10)}`,
        next: `전체 보상 +${formatPercentValue((level + 1) * 10)}`,
      };
    case 'fortuneAtlas':
      return {
        current: `희귀 보정 +${(level * 1.8).toFixed(1)}`,
        next: `희귀 보정 +${((level + 1) * 1.8).toFixed(1)}`,
      };
    case 'awakenedServo':
      return {
        current: `자동화 시작 보정 ${level}단계`,
        next: `자동화 시작 보정 ${level + 1}단계`,
      };
    case 'freeSigil':
      return {
        current: `패널 가격 -${formatPercentValue(Math.min(55, level * 5))}`,
        next: `패널 가격 -${formatPercentValue(Math.min(55, (level + 1) * 5))}`,
      };
    default:
      return {
        current: `Lv ${level}`,
        next: `Lv ${level + 1}`,
      };
  }
}

function getUnlockRequirement(
  card: UpgradeCardState,
  totalCoinsEarned: number,
  totalPanelsScratched: number,
  prestigeCount: number,
) {
  const { definition } = card;
  if (!card.locked) return null;

  const checks = [
    definition.unlockAtCoins
      ? {
          label: '누적 코인',
          current: totalCoinsEarned,
          target: definition.unlockAtCoins,
        }
      : null,
    definition.unlockAtScratches
      ? {
          label: '긁은 횟수',
          current: totalPanelsScratched,
          target: definition.unlockAtScratches,
        }
      : null,
    definition.unlockAtPrestige
      ? {
          label: '재조율',
          current: prestigeCount,
          target: definition.unlockAtPrestige,
        }
      : null,
  ].filter(Boolean) as Array<{ label: string; current: number; target: number }>;

  return checks
    .map((entry) => ({
      ...entry,
      progress: clampPercent((entry.current / entry.target) * 100),
    }))
    .sort((left, right) => left.progress - right.progress)[0];
}

export function UpgradePanel({
  upgrades,
  metaUpgrades,
  coins,
  dust,
  totalCoinsEarned,
  totalPanelsScratched,
  prestigeCount,
  compactNumbers,
  onBuyUpgrade,
  onBuyMetaUpgrade,
}: {
  upgrades: UpgradeCardState[];
  metaUpgrades: MetaUpgradeCardState[];
  coins: number;
  dust: number;
  totalCoinsEarned: number;
  totalPanelsScratched: number;
  prestigeCount: number;
  compactNumbers: boolean;
  onBuyUpgrade: (id: UpgradeCardState['definition']['id']) => void;
  onBuyMetaUpgrade: (id: MetaUpgradeCardState['definition']['id']) => void;
}) {
  const [category, setCategory] = useState<UpgradeCategory>('manual');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  const categoryMeta = useMemo(() => {
    return (Object.keys(CATEGORY_LABELS) as UpgradeCategory[]).map((key) => {
      const items = upgrades.filter((item) => item.definition.category === key);
      return {
        key,
        total: items.length,
        ready: items.filter((item) => !item.locked && item.affordable).length,
      };
    });
  }, [upgrades]);

  const grouped = useMemo(() => {
    const items = upgrades.filter((item) => item.definition.category === category);
    const filtered = items.filter((item) => {
      if (filterMode === 'ready') return !item.locked && item.affordable && Number.isFinite(item.price);
      if (filterMode === 'locked') return item.locked;
      return true;
    });

    return filtered.sort((left, right) => {
      const leftScore = (left.locked ? 0 : 100) + (left.affordable ? 20 : 0) - left.level;
      const rightScore = (right.locked ? 0 : 100) + (right.affordable ? 20 : 0) - right.level;
      return rightScore - leftScore;
    });
  }, [category, filterMode, upgrades]);

  const metaSorted = useMemo(() => {
    return [...metaUpgrades].sort((left, right) => {
      const leftScore = (left.affordable ? 10 : 0) - left.level;
      const rightScore = (right.affordable ? 10 : 0) - right.level;
      return rightScore - leftScore;
    });
  }, [metaUpgrades]);

  return (
    <section className="rg-rounded-[30px] rg-border rg-border-white/10 rg-bg-[linear-gradient(180deg,rgba(15,21,37,0.94),rgba(9,13,22,0.95))] rg-p-5 rg-shadow-card">
      <div className="rg-flex rg-flex-wrap rg-items-start rg-justify-between rg-gap-4">
        <div>
          <p className="rg-m-0 rg-text-xs rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">성장 장치</p>
          <h2 className="rg-mt-2 rg-font-display rg-text-2xl rg-font-semibold rg-text-white">업그레이드</h2>
          <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-7 rg-text-slate-300">
            긁는 감촉, 보상 기대치, 자동화 속도를 원하는 방향으로 밀어 올리세요.
          </p>
        </div>

        <div className="rg-grid rg-gap-2 sm:rg-grid-cols-2">
          <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-white/[0.04] rg-px-4 rg-py-3">
            <p className="rg-m-0 rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-slate-400">보유 코인</p>
            <strong className="rg-mt-2 rg-block rg-text-lg rg-font-semibold rg-text-white">{formatCompact(coins, compactNumbers)}</strong>
          </div>
          <div className="rg-rounded-2xl rg-border rg-border-mystic-violet/18 rg-bg-mystic-violet/8 rg-px-4 rg-py-3">
            <p className="rg-m-0 rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.24em] rg-text-mystic-violet/80">공명 가루</p>
            <strong className="rg-mt-2 rg-block rg-text-lg rg-font-semibold rg-text-mystic-violet">{formatCompact(dust, compactNumbers)}</strong>
          </div>
        </div>
      </div>

      <div className="rg-mt-5 rg-grid rg-gap-2 sm:rg-grid-cols-2 xl:rg-grid-cols-4">
        {categoryMeta.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setCategory(entry.key)}
            className={`rg-flex rg-items-center rg-justify-between rg-rounded-2xl rg-border rg-px-4 rg-py-3 rg-text-left ${
              category === entry.key
                ? 'rg-border-mystic-gold/32 rg-bg-mystic-gold/12 rg-text-mystic-gold'
                : 'rg-border-white/8 rg-bg-white/[0.03] rg-text-slate-300 hover:rg-border-white/16 hover:rg-bg-white/[0.05]'
            }`}
          >
            <span className="rg-text-sm rg-font-semibold">{CATEGORY_LABELS[entry.key]}</span>
            <span className="rg-rounded-full rg-bg-black/20 rg-px-2 rg-py-1 rg-text-[11px] rg-font-semibold">
              {entry.ready}/{entry.total}
            </span>
          </button>
        ))}
      </div>

      <div className="rg-mt-4 rg-flex rg-flex-wrap rg-gap-2">
        {(
          [
            ['all', '전체 보기'],
            ['ready', '지금 구매 가능'],
            ['locked', '잠긴 항목'],
          ] as Array<[FilterMode, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilterMode(key)}
            className={`rg-rounded-full rg-border rg-px-4 rg-py-2 rg-text-xs rg-font-semibold ${
              filterMode === key
                ? 'rg-border-mystic-teal/24 rg-bg-mystic-teal/14 rg-text-mystic-teal'
                : 'rg-border-white/8 rg-bg-white/[0.03] rg-text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rg-mt-5 rg-space-y-3 rg-max-h-[620px] rg-overflow-y-auto rg-pr-1 rg-scrollbar">
        {grouped.map((card) => {
          const atMax = !Number.isFinite(card.price);
          const disabled = card.locked || atMax || !card.affordable;
          const affordability = card.locked || atMax ? 0 : clampPercent((coins / Math.max(card.price, 1)) * 100);
          const unlockRequirement = getUnlockRequirement(card, totalCoinsEarned, totalPanelsScratched, prestigeCount);
          const effectText = describeUpgradeEffect(card.definition.id, card.level);

          return (
            <div
              key={card.definition.id}
              className={`rg-upgrade-card rg-rounded-[24px] rg-border rg-p-4 ${
                card.affordable && !card.locked && !atMax
                  ? 'rg-border-mystic-teal/18 rg-bg-mystic-teal/6'
                  : 'rg-border-white/8 rg-bg-white/[0.03]'
              }`}
            >
              <div className="rg-flex rg-items-start rg-justify-between rg-gap-3">
                <div className="rg-min-w-0 rg-flex-1">
                  <div className="rg-flex rg-flex-wrap rg-items-center rg-gap-2">
                    <strong className="rg-text-base rg-font-semibold rg-text-white">{card.definition.name}</strong>
                    <span className="rg-rounded-full rg-bg-white/6 rg-px-2 rg-py-1 rg-text-[11px] rg-font-semibold rg-text-slate-300">
                      Lv {card.level}
                    </span>
                    {card.locked ? <LockKeyhole size={14} className="rg-text-slate-500" /> : null}
                  </div>
                  <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-6 rg-text-slate-300">{card.definition.description}</p>

                  <div className="rg-mt-3 rg-grid rg-gap-2 md:rg-grid-cols-2">
                    <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-black/12 rg-px-3 rg-py-2">
                      <div className="rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.2em] rg-text-slate-500">현재 효과</div>
                      <div className="rg-mt-1 rg-text-sm rg-font-semibold rg-text-white">{effectText.current}</div>
                    </div>
                    <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-black/12 rg-px-3 rg-py-2">
                      <div className="rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.2em] rg-text-slate-500">다음 효과</div>
                      <div className="rg-mt-1 rg-text-sm rg-font-semibold rg-text-mystic-gold">
                        {atMax ? '최대 단계 도달' : effectText.next}
                      </div>
                    </div>
                  </div>

                  {unlockRequirement ? (
                    <div className="rg-mt-3">
                      <div className="rg-mb-1 rg-flex rg-items-center rg-justify-between rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-slate-500">
                        <span>해금 조건</span>
                        <span>
                          {unlockRequirement.label} {formatCompact(unlockRequirement.current, compactNumbers)} /{' '}
                          {formatCompact(unlockRequirement.target, compactNumbers)}
                        </span>
                      </div>
                      <div className="rg-h-2 rg-overflow-hidden rg-rounded-full rg-bg-white/[0.06]">
                        <div
                          className="rg-h-full rg-rounded-full rg-bg-[linear-gradient(90deg,#7ddbe6,#f2cd72)]"
                          style={{ width: `${unlockRequirement.progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rg-mt-3">
                      <div className="rg-mb-1 rg-flex rg-items-center rg-justify-between rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-slate-500">
                        <span>구매 준비도</span>
                        <span>{atMax ? '완료' : `${formatCompact(coins, compactNumbers)} / ${formatCompact(card.price, compactNumbers)}`}</span>
                      </div>
                      <div className="rg-h-2 rg-overflow-hidden rg-rounded-full rg-bg-white/[0.06]">
                        <div
                          className="rg-h-full rg-rounded-full rg-bg-[linear-gradient(90deg,#53d3c2,#f2cd72)]"
                          style={{ width: `${affordability}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onBuyUpgrade(card.definition.id)}
                  className={`rg-min-h-[50px] rg-min-w-[108px] rg-rounded-2xl rg-px-4 rg-text-sm rg-font-semibold ${
                    disabled
                      ? 'rg-cursor-not-allowed rg-border rg-border-white/8 rg-bg-white/[0.03] rg-text-slate-500'
                      : 'rg-border rg-border-mystic-teal/25 rg-bg-mystic-teal/14 rg-text-mystic-teal'
                  }`}
                >
                  {card.locked ? '잠김' : atMax ? '완료' : `${card.definition.kind === 'unlock' ? '해금' : '구매'} ${formatCompact(card.price, compactNumbers)}`}
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
            <h3 className="rg-mt-2 rg-font-display rg-text-xl rg-font-semibold rg-text-white">재조율 특전</h3>
          </div>
          <div className="rg-rounded-full rg-bg-black/20 rg-px-4 rg-py-2 rg-text-sm rg-font-semibold rg-text-mystic-violet">
            공명 가루 {formatCompact(dust, compactNumbers)}
          </div>
        </div>

        <div className="rg-mt-4 rg-space-y-3">
          {metaSorted.map((card) => {
            const atMax = !Number.isFinite(card.price);
            const disabled = atMax || !card.affordable;
            const progress = atMax ? 100 : clampPercent((dust / Math.max(card.price, 1)) * 100);
            const effectText = describeMetaEffect(card.definition.id, card.level);

            return (
              <div
                key={card.definition.id}
                className={`rg-rounded-[20px] rg-border rg-p-4 ${
                  card.affordable && !atMax ? 'rg-border-mystic-violet/18 rg-bg-mystic-violet/8' : 'rg-border-white/8 rg-bg-white/[0.04]'
                }`}
              >
                <div className="rg-flex rg-items-start rg-justify-between rg-gap-3">
                  <div className="rg-min-w-0 rg-flex-1">
                    <div className="rg-flex rg-flex-wrap rg-items-center rg-gap-2">
                      <WandSparkles size={15} className="rg-text-mystic-violet" />
                      <strong className="rg-text-base rg-font-semibold rg-text-white">{card.definition.name}</strong>
                      <span className="rg-rounded-full rg-bg-white/6 rg-px-2 rg-py-1 rg-text-[11px] rg-font-semibold rg-text-slate-300">
                        Lv {card.level}
                      </span>
                    </div>
                    <p className="rg-mb-0 rg-mt-2 rg-text-sm rg-leading-6 rg-text-slate-300">{card.definition.description}</p>

                    <div className="rg-mt-3 rg-grid rg-gap-2 md:rg-grid-cols-2">
                      <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-black/12 rg-px-3 rg-py-2">
                        <div className="rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.2em] rg-text-slate-500">현재 효과</div>
                        <div className="rg-mt-1 rg-text-sm rg-font-semibold rg-text-white">{effectText.current}</div>
                      </div>
                      <div className="rg-rounded-2xl rg-border rg-border-white/8 rg-bg-black/12 rg-px-3 rg-py-2">
                        <div className="rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.2em] rg-text-slate-500">다음 효과</div>
                        <div className="rg-mt-1 rg-text-sm rg-font-semibold rg-text-mystic-violet">
                          {atMax ? '최대 단계 도달' : effectText.next}
                        </div>
                      </div>
                    </div>

                    <div className="rg-mt-3">
                      <div className="rg-mb-1 rg-flex rg-items-center rg-justify-between rg-text-[11px] rg-font-semibold rg-uppercase rg-tracking-[0.18em] rg-text-slate-500">
                        <span>구매 준비도</span>
                        <span>{atMax ? '완료' : `${formatCompact(dust, compactNumbers)} / ${formatCompact(card.price, compactNumbers)}`}</span>
                      </div>
                      <div className="rg-h-2 rg-overflow-hidden rg-rounded-full rg-bg-white/[0.06]">
                        <div
                          className="rg-h-full rg-rounded-full rg-bg-[linear-gradient(90deg,#7f7af8,#b68cff)]"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => onBuyMetaUpgrade(card.definition.id)}
                    className={`rg-min-h-[46px] rg-rounded-2xl rg-px-4 rg-text-sm rg-font-semibold ${
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
          재조율 특전은 다음 순환에 남는 영구 강화입니다. 초반 5분의 성장 속도를 다시 끌어올리는 핵심 투자입니다.
        </p>
      </div>
    </section>
  );
}
