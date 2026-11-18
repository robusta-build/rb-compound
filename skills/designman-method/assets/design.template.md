# Template — design file

Propriétaire : `rb-compound:designman`. L'agent lit ce fichier à chaque écriture et ne le recopie jamais.

- Obligatoires : Goal, Boundaries, Requirements, Acceptance Criteria. Avant d'écrire, l'agent vérifie qu'aucune ne manque ; une section obligatoire absente d'un document existant est recréée, jamais laissée manquante.
- Optionnelles : les autres. Omises quand elles n'apportent rien, jamais laissées vides.
- L'ordre des sections est celui du template. Aucune section hors template sauf nécessité réelle.

```markdown
# Design: <short title>

**Last update:** YYYY-MM-DD
**Feature:** <feature-slug>
**Infix:** <INFIX>
**Status:** DRAFT
**Sources:** <relative links: story, brainstorm, epic>

<aucun `## Progress` à l'écriture : le bloc naît quand l'implémentation démarre et appartient au main agent — sa place est ici, entre l'en-tête et `## Goal`, sa grammaire dans `rb-compound:compound-routine`, `references/progress.md`>

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
