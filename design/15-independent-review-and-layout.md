# Independent M2 review, art acceptance and CT-DEV-002L

Architect,2026-11-16. Active root `repository root`. **Core M2 and CT-ART-004 local art integration are accepted within checked-browser limits. Independent CT-TEST-001 review is received. A bounded layout/copy follow-up CT-DEV-002L is required before M3.** This is not full MVP/release acceptance or physical-device validation.

## Evidence and reconciled status

Playtester result `5face302-1701-4145-a717-6f385516a0fd` and [independent report](../evidence/ct-test-001/CT-TEST-001-report.md) cover Classic/Assist/input/score/pause/focus/Replay/reduced motion/fallback and the integrated tuxedo variant. Detailed report correctly distinguishes earlier CRI core checks from final CrK smoke/art checks and shared CSS. Do not summarize this as every action independently rerun on CrK. Synthetic held-key/lifecycle events and capture-mode ticks do not establish physical/native input or real frame pacing.

Developer result `c814ee7f-32e8-45a4-9544-77ff5fa2c455` completes CT-DEV-ART-004: exact approved1586-byte variant, preserved original/faces, separate variant approval metadata, drift-protection test and actual deviceScaleFactor2 diagnostic capture alongside downsampled2x backing. Architect viewed supplied DPR1/2/transform screenshots; expressions/pivot are readable. Architect independently reran `npm test`: typecheck/compile exit0,66 pass,0 fail,147.33ms. Independent static integrity/build checks are recorded in [review evidence](checks/m2-independent-review.json).

Final reviewed main-CrK_-WtQ.js SHA256 `c6cfa64e2aa534a186cd875ca78b37e3eb207e4987fd4471d33488ac85cf46d8`; CSS scene-DUsJrOXr.css `db5ab21c5779d02ec1efceb6de0a65a7c0115b87e6bd7628642f1df7ed919d84`.12 mapped SVGs/9317bytes;13 physically retained SVGs/10739bytes. Developer has now refreshed app/M2-EVIDENCE.md to this build/variant/66tests, so Playtester's earlier stale-evidence finding is resolved, not a new correction request.

## Independently reproduced layout gaps

Architect used the actual served app in four same-origin viewport-sized iframes, explicit capture mode and DOM measurements. Frames were removed afterward. This is controlled layout evidence, not physical-device testing. At100% CSS scale:

| CSS viewport | Aiming readout bottom | Drop bottom | Collapse Skip bottom | Home Start bottom |
|---|---:|---:|---:|---:|
|320×568 (client305)|600|542|592.16|530.5|
|390×844 (client375)|864.16|806.16|868.16|493.5|
|844×390 (client829)|458.16|419.16|419.16|473.28|
|1280×720|724.16|682.16|708|516.5|

Collapse vertical positions at320 differ slightly from Playtester's capture because flex/layout phase geometry differs; both show Skip off the initial viewport. No score/placement mismatch found. Source `formatOffset`/`assistPrediction` always says top cat, including zero-cat spawn.

Earlier12 allowed shell scrolling at short landscape. These findings are usable with scrolling and do not invalidate the already accepted66-test/core/art work. The following task intentionally tightens standard-size first-view usability; it is a routine responsive-layout decision, not a newly discovered physics defect or a claim that prior criteria banned all scrolling.

## CT-DEV-002L — bounded responsive layout and wording

Developer implements under existing local-browser scope. No M3/profile/audio/unlocks, art restyle, balance/physics change, public release, paid service, migration or restart. Preserve approved pack/variant and66 existing tests. No new browser framework.

1. **Reserve actual viewport space for guidance/controls.** At320×568,390×844,844×390 and1280×720,100% CSS scale and zero initial scroll, aiming shows the whole HUD/Pause, mode/temporary notice, complete Assist offset+overlap+prediction, Drop and Assist nudge controls. Drop remains>=64px, other actions>=44px. Text wraps naturally at readable size; do not hide prediction, truncate essential words or suppress notices to force a fit. Use an explicit viewport-height budget with playfield as the shrinkable region rather than allowing canvas intrinsic height to push controls below the fold. Avoid resize/observer loops and repeated automatic pause from layout-only phase changes.
2. **Short landscape arrangement:** use a compact HUD plus playfield and a side control/readout area if needed, rather than stacking every element below a fixed210px playfield. Routine CSS/grid choices are Developer's implementation details; preserve meaningful DOM/focus order. Portrait may use compact rows. Canvas still uses worldWidth10, worldHeight>=10 via existing square/letterbox projection; changing CSS canvas size changes scale only. Keep floor, incoming full travel/ears, support/top and camera visible/readable. Do not change spawn height, coordinates, timing or collision space. Body80px diagnostics remain a separate fixed-scale acceptance check.
3. **Collapse primary action:** explicitly refine earlier retained-disabled-Drop layout: during COLLAPSING, replace Drop/nudge controls with one visible primary “Skip to results” button>=64px. Disabled Drop and nudges may be hidden and excluded from focus while collapse is active; they reappear on Replay/new active aiming. Keep failure reason and HUD/Pause readable. This prevents an off-screen second action row without adding a gameplay action or changing collapse duration. At the four standard viewports, Skip is fully inside the initial viewport after transition; no forced page scroll or focus jump is required. Pause/Results focus semantics remain unchanged.
4. **Home short landscape:** compact decorative spacing/title and mode-card arrangement so mode selection and Start are fully visible at844×390 without scrolling. Keep Start>=44px and instructions available. No need to force all optional diagnostic/help text above the fold.
5. **Support-aware copy:** zero-cat offset says “Centered on the floor” / “3.20 left/right of the floor center”; zero-cat MISS_TOP prediction says “Will miss the platform”. Once at least one cat is placed, retain top-cat wording. Keep exact offset/overlap/support math unchanged. Apply the same wording to the visual readout and polite nudge announcements, not just one text path. Engine failure enum stays MISS_TOP; failure reason may use support-aware display copy without changing scoring/state. Home instructions can say “Aim for the platform, then the top cat.”
6. **Overflow boundaries:** at the four specified baseline sizes normal aiming/collapse primary controls and complete prediction must fit initially; tolerate<=1px rounding only, with no hidden horizontal overflow. Preserve shell scrolling as fallback at200% zoom, larger user text, smaller windows and real safe-area constraints. Do not disable browser zoom/scroll or claim actual200% zoom from CSS viewport emulation. Prefer eliminating the observed16px desktop overflow via correct height budgeting rather than overlaying controls on canvas.

## Verification and return boundary

Developer dispatch: `0a81eddc-5fcd-4706-8dc1-04aa3babe00e`,expectsReply:true,queued. Playtester received review outcome in `eb0abeb7-c864-4014-a214-3fb4005b2e31` (informational; focused retest will be assigned after corrected build delivery).

Run typecheck/tests/build once after the change. Add only meaningful copy/regression checks where warranted; no broad duplicate test framework. Record DOM rectangles and screenshots for Home, Classic AIMING, Assist AIMING, COLLAPSING and Results at all four sizes, including active chain HUD. At zero scroll, require relevant rectangles to be within viewport (top>=0,bottom<=innerHeight+1,left>=0,right<=clientWidth+1), Drop/Skip64px minimum and no clipped prediction text. Verify transitions do not create resize-pause loops, true viewport resize still pauses once, and camera/travel/floor projection remains unchanged in logical units. Capture mode and normal lifecycle checks must stay separated.

Repeat focused keyboard/pointer/Replay smoke and confirm skin/physics parity remains green. Preserve66 existing tests and art-integrity check. Return build hash, source changes, exact commands/exits/counts, measured viewport/client dimensions/rectangles, screenshots and remaining gaps; refresh M2-EVIDENCE with the actual current bundle. Stop after this task; Architect reviews before M3. Independent Playtester will recheck the corrected build once delivered, not race an intermediate build.

## Remaining limits and writes

Physical touch/safe areas/devices, named screen reader, Firefox/Safari, actual browser zoom and normal-device frame timing remain unverified. Mid-collapse motion preference hook remains later M4. Architect review wrote this document/check JSON/status links and regenerated ignored app/.test-build via npm test; no code/assets, build/server/config or migration change.
