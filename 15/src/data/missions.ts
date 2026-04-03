import type { AchievementDefinition, MissionDefinition, SeasonRewardDefinition } from '@/types/game';

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'first-enhance',
    label: '첫 보정',
    description: '강화를 1회 시도한다.',
    statKey: 'enhanceAttempts',
    target: 1,
    reward: { xp: 40, fame: 6, resources: { gold: 140 }, titleId: 'probability-apprentice' },
  },
  {
    id: 'smith-routine',
    label: '강화 루틴 정착',
    description: '강화를 50회 시도한다.',
    statKey: 'enhanceAttempts',
    target: 50,
    reward: { xp: 150, fame: 18, resources: { dataShards: 45, probabilityCores: 1 } },
  },
  {
    id: 'breakpoint-hunter',
    label: '돌파 사냥꾼',
    description: '장비 하나를 +12 이상 달성한다.',
    statKey: 'highestEnhancement',
    target: 12,
    reward: { xp: 180, fame: 24, resources: { gold: 500, fameBadges: 3 } },
  },
  {
    id: 'research-grid',
    label: '연구망 확장',
    description: '연구를 6회 완료한다.',
    statKey: 'researchCompleted',
    target: 6,
    reward: { xp: 180, fame: 18, resources: { dataShards: 80 } },
  },
  {
    id: 'expedition-wing',
    label: '원정 날개',
    description: '원정을 12회 완료한다.',
    statKey: 'expeditionsCompleted',
    target: 12,
    reward: { xp: 160, fame: 22, resources: { fameBadges: 4, relicFragments: 1 } },
  },
  {
    id: 'craft-loop',
    label: '제작 생태계 구축',
    description: '제작을 20회 완료한다.',
    statKey: 'itemsCrafted',
    target: 20,
    reward: { xp: 150, fame: 18, resources: { alloyScrap: 90, probabilityCores: 1 } },
  },
  {
    id: 'archive-open',
    label: '도감 개방',
    description: '장비 도감 8종을 해금한다.',
    statKey: 'equipmentDiscovered',
    target: 8,
    reward: { xp: 180, fame: 20, permanentBonuses: { craftQuality: 0.04 } },
  },
  {
    id: 'legend-signal',
    label: '전설 신호 포착',
    description: '전설 이상 장비를 2번 발견한다.',
    statKey: 'legendaryFinds',
    target: 2,
    reward: { xp: 220, fame: 26, resources: { relicFragments: 2, fameBadges: 4 } },
  },
];

export const DAILY_MISSIONS: MissionDefinition[] = [
  { id: 'daily-enhance', label: '오늘의 강화', description: '강화를 10회 시도한다.', statKey: 'enhanceAttempts', target: 10, reward: { resources: { gold: 260, dataShards: 18 }, xp: 40, seasonCurrency: 5 } },
  { id: 'daily-success', label: '안정 확보', description: '강화 성공 5회를 달성한다.', statKey: 'enhanceSuccesses', target: 5, reward: { resources: { alloyScrap: 22 }, xp: 40, seasonCurrency: 4 } },
  { id: 'daily-craft', label: '공방 생산량', description: '제작을 4회 완료한다.', statKey: 'itemsCrafted', target: 4, reward: { resources: { gold: 180, probabilityCores: 1 }, xp: 36, seasonCurrency: 4 } },
  { id: 'daily-expedition', label: '짧은 원정', description: '원정을 3회 완료한다.', statKey: 'expeditionsCompleted', target: 3, reward: { resources: { fameBadges: 2 }, xp: 42, seasonCurrency: 5 } },
];

export const WEEKLY_MISSIONS: MissionDefinition[] = [
  { id: 'weekly-breakthrough', label: '주간 돌파 계획', description: '강화를 40회 시도한다.', statKey: 'enhanceAttempts', target: 40, reward: { resources: { gold: 1200, dataShards: 120, probabilityCores: 2 }, xp: 160, fame: 16, seasonCurrency: 18 } },
  { id: 'weekly-success', label: '주간 성공률', description: '강화 성공 20회를 달성한다.', statKey: 'enhanceSuccesses', target: 20, reward: { resources: { alloyScrap: 140, fameBadges: 4 }, xp: 150, fame: 14, seasonCurrency: 14 } },
  { id: 'weekly-research', label: '주간 연구 프로젝트', description: '연구 4회를 완료한다.', statKey: 'researchCompleted', target: 4, reward: { resources: { dataShards: 160 }, xp: 150, fame: 14, seasonCurrency: 16 } },
  { id: 'weekly-expedition', label: '주간 원정망 정비', description: '원정을 10회 완료한다.', statKey: 'expeditionsCompleted', target: 10, reward: { resources: { relicFragments: 2, fameBadges: 6 }, xp: 170, fame: 18, seasonCurrency: 20 } },
];

export const SEASON_MISSIONS: MissionDefinition[] = [
  { id: 'season-progress-1', label: '시즌 분석선 구축', description: '연구 10회를 완료한다.', statKey: 'researchCompleted', target: 10, reward: { resources: { relicFragments: 2 }, seasonCurrency: 15, fame: 20 } },
  { id: 'season-progress-2', label: '시즌 원정로 개척', description: '원정을 25회 완료한다.', statKey: 'expeditionsCompleted', target: 25, reward: { resources: { probabilityCores: 3 }, seasonCurrency: 20, fame: 24 } },
  { id: 'season-progress-3', label: '시즌 기록 갱신', description: '장비 하나를 +18까지 강화한다.', statKey: 'highestEnhancement', target: 18, reward: { resources: { relicFragments: 4, fameBadges: 8 }, seasonCurrency: 28, fame: 30 } },
];

export const SEASON_REWARDS: SeasonRewardDefinition[] = [
  { id: 'season-r1', threshold: 20, label: '시즌 보급품', reward: { resources: { gold: 800, dataShards: 80 }, items: { protectionTicket: 2 } } },
  { id: 'season-r2', threshold: 45, label: '시즌 공방 키트', reward: { resources: { probabilityCores: 2, fameBadges: 4 }, items: { researchBooster: 1, expeditionAccelerator: 1 } } },
  { id: 'season-r3', threshold: 80, label: '시즌 심층 패키지', reward: { resources: { relicFragments: 4, fameBadges: 8 }, permanentBonuses: { offlineEfficiency: 0.04 }, titleId: 'deep-operator' } },
];
