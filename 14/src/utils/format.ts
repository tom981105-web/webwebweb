import type { PanelTierId, SymbolId } from '@/types/game';

export function formatCompact(value: number, compact = true) {
  if (!Number.isFinite(value)) return '0';
  if (!compact) return Math.round(value).toLocaleString('ko-KR');

  const abs = Math.abs(value);
  const units = [
    { limit: 1e12, label: 'T' },
    { limit: 1e9, label: 'B' },
    { limit: 1e6, label: 'M' },
    { limit: 1e3, label: 'K' },
  ];

  for (const unit of units) {
    if (abs >= unit.limit) {
      const digits = abs >= unit.limit * 100 ? 0 : 1;
      return `${(value / unit.limit).toFixed(digits)}${unit.label}`;
    }
  }

  if (abs >= 100) return Math.round(value).toString();
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

export function formatDuration(ms: number) {
  if (ms < 1000) return '방금 전';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

export function formatTierLabel(tier: PanelTierId) {
  return {
    basic: '기본 패널',
    advanced: '고급 패널',
    rare: '희귀 패널',
    legendary: '전설 패널',
    mythic: '신화 패널',
  }[tier];
}

export function formatSymbolLabel(symbol: SymbolId) {
  return {
    coin: '코인',
    star: '별문',
    moon: '월흔',
    gem: '보석핵',
    skull: '균열흔',
    clover: '행운잎',
    crown: '왕관룬',
    relic: '유물핵',
  }[symbol];
}

export function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
