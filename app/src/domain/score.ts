import type { Mode } from './types.js';

export interface ScoreState {
  readonly score: number;
  readonly perfectChain: number;
  readonly perfectCount: number;
}

export interface PlacementScoreInput {
  readonly perfect: boolean;
  readonly stable: boolean;
  readonly chainBefore: number;
}

export interface PlacementScoreResult {
  readonly points: number;
  readonly perfectChain: number;
  readonly perfectCountDelta: number;
}

/**
 * Base points: 10 for a stable placement.
 * Perfect: +5 + 2*min(chain-1, 5) where chain is the new chain length.
 * Chain values: 1->15, 2->17, 3->19, 4->21, 5->23, 6+->25 total.
 */
export function perfectPoints(chainLength: number): number {
  if (!Number.isInteger(chainLength) || chainLength < 1) {
    throw new RangeError(
      `perfectPoints expects a positive integer chain, received ${String(chainLength)}`
    );
  }
  return 10 + 5 + 2 * Math.min(chainLength - 1, 5);
}

export function scorePlacement(input: PlacementScoreInput): PlacementScoreResult {
  const { perfect, stable, chainBefore } = input;
  if (!Number.isInteger(chainBefore) || chainBefore < 0) {
    throw new RangeError(
      `chainBefore must be a nonnegative integer, received ${String(chainBefore)}`
    );
  }

  if (!stable) {
    return Object.freeze({ points: 0, perfectChain: chainBefore, perfectCountDelta: 0 });
  }

  if (perfect) {
    const nextChain = chainBefore + 1;
    return Object.freeze({
      points: perfectPoints(nextChain),
      perfectChain: nextChain,
      perfectCountDelta: 1
    });
  }

  return Object.freeze({ points: 10, perfectChain: 0, perfectCountDelta: 0 });
}

export function applyScore(state: ScoreState, input: PlacementScoreInput): {
  readonly score: number;
  readonly perfectChain: number;
  readonly perfectCount: number;
  readonly points: number;
} {
  const result = scorePlacement(input);
  return Object.freeze({
    score: state.score + result.points,
    perfectChain: result.perfectChain,
    perfectCount: state.perfectCount + result.perfectCountDelta,
    points: result.points
  });
}

/** Record namespace helper: mode and balance versions are never merged. */
export function recordNamespace(mode: Mode, balanceVersion: number): string {
  return `${mode}@${balanceVersion}`;
}
