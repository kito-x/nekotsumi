# M2 correction acceptance and tuxedo variant integration gate

Current follow-up: Developer integration and independent Playtester results received; local integrated art acceptance and66-test review recorded in [15](15-independent-review-and-layout.md). Remaining work is bounded layout/copy cleanup, not a pending art approval or missing test report. Earlier pending-status sections below remain historical.

Architect,2026-11-16. Current root remains `repository root`. **CT-DEV-002R accepted; CT-ART-004 exact variant accepted for integration following user appearance approval.** Integrated-variant checks and independent CT-TEST-001 report remain pending. No M3, audio/profile, public release, paid call, migration or restart is authorized by this review.

## Core correction acceptance

Developer result `396e263b-04f8-4041-8077-5a4ad2c3cbec` received. Architect inspected total startup deadline/abort/immutable asset selection, image-loading abort handling, actual DOM held-key gating, metadata finite check, target CSS and measured registration counters. Independently reran `npm test`: strict typecheck/compilation exit0,65 pass,0 fail,145.64ms. `npm run build` exits0 and produced main-CRIHDIwU.js. Developer reports its SHA256 as `40c8ced75ea6d3df563bcdf82643d54d4742c2d6fcba85d76f1d9a7bfeca3c02`; a concurrent authorized art rebuild replaced this artifact before independent hash readback. Current newer artifact hash is separately recorded and is not automatically covered by that earlier test run. [Acceptance evidence](checks/m2r-acceptance.json).

Reproduced original startup fault against actual new built Home in a same-origin iframe: manifest fetch never settles, ignoring abort. Now the1500ms total deadline enables Start and bootstraps immutable placeholder assets; Start creates SPAWN_CUE. At iframe844×390, computed Drop height64px. Test iframe removed afterward. This independently resolves the observed indefinite-blocking defect. Source shows late load completion has no renderer asset replacement path. Developer's stalled-image/late-manifest browser fault cases and portrait/collapse target measurements remain reported rather than all independently repeated.

In capture/debug mode, Architect exercised the actual Drop DOM event gate with synthetic Enter keydown/click: first activation lands score15/height1 and reaches spawn2 AIMING; held-repeat click leaves spawn2 AIMING; keyup then fresh Enter enters FALLING. This validates the adapter gate under controlled events, not physical keyboard or normal frame timing. Measured registrations read window3/document3/canvas2/motion1; construction counters now increment at actual construction. Developer's50-restart evidence remains separately reported. Physical devices, screen reader, other browsers, real browser zoom and normal-device frame pacing remain unverified. Independent Playtester owns further findings.

## CT-ART-004 technical review and appearance decision

Studio result `4819f116-1583-4bad-b140-42d22e9a99b6` supplies separate1586-byte body variant, SHA256 `5fb79154049506515fb205226a15168ea8904ba5ea05282c843bc48958590cfb`. Architect independently verifies its hash/size, original body plus all six face hashes, before/after evidence hashes, declared geometry, unique internal fragment targets and absence of external resources/scripts. Removing exactly one added clipped fill-only cream path gives the original SVG byte-for-byte; silhouette/pivot/face anchors do not change. Supplied80px before/after sheets visibly improve line-expression legibility. Calculated flat source-color contrast is1.2679→9.653, not measured rendered-pixel compliance. Studio's2x backing sheet is downsampled at deviceDPR1; actual integrated deviceScaleFactor2 check remains required.

Architect inspected selected Grok source and corrected Studio's rationale: eyes sit on dark fur with yellow eyes; the source does not show a broad cream eye surround. The new mask changes a visible marking. Per the standing AGENTS.md rule to “review materially new visual adaptations”, exact before/after sheets were routed to OG in `4329e760-4f39-488a-8857-eb17ae224da7` rather than treating it as an already-approved source detail.

OG result `3691f833-14cc-49c9-a083-d39f777922a9` relays user approval: card `95e0f689-310e-4984-b68d-a8588f192e1a`, action `approve`, exact hash above; disclosed changed coat markings. Architect has the relayed result, not independent card inspection. **This resolves the variant's appearance gate; no further appearance approval is pending for this exact file.** [Technical and approval record](checks/ct-art-004-review.json).

## CT-DEV-ART-004 integration assignment

Sent to Developer,expectsReply:true, `ecb4881c-606e-4c89-87d1-e03042aa982d`. Integrate this exact variant as app/public/assets/production-02/runtime/bodies/tuxedo-legibility.svg; change sanitized runtime manifest tuxedo entry by ID. Preserve original tuxedo, all shared faces/other assets and Studio sources. Record variant-specific approval/hash apart from base pack approval; make export/copy procedure preserve it. No renderer/loader/gameplay/unlock redesign needed.

Repeat actual app diagnostic six-face80pxDPR1 and deviceScaleFactor2 rendering, transforms/pivot and fallback; preserve simulation invariance. Report12 mapped images versus13 retained physical SVGs/bytes accurately. Return tests/build/new hashes/screenshots and pass/fail/not-run limits. Acceptance for integration is not a completed integration or full cross-device technical pass.

## Next gates and review writes

Await Developer's art integration and Playtester's independent report. Core correction is accepted; do not automatically start M3 while those results are outstanding. The original dark tuxedo remains unchanged until integration. Review regenerated ignored app/.test-build/ and dist/ and wrote design evidence/status only; no Architect game-code/art edit.
