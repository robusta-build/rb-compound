---
name: code-comments
description: Rules for comments in code, against AI comment slop. The code explains itself; comments are limited to a header on each package's entry file (design reference and requirement IDs), a one-liner on each public function, and rare exceptions inside code — an algorithm or optimisation choice, a TODO where the code falls short of a good design, a scenario comment on a complex test. Language-agnostic. Two modes — write and review. Used by the Compound framework.
---

# code-comments — the code explains itself

A comment compensates for code that could not say it. Before writing one, try a better name or a smaller function. What remains is listed below; everything else is slop.

Comments are written in the language of the code, in the language's own doc-comment format (Javadoc, JSDoc, docstring…).

## The package entry file

Each package has one entry file carrying its API: `index.ts`, `package-info.java`, `__init__.py`… It opens with one multiline comment:

```ts
/**
 * Package scale — stretches a raw rating onto 0-20.
 *
 * Design: ./features/trwg-epic/rating-scale/rating-scale.design.md
 * Requirements: R-RATINGSCALE-01, R-RATINGSCALE-02, R-RATINGSCALE-21
 */
```

- One line saying what the package is for.
- The design file, by its path from the project root. A design living outside the repository is named alone: `Design: role-skills-plan`.
- The requirements it implements, by ID only. Their content lives in the design file and is never restated.
- Several design files touch the package: one `Design:` line each, each followed by its own `Requirements:` line.
- No design file: the purpose line alone.

## Public functions

A public function (visible outside its file or class: `export`, `public`) gets a one-line doc comment, wherever it lives:

```ts
/** A raw rating stretched onto 0-20 by the frozen anchor, clamped. */
normalize(rating: number, source: SourceId): Score;
```

One line, no `@param` or `@returns` restating the types. A private function gets no comment.

## Inside the code

No comment, except:

1. An algorithm or optimisation choice that departs from the obvious clean code: one line saying why this one rather than the other. Never to justify following the design file, never to justify writing the code at all.
   `// Binary search: the list holds up to 10^6 sorted entries.`
2. A gap between a good design and the code as it is: a `TODO` saying what the clean version does, without justification. Add the key of a Gap or a fix entry when one exists.
   `// TODO: read the anchor through the Scale API, not the constant (Gap-RATINGSCALE-3)`
3. In a test only: when the scenario involves more than three interrelated objects, a short comment at the top of the test states the scenario.

Something badly done is not justified: it gets a `TODO`, or it gets fixed.

## Never

- What the code does: `// sort users by name`.
- History: added, changed, removed, fixed, now, no longer.
- A requirement ID inline: requirements live in the package header.
- Narration of the conversation or of the reasoning: "as requested", "we now", "this ensures".
- Commented-out code.
- Section banners: `// ======== Helpers ========`.

## Modes

- write — apply the rules while writing code. Every change to a package updates its header in the same change: add the `Design:` line of the design file being implemented and its `R-`, remove the `R-` a newer design file redefines. Every public function added or changed gets its one-liner in the same change.
- review — read-only. For each offending comment: its location, the rule it breaks, and "delete" or a rewrite. End with a count per rule, and list the package entry files missing their header.

## In Compound

Loaded by tddman and codeman before writing code: they update the headers of the packages they touch as they write. archiman is the safety net for changes without code (a design file superseded, a path moved, an omission): its check at submit reports them, its refresh fixes the header. The design file is the feature's `*.design.md`; the requirement IDs are its `R-<INFIX>-n`.
