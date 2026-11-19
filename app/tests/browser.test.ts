import assert from 'node:assert/strict';
import test from 'node:test';
import { CatTowerEngine } from '../src/domain/engine.js';
import { BALANCE_V1 } from '../src/domain/balance.js';
import { FixedStepLoop, INTERRUPTION_GAP_MS } from '../src/app/loop.js';
import { InputRouter } from '../src/app/input.js';
import { GameSession } from '../src/app/session.js';
import { validateManifest } from '../src/platform/assets.js';
import { assistPrediction, computeAssistPreview, formatOffset } from '../src/app/assist.js';
import type { GameEvent } from '../src/domain/types.js';

class FrameHarness {
  pending: FrameRequestCallback | null = null;
  nextHandle = 1;
  cancelled: number[] = [];

  request = (callback: FrameRequestCallback): number => {
    this.pending = callback;
    return this.nextHandle++;
  };

  cancel = (handle: number): void => {
    this.cancelled.push(handle);
    this.pending = null;
  };

  fire(nowMs: number): void {
    const callback = this.pending;
    this.pending = null;
    callback?.(nowMs);
  }
}

function startAssist(seed = 123): CatTowerEngine {
  const engine = new CatTowerEngine();
  engine.start({
    runId: 'input-run',
    seed,
    mode: 'assist',
    skinId: 'default',
    reducedMotion: false
  });
  for (let i = 0; i < BALANCE_V1.spawnCueTicks; i += 1) engine.tick();
  return engine;
}

test('loop caps frames at five ticks and discards backlog', () => {
  const frames = new FrameHarness();
  let ticks = 0;
  let interruptions = 0;
  const loop = new FixedStepLoop(
    {
      tick: () => { ticks += 1; },
      render: () => undefined,
      interrupted: () => { interruptions += 1; }
    },
    frames.request,
    frames.cancel
  );

  loop.start();
  frames.fire(0);
  assert.equal(ticks, 0, 'first frame establishes the clock');
  frames.fire(16.7);
  assert.equal(ticks, 1);

  frames.fire(116.7);
  assert.equal(ticks, 6, '100 ms frame runs at most five ticks');
  frames.fire(133.4);
  assert.equal(ticks, 7, 'excess backlog was discarded');

  frames.fire(133.4 + INTERRUPTION_GAP_MS + 1);
  assert.equal(interruptions, 1);
  assert.equal(ticks, 7, 'interruption does not leap simulation time');
  frames.fire(133.4 + INTERRUPTION_GAP_MS + 1 + 17);
  assert.equal(ticks, 8, 'clock restarts from the next frame');
  loop.stop();
});

test('loop clamps 30/60/120 render rates to the same simulation time', () => {
  const runAt = (frameMs: number, frameCount: number): number => {
    const frames = new FrameHarness();
    let ticks = 0;
    const loop = new FixedStepLoop(
      { tick: () => { ticks += 1; }, render: () => undefined, interrupted: () => undefined },
      frames.request,
      frames.cancel
    );
    loop.start();
    frames.fire(0);
    for (let frame = 1; frame <= frameCount; frame += 1) frames.fire(frame * frameMs);
    loop.stop();
    return ticks;
  };

  const at30 = runAt(1000 / 30, 30);
  const at60 = runAt(1000 / 60, 60);
  const at120 = runAt(1000 / 120, 120);
  assert.ok(Math.abs(at30 - 60) <= 1, `30 Hz produced ${at30} ticks`);
  assert.ok(Math.abs(at60 - 60) <= 1, `60 Hz produced ${at60} ticks`);
  assert.ok(Math.abs(at120 - 60) <= 1, `120 Hz produced ${at120} ticks`);
});

test('loop reset clears the accumulator after pause/resume', () => {
  const frames = new FrameHarness();
  let ticks = 0;
  const loop = new FixedStepLoop(
    { tick: () => { ticks += 1; }, render: () => undefined, interrupted: () => undefined },
    frames.request,
    frames.cancel
  );
  loop.start();
  frames.fire(0);
  frames.fire(20);
  assert.equal(ticks, 1);
  loop.resetClock();
  frames.fire(1000);
  assert.equal(ticks, 1, 'reset frame establishes a new clock');
  frames.fire(1017);
  assert.equal(ticks, 2);
  loop.stop();
});

test('input router drops once per generation and rejects unavailable phases', () => {
  const engine = startAssist();
  const input = new InputRouter({
    snapshot: () => engine.snapshot(),
    enqueue: (command) => engine.enqueue(command)
  });

  assert.equal(input.drop(), true);
  assert.equal(input.drop(), true, 'router captures the same generation twice');
  engine.tick();
  const released = engine.drainEvents().filter((event) => event.type === 'released');
  assert.equal(released.length, 1, 'engine coalesces duplicate drop commands');
  assert.equal(input.drop(), false, 'falling phase rejects a later drop');
  assert.equal(input.nudge(-1), false, 'nudge is not available while falling');
});

test('input router restricts nudges to Assist aiming and ignores classic', () => {
  const assist = startAssist();
  const assistInput = new InputRouter({
    snapshot: () => assist.snapshot(),
    enqueue: (command) => assist.enqueue(command)
  });
  const before = assist.snapshot().incoming?.x ?? 0;
  const inward: -1 | 1 = before > 0 ? -1 : 1;
  assert.equal(assistInput.nudge(inward), true);
  assist.tick();
  assert.ok((assist.snapshot().incoming?.x ?? 0) !== before);

  const classic = new CatTowerEngine();
  classic.start({
    runId: 'classic-run',
    seed: 5,
    mode: 'classic',
    skinId: 'default',
    reducedMotion: false
  });
  for (let i = 0; i < BALANCE_V1.spawnCueTicks; i += 1) classic.tick();
  const classicInput = new InputRouter({
    snapshot: () => classic.snapshot(),
    enqueue: (command) => classic.enqueue(command)
  });
  assert.equal(classicInput.nudge(-1), false);
});

test('session flushes old events before replacing a run and keeps one fan-out', () => {
  const engine = new CatTowerEngine();
  const batches: GameEvent[][] = [];
  let runNumber = 0;
  const session = new GameSession({
    engine,
    makeRunId: () => `session-${++runNumber}`,
    makeSeed: () => 44,
    onEvents: (events) => { batches.push([...events]); }
  });

  session.start({ mode: 'assist' });
  assert.equal(session.generation, 1);
  assert.equal(batches.length, 1);
  assert.equal(batches[0]?.filter((event) => event.type === 'spawned').length, 1);

  for (let i = 0; i < BALANCE_V1.spawnCueTicks; i += 1) session.tick();
  const beforePause = session.snapshot();
  assert.equal(beforePause.phase, 'AIMING');

  session.pause('hidden');
  const paused = session.snapshot();
  for (let i = 0; i < 100; i += 1) session.tick();
  assert.equal(session.snapshot().tick, paused.tick);
  assert.equal(session.snapshot().phase, 'PAUSED');
  session.resume();
  session.tick();
  assert.notEqual(session.snapshot().phase, 'PAUSED');

  session.start({ mode: 'classic' });
  assert.equal(session.generation, 2);
  assert.equal(session.snapshot().runId, 'session-2');
  const spawnBatches = batches.flat().filter((event) => event.type === 'spawned');
  assert.equal(spawnBatches.length, 2, 'one spawn event per replacement');
  assert.equal(
    batches.flat().filter((event) => event.type === 'released').length,
    0,
    'no stale release is replayed'
  );
});

test('session supports repeated replacement without listener/event multiplication', () => {
  const engine = new CatTowerEngine();
  const batches: GameEvent[][] = [];
  let runNumber = 0;
  const session = new GameSession({
    engine,
    makeRunId: () => `repeat-${++runNumber}`,
    makeSeed: () => 9,
    onEvents: (events) => { batches.push([...events]); }
  });

  for (let i = 0; i < 10; i += 1) {
    session.start({ mode: i % 2 === 0 ? 'classic' : 'assist' });
  }
  assert.equal(session.generation, 10);
  assert.equal(batches.length, 10, 'exactly one spawn batch per start');
  assert.equal(batches.flat().filter((event) => event.type === 'spawned').length, 10);
  assert.equal(new Set(batches.flat().map((event) => event.id)).size, batches.flat().length);
});


test('manifest validator rejects a non-finite face width fraction before loading', () => {
  assert.throws(
    () => validateManifest({
      pack: 'test',
      runtimeRoot: 'runtime/',
      faceRenderWidthBodyFraction: Number.NaN
    }),
    /faceRenderWidthBodyFraction must be finite/
  );
});


test('Assist copy uses floor wording only before the first cat', () => {
  const floorPreview = computeAssistPreview([], 3.2);
  assert.equal(floorPreview.onFloor, true);
  assert.equal(formatOffset(floorPreview.offset, true), '3.20 right of the floor center');
  assert.equal(assistPrediction(floorPreview), 'Will miss the platform');

  const centeredFloor = computeAssistPreview([], 0);
  assert.equal(formatOffset(centeredFloor.offset, true), 'Centered on the floor');
  assert.equal(assistPrediction(centeredFloor), 'Stable if dropped (steady)');

  const cat = { id: 1, x: 0, bottom: 0, skinId: 'default' as const };
  const topCatPreview = computeAssistPreview([cat], 0.08);
  assert.equal(topCatPreview.onFloor, false);
  assert.equal(formatOffset(topCatPreview.offset), '0.08 right of the top cat');
  assert.equal(assistPrediction(topCatPreview), 'Stable if dropped (steady)');

  const topCatMiss = computeAssistPreview([cat], 3.2);
  assert.equal(assistPrediction(topCatMiss), 'Will miss the top cat');
});
