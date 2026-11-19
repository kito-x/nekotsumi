# UX, reactions, animation, sound and assets

## Screen and interaction specification

Home: title, short instruction “Drop cats onto the top of your tower”, Start, mode selector (Classic / Assist), selected-cat preview, collection progress, How to play and Settings. Show current-mode best score and height with explicit labels. First Start opens a two-step dismissible tutorial: (1) tap/Space to drop onto the top; (2) keep weight over the support, wobble means danger. Assist adds “Use left/right to position, then Drop.” Closing/Skip marks tutorialSeen; the closing gesture cannot drop the first cat.

Live game: DOM HUD with score, cats stacked, current perfect chain only when >=2, current mode and Pause button. Canvas shows incoming cat, target shadow, last several stacked cats and a small stability indicator with text “Steady / Wobbly / Very wobbly” plus icon/border change. Bottom area has a large Drop button. Assist adds Left, Right and a concise alignment readout (“0.3 left of top; stable if dropped”). No touch needs precision on a small cat sprite.

Pause: modal heading, pause reason when automatic, Resume, Settings, Restart and Home. Restart/Home opens an in-game confirmation because live play is abandoned: “Keep your earned progress and start a new round?” / “Keep your earned progress and return home?” Cancel returns to Pause. These are ordinary app confirmations, not requests to the OpenBot user. Do not reset stats. Settings modal has sound toggle, volume, motion preference (System/Reduced/Full), high contrast and a visible explanation of Assist; changing preferred mode applies next run.

Collapse: active gameplay disabled, optional Skip to results button becomes available immediately. Failure caption is “Missed the top cat” or “The tower tipped” and weak-contact cue makes the latter understandable. Funny, soft, nonviolent expressions. Result: “Nice stacking!” heading, height, score, best values, new-record badge(s), newly unlocked cosmetic cards if any, Replay (same mode), Change mode, Collection and Home. Replay is primary; never starts without interaction.

Collection: four cards with names/working labels, selected indicator, locked threshold and current cumulative placement count. Selecting an unlocked item changes next-run cosmetic, not physics. Locked cards explain requirements and are not misleading clickable purchases. No shop/currency. If optional art is absent, retain distinct placeholder coats and labels.

Temporary storage: non-blocking notice near Home/Results, e.g. “Temporary session — progress will not be saved.” Existing other-tab owner gets “This profile is open in another tab” with Retry save access and Play temporarily. Unsupported context has a simple HTML message rather than a broken canvas.

## Action/reaction matrix

Event names correspond to `04-lld.md`; UI actions use the same single dispatcher. Durations are presentation targets unless engine ticks are explicitly stated.

| Action / trigger | Gameplay/state reaction | Face / animation / UI | Audio / accessibility |
|---|---|---|---|
| First load | Validate profile, no round | Calm preview, no required movement | Silent; title and Start focus order |
| Start / Replay | New run and spawn generation | Focus play region, gentle cat entrance during 9-tick cue | Unlock audio from gesture; soft start cue optional; announce mode |
| Spawn cue completes | Enable drop | Focused face, subtle target shadow | No recurring sound; “Ready” once |
| Classic horizontal motion | Position advances by fixed tick | Eyes glance toward tower; no collider changes | No continuous ticking; no frame-by-frame live-region chatter |
| Assist Left / Right | One fixed nudge, clamp at bounds | Cat moves with no extra travel tween delay; alignment text updates | Soft click max 5/s optional; announce offset, predicted stability on user action |
| Valid Drop | Freeze/snap x, enter fall | Focused→surprised, stretch at most 1.06Y, guide remains | Short soft whoosh; “Dropping” only if useful, no focus movement |
| Extra drop while unavailable | No gameplay action | Drop disabled or explains state | No error buzz, no queued action |
| Stable ordinary landing | Commit +10, reset perfect chain | 100 ms squash then recover over 140 ms; happy face ~0.5 s; score +10 | Soft padded thump, one landing announcement with height and score |
| Stable perfect landing | Commit perfect score/chain | Happy/closed-eye face, 6 small stars max, “Perfect +N”; visible center snap if eligible | One bright landing chime replaces ordinary thump; no doubled landing sound |
| Chain reaches 3 or 6 | Score formula unchanged beyond specified bonus | Brief “3 perfect!” / “6 perfect!” text; no full-screen effect | Pitch changes bounded to ±3 semitones, no extra voice layer |
| Landing lowers safety into caution | Stable placement remains valid | Worried face on top few cats; small sway; “Wobbly” icon/text | One soft creak on entering band, cooldown 1 s; never continuous alarm |
| Landing enters danger | Still stable until a future failed placement | Worried face, weak-joint outline, “Very wobbly”; bounded sway | Brief creak replaces lower-priority cue; text communicates without sound |
| Later landing improves safety | Continue | Faces return to calm/happy; danger indicator updates | No false danger audio |
| Miss top | Fail once, no score/progress | Incoming slips, surprised→dizzy face; failure caption | Soft slide/pop; announce failure once |
| Whole-tower COM failure | Fail at chosen joint | Outline failing joint, cats separate in bounded collapse; camera shake <=3px <=120 ms | One soft tumble chord, no distress; announce “The tower tipped” |
| Collapse timeout / Skip | Enter Results | Cancel remaining effects; summary focus | Stop tumble sound if skipped; results announcement once |
| New score / height record | Already saved on landing | Results badge, small sparkle if motion allowed | One short reward cue at Results, not every higher landing |
| Cross skin threshold | Derive unlock once | Non-modal toast “Ginger cat unlocked”; result card later | Single reward ping, live-region polite; queue if another unlock toast visible |
| Select unlocked skin | Save selected ID for next run | Checkmark/text, preview | Optional UI click; announce selection |
| Select locked skin | No change | “Unlock at 75 cats stacked in total” | Read requirement; no purchase action |
| Pause / hidden / blur | Preserve exact engine state | Static overlay, no ongoing wobble/camera animation | Suspend/stop sound; focus dialog on user pause/return |
| Resume | Exact saved state; fresh input required | Remove overlay, restore focus, no auto-drop | Resume audio only from gesture; no catch-up effects |
| Restart / Home confirmed | Abandon live round; retain committed profile | Cancel old effects/inputs, route screen | No extra reward; no double write |
| Sound off / volume change | Gameplay unchanged | Toggle/slider update | Stop current voices immediately on mute |
| Reduced motion on | Gameplay unchanged | Remove shake/spin/sway/particles; squash becomes static highlight; shorten collapse | All information remains via text/icon; no rule/speed change |
| Resize/orientation change | Pause and resize projection | Preserve tower/world state; compact/letterbox layout if needed | “Layout changed — resume when ready” |
| Asset fails | Gameplay continues | Local cat/face/background fallback | No blocking modal; no repeated error audio |
| Save fails | Gameplay continues in memory | Temporary-session notice | Announce once politely; do not reset earned progress |

Expression priority: collapse/dizzy > falling/surprised > danger/worried > landing/happy > aiming/focused > idle. Never draw several face overlays at once. Falling face duration is state based, landing happiness expires after 0.5 s, collapse face ends with Results. Lower priority effects cannot override a failure expression.

Sound priority: failure > unlock/record > landing/perfect > warning > UI. Maximum six simultaneous voices, duplicate-event suppression, warning cooldown 1 s, UI cooldown 200 ms. Master peak must avoid clipping; no sound is an essential cue. Audio may be unavailable entirely with no effect on input timing. Procedural placeholders are original short tones/noise, not calls to a voice/music service.

## Layout and accessibility

- Use a semantic main region and real buttons, headings, labels and dialogs. Canvas has a concise accessible description; all meaningful state and actions also exist in DOM.
- Make gameplay/action targets at least 44×44 CSS px, primary Drop at least 64 px high; 8 px spacing where possible. This is this product's ergonomic target. WCAG 2.2 minimum pointer-size guidance has its own 24 px criterion/exceptions; 44 px here is a stronger design choice, not a claim that 44 px is the AA minimum. [W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).
- Body text >=16 CSS px at default scale; readable at 200% browser text zoom. Modal/menu content scrolls; essential controls cannot be clipped. HUD compact labels may be 14 px only when still readable; high-contrast mode uses thicker boundaries and plain backgrounds.
- Contrast targets: 4.5:1 normal text, 3:1 large text and meaningful UI boundaries. Measure approved colors; do not assert compliance from palette names. Color never solely conveys stable/danger, selected/locked or new record.
- Honor `prefers-reduced-motion` by default, including later OS changes if setting=system. Do not flash; no strobing celebration or rapid alternating high-contrast effects. Pause is always reachable.
- Keyboard tab order follows screen order. Visible focus must stand out against both canvas and shell. Drop button native Space/Enter activation must not also trigger the play-region handler.
- Live region (`polite`, atomic) announces one concise landing summary, pause/resume, failure/result and unlock. Do not narrate every frame. Assist alignment is announced after intentional nudge, with <=1 update per 300 ms while holding a key; numeric readout remains available at any time. Initial Assist prompt explains left/right and Drop.
- Respect safe-area insets, browser zoom and native navigation. Do not globally disable pinch zoom. Canvas can suppress pan only within its playfield; menus retain normal scroll.
- Short landscape: reserve controls outside a letterboxed 10-unit-wide play panel; compact HUD. If available vertical space is insufficient, allow the app shell to scroll without hiding buttons; do not change gravity/gap/cat sizes in world units.
- No claim of full WCAG conformance or nonvisual timing-game equivalence until assessed. Include keyboard and at least one screen-reader flow in release checks.

## Asset requirements — new Grok cats + original Gemini Sunroom A

Latest selection, 2026-11-16: Studio reports user card `4d1b1697-f83d-4b3c-8f54-bf2b9fe7b9b4:select` chose **new Grok cats + original Gemini Sunroom A**. Architect read [selection.json](../art/comparison-02/selection.json), which records `visual-direction-approved-runtime-assets-pending` and exact source paths. Production-01 was delivered and earlier appearance-approved under `4594228a-c9b8-47e0-91e7-dfe9d4dd6c06:approve`; it is now superseded as final appearance, not awaiting its first review. Its 21 SVGs remain a provisional renderer test pack. Final selected-source runtime adaptations still need preparation and technical checks. No new user art question is pending. See [reconciliation and verification task](10-art-integration-verification.md). Architect accepts standalone 128×128 SVG faces instead of PNG, subject to actual browser decoding and shared-anchor checks; request raster exports only for a demonstrated compatibility need.

Earlier Cats A production requirements and approval history remain in08. For current production, use the selected Grok cat identities and original Gemini Sunroom source in selection.json. The same logical geometry, pivot and independent-expression contract applies. Materially new visual choices return for user review; routine cleanup requires no repeated source-choice approval.

| Asset ID / group | MVP requirement | Delivery contract |
|---|---|---|
| `body.default` | One readable cute cat body | Transparent PNG 512×384 source or approved repo-native SVG; logical rectangle ratio 1.55:1 |
| `body.ginger`, `body.tuxedo`, `body.calico` | Three cosmetic coats; working names | Same logical rectangle, anchor and mass as default; can initially be colored placeholders |
| `face.idle/focused/happy/surprised/worried/dizzy` | Six shared face expressions | Transparent 128×128 overlays, shared anchor, no body repaint; sleeping optional after MVP |
| `background.main` | Quiet seamless/simple backdrop | Prefer CSS/SVG shapes; if raster, <=1024 px long dimension or responsive equivalent; no baked UI/text |
| `floor` | Simple soft platform | CSS/canvas path is sufficient; top/collider remains exact |
| UI icons | Pause, sound, mode, lock, selected, warning | Local SVG or CSS with accessible text; system emoji not sole critical visual |
| Effects | Star/puff/small dust | Reusable vector particles; no large sprite sheet required |
| Audio cues | release, land, perfect, warning, tumble, reward, UI | Procedural placeholders first; approved files optional mono 44.1/48 kHz; small browser-compatible compressed runtime variants |

Bodies are drawn at fixed logical W×H. Source canvas can contain ears/tails outside the logical rectangle, but bounds must be declared and decorative overflow must stay within 0.10W horizontally, 0.25H above and 0.05H below. Do not bake contact shadows, expressions, HUD text or directional lighting that contradicts squash/rotation. Eyes/mouth overlays must remain legible when the body is ~80 px wide on small devices.

Body anchor: bottom-center of logical collider, not bottom-center of the PNG. Face anchor: normalized logical-body position (0.50,0.48) measured from logical top-left. Max default face drawn width 0.50W; art may refine overlay dimensions without changing collider. Squash/stretch occurs around bottom-center with area approximately conserved and total presentation displacement bounds respected. Approval of art does not authorize a physics-geometry change.

### Manifest shape (illustrative metadata, no file claims)

```json
{
  "manifestVersion": 1,
  "artStatus": "placeholder",
  "bodies": [{
    "id": "default",
    "url": "bodies/default.png",
    "sourceSize": [512, 384],
    "logicalRectPx": [48, 80, 416, 268.3870967742],
    "pivotPx": [256, 348.3870967742],
    "faceAnchorBodyUV": [0.5, 0.48],
    "provenance": "EXAMPLE ONLY — replace with real source/license",
    "approvalReference": null
  }],
  "faces": [],
  "sounds": []
}
```

This numerical example demonstrates bounds mapping; it does not describe a generated file. Runtime ignores physical dimensions inferred from transparent pixels. Validate URLs as local relative paths, positive finite dimensions, known IDs and logical aspect within 2% of 1.55; warn/fallback on invalid entries. Final bounds/pivot are Studio deliverables. Sprite atlases are optional: if used, include frame rectangle, trim/source size and logical pivot; no inferred padding.

Budget targets: default body+faces <=250 KB transfer, all optional coats <=600 KB, background <=350 KB, optional audio <=400 KB; aggregate first-load gate in `01` still applies. Measure actual encoded bytes; source artwork may be larger and stays outside runtime imports. No remote API fetch or runtime generation. Store source provenance and approval with assets; no paid API use is authorized by this spec.

## Asset handoff checklist

Studio provides production previews in the selected direction, consistent bounds/anchors, expression contact sheet, local manifest draft, provenance/rights and export sizes. Architect checks geometry and reactions; Developer integrates reviewed exports from the approved direction and keeps fallback paths. Material departures return to the user. xAI/Grok selection is confirmed via OG; final audio content/new charges are not approved by that selection alone. Unfinished art or audio does not block the playable placeholder milestone.

### Studio clarification — 2026-11-16

Studio's proposed rounded loaf cats, broad flat stacking silhouette, separate faces and quiet portrait background conform to this contract. Keep approximately95% of the game panel width visually quiet so the incoming cat at its travel extremes remains legible; scenery is never an extra collision platform. Concept boards may be higher-resolution sources; runtime exports still obey the dimensions/budgets above. First scene needs background, a separate floor, incoming/stacked cats, guide shadow and stability feedback; all title/score/mode/pause/Drop/Assist controls remain separate HTML. Architect sent these details in reply `9e7b95cc-ace0-4dee-8ec3-462b4d8128bd`. This is geometry/delivery agreement, not approval of a generated art option.
