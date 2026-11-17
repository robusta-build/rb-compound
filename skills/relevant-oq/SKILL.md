---
name: relevant-oq
description: Sorts one doubt, before it is written as an Open Question or a Gap, into one of three outcomes — `ask` (an entry the human arbitrates, Resolution empty), `decide` (an entry the agent chooses and signs `lgtm (<agent>)`), `nothing` (no entry). Also sets the defaults of a Proposition and the wording of a head line. To be loaded by every writer of an Open Questions & Gaps section (storyman, bsman, brainstorm, designman, epicman) before writing it, and by boss to sort the entries it reads.
---

# Sort a doubt before writing it

The human is asked only what commits the rest of the work. Every doubt an agent is about to write as an Open Question or a Gap is read against the document's sources and sorted: asked, decided and signed, or not written.

Scope: a doubt before it is written. A pending entry (empty Resolution) is neither removed nor reclassified, so its `- Rloq:` line never changes.

## Order

1. Split a doubt that carries two decisions; sort each part on its own.
2. `nothing` if the doubt is verifiable, dependent, or an agent action.
3. `ask` if one of the four criteria holds.
4. `decide` otherwise.

The same doubt gets the same outcome whichever agent sorts it.

## `nothing`: no entry

- Verifiable: the answer is readable in the code, git, the epic or the UL glossary. Assert it where it applies.
- Already answered: the human gave it in the session or in the agent's prompt. Assert it.
- Dependent: the doubt follows from an entry still open. The body follows the root entry's Proposition and cites its key; no entry, no "blocked on" line.
- Agent action: fold a story, complete a documentation plan, run a `storyman update`, measure after delivery. The agent names it in its report (a brainstorm's Next Steps).

A contradiction found while verifying (the code or a document against the story) is not a verified answer: it is `ask`, as a Gap, never settled in favour of the code.

## `ask`: the human arbitrates

One criterion is enough:

- Costly to undo: persisted data to migrate, a consumer outside the module broken, several modules rewritten.
- It moves a boundary or a location between apps, modules or packages, a public contract, or a format another program reads.
- It depends on what only the human knows: budget, risk appetite, priority between sub-projects, human effort, state outside the repo.
- It changes what the end user sees or what the feature delivers.

Two look-alikes of `decide` meet a criterion first:

- a tool choice that also fixes a boundary: one test script per module, or a single one at the root;
- a number that encodes a business tolerance or a cost: after how many days data goes stale.

Writes one OQ or Gap: Proposition on the defaults, `- Rloq: true`, `Resolution:` empty.

## `decide`: the agent chooses and signs

Covers interchangeable options (tool, library, internal name or format, schedule), a number adjustable by config, and any doubt that meets no criterion.

Writes one OQ:

- Proposition: the choice, on the defaults.
- Rationale: the motive, in one sentence.
- Rloq: `false`.
- Resolution: `lgtm (<agent>)`, `<agent>` being the writer: `storyman`, `bsman`, `brainstorm`, `designman`, `epicman` or `boss`. It is a Resolution value, not a new field.

```
- OQ-FOO-4: Which formatter runs on the repo: Prettier, already configured, or oxfmt?
- Proposition: Prettier, configured in package.json and maintained.
- Rationale: interchangeable tools; the one in place wins while maintained.
- Rloq: false
- Resolution: lgtm (designman)
```

The writer never folds it in the same run: the next update of the document folds it like a human answer. A signed entry never enters the epic bulk. The human contests it by replacing the Resolution before that update, or after the fold with `storyman update <feature> : <event>`.

To arbitrate stays the human's act: an agent decides, and arbitrates an `ask` entry only under a mode the human named in the request, signed `lgtm (<agent> <mode>)[ : <option>]` (`open-question` §Rules). In a French document, « trancher » is the human's verb, and the outcomes stay `ask`, `decide` and `nothing`, in backticks.

## Defaults

They build the Proposition of a `decide` entry and of an `ask` entry alike.

- Tool: the one already in place, as long as its maintainers keep it alive; otherwise the most modern standard the industry accepts.
- The lightest option, without added rigour: no branch protection, proof or snapshot.
- No UL term that neither the code nor a contract uses.

Sources:

- "In place" is read from the project's manifests and CLAUDE.md, then the global CLAUDE.md, then the machine: an installed tool, checked with `command -v` on Linux and macOS, `Get-Command` on Windows. Other repos are not browsed.
- A protection or a proof is imposed only when a manifest, a CLAUDE.md, the README or an upstream document requires it. One that a client project's CLAUDE.md requires is applied without a question.

## Writing an entry

For `ask` and `decide` alike, the head line:

- ends with the question the human decides, and a `?`;
- fits in about 150 characters and carries one decision;
- names the options by their consequence;
- uses UL or plain words only, in the document's language: no term coined in the document, no key other than the entry's own (a requirement, an acceptance criterion, another entry), no `file:line`.

A Gap head line names what is missing or contradictory, then the decision expected. A Gap with no decision for the human is an agent action: `nothing`.

Final test: the entry reads in the bulk without its source.

## Examples

- Rust or TypeScript for a library, which decides who can consume it: `ask`.
- Prettier or oxfmt, Prettier configured in the repo: `decide`, Prettier.
- Terraform installed on every machine, OpenTofu more modern: `decide`, Terraform, unless its maintainers abandon it.
- After how many days data goes stale: `ask`, a business tolerance.
- The story disagrees with the code it describes: `ask`, as a Gap.
- An answer the human gave earlier in the session: `nothing`, asserted.
- A design doubt that contradicts a Proposition assumed upstream: `ask`, as a Gap of the design; both entries stay pending.
