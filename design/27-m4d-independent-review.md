# M4D independent review — available checks complete, limits retained

Architect, 2026-11-16. Active root remains `repository root`.

## Verdict

**Accept CT-TEST-006's five PASS / one PARTIAL report. No product defect was found; no further code correction is assigned.** Local implementation and the checks available in this environment are complete. Genuine tab-hidden/blur delivery, actual listening and the existing device/accessibility/browser checks remain unverified. This is not a full six-group PASS, complete M4D validation or release acceptance.

Playtester result `d1a9e2be-a87d-42e1-b83e-863e8d7b126e`: [independent report](../evidence/ct-test-006/CT-TEST-006-report.md). Architect read the report, native results/harness, browser evidence, test summary and hash records. The report distinguishes controlled-context/source checks from browser and auditory evidence; its no-defect conclusion is accepted within those limits.

## Accepted findings

- Native backend reliability: independent harness plus137/137 tests/typecheck; bounded pending resume/close ownership, graph teardown/failure rollback, unavailable fallback, stale Results protection and source cap. Failed-context recovery means the old context is closed and one replacement is live, not zero live contexts.
- Browser activation/cues/reset paths: trusted versus synthetic activation, ordinary/perfect, both warnings and failures, strict/coalesced Results reward, Pause/Home/Replay/restart, one context through50 trusted resets and stable listeners/objects.
- Settings/save behavior: owner mute/volume/mode/high-contrast persistence, muted reload, fresh-Resume activation, volume zero. Tumble cancellation and some fault/no-write routes use controlled-native/existing test evidence rather than browser fault injection; Settings unavailable text was source-checked, not injected into a real broken browser backend. These are explicit evidential limits, not hidden sub-check passes.
- Input/readiness/layout: Classic/Assist first Ready, tutorial close paths, focus restoration/traps and four Settings viewports with44px label/slider targets, Close reachable through internal scroll, contrast and no horizontal overflow. No named screen-reader speech claim.
- Offline samples/transfer: all seven finite nonempty cues, six-source overlap peak0.263, zero output after cancellation, unchanged reel; startup32,657 gzip6, first-load134,630 raw, dist141,878 bytes, loopback resources and no runtime audio files. GET versus HEAD encoding distinction retained.

Architect did not rerun unchanged full suites after this documentation-only review. The independent test log reports137 pass/0 fail; Architect had already independently run the same137 tests on the accepted build in26. Current dist hashes and served main were rechecked after report review and the focused handler check:

- index `cb0af336e321627c86dbb719132fef85b96b51727d594b033b180b38a2fdb8b2`
- main-5_s3JvDQ.js `5b7daa5678b1bf5fef1592c775eb895103103986a8de122da3a965aff2053207`
- CSS `ff6b29b6c4181a52fae9a3a0924869da6607b8116455bee7e4cddf7b87ea7972`.

## Genuine hidden/blur remains partial

Playtester opened another tab and instrumented native visibilitychange/blur, but the private headless browser remained visible/focused and delivered no such event. No real lifecycle cancellation result can be inferred from that attempt. Main capture mode intentionally disables those automatic pause paths, so capture-mode game checks cannot stand in for ordinary-page lifecycle validation.

Architect checked the embedded browser's available controls: viewport/color/motion emulation and page input/navigation are available, but no genuine window-focus/tab-visibility control is exposed. Repeating the same second-tab attempt or replacing it with fabricated visibility would not close the gap. No alternate browser/host or security workaround was used.

One additional **controlled handler integration check** ran on a new disposable origin `http://architect-m4d.localhost:4177/` with no capture parameter. Trusted Start/tutorial input created one running context. Dispatching a synthetic window blur (`isTrusted:false`) changed SPAWN_CUE→PAUSED, opened the blur-reason dialog and changed audio running→pending with zero active/scheduled groups. This confirms ordinary-page handler wiring only. It neither produces genuine focus loss/visibilitychange nor proves cancellation of an active sound (none was active in this check). Independent native and user-Pause checks supply active cancellation evidence separately.

Raw observation: [architect-blur-handler.json](../evidence/m4d-review/architect-blur-handler.json). Removed only this newly created audit origin's disposable profile and closed its test tab. The pre-existing diagnostics tab was left intact.

## Still open

1. Actual listening for softness/clicks/distinction and perceived level, including phone speakers. Studio's source-only review was accepted in26; Studio had no auditory route. The exact4.87s reel and listener guide were supplied to the user; neither file nor peak values imply auditory approval.
2. Genuine hide/blur event delivery and audio cancellation on an ordinary browser page. Requires an environment that can actually change tab/window visibility/focus; no code defect was identified here.
3. Physical-device autoplay/latency and smoothness, Firefox/Safari, named screen-reader speech, real zoom/safe-area, and recreation of the previously held-lock lifecycle. Natural lock release in Playtester's session is not a reproduction or fix.
4. Previously tracked selected-source runtime-art preparation/verification and deferred relocation are separate from audio acceptance. Do not infer final visual integration, migration or public-release approval from these tests.

No new cue/tuning/optional polish or broad repeated audit is warranted from this result. No active local implementation/test delegation remains for M4D. OG coordinates the outstanding human/device checks and later product steps; only user-approved scope may proceed.

## Writes and coordination

Architect wrote this review, design index/26 status and `evidence/m4d-review/architect-blur-handler.json`. Browser work created then removed only its disposable audit profile and closed the new tab. No production source/dist, audio reel, existing save, preview server, git history or migration/container state changed; no tests rebuilt in this follow-up. No audio was listened to.

OG informed without a reply request in OpenBot message `f8667d8d-9984-4278-b87e-b9ebabafa086`, carrying the partial lifecycle/listening/device limits and deferred-copy constraint. No additional local implementation or validation task was assigned from this report.
