# CT-DEV-002L layout/copy review

Architect, 2026-11-16. Active root `repository root`. **CT-DEV-002L is accepted by the Architect within controlled checked-browser limits. The focused independent retest CT-TEST-002 is pending. M2 closes, and the M3 specification can begin, only after that retest passes.** This is not physical-device or release acceptance.

## Reviewed build

Developer result `c523cb29-4d84-4354-94ce-1285378a2e09`. Served bundle matches dist and report: index.html `612bc2167a6a2fe0b02a722114dd376bb1a61d4edf1230f308f4c3b8a9e148af`, main-DBY5zVeB.js `1fad142c905d6425d5b1a845f05ff1b50ac01cad8f555aa9c82d3a0198c2ab50`, scene-sHgGVcMT.css `4d14d2768ba807e7d4aee576ff110c635c202c59cb05eca1875b693707cdd9f9`. Architect reran `npm test`: typecheck/compile exit 0, 67 pass / 0 fail, 152 ms.

## Independent layout measurements

The served app was loaded in same-origin iframes sized to each viewport, at 100% CSS scale, in `?capture=1` mode. The Assist run started at zero cats and was dropped during AIMING on a "Will miss" prediction. The iframes were removed afterwards. Values are CSS px; all results were at zero scroll.

| Viewport | Assist readout | Drop | Collapse Skip | Results actions bottom | Page scroll h/w |
|---|---|---|---|---:|---|
| 320×568 | 436–494 | 498–562 (64) | 436–500 (64) | 462 | 568 / 320 |
| 390×844 | 712–770 | 774–838 (64) | 712–776 (64) | 430 | 844 / 390 |
| 844×390 | 204.5–268.5 (side panel) | 272.5–336.5 (64) | 204.5–268.5 (64) | 198 | 390 / 844 |
| 1280×720 | 578–636 | 640–708 (68) | 578–642 (64) | 508 | 720 / 1280 |

- Home Start bottoms: 521 / 488 / 203 / 517. These are visible at all four sizes, including short landscape. At 320 and 1280, only optional help text below Start scrolls, which is allowed by item 4.
- No horizontal overflow, and the earlier 16 px desktop overflow is gone.
- During COLLAPSING, Drop and the nudge buttons are hidden and a single Skip button is shown. The canvas rectangle is identical between AIMING and COLLAPSING (1280: 393 px both). After Replay, Drop returns and Skip is hidden.
- Copy with zero cats: "3.20 left of the floor center · overlap 12% · Will miss the platform"; failure reason "Missed the platform." Top-cat wording after the first cat is shown in Developer's 844×390 chain screenshot and covered by `tests/browser.test.ts`. The visual, announcement and results paths share the `onFloor`/`cats.length` branch. Engine enum and math are unchanged.
- Architect viewed screenshots 844×390 Assist chain and 320×568 collapse; they are readable, unclipped, and show one Skip action.

Measured vertical positions at 390 differ by a few px from Developer's because of chain/notice phase differences. Every one is within the viewport.

## Not independently confirmed

The resize-pause check in normal mode was inconclusive in this headless tab: frame-gap throttling raised the "frame rate" pause and masked the resize source. Code review shows that a playfield size change of 1 px or more pauses at the event, that canvas sizing is deferred, and that capture mode is excluded. This matches Developer's report, but the Architect did not observe it directly. Physical devices, real 200% zoom, safe areas, a named screen reader, Firefox/Safari and real frame timing remain unrun.

## Next

CT-TEST-002 (Playtester, exact build above): retest prior findings 1–5 from CT-TEST-001 at the four sizes, run a focused keyboard/pointer/Pause/Replay smoke test, and confirm no regression in core flow or tuxedo art. Report only, with no code changes. After it passes, the Architect closes M2 and specifies M3. No M3, profile, audio, release, migration or restart is authorized by this review.

Writes: this document, `checks/m2l-acceptance.json` and the README status line. Tests regenerated the ignored `app/.test-build`. No code, asset or server change.

## Update — M2 closed

Independent CT-TEST-002 (Playtester message `16926fde-825b-4c91-a9da-205ca5d4be52`, [report](../evidence/ct-test-002/CT-TEST-002-report.md)) passed findings 1–5 at all four viewports and the full smoke test. It also confirmed what the Architect could not: in normal mode, resizing 1280×720 → 1100×680 paused exactly once with the layout reason, and AIMING → COLLAPSING produced zero ResizeObserver entries. No new issues were found. The exact “Centered on the floor” string is reachable only by source inspection, because Assist spawns at ±3.2 and nudges move 0.26, so the nearest reachable offset is 0.08. This is accepted: the copy path is unit-tested. **M2 is closed** within the checked-browser limits; device, screen-reader, Firefox/Safari, real zoom and real frame-timing gaps remain. M3 is specified in [17](17-m3-durable-shell.md).
