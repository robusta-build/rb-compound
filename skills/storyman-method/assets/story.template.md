# Template — story

Owner: `rb-compound:storyman`. The agent reads this file at every write and never copies it.

- Mandatory: Story, Context & goal, Boundaries, Acceptance Criteria (ACTIVE) or Delivered (SUBMITTED). Before writing, the agent checks that none is missing; a mandatory section missing from an existing document is recreated, never left missing.
- Optional: the others. Omitted when they bring nothing, never left empty.
- The order of the sections is the template's. No section outside the template unless truly necessary.
- The optional business section survives submit if it stays true. A LANDED story reads SUBMITTED. `rb-compound:storyman done` changes only the Status line (`DONE (YYYY-MM-DD, commit abc1234 on <branch>)`).

The headers below are the English series. In a French project each header and label is written through the French series of `${CLAUDE_SKILL_DIR}/../compound-routine/references/headers.md`.

## ACTIVE

```markdown
# Story : <Short, telling title>

**Last update :** YYYY-MM-DD
**Feature :** <feature-slug>
**Infix :** <the story's infix — derive it readably from the feature name; it will prefix the R-/AC- of the design file. Hard rules: 5 letters min, 15 max, identifiable by a human, never initials (RP forbidden, REGPROVISION correct).>
**Status :** ACTIVE

## Story

<As a <role>, I want <capability> so that <benefit>. For a technical task, a narrative statement + goal is enough — do not force the format if it sounds wrong.>

## Context & goal

<Why this story? The problem solved, for whom, what value. 2-3 short paragraphs. If a major blocker exists, one sentence is enough here.>

## <Optional business section>

<A single section specific to the story, if it really adds something (e.g. "Which services to move out"), in short bullets. Omit if there is nothing of the kind.>

## Acceptance Criteria

- AC-<INFIX>-1 : Given <context>, When <action>, Then <observable result>
- AC-<INFIX>-2 : …
- AC-<INFIX>-n : Given the business edge cases, When they are replayed, Then <case 1> ; <case 2> ; <case 3>

## Boundaries

<Mandatory. The blocks of the boundaries skill, full zoom by default. No API touched → one line says so.>

## Open Questions & Gaps

<A few real arbitrations for the PO, in the format of the open-question skill. Omit if there are none.>

- OQ-<INFIX>-1 : <question>
- Proposition: <recommended answer>
- Rationale: <why, short>
- Rloq: true
- Resolution:


## Documentation updates

<The doc places to modify or create and why — never the doc itself, docman writes it after the implementation. Omit if nothing to document.>

- change <what> in <doc/path> — why: <short reason>
- create <what> in <doc/path> — why: <short reason>

## Dependencies

- Dep 1: ....
- Dep 2: ....

```

## SUBMITTED

```markdown
# Story : <Short, telling title>

**Last update :** YYYY-MM-DD
**Feature :** <feature-slug>
**Infix :** <INFIX>
**Status :** SUBMITTED (YYYY-MM-DD, commit abc1234)

## Story

<the statement, unchanged>

## Context & goal

<condensed to 2-3 sentences — once delivered, the long justification is stale>

## Delivered

### Requirements

- R-<INFIX>-01 : <one line, verbatim from the design file>

### Acceptance Criteria

- AC-<INFIX>-1 : <one line, verbatim from the story>

## Boundaries

<Mandatory. Carried over from the ACTIVE story, with the real delivered names when known. May stay incomplete, never absent.>

## Decisions

- YYYY-MM-DD — <decision>. Why: <short rationale>.

## Open Questions & Gaps

<only the Gaps/OQ still open; omitted if empty>

## Documentation updates

<in the past tense once delivered; a bullet left in the imperative = doc still due (docman). Omitted if empty.>

- changed <what> in <doc>
- created <what> in <doc>

## Dependencies

<the dependencies still true at submit, a lifted dependency suffixed "lifted"; omitted if none>
```
