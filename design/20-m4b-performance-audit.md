# M4B — local performance and candidate audit (CT-DEV-004B)

Architect, 2026-11-16. Active root `repository root`. M4A closed after independent CT-TEST-004 PASS; see [19](19-m4a-review.md). Existing user authorization covers local development and checks. Developer may create the bounded audit harness/evidence below, then must stop for review. This is measurement and gap assessment, not approval of full M4 or release.

## Baseline and allowed changes

Accepted production build, 91 tests previously independently passing:
- index.html SHA256 `222fd01ced1163ebc3338bd9f483df79a4369e1cba3811e50b3102b8044861b6`
- main-DroJ0HWb.js SHA256 `c6f622bd9bf3d078f61e36c6790e69a4643ae0414de62eef39cc88ef314998bd`
- scene-BP3tka9g.css SHA256 `33944f36b22d2fc381faadee6f61770ce3c6d3fbc1f3ce62f7c65d353c0706f1`
- preview `http://127.0.0.1:4177/`; equivalent localhost origin serves the same files. Verify hashes before/after.

Allowed: audit-only TypeScript/HTML/scripts under `app/scripts/`, evidence under `evidence/m4b/`, and `app/M4B-EVIDENCE.md`. Compile audit modules through the existing toolchain if needed; ignored test-build output is allowed. A dedicated temporary loopback harness server is allowed; record its address/start/stop and stop it when finished. Keep the normal port4177 preview intact. No new dependencies, production source/asset/schema/config changes, production rebuild, debug-state injection endpoints or normal UI instrumentation. Do not silently optimize before reporting a measured problem. If the audit finds a reproducible correctness/performance failure, report it and finish independent measurements that remain useful; Architect scopes the fix.

No audio/content/provider/paid calls, material art changes, external requests, telemetry, git commit/push, public release, migration, Compose/container changes or unrelated service restart. Preserve `.git` and existing edits; git uses `-c safe.directory=repository root`.

## 1. Reproducible 1,000-cat fixture and CPU cost

Targets from03/06: simulation tick p95 <2ms at1,000 cats, bounded draw work, no per-frame full-history scan. Phone targets (frame p95≤20ms, p99≤33ms,60fps at390×844/DPR≤2) cannot be certified on this headless VPS.

- Produce a deterministic real-engine Assist tower with1,000 stable centered placements through public commands and ticks, draining events; no assignment to engine private fields or changing balance. Keep this isolated from ProfileService/real localStorage so synthetic placements never unlock/persist real progress. Report seed, command strategy, fixture construction time, score/height/safety and a fixture digest. Verify once-only placement count and all1,000 logical cats retained.
- Measure the existing `npm run bench` placement evaluator as a separate dataset, clearly distinct from a full engine tick. Do not present evaluator timing as full-game timing.
- Measure real engine tick+snapshot+event-drain CPU cost on the1,000-cat state, with warmup/sample counts and p50/p95/p99. Separate cheap aiming ticks from placement-commit ticks; ordinary ticks must not hide a slow landing. For commit sampling, a small range such as heights1,000–1,100 is acceptable if labeled honestly; keep fixture setup outside timed regions. Record environment/runtime and the exact code path timed.
- Confirm no mutation of earlier snapshots and no per-frame all-cat clone/scan in steady aiming. Logical tower growth and O(n) evaluation once per placement are intentional; do not truncate history to meet a budget. If a synthetic renderer-only fixture is also used, label it separately and never imply it was played by a human.

## 2. Actual Canvas renderer audit

Use an isolated audit page/module importing the actual GameRenderer and existing asset loader through an audit build/test compilation, not a rewritten renderer. Do not modify the accepted dist to expose an inspector. The audit page can be served by a separate restricted loopback server using existing Node facilities; no new server package/install required. Report module identity and any unbundled-versus-production distinction. Real app remains on the accepted production hash.

- Render0/100/1,000/2,000-cat fixtures at390×844 DPR1 and2; add844×390 DPR2. Use loaded approved art and at least one fallback-art fixture. The fixture dimensions may be the canvas itself; clearly distinguish canvas size from whole-app viewport. Normal/reduced motion and a1,000-cat failure must remain readable and finite at high world coordinates. Capture screenshots of the1,000-cat top/guide/HUD context where available; no claim that a synthetic audit page is normal gameplay UI.
- Count actual settled-cat draws, animated collapse bodies and particles by audit-only instrumentation around Canvas/draw operations or a minimal injected audit seam outside production. Demonstrate≤24 settled cats,≤20 animated collapse bodies and≤40 particles. Separate background/floor/face draw calls from body counts; do not count a face as a second cat. Confirm no DOM node per historical cat. Do not infer measured counts solely from constants.
- After warmup, record CPU time spent inside renderer.render with p50/p95/p99 and sample count. This excludes compositor/GPU completion and frame cadence; label it **renderer CPU time**, never frame time. Observe normal requestAnimationFrame intervals separately for up to30 seconds if useful; if throttled, report the distribution/throttling rather than bypassing the interruption guard or claiming60fps. Controlled advance proves deterministic visuals, not smoothness.
- Record backing canvas dimensions/pixel count/DPR cap; ensure resize targets remain finite and respect the2,000,000-pixel cap. Check high-tower camera follows incoming/top support and no precision-induced clipping or nonfinite transforms. Do not change logical geometry to improve appearance.

## 3. Standardized transfer budget

Define exact file lists and calculation, resolving the earlier differing gzip totals:
- Startup JS/CSS: read the accepted index and module references; list main JS, shared module JS and CSS required for ordinary play. Sum **per-file gzip level6** sizes using a deterministic library, with raw and compressed bytes for each. Also record level9 for comparison if useful. Do not use compressed concatenation as an HTTP transfer estimate.
- Report all built JS/CSS separately, including the optional diagnostics entry. HTML and art assets are separate rows. Record total dist size and expected cold-load request/response raw bytes for the actual app, whether HTTP Content-Encoding compression is enabled, cache mode and loopback-only resources. Browser transfer counters with cache hits must not masquerade as a cold download.
- Gates: startup JS+CSS≤200,000 gzip bytes; release first-load≤2,000,000 bytes. A local server without compression should be reported as such. Include asset decode/startup/fallback status already verified, and avoid inventing network latency or target-phone download claims.

## 4. Candidate gap ledger and return

Write a compact AC01–AC20 table linking existing verified evidence versus remaining gaps. Do not rerun accepted50-restart, storage/layout/keyboard suites merely for the ledger when production hashes are unchanged. Distinguish implemented, unit-tested, checked-browser tested, physical-device validated and release-approved. In particular, no named-screen-reader speech, physical touch/safe-area, real zoom, Firefox/Safari, phone timing, audio/mute or public release claims without actual evidence. Audio remains unapproved/outside this audit; no sound controls or paid provider tests.

The held Web Lock on127.0.0.1 is a tracked environment observation. Localhost is a distinct test storage/lock origin and may host disposable tests on the same build; that does not prove the original lock recovered. Do not steal locks, restart the shared browser, clear unrelated profiles or add auto-takeover. If a normal lifecycle reliably reproduces the issue, report steps/client visibility without exposing private tabs; fixing it is a separate task.

Deliver `app/M4B-EVIDENCE.md`, scripts/harness sources and raw JSON/CSV plus screenshots under `evidence/m4b/`: exact commands/exits, timings/sample definitions, build/module/fixture identities, draw/pixel counts, standardized transfer table, AC ledger, defects and not-run list. New TypeScript audit code must typecheck; run existing tests once if audit compilation changes their output. No production rebuild is needed or authorized. Recheck production hashes at the end, stop any audit-only server, leave normal preview available and report all writes.

Stop and return to Architect. Any code fix, independent follow-up, audio decision, physical-device work or public release requires its own next scope.

## Delegation record

CT-DEV-004B sent to Nekotsumi Developer in OpenBot message `9b277b33-fbf0-42d5-8a34-548bda29df01`, expectsReply true. Awaiting audit/evidence; no performance result is claimed by this specification. OG informed through `93ff0a28-e208-4598-8991-8c0c2655b53a`.

## Audit review status

Developer delivered CT-DEV-004B in message `853bf1dc-d88a-45e0-aa1a-ef5225583559`. Architect accepted the stated local engine/renderer/transfer datasets but reproduced a small backing-pixel cap rounding overrun at larger sizes. CT-DEV-004BR in [21](21-m4b-audit-review.md) specifies the bounded source correction and missing cap-stress measurement; only this new follow-up authorizes that production change. Full M4B closure and independent validation remain pending.
