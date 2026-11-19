import { AudioPolicy } from '../app/audio-policy.js';
import type { AudioCue, LandingInput, ResultsInput } from '../app/audio-policy.js';
import { CUE_SPECS, scheduleCue } from './audio-synthesis.js';
import type { ScheduledCue } from './audio-synthesis.js';

export type AudioStatus = 'idle' | 'pending' | 'running' | 'unavailable' | 'closed';

export interface AudioBackend {
  readonly contextCount: number;
  status(): AudioStatus;
  setStatusListener(listener: (status: AudioStatus) => void): void;
  unlock(): void;
  setOutputGain(value: number): void;
  suspend(): void;
  resume(): void;
  play(cue: AudioCue, delaySeconds: number, groupId: number, onEnded: () => void): boolean;
  cancelGroup(groupId: number): void;
  cancelAll(): void;
  dispose(): void;
}

export interface AudioBackendOptions {
  readonly contextFactory?: () => AudioContext | null;
  readonly onStatus?: (status: AudioStatus) => void;
}

const MAX_SOURCES = 6;

function defaultContextFactory(): AudioContext | null {
  const scope = globalThis as unknown as {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
  };
  const Ctor = scope.AudioContext ?? scope.webkitAudioContext;
  if (Ctor === undefined) return null;
  try {
    return new Ctor({ latencyHint: 'interactive' });
  } catch {
    return null;
  }
}

interface ResumeToken {
  readonly id: number;
  readonly context: AudioContext;
  readonly intent: number;
}

/** Native Web Audio backend. It creates no context until unlock(). */
export class WebAudioBackend implements AudioBackend {
  private readonly factory: () => AudioContext | null;
  private listener: ((status: AudioStatus) => void) | null;
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private groups = new Map<number, ScheduledCue>();
  private currentStatus: AudioStatus = 'idle';
  private outputGain = 0.6;
  /**
   * Desired-output generation. Cancellation and suspension bump it so a late
   * native completion cannot restore output or claim a newer intent.
   */
  private intent = 0;
  private operationSequence = 0;
  /** At most one unresolved resume request per live context. */
  private resumePending: ResumeToken | null = null;
  /** One failed context awaiting confirmed closure; blocks factory calls. */
  private closing: { readonly context: AudioContext } | null = null;
  /** A known output failure must never be reported as running. */
  private outputFailed = false;
  private disposed = false;
  private contextsCreated = 0;

  constructor(options: AudioBackendOptions = {}) {
    this.factory = options.contextFactory ?? defaultContextFactory;
    this.listener = options.onStatus ?? null;
  }

  private static isClosed(context: AudioContext): boolean {
    return context.state === 'closed';
  }

  get contextCount(): number {
    return this.contextsCreated;
  }

  status(): AudioStatus {
    return this.currentStatus;
  }

  setStatusListener(listener: (status: AudioStatus) => void): void {
    this.listener = listener;
    try {
      listener(this.currentStatus);
    } catch {
      // A UI listener must not break audio lifecycle.
    }
  }

  private setStatus(status: AudioStatus): void {
    if (this.currentStatus === status) return;
    this.currentStatus = status;
    try {
      this.listener?.(status);
    } catch {
      // Optional UI feedback; never let it escape the audio path.
    }
  }

  private applyGain(): boolean {
    const master = this.master;
    const context = this.context;
    if (master === null || context === null) return false;
    if (this.outputFailed) return false;
    try {
      master.gain.setValueAtTime(this.outputGain, context.currentTime);
      return true;
    } catch {
      this.markOutputFailure(master);
      return false;
    }
  }

  /**
   * Best-effort silence plus a truthful status. Once a known output write has
   * failed this context cannot be reported as running or accept cues.
   */
  private markOutputFailure(master: GainNode): void {
    this.outputFailed = true;
    try {
      master.gain.value = 0;
    } catch {
      // The master is already unusable; status and play() still reject it.
    }
    this.cancelAll();
    this.setStatus('unavailable');
  }

  private rollbackMaster(master: GainNode | null): void {
    if (master === null) return;
    try {
      master.gain.value = 0;
    } catch {
      // Best effort before disconnection.
    }
    try {
      master.disconnect();
    } catch {
      // One failed master must not block context rollback.
    }
  }

  /**
   * Retain exactly one failed context until its closure is confirmed. While
   * the close is unresolved, rejected or threw, no replacement factory call is
   * allowed; gameplay stays silent and responsive.
   */
  private beginClose(context: AudioContext): void {
    if (this.closing !== null) return;
    if (context.state === 'closed') return;
    const record = { context };
    this.closing = record;
    let request: Promise<void>;
    try {
      request = context.close();
    } catch {
      if (WebAudioBackend.isClosed(context) && this.closing === record) this.closing = null;
      else this.setStatus('unavailable');
      return;
    }
    void request.then(() => {
      if (this.disposed || this.closing !== record) return;
      if (WebAudioBackend.isClosed(context)) this.closing = null;
      else this.setStatus('unavailable');
    }).catch(() => {
      if (this.disposed || this.closing !== record) return;
      if (WebAudioBackend.isClosed(context)) this.closing = null;
      else this.setStatus('unavailable');
    });
  }

  /**
   * Create the context and master as one transaction. On any failure the new
   * context is closed but retained until closure is confirmed; only then may a
   * later genuine activation call the factory again.
   */
  private createContext(): boolean {
    if (this.closing !== null) return false;
    if (this.context !== null && this.master !== null) return true;
    if (this.context !== null) {
      const stale = this.context;
      this.context = null;
      this.master = null;
      this.resumePending = null;
      this.beginClose(stale);
      this.setStatus('unavailable');
      return false;
    }
    let context: AudioContext | null = null;
    try {
      context = this.factory();
    } catch {
      context = null;
    }
    if (context === null) {
      this.setStatus('unavailable');
      return false;
    }
    this.contextsCreated += 1;
    if (context.state === 'closed') {
      this.setStatus('unavailable');
      return false;
    }
    let master: GainNode | null = null;
    try {
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
    } catch {
      this.rollbackMaster(master);
      this.context = null;
      this.master = null;
      this.beginClose(context);
      this.setStatus('unavailable');
      return false;
    }
    this.context = context;
    this.master = master;
    this.outputFailed = false;
    this.setStatus('pending');
    if (!this.applyGain()) {
      this.rollbackMaster(master);
      this.context = null;
      this.master = null;
      this.resumePending = null;
      this.beginClose(context);
      this.setStatus('unavailable');
      return false;
    }
    return true;
  }

  /** Dispose only: close the live context; failed contexts keep their own token. */
  private closeContext(): void {
    const context = this.context;
    this.context = null;
    this.master = null;
    this.resumePending = null;
    if (context === null || context.state === 'closed') return;
    try {
      void context.close().catch(() => undefined);
    } catch {
      // A close failure cannot block Home/new run/fatal recovery.
    }
  }

  unlock(): void {
    if (this.disposed || this.currentStatus === 'closed') return;
    if (this.closing !== null) {
      if (this.currentStatus !== 'unavailable') this.setStatus('unavailable');
      return;
    }
    if (this.outputFailed && this.context !== null) {
      // An unusable output is retired before any replacement attempt.
      const context = this.context;
      const master = this.master;
      this.context = null;
      this.master = null;
      this.resumePending = null;
      this.rollbackMaster(master);
      this.beginClose(context);
      this.setStatus('unavailable');
      return;
    }
    if (this.context === null || this.master === null) {
      if (!this.createContext()) return;
    }
    const context = this.context;
    if (context === null) return;
    if (context.state === 'closed') {
      this.setStatus('unavailable');
      return;
    }
    if (context.state === 'running') {
      this.setStatus('running');
      return;
    }
    if (this.resumePending !== null) return;
    const token: ResumeToken = {
      id: ++this.operationSequence,
      context,
      intent: this.intent
    };
    this.resumePending = token;
    let request: Promise<void>;
    try {
      request = context.resume();
    } catch {
      this.resumePending = null;
      this.setStatus('pending');
      return;
    }
    void request.then(() => {
      // A newer context/operation owns the state now: only the exact token may
      // clear it, and it may never restore output after a cancellation.
      if (this.resumePending !== token) return;
      this.resumePending = null;
      if (this.disposed || this.context !== context || this.intent !== token.intent) return;
      if (context.state === 'running') this.setStatus('running');
      else this.setStatus('pending');
    }).catch(() => {
      if (this.resumePending !== token) return;
      this.resumePending = null;
      if (this.disposed || this.context !== context) return;
      // Blocked autoplay is a pending activation: a fresh eligible gesture may
      // retry after this request settles. It is distinct from unavailable.
      this.setStatus('pending');
    });
  }

  setOutputGain(value: number): void {
    this.outputGain = Math.min(1, Math.max(0, value));
    this.applyGain();
  }

  suspend(): void {
    this.intent += 1;
    if (this.disposed || this.currentStatus === 'closed') return;
    const context = this.context;
    if (context === null) return;
    if (this.currentStatus !== 'unavailable') this.setStatus('pending');
    if (context.state === 'suspended') return;
    const generation = this.intent;
    let request: Promise<void>;
    try {
      request = context.suspend();
    } catch {
      return;
    }
    void request.then(() => {
      if (this.disposed || this.context !== context || this.intent !== generation) return;
      if (context.state !== 'running') this.setStatus('pending');
    }).catch(() => {
      // Status already says pending; keep it truthful without throwing.
    });
  }

  resume(): void {
    this.unlock();
  }

  play(cue: AudioCue, delaySeconds: number, groupId: number, onEnded: () => void): boolean {
    const context = this.context;
    const master = this.master;
    if (this.outputFailed || this.disposed || context === null || master === null) return false;
    if (this.currentStatus !== 'running' || context.state !== 'running') return false;
    if (this.groups.has(groupId)) return false;
    let group: ScheduledCue | null = null;
    try {
      const when = context.currentTime + Math.max(0, delaySeconds);
      group = scheduleCue(context, master, cue, when, () => {
        if (group === null || this.groups.get(groupId) !== group) return;
        this.groups.delete(groupId);
        onEnded();
      });
      this.groups.set(groupId, group);
      return true;
    } catch {
      // scheduleCue already stopped and disconnected everything it created.
      return false;
    }
  }

  cancelGroup(groupId: number): void {
    const group = this.groups.get(groupId);
    if (group === undefined) return;
    this.groups.delete(groupId);
    try {
      group.cancel();
    } catch {
      // The owned graph cleanup is idempotent; keep the silent fallback alive.
    }
  }

  cancelAll(): void {
    this.intent += 1;
    const groups = [...this.groups.values()];
    this.groups.clear();
    for (const group of groups) {
      try {
        group.cancel();
      } catch {
        // Continue cancelling the remaining groups.
      }
    }
  }

  dispose(): void {
    this.disposed = true;
    this.cancelAll();
    this.resumePending = null;
    this.closing = null;
    this.outputFailed = false;
    this.setStatus('closed');
    this.closeContext();
  }
}

export interface AudioServiceOptions {
  readonly backend: AudioBackend;
  readonly now?: () => number;
  readonly onStatus?: (status: AudioStatus) => void;
}

interface ActiveGroup {
  readonly sources: number;
  readonly priority: number;
}

/**
 * Policy/backend seam. Every method is synchronous from the caller's point of
 * view; context creation, resume and suspend promises are fire-and-forget and
 * owned inside the backend. No cue is queued while pending.
 */
export class AudioService {
  private readonly backend: AudioBackend;
  private readonly policy = new AudioPolicy();
  private readonly now: () => number;
  private readonly onStatus: ((status: AudioStatus) => void) | undefined;
  private enabledValue = true;
  private volumeValue = 0.6;
  private paused = true;
  private runGeneration = 0;
  private groupSequence = 1;
  private cleanupGeneration = 0;
  private groups = new Map<number, ActiveGroup>();
  private readonly cueCounts = new Map<AudioCue, number>();
  private dropped = 0;

  constructor(options: AudioServiceOptions) {
    this.backend = options.backend;
    this.now = options.now ?? (() => performance.now());
    this.onStatus = options.onStatus;
    try {
      this.backend.setStatusListener((status) => {
      if (status === 'unavailable' || status === 'closed') {
        this.groups.clear();
      }
      this.onStatus?.(status);
    });
    } catch {
      // Status UI is optional.
    }
    this.applyGain();
  }

  get enabled(): boolean {
    return this.enabledValue;
  }

  get volume(): number {
    return this.volumeValue;
  }

  get status(): AudioStatus {
    return this.backend.status();
  }

  startRun(runId: string): void {
    this.cancelAll();
    this.policy.beginRun(runId);
    this.runGeneration += 1;
    this.paused = false;
    this.applyGain();
  }

  /**
   * Only a genuine trusted activation may create or resume an AudioContext.
   * Synthetic clicks/keys and capture advance still drive the game but never
   * reach the browser audio path.
   */
  unlockFromGesture(trusted: boolean): void {
    if (!trusted || !this.enabledValue) return;
    try {
      this.backend.unlock();
    } catch {
      // Audio is optional; never let a backend failure block input/gameplay.
    }
  }

  setEnabled(enabled: boolean): void {
    if (this.enabledValue === enabled) return;
    this.enabledValue = enabled;
    if (!enabled) this.cancelAll();
    this.applyGain();
  }

  setVolume(volume: number): void {
    const clamped = Math.min(1, Math.max(0, volume));
    if (this.volumeValue === clamped) return;
    this.volumeValue = clamped;
    if (clamped === 0) this.cancelAll();
    this.applyGain();
  }

  landing(input: Omit<LandingInput, 'nowMs'>): void {
    const decision = this.policy.landing({ ...input, nowMs: this.now() });
    if (!this.enabledValue || this.paused || this.volumeValue === 0) return;
    if (decision.landing !== null) this.playCue(decision.landing, 0);
    if (decision.warning !== null) this.playCue(decision.warning, decision.warningDelayMs / 1000);
  }

  failure(runId: string, reason: 'MISS_TOP' | 'UNSTABLE_TOWER'): void {
    const cue = this.policy.failure(runId, reason);
    if (cue === null) return;
    this.cancelAll();
    if (this.enabledValue && !this.paused && this.volumeValue > 0) this.playCue(cue, 0);
  }

  results(input: Omit<ResultsInput, 'runId'> & { readonly runId: string }): void {
    const decision = this.policy.results(input);
    // Stale or duplicate Results is a true no-op, including no cancellation
    // of a newer run's active cue.
    if (!decision.accepted) return;
    this.cancelAll();
    if (decision.cue !== null && this.enabledValue && !this.paused && this.volumeValue > 0) {
      this.playCue(decision.cue, 0);
    }
  }

  pause(): void {
    this.paused = true;
    this.cancelAll();
    try {
      this.backend.suspend();
    } catch {
      // Silent fallback.
    }
    this.applyGain();
  }

  resumeFromGesture(trusted: boolean): void {
    this.paused = false;
    this.unlockFromGesture(trusted);
    this.applyGain();
  }

  resetSession(): void {
    this.cancelAll();
    this.policy.reset();
    this.runGeneration += 1;
    this.paused = true;
    try {
      this.backend.suspend();
    } catch {
      // Home/new run/fatal recovery must continue even if suspension fails.
    }
    this.applyGain();
  }

  dispose(): void {
    this.cancelAll();
    this.policy.reset();
    this.paused = true;
    try {
      this.backend.dispose();
    } catch {
      // Disposal is best effort; the game path is already finished.
    }
  }

  debug(): {
    readonly contextCount: number;
    readonly state: AudioStatus;
    readonly activeSources: number;
    readonly scheduledGroups: number;
    readonly runGeneration: number;
    readonly enabled: boolean;
    readonly volume: number;
    readonly cuesPlayed: Readonly<Record<string, number>>;
    readonly cuesDropped: number;
  } {
    let activeSources = 0;
    for (const group of this.groups.values()) activeSources += group.sources;
    return {
      contextCount: this.backend.contextCount,
      state: this.backend.status(),
      activeSources,
      scheduledGroups: this.groups.size,
      runGeneration: this.runGeneration,
      enabled: this.enabledValue,
      volume: this.volumeValue,
      cuesPlayed: Object.fromEntries(this.cueCounts),
      cuesDropped: this.dropped
    };
  }

  private applyGain(): void {
    try {
      this.backend.setOutputGain(this.enabledValue && !this.paused ? this.volumeValue : 0);
    } catch {
      // Optional output; ignore a closed/broken context.
    }
  }

  private cancelAll(): void {
    this.cleanupGeneration += 1;
    this.groups.clear();
    try {
      this.backend.cancelAll();
    } catch {
      // Keep the silent fallback playable.
    }
  }

  private playCue(cue: AudioCue, delaySeconds: number): void {
    const spec = CUE_SPECS[cue];
    while (this.activeSourceCount() + spec.sources > MAX_SOURCES) {
      const victim = this.lowestPriorityGroup();
      if (victim === null || victim.priority <= spec.priority) {
        this.dropped += 1;
        return;
      }
      this.cancelGroup(victim.id);
    }
    const id = this.groupSequence;
    this.groupSequence += 1;
    const cleanupGeneration = this.cleanupGeneration;
    let started = false;
    try {
      started = this.backend.play(cue, delaySeconds, id, () => {
        if (cleanupGeneration !== this.cleanupGeneration) return;
        this.groups.delete(id);
      });
    } catch {
      started = false;
    }
    if (!started) {
      this.dropped += 1;
      return;
    }
    this.groups.set(id, { sources: spec.sources, priority: spec.priority });
    this.cueCounts.set(cue, (this.cueCounts.get(cue) ?? 0) + 1);
  }

  private activeSourceCount(): number {
    let count = 0;
    for (const group of this.groups.values()) count += group.sources;
    return count;
  }

  private lowestPriorityGroup(): { id: number; priority: number } | null {
    let victim: { id: number; priority: number } | null = null;
    for (const [id, group] of this.groups) {
      if (victim === null || group.priority > victim.priority) {
        victim = { id, priority: group.priority };
      }
    }
    return victim;
  }

  private cancelGroup(id: number): void {
    this.groups.delete(id);
    try {
      this.backend.cancelGroup(id);
    } catch {
      // The backend cleans its own group; service accounting is already updated.
    }
  }
}
