# M4B audit review — local results and canvas cap correction

Architect, 2026-11-16. Active root `repository root`. Developer result `853bf1dc-d88a-45e0-aa1a-ef5225583559` delivers the CT-DEV-004B measurement task. The audit datasets are accepted for their stated environment and sample definitions; final M4B closure awaits the small correction below and independent verification. No phone FPS, full accessibility, audio or release acceptance is implied.

## Review evidence

Architect read `app/M4B-EVIDENCE.md`, engine/transfer scripts and renderer harness, inspected the high-tower screenshot, and verified accepted dist index/main/CSS hashes plus served main hash remain unchanged. Audit-only source imports are clearly distinguished from production bundle timing. No production change or rebuild was made by Architect.

Recomputed the p95 values directly from raw engine samples: idle0.001482ms and commit0.044237ms, matching the report. The real-engine public-command fixture retains1,000 cats, score24,970, perfect count1,000, safety1, digest `fa99ba77425d28a1ee16aa711f2effe5d74c297182b75e5725913efd76319385`. Separate evaluator timing is not presented as a whole tick. Earlier snapshot/array identity checks are appropriate for the no-per-frame-history-copy rule.

Reviewed actual Canvas counters:7 settled bodies+7 faces at the sampled portrait size,7 animated collapse bodies and6 particles. These are measured workload counts in those fixtures, not empirical stress of the24/20 caps. CPU timing is detached-canvas render submission, not GPU completion, frame latency or phone performance.40 samples at the browser's coarse timer resolution support only a local coarse measurement; do not overstate0.1ms precision. The throttled rAF trace proves no60fps result.

Architect independently recompressed the exact startup files at gzip level6: main18,666 B + shared scene JS5,298 B + CSS4,720 B = **28,684 B** (raw94,828 B), matching the audit. The report's119,978 B cold-load raw asset sum is below2 MB; actual preview has no Content-Encoding, so do not describe estimated gzip as bytes transferred. The source of every earlier gzip discrepancy is not fully established merely by this common calculation; use this explicit method going forward.

## New low-severity finding: rounded backing dimensions exceed hard cap

The sampled portrait/landscape canvases stayed below2,000,000 pixels, but the cap was not exercised at its limiting scale. Architect invoked the actual compiled GameRenderer.resize using a minimal canvas/context stub (dimension arithmetic only, no browser timing claim):

| Available CSS size / DPR | Actual backing | Pixels | Result |
|---|---|---:|---|
| 390×844 /2 | 780×1688 | 1,316,640 | Below cap |
| 844×390 /2 | 780×780 | 608,400 | Below cap |
| 1000×1600 /2 | 1118×1789 | 2,000,102 | Over by102 |
| 2160×3840 /2 | 1061×1886 | 2,001,046 | Over by1,046 |

Cause: renderer.resize computes a square-root scale for2M pixels, then rounds each dimension upward independently. This is a small resource-budget conformance defect, not an observed crash or gameplay problem. No physics, layout or art redesign is needed.

## CT-DEV-004BR — bounded correction and audit completion

This specific follow-up authorizes a production correction, superseding20's read-only rule only for the backing-dimension calculation and a reproducible final build.

1. Ensure the integer backing dimensions respect width×height≤2,000,000 at cap-limited sizes; floor dimensions or apply an explicit final bound. Keep dimensions finite and≥1; preserve DPR≤2, existing CSS projection/letterboxing, transforms, ordinary390/844 canvas sizes, gameplay and balance. No unrelated source changes, optimization, dependency/config/schema/audio/art changes.
2. Add a focused regression exercising the real resize path (a minimal Canvas stub is sufficient) at the four sizes above and a tall audit-only100×5000/DPR2 case. Assert cap, finite dimensions and unchanged normal-size output. Browser-check actual allocated dimensions for the two over-limit cases after correction, not just a duplicate helper formula.
3. Extend the audit-only renderer counters with a tall narrow fixture that actually activates the body caps, e.g.100×5000 CSS at1,000 cats, failure joint1: expect at most24 settled draws and20 animated collapse bodies, separately counting faces/background. Label this a stress fixture, not supported whole-app UI. Keep6-particle check. Correct the harness note that the old joint994/7-body fixture exercised the20-body cap; it did not.
4. Clarify candidate ledger partial gates: AC12 audio exception unavailable, AC13 named screen-reader speech untested, AC14 real zoom/safe-area untested, AC15 audio/mute unimplemented, AC19 full reaction/audio matrix incomplete. A check in one subsection must not mark the entire gate fully implemented/browser-validated. Preserve already verified portions and links; do not invent approval gaps where approval evidence exists.
5. Keep original pre-correction audit data/identity intact. Add a correction section and separate cap/stress results under `evidence/m4b/`, with actual tested source/build identity. Run tests/typecheck and build after final source edit, update standardized transfer sizes/hashes for the new build (retain baseline measurements labeled baseline), keep preview detached at4177 and stop the audit server after checks. No need to rerun the engine performance series or unchanged storage/layout/restart suites. Renderer dimension/count boundary checks and ordinary-game smoke on the new build are enough for Developer's return.

Return final hashes, changed paths, test count/exits, measured allocation/count results, transfer updates, not-run list and all writes. Stop for Architect review before independent CT-TEST-005 is assigned. No further fixes, audio/content/provider/paid calls, release, commits/pushes, migration/container/unrelated services.

CT-DEV-004BR delegated in OpenBot message `ecfefbc0-db7a-485d-adbd-cd653029f8eb`, expectsReply true. OG informed in `e5de4542-98df-48fd-b919-e012380c4d75`. Awaiting correction and boundary evidence; this review is not a completed-fix claim.

## CT-DEV-004BR accepted — independent CT-TEST-005 pending

Developer result `b6a4f4b4-001a-463b-be1f-1b15c207167b`. Architect reviewed the bounded resize change and the actual-resize regression, reran `npm test` (exit0,92 passed /0 failed), and checked corrected production hashes in dist and served index/main:

- index.html `d1eefdb38e6d14a10d5c99ff0281ede255f5a9fa0d78f7c02dd9bd555043ad5a`
- main-BWgfwA9j.js `9d0e7e068870392d64e42912b814287c74957944757247f447d1663c2477beb5`
- CSS unchanged: scene-BP3tka9g.css `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1`.

Architect independently invoked the actual compiled resize with a minimal Canvas stub, confirming:

| CSS input / DPR | Corrected backing | Pixels |
|---|---|---:|
| 390×844 /2 | 780×1688 | 1,316,640 |
| 844×390 /2 | 780×780 | 608,400 |
| 1000×1600 /2 | 1117×1788 | 1,997,196 |
| 2160×3840 /2 | 1060×1885 | 1,998,100 |
| 100×5000 /2 | 200×10000 | 2,000,000 |

Reviewed corrected renderer.json: tall settled fixture has50 drawImage calls (2 background/floor +24 bodies +24 faces), tall collapse has20 rotate calls, particle delta remains6. These raw counters are Developer-measured and source-reviewed, not independently browser-repeated by Architect. Developer's actual browser allocations agree with the resize calculation. No engine/performance redesign was made. Candidate ledger partial labels are corrected. Original baseline JSON/CSV remains identified separately from corrected measurements.

Developer reports corrected startup gzip6 of28,740 B, cold-load raw120,111 B and dist127,359 B; independent arithmetic/network verification follows below. Existing engine dataset remains applicable because engine code is unchanged; renderer CPU measurements still describe the isolated source harness, not bundled frame time or phone FPS.

Architect changed design records and regenerated ignored `.test-build/` through tests only; no app source/dist/server changes. This accepts the bounded correction, not final M4B or release. Next: independent CT-TEST-005.

### CT-TEST-005 — independent performance-audit/cap validation

Use the exact corrected production hashes above; verify before/after. Preview stays on4177. Read20, this review and `app/M4B-EVIDENCE.md`, with original/corrected data clearly distinguished. Write report/scripts/screenshots only under `evidence/ct-test-005/`; do not rebuild, edit app/art/config or overwrite Developer's evidence. Do not run audit scripts that have hard-coded output paths to `evidence/m4b/` unchanged. The existing renderer audit page auto-POSTs to overwrite `renderer.json`; do not open it unchanged. If a separate audit page/server is needed, use an evidence-only harness/read-only imports, keep it loopback, log its lifecycle and stop it afterward. Preserve the normal preview.

1. **Real resize boundary:** independently invoke actual renderer.resize via existing compiled modules/Canvas stub at all five inputs above; assert finite integer backing sizes≥1 and≤2M pixels. In the actual served game browser, use permitted viewport/DPR emulation to exercise a cap-limited portrait canvas and inspect its allocated width/height and CSS layout. Whole-app viewport and canvas CSS size are distinct: record both rather than demanding stub dimensions from an app viewport. Respect browser memory limits; report any unavailable large viewport, do not bypass limits. Normal390×844/844×390 controls/projection remain usable.
2. **High-tower/draw evidence:** review raw corrected tall counts and actual source. Independently repeat settled/collapse counts or an equivalent isolated actual-renderer fixture if practical without overwriting Developer evidence:≤24 settled,≤20 animated collapse bodies,≤40 particles, finite high-tower camera/coordinates. Separate source-reviewed from independently measured counts and detached-canvas CPU from frame timing. A short fixture is not proof of60fps.
3. **Engine/data reproducibility:** reproduce the public-command1,000-cat Assist fixture in an evidence-only script importing the existing compiled engine; no ProfileService/private field/global/save injection. Expect score24,970, perfect1,000, safety1 and retained1,000 cats. Check digest against baseline when using the identical fixture serialization/seed20261116; identify differences rather than inventing a match. Validate raw p95 calculations and snapshot immutability/source no-per-frame-history-clone. New CPU samples can differ with load; report environment and timing definition, not a generic pass for phones.
4. **Transfer:** independently derive startup files from corrected served/dist index and recompute per-file gzip6/raw sums, mapped art and total cold-load bytes, optional diagnostics separately. Check server Content-Encoding/cache headers, loopback-only resources and unchanged asset hashes. Expected Developer values28,740 gzip6 startup,120,111 raw cold-load,127,359 total dist; reconcile any difference by exact file/method. Do not call estimated gzip actual wire compression.
5. **Corrected-build smoke:** Classic/Assist each land/score correctly, reload keeps bests/totals on a disposable owner profile; no release from tutorial close; Pause/Settings/Escape/Resume focus; explicit motion override remains effective. Spot-check portrait/short landscape critical controls. Full accepted storage/layout/50-restart suites need not be repeated absent new evidence of a regression.
6. **Honest candidate status:** check the AC ledger keeps audio/mute, named screen-reader speech, real zoom/safe-area, Firefox/Safari, actual phone frame targets and public release incomplete. Track the pre-existing held lock separately; do not steal/auto-takeover, clear unrelated profiles or restart the shared browser. If owner checks use localhost, report that separate origin and confirm build identity.

Return PASS/FAIL by group, exact hashes, raw samples/scripts/check outputs, screenshots, defects/severity, all writes and not-run list. Remove only your disposable test profiles. Stop after report. No audio/content/provider/paid calls, code fixes, public release, commits/pushes, migration/container or unrelated service work. Architect reviews before M4B closure or further scope.

CT-TEST-005 delegated to Playtester in OpenBot message `f99ad7a9-cb6f-4e34-b8e5-9f2f788a804a`, expectsReply true. OG informed in `9a4678f1-90b3-47a8-9315-6bd3716abc7f`. Awaiting independent results.

## Local M4B closed — independent CT-TEST-005 PASS

Playtester result `90418396-fae6-4244-8ef3-0166a92999a5`; [report](../evidence/ct-test-005/CT-TEST-005-report.md) and evidence-only scripts/raw data/screenshots01–03. All six assigned groups passed. Independent public-command fixture reproduces the exact1,000-cat digest/score/safety; raw commit p95 is0.041173ms on the VPS. Independent tall counts reach24 bodies/20 animated collapse bodies/6 particles. Real served-game1000×1600/DPR2 allocated1,998,000 pixels. Stub cases all pass; actual2160×3840 browser viewport was refused by the host's8,388,608-pixel limit and was not bypassed.

Architect read the full report and independently reconciled the compression discrepancy using HTTP requests to127.0.0.1:4177 for index/main/CSS:

| Request | Content-Encoding | Body bytes: index / main / CSS |
|---|---|---|
| HEAD, Accept-Encoding:gzip | omitted | no response body |
| GET, Accept-Encoding:gzip | gzip | 2,866 /18,722 /4,720 |
| GET, Accept-Encoding:identity | omitted | 11,271 /61,145 /18,545 |

Decoded gzip GETs and identity GETs both match the corrected accepted index/main/CSS hashes above. HEAD omitting encoding does not establish that GET is uncompressed; earlier evidence inferred too much from HEAD. Current behavior explains the conflicting reports without evidence of a server change. `Cache-Control:no-cache` is unchanged. Standardized startup gzip6 remains28,740 B and cold-load raw120,111 B; Playtester independently reconciled all file sums. No production defect or new rebuild is needed for this reporting correction.

M4B's **local audit and canvas-cap correction are closed** within the named VPS/browser limits. This does not close phone-performance, physical touch/safe-area, named-screen-reader speech, Firefox/Safari, real zoom, actual tab-discard lock behavior, audio/mute or release gates. The pre-existing held lock remains unconfirmed as a product defect; owner checks used separate localhost origin with identical hashes. No takeover occurred. No new tests were needed on the unchanged build, already Architect-verified92/92. Playtester removed its disposable profiles and wrote only its own evidence. Architect changed design/evidence annotations only.

Remaining bounded work and decision preparation are in [22](22-candidate-gaps-and-sound-brief.md); no general authorization for audio or release follows from this closure.
