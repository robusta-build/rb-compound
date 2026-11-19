# Headers — the French and English series

Design: `features/compound-plugins-epic/agents-english/agents-english.design.md`. The plugin is written in English. Compound documents exist in two series of markers, French and English. A writer picks a series by project language; a reader accepts both, with no conversion.

Line grammar: one marker per line, `- <key>: `<fr>` | `<en>``. Keys are unique across the file. A marker with two French forms gets two lines with distinct keys. The French column is copied byte for byte from the documents written before the English series existed.

## Project language

The language of a project is read in this order, the first source that settles it winning:

1. The documents of the feature: its story, then its epic. A story or epic is French when its date label is `**Dernière mise à jour :**`, English when it is `**Last update :**`. Without a date label, the series of its first non-shared header decides.
2. The epic of the feature, when the feature has no story yet.
3. The README of the project: the language of its prose.
4. The request: its language. A project with no README and no document takes the language of the request.

Brainstorms and designs never count: a brainstorm is English with labels in the project language, a design is English in every project. The shared headers (`## Boundaries`, `## Open Questions & Gaps`…) decide nothing.

A mixed document is read section by section, each header in either series. A writer adds an entry in the series of the section it extends, a new section in the language of the document, and never rewrites an existing header.

A header no reader knows is ordinary prose: the section is kept as found and no reader stops on it.

## Story

- lastUpdate: `**Dernière mise à jour :**` | `**Last update :**`
- contextGoal: `## Contexte & objectif` | `## Context & goal`
- delivered: `## Livré` | `## Delivered`
- decisions: `## Décisions` | `## Decisions`
- decisionLine: `- AAAA-MM-JJ — <décision>. Pourquoi : <rationale courte>.` | `- YYYY-MM-DD — <decision>. Why: <short rationale>.`
- reopened: `réouverte : <pourquoi>` | `reopened: <why>`
- ref: `Réf : <clé>` | `Ref: <key>`
- lifted: `levée` | `lifted`
- doneStatus: `DONE (AAAA-MM-JJ, commit abc1234 sur <branche>)` | `DONE (YYYY-MM-DD, commit abc1234 on <branch>)`
- submittedStatus: `SUBMITTED (AAAA-MM-JJ, commit abc1234)` | `SUBMITTED (YYYY-MM-DD, commit abc1234)`
- onBranch: `sur <branche>` | `on <branch>`
- statement: `En tant que <rôle>, je veux <capacité> afin de <bénéfice>` | `As a <role>, I want <capability> so that <benefit>`
- proposition: `- Proposition :` | `- Proposition:`
- rationale: `- Rationale :` | `- Rationale:`
- rloq: `- Rloq :` | `- Rloq:`
- storyTitle: `<Titre court et parlant>` | `<Short, telling title>`
- optionalSection: `<Section métier optionnelle>` | `<Optional business section>`

## Epic

- epicLastUpdate: `**Dernière mise à jour :**` | `**Last update :**`
- contextArchitecture: `## Contexte & architecture cible` | `## Context & target architecture`
- storiesOfEpic: `## Stories de l'epic` | `## Stories of the epic`
- done: `## Fait` | `## Done`
- todo: `## À faire` | `## To do`
- structuringDecisions: `## Décisions structurantes` | `## Structuring decisions`
- todoWord: `À faire` | `To do`
- outOfScope: `## Hors scope` | `## Out of scope`
- blockedBy: `— bloqué par` | `— blocked by`
- outsideBatch: `Hors batch` | `Outside batch`
- storyToWrite: `story à écrire` | `story to write`
- storyWritten: `story écrite` | `story written`
- storyStates: `en cours / prête / landed / done / à faire / archivée` | `in progress / ready / landed / done / to do / archived`
- implementedAwaiting: `implémenté, en attente de validation` | `implemented, awaiting validation`
- storyWrittenNotStarted: `story écrite, pas commencée` | `story written, not started`
- blockedByX: `bloqué par X` | `blocked by X`
- epicTitle: `<Titre court et parlant>` | `<Short, telling title>`
- epicVersion: `<POC | MVP | V1 | V2 — version en cours de l'epic>` | `<POC | MVP | V1 | V2 — current version of the epic>`
- moduleOmitted: `<id lu dans roadmap.yaml — ligne omise sans module>` | `<id read in roadmap.yaml — line omitted without a module>`
- dependsOmitted: `<ids d'epics séparés par des virgules — ligne omise sans dépendance>` | `<epic ids separated by commas — line omitted without a dependency>`
- moduleBlock: `Module et dépendances :` | `Module and dependencies:`

## Fix

- fixLastUpdate: `**Dernière mise à jour :**` | `**Last update :**`

## Brainstorm

- autonomousDecision: `**Décision (autonome):**` | `**Decision (autonomous):**`
- decision: `**Décision:**` | `**Decision:**`
- problem: `**Problème:**` | `**Problem:**`
- optionsConsidered: `**Options considérées:**` | `**Options considered:**`
- consequencesIfNothing: `**Conséquences si on ne fait rien:**` | `**Consequences if nothing is done:**`
- switchAuto: `passe en automatic` | `switch to automatic`
- switchAutoShort: `passe en auto` | `switch to auto`
- continueAlone: `continue tout seul` | `continue alone`
- continueAloneShort: `continue seul` | `continue on your own`
- finishAlone: `finis tout seul` | `finish alone`
- finishAloneShort: `finis seul` | `finish on your own`

## Arguments and replies

Invocation arguments, either form with the same meaning. Documentation and launches write the English form; `bulker` still prints `avec brainstorm`.

- withBrainstorm: `avec brainstorm` | `with brainstorm`
- withBrainstorms: `avec brainstorms` | `with brainstorms`
- untilStep: `jusqu'au <step>` | `until <step>`
- untilTheStep: `jusqu'à la <step>` | `until <step>`

Refusals another agent matches are fixed strings, written in English whatever the language of the request. The French forms are read only.

- epicmanRefusal: `en attente de validation utilisateur — rien journalisé` | `awaiting user validation — nothing logged`
- storymanRefusal: `en attente de validation utilisateur — rien soumis` | `awaiting user validation — nothing submitted`

## Shared

Strings identical in both series.

- `# Story :`
- `# Epic :`
- `# Fix :`
- `**Feature :**`
- `**Infix :**`
- `**Status :**`
- `**Epic :**`
- `**Version :**`
- `**Module :**`
- `**Depends on :**`
- `**Owner :**`
- `**Grain :**`
- `## Story`
- `## Epic`
- `## Acceptance Criteria`
- `## Boundaries`
- `## Open Questions & Gaps`
- `## Documentation updates`
- `## Dependencies`
- `### Requirements`
- `### Acceptance Criteria`
- `* Batch Bn`
- `ACTIVE`, `SUBMITTED`, `DONE`, `LANDED`, `READY`
- `- Arbitrage (<user>, <date>) :`
- `- Fixed:`
