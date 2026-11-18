# Design: bulker — the bulk round trip as a deterministic CLI

**Last update:** 2026-08-08
**Feature:** better-bulkman
**Infix:** BULKER
**Status:** APPROVED (2026-08-08 — validated by the human, four arbitrations folded)
**Sources:** [story](better-bulkman.story.md), [bulk skill](../../skills/bulk/SKILL.md), [open-question skill](../../skills/open-question/SKILL.md), [bulkman agent](../../agents/bulkman.md), [design-pipeline epic](../design-pipeline-epic/design-pipeline.epic.md) for the Infix and BR conventions. No brainstorm, no epic of its own.

Three points are settled by the story and taken as given here: phase two is fully deterministic, keyless entries are logged rather than guessed, and `bulkman` stays an agent.

## Goal

Move the two bulk phases out of an opus subagent into `bulker`, a command that parses the `## Open Questions & Gaps` sections of Compound documents, rebuilds `<epic>.bulk.md` from them, and pushes filled Resolutions back into their source document. The command owns everything mechanical; the agent keeps only path resolution and reading the report. Why this matters is in the story.

## Ubiquitous Language

The vocabulary of the `bulk` and `open-question` skills is used unchanged: source document, bulk, entry, Gap, Open Question, Proposition, Rationale, Resolution, CONFLICT, integrator, garbage collection, Infix. Two terms are introduced here. `.claude` has no `## Ubiquitous Language` section yet, so both are registered when `epicman` bootstraps the glossary under item 6 of the [design-pipeline epic](../design-pipeline-epic/design-pipeline.epic.md) — a dependency of the vocabulary, not a blocker of this feature:

- entry key — the stable identity an entry carries in its own head line, `Gap-<INFIX>-n` or `OQ-<INFIX>-n`. Replaces matching on source path plus verbatim question text.
- preflight — the read-only pass `resolve` runs over every document and entry it would touch, before the first byte is written. It either passes or aborts the whole run.

Phase one and phase two of the story are the `refresh` and `resolve` commands, the names bulkman already uses.

## Business Rules (cited)

None. `.claude` carries no `business-rules.md` registry, and zero is the expected count for a tooling feature under the anti-over-creation guardrail. A rule this work revealed would be storyman's to write anyway, never a design doc's. The registry bootstrap rides on the same item 6 as the glossary.

## Interfaces

### Command surface

```
bulker refresh <target> [--json] [--dry-run]
bulker resolve <target> [--json] [--dry-run]
bulker --help | --version
```

- `<target>` is required and never inferred: an epic folder, an `<epic>.epic.md` or an `<epic>.bulk.md`, relative or absolute, with either path separator. Choosing the target is the judgement the agent keeps; the command that searches for its own target is the command that writes into the wrong epic.
- `refresh` writes exactly one file, `<epic>.bulk.md`, deletion included. It never opens a source document for writing.
- `resolve` writes only the source documents whose entries it integrates, plus the bulk it garbage-collects. Never a registry, never `ROADMAP.md`, never a section it was not sent to.
- `--dry-run` computes the full plan, writes nothing, and returns the exit code the real run would have returned.
- `--json` prints the report as a single JSON object on stdout. Without it, stdout carries the same report as prose. Diagnostics and refusals go to stderr in both modes.

Exit codes are the machine contract; the prose is not parsed:

- 0 — success, a no-op run included
- 1 — usage error: unknown command, missing or unreadable target
- 2 — safety refusal: the target resolves outside the current Claude project
- 3 — preflight failure, `resolve` only: an unparsable document or a keyless entry to apply. Nothing was written
- 4 — I/O failure during the write phase; the report lists the files already replaced

### Entry key grammar

```
entry-head   := "- " (key | legacy) sep text
key          := ("Gap" | "OQ") "-" infix "-" number
legacy       := ("Gap" | "Open Question") " " number
infix        := [A-Z]{5,15}
number       := [1-9] [0-9]*
sep          := ":" | " :"
field-line   := "- " ("Proposition" | "Rationale" | "Resolution" | "Route") sep [text]
```

`sep` admits the French spacing because it is live: `design-pipeline.epic.md` writes `- Open Question 3 :` and `- Proposition :` while the same repo's stories write `- Open Question 1:`. Both forms are preserved verbatim on the way out. Two documents carrying the same Infix is accepted, per the story.

`n` runs in a single sequence shared by both types inside one document: a file numbering `Gap-BULKER-1` then `OQ-BULKER-2` is correct, which is what the live documents already carry and what the epic's 2026-07-18 structuring decision states. The command checks that the key is unique inside its document and reads nothing else of it — it never interprets the sequence, never fills a hole, never renumbers. Renumbering would breach the rule that it edits only what it was sent to edit.

### Document contract — what is legal input

- The section is `## Open Questions & Gaps`, at level two, spelled exactly. It runs to the next level-one or level-two heading, or to EOF. `### Gaps` and `### Open Questions` subheadings are tolerated inside it.
- Legacy headings — `## Open Questions`, `## Gaps / Open Questions`, still present in `features/statusline/` and `features/poste-dev/` — are not sections. Those documents contribute nothing and the report warns once per file. They carry the abandoned `Q1 : … / Note : lgtm` shape, so guessing at them would mean writing into a structure the tool does not model.
- An entry is a head line followed by its field lines, terminated by a blank line, the next head line, or the end of the section. A field value is the rest of its line plus any following continuation line that is neither blank nor a field line.
- `Resolution` absent and `Resolution` present-and-empty are distinct states. A `Note: lgtm` line is legacy noise and reads as an empty Resolution.
- These are parse failures for the whole document, never a partial read: two canonical sections in one file, an unrecognised `- Word:` line inside an entry block, a duplicate key, a field line before any head line.
- Everything outside the section is opaque bytes. Line endings, BOM and the final newline are preserved as found; trailing whitespace is never trimmed, since real Resolutions end with one.

### Writes performed on a source document

Two gestures, nothing else:

- The entry block leaves its section. When the last entry leaves, the `## Open Questions & Gaps` heading and its trailing blank line leave with it.
- One dated decision line is appended to the document's decision section — `## Décisions` for a story, `## Décisions structurantes` for an epic, `## Decisions` for a design doc — created at the end of the file when absent. A `.brainstorm.md` gets the deletion only; its decision belongs downstream.

The line is assembled mechanically: `- YYYY-MM-DD — <decision>. Pourquoi : <rationale>. Réf : <key>.`, where the decision is the Resolution verbatim, or the Proposition verbatim when the Resolution is exactly `lgtm`, and the rationale is the Rationale verbatim. The connector follows the section that receives it: `Pourquoi :` under `Décisions`, `Why:` under `Decisions`. A design doc whose contracts are touched keeps bulkman's existing consequence — `**Status:**` flipped back to DRAFT and `designman update` recommended in the report.

### Preflight, and what it refuses

`resolve` aborts with exit 3 and zero writes when any document it would touch fails to parse, or when an entry to apply has no key. The report names the offending keys or head lines so the human can clean them by hand. A `Route` value is read and copied as is.

The keyless entry is the one case the two phases treat asymmetrically. `refresh` accepts it, matches it by the legacy identity — source path plus verbatim question text — and reports it once so it can be keyed by hand. `resolve` refuses it at preflight. What splits them is the write surface, not the parser: `refresh` never opens a source for writing, so a weaker identity is survivable there, while `resolve` rewrites sources, where a wrong match is the single failure mode that destroys real work.

Three cases are skipped and reported rather than refused, because the next `refresh` re-syncs them: an empty Resolution, a CONFLICT flag, and a bulk question that no longer matches its source byte for byte.

### Report

```ts
type Phase = 'refresh' | 'resolve'
type EntryRef = { key: string | null; head: string; source: string }

interface Report {
  version: 1
  phase: Phase
  target: string                    // absolute, after resolution
  exitCode: 0 | 1 | 2 | 3 | 4
  bulk: { path: string; action: 'written' | 'unchanged' | 'deleted' | 'none' }
  applied: EntryRef[]               // resolve only
  pending: EntryRef[]
  skipped: (EntryRef & { reason: 'empty-resolution' | 'conflict' | 'drift' })[]
  refused: (EntryRef & { reason: 'no-key' })[]   // resolve only
  unparsable: { path: string; line: number; reason: string }[]
  warnings: string[]
  followUps: string[]               // e.g. "designman update roadmap-skill"
}
```

### Core API — the module boundary the tests drive

Signatures only; the round trip is exercised through these, not through the process, so the date and the filesystem stay injectable.

```ts
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }

interface Entry {
  key: EntryKey | null
  head: string                      // verbatim head line
  question: string                  // verbatim
  proposition: string | null
  rationale: string | null
  resolution: string | null         // null = field absent, '' = present and empty
  route: string | null
  span: { start: number; end: number }   // offsets of the entry block in the source text
}

interface SourceDoc {
  path: string
  kind: 'epic' | 'story' | 'brainstorm' | 'design'
  infix: string | null
  text: string
  section: { span: { start: number; end: number }; entries: Entry[] } | null
}

declare function parseDocument(text: string, path: string): Result<SourceDoc, ParseError>
declare function parseBulk(text: string, path: string): Result<Bulk, ParseError>
declare function renderBulk(bulk: Bulk): string
declare function planRefresh(sources: SourceDoc[], existing: Bulk | null): Result<FileEdit[], ParseError[]>
declare function planResolve(bulk: Bulk, sources: SourceDoc[], today: string): Result<FileEdit[], PreflightFailure>
declare function resolveTarget(input: string, cwd: string): Result<Target, Refusal>
declare function applyEdits(edits: FileEdit[]): Promise<Result<void, IoFailure>>
```

### What stays on the LLM side

`agents/bulkman.md` survives and shrinks to three gestures: resolve the epic path, run the command, read the report back and relay its follow-ups. The verbatim discipline, the merge rules and the garbage collection leave the prompt entirely; the skills keep them as the contract the command implements. If the wrapper ever flipped to a caller-loaded skill, only it would move to `skills/bulkman/SKILL.md`: nothing in the CLI, the grammar or the document contract depends on which side calls it.

## Technical Constraints

- Node and module system: `@masala/parser` 2.0.0 ships `"type": "module"` with no `exports` map, `dist/masala-parser.js` as main and root types `masala-parser.d.ts`, and zero runtime dependencies. `bulker` is authored and published as ESM. `require()` of the parser happens to succeed on Node 22.18 through Node's require(esm), which is not a portable guarantee and must not become a build assumption.
- API facts verified by installing the package and running it, not from memory: the exported bundles are `F`, `C`, `N`, `Stream`, `GenLex`, `TracingGenLex`, plus `Parser`, `tuple`, `createTracer`, `leanToken`, `leanTuple`. The v1 entry point `Streams.ofString` does not exist in 2.0.0 — it is `Stream.ofChars(text)`. `IParser.parse(stream)` returns a `Response<T>` exposing `isAccepted()`, `value`, `offset`, `location()`, `map`, `fold`. `F` carries `regex`, `moveUntil`, `dropTo`, `not`, `try`, `tryAll`, `eos`, `satisfy`, `layer`, `subStream`.
- `parser.val(text)` returns `undefined` on rejection, which is indistinguishable from a legitimately absent field. It is a test convenience; production paths go through `parse` and check `isAccepted()`.
- Registry facts: the unscoped `masala-parser` returns 404 — only `@masala/parser` exists. The bare name `bulker` is already published by someone else at 0.1.2, so the package is published as `@robusta/bulker`, with `"bin": { "bulker": ... }` keeping the invocation `bulker`; the story's fallback, `npm install -g <local path>`, stays available for anyone who does not want a registry account in the loop. `@masala/parser` is LGPL-3.0: consuming it as an unmodified dependency leaves `bulker`'s own licensing free; vendoring or patching its `src/lib` would not.
- Context7 could not be consulted — its MCP tools are not exposed to this agent — so every claim above was checked against `@masala/parser@2.0.0` installed from the registry and executed under Node 22.18.0.
- Text handling: UTF-8 in, UTF-8 out. Line endings are preserved per file rather than normalised, which is what makes a CRLF story survive a resolve on Windows 11 with a one-entry diff. A BOM is preserved if present.
- Determinism: no locale, no wall clock, no filesystem ordering in the output. Directory scans are sorted before use, document order in the bulk is epic first then stories by lexicographic path, entry order follows the source. The date is a parameter of the core; the CLI passes the system date as `YYYY-MM-DD`.
- Atomicity: the complete edit set is computed in memory before the first write; each file is written to a temporary file in its own directory and renamed over the target, which is atomic on APFS and NTFS for a same-directory rename. A file whose bytes are unchanged is not rewritten, so a no-op refresh leaves mtimes alone.
- Project boundary: the root is the nearest ancestor of the working directory holding a `CLAUDE.md` or a `.claude/` directory; no root means refusal. Both the root and the target are compared after symlink resolution, case-insensitively and with normalised drive letters on win32. The check runs before any read.
- Global install: `@robusta/bulker` declares `"bin": { "bulker": "dist/cli.js" }` with an LF shebang, so the npm-generated `bulker.cmd` and `bulker.ps1` shims work on Windows 11. Build is Vite in library mode to a single ESM bundle; tests are Vitest.
- Windows 11 cannot be validated from a macOS run — story Dep 2 stands.

## Requirements

- R-BULKER-01: `bulker` exposes two writing commands, `refresh` and `resolve`, each taking one required target path, and never searches for a target itself.
- R-BULKER-02: the target accepts relative or absolute paths, with either separator, and denotes an epic folder, an `.epic.md` or a `.bulk.md`.
- R-BULKER-03: a target whose real path falls outside the current Claude project is refused before any file is read, exit code 2.
- R-BULKER-04: the exit codes are the machine contract — 0 success, 1 usage, 2 refusal, 3 preflight failure, 4 write failure.
- R-BULKER-05: `--json` emits the `Report` object on stdout; without it the same report is prose; diagnostics go to stderr.
- R-BULKER-06: `--dry-run` produces the full plan and the real run's exit code while writing nothing.
- R-BULKER-21: an entry carries its identity in its head line as `Gap-<INFIX>-n` or `OQ-<INFIX>-n`, and the round trip is a lookup on that key; `n` runs in one sequence shared by both types inside a document, and the command checks its uniqueness without ever interpreting or renumbering it.
- R-BULKER-22: the parser accepts both `Label:` and `Label :`, and reproduces whichever form the source used.
- R-BULKER-23: only `## Open Questions & Gaps` is a section; a legacy heading yields no entries and one warning per file.
- R-BULKER-24: two canonical sections in a file, an unrecognised field line inside an entry, a duplicate key or a field line outside any entry fail the whole document, never half of it.
- R-BULKER-25: bytes outside the section are untouched — line endings, BOM, final newline and trailing whitespace included.
- R-BULKER-41: `refresh` writes only `<epic>.bulk.md`, and deletes it when no entry remains.
- R-BULKER-42: questions, propositions and rationales are copied byte for byte from the source; Resolutions already filled in the bulk are preserved; both sides changed yields CONFLICT, never a silent merge.
- R-BULKER-43: `refresh` is idempotent — a second run on unchanged sources yields byte-identical output and does not rewrite the file.
- R-BULKER-44: a document that fails to parse is reported and skipped by `refresh`, which continues with the others.
- R-BULKER-45: `refresh` accepts a keyless entry, matches it by source path plus verbatim question text, and reports it once so it can be keyed by hand — the refusal is `resolve`'s alone.
- R-BULKER-61: `resolve` runs a preflight over everything it would touch and aborts with exit 3 before any write when a document fails to parse, or when an entry to apply carries no key, naming the offenders in the report.
- R-BULKER-62: `resolve` applies two gestures per entry and no others — the entry block leaves the section, the section heading leaving with the last entry, and one dated decision line is appended to the document's decision section.
- R-BULKER-63: the decision text is the Resolution verbatim, or the Proposition verbatim when the Resolution is exactly `lgtm`; the rationale is the Rationale verbatim; the line ends with the entry key.
- R-BULKER-64: a `.brainstorm.md` receives the deletion only, never a decision line.
- R-BULKER-65: an empty Resolution, a CONFLICT flag or a question that drifted from its source is skipped and reported, not a preflight failure.
- R-BULKER-66: no partial write — the edit set is computed before the first write and each file is replaced atomically.
- R-BULKER-67: `resolve` writes no registry, no roadmap and no document outside the sources it integrates and the bulk; recording a Business Rule stays with `epicman`.
- R-BULKER-81: `code/bulker` is a TypeScript ESM project built with Vite and tested with Vitest, its only runtime dependency `@masala/parser` 2.0.0.
- R-BULKER-82: the package is published as `@robusta/bulker` and exposes the binary `bulker` on macOS and Windows 11, whether installed from the registry or from a local path.
- R-BULKER-83: the Vitest suite replays both phases on copies of real Compound documents, the French-spaced epic and this feature's own story included.
- R-BULKER-84: `agents/bulkman.md` keeps only path resolution, the call and the read-back of the report.

## Acceptance Criteria

Cast: Nadia, the maintainer arbitrating on macOS; Wendel, the same maintainer on Windows 11; Basile, the bulkman agent that resolves the path and shells out; Oksana, an authoring agent writing entries.

- AC-BULKER-01: Given Nadia on an epic whose sources have not changed since the last run, when she runs `bulker refresh` twice, then the second run reports the bulk unchanged and leaves its bytes and its mtime alone.
- AC-BULKER-02: Given Basile passing a target that resolves outside the current Claude project, when `bulker refresh --json` starts, then it exits 2 before reading any file and the report names the refusal.
- AC-BULKER-03: Given one source document carrying an unrecognised field line inside an entry, when Nadia runs `refresh`, then that document is reported unparsable, the other documents are aggregated normally, and no source has been modified.
- AC-BULKER-04: Given an epic written with the French spacing `- Open Question 3 :`, when `refresh` runs, then the question, proposition and rationale appear in the bulk byte for byte, spacing included.
- AC-BULKER-05: Given a bulk where Nadia filled one Resolution and left two empty, when she runs `bulker resolve`, then the filled entry leaves its source with a dated decision appended, and the two pending entries stay in both the bulk and their sources.
- AC-BULKER-06: Given a bulk entry carrying a `Route` line with a filled Resolution, when `resolve` runs, then the Resolution is copied like any other, the exit code is 0, and the `Route` line stays as it is.
- AC-BULKER-07: Given a `resolve` run where one source document fails to parse, when the preflight completes, then no file has been touched, the documents that parse cleanly included.
- AC-BULKER-08: Given the last pending entry of an epic is resolved, when `resolve` finishes, then the now-empty `## Open Questions & Gaps` heading is gone from its source and the bulk file is deleted.
- AC-BULKER-09: Given Wendel on Windows 11 with a CRLF story passed as a relative path with backslashes, when `resolve` applies one entry, then the diff holds the entry block and the decision line only, and every line still ends with CRLF.
- AC-BULKER-10: Given Oksana wrote an entry with no key and Nadia filled its Resolution, when `resolve` reaches its preflight, then the run aborts naming that entry rather than guessing which source it belongs to.
- AC-BULKER-11: Given the same keyless entry still pending, when Nadia runs `refresh`, then it reaches the bulk matched on its source path and question text, and the report names it once so she can key it before resolving.

## Dependencies

- Depends on: story Dep 1 — the key must exist in `skills/open-question/SKILL.md` and be emitted by storyman, designman, bsman and epicman before phase one can rely on it. Story Dep 2 — Windows 11 validation needs a Windows machine in the loop. Plus `@masala/parser` 2.0.0 from npm and the `@robusta` npm scope for publication.
- Depends on, without blocking: item 6 of the design-pipeline epic's À faire, which registers `entry key` and `preflight` in the `.claude` glossary when `epicman` bootstraps it. Implementation does not wait on it.
- Blocks: nothing else in flight.
