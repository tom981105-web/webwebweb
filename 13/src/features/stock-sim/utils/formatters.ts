import type {
  AiArchetype,
  DayPhase,
  MarketRegime,
  Sector,
  StockArchetype,
  StockLimitState,
  StockStatus,
  StockTrait,
} from '@/features/stock-sim/types';

export const SEOUL_TIME_ZONE = 'Asia/Seoul';
const KRW_EXCHANGE_RATE = 1_350;

const currencyFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const integerFormatter = new Intl.NumberFormat('ko-KR', {
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const SECTOR_LABELS: Record<Sector, string> = {
  AI: '인공지능',
  Semiconductor: '반도체',
  Robotics: '로보틱스',
  Space: '우주항공',
  Bio: '바이오',
  Battery: '배터리',
  Game: '게임',
  Platform: '플랫폼',
  Logistics: '물류',
  Energy: '에너지',
  Entertainment: '엔터',
  Defense: '방산',
};

const MARKET_MOOD_LABELS = [
  { min: 0.55, label: '과열 랠리' },
  { min: 0.2, label: '매수 우위' },
  { min: -0.2, label: '중립 균형' },
  { min: -0.55, label: '리스크 오프' },
  { min: Number.NEGATIVE_INFINITY, label: '공포 확산' },
] as const;

const MARKET_REGIME_LABELS: Record<MarketRegime, string> = {
  accumulation: '매집 구간',
  markup: '상승 확장',
  rotation: '섹터 순환',
  distribution: '차익 실현',
  panic: '패닉 구간',
  rebound: '반등 시도',
};

const MARKET_REGIME_DESCRIPTIONS: Record<MarketRegime, string> = {
  accumulation: '조용한 매집과 분산 매수가 누적되는 구간입니다.',
  markup: '주도주에 자금이 몰리며 상승 탄력이 확장되는 구간입니다.',
  rotation: '섹터 간 자금 이동이 잦아지며 순환매가 강화되는 구간입니다.',
  distribution: '강한 종목에서 차익 실현이 늘어나고 공급이 많아지는 구간입니다.',
  panic: '위험 회피 심리가 커지며 변동성과 하락 압력이 높아진 구간입니다.',
  rebound: '급락 이후 저가 매수가 유입되고 반등을 시도하는 구간입니다.',
};

const ARCHETYPE_LABELS: Record<AiArchetype, string> = {
  aggressive: '공격형',
  defensive: '안정형',
  scalper: '초단타형',
  fearful: '공포형',
  contrarian: '역발상형',
  'theme-chaser': '테마 추종형',
  whale: '고래형',
  'crowd-follower': '군중 추종형',
};

const STOCK_ARCHETYPE_LABELS: Record<StockArchetype, string> = {
  bluechip: '우량주',
  growth: '성장주',
  distressed: '부실주',
  theme: '테마주',
};

const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  NORMAL: '정상',
  WARNING: '관리종목',
  HALTED: '거래정지',
  DELISTED: '상장폐지',
};

const LIMIT_STATE_LABELS: Record<StockLimitState, string> = {
  normal: '정상 범위',
  'upper-limit': '상한가',
  'lower-limit': '하한가',
};

const DAY_PHASE_LABELS: Record<DayPhase, string> = {
  opening: '장 초반',
  session: '장 진행',
  closing: '장 마감',
  overnight: '장외 시간',
};

const TRAIT_LABELS: Record<StockTrait, string> = {
  stable: '안정형',
  'news-sensitive': '뉴스 민감',
  'ai-favorite': 'AI 선호',
  speculative: '투기형',
  defensive: '방어형',
  'theme-heavy': '테마 강함',
  'trend-heavy': '추세 강함',
  'volume-spike': '거래량 급증',
  'rumor-prone': '루머 민감',
};

function toKrw(value: number) {
  return value * KRW_EXCHANGE_RATE;
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(toKrw(value)));
}

export function formatPrice(value: number) {
  return currencyFormatter.format(Math.round(toKrw(value)));
}

export function formatInteger(value: number) {
  return integerFormatter.format(Math.round(value));
}

export function formatCompactNumber(value: number) {
  return compactFormatter.format(Math.round(value));
}

export function formatPercent(value: number, digits = 2) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}%`;
}

export function formatSignedNumber(value: number, digits = 0) {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}`;
}

export function getSectorLabel(sector: Sector) {
  return SECTOR_LABELS[sector] ?? sector;
}

export function getMarketMoodLabel(mood: number) {
  return MARKET_MOOD_LABELS.find((entry) => mood >= entry.min)?.label ?? '중립 균형';
}

export function getMoodTone(mood: number) {
  if (mood >= 0.2) return 'positive';
  if (mood <= -0.2) return 'negative';
  return 'neutral';
}

export function getMarketRegimeLabel(regime: MarketRegime) {
  return MARKET_REGIME_LABELS[regime];
}

export function getMarketRegimeDescription(regime: MarketRegime) {
  return MARKET_REGIME_DESCRIPTIONS[regime] ?? '시장이 다음 흐름을 찾는 중입니다.';
}

export function getArchetypeLabel(archetype: AiArchetype) {
  return ARCHETYPE_LABELS[archetype] ?? archetype;
}

export function getStockArchetypeLabel(archetype: StockArchetype) {
  return STOCK_ARCHETYPE_LABELS[archetype] ?? archetype;
}

export function getStockStatusLabel(status: StockStatus) {
  return STOCK_STATUS_LABELS[status] ?? status;
}

export function getLimitStateLabel(limitState: StockLimitState) {
  return LIMIT_STATE_LABELS[limitState] ?? limitState;
}

export function getDayPhaseLabel(phase: DayPhase) {
  return DAY_PHASE_LABELS[phase] ?? phase;
}

export function getTraitLabel(trait: StockTrait) {
  return TRAIT_LABELS[trait] ?? trait;
}

export function formatClock(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

export function formatSeoulMarketClock(timestamp: number | null) {
  if (!timestamp) {
    return '서울 --:--:--';
  }

  return `서울 ${formatClock(timestamp)}`;
}

export function formatRelativeTime(timestamp: number | null) {
  if (!timestamp) {
    return '기록 없음';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 6) {
    return '방금 전';
  }

  if (diffSeconds < 60) {
    return `${diffSeconds}초 전`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes}분 전`;
  }

  return new Date(timestamp).toLocaleString('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatMarketClock(totalMinutes: number) {
  const normalized = ((Math.floor(totalMinutes) % 1_440) + 1_440) % 1_440;
  const day = Math.floor(totalMinutes / 1_440) + 1;
  const hours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const minutes = (normalized % 60).toString().padStart(2, '0');

  return `${day}일차 ${hours}:${minutes}`;
}

function hasFinalConsonant(value: string) {
  const trimmed = value.trim();
  const lastCharacter = trimmed.at(-1);

  if (!lastCharacter) {
    return false;
  }

  const codePoint = lastCharacter.charCodeAt(0);

  if (codePoint < 0xac00 || codePoint > 0xd7a3) {
    return false;
  }

  return (codePoint - 0xac00) % 28 !== 0;
}

export function withSubjectParticle(value: string) {
  return `${value}${hasFinalConsonant(value) ? '이' : '가'}`;
}
