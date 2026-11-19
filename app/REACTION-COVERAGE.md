# Reaction coverage inventory — non-audio

Date: 2026-11-16 UTC. Scope: CT-DEV-004C coverage inventory plus the bounded CT-DEV-004CR first-drop readiness correction. The inventory was documentation/source-only; CT-DEV-004CR then changed only the readiness announcement branch and rebuilt. Current identity: `main-CWm7_RHt.js` `9684c460ffd6f12aeeae66b834dae8b670f38b9338742879388e38792363569c`, index `a00d25df12f8d81199c21c01c22025bb95cf8790425e063e692a7b2ad10f131b`, CSS `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1`; 92 tests pass; preview is detached on `127.0.0.1:4177`.

This walks every `<audio>`-excluded row of [05](../design/05-ux-assets.md) against current source and the later decisions in [17](../design/17-m3-durable-shell.md), [18](../design/18-m4-presentation-polish.md), [19](../design/19-m4a-review.md), [20](../design/20-m4b-performance-audit.md) and [21](../design/21-m4b-audit-review.md). Later decisions win: 18 defines identity squash under reduced motion and danger/worried priority over landing/happy; 17 retains the danger threshold `safety < 0.15` and top-three scope. Audio is explicitly deferred and is not counted as a missing non-audio behavior.

Legend: **M** = mandatory state/input/progress/accessibility behavior; **O** = optional flourish; **A** = audio, deferred; **PASS** = source and existing evidence agree; **GAP** = actual discrepancy; **EVIDENCE GAP** = behavior may exist but no adequate test/check.

## Core loop

| # | Trigger | Authoritative expected non-audio behavior | Actual source path | Existing evidence | Status / class |
|---:|---|---|---|---|---|
| 1 | First load | Validate profile, no round, calm preview, title/Start focus order | `src/main.ts:init()` loads art/profile, `showOnly('home')`, focuses Start; no engine start until Start/Replay | `tests/profile.test.ts`; M3 evidence; CT-TEST-003/004 | PASS — M |
| 2 | Start / Replay | New run, one incoming cat, 9-tick SPAWN_CUE, focus play region, no pre-AIMING mode/start chatter | `src/main.ts:startRun()` → `GameSession.start`/`engine.start`; `showGame()` focuses canvas; no announcement on spawn; readiness is deferred to first AIMING; `BALANCE_V1.spawnCueTicks=9` | `tests/engine.test.ts` start/cue tests; `evidence/readiness/`; M2/M3 evidence; CT-TEST-004 | PASS — M |
| 3 | Spawn cue completes | Drop enabled, focused face, target shadow, one readiness message at the first actual AIMING with zero cats, no recurring sound | `engine.advancePhase` → AIMING; `updateHud` sets `gameStatus='Ready — drop!'` and enables Drop; `renderer.drawTargetGuide`; `PresentationState.towerFace` focused/idle; `main.handleEvents` on `phaseChanged` to AIMING with cats=0 and `readyAnnouncedRunId` guard calls existing `LiveAnnouncer`: Classic “Classic round started. Ready — drop onto the platform.” / Assist “Assist round started. Ready — use Left/Right to position, then Drop.” No game-status aria-live change | `tests/engine.test.ts` cue/drop; `evidence/readiness/readiness.json` + two screenshots; M4A announcer tests; CT-TEST-004 | PASS — M; audio deferred — A |
| 4 | Classic horizontal motion | Position advances by fixed tick; guard/clamp; no per-frame live chatter | `engine.advanceAimMotion()`; `InputRouter`; renderer draws focused incoming; no live-region frame narration | `tests/engine.test.ts` Classic aim; 30/60/120 loop tests; M2 evidence | PASS — M. **O gap:** “eyes glance toward tower” not implemented; face stays focused |
| 5 | Assist Left/Right | One fixed nudge, clamp, immediate alignment text, polite offset/overlap/prediction at ≤1/300 ms, no frame narration | `src/app/input.ts:nudge`; `engine` Assist `assistStep`; `src/main.ts:updateAssistPreview`/`scheduleAssistNudge`; `src/app/assist.ts` labels/prediction; `LiveAnnouncer` + `LeadingTrailingThrottle(300)` | `tests/engine.test.ts` nudge/clamp; `tests/browser.test.ts` nudge restrictions; `tests/presentation.test.ts` throttle; M4A nudge/pause sequence | PASS — M (soft click is optional — O) |
| 6 | Valid Drop | Freeze/snap x, enter FALLING, focused→surprised, guide remains, no focus movement | `InputRouter.drop`; `engine.processCommands`; `resolveContact`; `renderer.drawIncoming` uses `incomingFace` surprised; `drawTargetGuide` remains during FALLING; no forced focus movement | `tests/engine.test.ts` cue/drop/old-generation; `tests/browser.test.ts` input; CT-TEST-004 | PASS — M. **O gap:** the “stretch at most 1.06Y” flourish is not implemented |
| 7 | Extra drop while unavailable | No gameplay action, no queued action, disabled/explains state | `InputRouter.drop` rejects non-AIMING/generation; `engine` coalesces duplicate drops; `updateHud` disables Drop/Left/Right | `tests/engine.test.ts` duplicate/cue gates; `tests/browser.test.ts` input router | PASS — M |

## Landing, scoring and feedback

| # | Trigger | Authoritative expected non-audio behavior | Actual source path | Existing evidence | Status / class |
|---:|---|---|---|---|---|
| 8 | Stable ordinary landing | Commit +10, reset chain, bottom-center 0→100→240 ms squash (scaleY .94), happy ≤.5 s, one landing message with height/score | `engine.resolveContact`; `ProfileService.commitPlacement`; `PresentationState` squash/happy; `main.handleEvents` `landingAnnouncement`; `renderer` bottom-pivot transform | `tests/engine.test.ts` score; `tests/presentation.test.ts` squash/lifetime; M4A evidence and probes; CT-TEST-004 | PASS — M |
| 9 | Stable perfect landing | Perfect points/chain, six stars max, happy/closed-eye, one bright/priority cue | `src/domain/score.ts`; `PresentationState.towerFace` happy; `drawLandingStars` draws at most six arcs; `landingAnnouncement` includes Perfect/points; `reducedMotion` omits stars | `tests/engine.test.ts`/`fixtures.test.ts` perfect; `tests/presentation.test.ts` squash/happy/danger; M4A screenshot/probe; CT-TEST-004 | PASS — M. **O gap:** no canvas `Perfect +N` floating text; points/score are visible/announced, stars are present. Audio cue — A |
| 10 | Chain reaches 3 or 6 | Score formula unchanged beyond bonus; brief “3 perfect!”/“6 perfect!” text, no full-screen effect | `src/domain/score.ts:scorePlacement`; `main.updateHud` shows `hudChain = Perfect ×N` for chain ≥2; no special 3/6 banner | `tests/engine.test.ts` chain; `tests/fixtures.test.ts` F8/F9; M4A evidence | PASS state — M. **O gap:** no special 3/6 brief text; persistent `Perfect ×N` exists |
| 11 | Landing lowers safety into caution | Stable placement stays valid; worried top few, small sway, “Wobbly” text; no false alarm | `safetyBand/Label` returns Wobbly at .15–.35; `towerTransform` sway below .35; `PresentationState.towerFace` worries only at `<.15` per 17/18. The old 05 “worried at caution” is superseded by 17/18’s danger threshold | `tests/fixtures.test.ts` F5/F6; `tests/engine.test.ts` safety; M4A danger probes; CT-TEST-004 | PASS under later decision — M. No discrepancy; do not resurrect caution-worried behavior |
| 12 | Landing enters danger | Worried top few, weak-joint outline, “Very wobbly”, bounded sway; danger priority over happy | `safetyBand='danger'` and `safetyLabel='Very wobbly'`; `PresentationState.towerFace` danger before happy; `drawFailureCue` weak-joint line; `towerTransform` bounded sway | `tests/presentation.test.ts` danger > happy; M4A dangerous landing probe/screenshot; CT-TEST-004 | PASS — M. Audio creak — A |
| 13 | Later landing improves safety | Faces return calm/happy; danger indicator updates; no false danger audio | `updateSafety`/`updateHud`; `towerFace` uses current safety; `drawFailureCue` stops when safety recovers; no audio | `tests/engine.test.ts` safety progression; M4A probes; CT-TEST-004 | PASS — M |
| 14 | Miss top | Fail once, no score/progress; incoming slips, surprised→dizzy; caption; announce once | `engine.resolveContact` `MISS_TOP` → COLLAPSING; `drawIncoming` collapse dizzy; `showResults` caption; `handleEvents` announces failure once; ProfileService gets no commit | `tests/engine.test.ts` F7/miss; M2/M3 evidence; CT-TEST-004 | PASS — M. Audio — A |
| 15 | Whole-tower COM failure | Fail at chosen joint; outline failing joint; bounded collapse; camera shake ≤3 px/≤120 ms; announce “tipped” | `engine.resolveContact` UNSTABLE_TOWER; `renderer.collapseTransform`, `cameraShake` (3/2 px for .12 s), `drawFailureCue`; `handleEvents` reason | `tests/engine.test.ts` COM failure; `tests/fixtures.test.ts` F4/F6; M4A failure evidence | PASS — M. Audio — A |
| 16 | Collapse timeout / Skip | Enter Results once; cancel remaining effects; summary focus; stop cues | `engine.skipCollapse` → `toResults`; `showResults` stops loop, clears renderer effects, focuses Replay; `renderer.onEvents(resultsReady)` clears landing/collapse; announcer resets, toasts clear | `tests/engine.test.ts` skip/results; M4A Results/Replay evidence; CT-TEST-004 | PASS — M |
| 17 | New score/height record | Results badge for strictly higher bests; optional sparkle if motion allowed; one reward cue | `renderResultsExtras` compares strict bests from `startRun` baseline and renders text badges; no sparkle; audio cue deferred | `tests/profile.test.ts` bests; M3/M4A Results evidence; CT-TEST-004 | PASS — M. **O gap:** optional Results sparkle absent. Audio — A |
| 18 | Cross skin threshold | Derive unlock once; non-modal toast; Results card later; single reward ping; queue | `ProfileService.commitPlacement` derived unlock; `queueUnlockToasts`/`ToastQueue`; `landingAnnouncement` combined; `renderResultsExtras` cards; results clears toasts after cards; no separate delayed unlock announcement | `tests/profile.test.ts` thresholds; `tests/presentation.test.ts` toast/announcer; M4A evidence; CT-TEST-004 | PASS — M. Audio — A |
| 19 | Select unlocked skin | Save selected ID for next run; checkmark/text; preview; selection semantics sufficient without a redundant live message | `renderCollection` button/aria-pressed/✓ Selected; `ProfileService.selectSkin`; `startRun` passes `selectedSkin`; focus restored to the changed button. Architect accepted the rebuilt button name+Selected text+aria-pressed as sufficient; no live message added. | `tests/profile.test.ts` skin selection; `tests/engine.test.ts` skin physics parity; M3 evidence; CT-TEST-003/004 | PASS — M (decision recorded in design/22); optional click sound — A |
| 20 | Select locked skin | No change; “unlock at N cats” read; no purchase | `renderCollection` locked cards are `div`s, not buttons; text includes threshold/current total; no click handler | `tests/profile.test.ts` normalization; M3 evidence; CT-TEST-003 | PASS — M |

## Meta, lifecycle and faults

| # | Trigger | Authoritative expected non-audio behavior | Actual source path | Existing evidence | Status / class |
|---:|---|---|---|---|---|
| 21 | Pause / hidden / blur | Preserve exact state; static overlay; no ongoing wobble/camera; focus dialog; message | `pauseGame` → `session.pause` (engine freezes); `pauseToastTimer`, `nudgeThrottle.cancel`, `announcer.cancelPending`; `openPauseDialog` focus Resume; `renderer.render(state,0)` freezes presentation; visibility/blur listeners | `tests/engine.test.ts` pause; `tests/browser.test.ts` interruption; M4A pause evidence; CT-TEST-004 | PASS — M. Audio suspend — A |
| 22 | Resume | Exact saved state; fresh input; remove overlay; restore focus; no auto-drop; resume message | `resumeGame` → `session.resume`, `loop.resetClock`, `unlockToasts.resume`, focus canvas; `announce('Resumed…')`; `InputRouter` still requires fresh command | `tests/engine.test.ts` resume; M4A evidence; CT-TEST-004 | PASS — M. Audio resume — A |
| 23 | Restart / Home confirmed | Abandon live run; retain committed profile; cancel old effects/inputs/toasts; no extra award | `openConfirm`; `startRun` resets renderer/announcer/nudge/toasts; `showHome` stops loop, resets context/toasts; `ProfileService` commits only on placement | `tests/engine.test.ts` replay/results; `tests/presentation.test.ts` context cancellation; M3/M4A evidence; CT-TEST-004 | PASS — M |
| 24 | Sound off / volume | Stop voices immediately; gameplay unchanged | CT-DEV-005 added `src/platform/audio.ts`/`audio-synthesis.ts`/`audio-policy.ts`, Settings Sound effects + Volume, mute/volume cancellation and persisted preferences. This supersedes the earlier audio-deferred entry. | `tests/audio.test.ts`; `evidence/m4d/`; `app/M4D-EVIDENCE.md` | PASS bounded local audio — M; real listening/device/autoplay untested; screen-reader speech separate |
| 25 | Reduced motion on | Remove shake/spin/sway/particles; identity squash; static text/expression cues; shorten collapse; no rule/speed change | `applyMotionPreference`/`handleMotionChange`; `renderer.setReducedMotion`; `PresentationState.squashFor` identity; `drawLandingStars` off; `cameraShake` off; engine `collapseTicks` reduced; projection immediate | `tests/presentation.test.ts` identity; `tests/engine.test.ts` reduced collapse; M4A live override evidence; CT-TEST-004 | PASS — M (18 identity override honored) |
| 26 | Resize / orientation | Pause and resize projection; preserve state; compact/letterbox; “layout changed” message | `ResizeObserver` `handleViewportChange` pauses with `resize`; `resizePlayfield` recalculates projection; `pauseGame` announces reason; normal-mode only (capture suppresses) | `tests/browser.test.ts` loop; M2L/CT-TEST-003 resize evidence; CT-TEST-004 | PASS — M; no physical orientation/safe-area claim |
| 27 | Asset fails | Gameplay continues; local fallback; no blocking modal/repeated error audio | `loadArtAssets` returns `emptyArtAssets`/fallback; `renderer` placeholder paths; `main.init` enables Start; no failure dialog | M2 evidence (stall/missing/decode/late); `tests/art-manifest.test.ts`; `tests/browser.test.ts` manifest | PASS — M |
| 28 | Save fails | Gameplay continues in memory; temporary notice; announce once; no reset | `ProfileService` mode `temporary-write-failed`; `applySaveState` notices; `LiveAnnouncer.setFailure` once; no retry; raw storage preserved | `tests/profile.test.ts`; M3/M4A evidence; CT-TEST-003/004 | PASS — M |

## Cross-cutting expression, sound and accessibility

| Item | Expected / actual | Evidence | Status |
|---|---|---|---|
| Expression priority | `PresentationState.towerFace/incomingFace`: failure/collapse > falling/surprised > danger/worried > landing/happy > aiming/focused > idle. 18’s danger priority and 17’s `.15`/top-three scope are implemented | `src/render/presentation.ts`; `tests/presentation.test.ts`; M4A probes; CT-TEST-004 | PASS — M |
| Sound priority | Failure > unlock/record > landing/perfect > warning > UI; max six voices, cooldowns, mute | No audio engine, no sound controls; explicitly deferred | DEFERRED — A |
| Live region | One polite atomic region; landing+unlock combined; write failure once; stale contexts canceled | `#live-region` atomic; `LiveAnnouncer`; M4A/CT-TEST-004 DOM mutations | PASS as DOM behavior — M; **named screen-reader speech EVIDENCE GAP** |
| Optional flourishes | Eyes glance, gentle entrance, drop stretch, floating Perfect+N, 3/6 banner, Results sparkle, selection ping | Not present in source; state/text/score feedback exists | O gaps, not required for current non-audio closure |
| Physical/zoom/browser matrix | Named screen reader, real zoom/safe area, Firefox/Safari, phone timing | Unavailable in this environment | EVIDENCE GAP — not a source omission |

## Prioritized findings

### Mandatory non-audio items

None remain in this inventory. The first-drop readiness message is now implemented at the first SPAWN_CUE→AIMING transition and verified in `evidence/readiness/`. The skin-selection semantics were explicitly accepted by the Architect (rebuilt button name + “✓ Selected” + `aria-pressed` + restored focus); do not add a redundant live message.

### Optional presentation improvements (not mandatory)

- Classic “eyes glance toward tower”.
- Gentle Start/Replay cat entrance.
- Valid-drop stretch up to 1.06Y.
- Floating “Perfect +N” text and special “3 perfect!”/“6 perfect!” banner (HUD `Perfect ×N`, points and landing message already exist).
- Results record sparkle.
- Selection/reward pings (audio deferred).

### Explicitly deferred / not counted as omissions

- Audio engine, sound toggle, volume, mute, reward/creak/thump cues, failure/tumble cues and audio policy.
- Named screen-reader speech, physical touch/safe areas, real zoom, Firefox/Safari, phone frame timing, actual tab discard and live 1,000-cat human play. These remain evidence gaps, not source-change authorization.

## Later audio supersession

CT-DEV-005 later implemented the bounded local sound/mute/volume slice. Row 24 above is updated; the rest of this inventory remains a non-audio coverage record. Audio listening/device claims remain outside it.

## Scope and writes

CT-DEV-004C was a documentation/source audit. CT-DEV-004CR then made the bounded readiness change in `src/main.ts` and built `main-CWm7_RHt.js`; 92 tests pass. Focused browser evidence is in `evidence/readiness/`. No storage/layout/performance/50-restart suites were repeated. Preview `http://127.0.0.1:4177/` is detached on the new build.

Writes: `app/REACTION-COVERAGE.md`; `evidence/readiness/readiness.json`; `evidence/readiness/classic-first-aiming-390x844.png`; `evidence/readiness/assist-first-aiming-390x844.png`.
