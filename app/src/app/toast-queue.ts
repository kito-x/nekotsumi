export interface ToastTimers {
  setTimeout(callback: () => void, milliseconds: number): number;
  clearTimeout(handle: number): void;
  now(): number;
}

export interface ToastQueueOptions<T> {
  readonly show: (item: T) => void;
  readonly hide: () => void;
  readonly timers: ToastTimers;
  readonly displayMs?: number;
  readonly handoffMs?: number;
}

/**
 * One visible unlock toast at a time. Every display and handoff callback is
 * tracked and generation-guarded; clearing a round removes both the queue and
 * any callback that was already on its way.
 */
export class ToastQueue<T> {
  private readonly showItem: (item: T) => void;
  private readonly hideItem: () => void;
  private readonly timers: ToastTimers;
  private readonly displayMs: number;
  private readonly handoffMs: number;
  private generation = 0;
  private timer: number | null = null;
  private handoff: number | null = null;
  private queue: T[] = [];
  private visible = false;
  private paused = false;
  private remaining = 0;
  private startedAt = 0;

  constructor(options: ToastQueueOptions<T>) {
    this.showItem = options.show;
    this.hideItem = options.hide;
    this.timers = options.timers;
    this.displayMs = options.displayMs ?? 3000;
    this.handoffMs = options.handoffMs ?? 180;
  }

  push(items: readonly T[]): void {
    if (items.length === 0) return;
    this.queue.push(...items);
    if (!this.paused && !this.visible && this.timer === null && this.handoff === null) {
      this.showNext();
    }
  }

  pause(): void {
    this.paused = true;
    if (!this.visible || this.timer === null) return;
    this.timers.clearTimeout(this.timer);
    this.timer = null;
    this.remaining = Math.max(0, this.remaining - (this.timers.now() - this.startedAt));
  }

  resume(): void {
    this.paused = false;
    if (this.visible && this.timer === null) {
      if (this.remaining <= 0) this.hideCurrent();
      else this.startTimer(this.remaining);
      return;
    }
    if (!this.visible && this.queue.length > 0 && this.handoff === null) {
      this.showNext();
    }
  }

  clear(): void {
    this.generation += 1;
    if (this.timer !== null) {
      this.timers.clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.handoff !== null) {
      this.timers.clearTimeout(this.handoff);
      this.handoff = null;
    }
    this.queue = [];
    this.paused = false;
    this.remaining = 0;
    if (this.visible) {
      this.visible = false;
      this.hideItem();
    }
  }

  get displaying(): boolean {
    return this.visible;
  }

  get queued(): number {
    return this.queue.length;
  }

  get pendingHandoff(): boolean {
    return this.handoff !== null;
  }

  private showNext(): void {
    if (this.paused) return;
    const item = this.queue.shift();
    if (item === undefined) return;
    this.visible = true;
    this.showItem(item);
    this.startTimer(this.displayMs);
  }

  private startTimer(milliseconds: number): void {
    this.remaining = milliseconds;
    this.startedAt = this.timers.now();
    const generation = this.generation;
    this.timer = this.timers.setTimeout(() => {
      if (generation !== this.generation) return;
      this.timer = null;
      this.hideCurrent();
    }, milliseconds);
  }

  private hideCurrent(): void {
    this.visible = false;
    this.hideItem();
    if (this.queue.length === 0 || this.paused) return;
    const generation = this.generation;
    this.handoff = this.timers.setTimeout(() => {
      if (generation !== this.generation) return;
      this.handoff = null;
      this.showNext();
    }, this.handoffMs);
  }
}
