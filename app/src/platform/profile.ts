import type { Mode, SkinId } from '../domain/types.js';
import type { StorageAdapter } from './storage.js';

export const PROFILE_SCHEMA_VERSION = 1 as const;
export const PROFILE_MAX_LENGTH = 65_536;
export const PROFILE_RECORD_MODES: readonly Mode[] = ['classic', 'assist'];
export const SKIN_IDS: readonly SkinId[] = ['default', 'ginger', 'tuxedo', 'calico'];
export const UNLOCK_THRESHOLDS: Readonly<Record<'ginger' | 'tuxedo' | 'calico', number>> = {
  ginger: 25,
  tuxedo: 75,
  calico: 150
};

export type SaveMode =
  | 'owner'
  | 'other-tab'
  | 'temporary-unsupported'
  | 'temporary-unreadable'
  | 'temporary-write-failed';

export interface ProfileStats {
  readonly roundsStarted: number;
  readonly totalPlacements: number;
  readonly totalPerfect: number;
}

export interface ProfileRecord {
  readonly bestHeight: number;
  readonly bestScore: number;
}

export interface ProfileSettings {
  readonly soundEnabled: boolean;
  readonly volume: number;
  readonly reducedMotion: 'system' | 'on' | 'off';
  readonly highContrast: boolean;
  readonly preferredMode: Mode;
  readonly tutorialSeen: boolean;
}

export interface LastApplied {
  readonly runId: string;
  readonly placementOrdinal: number;
  readonly score: number;
  readonly perfectCount: number;
}

export interface ProfileV1 {
  readonly schemaVersion: 1;
  readonly revision: number;
  readonly stats: ProfileStats;
  readonly records: Readonly<Record<string, ProfileRecord>>;
  readonly selectedSkin: SkinId;
  readonly settings: ProfileSettings;
  readonly lastApplied: LastApplied | null;
}

export type ProfileValidation =
  | { readonly kind: 'empty' }
  | { readonly kind: 'ok'; readonly profile: ProfileV1 }
  | { readonly kind: 'invalid' | 'future' | 'oversized'; readonly reason: string };

export interface PlacementCommit {
  readonly runId: string;
  readonly ordinal: number;
  readonly grade: 'perfect' | 'ordinary';
  readonly totalScore: number;
  readonly perfectCount: number;
  readonly mode: Mode;
  readonly balanceVersion: number;
}

export type RetryResult = 'ok' | 'other-tab' | 'unsupported' | 'unreadable' | 'write-failed';

const DEFAULT_SETTINGS: ProfileSettings = Object.freeze({
  soundEnabled: true,
  volume: 0.6,
  reducedMotion: 'system',
  highContrast: false,
  preferredMode: 'classic',
  tutorialSeen: false
});

export function createDefaultProfile(): ProfileV1 {
  return freezeProfile({
    schemaVersion: 1,
    revision: 0,
    stats: { roundsStarted: 0, totalPlacements: 0, totalPerfect: 0 },
    records: {
      'classic@1': { bestHeight: 0, bestScore: 0 },
      'assist@1': { bestHeight: 0, bestScore: 0 }
    },
    selectedSkin: 'default',
    settings: DEFAULT_SETTINGS,
    lastApplied: null
  });
}

export function deriveUnlocked(totalPlacements: number): readonly SkinId[] {
  const unlocked: SkinId[] = ['default'];
  if (totalPlacements >= UNLOCK_THRESHOLDS.ginger) unlocked.push('ginger');
  if (totalPlacements >= UNLOCK_THRESHOLDS.tuxedo) unlocked.push('tuxedo');
  if (totalPlacements >= UNLOCK_THRESHOLDS.calico) unlocked.push('calico');
  return Object.freeze(unlocked);
}

export function normalizeSelectedSkin(skin: unknown, totalPlacements: number): SkinId {
  if (typeof skin !== 'string') return 'default';
  if (!SKIN_IDS.includes(skin as SkinId)) return 'default';
  const id = skin as SkinId;
  return deriveUnlocked(totalPlacements).includes(id) ? id : 'default';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeCounter(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isMode(value: unknown): value is Mode {
  return value === 'classic' || value === 'assist';
}

function isMotion(value: unknown): value is ProfileSettings['reducedMotion'] {
  return value === 'system' || value === 'on' || value === 'off';
}

export function freezeProfile(profile: ProfileV1): ProfileV1 {
  const records = Object.fromEntries(
    Object.entries(profile.records).map(([key, value]) => [key, Object.freeze({ ...value })])
  );
  return Object.freeze({
    schemaVersion: 1,
    revision: profile.revision,
    stats: Object.freeze({ ...profile.stats }),
    records: Object.freeze(records),
    selectedSkin: profile.selectedSkin,
    settings: Object.freeze({ ...profile.settings }),
    lastApplied: profile.lastApplied === null ? null : Object.freeze({ ...profile.lastApplied })
  });
}

/**
 * Pure profile validation. Raw input is size-checked before JSON.parse.
 * Invalid/future/oversized documents are never coerced into a writable profile.
 */
export function validateProfile(raw: string | null): ProfileValidation {
  if (raw === null) return { kind: 'empty' };
  if (raw.length > PROFILE_MAX_LENGTH) {
    return { kind: 'oversized', reason: `profile exceeds ${PROFILE_MAX_LENGTH} UTF-16 code units` };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: 'invalid', reason: 'malformed JSON' };
  }
  if (!isRecord(parsed)) return { kind: 'invalid', reason: 'root is not an object' };

  const version = parsed.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version)) {
    return { kind: 'invalid', reason: 'schemaVersion is not an integer' };
  }
  if (version > PROFILE_SCHEMA_VERSION) {
    return { kind: 'future', reason: `schemaVersion ${version} is newer than supported` };
  }
  if (version !== PROFILE_SCHEMA_VERSION) {
    return { kind: 'invalid', reason: `unsupported schemaVersion ${version}` };
  }

  const revision = parsed.revision === undefined ? 0 : parsed.revision;
  if (!isSafeCounter(revision)) return { kind: 'invalid', reason: 'revision is not a safe counter' };

  const rawStats = parsed.stats === undefined ? {} : parsed.stats;
  if (!isRecord(rawStats)) return { kind: 'invalid', reason: 'stats is not an object' };
  const statFields = ['roundsStarted', 'totalPlacements', 'totalPerfect'] as const;
  const statValues: Record<string, number> = {};
  for (const field of statFields) {
    const value = rawStats[field] === undefined ? 0 : rawStats[field];
    if (!isSafeCounter(value)) return { kind: 'invalid', reason: `stats.${field} is invalid` };
    statValues[field] = value;
  }

  const rawRecords = parsed.records === undefined ? {} : parsed.records;
  if (!isRecord(rawRecords)) return { kind: 'invalid', reason: 'records is not an object' };
  const records: Record<string, ProfileRecord> = {};
  for (const [namespace, value] of Object.entries(rawRecords)) {
    const match = /^(classic|assist)@(\d+)$/.exec(namespace);
    if (match === null || !isMode(match[1])) {
      return { kind: 'invalid', reason: `unknown record namespace ${namespace}` };
    }
    if (!isRecord(value)) return { kind: 'invalid', reason: `record ${namespace} is not an object` };
    const bestHeight = value.bestHeight === undefined ? 0 : value.bestHeight;
    const bestScore = value.bestScore === undefined ? 0 : value.bestScore;
    if (!isSafeCounter(bestHeight) || !isSafeCounter(bestScore)) {
      return { kind: 'invalid', reason: `record ${namespace} has invalid counters` };
    }
    records[namespace] = { bestHeight, bestScore };
  }
  for (const mode of PROFILE_RECORD_MODES) {
    const namespace = `${mode}@1`;
    if (records[namespace] === undefined) records[namespace] = { bestHeight: 0, bestScore: 0 };
  }

  const rawSettings = parsed.settings === undefined ? {} : parsed.settings;
  if (!isRecord(rawSettings)) return { kind: 'invalid', reason: 'settings is not an object' };
  const soundEnabled = rawSettings.soundEnabled === undefined ? true : rawSettings.soundEnabled;
  if (typeof soundEnabled !== 'boolean') return { kind: 'invalid', reason: 'settings.soundEnabled is invalid' };
  const rawVolume = rawSettings.volume === undefined ? 0.6 : rawSettings.volume;
  if (typeof rawVolume !== 'number' || !Number.isFinite(rawVolume)) {
    return { kind: 'invalid', reason: 'settings.volume is invalid' };
  }
  const volume = Math.min(1, Math.max(0, rawVolume));
  const reducedMotion = rawSettings.reducedMotion === undefined ? 'system' : rawSettings.reducedMotion;
  if (!isMotion(reducedMotion)) return { kind: 'invalid', reason: 'settings.reducedMotion is invalid' };
  const highContrast = rawSettings.highContrast === undefined ? false : rawSettings.highContrast;
  if (typeof highContrast !== 'boolean') return { kind: 'invalid', reason: 'settings.highContrast is invalid' };
  const preferredMode = rawSettings.preferredMode === undefined ? 'classic' : rawSettings.preferredMode;
  if (!isMode(preferredMode)) return { kind: 'invalid', reason: 'settings.preferredMode is invalid' };
  const tutorialSeen = rawSettings.tutorialSeen === undefined ? false : rawSettings.tutorialSeen;
  if (typeof tutorialSeen !== 'boolean') return { kind: 'invalid', reason: 'settings.tutorialSeen is invalid' };

  let selectedSkin = normalizeSelectedSkin(
    parsed.selectedSkin,
    statValues.totalPlacements ?? 0
  );

  let lastApplied: LastApplied | null = null;
  if (parsed.lastApplied !== undefined && parsed.lastApplied !== null) {
    if (!isRecord(parsed.lastApplied)) {
      return { kind: 'invalid', reason: 'lastApplied is not an object' };
    }
    const runId = parsed.lastApplied.runId;
    const placementOrdinal = parsed.lastApplied.placementOrdinal;
    const score = parsed.lastApplied.score;
    const perfectCount = parsed.lastApplied.perfectCount;
    if (typeof runId !== 'string' || runId.length === 0) {
      return { kind: 'invalid', reason: 'lastApplied.runId is invalid' };
    }
    if (!isSafeCounter(placementOrdinal) || !isSafeCounter(score) || !isSafeCounter(perfectCount)) {
      return { kind: 'invalid', reason: 'lastApplied counters are invalid' };
    }
    lastApplied = { runId, placementOrdinal, score, perfectCount };
  }

  return {
    kind: 'ok',
    profile: freezeProfile({
      schemaVersion: 1,
      revision,
      stats: {
        roundsStarted: statValues.roundsStarted ?? 0,
        totalPlacements: statValues.totalPlacements ?? 0,
        totalPerfect: statValues.totalPerfect ?? 0
      },
      records,
      selectedSkin,
      settings: {
        soundEnabled,
        volume,
        reducedMotion,
        highContrast,
        preferredMode,
        tutorialSeen
      },
      lastApplied
    })
  };
}

export interface ProfileServiceOptions {
  readonly storage: StorageAdapter;
  readonly locks?: LockManager | null;
  readonly lockName?: string;
  readonly onChange?: (view: ProfileView) => void;
}

export interface ProfileView {
  readonly saveMode: SaveMode;
  readonly revision: number;
  readonly stats: ProfileStats;
  readonly records: Readonly<Record<string, ProfileRecord>>;
  readonly selectedSkin: SkinId;
  readonly settings: ProfileSettings;
  readonly unlocked: readonly SkinId[];
}

/**
 * One profile owner per page. All writes are whole-document transactions and
 * only happen in owner mode. Invalid/future/oversized storage is never written.
 */
export class ProfileService {
  private readonly storage: StorageAdapter;
  private readonly locks: LockManager | null;
  private readonly lockName: string;
  private readonly onChange: ((view: ProfileView) => void) | undefined;
  private profile: ProfileV1 = createDefaultProfile();
  private mode: SaveMode = 'temporary-unsupported';
  private temporaryDirty = false;
  private lockRequests = 0;
  private lockHeld = false;

  private constructor(options: ProfileServiceOptions) {
    this.storage = options.storage;
    this.locks = options.locks ?? null;
    this.lockName = options.lockName ?? 'cat-tower.profile.v1';
    this.onChange = options.onChange;
  }

  static async create(options: ProfileServiceOptions): Promise<ProfileService> {
    const service = new ProfileService(options);
    await service.initialize();
    return service;
  }

  private async initialize(): Promise<void> {
    const acquired = await this.acquire();
    let raw: string | null;
    try {
      raw = this.storage.read();
    } catch {
      this.mode = 'temporary-unsupported';
      this.profile = createDefaultProfile();
      this.publish();
      return;
    }

    const validated = validateProfile(raw);
    if (validated.kind === 'invalid' || validated.kind === 'future' || validated.kind === 'oversized') {
      this.mode = 'temporary-unreadable';
      this.profile = createDefaultProfile();
      this.publish();
      return;
    }
    if (validated.kind === 'ok') {
      this.profile = validated.profile;
      this.mode = acquired ? 'owner' : this.locks === null ? 'temporary-unsupported' : 'other-tab';
      this.publish();
      return;
    }

    this.profile = createDefaultProfile();
    if (!acquired) {
      this.mode = this.locks === null ? 'temporary-unsupported' : 'other-tab';
      this.publish();
      return;
    }
    this.mode = 'owner';
    this.persist();
    this.publish();
  }

  private async acquire(): Promise<boolean> {
    const manager = this.locks;
    if (manager === null) return false;
    this.lockRequests += 1;
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const settle = (value: boolean): void => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      try {
        void manager.request(this.lockName, { ifAvailable: true }, (lock) => {
          if (lock === null) {
            settle(false);
            return Promise.resolve();
          }
          settle(true);
          this.lockHeld = true;
          return new Promise<void>(() => undefined);
        }).catch(() => settle(false));
      } catch {
        settle(false);
      }
    });
  }

  private publish(): void {
    this.onChange?.(this.view());
  }

  private persist(): void {
    if (this.mode !== 'owner') return;
    try {
      this.storage.write(JSON.stringify(this.profile));
    } catch {
      this.mode = 'temporary-write-failed';
      this.temporaryDirty = true;
    }
  }

  private writeAndPublish(): void {
    this.persist();
    this.publish();
  }

  private markTemporaryChange(): void {
    if (this.mode !== 'owner') this.temporaryDirty = true;
  }

  get saveMode(): SaveMode {
    return this.mode;
  }

  get revision(): number {
    return this.profile.revision;
  }

  get unlocked(): readonly SkinId[] {
    return deriveUnlocked(this.profile.stats.totalPlacements);
  }

  get hasTemporaryProgress(): boolean {
    return this.temporaryDirty;
  }

  get lockRequestCount(): number {
    return this.lockRequests;
  }

  get lockIsHeld(): boolean {
    return this.lockHeld;
  }

  getProfile(): ProfileV1 {
    return this.profile;
  }

  view(): ProfileView {
    return Object.freeze({
      saveMode: this.mode,
      revision: this.profile.revision,
      stats: Object.freeze({ ...this.profile.stats }),
      records: this.profile.records,
      selectedSkin: this.profile.selectedSkin,
      settings: this.profile.settings,
      unlocked: this.unlocked
    });
  }

  startRun(runId: string, _mode: Mode): ProfileV1 {
    this.profile = freezeProfile({
      ...this.profile,
      revision: this.profile.revision + 1,
      stats: {
        ...this.profile.stats,
        roundsStarted: this.profile.stats.roundsStarted + 1
      },
      lastApplied: { runId, placementOrdinal: 0, score: 0, perfectCount: 0 }
    });
    this.markTemporaryChange();
    this.writeAndPublish();
    return this.profile;
  }

  commitPlacement(commit: PlacementCommit): readonly SkinId[] {
    const applied = this.profile.lastApplied;
    if (applied === null || applied.runId !== commit.runId) return Object.freeze([]);
    if (commit.ordinal <= applied.placementOrdinal) return Object.freeze([]);
    if (commit.ordinal !== applied.placementOrdinal + 1) {
      console.debug('Profile placement ordinal gap ignored', {
        expected: applied.placementOrdinal + 1,
        received: commit.ordinal
      });
      return Object.freeze([]);
    }

    const beforeUnlocked = new Set(this.unlocked);
    const totalPlacements = this.profile.stats.totalPlacements + 1;
    const totalPerfect = this.profile.stats.totalPerfect + (commit.grade === 'perfect' ? 1 : 0);
    const namespace = `${commit.mode}@${commit.balanceVersion}`;
    const priorRecord = this.profile.records[namespace] ?? { bestHeight: 0, bestScore: 0 };
    this.profile = freezeProfile({
      ...this.profile,
      revision: this.profile.revision + 1,
      stats: {
        ...this.profile.stats,
        totalPlacements,
        totalPerfect
      },
      records: {
        ...this.profile.records,
        [namespace]: {
          bestHeight: Math.max(priorRecord.bestHeight, commit.ordinal),
          bestScore: Math.max(priorRecord.bestScore, commit.totalScore)
        }
      },
      lastApplied: {
        runId: commit.runId,
        placementOrdinal: commit.ordinal,
        score: commit.totalScore,
        perfectCount: commit.perfectCount
      }
    });
    this.markTemporaryChange();
    this.writeAndPublish();
    return Object.freeze(this.unlocked.filter((id) => !beforeUnlocked.has(id)));
  }

  updateSettings(partial: Partial<ProfileSettings>): boolean {
    const settings = { ...this.profile.settings };
    let changed = false;
    if (typeof partial.soundEnabled === 'boolean' && partial.soundEnabled !== settings.soundEnabled) {
      settings.soundEnabled = partial.soundEnabled;
      changed = true;
    }
    if (typeof partial.volume === 'number' && Number.isFinite(partial.volume)) {
      const volume = Math.min(1, Math.max(0, partial.volume));
      if (volume !== settings.volume) {
        settings.volume = volume;
        changed = true;
      }
    }
    if (isMotion(partial.reducedMotion) && partial.reducedMotion !== settings.reducedMotion) {
      settings.reducedMotion = partial.reducedMotion;
      changed = true;
    }
    if (typeof partial.highContrast === 'boolean' && partial.highContrast !== settings.highContrast) {
      settings.highContrast = partial.highContrast;
      changed = true;
    }
    if (isMode(partial.preferredMode) && partial.preferredMode !== settings.preferredMode) {
      settings.preferredMode = partial.preferredMode;
      changed = true;
    }
    if (typeof partial.tutorialSeen === 'boolean' && partial.tutorialSeen !== settings.tutorialSeen) {
      settings.tutorialSeen = partial.tutorialSeen;
      changed = true;
    }
    if (!changed) return false;

    this.profile = freezeProfile({
      ...this.profile,
      revision: this.profile.revision + 1,
      settings
    });
    this.markTemporaryChange();
    this.writeAndPublish();
    return true;
  }

  selectSkin(id: SkinId): boolean {
    if (!this.unlocked.includes(id)) return false;
    if (this.profile.selectedSkin === id) return false;
    this.profile = freezeProfile({
      ...this.profile,
      revision: this.profile.revision + 1,
      selectedSkin: id
    });
    this.markTemporaryChange();
    this.writeAndPublish();
    return true;
  }

  async retrySaveAccess(): Promise<RetryResult> {
    if (this.locks === null) return 'unsupported';
    const acquired = await this.acquire();
    if (!acquired) return 'other-tab';

    let raw: string | null;
    try {
      raw = this.storage.read();
    } catch {
      this.mode = 'temporary-unsupported';
      this.publish();
      return 'unsupported';
    }
    const validated = validateProfile(raw);
    if (validated.kind === 'invalid' || validated.kind === 'future' || validated.kind === 'oversized') {
      this.mode = 'temporary-unreadable';
      this.publish();
      return 'unreadable';
    }
    this.profile = validated.kind === 'ok' ? validated.profile : createDefaultProfile();
    this.mode = 'owner';
    this.temporaryDirty = false;
    // Adopt a valid v1 document without rewriting it. Only an empty store gets
    // the default profile written during Retry.
    if (validated.kind === 'empty') this.persist();
    if ((this.mode as SaveMode) === 'temporary-write-failed') {
      this.publish();
      return 'write-failed';
    }
    this.publish();
    return 'ok';
  }
}
