import type { BalanceConfig } from './types.js';

/**
 * Balance v1, exactly as specified in design/02-gameplay-rules.md.
 * H is derived once from W / 1.55; never use a rounded 1.68 in simulation.
 */
export const BALANCE_V1: BalanceConfig = Object.freeze({
  version: 1,
  dt: 1 / 60,
  width: 2.6,
  height: 2.6 / 1.55,
  mass: 1,
  floorWidth: 4.4,
  amplitude: 3.2,
  spawnGap: 2.6,
  gravity: 24,
  periodStart: 5.2,
  periodMin: 3.2,
  periodDecay: 0.04,
  minOverlapRatio: 0.45,
  comInsetRatio: 0.04,
  perfectRatio: 0.12,
  snapRatio: 0.08,
  assistStepRatio: 0.1,
  spawnCueTicks: 9,
  settleTicks: 14,
  collapseTicks: 72,
  reducedCollapseTicks: 12,
  epsilon: 1e-9
});

/** COM safety inset M at each contact edge. */
export function comInset(config: BalanceConfig = BALANCE_V1): number {
  return config.comInsetRatio * config.width;
}

/** Minimum local overlap needed to attempt a landing. */
export function minOverlap(config: BalanceConfig = BALANCE_V1): number {
  return config.minOverlapRatio * config.width;
}

/** Perfect grade tolerance on the pre-snap offset. */
export function perfectTolerance(config: BalanceConfig = BALANCE_V1): number {
  return config.perfectRatio * config.width;
}

/** Snap-to-support-center tolerance on the pre-snap offset. */
export function snapTolerance(config: BalanceConfig = BALANCE_V1): number {
  return config.snapRatio * config.width;
}

/** Assist mode nudge distance. */
export function assistStep(config: BalanceConfig = BALANCE_V1): number {
  return config.assistStepRatio * config.width;
}

/**
 * Classic period for the next placement. n is 1-based and equals
 * settled height + 1. The period never drops below periodMin.
 */
export function periodFor(n: number, config: BalanceConfig = BALANCE_V1): number {
  if (!Number.isInteger(n) || n < 1) {
    throw new RangeError(`periodFor expects a positive integer n, received ${String(n)}`);
  }
  return Math.max(config.periodMin, config.periodStart - config.periodDecay * (n - 1));
}

/** Collapse presentation duration in ticks for the selected motion setting. */
export function collapseTicks(
  reducedMotion: boolean,
  config: BalanceConfig = BALANCE_V1
): number {
  return reducedMotion ? config.reducedCollapseTicks : config.collapseTicks;
}

/** Support center for candidate k (1-based): floor center 0 or top settled cat. */
export function supportCenterX(cats: readonly { readonly x: number }[]): number {
  if (cats.length === 0) return 0;
  const top = cats[cats.length - 1];
  if (top === undefined) return 0;
  return top.x;
}

/**
 * Spawn bottom for the next candidate: support top (cats.length * H) plus G.
 * The cat position is its bottom-center.
 */
export function spawnBottom(catsLength: number, config: BalanceConfig = BALANCE_V1): number {
  if (!Number.isInteger(catsLength) || catsLength < 0) {
    throw new RangeError(`spawnBottom expects a nonnegative integer, received ${String(catsLength)}`);
  }
  return catsLength * config.height + config.spawnGap;
}

/** Support top for candidate k where k = catsLength + 1. */
export function supportTop(catsLength: number, config: BalanceConfig = BALANCE_V1): number {
  if (!Number.isInteger(catsLength) || catsLength < 0) {
    throw new RangeError(`supportTop expects a nonnegative integer, received ${String(catsLength)}`);
  }
  return catsLength * config.height;
}

/** Height H of the next settled cat at the given number of settled cats. */
export function settledBottom(catsLength: number, config: BalanceConfig = BALANCE_V1): number {
  return supportTop(catsLength, config);
}
