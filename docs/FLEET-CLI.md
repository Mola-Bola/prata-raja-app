# Fleet CLI

Requires Node with `node:sqlite` (the bench uses Node 26). Run from a repository or its linked worktree. All worktrees resolve the same common Git root `.fleet/ledger.db`. No cloud data is accessed.

Create a JSON task file with `source`, `intent`, `brief`, and `owned` (explicit repository relative files or directories). Optional `dependsOn` is an array of existing task IDs; `priority` is an integer (larger first); `decision` records the rationale. Add only lead-approved contracts consistent with DIRECTION and recent decisions.

```sh
node scripts/fleet.mjs add /path/to/task.json
node scripts/fleet.mjs list
node scripts/fleet.mjs claim worker-name 1
node scripts/fleet.mjs status 1 building
node scripts/fleet.mjs status 1 shipped 'Released in 0.4.3'
node scripts/fleet.mjs status 1 verified 'Post-ship checks passed'
node scripts/fleet.mjs workers 3 --dry-run
node scripts/fleet.mjs workers 3
```

`add`, `claim`, and `status` return JSON rows. `claim` returns null when unavailable. Claims use `BEGIN IMMEDIATE`: directories overlap their descendants, and a task waits for dependencies to be shipped or verified. Globs and parent traversal are rejected. Claimed, building, ready, and failed tasks retain ownership until the lead ships/drops them or deliberately reopens them with a decision note. Terminal verified/dropped rows cannot reopen; record a new row. Status updates and decision notes are durable; the lead is responsible for shipped/verified decisions.

By default every mutation regenerates the **common root** `docs/LEDGER.md` under the same write lock. `render` repairs a stale snapshot after an interrupted process. The database is authoritative; the Markdown view is for review and commits.

Workers invoke `scripts/slice.sh` using unique task/attempt names and ports, with no merge or ship step. Each loop handles at most ten tasks, stops on its first failure, and kills its slice process group after an hour. Ready rows await lead review; failed rows retain ownership so unfinished branches cannot race another task. A process or machine crash may leave building claims: inspect its process/worktree/report before marking failed, dropping, or reopening with a reason. No automatic stale-claim takeover. Dry run lists pending contracts without claiming or building them.

Release/background callers use `openLedger(repositoryPath, { render: false })` to avoid dirtying the shipping checkout. The lead runs `render` and commits the snapshot after shipping.

JavaScript integration:

```js
import { openLedger } from './fleet.mjs';
const ledger = openLedger(repositoryPath);
try {
  const row = ledger.add({ source: 'verifier', intent: 'Check release', brief: 'Run post-ship checks', owned: ['verification/0.4.3'], priority: 100 });
  ledger.status(row.id, 'verified', { note: 'Checks passed', release: '0.4.3', result: { ok: true } });
} finally { ledger.close(); }
```

Exported methods: `add(task)`, `list()`, `claim(worker, id?)`, `status(id, state, {note, branch, release, result}?)`, `render()`, `close()`. Exported `workers(cwd, {count, maxTasks, timeoutMs, dryRun})` accepts bounded loop settings. Use synthetic `verification/<release>` ownership for check-only rows; verifier regressions get concrete source ownership and high priority. Workers execute trusted lead briefs; ledger claims are coordination, not a filesystem security sandbox.

`node scripts/fleet.mjs triage <id>` explicitly calls the configured Jev overlap judge and records its advisory as a decision note; it never overrides atomic path checks or changes status. Run only when that service's usage is authorized. No Jev calls happen automatically. Missing configuration requires lead judgement.

Before marking a slice ready, the worker requires a successful result pinned to the branch HEAD, an ancestor base, and a Git diff entirely inside its owned paths (including deleted and renamed paths). Include the worker report path in the original ownership contract when the brief asks for a committed report.
