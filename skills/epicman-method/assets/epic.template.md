# Template — epic

Owner: `rb-compound:epicman`. The agent reads this file at every write and never copies it.

- Mandatory: Epic, Boundaries, Done, To do, Structuring decisions. Before writing, the agent checks that none is missing; a mandatory section missing from an existing document is recreated, never left missing.
- Optional: the others. Omitted when they bring nothing, never left empty.
- The order of the sections is the template's. No section outside the template unless truly necessary.
- Done and To do are always two separate sections, never a mixed checkbox list.

The headers below are the English series. In a French project each header and label is written through the French series of `${CLAUDE_SKILL_DIR}/../compound-routine/references/headers.md`.

---- Start of the template

```markdown
# Epic : <Short, telling title>

**Last update :** YYYY-MM-DD
**Epic :** <epic-slug>
**Infix :** <INFIX>
**Version :** <POC | MVP | V1 | V2 — current version of the epic>
**Module :** <id read in roadmap.yaml — line omitted without a module>
**Depends on :** <epic ids separated by commas — line omitted without a dependency>

## Epic

<As a <role>, I want <capability> so that <benefit>. A narrative wording is acceptable if the format sounds wrong.>

## Context & target architecture

<Optional. The minimum to understand the epic without opening the stories: the problem, the target architecture (a short ASCII diagram if useful), the major constraints. Condense as the epic moves forward — what is delivered no longer needs to be justified here.>

## Stories of the epic

<List of the stories of the folder, one bullet each: relative link, goal in one line, status in one word: in progress / ready / landed / done / to do / archived (the Status field of the story is authoritative). Never the requirements — they live in the landed story and the design file. This is the table of contents of the epic. An archived story lives in `__done/` of the epic folder: its link points to `__done/<story>/…`.> ; Likewise, an ignored story lives in `__future/`: it is really ignored 


## Boundaries

<Mandatory. The boundaries the epic crosses, in the format of the `rb-compound:boundaries` skill (load it before writing), at sketch zoom by default, opened by the overview figure (`rb-compound:schematic` skill, pattern I). No mapping imposed between the epic and a module.>


## Done

<What is implemented AND validated. Dated bullets, chronological order, condensed: the what, the date, the commit if known, the pointer to the story. Never implementation detail.>

## To do

<What remains, by priority order. One bullet per story or milestone, with the link to the story if it exists and the progress state in parentheses if nuanced ("implemented, awaiting validation", "story written, not started", "blocked by X").>

<Grouped into batches: 1 to 4 stories that can be coded in parallel (criteria: epicman §Batches). >


* Batch B1 
    - [schema](schema/schema.story.md) — story written

* Batch B2 — blocked by schema
    - [landing-page](landing-page/landing-page.story.md)
    - [seo](seo/seo.story.md)

* Batch B3 — blocked by seo
    - [prospection](prospection/prospection.story.md)



## Open Questions & Gaps

<Optional. The arbitrations still open at epic level, in the format of the `rb-compound:open-question` skill (`Resolution:` born empty, filled by the human alone — never an inline marker). A settled question migrates to Structuring decisions.>

## Out of scope

<Optional. What the epic does not cover, in short bullets.>
```

---- End of the template
