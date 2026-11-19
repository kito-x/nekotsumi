# Nekotsumi — implementation design v0.1

Status: implementation-ready prototype specification; balance values are initial tuning values, not playtest findings. Created 2026-11-15 UTC. Owner: Nekotsumi Architect.

## Start here

1. [Product, scope and decisions](01-product-decisions.md)
2. [Gameplay, balance and state rules](02-gameplay-rules.md)
3. [High-level architecture](03-hld.md)
4. [Low-level design, contracts and persistence](04-lld.md)
5. [UX, action/reaction matrix and asset requirements](05-ux-assets.md)
6. [Acceptance criteria and test scenarios](06-acceptance.md)
7. [Implementation milestones and delegated work](07-implementation.md)
8. [Selected art direction and production handoff](08-selected-art-production.md)
9. [Project workspace](09-project-relocation.md)
10. [Asset reconciliation and renderer verification](10-art-integration-verification.md)
11. [M1 engine review and correction handoff](11-m1-engine-review.md)
12. [M2 browser slice and production-02 technical checks](12-m2-browser-slice.md)
13. [M2 Architect review and bounded corrections](13-m2-review.md)
14. [M2 correction acceptance and tuxedo integration gate](14-m2-correction-and-art-review.md)
15. [Independent review and bounded responsive-layout follow-up](15-independent-review-and-layout.md)
16. [CT-DEV-002L layout acceptance](16-m2-layout-acceptance.md)
17. [M3 durable MVP shell (CT-DEV-003)](17-m3-durable-shell.md)
18. [M4 non-audio presentation polish (CT-DEV-004A)](18-m4-presentation-polish.md)
19. [M4A review and motion override correction (CT-DEV-004AR)](19-m4a-review.md)
20. [M4B local performance and candidate audit (CT-DEV-004B)](20-m4b-performance-audit.md)
21. [M4B audit review and canvas cap correction (CT-DEV-004BR)](21-m4b-audit-review.md)
22. [Remaining reaction coverage and sound proposal brief](22-candidate-gaps-and-sound-brief.md)
23. [Authorized quiet local effects, mute and volume](23-local-soft-effects.md)
24. [Audio implementation review and reliability corrections](24-m4d-audio-review.md)
25. [Native failure-branch correction review](25-m4d-correction-review.md)
26. [Audio correction acceptance and independent validation](26-m4d-acceptance-and-independent-validation.md)
27. [Independent audio review and remaining validation limits](27-m4d-independent-review.md)

These documents record the design and implementation milestones for [Nekotsumi](https://nekotsumi.singleton.sh). The repository uses a persistent shared workspace. No separate VPS relocation is required.

Latest selection, 2026-11-16: Studio reports user card `4d1b1697-f83d-4b3c-8f54-bf2b9fe7b9b4:select` chose **new Grok cats + original Gemini Sunroom A**. Architect read [selection.json](../art/comparison-02/selection.json), which records `visual-direction-approved-runtime-assets-pending` and exact source paths. Production-01 was delivered and earlier appearance-approved under `4594228a-c9b8-47e0-91e7-dfe9d4dd6c06:approve`; it is now superseded as final appearance, not awaiting its first review. Its 21 SVGs remain a provisional renderer test pack. Final selected-source runtime adaptations still need preparation and technical checks. No new user art question is pending. See [reconciliation and verification task](10-art-integration-verification.md). Responsive desktop/mobile browser delivery remains first. SVG faces are accepted subject to renderer checks; xAI/Grok provider verification remains Studio-reported. No new charges, audio or release is authorized.

## Authority and constraints

OG message `1f2ff18f-8185-4e5c-9c41-443589e097da` relays user authorization: “ask the Nekotsumi architect to design the HLD LLD in details ... rules and everything ... start its work ... let's go start the work.” OG requests detailed specifications, early Studio coordination and bounded Developer implementation after specifications. This activates the next-task condition in the setup instructions.

Authorized: local design and implementation with placeholders, Studio coordination, local builds and checks, and preparation of production assets in the user-selected Cats + Sunroom A direction within Studio's existing authorization. This specification grants no new paid-service, public-deployment or external-posting authority. Materially new visual choices require user review. Architect decides routine design/engineering details; Developer raises ambiguities rather than changing rules independently.

## Reading and change control

- `01` separates supplied user direction, Architect defaults and decisions still requiring user approval.
- `02` is authoritative for gameplay math. `04` translates that math to code contracts. If they conflict, stop that affected implementation and ask Architect; do not silently choose a variant.
- Numbers are centralized under `BalanceConfig` in implementation. A tuning change increments `balanceVersion`; save schema and balance versions are independent.
- All MVP criteria in `06` are required for a release candidate. Individual milestones have smaller gates in `07`.
- Present builds as prototypes until Playtester validates and the user approves the visual direction and public release.

## Main decisions

- Endless one-cat-at-a-time rounds, one failed placement ends a round, immediate replay.
- Fixed-size cats and deterministic support/center-of-mass checks; wobble and collapse are presentation, not hidden randomness.
- Classic timing mode and separate Assist mode with stationary positioning controls and separate records.
- Canvas 2D playfield, semantic HTML menus/controls, TypeScript and Vite; no runtime game framework or physics dependency required.
- Local browser profile with best records, cumulative placements, three cosmetic unlocks and settings. No login or backend in MVP.
- Art and audio have safe placeholders. No runtime AI calls, generated voices, telemetry, ads, payments, cloud saves or leaderboards.

## Remaining work and parked decisions — updated 2026-11-18

OG handoff `9596164c-fd48-4080-b293-fb256e687060` requests this current ledger. These are open checks/decisions, not new implementation assignments or authorization to release, rename or migrate.

| Item | Current status / completion evidence needed |
|---|---|
| Sound-reel listening | Actual listening still unverified; Studio's review was source-only. Use the exact reel and `art/audio-review-01/listener-guide.txt` for a real auditory check. |
| Genuine hide/blur | Still partial. Requires real tab/window visibility/focus changes; synthetic ordinary-page blur only verified handler wiring. |
| Physical phone / touch / safe-area | Real-device controls, touch, notch/safe-area, smoothness and audio autoplay/latency remain unverified. Emulated viewport checks do not close this item. |
| Firefox / Safari | Browser-specific input, rendering, audio, storage and lifecycle checks remain open. |
| Named screen reader / zoom | Actual speech and real zoom/reflow checks remain open; DOM semantics and focus checks are not speech evidence. |
| Held-lock recreation | Prior lock lifecycle is not reproduced or fixed; natural release during testing is not a reproduction. No lock stealing is authorized. |
| Cloudflare Pages launch | Complete. [Production game](https://nekotsumi.singleton.sh). The device, browser and accessibility checks above remain open. |
| In-app Nekotsumi rename | Complete in the production build. |

Separate previously tracked selected-source art adaptation/technical-verification gates are not closed by audio testing or this handoff; see 10/27 and the art records for their evidence.

OG also relays user feedback that Nekotsumi lacks a reason to return and that the user is considering new mini-game concepts with stronger retention. This is **context only**: no retention redesign, new concept design, code, asset production or implementation delegation is assigned. Await the user's chosen concept and explicit follow-on scope through OG.

## Accepted local review baseline


**Latest: CT-TEST-006 accepted as five PASS / one PARTIAL, no product defect, on main-5_s3JvDQ.js (137 tests pass). Available local M4D implementation/testing is complete; genuine hide/blur delivery and actual listening remain unverified, alongside device/speech/wider-browser gaps. See [27](27-m4d-independent-review.md); this is not full M4D/release acceptance. First-readiness and local M3/M4A/M4B remain accepted. Authorization remains [23](23-local-soft-effects.md): local effects/mute/volume only; no music/voices/providers/charges/release.**
Cross-document review and model-level verification are recorded in `design-review.md`. Build tests, real-device checks and playtest evidence must come from Developer/Playtester and must not be inferred from this document set.

The earlier `cat-tower-design-v0.1.zip` is a historical snapshot. Current live documents01,05,07–10 and checks/art-pass-01-static.json carry the newer selection, delivered-pass reconciliation and workspace status.

## Latest implementation review — 2026-11-16

**Current: independent CT-TEST-001 report and integrated art result received; core/approved tuxedo integration accepted within available-browser limits.** Architect independently reran66 tests/typecheck and reproduced clipped Assist/Skip/Home controls. CT-DEV-002L in15 specifies focused responsive-layout/support-copy cleanup before M3; no new physics/art choice/release scope. Earlier “await independent report/art integration” statements are historical. Real-device/accessibility/browser gaps remain explicit.

**Current: CT-DEV-002R accepted after independent65-test/typecheck/build review, startup-stall recheck and controlled DOM key gate check.** Exact CT-ART-004 tuxedo variant has OG-relayed user appearance approval and Architect technical acceptance for integration; Developer's app integration and independent Playtester report are pending. See14. Earlier pending-core/pending-appearance statements are superseded; no M3/release/migration started.

**Latest: M2 playable local prototype received and independently reviewed; acceptance pending bounded correction CT-DEV-002R in13.** All64 tests/typecheck and build pass. Deterministic Assist landing/failure/results flow and normal headless interruption pause independently checked. Reproduced indefinite optional-art startup stall; landscape Drop target is56px versus64px required; tuxedo80px faces need legibility cleanup. Studio and independent Playtester follow-ups are specified in13. No M3/release/migration authority added. Earlier “no playable build” statements are superseded; no normal-device smoothness is verified.

**Current: M1 correction accepted; M2 start gate released.** Architect independently verified57/57 tests/typecheck, direct original/mirrored failure reproductions and benchmark; see11 and [evidence](checks/m1r-acceptance.json). Developer may begin the bounded browser slice and production-02 checks in12. No playable browser result exists yet. Production-02 appearance approval is OG-reported; technical acceptance remains pending. Earlier pending-engine paragraphs below are history.

M1 engine received; Architect independently reran52 passing tests and reproduced an untested tolerance-boundary defect. Correction CT-DEV-001R is specified in11; Architect acceptance remains pending. M2 is specified in12 and queued to Developer, with implementation gated on explicit acceptance of that correction. OG reports production-02 appearance approval under card `da2ee7c6-c1ca-4fa5-9751-4a7032501511:approve`; technical decoder/80px/layout checks remain unrun. Earlier paragraphs describing selected-source assets as undelivered or appearance approval as pending are historical; see10/12 for current status. Active root and deferred migration are unchanged.
