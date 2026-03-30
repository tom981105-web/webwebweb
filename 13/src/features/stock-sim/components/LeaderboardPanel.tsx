import { Trophy } from 'lucide-react';
import { Panel } from '@/features/stock-sim/components/Panel';
import type { LeaderboardEntry, LeaderboardSortMode } from '@/features/stock-sim/types';
import { formatCurrency, formatPercent } from '@/features/stock-sim/utils/formatters';

type LeaderboardPanelProps = {
  entries: LeaderboardEntry[];
  sortMode: LeaderboardSortMode;
  onSortChange: (mode: LeaderboardSortMode) => void;
  isRemote?: boolean;
  isLoading?: boolean;
};

export function LeaderboardPanel({
  entries,
  sortMode,
  onSortChange,
  isRemote = false,
  isLoading = false,
}: LeaderboardPanelProps) {
  const hiddenPreviewIds = new Set(['friend-hana', 'friend-jin']);
  const sortedEntries = entries
    .filter((entry) => {
      const normalizedId = String(entry.id || '').replace(/^stock-sim-/, '');
      return !hiddenPreviewIds.has(normalizedId) && entry.kind === 'current-user';
    })
    .sort((left, right) =>
      sortMode === 'returnRate'
        ? right.returnRate - left.returnRate
        : right.netWorth - left.netWorth,
    );

  return (
    <Panel
      title="실시간 랭킹"
      subtitle={
        isLoading
          ? '서버 참가 랭킹을 불러오는 중입니다. 잠시만 기다리면 최신 참가자 기준으로 갱신됩니다.'
          : isRemote
            ? '서버에 저장된 참가자 최신 스냅샷을 기준으로 자산과 수익률을 함께 보여줍니다.'
            : '로컬 프리뷰 데이터를 기준으로 현재 화면의 리더보드를 보여줍니다.'
      }
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
        {isLoading ? (
          <div className="ss-ui-soft-card-strong ss-rounded-[22px] ss-p-5 ss-text-sm ss-leading-7 ss-text-slate-300/82">
            실시간 참가 랭킹을 준비 중입니다. 첫 동기화가 끝나면 현재 참가자 기준으로 자동 갱신됩니다.
          </div>
        ) : null}

        {!isLoading && sortedEntries.length === 0 ? (
          <div className="ss-ui-soft-card-strong ss-rounded-[22px] ss-p-5 ss-text-sm ss-leading-7 ss-text-slate-300/82">
            아직 서버 랭킹 데이터가 없습니다. 첫 스냅샷이 저장되면 여기에 바로 표시됩니다.
          </div>
        ) : null}

        {!isLoading
          ? sortedEntries.map((entry, index) => (
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
                        : entry.kind === 'current-user'
                          ? '현재 플레이어'
                          : '참가자'}
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
                      최근 변동 {formatPercent(entry.lastDelta)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))
          : null}

        {!isLoading ? (
          <div className="ss-ui-soft-card ss-rounded-[22px] ss-p-4 ss-text-xs ss-leading-6 ss-text-slate-400">
            {isRemote
              ? '현재는 관리자/허용 계정 전용 참가 랭킹 구조로 열려 있으며, 참가자별 최신 스냅샷 요약만 서버에 저장해 저장소 사용을 최소화하고 있습니다.'
              : '현재는 로컬 프리뷰 리더보드입니다. 서버 참가 세션과 연결되면 실시간 참가자 기준으로 자연스럽게 확장됩니다.'}
          </div>
        ) : null}
      </div>
    </Panel>
  );
}
