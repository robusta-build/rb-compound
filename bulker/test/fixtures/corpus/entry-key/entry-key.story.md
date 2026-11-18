# Story : entry key — a stable identity for every Gap and Open Question

**Dernière mise à jour :** 2026-08-08
**Feature :** entry-key
**Infix :** ENTRYKEY
**Status :** ACTIVE

## Story

As the maintainer of the Compound repo, I want every entry of an `## Open Questions & Gaps` section to carry a key of its own, so that a question can be found again by lookup instead of by matching its prose word for word.

## Contexte & objectif

An entry is labelled `Gap 1` / `Open Question 1` today, and that number belongs to the position, not to the entry: whoever passes next renumbers. The only identity left is the source path plus the exact question text. That is precisely why the bulk contract has to insist on "verbatim or nothing" — reformulating a question silently cuts it off from its source, and an agent is always tempted to reformulate.

A key carried in the head line, `Gap-<INFIX>-n` or `OQ-<INFIX>-n`, turns that matching into a lookup. The value is almost entirely in what it unblocks: the deterministic round trip of `bulker` cannot exist without a stable identity, and this story is Dep 1 of `better-bulkman`, whose design doc is APPROVED and waiting on it. It also gives cross-document references something to point at — "blocked on Story OQ 2 in <path>" becomes "blocked on `Gap-BULKER-2`".

The chantier is small: the format lives in one skill, and the agents that emit entries mostly point at that skill rather than restate it.

## Definition of done

- Every entry head line carries its key, `Gap-<INFIX>-n` or `OQ-<INFIX>-n`, built on the document's own Infix. The grammar is already specified in `features/better-bulkman/better-bulkman.design.md`, section "Entry key grammar" — this story does not restate it, it makes `skills/open-question/SKILL.md` the place every agent reads it from.
- Numbering is a single sequence shared by both types inside one document: `n` is unique across Gaps and Open Questions, so `Gap-FOO-1` followed by `OQ-FOO-2` is correct. Gaps still come first in reading order, and nothing ever renumbers an existing entry.
- `skills/open-question/SKILL.md` carries the new format, and its cross-document reference rule cites a key rather than a position.
- Each writing agent emits the key with the right Infix: the epic's for an epic, the story's for a story, the story's Infix quoted verbatim for a design doc, and the story's Infix again for a brainstorm — the one `bsman` already uses for the `R-` it numbers. A story and its brainstorm sharing an Infix is the accepted case: the bulk keeps them apart by source path.
- The `.brainstorm.md` header gains an explicit `**Infix :**` line, so a brainstorm key can be read without opening the story. `agents/bsman.md` and `skills/brainstorm/SKILL.md` each carry that one edit.
- `agents/storyman.md` is the only writer holding a literal entry template, so it is the only entry template that changes: designman, bsman, epicman and `skills/brainstorm/SKILL.md` point at the skill for the format and never restate it.
- `skills/bulk/SKILL.md` names the key as entry identity, keeping source path plus verbatim question text as the fallback for a keyless entry.
- Existing keyless entries are not migrated by a sweep: the authoring agents add the key on their next pass over a document, and no tool ever writes a key into a source document.
- Does not convert the legacy `## Open Questions` and `## Gaps / Open Questions` headings still living in `features/statusline/` and `features/poste-dev/` — they carry the abandoned `Q1 : … / Note : lgtm` shape and stay as they are.

## Documentation updates

- create the `entry key` entry in the `.claude` UL glossary — why: the term is defined today inside `better-bulkman.design.md` alone, while it becomes a format every writing agent emits (the glossary is bootstrapped by item 6 of the design-pipeline epic).
- change `README.md` — why: the tour presents designman's numbered requirements but never says that Gaps and Open Questions carry an identity too.
