export type BodyId = 'default' | 'ginger' | 'tuxedo' | 'calico';
export type FaceId = 'idle' | 'focused' | 'happy' | 'surprised' | 'worried' | 'dizzy';

export type AssetFault =
  | 'invalid-manifest'
  | 'missing-body'
  | 'missing-face'
  | 'missing-background'
  | 'decode-body'
  | 'stall-manifest'
  | 'stall-image'
  | 'late-manifest';

export interface BodySpec {
  readonly id: BodyId;
  readonly url: string;
  readonly sourceSize: readonly [number, number];
  readonly logicalRectPx: readonly [number, number, number, number];
  readonly pivotPx: readonly [number, number];
  readonly faceAnchorBodyUV: readonly [number, number];
  readonly decorativeBoundsPx?: readonly [number, number, number, number];
  readonly boundsConvention?: string;
  readonly provenance?: string;
}

export interface FaceSpec {
  readonly id: FaceId;
  readonly url: string;
  readonly sourceSize: readonly [number, number];
  readonly anchorPx?: readonly [number, number];
}

export interface BackgroundSpec {
  readonly url: string;
  readonly sourceSize: readonly [number, number];
}

export interface FloorSpec {
  readonly url: string;
  readonly sourceSize: readonly [number, number];
  readonly centerX: number;
  readonly physicalWidth: number;
  readonly topLineY: number;
}

export interface RuntimeManifest {
  readonly pack: string;
  readonly runtimeRoot: string;
  readonly faceRenderWidthBodyFraction: number;
  readonly bodies: readonly BodySpec[];
  readonly faces: readonly FaceSpec[];
  readonly background: BackgroundSpec;
  readonly floor: FloorSpec;
  readonly appearanceApproval?: {
    readonly card: string;
    readonly relayMessage: string;
    readonly scope: string;
  };
  readonly variantApproval?: {
    readonly variantId: string;
    readonly appliesTo: string;
    readonly appearanceCard: string;
    readonly relayMessage: string;
    readonly sha256: string;
    readonly bytes: number;
    readonly scope: string;
  };
  readonly notes?: string;
}

export interface LoadedBody {
  readonly spec: BodySpec;
  readonly image: HTMLImageElement | null;
}

export interface LoadedFace {
  readonly spec: FaceSpec;
  readonly image: HTMLImageElement | null;
}

export interface ArtAssets {
  readonly manifest: RuntimeManifest | null;
  readonly bodies: Readonly<Record<BodyId, LoadedBody | null>>;
  readonly faces: Readonly<Record<FaceId, LoadedFace | null>>;
  readonly background: HTMLImageElement | null;
  readonly floor: HTMLImageElement | null;
  readonly errors: readonly string[];
  readonly artReady: boolean;
}

const BODY_IDS: readonly BodyId[] = ['default', 'ginger', 'tuxedo', 'calico'];
const FACE_IDS: readonly FaceId[] = ['idle', 'focused', 'happy', 'surprised', 'worried', 'dizzy'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function finitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function numberTuple(value: unknown, length: number): readonly number[] | null {
  if (!Array.isArray(value) || value.length !== length) return null;
  if (!value.every((entry) => typeof entry === 'number' && Number.isFinite(entry))) return null;
  return value as readonly number[];
}

function safeRelativeUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  if (value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return false;
  if (value.split('/').includes('..')) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return /^[A-Za-z0-9._/-]+$/.test(value);
}

function parseBody(raw: unknown): BodySpec {
  if (!isRecord(raw)) throw new Error('body entry is not an object');
  if (!BODY_IDS.includes(raw.id as BodyId)) throw new Error(`unknown body id ${String(raw.id)}`);
  if (!safeRelativeUrl(raw.url)) throw new Error(`unsafe body url ${String(raw.url)}`);
  const sourceSize = numberTuple(raw.sourceSize, 2);
  const logicalRect = numberTuple(raw.logicalRectPx, 4);
  const pivot = numberTuple(raw.pivotPx, 2);
  const uv = numberTuple(raw.faceAnchorBodyUV, 2);
  if (sourceSize === null || logicalRect === null || pivot === null || uv === null) {
    throw new Error(`invalid body geometry for ${String(raw.id)}`);
  }
  if (!sourceSize.every(finitePositive) || !logicalRect.slice(2).every(finitePositive)) {
    throw new Error(`non-positive body geometry for ${String(raw.id)}`);
  }
  if (!logicalRect.every(Number.isFinite) || !pivot.every(Number.isFinite) || !uv.every(Number.isFinite)) {
    throw new Error(`non-finite body geometry for ${String(raw.id)}`);
  }
  const ratio = logicalRect[2]! / logicalRect[3]!;
  if (Math.abs(ratio - 1.55) / 1.55 > 0.02) {
    throw new Error(`body logical aspect ${ratio.toFixed(4)} is outside 2% of 1.55`);
  }
  if (uv[0]! < 0 || uv[0]! > 1 || uv[1]! < 0 || uv[1]! > 1) {
    throw new Error(`face anchor outside [0,1] for ${String(raw.id)}`);
  }
  const boundsRaw = raw.decorativeBoundsPx;
  let bounds: readonly [number, number, number, number] | undefined;
  if (boundsRaw !== undefined) {
    const parsed = numberTuple(boundsRaw, 4);
    if (parsed === null || !parsed.every(Number.isFinite)) {
      throw new Error(`invalid decorative bounds for ${String(raw.id)}`);
    }
    bounds = parsed as readonly [number, number, number, number];
  }
  return {
    id: raw.id as BodyId,
    url: raw.url,
    sourceSize: sourceSize as readonly [number, number],
    logicalRectPx: logicalRect as readonly [number, number, number, number],
    pivotPx: pivot as readonly [number, number],
    faceAnchorBodyUV: uv as readonly [number, number],
    ...(bounds === undefined ? {} : { decorativeBoundsPx: bounds }),
    ...(typeof raw.boundsConvention === 'string' ? { boundsConvention: raw.boundsConvention } : {}),
    ...(typeof raw.provenance === 'string' ? { provenance: raw.provenance } : {})
  };
}

function parseFace(raw: unknown): FaceSpec {
  if (!isRecord(raw)) throw new Error('face entry is not an object');
  if (!FACE_IDS.includes(raw.id as FaceId)) throw new Error(`unknown face id ${String(raw.id)}`);
  if (!safeRelativeUrl(raw.url)) throw new Error(`unsafe face url ${String(raw.url)}`);
  const sourceSize = numberTuple(raw.sourceSize, 2);
  if (sourceSize === null || !sourceSize.every(finitePositive)) {
    throw new Error(`invalid face geometry for ${String(raw.id)}`);
  }
  if (sourceSize[0] !== 128 || sourceSize[1] !== 128) {
    throw new Error(`face ${String(raw.id)} is not 128x128`);
  }
  const anchor = raw.anchorPx === undefined ? undefined : numberTuple(raw.anchorPx, 2);
  return {
    id: raw.id as FaceId,
    url: raw.url,
    sourceSize: sourceSize as readonly [number, number],
    ...(anchor === null || anchor === undefined
      ? {}
      : { anchorPx: anchor as readonly [number, number] })
  };
}

export function validateManifest(raw: unknown): RuntimeManifest {
  if (!isRecord(raw)) throw new Error('manifest is not an object');
  if (typeof raw.pack !== 'string' || raw.pack.length === 0) throw new Error('missing pack id');
  if (typeof raw.runtimeRoot !== 'string' || !safeRelativeUrl(raw.runtimeRoot)) {
    throw new Error('invalid runtimeRoot');
  }
  if (typeof raw.faceRenderWidthBodyFraction !== 'number' ||
      !Number.isFinite(raw.faceRenderWidthBodyFraction) ||
      Math.abs(raw.faceRenderWidthBodyFraction - 0.45) > 0.001) {
    throw new Error('faceRenderWidthBodyFraction must be finite and 0.45');
  }
  if (!Array.isArray(raw.bodies) || raw.bodies.length !== BODY_IDS.length) {
    throw new Error('expected four bodies');
  }
  if (!Array.isArray(raw.faces) || raw.faces.length !== FACE_IDS.length) {
    throw new Error('expected six faces');
  }
  const bodies = raw.bodies.map(parseBody);
  const faces = raw.faces.map(parseFace);
  if (new Set(bodies.map((body) => body.id)).size !== BODY_IDS.length) {
    throw new Error('duplicate body ids');
  }
  if (new Set(faces.map((face) => face.id)).size !== FACE_IDS.length) {
    throw new Error('duplicate face ids');
  }
  if (!isRecord(raw.background) || !safeRelativeUrl(raw.background.url)) {
    throw new Error('invalid background');
  }
  const backgroundSize = numberTuple(raw.background.sourceSize, 2);
  if (backgroundSize === null || !backgroundSize.every(finitePositive)) {
    throw new Error('invalid background size');
  }
  if (!isRecord(raw.floor) || !safeRelativeUrl(raw.floor.url)) throw new Error('invalid floor');
  const floorSize = numberTuple(raw.floor.sourceSize, 2);
  if (floorSize === null || !floorSize.every(finitePositive)) throw new Error('invalid floor size');
  if (!finitePositive(raw.floor.centerX) ||
      !finitePositive(raw.floor.physicalWidth) ||
      !finitePositive(raw.floor.topLineY)) {
    throw new Error('invalid floor mapping');
  }
  return {
    pack: raw.pack,
    runtimeRoot: raw.runtimeRoot,
    faceRenderWidthBodyFraction: raw.faceRenderWidthBodyFraction,
    bodies,
    faces,
    background: {
      url: raw.background.url,
      sourceSize: backgroundSize as readonly [number, number]
    },
    floor: {
      url: raw.floor.url,
      sourceSize: floorSize as readonly [number, number],
      centerX: raw.floor.centerX,
      physicalWidth: raw.floor.physicalWidth,
      topLineY: raw.floor.topLineY
    },
    ...(isRecord(raw.appearanceApproval) &&
    typeof raw.appearanceApproval.card === 'string' &&
    typeof raw.appearanceApproval.relayMessage === 'string' &&
    typeof raw.appearanceApproval.scope === 'string'
      ? {
          appearanceApproval: {
            card: raw.appearanceApproval.card,
            relayMessage: raw.appearanceApproval.relayMessage,
            scope: raw.appearanceApproval.scope
          }
        }
      : {}),
    ...(isRecord(raw.variantApproval) &&
    typeof raw.variantApproval.variantId === 'string' &&
    typeof raw.variantApproval.appliesTo === 'string' &&
    typeof raw.variantApproval.appearanceCard === 'string' &&
    typeof raw.variantApproval.relayMessage === 'string' &&
    typeof raw.variantApproval.sha256 === 'string' &&
    typeof raw.variantApproval.bytes === 'number' &&
    typeof raw.variantApproval.scope === 'string'
      ? {
          variantApproval: {
            variantId: raw.variantApproval.variantId,
            appliesTo: raw.variantApproval.appliesTo,
            appearanceCard: raw.variantApproval.appearanceCard,
            relayMessage: raw.variantApproval.relayMessage,
            sha256: raw.variantApproval.sha256,
            bytes: raw.variantApproval.bytes,
            scope: raw.variantApproval.scope
          }
        }
      : {}),
    ...(typeof raw.notes === 'string' ? { notes: raw.notes } : {})
  };
}

function emptyBodyMap(): Record<BodyId, LoadedBody | null> {
  return { default: null, ginger: null, tuxedo: null, calico: null };
}

function emptyFaceMap(): Record<FaceId, LoadedFace | null> {
  return { idle: null, focused: null, happy: null, surprised: null, worried: null, dizzy: null };
}

export function emptyArtAssets(errors: readonly string[] = ['asset load failed']): ArtAssets {
  return {
    manifest: null,
    bodies: emptyBodyMap(),
    faces: emptyFaceMap(),
    background: null,
    floor: null,
    errors: Object.freeze([...errors]),
    artReady: false
  };
}

function imageUrl(baseHref: string, runtimeRoot: string, relative: string): string {
  return new URL(`${runtimeRoot}${relative}`, baseHref).href;
}

function loadImage(
  url: string,
  signal?: AbortSignal,
  stall = false
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error(`aborted before image load: ${url}`));
      return;
    }
    if (stall) {
      const onAbort = (): void => reject(new Error(`aborted stalled image: ${url}`));
      signal?.addEventListener('abort', onAbort, { once: true });
      return;
    }
    const image = new Image();
    image.decoding = 'async';
    let settled = false;
    const cleanup = (): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = (): void => {
      cleanup();
      image.src = '';
      reject(new Error(`aborted image load: ${url}`));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
    image.onload = () => {
      if (settled) return;
      if (image.naturalWidth <= 0 || image.naturalHeight <= 0) {
        cleanup();
        reject(new Error(`decoded image has no intrinsic size: ${url}`));
        return;
      }
      cleanup();
      resolve(image);
    };
    image.onerror = () => {
      cleanup();
      reject(new Error(`image decode failed: ${url}`));
    };
    image.src = url;
  });
}

export interface ArtLoadOptions {
  readonly fault?: AssetFault | null;
  readonly signal?: AbortSignal;
}

/**
 * Loads the sanitized production runtime pack. Any invalid manifest or image
 * produces a fallback asset set; callers keep rendering placeholders.
 */
export async function loadArtAssets(
  baseHref: string,
  options: ArtLoadOptions = {}
): Promise<ArtAssets> {
  const errors: string[] = [];
  const fault = import.meta.env?.PROD ? null : options.fault ?? null;
  const signal = options.signal;
  try {
    const throwIfAborted = (): void => {
      if (signal?.aborted) throw new Error('asset load aborted');
    };
    if (fault === 'stall-manifest') {
      await new Promise<never>((_, reject) => {
        const fail = (): void => reject(new Error('stalled manifest aborted'));
        if (signal?.aborted) fail();
        else signal?.addEventListener('abort', fail, { once: true });
      });
    }
    if (fault === 'late-manifest') {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 2500);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('late manifest aborted'));
        }, { once: true });
      });
    }
    throwIfAborted();
    const response = await fetch(new URL('manifest.runtime.json', baseHref).href, {
      cache: 'no-cache',
      ...(signal === undefined ? {} : { signal })
    });
    if (!response.ok) throw new Error(`manifest HTTP ${response.status}`);
    if (fault === 'invalid-manifest') throw new Error('injected invalid manifest');
    const manifest = validateManifest(await response.json());
    const bodies = emptyBodyMap();
    const faces = emptyFaceMap();

    throwIfAborted();
    for (const spec of manifest.bodies) {
      if (fault === 'missing-body' && spec.id === 'default') {
        errors.push('injected missing default body');
        continue;
      }
      const url = imageUrl(baseHref, manifest.runtimeRoot, spec.url);
      try {
        const image = fault === 'decode-body' && spec.id === 'default'
          ? await loadImage('data:image/svg+xml,%3Csvg%3E%3Cbroken', signal)
          : await loadImage(url, signal, fault === 'stall-image' && spec.id === 'default');
        bodies[spec.id] = { spec, image };
      } catch (error) {
        errors.push(String(error));
      }
    }

    for (const spec of manifest.faces) {
      if (fault === 'missing-face' && spec.id === 'happy') {
        errors.push('injected missing happy face');
        continue;
      }
      try {
        const image = await loadImage(imageUrl(baseHref, manifest.runtimeRoot, spec.url), signal);
        faces[spec.id] = { spec, image };
      } catch (error) {
        errors.push(String(error));
      }
    }

    let background: HTMLImageElement | null = null;
    if (fault !== 'missing-background') {
      try {
        background = await loadImage(
          imageUrl(baseHref, manifest.runtimeRoot, manifest.background.url),
          signal
        );
      } catch (error) {
        errors.push(String(error));
      }
    } else {
      errors.push('injected missing background');
    }

    let floor: HTMLImageElement | null = null;
    try {
      floor = await loadImage(imageUrl(baseHref, manifest.runtimeRoot, manifest.floor.url), signal);
    } catch (error) {
      errors.push(String(error));
    }

    return {
      manifest,
      bodies,
      faces,
      background,
      floor,
      errors: Object.freeze(errors),
      artReady: errors.length === 0
    };
  } catch (error) {
    errors.push(String(error));
    return emptyArtAssets(errors);
  }
}
