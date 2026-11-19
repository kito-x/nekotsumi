# Actual Gemini vs Grok comparison — direction selected

User answered review card `4d1b1697-f83d-4b3c-8f54-bf2b9fe7b9b4` with `select`: **new Grok cats + original Gemini Sunroom A**. See selection.json for exact source paths/models. No Studio approval question remains pending. Runtime transparent bodies, independent faces and background layer preparation remain work, not an access/approval blocker. Material new appearance changes must return for review.

User reopened final selection through OG message d348ea36-a933-4e10-9f2e-d66a1302fe86. Prior Sunroom A/native-SVG approval is historical, not a current final art lock. Production-01 manifest now records that reopening. The old approved archive is a historical snapshot and must not be taken as current approval.

## Images (actual provider outputs, not vector recreations)

| Preview | Provider/model | Actual size | API-reported charge |
|---|---|---|---|
| gemini-cats.png | Google Gemini via OpenRouter / google/gemini-2.5-flash-image | 1024x1024 | $0.0387819 |
| grok-cats.jpg | xAI direct / grok-imagine-image-2.0, 1k low | 1024x1024 | $0.04 |
| gemini-sunroom.png | Google Gemini via OpenRouter / google/gemini-2.5-flash-image | 768x1344 | $0.0388123 |
| grok-sunroom.jpg | xAI direct / grok-imagine-image-2.0, 1k low | 720x1280 | $0.04 |

New batch total: $0.1575942. Prior actual Gemini batch: $0.1163499. All Studio generation in these two batches: $0.2739441. No voice/audio generation. Actual account-wide usage may include other agents and is not inferred from these totals.

Each request/receipt pair retains the exact prompt, requested model, endpoint, output dimensions, byte size, SHA-256 and API usage. xAI returned 400000000 cost_in_usd_ticks per request; 10^10 ticks = $1 per https://docs.x.ai/developers/cost-tracking. OpenRouter returned decimal usage.cost. No secrets are stored here. Matching cat prompts and matching background prompts are identical across providers; API settings differ as required. This is a small sample, not a controlled model quality benchmark. Formats and returned sizes differ; no image was modified or rescaled for the comparison.

## Prior provenance verified

review-01/*.request.json requested google/gemini-2.5-flash-image at OpenRouter's image API; saved receipts retain token counts, costs and matching output metadata. The original three raster previews were Gemini requests. production-01 SVGs were subsequently authored by Studio as AI-assisted native adaptations, not direct Gemini image outputs. This distinction must remain explicit.

## Visual inspection / recommendation

All four files were opened and inspected. Both cat sheets contain four separated cats and no oval bases. Gemini cats have more decorative round eyes/cheeks but tails still protrude upward; Grok follows the tucked-tail brief better and gives a flatter base. Both require consistent body bounds, transparent extraction and separated face assets before runtime; the generated sheets are not ready-to-import bodies.

Gemini Sunroom is a stronger flat-illustration match and has more prominent edge windows/leaves; Grok Sunroom is softer and more watercolor-like, with a quieter center. Both omit baked platforms and UI. Recommendation: Grok cats + Grok Sunroom for the tucked silhouettes and unobtrusive playfield; Gemini background is a reasonable alternate if the user prefers a crisper illustrated room. No claim of production-ready geometry or alpha.

Architect's existing requirements remain: logical W/H1.55; body source512x384; bottom-center logical pivot; faceUV(.5,.48); six independent faces; separate runtime floor/shadow/UI. Concept sizes are source-only and must be adapted to the <=1024px background budget after selection. Do not change physics to fit alpha.

## Pending decisions

The consolidated comparison question was answered as recorded above. No key/access approval is pending. The two earlier review cards were also answered. Audio is not a blocker and no voice choice is needed for this comparison. Other teams' pending questions are not audited here; OG consolidates those separately.
