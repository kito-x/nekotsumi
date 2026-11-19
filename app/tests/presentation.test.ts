import assert from 'node:assert/strict';
import test from 'node:test';
import type { GameEvent } from '../src/domain/types.js';
import { LiveAnnouncer } from '../src/app/announcer.js';
import { ToastQueue } from '../src/app/toast-queue.js';
import { LeadingTrailingThrottle } from '../src/app/throttle.js';
import { landingAnnouncement, unlockSentence } from '../src/app/announcements.js';
import { PresentationState } from '../src/render/presentation.js';

class FakeTimers {
  private nowMs = 0;
  private nextId = 1;
  private readonly tasks = new Map<number, { at: number; callback: () => void }>();

  now = (): number => this.nowMs;

  setTimeout = (callback: () => void, milliseconds: number): number => {
    const id = this.nextId;
    this.nextId += 1;
    this.tasks.set(id, { at: this.nowMs + Math.max(0, milliseconds), callback });
    return id;
  };

  clearTimeout = (handle: number): void => {
    this.tasks.delete(handle);
  };

  advance(milliseconds: number): void {
    const target = this.nowMs + milliseconds;
    for (;;) {
      let nextId: number | null = null;
      let nextTask: { at: number; callback: () => void } | null = null;
      for (const [id, task] of this.tasks) {
        if (task.at <= target && (nextTask === null || task.at < nextTask.at)) {
          nextId = id;
          nextTask = task;
        }
      }
      if (nextId === null || nextTask === null) break;
      this.tasks.delete(nextId);
      this.nowMs = nextTask.at;
      nextTask.callback();
    }
    this.nowMs = target;
  }
}

const base = { id: 'event', runId: 'run', tick: 0 } as const;

function spawned(ordinal: number): GameEvent {
  return { ...base, type: 'spawned', spawnId: ordinal, ordinal };
}

function placement(ordinal: number, grade: 'perfect' | 'ordinary' = 'perfect'): GameEvent {
  return {
    ...base,
    type: 'placementCommitted',
    ordinal,
    x: 0,
    grade,
    points: grade === 'perfect' ? 15 : 10,
    totalScore: ordinal * 10,
    perfectCount: grade === 'perfect' ? ordinal : 0,
    perfectChain: grade === 'perfect' ? 1 : 0,
    safety: 1,
    weakestJoint: 1,
    mode: 'classic',
    balanceVersion: 1
  };
}

function failed(): GameEvent {
  return { ...base, type: 'roundFailed', reason: 'MISS_TOP', joint: 1, direction: 1 };
}

function close(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} != ${expected}`);
}

test('landing squash is bottom-anchored, area preserving and reduced-motion identity', () => {
  const state = new PresentationState();
  state.onEvents([placement(1)]);
  assert.deepEqual(state.squashFor(1, false), { scaleX: 1, scaleY: 1 });

  state.advance(0.1);
  const peak = state.squashFor(1, false);
  close(peak.scaleY, 0.94);
  close(peak.scaleX * peak.scaleY, 1);

  state.advance(0.14);
  assert.deepEqual(state.squashFor(1, false), { scaleX: 1, scaleY: 1 });
  assert.deepEqual(state.squashFor(2, false), { scaleX: 1, scaleY: 1 });

  state.reset();
  state.onEvents([placement(1)]);
  state.advance(0.1);
  assert.deepEqual(state.squashFor(1, true), { scaleX: 1, scaleY: 1 });
});

test('happy survives the next spawn until 0.5s and a later landing replaces it', () => {
  const state = new PresentationState();
  state.onEvents([placement(1)]);
  state.advance(0.4);
  state.onEvents([spawned(2)]);
  assert.equal(state.happyFor(1), true);
  assert.equal(state.landingEffect?.ordinal, 1);
  state.advance(0.1);
  assert.equal(state.happyFor(1), false);

  state.onEvents([placement(2)]);
  assert.equal(state.happyFor(1), false);
  assert.equal(state.happyFor(2), true);
  assert.equal(state.landingEffect?.ordinal, 2);
});

test('danger outranks happy, failure clears landing and Results clear effects', () => {
  const state = new PresentationState();
  state.onEvents([placement(1)]);
  state.advance(0.1);
  assert.equal(
    state.towerFace({ collapsed: false, phase: 'AIMING', isTop: true, ordinal: 1, danger: true }),
    'worried'
  );
  assert.equal(
    state.towerFace({ collapsed: false, phase: 'AIMING', isTop: true, ordinal: 1, danger: false }),
    'happy'
  );
  assert.equal(
    state.incomingFace({ collapsed: false, phase: 'FALLING', danger: true }),
    'surprised'
  );

  state.onEvents([failed()]);
  assert.equal(state.landingEffect, null);
  assert.equal(state.happyFor(1), false);
  assert.equal(
    state.towerFace({ collapsed: false, phase: 'COLLAPSING', isTop: true, ordinal: 1, danger: false }),
    'dizzy'
  );
  assert.equal(
    state.towerFace({ collapsed: false, phase: 'COLLAPSING', isTop: false, ordinal: 1, danger: false }),
    'worried'
  );

  state.onEvents([{ ...base, type: 'resultsReady' }]);
  assert.equal(state.collapseEffect, null);
  state.onEvents([placement(3)]);
  state.reset();
  assert.equal(state.landingEffect, null);
  assert.equal(state.happyFor(3), false);
  assert.equal(state.now, 0);
});

test('announcer cancels old-context writes and appends the failure notice once', () => {
  const timers = new FakeTimers();
  const writes: string[] = [];
  const announcer = new LiveAnnouncer({ write: (text) => writes.push(text), timers });

  announcer.request('old');
  announcer.resetContext();
  timers.advance(40);
  assert.deepEqual(writes, []);

  announcer.request('first');
  announcer.request('second');
  timers.advance(30);
  assert.deepEqual(writes, ['second']);

  announcer.setFailure('Progress is saved only for this session.');
  announcer.request('Perfect. Plus 15 points. Stacked 1. Score 15. Ginger cat unlocked.');
  timers.advance(30);
  assert.deepEqual(writes, [
    'second',
    'Perfect. Plus 15 points. Stacked 1. Score 15. Ginger cat unlocked. Progress is saved only for this session.'
  ]);

  announcer.request('Next landing.');
  timers.advance(30);
  assert.deepEqual(writes, [
    'second',
    'Perfect. Plus 15 points. Stacked 1. Score 15. Ginger cat unlocked. Progress is saved only for this session.',
    'Next landing.'
  ]);
  assert.equal(announcer.failurePending, false);
});

test('a reset preserves an undisplayed failure and does not lose it', () => {
  const timers = new FakeTimers();
  const writes: string[] = [];
  const announcer = new LiveAnnouncer({ write: (text) => writes.push(text), timers });

  announcer.setFailure('Progress is saved only for this session.');
  announcer.resetContext();
  timers.advance(0);
  assert.deepEqual(writes, ['Progress is saved only for this session.']);
  announcer.request('Later.');
  timers.advance(30);
  assert.deepEqual(writes, ['Progress is saved only for this session.', 'Later.']);
});

test('toast handoff is cancelled with the round and cannot show later', () => {
  const timers = new FakeTimers();
  const shown: string[] = [];
  let hides = 0;
  const toasts = new ToastQueue<string>({
    show: (item) => shown.push(item),
    hide: () => { hides += 1; },
    timers,
    displayMs: 3000,
    handoffMs: 180
  });

  toasts.push(['ginger', 'tuxedo']);
  assert.deepEqual(shown, ['ginger']);
  timers.advance(3000);
  assert.equal(hides, 1);
  assert.equal(toasts.pendingHandoff, true);
  toasts.clear();
  timers.advance(200);
  assert.deepEqual(shown, ['ginger']);
  assert.equal(toasts.queued, 0);
  assert.equal(toasts.pendingHandoff, false);
});

test('toast queue hands off once, pauses its display timer and resumes remaining time', () => {
  const timers = new FakeTimers();
  const shown: string[] = [];
  let hides = 0;
  const toasts = new ToastQueue<string>({
    show: (item) => shown.push(item),
    hide: () => { hides += 1; },
    timers,
    displayMs: 3000,
    handoffMs: 180
  });

  toasts.push(['ginger', 'tuxedo']);
  timers.advance(1000);
  toasts.pause();
  timers.advance(5000);
  assert.equal(hides, 0);
  assert.equal(toasts.displaying, true);
  toasts.resume();
  timers.advance(1999);
  assert.equal(hides, 0);
  timers.advance(1);
  assert.equal(hides, 1);
  timers.advance(180);
  assert.deepEqual(shown, ['ginger', 'tuxedo']);
});

test('rapid nudge requests keep only the latest trailing feedback at 300ms cadence', () => {
  const timers = new FakeTimers();
  const actions: string[] = [];
  const throttle = new LeadingTrailingThrottle(timers, 300);

  throttle.request(() => actions.push('first'));
  timers.advance(100);
  throttle.request(() => actions.push('second'));
  timers.advance(50);
  throttle.request(() => actions.push('latest'));
  assert.deepEqual(actions, ['first']);
  timers.advance(149);
  assert.deepEqual(actions, ['first']);
  timers.advance(1);
  assert.deepEqual(actions, ['first', 'latest']);

  timers.advance(300);
  throttle.request(() => actions.push('immediate'));
  assert.deepEqual(actions, ['first', 'latest', 'immediate']);
  throttle.request(() => actions.push('dropped'));
  throttle.cancel();
  timers.advance(500);
  assert.deepEqual(actions, ['first', 'latest', 'immediate']);
});

test('landing announcement combines grade, score and newly unlocked names once', () => {
  assert.equal(
    landingAnnouncement({
      grade: 'ordinary',
      points: 10,
      ordinal: 2,
      totalScore: 20,
      unlocked: []
    }),
    'Landed. Plus 10 points. Stacked 2. Score 20.'
  );
  assert.equal(
    landingAnnouncement({
      grade: 'perfect',
      points: 15,
      ordinal: 1,
      totalScore: 15,
      unlocked: ['ginger']
    }),
    'Perfect. Plus 15 points. Stacked 1. Score 15. Ginger cat unlocked.'
  );
  assert.equal(unlockSentence(['ginger', 'tuxedo']), 'Ginger and Tuxedo cats unlocked.');
  assert.equal(unlockSentence(['ginger', 'tuxedo', 'calico']), 'Ginger, Tuxedo and Calico cats unlocked.');
});
