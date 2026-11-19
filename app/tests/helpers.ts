import assert from 'node:assert/strict';
import { BALANCE_V1, assistStep } from '../src/domain/balance.js';
import { CatTowerEngine } from '../src/domain/engine.js';
import { supportCenterX } from '../src/domain/balance.js';
import type { GameEvent, RoundState, SettledCat, SkinId, StartRound } from '../src/domain/types.js';

export const H = BALANCE_V1.height;
export const STEP = assistStep(BALANCE_V1);

export function makeCats(xs: readonly number[], skinId: SkinId = 'default'): readonly SettledCat[] {
  return Object.freeze(
    xs.map((x, index) =>
      Object.freeze({
        id: index + 1,
        x,
        bottom: index * H,
        skinId
      })
    )
  );
}

export interface StartOptions {
  readonly seed?: number;
  readonly mode?: 'classic' | 'assist';
  readonly runId?: string;
  readonly skinId?: SkinId;
  readonly reducedMotion?: boolean;
}

export function makeEngine(options: StartOptions = {}): CatTowerEngine {
  const engine = new CatTowerEngine();
  const start: StartRound = {
    runId: options.runId ?? 'run-test',
    seed: options.seed ?? 123456789,
    mode: options.mode ?? 'assist',
    skinId: options.skinId ?? 'default',
    reducedMotion: options.reducedMotion ?? false
  };
  engine.start(start);
  return engine;
}

export function tickN(engine: CatTowerEngine, ticks: number): void {
  for (let i = 0; i < ticks; i += 1) engine.tick();
}

export function tickUntil(
  engine: CatTowerEngine,
  predicate: (state: Readonly<RoundState>) => boolean,
  maxTicks = 500
): number {
  let ticks = 0;
  while (!predicate(engine.snapshot())) {
    assert.ok(ticks < maxTicks, `tickUntil exceeded ${maxTicks} ticks in ${engine.snapshot().phase}`);
    engine.tick();
    ticks += 1;
  }
  return ticks;
}

export function aim(engine: CatTowerEngine): Readonly<RoundState> {
  if (engine.snapshot().phase === 'SPAWN_CUE') {
    tickN(engine, BALANCE_V1.spawnCueTicks);
  }
  const state = engine.snapshot();
  assert.equal(state.phase, 'AIMING');
  return state;
}

/** Sends nudges in batches of the queue bound, then applies them. */
export function nudgeTimes(
  engine: CatTowerEngine,
  count: number,
  direction: -1 | 1
): void {
  let remaining = count;
  while (remaining > 0) {
    const batch = Math.min(8, remaining);
    const state = engine.snapshot();
    const spawnId = state.incoming?.spawnId;
    assert.ok(spawnId !== undefined, 'nudge requires an incoming cat');
    for (let i = 0; i < batch; i += 1) {
      engine.enqueue({ type: 'nudge', runId: state.runId, spawnId, direction });
    }
    engine.tick();
    remaining -= batch;
  }
}

/**
 * Nudges toward the support center until the pre-drop offset is within
 * `targetOffset` (best effort given the 0.26 step). Returns the actual offset.
 */
export function nudgeToOffset(
  engine: CatTowerEngine,
  targetOffset = 0
): number {
  const state = engine.snapshot();
  assert.equal(state.phase, 'AIMING');
  const incoming = state.incoming;
  assert.ok(incoming !== undefined);
  const supportX = supportCenterX(state.cats);
  const side = incoming.x >= supportX ? 1 : -1;
  const desired = supportX + side * targetOffset;
  const distance = Math.abs(desired - incoming.x);
  const count = Math.round(distance / STEP);
  const direction: -1 | 1 = desired >= incoming.x ? 1 : -1;
  nudgeTimes(engine, count, direction);
  const after = engine.snapshot().incoming;
  assert.ok(after !== undefined);
  return after.x - supportX;
}

export function enqueueDrop(engine: CatTowerEngine): void {
  const state = engine.snapshot();
  const spawnId = state.incoming?.spawnId;
  assert.ok(spawnId !== undefined, 'drop requires an incoming cat');
  engine.enqueue({ type: 'drop', runId: state.runId, spawnId });
}

export function dropAndFall(engine: CatTowerEngine): void {
  enqueueDrop(engine);
  engine.tick(); // release is consumed and the first integration runs this tick
  tickUntil(
    engine,
    (state) => state.phase === 'SETTLING' || state.phase === 'COLLAPSING',
    120
  );
}

/** Places the current cat at (approximately) the requested pre-snap offset. */
export function place(
  engine: CatTowerEngine,
  targetOffset = 0
): { readonly offset: number; readonly state: Readonly<RoundState> } {
  aim(engine);
  const offset = nudgeToOffset(engine, targetOffset);
  dropAndFall(engine);
  return { offset, state: engine.snapshot() };
}

export function advanceToNextAim(engine: CatTowerEngine): Readonly<RoundState> {
  tickUntil(engine, (state) => state.phase === 'AIMING', 100);
  return engine.snapshot();
}

export function drain(engine: CatTowerEngine): readonly GameEvent[] {
  return engine.drainEvents();
}

export function eventsOfType<T extends GameEvent['type']>(
  events: readonly GameEvent[],
  type: T
): readonly Extract<GameEvent, { type: T }>[] {
  return events.filter((event): event is Extract<GameEvent, { type: T }> => event.type === type);
}

/** Runs one game to a miss on an empty (or existing) tower at the spawn edge. */
export function failByMiss(engine: CatTowerEngine): Readonly<RoundState> {
  aim(engine);
  dropAndFall(engine);
  const state = engine.snapshot();
  assert.equal(state.phase, 'COLLAPSING');
  assert.equal(state.failure?.reason, 'MISS_TOP');
  return state;
}
