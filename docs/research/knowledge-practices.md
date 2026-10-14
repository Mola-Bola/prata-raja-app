# Knowledge practices for Prata Raja (research, 2026-10-14)

## Findings

**1. Karpathy's "LLM wiki" (gist, 2026)**
- Three layers: raw sources (immutable, LLM reads only), wiki (LLM-owned markdown: summaries, entity/concept pages, overview), schema (CLAUDE.md/AGENTS.md defining structure and workflows). Source: https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f
- `index.md` = catalog with one-line summary per page, read first on queries. `log.md` = append-only, grep-able record of ingests/queries/lints.
- Ops: ingest (one source at a time, touches ~10-15 pages), query (answers cite pages; good answers can be filed back as pages), lint (contradictions, stale claims, orphans, missing cross-refs).
- Backlinks are not a named feature; cross-references are. Tools named: Obsidian, qmd (optional local search), git, grep.
- Community write-ups: https://www.mindstudio.ai/blog/andrej-karpathy-llm-wiki-knowledge-base-claude-code , https://blog.starmorph.com/blog/karpathy-llm-wiki-knowledge-base-guide , https://hermes-agent.nousresearch.com/docs/user-guide/skills/bundled/research/research-llm-wiki

**2. Claude Code memory, 2026**
- CLAUDE.md is loaded every session; auto memory is per-repo and loaded at start (first 200 lines or 25KB). Both are context, not enforced config. Source: https://code.claude.com/docs/en/memory
- Concise rule: "Would removing this cause Claude to make mistakes?" If not, cut it. Bloated files get ignored. Source: https://code.claude.com/docs/en/best-practices
- Use skills for workflows/domain knowledge that is only sometimes needed; use `.claude/rules/*.md` with `paths:` frontmatter to load on matching files. Hooks are deterministic; CLAUDE.md is advisory. Same sources.
- AGENTS.md: the memory docs say Claude can read AGENTS.md in place of CLAUDE.md, but a third-party write-up says it does not read AGENTS.md directly. Safest: keep `CLAUDE.md` with `@AGENTS.md` import (verify in /context). https://stevekinney.com/courses/ai-development/claude-dot-md
- Nested CLAUDE.md files concatenate up the tree; subdirectory ones load on access. https://www.alexdunlop.com/writing/claude-md-best-practices
- Docs drift: put drift checks in CI and treat docs as code. ADRs (docs/adr/) explain "why A not B." https://dev.to/eme_gug_0821b41b948be6516/agents-dont-need-memory-they-need-documentation-a-practical-agentsmd-playbook-18mm
- Making agents respect research: an index with one-line "read before designing X" pointers, a source path or commit each doc was verified against, and date-stamped decision records. https://github.com/STAIxBWLB/agent-hub/issues/188 , https://repowise.dev/blog/guides/use-git-history-to-catch-stale-adrs-before-they-mislead-agents

**3. Stale code and docs in a TS repo**
- knip finds unused files, exports, and dependencies; `--fix` edits source, so review first. https://knip.dev/typescript/unused-exports , https://github.com/webpro-nl/knip
- Known caveat: knip can miss deps used via config (env-gated code); verify before deleting. https://knip.dev/guides/handling-issues
- Doc staleness: `git log -1 --format=%cs -- <file>` for last-touched dates; a link checker for internal paths. (No tool research needed.)

## Recommended for Prata Raja

- **Wiki layout (no new system):** keep `docs/research/` as the wiki. Each page starts with a header: `Verified: <date> @ <short sha>`, plus source paths it covers. Log lint results in `docs/research/INDEX.md` rather than a separate log.
- **Research index:** one `docs/research/INDEX.md` table: `topic | one-line summary | "read before designing X" trigger | file`. Create it once; add a row per new page.
- **AGENTS.md (≤15 lines):** only what the agent cannot discover: run commands, the research index pointer, the "check INDEX.md before designing X" rule, and where ADR-style decisions go. Make `CLAUDE.md` import it with `@AGENTS.md`, and trim the current 65-line CLAUDE.md to match.
- **Stale check (one tool):** add knip to devDependencies (`npx knip`, report only, no `--fix`) and run it manually or in CI. Skip hook-based doc checks until a real drift problem shows up.
- Do not add a wiki ingest/lint pipeline or auto-memory config yet; reassess after the index is in use.

## Open items
- Did not open every cited source in full; the Karpathy gist and memory doc were read via summary.
- knip false-positive behavior is from a third-party guide, not verified on this repo (knip is not yet in package.json).
