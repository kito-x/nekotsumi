# CT-ART-004 — tuxedo face legibility variant

Status: **technical checks passed; appearance review held for OG/user decision**. This is a separate variant; no runtime or app file was overwritten.

## What changed

One tuxedo body file: `bodies/tuxedo.svg` (1,586 bytes, sha256 `5fb79154…90cfb`). It adds a cream mask inside the existing body clip so the right eye/brow no longer sits on the dark coat.

- Original runtime tuxedo: 1,422 bytes, sha256 `6759a36a…af245a` — preserved unchanged.
- Six shared 128×128 face SVGs — unchanged, same hashes.
- Source size 512×384, logical rect 416×268.39, pivot (256, 348.39), face UV (0.50, 0.48), face fraction 0.45 — unchanged.
- Outer silhouette and clipPath are identical; the added path is fill-only, no stroke.

## Result

At 80 CSS px body width (36 px face):

| | Right-eye background | Flat-colour contrast vs `#42362a` |
|---|---|---|
| Before | `#494746` | 1.27:1 |
| After | `#f9e8bd` | 9.65:1 |

Contrast is calculated from source colours, not measured rendered pixels. Before evidence shows the right eye/brow merging into the coat; after evidence shows all six expressions with both eyes/brows and mouth readable at DPR1 and DPR2 canvas backing.

## Appearance hold

Architect independently viewed the selected `comparison-02/grok-cats.jpg`: the tuxedo has **dark eye surrounds** and a cream muzzle/chest blaze, not a broad cream face. This variant therefore changes a visible coat marking. It is a legibility option, not a verified source-faithful correction. Integration is held for the OG/user decision (OG request `4329e760-4f39-488a-8857-eb17ae224da7`); Architect review is in `design/checks/ct-art-004-review.json`.

If this variant is rejected, the alternative is a face-side variant that keeps the dark eye surrounds, rather than widening the cream body marking.

## Evidence

- `evidence/before-80-dpr1-dpr2.png` — original body, six faces, 80 px, no overlays.
- `evidence/after-80-dpr1-dpr2.png` — variant, same six faces, same size.
- Review pages: `../../review/legibility/ct-art-004-evidence.html?variant=before` and `?variant=after`; comparison: `../../review/legibility/ct-art-004-compare.html`.
- Capture: OpenBot private browser, static canvas sheet, deviceScaleFactor 1. DPR2 is a 2× canvas backing shown downsampled, not a device-DPR screenshot; no game-loop/rAF timing claim.

## Integration mapping (only after approval)

1. Copy `bodies/tuxedo.svg` to `runtime/bodies/tuxedo-legibility.svg`.
2. In `manifest.runtime.json`, change only the tuxedo body entry:
   `bodies[2].url = "bodies/tuxedo-legibility.svg"`.
3. Keep `bodies/tuxedo.svg` and all original files/hashes in place.
4. No renderer or loader change is needed. `drawCat` resolves the body URL from the manifest; the six shared faces remain the same.

Do not overwrite the approved original or change the six shared faces. Developer integrates only after the appearance decision.

## Limits

- No XML parser, alpha/painted-bounds measurement or raster export was run.
- The DPR2 sheet uses a 2× canvas backing, not an actual DPR2 browser screenshot.
- Browser capture was static; no normal game-loop frame timing was tested.
- Architect’s checks: 1,586 bytes/hash exact, one clipped fill-only path, original body and six face hashes unchanged, geometry unchanged; actual device-DPR2 integration not checked.
