const UNITS = [
  { value: 1_000_000_000_000, label: 'T' },
  { value: 1_000_000_000, label: 'B' },
  { value: 1_000_000, label: 'M' },
  { value: 1_000, label: 'K' },
];

export function formatNumber(value: number, compact = true, digits = 1) {
  if (!Number.isFinite(value)) return '0';
  if (!compact) return Math.round(value).toLocaleString('ko-KR');
  const abs = Math.abs(value);
  for (const unit of UNITS) {
    if (abs >= unit.value) {
      const next = value / unit.value;
      const precision = Math.abs(next) >= 100 ? 0 : digits;
      return `${next.toFixed(precision)}${unit.label}`;
    }
  }
  if (abs >= 100) return Math.round(value).toLocaleString('ko-KR');
  if (abs >= 10) return value.toFixed(1);
  return value.toFixed(2);
}

export function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function randomBetween(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export function pickWeighted<T extends string>(table: Record<T, number>): T {
  const entries = Object.entries(table) as Array<[T, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  let roll = Math.random() * total;
  for (const [id, weight] of entries) {
    roll -= Math.max(0, weight);
    if (roll <= 0) return id;
  }
  return entries[entries.length - 1][0];
}

export function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

export function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

