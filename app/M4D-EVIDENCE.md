# M4D quiet local effects — implementation evidence

Date: 2026-11-16 UTC. Scope: CT-DEV-005. Status: **local implementation and measurement complete; Architect/source review pending; not a release or listening claim**.

## Build, commands and identity

| Item | Value |
|---|---|
| Final build | `main-CKiC47vh.js` SHA-256 `9991c2c18d9fd68f6450bca859bf999a0d00629f3ebda55e2d17afd96d32ca96` |
| Index | `428d5d6731b1953adb279c4ff91f686c2a384dad91ec92e1827c39eab95fa118` |
| CSS | `ff6b29b6c4181a52fae9a3a0924869da6607b8116455bee7e4cddf7b87ea7972` |
| Dist | 138,798 bytes, 20 files |
| Baseline | 92 tests; main-CWm7_RHt.js `9684c460…` |
| Final tests | **104/104 pass**, 0 fail |
| Audio audit server | `127.0.0.1:4182`, HTTP 200 while open, stopped; 4182 now refuses |
| Preview | `http://127.0.0.1:4177/` HTTP 200, detached; profile cleared |

Commands:

```text
npx tsc -p tsconfig.json --noEmit              exit 0
npm test                                        exit 0 — 104/104 pass, 0 fail
npm run build                                   exit 0
npm run build:test                              exit 0
M4_EVIDENCE_DIR=m4d node .test-build/scripts/audit-transfer.js  exit 0
audio audit page on 127.0.0.1:4182              HTTP 200, rendered and written
curl http://127.0.0.1:4177/                     HTTP 200
```

## Architecture

- `src/app/audio-policy.ts` — pure policy: run high-watermark, grade dedup, safety-band crossings, 1 s warning cooldown, failure dedup/priority and strict Results reward condition. It never imports Web Audio, DOM, simulation or RNG.
- `src/platform/audio-synthesis.ts` — deterministic oscillator/filtered-noise recipes, short attack/release envelopes, source-count metadata, cancellable `ScheduledCue`, OfflineAudioContext render helper and small 16-bit WAV encoder. Noise uses a fixed local xorshift buffer, never simulation RNG.
- `src/platform/audio.ts` — injectable `AudioBackend` seam, native `WebAudioBackend` and synchronous `AudioService`. No context is created until `unlockFromGesture`; context creation, resume, suspend and playback promises are never awaited by gameplay. The service generation-guards cleanup and caps active/scheduled sources at 6.
- `src/main.ts` — Settings preference wiring, trusted-gesture unlock calls, event hooks and read-only `__catTowerDebug.audio()` counters.
- No runtime audio files, network requests, AudioWorklet, music, vocals, provider or dependency added.

## Settings and lifecycle

Sound effects checkbox and 0–100% volume slider are near the top of Settings, using existing `ProfileService.updateSettings` and defaults (`soundEnabled:true`, `volume:0.6`). Slider input immediately updates master gain and percentage; committed change persists once. Mute/volume 0 cancels current/future groups; increasing volume enables future cues only. No preview button or UI tick. Unavailable/pending audio shows Settings status without resetting preference.

Real browser lifecycle (Chrome 156, owner profile, capture mode):

| Check | Observation |
|---|---|
| Fresh load | `audio.state=idle`, `contextCount=0`, no cues; no AudioContext before gesture |
| Trusted Start | one context, `running`, `runGeneration=1`, game remains responsive |
| Ordinary landing | score 10; `cuesPlayed={"land.ordinary":1}`; 2 active sources then 0 |
| Perfect landing | score 15; `land.perfect:1`; no ordinary duplicate |
| Dangerous landing | safety 0.027; `land.ordinary:2`, `land.perfect:1`, `warning.danger:1`; 4 sources at landing then 0 |
| Failure + Results | score 25; `fail.miss:1`, one coalesced `reward:1`, 0 active after Results; Replay focused |
| Mute/volume | volume 0.3 persisted; sound off persisted; `enabled=false`; status hidden while muted |
| Muted reload | contextCount 0, idle, sound unchecked, volume 30%; Start creates no context |
| Unmute then fresh Resume | no context until Resume; then one running context, canvas focused |
| 50 audio restarts | contextCount stays 1; activeSources 0; scheduledGroups 0; runGeneration 51 |
| Readiness regression | no Ready before 9 ticks; one at AIMING; no later repeat; Replay one new |
| Resources | 16 loopback entries, 0 audio requests; main/scene/CSS/art only |

A running AudioContext is **not** evidence that a person heard anything. Actual speakers, perceived pleasantness, physical-device autoplay, output latency and browser/device variations remain untested.

## Cue policy and synthesis recipe

| Cue | Trigger | Recipe (local synthesis) | Duration / sources |
|---|---|---|---|
| `land.ordinary` | ordinary placement | sine 95→72 Hz gain .085 + low-pass noise 340 Hz gain .028 | 140 ms / 2 |
| `land.perfect` | perfect placement, replaces ordinary | sine 660 Hz gain .045 + 880 Hz at +65 ms gain .042 | 240 ms / 2 |
| `warning.caution` | stable landing enters caution, 1 s cooldown | noise 620 Hz gain .024 + sine 220→160 Hz gain .018 | 170 ms / 2 |
| `warning.danger` | stable landing enters danger, 1 s cooldown | noise 520 Hz gain .034 + sine 155→98 Hz gain .026 | 220 ms / 2 |
| `fail.miss` | roundFailed MISS_TOP | sine 420→150 Hz gain .038 + noise 700 Hz gain .024 | 240 ms / 2 |
| `fail.tumble` | roundFailed UNSTABLE_TOWER | three low sines 82→64, 70→56, 60→48 Hz + low noise 260 Hz, gains .032/.030/.028/.030 | 600 ms / 4 |
| `reward` | actual Results with strict best or run unlock; coalesced | sines 523, 659, 784 Hz at 0/+70/+140 ms, gains .035/.033/.031 | 320 ms / 3 |

Priority failure > reward > landing/perfect > warning. Warning is scheduled 120 ms after a landing so it never replaces the landing attack; it is canceled by failure/pause/reset. Perfect replaces ordinary. Results cancels a lingering failure before its one reward. No in-run unlock cue, no chain melody, no extra layers.

## Offline measurements and audition

`evidence/m4d/audio-offline.json` (OfflineAudioContext, 44.1 kHz, volume 1.0; renderer CPU/device not involved):

| Cue | Duration | Peak | RMS | Nonzero samples | Tail peak | Sources |
|---|---:|---:|---:|---:|---:|---:|
| land.ordinary | 140 ms | 0.0877 | 0.0357 | 5,732 | 0 | 2 |
| land.perfect | 240 ms | 0.0866 | 0.0235 | 9,922 | 0 | 2 |
| warning.caution | 170 ms | 0.0231 | 0.0084 | 7,055 | 0 | 2 |
| warning.danger | 220 ms | 0.0355 | 0.0132 | 9,260 | 0 | 2 |
| fail.miss | 240 ms | 0.0435 | 0.0191 | 9,701 | 0 | 2 |
| fail.tumble | 600 ms | 0.0457 | 0.0158 | 24,696 | 0 | 4 |
| reward | 320 ms | 0.0660 | 0.0199 | 14,111 | 0 | 3 |

- Six-source worst-case offline overlap: peak **0.263**, finite, below the 0.707 target.
- All buffers nonempty, finite and below clipping at volume 1.0; tail peak 0 after each cue duration.
- Audition artefact: `evidence/m4d/audition-reel.wav` (429,580 bytes, 4.87 s, mono 16-bit 44.1 kHz), non-autoplay evidence only, 300 ms silence between cue families, rendered at 0.6 user volume. Index: `evidence/m4d/audition-index.txt`. No spoken labels, music, voices, runtime fetch or asset.
- These are offline synthesis measurements, not listening/pleasantness/device claims.

## Settings rectangles, focus and contrast

Measured with the Sound controls present, zero initial page scroll. Dialog internals may scroll; close is reachable after scrolling at 320 and 844.

| Viewport | Dialog (t–b) | Sound checkbox | Volume slider | Close | Close after scroll |
|---|---:|---:|---:|---:|---:|
| 320×568 | 12–556 (client 544 / scroll 728) | 93.5–106.5 | 132–176 (44 high) | 666.8–713.8 (off) | 482.8–529.8 at scroll 184 |
| 390×844 | 99.9–744.1 (client 644 / scroll 644) | 181.4–194.4 | 219.9–263.9 (44) | 671.1–718.1 | fits |
| 844×390 | 12–378 (client 366 / scroll 623) | 93.5–106.5 | 132–176 (44) | 562.4–609.4 (off) | 305.4–352.4 at scroll 257 |
| 1280×720 | 48.3–671.7 (client 623 / scroll 623) | 129.8–142.8 | 168.3–212.3 (44) | 598.7–645.7 | fits |

`scrollWidth===clientWidth` at every viewport; no horizontal overflow. Focus order: Settings title → Sound effects → Volume; Shift+Tab from Sound wraps to Close; Escape closes and restores `home-settings-button`. Normal contrast for the Sound label, Volume label and percentage is **12.65:1**; high contrast **18.88:1**. Screenshots: `settings-sound-390x844.png`, `settings-sound-high-contrast-390x844.png`.

## Transfer and network

Startup set from `dist/index.html`, per-file zlib gzip6:

| File | Raw | gzip6 | gzip9 |
|---|---:|---:|---:|
| `assets/main-CKiC47vh.js` | 71,788 | 21,903 | 21,865 |
| `assets/scene-Bs4cEGk0.js` | 15,271 | 5,298 | 5,289 |
| `assets/scene-BGX-YaP0.css` | 18,876 | 4,793 | 4,787 |
| **Startup** | **105,935** | **31,994** | **31,941** |
| `index.html` | 11,736 | 2,989 | 2,977 |
| mapped runtime art (13 files) | 13,879 | 6,068 | — |
| optional diagnostics | 3,747 | 1,900 | 1,900 |
| **Cold load** | **131,550** | **41,051** | — |

Startup gzip6 31,994 ≤200,000 PASS; first-load raw 131,550 ≤2,000,000 PASS; dist 138,798 bytes. Actual GET responses with `Accept-Encoding: gzip` are compressed (index 2,989; main 21,903; scene 5,298; CSS 4,793); HEAD omits `Content-Encoding`, so the per-file gzip6 arithmetic is the transfer estimate, not a HEAD-inferred absence. Browser resource list: 16 loopback entries, no external requests and no audio-file requests. `network.json` is cache-warm and not used as cold bytes.

## Not run / limits

- Actual speakers/listening/pleasantness; the WAV is an artefact, not an audition result.
- Physical-device autoplay, audio output latency, iOS/Android policies and real frame timing.
- Named screen-reader speech; live-region/readiness checks are DOM evidence only.
- Firefox/Safari Web Audio/Web Locks/storage.
- Real zoom/safe-area and the previously tracked orphan-lock lifecycle.
- No listening-based tuning, music, voices, providers, paid services, public release, commit/push, migration, container or unrelated-service work.
- No schema, lock, physics, balance, score, skin geometry or existing profile transaction behavior changed.

## Writes

Production source/UI:

- `app/src/app/audio-policy.ts` (new)
- `app/src/platform/audio-synthesis.ts` (new)
- `app/src/platform/audio.ts` (new)
- `app/src/main.ts`
- `app/index.html`
- `app/src/styles.css`
- `app/tests/audio.test.ts` (new)
- rebuilt `app/dist/` (authorized)

Audit/evidence:

- `app/scripts/audio-audit/index.html`
- `app/scripts/audio-audit/audit.ts`
- `app/scripts/audio-audit/vite.config.ts`
- `app/scripts/audit-transfer.ts` (env-selectable evidence directory; audit-only)
- `app/M4D-EVIDENCE.md`
- `evidence/m4d/audio-offline.json`, `audition-index.txt`, `audition-reel.wav`
- `evidence/m4d/browser-lifecycle.json`, `settings.json`, `network.json`, `http-encoding.json`
- `evidence/m4d/transfer.json`, `transfer.csv`
- `evidence/m4d/settings-sound-390x844.png`, `settings-sound-high-contrast-390x844.png`
- `evidence/m4d/audio-audit-server.log`

Ignored `.test-build/` was regenerated. Final served main hash matches dist; preview remains detached at 4177; audio audit server 4182 is stopped. Test profile cleared.

## CT-DEV-005R — native audio reliability correction

Correction status: **local implementation and verification complete; Architect review pending**. This section is the CT-DEV-005R record. The CT-DEV-005 measurements above and `evidence/m4d/` are preserved unchanged; correction evidence lives in `evidence/m4d-correction/`. No cue recipe, level, timing target, gameplay, profile/schema, lock, art or readiness behavior changed.

### Corrections

- **A. One resume owner per context.** `WebAudioBackend` keeps a single resume token while a native promise is unresolved. Cancellation and suspension bump a desired-output intent generation but no longer pretend the request settled; only the exact token may clear itself, and a late completion cannot restore running status or output after cancel/suspend. A rejected or settled request permits exactly one retry from a later trusted activation. Suspension completions are generation-guarded and rejections contained.
- **B. Full cue graph ownership.** `scheduleCue` tracks every source, envelope gain and filter as it is created. Natural completion, cancellation and repeated cancellation disarm end handlers, stop sources and disconnect the complete owned graph idempotently; a disconnect throw is contained per node. Any creation/connect/start failure tears down everything already created before rethrowing, so `play` returns false with no started or untracked source and no group registration.
- **C. Truthful fallback.** Context creation plus master gain/connection is transactional; a failed master closes the context and reports `unavailable` instead of idle/running without output. Sync throws and promise rejections from resume/suspend/close are contained. `resetSession`/`pause`/`dispose` cannot break Home, a new run or fatal recovery. Pending activation remains distinct from unavailable: Settings shows “Sound may need a tap to start.” (previously “Sound will start after a tap.”).
- **D. Event validity and activation.** `AudioPolicy.results` now returns `{ accepted, cue }`; stale or duplicate Results is a true no-op that does not cancel a newer/active cue, while the first valid Results (reward or not) still cancels a lingering failure cue. `AudioService.unlockFromGesture`/`resumeFromGesture` require a trusted flag. `main.ts` passes `event.isTrusted` only from Start, Replay, confirmed Restart, tutorial completion, Resume and Drop (pointer/keyboard/drop button); synthetic events and capture advance still drive gameplay but cannot create or resume a context.

### Commands and build identity

| Item | Value |
|---|---|
| `npm test` | exit 0 — **127/127 pass**, 0 fail (104 baseline + 23 new native/service tests) |
| `npm run build` | exit 0 |
| `npm run build:test` | exit 0 |
| Final main | `main-qg9b1QR2.js` SHA-256 `fae724a8e8a3f26a50c19721354829135437b9aad39f74effbc271336fc0e546` |
| Index | `b2e206aaec794b841d294616c4af801b90e01f34da1b0d058252d07c2ae18006` |
| Scene JS | `d3da2a5d2be172c523b5d2ba4aad0ca7309112ab099513d795d6c6b7ea32570d` |
| CSS | unchanged `ff6b29b6c4181a52fae9a3a0924869da6607b8116455bee7e4cddf7b87ea7972` |
| Dist | 140,438 bytes, 20 files |
| Preview | `http://127.0.0.1:4177/` HTTP 200; served index/main/CSS hashes match dist |
| Audit server | 4182 written then stopped; 4182 now refuses |

Commands and exit codes: `evidence/m4d-correction/commands.txt`.

### Native boundary results

`node ../evidence/m4d-correction/native-backend-review.mjs` against the corrected compiled modules with instrumented native-context stubs. These are deterministic boundary checks, not browser heap, device or audible-output evidence.

| Check | Corrected result |
|---|---|
| 50 cancel/unlock cycles, resume permanently unresolved | 1 context, **1** resume call, status `pending` |
| Old completion after cancel/suspend | 1 call before and after; status stays `pending`; a later unlock sees running and sets `running` without another request |
| Rejected resume then fresh gesture | rejection leaves `pending`; exactly one retry; resolves `running` |
| Natural ordinary completion | 1 callback, **5/5 nodes disconnected**, 0 retained end handlers |
| Partial schedule failure | accepted false; 1 started/1 disconnected/0 uncancelled; later playback succeeds |
| Failed createGain | `unavailable`, failed context closed, retry creates a second context, `running`, playback accepted |
| Sync suspend throw in `resetSession` | does not throw; status `pending` |
| Stale / duplicate Results | active sources 2 → 2 after stale; valid reward 3 with one reward; duplicate leaves 3 |
| Untrusted then trusted activation | contextCount 0/idle then 1/running |

Individual native/service tests cover natural end, cancel-before-end, repeated cancel, captured late callbacks, cleanup throws, oscillator failure after a source started, factory/gain/connect throws, sync resume throw, suspend throw/rejection, close throw/rejection, closed context, throwing status listener and truthful source accounting. Raw output: `evidence/m4d-correction/native-backend-review.json`; harness: `native-backend-review.mjs`.

### Real-browser correction checks

Chrome 156, private browser, 375×844 DPR1, loopback preview, capture mode for deterministic ticks; activation routes used CDP input (observed `event.isTrusted === true` on Drop). Full data: `evidence/m4d-correction/browser-correction.json`.

| Check | Observation |
|---|---|
| Fresh load | contextCount 0, idle |
| Synthetic Start/tutorial/Drop and synthetic Space | contextCount 0, idle; cuesDropped 1; 89 ticks on the click/drop path and 52 on the key path created no context |
| Trusted Start, tutorial completion, Drop, Space | one context, running; Drop grade cue played |
| Readiness | none before nine ticks; one at first AIMING; no repeat on later ticks/next cat; Replay added one |
| Cues | perfect 2, ordinary 4, caution 1, danger 1, tumble 2, reward 2 (one per valid Results); one grade cue per landing; activeSources 0 after Results |
| Mute/volume | pending text shown while enabled; mute hidden status; 0% then 30%; a landing at 0% played no cue; preference persisted |
| Muted reload | contextCount 0, idle, sound unchecked, volume 30%; muted Start made no context |
| Pause → Settings → unmute → Resume | one running context, focus `game-canvas` |
| 50 real resets | contextCount 1, activeSources 0, scheduledGroups 0, runGeneration 51, restarts 51 |
| Network | 16 loopback resources, 0 external, 0 audio files |

### Offline audio, cancellation and transfer

- All seven cue measurements are byte-for-byte identical to `evidence/m4d/audio-offline.json` after removing the new `cancellation` field; the audition reel SHA-256 is unchanged (`ee7466f558f021b30fac0183d986da2fd076a8dcd0bc760be70f99c5915d3765`).
- Corrected-graph cancellation boundary: schedule `fail.tumble`, call cancel twice before rendering → peak **0**, finite, callback **1**, 4 sources.
- Startup 107,575 raw / **32,377 gzip6** / 32,322 gzip9; cold load 133,190 raw / 41,435 gzip6; dist 140,438 B. Gates pass (≤200 KB gzip6 startup; ≤2 MB first-load raw).
- GET with `Accept-Encoding: gzip` returns `Content-Encoding: gzip`; HEAD omits it, so per-file gzip arithmetic remains the transfer estimate.
- Data: `evidence/m4d-correction/audio-offline.json`, `audition-reel.wav`, `audition-index.txt`, `transfer.json`, `transfer.csv`.

### Remaining gaps

Actual listening/pleasantness, physical-device autoplay and latency, iOS/Android, Firefox/Safari Web Audio, named screen-reader speech, real zoom/safe-area and the orphan-lock lifecycle remain untested. No music, voices, providers, paid services, release, commit/push, migration, container or unrelated-service work. No gameplay, profile schema/transaction, art or lock change.

### CT-DEV-005R writes

Production source:

- `app/src/platform/audio.ts`
- `app/src/platform/audio-synthesis.ts`
- `app/src/app/audio-policy.ts`
- `app/src/main.ts`
- `app/tests/audio.test.ts`
- `app/tests/audio-native.test.ts` (new)
- rebuilt `app/dist/` (authorized)

Audit/evidence:

- `app/scripts/audio-audit/audit.ts`
- `app/scripts/audio-audit/vite.config.ts` (evidence-directory env override)
- `app/M4D-EVIDENCE.md`
- `evidence/m4d-correction/` — `native-backend-review.mjs`, `native-backend-review.json`, `browser-correction.json`, `audio-offline.json`, `audition-reel.wav`, `audition-index.txt`, `transfer.json`, `transfer.csv`, `audio-audit-server.log`, `commands.txt`
- ignored `.test-build/` regenerated; preview 4177 detached; audit server 4182 stopped; disposable loopback test storage cleared

## CT-DEV-005R2 — final close/source/output correction

Correction2 status: **local implementation and verification complete; Architect review pending**. The CT-DEV-005 and CT-DEV-005R sections above and `evidence/m4d/` / `evidence/m4d-correction/` are preserved. Correction2 evidence is in `evidence/m4d-correction2/`. No recipe, level, timing, cue scope, gameplay, profile/schema, lock, art or readiness behavior changed.

### Corrections

1. **Failed-context closure ownership.** A failed context is retained in a `closing` token until its `close()` promise confirms `state === 'closed'`. Pending, rejected, throwing or resolve-without-close outcomes keep audio `unavailable` and block factory calls; gameplay stays silent and responsive. Only confirmed closure lets a later trusted activation create one replacement. Disposal clears the token and ignores late completion. Master disconnect/silence is part of setup rollback.
2. **Source registration at creation.** Oscillator and filtered-noise sources enter the stop/handler list immediately after `createBufferSource`/`createOscillator`, before configuration, connection, start or scheduled stop. A stop throw after start is retried during cleanup; automation/connect/start failures stop and disconnect every created source, disarm handlers and preserve one completion path. Synthesis timings, source caps and priorities are unchanged.
3. **Unrecoverable master output write.** A master `gain.setValueAtTime` throw now silences, cancels and reports `unavailable`; `play` rejects and `unlock` cannot overwrite that with `running`. Ordinary volume application cannot erase the failure. Recovery retires the failed context under the closure rule, then creates a fresh output path after confirmed closure. This is setup-failure reporting, not device audibility detection.

### Commands and build identity

| Item | Value |
|---|---|
| `npm test` | exit 0 — **137/137 pass**, 0 fail (104 baseline + 23 R + 10 R2 tests) |
| `npm run build` | exit 0 |
| `npm run build:test` | exit 0 |
| Final main | `main-5_s3JvDQ.js` SHA-256 `5b7daa5678b1bf5fef1592c775eb895103103986a8de122da3a965aff2053207` |
| Index | `cb0af336e321627c86dbb719132fef85b96b51727d594b033b180b38a2fdb8b2` |
| Scene JS | unchanged `d3da2a5d2be172c523b5d2ba4aad0ca7309112ab099513d795d6c6b7ea32570d` |
| CSS | unchanged `ff6b29b6c4181a52fae9a3a0924869da6607b8116455bee7e4cddf7b87ea7972` |
| Dist | 141,878 bytes, 20 files |
| Preview | `http://127.0.0.1:4177/` HTTP 200; served index/main/CSS hashes match dist |
| Audit server | 4182 written then stopped; 4182 now refuses |

Commands and exits: `evidence/m4d-correction2/commands.txt`.

### Native boundary results

Architect reproducer rerun unchanged (`correction-review-rerun.json`):

| Check | R2 result |
|---|---|
| 50 gain-failed unlocks with unresolved close | **1** factory call, **1** close request, 1 still unclosed, `unavailable` |
| Stop-after-start throw | stopCalls **2**, stopped true, disconnected true, handlers disarmed |
| Master-only gain write throw | status `unavailable`, master gain 0, acceptedCue **false** |

Close/setup ownership (`close-ownership.json`):

| Check | Result |
|---|---|
| Pending close, 50 attempts | 1 factory, 1 close, 1 unclosed, unavailable; after confirmed close → 2 contexts, 0 unclosed, running, playback true |
| Rejected / throwing / resolve-without-close | 1 factory call, 1 context and 1 unclosed each; status unavailable in all three |
| Master write failure | unavailable, master gain 0, cue rejected, 1 unclosed; after confirmed close → 2 contexts, 0 unclosed, running, playback accepted |
| Connect failure rollback | master disconnected true, 1 close request, unavailable |
| Stop-after-start | 2 stop calls, stopped true, disconnected true |

Adapted original reproducer (`native-backend-review-adapted.json`) keeps the accepted R results: 1 resume per 50 cancel/unlock cycles, natural end 5/5 disconnected, partial failure 1 started/1 disconnected/0 uncancelled, reset throw contained, stale Results active sources 2 → 2. Its setup-failure retry now correctly remains `unavailable` while the failed context's close is unconfirmed.

New native/service tests cover pending/fulfilled/rejected/throwing close, resolve-without-close, disposal during pending close, repeated eligible attempts, master-only write failure, service accounting after output failure, stop-after-start for oscillator and noise, and automation/connect/start rollback. Previous retry tests now settle the first close before expecting replacement.

### Real-browser R2 checks

Chrome 156, private browser, 375×844 DPR1, loopback, capture mode; trusted CDP input. Data: `evidence/m4d-correction2/browser-r2.json`.

| Check | Observation |
|---|---|
| Fresh load | contextCount 0, idle |
| Trusted Start + tutorial completion | contextCount 1, running |
| Trusted Drop | one `land.perfect`, score 15, active sources 0 |
| Mute → Pause → Home | contextCount 1, pending, mute status hidden |
| Unmute on Home → trusted Start | contextCount 1, running |
| Pause → Resume | contextCount 1, running, focus `game-canvas` |
| 50 real Pause/Restart/Confirm resets | contextCount 1, activeSources 0, scheduledGroups 0, runGeneration 53, restarts 52 |
| Network | 16 loopback resources, 0 external, 0 audio files |

Stale Results has no UI route; it is covered by the adapted native reproducer (2 → 2 active sources) and service tests.

### Offline, recipe identity and transfer

- All seven cue measurements and the cancellation boundary are identical to `evidence/m4d/audio-offline.json` and `evidence/m4d-correction/` (after excluding the `cancellation` field added by the audit): cancellation peak 0, finite, one callback, 4 sources.
- Audition reel SHA-256 unchanged: `ee7466f558f021b30fac0183d986da2fd076a8dcd0bc760be70f99c5915d3765`.
- Startup 109,015 raw / **32,657 gzip6** / 32,594 gzip9; cold load 134,630 raw / 41,716 gzip6; dist 141,878 B. Gates pass.
- GET with `Accept-Encoding: gzip` returns `Content-Encoding: gzip`; HEAD omits it, so per-file gzip arithmetic remains the transfer estimate.
- Data: `evidence/m4d-correction2/{audio-offline.json,audition-reel.wav,audition-index.txt,transfer.json,transfer.csv}`.

### Remaining gaps

Actual listening/pleasantness, physical-device autoplay/latency, iOS/Android, Firefox/Safari Web Audio, named screen-reader speech, real zoom/safe-area and the orphan-lock lifecycle remain untested. No music, voices, providers, paid services, release, commit/push, migration, container or unrelated-service work. No gameplay, profile schema/transaction, art or lock change.

### CT-DEV-005R2 writes

Production source:

- `app/src/platform/audio.ts`
- `app/src/platform/audio-synthesis.ts`
- `app/tests/audio-native.test.ts`
- rebuilt `app/dist/` (authorized)

Audit/evidence:

- `app/M4D-EVIDENCE.md`
- `evidence/m4d-correction2/` — `correction-review-rerun.{mjs,json}`, `native-backend-review-adapted.{mjs,json}`, `close-ownership.{mjs,json}`, `browser-r2.json`, `audio-offline.json`, `audition-reel.wav`, `audition-index.txt`, `transfer.json`, `transfer.csv`, `audio-audit-server.log`, `commands.txt`
- ignored `.test-build/` regenerated; preview 4177 detached; audit server 4182 stopped; disposable loopback storage cleared
