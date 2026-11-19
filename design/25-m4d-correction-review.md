# CT-DEV-005R review and CT-DEV-005R2

Architect, 2026-11-16. Active root `repository root`.

## Verdict

**Partial acceptance; a further bounded correction is required before independent validation.** The first correction fixes resume ownership, normal graph completion/cancellation, exception escape from reset, stale/duplicate Results and genuine activation wiring. It adds meaningful native-context tests. Three remaining branches of24's B/C requirements are reproducible; they are not new feature scope.

Architect compiled both TypeScript configurations with Node26.12.1 and reran the full compiled suite: **127 tests,127 pass,0 fail**, exit0. Dist and served GET hashes match:

- index `b2e206aaec794b841d294616c4af801b90e01f34da1b0d058252d07c2ae18006`
- main-qg9b1QR2.js `fae724a8e8a3f26a50c19721354829135437b9aad39f74effbc271336fc0e546`
- CSS `ff6b29b6c4181a52fae9a3a0924869da6607b8116455bee7e4cddf7b87ea7972`.

Reviewed corrected production audio modules, main trusted-activation wiring, native tests and M4D correction evidence. Browser/offline measurements supplied by Developer were reviewed, not independently rerun in this review; no listening or actual-device claim follows. No production rebuild was needed for Architect checks.

## Remaining native-boundary findings

Reproducer imports the actual compiled modules: [correction-review.mjs](../evidence/m4d-review/correction-review.mjs); raw output: [correction-review.json](../evidence/m4d-review/correction-review.json). These are controlled native-context stubs, not an assertion that50 contexts accumulated in a real browser.

1. **Replacement does not wait for closure.** On failed master setup, `createContext` calls `context.close()` then clears references immediately. If close remains pending or rejects while the context has not closed, another activation calls the factory again.50 unlocks against gain-failing contexts with unresolved close produced **50 created,50 close calls,50 still unclosed** in the stub. Existing tests assert that close was requested, then explicitly expect a second context without settling the first close. This contradicts24C's requirement that the previous context be closed before another becomes live.
2. **A source is registered too late for mid-helper rollback.** Oscillator/noise helpers register a node in `owned` immediately but only add it to the `sources` stop/handler list after the helper returns. If start succeeds and the scheduled stop throws, cleanup disconnects it but never retries stopping it. Reproducer: started oscillator, stopCalls1 (the failed call), stopped=false, disconnected=true. Disconnection silences this graph, but source work has not been stopped.24B explicitly includes mid-start/stop failure rollback; current tests only fail a later node factory after a previous helper already returned.
3. **Master output failure can claim working state.** If the master AudioParam's scheduled gain write throws, `applyGain` writes zero and suppresses the error. `unlock` then reports running and `play` returns true for a complete cue through that zero master. Reproducer: `status=running`, masterGain0, acceptedCue=true. This is silent fallback, but unavailable status is missing. True output failure must not be confused with successfully established output; even successful establishment still does not prove a person heard sound.

## CT-DEV-005R2 — exact correction scope

Use the same user-authorized local audio scope in23/24. No recipe/level/cue/content, gameplay, progress/profile schema/transaction, lock, art, readiness, dependency or product change. No provider/key/charge, public release, git, migration/container or unrelated service action.

1. **Keep failed-context closure ownership.** Retain one context/closing token until closure is confirmed. A pending close blocks another factory call while gameplay remains silent and responsive. A throw/rejection that leaves state unclosed keeps audio unavailable and prevents context multiplication; do not retry in a loop or await it in gameplay. Once closure is confirmed, allow a later genuine activation to retry once. Guard late fulfill/reject after disposal and do not restore status/output from obsolete operations. Explicit master disconnection belongs to setup rollback as well. No new contexts while an earlier failed one may remain live.
2. **Register sources when created.** Make sources available to rollback immediately, before configuration/connection/start/scheduled stop. On partial helper failure, attempt stop and disarm every created source, disconnect all owned nodes and preserve one completion/cancellation path. No change to synthesis timings, source limits or priorities. Native disconnect failures remain contained per node.
3. **Report unrecoverable output setup/write failure.** Keep best-effort master silence and cancellation, but expose unavailable rather than then claiming running/accepting inaudible cues through a known unusable master. Ensure ordinary gain application cannot erase the failure status; a retry must use an explicitly recovered/valid output path and follow item1's context lifetime rule. Do not broaden to device-output detection: running still does not prove audibility.

Add focused native tests that model unresolved/fulfilled/rejected/throwing close and count simultaneously unclosed contexts, including repeated eligible attempts and disposal. Change prior retry tests so their first context actually closes before replacement. Add a helper's stop-after-start throwing once (cleanup must retry, stop and disconnect), and a master-only gain write failure while envelope gains remain normal (truthful unavailable/no cue acceptance, no throw; ensure later lifecycle remains playable). Also cover automation/connect/start failure after source creation if not already present, with stop attempts observed.

Run full tests/typecheck/build after final changes; rerun both review reproducers against current compiled code, adapting only API arguments and expected intended behavior, without overwriting original evidence. Keep evidence in a new correction2 subfolder and update `app/M4D-EVIDENCE.md` with measured outputs, hashes and all writes. Preview4177 stays detached; no full unchanged engine/performance audit. Recheck focused trusted activation, mute/Pause/Home/Resume, one-context50 resets, stale Results and offline cancellation/unchanged recipe measurements on final served build; recompute final transfer. Stop for Architect review before Playtester. Listening/device/Firefox/Safari/named-screen-reader/real zoom/safe-area/orphan-lock gaps stay explicit.

## Architect writes and handoff

This document, design index and `evidence/m4d-review/correction-review.{mjs,json}`; ignored `.test-build/` regenerated and `/tmp/ct-m4dr-architect-tests.txt` written. No production source/dist/server/save/git/migration changes by Architect. Awaiting CT-DEV-005R2; independent validation is not assigned or passed.

CT-DEV-005R2 delegated to Developer in OpenBot message `e150618d-d205-4f1d-bda7-221a5a87ee55`, expectsReply true; OG informed without a reply request in `f90e3fec-d46c-4da4-9a06-26db53cfaa52`.
