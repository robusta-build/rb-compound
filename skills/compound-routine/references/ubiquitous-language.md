# Ubiquitous Language — Compound

The words Compound uses, with one meaning each. A term defined here means the same thing in a story, in a design doc, in an agent definition, in the code and in conversation; a document does not coin a synonym for a term already named below.

A term earns an entry when it names something the pipeline acts on. `docman` adds it, from the "Documentation updates" plan of the story that introduces it.

## Acting on files and code

- edit — a bounded change to an existing file: a line replaced, a block removed, a line appended. This is the unit a command counts when it promises to do a fixed number of things and no others, as `bulker resolve` does with one edit per entry, the empty `Resolution:` line receiving the answer. The code already carries the word: `edit-document.ts`, `apply-edits.ts`.
- write — putting bytes on disk, and the half of the read/write contrast that matters for safety. "`bulkman <epic>` never opens a source for writing" is a claim about write, not about edit.
- step — a named stage of the pipeline with a single owner: submit writes IMPLEMENTED on the design doc, docman executes the documentation plan. A step has an owner; an edit has a target. When two documents claim the same step, that is a defect to arbitrate, not a redundancy to tolerate.
- gesture is banned, a calque of the French *geste*. Every occurrence resolves to edit, write or step, or to nothing: "submit carries the IMPLEMENTED gesture" becomes "submit owns writing IMPLEMENTED".

## Documents

- story — `<feature>.story.md`. The heartbeat: one feature, one story. Owner `storyman`.
- epic — `<epic>.epic.md`. Optional, and only when several stories form one larger body of work. Its header declares zero or one module, `**Module :**` with an id of `roadmap.yaml`, and the epics it waits for, `**Depends on :**`. Owner `epicman`.
- design doc — `<feature>.design.md`. The engineering handoff: ubiquitous language, interfaces created or modified, platform constraints. Frozen once written: the code is the reference. Owner `designman`. It is not a PRD; a legacy `.prd.md` reads as a design doc.
- brainstorm — `<feature>.brainstorm.md`. A disposable one-shot capturing decisions and reasoning, never requirements, and never updated after the fact; what it decides moves into the story and the design doc.
- bulk — `<epic>.bulk.md`. The one-pass arbitration worklist of an epic. A productivity tool, not a source of truth: the source document owns the question and the Resolution, the bulk carries a Resolution until it is copied. Written by the `bulker` command.
- fix — `<epic>.fix.md`, next to its epic, at the same level as the bulk. The bugfix document: a batch of independent fixes by default, one complex bug when its Grain is SINGLE. The story receives a one-line journal entry once the right one is found. Owner `fixman`.
- archi file — `*.archi.md`. A curated architecture summary living next to the code it describes, `root.archi.md` at the repository root.
- roadmap.yaml — at the repository root: the system the repository builds, its modules and its external dependencies, each with a stable id; no epic, no story. Kept by `boss roadmap`.
- paperwork: all the document modifications needed to correctly pass from one status to another. Changing the status in frontmatter, commit, `epicman/storyman update`, calling docman, archiman, update the `Progress` block, etc. 

## Identifiers

- Infix — the human-readable uppercase tag inside every identifier, 5 to 15 letters, never initials. Epics and stories carry an explicit `**Infix :**` field; a brainstorm quotes its story's.
- `R-<INFIX>-n` — a Requirement at the story's Infix. Deliberately untyped: functional, business or technical makes no difference to the identifier.
- `AC-<INFIX>-n` — an Acceptance Criterion, born in the story at the story's Infix, written Given/When/Then in business language. The product owner's call: bsman challenges it, designman cites it verbatim and never writes one. A removed number is never reused.
- entry key — `Gap-<INFIX>-n` or `OQ-<INFIX>-n`, the identity an Open Questions & Gaps entry carries in its own head line. One sequence shared by both types within a document.

## Doubt and arbitration

- Gap — something missing or contradictory upstream: an absent rule, an undefined term, two requirements that disagree.
- Open Question — a real choice the human must arbitrate, or a call made autonomously and signed `lgtm (<agent>)`.
- Proposition, Rationale, Rloq, Route, Resolution — the fields of an entry. Rloq is the author's `relevant-oq` sort, `true` for `ask`, `false` for `decide`, absent read false, written once with the entry and never rewritten. Route, optional, is read and copied as is; its value routes nothing. Resolution is born empty and only the human fills it, except for two agent signatures: `lgtm (<agent>)` on a choice the agent decided alone, `lgtm (<agent> <mode>)[ : <option>]` on an `ask` entry decided under a mode the human named in the request. `lgtm` means the Proposition is accepted as written.
- fold — to turn an arbitrated entry into a plain assertion in the document body and delete the entry. The question disappears, the decision remains, git keeps the history.
- integrator — an agent that folds the filled Resolutions of the document it owns into its body: `storyman`, `designman`, `epicman`. The bulk is never its input; an integrator never writes the bulk.
- preflight — the pass a command runs over everything it would touch before writing anything, aborting the whole run rather than writing partially.

## States and locations

- Status — the first `**Status:**` line of the header, read by grep without opening the file. Three ladders:
  - story ACTIVE → SUBMITTED → DONE. Ready to code reads ACTIVE with an APPROVED design doc. DONE informs and never gates. A legacy LANDED reads SUBMITTED, a legacy READY reads ACTIVE.
  - design doc DRAFT → APPROVED → IMPLEMENTED: implementation starts on APPROVED only, and `storyman submit` alone writes IMPLEMENTED.
  - fix document OPEN → CLOSED: OPEN while one entry has an empty `Fixed:`.
  - An epic has no Status: it reads the Status of its stories. A brainstorm has none either: it is disposable.
- Grain — a fix document's BATCH or SINGLE: several independent fixes handled in one pass, or one complex bug with a document to itself.
- done is a location — `__done/`, legacy spelling `_done/`. Distinct from DONE, the story state: `doneman` moves a DONE (or SUBMITTED) story's directory there. Never a filename suffix: documents keep their name forever and the directory move is the marker. `__chore/` (the worktree init script, the worktree story) and `__future/` (stories or epics set aside) are locations too, neither a feature nor an epic. Agents skip all three when they scan `features/`; `boss roadmap` reads the epics archived in `__done/` for the modules they declare.

## Workflow verbs

`<agent> <target>` creates, `<agent> update <target>` iterates; the other verbs move a Status or carry a decision.

- create — `<agent> <target>`, run by the human or `boss`: `storyman <feature>`, `designman <feature>`, `epicman <epic>`. A story is born ACTIVE, a design doc DRAFT. On an existing document, same as update.
- update — `<agent> update <target> [: event]`, run by the human or a calling agent. A story whose scope or contracts change returns to ACTIVE, a design doc to DRAFT. `storyman update <epic> [Bn]` runs one update per story carrying a filled Resolution. Hidden alias: `refine`.
- approve — no command: the human, or `boss`, writes APPROVED on the design doc's Status line.
- submit — `storyman submit <feature>`, run by the human or `boss` on a committed, user-validated feature. Story → SUBMITTED, design doc → IMPLEMENTED. Push and merge request stay human. Hidden alias: `land`.
- done — `storyman done <feature>`, run by the human once merged; `epicman done <epic>` across an epic. Story SUBMITTED → DONE, then `doneman` archives it into `__done/`.
- `fixman <target>` — run by the human or the main agent: captures a bug into `<owner>.fix.md`, document OPEN. tddman or codeman stamps `Fixed:`, and the last stamp flips it CLOSED.
- `fixman reopen <target> : <key> : <why>` — a fix that did not hold: `Fixed:` emptied, document back to OPEN.
- `bulkman <epic>` — run by the human: gathers the epic's pending entries into `<epic>.bulk.md`. No Status moves. Hidden alias: `refresh`.
- resolve — `bulkman resolve <epic>`, run by the human: copies each filled Resolution into its source, then rebuilds the bulk. No Status moves.

## Actors

- agent — a definition under `agents/`, called deliberately, running in its own context window.
- workflow agent — an agent that makes up a step of the pipeline, from a closed list: epicman, storyman, bsman, designman, tddman, codeman, docman, archiman, doneman, bulkman, fixman, boss, wkman. Every other agent is a utility agent: Explore, naming, general-purpose, scriptman, toolman…
- skill — a procedure under `skills/`, loaded into the caller's context rather than delegated.
- role skill — the skill `<agent>-method` of `rb-compound` that carries an agent's method, with its templates under `assets/`, its scripts under `scripts/` and its references under `references/`. The agent's file holds only its header and loads it with the Skill tool; a request for the agent launches the agent, never the role skill inline.
- command — a slash entry under `commands/`.
- plugin — a Claude Code package of skills, agents, hooks and commands, installed from a marketplace. Its skills are listed as `<plugin>:<skill>`.
- marketplace — a catalogue of plugins that a machine adds once, then updates. `robusta-build` is the repository `robusta-build/rb-compound`, its catalogue in `.claude-plugin/marketplace.json`.
- `rb-compound` — the plugin of Compound, in the private repository `robusta-build/rb-compound`, under PolyForm Noncommercial 1.0.0. It carries every workflow agent but boss, each with its role skill, the skills `brainstorm` and `compound-routine`, the shared skills and the command `/rb-compound:start`.

Work whose artefacts do not survive the subagent belongs in a skill; work that must be called on purpose rather than fired from any caller's context is an agent.

## Code structure

- app — a directory with its own build manifest (`package.json`, `pom.xml`) that is run, not depended on: a CLI, a server, a web front. An app depends on modules; nothing depends on an app.
- module — any unit the repository builds, app included, listed under `modules` in `roadmap.yaml` with its kind: `app`, `module`, `infra` or `spike`. `boss roadmap` makes a module of the folder of each outermost build manifest Git tracks; a manifest nested in it, a Maven module or a yarn workspace package, belongs to that module, and is a module only when added to `roadmap.yaml` by hand. A module of kind `module` is built and tested as one, and apps or other modules depend on it. Never a single JS file: that is a file.
- package — a directory inside an app or a module that groups code around one responsibility: the Java package, the TypeScript folder. It exposes an API to the other packages and hides its internal code, as Java's package-private does.
- component is banned as a Compound term. It keeps its native meaning only, the React component; everywhere else it resolves to app, module or package.

## Boundaries

- API — everything client code may depend on in an app, a module or a package, and nothing else. Always qualified by its kind: library API (exported signatures), CLI API (invocation, exit codes, stdout), HTTP API (endpoints), MCP API (tools).
- signature — one entry of an API, without a body: name, inputs, outputs, errors.
- client code — code outside an app, a module or a package that uses only its API. The client of ISP and Design by Contract.
- internal code — everything in an app, a module or a package that is not its API. It may change without notice; client code that reaches it is a defect.
- interface — the `interface` keyword of Java or TypeScript. Never a synonym for API.

## Writing in French

Compound's shipped markdown is English; four agent definitions are French. When a French word names something this glossary already names, it refers to that term and carries no meaning of its own:

- geste — edit, write, refactor, step...  depending on which is meant. Never "gesture" in English.
- gabarit — template.
- dossier durable — the submitted story.
- arbitrage, trancher — arbitration, to arbitrate.
- filet idempotent — idempotent safety net.
- périmètre — scope.
- brique, composant — app, module or package, depending on which is meant.
- code client — client code.
- code interne — internal code.

A French word with no entry here is ordinary prose, not vocabulary. The reverse also holds: if a French document needs a word that names a new pipeline thing, the term is added here in English first.
