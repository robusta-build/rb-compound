---
name: compound-routine
description: >-
  RB Compound routine, for calls to RB Compound only: epic and batches, story,
  brainstorm, design, code, submit, done, fix cycle, `nxt`, pmf mode, boss commits,
  the routine words and the Compound glossary. Load it when the user types `nxt`,
  `boss`, `pmf on` or `pmf off`, `wk`, names a Compound agent (epicman, storyman,
  bsman, designman, tddman, codeman, docman, archiman, doneman, bulkman, fixman,
  boss, wkman) or `/start`, or names or edits a story, epic, brainstorm, design, fix
  or bulk document (`.story.md`, `.epic.md`, `.brainstorm.md`, `.design.md`,
  `.fix.md`, `.bulk.md`). Not loaded by `lgtm`, `oq`, `rloq` or `atw` alone, nor by
  a bug, a question or a review in a repository that has `features/`.
---

This skill applies only to calls to RB Compound. Outside such a call none of its rules applies.

## Routine

A story is one feature, `features/<feature>/<feature>.story.md`:

1. Story: `rb-compound:storyman` writes it ACTIVE; it carries the AC.
2. Brainstorm: `rb-compound:bsman`, or the skill `rb-compound:brainstorm` run by the user; then `rb-compound:storyman update <feature>`.
3. Design: `rb-compound:designman` writes `<feature>.design.md` DRAFT. Code starts on APPROVED only, written by the user or `rb-compound:boss`.
4. Code: `rb-compound:tddman` or `rb-compound:codeman`. The main agent keeps the design's `## Progress` block (§Files).
5. Commit: asked to the user.
6. Submit: `rb-compound:storyman submit <feature>` runs `rb-compound:docman` on the story's plan, then `rb-compound:archiman`, writes IMPLEMENTED on the design and removes its `## Progress` block, sets the story SUBMITTED, runs `rb-compound:epicman update <epic>` for an epic story, and proposes a closing commit, never run. IMPLEMENTED, written nowhere else, attests code committed and documentation delivered.
7. Push and merge: the user's.
8. Done, once merged: `rb-compound:storyman done <feature>` or `rb-compound:epicman done <epic>`, then `rb-compound:doneman` archives into `__done/` and `wk close <feature>` removes the worktree.

Every document is optional. Brainstorm and bulk are throwable.

Epic: optional. Its stories go in batches `B-<INFIX>-n`, said `Bn`. A long epic codes in a worktree (`wk`). `rb-compound:bulkman <epic>` gathers the open entries into `<epic>.bulk.md`, `rb-compound:bulkman resolve <epic>` copies the filled Resolutions back, then `rb-compound:storyman update <epic> [Bn]`. `rb-compound:boss` never runs `rb-compound:bulkman`.

Fix cycle, for a delivered bug: `rb-compound:fixman` captures the entry in `<owner>.fix.md`; the user arbitrates there; `rb-compound:tddman` or `rb-compound:codeman` implements and stamps `Fixed:` once tests pass; the main agent runs `rb-compound:docman` and `rb-compound:archiman` on the doc lines reported stale and proposes one commit.

## Agents

First-level agents: `rb-compound:boss`, `rb-compound:epicman`, `rb-compound:storyman`, `rb-compound:bsman`, `rb-compound:designman`, `rb-compound:tddman`, `rb-compound:docman`. Named with or without the `rb-compound:` prefix, each launches its agent with the request as typed. Any Compound agent runs under its `rb-compound:` type, never `general-purpose` nor inline.

## boss

`boss <target>`, `boss atw <target>` and `boss prepare <target>` launch `rb-compound:boss` in the background, then report its result and the cause of an early stop. Or `rb-compound:boss` runs as the main agent of its own session:

```
claude --agent rb-compound:boss "boss <target>"
```

rloq is the default of `rb-compound:boss`; `atw` makes it decide the `ask` entries itself, signed `lgtm (boss atw)`.

Commits: a request `boss <target>` is the user's explicit request for the commits of that run, one commit per pipeline step, on `epic/<epic>` or `feat/<story>` only, never a push, pmf apart. Whoever launches `rb-compound:boss` forwards this authorization and never tells it not to commit.

## pmf

On from `pmf on` to `pmf off`, never inferred. In pmf, `rb-compound:boss` works from the epic files only, with `rb-compound:epicman` and `rb-compound:tddman`, skipping `rb-compound:bsman`, the brainstorm, `rb-compound:designman`, design docs, `rb-compound:docman` and `rb-compound:archiman`. Epic files stay updated. It commits on the current branch and pushes it, never forced, switching and merging nothing. It picks the next epic itself and skips a blocked one. Without `pmf on`, `rb-compound:boss` never pushes.

## nxt

`nxt` writes nothing. It reads only `features/`, skipping `__done/`, `__future/` and `__chore/`: the first `**Status:**` line of each story and design, the `À faire`/`To do` section of each epic, the Resolutions of the Open Questions sections, the fix documents; and git: the session's modified files, last commits, the branches merged into the integration branch.

Current story: from the session's modified files, else the last commits. A finished task gets the commit; otherwise the next step, or what stopped the work, in one sentence.

- A filled Resolution not yet folded: option 1 is its integration, before any run of `rb-compound:boss`: `rb-compound:storyman update`, `rb-compound:epicman update` or `rb-compound:designman update` on its document; for a bulk, `rb-compound:bulkman resolve <epic>` then `rb-compound:storyman update <epic> [Bn]`.
- A SUBMITTED story whose branch is not merged: one option is always push and merge, by the user, and ends there: QA first, done is the user's call. No option names `rb-compound:storyman done`, even after the merge.
- A finished epic: the next one.
- No `features/`: print the line `No Compound work is open here.` word for word, then one option, writing a story with `rb-compound:storyman`.

Options, in this order: `rb-compound:boss` to finish the story or batch, the routine's next action, a cleanup or a pending fix; 1 to 3, one may end with `(recommended)`:

```
<one line recalling where the work stands, optional>
1. <item> — <stage: story | brainstorm | design | code | submit | done | fix> — <single next action>
2. …
```

## Words

Never implicit, each acts only when typed:

- `nxt`: §nxt.
- `oq`: the Open Questions and Gaps.
- `rloq`: work until only relevant Open Questions or Gaps are left.
- `atw`: all the way, `boss atw <target>`.
- `wk`: `wk <feature|epic>` opens or resumes its worktree, `wk close <name>` removes it, through `rb-compound:wkman`.
- `lgtm`: do the thing just discussed; as a Resolution, the Proposition accepted as written.
- `pmf`: §pmf.

Outside a Compound call, `lgtm`, `oq`, `rloq` and `atw` keep their ordinary sense.

Acronyms: OQ (Open Question, Gaps included), BS (brainstorm), UL (ubiquitous language), INFIX (short name of an epic or story), AC (acceptance criterion), `R-<INFIX>-n` (requirement), `B-<INFIX>-n` (batch).

The glossary's terms win over this skill.

## Files

- A Compound file the session modifies is listed in its recap with its full path.
- Glossary: `${CLAUDE_PLUGIN_ROOT}/skills/compound-routine/references/ubiquitous-language.md`
- `## Progress` grammar, for the main agent during implementation: `${CLAUDE_PLUGIN_ROOT}/skills/compound-routine/references/progress.md`
