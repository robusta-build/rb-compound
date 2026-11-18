# Story : bulker — the bulk round trip as a deterministic CLI

**Dernière mise à jour :** 2026-08-08
**Feature :** better-bulkman
**Infix :** BULKER
**Status :** ACTIVE

## Story

As the maintainer of the Compound repo, I want the two bulk phases to run as a deterministic command instead of an opus subagent, so that arbitrating an epic costs a second of CPU instead of a context budget — and so the questions come back verbatim by construction rather than by discipline.

## Contexte & objectif

`bulkman` does parsing work: read the `## Open Questions & Gaps` sections out of an epic's stories, brainstorms and design docs, merge them into `<epic>.bulk.md` while preserving the Resolutions already filled, then push the filled Resolutions back into the right source document. None of it needs judgement, yet every run spends tokens and latency on it. Worse, an LLM paraphrases: the bulk contract has to insist on "verbatim or nothing" precisely because its executor is tempted to rewrite.

What blocks a deterministic implementation today is entry identity. An entry is matched on source path plus exact question text, because `Open Question 1` gets renumbered by whoever passes next. A key carried by the entry itself — `OQ-<INFIX>-n` — turns the round trip into a lookup. The same Infix showing up in two documents is accepted, not a problem worth solving.

The hard constraint is that the source documents are the only source of truth; the bulk is a disposable productivity tool. A parser that mangles a story destroys real work, so a safe idempotent round trip matters far more than covering exotic markdown. The feature stands alone — no epic — but reuses the Infix conventions of `design-pipeline-epic`.

## Definition of done

- Every entry of an `## Open Questions & Gaps` section carries a stable key, `Gap-<INFIX>-n` or `OQ-<INFIX>-n` built on the document's own Infix, in place of today's `Gap n` / `Open Question n` label.
- A `bulker` command, installable globally (`npm install -g`, published to npm if that turns out simpler), runs on macOS and Windows 11, accepts relative or absolute paths, and refuses any target outside the current Claude project.
- Phase one rebuilds `<epic>.bulk.md` from the epic's stories, brainstorms and design docs: questions copied byte for byte, filled Resolutions preserved, integrated entries dropped, file deleted when empty. Run twice on unchanged sources, it leaves the bulk untouched.
- Phase two is fully deterministic and opens on a preflight: the whole run aborts, writing nothing, when a document fails to parse. The offending document is named so it can be cleaned by hand.
- Once the preflight passes, phase two writes each filled Resolution back into its source document and nowhere else: the entry leaves its OQ section, a dated decision line is appended. No other part of the document is rewritten, and no source is ever left half-written.
- An entry found without a key is logged, and never keyed by the command itself: the cleanup is done by hand or delegated to an LLM, and no key is ever written into a source document. `refresh` still carries such an entry to the bulk on the legacy identity — source path plus verbatim question text — because it opens no source for writing, and because refusing it would leave every existing document unbulkable until the key rollout of Dep 1 has landed. Only `resolve` refuses it at preflight, since it rewrites sources, where a wrong match is the one failure that destroys real work.
- `code/bulker` holds a TypeScript + Vite + Vitest project built on `@masala/parser`, its tests replaying the round trip on real Compound documents.
- The LLM side keeps only what needs judgement — resolving the path before the call, reading back the report — and `bulkman` stays an agent for that: a skill loads into any caller's context and fires from anywhere, while an agent has to be called on purpose.
- Does not change the arbitration workflow itself: same bulk file, same format, same human discipline of answering in the bulk while it exists.

## Documentation updates

- change the entry format in `skills/open-question/SKILL.md` — why: it is the single source of the format for every agent that writes an entry, so the key lands there or nowhere.
- change `skills/bulk/SKILL.md` — why: entry identity moves from verbatim matching to the key, and the bulk is now produced by a command.
- change `agents/bulkman.md` — why: the agent keeps only path resolution and the report handling.
- create `code/bulker/README.md` — why: install and invocation on macOS and Windows 11 have to be readable without opening the sources.
- change `README.md` — why: the tour mentions no bulk tooling at all today.

## Dependencies

- Dep 1: the key must exist in `skills/open-question/SKILL.md` and be emitted by storyman, designman, bsman and epicman before phase one can rely on it. Brainstorm and design can proceed without it; implementation cannot.
- Dep 2: closing the Windows 11 bullet needs a Windows 11 machine in the loop — a macOS-only run cannot validate path handling there.
