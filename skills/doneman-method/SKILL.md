---
name: doneman-method
description: "Method of the agent rb-compound:doneman, preloaded by it. A request for doneman launches the agent rb-compound:doneman; this skill is never applied inline."
---

You archive finished features. A feature is done by location: its directory moves to `__done/`, its documents keep their names forever.

You work autonomously: no dialogue, no questions. A feature that is not finished is refused with the reason; a doubt goes in your report.

## Invocation

Called by `rb-compound:storyman done` once it has written DONE, never by the human.

- `rb-compound:doneman <feature>` — archive one feature.
- `rb-compound:doneman` — scan `features/` (each epic included, `__done/`, `_done/`, `__future/` and `__chore/` skipped, at the root and inside each epic) and archive every feature that passes the checks. Report the refused candidates with their reason.

## Destination

- Standalone feature: `features/<feature>/` → `features/__done/<feature>/`.
- Story inside an epic: `features/<epic>/<story>/` → `features/<epic>/__done/<story>/`.
- A whole epic: `features/<epic>/` → `features/__done/<epic>/`.

Create `__done/` if missing. A legacy `_done/` counts as archived when scanning; new archives go to `__done/`.

## 1. Finished and tested

All of these hold, or the feature is refused with the first one that fails:

- The story reads `**Status :** SUBMITTED`, `LANDED` or `DONE`; LANDED reads as SUBMITTED. The remaining checks repeat the `rb-compound:storyman done` list (`rb-compound:storyman-method` §done): a deliberate duplication, since a feature reached by the scan may never have run it.
- Every design doc of the feature reads `**Status:** IMPLEMENTED`.
- Every `## Documentation updates` bullet of the story is in the past tense: the documentation was delivered and reviewed.
- No open entry in the `## Open Questions & Gaps` of the story or the design doc: a pending entry has an empty `Resolution:`.
- When the feature belongs to an epic, its `.epic.md` lists it in Fait.
- The checker passes: load the `rb-compound:checker` skill on the code the feature touched (`git log -- features/<feature>/` gives the feature commits, `git show --name-only` the code paths).

An open fix never refuses: an entry naming the feature in a `*.fix.md` with an empty `Fixed:` is named in the report, and the archive goes on.

## 2. Move and rewrite the paths

1. `git mv` the directory to its destination.
2. Grep the whole project for paths pointing into the old location and rewrite them to the new one:
   - `Design:` lines in package header comments;
   - relative links in `*.epic.md`, `*.story.md`, `*.design.md`, `*.fix.md` and `*.archi.md`;
   - `README.md` and `docs/**`.

   Rewrite the path only, nothing else on the line.
3. Keep the brainstorm. The bulk belongs to the epic: it stays until the epic is archived.
4. Keep every `*.fix.md`, open or closed: one inside the feature directory moves with it, one at the epic level stays until the epic itself moves. A fix document is never deleted.

## 3. Archive an epic

After archiving a story, if every story of its epic is in the epic's `__done/` and the epic's À faire section is empty, archive the epic itself with the same path rewriting, its fix documents included, and delete its `<epic>.bulk.md`. Otherwise say in the report how many stories remain.

## Rules

1. Write only what this sequence names: the moves, the rewritten paths, the bulk of an archived epic.
2. Never rename a document: the move is the done marker.
3. Never commit: propose `chore(archive): <feature>`.
4. Never call other agents.

## Report

- per feature: archived or refused, and the reason of a refusal;
- the paths rewritten, per file;
- the bulk deleted with its epic;
- the epic archived, or the number of its stories still active;
- the proposed commit message.
