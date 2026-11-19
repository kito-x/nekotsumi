# Product, scope and decisions

## Supplied direction

The user wants cute cats stacked into a tower. The user explicitly confirmed a responsive browser app first for desktop and mobile browsers; native Android/other packaging is a later phase. OG's authorized brief adds quick tap-to-drop rounds, wobbles, expressive cats, funny collapses, records and unlocks. Architect owns detailed gameplay and technical decisions; Developer implements; Studio prepares art/audio; Playtester independently checks behavior. Work runs on OpenBot's VPS. Gemini is intended for images. OG reports that the user selected xAI/Grok and Studio verified its saved key; Architect has not independently verified any provider key or connection. No audio has been generated according to that report.

These are directions, not evidence that integrations or infrastructure work.

## Confirmed user decisions — updated 2026-11-16

- **Production-02 appearance:** OG message `b841ecef-6d81-4617-8581-01dea8682966` relays user approval via card `da2ee7c6-c1ca-4fa5-9751-4a7032501511:approve`, explicitly disclosing flatter Grok-cat vectors and simplified original Gemini Sunroom. Architect has not independently inspected the card. This approves appearance, with small-size/browser/layout checks outstanding; no spending/audio/release authority. Earlier pending-adaptation statements are superseded. See12 for queued technical implementation and its engine gate.

- **Development workspace:** The repository uses a persistent shared workspace. No separate VPS relocation is required.
- **Browser first:** OG message `884523e8-d29b-453d-b274-5d87841fc2f0` relays the user's explicit words: “browser app first and then Android or anything ... First ... browser app.” The initial deliverable is the responsive browser application, including desktop and mobile browsers. Native Android/other packaging is later work. This platform order is confirmed, not an Architect assumption.
- **Provider selection:** OG message `7498214b-61e7-4032-9d12-7ca5e8294af4` confirms the user's xAI/Grok selection and relays Studio's key-verification report. Selection does not approve any particular audio content or new charges. Architect did not inspect the key and does not independently certify integration readiness.
- **Selected visual direction:** OG message `4b698ce0-9d98-4a0e-9ae7-101059f93d39` relays the user's review of three previews and selection of **Cats + Sunroom A**. This supersedes the earlier request for more options. Use the Cats A rounded loaf silhouettes, cocoa outlines and cream/peach/sage palette with Sunroom A. Remove oval bases/contact shadows from bodies, tuck upright tails and separate the platform. Studio may prepare production assets within its existing authorization; materially new visual choices return for user review. Selection approves the direction, not uninspected runtime exports, additional charges or public release. See [production brief](08-selected-art-production.md).

Latest selection, 2026-11-16: Studio reports user card `4d1b1697-f83d-4b3c-8f54-bf2b9fe7b9b4:select` chose **new Grok cats + original Gemini Sunroom A**. Architect read [selection.json](../art/comparison-02/selection.json), which records `visual-direction-approved-runtime-assets-pending` and exact source paths. Production-01 was delivered and earlier appearance-approved under `4594228a-c9b8-47e0-91e7-dfe9d4dd6c06:approve`; it is now superseded as final appearance, not awaiting its first review. Its 21 SVGs remain a provisional renderer test pack. Final selected-source runtime adaptations still need preparation and technical checks. No new user art question is pending. See [reconciliation and verification task](10-art-integration-verification.md).

The cat/background source choice is recorded. Continue local implementation with replaceable assets and fallbacks while Studio prepares the selected-source runtime pack; Developer/Architect own renderer and visual checks. Public launch remains a later approval gate.

## Product goal

Within a few seconds of opening the game, a player can understand “drop this cat onto the tower.” A successful landing should feel soft and satisfying; a risky landing should visibly explain its danger; a collapse should be funny and invite another round. Skill is timing and keeping the tower balanced, with no hidden random failure. Initial expected session: several 20–90-second rounds; this is a design target to validate, not a promise or measured result.

## MVP scope

Required screens: Home, How to play, live game, Pause/Settings overlay, Results, Cat collection. A single static application includes Classic and Assist modes, a short dismissible tutorial, scoring, independent mode records, local progress, one default cat and three unlockable cosmetic bodies. One quiet background/environment is enough. Shapes and procedural sound are acceptable prototype assets.

Classic: one moving cat, tap/Space/Enter to drop, tower grows, instability ends the round. Assist: stationary cat adjusted with left/right controls, same drop and balance rules, no time pressure. It is explicitly an easier separate mode; no implication of identical skill difficulty.

Out of MVP: multiplayer, accounts, server leaderboards, competitive fairness enforcement, cloud sync, purchases, currency, daily quests, energy, ads, revives, power-ups, varied cat masses/sizes, live weather, variable-width slicing, level map, native packaging, app-store delivery, PWA/offline installation, voice generation and runtime AI. These are future options, not committed requirements.

## Architect defaults — approved for prototype implementation, not user preference claims

| ID | Default | Reason / consequence |
|---|---|---|
| D01 | Endless rounds; failure on one unsupported/unstable landing | Clear loop and useful local record; no lives or revival UI |
| D02 | Controlled stacking model with world-space support and center-of-mass checks | Reproducible and tunable; not a rigid-body simulator |
| D03 | Identical logical cat width, height and mass | Cosmetically fair; avoids surprising art-driven collisions |
| D04 | Perfect drops get a small explicit snap and score bonus | Forgiving timing and readable skill reward |
| D05 | All previous contacts participate in stability checks | A top placement can tip a visibly leaning whole tower |
| D06 | Local-only profile, no active-round restore after refresh | Small scope; record/progress checkpoints survive committed placements |
| D07 | Automatic pause when tab hides; explicit resume | Returning to a phone/browser cannot silently lose a round |
| D08 | Sound unlocked only by interaction; settings persist | Browser-safe and controllable; audio is not needed to play |
| D09 | Assist controls and reduced-motion settings | Access for users who need more time or less animation |
| D10 | No automatic restart, no forced sound, no failure punishment | User chooses replay; progress is never spent |
| D11 | TypeScript, Vite, Canvas 2D and semantic DOM | Small dependency surface and reusable simulation |
| D12 | Cosmetic bodies: default, ginger, tuxedo, calico IDs | Working IDs; map four selected Cats A coats without changing physics or adding unlocks; public names/branding remain working labels |

## Approval status and recommendations

**No current user question or approval blocks local browser implementation.** The user selected new Grok cats + original Gemini Sunroom A; runtime adaptation and technical review remain team work.

| Topic | Current status / recommendation | Blocks current work? |
|---|---|---|
| Selected-source production art | Source choice recorded in selection.json: new Grok cats + original Gemini Sunroom A. Studio runtime adaptations pending; production-01 is superseded as final appearance. Material visual departures return for review | No; local work uses replaceable assets |
| SVG faces, anchors, contrast, 80 px legibility and landscape crop | Architect accepts the SVG delivery format subject to runtime checks; validate locally with fallbacks | No user approval required |
| Branding/names | Keep working labels for MVP; ask only if a concrete consequential change is proposed | No |
| Voice/music or additional paid calls | Not part of current implementation; retain optional procedural cues and no voice. Obtain content/cost approval before any future proposal is executed | No; gates only that future action |
| Public host/domain and public release | Prepare a tested candidate first, then obtain explicit launch approval; no deployment from this brief | No; gates public release |
| Monetization, paid infrastructure, native packaging or expanded modes | Defer outside browser MVP; obtain scope/cost decisions only if commissioned | No |

If the user later wants fully emergent rigid-body balancing or a different core loop, Architect revises these specs before Developer substitutes a physics engine. Prototype implementation can proceed with D01–D12.

## Platform and quality targets

- Design viewport: portrait 390×844 CSS pixels. Supported layout range: 320 CSS px wide through desktop; short landscape gets a compact layout, never a forced rotation screen.
- Initial browser matrix to validate: current and previous major Chrome/Edge/Firefox desktop; current and previous major iOS Safari; current Android Chrome. This is a target matrix, not verified compatibility.
- Touch, mouse and keyboard provide all gameplay/menu actions. Visible focus, screen-reader labels and textual state feedback are required. Timing game parity for blind players is not claimed; Assist offers deliberate placement and readable alignment/stability feedback.
- Target smooth 60 fps on a representative mid-range phone; 30 fps remains usable without simulation speed changes. Verify on named devices before claiming compliance.
- Prototype startup code budget: <=200 KB gzip JS+CSS excluding assets; release first-load transfer <=2 MB; default cat/background ready without optional skins or audio. These are gates to measure.
- No external fonts, required third-party requests or personally identifiable data. No analytics unless separately approved.

## Risks and responses

| Risk | Response / evidence needed |
|---|---|
| Tower stability feels surprising | Visible danger gauge, endangered joint cue; Playtester near-edge scenarios |
| Controlled wobble looks too artificial | Art/transform polish after core rules pass; never disguise gameplay changes as art |
| Classic too fast for touch users | Gentle speed ramp and Assist; measure early-round success rate |
| Approved art does not fit body rectangle | Explicit content/collider bounds and fixed transform contract; Studio feedback before integration |
| Storage blocked or corrupted | Safe defaults, session-only fallback, visible notice, no crash |
| Runtime/dependency mismatch on VPS | Developer inspects installed versions and locks compatible tooling; no infrastructure claims now |
| Audio/device behavior varies | Play silently on failure; manual autoplay/visibility checks |
| User has another intended game direction | Mark defaults clearly; show a placeholder local prototype for review before polishing |
