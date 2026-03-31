export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

export function pickWeighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  if (total <= 0) return entries[0][0];
  let cursor = Math.random() * total;
  for (const [key, rawWeight] of entries) {
    const weight = Math.max(0, rawWeight);
    if (cursor <= weight) return key;
    cursor -= weight;
  }
  return entries[entries.length - 1][0];
}

export function createSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(items: T[], seed?: number) {
  const list = [...items];
  const rng = typeof seed === 'number' ? mulberry32(seed) : Math.random;
  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }
  return list;
}
