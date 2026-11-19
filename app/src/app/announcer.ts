export interface AnnouncerTimers {
  setTimeout(callback: () => void, milliseconds: number): number;
  clearTimeout(handle: number): void;
}

export interface AnnouncerOptions {
  readonly write: (text: string) => void;
  readonly timers: AnnouncerTimers;
}

const CONTENT_DELAY_MS = 30;

/**
 * Owns the single polite live region. Pending writes are tracked, cancelling a
 * context cancels them, and every timer callback rechecks its generation.
 * A write-failure notice is session-scoped: it is appended to the next
 * announcement once, never lost by a context reset and never repeated.
 */
export class LiveAnnouncer {
  private readonly write: (text: string) => void;
  private readonly timers: AnnouncerTimers;
  private generation = 0;
  private timer: number | null = null;
  private pendingText: string | null = null;
  private failureText: string | null = null;
  private failureAnnounced = false;

  constructor(options: AnnouncerOptions) {
    this.write = options.write;
    this.timers = options.timers;
  }

  request(text: string): void {
    if (text.length === 0) return;
    this.cancelTimer();
    this.pendingText = text;
    const generation = this.generation;
    this.timer = this.timers.setTimeout(() => this.flush(generation), CONTENT_DELAY_MS);
  }

  setFailure(text: string): void {
    this.failureText = text;
    this.failureAnnounced = false;
    if (this.timer === null) {
      this.scheduleFlush(0);
    }
  }

  cancelPending(): void {
    this.cancelTimer();
    this.pendingText = null;
  }

  resetContext(): void {
    this.generation += 1;
    this.cancelTimer();
    this.pendingText = null;
    if (this.failureText !== null && !this.failureAnnounced) {
      this.scheduleFlush(0);
    }
  }

  get hasPending(): boolean {
    return this.timer !== null || this.pendingText !== null;
  }

  get failurePending(): boolean {
    return this.failureText !== null && !this.failureAnnounced;
  }

  private scheduleFlush(milliseconds: number): void {
    this.cancelTimer();
    const generation = this.generation;
    this.timer = this.timers.setTimeout(() => this.flush(generation), milliseconds);
  }

  private flush(generation: number): void {
    if (generation !== this.generation) return;
    this.timer = null;
    let text = this.pendingText ?? '';
    this.pendingText = null;
    if (this.failureText !== null && !this.failureAnnounced) {
      text = text.length === 0 ? this.failureText : `${text} ${this.failureText}`;
      this.failureAnnounced = true;
    }
    if (text.length > 0) this.write(text);
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      this.timers.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
