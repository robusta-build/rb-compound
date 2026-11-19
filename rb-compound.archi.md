# Architecture: rb-compound

**Last updated:** 2026-11-19
**Kind:** app

## Overview

`rb-compound` is Compound, the documentation-first workflow of Robusta Build, as a Claude Code plugin. The repository is both the plugin `rb-compound` (`.claude-plugin/plugin.json`) and the marketplace `robusta-build` (`.claude-plugin/marketplace.json`), which lists two plugins: `rb-compound` (source `./`) and `rb-business-rules` (source github `robusta-build/rb-business-rules`, outside this repository). It ships thirteen agents, each a header loading its role skill: the planning agents epicman, storyman, bsman and bulkman, the design agent designman, the implementation agents tddman and codeman, the bug capture agent fixman, the closing agents docman, archiman and doneman, the worktree agent wkman, and boss, which runs the routine without human validation as the session agent. It also ships the interactive skill `brainstorm`, the routine skill `compound-routine`, eight shared skills, the command `/rb-compound:start`, the `SessionStart` hook of package `hooks`, and the module `bulker`, the sources of the command bundled in `skills/bulkman-method/scripts/`.

## Apps, modules, packages

- app `rb-compound` — the plugin and its marketplace, read in place from the checkout; the manifests carry no `version`; the marketplace entry `rb-business-rules` points to a github repository, its content is not part of this project
- package `agents` — `agents/{epicman,storyman,bsman,bulkman,designman,tddman,codeman,fixman,docman,archiman,doneman,wkman,boss}.md`, header only: `skills:` naming the role skill alone, `model: sonnet` and `effort: medium` (designman and boss: `opus`, `high`; docman: `haiku`, `low`), `tools` (absent for tddman and codeman, which inherit every tool; boss's ends with `Agent(...)` naming the eight agents it launches), and one line loading the role skill with the Skill tool
- package `epicman-method` — epicman's method, writes `<epic>.epic.md` from `assets/epic.template.md`; reads the Definition of Done in `storyman-method` §done
- package `storyman-method` — storyman's method, writes `<feature>.story.md` from `assets/story.template.md`; `submit` and `done` delegate to other agents
- package `bsman-method` — bsman's method, the autonomous brainstorm into `<feature>.brainstorm.md`
- package `bulkman-method` — bulkman's method and `scripts/`: `bulker.mjs` and `masala-parser/`, the build output of module `bulker`, committed
- package `designman-method` — designman's method, writes `<feature>.design.md` in DRAFT from `assets/design.template.md`; `references/bulk.md`, the bulk contract, read only when the epic has a bulk
- package `tddman-method` — tddman's method, implements an APPROVED design test-first, from its Boundaries
- package `codeman-method` — codeman's method, implements code first, tests only where they pay
- package `fixman-method` — fixman's method, captures a bug into `<owner>.fix.md`, or reopens an entry
- package `docman-method` — docman's method, rewrites the documentation named by a story's `## Documentation updates` plan; `check` reports drift and slop without writing
- package `archiman-method` — archiman's method, writes the `*.archi.md` files and the package headers, archi template inline; `check` reports drift without writing
- package `doneman-method` — doneman's method, checks a finished feature, moves it into `__done/` and rewrites the paths pointing into it, then its epic with the last story
- package `wkman-method` — wkman's method, opens, resumes or closes the worktree of `feat/<feature>` or `epic/<epic>` through herdr or git, then runs `features/__chore/setup.sh|ps1`
- package `boss-method` — boss's method, runs the routine on a named feature or epic up to submit, one commit per step, and pmf, which commits on the current branch and pushes it; `references/prepare.md`, read for `boss prepare` only, and `references/roadmap.md`, read for `boss roadmap` only, which keeps `roadmap.yaml`
- package `brainstorm` — the interactive product brainstorm, launched by the user as `/rb-compound:brainstorm`
- package `compound-routine` — the Compound routine, `nxt`, pmf, the boss hand-over and commit exception, and the routine words, injected into the session by package `hooks`, its rules applied on an explicit Compound call only; `references/ubiquitous-language.md`, the Compound glossary, `references/progress.md`, the grammar of a design's `## Progress` block, and `references/headers.md`, the French and English series of document headers
- package `start` — `commands/start.md`, the command `/rb-compound:start`
- package `hooks` — `hooks/hooks.json`, the `SessionStart` registration at startup, `/clear` and compaction, and `hooks/session-start.mjs`, which prints the body of `compound-routine` into the session context
- package `boundaries` — notation of the APIs a document crosses, and its overview figure
- package `checker` — build, lint and tests before and after coding
- package `commit` — the commit convention `type(scope): description` and the precommit checklist, also typed as `/rb-compound:commit`
- package `code-comments` — rules for comments in code, write and review modes
- package `deslop` — rules against AI slop in technical writing, write and review modes
- package `open-question` — format of the `## Open Questions & Gaps` section
- package `relevant-oq` — sorts a doubt into `ask`, `decide` or nothing before it is written
- package `schematic` — ASCII schematics in markdown, 80 columns, patterns in `references/patterns.md`
- module `bulker` (`bulker/`, entry `src/index.ts`, command `src/bin.ts`) — sources and tests of the bulk round trip command; nothing reads `bulker/` at run time

## Diagram

```
  Arrow = loads or reads, from client code to the skill it uses.

  package `agents` (epicman, storyman, bsman, bulkman,
  designman, tddman, codeman, fixman, docman, archiman,
  doneman, wkman, boss)
      │
      │ skill, rb-compound:<agent>-method
      ↓
  packages `epicman-method`, `storyman-method`,       package `brainstorm`
  `bsman-method`, `bulkman-method`,                         │
  `designman-method`, `tddman-method`,                      │
  `codeman-method`, `fixman-method`,                        │
  `docman-method`, `archiman-method`,                       │
  `doneman-method`, `wkman-method`, `boss-method`           │
      │                                                     │
      │ skill                                               │ skill
      ↓                                                     ↓
  packages `open-question`, `relevant-oq`, `boundaries`, `schematic`,
  `checker`, `code-comments`, `deslop`, `commit`

  package `start` ──skill──→ package `compound-routine`
  package `hooks` ──reads SKILL.md──→ package `compound-routine`
```

- `compound-routine` loads no other package: it names the agents `rb-compound:<agent>` as routing.
- `designman-method`, `tddman-method`, `codeman-method`, `fixman-method` and `boss-method` read the `references/` files of `compound-routine` with Read, and never load it as a skill.
- `references/headers.md` is read by `storyman-method`, `epicman-method`, `bsman-method`, `brainstorm`, `designman-method` (`references/bulk.md`), `bulkman-method`, `fixman-method`, `docman-method`, `doneman-method` and `boss-method`.
- `boss-method` loads `relevant-oq` and `commit`; agent `boss` launches storyman, bsman, designman, tddman, codeman, epicman, docman and archiman with the Agent tool, and no other agent.
- `tddman-method`, `codeman-method` and `checker` name `/rb-compound:commit` to the user and never load it.
- `bulkman-method` runs its own `scripts/bulker.mjs` with `node`; `bulker/` builds it.
- `wkman-method` loads no shared skill; it runs `git`, and `herdr` when usable.
- `doneman-method` names `rb-compound:storyman-method` §done and never loads it.
- `hooks` reads `skills/compound-routine/SKILL.md` and nothing else; nothing in the plugin depends on `hooks`.

## Boundaries

### agent API of app `rb-compound`

Client code: the user's session, or another Compound agent.

```
rb-compound:epicman <epic> | update <epic> : <event> | done <epic>
rb-compound:storyman <feature> | update <feature>
rb-compound:storyman update <epic> [Bn] [avec brainstorms]
rb-compound:storyman submit <feature> | done <feature>
rb-compound:bsman <feature>
rb-compound:bulkman <epic> | resolve <epic>
rb-compound:designman <story> | update <feature> : <event>
rb-compound:tddman LFG | LFG fast
rb-compound:codeman LFG | LFG fast
rb-compound:fixman [capture] <bug description | path | feature | epic>
rb-compound:fixman reopen <target> : <FIX-INFIX-n> : <why>
rb-compound:docman <story | feature> | check [feature | path]
rb-compound:archiman <path> | root | check [path]
rb-compound:doneman [<feature>]
rb-compound:wkman wk <name> | wk open <name> | wk close <name>
```

- Outputs: `<epic>.epic.md`, `<feature>.story.md`, `<feature>.brainstorm.md`, `<epic>.bulk.md` and the `Resolution:` lines copied back into their sources, `<feature>.design.md` in DRAFT, the code and tests of an APPROVED design, `<owner>.fix.md` and the `Fixed:` line of its entries, the documentation of a story's plan, `*.archi.md` and package headers, a feature or epic moved into `__done/` with the paths pointing into it rewritten, a linked worktree and its one-block report.
- `storyman update <epic>` launches `rb-compound:storyman` per story; `submit` launches `rb-compound:docman`, `rb-compound:archiman` and `rb-compound:epicman`, `done` launches `rb-compound:doneman`. An agent the session does not list stops the sequence at its step.
- tddman and codeman never write the design doc: their final report hands the `## Progress` counts to the main agent.
- A subagent without the Agent tool returns the launch lines to its caller.

### skill API of app `rb-compound`

Client code: the user, the session, and the agents and command of the plugin.

- `/rb-compound:brainstorm` — interactive, from a story's Acceptance Criteria to `<feature>.brainstorm.md`.
- `rb-compound:<agent>-method` — loaded only by its agent; its description routes a request to the agent, never applied inline. Its files are read as `${CLAUDE_SKILL_DIR}/<path>`, fallback `${CLAUDE_PLUGIN_ROOT}/skills/<agent>-method/<path>`.
- `rb-compound:compound-routine` — injected into the session context by the hook of package `hooks`; without the hook, loaded by its description. Its rules apply on an explicit Compound signal only (`nxt`, `boss`, `pmf on|off`, `wk`, the name of a Compound agent or of `/start`, a story, epic, brainstorm, design, fix or bulk document). `/rb-compound:start` loads it when the hook did not inject it.
  - `nxt` writes nothing and prints 1 to 3 options `<n>. <item> — <stage> — <single next action>`.
  - `boss <target>` outside `rb-compound:boss` prints `boss <target> runs in its own session: claude --agent rb-compound:boss "boss <target>"` and launches nothing.
  - Read paths: `${CLAUDE_PLUGIN_ROOT}/skills/compound-routine/references/ubiquitous-language.md` and `${CLAUDE_PLUGIN_ROOT}/skills/compound-routine/references/progress.md`; a role skill reads them first at `${CLAUDE_SKILL_DIR}/../compound-routine/references/<file>`.
- `rb-compound:<skill>` for `boundaries`, `checker`, `code-comments`, `commit`, `deslop`, `open-question`, `relevant-oq`, `schematic`; agents and role skills name them in full, shared skills name each other by short name.

### CLI API of app `rb-compound`

Client code: a Claude Code user.

```
/plugin marketplace add robusta-build/rb-compound
/plugin install rb-compound@robusta-build
/plugin install rb-business-rules@robusta-build
claude --plugin-dir <path-to-checkout>
/rb-compound:start
/rb-compound:commit
claude --agent rb-compound:boss "<request>"
```

- `/rb-compound:start`, no argument: reads `README.md`, `ubiquitous-language.md` and `root.archi.md` at the root of the working directory, loads `rb-compound:compound-routine` once, only when the context does not hold the header line of package `hooks`, runs `nxt`. Stdout: the project's purpose in at most 3 lines, one line `<file>: absent` per missing file, then the `nxt` output. Writes nothing, creates no missing file.
- `/rb-compound:commit`: commits the files of the current task, `type(scope): description`, no AI attribution, no emoji; a build or test known broken stops it.
- `claude --agent rb-compound:boss "<request>"`: boss as the session agent; in any other session, `compound-routine` §boss hands the request over. Requests, in the launch message or later in the session:

```
boss [atw | all the way] <feature> | <epic> [batch <Bn>] [until <step>]
boss new story <name>
boss prepare <feature> | <epic> [batch <Bn>]
boss roadmap
pmf on | pmf off
boss | boss <epic>                                  in pmf only
```

- Outputs of boss: documents, signatures, design Status lines, `decisions-and-questions.md` lines and one commit per pipeline step, never pushed; `boss roadmap` edits `roadmap.yaml` and proposes its commit; in pmf, commits on the current branch, then that branch pushed, never forced, or `Not pushed: <reason> — local: <shas>`.
- boss launches only the eight agents of its `tools`; wkman, fixman, doneman and bulkman are named as the user's commands. `rb-compound:storyman done` is never run nor proposed.
- Refusals of boss write nothing and switch no branch: `I need a feature name : story or epic`, `boss refused: <reason>`, `pmf: no epic left.`, `pmf: no unblocked epic — <epic> waits for <ids>`.

### CLI API of package `hooks`

Client code: Claude Code, on `SessionStart`; a session started with `claude --agent rb-compound:<agent>` gets it, a subagent does not.

```
SessionStart, matcher startup|clear|compact, timeout 10 s
node ${CLAUDE_PLUGIN_ROOT}/hooks/session-start.mjs
```

- Reads `skills/compound-routine/SKILL.md` under the plugin root, never stdin.
- Stdout, exit 0: one JSON line `{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"<header>\n<body>"}}`. Header: `rb-compound:compound-routine is loaded below; do not load it again with the Skill tool.` Body: `SKILL.md` without its front matter, read as LF, every `${CLAUDE_PLUGIN_ROOT}` replaced by that variable, or the plugin root when it is unset.
- Exit 1, stdout empty, one stderr line `rb-compound session-start: <reason>`: `SKILL.md` unreadable, front matter never closed, context above 10,000 characters. Never exit 2.
- Writes no file, starts no process, sets no variable; imports only `node:` built-ins.

### CLI API of module `bulker`

Client code: package `bulkman-method`, through `scripts/bulker.mjs`.

```
node scripts/bulker.mjs <target> [--json] [--dry-run]
node scripts/bulker.mjs resolve <target> [--json] [--dry-run]
node scripts/bulker.mjs --help | --version
```

- `<target>`: an epic folder, an `<epic>.epic.md` or an `<epic>.bulk.md`, required, never inferred.
- Exit codes: 0 success, 1 usage, 2 target outside the Claude project, 3 preflight refusal (`resolve`, nothing written), 4 I/O failure during the write phase.
- Stdout: prose by default; with `--json`, one report, `version: 2`. Version 0.6.0.
- Build: `npm run build` in `bulker/` empties `skills/bulkman-method/scripts/` and writes `bulker.mjs`, `masala-parser/masala-parser.mjs` and `masala-parser/LICENSE`, deterministic.

## Dependencies

- Depends on: github `robusta-build/rb-business-rules`, only as the source of the marketplace entry `rb-business-rules`; Claude Code (plugin loading, Skill and Agent tools, `SessionStart` hooks, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`); Node 20.11 or later on the `PATH` for `bulker.mjs` and `hooks/session-start.mjs`; module `bulker` (build output); `@masala/parser` 2.0.0, bundled under its own license; `git`, for wkman and the commits of boss, and `herdr` when usable, with its config file, for wkman.
- Module `bulker` depends on: `@masala/parser` 2.0.0 (runtime); TypeScript, `@types/node`, Vite and Vitest (build and tests).
- Used by: Claude Code sessions that install `rb-compound@robusta-build`.
