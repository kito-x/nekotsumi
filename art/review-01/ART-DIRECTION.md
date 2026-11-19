# Nekotsumi — review 01 (provisional)

Provider: Gemini 2.5 Flash Image (original Nano Banana), through OpenRouter. Exact prompts and parameters accompany each image in its request JSON; receipts record returned dimensions and cost. Nothing in this set is approved for final use. These are concept sources, not runtime sprites or an alpha-ready atlas.

## Recommended first direction

Cats A with background A Sunroom: broad rounded loaf silhouettes, cocoa outlines, cream/peach/sage accents, tiny tucked paws and expressive faces. Background B Moonroom is a quieter alternative. Keep the central stacking lane visually quiet; final background must separate the platform so its position matches physics.

Cat identities by sheet position: top-left Mochi (sleepy cream); top-middle Toast (smug ginger); top-right Ink (startled charcoal); bottom-left Patches (smiling calico; nervous expression still to author); bottom-middle Plum (cheerful grey); bottom-right Mint (dizzy pale cat). Names are proposed working names. Colors and silhouettes must stay distinguishable in grayscale and at small rendered size; verify in gameplay.

## Inspection and generation evidence

Visually inspected all three returned PNGs. Cat sheet: 1024x1024; each background: 768x1344 (the provider's returned portrait size, not exact 9:16). All six cats are separated and recognizable. Generation added oval bases/shadows and upright tails; remove bases and tuck tails before creating physics-ready individual sprites. The background illustrations retain clean central areas but contain perspective/architectural outlines, so soften or remove those during final layer preparation. Platforms are painted into the concepts and must be separated. These are explicitly opaque review images; no transparent production sprites exist yet.

Recorded costs: cats $0.0387705; Sunroom $0.0387621; Moonroom $0.0388173; total $0.1163499. No audio generated. Three successful image API responses establish actual Gemini generation, beyond the earlier authentication-only verification.

## Expressions and runtime animation brief

Each selected cat needs neutral/sleepy, anticipation, proud, worried, startled and dizzy face states on one unchanged body silhouette. Author separate face overlays after selection; generated concepts are not guaranteed pixel-aligned states.

- Idle: slow blink and subtle breathing, no collider scaling.
- Drop: ears and face anticipate landing; body tilt follows physics.
- Landing: brief squash/stretch, then settle; physics collider remains stable.
- Wobble: face follows lean, paws tense; avoid flashing warnings.
- Collapse: startled face, brief spin/dizzy recovery and soft dust puffs; playful, never injured.
- Success: tiny cheek sparkle and delighted eyes.
- Reduced motion: static faces and minimal settle; remove spin, camera shake and particles.

Developer implements runtime transforms and physics; source art must supply clean separated bodies, faces and effects. Exact dimensions and anchors await Architect requirements. Suggested source only: 512px square RGBA per cat, wide loaf occupying consistent bounds, baseline and center metadata; confirm before final export. Background concepts have opaque pixels, not transparency.

## Remaining production checklist after review

1. Approved master cat model and palette; transparent individual bodies with consistent padding and pivots.
2. Expression overlays and ear/tail source layers; contact shadow as a separate asset.
3. Selected background rebuilt/exported in layers: backdrop, peripheral props, platform and foreground trim; portrait safe area and landscape crop verified.
4. UI: title mark, play/pause/retry/home/audio controls, score/high-score treatment, next-cat preview, tutorial hand cue and accessible focus states. Use real interface text, not generated raster lettering.
5. Effects: landing puff, success sparkle and collapse dust; consistent atlas padding and frame metadata after dimensions are agreed.
6. Review sprites in actual target viewport before atlas assembly; verify alpha edges, scale, contrast, anchors, clipping and collision silhouette.

## Audio plan (no audio generated)

The user subsequently identified xAI/Grok and supplied a verified key; the earlier Groc/Grog ambiguity is resolved by that direct instruction. Do not choose a voice or generate voice until an audio-specific brief is agreed. No dialogue is required for the first prototype.

Triggers: grab = soft cloth tap; release = quiet airy swish; contact = soft pitched wooden plop with limited variants; unstable stack = restrained creak; collapse = padded tumble with comic tiny chirp; milestone = short warm chime; UI = gentle tick. Use cooldowns, cap simultaneous sounds, normalize levels, separate music/SFX mute, and avoid repeated meows. Optional instrumental loop: slow cozy plucked melody with unobtrusive room tone. Voice, custom cloning and music rights require separate decisions; provider access alone establishes no license clearance. Keep provider terms and provenance with final assets.
