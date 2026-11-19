import {
  BALANCE_V1,
  comInset,
  minOverlap,
  perfectTolerance,
  snapTolerance
} from './balance.js';
import type {
  BalanceConfig,
  JointCheck,
  PlacementResult,
  SettledCat
} from './types.js';

export interface PrepareDropResult {
  readonly releaseOffset: number;
  readonly finalX: number;
  readonly perfectEligible: boolean;
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number, received ${String(value)}`);
  }
}

/**
 * Resolves release-time snap and perfect eligibility exactly once.
 * Perfect is graded on the pre-snap offset; finalX is used for the whole fall.
 */
export function prepareDrop(
  incomingX: number,
  supportX: number,
  config: BalanceConfig = BALANCE_V1
): PrepareDropResult {
  assertFinite(incomingX, 'incomingX');
  assertFinite(supportX, 'supportX');

  const releaseOffset = incomingX - supportX;
  const snapDistance = snapTolerance(config) + config.epsilon;
  const finalX = Math.abs(releaseOffset) <= snapDistance ? supportX : incomingX;
  const perfectEligible =
    Math.abs(releaseOffset) <= perfectTolerance(config) + config.epsilon;

  return Object.freeze({ releaseOffset, finalX, perfectEligible });
}

interface Interval {
  readonly left: number;
  readonly right: number;
}

function catInterval(x: number, width: number): Interval {
  return { left: x - width / 2, right: x + width / 2 };
}

function floorInterval(config: BalanceConfig): Interval {
  return { left: -config.floorWidth / 2, right: config.floorWidth / 2 };
}

function intersect(a: Interval, b: Interval): Interval {
  return { left: Math.max(a.left, b.left), right: Math.min(a.right, b.right) };
}

/**
 * Pure placement evaluation for one candidate.
 *
 * Checks the local top-contact overlap, then every support contact from the
 * candidate down to the floor by accumulating the suffix load once. O(k) time,
 * O(1) extra space (joint diagnostics are only allocated with debug=true).
 */
export function evaluatePlacement(
  cats: readonly SettledCat[],
  finalX: number,
  releaseOffset: number,
  config: BalanceConfig = BALANCE_V1,
  debug = false
): PlacementResult {
  assertFinite(finalX, 'finalX');
  assertFinite(releaseOffset, 'releaseOffset');

  const width = config.width;
  const inset = comInset(config);
  const epsilon = config.epsilon;
  const candidateIndex = cats.length + 1;
  const supportX = cats.length === 0 ? 0 : cats[cats.length - 1]!.x;
  const support = cats.length === 0 ? floorInterval(config) : catInterval(supportX, width);
  const candidate = catInterval(finalX, width);
  const topContact = intersect(candidate, support);
  const overlapLength = Math.max(0, topContact.right - topContact.left);
  const overlapNeeded = minOverlap(config);

  if (overlapLength + epsilon < overlapNeeded) {
    const rawDirection = finalX - supportX;
    const direction: -1 | 1 = rawDirection < 0 ? -1 : 1;
    return Object.freeze({
      ok: false,
      reason: 'MISS_TOP',
      failureJoint: candidateIndex,
      direction,
      margin: overlapLength - overlapNeeded
    });
  }

  const joints: JointCheck[] = [];
  let massSum = 0;
  let weightedX = 0;

  let minSafety = Number.POSITIVE_INFINITY;
  let weakestJoint = candidateIndex;

  // True raw minimum, updated without EPS suppression. Any margin < -EPS fails.
  let rawMinMargin = Number.POSITIVE_INFINITY;
  let failureJoint = candidateIndex;
  let failureMargin = 0;
  let failureComX = finalX;
  let failureContactCenter = 0;
  let hasFailureCandidate = false;

  for (let j = candidateIndex; j >= 1; j -= 1) {
    const x = j === candidateIndex ? finalX : cats[j - 1]!.x;
    assertFinite(x, `cats[${j - 1}].x`);

    massSum += config.mass;
    weightedX += x * config.mass;
    const comX = weightedX / massSum;

    const below = j === 1 ? floorInterval(config) : catInterval(cats[j - 2]!.x, width);
    const joint = intersect(catInterval(x, width), below);
    const length = Math.max(0, joint.right - joint.left);
    const safeLeft = joint.left + inset;
    const safeRight = joint.right - inset;
    const margin = Math.min(comX - safeLeft, safeRight - comX);
    const halfSafeWidth = Math.max(epsilon, (length - 2 * inset) / 2);
    const normalizedSafety = Math.min(1, Math.max(0, margin / halfSafeWidth));
    const contactCenter = (joint.left + joint.right) / 2;
    const failed = margin < -epsilon;

    if (debug) {
      joints.push(
        Object.freeze({
          index: j,
          left: joint.left,
          right: joint.right,
          comX,
          margin,
          normalizedSafety
        })
      );
    }

    // Keep the exact raw minimum separate from selection tolerance. A passing
    // contact can never become the failure joint.
    if (margin < rawMinMargin) {
      rawMinMargin = margin;
      if (failed) {
        failureJoint = j;
        failureMargin = margin;
        failureComX = comX;
        failureContactCenter = contactCenter;
        hasFailureCandidate = true;
      } else {
        hasFailureCandidate = false;
      }
    } else if (failed && hasFailureCandidate && margin <= rawMinMargin + epsilon && j < failureJoint) {
      // Anchor selection to the global raw minimum, not pairwise margins.
      failureJoint = j;
      failureMargin = margin;
      failureComX = comX;
      failureContactCenter = contactCenter;
    }

    // Passing safety is the exact minimum normalized value; weakest joint is
    // the lowest index within EPS of that minimum. sj == -EPS still passes.
    if (margin >= -epsilon) {
      if (normalizedSafety < minSafety) {
        minSafety = normalizedSafety;
        weakestJoint = j;
      } else if (normalizedSafety <= minSafety + epsilon && j < weakestJoint) {
        weakestJoint = j;
      }
    }
  }

  if (rawMinMargin < -epsilon) {
    const direction: -1 | 1 = failureComX < failureContactCenter ? -1 : 1;
    return Object.freeze({
      ok: false,
      reason: 'UNSTABLE_TOWER',
      failureJoint,
      direction,
      margin: failureMargin
    });
  }

  const perfect = Math.abs(releaseOffset) <= perfectTolerance(config) + epsilon;
  const safety = Number.isFinite(minSafety) ? Math.min(1, Math.max(0, minSafety)) : 0;

  if (debug) {
    return Object.freeze({
      ok: true,
      finalX,
      perfect,
      safety,
      weakestJoint,
      joints: Object.freeze(joints)
    });
  }

  return Object.freeze({ ok: true, finalX, perfect, safety, weakestJoint });
}
