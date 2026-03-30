import { Trophy } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type { LeaderboardEntry, LeaderboardSortMode } from '@/features/stock-sim/types';
import { formatCurrency, formatPercent } from '@/features/stock-sim/utils/formatters';

type LeaderboardPanelProps = {
  entries: LeaderboardEntry[];
  sortMode: LeaderboardSortMode;
  onSortChange: (mode: LeaderboardSortMode) => void;
};

export function LeaderboardPanel({ entries, sortMode, onSortChange }: LeaderboardPanelProps) {
  const sortedEntries = [...entries].sort((left, right) =>
    sortMode === 'returnRate' ? right.returnRate - left.returnRate : right.netWorth - left.netWorth,
  );

  return (
    <Panel
      title="랭킹 프리뷰"
      subtitle="친구 3명 경쟁 구조를 붙이기 쉽도록 현재는 로컬 프리뷰 형태의 리더보드를 유지하고 있습니다."
      icon={<Trophy className="ss-h-5 ss-w-5" />}
      action={
        <div className="ss-inline-flex ss-rounded-full ss-border ss-border-white/10 ss-bg-white/5 ss-p-1">
          {[
            { label: '자산', value: 'netWorth' },
            { label: '수익률', value: 'returnRate' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onSortChange(option.value as LeaderboardSortMode)}
              className={`ss-rounded-full ss-px-3 ss-py-1.5 ss-text-xs ss-font-medium ss-transition ${
                sortMode === option.value
                  ? 'ss-bg-cyan-300/14 ss-text-cyan-50'
                  : 'ss-text-slate-300 hover:ss-text-white'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      }
      tone="accent"
    >
      <div className="ss-space-y-4">
        {sortedEntries.map((entry, index) => (
          <div
            key={entry.id}
            className={`ss-flex ss-items-center ss-justify-between ss-rounded-[22px] ss-border ss-px-4 ss-py-3.5 ${
              entry.kind === 'current-user'
                ? 'ss-border-cyan-300/18 ss-bg-cyan-300/10'
                : 'ss-border-white/8 ss-bg-white/5'
            }`}
          >
            <div className="ss-flex ss-items-center ss-gap-3">
              <div className="ss-flex ss-h-11 ss-w-11 ss-items-center ss-justify-center ss-rounded-[18px] ss-bg-white/10 ss-font-display ss-text-lg ss-font-semibold ss-text-white">
                {index + 1}
              </div>
              <div>
                <div className="ss-flex ss-items-center ss-gap-2">
                  <p className="ss-font-medium ss-text-white">{entry.name}</p>
                  <span className="ss-ui-chip">{entry.style}</span>
                </div>
                <p className="ss-mt-1 ss-text-xs ss-text-slate-400">
                  {entry.focusSectors.length > 0
                    ? entry.focusSectors.join(' · ')
                    : '현재 플레이어'}
                </p>
              </div>
            </div>
            <div className="ss-text-right">
              <p className="ss-text-sm ss-font-medium ss-text-white">
                {formatCurrency(entry.netWorth)}
              </p>
              <p
                className={`ss-mt-1 ss-text-xs ${
                  entry.returnRate >= 0 ? 'ss-text-lime-200' : 'ss-text-rose-200'
                }`}
              >
                {formatPercent(entry.returnRate)}
              </p>
              {entry.kind !== 'current-user' ? (
                <p
                  className={`ss-mt-1 ss-text-[11px] ${
                    entry.lastDelta >= 0 ? 'ss-text-lime-200/80' : 'ss-text-rose-200/80'
                  }`}
                >
                  최근 변화 {formatPercent(entry.lastDelta)}
                </p>
              ) : null}
            </div>
          </div>
        ))}

        <div className="ss-ui-soft-card ss-rounded-[22px] ss-p-4 ss-text-xs ss-leading-6 ss-text-slate-400">
          현재는 로컬 프리뷰 랭킹입니다. 이후 멀티플레이 연결 시 플레이어별 자산, 포트폴리오,
          시즌 기록, 친구 리더보드로 자연스럽게 확장할 수 있습니다.
        </div>
      </div>
    </Panel>
  );
}
