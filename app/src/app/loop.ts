export const FIXED_DT = 1 / 60;
export const MAX_TICKS_PER_FRAME = 5;
export const INTERRUPTION_GAP_MS = 250;

export interface LoopCallbacks {
  readonly tick: () => void;
  readonly render: (dtSeconds: number, nowMs: number) => void;
  readonly interrupted: () => void;
}

/**
 * One requestAnimationFrame owner with a fixed 1/60 accumulator.
 * Gaps over 250 ms pause immediately and discard backlog. Smaller gaps run at
 * most five ticks and discard the excess rather than leaping through input.
 */
export class FixedStepLoop {
  private readonly callbacks: LoopCallbacks;
  private readonly requestFrame: (callback: FrameRequestCallback) => number;
  private readonly cancelFrame: (handle: number) => void;
  private readonly frame: FrameRequestCallback;
  private rafHandle: number | null = null;
  private lastTimestampMs: number | null = null;
  private accumulatorSeconds = 0;
  private active = false;

  constructor(
    callbacks: LoopCallbacks,
    requestFrame: (callback: FrameRequestCallback) => number,
    cancelFrame: (handle: number) => void
  ) {
    this.callbacks = callbacks;
    this.requestFrame = requestFrame;
    this.cancelFrame = cancelFrame;
    this.frame = (nowMs: number) => this.onFrame(nowMs);
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.resetClock();
    this.schedule();
  }

  stop(): void {
    this.active = false;
    if (this.rafHandle !== null) {
      this.cancelFrame(this.rafHandle);
      this.rafHandle = null;
    }
    this.resetClock();
  }

  /** Clears timestamp/accumulator after pause/resume or a hidden interval. */
  resetClock(): void {
    this.lastTimestampMs = null;
    this.accumulatorSeconds = 0;
  }

  get isActive(): boolean {
    return this.active;
  }

  private schedule(): void {
    if (!this.active || this.rafHandle !== null) return;
    this.rafHandle = this.requestFrame(this.frame);
  }

  private onFrame(nowMs: number): void {
    this.rafHandle = null;
    if (!this.active) return;

    if (this.lastTimestampMs === null) {
      this.lastTimestampMs = nowMs;
      this.callbacks.render(0, nowMs);
      this.schedule();
      return;
    }

    const gapMs = nowMs - this.lastTimestampMs;
    this.lastTimestampMs = nowMs;

    if (gapMs > INTERRUPTION_GAP_MS) {
      this.accumulatorSeconds = 0;
      this.callbacks.render(0, nowMs);
      this.callbacks.interrupted();
      this.schedule();
      return;
    }

    if (gapMs > 0) this.accumulatorSeconds += gapMs / 1000;

    let ticks = Math.floor(this.accumulatorSeconds / FIXED_DT + 1e-9);
    if (ticks > MAX_TICKS_PER_FRAME) {
      ticks = MAX_TICKS_PER_FRAME;
      this.accumulatorSeconds = 0;
    } else {
      this.accumulatorSeconds -= ticks * FIXED_DT;
    }

    for (let i = 0; i < ticks; i += 1) this.callbacks.tick();

    this.callbacks.render(ticks * FIXED_DT, nowMs);
    this.schedule();
  }
}
