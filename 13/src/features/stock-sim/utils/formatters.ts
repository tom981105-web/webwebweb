import type { AiArchetype, MarketRegime, StockTrait } from '@/features/stock-sim/types';

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

const priceFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const MARKET_MOOD_LABELS = [
  { min: 0.55, label: '과열 심리' },
  { min: 0.2, label: '매수 우위' },
  { min: -0.2, label: '중립 균형' },
  { min: -0.55, label: '리스크 회피' },
  { min: Number.NEGATIVE_INFINITY, label: '공포 확산' },
] as const;

const MARKET_REGIME_LABELS: Record<MarketRegime, string> = {
  accumulation: '매집 구간',
  markup: '상승 확장',
  rotation: '섹터 순환',
  distribution: '차익 실현',
  panic: '패닉 국면',
  rebound: '반등 시도',
};

const MARKET_REGIME_DESCRIPTIONS: Record<MarketRegime, string> = {
  accumulation:
    '조용한 매집이 이어지며 강한 손이 천천히 자금을 모으는 구간입니다.',
  markup:
    '상승 압력이 확산되고 주도주 중심으로 매수세가 시장을 이끄는 흐름입니다.',
  rotation:
    '섹터 사이에서 자금이 빠르게 이동하며 주도 그룹이 계속 바뀌는 흐름입니다.',
  distribution:
    '상승폭이 컸던 종목에서 차익 실현이 늘어나고 공급이 점차 많아지는 구간입니다.',
  panic:
    '위험 회피 심리가 강해지며 방어 섹터로 이동하고 자금 유입이 둔화되는 상태입니다.',
  rebound:
    '급락 이후 저가 매수세가 유입되고 단기 반등이 시도되는 구간입니다.',
};

const ARCHETYPE_LABELS: Record<AiArchetype, string> = {
  aggressive: '공격형',
  defensive: '안정형',
  scalper: '단타형',
  fearful: '패닉형',
  contrarian: '역발상형',
  'theme-chaser': '테마 추종형',
  whale: '고래형',
  'crowd-follower': '군중 추종형',
};

const TRAIT_LABELS: Record<StockTrait, string> = {
  stable: '안정형',
  'news-sensitive': '뉴스 민감',
  'ai-favorite': 'AI 선호',
  speculative: '투기형',
  defensive: '방어주',
  'theme-heavy': '테마 강함',
  'trend-heavy': '추세 강함',
  'volume-spike': '거래량 급증',
  'rumor-prone': '루머 민감',
};

function toKrw(value: number) {
  return value * KRW_EXCHANGE_RATE;
}

function getSeoulParts(timestamp: number) {
  const formatter = new Intl.DateTimeFormat('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(timestamp));

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? 0),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? 1),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? 1),
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? 0),
    second: Number(parts.find((part) => part.type === 'second')?.value ?? 0),
  };
}

export function formatCurrency(value: number) {
  return currencyFormatter.format(Math.round(toKrw(value)));
}

export function formatPrice(value: number) {
  return priceFormatter.format(Math.round(toKrw(value)));
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

export function getMarketMoodLabel(mood: number) {
  return MARKET_MOOD_LABELS.find((entry) => mood >= entry.min)?.label ?? '중립 균형';
}

export function getMoodTone(mood: number) {
  if (mood >= 0.2) {
    return 'positive';
  }

  if (mood <= -0.2) {
    return 'negative';
  }

  return 'neutral';
}

export function getMarketRegimeLabel(regime: MarketRegime) {
  return MARKET_REGIME_LABELS[regime];
}

export function getMarketRegimeDescription(regime: MarketRegime) {
  return MARKET_REGIME_DESCRIPTIONS[regime] ?? '시장이 다시 균형을 찾는 중입니다.';
}

export function getArchetypeLabel(archetype: AiArchetype) {
  return ARCHETYPE_LABELS[archetype] ?? archetype;
}

export function getTraitLabel(trait: StockTrait) {
  return TRAIT_LABELS[trait] ?? trait;
}

export function getSeoulClockMinutes(timestamp: number) {
  const parts = getSeoulParts(timestamp);
  return parts.hour * 60 + parts.minute;
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
