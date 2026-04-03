import { Crown, Shield, Trophy } from 'lucide-react';

import type { RankingEntry, TeamAnalysis } from '@/types/game';
import { formatPercent } from '@/utils/format';
import { SectionCard } from '@/components/SectionCard';

type RankingViewProps = {
  entries: RankingEntry[];
  teamAnalysis: TeamAnalysis;
  season: {
    name: string;
    subtitle: string;
    endsAt: number;
  };
};

export function RankingView({ entries, teamAnalysis, season }: RankingViewProps) {
  const currentUser = entries.find((entry) => entry.isCurrentUser) || entries[0];

  return (
    <div className="ap-two-column">
      <SectionCard kicker="My Rank" title="내 순위" subtitle={season.subtitle}>
        <div className="ap-metric-grid">
          <div className="ap-metric-item">
            <Trophy size={18} />
            <span>현재 순위</span>
            <strong>{currentUser.rank}위</strong>
          </div>
          <div className="ap-metric-item">
            <Crown size={18} />
            <span>현재 티어</span>
            <strong>{currentUser.tier}</strong>
          </div>
          <div className="ap-metric-item">
            <Shield size={18} />
            <span>팀 전투력</span>
            <strong>{currentUser.teamPower.toLocaleString('ko-KR')}</strong>
          </div>
        </div>
        <ul className="ap-compact-list">
          {teamAnalysis.notes.map((note) => (
            <li key={note}>
              <Shield size={16} />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard kicker="Ladder" title="상위 랭커" subtitle={`시즌 종료 ${new Date(season.endsAt).toLocaleDateString('ko-KR')} 예정`}>
        <div className="ap-ranking-table">
          {entries.map((entry) => (
            <div key={entry.userId} className={`ap-ranking-row ${entry.isCurrentUser ? 'is-current' : ''}`}>
              <span>{entry.rank}</span>
              <strong>{entry.displayName}</strong>
              <span>{entry.tier}</span>
              <span>{entry.score.toLocaleString('ko-KR')} RP</span>
              <span>{formatPercent(entry.winRate, 1)}</span>
              <span>{entry.teamPower.toLocaleString('ko-KR')}</span>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
