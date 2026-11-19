# M3 — durable MVP shell (CT-DEV-003)

Architect, 2026-11-16. Active root `repository root`. **M2 is closed.** Architect accepted CT-DEV-002L in [16](16-m2-layout-acceptance.md), and independent CT-TEST-002 passed every item ([report](../evidence/ct-test-002/CT-TEST-002-report.md)). This document specifies M3 under the existing local-browser authorization. Gates are AC10–13 and the settings part of AC15 from [06](06-acceptance.md).

Base build: main-DBY5zVeB.js `1fad142c…`, 67 tests. Preserve every existing test, the art-integrity check, the M2 layout measurements at the four standard viewports, and the separation between capture mode and normal lifecycle.

## Scope

In scope:
- Versioned local profile with lock ownership and degraded modes
- Records, totals and derived unlocks
- Collection and skin selection
- Settings: motion, high contrast and preferred mode
- First-run tutorial and How to play
- Results record and unlock presentation
- Copy changes that replace the "progress is not saved" notices

Out of scope:
- Audio engine and audible sound. M4 owns audio, and the user has not yet chosen the audio direction.
- Sound and volume controls. These fields stay in the schema with their defaults but are not shown, because a toggle that does nothing is misleading.
- New art or restyling, physics, balance or score changes
- Backend, accounts or network saving
- Reset-all and leaderboards
- Release, paid calls, migration, restart, and new frameworks or dependencies (the Web platform only)

The authoritative rules are [04 LLD](04-lld.md) "Profile schema and save transactions", [02](02-gameplay-rules.md) progression and state table, and [05](05-ux-assets.md) screens and reaction matrix. The resolved decisions below take precedence where they differ.

## 1. Profile model and service

- **Key and schema:** key `cat-tower.profile.v1`, using the `ProfileV1` shape in 04 exactly, with defaults from 04. Record namespaces are `classic@1` and `assist@1`. Unlocks are derived only from `totalPlacements`: ginger at 25, tuxedo at 75, calico at 150 (inclusive). A locked or unknown `selectedSkin` normalizes to `default` in memory. A normalization alone does not trigger a write.
- **Code layout:** add `src/platform/storage.ts` with an injectable `StorageAdapter {read(): string|null; write(s): void}` that wraps localStorage and lets exceptions surface. Add `src/platform/profile.ts` with a pure `validateProfile(raw: string|null): {kind:'empty'|'ok'|'invalid'|'future'|'oversized', profile?, reason?}` and a `ProfileService`. Domain code imports neither.
- **Validation:**
  - Raw input over 64 KB (65,536 UTF-16 code units, checked before `JSON.parse`) is `oversized`.
  - Malformed JSON, a non-object root, a wrong type, a negative, non-integer or unsafe counter, or a bad enum is `invalid`.
  - `schemaVersion` above 1 is `future`.
  - Unknown extra keys are ignored on read and dropped on the next owner write, but only for a valid v1 document.
  - Missing known settings take their defaults.
  - Volume is clamped to [0,1] only when it is finite; NaN or a string is `invalid`.
  - Records must be an object of objects with known namespace keys of the form `<mode>@<int>`, so historical namespaces survive. Unknown mode names are `invalid`.
  - No string from the profile is ever inserted as HTML.
- **Transactions:** the only mutators are `startRun(runId, mode)`, `commitPlacement(runId, event)`, `updateSettings(partial)` and `selectSkin(id)`. Each one updates memory, publishes once, increments the revision, and makes exactly one whole-document `setItem` when this tab owns the save.
- **Ordinals:** `commitPlacement` accepts only the current runId with `ordinal === lastApplied.placementOrdinal + 1`. Duplicates and older ordinals are no-ops. A gap logs a development diagnostic and makes no change.
- **Landing commit:** add 1 to `totalPlacements` and, if the grade is perfect, 1 to `totalPerfect`. Update `bestHeight = max(ordinal)` and `bestScore = max(totalScore)` in `${event.mode}@${event.balanceVersion}`. Return the IDs that were newly unlocked.
- **When transactions fire:** `startRun` runs only after `session.start` succeeds. Results, collapse and Skip write nothing.
- **Write failure:** a `setItem` exception switches the page to `temporary-write-failed` for the rest of the session. In-memory progress is kept, and a polite notice reads “Progress is saved only for this session.” Nothing is retried. An invalid, future or oversized stored string is never overwritten, including by settings changes.

## 2. Ownership and save modes

Expose one `saveMode` value:

| saveMode | Cause | Persists | Visible notice (Home, Results, game notice line) |
|---|---|---|---|
| `owner` | Lock acquired, valid or empty profile | yes | none (remove the M2 “Prototype/Temporary” notices) |
| `other-tab` | `navigator.locks.request('cat-tower.profile.v1', {ifAvailable:true})` returned null | no | “This profile is open in another tab.” plus **Retry save access** and **Play temporarily** buttons on Home |
| `temporary-unsupported` | No Web Locks, or localStorage access throws on read | no | “Temporary session — progress will not be saved.” |
| `temporary-unreadable` | invalid, future or oversized stored data | no | “Saved progress could not be read, so this session is temporary. Your saved data was left unchanged.” |
| `temporary-write-failed` | setItem threw | no | “Progress is saved only for this session.” |

- **Lock lifetime:** the lock callback returns a promise that never settles while the page lives, which releases the lock when the page closes. Never steal the lock, never use `steal:true`, and never fake a lock with a timestamp.
- **Startup order:** decide the lock, read once, validate, choose the mode, then publish. An owner persists the default profile only when storage was empty.
- **Second tab:** a `other-tab` page reads the stored profile so the user can see their bests, but cannot write it. Choosing **Play temporarily** dismisses the prompt and plays in memory only.
- **Retry:** **Retry save access** is available only on Home with no live run. It tries the lock again. On success, if any temporary progress or settings change exists, it first confirms “Saving will reload your saved progress. This session's temporary progress won't be added. Continue?” Then it re-reads storage. On failure it says “Still open in another tab.”
- **Copy:** confirmation copy becomes “Keep your earned progress and start a new round?” / “Keep your earned progress and return home?”, with titles “Start a new round?” / “Return home?”, in every mode.
- **Diagnostics:** `window.__catTowerDebug.profile()` returns `{saveMode, revision, stats, records, selectedSkin, unlocked}` with no raw storage dump. Test hooks may inject storage and lock adapters only through a test-only module seam. Do not add any URL switch that writes or corrupts real storage.

## 3. Screens and controls

- **Home** keeps the M2 layout budget. It adds, in DOM order after the mode selector:
  - a compact row: selected-cat preview (an 80 px static render or placeholder) with its name, “Best (Classic): score N · height N” for the currently selected mode (0 when none), and “Cats collected 2/4 · 37 stacked in total”;
  - buttons **Collection**, **How to play** and **Settings**, each ≥44 px.

  At 844×390, the mode cards and Start must still fit without scrolling. Secondary rows may scroll below Start at every size. The mode chosen on Home writes `preferredMode` and is restored on load.
- **Tutorial:** on Start while `tutorialSeen` is false, open a modal dialog over Home before the run begins. It has two steps:
  1. “Drop cats onto the top of your tower. Tap the playfield, press Space or Enter, or use Drop.”
  2. “Keep the tower's weight over each cat below. A wobble means danger.” In Assist, add: “Use Left/Right to position, then Drop.”

  It has **Next**, **Back**, **Skip** and **Start playing** buttons, a focus trap, and Escape acting as Skip. Closing it any way sets `tutorialSeen=true` and then starts the run. The key or pointer gesture that closes it must not drop the first cat: rely on the existing SPAWN_CUE gate and the held-key ownership guard, and add a regression test. **How to play** reopens the same content from Home without starting a run and does not change `tutorialSeen`.
- **Settings** is a modal reachable from Home and from Pause, where it sits between Resume and Restart. It contains:
  - **Motion:** System / Reduced / Full radio group. System follows `prefers-reduced-motion` live. Reduced and Full override it. This feeds the existing reduced-motion presentation path, and a change during a paused run applies from resume on. Engine timing and geometry are unchanged.
  - **High contrast:** a checkbox that sets `data-contrast="high"` on the root. It uses plain backgrounds, a ≥2 px boundary on controls and panels, and solid text colors. Measure and record the computed contrast ratios for body text, HUD values, buttons, notices and the safety band in both modes: at least 4.5:1 for normal text and 3:1 for large text and boundaries. Report any failures rather than asserting they pass.
  - **About Assist:** a short visible explanation of Assist mode (no setting).

  Closing Settings returns focus to its opener. Opening it from Pause keeps the round paused, and closing it returns to the Pause dialog.
- **Collection:** a modal or screen reachable from Home and Results, showing four cards: Default, Ginger, Tuxedo, Calico, each with its coat render and a placeholder fallback.
  - An unlocked card is a button with `aria-pressed` for the selected skin, a visible check plus text “Selected”, and a “Select” action.
  - A locked card is not a button. Its text reads “Locked — unlock at 75 cats stacked in total (37 so far)”, and lock is never shown by color alone.
  - Selecting a skin saves `selectedSkin`, which applies to the next run. Collection is not reachable during live play.
  - The tuxedo card uses the approved `tuxedo-legibility` mapping.
- **Normal play** uses the profile's `selectedSkin` for `session.start`. The skin-parity tests stay green.
- **Unlock toast:** a non-modal toast such as “Ginger cat unlocked”, about 3 s, queued one at a time, announced once in the polite live region. It must not take focus or block Drop or Pause, and it pauses its timer while the game is paused. A page load with several thresholds already passed shows no old toasts.
- **Results** additionally shows “Best score N · Best height N” for the run's mode and a “New best score” and/or “New best height” badge with text. Compare against the bests captured at `startRun`, and show a badge only when the run is strictly higher. It also shows a card for each skin unlocked during this run, adds **Collection** to the actions, and keeps Replay primary and focused. Results must still fit at the four standard viewports. If a fit with unlock cards is impossible at 320×568, the cards may scroll, but Replay must stay visible.
- **Live region:** add the unlock announcement and “Progress is saved only for this session” (announced once). Nothing else changes.

## 4. Verification required

Run typecheck, tests and build once at the end. Add focused tests only; no new test framework.

1. **Pure validation fixtures:** empty; valid default; valid with extra keys; missing settings; volume 1.7→1, −0.2→0, NaN invalid; negative, fractional or 2^53 counters invalid; bad enum; array root; `null` root; schemaVersion 2 future; 64 KB+1 oversized (rejected before parse); historical `classic@2` namespace preserved; unknown mode name invalid.
2. **Service with fake adapters:**
   - Start then commit ordinals 1..3: totals and revision are correct and there are exactly 4 writes.
   - A duplicate or older ordinal makes no write.
   - A gap makes no change.
   - A stale runId after a new start makes no write.
   - Perfect counting and records are separated by mode.
   - Crossing 25, 75 and 150 returns each ID once.
   - A load at 160 returns no newly unlocked IDs.
   - A write throw switches mode, keeps memory, and makes no retry.
   - Invalid stored data is never overwritten by settings, skin or start.
   - A locked selectedSkin normalizes to default without writing.
   - In other-tab mode, nothing is ever written.
3. **Browser checks with real localStorage, Chrome headless:**
   - Play to commit, refresh, and confirm the totals, records, skin and settings persist (AC10).
   - Two tabs on the same origin: the second shows other-tab, reads the bests, Play temporarily works without writing (storage string unchanged byte for byte), and closing the first tab lets Retry succeed with the reload confirmation (AC11).
   - Fault injection for unreadable storage, missing Web Locks and a throwing setItem: each shows the right notice, gameplay outcome is identical, and the game never blanks (AC12).
   - Tutorial close by Enter, Space, Escape and click never drops a cat.
   - A complete keyboard path through Home → tutorial → play → Pause → Settings → Collection → Results, with focus trap and restore (AC13 keyboard part).
   - The motion setting overrides the emulated OS preference both ways (AC15 part).
4. **Layout:** repeat the CT-DEV-002L rectangle checks at the four viewports for Home, AIMING (both modes), COLLAPSING, and Results with a new-record badge and one unlock card. Add the Settings, Collection and tutorial dialogs (their content may scroll inside the dialog, but close and primary buttons must be reachable). Check the high-contrast screenshots.
5. **Budget and network:** record dist size and JS+CSS gzip (≤200 KB). All requests must be loopback. 50-restart counters must be unchanged, plus the lock count (exactly 1 lock request per page).

Return:
- the build hash and changed paths
- the exact commands with exit codes and test counts
- the measured rectangles and contrast table
- screenshots under `evidence/m3/`
- the refreshed `app/M3-EVIDENCE.md`
- the not-run list: physical devices, named screen reader, Firefox/Safari (whose Web Locks and storage behavior matters here), real zoom, real frame timing

Report spec ambiguities to the Architect instead of redesigning. Stop after CT-DEV-003, because the Architect reviews before an independent playtest and M4.

## Decisions recorded

- **Sound controls deferred to M4 with audio:** the schema keeps the fields so M4 needs no migration.
- **Pause dialog gains Settings:** matches 05.
- **Tutorial gates the first Start rather than appearing on load:** matches 05 and avoids blocking returning users.
- **Unknown record mode names are invalid:** safer than silently keeping foreign data. The document is still preserved, never overwritten.
- **Temporary-unreadable never offers repair or reset:** reset-all is out of MVP. Recovery tooling, if ever needed, is a user product decision.

## Part 1 review (2026-11-16 03:3x UTC)

Developer result `3d6127dc-acdc-483f-a840-e944cc62bb1f`. The Architect reran `npm test`: 81 pass / 0 fail (the 67 earlier tests, including art-integrity, plus 14 profile tests). The served bundle main-BXbNMBTE.js has SHA256 `8ad6dfa88aea6cedc4d4f34a5fece2b359c71484212894b73394106d02806073` and matches dist. The Architect read the ProfileService and main.ts wiring and found them conformant:
- Size is checked before parse; unreadable data goes to temporary-unreadable and is never written.
- The Web Lock uses ifAvailable, never steals, and its callback promise never settles.
- The default profile is persisted only when storage is empty and this tab owns it.
- Duplicate or stale ordinals are no-ops; a gap is ignored with a debug log.
- A write failure switches the mode without retrying.
- startRun runs only after session.start succeeds.
- commitPlacement is driven by `placementCommitted`.
- Badges compare strictly against the bests captured at run start.
- selectedSkin is passed to session.start.
- Toasts are queued, with their timer paused while the game is paused.
- Confirmation copy is updated.

Decisions on Developer's questions and one correction:
1. **Play temporarily** must only dismiss the prompt, switch to temporary play and focus Start, as §2 says. It must not start a run, because the player may still want to change mode or cat. Change this.
2. **How to play** may show both tutorial steps in one view, with a Close button. It must not start a run or change tutorialSeen. Accepted.
3. **The profile row and links after Start** are accepted, consistent with §3 "secondary rows may scroll below Start".
4. **Correction:** `retrySaveAccess` must persist only when the stored value was empty. When it is a valid v1 document, adopt it without rewriting, consistent with §2 "persists the default profile only when storage was empty". Add a fake-adapter test: after Retry with valid storage, there are 0 writes until the next transaction.

The lock-count acceptance is clarified as 1 request per page start, plus 1 per explicit Retry.

## Part 2 review — M3 accepted pending two cosmetic fixes (CT-DEV-003F)

Developer result `c2bebc7d-ccb8-46df-973c-80dd2c715d32`. The Architect reran `npm test`: 82 pass / 0 fail. The served main-BEuAqjXU.js has SHA256 `c3c54422c73a057e13a38069d2ebb9310eafea31b513bc8107f4219d0dd24508` and matches dist. JS+CSS gzip is 28,975 B (budget 200 KB). The Architect reviewed app/M3-EVIDENCE.md and viewed screenshots 02 (Home 390), 30 (Collection 390) and 19 (Results 320 with unlock).

Developer's evidence for the persistence, two-tab, fault-injection, tutorial no-drop, keyboard-path, motion-override, restart-counter, lock-count and loopback checks conforms to §2–§4. Corrections A (Play temporarily) and B (Retry without rewrite) are verified by the Developer's browser and unit evidence; the Architect reviewed the code for B in part 1.

The contrast decision:
- **Normal-mode secondary and profile-panel borders (1.29:1) are accepted.** These controls are identified by their text labels and shape; the border is decorative.
- **The selected mode card is not accepted as is.** Its state is shown by the border (2.73:1) and a tint, so color effectively carries the selected state. That conflicts with 05: "Color never solely conveys … selected".

CT-DEV-003F (tiny):
1. The selected mode card shows visible text such as “✓ Selected”, matching the Collection card pattern. Keep aria-pressed, keep the Start label, and do not reduce the 844×390 no-scroll fit for modes and Start.
2. The unlock card on Results reads as two sentences: “Ginger cat unlocked.” then “Now available in Collection.”, either on its own line or properly punctuated, for both visual and accessible text.

Then the independent Playtester runs CT-TEST-003 on the fixed build.

## CT-DEV-003F accepted — M3 is Architect-accepted; CT-TEST-003 pending

Developer result `d2ffb17f-8795-4f66-9ef0-bbf8c381f7ee`. The Architect reran `npm test`: 82 pass / 0 fail. The served build matches dist:
- index.html `cb12fb9fe7cd84bf8a6f76d4e2800003dcf64449cf1494e507d41ed695233665`
- main-BR7cBzJj.js `2f4f6dfc31fa2da3e671b365c9a44fb36db88fbca63fedb3f1a3a937a40cad11`
- scene-BP3tka9g.css `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1`

In screenshots 34 and 35, the selected mode card shows “✓ Selected” text and, at 844×390, the mode cards and Start still fit without scrolling (Start 133–181). The unlock card reads as two sentences. M3 closes only after the independent CT-TEST-003 passes.

## M3 closed — independent CT-TEST-003 PASS (2026-11-16)

Playtester result `2d6329ca-1f43-4f6d-9458-522cd631aee6`; [full report](../evidence/ct-test-003/CT-TEST-003-report.md), screenshots01–09 alongside it. All nine assigned groups passed: persistence, unlocks/strict bests, two tabs/Retry without rewrite, fault preservation, tutorial no-drop, settings, keyboard/focus, four viewport layouts and core/restart/network regression.

Architect read the report and rechecked dist index/JS/CSS plus served JS/CSS; hashes match the accepted CT-DEV-003F values above. HTTP preview responds at `http://127.0.0.1:4177/`. No new test run or rebuild was needed: the unchanged build already has Architect-verified82/82 tests. Playtester measured30,896 B gzip including HTML+JS+CSS, compared with Developer's29,052 B JS+CSS measurement; both are below200 KB and count different inputs.

One **Low/Info environment observation** stays open: at initial setup, a Web Lock appeared held by an unloaded document without a visible second tab. Playtester used a test-only lock steal to clear setup, then normal reload and the complete two-tab flow passed. Architect has not reproduced the orphan independently; actual tab-discard/bfcache behavior remains untested. No product lock-steal or automatic save takeover is authorized. If reproducible through normal browser lifecycle, investigate as a separate correctness issue rather than weakening ownership.

Limitations remain: physical touch/safe areas, named screen-reader speech, Firefox/Safari, real200% zoom, real frame timing, actual tab discard, browser-restart durability, quota/eviction and1,000-cat rendered performance. This closes M3 within available-browser limits, not full release acceptance.

Playtester cleared its test profile and changed only evidence; Architect's closure changes design records only. Next work is the bounded non-audio M4 slice in [18](18-m4-presentation-polish.md). Audio/content/cost decisions, public release and relocation remain separate.
