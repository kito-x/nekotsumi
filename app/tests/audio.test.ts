import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioPolicy } from '../src/app/audio-policy.js';
import { CatTowerEngine } from '../src/domain/engine.js';
import { AudioService } from '../src/platform/audio.js';
import type { AudioBackend, AudioStatus } from '../src/platform/audio.js';
import type { AudioCue } from '../src/app/audio-policy.js';

class FakeBackend implements AudioBackend {
  statusValue: AudioStatus = 'idle';
  contextCountValue = 0;
  gain = 1;
  listener: ((status: AudioStatus) => void) | null = null;
  groups = new Map<number, { cue: AudioCue; onEnded: () => void }>();
  played: { cue: AudioCue; delay: number; id: number }[] = [];
  cancelAllCount = 0;

  get contextCount(): number {
    return this.contextCountValue;
  }

  status(): AudioStatus {
    return this.statusValue;
  }

  setStatusListener(listener: (status: AudioStatus) => void): void {
    this.listener = listener;
    listener(this.statusValue);
  }

  setStatus(status: AudioStatus): void {
    this.statusValue = status;
    this.listener?.(status);
  }

  unlock(): void {
    if (this.statusValue === 'unavailable' || this.statusValue === 'pending') return;
    this.contextCountValue = 1;
    this.setStatus('running');
  }

  setOutputGain(value: number): void {
    this.gain = value;
  }

  suspend(): void {
    this.setStatus('pending');
  }

  resume(): void {
    this.unlock();
  }

  play(cue: AudioCue, delaySeconds: number, groupId: number, onEnded: () => void): boolean {
    if (this.statusValue !== 'running') return false;
    this.groups.set(groupId, { cue, onEnded });
    this.played.push({ cue, delay: delaySeconds, id: groupId });
    return true;
  }

  cancelGroup(groupId: number): void {
    this.groups.delete(groupId);
  }

  cancelAll(): void {
    this.groups.clear();
    this.cancelAllCount += 1;
  }

  finish(groupId: number): void {
    const group = this.groups.get(groupId);
    if (group === undefined) return;
    this.groups.delete(groupId);
    group.onEnded();
  }

  dispose(): void {
    this.cancelAll();
    this.setStatus('closed');
  }
}

function service(now = { value: 0 }): { audio: AudioService; backend: FakeBackend; clock: { value: number } } {
  const backend = new FakeBackend();
  const clock = now;
  const audio = new AudioService({ backend, now: () => clock.value });
  return { audio, backend, clock };
}

function runAudio(): { audio: AudioService; backend: FakeBackend; clock: { value: number } } {
  const setup = service();
  setup.audio.startRun('run-1');
  setup.backend.setStatus('running');
  setup.audio.unlockFromGesture(true);
  return setup;
}

test('audio policy emits one grade cue, suppresses duplicates and stale runs', () => {
  const policy = new AudioPolicy();
  policy.beginRun('run-1');
  assert.deepEqual(policy.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1, nowMs: 0 }), {
    landing: 'land.ordinary',
    warning: null,
    warningDelayMs: 0
  });
  assert.deepEqual(policy.landing({ runId: 'run-1', ordinal: 1, grade: 'perfect', safety: 1, nowMs: 1 }), {
    landing: null,
    warning: null,
    warningDelayMs: 0
  });
  assert.equal(policy.landing({ runId: 'stale', ordinal: 2, grade: 'perfect', safety: 1, nowMs: 2 }).landing, null);
  assert.equal(policy.landing({ runId: 'run-1', ordinal: 2, grade: 'perfect', safety: 1, nowMs: 2 }).landing, 'land.perfect');
});

test('audio policy warns only on worsening bands with a 1s cooldown', () => {
  const policy = new AudioPolicy();
  policy.beginRun('run-1');
  assert.equal(policy.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1, nowMs: 0 }).warning, null);
  assert.equal(policy.landing({ runId: 'run-1', ordinal: 2, grade: 'ordinary', safety: 0.2, nowMs: 100 }).warning, 'warning.caution');
  assert.equal(policy.landing({ runId: 'run-1', ordinal: 3, grade: 'ordinary', safety: 0.2, nowMs: 500 }).warning, null);
  assert.equal(policy.landing({ runId: 'run-1', ordinal: 4, grade: 'ordinary', safety: 0.8, nowMs: 700 }).warning, null);
  assert.equal(policy.landing({ runId: 'run-1', ordinal: 5, grade: 'ordinary', safety: 0.05, nowMs: 1200 }).warning, 'warning.danger');
  assert.equal(policy.landing({ runId: 'run-1', ordinal: 6, grade: 'ordinary', safety: 0.05, nowMs: 1300 }).warning, null);
});

test('service plays grade cues, warning delay, failure cancellation and Results reward once', () => {
  const { audio, backend, clock } = runAudio();
  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  assert.deepEqual(backend.played.map((entry) => entry.cue), ['land.ordinary']);
  clock.value = 100;
  audio.landing({ runId: 'run-1', ordinal: 2, grade: 'perfect', safety: 0.2 });
  assert.deepEqual(backend.played.map((entry) => entry.cue), ['land.ordinary', 'land.perfect', 'warning.caution']);
  assert.equal(backend.played[2]?.delay, 0.12);

  audio.failure('run-1', 'UNSTABLE_TOWER');
  assert.deepEqual(backend.played.map((entry) => entry.cue), ['land.ordinary', 'land.perfect', 'warning.caution', 'fail.tumble']);
  const beforeResults = backend.played.length;
  audio.results({ runId: 'run-1', score: 20, height: 2, baseline: { bestScore: 10, bestHeight: 1 }, unlocked: 0 });
  assert.equal(backend.played.length, beforeResults + 1);
  assert.equal(backend.played[backend.played.length - 1]?.cue, 'reward');
  audio.results({ runId: 'run-1', score: 30, height: 3, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 1 });
  assert.equal(backend.played.length, beforeResults + 1);
});

test('Results has no reward for equal baseline, load, abandon, stale run or reset', () => {
  const { audio, backend } = runAudio();
  audio.results({ runId: 'run-1', score: 0, height: 0, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 0 });
  audio.results({ runId: 'old-run', score: 99, height: 9, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 1 });
  audio.resetSession();
  audio.results({ runId: 'run-1', score: 99, height: 9, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 1 });
  assert.deepEqual(backend.played, []);
});

test('source cap drops a same-priority landing rather than exceeding six sources', () => {
  const { audio, backend } = runAudio();
  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  audio.landing({ runId: 'run-1', ordinal: 2, grade: 'ordinary', safety: 1 });
  audio.landing({ runId: 'run-1', ordinal: 3, grade: 'ordinary', safety: 1 });
  const debug = audio.debug();
  assert.equal(debug.activeSources, 6);
  audio.landing({ runId: 'run-1', ordinal: 4, grade: 'ordinary', safety: 1 });
  assert.equal(audio.debug().activeSources, 6);
  assert.equal(audio.debug().cuesDropped, 1);
  assert.equal(backend.played.length, 3);
});

test('cleanup removes ended groups and late callbacks cannot remove newer groups', () => {
  const { audio, backend } = runAudio();
  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  const firstId = backend.played[0]?.id;
  assert.ok(firstId !== undefined);
  backend.finish(firstId);
  assert.equal(audio.debug().activeSources, 0);
  audio.landing({ runId: 'run-1', ordinal: 2, grade: 'ordinary', safety: 1 });
  const secondId = backend.played[1]?.id;
  audio.pause();
  assert.equal(audio.debug().activeSources, 0);
  if (secondId !== undefined) backend.finish(secondId);
  assert.equal(audio.debug().activeSources, 0);
});

test('mute and volume zero cancel current cues and suppress future cues', () => {
  const { audio, backend } = runAudio();
  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  const played = backend.played.length;
  audio.setEnabled(false);
  assert.equal(backend.gain, 0);
  audio.landing({ runId: 'run-1', ordinal: 2, grade: 'perfect', safety: 1 });
  assert.equal(backend.played.length, played);
  audio.setEnabled(true);
  audio.setVolume(0);
  audio.landing({ runId: 'run-1', ordinal: 3, grade: 'ordinary', safety: 1 });
  assert.equal(backend.played.length, played);
  assert.equal(backend.gain, 0);
  audio.setVolume(0.5);
  audio.landing({ runId: 'run-1', ordinal: 4, grade: 'ordinary', safety: 1 });
  assert.equal(backend.played.length, played + 1);
  assert.equal(backend.gain, 0.5);
});

test('mute during a tumble cancels all active sources and future cues stay silent', () => {
  const { audio, backend } = runAudio();
  audio.failure('run-1', 'UNSTABLE_TOWER');
  assert.equal(audio.debug().activeSources, 4);
  assert.equal(backend.played.at(-1)?.cue, 'fail.tumble');
  const played = backend.played.length;
  audio.setEnabled(false);
  assert.equal(audio.debug().activeSources, 0);
  audio.setEnabled(true);
  assert.equal(backend.played.length, played);
});

test('pause cancels active sound and resume does not replay missed cues', () => {
  const { audio, backend } = runAudio();
  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  const played = backend.played.length;
  audio.pause();
  assert.equal(audio.debug().activeSources, 0);
  audio.resumeFromGesture(true);
  backend.setStatus('running');
  assert.equal(backend.played.length, played);
  audio.landing({ runId: 'run-1', ordinal: 2, grade: 'perfect', safety: 1 });
  assert.equal(backend.played.length, played + 1);
});

test('pending, unavailable and rejected backend states keep the game path alive', () => {
  const pending = service();
  pending.audio.startRun('run-1');
  pending.backend.setStatus('pending');
  pending.audio.unlockFromGesture(true);
  pending.audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  assert.deepEqual(pending.backend.played, []);
  assert.equal(pending.audio.debug().cuesDropped, 1);

  const unavailable = service();
  unavailable.backend.setStatus('unavailable');
  unavailable.audio.startRun('run-1');
  unavailable.audio.unlockFromGesture(true);
  unavailable.audio.landing({ runId: 'run-1', ordinal: 1, grade: 'perfect', safety: 1 });
  assert.deepEqual(unavailable.backend.played, []);
  assert.equal(unavailable.audio.status, 'unavailable');
});

test('50 run resets retain one context and settle to zero active sources', () => {
  const { audio, backend } = runAudio();
  for (let i = 0; i < 50; i += 1) {
    audio.startRun(`run-${i}`);
    audio.landing({ runId: `run-${i}`, ordinal: 1, grade: 'ordinary', safety: 1 });
    audio.resetSession();
  }
  const debug = audio.debug();
  assert.equal(debug.contextCount, 1);
  assert.equal(debug.activeSources, 0);
  assert.equal(debug.scheduledGroups, 0);
  assert.equal(backend.cancelAllCount >= 50, true);
});

function parityRun(withAudio: boolean): string {
  const engine = new CatTowerEngine();
  engine.start({
    runId: 'parity',
    seed: 42,
    mode: 'assist',
    skinId: 'default',
    reducedMotion: false
  });
  const audio = withAudio ? runAudio().audio : null;
  if (audio !== null) audio.startRun('parity');
  for (let i = 0; i < 260; i += 1) {
    const state = engine.snapshot();
    if (state.phase === 'AIMING' && state.incoming !== undefined) {
      if (Math.abs(state.incoming.x) > 0.1) {
        engine.enqueue({
          type: 'nudge',
          runId: state.runId,
          spawnId: state.incoming.spawnId,
          direction: state.incoming.x > 0 ? -1 : 1
        });
      } else {
        engine.enqueue({
          type: 'drop',
          runId: state.runId,
          spawnId: state.incoming.spawnId
        });
      }
    }
    engine.tick();
    const events = engine.drainEvents();
    if (audio !== null) {
      for (const event of events) {
        if (event.type === 'placementCommitted') {
          audio.landing({ runId: event.runId, ordinal: event.ordinal, grade: event.grade, safety: event.safety });
        } else if (event.type === 'roundFailed') {
          audio.failure(event.runId, event.reason);
        }
      }
    }
  }
  return JSON.stringify(engine.snapshot());
}

test('same-seed engine outcome is independent of emitted audio policy', () => {
  assert.equal(parityRun(false), parityRun(true));
});

test('stale or duplicate Results is a true no-op and never cancels the active run', () => {
  const { audio, backend } = runAudio();
  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  assert.equal(audio.debug().activeSources, 2);
  const cancelsBefore = backend.cancelAllCount;
  audio.results({ runId: 'stale', score: 0, height: 0, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 0 });
  assert.equal(backend.cancelAllCount, cancelsBefore);
  assert.equal(audio.debug().activeSources, 2);

  audio.results({ runId: 'run-1', score: 30, height: 3, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 0 });
  assert.equal(backend.played.at(-1)?.cue, 'reward');
  assert.equal(audio.debug().activeSources, 3);
  const cancelsAfterReward = backend.cancelAllCount;
  audio.results({ runId: 'run-1', score: 99, height: 9, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 1 });
  assert.equal(backend.cancelAllCount, cancelsAfterReward);
  assert.equal(audio.debug().activeSources, 3);
  assert.equal(backend.played.filter((entry) => entry.cue === 'reward').length, 1);
});

test('first valid Results without a reward still cancels a lingering failure cue', () => {
  const { audio } = runAudio();
  audio.failure('run-1', 'UNSTABLE_TOWER');
  assert.equal(audio.debug().activeSources, 4);
  audio.results({ runId: 'run-1', score: 0, height: 0, baseline: { bestScore: 0, bestHeight: 0 }, unlocked: 0 });
  assert.equal(audio.debug().activeSources, 0);
});

test('untrusted activation never reaches the audio backend', () => {
  const { audio, backend } = service();
  audio.startRun('run-1');
  audio.unlockFromGesture(false);
  assert.equal(backend.contextCount, 0);
  assert.equal(audio.status, 'idle');
  audio.unlockFromGesture(true);
  assert.equal(backend.contextCount, 1);
  assert.equal(audio.status, 'running');
});
