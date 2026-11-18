# Design: roadmap agent → roadmap skill

**Last update:** 2026-07-29
**Feature:** roadmap-skill
**Infix:** ROADMAP
**Status:** APPROVED (2026-07-29 — validated by `lfg`, implemented the same day)
**Sources:** [design-pipeline.epic.md](design-pipeline.epic.md) (item 5 of À faire), [agents/roadmap.md](../../agents/roadmap.md), [CLAUDE.md](../../CLAUDE.md) (§nxt behavior, §Code Routine), [skills/bulk/SKILL.md](../../skills/bulk/SKILL.md) and [skills/open-question/SKILL.md](../../skills/open-question/SKILL.md) (target shape of a Compound skill). No story, no brainstorm for this feature.

## Goal

Turn `agents/roadmap.md` into `skills/roadmap/SKILL.md`: the roadmap stops being a subagent you delegate to and becomes a procedure the caller loads. On the way, the file drops the vocabulary the pipeline no longer uses (PRD, Progress table at 100%), reconciles the two contradictory removal rules (`agents/roadmap.md` rule 1 versus `commands/archive.md` step 5), and stops committing on its own.

## Ubiquitous Language

Terms used here, as the Compound pipeline defines them. The `.claude` project has no glossary file yet (Gap 1).

- Skill — a procedure in `skills/<name>/SKILL.md`, loaded into the caller's context. Not an agent: no isolated context, no report handed back.
- Agent — a file in `agents/<name>.md`, launched through the Task tool in its own context, returning a report.
- Roadmap item — one entry of a project's `ROADMAP.md`. A feature may group several items.
- Delivered — the pipeline's real end state: story LANDED, or feature directory sitting under `__done/`. Done is a location, never a suffix and never a roadmap status.
- Blocked — an item carrying an unresolved `depends_on:` or an `on_hold:`. Version labels never block.
- Hold — a deliberate pause with a reason, set and lifted only on explicit human request.

## Interfaces

### skills/roadmap/SKILL.md (created)

Frontmatter, the whole discovery contract:

```yaml
---
name: roadmap
description: Read and maintain a project's ROADMAP.md — item statuses, depends_on relations, holds, and which items are unblocked. Load it when adding, holding, resuming or closing a roadmap item, when syncing the roadmap against the features/ tree, or when a caller needs the roadmap-side candidates for nxt.
---
```

No `model:`, no `color:`, no `<example>` routing blocks — those are agent keys with no effect on a skill.

Invocation surface: `Skill(roadmap)`, `/roadmap`, or model-chosen from the description. The mode is parsed from the argument line:

- `roadmap sync` — reconcile statuses with the `features/` tree and fill missing `story:` paths. Never removes an item, never invents a `depends_on:`.
- `roadmap next` — return the roadmap-shaped candidates: items that are neither delivered, on hold, nor blocked by an unresolved `depends_on:`, in roadmap order. It does not re-rank stories, design docs or epics — that ordering belongs to §nxt behavior in `CLAUDE.md`, which consumes this output as its group 4.
- `roadmap hold <feature> <reason>` — set `on_hold:` with the reason, `status: on_hold`.
- `roadmap unhold <feature>` — drop `on_hold:`, restore `todo` or `wip` from the files on disk.
- `roadmap add <feature> [version]` — append an entry, `status: todo`, default version MVP.
- `roadmap done <feature>` — remove the item and report which dependents it unblocks.
- bare `roadmap` — read-only status report, no write.

Output contract, ending every mode:

```
ROADMAP STATUS
- Total: X items
- Todo: X | Wip: X | On hold: X
- Blocked: X (which, and by what)
- Next: <item> (or "none — all blocked or empty")
```

Invariants the skill carries:

- Never commits. It proposes `chore(roadmap): <summary>` and stops — `CLAUDE.md` forbids implicit commits, which overrides the old rule 4 "Commit every change".
- Removal happens in `roadmap done` only. `sync` and every other mode change fields, never lines.
- `on_hold:` is only lifted by an explicit `unhold`.
- Order and section layout written by a human are preserved; the skill adds fields, it does not restructure.
- `depends_on:` stays conservative: a shared table, route or module is a dependency; business priority is not.

### ROADMAP.md (format owned by the skill)

Lives at the root of each target project, one entry per item:

```markdown
# Roadmap

## <Item name>
- version: POC | v0.8 | MVP | v1 | v2 | …
- status: todo | wip | on_hold
- depends_on: [item-a, item-b]   <!-- optional, only when blocked -->
- on_hold: waiting for the partner API docs   <!-- optional, the reason -->
- story: features/<name>/<name>.story.md   <!-- optional, once the story exists -->
- <description>
```

Two changes to the current format. `status: done` disappears: an item that is delivered leaves the file, so the roadmap only holds work still ahead — the state the `nxt` logic and `commands/archive.md` already assume. And `story:` now points at the `.story.md` (the field was labelled `story:` while holding a `.design.md` path); the design doc is found next to the story, it needs no field of its own.

Status derivation used by `sync`, aligned on the pipeline's real statuses:

- directory under `__done/`, or story LANDED → delivered, propose removal (never automatic)
- story ACTIVE, or a `.design.md` present in DRAFT or APPROVED → `wip`
- item with no feature directory yet → `todo`
- `on_hold:` present → `on_hold`, whatever the files say

The "all DESIGNs at 100% (Progress table)" signal is gone with the progress machinery the epic removed.

Missing file: on a write mode (`add`, `hold`, `done`, `sync` with changes) the skill creates `ROADMAP.md` with the `# Roadmap` header and the requested entry. On a read mode it reports "no ROADMAP.md" and writes nothing. `.claude` itself has none today.

### agents/roadmap.md (deleted)

The agent file goes away in the same change: two routable definitions named `roadmap` in two namespaces make selection ambiguous, and git keeps the history (Open Question 1).

### Callers (wiring, modified)

Delegation becomes loading — the caller keeps the work in its own context instead of handing it to a subagent.

- `agents/boss.md:42` "Pick feature (roadmap agent)" and `:91` "If picking from roadmap" → boss loads the skill. Its Phase-1 report line stays; only the mechanism changes.
- `agents/codeman.md:88` and `agents/tddman.md:135` "Propose the next item from ROADMAP.md" → load the skill in `next` mode rather than reading the file free-hand.
- `commands/archive.md:26` — signal 2 "ROADMAP.md marks the feature `status: done`" is dead with the status; the done-detection block points at the delivered definition above (story LANDED, directory under `__done/`).
- `commands/archive.md:37` — roadmap cleanup becomes an idempotent safety net: `storyman land` normally removed the item already, so archive reports "nothing to clean" rather than deleting sections.
- `agents/docman.md:30` "tick the item done" → docman stops touching `ROADMAP.md`; the removal has a single owner (Open Question 3).
- `agents/epicman.md:25` and `:37` (propose roadmap priority, update the roadmap) → epicman loads the skill for `add`.
- `CLAUDE.md` §nxt behavior group 4 and §Code Routine steps 9 and 11 name the skill instead of the agent.
- `agents/storyman.md` land mode → gains the removal gesture (step 6) and the one-file exception that goes with it, the same way epicman was loosened for `business-rules.md`. Without it R-ROADMAP-43 names an owner that has no mandate to write the file.
- `agents/naming.md:208` "Read ROADMAP.md for existing feature names" — unchanged. A plain read needs no skill.

## Technical Constraints

Claude Code skill mechanics, and what they cost here:

- Discovery is frontmatter-only: `name` plus `description` are the sole text loaded before invocation, so the description is the routing logic. The agent's `<example>` blocks have no equivalent and are dropped.
- A skill body executes in the caller's context. No isolation, no separate model, no returned report — whatever boss or codeman had loaded is still there, and the roadmap instructions land on top. The skill must hold one page; it is charged to a context that is already busy.
- The skill owns no tools. Reads and writes go through the caller's Read/Edit/Write and its permissions: a caller with read-only permissions can still run `next` and the status report.
- A skill cannot be launched in background or in parallel the way a subagent can; `bg` and `wk` on roadmap work disappear with the agent.
- `ROADMAP.md` is per target project and hand-edited by humans between runs. Parsing stays tolerant: unknown fields and free prose are preserved untouched.

## Requirements

- R-ROADMAP-01: `skills/roadmap/SKILL.md` exists with `name` and `description` frontmatter only, the description naming the situations that should load it.
- R-ROADMAP-02: `agents/roadmap.md` is deleted in the same change, leaving one definition named `roadmap`.
- R-ROADMAP-03: the skill holds one page and duplicates no priority logic already written in §nxt behavior — it points at it.
- R-ROADMAP-04: the skill never commits; each mode ends by proposing `chore(roadmap): <summary>`.
- R-ROADMAP-05: the skill exposes exactly the modes sync, next, hold, unhold, add, done, plus a bare read-only status report.
- R-ROADMAP-21: the skill owns the `ROADMAP.md` entry format and preserves human formatting, ordering and unknown fields.
- R-ROADMAP-22: the status vocabulary is todo, wip, on_hold — `done` is not a roadmap status.
- R-ROADMAP-23: delivered is derived from the pipeline's statuses (story LANDED, directory under `__done/`), never from a progress table.
- R-ROADMAP-24: `roadmap done` is the only mode that removes a line; removal is proposed, never silent, and reports the dependents it unblocks.
- R-ROADMAP-25: an item is blocked only by an unresolved `depends_on:` or an `on_hold:`; version labels are informational.
- R-ROADMAP-26: a missing `ROADMAP.md` is created on write modes and reported on read modes.
- R-ROADMAP-41: boss, codeman, tddman and epicman load the skill where they used to launch the agent or read the file free-hand.
- R-ROADMAP-42: `commands/archive.md` detects a delivered feature per R-ROADMAP-23, and its roadmap cleanup is idempotent.
- R-ROADMAP-43: `storyman land` is the single owner of the removal; `agents/docman.md` no longer writes `ROADMAP.md`.
- R-ROADMAP-44: `agents/naming.md` keeps its direct read of `ROADMAP.md`, unchanged.
- R-ROADMAP-45: `storyman land` carries the removal gesture, and its "one file only" rule states `ROADMAP.md` as its single exception.

## Acceptance Criteria

- AC-ROADMAP-01: Given Moka in a project with a `ROADMAP.md`, when she runs `/roadmap sync`, then the statuses are recomputed in her own session with no subagent launched, and the run ends on a proposed `chore(roadmap):` message with nothing committed.
- AC-ROADMAP-02: Given Moka in `.claude` where no `ROADMAP.md` exists, when she runs `roadmap add compound-cli`, then the file is created with the `# Roadmap` header and the entry; when she instead runs `roadmap next`, then she gets "no ROADMAP.md" and no file is written.
- AC-ROADMAP-03: Given a feature whose story is LANDED, when `roadmap done <feature>` runs, then the item and its fields are removed, the dependents it unblocks are listed, and no `status: done` is written anywhere.
- AC-ROADMAP-04: Given a v2 item with no `depends_on:` and no `on_hold:` while a v0.8 item is still todo, when `roadmap next` runs, then the v2 item is among the candidates.
- AC-ROADMAP-05: Given an item carrying `on_hold: waiting for the partner API docs` whose story is now ACTIVE, when `roadmap sync` runs, then the hold and its reason are untouched and the status stays `on_hold`.
- AC-ROADMAP-06: Given boss at pipeline step 1 with no user-provided feature name, when it picks from the roadmap, then it loads the roadmap skill in its own context and finds no `roadmap` subagent to launch.
- AC-ROADMAP-07: Given Ristretto running `/archive <feature>` after `storyman land` already removed the item, then the roadmap cleanup reports nothing to clean and no line is deleted twice.
- AC-ROADMAP-08: Given a feature directory holding a `.design.md` in DRAFT and an ACTIVE story, when `roadmap sync` runs, then the item reads `wip` and no progress percentage is consulted.

## Dependencies

- Depends on: `designman` stabilised (epic item 5 precondition, met).
- Blocks: nothing. The `*.prd.md` mentions still sitting in `commands/archive.md` (header, legacy done signal, example tree), `agents/docman.md` and `agents/epicman.md:23` belong to the same epic item 5 but to a different sweep.

## Open Questions & Gaps

- Gap 1: `.claude` has neither a UL glossary section in its README nor a `business-rules.md`, so this doc's vocabulary (skill, agent, roadmap item, delivered, hold) rests on nothing durable.
- Proposition: epicman bootstraps a `## Ubiquitous Language` section in `README.md` and an empty `business-rules.md` at the repo root, then seeds them with those six terms.
- Rationale: the epic already assigns the bootstrap of `business-rules.md` to epicman; the glossary follows the same project-level logic.
- Resolution: lgtm

- Gap 2: no story exists for this feature, so there is no `Documentation updates` plan — and `README.md` still presents roadmap under "The specialist agents `boss` calls" with a done signal based on the PRD.
- Proposition: create the story with a doc plan covering that README section (move it under "The skills `boss` relies on", rewrite the done sentence per R-ROADMAP-23), reusing the Infix ROADMAP verbatim.
- Rationale: docman executes a plan written by storyman; without a story the README drift ships silently.
- Resolution: no need for a story

- Open Question 1: delete `agents/roadmap.md`, or soft-deprecate it the way `commands/concept.md` was?
- Proposition: delete it.
- Rationale: two routable definitions named `roadmap` make selection ambiguous, and unlike `/concept` no artifact of the agent survives it — git holds the history.
- Resolution: lgtm

- Open Question 2: drop `status: done` from the roadmap vocabulary?
- Proposition: drop it — a delivered item leaves the file.
- Rationale: it kills the contradiction between "never remove features" and archive's "the roadmap should only contain future work" at the root, and keeps done as a location; the cost is a documented status disappearing from `README.md`.
- Resolution: lgtm

- Open Question 3: does `storyman land` become the single owner of roadmap removal, docman dropping `ROADMAP.md` from its scope?
- Proposition: yes.
- Rationale: routine step 9 and `agents/docman.md:30` currently both claim the gesture, and land is the step that knows the story is LANDED.
- Resolution: lgtm,  docman should not touch the roadmap
