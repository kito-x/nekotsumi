# M4A — presentation and announcement lifecycle (CT-DEV-004A)

Architect, 2026-11-16. Active root `repository root`. M3 is closed in [17](17-m3-durable-shell.md); independent [CT-TEST-003](../evidence/ct-test-003/CT-TEST-003-report.md) passed. Existing local-browser implementation authorization covers this bounded task. Developer implements, reports ambiguities to Architect and stops for review before further M4 work.

## Baseline and scope

Baseline:82 tests, served main-BR7cBzJj.js SHA256 `2f4f6dfc31fa2da3e671b365c9a44fb36db88fbca63fedb3f1a3a937a40cad11`. Preserve gameplay, score, balanceVersion1, profile schema/transaction rules, Web Lock ownership, art files/mapping/hashes, layout and normal interruption behavior. Follow [05](05-ux-assets.md) action/reaction rules where clarified below.

This task fixes small presentation conformance gaps found during Architect source review:
- `renderer.ts` clears its landing effect on the next `spawned` event, before its advertised0.5s happy face can finish; happy is also selected before danger/worried.
- Tower landing transforms provide sway/tilt but no ordinary landing squash/recovery, despite the reaction contract.
- `main.ts` uses untracked30ms live-region writes and260/450ms deferred announcements. A later transition cannot cancel stale work. Toast handoff callbacks also outlive their initiating context. This is a source-level stale-callback risk, not a claim that Playtester reproduced an accessibility failure.

No new assets, restyling, physics, balance, progression, dependencies, sound/audio controls, paid calls, provider integration, backend, public release, git commits/pushes, relocation, container changes or unrelated service restart. Keep the app silent. Full M4 performance/device/audio acceptance is not part of this task.

## 1. Landing and expression behavior

Use renderer-owned presentation time, advanced only while play advances; never wall-clock time for a cat effect. Preserve the existing pure engine/event boundary.

- A stable landing gives only the newly settled cat a small squash around its existing bottom-center anchor: identity at0ms, scaleY0.94 and scaleX1/0.94 at100ms, return to identity at240ms. Linear interpolation is sufficient. No position/collider/mass/score change. Keep existing sway/tilt within existing bounds.
- Reduced motion has identity squash/stretch, no particles, sway or shake, and immediate required camera positioning. Text and static expression cues remain. Collision/fall timing is unchanged.
- Happy lasts up to0.5s of active presentation time on the landed cat; spawning the next cat must not prematurely clear it. The next real landing replaces the previous effect; failure/Results/new round clear it. No unbounded effect history.
- Expression priority: failure/dizzy > falling/surprised (incoming cat only) > danger/worried > landing/happy > aiming/focused > idle. Retain the existing danger threshold (`safety <0.15`) and affected top-three-cat scope. A dangerous perfect landing must show worried instead of happy; perfect text/points still appear.
- Perfect uses at most the existing six stars; ordinary has no perfect stars. Do not add art, extra celebration, delays or camera effects. Preserve the approved tuxedo overlay mapping and fixed geometry.

Suggested implementation: a small pure presentation helper for effect age/transform/expression, reused by renderer and tested with actual event transitions. Avoid testing private implementation details or adding a framework.

## 2. Announcements and toast lifetime

Keep one polite atomic live region. Text updates are announcements requested from assistive technology, not evidence that speech finished. Fixed260/450ms waits cannot guarantee a screen reader completed earlier speech.

- Centralize pending live-region writes so pending timers are tracked and cancellable. A message scheduled for an old run/screen must never overwrite a later Results, Home or new-run message. Give callbacks a context/generation guard in addition to clearing timer handles.
- A landing and newly unlocked cats from that landing form **one concise message**: keep grade/points/height/score and append the newly unlocked cat names. Remove the separate delayed unlock announcement for that same event. No duplicate announcement on Results/reload; Results still summarizes the round.
- A write-failure notice stays visible and is announced once per session. When a synchronous profile failure coincides with a landing/start, include it in the same announcement or queue it through the centralized service without losing the gameplay summary. Do not retain the untracked450ms timeout or guess speech completion. It is session-scoped, so a run reset must not erase an undisplayed failure notice permanently.
- Failure, Results, explicit Home and new round cancel obsolete gameplay/nudge/unlock messages. Rapid Assist nudges coalesce to the latest offset/overlap/prediction at the existing maximum1 update per300ms while held; no frame narration. Pause/resume retain meaningful current context and cannot let an old nudge replace the pause/resume message.
- Unlock toasts remain non-modal, pause their display timer during Pause, and do not take focus. Starting/restarting a round or returning Home clears prior-run toast queues, active display timer and pending handoff timer; no late toast from an abandoned run. Results cards retain unlocks from the completed run. On entering Results, clear live-play toasts after preserving those cards so they do not cover Results or repeat announcements.
- Cancel both pending30ms content writes and any higher-level delayed work. No normal-play URL switch or debug setter may corrupt the real save; no lock stealing or change to Retry behavior.

## 3. Verification and return

Add focused regression tests using the existing runner and injectable clocks/schedulers, without introducing a new test framework:

1. Effect transforms at0/100/240ms; reduced-motion identity. Happy survives a next-spawn event until0.5s, then clears; danger and failure override it; reset clears effects. Pure geometry/state input is unchanged.
2. Delayed old-run message cannot appear after Results/Home/new run; rapid nudge leaves latest feedback at bounded cadence; landing+unlock requests one combined message; write failure is announced once and survives context changes appropriately; abandoned toast handoff cannot show again.

Run `npm test` (includes typecheck) and `npm run build` once after final edits; preserve all82 baseline tests. Report actual counts/exits, changed paths and any deviations.

Available-browser checks on the final served build:
- Deterministic ordinary, perfect, dangerous stable landing and failure cases, normal and reduced motion; capture expression/effect timing through controlled render steps, not headless wall-clock smoothness claims.
- Land at a threshold then immediately Pause/Results/Replay/Home: no late prior-round announcement/toast, correct stored total and Results card, next run starts with zero cats. Repeat quickly enough to cover pending callbacks.
- Keyboard Home→tutorial→play→Pause→Settings→Results→Collection; preserve focus traps/restore, native-button input and tutorial close no-drop.
- At320×568,390×844,844×390,1280×720 preserve Home Start/modes, AIMING Drop≥64px, full Assist text, COLLAPSING Skip, Results Replay, modal reachability, no horizontal overflow. Existing allowed secondary/internal scroll remains valid. Recheck normal/high-contrast affected text.
- Recheck50 restarts for no retained announcement/toast timer growth, stable engine/loop/listener/lock counters; all resources loopback and JS+CSS gzip≤200KB. No storage beyond disposable test profiles; clear the test profile at the end.

Write `app/M4A-EVIDENCE.md` and screenshots under `evidence/m4a/`: baseline/final build hashes, commands/counts, effect samples, message sequences with context, timer/counter results, rectangle measurements, screenshots and explicit not-run list. Keep the loopback preview detached on port4177 as before. No claim of named-screen-reader speech or physical-device behavior from DOM observations.

Return to Architect and stop. Architect reviews before independent testing or CT-DEV-004B. The later slice will measure1,000-cat rendering, server timing/budget and remaining action/reaction coverage; real-device/zoom/screen-reader/browser-matrix evidence still needs an actually available environment. Audio remains separate until direction/content authorization is resolved.

## Tracked, not changed by this task

CT-TEST-003's one stale-lock observation is unconfirmed and environment-specific. Do not add automatic lock takeover or use `steal:true` in app code. Report a normal-lifecycle reproduction if encountered, with steps and raw-save preservation, for a separate Architect decision.

The active root stays in Shared.

## Delegation record

CT-DEV-004A sent to Nekotsumi Developer through OpenBot message `ebe56ae3-ad75-4dcd-9324-285b063a0dc0`, expectsReply true. Awaiting implementation and evidence; this document is specification, not a claim of completed polish. OG informed through message `3d463646-b633-4d25-9a7d-a49c5e51fe70`.

## Review status

Developer delivered CT-DEV-004A in message `3ba1f3ba-e2e9-4746-a7f8-32bf698bab12`. Architect independently reran 91 passing tests and verified served hashes, but reproduced an explicit Reduced setting being overridden by a later OS media-query change. Acceptance is pending CT-DEV-004AR in [19](19-m4a-review.md); independent test assignment follows correction review. This supersedes the waiting-for-initial-implementation status above. No M4B started.

Update: CT-DEV-004AR accepted after Architect's live media-query/renderer-probe recheck and 91 passing tests on main-DroJ0HWb.js. M4A is Architect-accepted and awaits independent CT-TEST-004 under [19](19-m4a-review.md). Earlier correction-pending status is historical; M4B remains unstarted.
