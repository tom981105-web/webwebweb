import type {
  ControlModeDefinition,
  FacilityDefinition,
  ItemDefinition,
  MaterialDefinition,
  ResourceDefinition,
  TitleDefinition,
} from '@/types/game';

export const RESOURCE_DEFINITIONS: ResourceDefinition[] = [
  { id: 'gold', label: '골드', accent: 'amber', description: '모든 기본 운영과 시설 업그레이드에 쓰이는 주 재화' },
  { id: 'dataShards', label: '데이터 조각', accent: 'cyan', description: '실패 로그와 연구 분석에 사용되는 정보 조각' },
  { id: 'alloyScrap', label: '합금 파편', accent: 'teal', description: '제작과 강화에 필요한 금속성 기초 재료' },
  { id: 'probabilityCores', label: '확률 코어', accent: 'violet', description: '고급 제어 모듈과 고강화에 소모되는 핵심 장치' },
  { id: 'fameBadges', label: '명성 배지', accent: 'lime', description: '주간 프로젝트와 업적 보상으로 쌓이는 운영자 평판 증표' },
  { id: 'relicFragments', label: '유물 파편', accent: 'coral', description: '고대 유물 장비와 시즌 보상에 연결되는 희귀 재화' },
];

export const MATERIAL_DEFINITIONS: MaterialDefinition[] = [
  { id: 'stabilityFiber', label: '안정 섬유', accent: 'cyan', description: '장비 안정도와 보호 장치 제작에 사용된다.' },
  { id: 'coolantGel', label: '냉각 겔', accent: 'teal', description: '과열을 낮추고 자동화 라인의 효율을 유지한다.' },
  { id: 'phaseLens', label: '위상 렌즈', accent: 'violet', description: '집중 제어와 고급 보조장치 제작의 핵심 부품.' },
  { id: 'entropyResidue', label: '엔트로피 잔재', accent: 'coral', description: '난수폭주 계열 연구와 도박형 장비 제작에 쓰인다.' },
  { id: 'mnemonicDust', label: '기억 분진', accent: 'amber', description: '실패 데이터 복원과 유물 장비 분석에 필요하다.' },
  { id: 'sigilSteel', label: '문양 강철', accent: 'lime', description: '고급 무기와 방어구의 프레임을 구성한다.' },
  { id: 'voidCircuit', label: '공허 회로', accent: 'violet', description: '자동화와 역전보정 연구를 지탱하는 회로 자재.' },
  { id: 'relicResidue', label: '유물 잔향', accent: 'coral', description: '심층 원정과 시즌형 장비에서만 얻을 수 있는 흔적.' },
];

export const ITEM_DEFINITIONS: ItemDefinition[] = [
  {
    id: 'protectionTicket',
    label: '보호권',
    description: '다음 강화 실패 한 번의 단계 하락을 막는다.',
    effectText: '실패 시 단계 하락 방지',
    shopCost: { gold: 280, dataShards: 18 },
  },
  {
    id: 'probabilityAmplifier',
    label: '확률 증폭기',
    description: '다음 3회 강화에 성공 보정을 더한다.',
    effectText: '3회 동안 성공 확률 증가',
    shopCost: { gold: 460, probabilityCores: 1 },
  },
  {
    id: 'stabilityDevice',
    label: '안정 장치',
    description: '선택한 장비의 안정도를 즉시 회복시킨다.',
    effectText: '장비 안정도 +18',
    shopCost: { gold: 240, alloyScrap: 18 },
  },
  {
    id: 'coolant',
    label: '냉각제',
    description: '선택한 장비의 과열을 크게 낮춘다.',
    effectText: '장비 과열 -28',
    shopCost: { gold: 200, dataShards: 10 },
  },
  {
    id: 'distortionDice',
    label: '왜곡 주사위',
    description: '역전보정 스택을 추가해 다음 실패 이후 성공 보정을 키운다.',
    effectText: '역전 스택 +1',
    shopCost: { gold: 380 },
  },
  {
    id: 'durabilityKit',
    label: '내구 복원 키트',
    description: '선택한 장비의 내구도를 복원한다.',
    effectText: '내구도 +26',
    shopCost: { gold: 300, alloyScrap: 20 },
  },
  {
    id: 'researchBooster',
    label: '연구 촉진제',
    description: '진행 중인 연구 하나의 남은 시간을 크게 줄인다.',
    effectText: '연구 시간 20% 단축',
    shopCost: { gold: 520, dataShards: 35, probabilityCores: 1 },
  },
  {
    id: 'expeditionAccelerator',
    label: '원정 가속 장치',
    description: '진행 중인 원정 하나의 남은 시간을 압축한다.',
    effectText: '원정 시간 25% 단축',
    shopCost: { gold: 520, alloyScrap: 24, fameBadges: 2 },
  },
];

export const FACILITY_DEFINITIONS: FacilityDefinition[] = [
  {
    id: 'enhancementBay',
    label: '강화실',
    description: '고강화 구간의 실패 리스크를 줄이고 시도 효율을 끌어올린다.',
    effectText: '고강화 성공 보정 및 과열 완화',
    baseCost: { gold: 320, alloyScrap: 24, dataShards: 18 },
    maxLevel: 15,
  },
  {
    id: 'researchLab',
    label: '연구실',
    description: '동시 연구 슬롯과 연구 속도를 밀어 올리는 핵심 시설.',
    effectText: '연구 슬롯 확장 및 연구 속도 증가',
    baseCost: { gold: 280, dataShards: 34, alloyScrap: 18 },
    maxLevel: 15,
  },
  {
    id: 'dismantleBay',
    label: '분해실',
    description: '안 쓰는 장비에서 더 많은 자원과 옵션 데이터를 추출한다.',
    effectText: '분해 수율 증가 및 옵션 데이터 회수',
    baseCost: { gold: 260, alloyScrap: 30, dataShards: 12 },
    maxLevel: 15,
  },
  {
    id: 'fabricationBay',
    label: '제작실',
    description: '보호 장치와 고급 장비를 더 높은 품질로 뽑아낸다.',
    effectText: '제작 품질 및 상위 제작 해금',
    baseCost: { gold: 300, alloyScrap: 26, dataShards: 14 },
    maxLevel: 15,
  },
  {
    id: 'vault',
    label: '보관고',
    description: '장비와 재료를 장기적으로 쌓아 두는 성장 기반 저장 시설.',
    effectText: '장비 보관 한도 증가',
    baseCost: { gold: 240, alloyScrap: 18 },
    maxLevel: 15,
  },
  {
    id: 'expeditionControl',
    label: '원정 관제실',
    description: '동시 원정과 고난도 지역 진입의 중심이 되는 컨트롤 타워.',
    effectText: '동시 원정 수 증가 및 고급 지역 지원',
    baseCost: { gold: 340, dataShards: 24, probabilityCores: 2 },
    maxLevel: 15,
  },
  {
    id: 'automationLine',
    label: '자동화 라인',
    description: '반복 피로를 줄여 주는 자동 강화, 자동 제작, 오프라인 보상을 연다.',
    effectText: '자동화 기능 및 오프라인 보상 해금',
    baseCost: { gold: 420, dataShards: 40, probabilityCores: 3 },
    maxLevel: 15,
  },
];

export const CONTROL_MODES: ControlModeDefinition[] = [
  { id: 'general', label: '일반 제어', summary: '표준형', flavor: '가장 균형 잡힌 제어 모드. 초반 운용의 기본값.', accent: 'cyan' },
  { id: 'stable', label: '안정 제어', summary: '안정형', flavor: '성공률은 높지만 성장 속도가 조금 느리다.', accent: 'teal' },
  { id: 'focused', label: '집중 제어', summary: '단일 돌파형', flavor: '치명 성공과 고단계 돌파에 힘을 싣는 공격형 제어.', accent: 'amber' },
  { id: 'wild', label: '난수폭주 제어', summary: '도박형', flavor: '성공하면 크게 도약하지만 실패 리스크도 커진다.', accent: 'coral', unlockResearchId: 'entropy-breaker' },
  { id: 'pity', label: '누적보정 제어', summary: '실패 누적형', flavor: '연속 실패가 다음 성공 확률로 바뀌는 장기전용 모드.', accent: 'violet', unlockResearchId: 'failure-mapping' },
  { id: 'reversal', label: '역전보정 제어', summary: '역전형', flavor: '직전 실패의 상처를 다음 시도에서 크게 뒤집는다.', accent: 'coral', unlockResearchId: 'reversal-gate' },
  { id: 'guard', label: '보호특화 제어', summary: '보호형', flavor: '고강화 단계 하락과 차단 위험을 최대한 봉합한다.', accent: 'lime', unlockResearchId: 'guard-schematics' },
  { id: 'auto', label: '자동화 제어', summary: '반복 최적화형', flavor: '자동화 라인과 결합해 반복 효율을 높인다.', accent: 'violet', unlockResearchId: 'servo-routine' },
];

export const TITLE_DEFINITIONS: TitleDefinition[] = [
  { id: 'probability-apprentice', label: '확률 수련생', description: '첫 기록을 남긴 운영자.', bonusText: '강화 성공률 +1%', bonus: { successRate: 0.01 } },
  { id: 'time-binder', label: '시간 결속자', description: '크로노위브 세트를 완성했다.', bonusText: '연구 속도 +4%', bonus: { researchSpeed: 0.04 } },
  { id: 'luck-weaver', label: '행운 직조자', description: '럭위버 세트를 완성했다.', bonusText: '보호 확률 +4%', bonus: { protectionChance: 0.04 } },
  { id: 'null-smith', label: '널포지 대장장이', description: '널포지 세트를 완성했다.', bonusText: '과열 완화 +4%', bonus: { heatMitigation: 0.04 } },
  { id: 'forge-director', label: '공방 감독관', description: '파운드리 축 세트를 완성했다.', bonusText: '원정 수익 +4%', bonus: { expeditionYield: 0.04 } },
  { id: 'deep-operator', label: '심연 운영자', description: '특이점 균열을 개척했다.', bonusText: '오프라인 효율 +6%', bonus: { offlineEfficiency: 0.06 } },
];
