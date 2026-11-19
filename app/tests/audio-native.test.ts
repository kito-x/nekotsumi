import assert from 'node:assert/strict';
import test from 'node:test';
import { AudioService, WebAudioBackend } from '../src/platform/audio.js';
import { scheduleCue } from '../src/platform/audio-synthesis.js';

/**
 * Controllable native-context stub. It reproduces promise ownership, graph
 * connections and synchronous throws at the Web Audio boundary. It is not a
 * browser, device, heap or audible-output measurement.
 */
class StubParam {
  value = 0;
  setValueAtTime(value: number, _time: number): StubParam {
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number, _time: number): StubParam {
    this.value = value;
    return this;
  }
}

class StubNode {
  readonly gain = new StubParam();
  readonly frequency = new StubParam();
  readonly connections: unknown[] = [];
  type = 'sine';
  buffer: AudioBuffer | null = null;
  onended: (() => void) | null = null;
  disconnects = 0;
  starts = 0;
  stops = 0;
  stopped = false;
  failNextStop = false;
  throwOnDisconnect = false;

  constructor(readonly kind: string) {}

  connect(target: unknown): void {
    this.connections.push(target);
  }
  disconnect(): void {
    this.disconnects += 1;
    if (this.throwOnDisconnect) throw new Error('disconnect failed');
  }
  start(_when?: number, _offset?: number, _duration?: number): void {
    this.starts += 1;
  }
  stop(_when?: number): void {
    this.stops += 1;
    if (this.failNextStop) {
      this.failNextStop = false;
      throw new Error('stop failed');
    }
    this.stopped = true;
  }
}

interface PendingPromise {
  readonly resolve: () => void;
  readonly reject: (error?: unknown) => void;
}

class StubContext {
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  sampleRate = 44100;
  readonly destination = { kind: 'destination' };
  readonly nodes: StubNode[] = [];
  readonly resumes: PendingPromise[] = [];
  readonly suspends: PendingPromise[] = [];
  readonly closes: PendingPromise[] = [];
  failGain = false;
  failMasterConnect = false;
  failMasterGainWrite = false;
  failBufferSource = false;
  failOscillatorAfter = Number.POSITIVE_INFINITY;
  failOscillatorAutomation = false;
  failOscillatorConnect = false;
  failOscillatorStart = false;
  failFirstSourceStop = false;
  failFirstNoiseStop = false;
  private oscillatorCount = 0;
  private gainCount = 0;

  private node(kind: string): StubNode {
    const node = new StubNode(kind);
    this.nodes.push(node);
    return node;
  }
  createGain(): StubNode {
    if (this.failGain) throw new Error('gain setup failed');
    const node = this.node('gain');
    this.gainCount += 1;
    if (this.gainCount === 1 && this.failMasterGainWrite) {
      this.failMasterGainWrite = false;
      node.gain.setValueAtTime = () => {
        throw new Error('master gain write failed');
      };
    }
    if (this.failMasterConnect) {
      this.failMasterConnect = false;
      node.connect = () => {
        throw new Error('connect failed');
      };
    }
    return node;
  }
  createOscillator(): StubNode {
    this.oscillatorCount += 1;
    if (this.oscillatorCount >= this.failOscillatorAfter) throw new Error('oscillator setup failed');
    const node = this.node('oscillator');
    if (this.failOscillatorAutomation) {
      this.failOscillatorAutomation = false;
      node.frequency.setValueAtTime = () => {
        throw new Error('automation failed');
      };
    }
    if (this.failOscillatorConnect) {
      this.failOscillatorConnect = false;
      node.connect = () => {
        throw new Error('oscillator connect failed');
      };
    }
    if (this.failOscillatorStart) {
      this.failOscillatorStart = false;
      node.start = () => {
        throw new Error('start failed');
      };
    }
    if (this.failFirstSourceStop) {
      this.failFirstSourceStop = false;
      node.failNextStop = true;
    }
    return node;
  }
  createBufferSource(): StubNode {
    if (this.failBufferSource) throw new Error('buffer setup failed');
    const node = this.node('buffer');
    if (this.failFirstNoiseStop) {
      this.failFirstNoiseStop = false;
      node.failNextStop = true;
    }
    return node;
  }
  createBiquadFilter(): StubNode {
    return this.node('filter');
  }
  createBuffer(_channels: number, length: number, _sampleRate: number): { getChannelData: () => Float32Array } {
    return { getChannelData: () => new Float32Array(length) };
  }
  resume(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resumes.push({ resolve, reject });
    });
  }
  suspend(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.suspends.push({ resolve, reject });
    });
  }
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.closes.push({ resolve, reject });
    });
  }
}

function contextOf(context: StubContext): AudioContext {
  return context as unknown as AudioContext;
}

function backendFor(context: StubContext): WebAudioBackend {
  return new WebAudioBackend({ contextFactory: () => contextOf(context) });
}

function startedSources(context: StubContext): StubNode[] {
  return context.nodes.filter((node) => node.starts > 0);
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function settleClose(context: StubContext, options: { closed?: boolean; reject?: boolean } = {}): Promise<void> {
  const pending = context.closes[0];
  assert.ok(pending);
  if (options.closed !== false) context.state = 'closed';
  if (options.reject === true) pending.reject(new Error('close rejected'));
  else pending.resolve();
  await flush();
}

test('native backend keeps one unresolved resume across 50 cancel/unlock cycles', () => {
  const context = new StubContext();
  const backend = backendFor(context);
  backend.unlock();
  for (let i = 0; i < 50; i += 1) {
    backend.cancelAll();
    backend.unlock();
  }
  assert.equal(context.resumes.length, 1);
  assert.equal(backend.contextCount, 1);
  assert.equal(backend.status(), 'pending');
});

test('old resume completion cannot clear new intent or restore running', async () => {
  const context = new StubContext();
  const backend = backendFor(context);
  backend.unlock();
  backend.cancelAll();
  backend.suspend();
  backend.unlock();
  assert.equal(context.resumes.length, 1);

  context.state = 'running';
  const pending = context.resumes[0];
  assert.ok(pending);
  backend.setOutputGain(0);
  pending.resolve();
  await flush();
  assert.equal(backend.status(), 'pending');
  const master = context.nodes.find((node) => node.kind === 'gain');
  assert.ok(master);
  assert.equal(master.gain.value, 0);

  backend.unlock();
  assert.equal(context.resumes.length, 1);
  assert.equal(backend.status(), 'running');
});

test('rejected resume leaves pending status and a fresh gesture retries once', async () => {
  const context = new StubContext();
  const backend = backendFor(context);
  backend.unlock();
  const first = context.resumes[0];
  assert.ok(first);
  first.reject(new Error('autoplay blocked'));
  await flush();
  assert.equal(backend.status(), 'pending');

  backend.unlock();
  assert.equal(context.resumes.length, 2);
  context.state = 'running';
  const second = context.resumes[1];
  assert.ok(second);
  second.resolve();
  await flush();
  assert.equal(backend.status(), 'running');
});

test('late resume completion after dispose does not touch closed status', async () => {
  const context = new StubContext();
  const backend = backendFor(context);
  backend.unlock();
  const pending = context.resumes[0];
  assert.ok(pending);
  backend.dispose();
  assert.equal(backend.status(), 'closed');
  assert.equal(context.closes.length, 1);

  context.state = 'running';
  pending.resolve();
  await flush();
  assert.equal(backend.status(), 'closed');
});

test('suspension rejection and synchronous throw stay contained and pending', async () => {
  const context = new StubContext();
  context.state = 'running';
  const backend = backendFor(context);
  backend.unlock();
  assert.equal(backend.status(), 'running');

  backend.suspend();
  assert.equal(backend.status(), 'pending');
  const pending = context.suspends[0];
  assert.ok(pending);
  pending.reject(new Error('suspend rejected'));
  await flush();
  assert.equal(backend.status(), 'pending');

  context.suspend = () => {
    throw new Error('suspend threw');
  };
  assert.doesNotThrow(() => backend.suspend());
  assert.equal(backend.status(), 'pending');
});

test('failed master setup waits for confirmed close before replacement', async () => {
  const failed = new StubContext();
  failed.failGain = true;
  const live = new StubContext();
  live.state = 'running';
  let calls = 0;
  const backend = new WebAudioBackend({
    contextFactory: () => {
      const context = calls === 0 ? failed : live;
      calls += 1;
      return contextOf(context);
    }
  });

  backend.unlock();
  assert.equal(backend.status(), 'unavailable');
  assert.equal(backend.contextCount, 1);
  assert.equal(failed.closes.length, 1);
  assert.equal(backend.play('land.perfect', 0, 1, () => undefined), false);

  for (let i = 0; i < 50; i += 1) backend.unlock();
  assert.equal(calls, 1);
  assert.notEqual(failed.state, 'closed');
  assert.equal(backend.status(), 'unavailable');

  await settleClose(failed);
  backend.unlock();
  assert.equal(backend.contextCount, 2);
  assert.equal(backend.status(), 'running');
  assert.equal(backend.play('land.perfect', 0, 1, () => undefined), true);
});

test('factory throw and unusable closed context report unavailable without throwing', () => {
  const throwing = new WebAudioBackend({
    contextFactory: () => {
      throw new Error('no audio');
    }
  });
  assert.doesNotThrow(() => throwing.unlock());
  assert.equal(throwing.status(), 'unavailable');
  assert.equal(throwing.contextCount, 0);

  const closedContext = new StubContext();
  closedContext.state = 'closed';
  const backend = backendFor(closedContext);
  assert.doesNotThrow(() => backend.unlock());
  assert.equal(backend.status(), 'unavailable');
  assert.equal(closedContext.closes.length, 0);
});

test('a throwing status listener cannot break unlock', () => {
  const context = new StubContext();
  const backend = backendFor(context);
  backend.setStatusListener(() => {
    throw new Error('status UI failed');
  });
  assert.doesNotThrow(() => backend.unlock());
  assert.equal(backend.status(), 'pending');
  assert.equal(context.resumes.length, 1);
});

test('natural cue end disconnects the whole owned graph and notifies once', () => {
  const context = new StubContext();
  let ended = 0;
  const group = scheduleCue(
    contextOf(context) as unknown as BaseAudioContext,
    context.destination as unknown as AudioNode,
    'land.ordinary',
    0,
    () => {
      ended += 1;
    }
  );
  const sources = startedSources(context);
  assert.equal(sources.length, 2);
  assert.equal(group.sources, 2);
  assert.equal(context.nodes.length, 5);

  for (const source of sources) source.onended?.();
  assert.equal(ended, 1);
  assert.equal(context.nodes.every((node) => node.onended === null), true);
  assert.equal(context.nodes.every((node) => node.disconnects >= 1), true);
  group.cancel();
  assert.equal(ended, 1);
});

test('cancel is idempotent and captured late callbacks cannot notify twice', () => {
  const context = new StubContext();
  let ended = 0;
  const group = scheduleCue(
    contextOf(context) as unknown as BaseAudioContext,
    context.destination as unknown as AudioNode,
    'fail.tumble',
    0,
    () => {
      ended += 1;
    }
  );
  const sources = startedSources(context);
  assert.equal(sources.length, 4);
  const lateHandlers = sources.map((source) => source.onended);
  group.cancel();
  group.cancel();
  assert.equal(ended, 1);
  assert.equal(context.nodes.every((node) => node.onended === null), true);
  assert.equal(sources.every((source) => source.stops === 2 && source.disconnects === 1), true);

  for (const handler of lateHandlers) handler?.();
  assert.equal(ended, 1);
});

test('one throwing node disconnect still cleans the rest of the graph', () => {
  const context = new StubContext();
  let ended = 0;
  scheduleCue(
    contextOf(context) as unknown as BaseAudioContext,
    context.destination as unknown as AudioNode,
    'land.ordinary',
    0,
    () => {
      ended += 1;
    }
  );
  const first = context.nodes[0];
  assert.ok(first);
  first.throwOnDisconnect = true;
  for (const source of startedSources(context)) source.onended?.();
  assert.equal(ended, 1);
  assert.equal(context.nodes.every((node) => node.disconnects >= 1), true);
  assert.equal(context.nodes.every((node) => node.onended === null), true);
});

test('mid-schedule creation failure stops and disconnects the started source', () => {
  const context = new StubContext();
  context.state = 'running';
  context.failBufferSource = true;
  const backend = backendFor(context);
  backend.unlock();
  assert.equal(backend.status(), 'running');

  assert.equal(backend.play('land.ordinary', 0, 1, () => undefined), false);
  const sources = startedSources(context);
  assert.equal(sources.length, 1);
  assert.equal(sources.every((source) => source.stops >= 1 && source.disconnects >= 1), true);
  assert.equal(sources.every((source) => source.onended === null), true);

  context.failBufferSource = false;
  assert.equal(backend.play('land.ordinary', 0, 2, () => undefined), true);
});

test('service accounting stays truthful after a failed native schedule', () => {
  const context = new StubContext();
  context.state = 'running';
  context.failBufferSource = true;
  const backend = backendFor(context);
  const audio = new AudioService({ backend });
  audio.startRun('run-1');
  audio.unlockFromGesture(true);
  assert.equal(audio.status, 'running');

  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  assert.equal(audio.debug().activeSources, 0);
  assert.equal(audio.debug().scheduledGroups, 0);
  assert.equal(audio.debug().cuesDropped, 1);

  context.failBufferSource = false;
  audio.landing({ runId: 'run-1', ordinal: 2, grade: 'perfect', safety: 1 });
  assert.equal(audio.debug().activeSources, 2);
  assert.equal(audio.debug().scheduledGroups, 1);
});

test('oscillator failure after a started source rolls back the whole cue', () => {
  const context = new StubContext();
  context.state = 'running';
  context.failOscillatorAfter = 2;
  const backend = backendFor(context);
  backend.unlock();

  assert.equal(backend.play('land.perfect', 0, 1, () => undefined), false);
  const sources = startedSources(context);
  assert.equal(sources.length, 1);
  assert.equal(sources.every((source) => source.stops >= 1 && source.disconnects >= 1), true);
  assert.equal(sources.every((source) => source.onended === null), true);

  context.failOscillatorAfter = Number.POSITIVE_INFINITY;
  assert.equal(backend.play('land.perfect', 0, 2, () => undefined), true);
});

function assertSourceRollback(context: StubContext, ended: number): void {
  const sources = context.nodes.filter((node) => node.kind === 'oscillator' || node.kind === 'buffer');
  assert.equal(sources.length, 1);
  const source = sources[0];
  assert.ok(source);
  assert.equal(ended, 0);
  assert.ok(source.stops >= 1);
  assert.equal(source.disconnects, 1);
  assert.equal(source.onended, null);
  assert.equal(context.nodes.every((node) => node.disconnects >= 1), true);
}

function scheduleFailing(context: StubContext): number {
  let ended = 0;
  assert.throws(() => scheduleCue(
    contextOf(context) as unknown as BaseAudioContext,
    context.destination as unknown as AudioNode,
    'land.perfect',
    0,
    () => {
      ended += 1;
    }
  ));
  return ended;
}

test('scheduled stop throw after start is retried until the source stops', () => {
  const context = new StubContext();
  context.failFirstSourceStop = true;
  let ended = 0;
  assert.throws(() => scheduleCue(
    contextOf(context) as unknown as BaseAudioContext,
    context.destination as unknown as AudioNode,
    'land.ordinary',
    0,
    () => {
      ended += 1;
    }
  ));
  const source = startedSources(context)[0];
  assert.ok(source);
  assert.equal(ended, 0);
  assert.equal(source.stops, 2);
  assert.equal(source.stopped, true);
  assert.equal(source.disconnects, 1);
  assert.equal(source.onended, null);
});

test('noise scheduled stop throw after start is retried until the source stops', () => {
  const context = new StubContext();
  context.failFirstNoiseStop = true;
  let ended = 0;
  assert.throws(() => scheduleCue(
    contextOf(context) as unknown as BaseAudioContext,
    context.destination as unknown as AudioNode,
    'warning.caution',
    0,
    () => {
      ended += 1;
    }
  ));
  const source = context.nodes.find((node) => node.kind === 'buffer');
  assert.ok(source);
  assert.equal(ended, 0);
  assert.equal(source.stops, 2);
  assert.equal(source.stopped, true);
  assert.equal(source.disconnects, 1);
  assert.equal(source.onended, null);
});

test('automation failure after source creation is stopped and disconnected', () => {
  const context = new StubContext();
  context.failOscillatorAutomation = true;
  assertSourceRollback(context, scheduleFailing(context));
});

test('connect failure after source creation is stopped and disconnected', () => {
  const context = new StubContext();
  context.failOscillatorConnect = true;
  assertSourceRollback(context, scheduleFailing(context));
});

test('start failure after source creation is stopped and disconnected', () => {
  const context = new StubContext();
  context.failOscillatorStart = true;
  assertSourceRollback(context, scheduleFailing(context));
});

test('resetSession contains a synchronous suspend throw and stays pending', () => {
  const context = new StubContext();
  context.state = 'running';
  context.suspend = () => {
    throw new Error('suspend failed');
  };
  const backend = backendFor(context);
  const audio = new AudioService({ backend });
  audio.startRun('run-1');
  audio.unlockFromGesture(true);
  assert.doesNotThrow(() => audio.resetSession());
  assert.equal(audio.status, 'pending');
  assert.equal(audio.debug().activeSources, 0);
});

test('master connect throw is unavailable, closes its context and retries', async () => {
  const failed = new StubContext();
  failed.failMasterConnect = true;
  failed.state = 'running';
  const live = new StubContext();
  live.state = 'running';
  let calls = 0;
  const backend = new WebAudioBackend({
    contextFactory: () => {
      const context = calls === 0 ? failed : live;
      calls += 1;
      return contextOf(context);
    }
  });

  assert.doesNotThrow(() => backend.unlock());
  assert.equal(backend.status(), 'unavailable');
  assert.equal(backend.contextCount, 1);
  assert.equal(failed.closes.length, 1);
  const master = failed.nodes[0];
  assert.ok(master);
  assert.equal(master.disconnects, 1);
  assert.equal(backend.play('land.ordinary', 0, 1, () => undefined), false);

  for (let i = 0; i < 10; i += 1) backend.unlock();
  assert.equal(calls, 1);
  await settleClose(failed);
  backend.unlock();
  assert.equal(backend.contextCount, 2);
  assert.equal(backend.status(), 'running');
  assert.equal(backend.play('land.ordinary', 0, 1, () => undefined), true);
});

test('synchronous resume throw is contained and a later activation can run', () => {
  const context = new StubContext();
  context.resume = () => {
    throw new Error('resume threw');
  };
  const backend = backendFor(context);
  assert.doesNotThrow(() => backend.unlock());
  assert.equal(backend.status(), 'pending');
  context.state = 'running';
  backend.unlock();
  assert.equal(backend.status(), 'running');
});

test('rejected close during dispose stays contained and closed', async () => {
  const context = new StubContext();
  context.state = 'running';
  context.close = () => Promise.reject(new Error('close rejected'));
  const backend = backendFor(context);
  backend.unlock();
  assert.doesNotThrow(() => backend.dispose());
  await flush();
  assert.equal(backend.status(), 'closed');
});

test('rejected or throwing close keeps unavailable and blocks replacement', async () => {
  const rejected = new StubContext();
  rejected.failGain = true;
  let rejectedCalls = 0;
  const rejectedBackend = new WebAudioBackend({
    contextFactory: () => {
      rejectedCalls += 1;
      return contextOf(rejected);
    }
  });
  rejectedBackend.unlock();
  await settleClose(rejected, { closed: false, reject: true });
  for (let i = 0; i < 10; i += 1) rejectedBackend.unlock();
  assert.equal(rejectedCalls, 1);
  assert.equal(rejectedBackend.contextCount, 1);
  assert.equal(rejectedBackend.status(), 'unavailable');

  const throwing = new StubContext();
  throwing.failGain = true;
  throwing.close = () => {
    throw new Error('close threw');
  };
  let throwingCalls = 0;
  const throwingBackend = new WebAudioBackend({
    contextFactory: () => {
      throwingCalls += 1;
      return contextOf(throwing);
    }
  });
  assert.doesNotThrow(() => throwingBackend.unlock());
  for (let i = 0; i < 10; i += 1) throwingBackend.unlock();
  assert.equal(throwingCalls, 1);
  assert.equal(throwingBackend.status(), 'unavailable');
});

test('a close that resolves without closing still blocks replacement', async () => {
  const stuck = new StubContext();
  stuck.failGain = true;
  let calls = 0;
  const backend = new WebAudioBackend({
    contextFactory: () => {
      calls += 1;
      return contextOf(stuck);
    }
  });
  backend.unlock();
  await settleClose(stuck, { closed: false });
  for (let i = 0; i < 10; i += 1) backend.unlock();
  assert.equal(calls, 1);
  assert.equal(backend.status(), 'unavailable');
});

test('dispose guards a late failed-context close completion', async () => {
  const failed = new StubContext();
  failed.failGain = true;
  let calls = 0;
  const backend = new WebAudioBackend({
    contextFactory: () => {
      calls += 1;
      return contextOf(failed);
    }
  });
  backend.unlock();
  assert.equal(failed.closes.length, 1);
  backend.dispose();
  assert.equal(backend.status(), 'closed');
  await settleClose(failed);
  for (let i = 0; i < 10; i += 1) backend.unlock();
  assert.equal(calls, 1);
  assert.equal(backend.status(), 'closed');
});

test('master-only gain write failure is unavailable and blocks cue acceptance', async () => {
  const failed = new StubContext();
  failed.state = 'running';
  failed.failMasterGainWrite = true;
  const live = new StubContext();
  live.state = 'running';
  let calls = 0;
  const backend = new WebAudioBackend({
    contextFactory: () => {
      const context = calls === 0 ? failed : live;
      calls += 1;
      return contextOf(context);
    }
  });

  assert.doesNotThrow(() => backend.unlock());
  assert.equal(backend.status(), 'unavailable');
  assert.equal(backend.contextCount, 1);
  assert.equal(failed.closes.length, 1);
  const master = failed.nodes[0];
  assert.ok(master);
  assert.equal(master.gain.value, 0);
  assert.equal(backend.play('land.perfect', 0, 1, () => undefined), false);
  backend.setOutputGain(0.2);
  assert.equal(backend.status(), 'unavailable');

  for (let i = 0; i < 10; i += 1) backend.unlock();
  assert.equal(calls, 1);
  await settleClose(failed);
  backend.unlock();
  assert.equal(backend.contextCount, 2);
  assert.equal(backend.status(), 'running');
  assert.equal(backend.play('land.perfect', 0, 1, () => undefined), true);
});

test('output failure clears service accounting and rejects later cues', () => {
  const context = new StubContext();
  context.state = 'running';
  context.failMasterGainWrite = true;
  const backend = backendFor(context);
  const audio = new AudioService({ backend });
  audio.startRun('run-1');
  assert.doesNotThrow(() => audio.unlockFromGesture(true));
  assert.equal(audio.status, 'unavailable');
  assert.equal(audio.debug().activeSources, 0);
  audio.landing({ runId: 'run-1', ordinal: 1, grade: 'ordinary', safety: 1 });
  assert.deepEqual(audio.debug().cuesPlayed, {});
  assert.equal(audio.debug().cuesDropped, 1);
});

test('dispose contains a synchronous close throw and reports closed', () => {
  const context = new StubContext();
  context.state = 'running';
  context.close = () => {
    throw new Error('close failed');
  };
  const backend = backendFor(context);
  backend.unlock();
  assert.doesNotThrow(() => backend.dispose());
  assert.equal(backend.status(), 'closed');
});

test('natural backend completion removes the group and frees its id', () => {
  const context = new StubContext();
  context.state = 'running';
  const backend = backendFor(context);
  backend.unlock();
  let ended = 0;
  assert.equal(backend.play('land.ordinary', 0, 1, () => {
    ended += 1;
  }), true);
  for (const source of startedSources(context)) source.onended?.();
  assert.equal(ended, 1);
  assert.equal(backend.play('land.perfect', 0, 1, () => undefined), true);
  backend.cancelAll();
});
