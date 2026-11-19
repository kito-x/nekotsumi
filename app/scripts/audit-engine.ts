/**
 * M4B audit: real-engine Assist fixture and tick/snapshot/drain timings.
 * This is measurement only; it does not import ProfileService or localStorage.
 *
 * Run after `npm run build:test`:
 *   node .test-build/scripts/audit-engine.js
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { cpus, platform, arch, totalmem } from 'node:os';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { CatTowerEngine } from '../src/domain/engine.js';
import { BALANCE_V1, assistStep } from '../src/domain/balance.js';
import type { GameEvent, RoundState } from '../src/domain/types.js';

const SEED = 20261116;
const TARGET_CATS = 1000;
const EXTRA_COMMITS = 100;
const IDLE_SAMPLES = 10000;
const IDLE_WARMUP = 1000;
const CENTER_TOLERANCE = 0.1;
const outDir = fileURLToPath(new URL('../../../evidence/m4b/', import.meta.url));

interface FixtureResult {
  readonly cats: number;
  readonly score: number;
  readonly perfectCount: number;
  readonly safety: number;
  readonly phase: RoundState['phase'];
  readonly placements: number;
  readonly digest: string;
  readonly constructionMs: number;
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function stats(samples: readonly number[]): {
  readonly n: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
} {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    n: sorted.length,
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    mean,
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0
  };
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function drain(engine: CatTowerEngine): readonly GameEvent[] {
  return engine.drainEvents();
}

function tickDrain(engine: CatTowerEngine): readonly GameEvent[] {
  engine.tick();
  return drain(engine);
}

function waitForAiming(engine: CatTowerEngine): void {
  for (let guard = 0; guard < 200; guard += 1) {
    const state = engine.snapshot();
    if (state.phase === 'AIMING') return;
    if (state.phase === 'RESULTS' || state.phase === 'COLLAPSING') {
      throw new Error(`fixture failed before aiming: ${state.phase}`);
    }
    tickDrain(engine);
  }
  throw new Error('timed out waiting for AIMING');
}

function centerIncoming(engine: CatTowerEngine): void {
  for (let guard = 0; guard < 100; guard += 1) {
    const state = engine.snapshot();
    const incoming = state.incoming;
    if (state.phase !== 'AIMING' || incoming === undefined) {
      throw new Error(`cannot center in phase ${state.phase}`);
    }
    if (Math.abs(incoming.x) <= CENTER_TOLERANCE) return;
    engine.enqueue({
      type: 'nudge',
      runId: state.runId,
      spawnId: incoming.spawnId,
      direction: incoming.x > 0 ? -1 : 1
    });
    tickDrain(engine);
  }
  throw new Error('timed out centering incoming cat');
}

function placeCentered(engine: CatTowerEngine, measureCommit: boolean): { commitMs: number | null; events: readonly GameEvent[] } {
  waitForAiming(engine);
  centerIncoming(engine);
  const before = engine.snapshot();
  if (before.incoming === undefined) throw new Error('no incoming cat to drop');
  engine.enqueue({
    type: 'drop',
    runId: before.runId,
    spawnId: before.incoming.spawnId
  });

  let commitMs: number | null = null;
  let commitEvents: readonly GameEvent[] = [];
  for (let guard = 0; guard < 600; guard += 1) {
    const start = performance.now();
    engine.tick();
    const state = engine.snapshot();
    const events = drain(engine);
    const elapsed = performance.now() - start;
    if (state.cats.length > before.cats.length) {
      commitMs = elapsed;
      commitEvents = events;
      break;
    }
    if (state.phase === 'RESULTS' || state.phase === 'COLLAPSING') {
      throw new Error(`fixture commit failed at ${state.phase}`);
    }
  }
  if (commitMs === null) throw new Error('commit did not occur');
  if (!measureCommit) commitMs = null;
  return { commitMs, events: commitEvents };
}

function waitForNextAiming(engine: CatTowerEngine): void {
  for (let guard = 0; guard < 300; guard += 1) {
    const state = engine.snapshot();
    if (state.phase === 'AIMING') return;
    if (state.phase === 'RESULTS' || state.phase === 'COLLAPSING') {
      throw new Error(`fixture ended after commit: ${state.phase}`);
    }
    tickDrain(engine);
  }
  throw new Error('timed out waiting for next AIMING');
}

function buildFixture(): { engine: CatTowerEngine; fixture: FixtureResult; placements: number } {
  const engine = new CatTowerEngine();
  engine.start({
    runId: 'm4b-audit-1000',
    seed: SEED,
    mode: 'assist',
    skinId: 'default',
    reducedMotion: false
  });

  let placements = 0;
  const constructionStarted = performance.now();
  for (let i = 0; i < TARGET_CATS; i += 1) {
    const result = placeCentered(engine, false);
    const placed = result.events.filter((event) => event.type === 'placementCommitted');
    if (placed.length !== 1) throw new Error(`expected one placement at ${i + 1}, got ${placed.length}`);
    placements += placed.length;
    waitForNextAiming(engine);
  }
  const constructionMs = performance.now() - constructionStarted;
  const state = engine.snapshot();
  if (state.cats.length !== TARGET_CATS) throw new Error(`expected ${TARGET_CATS} cats, got ${state.cats.length}`);

  const digest = createHash('sha256')
    .update(JSON.stringify({
      seed: state.seed,
      mode: state.mode,
      cats: state.cats.map((cat) => [cat.id, cat.x, cat.bottom]),
      score: state.score,
      safety: state.safety,
      perfectCount: state.perfectCount
    }))
    .digest('hex');

  return {
    engine,
    placements,
    fixture: {
      cats: state.cats.length,
      score: state.score,
      perfectCount: state.perfectCount,
      safety: state.safety,
      phase: state.phase,
      placements,
      digest,
      constructionMs: round(constructionMs)
    }
  };
}

function measureIdle(engine: CatTowerEngine): {
  stats: ReturnType<typeof stats>;
  sampleMs: readonly number[];
  snapshotIdentity: { catsSame: boolean; frozen: boolean; earlierSnapshotUnchanged: boolean };
} {
  for (let i = 0; i < IDLE_WARMUP; i += 1) {
    engine.tick();
    engine.snapshot();
    drain(engine);
  }
  const first = engine.snapshot();
  const firstCats = first.cats;
  const firstTick = first.tick;
  const firstScore = first.score;
  const samples: number[] = [];
  let catsSame = true;
  let frozen = Object.isFrozen(firstCats);
  for (let i = 0; i < IDLE_SAMPLES; i += 1) {
    const start = performance.now();
    engine.tick();
    const state = engine.snapshot();
    drain(engine);
    samples.push(performance.now() - start);
    if (state.cats !== firstCats) catsSame = false;
    if (!Object.isFrozen(state.cats)) frozen = false;
  }
  return {
    stats: stats(samples),
    sampleMs: samples.map(round),
    snapshotIdentity: {
      catsSame,
      frozen,
      earlierSnapshotUnchanged: first.tick === firstTick && first.score === firstScore && first.cats.length === TARGET_CATS
    }
  };
}

function measureCommits(engine: CatTowerEngine): {
  stats: ReturnType<typeof stats>;
  samples: { readonly height: number; readonly ms: number; readonly ordinal: number }[];
} {
  const samples: { height: number; ms: number; ordinal: number }[] = [];
  for (let i = 0; i < EXTRA_COMMITS; i += 1) {
    const before = engine.snapshot().cats.length;
    const result = placeCentered(engine, true);
    const after = engine.snapshot();
    const placed = result.events.filter((event) => event.type === 'placementCommitted');
    if (placed.length !== 1) throw new Error(`expected one extra placement, got ${placed.length}`);
    const event = placed[0];
    if (event === undefined || event.type !== 'placementCommitted') throw new Error('unreachable');
    if (event.ordinal !== before + 1) throw new Error(`ordinal gap: ${event.ordinal} vs ${before + 1}`);
    if (result.commitMs === null) throw new Error('missing commit timing');
    samples.push({ height: after.cats.length, ms: round(result.commitMs), ordinal: event.ordinal });
    if (i + 1 < EXTRA_COMMITS) waitForNextAiming(engine);
  }
  return { stats: stats(samples.map((sample) => sample.ms)), samples };
}

mkdirSync(outDir, { recursive: true });
const { engine, fixture } = buildFixture();
const fixtureSnapshot = engine.snapshot();
const fixtureFirstCat = fixtureSnapshot.cats[0];
const fixtureLastCat = fixtureSnapshot.cats[fixtureSnapshot.cats.length - 1];
const idle = measureIdle(engine);
const commits = measureCommits(engine);
const finalState = engine.snapshot();
const finalDigest = createHash('sha256')
  .update(JSON.stringify({
    cats: finalState.cats.length,
    score: finalState.score,
    safety: finalState.safety,
    perfectCount: finalState.perfectCount,
    last: finalState.cats[finalState.cats.length - 1]
  }))
  .digest('hex');
const result = {
  audit: 'M4B real-engine fixture and tick/snapshot/drain',
  earlierSnapshotAfterCommits: {
    cats: fixtureSnapshot.cats.length,
    score: fixtureSnapshot.score,
    tick: fixtureSnapshot.tick,
    frozen: Object.isFrozen(fixtureSnapshot) && Object.isFrozen(fixtureSnapshot.cats),
    firstCatUnchanged: fixtureSnapshot.cats[0] === fixtureFirstCat,
    lastCatUnchanged: fixtureSnapshot.cats[fixtureSnapshot.cats.length - 1] === fixtureLastCat,
    catsStill1000: fixtureSnapshot.cats.length === TARGET_CATS
  },
  seed: SEED,
  mode: 'assist',
  fixture,
  extraCommits: {
    count: commits.samples.length,
    heightRange: [commits.samples[0]?.height ?? 0, commits.samples[commits.samples.length - 1]?.height ?? 0],
    statsMs: commits.stats,
    samples: commits.samples
  },
  idle: {
    warmup: IDLE_WARMUP,
    statsMs: idle.stats,
    sampleMs: idle.sampleMs,
    snapshotIdentity: idle.snapshotIdentity
  },
  final: {
    cats: finalState.cats.length,
    score: finalState.score,
    safety: finalState.safety,
    perfectCount: finalState.perfectCount,
    digest: finalDigest
  },
  environment: {
    node: process.version,
    platform: platform(),
    arch: arch(),
    cpu: cpus()[0]?.model ?? 'unknown',
    logicalCpus: cpus().length,
    totalMemoryBytes: totalmem(),
    balanceVersion: BALANCE_V1.version,
    dt: BALANCE_V1.dt,
    assistStep: assistStep(BALANCE_V1)
  },
  timedCodePath: 'engine.tick(); engine.snapshot(); engine.drainEvents() (idle and commit tick samples)',
  notes: [
    'Fixture built through public engine.start/enqueue/tick/drainEvents only; no private fields, ProfileService or localStorage.',
    'Idle samples are Assist AIMING ticks after 1,000 centered placements; commit samples are the single tick whose settled-cat count increases, heights 1000-1099.',
    'Commit samples include placement evaluation and the one-time cats view slice; falling/settling ticks are not included.',
    'The existing npm run bench evaluates only the placement evaluator and is reported separately.'
  ]
};

writeFileSync(`${outDir}/engine.json`, `${JSON.stringify(result, null, 2)}\n`);
const csv = ['kind,index,height,ordinal,ms', ...idle.sampleMs.map((ms, index) => `idle,${index},1000,,${ms}`), ...commits.samples.map((sample, index) => `commit,${index},${sample.height},${sample.ordinal},${sample.ms}`)].join('\n');
writeFileSync(`${outDir}/engine-samples.csv`, `${csv}\n`);

console.log(JSON.stringify({
  fixture: result.fixture,
  idle: { n: idle.stats.n, p50: idle.stats.p50, p95: idle.stats.p95, p99: idle.stats.p99 },
  commit: { n: commits.stats.n, p50: commits.stats.p50, p95: commits.stats.p95, p99: commits.stats.p99 },
  identity: idle.snapshotIdentity,
  final: result.final
}, null, 2));
