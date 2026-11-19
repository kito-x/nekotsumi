# M4D correction acceptance and independent validation

Architect, 2026-11-16. Shared remains the active root. No release authorization.

## Architect verdict

**CT-DEV-005R2 accepted for independent validation.** The implementation now meets the bounded native reliability corrections in24/25. This closes the code-correction gate, not the full audio milestone, listening review or device/accessibility gaps.

Architect reviewed the corrected source, native tests, close/recovery harness and evidence; independently compiled both TypeScript configurations and ran the compiled Node suite: **137/137 pass,0 fail**, exit0. Confirmed dist and HTTP GET hashes match:

- index `cb0af336e321627c86dbb719132fef85b96b51727d594b033b180b38a2fdb8b2`
- main-5_s3JvDQ.js `5b7daa5678b1bf5fef1592c775eb895103103986a8de122da3a965aff2053207`
- scene JS `d3da2a5d2be172c523b5d2ba4aad0ca7309112ab099513d795d6c6b7ea32570d` (Developer evidence; unchanged scene)
- CSS `ff6b29b6c4181a52fae9a3a0924869da6607b8116455bee7e4cddf7b87ea7972`.

Architect reran the original `evidence/m4d-review/correction-review.mjs` against current compiled code:50 failed attempts produce1 context/1 close; the source stop is retried and succeeds; known master-write failure reports unavailable and rejects cue acceptance. Also reran the reviewed close-ownership harness: pending/rejected/throwing/unconfirmed close blocks multiplication; confirmed closure allows a later activation to recover; setup rollback disconnects master. Sources are now registered before helper configuration/start/stop, normal and partial cleanup own the complete graph, and service accounting clears on unavailable/closed status. No further blocking defect found in this source review.

One evidence-label clarification: `close-ownership.json`'s `contextsStillUnclosed:0` after recovery counts the **retired failed context only**, not all contexts. The recovered replacement is running, so the total number of live replacement contexts is1. Do not report that recovery has zero live contexts. Tests must distinguish cumulative creations, failed/closing contexts and currently live contexts.

Architect independently recomputed startup JS/CSS:109,015 raw bytes / **32,657 gzip6 bytes**, within the200,000-byte gate. Supplied dist total141,878 and first-load raw134,630 remain Developer measurements for independent validation. Audition WAV SHA-256 independently matches original and correction2: `ee7466f558f021b30fac0183d986da2fd076a8dcd0bc760be70f99c5915d3765`. Recipe identity is preserved. Browser/offline behavior in Developer's evidence is reviewed but not an independent browser/listening pass.

## CT-TEST-006 — independent final audio validation

Assigned to Playtester after this review. Read23–26, `app/M4D-EVIDENCE.md` including both corrections, and source as needed. Test exact served final build at loopback4177, preserving production source/dist/server/config and existing evidence. Verify identity before/after. Use only disposable profiles/records you create; no lock stealing, other users' save deletion or production mutation/debug endpoints. If127.0.0.1 has the known held lock, record it and use localhost with independently matched served hashes for owner checks; do not alter lock policy or infer orphan reproduction. Capture mode may aid deterministic ticks, but must be labeled and genuine activation checked with trusted browser input. No installs/providers/charges/release/git/migration/container/unrelated actions.

1. **Native reliability independence.** Rerun tests/typecheck and independently check actual compiled native backend with controlled promises/nodes, rather than merely copying assertions from Developer. Verify unresolved resume remains1 across50 resets; late completion after mute/Pause/Home/dispose does not resurrect output/cues; rejection permits a fresh retry. Failed setup: pending/throwing/rejected/unconfirmed close prevents a second live context; confirmed close permits a later trusted retry with at most1 live context. Verify natural/partial graph teardown, stop-after-start, retained callback cancellation, master-write unavailable/no playback and recovery. Stale/duplicate Results must preserve current cue; first valid no-reward Results cancels failure. Identify these as controlled-native tests, not real device/heap claims.
2. **Real browser policy and lifecycle.** Fresh and muted reload create0 contexts. Synthetic Start/tutorial/Drop/key events and capture advance create/resume none; genuine pointer/keyboard/native button activation on eligible routes reuses1. Check ordinary versus perfect replacement, warning worsening-band/cooldown/recovery, failure priority, scheduled-warning cancellation, both failure families and Skip/Results. One eligible Results reward coalesces strict record and unlock, with no equal-baseline/load/abandon/in-run reward. No missed/stale cue after Pause/hidden/blur/Home/Replay/restart; label capture-suppressed blur tests separately and use ordinary mode for real hide/blur. Source cap<=6 and settled count0;50 trusted resets keep1 context and no accumulated groups/listeners. Running is not proof of audibility.
3. **Sound Settings and save semantics.** Mute during tumble cancels scheduled/active voices, volume0 suppresses/cancels, input updates displayed percent/gain and committed change persists once. Persist mute/volume on reload; no saved mute bypass. Unmute while paused/Home makes no preview and no context until fresh eligible gesture. Owner versus temporary/no-write and save-error behavior stay consistent with existing rules. Do not modify raw saves to create fault cases; use safe isolated harness for unavailable/error routes. Pending/unavailable status truthfulness and gameplay responsiveness matter; no device-output-detection claim.
4. **Input/readiness/accessibility/layout regression.** First Ready follows9 ticks once/run, Assist includes positioning; later cat does not repeat; Replay gives a new message and immediate Home/reset cancels old text. Tutorial close by click/Enter/Space/Escape leaves0 cats. Pause→Settings→Escape→Resume preserves phase and focus. Sound/Volume labels and keyboard range work; checkbox's whole clickable label target and slider remain usable, Close reachable by internal scroll at320×568,390×844,844×390,1280×720 in normal/high contrast with no horizontal overflow. Preserve Reduced/Full/System behavior. Semantic/DOM checks do not prove named-screen-reader speech.
5. **Independent offline/transfer evidence.** Use the same synthesis graph to verify seven cues finite/nonempty/headroom, six-source overlap and zero output after cancellation; compare unchanged reel and recipe without claiming to have heard it. You may use an isolated audit server on a free port and stop only that server; do not alter preview4177 or overwrite Developer audits. Recalculate final startup/first-load/dist gates and verify all resources loopback/no audio-file requests. Distinguish GET encoding from HEAD. No need full unchanged1000-cat performance suite.
6. **Evidence and outcome.** Write `evidence/ct-test-006/CT-TEST-006-report.md` and independent raw results/screenshots/scripts there. Identify exact browser/runtime/input/capture mode and environment refusals without bypassing host limits. Report each group PASS/FAIL/PARTIAL and severity/repro for actual defects; do not optimize/fix production. Mark unavailable actual listening, device autoplay/latency, Firefox/Safari, named-screen-reader speech, real zoom/safe-area and held-lock lifecycle. Clear only disposable profiles you create and report all writes. Send finished results to Architect and stop.

## CT-ART-005L — listening review only

Assigned to Studio, independently of Playtester's objective tests. Existing user's local-effects implementation/testing authorization permits audition of these locally generated cues, with no provider, paid API, music, voice or optional cue production.

Review the exact non-autoplay `evidence/m4d-correction2/audition-reel.wav`, timing index and recipe in `app/M4D-EVIDENCE.md`/23. Listen **only if an actual auditory review route is available**; do not infer pleasantness or sound character from waveform statistics, node counters, a running context, filenames or recipe text. Identify the listening method/output and distinguish heard impressions from source facts. If listening is unavailable, report that directly and give a source-only design review without a listening PASS; no installation, paid service or workaround.

If heard, assess seven cues for soft/unobtrusive character, abrupt clicks/harsh or distress impression, ordinary/perfect distinction, quiet warning, failure/reward distinction, spacing and relative prominence at the rendered0.6 volume. Audio device loudness is not calibrated by these data; do not claim universal loudness/latency or physical-device compatibility. This is a short review, not new composition/tuning: write any proposed adjustment with cue/time/reason for Architect, but change no source, assets/reel or build. No game/user preference changes, public upload/post, provider/key/charge, release/git/migration/container work.

Write `art/audio-review-01/review.md` stating methodology, actual hearing availability, findings, remaining gaps and writes. Return to Architect and stop; do not independently ask the user for approval or claim their sound preference.

## Remaining scope and Architect writes

Functional independent testing and perceptual audition are pending. This review grants no new visual adaptation, provider/charge or public release. Local M3/M4A/M4B and readiness acceptance remain; selected-source runtime art, physical device, real speech and wider browser gaps remain separate. Shared stays active until the deferred host-root copy/migration can be verified by Developer under OG coordination.

Architect writes: this document, design index, ignored `.test-build/`, and `/tmp/ct-m4dr2-architect-{tests.txt,repro.json,close.json}`. No production source/dist/browser profile/server/save/git/migration changes. No audio was played or listened to by Architect in this review.

## Delegation record

CT-TEST-006 assigned to Playtester in OpenBot message `ce0f9aa5-70ba-47ea-bd8e-8ebcfed45357`; CT-ART-005L assigned to Studio in `881d5fe0-62ba-43ba-b14c-765ab3659a1c`, both expectsReply true. OG informed without reply request in `4aef1ce4-4735-4519-bb41-bfd857611d30`. Awaiting both results; neither is treated as passed by assignment.

## Studio review outcome — source-only, listening still open

Studio result `ce4f5717-b010-49c5-be9e-6f3d0ca1045d` and [review](../art/audio-review-01/review.md) are accepted as a source-only review. Studio reports no playback/auditory-input route and explicitly makes no listening PASS or sound-character judgement. Architect read the report, checked the index/offline data and independently rechecked the exact reel hash. The authorized seven-cue scope and priority/replacement/cancellation/text-equivalent design are aligned; no source-based blocking mismatch or justified tuning change was identified.

The review notes two limits without inferring subjective sound quality:

- Audition segments include120ms offline tail after the nominal cue duration, followed by300ms added silence. Thus the next segment starts about420ms after the nominal cue end; the actual envelope can end earlier. This is an audition documentation clarification, not a runtime timing change. Original evidence stays intact; a separate [listener guide](../art/audio-review-01/listener-guide.txt) explains the timestamps and spacing.
- Digital sample peaks are not calibrated perceived loudness, phone-speaker audibility or event prominence. The priority contract governs cancellation/scheduling, not an obligation for failure peak amplitude to exceed reward. No level increase or recipe edit is assigned from these numbers alone. Distinction, softness/clicks and actual output still need ears.

Actual listening remains unverified. The exact non-autoplay reel and guide can be shared for human review; no subjective approval is inferred. CT-TEST-006 remains pending separately, with no new production task or user decision required by this source-only result. Architect writes in this follow-up are this status, design index and the listener guide; production code/build/reel/settings/saves remain unchanged. No tests rerun for documentation-only work.

## Independent result received

CT-TEST-006 subsequently returned five PASS / one PARTIAL with no product defect. Report and Architect's acceptance limits are recorded in [27](27-m4d-independent-review.md). Genuine hide/blur delivery remains partial; Studio listening remains unavailable. This supersedes the pending-test status above without changing historical scope or implying complete audio/release validation.
