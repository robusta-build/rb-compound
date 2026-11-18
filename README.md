# rb-compound

Compound, the documentation-first workflow of Robusta Build, as a Claude Code plugin: its agents, its skills, the `/rb-compound:start` command and a `SessionStart` hook. The repository is both the plugin `rb-compound` and the marketplace `robusta-build`.

## Agents

Thirteen agents, launched as `rb-compound:<agent>`, on `sonnet` with effort `medium` except designman and boss, on `opus` with effort `high`, and docman, on `haiku` with effort `low`:

- epicman: writes and maintains `<epic>.epic.md`; `epicman <epic>`, `epicman update <epic> : <event>`, `epicman done <epic>`.
- storyman: writes and maintains `<feature>.story.md`; `storyman <feature>`, `storyman update <feature>`, `storyman update <epic> [Bn]`, `storyman submit <feature>`, `storyman done <feature>`.
- bsman: autonomous brainstorm of a story into `<feature>.brainstorm.md`.
- bulkman: runs `bulker`; `bulkman <epic>` gathers the epic's Open Questions & Gaps into `<epic>.bulk.md`, `bulkman resolve <epic>` copies the filled Resolutions back to their documents.
- designman: writes `<feature>.design.md` in DRAFT from the story and its brainstorm; `designman <story>`, `designman update <feature> : <event>`.
- tddman: implements a design test-first; `LFG`, or `LFG fast` without the test review pause.
- codeman: implements code first, tests only where they pay; `LFG`, or `LFG fast` without the review pause.
- fixman: captures a bug into `<owner>.fix.md`; `fixman <bug>`, `fixman reopen <target> : <FIX-INFIX-n> : <why>`.
- docman: rewrites the documentation named by a story's `## Documentation updates` plan, launched by `storyman submit`; `docman <story | feature>`, and `docman check [feature | path]`, which reports drift and slop without writing.
- archiman: sole writer of the `*.archi.md` files and of the package headers, launched by `storyman submit` after docman; `archiman <path>`, `archiman root`, `archiman check [path]`.
- doneman: checks a finished and tested feature, moves it into `__done/` and rewrites the paths pointing into it, then the epic with its last story; launched by `storyman done`, `doneman [<feature>]`.
- wkman: opens, resumes or closes the long worktree of a feature (`feat/<feature>`) or an epic (`epic/<epic>`), through herdr when herdr is usable, git otherwise; `wk <name>`, `wk open <name>`, `wk close <name>`.
- boss: runs the pipeline on a story or an epic without human validation, in its own session, see §boss.

An agent file holds only its header; its method is its role skill, loaded with the Skill tool.

## boss

`rb-compound:boss` is the main agent of its own session:

```
claude --agent rb-compound:boss "boss <target>"
```

`boss <target>`, `boss atw <target>` or `boss prepare <target>` typed in another session gets this line from `compound-routine` and launches nothing. No `settings.json` of the plugin carries an `agent` key: boss is never the default agent of a session. In its session, boss launches only `rb-compound:` storyman, bsman, designman, tddman, codeman, epicman, docman and archiman.

- `boss [atw | all the way] <target> [until <step>]`: runs a feature, a story path, an epic `[batch <Bn>]` or `new story <name>` through story, brainstorm, design, code, docs and submit, or up to `<step>`: story, brainstorm, design, code or submit. One commit per step on `feat/<story>` or `epic/<epic>`, never a push. rloq by default; `atw` decides the `ask` entries itself, signed `lgtm (boss atw)` and logged in `decisions-and-questions.md`. A run never goes past SUBMITTED: `storyman done` is left to the user.
- `boss prepare <feature> | <epic> [batch <Bn>]`: the housekeeping before a run, on an existing target: folds the answers, signs the entries that need no human, approves the designs that pass the check, applies the arbitrated fixes, commits. It writes no story, brainstorm or design.
- `boss roadmap`: keeps `roadmap.yaml` from the build manifests Git tracks, edited in place. A module it cannot repair (invalid or duplicate id, unknown kind, no path, unknown key) is left as is and named in the report. No `roadmap.md` is read or generated; the commit is proposed, never run.

pmf:

- `pmf on` and `pmf off` are typed in boss's session, the launch message included: `claude --agent rb-compound:boss "pmf on"`. pmf lasts until `pmf off` or the end of the session; a `pmf on` typed in another session does not reach boss.
- `boss` alone takes the next unblocked epic: not done, on no `**Depends on :**` cycle, every epic it depends on done; among several, the epic whose file was committed last. `boss <epic>` runs that epic.
- boss launches only epicman and tddman, writes no story, brainstorm or design, and decides the epic's `ask` entries as atw does.
- boss commits on the current branch and pushes it, never forced. It switches, creates and merges no branch, and never pulls or rebases. A refused push, no remote or a `wip` commit leaves the commits local, listed on a `Not pushed:` line of the report.

## Skills

- compound-routine: the Compound routine, `nxt`, pmf mode, the boss hand-over and its exception for commits, and the words `nxt`, `oq`, `rloq`, `atw`, `wk`, `lgtm`, `pmf`. The hook injects it into every session; its rules apply on an explicit call to Compound only: `nxt`, `boss`, `pmf on|off`, `wk`, the name of a Compound agent or of `/start`, a story, epic, brainstorm, design, fix or bulk document. Its references:
  - `references/ubiquitous-language.md`: the Compound glossary.
  - `references/progress.md`: the grammar of a design's `## Progress` block, written by the main agent during implementation.
- Role skills: `rb-compound:<agent>-method`, the method of each agent; its templates sit under `assets/`, its scripts under `scripts/`, its references under `references/`. A request for an agent launches the agent, never its role skill inline.
- brainstorm: the interactive product brainstorm, launched by the user as `/rb-compound:brainstorm`. `rb-compound:bsman` is its autonomous variant.
- commit: the commit convention `type(scope): description` and the precommit checklist, typed `/rb-compound:commit` by the user and loaded by boss before its first commit. Its description has Claude load it before any git commit, in every session where the plugin is installed.
- Shared skills, which name each other by short name:
  - boundaries: names the boundaries between apps, modules and packages, and shows each API as types, interfaces and client code.
  - checker: runs build, lint and tests before and after coding.
  - code-comments: rules for comments in code, write and review modes.
  - deslop: rules against AI slop in technical writing, English and French, write and review modes.
  - open-question: format of the `## Open Questions & Gaps` section.
  - relevant-oq: sorts a doubt into `ask`, `decide` or nothing before it is written.
  - schematic: ASCII schematics in markdown, 80 columns.

Agents and role skills name every skill `rb-compound:<skill>`. An agent or a skill of the same name in the user's own folders is listed beside the plugin's and keeps the bare name.

## Command

`/rb-compound:start` reads `README.md`, `ubiquitous-language.md` and `root.archi.md` at the root of the project, loads `rb-compound:compound-routine`, then runs `nxt`. A missing file is named on one line and not created.

## Hook

`hooks/hooks.json` runs `hooks/session-start.mjs` on `SessionStart` at startup, `/clear` and compaction: it prints the body of `compound-routine` into the context. Claude knows the routine and its words from the first request. A session started with `claude --agent rb-compound:<agent>` gets it, a subagent does not, and a resumed or forked session keeps the injection of its origin. The hook writes no file and exports no variable.

## Compatibility

The hook runs `node` without a shell and needs Node 20.11 or later on the `PATH`: on Windows, with or without Git Bash, as a real `node.exe`, not a `node.cmd` shim; on macOS and Linux, as `node`. Without Node, or with hooks disabled, the session starts with at most one non-blocking hook notice and `compound-routine` loads by its description on a call to Compound.

## bulker

`bulker` is built into `skills/bulkman-method/scripts/` from its sources in `bulker/`, see `bulker/README.md`. `rb-compound:bulkman` runs it with `node`, never a `bulker` from the PATH, with nothing to install. It needs Node 20.11 or later: with an older Node or none, bulkman names the version found and runs nothing.

## Install from GitHub

The repository is private: the machine's git credentials must reach `github.com/robusta-build/rb-compound`.

```
/plugin marketplace add robusta-build/rb-compound
/plugin install rb-compound@robusta-build
```

`marketplace add` fails on a machine with no GitHub SSH key and no stored HTTPS credential. Store a credential with the GitHub CLI:

```
gh auth login
gh auth setup-git
```

or start Claude Code with `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1`.

## Install from a local checkout

```
claude plugin marketplace add <path-to-checkout>
claude plugin install rb-compound@robusta-build
```

The plugin is read in place from the checkout: an edit, committed or not, is loaded at the next session.

One session without installing:

```
claude --plugin-dir <path-to-checkout>
```

## Updates

The manifests carry no `version`: an installed plugin follows the commits of `main`. `/plugin marketplace update robusta-build` fetches them, or auto-update does, turned on per machine in `/plugin` > Marketplaces. The new content loads at the next session.

## License

PolyForm Noncommercial 1.0.0, see `LICENSE`. The source is available; noncommercial use is free, commercial use requires a paid license from Robusta Build.

`skills/bulkman-method/scripts/masala-parser/` bundles `@masala/parser` 2.0.0 under its own license: its `LICENSE` file, copied as is, is the LGPL 2.1 text, while its `package.json` declares LGPL-3.0.
