import {
  BALANCE_V1,
  assistStep,
  collapseTicks as collapseDurationFor,
  periodFor,
  spawnBottom,
  supportCenterX,
  supportTop
} from './balance.js';
import { evaluatePlacement, prepareDrop } from './placement.js';
import { nextSpawnSide, normalizeSeed } from './rng.js';
import { scorePlacement } from './score.js';
import type {
  BalanceConfig,
  Engine,
  FailureReason,
  GameEvent,
  GameplayCommand,
  IncomingCat,
  LifecycleCommand,
  Mode,
  PauseReason,
  Phase,
  ResumePoint,
  RoundFailure,
  RoundState,
  SettledCat,
  SkinId,
  StartRound
} from './types.js';

const EMPTY_CATS: readonly SettledCat[] = Object.freeze([]);
const EMPTY_EVENTS: readonly GameEvent[] = Object.freeze([]);
const MAX_COMMANDS = 8;
const MODES: readonly Mode[] = ['classic', 'assist'];
const SKINS: readonly SkinId[] = ['default', 'ginger', 'tuxedo', 'calico'];
const PAUSE_REASONS: readonly PauseReason[] = [
  'user',
  'hidden',
  'blur',
  'resize',
  'interrupted'
];
const LIVE_PHASES: readonly Phase[] = [
  'SPAWN_CUE',
  'AIMING',
  'FALLING',
  'SETTLING',
  'COLLAPSING'
];

/** Distributes Omit across the GameEvent union instead of collapsing its keys. */
type EventInput = GameEvent extends infer Event
  ? Event extends GameEvent
    ? Omit<Event, 'id' | 'runId' | 'tick'>
    : never
  : never;

interface MutableIncoming {
  spawnId: number;
  x: number;
  bottom: number;
  vy: number;
  phi: number;
  releaseX: number | undefined;
  releaseOffset: number | undefined;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Fixed-step pure game engine. It owns no wall clock, DOM, storage or audio.
 * Every published snapshot and every drained event is frozen.
 */
export class CatTowerEngine implements Engine {
  private readonly config: BalanceConfig;
  private disposed = false;
  private started = false;
  private runId = '';
  private seed = 0;
  private rngState = 0;
  private tickCount = 0;
  private mode: Mode = 'classic';
  private phase: Phase = 'SPAWN_CUE';
  private phaseTicks = 0;
  private spawnId = 0;
  private resume: ResumePoint | undefined;
  private pauseReason: PauseReason | undefined;
  private cats: SettledCat[] = [];
  private catsView: readonly SettledCat[] = EMPTY_CATS;
  private incoming: MutableIncoming | undefined;
  private score = 0;
  private perfectChain = 0;
  private perfectCount = 0;
  private safety = 1;
  private weakestJoint: number | undefined;
  private failure: RoundFailure | undefined;
  private skinId: SkinId = 'default';
  private collapseTicks = BALANCE_V1.collapseTicks;
  private queue: GameplayCommand[] = [];
  private events: GameEvent[] = [];
  private eventSequence = 0;
  private published: Readonly<RoundState> | undefined;

  constructor(config: BalanceConfig = BALANCE_V1) {
    this.config = Object.freeze({ ...config });
  }

  start(options: StartRound): void {
    if (this.disposed) throw new Error('Engine is disposed');
    if (!isRecord(options)) throw new TypeError('start options are required');

    const { runId, seed, mode, skinId, reducedMotion } = options;
    if (typeof runId !== 'string' || runId.length === 0) {
      throw new TypeError('runId must be a non-empty string');
    }
    if (!MODES.includes(mode)) throw new RangeError(`Unsupported mode: ${String(mode)}`);
    if (!SKINS.includes(skinId)) throw new RangeError(`Unsupported skinId: ${String(skinId)}`);
    if (typeof reducedMotion !== 'boolean') {
      throw new TypeError('reducedMotion must be a boolean');
    }

    // normalizeSeed rejects non-integers; 0 is normalized to the xorshift fallback.
    this.seed = normalizeSeed(seed);
    this.rngState = this.seed;
    this.runId = runId;
    this.mode = mode;
    this.skinId = skinId;
    this.collapseTicks = collapseDurationFor(reducedMotion, this.config);

    this.tickCount = 0;
    this.phase = 'SPAWN_CUE';
    this.phaseTicks = 0;
    this.spawnId = 1;
    this.resume = undefined;
    this.pauseReason = undefined;
    this.cats = [];
    this.catsView = EMPTY_CATS;
    this.incoming = undefined;
    this.score = 0;
    this.perfectChain = 0;
    this.perfectCount = 0;
    this.safety = 1;
    this.weakestJoint = undefined;
    this.failure = undefined;
    this.queue = [];
    this.events = [];
    this.started = true;

    this.createIncoming();
    this.publish();
  }

  enqueue(command: GameplayCommand): void {
    if (this.disposed || !this.started) return;
    if (this.phase === 'PAUSED' || this.phase === 'RESULTS') return;
    if (!isRecord(command)) return;

    const runId = command.runId;
    const spawnId = command.spawnId;
    if (typeof runId !== 'string' || typeof spawnId !== 'number') return;

    if (command.type === 'drop') {
      const duplicate = this.queue.some(
        (queued) => queued.type === 'drop' && queued.runId === runId && queued.spawnId === spawnId
      );
      if (duplicate) return;
      if (this.queue.length >= MAX_COMMANDS) return;
      this.queue.push(Object.freeze({ type: 'drop', runId, spawnId }));
      return;
    }

    if (command.type === 'nudge') {
      const direction = command.direction;
      if (direction !== -1 && direction !== 1) return;
      if (this.queue.length >= MAX_COMMANDS) return;
      this.queue.push(Object.freeze({ type: 'nudge', runId, spawnId, direction }));
    }
  }

  control(command: LifecycleCommand): void {
    if (this.disposed || !this.started) return;
    if (!isRecord(command)) return;
    switch (command.type) {
      case 'pause': {
        if (!PAUSE_REASONS.includes(command.reason)) return;
        // Repeated pause must not overwrite the resume point.
        if (this.phase === 'PAUSED' || this.phase === 'RESULTS') return;
        if (!LIVE_PHASES.includes(this.phase)) return;
        this.resume = Object.freeze({ phase: this.phase, phaseTicks: this.phaseTicks });
        this.pauseReason = command.reason;
        this.phase = 'PAUSED';
        this.queue = [];
        this.emit({ type: 'paused', reason: command.reason });
        this.publish();
        return;
      }
      case 'resume': {
        if (this.phase !== 'PAUSED') return;
        const saved = this.resume;
        if (saved === undefined) return;
        this.resume = undefined;
        this.pauseReason = undefined;
        this.queue = [];
        this.phase = saved.phase;
        this.phaseTicks = saved.phaseTicks;
        this.emit({ type: 'resumed' });
        this.publish();
        return;
      }
      case 'skipCollapse': {
        if (this.phase !== 'COLLAPSING') return;
        this.toResults();
        this.publish();
        return;
      }
      default:
        return;
    }
  }

  tick(): void {
    if (this.disposed || !this.started) return;
    if (this.phase === 'PAUSED' || this.phase === 'RESULTS') return;

    this.processCommands();
    this.advancePhase();
    this.tickCount += 1;
    this.publish();
  }

  snapshot(): Readonly<RoundState> {
    if (this.published === undefined) throw new Error('Engine has not started');
    return this.published;
  }

  drainEvents(): readonly GameEvent[] {
    if (this.events.length === 0) return EMPTY_EVENTS;
    const drained = Object.freeze(this.events);
    this.events = [];
    return drained;
  }

  dispose(): void {
    this.disposed = true;
    this.queue = [];
    this.events = [];
  }

  private processCommands(): void {
    while (this.queue.length > 0) {
      const command = this.queue.shift()!;
      if (command.runId !== this.runId) continue;

      if (command.type === 'drop') {
        const incoming = this.incoming;
        if (this.phase !== 'AIMING' || incoming === undefined) continue;
        if (command.spawnId !== incoming.spawnId) continue;

        const supportX = supportCenterX(this.cats);
        const prepared = prepareDrop(incoming.x, supportX, this.config);
        incoming.x = prepared.finalX;
        incoming.releaseX = prepared.finalX;
        incoming.releaseOffset = prepared.releaseOffset;
        incoming.vy = 0;
        this.phase = 'FALLING';
        this.phaseTicks = 0;
        this.emit({ type: 'phaseChanged', from: 'AIMING', to: 'FALLING' });
        this.emit({
          type: 'released',
          spawnId: incoming.spawnId,
          x: prepared.finalX,
          offset: prepared.releaseOffset
        });
        continue;
      }

      if (command.type === 'nudge') {
        const incoming = this.incoming;
        if (this.mode !== 'assist') continue;
        if (this.phase !== 'AIMING' || incoming === undefined) continue;
        if (command.spawnId !== incoming.spawnId) continue;
        const step = assistStep(this.config);
        incoming.x = clamp(
          incoming.x + command.direction * step,
          -this.config.amplitude,
          this.config.amplitude
        );
      }
    }
  }

  private advancePhase(): void {
    switch (this.phase) {
      case 'SPAWN_CUE': {
        if (this.mode === 'classic') this.advanceAimMotion();
        this.phaseTicks += 1;
        if (this.phaseTicks >= this.config.spawnCueTicks) {
          this.phase = 'AIMING';
          this.phaseTicks = 0;
          this.emit({ type: 'phaseChanged', from: 'SPAWN_CUE', to: 'AIMING' });
        }
        return;
      }
      case 'AIMING': {
        if (this.mode === 'classic') this.advanceAimMotion();
        return;
      }
      case 'FALLING': {
        this.integrateFalling();
        return;
      }
      case 'SETTLING': {
        this.phaseTicks += 1;
        if (this.phaseTicks >= this.config.settleTicks) {
          this.phase = 'SPAWN_CUE';
          this.phaseTicks = 0;
          this.spawnId += 1;
          this.emit({ type: 'phaseChanged', from: 'SETTLING', to: 'SPAWN_CUE' });
          this.createIncoming();
        }
        return;
      }
      case 'COLLAPSING': {
        this.phaseTicks += 1;
        if (this.phaseTicks >= this.collapseTicks) {
          this.toResults();
        }
        return;
      }
      case 'PAUSED':
      case 'RESULTS':
        return;
      default: {
        const exhaustive: never = this.phase;
        return exhaustive;
      }
    }
  }

  private advanceAimMotion(): void {
    const incoming = this.incoming;
    if (incoming === undefined) return;
    const n = this.cats.length + 1;
    const omega = (2 * Math.PI * this.config.dt) / periodFor(n, this.config);
    incoming.phi += omega;
    incoming.x = this.config.amplitude * Math.sin(incoming.phi);
  }

  private integrateFalling(): void {
    const incoming = this.incoming;
    if (incoming === undefined) return;

    const top = supportTop(this.cats.length, this.config);
    const previousBottom = incoming.bottom;
    incoming.vy -= this.config.gravity * this.config.dt;
    incoming.bottom += incoming.vy * this.config.dt;

    // Swept vertical crossing: resolve on this tick instead of integrating through.
    if (previousBottom >= top && incoming.bottom <= top) {
      incoming.bottom = top;
      this.resolveContact();
    }
  }

  private resolveContact(): void {
    const incoming = this.incoming;
    if (incoming === undefined) return;

    const top = supportTop(this.cats.length, this.config);
    const supportX = supportCenterX(this.cats);
    const releaseOffset = incoming.releaseOffset ?? incoming.x - supportX;
    const result = evaluatePlacement(this.cats, incoming.x, releaseOffset, this.config, false);

    if (result.ok) {
      const scoring = scorePlacement({
        perfect: result.perfect,
        stable: true,
        chainBefore: this.perfectChain
      });
      this.score += scoring.points;
      this.perfectChain = scoring.perfectChain;
      this.perfectCount += scoring.perfectCountDelta;
      this.safety = result.safety;
      this.weakestJoint = result.weakestJoint;

      const cat: SettledCat = Object.freeze({
        id: incoming.spawnId,
        x: result.finalX,
        bottom: top,
        skinId: this.skinId
      });
      this.cats.push(cat);
      this.catsView = Object.freeze(this.cats.slice());
      this.incoming = undefined;
      this.phase = 'SETTLING';
      this.phaseTicks = 0;

      this.emit({
        type: 'placementCommitted',
        ordinal: this.cats.length,
        x: result.finalX,
        grade: result.perfect ? 'perfect' : 'ordinary',
        points: scoring.points,
        totalScore: this.score,
        perfectCount: this.perfectCount,
        perfectChain: this.perfectChain,
        safety: result.safety,
        weakestJoint: result.weakestJoint,
        mode: this.mode,
        balanceVersion: 1
      });
      this.emit({ type: 'phaseChanged', from: 'FALLING', to: 'SETTLING' });
      return;
    }

    const reason: FailureReason = result.reason;
    this.failure = Object.freeze({
      reason,
      joint: result.failureJoint,
      direction: result.direction
    });
    this.phase = 'COLLAPSING';
    this.phaseTicks = 0;
    this.emit({
      type: 'roundFailed',
      reason,
      joint: result.failureJoint,
      direction: result.direction
    });
    this.emit({ type: 'phaseChanged', from: 'FALLING', to: 'COLLAPSING' });
  }

  private createIncoming(): void {
    const step = nextSpawnSide(this.rngState);
    this.rngState = step.state;
    const phi = step.side === 1 ? Math.PI / 2 : -Math.PI / 2;
    this.incoming = {
      spawnId: this.spawnId,
      x: this.config.amplitude * Math.sin(phi),
      bottom: spawnBottom(this.cats.length, this.config),
      vy: 0,
      phi,
      releaseX: undefined,
      releaseOffset: undefined
    };
    this.emit({
      type: 'spawned',
      spawnId: this.spawnId,
      ordinal: this.cats.length + 1
    });
  }

  private toResults(): void {
    const from = this.phase;
    this.phase = 'RESULTS';
    this.phaseTicks = 0;
    this.queue = [];
    this.emit({ type: 'phaseChanged', from, to: 'RESULTS' });
    this.emit({ type: 'resultsReady' });
  }

  private emit(event: EventInput): void {
    const complete = Object.freeze({
      id: `${this.runId}:${this.eventSequence}`,
      runId: this.runId,
      tick: this.tickCount,
      ...event
    }) as GameEvent;
    this.eventSequence += 1;
    this.events.push(complete);
  }

  private publish(): void {
    const incoming: IncomingCat | undefined =
      this.incoming === undefined
        ? undefined
        : Object.freeze({
            spawnId: this.incoming.spawnId,
            x: this.incoming.x,
            bottom: this.incoming.bottom,
            vy: this.incoming.vy,
            phi: this.incoming.phi,
            ...(this.incoming.releaseX === undefined
              ? {}
              : { releaseX: this.incoming.releaseX }),
            ...(this.incoming.releaseOffset === undefined
              ? {}
              : { releaseOffset: this.incoming.releaseOffset })
          });

    const state: RoundState = Object.freeze({
      runId: this.runId,
      seed: this.seed,
      rngState: this.rngState,
      tick: this.tickCount,
      mode: this.mode,
      phase: this.phase,
      phaseTicks: this.phaseTicks,
      spawnId: this.spawnId,
      ...(this.resume === undefined
        ? {}
        : { resume: Object.freeze({ phase: this.resume.phase, phaseTicks: this.resume.phaseTicks }) }),
      ...(this.pauseReason === undefined ? {} : { pauseReason: this.pauseReason }),
      cats: this.catsView,
      ...(incoming === undefined ? {} : { incoming }),
      score: this.score,
      perfectChain: this.perfectChain,
      perfectCount: this.perfectCount,
      safety: this.safety,
      ...(this.weakestJoint === undefined ? {} : { weakestJoint: this.weakestJoint }),
      ...(this.failure === undefined ? {} : { failure: this.failure }),
      skinId: this.skinId,
      balanceVersion: 1
    });

    this.published = state;
  }
}
