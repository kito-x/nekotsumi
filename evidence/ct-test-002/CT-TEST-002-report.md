# CT-TEST-002 — focused independent retest of CT-DEV-002L

Date: 2026-11-16 02:55 UTC. Reviewer: Cat Tower Playtester. Scope: report-only retest of the corrected layout/copy build; no code, asset, balance, config or server edits. Browser: OpenBot private browser, Chrome 156 headless/emulated, DPR1, 100% CSS scale. No physical device, named screen reader, Firefox/Safari or real browser zoom.

**Verdict: PASS on findings 1–5 and the requested smoke test.** No regression or new defect found.

## Build identity

Verified before and after testing; the served bundle matched the stated hashes exactly at both checks (02:41 and 02:54 UTC).

| Item | SHA-256 |
|---|---|
| `dist/index.html` | `612bc2167a6a2fe0b02a722114dd376bb1a61d4edf1230f308f4c3b8a9e148af` |
| `assets/main-DBY5zVeB.js` | `1fad142c905d6425d5b1a845f05ff1b50ac01cad8f555aa9c82d3a0198c2ab50` |
| `assets/scene-sHgGVcMT.css` | `4d14d2768ba807e7d4aee576ff110c635c202c59cb05eca1875b693707cdd9f9` |

Served page referenced `main-DBY5zVeB.js`, `scene-sHgGVcMT.css` and `scene-X77hUAHX.js`; the two required served files and index matched. No rebuild occurred during the retest.

## Method and viewport identity

All four layouts were loaded at zero scroll and 100% CSS scale. Emulated viewport → document client size (the 15 px difference is the reserved scrollbar gutter): 320×568 → 305×568; 390×844 → 375×844; 844×390 → 829×390; 1280×720 → 1265×720. `?capture=1` was used only for deterministic state setup/screenshots; normal mode was used for the true resize check. Rectangles are CSS px and include the rendered border box.

## Finding 1 — AIMING controls, notice, HUD and complete Assist text: PASS

Classic and Assist aiming both fit at all four sizes. The active chain was produced in Assist (three perfects, score 51, `Perfect ×3`) at every size; Classic also reached 51/`Perfect ×3` at 1280. The Assist readout's `scrollHeight <= clientHeight` at every size, so offset + overlap + prediction were not clipped. Drop and nudge targets meet the minimums.

| Viewport | HUD | Pause | Notice | Assist readout | Drop | Nudges | Page scroll |
|---|---|---|---|---|---|---|---|
| 320×568 | 18–99 | 36.5–80.5 (44) | 104–146 | 436–494 (58; full) | 498–562 (64) | 172.7–226.7 / 232.7–293 (64 high) | 568, zero |
| 390×844 | 18–99 | 36.5–80.5 (44) | 104–131 | 712–770 (58; full) | 774–838 (64) | 64 high | 844, zero |
| 844×390 | 14–70 | 20–64 (44) | 74–101 | 204.5–268.5 (64; full) | 272.5–336.5 (64) | 48 wide, 64 high | 390, zero |
| 1280×720 | 24–90 | 35–79 (44) | 96–123 | 578–636 (58; full) | 640–708 (68) | 92 wide, 68 high | 720, zero |

- Chain pill: 320 `72–92`; 390 `72–92`; 844 `30.5–53.5`; 1280 `45.5–68.5`; all inside; text `Perfect ×3`.
- Classic readout also visible and complete: `Classic timing — drop when the cat is over the platform.`
- No horizontal overflow at any size (`scrollWidth <= clientWidth`).
- Screenshots: `02-320-classic-aiming.png`, `03-320-assist-aiming-chain.png`, `05-390-assist-aiming-chain.png`, `08-844-assist-aiming-chain.png`, `11-1280-assist-aiming-chain.png`.

## Finding 2 — COLLAPSING Skip-only controls: PASS

During COLLAPSING exactly one visible “Skip to results” button existed at each size; Drop and both nudges were `hidden`, `display:none`, not in layout, and could not take focus (`focus()` left `activeElement` elsewhere). Playfield height was identical between AIMING and COLLAPSING. Drop and nudges returned after Replay; Skip was hidden again.

| Viewport | Skip rect / height | Visible Skip count | Playfield AIMING → COLLAPSING |
|---|---|---|---|
| 320×568 | 430–494 / 64 | 1 | 232 → 232 |
| 390×844 | 712–776 / 64 | 1 | 523 → 523 |
| 844×390 | 204.5–268.5 / 64 | 1 | 275 → 275 |
| 1280×720 | 578–642 / 64 (second capture 572–636) | 1 | 395 → 395 |

- 320 Results after Skip: Replay 362–409, Change mode 415–462, Home 468–515; zero scroll.
- 320 Replay returned `AIMING`, Drop visible 498–562 (64), Skip hidden.
- Screenshots: `04-320-collapsing-skip.png`, `06-390-collapsing-skip.png`, `09-844-collapsing-skip.png`, `12-1280-collapsing-skip.png`.

## Finding 3 — Home at 844×390: PASS

Mode cards and Start are fully visible at zero scroll: mode cards `52–127`, Start `148.7–196.7` (48 high), page `390`, no horizontal overflow. At 320/390/1280 Start is also in view (`460.5–518.5`, `440.5–498.5`, `452.5–510.5`); 320 and 1280 retain optional help text below Start, allowed by the spec. Screenshot `07-844-home.png`; `01-320-home.png`, `10-1280-home.png`.

## Finding 4 — support-aware copy: PASS

Checked at 1280 through visual text, polite live region and Results:

- Zero cats, visual: `3.20 right of the floor center · overlap 12% · Will miss the platform`.
- Zero cats, nudge announcement: `2.94 right of the floor center; overlap 22%; Will miss the platform`.
- Zero-cat miss: status `Missed the platform`; Results reason `Missed the platform.`; score 0, height 0.
- After first cat: visual `3.20 left of the top cat · overlap 0% · Will miss the top cat`; nudge announcement `2.94 left of the top cat; overlap 0%; Will miss the top cat`.
- After first cat miss: Results reason `Missed the top cat.`; score 15, height 1.
- Home instruction: `Aim for the platform, then the top cat.`

The exact “Centered on the floor” string was source-inspected but not produced through the UI: Assist spawn is ±3.2 and the nudge step is 0.26, so the nearest reachable offset is 0.08. The off-center floor wording, both announcements and both Results reasons were observed. No math/score change.

## Finding 5 — desktop overflow: PASS

At 1280×720 the game page scroll height is exactly 720, the 16 px overflow is gone, and all aiming/collapse controls fit with zero initial scroll. The Home page is 725 px high only because optional help/diagnostic text below Start is allowed to scroll; Start and both modes are within the viewport. No horizontal overflow.

## Smoke test: PASS

- Keyboard: canvas Space from AIMING → FALLING.
- Pointer: trusted left click on canvas from AIMING → FALLING.
- Pause: Escape opened Pause with reason `Take your time. The tower is waiting.`, Resume focused, background inert; Tab loop Resume → Restart → Home → Resume; Escape while paused stayed paused; Restart confirmation copy exact; Cancel returned Pause with Restart focused; Resume returned canvas focus and the exact FALLING phase.
- Results: Replay reset to `SPAWN_CUE`, score 0, cats 0; Change mode returned Home with Classic selected and `Start Classic`.
- Held Enter: first Enter+click dropped (score 15/height 1); held repeat click after the next AIMING stayed AIMING; keyup + fresh Enter entered FALLING.
- 50 replays: 50 cycles, generation 51, restarts 51; engine/session/loop/ResizeObserver objects each 1; listener registrations window 3/document 3/canvas 2/motion 1 unchanged.
- Core regression: three perfect landings at every size produced 15 → 32 → 51 and `Perfect ×3`; no score/height mismatch.
- Tuxedo variant: diagnostics `12/12 mapped runtime SVGs decoded`, `artReady=true`, `variant ct-art-004 on tuxedo`; all six expressions readable at 80 px DPR1 and forced DPR2 (backing 1960 px). No pixel-contrast measurement.
- No console/page diagnostics appeared in snapshots; no network resource failure observed.

## Resize and layout-only phase behavior

- **True viewport resize, normal mode: PASS.** In a normal (`/`, no capture) Classic run, resizing 1280×720 → 1100×680 produced exactly one pause-reason mutation: `The layout changed — resume when you are ready.`, phase PAUSED, at 1098.7 ms. A MutationObserver recorded one event only; no repeat pause followed.
- **Layout-only phase change: PASS (indirect).** AIMING → COLLAPSING kept playfield `1142×393` and side panel `170` unchanged, and a ResizeObserver attached to the playfield recorded zero entries through the transition. A direct normal-mode phase transition could not be isolated from the headless frame-gap pause, but there is no layout-size change to trigger the resize path.

## New issues

None. The earlier five findings are resolved. Remaining limits are coverage, not defects.

## Not run / limits

- Physical phones/tablets, touch, multi-touch, safe areas/notch, iOS/Android.
- Named screen reader; announcements were read from the polite live region, not AT speech.
- Firefox/Safari; only Chrome 156.
- Actual browser 200% zoom (only CSS-viewport emulation previously), high-contrast/forced-colors.
- Real frame timing/p95/p99/phone GPU; headless rAF throttling.
- Actual OS tab hide/window switch and physical held keys (synthetic events).
- Mid-collapse motion-preference change (M4).
- Exact “Centered on the floor” visual state; source branch inspected, off-center floor path observed.

## Evidence

`evidence/ct-test-002/`

- `01-320-home.png`
- `02-320-classic-aiming.png`
- `03-320-assist-aiming-chain.png`
- `04-320-collapsing-skip.png`
- `05-390-assist-aiming-chain.png`
- `06-390-collapsing-skip.png`
- `07-844-home.png`
- `08-844-assist-aiming-chain.png`
- `09-844-collapsing-skip.png`
- `10-1280-home.png`
- `11-1280-assist-aiming-chain.png`
- `12-1280-collapsing-skip.png`
- `13-1280-results.png`
- `14-tuxedo-dpr1.png`
- `15-tuxedo-dpr2.png`

Only this report and these screenshots were written; no app code/assets, build or server change.
