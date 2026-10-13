# Sources: game-design reference data

Gathered 2026-10-12 for internal design reference only. Nothing here is for shipping.
Wiki text is CC BY-NC-SA. Game IP belongs to Grinding Gear Games (PoE) and Nexon (MapleStory).

## Path of Exile

### PoE Wiki Cargo API (used)
- **URL:** `https://www.poewiki.net/w/api.php?action=cargoquery&format=json&tables=<table>&fields=...`
  Tables used: `skill_gems`, `skill`, `skill_levels`, `passive_skills`, `ascendancy_classes`, `character_classes`, `mods`, `mod_stats`.
- **Data:** support gem names, tags, level-20 stat lines and cost multiplier; skill descriptions; keystone and ascendancy node stat lines; ascendancy and base-class mapping; affix tiers with roll ranges.
- **Access:** GET, JSON. `fields=_pageName=Page,...` works. Bare `_pageName` returns MWException. POST returns HTML help. `LIKE` on list fields returns MWException. HTTP 429 appeared on bulk paging; about 2.5 s between calls plus backoff worked.
- **Licence / terms:** footer link `licenses/by-nc-sa/3.0/` (CC BY-NC-SA 3.0). The wiki disclaimers say GGG owns the game IP. Internal reference only.
- **Freshness:** live state at fetch, 2026-10-12. These tables do not pin a game version.
- **Reliability:** community-edited. Some placeholder notable names (Occultist `<<HRB..>>` nodes, Deadeye flavour names). Four keystones have no stat line. The `cost_multiplier` field is populated on only 2 of 235 level-20 support rows, so mana multipliers are effectively not published here.

### PoE Wiki Special:CargoTables (schema)
- **URL:** `https://www.poewiki.net/wiki/Special:CargoTables/<table>`
- **Data:** column names per table (read from the table header cells).
- **Access:** HTML.
- **Licence / freshness / reliability:** as above. Schema only.

### RePoE (inspected, not used for data)
- **URL:** `https://github.com/brather1ng/RePoE` (data under `RePoE/data/`).
- **Data:** community export of PoE game data (mods, gems, passives, base items).
- **Access:** GitHub API via `gh` (metadata, LICENSE, commits). No data files downloaded.
- **Licence:** code is MIT (`LICENSE.md`). The same file says the generated data files are owned by Grinding Gear Games and must not be used or published except under GGG's terms. This is why GitHub reports "Other".
- **Freshness:** last commit 2022-09-06, so stale against current content. 327 stars.
- **Provenance:** generated from game client files through PyPoE (GGPK parsing), so client extraction. Excluded.

### PoE official developer docs (read, not used for data)
- **URL:** `https://www.pathofexile.com/developer/docs`
- **Data:** OAuth, account profile, leagues, stashes, PvP, currency exchange. No gem, passive or mod tables. A data-export section is linked but its contents were not shown.
- **Terms (as summarised from the page):** no commercial revenue from GGG IP; apps that interact with game files are prohibited; identifiable User-Agent; non-affiliation notice for public apps; dynamic rate limits; new app registration currently unavailable.
- **Freshness:** 2026-10-12. **Reliability:** official, but not a design-data source.

### GGG terms and fan policy (not read in full)
- `https://www.pathofexile.com/legal/terms-of-use-and-privacy-policy` is linked from search but not read in full. The fan-content-policy URL I tried returned 404, and no standalone GGG fan policy turned up. Working rule: follow the developer-docs terms and the wiki disclaimers.

## MapleStory

**Provenance flag for the lead.** None of the wiki pages read states how its stats are collected, and no client-extraction pipeline is documented. Nexon's MapleStory Terms of Service and Open API terms were not retrieved. Treat every value here as community-compiled until those terms are read.

### MapleStory Wiki, maplestorywiki.net (used)
- **URLs:** `/w/Night_Lord`, `/w/Night_Walker`, `/w/Thief`, `/w/Assassin`, `/w/Potential`, `/w/Throwing_Star`, `/w/Equipment` (set list), `/w/Pitched_Boss_Set`, `/w/Dawn_Boss_Set`, `/w/Arcane_Umbra_Set_(Warrior)`, `/w/AbsoLab_Set_(Warrior)`, `/w/Root_Abyss_Set_(Warrior)`.
- **Data:** job advancement levels and quest names; potential rank rules and max stat %; throwing star table; set effect tables with cumulative totals.
- **Access:** HTML, fetched with curl and a non-identifying User-Agent, tables parsed from the HTML. `api.php` returns 404 "No such action", so the API is disabled.
- **Licence / terms:** footer: "Content is available under Creative Commons Attribution-NonCommercial-ShareAlike unless otherwise noted." Nexon owns MapleStory. Internal reference only.
- **Freshness (page "last edited" footers):** Night Lord and Night Walker 18 Mar 2026; Potential 12 Oct 2026; Equipment 22 Sep 2026; Assassin 18 Jun 2026 (tagged GMS v246); Pitched Boss 4 Jun 2026; Dawn Boss 30 Mar 2026; Arcane Umbra (Warrior), AbsoLab (Warrior) and Root Abyss (Warrior) 26 Jun 2026. **Throwing Star: 5 Feb 2022**, an old revision (oldid=310283), so its list may be incomplete.
- **Reliability:** community wiki. Its 3rd/4th job levels (60/100) agree with the StrategyWiki snippet and disagree with the older wikibooks values (70/120).

### StrategyWiki (not accessed)
- **URL:** `https://strategywiki.org/wiki/MapleStory/Job_Advancements`
- Returned a Cloudflare "Just a moment..." 403 to automated fetch. Not bypassed. Only a search snippet was seen (3rd job 60, 4th job 100).

### en.wikibooks MapleStory/Jobs (snippet only)
- **URL:** `https://en.wikibooks.org/wiki/MapleStory/Jobs`
- Search snippet only: 3rd job 70, 4th job 120. Not fetched. Treat as an older version.

### idle.maplestorywiki.net (not applicable)
- **URL:** `https://idle.maplestorywiki.net/w/Equipment`
- Spin-off game (MapleStory Idle) with a different tier ladder (Normal to Legendary+). Not used.

### MapleStory Classic database, meowdb.com / NiaMeowDB (search snippets and homepage only)
- **URL:** `https://meowdb.com/msclassic/`
- **Data:** Classic-version item and skill data, seen only through search snippets (throwing stars; Hermit skills Avenger and Shadow Partner).
- **Licence / terms:** none stated. Footer: "NiaMeowDB is a fan project. MapleStory and all related assets are property of Nexon." Its Terms and Reuse pages were not read.
- **Provenance:** not stated. The homepage mentions "in-game data" from a test server, which suggests client-derived data (unverified).
- **Use:** Classic version only. Used solely for a flagged note on Hermit; no GMS values taken from it.

### maplestory.io (homepage only)
- **URL:** `https://maplestory.io`
- **Data:** game images and data served from WZ-style asset paths.
- **Licence / terms:** none stated. The disclaimer says media, icons, descriptions and character information are Nexon property.
- **Provenance:** the asset paths suggest client extraction (inferred, not stated). Treat as client-derived. Not used.

### Nexon Open API (official, terms not read)
- **URL:** `https://openapi.nexon.com/` (JavaScript app; fetch returned navigation only). Mentions "Login for Game Data Usage" and app registration. Its Terms and Conditions were linked but not read.
- **Search snippets:** a MapleStorySEA news post dated 21 Apr 2025 previews an OpenAPI for live game data (status unknown). A PyPI client says it reaches KMS data only.
- **Freshness / reliability:** unknown. Read Nexon's MapleStory Open API terms before any use beyond internal reference.

### Summary for the lead
- maplestorywiki.net: provenance not stated; not confirmed as client extraction.
- maplestory.io and meowdb/NiaMeowDB: likely client-derived (inferred), not used for any value.
- Nexon Open API: official; terms and data scope not confirmed.

## Open-source game code (GitHub)

- **URLs:** `https://api.github.com/repos/<owner>/<repo>` and `https://github.com/<owner>/<repo>` (20 repos in `oss/repos.json`).
- **Data:** stars, licence (from the LICENSE file), last push, language, and the opening of each README for technique notes.
- **Access:** `gh api repos/<owner>/<repo>` and `gh api repos/<owner>/<repo>/readme`. Discovery via `gh search repos` with queries: vampire survivors clone; bullet heaven roguelite; survivors-like phaser; roguelike library javascript; phaser roguelike; godot survivors; bullet hell godot; roguelike open source. No code was cloned or copied.
- **Licence / terms (per repo LICENSE):**
  - MIT, Apache-2.0, BSD-3-Clause (11): reusable with attribution.
  - MPL-2.0 (bitECS, 1): reusable with file-level copyleft.
  - GPL-2.0-or-later, GPL-3.0, AGPL-3.0 (4): study only.
  - No licence (4): study only. This includes phaserjs/examples (no LICENSE file) and robsonek/cosmic-survivors (its README has an MIT badge but no LICENSE file; ask the owner).
- **Freshness:** stars as of 2026-10-12. Last pushes range from 2023 to 2026.
- **Reliability:** licence detection depends on the LICENSE file being present. Technique notes come from READMEs, not code review. Several repos are tutorials or learning projects.

## Not accessible or not used
- StrategyWiki (Cloudflare challenge; not bypassed).
- GGG fan-content policy URL (404).
- Nexon MapleStory Terms of Service and Open API terms (not retrieved).
- RePoE data files (GGG-owned, client-extracted, stale; code licence is MIT).
