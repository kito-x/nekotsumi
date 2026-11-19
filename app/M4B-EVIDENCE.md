# M4B performance and candidate audit — evidence

> Architect reconciliation after CT-TEST-005 (2026-11-16): the earlier HEAD-only probe below omitted Content-Encoding, but current GET with Accept-Encoding:gzip returns gzip. Independent Architect GET probes observed index2,866 B, main18,722 B and CSS4,720 B; decompressed hashes match the accepted build, and identity GETs match raw sizes. Therefore the earlier claim that preview GET is uncompressed is superseded; no server-change conclusion follows from HEAD/GET differences. File arithmetic and the28,740 B startup gzip6 budget are unchanged. See design/21-m4b-audit-review.md closure and evidence/ct-test-005/CT-TEST-005-report.md. Original audit datasets remain retained.

Date: 2026-11-16 UTC. Scope: CT-DEV-004B and the bounded CT-DEV-004BR correction. Status: **initial audit complete; one low-severity backing-cap rounding defect was corrected under explicit authorization; no optimization or release claim**. M4B next-stage work is not started.

The initial audit was production-read-only. CT-DEV-004BR separately authorized only the canvas backing-dimension calculation, its regression and a correction build. No art, config, schema, dependency, physics/layout or gameplay behavior changed. Baseline and corrected build identities:

| Build | File | SHA-256 |
|---|---|---|
| Baseline (pre-correction) | `dist/index.html` | `222fd01ced1163ebc3338bd9f483df79a4369e1cba3811e50b3102b8044861b6` |
| Baseline | `dist/assets/main-DroJ0HWb.js` | `c6f622bd9bf3d078f61e36c6790e69a4643ae0414de62eef39cc88ef314998bd` |
| Baseline / corrected | `dist/assets/scene-BP3tka9g.css` | `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1` |
| Corrected | `dist/index.html` | `d1eefdb38e6d14a10d5c99ff0281ede255f5a9fa0d78f7c02dd9bd555043ad5a` |
| Corrected | `dist/assets/main-BWgfwA9j.js` | `9d0e7e068870392d64e42912b814287c74957944757247f447d1663c2477beb5` |

## Commands, exits and audit server

```text
npx tsc -p tsconfig.json --noEmit              exit 0
npm run build:test                             exit 0
node .test-build/scripts/audit-engine.js        exit 0
npm run bench                                  exit 0
npx vite --config scripts/audit-renderer/vite.config.ts
  audit server http://127.0.0.1:4181/          HTTP 200 while open
node .test-build/scripts/audit-transfer.js      exit 0
npm test (baseline audit)                       exit 0 — 91/91 pass, 0 fail
npm test (correction, 92 total)                 exit 0 — 92/92 pass, 0 fail
npm run build (correction only)                 exit 0
curl http://127.0.0.1:4177/                     HTTP 200 (corrected build)
```

The audit server was started only for the renderer page and stopped after the correction checks. `127.0.0.1:4181` now refuses connections; the normal preview on `127.0.0.1:4177` serves the corrected build and remains running detached.

Audit environment: Node v26.13.1, x64 Linux, AMD EPYC 9J14 (3 logical CPUs in this environment), 8,320,937,984 bytes memory; Balance v1, dt 1/60, Assist step 0.26. Browser: OpenBot private browser Chrome 156, headless/emulated; controlled renderer page at 1280×715, fixture canvases at the stated sizes.

## CT-DEV-004BR backing-cap correction

**Finding:** `GameRenderer.resize` capped the scale at 2,000,000 pixels but rounded each backing dimension upward independently. The Architect's compiled resize cases exceeded the cap: 1000×1600 DPR2 → 1118×1789 = 2,000,102; 2160×3840 DPR2 → 1061×1886 = 2,001,046.

**Fix:** only the integer backing dimensions changed. After the existing scale calculation, if the rounded product exceeds 2,000,000, both dimensions are floored through the cap scale, followed by a final integer bound until the product is within the cap. Dimensions remain finite and ≥1; DPR≤2, CSS dimensions, projection/letterboxing, transforms, gameplay, art and balance are untouched.

Regression: `tests/renderer-resize.test.ts` invokes the real `GameRenderer.resize` with a minimal Canvas/context stub. Results on the corrected source:

| Available CSS / DPR | Backing | Pixels |
|---|---|---:|
| 390×844 /2 | 780×1688 | 1,316,640 |
| 844×390 /2 | 780×780 | 608,400 |
| 1000×1600 /2 | 1117×1788 | 1,997,196 |
| 2160×3840 /2 | 1060×1885 | 1,998,100 |
| 100×5000 /2 | 200×10000 | 2,000,000 |

The same four limiting/tall cases were exercised in the browser audit page through actual `GameRenderer.resize`; `boundaryTimings` reports 1117×1788, 1060×1885 and 200×10000 with no non-finite dimensions.

**Tall cap-stress fixture:** the earlier joint-994 portrait fixture observed 7 settled bodies and 7 collapsed bodies; it did **not** exercise the 24/20 caps. A new audit-only 100×5000 CSS, 1,000-cat fixture with failure joint 1 measured:

| Fixture | Bodies | Faces | Rotate/collapse bodies |
|---|---:|---:|---:|
| Tall settled, 100×5000 | 24 | 24 | 1 (top sway) |
| Tall collapse, joint 1 | 24 | 24 | 20 |

The 24-body/20-collapse caps are now actually exercised. The 6-particle landing check remains unchanged. This tall fixture is an audit-only stress state, not supported whole-app UI.

Corrected build: `npm test` 92/92 pass, typecheck exit 0, build exit 0. Dist 127,359 bytes; main `main-BWgfwA9j.js` `9d0e7e…`; index `d1eefd…`; CSS unchanged. Engine timing and full layout/storage/restart suites were not rerun because only the backing-dimension calculation changed; ordinary Chrome smoke on the corrected build landed one cat (score 15) and refreshed best 15/1, total 1 with approved art.

## 1. Real-engine 1,000-cat fixture

Fixture construction used only public `engine.start`, `enqueue`, `tick`, `snapshot` and `drainEvents`; no `ProfileService`, localStorage, private field assignment or balance change. Mode Assist, seed `20261116`, every incoming cat nudged into the snap tolerance and dropped centered.

| Fixture item | Result |
|---|---|
| Placement count | 1,000 exactly, ordinals 1–1,000 |
| Cats retained | 1,000 |
| Score / perfect | 24,970 / 1,000 |
| Safety / phase | 1 / AIMING at the 1,000-cat fixture boundary |
| Construction wall time | 84.313 ms |
| Fixture SHA-256 digest | `fa99ba77425d28a1ee16aa711f2effe5d74c297182b75e5725913efd76319385` |
| Later 1,100-cat digest | `ca857c138823350d9aa3db0bac2a1cf73a16c548c3402f45f3aa9f57de527fa0` |

An earlier 1,000-cat snapshot was retained through the 100 extra commits: `cats=1000`, `frozen=true`, first/last cat identity unchanged, score and tick unchanged. During 10,000 idle AIMING ticks the `cats` array reference stayed identical (`catsSame=true`), frozen, and the earlier snapshot stayed unchanged. The only full-array copy observed is the intentional one-time `catsView` slice on each placement; no per-frame history scan or all-cat clone occurs in steady aiming.

### Timed code path

`engine.tick(); engine.snapshot(); engine.drainEvents()` measured with `performance.now()`.

| Sample | Count | p50 ms | p95 ms | p99 ms | mean ms | max ms |
|---|---:|---:|---:|---:|---:|---:|
| Steady AIMING at 1,000 cats | 10,000 | 0.000841 | 0.001482 | 0.001592 | 0.001157 | 0.154 |
| Placement-commit tick, heights 1,000–1,099 | 100 | 0.020972 | 0.044237 | 0.167233 | 0.031436 | 0.197 |

The commit set is the single tick whose settled-cat count increases; it includes placement evaluation and the one-time cats-view slice. Falling/settling and centering ticks are excluded from the commit statistics. The p95 commit tick is 0.044 ms, well below the 2 ms target on this VPS. This is not a phone timing claim.

### Existing placement benchmark (separate dataset)

`npm run bench`, evaluator only (not full engine tick):

| Cats | Iterations | mean ms | p50 ms | p95 ms |
|---:|---:|---:|---:|---:|
| 100 | 5,000 | 0.0048 | 0.0041 | 0.0071 |
| 250 | 3,000 | 0.0070 | 0.0055 | 0.0121 |
| 500 | 2,000 | 0.0128 | 0.0109 | 0.0201 |
| 1,000 | 1,000 | 0.0244 | 0.0217 | 0.0341 |
| 2,000 | 500 | 0.0489 | 0.0433 | 0.0932 |

## 2. Actual Canvas renderer audit

The audit page imports the real `src/render/renderer.ts` and `src/platform/assets.ts` through the Vite dev audit server. It is an unbundled source page, not the production `dist` bundle. The fixture states are synthetic audit states, not normal app UI or human-played rounds.

### Renderer CPU time (baseline pre-correction run)

Controlled `renderer.render(state, 1/60)` calls after 5 warmups; 40 samples per scenario. **Renderer CPU time only** — excludes compositor/GPU completion, frame cadence and rAF. Values in ms.

| Viewport / DPR | Cats | p50 | p95 | p99 | Canvas backing |
|---|---:|---:|---:|---:|---|
| 390×844 DPR1 | 0 | 0 | 0.1 | 0.1 | 390×844, 329,160 px |
| 390×844 DPR1 | 100 | 0.1 | 0.2 | 0.6 | 390×844, 329,160 px |
| 390×844 DPR1 | 1,000 | 0.1 | 0.2 | 0.2 | 390×844, 329,160 px |
| 390×844 DPR1 | 2,000 | 0.1 | 0.2 | 0.5 | 390×844, 329,160 px |
| 390×844 DPR2 | 0 | 0 | 0.1 | 0.1 | 780×1688, 1,316,640 px |
| 390×844 DPR2 | 100 | 0.1 | 0.2 | 0.2 | 780×1688, 1,316,640 px |
| 390×844 DPR2 | 1,000 | 0.1 | 0.1 | 0.2 | 780×1688, 1,316,640 px |
| 390×844 DPR2 | 2,000 | 0.1 | 0.2 | 0.2 | 780×1688, 1,316,640 px |
| 844×390 DPR2 | 0 | 0 | 0.1 | 0.1 | 780×780, 608,400 px |
| 844×390 DPR2 | 100 | 0 | 0.1 | 0.2 | 780×780, 608,400 px |
| 844×390 DPR2 | 1,000 | 0 | 0.1 | 0.1 | 780×780, 608,400 px |
| 844×390 DPR2 | 2,000 | 0.1 | 0.1 | 0.2 | 780×780, 608,400 px |

The 844×390 whole-app viewport is represented by the existing renderer's letterboxed 390×390 CSS canvas (780×780 backing at DPR2); this is the actual `resize` behavior, not a full-page layout claim. Every `cameraBottom`/world height was finite and matched `cameraBottomTarget` (difference 0 in the audit run). Top cat bottom and incoming bottom were finite at 1,000 and 2,000 cats. The corrected build re-ran the browser renderer suite; CPU p95 remained in the same 0.1–0.2 ms coarse-timer band, and all corrected boundary allocations are in CT-DEV-004BR above.

Fallback-art placeholder renders at 390×844 DPR1 had p50 0–0.1 ms, p95 0.1–0.1 ms, p99 0.2 ms for 0/100/1,000/2,000 cats; fallback assets have no images and remain finite. Reduced-motion 1,000-cat view was finite (`cameraBottom 1668.763`, world 21.641).

### Draw and DOM counts (actual Canvas instrumentation)

Approved-art counts at 390×844. `drawImage` baseline at 0 cats is 2 (background + floor). Body and face image calls are two per visible cat; faces are not counted as extra cats.

| Fixture | drawImage calls | Bodies | Faces | rotate calls | Other |
|---|---:|---:|---:|---:|---|
| 0 settled | 2 | 0 | 0 | 0 | baseline |
| 100 settled | 16 | 7 | 7 | 1 | top-cat sway |
| 1,000 settled | 16 | 7 | 7 | 1 | top-cat sway |
| 2,000 settled | 16 | 7 | 7 | 1 | top-cat sway |
| 1,000 collapse, joint 994 | 16 | 7 | 7 | 7 | 7 animated bodies; did not reach the cap |
| Tall 1,000 settled, 100×5000 | 50 | 24 | 24 | 1 | 24-body cap exercised |
| Tall 1,000 collapse, joint 1 | 50 | 24 | 24 | 20 | 20-collapse cap exercised |
| 1 cat perfect landing | — | — | — | — | 6 landing-star arcs (baseline 0) |

The camera frames only the top seven settled cats at the portrait size, so 7 is the measured visible count. The joint-994 fixture animated 7 bodies and did **not** exercise the 20-body cap; the tall 100×5000 fixture does, measuring 24 settled bodies/24 faces and 24 collapsed bodies/24 faces with 20 collapse rotations. Particles are 6 arcs, under 40. `document.querySelectorAll('*')` was 12 before and after the 2,000-cat render (`delta=0`); no DOM node exists per historical cat.

A standalone requestAnimationFrame observation in the audit browser produced two intervals of about 1,016.6 ms in a 3 s window. This is headless/private-browser throttling; it is not a 60 fps or smoothness result, and no frame-time claim is made.

Screenshots: `renderer-1000-approved-390x844.png` (top/guide context), `renderer-1000-collapse-390x844.png`, `renderer-1000-fallback-390x844.png`, `renderer-2000-approved-390x844.png`, `renderer-1000-approved-844x390.png`, `renderer-1000-reduced-390x844.png`.

## 3. Standardized transfer budget

Exact startup set from `dist/index.html`: main JS, modulepreload shared scene JS and scene CSS. Per-file `zlib.gzipSync` levels 6 and 9; never concatenated. HTML and mapped runtime art are separate rows.

### Baseline pre-correction build

| Group | File | Raw | gzip6 | gzip9 |
|---|---|---:|---:|---:|
| Startup | `assets/main-DroJ0HWb.js` | 61,012 | 18,666 | 18,628 |
| Startup | `assets/scene-ChEnLJaP.js` | 15,271 | 5,298 | 5,289 |
| Startup | `assets/scene-BP3tka9g.css` | 18,545 | 4,720 | 4,713 |
| **Startup total** | 3 files | **94,828** | **28,684** | **28,630** |
| HTML | `index.html` | 11,271 | 2,864 | 2,854 |
| Art | mapped runtime manifest + 12 SVGs | 13,879 | 6,068 | — |
| Optional | `assets/diagnostics-Do1KGaVf.js` | 3,747 | 1,901 | 1,901 |
| **Cold load** | HTML + startup + art | **119,978** | **37,616** | — |

### Corrected build (CT-DEV-004BR)

| Group | File | Raw | gzip6 | gzip9 |
|---|---|---:|---:|---:|
| Startup | `assets/main-BWgfwA9j.js` | 61,145 | 18,722 | 18,684 |
| Startup | `assets/scene-ChEnLJaP.js` | 15,271 | 5,298 | 5,289 |
| Startup | `assets/scene-BP3tka9g.css` | 18,545 | 4,720 | 4,713 |
| **Startup total** | 3 files | **94,961** | **28,740** | **28,686** |
| HTML | `index.html` | 11,271 | 2,866 | 2,855 |
| Art | mapped runtime manifest + 12 SVGs | 13,879 | 6,068 | — |
| Optional | `assets/diagnostics-Do1KGaVf.js` | 3,747 | 1,901 | 1,901 |
| **Cold load** | HTML + startup + art | **120,111** | **37,674** | — |

- Corrected dist: **127,359 bytes across 20 files**. Cold-load requests: 17 (HTML + 3 startup + 13 mapped art); browser subresource entries: 16 excluding navigation.
- Art set: manifest, background, four mapped body SVGs (including `tuxedo-legibility`, excluding unmapped original tuxedo), six face SVGs, floor.
- Gate startup JS+CSS gzip6 ≤200,000: **28,740 — PASS**.
- Gate release first-load raw ≤2,000,000: **120,111 — PASS**.
- HTTP probe with `Accept-Encoding: gzip` on the loopback preview: **no `Content-Encoding` header**, `Cache-Control: no-cache`, ETag/Last-Modified present. The gzip figures are estimates for a compressing host, not observed response encoding. This is the source of the earlier differing totals; the baseline level9 per-file startup sum is 28,630 bytes, matching the Architect's figure.
- Browser resource observation: 16 entries, all `http://127.0.0.1:4177`; no external requests. The browser tab was cache-warm, so its `transferSize` values are not used as cold-download bytes.

## 4. AC01–AC20 candidate ledger

Statuses: ✓ = evidence exists; partial = some evidence, gap remains; — = not available/not claimed. **Release is — for every item: this audit is not release approval.**

| AC | Implemented | Unit | Browser | Device | Release | Evidence / gap |
|---|---|---|---|---|---|---|
| AC01 start/spawn/cue | ✓ | ✓ | ✓ | — | — | M2/M3 engine/browser flows; fixture starts at 1,000+ |
| AC02 exactly-once drop/input | ✓ | ✓ | ✓ | — | — | Input tests, CT-TEST-003/004; physical touch untested |
| AC03 vertical crossing/miss | ✓ | ✓ | ✓ | — | — | Engine fixtures; visible miss checks |
| AC04 snap/perfect/scoring | ✓ | ✓ | ✓ | — | — | Boundary fixtures; browser scores |
| AC05 COM/joints | ✓ | ✓ | partial | — | — | Pure math fixtures; debug weak-joint display |
| AC06 scoring/failure rules | ✓ | ✓ | ✓ | — | — | Unit fixtures; browser replay |
| AC07 period/render-rate independence | ✓ | ✓ | partial | — | — | Seeded 30/60/120 tests; no real frame timing |
| AC08 pause/resume lifecycle | ✓ | ✓ | ✓ | — | — | Fake clock; browser resize/interruption; no phone app switch |
| AC09 replay/effects/listeners | ✓ | ✓ | ✓ | — | — | 50 restarts, counters unchanged |
| AC10 persistence | ✓ | ✓ | ✓ | — | — | Profile tests and real-localStorage flow |
| AC11 fault/two-tab | ✓ | ✓ | ✓ | — | — | Fault and two-tab checks |
| AC12 failure never changes result | partial | partial | partial | — | — | Save/asset fault injection passes; audio exception is unavailable/out of scope, so the gate is not complete |
| AC13 keyboard/focus/Assist | ✓ | ✓ | partial | — | — | Keyboard/focus and Assist pass; named screen-reader speech is untested |
| AC14 layout/safe-area/zoom | ✓ | partial | partial | — | — | Four viewports/dialogs pass; real zoom and physical safe area are untested |
| AC15 motion/high contrast/audio | partial | partial | partial | — | — | Motion overrides/high contrast pass; audio and mute are unimplemented |
| AC16 cosmetics/physics/art | ✓ | ✓ | partial | — | — | Same-seed skin/geometry tests; release asset approval not claimed |
| AC17 performance/transfer | ✓ | ✓ | partial | — | — | This audit: engine/renderer/transfer; no phone timing |
| AC18 build/tests/no external | ✓ | ✓ | ✓ | — | — | 91/91, typecheck, loopback; release not performed |
| AC19 reaction/placeholder matrix | partial | partial | partial | — | — | M4A effects/messages cover key states; full reaction/audio matrix remains incomplete |
| AC20 no paid/public action | ✓ | — | — | — | — | Local-only audit; no paid/external/release action |

## 5. Defects, gaps and not run

Measured result: the initial audit found no engine-tick or renderer CPU failure, but the backing-pixel cap was exceeded at limiting sizes by independent upward rounding. CT-DEV-004BR fixed only that integer calculation; the corrected allocations are within 2,000,000 px and the tall fixture reaches the 24/20 caps. The only observable browser timing is the private browser's ~1 s rAF throttling, an environment limitation, not a product defect. The `127.0.0.1` held Web Lock remains an environment observation; this audit did not reproduce it, did not use `steal:true`, did not clear unrelated profiles and made no lock/save changes. `localhost:4177` remains a separate storage/lock origin and is not proof of recovery.

Not run or not claimed:

- Physical phones/tablets, touch, safe areas, phone frame p95/p99, 60 fps.
- Named screen-reader speech; announcements/keyboard were checked through DOM only.
- Firefox/Safari storage, Web Locks, presentation and timing.
- Real browser zoom/OS text scaling.
- Actual tab discard/bfcache stale-lock reproduction.
- Real 1,000-cat play in the normal app UI; renderer measurements use a synthetic audit page and are labeled as such.
- Audio/mute, audio policy, content/provider, paid calls, public release.
- Post-audit optimization; no fix was attempted.

## 6. All writes

Production correction (authorized by CT-DEV-004BR):

- `app/src/render/renderer.ts` — backing integer bound only
- `app/dist/` — rebuilt, 127,359 bytes

Audit code:

- `app/scripts/audit-engine.ts`
- `app/scripts/audit-transfer.ts`
- `app/scripts/audit-renderer/index.html`
- `app/scripts/audit-renderer/audit.ts`
- `app/scripts/audit-renderer/vite.config.ts`
- `app/tests/renderer-resize.test.ts`

Evidence:

- `app/M4B-EVIDENCE.md`
- `evidence/m4b/engine.json`, `engine-samples.csv`, `placement-bench.txt`
- `evidence/m4b/renderer.json`, `renderer-baseline.json`
- `evidence/m4b/transfer.json`, `transfer.csv`, `transfer-baseline.json`, `transfer-baseline.csv`, `network.json`, `network-baseline.json`
- `evidence/m4b/renderer-1000-approved-390x844.png`
- `evidence/m4b/renderer-1000-collapse-390x844.png`
- `evidence/m4b/renderer-1000-fallback-390x844.png`
- `evidence/m4b/renderer-2000-approved-390x844.png`
- `evidence/m4b/renderer-1000-approved-844x390.png`
- `evidence/m4b/renderer-1000-reduced-390x844.png`
- `evidence/m4b/audit-server.log`
- `evidence/m4b-audit.tar.gz` (archive of `evidence/m4b/`)

Ignored `.test-build/` was regenerated by `npm run build:test`/`npm test`. The only production changes in CT-DEV-004BR are `src/render/renderer.ts` (backing integer bound) and the rebuilt `dist`; no art, config, schema, dependency, gameplay or layout change was made. Corrected production hashes are listed at the top.
