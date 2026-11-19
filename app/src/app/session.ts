import type {
  Engine,
  GameEvent,
  GameplayCommand,
  Mode,
  PauseReason,
  RoundState,
  SkinId
} from '../domain/types.js';
import { newRunId, randomSeed } from '../platform/seed.js';

export interface SessionStartOptions {
  readonly mode: Mode;
  readonly skinId?: SkinId;
  readonly reducedMotion?: boolean;
  readonly seed?: number;
  readonly runId?: string;
}

export interface SessionOptions {
  readonly engine: Engine;
  readonly onEvents?: (events: readonly GameEvent[], snapshot: Readonly<RoundState>) => void;
  readonly makeRunId?: () => string;
  readonly makeSeed?: () => number;
}

/**
 * Owns one engine and its event fan-out. It never renders or persists.
 * Event batches are drained exactly once, and old-run events are flushed
 * before start replaces the run.
 */
export class GameSession {
  readonly engine: Engine;
  private readonly onEvents: ((events: readonly GameEvent[], snapshot: Readonly<RoundState>) => void) | undefined;
  private readonly makeRunId: () => string;
  private readonly makeSeed: () => number;
  private runGeneration = 0;
  private currentMode: Mode = 'classic';
  private currentSkin: SkinId = 'default';
  private started = false;

  constructor(options: SessionOptions) {
    this.engine = options.engine;
    this.onEvents = options.onEvents;
    this.makeRunId = options.makeRunId ?? newRunId;
    this.makeSeed = options.makeSeed ?? randomSeed;
  }

  start(options: SessionStartOptions): Readonly<RoundState> {
    this.flushEvents();
    this.runGeneration += 1;
    const runId = options.runId ?? this.makeRunId();
    const seed = options.seed ?? this.makeSeed();
    const skinId = options.skinId ?? 'default';
    const reducedMotion = options.reducedMotion ?? false;

    this.engine.start({ runId, seed, mode: options.mode, skinId, reducedMotion });
    this.currentMode = options.mode;
    this.currentSkin = skinId;
    this.started = true;
    this.flushEvents();
    return this.engine.snapshot();
  }

  tick(): Readonly<RoundState> {
    if (this.started) this.engine.tick();
    this.flushEvents();
    return this.engine.snapshot();
  }

  pause(reason: PauseReason): void {
    if (!this.started) return;
    this.engine.control({ type: 'pause', reason });
    this.flushEvents();
  }

  resume(): void {
    if (!this.started) return;
    this.engine.control({ type: 'resume' });
    this.flushEvents();
  }

  skipCollapse(): void {
    if (!this.started) return;
    this.engine.control({ type: 'skipCollapse' });
    this.flushEvents();
  }

  enqueue(command: GameplayCommand): void {
    this.engine.enqueue(command);
  }

  snapshot(): Readonly<RoundState> {
    if (!this.started) throw new Error('Session has not started');
    return this.engine.snapshot();
  }

  dispose(): void {
    this.flushEvents();
    this.engine.dispose();
    this.started = false;
  }

  get generation(): number {
    return this.runGeneration;
  }

  get mode(): Mode {
    return this.currentMode;
  }

  get skinId(): SkinId {
    return this.currentSkin;
  }

  get hasStarted(): boolean {
    return this.started;
  }

  private flushEvents(): void {
    if (!this.started) {
      // Draining an engine that has never started is unnecessary; events are empty.
      return;
    }
    const events = this.engine.drainEvents();
    if (events.length > 0) this.onEvents?.(events, this.engine.snapshot());
  }
}
