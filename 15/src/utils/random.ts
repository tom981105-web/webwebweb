export function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickMany<T>(items: readonly T[], count: number) {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(index, 1)[0]!);
  }
  return result;
}

export function pickOne<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)];
}
