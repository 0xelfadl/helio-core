import type { Rng } from './random.js';

export const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface TimestampOptions {
  anchorMs: number;
  spanDays: number;
  burstShare: number;
  minBurst: number;
  maxBurst: number;
}
// random past time
function randomPastTime(rng: Rng, anchorMs: number, spanMs: number): number {
    return anchorMs - Math.floor(rng() ** 2 * spanMs);
}
// genearate a created 
export function generateCreatedAtTimes(count: number, rng: Rng, options: TimestampOptions,): number[] {
    const spanMs = options.spanDays * MS_PER_DAY;
    const burstBudget = Math.round(count * options.burstShare);
    const times: number[] = [];
    // create a bursts
    while (times.length < burstBudget) {
        const size = options.minBurst + Math.floor(rng() * (options.maxBurst - options.minBurst + 1));
        const burstSize = Math.min(size, burstBudget - times.length);
        const burstTime = randomPastTime(rng, options.anchorMs, spanMs);
        for (let i = 0; i < burstSize; i++) times.push(burstTime);
    }
    // fill remaining
    while (times.length < count) {
    times.push(randomPastTime(rng, options.anchorMs, spanMs));
  }

  return times;
}
