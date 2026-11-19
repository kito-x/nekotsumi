# Implementation milestones and delegation

## Current assignment status — 2026-11-16

**Current:** first-readiness CT-DEV-004CR accepted on92-test main-CWm7_RHt.js. User selected soft local effects through OG; CT-DEV-005 in [23](23-local-soft-effects.md) covers authorized quiet cues/mute/volume, no optional cues/music/voice/provider charges. Independent final audio review also includes readiness checks. Prior local performance stages remain closed; device/speech/browser/release/migration gates unchanged.

**Current:** Developer reaction inventory and Studio sound proposal reviewed in [22](22-candidate-gaps-and-sound-brief.md). CT-DEV-004CR is the only new production task: combine mode/start with first actual Ready, once/run. Existing selection semantics accepted, optional flourishes deferred. Sound direction routed to OG for user choice; no audio implementation/generation authorized. Local M4B remains closed; speech/device/browser/release/migration gaps unchanged.

**Current:** local M4B closed after independent CT-TEST-005 PASS; compression report reconciled via GET/HEAD, no production changes. Next bounded tasks in [22](22-candidate-gaps-and-sound-brief.md): Developer non-audio reaction coverage inventory and Studio proposal-only sound direction. No audio creation/implementation, new paid call, release or migration authorized. Earlier entries below are history.

**Current:** CT-DEV-004BR accepted:92 tests independently pass, corrected served hashes match, actual resize boundary rerun passes. Independent CT-TEST-005 scope is in [21](21-m4b-audit-review.md). M4B awaits independent review; M3/M4A closed, audio/device/release/migration gaps unchanged. Earlier entries below are history.

**Current:** CT-DEV-004B audit delivered and local datasets reviewed. Bounded CT-DEV-004BR in [21](21-m4b-audit-review.md) corrects backing-canvas rounding over the2M-pixel cap and adds cap-stress measurement/clear partial gate labels. Independent follow-up awaits correction review. M3/M4A closed; no audio/release/migration scope added. Earlier entries below are history.

**Current:** M4A closed after independent CT-TEST-004 PASS; Architect rechecked unchanged production hashes. CT-DEV-004B is specified in [20](20-m4b-performance-audit.md): isolated1,000-cat engine/renderer/transfer audit and candidate gap ledger, no production source/build changes. Audio, device validation, release and migration remain separate. Earlier statuses below are history.

**Current:** M4A + CT-DEV-004AR Architect-accepted on main-DroJ0HWb.js, 91 tests independently pass and live OS-change override/renderer recheck passes. Independent CT-TEST-004 is specified in [19](19-m4a-review.md). M4A awaits that review before closure; M4B/audio/release not started. Earlier status entries below are history.

**Latest:** CT-DEV-004A delivered; Architect reran 91 passing tests and confirmed served hashes. Acceptance is pending CT-DEV-004AR in [19](19-m4a-review.md), a reproduced OS-change motion-override bug; no M4B or independent M4A test yet. Earlier statuses below are historical.

**Current:** M3 closed after CT-DEV-003F Architect acceptance and independent CT-TEST-003 PASS on main-BR7cBzJj.js. [17](17-m3-durable-shell.md) records evidence and limits. Next bounded implementation is CT-DEV-004A in [18](18-m4-presentation-polish.md): landing reactions/expression priority and announcement/toast lifecycle. This is a non-audio M4 slice, not full M4 or release acceptance. Audio direction/content remains unapproved. Earlier assignment statuses below are history.

Latest: M2 closed after Architect acceptance of CT-DEV-002L and independent CT-TEST-002 pass. CT-DEV-003 (M3 durable shell: profile/lock/degraded modes, records, unlocks, collection, settings, tutorial) specified in [17](17-m3-durable-shell.md) and delegated. Audio and sound controls remain M4.

Latest: independent review received, CT-DEV-ART-004 local integration accepted,66 tests independently pass. Bounded CT-DEV-002L responsive-layout/support-copy follow-up is specified in [15](15-independent-review-and-layout.md) before M3. This tightens standard-size initial visibility while retaining zoom/small-window scroll fallback. No gameplay redesign or new user decision required.

Latest: CT-DEV-002R accepted (independent65 tests/build and browser reproductions); CT-DEV-ART-004 exact tuxedo integration delegated after user variant approval. See [14](14-m2-correction-and-art-review.md). Independent playtest and integrated art checks pending; M3 remains unassigned.

M2 delivery received from Developer,64 tests/build independently pass; review and correction CT-DEV-002R plus Studio legibility/independent playtest tasks are specified in [13](13-m2-review.md). M2 acceptance is pending these bounded code corrections; production-02 complete technical acceptance is pending legibility evidence. M3 remains unassigned.

**Update: CT-DEV-001R accepted and M2 start gate released.** Architect independently reviewed the fix and reran57 passing tests/typecheck, direct original/mirrored reproduction and benchmark. See11 and checks/m1r-acceptance.json. Developer may begin the already specified CT-DEV-002 in12; earlier start-gated statements below are historical. Browser/asset checks remain outstanding; no expansion to M3 or public release.

CT-DEV-002 is specified in [12](12-m2-browser-slice.md) and queued to Developer in message `7734a4c7-71d3-48f0-8c10-7181f3d43b3b`, expectsReply:true. It covers M2 local browser slice plus production-02 loader/technical verification; it does not start M3/M4 in full. **M2 implementation remains gated on Architect's explicit acceptance of CT-DEV-001R.** Earlier statements that M2 is unassigned are superseded by this queued assignment; no correction acceptance or browser result is claimed here. Production-02 appearance is now approved according to OG message `b841ecef-6d81-4617-8581-01dea8682966`, card `da2ee7c6-c1ca-4fa5-9751-4a7032501511:approve`; technical checks remain pending. See12 for scope and the current floor/background mapping.

The repository uses a persistent shared workspace. No separate VPS relocation is required.

The Architect owns the design, with implementation, art and playtesting owned by their respective roles.

## Milestones and dependencies

| Milestone | Deliverable / scope | Dependencies | Gate |
|---|---|---|---|
| M0 Specification baseline | This document set and arithmetic review | Authorized user brief | Cross-document review and fixtures consistent |
| M1 Pure engine | Types/config, seeded motion, states, placement/COM, scoring, generation guards, deterministic checks | M0 | AC01,03–07 domain portions, core AC08/09 cases |
| M2 Playable local placeholder | Loopback app with Canvas/DOM, controls, Home/game/pause/results, both modes, clear reactions | M1 | AC02,08,09,14 available-browser portions; no external required resources |
| M3 Durable MVP shell | Profile service/lock/degraded mode, records/unlocks/collection/settings/tutorial | M1+M2 | AC10–13,15; exact save cases and settings |
| M4 Art/polish integration | Reviewed exports in approved Cats + Sunroom A direction, audio/camera/expressions/accessibility/performance refinements | M2+M3; production-export technical review | AC14–19; provenance and actual measurements |
| M5 Independent candidate review | Playtester findings, Architect conformance review, fixes and limitations | M3; M4 for art-complete release | No unresolved critical gameplay/save/input failures; user visual approval |
| M6 Public release | Approved host/domain and release procedure | M5 + explicit user release authorization | Separate approval; not delegated now |

Milestones are dependency gates, not time promises. M1 is the first delegated implementation task. Developer must stop at that task's boundary and report before Architect assigns M2; do not infer authority for the entire roadmap from receipt of these specs. Architect reviews returned tests/code against the stated rules.

Delegation record: CT-DEV-001 sent in message `6c3b3106-a2e4-46b7-b7a2-f7ac306d5bf8`. Result received in `00da06d3-3e91-4326-aece-19413cf417ef`: pure engine implemented, no browser shell. Architect independently reran52 passing tests but reproduced a missed EPS-boundary failure; M1 acceptance is pending bounded correction CT-DEV-001R in [11](11-m1-engine-review.md). M2 remains unassigned until correction review. Studio received the full asset contract location in informational message `1cb329bf-8688-4c07-b02e-adb569299c83`, following the earlier requirements request. Update 2026-11-16: Studio supplied concept sources; OG relayed user selection of Cats + Sunroom A. Production requirements are in08; runtime exports have not yet been reviewed. This update does not expand Developer's M1 assignment.

## Task CT-DEV-001 — pure simulation foundation

Goal: implement M1 in `app` with the smallest local toolchain necessary to run deterministic tests. Read README and documents01–06 first. Inspect runtime, repository/instruction state and available dependencies. Create a clean app package if absent; do not overwrite user files. No public repository push, deployment, paid API, Studio final-art lock, system-runtime install or additional agent delegation. If no compatible JavaScript runtime is available, a project-local portable Node/toolchain from its official distribution is within this local development task: verify the downloaded artifact checksum against official release metadata, pin/report versions, keep it out of source/build artifacts and do not alter system configuration. Report any actual network/security rejection rather than bypassing it.

In scope:

1. `src/domain/{types,balance,rng,placement,score,engine}.ts` and minimal strict TypeScript/build/test configuration. The engine includes Classic+Assist, cues/falling/settling/collapse/pause/results, synchronous lifecycle controls, immutable snapshots, generation guards and typed events. Browser rendering is outside this task.
2. Complete config exactly as gameplay doc; pure placement function must check every support via reverse suffix load accumulation. Include default floor, pre-snap grading and correct failure classification. No physics framework substitute or silently simplified balance.
3. Meaningful domain tests using fixtures1–13 and key state scenarios in06: duplicate/old inputs, pause/resume counters, no repeated score on results/replay, seed repeatability, mode period behavior and top-only misses. Use a compatible available runner and lock reproducible dependency versions; report command evidence.
4. Brief implementation README with file map, actual versions/commands, test output summary, design ambiguities and anything not implemented. No rendered playable build claim at M1.

M1 review acceptance: pure modules compile/typecheck, tests pass, no DOM/storage/audio imports in domain, fixtures including old-floor COM failure pass, emitted placement event is exactly once, no live RNG consumption by presentation, public methods cannot silently mutate prior published snapshots. Make repeated1000-cat fixture computationally linear per evaluation; a timing report on VPS is useful but is not phone validation.

Return to Architect: absolute paths; concise behavior/result; actual commands/exits/counts; any deviations/questions; no claims based on unrun tests. If a spec ambiguity affects behavior, ask Architect before changing that behavior; implement independent unambiguous parts meanwhile. Do not start M2 until Architect sends its bounded assignment after review.

## Planned follow-on assignments (not yet assigned)

CT-DEV-002: M2 browser vertical slice, placeholder renderer/DOM/input/loop/lifecycle, local-only preview and available-browser checks. CT-DEV-003: M3 profile/settings/tutorial/collection and fault checks. CT-DEV-004: M4 polish and approved art integration. Architect may combine or split later tasks based on reviewed foundation; scope changes will be explicit.

Studio early task (historical): coordinate already authorized art-option work, deliver geometry/manifest/provenance requirements and user-facing options; that message did not authorize paid calls or make a final selection. Architect message `f9dc56cb-1523-46f4-a6ee-5491c83bb612` supplied initial bounds. Current task CT-ART-002: prepare Cats + Sunroom A production exports under08 and05; sent in message `286cc073-e016-4406-b8d7-490469b0923e` with `expectsReply:true`, queued. Original production-01 response has been received: 21 SVGs/8,849 bytes, statically checked; runtime tests remain pending. User subsequently selected new Grok cats + original Gemini Sunroom A under card4d1b1697-f83d-4b3c-8f54-bf2b9fe7b9b4:select, superseding production-01 as final appearance. Selected-source runtime assets are still pending. Keep art replaceable while Developer builds. No new paid/audio/public-release authority is added.

Playtester assignment occurs after M2/M3 has a real runnable app. Provide this acceptance document plus exact loopback access/start command and build identifier. Do not ask Playtester to validate a game that does not exist. Physical-device or service access gaps must be reported, not inferred as passing.

## Reporting and approvals

Architect sends OG document paths, design defaults, remaining user choices and Developer/Studio status. Development delegation uses `openbot.send_message` with `expectsReply:true`; results are reviewed before follow-on scope. OG/user decide final art, any consequential product direction change, new charges and public release. No blocker exists for local placeholder M1 from unfinished art/audio/hosting. Responsive desktop/mobile browser delivery first is a confirmed user decision; native packaging remains a later phase. xAI/Grok provider selection is resolved, while audio content approval and new charges remain separate. See01 for the dated user-decision record.

## Asset verification addition — 2026-11-16

CT-DEV-ART-VERIFY-001 is specified in [10](10-art-integration-verification.md) and delegated to Developer with expectsReply:true, message `6e0fc5c9-47b8-4c2b-8afd-fc5b38618e52` (queued). New selection clarification sent in `8ea4985e-52a6-41d2-a4e3-5fb9d3757008`. Finish current bounded work first; browser checks depend on the engine gate and browser shell. This does not start unrelated milestones. Accepted SVG faces need no PNG conversion absent an actual decoding problem. Verify provisional loader/anchor/layout behavior on production-01 and repeat visual/decoder checks on the future selected-source pack. No completed browser result is claimed.

CT-ART-003 is specified in08 and delegated to Studio with expectsReply:true in `b5134127-57cb-4edd-9bb6-d7017f1f4e22` (queued), superseding the earlier cat master under existing local production authorization. It prepares the new selected-source runtime pack without new provider calls/charges and avoids duplicating any same-scope work already underway for OG. No new exports have been received yet.

## M1 correction gate — 2026-11-16

[11](11-m1-engine-review.md) specifies CT-DEV-001R and resolves all seven Developer questions. Follow-on M2 is prepared in scope only; no authority to begin it before correction review. CT-DEV-ART-VERIFY-001 remains browser-dependent and queued. Studio delivered production-02 as an unapproved12-SVG adaptation draft; appearance and technical reviews are separate.

CT-DEV-001R dispatch: `546a8eff-d5a8-4acf-933a-b57cf9be0bc2`, expectsReply:true, queued. Art preview-only ID correction to Studio: `8443c773-5b49-48d0-a3b2-60f14f2ba939`. Material-adaptation review routing to OG: `a37fcb64-faee-4516-839f-f24591e8ff3a`. No M2 assignment or completed browser validation in this update.

## Browser access

The public build is available at [nekotsumi.singleton.sh](https://nekotsumi.singleton.sh). For a local build, follow the [app setup](../app/README.md).
