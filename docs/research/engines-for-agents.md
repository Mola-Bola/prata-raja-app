# Engines for agent-built 2D mobile/web games (2026-10-15)

Question: would a different engine fix messy UI/HUD/feel for Prata Raja (Phaser 4 canvas + React DOM overlay, TS sim ~5.6k lines, 1,000 tests, agents build, human plays)? Verdict first, evidence below.

## Verdict
**Stay on Phaser 4. Do not switch engines.** The mess is a UI-architecture problem (two layers, no single design system), not an engine problem. Fix it inside the stack (see "Recommendation"). Scores are 1-5, higher is better; "est." = my judgement from sources below, not measured by us.

## Comparison (for OUR case: agents, portrait, web first, Android later)

| Engine | Agent-friendly | UI/theming | Feel tools | Mobile web size/perf | Android path | Reuse TS sim as-is | Total /30 |
|---|---|---|---|---|---|---|---|
| **Phaser 4 (stay)** | 5 | 2 (canvas) / 4 (DOM overlay) | 4 | 5 | 3 (Expo/Capacitor wrap) | 5 | **24** |
| PixiJS 8 + UI lib | 4 | 3 (@pixi/ui small) | 2 (no tween/particle/physics built in) | 5 | 3 | 5 | 22 |
| Kaplay | 4 | 2 | 3 | 3 | 3 | 5 | 20 |
| Excalibur.js | 3 | 2 | 3 | 4 | 3 | 5 | 20 |
| Godot 4 (GDScript) | 3 | 5 (Control + Theme) | 5 | 2 | 5 | 1 (rewrite or JS bridge) | 21 |
| Defold (Lua) | 2 | 3 (GUI nodes, weak) | 4 | 5 | 5 | 1 | 20 |
| Cocos Creator (TS) | 3 | 4 | 4 | 4 | 4 | 3 (TS, engine-coupled) | 22 |
| Unity (+MCP) | 3 | 4 (UI Toolkit) | 5 | 1 (WebGL) | 5 | 1 | 19 |
| Bevy (Rust) | 2 | 2 | 3 | 2 | 3 | 1 | 13 |
| Plain DOM/CSS | 5 | 5 | 2 (CSS anims only) | 4 | 3 | 5 | 24 (only for UI-heavy, low-action) |
| react-three-fiber | 4 | 3 | 3 | 3 | 3 | 5 | 21 (3D tool, overkill for 2D) |

Plain DOM ties Phaser only if the game is not action-in-canvas; ours is. Noesis (Unity/native UI) skipped: needs Unity/native, per-seat license, no web target worth the cost.

## Evidence per criterion

### 1. Agent / LLM friendliness
- Text-first projects win. A dev who built the same game in Godot 4.7 and Phaser 3.90 notes both are text-readable, but Phaser/JS has "an AI advantage" in model familiarity (JSLegendDev, 2026-02, comparing Phaser/Kaplay/Excalibur: "If you want stability and performance, you should pick Phaser", and Phaser has an AI advantage). Source: https://jslegenddev.substack.com/p/i-tried-3-web-game-frameworks-so ; https://phaser.io/news/2026/04/phaser-vs-kaplay-vs-excalibur-2d-web-game-framework
- GDScript: the dominant AI failure is version drift (Godot 3 `yield`/`KinematicBody` vs Godot 4 `await`/`CharacterBody2D`), because Godot 3 material dominates indexed text; one Godot-agent builder wrote "LLMs barely know GDScript" and had to build a custom spec + lazy-loaded API reference (~850 classes). Found via exa search "Claude Code Godot GDScript hallucination" (results in session, no single canonical URL).
- Godot has the richest agent tooling: several MCP servers with screenshots, input injection, deterministic playtest, headless ops: satelliteoflove/godot-mcp (172 stars), hybridindie/godot-mcp (194 tools), aigengame/godot-agent (CLI + skill + MCP), beckettlab/beckett-godot-mcp. https://github.com/satelliteoflove/godot-mcp https://github.com/hybridindie/godot-mcp https://github.com/aigengame/godot-agent . All created Dec 2025 - Jun 2026: young, 83 open issues on godot-agent alone.
- Phaser has no engine-specific MCP, but we already have what matters: Playwright testIDs, `npm run snap` contact sheets, deterministic sim with a bot. In a browser engine, an agent's screenshot/DOM/console loop is free. Phaser 3 AI-in-a-month case: https://phaser.io/news/2024/09/making-a-game-in-1-one-month-with-phaser-and-ai
- Bevy: API churn is "the #1 cause of AI-hallucinated game code" per a Bevy-agent framework (Plinth) pitch. Unity: scenes/Inspector state is largely invisible to text-only agents (pixelgamecraft, below).
- Agent-process lesson from AI game pipelines: generated code fragility (init order, patch accumulation) is engine-independent. https://aigamingdev.com/roadmap/lessons/

### 2. UI / HUD / theming
- Godot Control nodes + Theme resources are the best built-in "one design system" story among the options (est.). Unity UI Toolkit (USS) also good. Both cost the sim rewrite.
- Phaser canvas UI is weak: rexUI (plugin, `phaser4-rex-plugins` exists for Phaser 4) gives sizers/dialogs but no CSS-style theming; text layout, a11y, and i18n are DIY. Our React DOM overlay is the stronger layer for UI; the cost is two coordinate systems (canvas vs DOM) and two sources of style. https://github.com/rexrainbow/phaser3-rex-notes
- Fix without an engine change: DOM owns ALL chrome (HUD, menus, sheets) styled by `src/ui/brand.ts` tokens as CSS variables; canvas draws only world-space things (hit numbers, bars on enemies). One rule, enforced by a lint/test: no text drawn in Phaser except world-space damage numbers.

### 3. Game feel tooling
- Phaser: tweens, timelines, particles (Phaser 4 new particle/filters system), camera shake/flash/zoom, FX filters all built in. Phaser 4 is a full WebGL renderer rewrite (render nodes, filters). https://phaser.io/tutorials/phaser-4-rendering-concepts
- PixiJS: renderer only; tween/particles/camera are separate libs (more agent glue). Kaplay: easy API, "least scalable", perf not near Phaser (JSLegendDev).
- Godot/Unity/Cocos/Defold: strongest (AnimationPlayer, shaders, particles editors) but editor-authored, which agents handle worse than code.

### 4. Mobile web perf + bundle
- Measured same game, Godot 4.7.2 vs Phaser 3.90: Godot 40.5 MB raw / 12.3 MB gzip (wasm 37.68 MB); Phaser+Vite 4.4 MB raw / 1.8 MB gzip, about 7x gap compressed. Also: 1.3 GB export templates, headless CLI export step, JS bridge polling for ad SDK. https://pixelgamecraft.com/blog/best-html5-game-engine/
- Same article (not hands-on): Unity WebGL ~8 MB empty, 15-50 MB real; Defold ~1.1 MB empty; PixiJS ~200 KB core.
- Godot web: size regression 3.x to 4.x (issue #68647, open, confirmed regression) https://github.com/godotengine/godot/issues/68647 ; Safari memory kill on web exports (issue #89169, closed as third-party/Safari bug) https://github.com/godotengine/godot/issues/89169 ; a trick to shrink templates 64 MB to 2.4 MB with custom builds https://amann.dev/blog/2025/godot_web_size/
- Unity WebGL on phones: documented 50 MB/mobile build trouble https://discussions.unity.com/t/unity-6-webgl-build-size-limit-for-phones-is-50mb/948431
- Web size reference: https://www.karlschmidt.net/Web-Game-Engine-Size-Review-2023/ ; Poki guide https://developers.poki.com/guide/web-engine ; Defold web talk https://defold.com/presentations/w3c_june_2023.pdf

### 5. Android path
- Godot/Unity/Defold/Cocos: native export, best. JS engines (Phaser/Pixi/Kaplay): WebView wrap via Capacitor or our current Expo shell; fine for a 2D game, worse input latency/battery than native (est.). Not needed until the web build is proven; DIRECTION says web is the target.

### 6. Migration cost
- JS-family (Pixi, Kaplay, Excalibur, Cocos TS): sim runs unchanged; only the render layer and scene glue move.
- Godot/Unity/Defold/Bevy: sim must be rewritten or run in a JS bridge, losing 1,000 tests' value (their determinism proof lives in TS). Rewriting 5.6k lines + porting 1,000 tests is the real cost, not the rendering.

## Recommendation for Prata Raja: STAY (with an inside-the-stack fix)
1. **Do not switch engine.** No engine in the table removes the need for a design-system decision, and every one that beats Phaser on UI (Godot, Unity) loses on web size (7x for Godot in the one measured head-to-head) and forces a sim rewrite. Owner's target is the web build.
2. **Fix the mess with a UI contract, not an engine:** (a) DOM owns all chrome and text, canvas owns world only; (b) one token source `src/ui/brand.ts` emitted as CSS variables; (c) one HUD layout component with safe-area handling, tested by Playwright testIDs and by `npm run snap`; (d) one feel module (hit-stop, shake, squash, particles presets) called from sim events, with named presets. Est. 6-12 agent-hours (3-5 slices) at Haiku-worker cadence.
3. **Hybrid is not worth it** unless pieces are cheap: adding Godot only for a sub-game (e.g. Kitchen) would duplicate the shipping pipeline and add a 12 MB gzip payload.
4. **Trigger that would justify a switch:** (i) we commit to a native Android store release as the primary target with a measured input-latency or frame-time failure in the WebView on a mid-range phone (say p95 frame > 20 ms at 60 fps with our real scene); or (ii) the owner wants a 3D/skeletal-animation art direction that Phaser cannot do. Not "UI is messy".
5. **Cost if the trigger fires:** Godot 4 port = rewrite sim (5.6k lines TS to GDScript, or keep TS sim in a JS bridge, web-only) + 1,000 tests re-derived against golden traces from the TS sim + rebuild all screens. Est. 150-300 agent-hours (about 40-80 worker slices) plus 20-40 hours of Sonnet sim review, and a freeze on new features. Cheaper off-ramp for Android only: keep Phaser, wrap with Capacitor, re-measure first (est. 8-16 agent-hours).
6. **Cheap upgrade worth trying first:** nothing to install. If canvas text/layout is needed, try `phaser4-rex-plugins` rexUI for in-canvas pickers only (JS-only package, no APK impact, still subject to the "no new deps for lines we can write" rule).

## Skipped on purpose / gaps
- No agent-built postmortem found for Cocos Creator, Defold, Kaplay, Excalibur beyond JSLegendDev's single comparison; scores for those are est.
- Godot LLM accuracy: only anecdotal/blog evidence of version drift; no benchmark found.
- Unity MCP not evaluated beyond web-size evidence; disqualified on size/rewrite before tooling matters.
- Noesis: not researched (Unity/native only).
- Not run: our own Phaser frame-time on a mid-range Android. That is the one measurement that would change this verdict.
