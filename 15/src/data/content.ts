import { getTierFromScore } from '@/utils/format';
import type {
  Achievement,
  Mission,
  PvEDungeonDefinition,
  Reward,
  RivalProfile,
  SeasonState,
  TeamSlotId,
} from '@/types/game';

function reward(id: string, type: Reward['type'], amount: number, label: string): Reward {
  return { id, type, amount, label };
}

function equipmentReward(id: string, equipmentDefinitionId: string, label: string, rarity: Reward['rarity']): Reward {
  return { id, type: 'equipment', equipmentDefinitionId, label, rarity };
}

function member(definitionId: string, level: number, slotId: TeamSlotId, equipmentDefinitionIds: string[]) {
  return { definitionId, level, slotId, equipmentDefinitionIds };
}

export const DAILY_MISSIONS: Mission[] = [
  {
    id: 'daily-battles-10',
    cadence: 'daily',
    title: '자동 전투 10회 달성',
    description: '오늘 Auto PvP 전투를 10회 누적하세요.',
    metric: 'dailyBattles',
    target: 10,
    rewards: [reward('daily-battle-gold', 'gold', 600, '골드 +600'), reward('daily-battle-core', 'gearCore', 24, '강화 코어 +24')],
  },
  {
    id: 'daily-growth-1',
    cadence: 'daily',
    title: '캐릭터 1회 성장',
    description: '캐릭터 레벨 업이나 성장을 1회 진행하세요.',
    metric: 'dailyGrowths',
    target: 1,
    rewards: [reward('daily-growth-currency', 'growth', 60, '성장 재료 +60'), reward('daily-growth-gem', 'gem', 20, '젬 +20')],
  },
  {
    id: 'daily-pve-3',
    cadence: 'daily',
    title: 'PvE 3회 클리어',
    description: '성장 던전을 세 번 클리어하세요.',
    metric: 'dailyPveClears',
    target: 3,
    rewards: [reward('daily-pve-gold', 'gold', 420, '골드 +420'), reward('daily-pve-growth', 'growth', 48, '성장 재료 +48')],
  },
  {
    id: 'daily-reward-claim',
    cadence: 'daily',
    title: '오늘의 보상 수령',
    description: '오프라인 누적 보상이나 로그인 보상을 1회 수령하세요.',
    metric: 'dailyRewardsClaimed',
    target: 1,
    rewards: [reward('daily-reward-token', 'arenaToken', 12, '아레나 토큰 +12')],
  },
  {
    id: 'daily-win-6',
    cadence: 'daily',
    title: '오늘의 승리 6회',
    description: '오늘 PvP 승리를 6회 기록하세요.',
    metric: 'dailyWins',
    target: 6,
    rewards: [
      reward('daily-win-gold', 'gold', 520, '골드 +520'),
      equipmentReward('daily-win-eq', 'chrono-brooch', '희귀 장신구 상자', 'epic'),
    ],
  },
];

export const WEEKLY_MISSIONS: Mission[] = [
  {
    id: 'weekly-battles-60',
    cadence: 'weekly',
    title: '자동 전투 60회',
    description: '이번 주 Auto PvP 전투를 60회 누적하세요.',
    metric: 'weeklyBattles',
    target: 60,
    rewards: [reward('weekly-battles-gold', 'gold', 2600, '골드 +2,600'), reward('weekly-battles-core', 'gearCore', 120, '강화 코어 +120')],
  },
  {
    id: 'weekly-pve-12',
    cadence: 'weekly',
    title: '던전 정복자',
    description: '이번 주 성장 던전을 12회 클리어하세요.',
    metric: 'weeklyPveClears',
    target: 12,
    rewards: [reward('weekly-pve-growth', 'growth', 240, '성장 재료 +240'), reward('weekly-pve-gem', 'gem', 60, '젬 +60')],
  },
  {
    id: 'weekly-growth-5',
    cadence: 'weekly',
    title: '전력 갱신 5회',
    description: '이번 주 캐릭터 성장을 5회 진행하세요.',
    metric: 'weeklyGrowths',
    target: 5,
    rewards: [
      reward('weekly-growth-token', 'arenaToken', 80, '아레나 토큰 +80'),
      equipmentReward('weekly-growth-eq', 'glacier-shell', '전설 방어구 도안', 'legendary'),
    ],
  },
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-best-score',
    title: '상위 티어 진입',
    description: '최고 점수 1,420을 달성하세요.',
    metric: 'bestScore',
    target: 1420,
    rewards: [reward('ach-best-score-gem', 'gem', 120, '젬 +120')],
  },
  {
    id: 'ach-collection',
    title: '도감 개방',
    description: '12종 캐릭터를 모두 확보하세요.',
    metric: 'collectionCount',
    target: 12,
    rewards: [reward('ach-collection-gold', 'gold', 1800, '골드 +1,800')],
  },
  {
    id: 'ach-weekly-wins',
    title: '주간 승률 개선',
    description: '이번 주 승리 25회를 기록하세요.',
    metric: 'weeklyWins',
    target: 25,
    rewards: [reward('ach-weekly-wins-core', 'gearCore', 80, '강화 코어 +80')],
  },
];

export const CURRENT_SEASON: SeasonState = {
  id: 'season-equinox-01',
  name: 'Season Equinox',
  subtitle: '균형을 깬 조합이 상위권을 점령하는 첫 시즌',
  endsAt: new Date('2026-05-01T00:00:00+09:00').getTime(),
};

export const RIVAL_PROFILES: RivalProfile[] = [
  {
    id: 'rival-hyena',
    name: '하이에나 분대',
    teamName: '스크랩 러시',
    tier: getTierFromScore(960),
    score: 960,
    winRateHint: 47.8,
    members: [
      member('brakka-wall', 18, 'front-1', ['fortress-mail', 'iron-oath-ring']),
      member('kael-quake', 19, 'front-2', ['sentinel-hammer', 'bloodline-charm']),
      member('kestrel-mark', 19, 'back-1', ['phantom-bow', 'chrono-brooch']),
      member('mino-signal', 18, 'back-2', ['medic-habit', 'chrono-brooch']),
    ],
  },
  {
    id: 'rival-gale',
    name: '게일 연합',
    teamName: '선공 압박대',
    tier: getTierFromScore(1080),
    score: 1080,
    winRateHint: 50.1,
    members: [
      member('ronan-bastion', 20, 'front-1', ['warden-plate', 'iron-oath-ring']),
      member('nyra-veil', 20, 'back-1', ['emberfang-blade', 'veil-sigil']),
      member('selene-comet', 20, 'back-2', ['phantom-bow', 'chrono-brooch']),
      member('astra-cantor', 19, 'front-2', ['medic-habit', 'sunwell-orb']),
    ],
  },
  {
    id: 'rival-ivory',
    name: '아이보리 기사단',
    teamName: '균형 방어선',
    tier: getTierFromScore(1190),
    score: 1190,
    winRateHint: 51.4,
    members: [
      member('ronan-bastion', 22, 'front-1', ['fortress-mail', 'iron-oath-ring']),
      member('kael-quake', 21, 'front-2', ['stormcoil-lance', 'bloodline-charm']),
      member('liora-sun', 21, 'back-1', ['aurora-catalyst', 'sunwell-orb']),
      member('selene-comet', 21, 'back-2', ['phantom-bow', 'chrono-brooch']),
      member('mino-signal', 20, 'front-3', ['medic-habit', 'veil-sigil']),
    ],
  },
  {
    id: 'rival-grimoire',
    name: '그리모어 스쿼드',
    teamName: '광역 마도진',
    tier: getTierFromScore(1280),
    score: 1280,
    winRateHint: 53.2,
    members: [
      member('brakka-wall', 22, 'front-1', ['glacier-shell', 'iron-oath-ring']),
      member('vesper-cryo', 23, 'back-1', ['aurora-catalyst', 'chrono-brooch']),
      member('morrow-hex', 22, 'back-2', ['stormcoil-lance', 'veil-sigil']),
      member('eirene-mirror', 22, 'front-2', ['medic-habit', 'sunwell-orb']),
    ],
  },
  {
    id: 'rival-redmist',
    name: '레드미스트',
    teamName: '출혈 집행단',
    tier: getTierFromScore(1380),
    score: 1380,
    winRateHint: 54.6,
    members: [
      member('dorian-rift', 24, 'front-1', ['emberfang-blade', 'bloodline-charm']),
      member('nyra-veil', 24, 'back-1', ['stormcoil-lance', 'veil-sigil']),
      member('kestrel-mark', 23, 'back-2', ['phantom-bow', 'bloodline-charm']),
      member('astra-cantor', 23, 'front-2', ['medic-habit', 'sunwell-orb']),
      member('kael-quake', 23, 'front-3', ['sentinel-hammer', 'iron-oath-ring']),
    ],
  },
  {
    id: 'rival-prism',
    name: '프리즘 포스',
    teamName: '정화 조율대',
    tier: getTierFromScore(1490),
    score: 1490,
    winRateHint: 56.8,
    members: [
      member('ronan-bastion', 25, 'front-1', ['glacier-shell', 'iron-oath-ring']),
      member('eirene-mirror', 25, 'front-2', ['medic-habit', 'sunwell-orb']),
      member('selene-comet', 25, 'back-1', ['phantom-bow', 'chrono-brooch']),
      member('vesper-cryo', 25, 'back-2', ['aurora-catalyst', 'chrono-brooch']),
      member('mino-signal', 24, 'front-3', ['medic-habit', 'veil-sigil']),
    ],
  },
  {
    id: 'rival-vanguard',
    name: '선봉 실험체',
    teamName: '돌파 안정화',
    tier: getTierFromScore(1620),
    score: 1620,
    winRateHint: 59.3,
    members: [
      member('dorian-rift', 27, 'front-1', ['emberfang-blade', 'bloodline-charm']),
      member('ronan-bastion', 27, 'front-2', ['glacier-shell', 'veil-sigil']),
      member('nyra-veil', 27, 'back-1', ['stormcoil-lance', 'bloodline-charm']),
      member('liora-sun', 26, 'back-2', ['aurora-catalyst', 'sunwell-orb']),
      member('vesper-cryo', 26, 'front-3', ['warden-plate', 'chrono-brooch']),
    ],
  },
];

export const PVE_DUNGEONS: PvEDungeonDefinition[] = [
  {
    id: 'growth-rift',
    name: '성장 균열',
    description: '짧은 전투로 성장 재료와 코어를 안정적으로 수급하는 훈련 던전',
    stages: [
      {
        stage: 1,
        recommendedPower: 6200,
        rivalId: 'rival-hyena',
        rewardTable: [reward('pve-1-growth', 'growth', 42, '성장 재료 +42'), reward('pve-1-gold', 'gold', 180, '골드 +180')],
      },
      {
        stage: 2,
        recommendedPower: 7100,
        rivalId: 'rival-gale',
        rewardTable: [reward('pve-2-growth', 'growth', 54, '성장 재료 +54'), reward('pve-2-core', 'gearCore', 18, '강화 코어 +18')],
      },
      {
        stage: 3,
        recommendedPower: 8100,
        rivalId: 'rival-grimoire',
        rewardTable: [
          reward('pve-3-growth', 'growth', 68, '성장 재료 +68'),
          reward('pve-3-core', 'gearCore', 24, '강화 코어 +24'),
          reward('pve-3-gold', 'gold', 260, '골드 +260'),
        ],
      },
      {
        stage: 4,
        recommendedPower: 9200,
        rivalId: 'rival-redmist',
        rewardTable: [
          reward('pve-4-growth', 'growth', 82, '성장 재료 +82'),
          reward('pve-4-core', 'gearCore', 28, '강화 코어 +28'),
          equipmentReward('pve-4-eq', 'fortress-mail', '방어구 도안', 'rare'),
        ],
      },
      {
        stage: 5,
        recommendedPower: 10200,
        rivalId: 'rival-prism',
        rewardTable: [
          reward('pve-5-growth', 'growth', 96, '성장 재료 +96'),
          reward('pve-5-core', 'gearCore', 36, '강화 코어 +36'),
          equipmentReward('pve-5-eq', 'glacier-shell', '전설 방어구 도안', 'legendary'),
        ],
      },
    ],
  },
];
