export function formatNumber(value: number, compact = false) {
  if (!compact) return Math.round(value).toLocaleString('ko-KR');
  if (Math.abs(value) < 1000) return Math.round(value).toLocaleString('ko-KR');
  if (Math.abs(value) < 1_000_000) return `${(value / 1000).toFixed(1)}k`;
  if (Math.abs(value) < 1_000_000_000) return `${(value / 1_000_000).toFixed(1)}m`;
  return `${(value / 1_000_000_000).toFixed(1)}b`;
}

export function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}초`;
  if (minutes < 60) return `${minutes}분 ${seconds}초`;
  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;
  return `${hours}시간 ${restMinutes}분`;
}

export function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
