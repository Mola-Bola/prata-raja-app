# Prata Raja backlog

Owner notes are intent, not spec. Each line says where it lands.

## Owner playtest, 12 Oct (0.1.1 on APK + web)
- **In 0.2.0:** counter attackers are target #1; breach warning (red pulse on the counter edge + "!" + HP flash); card text ≤ 8 words; title start button no longer covers the hero.
- **In flight (s2/feedback):** "Tell Kannan" feedback inside the game → factory inbox; PostHog analytics + session replay (with canvas) + error tracking inside the game.
- **S3 fold-ins (renderer + art):**
  - Pests visibly attack at the counter (lunge / bite / swing with an impact on the steel), not just stand there.
  - Dip bowls and collected breads sit naturally on the counter: fixed slots in perspective, contact shadows, maybe a bowl tray and a bread basket rendered to match.
  - Steam rising from the tawa (rendered wisps, subtle).
  - Spawns come from the far end of the street and wander/curve into the road; never out of the buildings, never marching in straight columns (match the projection to the art's street width at the horizon).
- **Design pass (lead + Codex), then build:**
  - Themed card borders and text: banana leaf (common) · steel thali (rare) · brass kolam (epic) · rangoli (evolutions), replacing the generic purple/gold gems.
  - On-theme dip powers with their own mechanics (masala's chain and mint's freeze feel generic; condensed-milk "diabetes" is the bar to match).
