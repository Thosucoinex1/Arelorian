
// A simple string hashing function to create a numeric seed
export const createId = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

// A simple linear congruential generator (LCG)
const lcg = (seed: number) => () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;

export class SeededRandom {
  private random: () => number;

  constructor(seed: string) {
    const numericSeed = createId(seed);
    this.random = lcg(numericSeed);
  }

  // Get a random float between 0 (inclusive) and 1 (exclusive)
  get(): number {
    return this.random();
  }

  // Get a random integer between min (inclusive) and max (exclusive)
  getInt(min: number, max: number): number {
    return Math.floor(this.get() * (max - min)) + min;
  }

  // Get a random element from an array
  getChoice<T>(arr: T[]): T {
    return arr[this.getInt(0, arr.length)];
  }
}
