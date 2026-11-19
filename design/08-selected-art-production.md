# New Grok cats + original Gemini Sunroom A — production handoff

Current status, 2026-11-16: OG message `b841ecef-6d81-4617-8581-01dea8682966` reports appearance approval of the production-02 flatter vector cats and simplified Sunroom under card `da2ee7c6-c1ca-4fa5-9751-4a7032501511:approve`. Architect has not independently inspected that card. Earlier pending-adaptation statements below are superseded; technical decoder/anchor/80px/layout acceptance remains outstanding. [12](12-m2-browser-slice.md) queues Developer's browser shell and current-pack checks after explicit Architect acceptance of engine correction CT-DEV-001R. No new art generation, source-choice review, spending, audio, release or migration is required/authorized by this update.

Date: 2026-11-16 UTC. Owner: Architect; production owner: Studio.

## Current approval and format update

Latest selection, 2026-11-16: Studio reports user card `4d1b1697-f83d-4b3c-8f54-bf2b9fe7b9b4:select` chose **new Grok cats + original Gemini Sunroom A**. Architect read [selection.json](../art/comparison-02/selection.json), which records `visual-direction-approved-runtime-assets-pending` and exact source paths. Production-01 was delivered and earlier appearance-approved under `4594228a-c9b8-47e0-91e7-dfe9d4dd6c06:approve`; it is now superseded as final appearance, not awaiting its first review. Its 21 SVGs remain a provisional renderer test pack. Final selected-source runtime adaptations still need preparation and technical checks. No new user art question is pending. See [reconciliation and verification task](10-art-integration-verification.md).

For production-01, accept standalone local SVG bodies and 128×128 SVG faces in place of the PNG exports below; this is a routine format decision, subject to browser decoding/alignment checks. Accept the declared 576×1024 SVG backdrop with responsive crop validation. Logical body geometry, common pivot and face UV remain unchanged; declared face render width is 0.45W, within the 0.50W limit. Asset loading must remain replaceable and retain placeholders on failure. Do not alter physics or infer colliders from alpha.

Appearance/source approval does not establish technical conformance. Production-01 static inventory, byte budgets, declared geometry and archive/runtime identity passed Architect checks: 21 SVGs, 8,849 bytes. Studio confirms decorativeBoundsPx uses [xMin,yMin,xMax,yMax] and is a conservative authored envelope including stroke, not measured alpha extents. Developer must still check actual painted bounds, transparent edges, body/face alignment at80px, dark-coat contrast, decoding and portrait/landscape. No browser integration result has been received. These are team checks, not pending user questions. See10 for mapping, queued task and evidence. Original PNG requests below are historical export targets; accepted local SVG variance does not approve a new style adaptation.

## Earlier decision and production corrections

OG message `4b698ce0-9d98-4a0e-9ae7-101059f93d39` reports that the user reviewed three attached previews and selected **Cats + Sunroom A**. That direction is approved. Reference sources: [Cats A](../art/review-01/cats-A.png) and [Sunroom A](../art/review-01/background-A-sunroom.png). Studio owns original prompts/receipts and provenance in that directory. Architect inspected both sources; they are concept boards, not runtime-ready sprites.

Current style masters are new Grok cats and original Gemini Sunroom A, as recorded in selection.json. Preserve the selected cat identities, broad loaf silhouettes, tucked paws/tails and the warm original sunroom. Earlier Cats A references below are historical, not the current cat master. Remove each oval base and baked contact shadow; tuck upright tails within the silhouette envelope. Extract body and face layers independently. Remove any original face from the body before supplying overlays. Separate the painted floor/platform from the backdrop. Soften architectural lines behind moving/stacked cats. These are production corrections within the selected source pair. Material changes to style, palette, silhouettes or environment return to user review through OG.

The existing four cosmetic IDs and unlock thresholds stay unchanged: `default` uses cream, `ginger` orange, `tuxedo` the charcoal reference, `calico` patchwork. These are internal IDs; do not add tuxedo markings merely to match the ID. Names remain working labels. Plum/Mint may remain concept references; no additional playable coats or progression are required for MVP. No art approval changes collider dimensions, mass, support rules or scoring.

## Dimensions and anchors

Target reference layout is 390×844 CSS px, responsive down to 320 CSS px and into short landscape. Do not bake this screen resolution into sprites or physics. Cats share world collider width 2.6 and height 2.6/1.55, with a bottom-center pivot.

| Deliverable | Export and geometry | Constraints |
|---|---|---|
| Four body sprites | Transparent RGBA PNG, 512×384 each; common logical rectangle `[48, 80, 416, 416/1.55]` in source pixels | Use this same rectangle on every coat; do not auto-trim or infer collision from alpha |
| Body pivot | Source point `[256, 80 + 416/1.55]`, approximately `[256, 348.3871]` | Bottom-center of the logical rectangle, not PNG bounds; source y increases downward |
| Decorative overflow | Up to 41.6 px beyond each logical side; 67.0968 px above logical top; 13.4194 px below logical bottom | Transparent canvas contains all art; tucked tails, ears/paws never imply another support platform |
| Six expression overlays | Transparent RGBA PNG 128×128 each: `idle`, `focused`, `happy`, `surprised`, `worried`, `dizzy` | Shared overlay anchor; neutral coat color; no changing body silhouette. Map anticipation→focused, proud→happy, startled→surprised |
| Face placement | Overlay center at logical-body UV `[0.50, 0.48]`; preserve this point across expressions | Renderer scales full overlay canvas to at most 0.50 logical body width; verify readability at an 80 px wide body. No automatic trim |
| Sunroom backdrop | Portrait runtime PNG/WebP 576×1008, matching original 768×1344 proportions; larger source retained separately | No baked text/UI/platform/contact shadows; keep roughly 95% of play-panel width visually quiet at travel extremes. Gentle light/low-contrast architecture may remain |
| Separate floor/platform | Canvas/CSS path preferred; if illustrated, transparent 512×128 with declared top-line y and center | Physical floor is centered, width 4.4 world units; renderer maps declared top to floor y=0. No extra apparent shelves |
| Optional shadow/effects | Canvas/vector preferred; optional transparent 128×64 shadow and 64×64 puff/star | No baked shadows on body; effects are decorative, never collision/support cues; no atlas required for first handoff |

The logical rectangle and pivot above turn the earlier illustrative05 example into the selected production target. Studio must report actual metadata, not copy numbers for differently placed artwork. If exact export placement cannot be achieved, return the proposed bounds for Architect review before delivery; retain the 1.55:1 collider and common anchor.

Backdrops remain stationary in screen space while the tower camera rises; the physical floor stays in world space and can leave view. Peripheral props must remain behind cats, including at travel extremes. Prefer containing/letterboxing the portrait play panel and extending flat room color into desktop margins over stretching the artwork. Validate portrait and short-landscape crop; no gameplay controls disappear. DOM title, score, pause, stability labels, Drop and Assist controls remain separate. No title mark, brand name, extra UI screen or animation rig is required for this production batch.

## Reactions and motion

Use the action/reaction priorities and timing in05. Bodies stay face-free and geometrically constant. Renderer owns bottom-center squash/stretch, wobble and collapse transforms; no alternate pose may silently change collision. Shared expressions must support focused aim, surprised fall, happy landing, worried low stability, and dizzy collapse. Reduced motion uses static faces/highlights with no spin, shake, sway or particles. Avoid distressed/injured depictions and flashing effects.

## First handoff and review

Deliver cream body + all six faces + cleaned sunroom first, then the three optional coat exports. Production-01 is delivered and preserved as the earlier pass. Prepare the newly selected-source pack under `art/production-02/`, with contact sheets and source files separate from runtime exports; do not overwrite production-01, review-01, comparison-02 sources, selection.json or receipts. No provider calls or additional spending are authorized by this handoff.

Include a manifest draft using05's shape, real local relative URLs, source dimensions, logical bounds, pivot, face-anchor convention, encoded file bytes, provenance/rights notes, and this approval reference. Mark exports as awaiting technical review; concept-direction approval must not be represented as a completed runtime-quality check. No claim that exports exist until they are delivered.

Architect checks transparent edges/no opaque matte, body/face alignment, full decorative envelope, no oval bases/upright tail protrusions, correct aspect/pivot and mapping, and legibility on an 80 px body. Developer later checks manifest loading/fallbacks, actual viewport/crop, contrast and consistent gameplay across coats. Local synthetic contact sheets can establish sprite alignment, not device or game validation. Require separate screenshot evidence of game integration when available.

Transfer budgets: default body + faces ≤250 KB; all optional coats together ≤600 KB; backdrop ≤350 KB; optional audio ≤400 KB. Total release first-load budget stays ≤2 MB. Report actual encoded bytes and any budget variance; do not discard alpha to meet a size target. Lossless WebP alternatives may be proposed with PNG source retained. No runtime AI/network generation or remote asset dependency.

## Audio and authorization

xAI/Grok is the confirmed provider choice per OG; its saved key/integration has not been independently checked by Architect. OG says use it as appropriate **within authorized scope**. This handoff commissions visual production only and adds no paid-call allowance or audio-content approval. Keep procedural prototype cues from05; no new voice/music generation is needed. Studio should report any audio-specific proposal or charge requiring approval before acting. Public deployment remains outside this task.

## CT-ART-003 — selected-source runtime adaptation

Supersede CT-ART-002's original Gemini-cat master with the newly selected source pair in comparison-02/selection.json. Within existing local production authorization, Studio prepares `art/production-02/` using the selected Grok cat identities and ORIGINAL Gemini Sunroom A. Preserve all source images, receipts, selection records and production-01. Do not run image/audio providers, incur new charges, publish or migrate/restart the container for this task.

Prepare four transparent, expression-free body layers and six independent expression overlays using the dimensions/pivots above; source sheets are not runtime imports. Retain the selected cat identities rather than relabeling the earlier Gemini-derived vectors. The original Sunroom needs its painted platform separated/removed and a quiet play lane; deliver background, floor and shadows independently within budgets. Local native vectors or offline raster adaptation are acceptable when faithful; do not imply a native adaptation is direct provider output. Return material style changes for review instead of silently substituting.

First return the default body, six faces and cleaned backdrop/floor with a readable preview and manifest; optional coat exports can follow within the same task. Include actual bytes, source/pivot/UV metadata, min/max decorative-envelope convention, whether bounds are measured or authored, local paths and provenance. Mark selected-source direction approval separately from adaptation appearance review and technical validation. Use standalone 128×128 SVG faces unless actual Developer decoding evidence calls for transparent PNG equivalents. No raster export is needed for production-01 now. Report gaps truthfully and coordinate the new pack with Developer so10's decoder/anchor/legibility/layout checks are repeated on the selected-source assets. This task does not authorize geometry, progression, controls, unlock thresholds or physics changes.

## Selected-source draft received — 2026-11-16

Studio report95cac0d0 delivers [production-02 manifest](../art/production-02/manifest.json) and [self-contained preview](../art/production-02/review/preview.html): four bodies, six faces, separate Sunroom interpretation and floor;12SVGs/9153bytes. This is a new AI-assisted vector interpretation, not direct Grok cutouts or the unchanged original Gemini background. Flatter texture and simplified Sunroom scenery are material adaptations requiring OG/user appearance review. Status remains awaiting-adaptation-appearance-and-technical-review. Declared bounds[44,20,480,356] are authored, not measured alpha. Geometry/pivot/source hashes and runtime bytes can be statically checked; painted extents, decoder,80px, mobile/landscape and gameplay conformance remain unverified. M1 correction11 precedes M2; existing runtime verification remains queued and must repeat on production-02 before integration acceptance. No new charge/audio/release/migration authority.
