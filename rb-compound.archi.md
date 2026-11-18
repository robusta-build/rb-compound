# Architecture: rb-compound

**Last updated:** 2026-11-18
**Kind:** app

## Overview

`rb-compound` is Compound, the documentation-first workflow of Robusta Build, as a Claude Code plugin. The repository is both the plugin `rb-compound` (`.claude-plugin/plugin.json`) and the marketplace `robusta-build` (`.claude-plugin/marketplace.json`). It ships the four planning agents epicman, storyman, bsman and bulkman, each a header loading its role skill, the interactive skill `brainstorm`, the routine skill `compound-routine`, seven shared skills, the command `/rb-compound:start`, and the module `bulker`, the sources of the command bundled in `skills/bulkman-method/scripts/`. It has no hook. The other Compound agents (designman, tddman, codeman, docman, archiman, doneman, boss, fixman, wkman) are not in it.

## Apps, modules, packages

- app `rb-compound` — the plugin and its marketplace, read in place from the checkout; the manifests carry no `version`
- package `agents` — `agents/{epicman,storyman,bsman,bulkman}.md`, header only: `skills:` naming the role skill alone, `model: sonnet`, `effort: medium`, `tools`, and one line loading the role skill with the Skill tool
- package `epicman-method` — epicman's method, writes `<epic>.epic.md` from `assets/epic.template.md`; reads the Definition of Done in `storyman-method` §done
- package `storyman-method` — storyman's method, writes `<feature>.story.md` from `assets/story.template.md`; `submit` and `done` delegate to other agents
- package `bsman-method` — bsman's method, the autonomous brainstorm into `<feature>.brainstorm.md`
- package `bulkman-method` — bulkman's method and `scripts/`: `bulker.mjs` and `masala-parser/`, the build output of module `bulker`, committed
- package `brainstorm` — the interactive product brainstorm, launched by the user as `/rb-compound:brainstorm`
- package `compound-routine` — the Compound routine, `nxt`, pmf, the boss hand-over and commit exception, and the routine words, loaded on an explicit Compound call only; `references/ubiquitous-language.md`, the Compound glossary, and `references/progress.md`, the grammar of a design's `## Progress` block
- package `start` — `commands/start.md`, the command `/rb-compound:start`
- package `boundaries` — notation of the APIs a document crosses, and its overview figure
- package `checker` — build, lint and tests before and after coding
- package `code-comments` — rules for comments in code, write and review modes
- package `deslop` — rules against AI slop in technical writing, write and review modes
- package `open-question` — format of the `## Open Questions & Gaps` section
- package `relevant-oq` — sorts a doubt into `ask`, `decide` or nothing before it is written
- package `schematic` — ASCII schematics in markdown, 80 columns, patterns in `references/patterns.md`
- module `bulker` (`bulker/`, entry `src/index.ts`, command `src/bin.ts`) — sources and tests of the bulk round trip command; nothing reads `bulker/` at run time

## Diagram

```
  Arrow = loads, from client code to the skill it uses.

  package `agents`
  (epicman, storyman, bsman, bulkman)
      │
      │ skill, rb-compound:<agent>-method
      ↓
  packages `epicman-method`, `storyman-method`,       package `brainstorm`
  `bsman-method`, `bulkman-method`                          │
      │                                                     │
      │ skill                                               │ skill
      ↓                                                     ↓
  packages `open-question`, `relevant-oq`, `boundaries`, `schematic`,
  `checker`

  package `start` ──skill──→ package `compound-routine`
```

- `code-comments` and `deslop` are loaded by no shipped agent.
- `compound-routine` loads no other package: it names the agents `rb-compound:<agent>` as routing.
- `bulkman-method` runs its own `scripts/bulker.mjs` with `node`; `bulker/` builds it.

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
```

- Outputs: `<epic>.epic.md`, `<feature>.story.md`, `<feature>.brainstorm.md`, `<epic>.bulk.md` and the `Resolution:` lines copied back into their sources.
- `storyman update <epic>` launches `rb-compound:storyman` per story; `submit` launches `rb-compound:docman`, `rb-compound:archiman` and `rb-compound:epicman`, `done` launches `rb-compound:doneman`. An agent the session does not list stops the sequence at its step: `submit` stops at its first step.
- A subagent without the Agent tool returns the launch lines to its caller.

### skill API of app `rb-compound`

Client code: the user, the session, and the agents and command of the plugin.

- `/rb-compound:brainstorm` — interactive, from a story's Acceptance Criteria to `<feature>.brainstorm.md`.
- `rb-compound:<agent>-method` — loaded only by its agent; its description routes a request to the agent, never applied inline. Its files are read as `${CLAUDE_SKILL_DIR}/<path>`, fallback `${CLAUDE_PLUGIN_ROOT}/skills/<agent>-method/<path>`.
- `rb-compound:compound-routine` — loaded by the session on an explicit Compound signal only (`nxt`, `boss`, `pmf on|off`, `wk`, the name of a Compound agent or of `/start`, a story, epic, brainstorm, design, fix or bulk document), and by `/rb-compound:start`.
  - `nxt` writes nothing and prints 1 to 3 options `<n>. <item> — <stage> — <single next action>`.
  - `boss <target>` outside `rb-compound:boss` prints `boss <target> runs in its own session: claude --agent rb-compound:boss "boss <target>"` and launches nothing.
  - Read paths, fixed: `${CLAUDE_PLUGIN_ROOT}/skills/compound-routine/references/ubiquitous-language.md` and `${CLAUDE_PLUGIN_ROOT}/skills/compound-routine/references/progress.md`.
- `rb-compound:<skill>` for `boundaries`, `checker`, `code-comments`, `deslop`, `open-question`, `relevant-oq`, `schematic`; agents and role skills name them in full, shared skills name each other by short name.

### CLI API of app `rb-compound`

Client code: a Claude Code user.

```
/plugin marketplace add robusta-build/rb-compound
/plugin install rb-compound@robusta-build
claude --plugin-dir <path-to-checkout>
/rb-compound:start
```

- `/rb-compound:start`, no argument: reads `README.md`, `ubiquitous-language.md` and `root.archi.md` at the root of the working directory, loads `rb-compound:compound-routine`, runs `nxt`. Stdout: the project's purpose in at most 3 lines, one line `<file>: absent` per missing file, then the `nxt` output. Writes nothing, creates no missing file.

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

- Depends on: Claude Code (plugin loading, Skill and Agent tools, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PLUGIN_ROOT}`); Node 20.11 or later for `bulker.mjs`; module `bulker` (build output); `@masala/parser` 2.0.0, bundled under its own license; agents `rb-compound:designman`, `rb-compound:tddman`, `rb-compound:codeman`, `rb-compound:docman`, `rb-compound:archiman`, `rb-compound:doneman`, `rb-compound:boss`, `rb-compound:fixman`, `rb-compound:wkman`, named by the role skills and `compound-routine` and absent from the plugin.
- Module `bulker` depends on: `@masala/parser` 2.0.0 (runtime); TypeScript, Vite and Vitest (build and tests).
- Used by: Claude Code sessions that install `rb-compound@robusta-build`.
