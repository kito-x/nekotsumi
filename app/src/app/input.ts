import type { GameplayCommand, RoundState } from '../domain/types.js';

export interface InputTarget {
  snapshot(): Readonly<RoundState>;
  enqueue(command: GameplayCommand): void;
}

/**
 * Shared semantic dispatcher. All pointer, button and keyboard paths use it;
 * it captures the current run/spawn generation at activation time. The engine
 * still validates the generation before acting, so stale/queued input cannot
 * carry into the next cat.
 */
export class InputRouter {
  private readonly target: InputTarget;

  constructor(target: InputTarget) {
    this.target = target;
  }

  drop(): boolean {
    const state = this.target.snapshot();
    const incoming = state.incoming;
    if (state.phase !== 'AIMING' || incoming === undefined) return false;
    this.target.enqueue({
      type: 'drop',
      runId: state.runId,
      spawnId: incoming.spawnId
    });
    return true;
  }

  nudge(direction: -1 | 1): boolean {
    const state = this.target.snapshot();
    const incoming = state.incoming;
    if (state.mode !== 'assist') return false;
    if (state.phase !== 'AIMING' || incoming === undefined) return false;
    this.target.enqueue({
      type: 'nudge',
      runId: state.runId,
      spawnId: incoming.spawnId,
      direction
    });
    return true;
  }
}
