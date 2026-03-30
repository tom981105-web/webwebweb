import type { AggregatedChartPoint, ChartTimeframe } from '@/features/stock-sim/types';
import { SEOUL_TIME_ZONE } from '@/features/stock-sim/utils/formatters';

export const CHART_TIMEFRAME_OPTIONS: Array<{
  value: ChartTimeframe;
  label: string;
}> = [
  { value: 'tick', label: '1틱' },
  { value: '1m', label: '1분' },
  { value: '1h', label: '1시간' },
  { value: '3h', label: '3시간' },
  { value: '24h', label: '24시간' },
];

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

const TIMEFRAME_BUCKET_MS: Record<ChartTimeframe, number> = {
  tick: 0,
  '1m': MINUTE_MS,
  '1h': HOUR_MS,
  '3h': 3 * HOUR_MS,
  '24h': DAY_MS,
};

const TIMEFRAME_MAX_POINTS: Record<ChartTimeframe, number> = {
  tick: 180,
  '1m': 180,
  '1h': 120,
  '3h': 90,
  '24h': 72,
};

function formatBucketLabel(timestamp: number, timeframe: ChartTimeframe) {
  const date = new Date(timestamp);

  if (timeframe === '24h' || timeframe === '3h' || timeframe === '1h') {
    return date.toLocaleString('ko-KR', {
      timeZone: SEOUL_TIME_ZONE,
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  return date.toLocaleTimeString('ko-KR', {
    timeZone: SEOUL_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function downsampleChartData(points: AggregatedChartPoint[], maxPoints: number) {
  if (points.length <= maxPoints) {
    return points;
  }

  const result: AggregatedChartPoint[] = [points[0]];
  const middle = points.slice(1, -1);
  const bucketSize = Math.max(1, Math.ceil(middle.length / Math.max(1, maxPoints - 2)));

  for (let index = 0; index < middle.length; index += bucketSize) {
    const window = middle.slice(index, index + bucketSize);

    if (window.length === 0) {
      continue;
    }

    const emphasized = window.reduce((selected, current) => {
      const selectedRange = Math.abs(selected.high - selected.low);
      const currentRange = Math.abs(current.high - current.low);

      return currentRange > selectedRange ? current : selected;
    }, window[0]);

    result.push(emphasized);
  }

  result.push(points.at(-1)!);

  return result.slice(0, maxPoints);
}

function resolveBucketSize(timeframe: ChartTimeframe, timestamps: number[]) {
  const baseBucketMs = TIMEFRAME_BUCKET_MS[timeframe];

  if (timeframe !== '24h') {
    return baseBucketMs;
  }

  const first = timestamps[0] ?? Date.now();
  const last = timestamps.at(-1) ?? first;
  const totalSpan = Math.max(MINUTE_MS, last - first);
  const representedDays = totalSpan / DAY_MS;

  if (representedDays >= 7) {
    return DAY_MS;
  }

  if (representedDays >= 3) {
    return 6 * HOUR_MS;
  }

  if (representedDays >= 1.5) {
    return 3 * HOUR_MS;
  }

  return 2 * HOUR_MS;
}

export function aggregateChartData(
  priceHistory: number[],
  volumeHistory: number[],
  tradeCountHistory: number[],
  tickTimestamps: number[],
  timeframe: ChartTimeframe,
) {
  if (priceHistory.length === 0) {
    return [];
  }

  const historyLength = priceHistory.length;
  const normalizedTimestamps =
    tickTimestamps.length === historyLength
      ? tickTimestamps
      : Array.from({ length: historyLength }, (_, index) => {
          const last = tickTimestamps.at(-1) ?? Date.now();
          const fallbackStep = 1_000;
          return last - fallbackStep * (historyLength - 1 - index);
        });
  const bucketSize = resolveBucketSize(timeframe, normalizedTimestamps);

  if (timeframe === 'tick') {
    const tickPoints = priceHistory.map((close, index) => {
      const previous = index > 0 ? priceHistory[index - 1] : close;
      const timestamp = normalizedTimestamps[index];

      return {
        bucketStartTime: timestamp,
        label: formatBucketLabel(timestamp, timeframe),
        open: previous,
        high: Math.max(previous, close),
        low: Math.min(previous, close),
        close,
        volume: volumeHistory[index] ?? 0,
        tradeCount: tradeCountHistory[index] ?? 0,
      } satisfies AggregatedChartPoint;
    });

    return downsampleChartData(tickPoints, TIMEFRAME_MAX_POINTS[timeframe]);
  }

  const buckets = new Map<number, AggregatedChartPoint>();

  for (let index = 0; index < historyLength; index += 1) {
    const close = priceHistory[index];
    const previous = index > 0 ? priceHistory[index - 1] : close;
    const timestamp = normalizedTimestamps[index];
    const bucketStartTime = Math.floor(timestamp / bucketSize) * bucketSize;
    const existing = buckets.get(bucketStartTime);

    if (!existing) {
      buckets.set(bucketStartTime, {
        bucketStartTime,
        label: formatBucketLabel(bucketStartTime, timeframe),
        open: previous,
        high: Math.max(previous, close),
        low: Math.min(previous, close),
        close,
        volume: volumeHistory[index] ?? 0,
        tradeCount: tradeCountHistory[index] ?? 0,
      });
      continue;
    }

    existing.high = Math.max(existing.high, previous, close);
    existing.low = Math.min(existing.low, previous, close);
    existing.close = close;
    existing.volume += volumeHistory[index] ?? 0;
    existing.tradeCount += tradeCountHistory[index] ?? 0;
  }

  return downsampleChartData(
    [...buckets.values()].sort(
      (left, right) => left.bucketStartTime - right.bucketStartTime,
    ),
    TIMEFRAME_MAX_POINTS[timeframe],
  );
}
