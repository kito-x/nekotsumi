/**
 * Public domain contracts for Nekotsumi M1.
 *
 * All objects handed to callers are frozen. Simulation mutation happens only
 * inside the engine; pure helpers never modify their inputs.
 */

export type Mode = 'classic' | 'assist';

export type Phase =
  | 'SPAWN_CUE'
  | 'AIMING'
  | 'FALLING'
  | 'SETTLING'
  | 'COLLAPSING'
  | 'PAUSED'
  | 'RESULTS';

export type SkinId = 'default' | 'ginger' | 'tuxedo' | 'calico';

export type FailureReason = 'MISS_TOP' | 'UNSTABLE_TOWER';

export type PauseReason = 'user' | 'hidden' | 'blur' | 'resize' | 'interrupted';

/** Gameplay phase that can be suspended by PAUSED. */
export type ResumablePhase = Exclude<Phase, 'PAUSED' | 'RESULTS'>;

export interface BalanceConfig {
  readonly version: 1;
  readonly dt: number;
  readonly width: number;
  readonly height: number;
  readonly mass: number;
  readonly floorWidth: number;
  readonly amplitude: number;
  readonly spawnGap: number;
  readonly gravity: number;
  readonly periodStart: number;
  readonly periodMin: number;
  readonly periodDecay: number;
  readonly minOverlapRatio: number;
  readonly comInsetRatio: number;
  readonly perfectRatio: number;
  readonly snapRatio: number;
  readonly assistStepRatio: number;
  readonly spawnCueTicks: number;
  readonly settleTicks: number;
  readonly collapseTicks: number;
  readonly reducedCollapseTicks: number;
  readonly epsilon: number;
}

export interface SettledCat {
  readonly id: number;
  readonly x: number;
  readonly bottom: number;
  readonly skinId: SkinId;
}

export interface IncomingCat {
  readonly spawnId: number;
  readonly x: number;
  readonly bottom: number;
  readonly vy: number;
  readonly phi: number;
  readonly releaseX?: number;
  readonly releaseOffset?: number;
}

export interface JointCheck {
  readonly index: number;
  readonly left: number;
  readonly right: number;
  readonly comX: number;
  readonly margin: number;
  readonly normalizedSafety: number;
}

export interface PlacementSuccess {
  readonly ok: true;
  readonly finalX: number;
  readonly perfect: boolean;
  readonly safety: number;
  readonly weakestJoint: number;
  /** Present only when evaluatePlacement was called with debug=true. */
  readonly joints?: readonly JointCheck[];
}

export interface PlacementFailure {
  readonly ok: false;
  readonly reason: FailureReason;
  readonly failureJoint: number;
  readonly direction: -1 | 1;
  readonly margin: number;
}

export type PlacementResult = PlacementSuccess | PlacementFailure;

export interface RoundFailure {
  readonly reason: FailureReason;
  readonly joint: number;
  readonly direction: -1 | 1;
}

export interface ResumePoint {
  readonly phase: ResumablePhase;
  readonly phaseTicks: number;
}

export interface RoundState {
  readonly runId: string;
  readonly seed: number;
  readonly rngState: number;
  readonly tick: number;
  readonly mode: Mode;
  readonly phase: Phase;
  readonly phaseTicks: number;
  readonly spawnId: number;
  readonly resume?: ResumePoint;
  readonly pauseReason?: PauseReason;
  readonly cats: readonly SettledCat[];
  readonly incoming?: IncomingCat;
  readonly score: number;
  readonly perfectChain: number;
  readonly perfectCount: number;
  readonly safety: number;
  readonly weakestJoint?: number;
  readonly failure?: RoundFailure;
  readonly skinId: SkinId;
  readonly balanceVersion: 1;
}

export type GameplayCommand =
  | { readonly type: 'drop'; readonly runId: string; readonly spawnId: number }
  | {
      readonly type: 'nudge';
      readonly runId: string;
      readonly spawnId: number;
      readonly direction: -1 | 1;
    };

export type LifecycleCommand =
  | { readonly type: 'pause'; readonly reason: PauseReason }
  | { readonly type: 'resume' }
  | { readonly type: 'skipCollapse' };

export interface StartRound {
  readonly runId: string;
  readonly seed: number;
  readonly mode: Mode;
  readonly skinId: SkinId;
  readonly reducedMotion: boolean;
}

export interface EventBase {
  readonly id: string;
  readonly runId: string;
  readonly tick: number;
}

export type GameEvent = EventBase &
  (
    | { readonly type: 'spawned'; readonly spawnId: number; readonly ordinal: number }
    | {
        readonly type: 'released';
        readonly spawnId: number;
        readonly x: number;
        readonly offset: number;
      }
    | {
        readonly type: 'placementCommitted';
        readonly ordinal: number;
        readonly x: number;
        readonly grade: 'perfect' | 'ordinary';
        readonly points: number;
        readonly totalScore: number;
        readonly perfectCount: number;
        readonly perfectChain: number;
        readonly safety: number;
        readonly weakestJoint: number;
        readonly mode: Mode;
        readonly balanceVersion: 1;
      }
    | {
        readonly type: 'roundFailed';
        readonly reason: FailureReason;
        readonly joint: number;
        readonly direction: -1 | 1;
      }
    | {
        readonly type: 'phaseChanged';
        readonly from: Phase;
        readonly to: Phase;
      }
    | { readonly type: 'paused'; readonly reason: PauseReason }
    | { readonly type: 'resumed' }
    | { readonly type: 'resultsReady' }
  );

export interface Engine {
  /** Replaces any prior run. Controller owns runId generation and unlock checks. */
  start(options: StartRound): void;
  enqueue(command: GameplayCommand): void;
  /** Synchronous lifecycle control; safe while animation frames are stopped. */
  control(command: LifecycleCommand): void;
  /** Advances exactly config.dt when the phase is live. */
  tick(): void;
  snapshot(): Readonly<RoundState>;
  /** Returns each queued event once, then clears the queue. */
  drainEvents(): readonly GameEvent[];
  dispose(): void;
}
