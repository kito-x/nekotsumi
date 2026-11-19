# Acceptance criteria and verification plan

Status vocabulary: specified ≠ implemented ≠ automated-tested ≠ browser-tested ≠ device-validated ≠ approved for release. Developer reports each applicable status honestly. No game implementation was tested by writing this plan.

## Acceptance gates

| ID | Required behavior | Evidence / gate |
|---|---|---|
| AC01 | From Home a new Classic/Assist round starts, one incoming cat exists, release gated 9 ticks | Engine tests and visible browser flow |
| AC02 | Tap/click/Space/Enter drop exactly once; held key, double tap, extra finger and UI clicks cannot release a later cat | Input checks and manual touch/keyboard flow |
| AC03 | Fixed-step vertical crossing resolves at the top support; missing top cannot rescue on a lower cat | Engine fixtures at 60 Hz and visual miss |
| AC04 | Correct snap/perfect thresholds using pre-snap offset; scoring once per stable commit | Boundary unit fixtures below |
| AC05 | Every support's load COM checked, inclusive safe boundary and deterministic failing joint | Pure math fixtures and debug weak-joint display |
| AC06 | Ordinary/perfect/chain scoring and failure award rules match formula | Unit fixtures; event replay duplicate check |
| AC07 | Period ramp matches configuration; frame rate/audio/skin cannot change outcome | Seeded action replay at 30/60/120 render Hz |
| AC08 | Hide/blur/resize/interruption pause immediately; exact state resumes only via fresh gesture | Fake clock/lifecycle tests plus actual tab/resize checks |
| AC09 | Replay clears old generations, effects and held keys; no leaked listener/timer multiplication | 50 restarts check and stale-command fixture |
| AC10 | Mode-specific bests, cumulative placements, thresholds and selected skin persist on refresh after committed landing | Profile tests and real localStorage flow |
| AC11 | Malformed/future/oversized save preserved, unsupported storage/lock and second-tab cases are explicit temporary mode | Injected adapter cases and two-tab browser test |
| AC12 | A save/asset/audio failure never changes a placement result or blanks game | Failure injection and fallback check |
| AC13 | Complete keyboard flow; focus trap/restore; no native-button double input; understandable Assist alignment | Manual keyboard and one named screen reader |
| AC14 | At 320px, 390×844, desktop and short landscape, critical UI remains usable; safe areas and zoom respected | Screenshots/layout checks; physical device for safe area |
| AC15 | Reduced-motion removes nonessential movement, mute stops voices, text/icon feedback conveys danger/results | Settings checks, OS preference emulation and manual check |
| AC16 | Cosmetic unlocks do not alter geometry, score, fall or support; final assets approved before release | Same-seed multi-skin replay and manifest review |
| AC17 | Performance/transfer budgets in `01`/`03` measured, including 1,000-cat fixture | Build sizes and named-device timings; no generic “fast” claim |
| AC18 | Fresh local build/typecheck/tests pass; app has no required external request, API key or backend | Commands, network inspection, repository README |
| AC19 | All action/reaction states have readable placeholder behavior; actual face/audio exceptions listed | Reaction matrix walkthrough |
| AC20 | No paid service, external post or public deployment performed | Handoff lists local outputs and explicitly states no release |

## Pure-rule fixture values

Use config W=2.6, H=W/1.55, floorWidth=4.4, M=.104, EPS=1e-9. Positions below are *final* x unless specified. Bottoms follow index×H. Fixtures are synthetic domain states, not claims about player-achievable random outcomes.

1. **Centered floor landing:** empty tower, releaseX=0. Stable perfect, finalX=0, height1, score15, safety1 (intersection width2.6); y clamps0. One placement event.
2. **Snap boundary:** support center0; releaseX=.208 (`.08W`) snaps0. releaseX=.208+1e-6 does not snap. Both are perfect and can be stable. EPS values within tolerance must not oscillate across the boundary.
3. **Perfect boundary:** valid centered support, releaseOffset=.312 (`.12W`) perfect; .312+1e-6 ordinary, if otherwise stable. Grading uses releaseOffset even after snapping.
4. **Exactly local overlap minimum:** top support center0, candidate x=1.43; overlap1.17=.45W. Passes the local overlap test but fails newest-contact COM because 1.43>1.196. Failure is `UNSTABLE_TOWER`, not `MISS_TOP`. Candidate x=1.430001 fails local overlap and is `MISS_TOP`.
5. **Local COM boundary:** existing cat center0; candidate x=1.196. New-contact right safe edge is1.196. It passes (other contacts also pass). x=1.196+1e-6 fails COM while local overlap remains >.45W. x=1.196 has zero safety and danger feedback, not an immediate random collapse.
6. **Older floor fails:** existing cat center1.8 is individually floor-stable. Candidate x=2.6 has local offset.8 and overlap1.8; newest contact is stable. Floor load COM=(1.8+2.6)/2=2.2 exceeds floor-contact safe edge2.096. Fail `UNSTABLE_TOWER` at joint1; candidate earns nothing. This specifically catches implementations checking only the newest pair.
7. **Clear miss:** existing top center0, candidate x=3.2; no positive overlap; `MISS_TOP`. Do not evaluate collision against a lower cat later.
8. **Three centered perfects:** scores15→32→51, heights1→2→3, chain1→2→3, totalPerfect3. A stable ordinary release at offset.4 awards10 and resets chain; next perfect awards15. Failure after either gives0.
9. **Chain cap:** perfect chain6 gives25 points; chain7 also25. Six consecutive centered perfects total120 points (15+17+19+21+23+25). Maximum score per successful cat is25.
10. **Period:** n1=5.2 s; n26=4.2; n51=3.2; n1000=3.2. Higher display refresh does not advance more simulation time.
11. **Default fall:** y0=2.6 above target, vy0=0; semi-implicit 60 Hz first crossing is step28; y clamped to contact top. At step27 bottom still above plane. Test large-render-frame sequencing separately from fixed dt.
12. **Mirror symmetry:** negating every x should preserve pass/fail and score, reversing failure direction except exact ties. Same-state evaluation must not mutate input cats.
13. **Whole-tower accounting:** at 1,000 centered cats, stable result and safety1; run in O(n), no recursive stack and no per-frame all-history scan. Adding an unstable offset must still examine lower contacts.

`checks/verify_model.py` is an Architect-side reference arithmetic check of these design fixtures. It is not the Developer engine and cannot prove implementation or browser behavior.

## State/input scenarios

- Start with empty profile → tutorial → dismiss → cue → aim → drop → settle → next cue → fail → Results → Replay. No tutorial close/replay gesture drops a cat.
- Queue two Drop commands for same spawn, then a Nudge: at most one release, no nudge while falling. Queue an old-spawn drop after next spawn: ignored. Drop at cue tick8 ignored; fresh Drop after cue tick9 valid.
- Hold Space through a successful landing and new spawn: new cat keeps aiming. Focus Drop button and press Space: exactly one native activation. Press Space on Settings/Resume: no gameplay release.
- Pause during cue, aiming, mid-fall, settling and collapse; check x/y/vy/phaseTicks/tick frozen for ten wall seconds. Resume returns to exact saved phase and timers. Hide again while already paused preserves original resume state.
- At foreground frame gap251ms auto-pause; at 100ms execute no more than5 ticks, discard extra backlog. On resume next tick is1/60, not accumulated wall time.
- Click Skip during collapse: one Results transition, no score mutation. Resize during collapse pauses and redraws without recomputing failure.
- Pause→Restart→Cancel returns Pause; confirm starts a new run with a new ID and increments roundsStarted once. Earned placement totals remain. Pause→Home does not finalize another award.

## Persistence scenarios

- Save profile after centered placement, reload: best15/height1/total1 preserved, active run not restored and no award duplicated. Start another round increments roundsStarted once.
- Deliver the same placement event twice: one counter increment. Deliver old-run event after Replay: ignored. Missing ordinal is an internal error with no synthesized score.
- totals24→25,74→75,149→150 unlock precisely one new coat. Threshold already reached on load unlocks silently. Selecting locked/unknown skin normalizes/rejects safely.
- Classic best score does not overwrite Assist best score; balances are namespaced. Best height/score may belong to different runs and are correctly labeled.
- Storage getter/setter throws, lock API absent, malformed JSON, schemaVersion99, negative stats, excessive64KB input, unsupported enums. Preserve invalid raw data and use temporary mode; do not crash/reset durable profile.
- Two same-origin tabs: first lock owner saves; second displays temporary/retry choices and cannot write. Close first, second retries and reloads durable profile before becoming owner. If second already played temporarily, do not merge its temporary deltas silently; require a fresh Home session when acquiring save access. Cancel/retry must not erase the first profile.

## Browser, accessibility and device checklist

Developer checks in available local browser: Home/game/pause/results/collection; pointer and keyboard; profile refresh; no unexpected network; console errors; build transfer budget; reduced-motion; storage faults; two-tab lock; canvas fallback. Playtester independently repeats core flow, reports named browser/device, tests physical touch and audio policies where available, and notes anything unavailable.

Manual browser/device evidence must explicitly cover 320px width, 390×844 portrait, 844×390 landscape, desktop, 200% zoom, focus visibility, modal Tab loop, mute, high contrast, system motion preference, phone app switching, orientation change and iOS/Android interaction if devices are available. An emulated viewport is not physical-device validation. At least one screen-reader pass includes Assist nudge feedback and Results; do not claim broader accessibility compliance from keyboard-only checks.

Performance test: documented device/browser/build, warm30s run, record p95/p99 frame times and p95 engine tick time; 1,000-cat fixture; observe50 restarts for retained listener counts/continued growth. Use profilers sparingly; do not turn normal game into a telemetry collector.

## Playtest questions and tuning process

Measure whether first-time players understand Drop/top-only support, whether first five cats are achievable, whether instability failures are predictable, and whether Replay feels immediate. Proposed target: most first-time testers understand controls after the short prompt; balance targets need real participants before numerical pass thresholds are adopted. Ask for failure explanation before showing debug math. Log changes to balanceVersion and rerun AC03–AC07 after any rule/tuning update. Art changes require geometry/contrast/readability checks but must not silently change physics.

## Added regression14 — tolerance must not hide a failed contact

Use existing cat x=`1.498+0.95e-9` and candidate x=`existingX+1.196+0.5e-9`, releaseOffset=candidate-existingX. The newest contact margin is approximately -0.5EPS (passes), the floor margin approximately -1.2EPS (fails). Expect UNSTABLE_TOWER at joint1, direction+1. Mirror both coordinates and expect direction-1 with the same failing joint. Test raw minima separately from tolerance-based index selection, including passing contacts near a failure and failed-contact ties. See [M1 review](11-m1-engine-review.md).
