# Template — design file

Owner: `rb-compound:designman`. The agent reads this file at every write and never copies it.

- Mandatory: Goal, Boundaries, Requirements, Acceptance Criteria. Before writing, the agent checks that none is missing; a mandatory section missing from an existing document is recreated, never left missing.
- Optional: the others. Omitted when they bring nothing, never left empty.
- The order of the sections is the template's. No section outside the template unless truly necessary.

```markdown
# Design: <short title>

**Last update:** YYYY-MM-DD
**Feature:** <feature-slug>
**Infix:** <INFIX>
**Status:** DRAFT
**Sources:** <relative links: story, brainstorm, epic>

<no `## Progress` at writing: the block is born when the implementation starts and belongs to the main agent — its place is here, between the header and `## Goal`, its grammar in `rb-compound:compound-routine`, `references/progress.md`>

## Goal

<2-3 sentences: what this feature does, engineering-side. Link to the story for the why.>


## Boundaries

<The core. Created or modified contracts: signatures, input/output types, errors, invariants. Group by app, module or package, API kind stated (library, CLI, HTTP, MCP). Real names from the codebase.>

## Technical Constraints

<Language/platform-specific only: runtime versions, threading model, memory, third-party limits. Omit what does not constrain the implementation.>

## Requirements

- R-<INFIX>-01: <requirement — functional, business or technical, one sentence>
- R-<INFIX>-02: …

## Acceptance Criteria

<The story's AC, quoted verbatim with their story identifier — none written here. Then the business edge cases tddman must test: domain situations drawn from the story's edge-case AC and the brainstorm, never an input-validation error. No other test-case enumeration.>

- AC-<INFIX>-1: <verbatim from the story>

Edge cases to test:

- <business edge case, one line>

## Dependencies

- Depends on: … / Blocks: … <omit if none>

## Open Questions & Gaps

<Per the open-question skill. Omit if empty.>
```
