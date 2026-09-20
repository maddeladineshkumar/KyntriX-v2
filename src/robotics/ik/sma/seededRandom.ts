/**
 * Deterministic Pseudo-Random Number Generator (Mulberry32)
 * Ensures 100% reproducible execution for stochastic metaheuristics.
 */
export class SeededRandom {
  private state: number;

  constructor(seed: number = 42) {
    // 32-bit unsigned integer initialization
    this.state = (seed ^ 0x12345678) >>> 0;
    if (this.state === 0) {
      this.state = 0x6d2b79f5;
    }
  }

  /**
   * Returns a pseudo-random floating-point number in [0, 1)
   */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Returns a pseudo-random floating-point number in [min, max]
   */
  uniform(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  /**
   * Returns a pseudo-random integer in [min, max] (inclusive)
   */
  int(min: number, max: number): number {
    return Math.floor(this.uniform(min, max + 1));
  }
}
