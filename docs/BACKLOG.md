# Prata Raja backlog

Owner notes are intent, not spec. Each line says where it lands.

## Owner playtest, 12 Oct (0.1.1 on APK + web)
- **In 0.2.0:** bosses can't be perma-frozen (freeze/stun → slow on bosses, half CC on elites, 3 s immunity after any CC); counter attackers are target #1; breach warning (red pulse on the counter edge + "!" + HP flash); card text ≤ 8 words; title start button no longer covers the hero.
- **In flight (s2/feedback):** "Tell Kannan" feedback inside the game → factory inbox; PostHog analytics + session replay (with canvas) + error tracking inside the game.
- **Feel pass right after 0.2.0 (owner: "the throwing looks cheap"; damage numbers, hit feedback and mob attacks matter most now):**
  - Throw motion: anticipation → release → follow-through with tweened arm/body (plus a rendered throw sequence for Kannan), the prata leaving his actual hand, spin + motion trail + perspective shrink, a puff at release.
  - Damage and hits: bigger bouncy numbers with outline, crits louder (yellow, bigger, "!"), DoT ticks merged so they don't spam, a real hit reaction on enemies (flash, squash, small knockback hop).
  - Mobs attack at the counter: lunge / bite / slam per kind, impact spark on the steel, small shake, HP pill reacts.
- **Next, first in the S3 renderer pass (owner clips 19:53-19:55):** the fight happens too far away — pests stay tiny at the horizon, spawn in rows and die up there while mid-street stays empty. Fix: emerge from the street's far end with a short fade-in and wander into the road; flatter perspective (view.far ~0.42) so far pests read bigger; spawn depth nearer mid-street so most of the fight is visible; re-check balance with the bot.
- **S3 fold-ins (renderer + art):**
  - Pests visibly attack at the counter (lunge / bite / swing with an impact on the steel), not just stand there.
  - Dip bowls and collected breads sit naturally on the counter: fixed slots in perspective, contact shadows, maybe a bowl tray and a bread basket rendered to match.
  - Steam rising from the tawa (rendered wisps, subtle).
  - Spawns come from the far end of the street and wander/curve into the road; never out of the buildings, never marching in straight columns (match the projection to the art's street width at the horizon).
- **Design pass (lead + Codex), then build:**
  - Themed card borders and text: banana leaf (common) · steel thali (rare) · brass kolam (epic) · rangoli (evolutions), replacing the generic purple/gold gems.
  - On-theme dip powers with their own mechanics (masala's chain and mint's freeze feel generic; condensed-milk "diabetes" is the bar to match).

## Later: real places (owner, 12 Oct)
Chapters become recognisable Singapore food spots with living ambient detail (swaying lanterns, ceiling fans, steam, birds, a crowd that moves): e.g. Kopitiam Street → Newton Food Centre at night → Tekka Centre → Lau Pa Sat's satay street → Gluttons Bay finale. Stylised and respectful; no real stall names or logos.

## Owner ideas (loose; fold in where they fit)
- **Tawa Heat (12 Oct):** an endurance/rage meter that rises the longer you hold the stall — the tawa burns hotter and hotter and boosts damage. Sketch: hits/kills add heat; getting hit or sliding sheds it (rewards the stop-to-throw rhythm); tiers add damage and throw speed; full heat triggers a short "Tawa Blaze" burst, then settles back to half. Shown on the tawa itself (glow, steam → flames, Kannan sweating), not as a bar. Fits the feel pass or S3; tune with the bot.
