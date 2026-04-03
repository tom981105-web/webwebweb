import { useState } from 'react';
import { BookOpenText, CalendarDays, Flag, Gift, Layers3, ScrollText, Sparkles } from 'lucide-react';

import type { MissionStatus, PvERun, Reward } from '@/types/game';
import { SectionCard } from '@/components/SectionCard';

type MissionsViewProps = {
  missionGroups: {
    daily: MissionStatus[];
    weekly: MissionStatus[];
    achievements: MissionStatus[];
  };
  pendingRewards: Reward[];
  canClaimDaily: boolean;
  onClaimDaily: () => void;
  onClaimMission: (missionId: string, group: 'daily' | 'weekly' | 'achievement') => void;
  recentPveRuns: PvERun[];
  collectionProgress: { characters: string; equipment: string };
  onRunPve: (stage: number) => void;
};

type TabId = 'daily' | 'weekly' | 'achievements' | 'extensions';

function renderMissionCard(status: MissionStatus, group: 'daily' | 'weekly' | 'achievement', onClaimMission: MissionsViewProps['onClaimMission']) {
  return (
    <article key={status.definition.id} className="ap-mission-card">
      <div>
        <strong>{status.definition.title}</strong>
        <p>{status.definition.description}</p>
        <small>
          진행도 {status.progress} / {status.target}
        </small>
      </div>
      <button
        className="ap-button ap-button-primary"
        onClick={() => onClaimMission(status.definition.id, group)}
        disabled={!status.completed || status.claimed}
      >
        {status.claimed ? '수령 완료' : status.completed ? '보상 받기' : '진행 중'}
      </button>
    </article>
  );
}

export function MissionsView({
  missionGroups,
  pendingRewards,
  canClaimDaily,
  onClaimDaily,
  onClaimMission,
  recentPveRuns,
  collectionProgress,
  onRunPve,
}: MissionsViewProps) {
  const [tab, setTab] = useState<TabId>('daily');

  return (
    <div className="ap-two-column">
      <SectionCard
        kicker="Mission Hub"
        title="미션 / 보상"
        subtitle="일일, 주간, 업적, 장기 시스템 확장 자리를 함께 관리합니다."
        action={
          <div className="ap-tab-strip">
            {[
              { id: 'daily', label: '일일' },
              { id: 'weekly', label: '주간' },
              { id: 'achievements', label: '업적' },
              { id: 'extensions', label: '확장' },
            ].map((item) => (
              <button
                key={item.id}
                className={`ap-tab-button ${tab === item.id ? 'is-active' : ''}`}
                onClick={() => setTab(item.id as TabId)}
              >
                {item.label}
              </button>
            ))}
          </div>
        }
      >
        {tab === 'daily' ? (
          <div className="ap-mission-list">
            <div className="ap-inline-actions">
              <button className="ap-button ap-button-primary" onClick={onClaimDaily} disabled={!canClaimDaily}>
                {canClaimDaily ? '일일 출석 보상' : '오늘 출석 완료'}
              </button>
              <button className="ap-button" onClick={() => onRunPve(1)}>
                성장 균열 1단계
              </button>
              <button className="ap-button" onClick={() => onRunPve(3)}>
                성장 균열 3단계
              </button>
            </div>
            {missionGroups.daily.map((status) => renderMissionCard(status, 'daily', onClaimMission))}
          </div>
        ) : null}

        {tab === 'weekly' ? (
          <div className="ap-mission-list">
            {missionGroups.weekly.map((status) => renderMissionCard(status, 'weekly', onClaimMission))}
          </div>
        ) : null}

        {tab === 'achievements' ? (
          <div className="ap-mission-list">
            {missionGroups.achievements.map((status) => renderMissionCard(status, 'achievement', onClaimMission))}
          </div>
        ) : null}

        {tab === 'extensions' ? (
          <div className="ap-extension-grid">
            <article className="ap-extension-card">
              <BookOpenText size={18} />
              <strong>도감 시스템</strong>
              <p>캐릭터 {collectionProgress.characters} / 장비 {collectionProgress.equipment}</p>
            </article>
            <article className="ap-extension-card">
              <Flag size={18} />
              <strong>시즌 시스템</strong>
              <p>시즌 보상, 리셋 룰, 밴픽 특수 규칙을 붙일 수 있는 구조를 확보했습니다.</p>
            </article>
            <article className="ap-extension-card">
              <Layers3 size={18} />
              <strong>길드 시스템</strong>
              <p>길드 보스, 공동 기여, 지원 요청을 추가할 자리입니다.</p>
            </article>
            <article className="ap-extension-card">
              <Sparkles size={18} />
              <strong>프로필 꾸미기</strong>
              <p>프레임, 타이틀, 배너 꾸미기 확장 포인트를 남겨 두었습니다.</p>
            </article>
          </div>
        ) : null}
      </SectionCard>

      <div className="ap-dashboard-columns">
        <SectionCard kicker="Inbox" title="대기 중인 보상" subtitle="Auto PvP 누적 보상과 던전 보상을 이곳에서 확인합니다.">
          <ul className="ap-token-list">
            {pendingRewards.length ? pendingRewards.slice(0, 8).map((reward) => <li key={reward.id}>{reward.label}</li>) : <li>대기 중인 보상이 없습니다.</li>}
          </ul>
        </SectionCard>

        <SectionCard kicker="PvE" title="최근 성장 균열 기록" subtitle="PvE 보조 콘텐츠 진행 상황입니다.">
          <div className="ap-mission-list">
            {recentPveRuns.length ? (
              recentPveRuns.map((run) => (
                <article key={run.id} className="ap-mission-card">
                  <div>
                    <strong>
                      성장 균열 {run.stage}단계 · {run.result === 'win' ? '클리어' : '실패'}
                    </strong>
                    <p>{new Date(run.happenedAt).toLocaleString('ko-KR')}</p>
                    <small>{run.rewards.map((reward) => reward.label).join(', ')}</small>
                  </div>
                </article>
              ))
            ) : (
              <article className="ap-mission-card">
                <div>
                  <strong>아직 PvE 기록이 없습니다.</strong>
                  <p>성장 균열을 돌아 성장 재료와 장비 도안을 모아보세요.</p>
                </div>
              </article>
            )}
          </div>
        </SectionCard>

        <SectionCard kicker="Checklist" title="오늘 해야 할 일" subtitle="게임이 끊기지 않도록 핵심 루프만 압축했습니다.">
          <ul className="ap-compact-list">
            <li>
              <CalendarDays size={16} />
              <span>일일 보상 수령 후 자동 전투 결과 확인</span>
            </li>
            <li>
              <Gift size={16} />
              <span>누적 보상 및 미션 보상 정리</span>
            </li>
            <li>
              <ScrollText size={16} />
              <span>성장 균열 3회와 캐릭터 1회 성장</span>
            </li>
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
