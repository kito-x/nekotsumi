# M4A review — motion override correction (CT-DEV-004AR)

Architect, 2026-11-16. Active root `repository root`. Developer result `3ba1f3ba-e2e9-4746-a7f8-32bf698bab12` completes CT-DEV-004A, not M4B. **Update: CT-DEV-004AR is Architect-accepted below. M4A awaits independent CT-TEST-004 before closure.** The original finding/correction record is retained.

## Verified

- Architect reran `npm test` with the project-local Node toolchain: exit 0, 91 passed, 0 failed (82 baseline + 9 new). This regenerated ignored `.test-build/` files; no game source/build/server edits by Architect.
- Dist and served index match SHA256 `67d4c7faf0aed2f768aea77f06093109da18df0eb0f51700aa60718be59d2ad4`; dist and served main-C6u5tOZ3.js match `046f0fa5ecb0770b036f9c9249071d703e7d484b1aa029765cf8364d07cd8e14`. Dist CSS matches the prior approved CSS hash `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1`. `git diff --check` passes.
- Reviewed presentation/effect priority, announcer, toast, throttle, announcement-format code, main wiring and regression tests. Bottom-center scaling is applied through the existing drawing transform. Landing survives spawn and danger precedes happy. Context transitions cancel old pending announcements/toasts; landing+unlock is combined; write-failure pending state survives a reset.
- Read `app/M4A-EVIDENCE.md` and viewed `evidence/m4a/04-dangerous-landing-worried-390x844.png`. Developer's local browser/layout/timer results are evidence for review, not independently repeated by Architect in full.
- The Settings Escape correction is accepted in scope: the global Escape handler now leaves open dialog cancel behavior to the dialog instead of swallowing it.

## Reproduced issue — explicit motion preference lost on OS change

Browser: OpenBot private browser, existing Architect-owned tab, capture mode at `http://127.0.0.1:4177/?capture=1`. Build above. Save mode was `other-tab`; used **Play temporarily**, so settings/tutorial changes were in memory only. Stored profile string stayed byte-identical throughout. No lock steal or ownership change.

Steps:
1. OS reduced-motion emulation initially false. In Home Settings select **Reduced**, close Settings, Start Classic and Skip tutorial.
2. Renderer probe and effective setting both report `reducedMotion: true`.
3. Toggle OS reduced-motion emulation true, then false while the round remains open.
4. `window.__catTowerDebug.reducedMotion()` still returns true, but `window.__catTowerDebug.presentation().reducedMotion` returns false. OS query is false.

Expected: Reduced always keeps renderer reduced, Full always keeps renderer full; only System follows later OS changes. This is specified in 05 and17 and remains required by18. The new capture probe makes the mismatch observable; no claim that M4A introduced it.

Cause: main.ts `handleMotionChange` calls `renderer.setReducedMotion(motionQuery.matches)` directly, bypassing `effectiveReducedMotion()`. `applyMotionPreference()` already resolves the saved override and redraws without advancing time.

## CT-DEV-004AR — bounded correction

1. Route the media-query change handler through the same effective preference path used by Settings (`applyMotionPreference()` or equivalent), preserving live System behavior. Do not alter engine timing, collapse configuration, profile schema, storage/locks or any other design.
2. Regression must exercise the **OS change event with an explicit override already selected**, not just radio selection or the effective-value helper. In the available browser, while a run is open: Reduced + OS false→true→false leaves renderer reduced; Full + OS false→true→false leaves renderer full; System follows both directions. Check the actual renderer probe and reduced/full transform behavior, not only `__catTowerDebug.reducedMotion()`.
3. Repeat the OS event while paused with Settings open; closing Settings and resuming preserves the chosen override and proper focus. Keep the accepted Escape behavior.
4. Use a focused regression test if an existing seam can exercise the real preference application; no new framework or broad refactor merely to test one line. Preserve all 91 tests, run tests and build after final edit, report final served/dist hashes and update `app/M4A-EVIDENCE.md` with this finding and actual results. No need to repeat unaffected four-viewport/50-restart evidence unless the correction changes those paths.

Return to Architect and stop; no M4B or independent acceptance claim yet. Same local-only/no-audio/no-paid/no-release/no-migration limits as18. This correction is ordinary implementation of the existing motion contract, not a new user product decision.

Delegated to Developer in OpenBot message `5652fd74-e866-4a9f-9aff-6b376810648e`, expectsReply true. Browser emulation restored to reduced-motion false; Architect tab returned to the normal Home URL, dropping in-memory temporary settings/run. The stored default profile remained unchanged (revision 0, all counters 0, System motion, tutorial unseen). No app source, dist or server change was made by Architect.

## Remaining limits

Physical devices/touch/safe areas, named-screen-reader speech, Firefox/Safari, real browser zoom, real frame timing, actual stale-lock tab discard and 1,000-cat rendered performance remain unverified. The one prior orphan-lock observation is not reproduced as a product defect; no automatic takeover is authorized.

## CT-DEV-004AR accepted — independent CT-TEST-004 next

Developer result `797af532-2a68-46f1-813f-9196203df6ae`. Architect checked the handler now calls `applyMotionPreference()`, reran `npm test` (exit 0, 91 passed / 0 failed), and verified dist and served hashes:

- index.html: `222fd01ced1163ebc3338bd9f483df79a4369e1cba3811e50b3102b8044861b6`
- main-DroJ0HWb.js: `c6f622bd9bf3d078f61e36c6790e69a4643ae0414de62eef39cc88ef314998bd`
- CSS is unchanged: scene-BP3tka9g.css, `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1`.

Independent Architect browser recheck on this served build, using the actual renderer probe in capture mode:

| Chosen setting | OS reduced-motion query | Effective helper | Renderer reducedMotion |
|---|---|---|---|
| Reduced | false → true → false | true throughout | true throughout |
| Full | false → true | false throughout | false throughout |
| System | true → false | true → false | true → false |

Escape from Settings opened through Pause restored the Pause dialog and focused `pause-settings-button`; Resume returned to the game. Developer separately measured the identity/full squash transforms and OS event while Settings was open; Architect did not repeat that whole transform matrix. The regression is in the browser rather than a new artificial unit seam for main.ts. All 91 existing tests remain intact.

Test was in `other-tab` mode with temporary in-memory settings and no score placements. Stored default profile remained byte-identical before/after; normal Home URL and OS emulation false restored. Architect changed only design records and regenerated `.test-build/` with the test command. Developer reports dist 127,226 B and JS+CSS gzip 30,571 B. Earlier M4A layout/timer measurements were carried forward because this correction changed only the media-query handler, not falsely rerun on this final bundle.

### CT-TEST-004 — independent M4A conformance check

Test the exact corrected served build above; verify hashes before and after. Read18 and this review plus `app/M4A-EVIDENCE.md`. Report and screenshots only under `evidence/ct-test-004/`; no app/art/build/server/dependency edits, no rebuild. If preview is unavailable or build changes during testing, report the evidence gap before testing another build. Use available private browser and capture helpers for deterministic presentation timing, and label normal/capture checks accurately.

1. **Landing effects/expressions:** ordinary and perfect bottom-anchored squash at 100 ms (scaleY .94, scaleX about 1.06383), recovered by 240 ms; happy survives next spawn up to .5 s; danger worried and failure override happy; reduced motion has identity transform and no particles/sway/shake. Check probe plus screenshots; do not infer visuals solely from helper output.
2. **Announcements/toasts:** threshold landing gives one combined landing+unlock message; rapid nudge→Pause/Resume, failure→Skip/Results, Results→Replay/Home cannot leak old messages/toasts. Results keeps unlock cards and totals. A save-write failure is visible and announced once, including if a context reset precedes the pending write. Use live-region mutations as DOM evidence, not claimed screen-reader speech. Pause preserves toast display time.
3. **Live motion overrides:** with each setting already selected, toggle OS false→true→false: Reduced renderer remains reduced; Full remains full; System follows. Check actual renderer probe and a landing transform, not only effective helper. Repeat with Settings open from Pause, Escape returns to Pause with Settings focused, fresh Resume returns canvas focus and correct renderer preference.
4. **Input/focus:** keyboard Home→tutorial→play→Pause→Settings→Results→Collection; tutorial closing by Enter/Space/Escape/click leaves zero cats; no held-key or UI activation double drop; Escape in nested Settings and modal focus/restore work.
5. **Layout/contrast smoke on final build:** 320×568, 390×844, 844×390, 1280×720: Home Start/modes, both AIMING modes, Drop ≥64 px, full Assist text, collapse Skip, Results Replay and dialogs reachable, no horizontal overflow. Existing allowed secondary/internal scroll remains valid. Spot-check high contrast and selected text.
6. **Regression/budgets:** Classic/Assist scores and persisted totals unchanged; 50 restarts keep engine/session/loop/listener/lock counts stable and no announcement/toast timer growth. Record loopback-only requests, JS+CSS gzip ≤200 KB and actual dist size; no need to rerun tests that write outside the evidence root. Preserve all unrelated stored data; disposable profiles only, remove your test profile when finished. Never add lock stealing or automatic takeover.

Return PASS/FAIL by group, exact hashes, reproducible defects with severity, screenshots/report paths, all writes and a not-run list. Physical devices, named screen reader, Firefox/Safari, real zoom/frame timing, actual tab discard, audio and 1,000-cat rendered performance remain separate when unavailable. This task does not start M4B, authorize audio/content/paid calls/public release or relocation. Architect reviews the result before closing M4A and assigning the performance slice.

CT-TEST-004 delegated to Playtester in OpenBot message `fe439209-8132-4301-84e4-729205b8ec67`, expectsReply true. Awaiting independent results. OG informed in message `2f621a39-7f04-443f-abf1-9834cba3f4b1`.

## M4A closed — independent CT-TEST-004 PASS

Playtester result `bcc568f8-97c6-4e31-9269-7c21e97c92c0`, report [CT-TEST-004-report.md](../evidence/ct-test-004/CT-TEST-004-report.md), screenshots01–06 alongside it. All six assigned groups passed on the corrected build: effects/expressions, announcements/toasts, live motion overrides, input/focus, layout/contrast and core/counters/budgets. Architect read the full report and rechecked dist index/main/CSS and served index at127.0.0.1 plus served main atlocalhost; hashes remain exactly those accepted above. No additional tests/rebuild were needed after the previously verified91 passing tests on this unchanged build.

Qualification:127.0.0.1 had the previously observed held Web Lock and normal Retry failed; no lock steal was used. Presentation checks ran in temporary mode there. Owner-only persistence/write-failure/counter checks and layout checks ran atlocalhost:4177 on the same verified bundle; storage/lock origins are separate, so this is not evidence that the held lock at127.0.0.1 recovered. The owner was not visible to Playtester; actual normal tab-discard reproduction and the cause of the held lock remain unknown. Do not label this a proven product defect or silently add takeover behavior.

Transfer figures used differing file sets/compression methods. Architect's explicit check of the three startup files (main JS, shared scene JS, scene CSS) totals94,828 raw bytes and28,630 bytes gzip at level9 per file; concatenating those files then gzip level9 gives28,173 bytes. Developer reported30,571 and Playtester28,050/32,473 for their respective measurements; these are not yet a common measurement series. All are far below200 KB; M4B will standardize exact inputs/method and distinguish estimated gzip from actual response encoding. No budget failure is hidden by the discrepancy.

M4A is closed within these browser limits, not full M4/release acceptance. Physical devices/touch/safe areas, named-screen-reader speech, Firefox/Safari, real zoom/frame timing/tab discard, audio and1,000-cat rendered performance remain outstanding. Playtester removed its disposable profiles at both origins and changed only evidence. Architect's closure changes design records only. Next bounded work is the production-read-only performance/candidate audit in [20](20-m4b-performance-audit.md).
