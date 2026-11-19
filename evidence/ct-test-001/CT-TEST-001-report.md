# CT-TEST-001 — independent M2 prototype review

Date: 2026-11-16 02:06 UTC; updated 02:10 UTC after the Architect's acceptance update and the Developer's refreshed evidence. Reviewer: Cat Tower Playtester. Scope: specified by `design/13-m2-review.md`; no code, asset, balance or server changes.

## Verdict

Core Classic/Assist play, input guards, pause/focus, Replay, reduced motion, startup fallback and 50-restart cleanup pass on the reviewed bundle. No gameplay-blocking defect or score/geometry mismatch was found. Remaining defects are small-screen layout/usability issues, plus one wording issue. The Studio tuxedo variant is visually legible at 80 CSS px in the diagnostic view on the final bundle; no measured contrast figure was taken.

Build identity was checked before and after testing. The developer rebuilt the app four times during the review (01:47, 01:50, 01:53, 02:03 UTC). Core evidence was taken on `main-CRIHDIwU.js`; the final 02:03 bundle `main-CrK_-WtQ.js` adds the Studio tuxedo variant and was re-smoked for Home/Classic, startup fallback and the art matrix. `src/styles.css` (`db5ab21c…`) is identical across those two builds, so layout measurements carry; `src/main.ts` was unchanged at 01:52.

## Build, browser and coverage

Final served bundle at 02:04:55 UTC:

| Item | SHA-256 |
|---|---|
| `dist/index.html` | `f8c9d95fab55761d0363b017e9938e33173901117c610debef287b11cd167636` |
| `assets/main-CrK_-WtQ.js` | `c6cfa64e2aa534a186cd875ca78b37e3eb207e4987fd4471d33488ac85cf46d8` |
| `assets/scene-BVzcbeJA.js` | `d3da2a5d2be172c523b5d2ba4aad0ca7309112ab099513d795d6c6b7ea32570d` |
| `assets/scene-DUsJrOXr.css` | `db5ab21c5779d02ec1efceb6de0a65a7c0115b87e6bd7628642f1df7ed919d84` |
| `assets/diagnostics-Dg3bAdQw.js` | `11f160ca4b02f5d1258280422903070d619702bb15068836a040359197029169` |

Earlier review build (CT-DEV-002R corrections, core evidence): `main-CRIHDIwU.js` `40c8ced75ea6d3df563bcdf82643d54d4742c2d6fcba85d76f1d9a7bfeca3c02`; CSS same `db5ab21c…`; index `72b26266…`; scene JS `7adfdf58…`. The initial bundle named in the assignment (`main-pcycm239.js` `fcf9676c…`) was served only at review start and is not the final bundle.

`app/M2-EVIDENCE.md` was refreshed at 02:07 UTC and now lists the final `c6cf…`/`f8c9…` bundle, 66 tests, the integrated tuxedo variant, and 12 mapped/13 physical SVG counts; its earlier stale-hash/tuxedo-pending state is superseded. The Architect's `design/14-m2-correction-and-art-review.md` records CT-DEV-002R acceptance and relays user approval of the exact tuxedo variant card `95e0f689-310e-4984-b68d-a8588f192e1a`; the playtester did not inspect that approval card. No code/assets were edited by the playtester.

Browser: OpenBot private browser, Chrome 156 headless/emulated (Linux x64), DPR 1 for layouts; forced DPR 1/2 on `/diagnostics.html`. Emulated viewport widths, with document client widths in parentheses: 320×568 (305), 390×844 (375), 844×390 (829), 1280×720 (1265), and 640×360 (625) as a 200%-zoom CSS-viewport approximation. No physical device, named screen reader, Firefox or Safari.

Method: normal route (`/`) for lifecycle checks; `?capture=1` plus `window.__catTowerDebug.advance()` for deterministic gameplay and screenshots. Capture is labelled throughout and does not prove real frame timing. Held-key checks used synthetic keyboard/click sequences at the DOM-adapter boundary; no physical key-hold primitive was available. Emulated viewports are not device validation.

## Prioritized findings

### 1. Assist readout is below the fold at 320×568 and clipped at 390×844 — Medium

- Expected: the Assist offset/overlap/prediction line is readable during aiming at supported portrait sizes without scrolling.
- Actual, 320×568 (client 305×568): readout rect top 550, height 50, bottom 600; viewport 568; `scrollHeight 612`. Only the top of the offset line is visible; `Will miss the top cat` is entirely below the fold. Drop/Left/Right remain visible at 478–542 (64 px high).
- Actual, 390×844 (client 375×844): readout top 814, height 50, bottom 864; viewport 844; `scrollHeight 876`. The prediction line is cut; 32 px scroll shows it.
- Screenshots: `02-320x568-assist-readout-below-fold.png`, `04-390x844-assist-prediction-clipped.png`.
- The developer matrix already notes a minor 390 scroll; the 320 Assist case is not separately stated. Suggested direction (M4, not a rule change): place the readout above the controls or compact the HUD/playfield at small heights, without shrinking Drop below 64 CSS px or reducing collision space.

### 2. Collapse Skip/Drop controls are partly or almost entirely off the initial viewport — Medium at 320, Low at 844

- Expected: after a failure, the immediate Skip action is visible (and Drop fully visible); reachable shell scrolling may remain as fallback.
- Actual, 320×568: Skip top 562.2, height 56, bottom 618.2; only 6 px of the button is visible at 568; `scrollHeight 630` (50 px scroll). Drop is visible at 492–556. Screenshot `03-320x568-collapse-skip-offscreen.png`.
- Actual, 844×390: Drop and Skip both top 355.2, height 64, bottom 419.2; only 35 px of each is visible at 390; `scrollHeight 421` (29 px scroll). Skip's two-line label is clipped. Screenshot `05-844x390-collapse-controls-clipped.png`.
- The assigned target-size correction now computes Drop 64 CSS px at both sizes (previous 56 px issue fixed), and Skip is 56–64 px. The remaining issue is initial-viewport visibility, not target height. Auto-results after 72 ticks (~1.2 s) mitigates the hidden Skip, but the button is effectively undiscoverable at 320.

### 3. Home Start is below the fold at 844×390 — Low

- Expected: on the supported short-landscape Home, the primary Start is visible with the mode choice.
- Actual: Classic/Assist cards end at y 385.5 in a 390 px viewport; Start top 407.5, height 58, bottom 465.5; 76 px scroll required. Screenshot `06-844x390-home-start-below-fold.png`. Portrait 320×568 and 390×844 Home place Start in view; no horizontal overflow at any checked size.

### 4. First-spawn Assist copy says “of the top cat” when the tower is empty — Low

- Expected: wording that matches the empty floor/tower on the first cat, e.g. “of the tower” or “of the floor center”.
- Actual: first Assist spawn (`cats.length === 0`) reads `3.20 right of the top cat · overlap 12% · Will miss the top cat`. The number and prediction are correct; only the referent is wrong. Screenshot `02-...`.

### 5. Desktop 1280×720 Assist overflows by 16 px — Low / observation

- Classic at 1280×720: shell 720.2 px, no page scroll; Drop 640–708, fully visible.
- Assist at 1280×720: readout box top 690.2, bottom 724.2; `scrollHeight 736`; 16 px scroll. The text line is visible; the clipped 4 px are box padding. Not a functional blocker, but the page scroll is avoidable.

### Art status — tuxedo variant integrated after the earlier pass

The final manifest maps `tuxedo` to `runtime/bodies/tuxedo-legibility.svg` (SHA-256 `5fb79154049506515fb205226a15168ea8904ba5ea05282c843bc48958590cfb`, 1586 B), with `variantApproval` id `ct-art-004`, card `95e0f689-310e-4984-b68d-a8588f192e1a`, scope “user appearance-approved variant; base production-02 appearance approval remains separate; original tuxedo retained but not mapped”. Diagnostics reports `12/12 mapped runtime SVGs decoded`, `artReady=true`, variant `ct-art-004 on tuxedo`.

Visual check at 80 CSS px body width: DPR1 and forced DPR2 at device DPR1; the grid pixels are captured at CSS scale so the device-DPR2 image is identical, but the measured status at device DPR2 + forced DPR2 was `forced DPR 2 | device DPR 2` with grid backing 1960 px. All six tuxedo expressions (idle, focused, happy, surprised, worried, dizzy) are distinguishable; the light face patch makes the dark eye/mouth strokes readable where the previous base tuxedo lost them. The shared squash/tilt strip shows the variant around the same bottom-centre pivot; manifest geometry is unchanged. Files independently counted: 12 mapped runtime SVGs / 9,317 bytes active, 13 physical SVGs / 10,739 bytes retained (original tuxedo present but unmapped). `?fault=missing-face` with the variant enabled Start, set `artReady=false` with `injected missing happy face`, and still scored 15/height 1. Screenshots `09-...-dpr1.png`, `10-...-dpr2.png`. This is a visual pass only; no alpha-bound or contrast-ratio measurement, and technical acceptance remains the Architect's call.

## Verified passes

| Area | Result and evidence |
|---|---|
| Home, mode choice, temporary notice, Start | Pass; Home body and controls present; no fabricated best/unlock claims. |
| Classic cue gate | Pass on `CRI`: tick 8 `SPAWN_CUE`, tick 9 `AIMING`. |
| Classic moving aim | Pass: x changed 3.135 → 2.918 over 12 aiming ticks (sine motion). |
| Classic centered landing | Pass: perfect, score 15, stacked 1, chain 1; final `CrK` smoke also 15/1. |
| Duplicate input | Triple native Drop activation on one spawn produced one placement, score exactly 15; a second native activation after the fall tick was ignored. Canvas left click dropped; right click did not. |
| Assist preview and prediction | Pass: `3.20 right … overlap 12% … Will miss the top cat` at spawn; center `0.08 right … overlap 100% … Stable if dropped (steady)`; nudge buttons and canvas ArrowRight (plus tick) updated offset/readout and polite live region. |
| Assist scoring/chain/camera | Pass: three centered cats scored 15 → 32 → 51, chain 1 → 2 → 3, `Perfect ×3`; camera bottom −0.8 → 1.02 as tower grew. |
| Failure readability | Pass: `Missed the top cat`, danger/Tipping band, failure cue, Drop disabled, Skip enabled; Results reason/score/height correct (`51/3`, and `15/1`). Top-only miss was not rescued. |
| Results/Replay | Pass: Results focus on Replay; Replay resets score/height, starts a new generation; 50 replays completed. `Change mode` was exercised on the earlier `fcf967` build only; its code path is unchanged but was not re-run on `CrK`. |
| Pause dialog, confirm, focus | Pass: Escape pauses; Escape while paused stays paused; modal Tab loop Resume → Restart → Home → Resume; background inert; cancel returns Pause with Restart focused; Resume returns canvas focus and exact phase/tick/vy. Restart/Home confirmation copy exact. |
| Normal lifecycle pause | Blur (synthetic `blur`) reason `blur`; visibility (synthetic `document.hidden=true` + `visibilitychange`) reason `hidden`; real ResizeObserver path from a playfield width change 1142 → 298 px reason `resize`. All paused before update, Resume focused. Actual OS tab hide/real window switch not available. |
| Mid-fall pause/resume | Pass: pause at tick 12, vy −0.4; 240 advance ticks left phase/tick/vy unchanged; resume returned to the same FALLING tick and canvas focus. |
| Held native Enter, adapter boundary | Pass (synthetic key/click): first Enter+click dropped; held repeat click after the next spawn stayed AIMING; keyup + fresh Enter dropped; keydown begun in SPAWN_CUE and held through AIMING did not drop. No physical key-hold reproduction was possible. |
| Reduced motion | Pass: media query true; collapse reached Results in 12 ticks (normal 72 ticks); no gameplay change. Mid-collapse preference change not run (M4). |
| 50 replays / cleanup | Pass on `CRI`: 50 cycles, generation 51, restarts 51; engine/session/loop/ResizeObserver objects each 1; listener registrations window 3, document 3, canvas 2, motion 1 unchanged; 16 resource entries; no growth. |
| Startup fallback | Pass on final `CrK`: `?fault=stall-manifest` enabled Start after the 1500 ms deadline with placeholders, `artReady=false`, `assetDeadlineHit=true`, and a centered cat still scored 15. `stall-image` and `late-manifest` passed on the prior correction build (late pack stayed ignored at 3.7 s; same deadline code). |
| Save behavior (temporary by design) | Pass: `localStorage`/`sessionStorage` empty, no cookie; reload returns Home with no best/record/unlock claim. No writes. |
| Network/errors | Pass: all 16 resource entries loopback `127.0.0.1:4177`; no page diagnostics entries. All 12 mapped runtime SVGs decoded. |
| Integrated tuxedo variant | Pass (visual): variant is mapped, original retained but unmapped; 12 mapped/9,317 B active vs 13 physical/10,739 B retained; six expressions distinguishable at 80 px in DPR1, forced-DPR2 and device-DPR2 renders; shared pivot/transform intact; missing-face fallback still scored 15. |
| Target sizes and focus | Pass: Drop 64 px at 320 and 844 (and 68 desktop); Pause 44 px; Assist buttons 64 px at small sizes; canvas role application with label/description; 3 px visible focus outline. |
| Layout | No horizontal overflow at 320/390/844/1280/640 CSS widths; Drop visible at 320 and 390 portrait; page scroll permitted. |
| 200% zoom approximation | 640×360 CSS viewport: no horizontal overflow; Home Start and game Drop require vertical scroll; actual browser zoom not available. |

## Not run / remaining gaps

- Physical phone/tablet touch, multi-touch, safe areas/notch, iOS/Android; touch was mouse-pointer/programmatic only.
- Named screen-reader pass; Assist nudge announcement was checked in the live region, not with AT speech. No broader accessibility conformance claim.
- Firefox/Safari; only Chrome 156 was available.
- Actual browser 200% zoom (only emulated CSS viewport/CSS zoom); high-contrast/forced-colors.
- Real frame timing, p95/p99, phone GPU, long-session profiling; headless rAF throttles to about one frame per 800 ms, so normal-route play auto-pauses.
- Physical held key and actual OS tab hide/window switch (synthetic events only).
- Mid-collapse motion-preference change (M4); error-screen/canvas-context failure injection; 1,000-cat visual run (domain bench is Developer/Architect evidence, not repeated here).
- Profile/bests/unlocks/collection/audio are intentionally absent in M2; not reported as defects.

## Evidence files

`evidence/ct-test-001/`

- `01-320x568-classic-aiming.png`
- `02-320x568-assist-readout-below-fold.png`
- `03-320x568-collapse-skip-offscreen.png`
- `04-390x844-assist-prediction-clipped.png`
- `05-844x390-collapse-controls-clipped.png`
- `06-844x390-home-start-below-fold.png`
- `07-desktop-results.png`
- `08-desktop-assist-3cats-score51.png`
- `09-tuxedo-variant-80px-dpr1.png`
- `10-tuxedo-variant-80px-dpr2.png`

Screenshots 01–08 were captured on the `40c8…` build (same CSS `db5ab21c…` as final); 09–10 on final `c6cf…` `CrK` build. No app code/assets were changed; the only writes were this report and these copied screenshots in `evidence/ct-test-001/`.
