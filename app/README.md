# Nekotsumi app

Nekotsumi is a static browser game with Classic and Assist modes, local saves, unlocks, and soft sound effects. See the [root README](../README.md) for build instructions. The milestone notes below record the earlier M1 and M2 work.

See the [design documentation](../design/README.md) for the gameplay rules, architecture, and acceptance criteria.

## Toolchain (portable, local, pinned)

Node/npm/bun/deno were absent from `PATH`. M1 uses an official portable Node release stored **outside** the app and excluded from source/build output:

| Item | Value |
|---|---|
| Toolchain path | `.toolchain/node-v26.13.1-linux-x64` |
| Node | v26.13.1 (Linux x64), official tarball |
| npm | 11.20.0 (bundled) |
| TypeScript | 5.9.3 (devDependency, locked) |
| `@types/node` | 26.6.6 (devDependency, locked) |
| Vite | 8.3.8 (devDependency, locked) |
| Tarball URL | `https://nodejs.org/dist/v26.13.1/node-v26.13.1-linux-x64.tar.xz` |
| Tarball SHA-256 | `5c063e46bab0fbc1c17cc445d7ff129cbdcd0471be6ed83b6ab864f8143bc864` |
| Verification | `sha256sum -c SHASUMS256.txt` → `OK` against the official `SHASUMS256.txt` for v26.13.1 |

No system runtime was installed and no system configuration was changed. `node_modules/`, `.test-build/` and future `dist/` are git-ignored. The `.toolchain` directory is a sibling of `app/`, so it cannot enter app source or build artifacts.

## Commands

```bash
export PATH="$PWD"/.toolchain/node-v26.13.1-linux-x64/bin:$PATH
cd app
npm ci
npm test          # strict typecheck + compiled domain/browser tests + node:test
npm run build     # typecheck + Vite production build to dist/
npm run dev       # loopback dev server, http://127.0.0.1:5177/
npm run preview   # loopback built preview, http://127.0.0.1:4177/
npm run bench     # placement-evaluation timing report
```

`npm test` sequence: `tsc -p tsconfig.json --noEmit` (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), `tsc -p tsconfig.test.json`, then Node's built-in test runner on compiled JS. One runner; no second test stack.

## File map

| Path | Purpose |
|---|---|
| `src/domain/types.ts` | Public domain types: config, state, commands, events, engine interface |
| `src/domain/balance.ts` | Balance v1 values and derived tolerances/period/spawn geometry |
| `src/domain/rng.ts` | xorshift32 seeded stream; seed-0 fallback; spawn-side selection |
| `src/domain/placement.ts` | Release snap/perfect preparation; pure every-contact suffix-COM evaluator |
| `src/domain/score.ts` | Perfect chain scoring, ordinary reset, record namespace helper |
| `src/domain/engine.ts` | Fixed-step engine: phases, falling, placement, pause/results, guards, events |
| `tests/fixtures.test.ts` | Design fixtures 1–10, 12, 13 plus config/RNG boundary cases |
| `tests/engine.test.ts` | Fixture 11, cues, guards, pause, collapse, results, replay, determinism, immutability |
| `tests/helpers.ts` | Shared test setup and Assist-mode action helpers |
| `src/main.ts` | Browser shell/controller: screens, HUD, input, pause/results, loop wiring |
| `src/diag.ts` | Art diagnostic route |
| `src/app/loop.ts` | Fixed 1/60 accumulator, five-tick cap and 250 ms interruption |
| `src/app/input.ts` | Shared pointer/button/key dispatcher and generation guards |
| `src/app/session.ts` | Engine lifecycle, event fan-out and replay generations |
| `src/app/assist.ts` | Assist offset/overlap/predicted-stability preview |
| `src/platform/assets.ts` | Sanitized production-02 manifest validation and SVG loading |
| `src/platform/seed.ts` | Local non-security seed/run-id source |
| `src/render/renderer.ts` | Canvas scene, camera, reactions and effects |
| `src/render/art.ts` | Body/face mapping, shared pivot transforms and placeholders |
| `src/render/scene.ts` | Background/floor mapping and fallbacks |
| `src/render/projection.ts` | World-to-screen projection and camera target |
| `src/render/diagnostics.ts` | 4×6 art grid, overlays, transform and travel checks |
| `index.html`, `diagnostics.html`, `src/styles.css` | Semantic shell and responsive layout |
| `public/assets/production-02/` | 12 runtime SVGs + sanitized runtime manifest only |
| `tests/browser.test.ts` | Loop cap/interruption, input generation/duplicate and session/replay tests |
| `scripts/bench.ts` | 100–2000 cat placement timing report |
| `package-lock.json` | Reproducible dependency lock |

## M2 browser slice

- **Run:** `npm run dev` (HMR) or `npm run build && npm run preview`; both bind loopback only. The built preview used for evidence is `http://127.0.0.1:4177/`.
- **Screens:** Home with Classic/Assist choice, controls explanation and temporary-session notice; live HUD with score, stacked count, mode, perfect chain ≥2, named safety band, Pause and Drop; Pause with Resume/Restart/Home and abandonment confirmations; collapse caption plus Skip; Results with score/height, Replay, Change mode and Home. No fabricated best/unlock claims.
- **Controls:** primary canvas pointerdown, native Drop button, Space/Enter only from the focused play region, Assist Left/Right buttons and arrow keys; repeats cannot drop; Escape pauses and Escape on Pause stays paused; dialogs use native modal inertness plus a focus loop.
- **Lifecycle:** one rAF owner, fixed 1/60 accumulator, max five ticks/frame, >250 ms foreground gap pauses as `interrupted`, hidden/blur/meaningful resize pause before the next frame, resume requires a fresh gesture and resets the accumulator. Replay drains old events and resets presentation/input generations without adding listeners.
- **Art:** only the sanitized production-02 runtime subset is served. The loader validates IDs, relative URLs, sizes, geometry, pivots and anchors; body/face share the pivot/squash/tilt transform. Production-02 background `576×1008` and floor `topLineY=22` are consumed from metadata. Missing/invalid assets fall back per asset without changing simulation. The user-approved CT-ART-004 tuxedo variant is mapped through a separate sanitized URL; the original tuxedo remains retained but inactive (12 mapped SVGs / 9,317 active bytes; 13 physical files / 10,739 bytes).
- The production build includes the game and a 404 page. Developer diagnostics, fault injection, and capture controls are available only through the Vite development server.
- **Local diagnostics:** With `npm run dev`, `/diagnostics.html` renders all four coats × six expressions at 80 CSS px logical width, DPR1/2 toggles, overlays for logical rect/pivot/face center, squash/tilt stress and a travel/floor projection strip. It is a local verification view, not a cosmetics UI.
- **Presentation:** target guide/shadow, named safety text and danger outline, collision-joint cue, landing squash/star cue, bounded top-cat sway and ≤20-body collapse presentation; reduced motion removes decorative movement and uses static collapse feedback. Audio is intentionally silent in M2.
- **Art status:** base production-02 appearance approval and the CT-ART-004 tuxedo variant approval are separate records. All 12 mapped runtime SVGs decode; tuxedo variant checks pass at 80 px DPR1/DPR2 with no pixel-contrast claim.
- **Art sync:** `app/public/assets/production-02/runtime` is the canonical app source. If Studio assets are re-synced, map `tuxedo` to the approved variant and run the art-integrity test; never overwrite the retained original or base appearance metadata.
- **Startup/fallback:** the complete optional art load has one 1.5 s deadline; on stall it aborts and starts with placeholders, and late completion is ignored across replacement runs.
- **Layout budget:** the game screen uses a fixed viewport-height budget with a shrinkable playfield and a fixed guidance/control panel. At 320×568, 390×844, 844×390 and 1280×720 the complete Assist readout, Drop/nudges, HUD/Pause, chain and temporary notice fit at zero initial scroll; short landscape uses a side control panel and compact Home. Drop is 64 px at small sizes/landscape; collapse hides disabled Drop/nudges and shows one 64 px Skip action.
- **Held keys:** native Enter clicks are gated by keydown/keyup ownership, so a held key cannot drop the next cat; Resume/Replay held keys do not become Drop.
- **Support-aware copy:** before the first cat, offset/prediction use “floor center”/“platform” in the visual readout, polite nudge announcement and failure display; after the first cat the existing top-cat wording is retained. Engine failure enums/scoring are unchanged.
- **Temporary session only:** no localStorage/profile/locks/records/unlocks/tutorial persistence. The Home/Results notice and persistent in-game notice say progress is not saved.
- **Evidence:** see [`M2-EVIDENCE.md`](M2-EVIDENCE.md) for commands, build hashes, browser identity, pass/fail/not-run matrix and screenshot list.

### Screenshot capture note

The private browser runs headless and throttles `requestAnimationFrame` to roughly one frame per 800 ms. Deterministic capture uses local-only `?capture=1`, which adds `window.__catTowerDebug.advance(ticks)` and suppresses automatic frame-gap/blur/resize pause solely for screenshots; it does not alter engine rules or rendering. Normal `?` runs keep the required 250 ms interruption pause and were used for pause/resize/blur checks. This is a testing aid, not a gameplay mode.

## Implemented behavior

- Balance v1 exactly as `02-gameplay-rules.md`: W=2.6, H=2.6/1.55, floor 4.4, A=3.2, G=2.6, gravity 24, period 5.2→3.2 (0.04 per placement), overlap 0.45W, COM inset 0.04W, perfect 0.12W, snap 0.08W, Assist step 0.10W, cue 9 / settle 14 / collapse 72 / reduced 12 ticks, EPS 1e-9.
- Fixed 1/60 s semi-implicit Euler; swept vertical crossing on the support plane; first-floor support is `[-2.2, +2.2]`; top-only support (a miss cannot be rescued by a lower cat).
- Placement: release-time snap and pre-snap perfect grade, local overlap check, then one reverse suffix traversal (`O(k)`, no recursion) checking **every** joint with `Cj` and safe inset. The exact raw minimum decides stability; among failed contacts, the lowest index within EPS of that global minimum is selected and its actual margin/direction returned. Passing safety is the exact minimum normalized value with the lowest passing index within EPS. No pairwise tolerance drift; no second pass needed.
- Scoring: stable 10; perfect 15/17/19/21/23/25 by chain; ordinary resets chain; failure awards nothing.
- Engine phases: `SPAWN_CUE → AIMING → FALLING → SETTLING → SPAWN_CUE/…` or `FALLING → COLLAPSING → RESULTS`; `PAUSED` stores exact phase/ticks; synchronous `control()`.
- Classic seeded edge start with sine motion during cue/aiming; Assist stationary start, ±0.26 nudges clamped to ±3.2.
- Guards: runId + spawnId generations, drop only in AIMING, nudge only in Assist/AIMING, duplicate drops coalesce, queue ≤8, inputs ignored while paused/results, old-generation inputs discarded.
- Events: monotonic IDs `${runId}:${sequence}`, `spawned`, `released`, `placementCommitted` exactly once per landing, `roundFailed` exactly once, `phaseChanged`, `paused`, `resumed`, `resultsReady`. Drained batches are returned once.
- Snapshots and events are deeply frozen (`Object.freeze`); settled cat objects and the published cat array are stable/frozen; prior snapshots remain unchanged.
- Domain imports no DOM, storage, audio, clock, timer or browser API. Simulation RNG is consumed only on spawn (one xorshift step per cat).

## Test evidence (actual runs, 2026-11-16 UTC)

```text
$ npm test
> tsc -p tsconfig.json --noEmit        exit 0
> tsc -p tsconfig.test.json            exit 0
> node --test .test-build/tests/*.test.js
ℹ tests 67
ℹ pass 67
ℹ fail 0
ℹ duration_ms 149
```

All 52 pre-correction tests remain, five CT-DEV-001R regressions were added, and M2 adapter/validator/art-integrity/copy tests cover loop interruption/cap, input generation/duplicate cases, session/replay cleanup, nonfinite metadata, the approved tuxedo variant and floor-vs-top-cat wording.

Fixture coverage: F1 centered floor, F2 snap/EPS boundary, F3 perfect boundary, F4 exact minimum overlap vs COM, F5 inclusive zero-safety COM, F6 older floor contact, F6b debug joints, F6c intermediate joint, F7 top-only miss, F8/F9 scoring and chain cap, F10 period curve, F11 28-tick fall, F12 mirror symmetry/no mutation, F13 1000-cat stable and near-edge lower-contact failure. M1R regressions cover the supplied EPS-straddling failure and mirror, exact/near `-EPS` boundaries, raw-minimum failure selection with both contacts failing, a passing lower joint near a failure, deterministic selection and exact minimum safety. State/input coverage includes cue gating, duplicate and stale generations, pause/resume in all live phases, repeated pause, skip, results freeze/replay, seed reproducibility, RNG non-consumption by presentation state, snapshot immutability, event tick stamps and exactly-once commits.

`npm run bench` on this VPS (Node v26.13.1, x64; **not phone validation**):

| cats | iterations | mean ms | p50 ms | p95 ms |
|---:|---:|---:|---:|---:|
| 100 | 5000 | 0.0049 | 0.0023 | 0.0083 |
| 250 | 3000 | 0.0071 | 0.0055 | 0.0122 |
| 500 | 2000 | 0.0129 | 0.0110 | 0.0170 |
| 1000 | 1000 | 0.0245 | 0.0216 | 0.0343 |
| 2000 | 500 | 0.0487 | 0.0434 | 0.0923 |

Scaling is linear per evaluation. Snapshot publication caches the frozen cats view, so per-tick work does not rescan tower history.

## Resolved design decisions (Architect, `design/11-m1-engine-review.md`)

1. **Seed 0:** finite integer seeds coerce to uint32; resulting 0 normalizes to `0x6d2b79f5`; snapshot records the normalized seed. Implemented.
2. **MISS_TOP joint:** attempted candidate index `k=cats.length+1`; direction from `finalX - supportCenterX`, centered tie `+1`. Implemented.
3. **Safety after failure:** snapshot keeps the last committed tower safety and weakest joint; `failure` overrides normal danger presentation. Implemented in domain; UI behavior is M2.
4. **Pause counters:** PAUSED retains suspended `phaseTicks`; `resume` is authoritative; repeated pause cannot overwrite it. Implemented and tested.
5. **Events/ticks:** events carry the tick count before that tick's increment; lifecycle events use the current count; a live tick that enters RESULTS counts once; calls starting PAUSED/RESULTS do not count. Landing emits `placementCommitted` before `phaseChanged`; spawn after settling emits `phaseChanged` before `spawned`. Implemented and tested.
6. **Motion preference changes:** start-time collapse duration remains for M1; the shortening-only dynamic hook is deferred to M4. No unused hook added.
7. **Start clears events:** accepted. The controller must drain/fan out old-run events before calling `start`; the engine then clears and emits the new spawn once. Controller behavior is M2.

## Not implemented (M1 boundary)

Browser rendering/canvas, DOM screens, pointer/keyboard input adapter, rAF loop, visibility/focus/resize handling, profile/storage/Web Locks, records/unlocks/settings/tutorial, audio, art/placeholders, accessibility passes, device measurements, and any deploy/public release. No playable build is claimed. Classic/Assist records and balance namespaces exist only as the pure `recordNamespace` helper.
