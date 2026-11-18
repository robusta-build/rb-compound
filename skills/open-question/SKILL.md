---
name: open-question
description: Format and discipline for Open Questions and Gaps — the single mechanism for surfacing doubts, autonomous judgement calls and missing upstream pieces. To be loaded by epicman, storyman, brainstorm/bsman and designman whenever something needs a human arbitration or cannot be resolved from the sources. Replaces the old *(to validate)* / *(defined autonomously)* inline markers, which are banned.
---

# Open Questions & Gaps

One mechanism for everything an agent cannot — or must not — settle alone. The document body stays clean and assertive; the doubt lives in ONE dedicated `## Open Questions & Gaps` section at the end of the file (epic, story, brainstorm, design doc).

**Inline markers are banned.** Never write `*(to validate)*`, `*(defined autonomously)*` or any equivalent flag inside the content. A statement worth flagging becomes an entry below; a statement not worth an entry is simply asserted.

## Gap vs Open Question

- **Gap** — something missing or contradictory upstream: an absent rule, an undefined UL term, an unknown interface, two incompatible requirements between story, brainstorm and design. Gaps are often blockers — usually to be lifted before implementation can proceed.
- **Open Question** — a real choice the human must arbitrate: two viable options, or a judgement call you made autonomously that they could plausibly override.

## Format

Two groups, never interleaved: **all Gaps first** (blockers read first), then the Open Questions. Every entry carries a key in its head line, `Gap-<INFIX>-n` or `OQ-<INFIX>-n`:

```
- Gap-FOO-1: <what is missing or contradictory, and where it should come from>
- Proposition: <how to fill or resolve it>
- Rationale: <why this resolution>
- Rloq: true
- Resolution:

- OQ-FOO-2: <the question, one line>
- Proposition: <the single answer you recommend>
- Rationale: <the shortest argument that carries the decision>
- Rloq: true
- Resolution:
```

`- Rloq:` sits between Rationale and Resolution, with the separator of the entry's Rationale line, value `true` or `false`, lowercase: `true` for an entry `relevant-oq` sorted `ask`, `false` for `decide`. Absent, it reads false.

If the section grows, `### Gaps` / `### Open Questions` subheadings may mark the two blocks; the order never changes.

## The key

The key is what lets an entry be found again by lookup instead of by matching its prose word for word. Without it the only identity is the source path plus the exact question text, which is why reformulating a question silently cuts it off from its source.

- `n` runs in a single sequence shared by both types inside one document: `Gap-FOO-1` followed by `OQ-FOO-2` is correct. A number is never reused inside its document, and an existing entry is never renumbered — the number belongs to the entry, not to its position.
- The Infix is the document's own: the epic's for an epic, the story's for a story, and the story's Infix quoted verbatim for a design doc or a brainstorm. A `.brainstorm.md` carries an explicit `**Infix :**` line in its header so its keys can be read without opening the story.
- The same Infix appearing in two documents is accepted. A key identifies an entry inside its own document; the source path tells the documents apart.
- Entries written before this format have no key, and no sweep migrates them. The owning agent adds the key on its next pass over the document, and no tool ever writes a key into a source document.

The grammar of an entry is the one this skill states: head line, field lines, `Resolution:` states. Authors need nothing beyond the rules above.

## Rules

- One Proposition — commit to it. A considered alternative fits in one Rationale sentence; never a menu of options without a stance.
- `Resolution:` is born EMPTY, and only the human fills it (see Lifecycle). Two exceptions, signed by the agent: a `decide` choice, `lgtm (<agent>)`; an `ask` entry decided by an agent whose mode the human named in the request, `lgtm (<agent> <mode>)` when it retains the Proposition, `lgtm (<agent> <mode>) : <option, one line>` when it retains another. `lgtm` as a value means "the Proposition is accepted as-is"; anything else is the human's own arbitration. An empty Resolution means pending, nothing more.
- `- Rloq:` is written once, by the entry's author, when it writes the entry. Nobody rewrites it afterwards: not an answer (the human in the document, a tool that writes the `Resolution:` line, `bulker resolve`), not a signature by boss, not the author's own update. An entry written without the line never gains it; its owner may still add its key.
- Ownership — a question lives in the document where it was born, and only there. Never copy an open entry from another document (story → brainstorm → design cloning is what made entries meaningless). A doubt that follows from an open upstream entry gets no entry: the body follows that entry's Proposition and cites its key (`OQ-FOO-2` in <path>).
- Be selective: the `relevant-oq` skill decides whether a doubt opens an entry, and how its head line is worded. Load it before writing the section.
- Nothing to raise? Omit the section entirely.

## Lifecycle

An entry is arbitrated when its `Resolution:` is filled. Pending entries (empty Resolution) simply stay: a document with open entries is a normal state, never a blocker for the rest of the workflow.

Folding is the integrators' job (storyman, designman, epicman), on every run, not only at submit time. Sweep the section first: every entry with a filled Resolution is folded into the document body (an assertion, or a dated decision; at epic level a structuring decision, via epicman), then deleted. A brainstorm has no integrator: its answers fold into the story, and storyman deletes the entry from the brainstorm (`storyman update <feature> avec brainstorm`). The question disappears; the decision remains.

The human answers in the document, in the epic's bulk, or from a tool that writes the `Resolution:` line. Such a tool writes `lgtm` or the free text into the entry's empty `Resolution:` line, unsigned, like an answer typed in an editor; `bulker resolve` copies a bulk answer verbatim into that same line. The owning agent folds the answer on its next run. A Resolution already filled in the document wins over the bulk.

Legacy: a `Note: lgtm` line found in an older document carries no information (it was prefilled by agents) — treat it as an empty `Resolution:`.
