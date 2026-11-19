# Gameplay, balance and state rules

All values below are initial balance v1. Seconds are simulation time unless labeled UI/wall time. Coordinates use world units: x right, y up; a cat position is its bottom-center. The floor top is y=0.

## Round loop and invariants

Start creates a seeded round with no placed cats. Spawn one incoming cat above the highest settled cat (or floor). Player chooses drop timing in Classic or x position in Assist. It falls vertically, resolves against the highest settled support only, and either settles or ends the round. A committed stable placement awards height/score/progress once, waits briefly, then spawns the next cat. No timer forces a drop. New records remain earned if a later drop fails.

At most one incoming cat exists. There is no steering after release, no horizontal momentum after release, no slicing and no rescue by catching a lower ledge. An incoming cat that misses the top ends the round even if its visual fall crosses lower cats. Those lower cats are not collision candidates. Tutorial and failure copy must explain “aim for the top cat.”

Settled logical cats do not drift, rotate, bounce or shrink. Wobble is bounded visual feedback on top of fixed logical positions. Input, render quality, cosmetic choice and audio settings cannot change outcomes. A failed candidate does not increment height or cumulative placements.

## Initial configuration

| Parameter | Value |
|---|---|
| Stage x range | -5 to +5; fixed logical width 10 |
| Cat width W / height H / mass | 2.6 / W÷1.55 (=1.6774193548…) / 1 |
| Floor center / width | 0 / 4.4 |
| Incoming horizontal amplitude A | 3.2 (center x range [-3.2,+3.2]) |
| Classic period at next placement n | max(3.2, 5.2 - 0.04×(n-1)) seconds |
| Spawn gap G | Incoming bottom is 2.6 above support top |
| Gravity / initial vertical speed | 24 world units/s² / 0 |
| Drop x | Frozen from current logical incoming x on release |
| Minimum local overlap | 0.45×W (inclusive with numerical tolerance) |
| COM safety inset M | 0.04×W = 0.104 at each contact edge |
| Perfect pre-snap offset | abs(incoming x - support center x) <= 0.12×W |
| Snap range | abs(offset) <= 0.08×W; snap exactly to support center |
| Landing presentation lock | 0.22 seconds; no next spawn before this completes |
| Minimum visible spawn cue before input | 0.15 seconds |
| Collapse / result transition | 1.2 seconds; reduced motion 0.2 seconds |
| Assist nudge step | 0.10×W = 0.26; clamp center to [-A,+A] |
| Numerical tolerance EPS | 1e-9 world units |

n starts at 1 and equals current settled height+1. Physics step is 1/60 second. Spawn cue, settle and collapse durations round up to integral ticks (9,14,72 ticks; reduced collapse 12 ticks). Precompute `H` consistently from configuration; no rounded 1.68 in simulation.

## Incoming motion and controls

Classic: x = A×sin(phi); phi advances by 2π×dt/period(n) in SPAWN_CUE and AIMING. Set initial phase on each spawn with the seeded RNG from the discrete choices {-π/2,+π/2}, starting at a travel edge, not a random advantage near the target. Motion starts during the 9-tick cue but release remains gated until tick 9. The incoming cat's bottom y stays supportTop+G until release. The shadow/guide indicates its logical x on the support plane.

Assist: initial x is the same seeded ±A edge; there is no automatic horizontal movement. Left/right nudge x by ±0.26, clamped to ±3.2. Each press nudges once; held key repeat is allowed at the browser's repeat frequency only for nudges. Label the signed difference from support center, local overlap and prospective balance after snapping in accessible text. Do not announce every animation frame.

Drop freezes x and sets falling vertical speed=0. Snap eligibility is calculated from the release offset; use the final snapped x for the entire fall and collision prediction. The visual snap tween can take <=80 ms but cannot delay or alter logical falling x. Perfect grade uses the pre-snap release offset, never the changed value after snap. First-floor target center is x=0.

There is no input buffering into a later cat. Every input command includes the active run/spawn generation; commands for an old generation are discarded. Dropping before cue completion, during falling, settling, pause, collapse, summary or on a UI overlay does nothing. A held drop key cannot release the next cat. Multiple simultaneous pointers issue at most one drop.

## Falling and contact

Use semi-implicit Euler each tick: vy -= gravity×dt; y += vy×dt. Incoming bottom starts at supportTop+G. If previous y >= supportTop and next y <= supportTop, resolve the contact this tick at y=supportTop (swept vertical crossing). At 60 Hz this takes 28 ticks with the default values. Do not integrate through the plane and then use pixel overlap.

Support is cat k-1 for candidate k, or floor for k=1. Cat k bottom y=(k-1)×H; support top is the same. Settled IDs and indices are monotonic within the run. Cat bodies are axis-aligned logical intervals [x-W/2,x+W/2]. Floor interval is [-2.2,+2.2]. Let the current contact interval be intersection J=[max(lefts),min(rights)], length L=max(0,J.right-J.left).

1. If L+EPS < 0.45×W: fail `MISS_TOP`; show a falling/slipping incoming cat and begin collapse presentation.
2. Otherwise provisionally append the candidate and evaluate every supporting contact as below.
3. If any contact fails, remove the provisional candidate without awarding points; fail `UNSTABLE_TOWER` and mark the weakest failing contact.
4. If all pass, commit once, update records/progress, emit landing grade and stability, then enter SETTLING.

## Tower balance — center of mass (COM)

For each contact j (j=1 at floor under cat1; j=k under the candidate), the load is all cats j..k inclusive. Their center of mass is Cj = sum(x_i×mass_i)/sum(mass_i). For this MVP all masses are 1. Contact Jj is the intersection of cat j and its support; the floor is used for j=1. Safe interval is [Jj.left+M, Jj.right-M]. Stability requires Cj >= left+M-EPS and Cj <= right-M+EPS for **every** contact.

This models load balance without a free-running physics solver. No per-tick probability, hidden wind or spontaneous collapse exists. No tower load changes while aiming. A later placement can fail at an older contact because it changes that contact's aggregate load. Tests must cover this, not just the newest overlap.

Compute signed safety margin sj=min(Cj-(Jj.left+M),(Jj.right-M)-Cj). normalized safety qj=clamp(sj / max(EPS,(length(Jj)-2M)/2),0,1). A failed contact has sj < -EPS. Update the true raw minimum without EPS suppression: any failed contact ends the round. Failure selection considers failed contacts only; choose the lowest index whose margin lies within EPS of the true minimum failed margin. Anchor tolerance to that global minimum, not a chain of pairwise near-ties. Report the selected contact's actual margin/direction. For a stable placement, towerSafety is the exact min(qj); choose the lowest passing contact index within EPS of that minimum as weakestJoint. An optional second reverse O(k) pass for joint selection is permitted; no quadratic work. See11 for the reproduced boundary defect and correction.

Visual danger: calm if towerSafety>=0.35, caution if >=0.15 and <0.35, danger if <0.15. Stable near-edge drops are allowed, including zero safety within EPS; they visibly warn. The outgoing player guidance for Assist derives from a hypothetical candidate at its current snapped x using these exact checks. In Classic a simple support-center guide is enough; do not promise the local target is globally safe.

Implementation uses one reverse traversal accumulating mass and weighted x; it evaluates all contacts in O(k) once per landing or requested Assist preview. Keep full logical history; no discarding old support checks. Per-frame work only touches visible sprites and current motion. Target stress case 1,000 settled cats; do not claim literally unbounded device memory. There is no designed victory cap. Revisit performance before adding background dynamic physics.

## Score, records and progression

- Every stable placement: height+1, cumulative placements+1, base score+10.
- Perfect if pre-snap abs(offset)<=0.12W+EPS **and** placement is stable: perfect chain increments; award +5+2×min(chain-1,5). First perfect=15 total points, second=17, third=19, sixth and later=25.
- Stable ordinary placement: 10 points; perfect chain resets to 0.
- Failed drop: no height, score, perfect chain or placement progress added. Existing score remains.
- Perfect is geometric alignment with the immediate support, not a guarantee that the full tower is stable.
- Records: independent maximum score and maximum height per mode, updated after each committed landing; they may come from different runs. Results show both and mark the record(s) improved in this run compared with the baseline at start. Ties are not new records.
- Totals: cumulative placements and perfect placements combine both modes; local only. No currency or spending. All skins have identical gameplay properties.
- Unlock IDs/thresholds: default free; `ginger` at 25 cumulative placements, `tuxedo` at 75, `calico` at 150. Unlock immediately on crossing; queue one toast per newly unlocked ID, no modal interruption. Cosmetics are selectable only from Home/Results/Collection and apply on next run. Reaching several thresholds at load reveals all earned skins without replaying old toasts.
- Rounds started increments when Start/Replay successfully creates a new run; opening Home or tutorial does not count. Reload abandons the live run but preserves committed stats. No daily reward or artificial scarcity.

## State transitions

| Current | Event / guard | Next | Effects |
|---|---|---|---|
| BOOT | profile validated, default visuals ready | HOME | Display storage warning if needed |
| BOOT | canvas unavailable | UNSUPPORTED | HTML explanation, no fake start button |
| HOME / RESULTS | Start or Replay | SPAWN_CUE | New run ID, seed, records baseline, increment roundsStarted, create incoming |
| SPAWN_CUE | 9 ticks | AIMING | Enable drop; keep same cat/phase |
| AIMING | valid Drop | FALLING | Freeze/snap x, emit release |
| AIMING | Nudge in Assist | AIMING | Update x and alignment preview |
| FALLING | contact and passing checks | SETTLING | Commit points/save once; present grade |
| FALLING | contact failing checks | COLLAPSING | Emit failure once; freeze scoring |
| SETTLING | 14 ticks | SPAWN_CUE | New generation, next cat |
| COLLAPSING | timer or Skip | RESULTS | Summarize; no extra score/save transaction |
| SPAWN_CUE / AIMING / FALLING / SETTLING / COLLAPSING | Pause / hide / focus loss | PAUSED | Store exact resume state and counters; suspend audio |
| PAUSED | Resume and document visible | saved state | Zero wall-clock accumulator; require fresh action |
| PAUSED | Restart confirmed | SPAWN_CUE | Abandon run, preserve earned progress, new run |
| PAUSED | Home confirmed | HOME | Abandon run, preserve earned progress |
| HOME / RESULTS | Collection, Help, Settings | same parent | HTML modal; gameplay input isolated |
| Any shell state | fatal engine error | ERROR | Stop loop, retain last committed profile, offer Reload/Home if safe |

Hide while already paused does not overwrite resume state. Hide on HOME/RESULTS stops decorative activity and audio, no gameplay PAUSED state needed. Changing mode requires a new round; cannot turn Classic into Assist mid-run. Settings may change while paused and cannot alter logical geometry or timers. Resize/orientation changes pause an active round, recompute viewport, then require Resume; no change to world positions. A first valid tick after resume uses only dt, never time elapsed in background.

## Wobble, collapse and edge cases

On each stable landing, set a presentation impulse based on local offset and danger; a damped visual lean indicates instability but never changes contact math. Near-danger towers maintain a small periodic visual sway. The maximal rendered lateral displacement is 0.04W; maximal tilt is 2°; no frame may visually turn a logically obvious miss into a hit. Show the weakest joint marker/outline and danger text where practical. Reduced motion removes sway, camera shake, confetti and cat spin but retains color-independent text/border feedback.

Collapse: detach at the failing joint; animate at most 20 visible/relevant cats with seeded ballistic arcs and soft squash. Below-joint cats may remain in place until transition. Incoming cat takes a surprised/dizzy face; no injury or distress sounds. A miss shows the dropped cat slip out before a short shared wobble; it still ends the round. Presentation can simplify on slow devices, but never changes the recorded failure reason. Skip only advances to Results, not Replay.

Refresh/navigation loses active play by design. Storage error never resets an in-memory round. Rapid replay destroys old input generations, timers and effects before new state. Muting mid-effect stops current voices. Escape pauses active play; Escape on a modal dismisses that modal first; Escape on Pause remains paused. On keyboard focus leaving the application window, auto-pause. Do not capture Space/Enter from buttons, dialogs or text inputs to also drop a cat.
