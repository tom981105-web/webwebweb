import { ArrowRight, Boxes, Gem, Shield, Sparkles, Swords, Trophy } from 'lucide-react';

import { CHARACTER_DEFINITION_MAP } from '@/data/characters';
import type { Reward, TodaySummary, UserCharacter } from '@/types/game';
import { formatNumber, formatPercent } from '@/utils/format';
import { SectionCard } from '@/components/SectionCard';

type HomeDashboardProps = {
  summary: TodaySummary;
  pendingRewards: Reward[];
  currencies: Array<{ key: string; label: string; value: string }>;
  growthTargets: UserCharacter[];
  standoutName: string;
  offlineText: string;
  tier: string;
  score: number;
  teamPower: number;
  synergyNotes: string[];
  onClaimRewards: () => void;
  onClaimDaily: () => void;
  canClaimDaily: boolean;
  onRunQuickBattles: (count: number) => void;
  onGrowCharacter: (characterId: string) => void;
  onRunPve: (stage: number) => void;
  getCharacterName: (characterId: string) => string;
  recentReports: Array<{
    id: string;
    result: string;
    opponentName: string;
    mvpCharacterId: string;
    defeatReason: string;
    keyLog: string[];
  }>;
};

function rewardLabel(reward: Reward) {
  if (reward.type === 'equipment') return reward.label;
  return reward.label;
}

export function HomeDashboard({
  summary,
  pendingRewards,
  currencies,
  growthTargets,
  standoutName,
  offlineText,
  tier,
  score,
  teamPower,
  synergyNotes,
  onClaimRewards,
  onClaimDaily,
  canClaimDaily,
  onRunQuickBattles,
  onGrowCharacter,
  onRunPve,
  getCharacterName,
  recentReports,
}: HomeDashboardProps) {
  return (
    <div className="ap-view-grid">
      <SectionCard
        kicker="Today Result"
        title="오늘의 자동 전투 결과"
        subtitle={offlineText}
        className="ap-hero-card"
        action={
          <div className="ap-hero-actions">
            <button className="ap-button ap-button-primary" onClick={onClaimRewards} disabled={pendingRewards.length === 0}>
              누적 보상 수령
            </button>
            <button className="ap-button" onClick={() => onRunQuickBattles(3)}>
              즉시 3전
            </button>
          </div>
        }
      >
        <div className="ap-hero-grid">
          <div className="ap-result-panel">
            <div className="ap-result-meta">
              <span className="ap-tier-pill">{tier}</span>
              <strong>{score.toLocaleString('ko-KR')} RP</strong>
            </div>
            <div className="ap-result-stats">
              <div>
                <span>자동 전투</span>
                <strong>{summary.battles}전</strong>
              </div>
              <div>
                <span>승률</span>
                <strong>{formatPercent(summary.winRate, 1)}</strong>
              </div>
              <div>
                <span>티어 변화</span>
                <strong className={summary.tierDelta >= 0 ? 'ap-positive' : 'ap-negative'}>
                  {summary.tierDelta >= 0 ? '+' : ''}
                  {summary.tierDelta}
                </strong>
              </div>
              <div>
                <span>총 전투력</span>
                <strong>{formatNumber(teamPower)}</strong>
              </div>
            </div>
            <div className="ap-result-footer">
              <div>
                <span>활약한 핵심 요원</span>
                <strong>{standoutName || '집계중'}</strong>
              </div>
              <div>
                <span>최근 이슈 요약</span>
                <strong>{summary.defeatReasons[0] || '현재 전선은 안정적으로 유지되고 있습니다.'}</strong>
              </div>
            </div>
          </div>

          <div className="ap-stack">
            <div className="ap-highlight-panel">
              <h3>지금 바로 추천 행동</h3>
              <ul className="ap-compact-list">
                {summary.recommendedActions.map((item) => (
                  <li key={item}>
                    <ArrowRight size={16} />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ap-highlight-panel">
              <h3>장비 / 재화 하이라이트</h3>
              <ul className="ap-token-list">
                {(summary.recentLoot.length ? summary.recentLoot : pendingRewards.slice(0, 5)).map((reward) => (
                  <li key={reward.id}>{rewardLabel(reward)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="ap-dashboard-columns">
        <SectionCard kicker="Arena Loop" title="전략 대시보드" subtitle="단기 운영과 팀 상태를 가볍게 훑어볼 수 있습니다.">
          <div className="ap-metric-grid">
            <div className="ap-metric-item">
              <Trophy size={18} />
              <span>현재 티어</span>
              <strong>{tier}</strong>
            </div>
            <div className="ap-metric-item">
              <Shield size={18} />
              <span>시너지</span>
              <strong>{synergyNotes.length}개 활성</strong>
            </div>
            <div className="ap-metric-item">
              <Swords size={18} />
              <span>즉시 전투</span>
              <strong>빠른 실험 가능</strong>
            </div>
            <div className="ap-metric-item">
              <Boxes size={18} />
              <span>누적 보상</span>
              <strong>{pendingRewards.length}개 대기</strong>
            </div>
          </div>
          <div className="ap-inline-actions">
            <button className="ap-button" onClick={() => onRunQuickBattles(3)}>
              3전 테스트
            </button>
            <button className="ap-button" onClick={() => onRunQuickBattles(10)}>
              10전 실험
            </button>
            <button className="ap-button ap-button-primary" onClick={() => onRunPve(3)}>
              성장 구역 3단계
            </button>
          </div>
        </SectionCard>

        <SectionCard
          kicker="Growth Targets"
          title="성장 우선 순위"
          subtitle="지금 투자 효율이 높은 캐릭터를 추천합니다."
          action={
            <button className="ap-button" onClick={onClaimDaily} disabled={!canClaimDaily}>
              {canClaimDaily ? '일일 보상 수령' : '오늘 수령 완료'}
            </button>
          }
        >
          <div className="ap-growth-list">
            {growthTargets.map((character) => {
              const definition = CHARACTER_DEFINITION_MAP[character.definitionId];
              return (
                <button key={character.id} className="ap-growth-item" onClick={() => onGrowCharacter(character.id)}>
                  <div className="ap-mini-avatar" style={{ background: definition.artAccent }}>
                    {definition.name.slice(0, 1)}
                  </div>
                  <div>
                    <strong>{definition.name}</strong>
                    <span>
                      Lv.{character.level} / {definition.summary}
                    </span>
                  </div>
                  <Sparkles size={16} />
                </button>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard kicker="Wallet" title="현재 재화" subtitle="오늘 모인 자원을 바로 성장 루프에 투입할 수 있습니다.">
          <div className="ap-currency-grid">
            {currencies.map((currency) => (
              <div key={currency.key} className="ap-currency-item">
                <Gem size={16} />
                <span>{currency.label}</span>
                <strong>{currency.value}</strong>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard kicker="Live Panel" title="최근 자동 전투 리포트" subtitle="접속하지 않아도 쌓인 결과를 로그처럼 빠르게 확인할 수 있습니다.">
        <div className="ap-report-feed">
          {recentReports.map((report) => (
            <article key={report.id} className="ap-feed-item">
              <div className="ap-feed-header">
                <span className={`ap-badge ${report.result === 'win' ? 'ap-badge-win' : 'ap-badge-loss'}`}>
                  {report.result === 'win' ? '승리' : '패배'}
                </span>
                <strong>{report.opponentName}</strong>
                <span>MVP {getCharacterName(report.mvpCharacterId)}</span>
              </div>
              <p>{report.defeatReason}</p>
              <ul className="ap-feed-log">
                {report.keyLog.slice(0, 2).map((log) => (
                  <li key={log}>{log}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
