import { BALANCE_V1 } from '../../src/domain/balance.js';
import type { GameEvent, RoundState, SettledCat } from '../../src/domain/types.js';
import { GameRenderer } from '../../src/render/renderer.js';
import { cameraBottomTarget } from '../../src/render/projection.js';
import { emptyArtAssets, loadArtAssets } from '../../src/platform/assets.js';
import type { ArtAssets } from '../../src/platform/assets.js';

type CanvasMethod = 'drawImage' | 'arc' | 'rotate' | 'fill' | 'stroke';
type Counts = Record<CanvasMethod, number>;

interface ScenarioTiming {
  readonly count: number;
  readonly viewport: string;
  readonly dpr: number;
  readonly art: 'approved' | 'fallback';
  readonly samples: number;
  readonly p50: number;
  readonly p95: number;
  readonly p99: number;
  readonly mean: number;
  readonly max: number;
  readonly canvas: { readonly width: number; readonly height: number; readonly pixels: number; readonly cssWidth: number; readonly cssHeight: number };
  readonly camera: { readonly value: number; readonly expected: number; readonly finite: boolean };
  readonly topBottom: number;
  readonly incomingBottom: number | null;
}

interface CountResult {
  readonly label: string;
  readonly counts: Counts;
  readonly bodiesFromDrawImage: number;
  readonly facesFromDrawImage: number;
  readonly visibleRotateCalls: number;
  readonly canvas: { readonly width: number; readonly height: number; readonly pixels: number };
}

interface AuditReport {
  readonly audit: 'M4B actual GameRenderer audit';
  readonly moduleIdentity: string;
  readonly environment: {
    readonly userAgent: string;
    readonly devicePixelRatio: number;
    readonly viewport: string;
  };
  readonly timings: readonly ScenarioTiming[];
  readonly fallbackTimings: readonly ScenarioTiming[];
  readonly counts: readonly CountResult[];
  readonly drawImageBaseline: number;
  readonly collapseCounts: CountResult;
  readonly tallCounts: { readonly settled: CountResult; readonly collapse: CountResult; readonly baselineDrawImage: number };
  readonly boundaryTimings: readonly ScenarioTiming[];
  readonly particleCounts: { readonly baselineArcs: number; readonly landingArcs: number; readonly delta: number };
  readonly reducedMotion: { readonly view: unknown; readonly finite: boolean };
  readonly domNodes: { readonly before: number; readonly after: number; readonly delta: number };
  readonly notes: readonly string[];
}

declare global {
  interface Window {
    __auditResults?: AuditReport;
    __auditError?: string;
    __auditAssets?: ArtAssets;
    __auditShow?: (count: number, options?: { readonly collapse?: boolean; readonly reduced?: boolean; readonly fallback?: boolean }) => unknown;
  }
}

const H = BALANCE_V1.height;
const approvedBase = new URL('/assets/production-02/', window.location.origin).href;
const status = document.querySelector<HTMLElement>('#status');
const caption = document.querySelector<HTMLElement>('#caption');
const stage = document.querySelector<HTMLElement>('#stage');

const methodNames: readonly CanvasMethod[] = ['drawImage', 'arc', 'rotate', 'fill', 'stroke'];
let activeCounts: Counts | null = null;
const originalMethods = new Map<CanvasMethod, (...args: unknown[]) => unknown>();

function installCounters(): void {
  const proto = CanvasRenderingContext2D.prototype as unknown as Record<string, (...args: unknown[]) => unknown>;
  for (const method of methodNames) {
    const original = proto[method];
    if (original === undefined) throw new Error(`missing Canvas method ${method}`);
    originalMethods.set(method, original);
    proto[method] = function (this: CanvasRenderingContext2D, ...args: unknown[]): unknown {
      if (activeCounts !== null) activeCounts[method] += 1;
      return original.apply(this, args);
    };
  }
}

function withCounts(action: () => void): Counts {
  const counts: Counts = { drawImage: 0, arc: 0, rotate: 0, fill: 0, stroke: 0 };
  activeCounts = counts;
  try {
    action();
  } finally {
    activeCounts = null;
  }
  return counts;
}

function makeCats(count: number): readonly SettledCat[] {
  const cats: SettledCat[] = [];
  for (let i = 0; i < count; i += 1) {
    cats.push(Object.freeze({ id: i + 1, x: 0, bottom: i * H, skinId: 'default' }));
  }
  return Object.freeze(cats);
}

function makeState(
  count: number,
  options: { readonly phase?: RoundState['phase']; readonly incoming?: boolean; readonly failure?: boolean; readonly joint?: number } = {}
): RoundState {
  const cats = makeCats(count);
  const phase = options.phase ?? 'AIMING';
  const top = count * H;
  const incoming = options.incoming === true
    ? Object.freeze({
        spawnId: count + 1,
        x: 0,
        bottom: top + BALANCE_V1.spawnGap,
        vy: 0,
        phi: Math.PI / 2
      })
    : undefined;
  const failure = options.failure === true
    ? Object.freeze({ reason: 'UNSTABLE_TOWER' as const, joint: Math.max(1, options.joint ?? count), direction: 1 as const })
    : undefined;
  return Object.freeze({
    runId: 'm4b-audit-renderer',
    seed: 20261116,
    rngState: 1,
    tick: 100,
    mode: 'assist',
    phase,
    phaseTicks: 0,
    spawnId: count + 1,
    cats,
    ...(incoming === undefined ? {} : { incoming }),
    score: count * 15,
    perfectChain: 0,
    perfectCount: count,
    safety: 1,
    ...(failure === undefined ? {} : { failure }),
    skinId: 'default',
    balanceVersion: 1
  });
}

function makeCanvas(): HTMLCanvasElement {
  return document.createElement('canvas');
}

function makeRenderer(
  assets: ArtAssets,
  width: number,
  height: number,
  dpr: number,
  reducedMotion = false
): { renderer: GameRenderer; canvas: HTMLCanvasElement } {
  const canvas = makeCanvas();
  const renderer = new GameRenderer(canvas, assets, reducedMotion);
  renderer.resize(width, height, dpr);
  renderer.resetView();
  return { renderer, canvas };
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index] ?? 0;
}

function stats(samples: readonly number[]): { p50: number; p95: number; p99: number; mean: number; max: number } {
  const sorted = [...samples].sort((a, b) => a - b);
  const mean = sorted.reduce((sum, value) => sum + value, 0) / sorted.length;
  return {
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    mean,
    max: sorted[sorted.length - 1] ?? 0
  };
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function timeScenario(
  assets: ArtAssets,
  art: 'approved' | 'fallback',
  count: number,
  width: number,
  height: number,
  dpr: number
): ScenarioTiming {
  const { renderer, canvas } = makeRenderer(assets, width, height, dpr);
  const state = makeState(count, { phase: 'AIMING', incoming: true });
  for (let i = 0; i < 5; i += 1) renderer.render(state, 1 / 60);
  const samples: number[] = [];
  for (let i = 0; i < 40; i += 1) {
    const start = performance.now();
    renderer.render(state, 1 / 60);
    samples.push(performance.now() - start);
  }
  const view = renderer.getView();
  const expected = cameraBottomTarget(count * H, view.worldHeight);
  const s = stats(samples);
  const topBottom = count === 0 ? 0 : (count - 1) * H;
  return {
    count,
    viewport: `${width}x${height}`,
    dpr,
    art,
    samples: samples.length,
    p50: round(s.p50),
    p95: round(s.p95),
    p99: round(s.p99),
    mean: round(s.mean),
    max: round(s.max),
    canvas: {
      width: canvas.width,
      height: canvas.height,
      pixels: canvas.width * canvas.height,
      cssWidth: Number(canvas.style.width.replace('px', '')),
      cssHeight: Number(canvas.style.height.replace('px', ''))
    },
    camera: {
      value: view.cameraBottom ?? 0,
      expected,
      finite: Number.isFinite(view.cameraBottom) && Number.isFinite(view.worldHeight)
    },
    topBottom,
    incomingBottom: state.incoming?.bottom ?? null
  };
}

function countSettled(assets: ArtAssets, count: number, baseline: number, label = `settled-${count}`, width = 390, height = 844): CountResult {
  const { renderer } = makeRenderer(assets, width, height, 1);
  const state = makeState(count, { phase: 'RESULTS', incoming: false });
  const counts = withCounts(() => {
    renderer.render(state, 1 / 60);
  });
  return {
    label,
    counts,
    bodiesFromDrawImage: count === 0 ? 0 : Math.max(0, (counts.drawImage - baseline) / 2),
    facesFromDrawImage: count === 0 ? 0 : Math.max(0, (counts.drawImage - baseline) / 2),
    visibleRotateCalls: counts.rotate,
    canvas: { width, height, pixels: width * height }
  };
}

function failureEvent(joint: number): GameEvent {
  return {
    id: 'audit:failure',
    runId: 'm4b-audit-renderer',
    tick: 102,
    type: 'roundFailed',
    reason: 'UNSTABLE_TOWER',
    joint,
    direction: 1
  };
}

function countCollapse(assets: ArtAssets, baseline: number, joint = 994, label = 'collapse-1000-joint-994', width = 390, height = 844): CountResult {
  const { renderer } = makeRenderer(assets, width, height, 1);
  const state = makeState(1000, { phase: 'COLLAPSING', incoming: false, failure: true, joint });
  renderer.onEvents([failureEvent(joint)]);
  const counts = withCounts(() => {
    renderer.render(state, 1 / 60);
  });
  return {
    label,
    counts,
    bodiesFromDrawImage: Math.max(0, (counts.drawImage - baseline) / 2),
    facesFromDrawImage: Math.max(0, (counts.drawImage - baseline) / 2),
    visibleRotateCalls: counts.rotate,
    canvas: { width, height, pixels: width * height }
  };
}

function countParticles(assets: ArtAssets): { baselineArcs: number; landingArcs: number; delta: number } {
  const { renderer } = makeRenderer(assets, 390, 844, 1);
  const state = makeState(1, { phase: 'SETTLING', incoming: false });
  const baseline = withCounts(() => {
    renderer.render(state, 0);
  }).arc;
  const event: GameEvent = {
    id: 'audit:1',
    runId: 'm4b-audit-renderer',
    tick: 101,
    type: 'placementCommitted',
    ordinal: 1,
    x: 0,
    grade: 'perfect',
    points: 15,
    totalScore: 15,
    perfectCount: 1,
    perfectChain: 1,
    safety: 1,
    weakestJoint: 1,
    mode: 'assist',
    balanceVersion: 1
  };
  renderer.onEvents([event]);
  const landing = withCounts(() => {
    renderer.render(state, 0);
  }).arc;
  return { baselineArcs: baseline, landingArcs: landing, delta: landing - baseline };
}

function show(count: number, options: { readonly collapse?: boolean; readonly reduced?: boolean; readonly fallback?: boolean } = {}): unknown {
  if (stage === null || caption === null) return null;
  stage.replaceChildren();
  const { renderer, canvas } = makeRenderer(
    options.fallback === true ? emptyArtAssets(['audit fallback']) : (window.__auditAssets ?? emptyArtAssets()),
    window.innerWidth,
    window.innerHeight,
    window.devicePixelRatio || 1,
    options.reduced === true
  );
  const joint = Math.max(1, count - 6);
  const state = makeState(count, {
    phase: options.collapse === true ? 'COLLAPSING' : 'AIMING',
    incoming: true,
    failure: options.collapse === true,
    joint
  });
  if (options.collapse === true) renderer.onEvents([failureEvent(joint)]);
  renderer.render(state, 1 / 60);
  stage.replaceChildren(canvas, caption);
  const view = renderer.getView();
  caption.textContent = [
    `M4B AUDIT ${count} settled cats`,
    options.collapse === true ? `phase COLLAPSING (joint ${joint})` : 'phase AIMING (incoming at top)',
    `camera ${view.cameraBottom?.toFixed(3)} / world ${view.worldHeight.toFixed(3)}`,
    `canvas ${canvas.width}x${canvas.height} (${(canvas.width * canvas.height).toLocaleString()} px)`,
    options.reduced === true ? 'reduced motion' : 'full motion',
    options.fallback === true ? 'fallback art' : 'approved art'
  ].join('\n');
  return { count, view, canvas: { width: canvas.width, height: canvas.height }, caption: caption.textContent };
}

const assetsPromise = loadArtAssets(approvedBase);

function cpuSuite(assets: ArtAssets, art: 'approved' | 'fallback'): ScenarioTiming[] {
  const out: ScenarioTiming[] = [];
  for (const [width, height, dpr] of [[390, 844, 1], [390, 844, 2], [844, 390, 2]] as const) {
    for (const count of [0, 100, 1000, 2000]) {
      out.push(timeScenario(assets, art, count, width, height, dpr));
    }
  }
  return out;
}

async function run(): Promise<void> {
  try {
    const approvedAssets = await assetsPromise;
    window.__auditAssets = approvedAssets;
    installCounters();

    const timings = cpuSuite(approvedAssets, 'approved');
    const fallback = emptyArtAssets(['audit fallback']);
    const fallbackTimings: ScenarioTiming[] = [];
    for (const count of [0, 100, 1000, 2000]) {
      fallbackTimings.push(timeScenario(fallback, 'fallback', count, 390, 844, 1));
    }
    const domBefore = document.querySelectorAll('*').length;
    const baselineCounts = countSettled(approvedAssets, 0, 0);
    const drawImageBaseline = baselineCounts.counts.drawImage;
    const counts = [
      baselineCounts,
      ...[100, 1000, 2000].map((count) => countSettled(approvedAssets, count, drawImageBaseline))
    ];
    const collapseCounts = countCollapse(approvedAssets, drawImageBaseline);
    const tallBaseline = countSettled(approvedAssets, 0, 0, 'tall-settled-0', 100, 5000);
    const tallSettled = countSettled(approvedAssets, 1000, tallBaseline.counts.drawImage, 'tall-settled-1000', 100, 5000);
    const tallCollapse = countCollapse(approvedAssets, tallBaseline.counts.drawImage, 1, 'tall-collapse-1000-joint-1', 100, 5000);
    const boundaryTimings = [
      timeScenario(approvedAssets, 'approved', 0, 1000, 1600, 2),
      timeScenario(approvedAssets, 'approved', 0, 2160, 3840, 2),
      timeScenario(approvedAssets, 'approved', 0, 100, 5000, 2)
    ];
    const particleCounts = countParticles(approvedAssets);
    const reducedRenderer = makeRenderer(approvedAssets, 390, 844, 1, true);
    reducedRenderer.renderer.render(makeState(1000, { phase: 'AIMING', incoming: true }), 1 / 60);
    const reducedView = reducedRenderer.renderer.getView();
    const domAfter = document.querySelectorAll('*').length;

    const report: AuditReport = {
      audit: 'M4B actual GameRenderer audit',
      moduleIdentity: 'src/render/renderer.ts imported directly by the Vite dev audit page; unbundled source, not dist',
      environment: {
        userAgent: navigator.userAgent,
        devicePixelRatio: window.devicePixelRatio,
        viewport: `${window.innerWidth}x${window.innerHeight}`
      },
      timings,
      fallbackTimings,
      counts,
      drawImageBaseline,
      collapseCounts,
      tallCounts: {
        settled: tallSettled,
        collapse: tallCollapse,
        baselineDrawImage: tallBaseline.counts.drawImage
      },
      boundaryTimings,
      particleCounts,
      reducedMotion: { view: reducedView, finite: Number.isFinite(reducedView.cameraBottom) && Number.isFinite(reducedView.worldHeight) },
      domNodes: { before: domBefore, after: domAfter, delta: domAfter - domBefore },
      notes: [
        'Renderer CPU time is performance.now() around renderer.render only; it excludes compositor/GPU completion and frame cadence.',
        'Canvas fixtures are synthetic audit states, not normal app UI and not human-played rounds.',
        'Approved-art body/face counts are derived from actual Canvas drawImage calls after subtracting the 0-cat background/floor baseline; faces are not counted as extra cats.',
        'The earlier joint-994 collapse observed 7 visible bodies, not the 20-body cap; the 100x5000 tall fixture with joint 1 exercises the 24-body/20-collapse caps. Rotate calls are actual drawCat transforms; particles are actual arc calls from the landing stars.',
        'Fallback-art timings render placeholders with no image assets; they are not a replacement for approved-art visuals.'
      ]
    };
    window.__auditResults = report;
    void fetch('/__audit-write', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report)
    }).then((response) => {
      (window as unknown as { __auditWriteStatus?: string }).__auditWriteStatus = response.ok ? 'written' : `HTTP ${response.status}`;
    }).catch((error: unknown) => {
      (window as unknown as { __auditWriteStatus?: string }).__auditWriteStatus = String(error);
    });
    if (status !== null) status.textContent = JSON.stringify({
      timings: timings.map((t) => ({ c: t.count, v: t.viewport, d: t.dpr, p95: t.p95, px: t.canvas.pixels })),
      counts: counts.map((c) => ({ label: c.label, bodies: c.bodiesFromDrawImage, faces: c.facesFromDrawImage, rotate: c.visibleRotateCalls })),
      collapse: { bodies: collapseCounts.bodiesFromDrawImage, rotate: collapseCounts.visibleRotateCalls },
      tall: { settledBodies: tallSettled.bodiesFromDrawImage, collapseBodies: tallCollapse.bodiesFromDrawImage, collapseRotate: tallCollapse.visibleRotateCalls },
      boundary: boundaryTimings.map((t) => `${t.viewport}@${t.dpr}=${t.canvas.width}x${t.canvas.height} (${t.canvas.pixels})`),
      drawImageBaseline,
      particles: particleCounts,
      dom: report.domNodes,
      artReady: approvedAssets.artReady,
      artErrors: approvedAssets.errors
    }, null, 2);
    window.__auditShow = show;
  } catch (error) {
    window.__auditError = String(error);
    if (status !== null) status.textContent = `AUDIT ERROR\n${String(error)}`;
    console.error('M4B audit failed', error);
  }
}

void run();
