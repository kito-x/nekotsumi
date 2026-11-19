# M4A presentation and announcement lifecycle — evidence

Date: 2026-11-16 UTC. Scope: CT-DEV-004A only, local browser. Status: **implementation and local verification complete; Architect review pending; M4B not started**.

Canonical source root remains `repository root`. No audio, content, provider, paid call, release, commit, push, migration, container change or unrelated restart was made.

## Build identity and commands

| Item | Value |
|---|---|
| Baseline | 82 tests; `main-BR7cBzJj.js` SHA-256 `2f4f6dfc31fa2da3e671b365c9a44fb36db88fbca63fedb3f1a3a937a40cad11` |
| Final package | `cat-tower-app@0.2.0-m2` |
| Node / npm | v26.13.1 / 11.20.0 |
| TypeScript / Vite | 5.9.3 / 8.3.8 |
| Build output | `app/dist` — 127,226 bytes |
| JS+CSS gzip | 30,571 bytes (budget 200,000) |
| Preview | `http://127.0.0.1:4177/` — HTTP 200, detached |

Final commands (after CT-DEV-004AR):

```text
npm test        exit 0 — 91 tests, 91 pass, 0 fail
npm run build   exit 0
```

The 91 tests are the 82 baseline tests plus 9 presentation/announcer/toast/throttle regressions; CT-DEV-004AR did not add a unit seam and kept the count at 91. All baseline domain, profile, art-integrity and M2/M3 checks remain green.

Final hashes:

```text
222fd01ced1163ebc3338bd9f483df79a4369e1cba3811e50b3102b8044861b6  dist/index.html
c6f622bd9bf3d078f61e36c6790e69a4643ae0414de62eef39cc88ef314998bd  dist/assets/main-DroJ0HWb.js
33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1  dist/assets/scene-BP3tka9g.css
d3da2a5d2be172c523b5d2ba4aad0ca7309112ab099513d795d6c6b7ea32570d  dist/assets/scene-ChEnLJaP.js
```

## Changed paths

- `app/src/render/presentation.ts` (new pure presentation state/effects)
- `app/src/render/renderer.ts`
- `app/src/app/announcer.ts` (new cancellable live-region service)
- `app/src/app/toast-queue.ts` (new cancellable toast scheduler)
- `app/src/app/throttle.ts` (new leading/trailing nudge throttle)
- `app/src/app/announcements.ts` (new landing/unlock message text)
- `app/src/main.ts`
- `app/tests/presentation.test.ts` (new)
- `app/M4A-EVIDENCE.md`
- `evidence/m4a/01`–`10` PNGs

No CSS, layout, art, physics, score, balance, profile schema/transaction, lock or Retry behavior changed.

## Effect behavior

`PresentationState` owns presentation time, advanced only by `render(dt)` while play advances. The renderer reads a single landing effect, not a history.

| Case | Probe/result |
|---|---|
| Perfect landing at the landing render | `landing.ordinal=1`, `perfect=true`, `elapsed=0.0167`, `face=happy`, `scaleY=0.99` |
| Perfect at 100 ms | `elapsed=0.100`, `scaleX=1.06383`, `scaleY=0.94000`, `face=happy` |
| Perfect at 250 ms | `elapsed=0.250`, `scaleX=1`, `scaleY=1`, `face=happy` |
| Ordinary landing at 100 ms | score 10, `face=happy`, `scaleX=1.06383`, `scaleY=0.94000` |
| Dangerous stable landing (2 cats, second at 1.2) | safety `0.027`, score 25, `face=worried`, squash active at 100 ms |
| Failure | `phase=COLLAPSING`, `cats=2`, `landing=null`, no squash |
| Reduced motion landing | `reducedMotion=true`, `face=happy`, `scaleX=1`, `scaleY=1` at landing and 117 ms |

Squash is around the existing bottom-center pivot; `scaleX * scaleY = 1`. It applies only to the landed ordinal. A `spawned` event leaves the landing effect in place; a later landing replaces it; failure, Results and a new round clear it. A dangerous perfect landing is covered by the pure regression: danger/worried outranks landing/happy while the perfect grade and points remain in the message.

## CT-DEV-004AR motion override correction

The Architect reproduced a live-OS-change bug: with Reduced or Full selected, toggling the emulated OS preference changed the renderer directly because `handleMotionChange` called `renderer.setReducedMotion(motionQuery.matches)`, bypassing the saved override. `main.ts` now routes the media-query change through `applyMotionPreference()`, the same effective path used by Settings.

Browser regression on the corrected build (capture mode, 390×844, actual renderer probe and squash transform):

| Preference | OS emulation | Effective helper | Renderer probe | Landing at 100 ms |
|---|---|---|---|---|
| Reduced | false → true → false | true throughout | `reducedMotion=true` throughout | `scaleX=1`, `scaleY=1` (identity) |
| Full | false → true → false | false throughout | `reducedMotion=false` throughout | `scaleX=1.06383`, `scaleY=0.94000` |
| System | false → true → false | follows OS | follows OS | identity under OS reduce, squash under OS full |

The media-query event in the private browser can settle asynchronously; the System check was read after the event settled and then followed both directions. Pause + Settings open: with Reduced selected, OS true→false left the renderer probe `reducedMotion=true`; Escape closed Settings back to Pause with focus on Settings, Shift+Tab focused Resume, Enter resumed with canvas focus, and the probe remained reduced.

No test seam exists for `main.ts` preference application without adding a new handler abstraction for a one-line fix, so the focused regression is the browser probe/transform check above; the 91-test suite is preserved unchanged. This correction does not change layout, timers, announcements, storage, locks, engine timing or collapse behavior, so the four-viewport/50-restart runs were not repeated.

## Announcements and toasts

Browser observations used a MutationObserver on `#live-region`; this is DOM evidence, not a claim that a named screen reader finished speech.

| Scenario | Observed sequence / state |
|---|---|
| Landing at 25 total with Ginger unlock | `Perfect. Plus 15 points. Stacked 1. Score 15. Ginger cat unlocked.` — one combined message; no separate `Ginger cat unlocked.` announcement; toast `Ginger cat unlocked` visible, non-modal, focus unchanged. |
| Results after that run | `Round over. Score 15. Cats stacked 1.`; toast hidden; Results card `Ginger cat unlocked.` / `Now available in Collection.` preserved; no duplicate unlock announcement. |
| Replay | toast hidden, `cats=0`, new `Classic round started…` message; no old-round toast. |
| Home after Results | no late unlock/nudge message; toast hidden; save notice unchanged. |
| Write failure at start and landing | first message `Classic round started… Progress is saved only for this session.`; landing message has no failure suffix; failure appears exactly once (count 1) across Results and Home; notice remains visible. |
| Rapid Assist nudge then Pause | nudge message followed by `Paused.`; no nudge after Pause; Resume last message `Resumed. Drop when ready.`; no old nudge after resume. |
| Unlock toast while paused | still visible after 3.4 s paused; hidden 3.1 s after resume. |
| 50 rapid restarts after an unlock | toast hidden; `toasts={displaying:false,queued:0,pendingHandoff:false}`; `announcements={pending:false,failurePending:false}`; one final round-start message only; no old unlock. |

The live region is the existing `aria-live="polite"` / `aria-atomic="true"` element. The announcer cancels the tracked 30 ms content timer on context changes and checks a generation guard in every callback. Write-failure text is appended once to the next announcement (or written alone) and survives context resets while undisplayed. Toast display and handoff timers are tracked and generation-guarded; `clear()` removes queue, display timer, handoff timer and visible toast.

## Keyboard and focus regression

PASS at 390×844 capture mode:

- Home Start focused → Enter tutorial.
- Tutorial title focused; Tab → Next; Shift+Tab → Skip (focus trap); step 2 Tab → Back → Skip → Start; Enter starts.
- Tutorial close left cats 0 at SPAWN_CUE; game canvas focused.
- Space landed a centered cat (score 15).
- Escape → Pause, Resume focused; Tab → Settings; Enter → Settings title; Tab → first radio; Shift+Tab → Close; Escape closes Settings and reopens Pause with Settings focused; Shift+Tab → Resume; Enter resumes canvas.
- Results Replay focused; Tab → Change mode → Collection; Enter opens Collection; Tab → first card; Shift+Tab → Close; Escape returns focus to Results Collection.

One source fix was required during this check: the global Escape handler previously swallowed Escape while Settings was open from Pause. It now returns when Settings, Collection, tutorial or How-to-play is open, so the dialog's own cancel path runs. No other behavior changed.

## Layout rectangles (final build, CSS px)

Viewport client widths: 305, 375, 829, 1265; `scrollWidth <= clientWidth` at every measured state.

| State | 320×568 | 390×844 | 844×390 | 1280×720 |
|---|---|---|---|---|
| Home modes | 186.5–262.5 / 274.5–350.5 | 166.5–242.5 / 254.5–330.5 | 52–127 (both) | 283.5–359.5 (both) |
| Home Start | 372.5–430.5 (58) | 352.5–410.5 (58) | 133–181 (48, no scroll) | 381.5–439.5 (58) |
| AIMING playfield | 104–391 | 104–667 | 72–382 | 90–526 |
| AIMING Drop | 498–562 (64) | 774–838 (64) | 249–313 (64) | 634–702 (68) |
| Assist readout height | 58 | 58 | 64 | 58 |
| COLLAPSING Skip | 430–494 (64) | 706–770 (64) | 181–245 (64) | 572–636 (64) |
| Results Replay | 350.1–397.1 | 304.1–351.1 | 48–95 | 431.7–478.7 |
| Results screen bottom | 586.1 (page 598; Replay visible) | 487.1 | 316.5 | 593.7 |
| Settings close | scroll 72 → 482.8–529.8 | 615.1–662.1 | scroll 145 → 305.4–352.4 | 542.7–589.7 |
| Collection close | scroll 179 → 482.8–529.8 | 662.4–709.4 | scroll 225 → 304.9–351.9 | 582.5–629.5 |
| Tutorial step 2 Start | 381.5–428.5 | 507.5–554.5 | 228–294 | 393–459 |

Settings/Collection dialogs scroll internally at 320 and 844; their close rows are reachable. Results at 320 keeps Replay visible; the unlock card may extend below the viewport and the page scrolls. All AIMING Drop targets are ≥64 px.

Affected text contrast was rechecked using computed colors: selected mode `✓ Selected` normal 5.97:1 on `#fff7e6`, high contrast 17.18:1 on `#fff3dc`; Home best line normal 11.81:1, high contrast 12.87:1. Other affected text/toast/unlock styles are unchanged from the M3 contrast table.

## Budget, network and counters

- `dist` 127,226 bytes; JS+CSS gzip **30,571 bytes**.
- 16 resource entries, all `http://127.0.0.1:4177`; `external=[]`.
- 50 restarts on the final build: `restarts 0→50`; engine/session/loop/observer each 1; listener counts window 3 / document 3 / canvas 2 / motion 1 unchanged; `lockRequests=1`; no timer growth (`announcements.pending=false`, toast queue empty); `cats=0` after the last restart.
- Test profile was cleared at the end; preview remains detached.
- The CT-TEST-003 stale-lock observation was not reproduced. No `steal:true`, automatic takeover or lock behavior change was added.

## Screenshots

`evidence/m4a/`:

- `01-perfect-landing-100ms-390x844.png`
- `02-perfect-landing-recovered-250ms-390x844.png`
- `03-ordinary-landing-100ms-390x844.png`
- `04-dangerous-landing-worried-390x844.png`
- `05-failure-collapse-390x844.png`
- `06-reduced-motion-landing-390x844.png`
- `07-results-unlock-toast-cleared-390x844.png`
- `08-home-844x390.png`
- `09-home-high-contrast-390x844.png`
- `10-settings-320x568-scrolled.png`

## Not run / limits

- Physical phones/tablets and real safe-area/inset behavior.
- Named screen reader (NVDA, JAWS, VoiceOver, TalkBack); announcements were observed in the DOM live region only.
- Firefox and Safari Web Locks/storage/presentation behavior.
- Real browser zoom/OS text scaling.
- Real foreground frame timing and smoothness. The private browser throttles `requestAnimationFrame` to roughly one frame per 800 ms; deterministic landings used the authorized `?capture=1` path and controlled `advance` steps. No wall-clock smoothness claim is made.
- Actual tab discard/bfcache stale-lock reproduction.
- 1,000-cat rendered performance (M4B), audio/content/provider work and full release acceptance.
