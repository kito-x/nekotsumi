# M4D — quiet local effects, mute and volume (CT-DEV-005)

Architect, 2026-11-16. Active root `repository root`.

## Authorization and baseline

OG message `d3734b77-699a-46fd-b7be-c151e293c942` relays the user's exact selection **“Add soft effects (recommended)”**. OG states the prompt explicitly authorized implementation/testing of quiet locally made landing/perfect/wobble/tumble effects and one coalesced Results reward, with mute/volume; no music, voices or paid service. Architect relies on this relayed user authorization, not an independently inspected card. This supersedes earlier audio-deferred statements only for this bounded feature.

Studio's [proposal](../art/audio-proposal-01/brief.md) and Architect's [review/clarifications](22-candidate-gaps-and-sound-brief.md) supply content direction. First pass excludes UI ticks, Start/Replay sounds, Drop/release whooshes, nudge clicks, in-run unlock reward pings, music, vocalizations and voice generation. No provider/API/key/purchase, new dependency, art change, public release or migration. No change to physics, balance, score, skin geometry, save schema or lock policy.

Readiness CT-DEV-004CR is Architect-accepted after source/evidence review, served/dist hash check and an independent92-test pass. Base build:
- index `a00d25df12f8d81199c21c01c22025bb95cf8790425e063e692a7b2ad10f131b`
- main-CWm7_RHt.js `9684c460ffd6f12aeeae66b834dae8b670f38b9338742879388e38792363569c`
- CSS `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1`.

Keep first-ready/semantic cat-selection behavior. Final independent sound review also rechecks readiness, avoiding an extra unchanged full test cycle before integration.

## 1. Architecture and lifecycle

Implement `src/platform/audio.ts` with a small injectable backend/context factory, separate from pure policy where useful. Use native Web Audio oscillators/filtered deterministic local noise; no audio files fetched at runtime, external libraries, AudioWorklet or service calls. Domain imports no audio/browser APIs and consumes no audio RNG. Any noise generator is independent of simulation RNG, bounded and reusable.

Follow04's AudioPort intent (gesture unlock, event fan-out, enabled/volume, pause/resume/dispose) with explicit run reset/Results cue methods if needed. Audio never blocks an input, tick, profile transaction, startup or screen transition: do not await context creation/resume/suspend in the gameplay path. A denied, pending, missing or rejected audio context leaves the same playable game.

- No AudioContext before a trusted interaction and no sound on page load. Persisted defaults remain `soundEnabled:true`, `volume:0.6`, but do not imply autoplay.
- Use genuine Start/Replay/confirmed Restart/tutorial completion, Resume and Drop activations to create/resume lazily while allowed by the user setting. Sound preference edits in Home/Pause need not resume audio until the next Start/Resume; no preview tick. Programmatic capture/advance calls are not new trusted gestures.
- At most one live AudioContext/master gain per page; reuse across rounds. No unbounded pending resume promises/context proliferation. A context not yet running drops cues rather than queueing them for later. Retrying on a later genuine gesture is allowed without replaying old cues.
- Pause/hidden/blur/interruption cancel all active and scheduled one-shots synchronously, silence the master and request suspend without awaiting it. Resume may request resume only from the fresh gesture; never replay missed effects. Keep desired enabled/paused/run generation separate from promise completion, so a late old resume cannot restore sound after mute/Home/Pause.
- Restart/Home/new run/fatal/dispose cancel scheduled/active nodes and invalidate old callbacks. Home stays silent. Closing the page releases audio resources; dispose disconnects/closes what it owns. Results stops a lingering failure cue before its one eligible reward. Skip does the same.
- Schedule short envelopes on AudioContext time, not JS timers that could fire in a later run. Node-ended cleanup must be generation-safe and disconnect nodes even after cancellation. No continuous sources/loops. Keep pending nodes bounded, including sources scheduled slightly in the future.

The [Web Audio specification](https://www.w3.org/TR/webaudio/#dom-audiocontext-resume) describes potentially pending resume promises and [suspension of context time](https://www.w3.org/TR/webaudio/#dom-audiocontext-suspend); do not infer that calling either method is immediate proof of a running/silent device. Use stable browser primitives, not draft-only features.

## 2. Cue policy and bounded synthesis

All cue descriptions/levels are prototype targets until actually listened to. Use small, soft sine/filtered-noise envelopes, short attack/release ramps and no harsh alarm or distress impression. A reasonable deterministic first implementation is:

| Cue | Authoritative trigger | Character / duration |
|---|---|---|
| ordinary landing | placementCommitted, ordinary | padded low sine/noise thump,100–140ms |
| perfect landing | placementCommitted, perfect | two soft ascending sine notes,180–260ms; replaces ordinary |
| caution/danger | stable landing enters a lower safety band | quiet filtered creak/downward bend,120–220ms; danger slightly firmer |
| miss/tumble | roundFailed | miss: short soft slide/pop180–260ms; COM: low soft pulses/rustle450–700ms |
| Results reward | actual Results with any strict new record or any run unlock | one small rising chime250–350ms, coalesced |

Use the existing `safetyBand` thresholds (steady≥.35, caution≥.15, danger<.15); do not change engine safety. On each stable landing update prior band, even muted. Only crossing into a worse band triggers a warning, at most one per1s; steady→danger gives only danger, remaining in band none, recovery none. If it coincides with a landing, schedule at most one warning about120ms later or suppress it; never replace the landing's initial attack with a louder alarm. Scheduled warning is canceled by failure/pause/reset.

Priority: failure > Results reward > landing/perfect > warning. Failure cancels pending lower-priority effects; perfect never doubles ordinary. No extra chain melody or optional layers in this pass. At most **six scheduled/active source nodes**, including oscillator/buffer sources of multi-note cues; disconnect on end/cancel. If capacity is exceeded, drop/cancel a lower-priority effect, never exceed it or delay gameplay. A multi-source cue must be treated as one cancellable group.

Deduplication stays bounded: current-run placement ordinal/high-watermark, failed flag and Results-reward flag are sufficient; do not retain an ever-growing set across endless play/replays. Reject stale run events and duplicate ordinals. Snapshot rendering, profile loading, Collection selection and replay setup trigger no rewards. No sound merely because stored thresholds are already reached.

Results reward condition is `run.score > baseline.bestScore || run.height > baseline.bestHeight || runUnlocked.length >0`, evaluated against the same pre-run baseline as badges. Play once on actual Results, including Skip transition. Multiple records/unlocks coalesce to one cue; no in-run unlock ping and no reward on abandon-to-Home/Restart. Replay clears the old reward guard only for the new run.

Headroom: cap each individual source's envelope amplitude at0.1 or lower and user/master gain≤1, so six worst-case simultaneous sources remain below full scale; verify the real graph offline. Do not rely on a compressor to hide unbounded sums. Default volume0.6 remains quiet relative to max. Document actual chosen frequencies/durations/gains. Do not claim subjective pleasantness without a listening check.

## 3. Settings and unavailable audio

Add real Settings controls near the top: **Sound effects** checkbox and **Volume** slider0–100% with visible current percentage and native accessible labels. Keep existing Motion/High contrast/About Assist/Close paths. Controls remain≥44px targets where relevant; dialogs can use their existing internal scroll, with Close reachable.

- Use existing `ProfileService.updateSettings` for `soundEnabled`/`volume`; no schema migration. Defaults and existing saved values apply before the first possible cue, including persisted mute on reload.
- Mute immediately sets silence and cancels current/future source groups without awaiting promises; it does not mute screen-reader speech. Volume0 behaves as silence and cancels current sources; increasing it allows future cues only, no catch-up.
- Slider input updates master gain/percentage immediately. Persist on committed change, not an unbounded new timer; no duplicate same-value transaction. Sound toggle persists once per actual change. Temporary/other-tab/unreadable/write-failed modes retain their existing no-write rules.
- Preference changes while paused do not start sound or resume gameplay; closing Settings returns to Pause and focused opener. A fresh Resume is still required. No sample/play-preview button or UI tick in this pass.
- If API is unavailable or a backend operation fails, show a concise non-modal status in Settings such as “Sound is unavailable here. You can keep playing.” Do not reset the saved preference or blank the game. Pending/blocked activation is not proof the API is absent: a later trusted gesture can retry. Avoid noisy repeated announcements/logs. Status must not promise audible playback solely from `state==='running'`.

Read-only debug counters may expose context creations/state, active/scheduled source count, run generation and bounded cue counts/status. No raw saves, device identity, mutation global, URL save-corruption switch or new telemetry.

## 4. Verification and return

Preserve all92 baseline tests and add focused fake-backend/policy tests for exactly-once grade cues, band crossings/cooldown, stale run/duplicate suppression, one coalesced Results reward, no abandon/load reward, source cap and cleanup, settings0/mute and pending/rejected/missing backend. Cover late resume/end callbacks after mute/pause/reset and no growth after50 audio resets. Same-seed game outcomes/progress must match enabled/muted/unavailable sound; audio cannot consume engine RNG or change commands/timing.

OfflineAudioContext verification using the same synthesis routines: render each authorized cue and a worst-case overlap at volume1, measure nonempty finite samples, duration/tail, peak below clipping (target≤0.707), and no leftover tail after cancellation boundary where testable. Export one short **non-autoplay audition WAV/reel** with silence between named cue families, plus a text timing index and actual settings. Evidence export is allowed by the user's local-effects authorization; it is not a runtime asset. No spoken labels/music/extra cues. If offline audio is unavailable, report that evidence gap; don't substitute a claim of listening from node counters.

Available-browser checks on final served build:
- fresh load/muted reload create/play no audio before eligible trusted interaction; enabled gesture starts/resumes at most one context; denied/pending backend never delays Start/Drop/results;
- ordinary/perfect/warning/failure/Skip/Results policy, strict record+unlock coalescing, no saved-unlock/abandon reward, no stale effect after Pause/Home/Replay;
- mute during tumble stops active/scheduled voices; slider0/volume and preferences persist on reload; pause/settings/focus and temporary save behavior remain correct;
-50 audio restarts reuse one context/listeners and settle to zero retained sources/pending cues; existing non-audio counters/lock ownership unchanged;
- Settings at320×568,390×844,844×390,1280×720 (normal/high contrast), keyboard labels/slider/Close reachable, no horizontal overflow, muted text equivalents unchanged;
- readiness regression: first polite Ready after9 ticks, once per run/Replay and no later-cat repetition; tutorial close no-drop; Assist says Left/Right; context reset cancels queued old Ready;
- raw/gzip6 startup/budget and loopback resources; no audio network requests. Do not rerun the full engine/performance audit unless new code warrants it.

Run tests/typecheck and build after final edits, leave normal preview detached4177 and clear only your disposable profiles. Write `app/M4D-EVIDENCE.md`, focused raw logs/screenshots/measurement JSON and audition WAV under `evidence/m4d/`: actual commands/exits/counts, source/build hashes, lifecycle/cue counts, OfflineAudio measurements, Settings rectangles/contrast, exact synthesis recipe and all writes. Mark real speakers/listening, physical-device autoplay/audio latency, Firefox/Safari and named-screen-reader speech as untested where unavailable. A running AudioContext is not evidence that a person heard it.

Return to Architect and stop for source/measurement review before independent Playtester/listening validation. No provider calls/keys/new charges, music/voices/optional cues, paid hosting, public release, commit/push, migration, Compose/container or unrelated-service work.

## Delegation record

CT-DEV-005 delegated to Developer in OpenBot message `cc557a29-1522-4dee-8edb-27387639fc9d`, expectsReply true, after readiness acceptance. OG informed in `dc80137a-7c23-4c17-9773-f111d453a425`. Awaiting implementation/evidence; this specification is not an audio test/listening result.
