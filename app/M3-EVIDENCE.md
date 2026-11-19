# M3 durable MVP shell — implementation evidence

Date: 2026-11-16 UTC. Scope: CT-DEV-003 parts 1–2, local only. Status: **implementation and local verification complete; Architect review pending, not a release**.

Canonical source root remains `repository root`. No migration, deployment, container restart or paid call was made.

## Build identity and commands

| Item | Value |
|---|---|
| Package | `cat-tower-app@0.2.0-m2` |
| Node / npm | v26.13.1 / 11.20.0 (portable toolchain) |
| TypeScript / Vite | 5.9.3 / 8.3.8 |
| Build output | `app/dist` (121,314 bytes) |
| JS+CSS gzip | 29,052 bytes (limit 200,000) |
| Preview | `http://127.0.0.1:4177/` (HTTP 200, detached; PID 1698/1712) |

Commands, final run:

```text
npm test        exit 0 — 82 tests, 82 pass, 0 fail
npm run build   exit 0
```

The 82 tests are the 67 earlier tests (including the CT-ART-004 art-integrity test) plus 15 profile tests. The new Retry test is:

`profile service: retry with valid storage makes no write until the next transaction`

Final bundle:

```text
2f4f6dfc31fa2da3e671b365c9a44fb36db88fbca63fedb3f1a3a937a40cad11  dist/assets/main-BR7cBzJj.js
33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1  dist/assets/scene-BP3tka9g.css
cb12fb9fe7cd84bf8a6f76d4e2800003dcf64449cf1494e507d41ed695233665  dist/index.html
```

## Changed paths

- `app/src/main.ts`
- `app/src/platform/profile.ts`
- `app/src/platform/storage.ts`
- `app/tests/profile.test.ts`
- `app/index.html`
- `app/src/styles.css`
- `app/M3-EVIDENCE.md`
- `evidence/m3/01-*.png` … `evidence/m3/33-*.png`

## Part 1 review corrections

- **Play temporarily** now only sets the temporary-play state, changes the notice to “Temporary session — progress will not be saved.”, hides the other-tab prompt and moves focus to Start. It does not open the tutorial or start a run. Observed: `saveMode=other-tab`, Home remains visible, `snapshot=null`, `tutorialOpen=false`, Start focused, storage byte-identical.
- **Retry with valid storage** adopts the stored v1 document without rewriting it. Only an empty store is written during Retry. The new fake-adapter test asserts 0 writes until the next transaction. Browser observation: after Retry, `saveMode=owner`, `revision=7`, storage byte-identical; the next settings change wrote revision 8.
- The write-failure polite announcement is delayed 450 ms so the round-start announcement does not overwrite it. A MutationObserver recorded exactly one `Progress is saved only for this session.` after `Classic round started…`.

## CT-DEV-003F visual fixes

- **Home mode cards:** the selected card now shows visible `✓ Selected` inline beside its name, matching the Collection pattern. `aria-pressed` and the `Start Classic` / `Start Assist` label are unchanged. The label is also visible in high-contrast mode.
- **Results unlock card:** the title is now `Ginger cat unlocked.` and the note is `Now available in Collection.` on its own line. `innerText` is the properly spaced accessible text `Ginger cat unlocked. Now available in Collection.`

Home geometry is unchanged by the inline label: 844×390 mode cards 52–127, Start 133–181; 320×568 mode cards 186.5–350.5, Start 372.5–430.5; 390×844 mode cards 166.5–330.5, Start 352.5–410.5; 1280×720 mode cards 283.5–359.5, Start 381.5–439.5. All are inside their viewport with no horizontal overflow.

Results after the taller two-line card: 320 replay 350.1–397.1, card 515.1–569.1 (page scrollHeight 598); 390 replay 304.1–351.1, card 416.1–470.1; 844×390 screen 8–316.5, replay 48–95, card 249.5–303.5, scrollHeight 390; 1280 replay 431.7–478.7, card 490.7–544.7.

## Browser verification

Browser: OpenBot private browser, Chrome 156 headless/emulated viewports, real `localStorage`. Deterministic landings used the existing `?capture=1` path. Normal-mode lifecycle was kept separate.

| Check | Result | Evidence |
|---|---|---|
| Persistence: totals, records, skin and settings survive refresh | PASS | Seeded 30 placements, selected Ginger, Motion Reduced, High contrast on, Assist preferred, landed one Assist cat. After normal reload: `Best (Assist): score 15 · height 1`, collection `2/4`, `31` total, Ginger selected, `reducedMotion=on`, `highContrast=true`, preferred Assist. |
| Two-tab ownership | PASS | First tab owner; second tab `saveMode=other-tab` and read `Best 42 / height 7`. |
| Play temporarily never writes and does not start | PASS | Second tab stayed on Home, no tutorial, Start focused, temporary notice; storage string unchanged. |
| Temporary run/placement does not write | PASS | In-memory totals reached 41/round 4; stored document remained 40/round 3, byte-identical. |
| Retry after first tab closes | PASS | Confirm title `Retry save access?`, exact reload copy, accept `Continue`; after Continue `saveMode=owner`, lockRequests 2, temporary 41 discarded, stored 40 adopted without a write. |
| Unreadable: invalid JSON `{broken` | PASS | `temporary-unreadable`, exact notice, raw preserved, score 15 / height 1, game visible. |
| Unreadable: future `schemaVersion:2` | PASS | Same notice/mode; raw preserved; score 15. |
| Unreadable: 65,537-char value | PASS | Same notice/mode; 65,537 chars preserved; score 15. |
| Missing Web Locks | PASS | Injected `navigator.locks` undefined before bootstrap; `temporary-unsupported`, temporary notice, lockRequests 0, score 15, raw unchanged. |
| Throwing `setItem` | PASS | `temporary-write-failed`, notice `Progress is saved only for this session.`, in-memory revision 2, raw unchanged, score 15, live region announcement observed once. |
| Tutorial close by Enter | PASS | Cats 0 at SPAWN_CUE and after 90 ticks (AIMING); `tutorialSeen=true`. |
| Tutorial close by Space | PASS | Same; no first-cat drop. |
| Tutorial close by Escape | PASS | Same; no first-cat drop. |
| Tutorial close by click | PASS | Same; no first-cat drop. |
| Keyboard path and focus | PASS | Home Start focused → Enter tutorial; Tab/Shift+Tab trapped Next↔Skip; step 2 Back/Skip/Start; Enter starts; canvas focused; Escape pauses with Resume focused; Tab Settings; Settings title focused; Tab first radio; Shift+Tab Close; close returns Pause with Settings focused; Shift+Tab Resume; Enter resumes canvas; Results Replay focused; Tab→Change mode→Collection; Enter opens Collection; Tab first card; Shift+Tab Close; Escape returns focus to Results Collection. |
| Motion override both ways | PASS | OS reduce + System → reduced true; OS reduce + Full → false; OS no-reduce + Full → false; OS no-reduce + System → false; OS no-reduce + Reduced → true. |
| 50 restarts | PASS | restarts 0→50; engine/session/loop/observer objects remain 1; listeners window 3 / document 3 / canvas 2 / motion 1. |
| Lock requests | PASS | One per page start; second tab 1 then 2 after explicit Retry. |
| Loopback only | PASS | 16 resource entries, all `http://127.0.0.1:4177`; external list empty. |

Gameplay outcome for every injected fault was score **15**, one cat landed, game screen present, no blank canvas.

## Layout rectangles (CSS px)

Viewport client width is lower than the nominal width when a classic scrollbar is present (`305`, `375`, `829`, `1265`); `scrollWidth <= clientWidth` at every measured state. Dialog content may scroll internally; the close/primary row was measured after scrolling to the dialog bottom where marked.

### 320×568

| State | Key rectangles |
|---|---|
| Home | Start 372.5–430.5 (58); Classic 186.5–262.5; Assist 274.5–350.5; profile 458.5–583.7; links 591.7–712.7; page scrollHeight 971. Start and modes visible without scroll. |
| Classic AIMING | HUD 18–99; playfield 104–391; status 396–432; readout 436–494; Drop 498–562 (64). |
| Assist AIMING | Drop 498–562 (154.7 wide); Left 498–562; Right 498–562; readout 436–494. |
| COLLAPSING | playfield 104–391; status 396–432; Skip 436–500 (64). |
| Results (badge + unlock) | Best 170.1–188.1; badges 194.1–250.1; Replay 350.1–397.1; unlock 515.1–569.1 (54 high; page scrollHeight 598, scrollable). Replay visible. |
| Settings | Dialog 12–556, client 544 / scroll 616. Close at 554.8–601.8 before scroll; after scrollTop 72, Close 482.8–529.8. |
| Collection | Dialog 12–556, client 544 / scroll 723. Close at 661.8–708.8 before scroll; after scrollTop 179, Close 482.8–529.8. |
| Tutorial step 2 | Dialog 113.5–454.5; Back/Skip 324.5–371.5; Start 381.5–428.5. |

### 390×844

| State | Key rectangles |
|---|---|
| Home | Start 352.5–410.5; Classic 166.5–242.5; Assist 254.5–330.5; profile 438.5–555.5; links 563.5–665.5. |
| Classic AIMING | HUD 18–99; playfield 104–667; status 672–708; readout 712–770; Drop 774–838 (64). |
| Assist AIMING | Drop 774–838; Left/Right 774–838; readout 712–770. |
| COLLAPSING | playfield 104–667; Skip 712–776 (64). |
| Results | Best 170.1–188.1; badges 194.1–219.1; Replay 304.1–351.1; unlock 416.1–470.1 (54 high); screen bottom 487.1. |
| Settings | Dialog 155.9–688.1; close 615.1–662.1; client = scroll 532. |
| Collection | Dialog 108.6–735.4; close 662.4–709.4; client = scroll 627. |
| Tutorial step 2 | Dialog 263.5–580.5; Back/Skip 450.5–497.5; Start 507.5–554.5. |

### 844×390

| State | Key rectangles |
|---|---|
| Home | Classic/Assist 52–127; Start 133–181 (48); profile 193–302; links 312–359. Modes and Start fit without scroll. |
| Classic AIMING | HUD 14–70; playfield 78–388; status 147–183; readout 187–251; Drop 255–319 (64). |
| Assist AIMING | Drop 255–319; Left/Right 255–319; readout 187–251. |
| COLLAPSING | playfield 78–388; status 147–183; Skip 187–251 (64). |
| Results (corrected) | Screen 8–316.5; eyebrow 21–36; heading 48–82; reason 86–109.5; best 117.5–135.5; badges 141.5–166.5; stats 180.5–241.5; Replay 48–95; actions 48–148; unlock 249.5–303.5 (54 high). Page scrollHeight 390. The earlier reason/stats overlap is fixed. |
| Settings | Dialog 12–378, client 366 / scroll 511. Close 450.4–497.4 before scroll; after scrollTop 145, Close 305.4–352.4. |
| Collection | Dialog 12–378, client 366 / scroll 591. Close 529.9–576.9 before scroll; after scrollTop 225, Close 304.9–351.9. |
| Tutorial step 2 | Dialog 70–320; Back/Skip/Start 228–294 (66). |

### 1280×720

| State | Key rectangles |
|---|---|
| Home | Start 381.5–439.5; Classic/Assist 283.5–359.5; profile 467.5–584.5; links 592.5–639.5. |
| Classic AIMING | HUD 24–90; playfield 96–532; status 538–574; readout 578–636; Drop 640–708 (68). |
| Assist AIMING | Drop 640–708; Left 60.5–152.5; Right 1112.5–1204.5; readout 578–636. |
| COLLAPSING | playfield 96–532; Skip 578–642 (64). |
| Results | Best 253.7–271.7; badges 277.7–302.7; Replay 431.7–478.7; unlock 490.7–544.7 (54 high); screen 75.6–593.7. |
| Settings | Dialog 104.3–615.7; close 542.7–589.7; client = scroll 511. |
| Collection | Dialog 64.5–655.5; close 582.5–629.5; client = scroll 591. |
| Tutorial step 2 | Dialog 235–485; Back/Skip/Start 393–459 (66). |

## Contrast measurements

Computed from `getComputedStyle`; foreground alpha composited over the first opaque ancestor background. Ratios are actual measured values.

### Normal mode

| Element | Foreground / background | Size / weight | Ratio | Requirement | Result |
|---|---|---|---:|---:|---|
| Body text `.tagline` | `#5d6c62` on `#e8eee1` | 16.8 px / 400 | 4.69 | 4.5 | PASS |
| Instruction | `#5d6c62` on `#e8eee1` | 16 px / 400 | 4.69 | 4.5 | PASS |
| Start button | `#fffaf2` on `#a94e2f` | 17.28 px / 800 | 5.29 | 4.5 | PASS |
| Secondary Settings | `#26352e` on `#eef2e8` | 16 px / 800 | 11.34 | 4.5 | PASS |
| Mode card | `#26352e` on `#fff7e6` | 16 px / 400 | 12.08 | 4.5 | PASS |
| HUD values | `#26352e` on `#fffdf6` | 16 px / 700 | 12.65 | 4.5 | PASS |
| Safety band | `#47785b` on `#edf7ef` | 11.84 px / 800 | 4.66 | 4.5 | PASS |
| Notice | `#6b572f` on `#f7edce` | 13.44 px / 700 | 5.93 | 4.5 | PASS |
| Mode border | `#d4764b` on `#e8eee1` | 2 px | 2.73 | 3.0 | **FAIL** |
| Profile/secondary border | `#c9d4c5` on `#e8eee1` | 1–2 px | 1.29 | 3.0 | **FAIL** |

The two boundary rows are normal-mode decorative borders, not the sole control indicator; they are reported rather than restyled. The high-contrast mode replaces them with solid 2–3 px `#111` boundaries.

### High contrast

| Element | Foreground / background | Size / weight | Ratio | Requirement | Result |
|---|---|---|---:|---:|---|
| Body text | `#1f2937` on `#ffffff` | 16.8 px / 400 | 14.68 | 4.5 | PASS |
| Instruction | `#1f2937` on `#ffffff` | 16 px / 400 | 14.68 | 4.5 | PASS |
| Start button | `#ffffff` on `#7a2e12` | 17.28 px / 800 | 9.43 | 4.5 | PASS |
| Secondary Settings | `#111111` on `#ffffff` | 16 px / 800 | 18.88 | 4.5 | PASS |
| Mode card | `#111111` on `#fff3dc` | 16 px / 400 | 17.18 | 4.5 | PASS |
| HUD values | `#26352e` on `#ffffff` | 16 px / 700 | 12.87 | 4.5 | PASS |
| Safety band | `#14532d` on `#ffffff` | 11.84 px / 800 | 9.11 | 4.5 | PASS |
| Notice | `#111111` on `#ffffff` | 13.44 px / 700 | 18.88 | 4.5 | PASS |
| Mode border | `#111111` on `#ffffff` | 3 px | 18.88 | 3.0 | PASS |
| Panel/secondary/Start border | `#111111` on `#ffffff` | 2 px | 18.88 | 3.0 | PASS |

## Budget, network and counters

- `dist` total: **121,314 bytes**.
- JS+CSS gzip: **29,052 bytes** (main 17,104; scene JS 5,294; scene CSS 4,737; diagnostics JS 1,917), well below 200,000.
- Network: 16 resource entries, all `http://127.0.0.1:4177`; `external=[]`.
- 50 restarts: `restarts 0→50`; `engineObjects=1`, `sessionObjects=1`, `loopObjects=1`, `resizeObserverObjects=1`; listener counts `window 3 / document 3 / canvas 2 / motion 1` unchanged.
- Lock requests: 1 per page start; 2 after explicit Retry in the same page. No steal and no extra request during 50 restarts.

## Screenshots

`evidence/m3/` contains 35 PNGs:

- `01`–`05`: Home at 320×568, 390×844, 844×390, 1280×720, high contrast 390×844.
- `06`–`10`: Classic AIMING at the four viewports plus high contrast 390×844.
- `11`–`14`: Assist AIMING at 320×568, 390×844, 844×390, 1280×720.
- `15`–`18`: COLLAPSING at the four viewports.
- `19`–`23`: Results with both record badges and the Ginger unlock card at the four viewports plus high contrast 390×844.
- `24`–`27`: Settings at 320 top/scrolled, 390, and 844 scrolled.
- `28`–`31`: Collection at 320 top/scrolled, 390, and 844 scrolled.
- `32`–`33`: Tutorial step 2 at 320×568 and 390×844.
- `34`: Home with the visible `✓ Selected` mode label at 844×390.
- `35`: Results with the fixed two-sentence unlock card at 320×568 (scrolled 10 px to show the full card).

## Not run / limits

- Physical phones and tablets.
- Named screen reader (NVDA, JAWS, VoiceOver, TalkBack); live-region and focus behaviour were checked with DOM focus and MutationObserver only.
- Firefox and Safari; their Web Locks and storage behaviour remains unverified.
- Real browser zoom and OS text scaling.
- Real foreground frame timing and smoothness. The private browser throttles `requestAnimationFrame` to roughly one frame per 800 ms; normal-mode runs therefore hit the existing interruption pause. Deterministic landings used the authorized `?capture=1` path, and normal-mode lifecycle checks were kept separate.
- Release, deployment, migration, container restart, paid calls, audio and sound UI were not performed.
