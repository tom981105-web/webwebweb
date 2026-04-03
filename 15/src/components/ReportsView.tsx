import type { BattleSummary } from '@/types/game';
import { formatTime } from '@/utils/format';
import { SectionCard } from '@/components/SectionCard';

type ReportsViewProps = {
  reports: BattleSummary[];
  getCharacterName: (characterId: string) => string;
};

export function ReportsView({ reports, getCharacterName }: ReportsViewProps) {
  return (
    <SectionCard
      kicker="Battle Reports"
      title="최근 자동 전투 리포트"
      subtitle="승패, MVP, 핵심 로그, 패배 원인을 빠르게 확인합니다."
    >
      <div className="ap-report-list">
        {reports.map((report) => (
          <article key={report.id} className="ap-report-card">
            <div className="ap-report-top">
              <div className="ap-inline-line">
                <span className={`ap-badge ${report.result === 'win' ? 'ap-badge-win' : 'ap-badge-loss'}`}>
                  {report.result === 'win' ? '승리' : '패배'}
                </span>
                <strong>{report.opponent.name}</strong>
                <span>{report.opponent.teamName}</span>
              </div>
              <small>{formatTime(report.happenedAt)}</small>
            </div>

            <div className="ap-report-metrics">
              <div>
                <span>MVP</span>
                <strong>{getCharacterName(report.mvpCharacterId)}</strong>
              </div>
              <div>
                <span>생존자 수</span>
                <strong>
                  아군 {report.survivors.ally} / 적군 {report.survivors.enemy}
                </strong>
              </div>
              <div>
                <span>총 딜량</span>
                <strong>{report.totalDamage.toLocaleString('ko-KR')}</strong>
              </div>
              <div>
                <span>총 힐량</span>
                <strong>{report.totalHealing.toLocaleString('ko-KR')}</strong>
              </div>
            </div>

            <p className="ap-report-reason">{report.defeatReason}</p>
            <ul className="ap-feed-log">
              {report.keyLog.slice(0, 4).map((log) => (
                <li key={log}>{log}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </SectionCard>
  );
}
