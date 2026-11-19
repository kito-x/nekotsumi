/**
 * Seeded xorshift32 stream (unsigned 32-bit).
 *
 * Domain randomness is limited to choosing the spawn travel edge. Presentation
 * must not consume this stream; it derives its own seed from event IDs.
 */

/** xorshift32 cannot advance from state 0. Seed 0 maps to this constant. */
export const ZERO_SEED_FALLBACK = 0x6d2b79f5;

/** Coerces a finite integer seed to uint32; 0 becomes ZERO_SEED_FALLBACK. */
export function normalizeSeed(seed: number): number {
  if (!Number.isInteger(seed)) {
    throw new TypeError(`seed must be an integer, received ${String(seed)}`);
  }
  const unsigned = seed >>> 0;
  return unsigned === 0 ? ZERO_SEED_FALLBACK : unsigned;
}

/** One xorshift32 step: x ^= x << 13; x ^= x >>> 17; x ^= x << 5. */
export function nextRngState(state: number): number {
  let x = state >>> 0;
  if (x === 0) x = ZERO_SEED_FALLBACK;
  x = (x ^ (x << 13)) >>> 0;
  x = (x ^ (x >>> 17)) >>> 0;
  x = (x ^ (x << 5)) >>> 0;
  return x >>> 0;
}

/** Low bit selects the side: 1 = right (+A), 0 = left (-A). */
export function sideFromRngState(state: number): -1 | 1 {
  return (state & 1) === 1 ? 1 : -1;
}

export interface SpawnSideStep {
  readonly state: number;
  readonly side: -1 | 1;
}

export function nextSpawnSide(state: number): SpawnSideStep {
  const next = nextRngState(state);
  return Object.freeze({ state: next, side: sideFromRngState(next) });
}
