export type RandomSource = () => number;

export const defaultRandom: RandomSource = Math.random;

export function randomInt(min: number, max: number, rng: RandomSource = defaultRandom): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function pickOne<T>(items: readonly T[], rng: RandomSource = defaultRandom): T {
  return items[randomInt(0, items.length - 1, rng)];
}

export function createId(prefix: string, rng: RandomSource = defaultRandom): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(rng() * 1_000_000).toString(36)}`;
}
