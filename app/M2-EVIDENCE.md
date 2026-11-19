# M2 local browser slice — implementation evidence

Date: 2026-11-16 UTC. Scope: CT-DEV-002 + CT-DEV-002R + CT-ART-004 + CT-DEV-002L, local only. Status: **final local layout/copy correction built and browser-checked; M2 review pending, not a release**.

Canonical source root remains `repository root` until the deferred migration. No files were migrated, restarted or deployed.

## Build identity and commands

| Item | Value |
|---|---|
| Package | `cat-tower-app@0.2.0-m2` |
| Node / npm | v26.13.1 / 11.20.0 (portable, checksum-verified) |
| TypeScript / Vite | 5.9.3 / 8.3.8 |
| Build output | `app/dist` (90,994 bytes total) |
| JS+CSS gzip | 22,437 bytes |
| Preview endpoint | `http://127.0.0.1:4177/` |
| Diagnostics endpoint | `http://127.0.0.1:4177/diagnostics.html` |

`npm test` (typecheck + compiled tests + `node:test`): exit 0, **67 passed / 0 failed**, 149 ms runner time. All 52 original domain tests, five CT-DEV-001R regressions, seven M2 adapter tests, the CT-DEV-002R metadata regression and the CT-ART-004 art-integrity test remain; the CT-DEV-002L copy regression adds the 67th. `npm run build`: exit 0. `npm run bench`: exit 0; 1,000-cat placement mean 0.0245 ms / p95 0.0343 ms, 2,000 cats 0.0487 ms.

Built file hashes:

```text
612bc2167a6a2fe0b02a722114dd376bb1a61d4edf1230f308f4c3b8a9e148af  index.html
3dc6bcd2b13d96c9b8a2000503dd4c81857df1867e113efa55ac154cf0ac1591  diagnostics.html
1fad142c905d6425d5b1a845f05ff1b50ac01cad8f555aa9c82d3a0198c2ab50  assets/main-DBY5zVeB.js
d3da2a5d2be172c523b5d2ba4aad0ca7309112ab099513d795d6c6b7ea32570d  assets/scene-X77hUAHX.js
4d14d2768ba807e7d4aee576ff110c635c202c59cb05eca1875b693707cdd9f9  assets/scene-sHgGVcMT.css
47521173f40834adfa515b905c8dce8787fb45f8d6825414894d85b281141d73  assets/diagnostics-BQYgwLyD.js
```

Browser: OpenBot private browser, `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 ... Chrome/156.0.0.0 Safari/537.36`, headless/emulated viewports. No physical-device or screen-reader evidence.

## CT-ART-004 tuxedo variant

Approved exact variant: `ct-art-004`, 1,586 bytes, SHA-256 `5fb79154049506515fb205226a15168ea8904ba5ea05282c843bc48958590cfb`; user appearance card `95e0f689-310e-4984-b68d-a8588f192e1a`, relay `3691f833-14cc-49c9-a083-d39f777922a9`. Integrated as `public/assets/production-02/runtime/bodies/tuxedo-legibility.svg`; the original `tuxedo.svg` remains physically present but unmapped. The sanitized manifest points body `tuxedo` to the variant and records variant approval/hash separately from base appearance. No renderer, loader, geometry or skin-unlock change.

Art counts: **12 mapped SVGs / 9,317 bytes active**, **13 physical SVGs / 10,739 bytes retained** (original tuxedo 1,422 B). The integrity test fails if the mapped URL/hash/byte counts drift. Diagnostics show the variant status and all six tuxedo faces at 80 CSS px.

## CT-DEV-002R corrections

- **Startup:** one 1500 ms deadline covers manifest plus all image loads. On stall the request is aborted and placeholders are selected; Start enables and the engine/bootstrap runs. Late manifest completion is ignored after fallback and across Replay. Browser fault cases: `stall-manifest`, `stall-image`, `late-manifest`.
- **Target size:** Drop computes to 64 CSS px at 320×568 and 844×390, including collapse/Skip layouts; measured boxes and new screenshots 18–19.
- **Held native keys:** document-level Space/Enter keydown/keyup ownership plus a Drop-button keyboard-click gate. Held Enter cannot drop the next cat; keyup + fresh Enter can. Held Resume/Replay activation does not become Drop.
- **Validator:** `faceRenderWidthBodyFraction` must be finite before the 0.45 comparison; byte-invalid/NaN input falls back.
- **Evidence counters:** `engineObjects`, `sessionObjects`, `loopObjects`, `resizeObserverObjects` are incremented at construction; `listenerRegistrations` counts the bootstrap's window/document/canvas/motion listener adds. Measured before/after 50 restarts: window3/document3/canvas2/motion1, observer1, unchanged.

## CT-DEV-002L layout and copy correction

**Standard viewport results, zero initial scroll, 100% CSS scale.** Actual client widths after scrollbar overlay: 305 (320 viewport), 375 (390 viewport), 829 (844 viewport), 1265 (1280 viewport).

| Viewport | Aiming readout bottom | Drop bottom / height | Collapse Skip bottom / height | Results action bottom | Page scrollHeight |
|---|---:|---:|---:|---:|---:|
| 320×568 | 494 | 562 / 64 | 494 / 64 | 515 | 568 |
| 390×844 | 770 | 838 / 64 | 776 / 64 | 447 | 844 |
| 844×390 | 268.5 | 336.5 / 64 | 262.5 / 64 | 198 | 390 |
| 1280×720 | 636 | 708 / 68 | 642 / 64 | 508 | 720 |

- Complete Assist text was measured with `clientHeight === scrollHeight` at every size: 56 px at 320/390/1280 and 62 px at 844. It includes offset + overlap + prediction and uses floor wording before the first cat.
- HUD/Pause, mode/temporary notice, active `Perfect ×3` chain, Drop, Left/Right, and readout are inside the viewport at all four sizes while aiming. During COLLAPSING, disabled Drop/Left/Right are hidden and one `Skip to results` primary action (64 px) is visible; playfield height is unchanged between aiming and collapse, so no layout-only ResizeObserver pause occurs.
- Home primary controls: Start rect `460.5–518.5` at 320, `440.5–498.5` at 390, `148.7–196.7` at 844 (mode cards 21–127), `452.5–510.5` at 1280; Start is 44–58 px high and mode choice is in view. Optional help/diagnostic content below Start may scroll at 320/1280.
- Classic aiming uses the same measured playfield/control rows; its complete Classic hint and Drop/nudges remain inside the viewport (screenshots in m2l).
- No horizontal overflow: document scrollWidth was <= clientWidth at all measured states. A true resize pauses once with reason `resize`; layout-only aiming→collapse does not change playfield height or add a pause.
- Results fits all four sizes: 320 card 30–532, 390 30–464, 844 14–211, 1280 81.6–556.9; no initial scroll.
- 320/1280 Home retain optional help/diagnostic content below the primary Start; Start and mode choice are in view. Scrolling remains the fallback for 200% zoom, larger text and real safe-area constraints.
- Copy: zero-cat readout now reads “3.20 left of the floor center … Will miss the platform”; centered reads “Centered on the floor”; post-first-cat text keeps “top cat”. Empty-floor MISS_TOP status/Results read “Missed the platform” (engine enum remains MISS_TOP). Visual readout and polite nudge announcements share the same helper path.

Screenshots: `evidence/m2l/` contains Home, Classic aiming, Assist aiming with chain, COLLAPSING and Results at each of 320×568, 390×844, 844×390 and 1280×720 (20 files).

## Pass / fail / not-run matrix

| Check | Result | Evidence |
|---|---|---|
| Home, mode choice, temporary notice | PASS | Screenshot 01; DOM snapshot |
| Classic round, moving aim, Drop | PASS | Screenshot 02; 9-tick cue, stable centered Classic score 15 |
| Assist round, Left/Right, signed offset/overlap/prediction | PASS | Screenshot 03; readout `0.08 left ... 100% ... Stable` after nudges |
| Stable landing, score/height/perfect chain | PASS | Screenshot 04; score 15, stacked 1, Perfect×1 |
| Tall tower/camera follow | PASS | Screenshot 05; 10 cats, score 220, camera target 12.77 |
| Miss collapse, caption, Skip | PASS | Screenshot 06; `MISS_TOP`, Skip visible |
| COM failure, failing-joint cue | PASS | Screenshot 07; `UNSTABLE_TOWER` joint 2, “The tower tipped” |
| Results, Replay, Change mode, Home | PASS | Screenshot 08; Replay/Change mode exercised |
| 50 restarts, no loop/session/R.O. multiplication | PASS (measured) | `generation=50`, `restarts=50`, engine/session/loop/observer objects each 1; measured listener registrations unchanged window3/document3/canvas2/motion1 before/after |
| Pause dialog, Resume, Restart/Home confirmations | PASS | Screenshot 09; exact confirmation copy; Cancel returns Pause |
| Keyboard Space/Enter drop, Arrow nudges, native Drop | PASS | Canvas Space and Enter each released once; native Drop activated; assistive click still works |
| Held native Enter on Drop across landing/new spawn | PASS | First Enter+click dropped; held repeat click after next AIMING did not; keyup + fresh Enter did |
| Held Enter through Resume/Replay | PASS | Held key on Resume/Replay did not become a Drop; post-resume phase stayed AIMING/SPAWN_CUE |
| Startup stall: manifest | PASS | `?fault=stall-manifest`: Start disabled at load, enabled with placeholders at the 1.5 s deadline; Assist/Classic playable |
| Startup stall: image/decode | PASS | `?fault=stall-image`: placeholder fallback after deadline; no engine block |
| Late asset completion ignored | PASS | `?fault=late-manifest`: deadline fallback stayed selected after 3+ s and across Replay |
| `faceRenderWidthBodyFraction=NaN` rejected | PASS (unit) | `validateManifest` finite check regression, 65th test |
| Drop target ≥64 CSS px | PASS | Computed Drop 64 at 320×568 normal and collapse, and 64 at 844×390 normal/collapse; Skip 56–64 |
| Canvas primary pointer drop | PASS | Trusted pointer click entered FALLING |
| Escape pauses; Escape on Pause stays paused | PASS | Browser script |
| Blur auto-pause / resize auto-pause | PASS | Normal-mode browser checks; reasons `blur`, `resize` |
| Hide auto-pause | PASS (synthetic) | `visibilitychange` with `document.hidden=true`; actual tab hide not separately run |
| 250 ms interruption pause | PASS (unit) | Loop test; browser headless rAF throttling prevented clean foreground timing capture |
| Console errors on fresh flow | PASS | Browser diagnostics empty |
| Network only loopback | PASS | All resource entries `http://127.0.0.1:4177/...`; 13 local asset requests |
| 12/12 runtime SVGs decode | PASS | Diagnostics status |
| 4 coats × 6 faces at 80 CSS px, DPR1 | PASS (visual) | Screenshot 10 |
| Same grid at DPR2 | PASS (visual) | Screenshot 12 |
| Anchors/pivot/face overlay, squash/tilt, floor/travel | PASS (visual) | Screenshots 10–12; no alpha/painted-bounds measurement |
| Tuxedo face legibility at 80 px | PASS (variant, visual) | CT-ART-004 tuxedo variant, all six faces DPR1/device-DPR2/downsampled-2x screenshots 20–23; no pixel contrast measurement |
| 320×568 layout | PASS zero initial scroll | Aiming/collapse/results rectangles measured; Home Start in view, optional help scrolls |
| 390×844 layout | PASS zero initial scroll | All aiming/collapse/results rectangles measured inside viewport |
| 844×390 short landscape | PASS zero initial scroll | Side control panel; Home mode + Start fully visible; Drop64, Skip64 |
| 1280×720 desktop | PASS zero initial scroll | Aiming/collapse/results fit; chain HUD included |
| 200% zoom | PARTIAL / emulated only | CSS zoom 2: scrollable, no horizontal overflow; actual browser zoom not separately available |
| Reduced-motion flag + 12-tick collapse | PASS | Media query true; collapse reached Results after 12 ticks |
| Mid-collapse motion preference change | NOT RUN | M4 shortening-only hook deferred |
| Invalid manifest fallback | PASS | Screenshot 17; game still scored 15 |
| Missing face fallback | PASS | `artReady=false`, game scored 15; diagnostics with variant + missing-face shows 11/12 decoded and fallback |
| Missing body/background/decode fallback | PASS | Game ran to `COLLAPSING` without exception |
| Late asset completion after Replay | PASS | Late pack ignored; selected fallback snapshot remains; no mid-run replacement |
| Same-seed multi-skin domain parity | PASS (domain) | Automated engine test; browser visual comparison not separately captured |
| Physical phone/tablet | NOT RUN | No physical devices |
| Screen reader | NOT RUN | No named screen-reader pass |
| Firefox/Safari | NOT RUN | Only Chrome 156 available |
| Frame-rate p95/p99 / phone performance | NOT RUN | Headless emulation only |
| M3/M4 profile/audio/unlocks/collection | NOT RUN / excluded | Not implemented |

## Screenshots

All under `evidence/m2/`:

- `01-home-desktop-1280x720.png`
- `02-classic-aiming.png`
- `03-assist-aiming.png`
- `04-assist-landing.png`
- `05-tall-tower-10.png`
- `06-miss-collapse.png`
- `07-unstable-collapse.png`
- `08-results.png`
- `09-pause-dialog.png`
- `10-diag-dpr1-top.png`
- `11-diag-dpr1-lower.png`
- `12-diag-dpr2.png`
- `13-mobile-390x844.png`
- `14-mobile-320x568.png`
- `15-landscape-844x390.png`
- `16-home-mobile-390x844.png`
- `17-invalid-manifest-fallback.png`
- `18-mobile-320-collapse-controls.png`
- `19-landscape-844-collapse-controls.png`
- `20-tuxedo-variant-dpr1.png`
- `21-tuxedo-variant-device-dpr2.png`
- `22-tuxedo-variant-2x-backing-downsampled-dpr1.png`
- `23-tuxedo-transform-pivot.png`

## Capture limitation

The private browser throttles `requestAnimationFrame` to about one frame per 800 ms. Screenshots and deterministic gameplay use local-only `?capture=1`, which exposes `window.__catTowerDebug.advance(ticks)` and suppresses automatic frame-gap/blur/resize pause for capture only. Normal `?` runs keep the required interruption/resize/blur pause paths and were used for those checks. This is not a gameplay mode and does not change engine rules. Actual foreground animation smoothness on a normal desktop/phone remains unverified here.

Measured counters come from incrementing registration counters when the bootstrap creates its objects/listeners. `engineObjects`, `sessionObjects`, `loopObjects`, `resizeObserverObjects` are object counts, not listener counts; `listenerRegistrations` counts lifecycle/global/canvas/motion listener registrations (button/dialog handlers are static and not counted).

## Remaining limitations

- No durable profile, best records, unlocks, collection, tutorial persistence, settings, audio, screen reader pass or physical-device check.
- Painted/alpha bounds and contrast ratios are visually inspected via overlays, not pixel-measured. The approved tuxedo variant is integrated; its flat-color contrast was not independently remeasured.
- The 844×390 layout requires a small scroll for the primary Drop/readout; the shell allows it, but a fully compact landscape arrangement can be refined in M4.
- Mid-collapse reduced-motion shortening is start-time only for M2; the M4 adapter contract is not implemented.
- No public release, deployment, paid call, migration or container restart was performed.
