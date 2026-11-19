# M4D audio review and CT-DEV-005R

Architect, 2026-11-16. Active root remains `repository root`.

## Verdict and checked baseline

**Hold acceptance for a bounded reliability correction.** CT-DEV-005 implements the authorized cue families, mute and volume. Source structure, pure cue policy, Settings integration and supplied offline measurements are suitable for the intended prototype. Independent Playtester/listening validation follows correction review; no release or subjective sound approval is implied.

Reviewed `design/23-local-soft-effects.md`, `app/M4D-EVIDENCE.md`, all three new audio modules, audio tests, relevant main event/Settings wiring and audit source. Final dist and HTTP GET bytes agree for index, main and CSS:

- index `428d5d6731b1953adb279c4ff91f686c2a384dad91ec92e1827c39eab95fa118`
- main-CKiC47vh.js `9991c2c18d9fd68f6450bca859bf999a0d00629f3ebda55e2d17afd96d32ca96`
- CSS `ff6b29b6c4181a52fae9a3a0924869da6607b8116455bee7e4cddf7b87ea7972`.

Architect independently compiled both TypeScript configurations and ran Node's compiled test suite: **104 tests, 104 pass, 0 fail**, exit 0. Node was located at `the local toolchain`; `npm`/`python3` were absent from the shell PATH. An initial Bun run reported 97 passing tests because its Node-test handling differs; the full Node run is the count used here. No tool installation or production rebuild was needed.

The passing tests mostly exercise `AudioService` with a simplified FakeBackend. In particular, the test titled pending/unavailable/rejected sets fake statuses without exercising real backend resume promises. The late-ended test looks up a group after FakeBackend has already removed it, so the purported late callback is never invoked. Neither proves the native boundary requirements below.

## Reproduced native-boundary findings

Reproducer: [native-backend-review.mjs](../evidence/m4d-review/native-backend-review.mjs), importing the actual compiled audio modules with instrumented context/node stubs. Raw output: [native-backend-review.json](../evidence/m4d-review/native-backend-review.json). This is deterministic source-boundary evidence, not browser memory, speaker output or device reproduction.

1. **Pending resume work is unbounded across cancellation.** `WebAudioBackend.cancelAll` and `suspend` reset `resumePending` despite an unresolved native promise. One context plus 50 cancel/unlock cycles made **51 unresolved resume calls**. An old completion also clears the shared flag before checking its generation: with a newer call still pending, settling the old call permitted a third request. This violates23's bounded pending work requirement.
2. **Cue cleanup is incomplete and construction is not transactional.** Natural completion of an ordinary cue called its completion callback once but disconnected **0 of 5 owned nodes**, retaining both source end handlers. Cancellation only disconnects sources, leaving intermediate gain/filter connections unmanaged. If buffer-source creation throws after the ordinary oscillator starts, `play` returns false, yet one already-started source remains connected and cannot be canceled by `cancelAll` because no group was registered. The service's source counter then understates actual scheduled work. This proves missing explicit teardown and an untracked partial cue; it does not prove native heap growth in a real browser.
3. **Some backend failures escape or misreport state.** A synchronous `suspend` exception escapes `AudioService.resetSession`; that method runs before Home/fatal screen work. Gain setup failure leaves a partial context: first status is idle, a retry reports running, but playback always fails because master is absent. Settings never gets unavailable status. Backend methods must leave gameplay and truthful fallback status intact even when native setup/operations fail.
4. **Stale Results can cancel the current run's sound.** `AudioService.results` cancels groups even when the pure policy rejects a stale run or duplicate Results. A current perfect cue went from2 active sources to0 after a stale Results input. No current UI route reproducing this fan-out is asserted, but the service violates its stale-event contract. A valid first Results with no reward must still cancel failure; rejection must be distinguishable from accepted-but-silent Results.

Additional source-confirmed contract gap: eligible UI handlers call `unlockFromGesture` without checking or passing trusted activation. A synthetic `.click()` or dispatched canvas event takes the same context creation path as genuine input. Browser autoplay policy can block output, but does not enforce our stronger no-context-before-trusted-input rule. The capture advance function itself does not unlock; preserve that property. No real-browser autoplay bypass or audible output is claimed.

## CT-DEV-005R — bounded correction

Use existing local effects authorization. Preserve cue recipes, levels, timing targets, gameplay, records, profile schema/transactions, art, lock behavior, readiness and approved optional-cue exclusions. No dependency, provider/key/charge, release, commit/push, migration/container or unrelated-service work.

### A. Native async ownership

Keep at most one unresolved resume request per live context. Cancellation/suspension invalidates desired playback/status generations without pretending an unresolved request has settled. Old fulfill/reject callbacks must not clear a newer operation's ownership, restore output, update a closed backend or replay a cue. Handle current and stale suspension completions consistently. A later real activation may retry after the pending attempt settles/rejects; never loop or accumulate requests against a permanently pending promise. No gameplay await.

Add actual `WebAudioBackend` tests using a controllable native-context stub: repeated reset/mute/Pause/Start while resume stays unresolved; old completion versus current intent; reject then fresh retry; late completion after Home/mute/dispose. Assert request counts, gain, status and absence of replay, not just service counters.

### B. Full cue ownership and failure rollback

Track every cue-owned source, envelope gain and filter as soon as it is created. On normal completion and cancellation, disarm handlers and disconnect the complete owned graph with idempotent cleanup, without disconnecting the shared master. Handle one node's cleanup throwing without skipping the others. If any creation/connect/automation/start/stop step fails midway, stop/disconnect all already-created nodes before returning failure; do not leave a partial group audible or outside source accounting. Notify completion at most once. Keep groups <=6 scheduled/active sources and preserve failure/reward priority.

Test natural end, cancel-before-start, cancel-after-end, repeated cancel and truly captured late callbacks. Inject failure after the first source has started and during cleanup; assert all owned connections cleaned and no retained scheduled sources, then verify later playback still works. Re-run offline measurement/cancellation boundary evidence using the same corrected graph and keep the original measurements distinct if values change.

### C. Silent fallback and truthful status

Contain synchronous exceptions and promise rejections in native setup/resume/suspend/close and service lifecycle paths, including reset/dispose/group eviction. Silence master and cancel first; no exception may stop Home/new run/fatal recovery. Roll back partial initialization; never advertise running with no valid master. Surface unavailable for actual setup/output failures; pending activation is distinct and may retry from a fresh eligible gesture. If a failed context is replaced, ensure the previous one is closed before another becomes live. Pending status wording must avoid guaranteeing that the next tap will produce sound (for example, "Sound may need a tap to start.").

Test throwing factory/createGain/connect/resume/suspend/close and rejected resume/suspend/close using the native stub. Verify playable lifecycle, bounded contexts, no stale gain restoration, and accurate status. Do not broaden this into a new UI or audio feature.

### D. Event validity and genuine activation

Make stale/duplicate Results a true no-op, including no cancellation of a newer/active reward group. Keep cancellation on the first valid Results even when it earns no reward. Add focused regressions for both.

Carry genuine trusted activation through only the authorized Start/Replay/confirmed Restart/tutorial-completion/Resume/Drop routes, or gate at their audio boundary equivalently. Synthetic events and capture advance may still drive game checks but must not create/resume a context. Preserve keyboard, pointer and native accessible activation; do not make gameplay conditional on audio permission. Native browser policy still decides whether output may run. Test no-context under synthetic clicks/keys, then use real browser input to verify one-context activation and normal tutorial/Escape/Resume/Drop behavior.

## Verification and handoff

Run all tests/typecheck/build after the final edit. Recheck served/dist hashes, ordinary/perfect/warning/failure/Results, mute/zero/reload, Pause→Settings→Resume, first readiness and50 real-browser resets on corrected build. Real-browser counters complement, rather than replace, the native promise/graph failure tests. Recompute transfer/network evidence on final artifacts; no full unchanged engine/performance suite required.

Keep preview4177 detached; stop only your own audit server and clear only disposable test data. Preserve `evidence/m4d/` baseline; use a clearly named correction subfolder or files. Update `app/M4D-EVIDENCE.md` with actual commands/results/build identity and remaining device/listening gaps. Return and stop for Architect review before independent validation.

Actual listening, physical-device autoplay/latency, Firefox/Safari, named screen-reader speech, real zoom/safe-area and orphan-lock behavior remain unverified. The supplied audition WAV and offline samples have not been listened to by Architect. No subjective sound judgement is made.

## Architect writes

This document, design index status and `evidence/m4d-review/native-backend-review.{mjs,json}`. Ignored `.test-build/` was regenerated; test log `/tmp/ct-m4d-architect-tests.txt` was written. Architect changed no production source, dist, save, server, git history or migration configuration.

## Handoff record

CT-DEV-005R assigned to Developer through OpenBot message `4116205b-1a85-4cfc-976f-0b1a6b8e59d1`, expectsReply true. OG informed without a reply request in `2825692b-276e-41ca-a22c-3c7364f7ac7f`. Awaiting correction; independent validation is not yet assigned or passed.
