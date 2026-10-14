# Launch economics: benchmarks, 12-month model, 90-day plan (Prata Raja)

Researched 2026-10-15. Android first, free, rewarded ads + cosmetic IAP, organic short-form video only. Confidence: **S** = number read on an opened page, **S-2** = opened but secondary/blog (author's claim), **E** = my estimate, not found. Honest headline: public data is thin; per-country SEA eCPM, hybrid-casual retention and indie outcome shares are NOT openly published, so those are E.

## 1. Benchmarks
| Metric | Number | Region / scope | Date | Conf | Source |
|---|---|---|---|---|---|
| D1 / D7 / D30, all mobile games, median | ~22% / <4% / 0.7-0.8% | global, 16k games | 2025 | S | [GameAnalytics 2026 benchmarks](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks) |
| Same, top 25% (P75) | >30% / 6-7% / 1.6-1.8% | global | 2025 | S | same |
| Same, top 10% (P90) | ~40% / 11-12% / n/a | global | 2025 | S | same |
| Casual/puzzle Android D1/D7/D30 | 28-32% / 9-12% / 3.5-5% | Android | Q3 2022 | S-2 | [GGA retention](https://gamegrowthadvisor.com/blog/2026-03-17-mobile-game-retention-strategies-2026/) (AppsFlyer data) |
| Survivor.io (peak survivor-like) D1/D7/D30 | 44% / 15% / 4% | global | Oct 2022 | S | [Mobilegamer.biz](https://mobilegamer.biz/two-months-in-survivor-io-passes-75m-from-37m-downloads/) (data.ai); outlier, funded UA |
| Hybrid-casual / survivor-like Android retention, median | not published | - | - | E | use casual row; GA 2026 has no genre split |
| Rewarded eCPM, casual Android, EU+NA | $8.90 | EU+NA | H1 2025 | S-2 | [GGA CPI](https://gamegrowthadvisor.com/blog/2026-03-17-user-acquisition-cpi-benchmarks-2026/) (TopOn) |
| Rewarded eCPM, LATAM/SEA Android | ~$1.6-2.2 | SEA | H1 2025 | S-2 | same (author: country data disagree ~12x) |
| Rewarded eCPM Android: NA $9.20, APAC $8.20 (skewed by JP/KR), LATAM $1.90 | by region | Mar 2026 (Appodeal) | S-2 | [Mistplay/Appodeal](https://business.mistplay.com/resources/mobile-ads-ecpm) |
| Rewarded eCPM US Android | ~$16.5 (Android), $19.6 iOS | US | 2026 | S-2 | [Playio](https://blog.playio.co/rewarded-ad-benchmarks-2026) (MAF) |
| Rewarded eCPM SG / MY / ID / PH / IN | ~$6 / $2.5 / $1.5 / $1.5 / $1 | per country | - | E | no open country-level source found |
| Ads vs IAP revenue split | casual ~50/50; IAP 40-60% in hybrid | - | 2026 | S-2 | [Audiencelab](https://audiencelab.ai/blog/mobile-game-monetization-strategies), GGA |
| Hybrid monetisation share of games | casual 33%, midcore 15% | global | 2025 | S-2 | [AppsFlyer via GameDevReports](https://gamedevreports.substack.com/p/appsflyer-the-state-of-the-mobile) |
| ARPPU / first purchase, Google Play RPG | first buy ~$8.30 (US top-grossing; ARPPU -42% YoY) | US | Dec 2025 | S | [AppMagic via GameDevReports](https://gamedevreports.substack.com/p/appmagic-mobile-games-monetization) |
| Payer conversion, cosmetic-only | 1-1.5% of installs; ARPPU ~$7 | - | - | E | no open source found |
| Casual Android CPI | US $1.50-3.50; SEA $0.20-0.60; India $0.08-0.30 | per region | Mar 2026 | S-2 | GGA CPI (Indonesia/PH not broken out) |
| India casual CPI Android / iOS | $0.12 / $0.50 | India | 2024 | S-2 | [Linkrunner](https://linkrunner.io/tools/cost-per-install-benchmark) |
| iOS CPI vs Android | plan 3-4x | - | 2026 | S-2 (author planning rule) | GGA CPI |
| Paid UA threshold for hybrid-casual | D7 ~18% before Tier-1 paid works | - | 2026 | S-2 (author estimate) | GGA retention |
| Store page visit -> install | Google Play 17.9%, App Store 8.7% | global | Apr 2026 | S-2 | [Mistplay/BoA](https://business.mistplay.com/resources/app-conversion-rates/) |
| Video views -> action | 1 wishlist per ~2,000 views (126M views, 62k wishlists, 1 post/1.96 days) | Steam PC | Aug 2022 | S | [Game Developer](https://www.gamedeveloper.com/game-platforms/this-game-used-tiktok-to-get-120m-views-60k-steam-wishlists-) |
| Views -> free mobile install | 1 per 1,000-2,000 views | - | - | E | derived: ~0.3% link click x 17.9% store CVR |
| Outcomes: share of mobile games <$1k / <$10k / >$100k | ~70% / ~90% / ~1-2% | - | - | E | no open mobile source; Steam analog is power-law (<0.5% of games = 80% of revenue, [Shane the Gamer](https://www.shanethegamer.com/research/indie-games-statistics/), not opened) |
| Mobile market | IAP $81.7B 2025, +1.3% YoY | global | Jan 2026 | S-2 | [GameWorldObserver](https://gameworldobserver.com/2026/01/21/in-2025-the-revenue-of-the-mobile-gaming-market-grew-but-only-slightly-analysis) (Sensor Tower) |

## 2. AI video and fixed costs
| Item | Number | Date | Conf | Source |
|---|---|---|---|---|
| Kling Standard / Pro | $8.80 / $32.56 per month (660 / 3,000 credits); 10s 1080p clip ~$1.60 / $1.30 | Oct 2026 | S-2 | [AIToolAnalysis](https://aitoolanalysis.com/kling-ai-pricing/) |
| Runway Standard / Pro / Max | $15 / $35 / $95 per month (625 / 2,250 / 9,500 credits) | Oct 2026 | S-2 | same |
| Veo 3.1 Std $0.40-0.75/s; Runway Gen-4.5 ~$0.12-0.15/s; Sora discontinued (web Apr 2026, API Sep 2026) | per second | Jul 2026 | S-2 | [BuildMVPFast](https://www.buildmvpfast.com/api-costs/ai-video) (page internally inconsistent) |
| CapCut Pro | ~$10/mo | - | E | not verified |
| Google Play account | $25 one-time; org account needs D-U-N-S (free from D&B); personal accounts need 12-tester/14-day closed test | 2026 | S (D-U-N-S, [Play Help](https://support.google.com/googleplay/android-developer/answer/13634885?hl=en)); S-2 ($25, testers) | [IconikAI](https://www.iconikai.com/blog/google-play-developer-account-fee-2026) |
| Apple Developer Program | $99/yr; 30% fee, 15% in Small Business Program (<$1M proceeds) | 2026 | S | [Apple](https://developer.apple.com/programs/whats-included/) |
| Google Play fee | Legacy 15% on first $1M, 30% above (still live outside US/UK/EEA/AU/JP until ~Sep 2027 RoW). US/UK/EEA from 2026-06-30: 20% new installs + 5% billing, 15%+5% if in Level Up; Google page conflicts with third-party blogs (10%/15%) | 2026 | S for dates/structure, E for final rates | [Play fees](https://support.google.com/googleplay/android-developer/answer/112622?hl=en), [Lower fees](https://support.google.com/googleplay/android-developer/answer/16954621?hl=en) |
| Payout thresholds | AdMob $100; AppLovin MAX $100 min, paid NET15 | 2026 | S | [AdMob](https://support.google.com/admob/answer/2772208?hl=en), [AppLovin](https://support.applovin.com/en/max/faq/what-are-applovins-payment-options-policies) |
| Mediation fee / backend | 0-3% haircut; Firebase/Supabase/PostHog free tiers to ~50k MAU, then ~$25-150/mo | - | E | - |
| Legal | EEA/UK/CH ad consent via Google UMP SDK ([Google](https://developers.google.com/admob/android/privacy/gdpr)); PDPA: PDPC 2024 children's-data guidelines (non-binding, clear notices, no profiling of minors, [PDPC](https://www.pdpc.gov.sg/guidelines-and-consultation/2024/03/advisory-guidelines-on-the-pdpa-for-childrens-personal-data-in-the-digital-environment)); privacy policy + data-deletion link on Play. Treat as a kids-adjacent audience: no personalised ads for under-13 | 2024-26 | S-2 | - |

## 3. Projection model (Android, 12 months, USD)
**Assumptions (all E unless stated):** retention power curve D1 30% / D7 8.8% / D30 3.5% (between GA P75 and Android casual, organic users) ; 2 rewarded impressions per DAU at blended eCPM $4 (30% tier-1 at ~$10, 70% SEA/IN at ~$2) = ARPDAU ads $0.008; 3% mediation haircut; payers 1.2% of installs, $7 per payer over 90d (cosmetics only, 60% recognised in install month); store fee on IAP 18% blended (15% SEA/IN, ~25% US/EEA); costs: tools $35/mo (Kling+Runway Std) rising to $60 from month 4, $25 Play fee month 1, Apple $99 month 6 (iOS planned), backend $0 / $25 / $150 per month by scenario. Views-to-install 1 per ~1,500 (so "catches" = 4k installs in the spike month ~6M views; "breakout" = 60k in peak month, ~70M views, only plausible with store-algo lift). Developer time and Claude/agent plan costs excluded.

| Scenario | Installs yr1 | DAU m3 / m6 / m12 (peak) | Ads net | IAP net | Costs | **Net yr1** |
|---|---|---|---|---|---|---|
| Quiet (300-500 installs/mo) | 4,750 | 48 / 65 / 109 (109) | $196 | $314 | $769 | **-$258** |
| One clip catches (spike m4: 4k, tail 1k/mo) | 16,200 | 101 / 344 / 290 (401, m5) | $717 | $1,091 | $1,069 | **+$739** |
| Breakout (m3 25k, m4 60k, tail 8k/mo) | 223,800 | 2,129 / 5,511 / 3,389 (6,292, m5) | $10,278 | $15,195 | $2,569 | **+$22,904** |

Read: even breakout is ~$2k/mo net by month 12 at 3k DAU. This is not a living wage; it funds tools. Covering $60/mo of tools needs ~120 DAU (about $0.50 net per DAU per month, ads plus IAP). AdMob $100 payout reached ~month 6 in quiet, month 4 in catches.

**LTV vs CPI (365-day, per install, same curve, ~7.5 active days/yr):**
| Geo | Ads LTV | IAP LTV (net) | Total | Casual Android CPI | Pays back? |
|---|---|---|---|---|---|
| US/tier-1 (eCPM $16, IAP 3x ARPPU) | $0.23 | $0.21 | ~$0.44 | $1.50-3.50 | No (needs 4-8x LTV) |
| SEA (eCPM $2) | $0.03 | $0.03 | ~$0.06 | $0.20-0.60 | No (3-10x short) |
| India (eCPM $1) | $0.015 | $0.02 | ~$0.04 | $0.08-0.30 | No |
| Blended organic | $0.058 | $0.069 | ~$0.13 | n/a | free installs only |

Paid UA makes sense only when blended 180-day LTV >= 1.2x CPI. At 2 imps/DAU that needs roughly D30 >= 6-7% (about 1.8x curve), 4+ rewarded imps per DAU, and payers >= 2.5%, then test tier-1 Android at $1.50 CPI against LTV $1.80. Until then spend on content, not ads. iOS CPI is 3-4x, so skip paid iOS entirely.

## 4. 90-day plan
**Days -30 to 0 (pre-launch):** Play org account (D-U-N-S takes weeks) or personal + 12 testers for 14 days; UMP consent, privacy policy, data-safety form; analytics events for D1/D7/D30 and ad opt-in; 20 clips banked; store listing with 3 gameplay clips. Soft-launch in SG/MY/PH/ID first (cheap, English/Singlish fit).
**Cadence:** 1 clip per day across TikTok, Shorts, Reels (same file, no watermark), batch 7 clips per weekend; Mortal Rite shipped 1 per ~2 days to reach 126M views, so daily is the ceiling worth trying. Link in bio and pinned comment to the Play listing; reply to every comment with a video once per week.
**Days 1-30 (learn):** clip mix: 40% bread-slap crit moments ("crit!" freeze frame + hit-stop), 30% Singlish regulars ("the usual, boss?" NPC lines with subtitles), 20% "POV your prata man is a hero" (AI-generated cinematic cold open then real gameplay), 10% dev-log/build progress. Gate: >=50 installs/week and D1 >= 28% before more effort on any single format.
**Days 31-60 (double down):** repeat the 2 best formats; seed posts in r/singapore, SG food and gaming Discords, Hardwarezone; post a "prata flip" ASMR variant; collaborate with 3-5 SG micro food/gaming creators (free key, no payment). Ship weekly patch notes as a clip. Target: one clip >100k views.
**Days 61-90 (extend):** if a clip catches, post 3 follow-ups within 48h in the same format, pin the Play link, add a limited cosmetic ("Merdeka prata" skin) timed to the spike; if nothing catches, change the hook (first 1.5s) not the cadence. Decide iOS only if D7 >= 10%.

## 5. KPIs and thresholds
| KPI | Scale / go | Hold and fix | Source of threshold |
|---|---|---|---|
| D1 | >= 35% scale content; >= 30% healthy (P75) | < 25% (near median, fix FTUE, no promotion) | GA 2025 + task brief |
| D7 | >= 10% | < 6% | GA P75 6-7%, casual 9-12% |
| D30 | >= 3.5% (casual Android) ; >= 6% before any paid UA | < 2% | GGA, E |
| Store CVR | >= 18% | < 12% | BoA 17.9% |
| Views per install | < 1,500 | > 4,000 (hook or CTA wrong) | E |
| Rewarded opt-in / imps per DAU | >= 2 | < 1 | E |
| Payer % / ARPPU | >= 1.2% / >= $7 | < 0.5% | E |
| 365d LTV / CPI | >= 1.2 for paid UA | < 1 | E |
| Crash-free sessions, ANR | >= 99.5%, < 0.47% (Play bad-behaviour threshold) | below | Play Vitals, E |

Kill signal: after 90 days D1 < 22% and < 20 installs/week means the loop or the hook is wrong; rework before posting more.
