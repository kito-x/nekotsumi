import assert from 'node:assert/strict';
import test from 'node:test';
import { BALANCE_V1, assistStep } from '../src/domain/balance.js';
import { CatTowerEngine } from '../src/domain/engine.js';
import { nextSpawnSide, normalizeSeed } from '../src/domain/rng.js';
import type { StartRound } from '../src/domain/types.js';
import {
  H,
  advanceToNextAim,
  aim,
  drain,
  enqueueDrop,
  eventsOfType,
  failByMiss,
  makeEngine,
  nudgeTimes,
  nudgeToOffset,
  place,
  tickN,
  tickUntil
} from './helpers.js';

const STEP = assistStep(BALANCE_V1);

function startOptions(overrides: Partial<StartRound> = {}): StartRound {
  return {
    runId: 'run-test',
    seed: 123456789,
    mode: 'assist',
    skinId: 'default',
    reducedMotion: false,
    ...overrides
  };
}

test('start creates one incoming cat in SPAWN_CUE at a seeded edge', () => {
  const engine = makeEngine({ mode: 'classic', seed: 1 });
  const state = engine.snapshot();

  assert.equal(state.phase, 'SPAWN_CUE');
  assert.equal(state.tick, 0);
  assert.equal(state.phaseTicks, 0);
  assert.equal(state.spawnId, 1);
  assert.equal(state.score, 0);
  assert.equal(state.perfectChain, 0);
  assert.equal(state.perfectCount, 0);
  assert.equal(state.safety, 1);
  assert.equal(state.cats.length, 0);
  assert.equal(state.balanceVersion, 1);
  assert.ok(state.incoming !== undefined);
  assert.equal(state.incoming.spawnId, 1);
  assert.equal(state.incoming.bottom, BALANCE_V1.spawnGap);
  assert.equal(Math.abs(state.incoming.x), BALANCE_V1.amplitude);

  const events = drain(engine);
  const spawned = eventsOfType(events, 'spawned');
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0]?.ordinal, 1);
});

test('spawn side and state come from the seeded xorshift stream', () => {
  for (const seed of [1, 2, 123456789]) {
    const engine = makeEngine({ seed, mode: 'classic' });
    const state = engine.snapshot();
    const expected = nextSpawnSide(normalizeSeed(seed));
    assert.equal(state.rngState, expected.state);
    assert.equal(state.incoming?.x, expected.side * BALANCE_V1.amplitude);
  }
  const engine = makeEngine({ seed: 0, mode: 'classic' });
  assert.equal(engine.snapshot().seed, normalizeSeed(0));
});

test('cue gate: drop at cue tick 8 is ignored, drop after tick 9 releases once', () => {
  const engine = makeEngine({ mode: 'classic' });
  tickN(engine, 8);
  assert.equal(engine.snapshot().phaseTicks, 8);
  assert.equal(engine.snapshot().phase, 'SPAWN_CUE');

  enqueueDrop(engine);
  engine.tick();
  assert.equal(engine.snapshot().phase, 'AIMING');
  assert.equal(engine.snapshot().phaseTicks, 0);
  assert.equal(eventsOfType(drain(engine), 'released').length, 0);

  enqueueDrop(engine);
  engine.tick();
  assert.equal(engine.snapshot().phase, 'FALLING');
  const released = eventsOfType(drain(engine), 'released');
  assert.equal(released.length, 1);
});

test('duplicate drops coalesce and only one release is emitted', () => {
  const engine = makeEngine();
  aim(engine);
  const state = engine.snapshot();
  const spawnId = state.incoming?.spawnId ?? 0;
  engine.enqueue({ type: 'drop', runId: state.runId, spawnId });
  engine.enqueue({ type: 'drop', runId: state.runId, spawnId });
  engine.tick();

  assert.equal(engine.snapshot().phase, 'FALLING');
  assert.equal(eventsOfType(drain(engine), 'released').length, 1);
});

test('drop and nudge from an old spawn generation are ignored', () => {  const engine = makeEngine();
  const first = place(engine, 0).state;
  assert.equal(first.cats.length, 1);
  advanceToNextAim(engine);
  const second = engine.snapshot();
  assert.equal(second.spawnId, 2);
  assert.equal(second.phase, 'AIMING');
  assert.equal(second.incoming?.bottom, H + BALANCE_V1.spawnGap);

  const old = drain(engine);
  engine.enqueue({ type: 'drop', runId: second.runId, spawnId: 1 });
  engine.enqueue({ type: 'nudge', runId: second.runId, spawnId: 1, direction: -1 });
  engine.tick();
  assert.equal(engine.snapshot().phase, 'AIMING');
  assert.equal(eventsOfType(drain(engine), 'released').length, 0);
  assert.ok(old !== undefined);

  enqueueDrop(engine);
  engine.tick();
  assert.equal(engine.snapshot().phase, 'FALLING');
  assert.equal(eventsOfType(drain(engine), 'released').length, 1);
});

test('drops outside AIMING are ignored and never buffered for the next cat', () => {
  const engine = makeEngine();
  aim(engine);
  const spawn1 = engine.snapshot().incoming?.spawnId ?? 0;

  // The pause clears the queued drop; resume must not replay it.
  enqueueDrop(engine);
  engine.control({ type: 'pause', reason: 'user' });
  engine.control({ type: 'resume' });
  engine.tick();
  assert.equal(engine.snapshot().phase, 'AIMING');
  assert.equal(eventsOfType(drain(engine), 'released').length, 0);

  nudgeToOffset(engine, 0);
  enqueueDrop(engine);
  engine.tick();
  tickUntil(engine, (state) => state.phase === 'SETTLING', 100);
  drain(engine);

  // Old drop during SETTLING is consumed without effect.
  engine.enqueue({ type: 'drop', runId: engine.snapshot().runId, spawnId: spawn1 });
  engine.tick();
  assert.equal(engine.snapshot().phase, 'SETTLING');
  assert.equal(eventsOfType(drain(engine), 'released').length, 0);

  const nextAim = advanceToNextAim(engine);
  assert.equal(nextAim.spawnId, 2);
  assert.equal(eventsOfType(drain(engine), 'released').length, 0, 'no buffered drop');

  failByMiss(engine);
  const spawn2 = engine.snapshot().spawnId;
  drain(engine);
  engine.enqueue({ type: 'drop', runId: engine.snapshot().runId, spawnId: spawn2 });
  engine.tick();
  assert.equal(engine.snapshot().phase, 'COLLAPSING');
  assert.equal(eventsOfType(drain(engine), 'released').length, 0);

  tickUntil(engine, (state) => state.phase === 'RESULTS', 200);
  const atResults = engine.snapshot();
  drain(engine);
  engine.enqueue({ type: 'drop', runId: atResults.runId, spawnId: spawn2 });
  engine.tick();
  assert.equal(engine.snapshot().phase, 'RESULTS');
  assert.equal(engine.snapshot().tick, atResults.tick);
  assert.equal(eventsOfType(drain(engine), 'released').length, 0);
});

test('assist nudges move and clamp; classic and falling nudges are ignored', () => {
  const assist = makeEngine();
  aim(assist);
  const before = assist.snapshot().incoming?.x ?? 0;
  const inward: -1 | 1 = before > 0 ? -1 : 1;
  nudgeTimes(assist, 1, inward);
  assert.ok(Math.abs((assist.snapshot().incoming?.x ?? 0) - (before + inward * STEP)) < 1e-12);

  const outward: -1 | 1 = before > 0 ? 1 : -1;
  nudgeTimes(assist, 3, outward);
  assert.equal(Math.abs(assist.snapshot().incoming?.x ?? 0), BALANCE_V1.amplitude);

  const classic = makeEngine({ mode: 'classic' });
  const classicControl = makeEngine({ mode: 'classic' });
  aim(classic);
  aim(classicControl);
  const classicInward: -1 | 1 = (classic.snapshot().incoming?.x ?? 0) > 0 ? -1 : 1;
  nudgeTimes(classic, 2, classicInward);
  tickN(classicControl, 1);
  assert.equal(classic.snapshot().incoming?.x, classicControl.snapshot().incoming?.x);

  const falling = makeEngine();
  aim(falling);
  enqueueDrop(falling);
  falling.tick();
  const fallingX = falling.snapshot().incoming?.x ?? 0;
  nudgeTimes(falling, 3, -1);
  assert.equal(falling.snapshot().incoming?.x, fallingX);
});

test('F11 fixed-step fall crosses the support plane on step 28, not 27', () => {
  const engine = makeEngine();
  aim(engine);
  const offset = nudgeToOffset(engine, 0);
  assert.ok(Math.abs(Math.abs(offset) - 0.08) < 1e-9);

  enqueueDrop(engine);
  engine.tick(); // step 1 in the release tick
  tickN(engine, 26); // 27 integration steps total
  let state = engine.snapshot();
  assert.equal(state.phase, 'FALLING');
  assert.ok((state.incoming?.bottom ?? -1) > 0);
  assert.ok(Math.abs((state.incoming?.bottom ?? 0) - 0.08) < 1e-9);

  engine.tick(); // step 28
  state = engine.snapshot();
  assert.equal(state.phase, 'SETTLING');
  assert.equal(state.cats.length, 1);
  assert.equal(state.incoming, undefined);
  assert.equal(state.cats[0]?.bottom, 0);
});

test('centered landing snaps, scores 15 once and publishes grade/safety', () => {
  const engine = makeEngine();
  const result = place(engine, 0);
  assert.equal(result.state.phase, 'SETTLING');
  assert.equal(result.state.score, 15);
  assert.equal(result.state.perfectChain, 1);
  assert.equal(result.state.perfectCount, 1);
  assert.equal(result.state.safety, 1);
  assert.equal(result.state.weakestJoint, 1);
  assert.equal(result.state.cats.length, 1);
  assert.equal(result.state.cats[0]?.x, 0, 'snap uses the support center');
  assert.equal(engine.snapshot().score, 15);

  const events = drain(engine);
  const committed = eventsOfType(events, 'placementCommitted');
  assert.equal(committed.length, 1);
  const released = eventsOfType(events, 'released');
  assert.equal(released.length, 1);
  assert.equal(released[0]?.x, 0, 'snapped release x is used for the fall');
  assert.ok(Math.abs((released[0]?.offset ?? 0) - result.offset) < 1e-12);
  const event = committed[0];
  assert.ok(event !== undefined);
  assert.equal(event.ordinal, 1);
  assert.equal(event.grade, 'perfect');
  assert.equal(event.points, 15);
  assert.equal(event.totalScore, 15);
  assert.equal(event.perfectCount, 1);
  assert.equal(event.perfectChain, 1);
  assert.equal(event.weakestJoint, 1);
  assert.equal(event.mode, 'assist');
  assert.equal(event.balanceVersion, 1);
});

test('F8 chain and ordinary reset through the engine: 15, 32, 51, 61, 76', () => {
  const engine = makeEngine({ seed: 99 });
  const expectedScores = [15, 32, 51, 61, 76];
  const heights = [1, 2, 3, 4, 5];

  for (const [index, expected] of expectedScores.entries()) {
    const target = index === 3 ? 0.34 : 0;
    const placed = place(engine, target).state;
    assert.equal(placed.score, expected, `placement ${index + 1}`);
    assert.equal(placed.cats.length, heights[index]);
    if (index < 3) {
      assert.equal(placed.perfectChain, index + 1);
    } else if (index === 3) {
      assert.equal(placed.perfectChain, 0, 'ordinary placement resets the chain');
    } else {
      assert.equal(placed.perfectChain, 1);
    }
    if (index < expectedScores.length - 1) advanceToNextAim(engine);
  }

  const final = engine.snapshot();
  assert.equal(final.score, 76);
  assert.equal(final.perfectCount, 4);
  assert.equal(final.cats.length, 5);
});

test('F4/F7 engine failures classify newest-COM vs top-only miss', () => {
  const unstable = makeEngine({ seed: 7 });
  place(unstable, 0);
  advanceToNextAim(unstable);
  aim(unstable);
  const offset = nudgeToOffset(unstable, 1.38);
  assert.ok(Math.abs(Math.abs(offset) - 1.38) < 1e-9);
  enqueueDrop(unstable);
  unstable.tick();
  tickUntil(unstable, (state) => state.phase === 'COLLAPSING', 100);
  let state = unstable.snapshot();
  assert.equal(state.phase, 'COLLAPSING');
  assert.equal(state.failure?.reason, 'UNSTABLE_TOWER');
  assert.equal(state.failure?.joint, 2);
  assert.equal(state.cats.length, 1, 'failed candidate is not awarded');
  assert.equal(state.score, 15);

  const miss = makeEngine({ seed: 7 });
  aim(miss);
  enqueueDrop(miss);
  miss.tick();
  tickUntil(miss, (s) => s.phase === 'COLLAPSING', 100);
  state = miss.snapshot();
  assert.equal(state.failure?.reason, 'MISS_TOP');
  assert.equal(state.failure?.joint, 1);
  assert.equal(state.cats.length, 0);
});

test('a miss after a perfect keeps score, height and chain but awards nothing', () => {
  const engine = makeEngine();
  const landed = place(engine, 0).state;
  assert.equal(landed.score, 15);
  assert.equal(landed.perfectChain, 1);
  advanceToNextAim(engine);

  failByMiss(engine);
  const failed = engine.snapshot();
  assert.equal(failed.score, 15);
  assert.equal(failed.cats.length, 1);
  assert.equal(failed.perfectChain, 1);
  assert.equal(failed.perfectCount, 1);
  assert.equal(failed.safety, 1, 'last committed tower safety is retained');
  assert.equal(failed.weakestJoint, 1);
  assert.equal(failed.failure?.reason, 'MISS_TOP');

  tickUntil(engine, (state) => state.phase === 'RESULTS', 100);
  assert.equal(engine.snapshot().score, 15);
  assert.equal(engine.snapshot().cats.length, 1);
});

test('pause freezes exact state in every live phase and resumes it', async (t) => {
  await t.test('SPAWN_CUE', () => {
    const engine = makeEngine({ mode: 'classic' });
    tickN(engine, 4);
    const before = engine.snapshot();
    engine.control({ type: 'pause', reason: 'user' });
    const paused = engine.snapshot();
    assert.equal(paused.phase, 'PAUSED');
    assert.equal(paused.pauseReason, 'user');
    assert.deepEqual(paused.resume, { phase: 'SPAWN_CUE', phaseTicks: 4 });
    assert.equal(paused.tick, before.tick);
    assert.equal(paused.incoming?.x, before.incoming?.x);

    tickN(engine, 600);
    const frozen = engine.snapshot();
    assert.equal(frozen.tick, before.tick);
    assert.equal(frozen.phaseTicks, 4);
    assert.equal(frozen.incoming?.x, before.incoming?.x);
    assert.equal(frozen.incoming?.bottom, before.incoming?.bottom);

    engine.control({ type: 'resume' });
    assert.equal(engine.snapshot().phase, 'SPAWN_CUE');
    assert.equal(engine.snapshot().phaseTicks, 4);
    engine.tick();
    assert.equal(engine.snapshot().phaseTicks, 5);
  });

  await t.test('AIMING', () => {
    const engine = makeEngine({ mode: 'classic' });
    aim(engine);
    tickN(engine, 3);
    const before = engine.snapshot();
    engine.control({ type: 'pause', reason: 'hidden' });
    tickN(engine, 600);
    assert.equal(engine.snapshot().tick, before.tick);
    assert.equal(engine.snapshot().incoming?.x, before.incoming?.x);
    engine.control({ type: 'resume' });
    assert.equal(engine.snapshot().phase, 'AIMING');
    engine.tick();
    assert.notEqual(engine.snapshot().incoming?.x, before.incoming?.x);
  });

  await t.test('FALLING', () => {
    const engine = makeEngine();
    aim(engine);
    nudgeToOffset(engine, 0);
    enqueueDrop(engine);
    engine.tick();
    tickN(engine, 5);
    const before = engine.snapshot();
    engine.control({ type: 'pause', reason: 'blur' });
    tickN(engine, 600);
    assert.equal(engine.snapshot().tick, before.tick);
    assert.equal(engine.snapshot().incoming?.bottom, before.incoming?.bottom);
    assert.equal(engine.snapshot().incoming?.vy, before.incoming?.vy);
    engine.control({ type: 'resume' });
    assert.equal(engine.snapshot().phase, 'FALLING');
    engine.tick();
    assert.ok((engine.snapshot().incoming?.vy ?? 0) < (before.incoming?.vy ?? 0));
  });

  await t.test('SETTLING', () => {
    const engine = makeEngine();
    place(engine, 0);
    tickN(engine, 3);
    const before = engine.snapshot();
    assert.equal(before.phaseTicks, 3);
    engine.control({ type: 'pause', reason: 'resize' });
    tickN(engine, 600);
    assert.equal(engine.snapshot().tick, before.tick);
    assert.equal(engine.snapshot().phaseTicks, 3);
    engine.control({ type: 'resume' });
    assert.equal(engine.snapshot().phase, 'SETTLING');
    engine.tick();
    assert.equal(engine.snapshot().phaseTicks, 4);
  });

  await t.test('COLLAPSING', () => {
    const engine = makeEngine();
    failByMiss(engine);
    tickN(engine, 5);
    const before = engine.snapshot();
    assert.equal(before.phaseTicks, 5);
    engine.control({ type: 'pause', reason: 'interrupted' });
    tickN(engine, 600);
    assert.equal(engine.snapshot().tick, before.tick);
    assert.equal(engine.snapshot().phaseTicks, 5);
    engine.control({ type: 'resume' });
    assert.equal(engine.snapshot().phase, 'COLLAPSING');
    engine.tick();
    assert.equal(engine.snapshot().phaseTicks, 6);
  });
});

test('repeated pause does not overwrite the stored resume point', () => {
  const engine = makeEngine({ mode: 'classic' });
  tickN(engine, 4);
  engine.control({ type: 'pause', reason: 'user' });
  engine.control({ type: 'pause', reason: 'hidden' });
  const paused = engine.snapshot();
  assert.equal(paused.pauseReason, 'user');
  assert.deepEqual(paused.resume, { phase: 'SPAWN_CUE', phaseTicks: 4 });

  tickN(engine, 600);
  engine.control({ type: 'resume' });
  assert.equal(engine.snapshot().phase, 'SPAWN_CUE');
  assert.equal(engine.snapshot().phaseTicks, 4);
  assert.equal(engine.snapshot().pauseReason, undefined);
});

test('F11b collapse timer is 72 ticks, reduced motion 12, results freeze', async (t) => {
  await t.test('normal motion', () => {
    const engine = makeEngine();
    failByMiss(engine);
    assert.equal(engine.snapshot().phaseTicks, 0);
    const ticks = tickUntil(engine, (state) => state.phase === 'RESULTS', 200);
    assert.equal(ticks, BALANCE_V1.collapseTicks);
    const events = drain(engine);
    assert.equal(eventsOfType(events, 'resultsReady').length, 1);

    const atResults = engine.snapshot();
    tickN(engine, 120);
    assert.equal(engine.snapshot().tick, atResults.tick);
    assert.equal(engine.snapshot().score, atResults.score);
    assert.equal(drain(engine).length, 0);
  });

  await t.test('reduced motion', () => {
    const engine = makeEngine({ reducedMotion: true });
    failByMiss(engine);
    const ticks = tickUntil(engine, (state) => state.phase === 'RESULTS', 100);
    assert.equal(ticks, BALANCE_V1.reducedCollapseTicks);
  });
});

test('skipCollapse reaches RESULTS once without awarding; paused skip is ignored', () => {
  const engine = makeEngine();
  failByMiss(engine);
  tickN(engine, 10);
  drain(engine);
  engine.control({ type: 'pause', reason: 'user' });
  engine.control({ type: 'skipCollapse' });
  assert.equal(engine.snapshot().phase, 'PAUSED');

  engine.control({ type: 'resume' });
  assert.equal(engine.snapshot().phase, 'COLLAPSING');
  const score = engine.snapshot().score;
  engine.control({ type: 'skipCollapse' });
  assert.equal(engine.snapshot().phase, 'RESULTS');
  assert.equal(engine.snapshot().score, score);

  const events = drain(engine);
  assert.equal(eventsOfType(events, 'resultsReady').length, 1);
  assert.equal(
    eventsOfType(events, 'phaseChanged').filter((event) => event.to === 'RESULTS').length,
    1
  );

  const atResults = engine.snapshot();
  engine.control({ type: 'skipCollapse' });
  tickN(engine, 100);
  assert.equal(engine.snapshot().tick, atResults.tick);
  assert.equal(engine.snapshot().phase, 'RESULTS');
  assert.equal(drain(engine).length, 0);
});

test('replay does not re-award, and Results ignores ticks', () => {
  const engine = makeEngine();
  place(engine, 0);
  advanceToNextAim(engine);
  failByMiss(engine);
  tickUntil(engine, (state) => state.phase === 'RESULTS', 200);
  const finished = engine.snapshot();
  assert.equal(finished.score, 15);
  assert.equal(finished.cats.length, 1);
  drain(engine);

  tickN(engine, 100);
  assert.equal(engine.snapshot().score, 15);
  assert.equal(engine.snapshot().tick, finished.tick);
  assert.equal(drain(engine).length, 0);

  engine.start(startOptions({ runId: 'run-replay' }));
  const restarted = engine.snapshot();
  assert.equal(restarted.runId, 'run-replay');
  assert.equal(restarted.score, 0);
  assert.equal(restarted.cats.length, 0);
  assert.equal(restarted.phase, 'SPAWN_CUE');
  assert.equal(restarted.spawnId, 1);
  const events = drain(engine);
  assert.equal(eventsOfType(events, 'spawned').length, 1);
  assert.equal(eventsOfType(events, 'placementCommitted').length, 0);
});

test('identical seeds and actions reproduce snapshots and events exactly', () => {
  const run = (): { snapshots: string[]; events: string[] } => {
    const engine = makeEngine({ seed: 424242, runId: 'run-repeat' });
    const snapshots: string[] = [];
    const events: string[] = [];
    const record = (): void => {
      snapshots.push(JSON.stringify(engine.snapshot()));
      events.push(JSON.stringify(engine.drainEvents()));
    };

    record();
    tickN(engine, BALANCE_V1.spawnCueTicks);
    record();
    nudgeToOffset(engine, 0);
    record();
    enqueueDrop(engine);
    engine.tick();
    record();
    tickUntil(engine, (state) => state.phase === 'SETTLING' || state.phase === 'COLLAPSING', 100);
    record();
    tickUntil(engine, (state) => state.phase === 'AIMING', 100);
    record();
    nudgeToOffset(engine, 0);
    enqueueDrop(engine);
    engine.tick();
    record();
    tickUntil(engine, (state) => state.phase === 'SETTLING' || state.phase === 'COLLAPSING', 100);
    record();
    return { snapshots, events };
  };

  const a = run();
  const b = run();
  assert.deepEqual(a.snapshots, b.snapshots);
  assert.deepEqual(a.events, b.events);
});

test('runId is not a physics input', () => {
  const a = makeEngine({ seed: 31337, runId: 'run-a' });
  const b = makeEngine({ seed: 31337, runId: 'run-b' });
  aim(a);
  aim(b);
  assert.equal(a.snapshot().incoming?.x, b.snapshot().incoming?.x);
  assert.equal(a.snapshot().incoming?.phi, b.snapshot().incoming?.phi);
  tickN(a, 45);
  tickN(b, 45);
  assert.equal(a.snapshot().incoming?.x, b.snapshot().incoming?.x);
  assert.equal(a.snapshot().tick, b.snapshot().tick);
});

test('gameplay RNG advances only when a new cat spawns', () => {
  const engine = makeEngine({ mode: 'classic' });
  const initial = engine.snapshot().rngState;
  tickN(engine, 100);
  assert.equal(engine.snapshot().rngState, initial, 'aim motion consumes no RNG');

  enqueueDrop(engine);
  engine.tick();
  tickN(engine, 30);
  assert.equal(engine.snapshot().phase, 'SETTLING');
  assert.equal(engine.snapshot().rngState, initial, 'fall/settle consumes no RNG');

  tickUntil(engine, (state) => state.phase === 'SPAWN_CUE', 40);
  assert.equal(engine.snapshot().spawnId, 2);
  assert.notEqual(engine.snapshot().rngState, initial, 'next spawn consumes one RNG step');
});

test('published snapshots, cats and events are immutable and stay historical', () => {
  const engine = makeEngine();
  const boot = engine.snapshot();
  assert.ok(Object.isFrozen(boot));
  assert.ok(Object.isFrozen(boot.cats));
  assert.throws(() => {
    (boot as unknown as { score: number }).score = 999;
  }, TypeError);
  assert.throws(() => {
    (boot.cats as unknown as unknown[]).push({});
  }, TypeError);

  aim(engine);
  const aimSnapshot = engine.snapshot();
  const aimX = aimSnapshot.incoming?.x ?? 0;
  const inward: -1 | 1 = aimX > 0 ? -1 : 1;
  nudgeTimes(engine, 1, inward);
  assert.equal(aimSnapshot.incoming?.x, aimX, 'old aim snapshot is unchanged');
  assert.notEqual(engine.snapshot().incoming?.x, aimX);

  place(engine, 0);
  const landed = engine.snapshot();
  assert.equal(landed.cats.length, 1);
  assert.equal(landed.score, 15);
  advanceToNextAim(engine);
  assert.equal(landed.cats.length, 1);
  assert.equal(landed.score, 15);
  assert.equal(landed.phase, 'SETTLING');

  const events = drain(engine);
  assert.ok(Object.isFrozen(events));
  assert.ok(Object.isFrozen(events[0]));
});

test('M1R event tick stamps use the pre-increment count and count RESULTS once', () => {
  const engine = makeEngine({ mode: 'assist', seed: 1 });
  const startEvents = drain(engine);
  assert.equal(eventsOfType(startEvents, 'spawned')[0]?.tick, 0);

  tickN(engine, BALANCE_V1.spawnCueTicks);
  const cueEvents = drain(engine);
  const cueChange = eventsOfType(cueEvents, 'phaseChanged')[0];
  assert.ok(cueChange !== undefined);
  assert.equal(cueChange.to, 'AIMING');
  assert.equal(cueChange.tick, 8, 'count before the 9th tick increments');
  assert.equal(engine.snapshot().tick, 9);

  enqueueDrop(engine);
  engine.tick();
  const released = eventsOfType(drain(engine), 'released')[0];
  assert.ok(released !== undefined);
  assert.equal(released.tick, 9);
  assert.equal(engine.snapshot().tick, 10);

  tickUntil(engine, (state) => state.phase === 'COLLAPSING', 100);
  const failed = engine.snapshot();
  const failureEvents = drain(engine);
  const failedEvent = eventsOfType(failureEvents, 'roundFailed')[0];
  assert.ok(failedEvent !== undefined);
  assert.equal(failedEvent.tick, failed.tick - 1);

  tickUntil(engine, (state) => state.phase === 'RESULTS', 200);
  const atResults = engine.snapshot();
  const resultEvents = drain(engine);
  const ready = eventsOfType(resultEvents, 'resultsReady')[0];
  assert.ok(ready !== undefined);
  assert.equal(ready.tick, atResults.tick - 1, 'the entering tick counts once');
  tickN(engine, 50);
  assert.equal(engine.snapshot().tick, atResults.tick);
  assert.equal(drain(engine).length, 0);
});

test('placementCommitted is emitted exactly once and drained once', () => {  const engine = makeEngine();
  place(engine, 0);
  const first = drain(engine);
  assert.equal(eventsOfType(first, 'placementCommitted').length, 1);
  const ids = new Set(first.map((event) => event.id));
  assert.equal(ids.size, first.length, 'event ids are unique');

  advanceToNextAim(engine);
  const later = drain(engine);
  assert.equal(eventsOfType(later, 'placementCommitted').length, 0);
  assert.equal(engine.snapshot().score, 15);
  assert.equal(drain(engine).length, 0);
});

test('start clears queued commands and unread events from the prior run', () => {
  const engine = makeEngine();
  aim(engine);
  enqueueDrop(engine);
  engine.start(startOptions({ runId: 'run-b', seed: 1, skinId: 'ginger' }));

  const state = engine.snapshot();
  assert.equal(state.runId, 'run-b');
  assert.equal(state.skinId, 'ginger');
  assert.equal(state.phase, 'SPAWN_CUE');
  assert.equal(state.score, 0);
  assert.equal(state.cats.length, 0);

  const events = drain(engine);
  assert.equal(eventsOfType(events, 'spawned').length, 1);
  assert.equal(eventsOfType(events, 'released').length, 0);
  tickN(engine, 20);
  assert.equal(eventsOfType(drain(engine), 'released').length, 0);
});

test('dispose stops simulation and keeps the last snapshot readable', () => {
  const engine = makeEngine();
  const before = engine.snapshot();
  engine.dispose();
  engine.tick();
  assert.equal(engine.snapshot().tick, before.tick);
  engine.enqueue({ type: 'drop', runId: before.runId, spawnId: 1 });
  assert.equal(engine.drainEvents().length, 0);
  engine.control({ type: 'pause', reason: 'user' });
  assert.equal(engine.snapshot().phase, before.phase);
});

test('start validates runId, mode, skin, reducedMotion and seed', () => {
  const engine = new CatTowerEngine();
  assert.throws(() => engine.start(startOptions({ runId: '' })), TypeError);
  assert.throws(() => engine.snapshot(), Error, 'snapshot before start');

  const badMode = { ...startOptions(), mode: 'turbo' } as unknown as StartRound;
  assert.throws(() => engine.start(badMode), RangeError);

  const badSkin = { ...startOptions(), skinId: 'zebra' } as unknown as StartRound;
  assert.throws(() => engine.start(badSkin), RangeError);

  const badReduced = { ...startOptions(), reducedMotion: 'yes' } as unknown as StartRound;
  assert.throws(() => engine.start(badReduced), TypeError);

  const badSeed = { ...startOptions(), seed: 1.5 } as unknown as StartRound;
  assert.throws(() => engine.start(badSeed), TypeError);
});

test('Classic aims continuously; Assist holds still; nudge queue is bounded', () => {
  const classic = makeEngine({ mode: 'classic', seed: 2 });
  aim(classic);
  const classicX = classic.snapshot().incoming?.x ?? 0;
  tickN(classic, 20);
  assert.notEqual(classic.snapshot().incoming?.x, classicX);

  const assist = makeEngine({ mode: 'assist', seed: 2 });
  aim(assist);
  const assistX = assist.snapshot().incoming?.x ?? 0;
  tickN(assist, 20);
  assert.equal(assist.snapshot().incoming?.x, assistX);

  const bounded = makeEngine({ mode: 'assist', seed: 2 });
  aim(bounded);
  const startX = bounded.snapshot().incoming?.x ?? 0;
  const inward: -1 | 1 = startX > 0 ? -1 : 1;
  for (let i = 0; i < 10; i += 1) {
    bounded.enqueue({ type: 'nudge', runId: bounded.snapshot().runId, spawnId: 1, direction: inward });
  }
  bounded.tick();
  const expected = startX + inward * 8 * STEP;
  assert.ok(Math.abs((bounded.snapshot().incoming?.x ?? 0) - expected) < 1e-12);
  bounded.tick();
  assert.ok(Math.abs((bounded.snapshot().incoming?.x ?? 0) - expected) < 1e-12);
});

test('skin and reduced-motion settings do not change placement physics', () => {
  const run = (skinId: 'default' | 'tuxedo' | 'calico', reducedMotion: boolean) => {
    const engine = makeEngine({ seed: 2024, skinId, reducedMotion });
    place(engine, 0);
    return engine.snapshot();
  };
  const normal = run('default', false);
  const tuxedo = run('tuxedo', false);
  const cosmetic = run('calico', true);

  assert.equal(normal.score, cosmetic.score);
  assert.equal(normal.safety, cosmetic.safety);
  assert.equal(normal.weakestJoint, cosmetic.weakestJoint);
  assert.equal(normal.cats.length, cosmetic.cats.length);
  assert.equal(normal.cats[0]?.x, cosmetic.cats[0]?.x);
  assert.equal(normal.perfectCount, cosmetic.perfectCount);
  assert.equal(normal.skinId, 'default');
  assert.equal(cosmetic.skinId, 'calico');
  assert.equal(cosmetic.cats[0]?.skinId, 'calico');
  assert.equal(tuxedo.score, normal.score);
  assert.equal(tuxedo.safety, normal.safety);
  assert.equal(tuxedo.cats[0]?.x, normal.cats[0]?.x);
  assert.equal(tuxedo.skinId, 'tuxedo');
  assert.equal(tuxedo.cats[0]?.skinId, 'tuxedo');
});
