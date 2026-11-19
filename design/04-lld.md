# LLD — modules, interfaces, algorithms and data

The TypeScript below specifies contracts, not completed source code. Small naming adjustments are allowed; gameplay behavior and safety boundaries require Architect review if changed.

## Proposed source layout

```text
app/
  index.html
  package.json, package-lock.json, tsconfig.json, vite.config.ts
  src/
    main.ts                         # bootstrap / dependency wiring
    app/{controller,screens,focus}.ts
    domain/{types,balance,engine,placement,score,rng}.ts
    platform/{loop,input,lifecycle,profile,storage,audio,assets}.ts
    render/{canvas,projection,cats,effects,camera}.ts
    ui/{shell,hud,dialogs,collection}.ts
    styles.css
  public/assets/{manifest.json,...} # local approved assets only; placeholders can be code
  tests/{placement,engine,score,profile,input,loop}.test.ts
  README.md                         # exact local run/build/test instructions and limitations
```

Dependency direction is `app → domain/platform/render/ui`, and adapters depend on domain types. Domain imports none of the browser adapters. Pure placement/score modules need no timer or browser mocks. Profile and engine have injectable storage/RNG seed boundaries; tests do not need a running server for them.

## Core domain types

```typescript
type Mode = 'classic' | 'assist';
type Phase = 'SPAWN_CUE' | 'AIMING' | 'FALLING' | 'SETTLING' |
             'COLLAPSING' | 'PAUSED' | 'RESULTS';
type SkinId = 'default' | 'ginger' | 'tuxedo' | 'calico';
type FailureReason = 'MISS_TOP' | 'UNSTABLE_TOWER';
type PauseReason = 'user' | 'hidden' | 'blur' | 'resize' | 'interrupted';
interface BalanceConfig {
  version: 1;
  dt: number; width: number; height: number; mass: number;
  floorWidth: number; amplitude: number; spawnGap: number; gravity: number;
  periodStart: number; periodMin: number; periodDecay: number;
  minOverlapRatio: number; comInsetRatio: number;
  perfectRatio: number; snapRatio: number; assistStepRatio: number;
  spawnCueTicks: number; settleTicks: number;
  collapseTicks: number; reducedCollapseTicks: number; epsilon: number;
}
interface SettledCat { id: number; x: number; bottom: number; skinId: SkinId }
interface IncomingCat {
  spawnId: number; x: number; bottom: number; vy: number;
  phi: number; releaseX?: number; releaseOffset?: number;
}
interface JointCheck {
  index: number; left: number; right: number; comX: number;
  margin: number; normalizedSafety: number;
}
type PlacementResult =
  | { ok: true; finalX: number; perfect: boolean; safety: number;
      weakestJoint: number; joints?: readonly JointCheck[] }
  | { ok: false; reason: FailureReason; failureJoint: number;
      direction: -1 | 1; margin: number };
interface RoundState {
  runId: string; seed: number; rngState: number; tick: number;
  mode: Mode; phase: Phase; phaseTicks: number; spawnId: number;
  resume?: { phase: Exclude<Phase,'PAUSED'|'RESULTS'>; phaseTicks: number };
  pauseReason?: PauseReason;
  cats: readonly SettledCat[]; incoming?: IncomingCat;
  score: number; perfectChain: number; perfectCount: number;
  safety: number; weakestJoint?: number;
  failure?: { reason: FailureReason; joint: number; direction: -1 | 1 };
  skinId: SkinId; balanceVersion: 1;
}
```

`cats.length` is authoritative height; do not maintain a separately mutable height. Cat width/height/mass come from config for every cat. `skinId` is fixed per run; mixed appearances may be added later without mixed masses. Snap/perfect decisions retain releaseOffset even if final x is the support center.

`RoundState` is internally mutable only inside Engine. Publish read-only snapshots. Renderer must not mutate a shared cats array. Efficient views may reference frozen/stable committed cat objects; unit tests assert subscribers cannot modify simulation through snapshots.

## Engine and command boundary

```typescript
type GameplayCommand =
  | { type: 'drop'; runId: string; spawnId: number }
  | { type: 'nudge'; runId: string; spawnId: number; direction: -1 | 1 };
type LifecycleCommand =
  | { type: 'pause'; reason: PauseReason }
  | { type: 'resume' }
  | { type: 'skipCollapse' };
interface StartRound {
  runId: string; seed: number; mode: Mode; skinId: SkinId;
  reducedMotion: boolean;
}
interface Engine {
  start(options: StartRound): void; // replaces prior run; controller handles UI confirmation
  enqueue(command: GameplayCommand): void;
  control(command: LifecycleCommand): void; // synchronous, can freeze while rAF is stopped
  tick(): void; // exactly config.dt; no advancement while PAUSED/RESULTS
  snapshot(): Readonly<RoundState>;
  drainEvents(): readonly GameEvent[];
  dispose(): void;
}
```

`start` validates a finite integer seed, coerces it to uint32 and normalizes resulting0 to `0x6d2b79f5`; controller validates unlocked skin; engine validates mode, clears all queued commands/events/timers and makes SPAWN_CUE with spawnId=1. A newly generated runId is not a physics input. Controller emits/persists one run-start transaction immediately after start succeeds. `enqueue` accepts bounded FIFO <=8 commands; redundant drops coalesce per generation. Drop/nudge commands are consumed before advancing the next tick and apply to the last published x. `control(pause)` stores phase counters, clears input queue and freezes immediately. Repeated pause must not wrap PAUSED or overwrite its resume snapshot. Resume requires visible document, clears command queue and key-held state through input adapter. Lifecycle methods emit events synchronously; controller drains them after calling, not only on animation frames.

Within each tick: (1) drain valid commands; (2) update current phase once; (3) apply at most one timer transition; (4) increment tick once if the tick began live, even if it now enters RESULTS; (5) publish snapshot then events. Entering a new phase sets phaseTicks=0; do not spend a new phase's first timer tick within the same tick. A release changes AIMING→FALLING; its first integration may occur in that same tick, consistently in tests. SETTLING entered from contact begins counting on the following tick. New SPAWN_CUE never spawns an extra cat from a stale input.

RNG: unsigned 32-bit xorshift32 (`x^=x<<13; x^=x>>>17; x^=x<<5; state=x>>>0`), normalize seed 0 to constant `0x6d2b79f5`, choose left/right by next output low bit. Domain uses only seeded RNG. Crypto can supply an initial uint32 seed outside the engine; fall back to a local seed source if unavailable and label it non-security-sensitive. Presentation uses a different seed stream based on event ID so particles cannot consume gameplay RNG values. Cross-browser exact floating-point bit equality is not promised; golden fixtures use EPS and same configured tick sequence.

## Placement algorithm

`prepareDrop(incomingX, supportX, config)` returns releaseOffset, finalX (snapped if within range), perfectEligible. It runs exactly once at release. Falling must not resnap at contact.

`evaluatePlacement(cats, finalX, releaseOffset, config, debug=false)` is a pure function:

1. Construct a provisional cat at bottom=`cats.length×H` without modifying caller data.
2. Compute local top-contact intersection; reject overlap below threshold with EPS.
3. Traverse provisional list from top to bottom, accumulating mass and weighted x. For each j construct its support intersection, inset edges by M, evaluate COM and signed margin. Update the true minimum raw margin without EPS suppression. Any margin below -EPS fails. Select only among failed contacts: lowest index within EPS of the true minimum failed margin; an optional second reverse O(k) pass is permitted to anchor ties to that global minimum. Use physical joint index 1-based, matching gameplay doc.
4. If all pass, return the exact minimum normalized safety and lowest-index weak joint within EPS of that global minimum. Include passing margins equal to -EPS. Perfect is `abs(releaseOffset)<=perfectRatio×W+EPS`.
5. If failed: choose direction from Cj relative to contact center; if exactly centered choose +1 deterministically. MISS_TOP direction uses finalX-supportX, tie +1. Margin can be negative overlap/COM margin for diagnostics but is not a score.

Debug joint arrays are optional; don't allocate O(k) diagnostic objects in every rendered frame. Assist preview recomputes only after nudge/new spawn, not continuously. With fixed W/mass, reverse running sum avoids O(k²) suffix summation. New contact local overlap >=45% alone is insufficient.

## Event contracts

```typescript
interface EventBase { id: string; runId: string; tick: number }
type GameEvent = EventBase & (
  | { type: 'spawned'; spawnId: number; ordinal: number }
  | { type: 'released'; spawnId: number; x: number; offset: number }
  | { type: 'placementCommitted'; ordinal: number; x: number;
      grade: 'perfect'|'ordinary'; points: number; totalScore: number;
      perfectCount: number; perfectChain: number;
      safety: number; weakestJoint: number; mode: Mode; balanceVersion: 1 }
  | { type: 'roundFailed'; reason: FailureReason; joint: number; direction: -1|1 }
  | { type: 'phaseChanged'; from: Phase; to: Phase }
  | { type: 'paused'; reason: PauseReason }
  | { type: 'resumed' }
  | { type: 'resultsReady' }
);
```

Event id is `${runId}:${monotonicSequence}` and never reused within a page. Domain does not emit separate progress/score events for the same landing; `placementCommitted` is the single source. Controller fans out each drained batch once. Profile deduplicates by run and ordinal; Audio/FX bound their seen-ID sets to the current run. Replay cancels outstanding asset/effect callbacks by generation rather than trying to cancel already loaded images.

## Presentation contracts

```typescript
interface Viewport {
  cssWidth: number; cssHeight: number; backingScale: number;
  worldWidth: 10; worldHeight: number; cameraBottom: number;
}
interface Renderer {
  resize(box: {width:number;height:number}, dpr:number): void;
  render(state: Readonly<RoundState>, uiTimeSeconds: number): void;
  onEvents(events: readonly GameEvent[]): void;
  dispose(): void;
}
interface AudioPort {
  unlockFromGesture(): Promise<void>;
  onEvents(events: readonly GameEvent[]): void;
  setEnabled(enabled: boolean): void;
  setVolume(volume: number): void;
  pause(): void; resumeFromGesture(): Promise<void>; dispose(): void;
}
```

Projection in an unletterboxed canvas: scale=cssWidth/10; screenX=(worldX+5)×scale; screenY=cssHeight-(worldY-cameraBottom)×scale. Apply DPR only to context/backing store, never twice to coordinates. Keep image rendering bounds separate from collision rectangle. Camera and decorative clocks freeze during pause. After resizing, invalidate cached projection and rerender once before allowing explicit resume.

Wobble default: visual amplitudePx=scale×W×(0.006+0.024×(1-safety)); landing impulse <=0.01W, total displacement clamped to 0.04W. Decay landing impulse exponentially over ~0.45 s. Idle sway frequency <=1.5 Hz. Tilt <=2°. Use a normalized height factor over the top 12 visible cats so lower sprites move less; logical cats remain axis aligned. Mark logical contact danger with outline/text so transforms do not suggest extra support.

Collapse is presentation seeded from failure event, gravity 18, vx=direction×(1.0+0.08×localOrdinal), initial vy=2+0.1×localOrdinal, spin <=120°/s. Limit to 20 visible bodies; use bounded lifetimes <=1.2 s. Reduced motion: no ballistic animation; show a brief static lean and result transition after 0.2 s. Timer is engine-owned and must use the selected presentation duration without affecting score. Changing reduced-motion setting mid-collapse may shorten remaining duration but never extend it or change failure state.

## Profile schema and save transactions

Storage key: `cat-tower.profile.v1`. No cloud account, personal identifier or live tower is stored. Suggested document:

```typescript
interface ProfileV1 {
  schemaVersion: 1;
  revision: number;
  stats: { roundsStarted: number; totalPlacements: number; totalPerfect: number };
  records: Record<string, { bestHeight: number; bestScore: number }>;
  selectedSkin: SkinId;
  settings: {
    soundEnabled: boolean; volume: number;
    reducedMotion: 'system'|'on'|'off'; highContrast: boolean;
    preferredMode: Mode; tutorialSeen: boolean;
  };
  lastApplied: null | {
    runId: string; placementOrdinal: number; score: number; perfectCount: number;
  };
}
```

Record namespace is `${mode}@${balanceVersion}`, initially `classic@1`, `assist@1`. Keep historical namespaces when balancing changes; don't merge incomparable scores. Skin unlocks are derived from totalPlacements and constants; do not persist a conflicting unlocked list. A locked/unknown selectedSkin normalizes to default. Sound defaults on at volume 0.6 but cannot play until a gesture; motion defaults system; highContrast false; mode Classic; tutorialSeen false; counters/records 0.

Profile rules:

- All counters are finite nonnegative safe integers. volume is finite clamped [0,1]. Validate enums, own properties and root object shape; never execute or inject profile strings into HTML.
- Missing known optional settings use defaults. Negative/NaN counters, malformed JSON, invalid schema root or future schema cause temporary mode while preserving raw storage. Enforce <=64 KB input before parsing. Version 0 is not invented; there is no migration from an unspecified prior game. Future schema migration must have explicit fixtures.
- Startup: acquire ownership or decide temporary mode, read once, validate, derive skins, publish state. First empty valid profile is persisted only by an owner. Do not erase invalid/future data. No reset-all button is needed in MVP.
- Start transaction increments roundsStarted once, sets lastApplied to new run/ordinal0/score0/perfect0 and revision+1. It runs after Engine.start succeeds.
- Landing transaction accepts current runId with exactly ordinal=`lastApplied.ordinal+1`; duplicates/older ordinals are no-ops. Old run IDs cannot write to a new run. A gap is an internal error, not permission to invent missing totals. Add exactly 1 placement and 0/1 perfect; update mode record maxima from event; set lastApplied values; increment revision. Queue newly crossed unlock toasts once.
- Update in-memory profile and publish UI immediately; serialize one whole document with one synchronous `setItem` per transaction. Do not save per render/tick. An exception switches to temporary mode for the rest of the page, keeps earned in-memory stats and displays “Progress is saved only for this session.” Do not retry old deltas on a timer.
- Refresh uses saved counters/records but does not replay lastApplied or restore run; next Start replaces the checkpoint. Results merely displays already committed state, avoiding double awards.
- Settings/skin transaction only touches validated fields and revision. If temporary, updates memory only. Selecting skin during active play is disallowed in UI; old assets may finish loading without changing the active run.
- Use one lifetime same-origin Web Lock, released by closing page; no unreliable unload flush is required. Other tabs read existing storage then choose Retry or temporary play. They cannot overwrite the owner's profile. Retry ownership is allowed only on Home without a live run; if temporary progress exists, warn that enabling saves reloads the durable profile and does not merge temporary deltas, and require confirmation. Without lock API or storage, play is explicitly temporary. Never implement a pretend exclusive lock via a timestamp lease.

One `ProfileService` owns the profile reference; all changes go through `startRun`, `commitPlacement`, `updateSettings`, `selectSkin`. Unexpected failure cannot zero a valid previous profile. Storage writes are local browser data only and require no external API.

## Input and focus details

- A dedicated HTML Drop button is always available. Its click handler dispatches once and is also usable by screen readers. Primary `pointerdown` on the canvas dispatches Drop; suppress its later compatibility click path. Never attach both touchstart and mousedown.
- Use Pointer Events for canvas, accept only primary pointer and primary button, ignore secondary fingers/right-click. `touch-action:none` only on the playfield, not on menus or the whole document. Pointer cancel does not release a later cat.
- Canvas pointer activation and Drop button have separate paths, one shared guarded dispatcher and no bubbling duplicate. Event from a settings/pause/control region cannot reach canvas behavior.
- Space/Enter from a focused playfield (focusable labeled play region) queues Drop on keydown when `!repeat`; prevent default scroll there. Do not globally intercept native button activation. Left/Right nudge only in Assist and while play region is focused; dedicated nudge buttons work via click.
- Escape pauses if live. Dialog Escape closes that dialog first, never resumes. Pause/Results dialogs move focus to heading/primary action and restore to initiating control or play region on close. Trap Tab within a modal; background is inert.
- After Resume or Replay, require a fresh keyup/down or pointer activation; the click that started/resumed cannot propagate into Drop. Generation changes invalidate queued actions.

Pointer Events give a unified pointer interface; default actions should be scoped to the play area. [MDN Pointer Events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events).

## Lifecycle, cleanup and observability

Use one rAF subscription. On hide/blur call engine.control(pause), drain events, clear command queue/held keys/accumulator and suspend audio. On show do not resume automatically. Resize uses the same pause mechanism and debounces viewport sizing, not physics. Listener ownership uses `AbortController` or explicit dispose; new rounds reuse platform listeners instead of registering again.

`dispose` cancels the loop, removes listeners, disposes audio nodes and releases references/lock hold promise. Loop and service errors are caught at controller boundary; programmer errors appear in development diagnostics and user-safe error view. Debug data records seed/build/balance/state, never secrets. Performance measurements are separate from gameplay state.

## M1 review clarifications — 2026-11-16

[Review and correction](11-m1-engine-review.md) resolves seed0, MISS_TOP indexing, retained post-failure safety, suspended pause counters, event ordering/timestamps, event draining on replacement and the later motion-change adapter. These clarifications are authoritative over earlier ambiguous wording. M1 acceptance is pending CT-DEV-001R; passing the initial52 tests alone is insufficient.
