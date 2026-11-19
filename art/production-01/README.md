# Nekotsumi production pass 01 — selection reopened

Latest user request supersedes the approval below: compare actual Gemini and Grok generated options before selecting final art. This pass is now provisional; retain earlier approval as history only. See sibling comparison-02 for the new review.

The user selected Cats A + Sunroom A in review card `106a82ae-ebb8-471b-8068-b89cc25b475e` (`sunroom`), then approved this exact native production pass in card `4594228a-c9b8-47e0-91e7-dfe9d4dd6c06` (`approve`). Assets are appearance-approved and may be integrated subject to runtime checks.

Actual Gemini-generated concept sources and receipts: `../review-01/`. These SVGs are newly authored editable adaptations of that selected visual direction, not direct Gemini-generated transparent PNGs. There was no provider change and no further paid generation. Existing generation cost remains $0.1163499. No audio was generated.

## Files and layout

- Four 512x384 body SVGs: default cream, ginger, tuxedo and calico. No baked expression, contact shadow or oval base; tail stays within body canvas.
- Six 128x128 shared expression SVGs: idle, focused, happy, surprised, worried, dizzy.
- Sunroom-derived warm quiet backdrop: 576x1024 SVG, no floor/UI/cats painted in. Scenery was simplified substantially to meet Architect's quiet-95%-width requirement.
- Separate floor, guide shadow, star and puff; six currentColor UI icons. Icons require accessible HTML labels. Warning is never color-only.
- `manifest.json`: real file sizes, declared source geometry and approval provenance. Body logical W/H=1.55, bottom-center pivot, face bodyUV(0.50,0.48), face drawn width=0.45W.

All 21 runtime SVGs together are 8,849 bytes before HTTP compression. Source scripts and reviews are not runtime imports. `export.pl` recreates SVGs; it makes no network requests and contains no credentials. The earlier `generate.pl` reads the secure key file only when explicitly run to generate a named image; never ship it to the browser.

## Integration and remaining checks

These are user-approved native SVG deliverables rather than PNG exports. Architect's contract permits approved native SVG bodies and prefers vector backgrounds. Face overlays are SVG rather than the specified PNG; user approved their appearance/format in the production review, but Developer/Architect must confirm decoding in the target renderer or rasterize at exactly 128x128 without altering geometry.

Use each SVG as a standalone image so its local clipPath IDs do not collide; prefix IDs if embedding several directly in one DOM. Coordinates are declared art metadata, never inferred from alpha. Confirm alignment and decorative overflow in the developer's renderer, actual 80px body width, dark-coat contrast, browser SVG decoding and landscape crop. No browser gameplay test or raster export was performed by Studio. No accessibility-conformance claim is made.

Audio remains the documented trigger plan; xAI/Grok provider is confirmed but no voice selection, audio generation or additional charge is implied.

Provenance clarification: Studio is an AI assistant; native vector paths are AI-assisted, not human-authored. Original prompts, model IDs and usage receipts are retained in review-01. No third-party reference images or stock media were used in these requests. Provider terms and commercial-use rights have not been independently audited; source provenance does not itself establish license clearance.

No atlas was exported: each file is a full untrimmed source canvas, so there are no frame rectangles or trim offsets to infer. Runtime transforms follow the reaction matrix in design/05-ux-assets.md; bodies and faces must share the declared logical transform, with collider geometry unchanged. Uncompressed runtime SVG bytes are measured above; no estimated compression saving is needed to meet the transfer budget.
