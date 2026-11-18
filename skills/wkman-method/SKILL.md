---
name: wkman-method
description: "Method of the agent rb-compound:wkman, preloaded by it. A request for wkman launches the agent rb-compound:wkman; this skill is never applied inline."
---

# wkman — the long worktree of a feature or an epic

You run a fixed procedure, one git or herdr command per step, and print one report. You never improvise another command. No script ships with this agent.

## Invocation

```
wk <name>             # alias of wk open <name>
wk open <name>
wk close <name>
```

`<name>` is a feature, an epic, or a branch written `feat/<x>` or `epic/<x>`.

## Rules

- Never run `git switch`, `checkout`, `merge`, `rebase`, `commit`, `fetch`, `prune`, `branch -d`. The main checkout's HEAD never moves.
- Never pass `--force`, to git or herdr.
- An existing worktree is never moved, recreated or re-initialised.
- A refusal writes nothing: no branch, no directory, no herdr workspace. Stop at the first refusal and print the report.
- Every Bash call starts a fresh shell: carry each value found (main checkout, branch, path) as a literal into the next command.
- Shell: zsh/bash on macOS and Linux, PowerShell on Windows, chosen on the session's platform. Commands below give both where they differ.

## Step 1 — main checkout

The main checkout is the parent of the absolute git common dir, wherever the caller stands (main checkout or any linked worktree). Every later git and herdr call targets it.

```sh
dirname "$(git rev-parse --path-format=absolute --git-common-dir)"
```

```powershell
Split-Path -Parent (git rev-parse --path-format=absolute --git-common-dir)
```

Not a git repo → say so in one line and stop, no report.

## Step 2 — name to branch

- `<name>` starting with `feat/` or `epic/` → that branch, verbatim. No lookup.
- Otherwise search `<main>/features/`, `__done/` excluded:
  - epic: an `*.epic.md` whose header declares `**Epic :** <name>` (also accept `**Epic:**`);
  - story: a `<name>/<name>.story.md`.
- Epic and story both found → `refused: ambiguous name: epic and story`. The report suggests `wk feat/<name>` or `wk epic/<name>`.
- Epic only → `epic/<name>`.
- Otherwise → `feat/<name>`. No story found → note `no story found for <name>`.

```sh
grep -rlE --include='*.epic.md' --exclude-dir=__done '^\*\*Epic ?:\*\* *<name> *$' "<main>/features"
find "<main>/features" -name __done -prune -o -path '*/<name>/<name>.story.md' -print
```

```powershell
Get-ChildItem "<main>\features" -Recurse -Filter *.epic.md | Where-Object FullName -notmatch '\\__done\\' | Select-String -Pattern '^\*\*Epic ?:\*\* *<name> *$' -List
Get-ChildItem "<main>\features" -Recurse -Filter '<name>.story.md' | Where-Object { $_.FullName -notmatch '\\__done\\' -and $_.Directory.Name -eq '<name>' }
```

Story of an epic: the directory holding the story's directory contains an `*.epic.md`. Read its `**Epic :**` value `<epic>` (`grep -h -m1 -E '^\*\*Epic ?:\*\*' <dir>/*.epic.md`): the epic branch is `epic/<epic>`. It never redirects: `wk <story>` opens `feat/<story>`. Step 4 reports the epic's worktree when one exists.

Status, for close (step 8): the first `**Status` line of the story or epic file (`grep -m1 '^\*\*Status'`).

## Step 3 — herdr usable?

Usable means `herdr` on PATH and `herdr worktree list --cwd <main>` exiting 0. Installed is not enough: the CLI needs the running herdr server.

```sh
command -v herdr >/dev/null || echo absent
herdr worktree list --cwd "<main>"; echo "exit=$?"
```

```powershell
if (-not (Get-Command herdr -ErrorAction SilentlyContinue)) { 'absent' }
herdr worktree list --cwd "<main>"; "exit=$LASTEXITCODE"
```

- Not on PATH → `herdr: absent`.
- On PATH, list fails → `herdr: unreachable`. Continue on the git path.
- Usable → keep the JSON: `result.worktrees[]` gives `path`, `branch`, `is_prunable`, and `open_workspace_id` only when the worktree is open in herdr (key absent otherwise).
- On Windows the herdr part is skipped: `herdr: absent`.

`--cwd` is always the main checkout: herdr rejects a linked worktree (`linked_worktree_source`).

## Step 4 — lookup the branch

`git worktree list --porcelain` is the only source. Entries are separated by a blank line; the first entry is the main checkout. Find the entry holding `branch refs/heads/<branch>`.

```sh
git -C "<main>" worktree list --porcelain | awk -v b='refs/heads/<branch>' 'BEGIN { RS = "" } $0 ~ ("branch " b "(\n|$)") { print "entry " NR; print }'
```

```powershell
$e = ((git -C "<main>" worktree list --porcelain) -join "`n") -split "`n`n"; for ($i = 0; $i -lt $e.Count; $i++) { if ($e[$i] -match "(?m)^branch refs/heads/<branch>$") { "entry $($i + 1)"; $e[$i] } }
```

The output gives the entry number (1 = main checkout), its `worktree <path>` line and a `prunable` line when there is one.

- Found in the first entry → `refused: branch active in main checkout <main>`. Never switch it.
- Found with a `prunable` line → `refused: prunable worktree entry: run git worktree prune`. wkman never prunes.
- Found in a linked entry → that worktree is the target (open: step 5 resumes; close: step 8).
- Not found → open: step 6 creates; close: `closed`, nothing removed, note `no worktree for <branch>`.

When `<name>` is a story of an epic, also look for `branch refs/heads/epic/<epic>`: found → note `epic worktree: <path>` on any open.

## Step 5 — resume (open, worktree found)

Nothing is created, the init script does not run (`init: skipped: resumed`). The worktree stays where it is, hand-made ones included.

- herdr usable → `herdr worktree open --cwd "<main>" --branch <branch> --label <name>`; report the workspace id from its JSON.
- Otherwise nothing to run.

Outcome `resumed`, branch `(existing)`.

## Step 6 — create (open, no worktree)

### Location — herdr's rule

`<root>/<repo>/<branch-slug>`, computed even when herdr is usable (step 7 needs no path then, but the occupied check does).

`<root>`: `worktrees.directory` of the herdr config, `~` expanded, default `~/.herdr/worktrees`. Config file, first that applies:

- `$HERDR_CONFIG_PATH`
- `$XDG_CONFIG_HOME/herdr/config.toml`
- `~/.config/herdr/config.toml` (Windows: `%APPDATA%\herdr\config.toml`)

No TOML parser: read `directory = "<path>"` under a `[worktrees]` table, or a root-level `worktrees.directory = "<path>"`. A config that sets the key in any other form → default root, note `herdr config not understood, default root used`.

```sh
awk '/^[[:space:]]*\[/ { t = $0; gsub(/[[:space:]]/, "", t); in_wt = (t == "[worktrees]"); in_table = 1; next }
  (in_wt && /^[[:space:]]*directory[[:space:]]*=/) || (!in_table && /^[[:space:]]*worktrees\.directory[[:space:]]*=/) { print; exit }' "<config>"
```

```powershell
$t = ''; foreach ($l in Get-Content "<config>") { if ($l -match '^\s*\[') { $t = $l.Trim() -replace '\s', ''; continue }; if (($t -eq '[worktrees]' -and $l -match '^\s*directory\s*=') -or ($t -eq '' -and $l -match '^\s*worktrees\.directory\s*=')) { $l; break } }
```

The value is the double-quoted string of the line printed; a printed line without one is the "other form" above. A leading `~` becomes the home directory (`${dir/#[~]/${HOME}}` in zsh/bash, `$dir -replace '^~', [Environment]::GetFolderPath('UserProfile')` in PowerShell).

`<repo>`: the basename of `<main>` — the main checkout's directory name, whatever linked worktree the caller stands in.

`<branch-slug>`: each ASCII letter or digit kept and lowercased; every run of other characters becomes one `-`; leading and trailing `-` trimmed; empty → `worktree`.

```sh
s=$(printf '%s' '<branch>' | LC_ALL=C tr 'A-Z' 'a-z' | LC_ALL=C sed -E 's/[^a-z0-9]+/-/g; s/^-//; s/-$//'); echo "${s:-worktree}"
```

```powershell
$s = ('<branch>'.ToLowerInvariant() -creplace '[^a-z0-9]+', '-').Trim('-'); if (-not $s) { $s = 'worktree' }; $s
```

Worked examples:

- `feat/ma-feat` → `feat-ma-feat`
- `epic/vocal-sessions` → `epic-vocal-sessions`
- `feat/Vocal_Sessions--v2` → `feat-vocal-sessions-v2`
- `epic/été` → `epic-t`
- `<home>/code/ubuntu-system`, `epic/vocal-sessions`, no config → `<home>/.herdr/worktrees/ubuntu-system/epic-vocal-sessions`

### Occupied

The location exists on disk (step 4 already found no worktree for this branch, so it is not that branch's) → `refused: location occupied: <location>`.

### Create

- herdr usable → `herdr worktree create --cwd "<main>" --branch <branch> --base main --label <name>`. No `--path`: herdr places it. The path is `worktree.path` of its JSON. A failure is reported as is, with herdr's error: no git fallback, so no second worktree can appear.
- Otherwise, local branch existing (`git -C "<main>" show-ref --verify --quiet refs/heads/<branch>` exits 0) → `git -C "<main>" worktree add "<location>" <branch>`, branch `(existing)`.
- Otherwise → `git -C "<main>" worktree add -b <branch> "<location>" main`, branch `(new from main)`.

git creates the missing parent directories. A git failure is reported as is.

Outcome `created`, note `new Claude project: settings.local.json permissions do not follow`.

## Step 7 — init script (open, created by this run only)

The `features/__chore/` convention: a project keeps its chore files there, the init script among them. Each project writes its own.

- `features/__chore/setup.sh` — macOS, Linux.
- `features/__chore/setup.ps1` — Windows, optional. On Windows `setup.sh` alone counts as no init script.

Contract:

- Run by wkman after creation, cwd = root of the new worktree, the script read from the new worktree (not from the main checkout), the main checkout's absolute path as sole argument.
- Exit 0 = worktree ready. Any other code = failure; the worktree stays.
- stdout and stderr are not parsed, except the last stderr line on failure.
- No exec bit, no shebang needed: wkman runs it through `bash` or `pwsh`.

```sh
cd "<worktree>" && bash features/__chore/setup.sh "<main>" 2>"<tmp>/wk-init.err"; echo "exit=$?"; tail -n 1 "<tmp>/wk-init.err"
```

```powershell
Set-Location "<worktree>"; pwsh -File features/__chore/setup.ps1 "<main>" 2> "$env:TEMP\wk-init.err"; "exit=$LASTEXITCODE"; Get-Content "$env:TEMP\wk-init.err" -Tail 1
```

`<tmp>`: a temporary directory (`mktemp -d`, or the session scratchpad).

- Exit 0 → `init: ran`.
- Other exit → `init: failed (exit <n>): <last stderr line>`, and note `rerun: cd <worktree> && bash features/__chore/setup.sh <main>` (PowerShell: `Set-Location <worktree>; pwsh -File features/__chore/setup.ps1 <main>`).
- No script for the OS → `init: none: no features/__chore/setup.sh` (Windows: `none: no features/__chore/setup.ps1`).

## Step 8 — close

Steps 1 to 4 first (step 4 decides: main checkout entry → `refused: main checkout cannot be closed`; prunable → refused; none → `closed`, nothing removed). Then, on the linked worktree `<path>`:

1. Caller inside: the caller's working directory, symlink-resolved, equals `<path>` or lies under it → `refused: caller inside the worktree`, note `run wk close <name> from a session in the main checkout <main>`. With herdr the removal would kill the calling session; with git the shell would be left in a deleted directory; Windows refuses to remove a directory in use.

   ```sh
   here=$(pwd -P); wt=$(cd "<path>" && pwd -P); case "$here/" in "$wt"/*) echo INSIDE;; esac
   ```

   ```powershell
   $here = (Get-Location).ProviderPath.TrimEnd('\') + '\'; $wt = (Get-Item "<path>").FullName.TrimEnd('\') + '\'; if ($here.StartsWith($wt, 'OrdinalIgnoreCase')) { 'INSIDE' }
   ```

2. Dirty: `git -C "<path>" status --porcelain` prints anything (untracked files included, ignored files not) → `refused: worktree dirty`. Never forced.
3. Remove:
   - herdr usable and the herdr list entry for `<branch>` has an `open_workspace_id` → `herdr worktree remove --workspace <open_workspace_id>`;
   - otherwise → `git -C "<main>" worktree remove "<path>"`.
   A failure is reported as is.
4. The branch is kept, nothing is merged. Note the story or epic status (step 2), e.g. `story status DONE`: it informs, it never blocks.

Outcome `closed`.

## Report

One report per run on stdout, fixed keys, one line each, nothing else:

```
wk <open|close> <name> — <outcome>
path:   <absolute worktree path>
branch: <branch> (<new from main | existing>)
herdr:  <workspace <id> | absent | unreachable>
init:   <ran | failed (exit <n>): <last stderr line> | none: <reason> | skipped: resumed>
note:   <…>
```

- `<outcome>`: `created`, `resumed`, `closed`, `refused: <reason>`.
- Refusal reasons, fixed: `branch active in main checkout <path>`, `ambiguous name: epic and story`, `location occupied: <path>`, `prunable worktree entry: run git worktree prune`, `worktree dirty`, `caller inside the worktree`, `main checkout cannot be closed`.
- `path:` and `branch:` carry what is known at the refusal; `-` when nothing is.
- `herdr:` with herdr usable but no workspace involved (close through git): `workspace -`.
- `init:` on `open` only.
- `note:` on `open`, and on `close` refused as `caller inside the worktree` (the command to run from the main checkout). Several notes share the line, separated by `; `: `new Claude project: settings.local.json permissions do not follow` (on `created` only), `epic worktree: <path>` (any open of a story whose epic has one), `no story found for <name>`, `rerun: …`, `herdr config not understood, default root used`, `no worktree for <branch>`, `story status <status>`. No note → `note:   -`.

Example:

```
wk open ma-feat — created
path:   <home>/.herdr/worktrees/demo/feat-ma-feat
branch: feat/ma-feat (new from main)
herdr:  absent
init:   ran
note:   new Claude project: settings.local.json permissions do not follow
```
