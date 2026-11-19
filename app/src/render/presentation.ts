import type { FaceId } from '../platform/assets.js';
import type { GameEvent, Phase } from '../domain/types.js';

export const LANDING_SQUASH_SECONDS = 0.24;
export const LANDING_SQUASH_PEAK_SECONDS = 0.1;
export const HAPPY_SECONDS = 0.5;
export const MIN_SQUASH_Y = 0.94;

export interface LandingEffect {
  readonly at: number;
  readonly ordinal: number;
  readonly perfect: boolean;
}

export interface CollapseEffect {
  readonly at: number;
  readonly joint: number;
  readonly direction: -1 | 1;
}

export interface SquashTransform {
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface TowerFaceInput {
  readonly collapsed: boolean;
  readonly phase: Phase;
  readonly isTop: boolean;
  readonly ordinal: number;
  readonly danger: boolean;
}

export interface IncomingFaceInput {
  readonly collapsed: boolean;
  readonly phase: Phase;
  readonly danger: boolean;
}

const IDENTITY: SquashTransform = Object.freeze({ scaleX: 1, scaleY: 1 });

/**
 * Deterministic canvas-presentation state. Time advances only when play
 * advances; wall-clock time never drives a cat effect. This module never
 * touches simulation state.
 */
export class PresentationState {
  private time = 0;
  private landing: LandingEffect | null = null;
  private collapse: CollapseEffect | null = null;

  get now(): number {
    return this.time;
  }

  get landingEffect(): LandingEffect | null {
    return this.landing;
  }

  get collapseEffect(): CollapseEffect | null {
    return this.collapse;
  }

  advance(dtSeconds: number): void {
    this.time += Math.max(0, dtSeconds);
  }

  onEvents(events: readonly GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'spawned') {
        // A new spawn does not end the previous landing's happy face; only the
        // next real landing, failure, Results or a reset replaces it.
        this.collapse = null;
      } else if (event.type === 'placementCommitted') {
        this.landing = {
          at: this.time,
          ordinal: event.ordinal,
          perfect: event.grade === 'perfect'
        };
        this.collapse = null;
      } else if (event.type === 'roundFailed') {
        this.landing = null;
        this.collapse = {
          at: this.time,
          joint: event.joint,
          direction: event.direction
        };
      } else if (event.type === 'resultsReady') {
        this.landing = null;
        this.collapse = null;
      }
    }
  }

  clearEffects(): void {
    this.landing = null;
    this.collapse = null;
  }

  reset(): void {
    this.time = 0;
    this.landing = null;
    this.collapse = null;
  }

  squashFor(ordinal: number, reducedMotion: boolean): SquashTransform {
    if (reducedMotion || this.landing === null || ordinal !== this.landing.ordinal) {
      return IDENTITY;
    }
    const elapsed = this.time - this.landing.at;
    if (elapsed < 0 || elapsed >= LANDING_SQUASH_SECONDS) return IDENTITY;
    const ms = elapsed * 1000;
    const peakMs = LANDING_SQUASH_PEAK_SECONDS * 1000;
    const scaleY = ms <= peakMs
      ? 1 - (1 - MIN_SQUASH_Y) * (ms / peakMs)
      : MIN_SQUASH_Y + (1 - MIN_SQUASH_Y) * ((ms - peakMs) / (LANDING_SQUASH_SECONDS * 1000 - peakMs));
    const clamped = Math.min(1, Math.max(MIN_SQUASH_Y, scaleY));
    return Object.freeze({ scaleX: 1 / clamped, scaleY: clamped });
  }

  happyFor(ordinal: number): boolean {
    if (this.landing === null || ordinal !== this.landing.ordinal) return false;
    const elapsed = this.time - this.landing.at;
    return elapsed >= 0 && elapsed < HAPPY_SECONDS;
  }

  towerFace(input: TowerFaceInput): FaceId {
    if (input.collapsed) return 'dizzy';
    if (input.phase === 'COLLAPSING' || input.phase === 'RESULTS') {
      return input.isTop ? 'dizzy' : 'worried';
    }
    if (input.danger) return 'worried';
    if (this.happyFor(input.ordinal)) return 'happy';
    return input.isTop ? 'focused' : 'idle';
  }

  incomingFace(input: IncomingFaceInput): FaceId {
    if (input.collapsed) return 'dizzy';
    if (input.phase === 'FALLING') return 'surprised';
    if (input.danger) return 'worried';
    return 'focused';
  }
}
