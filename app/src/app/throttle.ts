export interface ThrottleTimers {
  setTimeout(callback: () => void, milliseconds: number): number;
  clearTimeout(handle: number): void;
  now(): number;
}

/**
 * Leading + trailing throttle. The first action runs immediately; actions
 * during the cooldown collapse to the latest one and flush at the boundary.
 * Cancelling drops the trailing action and any pending callback.
 */
export class LeadingTrailingThrottle {
  private readonly timers: ThrottleTimers;
  private readonly intervalMs: number;
  private last = Number.NEGATIVE_INFINITY;
  private timer: number | null = null;
  private trailing: (() => void) | null = null;
  private generation = 0;

  constructor(timers: ThrottleTimers, intervalMs = 300) {
    this.timers = timers;
    this.intervalMs = intervalMs;
  }

  request(action: () => void): void {
    const now = this.timers.now();
    if (now - this.last >= this.intervalMs) {
      this.cancelTimer();
      this.trailing = null;
      this.last = now;
      action();
      return;
    }

    this.trailing = action;
    if (this.timer !== null) return;
    const wait = Math.max(0, this.intervalMs - (now - this.last));
    const generation = this.generation;
    this.timer = this.timers.setTimeout(() => {
      this.timer = null;
      if (generation !== this.generation) return;
      const next = this.trailing;
      this.trailing = null;
      if (next === null) return;
      this.last = this.timers.now();
      next();
    }, wait);
  }

  cancel(): void {
    this.generation += 1;
    this.cancelTimer();
    this.trailing = null;
    this.last = Number.NEGATIVE_INFINITY;
  }

  get pending(): boolean {
    return this.timer !== null || this.trailing !== null;
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      this.timers.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
