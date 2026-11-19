import type { FailureReason } from '../domain/types.js';
import { safetyBand } from './assist.js';

export type AudioCue =
  | 'land.ordinary'
  | 'land.perfect'
  | 'warning.caution'
  | 'warning.danger'
  | 'fail.miss'
  | 'fail.tumble'
  | 'reward';

export type Band = 'steady' | 'caution' | 'danger';

export interface RunBaseline {
  readonly bestHeight: number;
  readonly bestScore: number;
}

export interface LandingInput {
  readonly runId: string;
  readonly ordinal: number;
  readonly grade: 'ordinary' | 'perfect';
  readonly safety: number;
  readonly nowMs: number;
}

export interface LandingDecision {
  readonly landing: AudioCue | null;
  readonly warning: AudioCue | null;
  readonly warningDelayMs: number;
}

export interface ResultsInput {
  readonly runId: string;
  readonly score: number;
  readonly height: number;
  readonly baseline: RunBaseline;
  readonly unlocked: number;
}

export interface ResultsDecision {
  /** False for a stale run or a duplicate Results event: a true no-op. */
  readonly accepted: boolean;
  /** Null for a valid Results that earned no reward. */
  readonly cue: AudioCue | null;
}

const BAND_RANK: Readonly<Record<Band, number>> = Object.freeze({
  steady: 0,
  caution: 1,
  danger: 2
});

/**
 * Pure per-run cue policy. It never touches Web Audio, the DOM, simulation
 * state or the engine RNG. The service calls it even when muted so band and
 * duplicate tracking remain correct.
 */
export class AudioPolicy {
  private runId: string | null = null;
  private highWatermark = 0;
  private failed = false;
  private rewardPlayed = false;
  private previousBand: Band = 'steady';
  private lastWarningAt = Number.NEGATIVE_INFINITY;

  beginRun(runId: string): void {
    this.runId = runId;
    this.highWatermark = 0;
    this.failed = false;
    this.rewardPlayed = false;
    this.previousBand = 'steady';
    this.lastWarningAt = Number.NEGATIVE_INFINITY;
  }

  reset(): void {
    this.runId = null;
    this.highWatermark = 0;
    this.failed = false;
    this.rewardPlayed = false;
    this.previousBand = 'steady';
    this.lastWarningAt = Number.NEGATIVE_INFINITY;
  }

  landing(input: LandingInput): LandingDecision {
    if (this.runId === null || input.runId !== this.runId || this.failed) {
      return EMPTY_DECISION;
    }
    if (input.ordinal <= this.highWatermark) return EMPTY_DECISION;
    this.highWatermark = input.ordinal;

    const band = safetyBand(input.safety);
    const enteringWorse = BAND_RANK[band] > BAND_RANK[this.previousBand];
    this.previousBand = band;

    let warning: AudioCue | null = null;
    if (enteringWorse && input.nowMs - this.lastWarningAt >= 1000) {
      warning = band === 'danger' ? 'warning.danger' : band === 'caution' ? 'warning.caution' : null;
      if (warning !== null) this.lastWarningAt = input.nowMs;
    }

    return {
      landing: input.grade === 'perfect' ? 'land.perfect' : 'land.ordinary',
      warning,
      warningDelayMs: warning === null ? 0 : 120
    };
  }

  failure(runId: string, reason: FailureReason): AudioCue | null {
    if (this.runId === null || runId !== this.runId || this.failed) return null;
    this.failed = true;
    return reason === 'MISS_TOP' ? 'fail.miss' : 'fail.tumble';
  }

  results(input: ResultsInput): ResultsDecision {
    if (this.runId === null || input.runId !== this.runId || this.rewardPlayed) {
      return RESULTS_REJECTED;
    }
    this.rewardPlayed = true;
    const newBest = input.score > input.baseline.bestScore || input.height > input.baseline.bestHeight;
    return { accepted: true, cue: !newBest && input.unlocked === 0 ? null : 'reward' };
  }
}

const EMPTY_DECISION: LandingDecision = Object.freeze({
  landing: null,
  warning: null,
  warningDelayMs: 0
});

const RESULTS_REJECTED: ResultsDecision = Object.freeze({ accepted: false, cue: null });
