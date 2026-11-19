import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BALANCE_V1,
  assistStep,
  comInset,
  minOverlap,
  periodFor,
  snapTolerance
} from '../src/domain/balance.js';
import { evaluatePlacement, prepareDrop } from '../src/domain/placement.js';
import { nextRngState, normalizeSeed, ZERO_SEED_FALLBACK } from '../src/domain/rng.js';
import { perfectPoints, scorePlacement } from '../src/domain/score.js';
import type { ScoreState } from '../src/domain/score.js';
import type {
  PlacementFailure,
  PlacementResult,
  PlacementSuccess
} from '../src/domain/types.js';
import { H, makeCats } from './helpers.js';

const EPS = BALANCE_V1.epsilon;

function assertClose(actual: number, expected: number, message?: string, tolerance = 1e-9): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message ?? 'value'}: expected ${expected}, got ${actual} (tolerance ${tolerance})`
  );
}

function expectSuccess(result: PlacementResult): PlacementSuccess {
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error('expected a stable placement');
  return result;
}

function expectFailure(result: PlacementResult): PlacementFailure {
  assert.equal(result.ok, false);
  if (result.ok) throw new Error('expected a failed placement');
  return result;
}

test('config derives W/H and tolerances exactly from balance v1', () => {
  assert.equal(BALANCE_V1.width, 2.6);
  assert.equal(BALANCE_V1.height, 2.6 / 1.55);
  assert.ok(Math.abs(H - 1.6774193548387097) < 1e-15);
  assertClose(comInset(), 0.104);
  assertClose(minOverlap(), 1.17);
  assertClose(snapTolerance(), 0.208);
  assertClose(assistStep(), 0.26);
  assert.equal(BALANCE_V1.spawnCueTicks, 9);
  assert.equal(BALANCE_V1.settleTicks, 14);
  assert.equal(BALANCE_V1.collapseTicks, 72);
  assert.equal(BALANCE_V1.reducedCollapseTicks, 12);
});

test('rng: seed 0 uses the xorshift fallback and streams are deterministic', () => {
  assert.equal(normalizeSeed(0), ZERO_SEED_FALLBACK);
  assert.equal(normalizeSeed(0x1_0000_0001), 1);
  assert.throws(() => normalizeSeed(1.5), TypeError);
  const a = nextRngState(123456789);
  const b = nextRngState(123456789);
  assert.equal(a, b);
  assert.equal(a, 2714967881);
  assert.equal(nextRngState(1), 270369);
  assert.notEqual(a, 0);
  assert.equal(nextRngState(a), nextRngState(a));
});

test('F1 centered floor landing is stable perfect with safety 1', () => {
  const result = expectSuccess(evaluatePlacement([], 0, 0));
  assert.equal(result.perfect, true);
  assertClose(result.safety, 1);
  assert.equal(result.weakestJoint, 1);

  const prepared = prepareDrop(0, 0);
  assert.equal(prepared.releaseOffset, 0);
  assert.equal(prepared.finalX, 0);
  assert.equal(prepared.perfectEligible, true);
});

test('F2 snap boundary: 0.208 snaps, 0.208+1e-6 does not; both stay perfect', () => {
  const snapped = prepareDrop(0.208, 0);
  assert.equal(snapped.finalX, 0);
  assert.equal(snapped.perfectEligible, true);

  const notSnapped = prepareDrop(0.208 + 1e-6, 0);
  assert.notEqual(notSnapped.finalX, 0);
  assert.equal(notSnapped.perfectEligible, true);

  const a = expectSuccess(
    evaluatePlacement([], snapped.finalX, snapped.releaseOffset)
  );
  const b = expectSuccess(
    evaluatePlacement([], notSnapped.finalX, notSnapped.releaseOffset)
  );
  assert.equal(a.perfect, true);
  assert.equal(b.perfect, true);

  // EPS tolerance must not oscillate: +5e-10 snaps, +2e-9 does not.
  assert.equal(prepareDrop(0.208 + 5e-10, 0).finalX, 0);
  assert.notEqual(prepareDrop(0.208 + 2e-9, 0).finalX, 0);

  // Mirrored boundary behaves identically.
  assert.equal(prepareDrop(-0.208, 0).finalX, 0);
  assert.notEqual(prepareDrop(-0.208 - 1e-6, 0).finalX, 0);
});

test('F3 perfect boundary uses the pre-snap offset', () => {
  const cats = makeCats([0]);
  const atBoundary = prepareDrop(0.312, 0);
  assert.equal(atBoundary.finalX, 0.312, '0.312 is outside snap range');
  assert.equal(atBoundary.perfectEligible, true);

  const outside = prepareDrop(0.312 + 1e-6, 0);
  assert.equal(outside.perfectEligible, false);

  const perfect = expectSuccess(
    evaluatePlacement(cats, atBoundary.finalX, atBoundary.releaseOffset)
  );
  assert.equal(perfect.perfect, true);

  const ordinary = expectSuccess(
    evaluatePlacement(cats, outside.finalX, outside.releaseOffset)
  );
  assert.equal(ordinary.perfect, false);

  // Outside snap range stays put and is ordinary.
  const beyondSnap = prepareDrop(0.32, 0);
  assert.equal(beyondSnap.finalX, 0.32);
  assert.equal(beyondSnap.perfectEligible, false);
});

test('F4 exactly minimum overlap passes overlap but fails newest COM', () => {
  const cats = makeCats([0]);
  const atLimit = expectFailure(evaluatePlacement(cats, 1.43, 1.43));
  assert.equal(atLimit.reason, 'UNSTABLE_TOWER');
  assert.equal(atLimit.failureJoint, 2);
  assertClose(atLimit.margin, 1.196 - 1.43, 'newest COM margin');

  const belowLimit = expectFailure(evaluatePlacement(cats, 1.430001, 1.430001));
  assert.equal(belowLimit.reason, 'MISS_TOP');
  assert.equal(belowLimit.failureJoint, 2);
});

test('F5 inclusive COM boundary gives zero safety, one epsilon more fails', () => {
  const cats = makeCats([0]);
  const atLimit = expectSuccess(evaluatePlacement(cats, 1.196, 1.196));
  assert.equal(atLimit.safety, 0);
  assert.equal(atLimit.weakestJoint, 2);

  const beyond = expectFailure(evaluatePlacement(cats, 1.196 + 1e-6, 1.196 + 1e-6));
  assert.equal(beyond.reason, 'UNSTABLE_TOWER');
  assert.equal(beyond.failureJoint, 2);
  assert.ok(beyond.margin < -EPS);
});

test('F6 an older floor contact fails even when the newest contact is stable', () => {
  const cats = makeCats([1.8]);
  const result = expectFailure(evaluatePlacement(cats, 2.6, 2.6, BALANCE_V1, true));
  assert.equal(result.reason, 'UNSTABLE_TOWER');
  assert.equal(result.failureJoint, 1);
  assert.equal(result.direction, 1);
  assertClose(result.margin, -(2.2 - 2.096), 'floor COM margin');
});

test('F6b debug joints are top-down and expose both contacts', () => {
  const cats = makeCats([1.8]);
  const result = expectSuccess(evaluatePlacement(cats, 1.8, 0, BALANCE_V1, true));
  assert.ok(result.joints !== undefined);
  assert.equal(result.joints.length, 2);
  assert.equal(result.joints[0]?.index, 2);
  assert.equal(result.joints[1]?.index, 1);
  assert.ok((result.joints[0]?.margin ?? 0) > 1);
  assertClose(result.joints[1]?.margin ?? 0, 0.296, 'floor margin');
});

test('F6c a non-floor intermediate contact can be the failing joint', () => {
  // cat1 at 0, cat2 at 1.0 are stable. Candidate 1.5 passes the newest
  // (cat2) contact and the floor contact but tips the cat2/cat1 joint.
  const cats = makeCats([0, 1.0]);
  expectSuccess(evaluatePlacement(cats, 1.0, 0));
  const result = expectFailure(evaluatePlacement(cats, 1.5, 0.5, BALANCE_V1, true));
  assert.equal(result.reason, 'UNSTABLE_TOWER');
  assert.equal(result.failureJoint, 2);
  assert.ok(result.margin < 0 && result.margin > -1);
});

test('M1R supplied boundary case fails at the true lower joint, not the EPS tie', () => {
  const a = 1.498 + 0.95e-9;
  const b = a + 1.196 + 0.5e-9;
  const cats = makeCats([a]);
  const before = JSON.stringify(cats);

  const result = expectFailure(
    evaluatePlacement(cats, b, b - a, BALANCE_V1, true)
  );
  assert.equal(result.reason, 'UNSTABLE_TOWER');
  assert.equal(result.failureJoint, 1);
  assert.equal(result.direction, 1);
  assertClose(result.margin, -1.2000000992884452e-9, 'selected joint margin', 1e-15);
  assert.ok(result.margin < -BALANCE_V1.epsilon);
  assert.equal(JSON.stringify(cats), before, 'caller cats remain unchanged');

  const mirrored = expectFailure(
    evaluatePlacement(makeCats([-a]), -b, -(b - a), BALANCE_V1, true)
  );
  assert.equal(mirrored.failureJoint, 1);
  assert.equal(mirrored.direction, -1);
  assertClose(mirrored.margin, result.margin, 'mirrored margin', 1e-15);
});

test('M1R inclusive -EPS and near-threshold boundaries', () => {
  const nearPass = expectSuccess(
    evaluatePlacement([], 2.096 + 0.5e-9, 0, BALANCE_V1, true)
  );
  const passJoint = nearPass.joints?.[0];
  assert.ok(passJoint !== undefined);
  assertClose(passJoint.margin, -5.000000413701855e-10, 'near-pass margin', 1e-15);
  assert.equal(nearPass.safety, 0);
  assert.equal(nearPass.weakestJoint, 1);

  const nearFail = expectFailure(
    evaluatePlacement([], 2.096 + 1.5e-9, 0, BALANCE_V1, true)
  );
  assert.equal(nearFail.reason, 'UNSTABLE_TOWER');
  assert.equal(nearFail.failureJoint, 1);
  assert.ok(nearFail.margin < -BALANCE_V1.epsilon);

  // Exact sj == -EPS must pass: choose epsilon equal to the represented margin.
  const boundaryX = 2.096 + 0.5e-9;
  const representedMargin = 2.096 - boundaryX;
  const exactConfig = Object.freeze({
    ...BALANCE_V1,
    epsilon: Math.abs(representedMargin)
  });
  const exact = expectSuccess(
    evaluatePlacement([], boundaryX, 0, exactConfig, true)
  );
  const exactJoint = exact.joints?.[0];
  assert.ok(exactJoint !== undefined);
  assert.equal(exactJoint.margin, -exactConfig.epsilon);
  assert.equal(exact.safety, 0);
  assert.equal(exact.weakestJoint, 1);
});

test('M1R failure selection anchors to the raw minimum and lowest failing index', () => {
  const d = 1.196 + 2e-9;
  const a = 1.498 + 0.2e-9;
  const b = a + d;

  const bothFail = expectFailure(
    evaluatePlacement(makeCats([a]), b, b - a, BALANCE_V1, true)
  );
  assert.equal(bothFail.reason, 'UNSTABLE_TOWER');
  assert.equal(bothFail.failureJoint, 1, 'lowest index among failed contacts');
  assert.equal(bothFail.direction, 1);
  assertClose(bothFail.margin, -1.2000000992884452e-9, 'selected actual margin', 1e-15);

  const mirrored = expectFailure(
    evaluatePlacement(makeCats([-a]), -b, -(b - a), BALANCE_V1, true)
  );
  assert.equal(mirrored.failureJoint, 1);
  assert.equal(mirrored.direction, -1);
  assertClose(mirrored.margin, bothFail.margin, 'mirrored margin', 1e-15);

  // A passing lower joint near the failure must never win selection.
  const passingA = 1.498 - 0.5e-9;
  const passingB = passingA + d;
  const passingLower = expectFailure(
    evaluatePlacement(makeCats([passingA]), passingB, passingB - passingA, BALANCE_V1, true)
  );
  assert.equal(passingLower.failureJoint, 2);
  assert.ok(passingLower.margin < -BALANCE_V1.epsilon);

  // Deterministic selection on repeated identical calls.
  const repeat = expectFailure(
    evaluatePlacement(makeCats([a]), b, b - a, BALANCE_V1, true)
  );
  assert.deepEqual(repeat, bothFail);
});

test('M1R passing safety keeps the exact minimum with lowest-index winner', () => {
  const centered = expectSuccess(evaluatePlacement(makeCats([0]), 0, 0, BALANCE_V1, true));
  assert.equal(centered.safety, 1);
  assert.equal(centered.weakestJoint, 1);
  assert.equal(centered.joints?.[0]?.normalizedSafety, 1);
  assert.equal(centered.joints?.[1]?.normalizedSafety, 1);

  const nearZero = expectSuccess(evaluatePlacement([], 2.096 - 0.5e-9, 0, BALANCE_V1, true));
  assert.ok(nearZero.safety > 0 && nearZero.safety < 1e-9);
  assert.equal(nearZero.weakestJoint, 1);
});

test('F7 clear miss is MISS_TOP and never collides with a lower cat', () => {
  const single = expectFailure(evaluatePlacement(makeCats([0]), 3.2, 3.2));
  assert.equal(single.reason, 'MISS_TOP');

  const twoCats = expectFailure(evaluatePlacement(makeCats([0, 0]), 3.2, 3.2));
  assert.equal(twoCats.reason, 'MISS_TOP');
  assert.equal(twoCats.failureJoint, 3, 'failure refers to the attempted top contact');
});

test('F8 perfect chain scoring, ordinary reset and no award on failure', () => {
  let state: ScoreState = { score: 0, perfectChain: 0, perfectCount: 0 };

  for (const expected of [15, 32, 51]) {
    const scored = scorePlacement({ perfect: true, stable: true, chainBefore: state.perfectChain });
    state = {
      score: state.score + scored.points,
      perfectChain: scored.perfectChain,
      perfectCount: state.perfectCount + scored.perfectCountDelta
    };
    assert.equal(state.score, expected);
  }
  assert.equal(state.perfectChain, 3);
  assert.equal(state.perfectCount, 3);

  const ordinary = scorePlacement({ perfect: false, stable: true, chainBefore: state.perfectChain });
  assert.equal(ordinary.points, 10);
  assert.equal(ordinary.perfectChain, 0);
  assert.equal(ordinary.perfectCountDelta, 0);

  const nextPerfect = scorePlacement({ perfect: true, stable: true, chainBefore: 0 });
  assert.equal(nextPerfect.points, 15);

  const failed = scorePlacement({ perfect: true, stable: false, chainBefore: 3 });
  assert.equal(failed.points, 0);
  assert.equal(failed.perfectChain, 3);
  assert.equal(failed.perfectCountDelta, 0);
});

test('F9 chain cap: sixth and later perfects award 25 and six total 120', () => {
  assert.equal(perfectPoints(1), 15);
  assert.equal(perfectPoints(2), 17);
  assert.equal(perfectPoints(3), 19);
  assert.equal(perfectPoints(4), 21);
  assert.equal(perfectPoints(5), 23);
  assert.equal(perfectPoints(6), 25);
  assert.equal(perfectPoints(7), 25);
  assert.equal(perfectPoints(100), 25);

  let total = 0;
  for (let chain = 1; chain <= 6; chain += 1) total += perfectPoints(chain);
  assert.equal(total, 120);
});

test('F10 period ramp matches the configured curve', () => {
  assertClose(periodFor(1), 5.2);
  assertClose(periodFor(26), 4.2);
  assertClose(periodFor(51), 3.2);
  assertClose(periodFor(1000), 3.2);
  assertClose(periodFor(52), 3.2);
  assert.throws(() => periodFor(0), RangeError);
  assert.throws(() => periodFor(1.5), RangeError);
});

test('F12 mirror symmetry preserves result and flips failure direction', () => {
  const pass = expectSuccess(evaluatePlacement([], 0.8, 0.8));
  const mirroredPass = expectSuccess(evaluatePlacement([], -0.8, -0.8));
  assert.equal(pass.perfect, mirroredPass.perfect);
  assertClose(pass.safety, mirroredPass.safety);
  assert.equal(pass.weakestJoint, mirroredPass.weakestJoint);

  const fail = expectFailure(evaluatePlacement(makeCats([1.8]), 2.6, 2.6));
  const mirroredFail = expectFailure(evaluatePlacement(makeCats([-1.8]), -2.6, -2.6));
  assert.equal(fail.reason, mirroredFail.reason);
  assert.equal(fail.failureJoint, mirroredFail.failureJoint);
  assert.equal(fail.direction, 1);
  assert.equal(mirroredFail.direction, -1);
});

test('F12b evaluation does not mutate caller cats', () => {
  const cats = makeCats([0, 0.5, -0.25]);
  const before = JSON.stringify(cats);
  evaluatePlacement(cats, 0.4, 0.4, BALANCE_V1, true);
  assert.equal(JSON.stringify(cats), before);
  assert.ok(Object.isFrozen(cats));
});

test('F13 1000-cat tower is stable, safety 1, weakest joint 1', () => {
  const cats = makeCats(new Array<number>(1000).fill(0));
  const result = expectSuccess(evaluatePlacement(cats, 0, 0));
  assertClose(result.safety, 1);
  assert.equal(result.weakestJoint, 1);
});

test('F13b 1000-cat near-edge tower still checks lower contacts', () => {
  const cats = makeCats(new Array<number>(1000).fill(2.095));
  expectSuccess(evaluatePlacement(cats, 2.095, 0));

  const withCandidate = expectFailure(evaluatePlacement(cats, 3.2, 0.1));
  assert.equal(withCandidate.reason, 'UNSTABLE_TOWER');
  assert.equal(withCandidate.failureJoint, 1, 'floor contact fails under aggregate load');
});
