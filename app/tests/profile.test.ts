import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ProfileService,
  createDefaultProfile,
  deriveUnlocked,
  validateProfile
} from '../src/platform/profile.js';
import type { PlacementCommit, ProfileV1 } from '../src/platform/profile.js';
import type { StorageAdapter } from '../src/platform/storage.js';

class FakeStorage implements StorageAdapter {
  value: string | null;
  readonly writes: string[] = [];
  throwOnRead = false;
  throwOnWrite = false;

  constructor(value: string | null = null) {
    this.value = value;
  }

  read(): string | null {
    if (this.throwOnRead) throw new Error('read failed');
    return this.value;
  }

  write(value: string): void {
    if (this.throwOnWrite) throw new Error('write failed');
    this.writes.push(value);
    this.value = value;
  }
}

class FakeLocks {
  available = true;
  requests = 0;

  request(
    _name: string,
    _options: unknown,
    callback: (lock: object | null) => Promise<void>
  ): Promise<void> {
    this.requests += 1;
    if (!this.available) {
      void callback(null);
      return Promise.resolve();
    }
    const lock = { name: 'fake-lock' };
    void callback(lock);
    return new Promise<void>(() => undefined);
  }
}

function profile(overrides: Partial<ProfileV1> = {}): ProfileV1 {
  return { ...createDefaultProfile(), ...overrides };
}

function encoded(overrides: Partial<ProfileV1> = {}): string {
  return JSON.stringify(profile(overrides));
}

function commit(
  runId: string,
  ordinal: number,
  options: Partial<PlacementCommit> = {}
): PlacementCommit {
  return {
    runId,
    ordinal,
    grade: 'perfect',
    totalScore: ordinal * 10,
    perfectCount: ordinal,
    mode: 'classic',
    balanceVersion: 1,
    ...options
  };
}

function fakeLocksManager(locks: FakeLocks): LockManager {
  return locks as unknown as LockManager;
}

async function ownerService(
  storage: FakeStorage = new FakeStorage(encoded()),
  locks = new FakeLocks(),
  onChange?: (view: ReturnType<ProfileService['view']>) => void
): Promise<ProfileService> {
  return ProfileService.create({
    storage,
    locks: fakeLocksManager(locks),
    ...(onChange === undefined ? {} : { onChange })
  });
}

test('profile validation: empty, defaults, extra keys and missing settings', () => {
  assert.equal(validateProfile(null).kind, 'empty');

  const valid = validateProfile(encoded());
  assert.equal(valid.kind, 'ok');
  if (valid.kind !== 'ok') return;
  assert.equal(valid.profile.settings.volume, 0.6);
  assert.equal(valid.profile.settings.reducedMotion, 'system');
  assert.equal(valid.profile.records['classic@1']?.bestScore, 0);

  const minimal = validateProfile('{"schemaVersion":1}');
  assert.equal(minimal.kind, 'ok');
  if (minimal.kind !== 'ok') return;
  assert.equal(minimal.profile.revision, 0);
  assert.equal(minimal.profile.settings.soundEnabled, true);
  assert.equal(minimal.profile.records['assist@1']?.bestHeight, 0);

  const extra = validateProfile(JSON.stringify({ ...JSON.parse(encoded()), foreign: 'ignored' }));
  assert.equal(extra.kind, 'ok');
  if (extra.kind !== 'ok') return;
  assert.equal(Object.hasOwn(extra.profile, 'foreign'), false);
});

test('profile validation: counters, volume, enums and document classes', () => {
  const badCounter = profile({
    stats: { roundsStarted: -1, totalPlacements: 0, totalPerfect: 0 }
  });
  assert.equal(validateProfile(JSON.stringify(badCounter)).kind, 'invalid');
  assert.equal(
    validateProfile(JSON.stringify(profile({ stats: { roundsStarted: 1.5, totalPlacements: 0, totalPerfect: 0 } }))).kind,
    'invalid'
  );
  assert.equal(
    validateProfile(JSON.stringify(profile({ stats: { roundsStarted: Number.MAX_SAFE_INTEGER + 1, totalPlacements: 0, totalPerfect: 0 } }))).kind,
    'invalid'
  );

  const rawVolume = { ...JSON.parse(encoded()) };
  rawVolume.settings.volume = 1.7;
  const highVolume = validateProfile(JSON.stringify(rawVolume));
  assert.equal(highVolume.kind, 'ok');
  if (highVolume.kind === 'ok') assert.equal(highVolume.profile.settings.volume, 1);

  rawVolume.settings.volume = -0.2;
  const lowVolume = validateProfile(JSON.stringify(rawVolume));
  assert.equal(lowVolume.kind, 'ok');
  if (lowVolume.kind === 'ok') assert.equal(lowVolume.profile.settings.volume, 0);

  rawVolume.settings.volume = Number.NaN;
  assert.equal(validateProfile(JSON.stringify(rawVolume)).kind, 'invalid');
  rawVolume.settings.volume = '0.5';
  assert.equal(validateProfile(JSON.stringify(rawVolume)).kind, 'invalid');

  rawVolume.settings.reducedMotion = 'sometimes';
  assert.equal(validateProfile(JSON.stringify(rawVolume)).kind, 'invalid');
  rawVolume.settings.reducedMotion = 'system';
  rawVolume.settings.preferredMode = 'turbo';
  assert.equal(validateProfile(JSON.stringify(rawVolume)).kind, 'invalid');

  assert.equal(validateProfile('[]').kind, 'invalid');
  assert.equal(validateProfile('null').kind, 'invalid');
  assert.equal(validateProfile('{"schemaVersion":2}').kind, 'future');
  assert.equal(validateProfile('{"schemaVersion":0}').kind, 'invalid');
  assert.equal(validateProfile('not json').kind, 'invalid');
  assert.equal(validateProfile('x'.repeat(65_537)).kind, 'oversized');
  assert.equal(validateProfile('x'.repeat(65_536)).kind, 'invalid');
});

test('profile validation: historical namespaces and skin normalization', () => {
  const historical = profile({
    records: {
      'classic@1': { bestHeight: 2, bestScore: 15 },
      'classic@2': { bestHeight: 9, bestScore: 90 },
      'assist@1': { bestHeight: 1, bestScore: 15 }
    },
    selectedSkin: 'ginger',
    stats: { roundsStarted: 1, totalPlacements: 0, totalPerfect: 0 }
  });
  const parsedHistorical = validateProfile(JSON.stringify(historical));
  assert.equal(parsedHistorical.kind, 'ok');
  if (parsedHistorical.kind === 'ok') {
    assert.equal(parsedHistorical.profile.records['classic@2']?.bestScore, 90);
    assert.equal(parsedHistorical.profile.selectedSkin, 'default');
  }

  const unknownMode = profile({
    records: {
      'turbo@1': { bestHeight: 1, bestScore: 10 }
    }
  });
  assert.equal(validateProfile(JSON.stringify(unknownMode)).kind, 'invalid');

  const unlocked = profile({
    selectedSkin: 'calico',
    stats: { roundsStarted: 1, totalPlacements: 150, totalPerfect: 0 }
  });
  const parsedUnlocked = validateProfile(JSON.stringify(unlocked));
  assert.equal(parsedUnlocked.kind, 'ok');
  if (parsedUnlocked.kind === 'ok') {
    assert.equal(parsedUnlocked.profile.selectedSkin, 'calico');
    assert.deepEqual(deriveUnlocked(150), ['default', 'ginger', 'tuxedo', 'calico']);
  }
});

test('profile service: start + three commits make four writes and correct totals', async () => {
  const storage = new FakeStorage(encoded());
  const locks = new FakeLocks();
  const service = await ownerService(storage, locks);
  assert.equal(service.saveMode, 'owner');
  assert.equal(locks.requests, 1);

  service.startRun('run-1', 'classic');
  const events: PlacementCommit[] = [
    commit('run-1', 1, { grade: 'perfect', totalScore: 15 }),
    commit('run-1', 2, { grade: 'ordinary', totalScore: 25 }),
    commit('run-1', 3, { grade: 'perfect', totalScore: 42 })
  ];
  for (const event of events) service.commitPlacement(event);

  const view = service.getProfile();
  assert.equal(view.stats.roundsStarted, 1);
  assert.equal(view.stats.totalPlacements, 3);
  assert.equal(view.stats.totalPerfect, 2);
  assert.equal(view.revision, 4);
  assert.equal(storage.writes.length, 4);
  assert.equal(view.records['classic@1']?.bestHeight, 3);
  assert.equal(view.records['classic@1']?.bestScore, 42);
  assert.equal(service.lockRequestCount, 1);
});

test('profile service: duplicate, older, gap and stale run commits do not write', async () => {
  const storage = new FakeStorage(encoded());
  const service = await ownerService(storage);
  service.startRun('run-a', 'classic');
  service.commitPlacement(commit('run-a', 1));
  const writes = storage.writes.length;

  service.commitPlacement(commit('run-a', 1));
  service.commitPlacement(commit('run-a', 0));
  service.commitPlacement(commit('run-a', 3));
  service.commitPlacement(commit('old-run', 2));
  assert.equal(storage.writes.length, writes);

  service.startRun('run-b', 'assist');
  service.commitPlacement(commit('run-a', 2));
  assert.equal(storage.writes.length, writes + 1);
  assert.equal(service.getProfile().lastApplied?.runId, 'run-b');
});

test('profile service: records are mode-separated and perfect counting is exact', async () => {
  const storage = new FakeStorage(encoded());
  const service = await ownerService(storage);
  service.startRun('classic-run', 'classic');
  service.commitPlacement(commit('classic-run', 1, { grade: 'perfect', totalScore: 15 }));
  service.startRun('assist-run', 'assist');
  service.commitPlacement(commit('assist-run', 1, { mode: 'assist', grade: 'ordinary', totalScore: 10 }));

  const view = service.getProfile();
  assert.equal(view.records['classic@1']?.bestScore, 15);
  assert.equal(view.records['assist@1']?.bestScore, 10);
  assert.equal(view.stats.totalPerfect, 1);
});

test('profile service: unlock thresholds return each ID once', async () => {
  const run = async (startTotal: number) => {
    const seeded = profile({
      stats: { roundsStarted: 1, totalPlacements: startTotal, totalPerfect: 0 }
    });
    const service = await ownerService(new FakeStorage(JSON.stringify(seeded)));
    service.startRun(`run-${startTotal}`, 'classic');
    const unlocked = service.commitPlacement(
      commit(`run-${startTotal}`, 1, { totalScore: 10 })
    );
    return { unlocked: [...unlocked], total: service.getProfile().stats.totalPlacements };
  };

  assert.deepEqual(await run(24), { unlocked: ['ginger'], total: 25 });
  assert.deepEqual(await run(74), { unlocked: ['tuxedo'], total: 75 });
  assert.deepEqual(await run(149), { unlocked: ['calico'], total: 150 });
});

test('profile service: load at 160 exposes all skins with no new toasts', async () => {
  const loaded = profile({ stats: { roundsStarted: 4, totalPlacements: 160, totalPerfect: 4 } });
  const service = await ownerService(new FakeStorage(JSON.stringify(loaded)));
  assert.deepEqual(service.unlocked, ['default', 'ginger', 'tuxedo', 'calico']);
  assert.equal(service.revision, 0);
});

test('profile service: write failure keeps memory and never retries', async () => {
  const storage = new FakeStorage(encoded());
  const service = await ownerService(storage);
  service.startRun('run-fail', 'classic');
  storage.throwOnWrite = true;
  service.updateSettings({ highContrast: true });
  assert.equal(service.saveMode, 'temporary-write-failed');
  assert.equal(service.getProfile().settings.highContrast, true);
  const writes = storage.writes.length;
  service.updateSettings({ preferredMode: 'assist' });
  assert.equal(storage.writes.length, writes);
  assert.equal(service.getProfile().settings.preferredMode, 'assist');
});

test('profile service: unreadable data is preserved and never overwritten', async () => {
  const storage = new FakeStorage('{broken');
  const service = await ownerService(storage);
  assert.equal(service.saveMode, 'temporary-unreadable');
  service.startRun('run-invalid', 'classic');
  service.updateSettings({ highContrast: true });
  service.selectSkin('default');
  assert.equal(storage.writes.length, 0);
  assert.equal(storage.value, '{broken');
});

test('profile service: other-tab reads but never writes', async () => {
  const stored = profile({
    stats: { roundsStarted: 2, totalPlacements: 30, totalPerfect: 3 },
    records: {
      'classic@1': { bestHeight: 4, bestScore: 51 },
      'assist@1': { bestHeight: 2, bestScore: 32 }
    }
  });
  const storage = new FakeStorage(JSON.stringify(stored));
  const locks = new FakeLocks();
  locks.available = false;
  const service = await ownerService(storage, locks);
  assert.equal(service.saveMode, 'other-tab');
  assert.equal(service.getProfile().stats.totalPlacements, 30);
  service.startRun('run-second-tab', 'classic');
  service.updateSettings({ preferredMode: 'assist' });
  service.selectSkin('ginger');
  assert.equal(storage.writes.length, 0);
  assert.equal(storage.value, JSON.stringify(stored));
});

test('profile service: retry acquires lock, reloads saved progress and replaces temporary memory', async () => {
  const stored = profile({
    stats: { roundsStarted: 2, totalPlacements: 26, totalPerfect: 2 }
  });
  const storage = new FakeStorage(JSON.stringify(stored));
  const locks = new FakeLocks();
  locks.available = false;
  const service = await ownerService(storage, locks);
  assert.equal(service.saveMode, 'other-tab');
  service.startRun('temporary-run', 'assist');
  assert.equal(service.hasTemporaryProgress, true);
  locks.available = true;
  assert.equal(await service.retrySaveAccess(), 'ok');
  assert.equal(service.saveMode, 'owner');
  assert.equal(service.getProfile().stats.roundsStarted, 2);
  assert.equal(service.hasTemporaryProgress, false);
});

test('profile service: retry with valid storage makes no write until the next transaction', async () => {
  const stored = profile({
    stats: { roundsStarted: 2, totalPlacements: 26, totalPerfect: 2 }
  });
  const storage = new FakeStorage(JSON.stringify(stored));
  const locks = new FakeLocks();
  locks.available = false;
  const service = await ownerService(storage, locks);
  assert.equal(service.saveMode, 'other-tab');
  const before = storage.writes.length;

  locks.available = true;
  assert.equal(await service.retrySaveAccess(), 'ok');
  assert.equal(service.saveMode, 'owner');
  assert.equal(storage.writes.length, before);
  assert.equal(storage.value, JSON.stringify(stored));

  service.updateSettings({ highContrast: true });
  assert.equal(storage.writes.length, before + 1);
});

test('profile service: missing locks are temporary-support mode and read-only', async () => {
  const stored = profile({ stats: { roundsStarted: 1, totalPlacements: 1, totalPerfect: 1 } });
  const storage = new FakeStorage(JSON.stringify(stored));
  const service = await ProfileService.create({ storage, locks: null });
  assert.equal(service.saveMode, 'temporary-unsupported');
  service.updateSettings({ highContrast: true });
  assert.equal(storage.writes.length, 0);
});

test('profile service: empty owner storage persists defaults exactly once', async () => {
  const storage = new FakeStorage(null);
  const service = await ownerService(storage);
  assert.equal(service.saveMode, 'owner');
  assert.equal(storage.writes.length, 1);
  const parsed = JSON.parse(storage.value ?? '{}') as { schemaVersion: number };
  assert.equal(parsed.schemaVersion, 1);
});
