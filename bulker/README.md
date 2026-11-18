# bulker

**Last updated:** 2026-11-17

`bulker` runs the Compound bulk round trip as a deterministic command: it gathers the `## Open Questions & Gaps` entries of an epic's documents into a single `<epic>.bulk.md`, and pushes the Resolutions a human filled there back into the documents they came from.

## In rb-compound

`bulker` ships inside the plugin, built into `skills/bulkman-method/scripts/`: `bulker.mjs`, and `masala-parser/masala-parser.mjs` beside it. The agent `rb-compound:bulkman` runs it with `node`, from its place in the skill. Nothing is installed, and a `bulker` on the PATH is never the one run. Below, `bulker` stands for `node <plugin root>/skills/bulkman-method/scripts/bulker.mjs`.

Requirements: Node 20.11 or later, on macOS, Linux or Windows 11 (caveat below).

This folder holds the sources and the tests. Nothing reads it at run time.

## Build

From this folder:

```
npm ci
npm test
npm run build
```

`npm run build` empties `../skills/bulkman-method/scripts/` and writes its three files: `bulker.mjs`, `masala-parser/masala-parser.mjs` and `masala-parser/LICENSE`. The output is unminified, without source map, and deterministic: commit it with the source change that produced it. The plugin sweep rebuilds it and fails on a committed script that differs.

`@masala/parser` 2.0.0 is bundled from its ES sources, not from its minified `dist/`. Its `LICENSE` file, copied byte for byte, is the LGPL 2.1 text, while its `package.json` declares `LGPL-3.0`.

## Commands

- `bulker <target> [--json] [--dry-run]` gathers the `## Open Questions & Gaps` entries of the epic's documents into `<epic>.bulk.md`. It reads every document of the epic and writes exactly one file, the bulk.
- `bulker resolve <target> [--json] [--dry-run]` copies each filled Resolution of the bulk into the empty `Resolution:` line of its source entry, then rebuilds the bulk from the sources as the copy left them, in the same run. A question asked in a source since the last gathering enters the bulk without a separate run.
- `bulker --help` and `bulker --version` print and exit 0.

The round trip is `bulker <target>`, then arbitrate by hand in the bulk, then `bulker resolve <target>`. Gather again whenever the sources moved before you answer. A `resolve` with no bulk on disk copies nothing, gathers the bulk from the sources and says so.

Gathering and `resolve` share one removal rule: an entry leaves the bulk when its question is gone from its source, or when its source entry carries a filled Resolution, equal to the bulk's or not. A bulk left with no entry is deleted. After a successful `resolve`, the bulk lists only entries with an empty Resolution.

`resolve` computes the copy and the rebuild before writing anything, then writes the sources, then the bulk. A second `resolve` on unchanged sources writes no source. Each written source gets one follow-up line naming its integrator: `storyman update <feature>`, `storyman update <feature> avec brainstorm`, `designman update <feature>` or `epicman update <epic>`.

### The target

`<target>` is required and never inferred: choosing the epic is left to the caller, a human or the `bulkman` agent.

It accepts an epic folder (`features/watcher-mvp-epic`), an `<epic>.epic.md`, or an `<epic>.bulk.md`. Relative or absolute, with either path separator, so `features\watcher-mvp-epic` also works on macOS.

The folder is then scanned recursively for `*.epic.md`, `*.story.md`, `*.brainstorm.md`, `*.design.md` and legacy `*.prd.md`. `__done/`, `_done/`, `__future/`, `__chore/`, `node_modules/`, `dist/` and dotted entries are skipped, at any depth. A folder holding no `.epic.md` is a feature standing alone, and the folder name names its bulk.

A document whose doubts sit under a legacy heading, `## Open Questions` or `## Gaps / Open Questions`, yields no entry and is reported as a warning.

The project boundary is the nearest ancestor of your working directory carrying a `CLAUDE.md` or a `.claude/` directory. A target resolving outside it, symlinks followed, is refused before a single file is read.

### Entries

An entry of a `## Open Questions & Gaps` section is a head line followed by field lines, each `- <label>: <text>` or `- <label> : <text>`, continuation lines included.

- Head: a key, `Gap-<INFIX>-n` or `OQ-<INFIX>-n`, or a legacy `Gap n` or `Open Question n`.
- Fields: `Proposition`, `Rationale`, `Rloq`, `Route`, `Resolution`, and a legacy `Note`, read as an empty Resolution and never rendered. `Rloq` and `Route` values are copied unchecked.

Any other `- <Word>:` line inside an entry makes its document unparsable. The bulk renders the fields in the order Proposition, Rationale, Rloq, Route, Resolution.

### Flags

- `--json` prints the report as one JSON object on stdout instead of prose. The prose form is meant for humans and is not parseable; the JSON form carries `version: 2` and is the one to script against.
- `--dry-run` computes the whole run and writes nothing. The report is the one the real run would have produced, so `bulk: written` reads as "would have been written".

## Exit codes

The exit code is the machine contract; the text is not.

- 0 — success, a no-op run included.
- 1 — usage error: unknown command or option, missing target, a target that does not exist or is not an epic folder, an `.epic.md` or a `.bulk.md`. Also a gathering that declines to rebuild over a bulk it cannot parse, which would discard the Resolutions filled in it.
- 2 — safety refusal: the target resolves outside the current Claude project.
- 3 — preflight failure, `resolve` only. Nothing was written, the bulk included.
- 4 — I/O failure during the write phase. The report names the file that failed and lists the files already replaced.

An entry to apply has a filled Resolution in the bulk and an empty one in its source. `resolve` aborts the whole run when a document of the epic fails to parse, or when an entry to apply has no key or asks a question that differs from its source (`drift`). The report names the offending entries, each with its reason, `no-key` or `drift`, and a label; the fix is by hand. Gathering is more forgiving: an unparsable document is skipped and reported, and the run ends at 0.

## What you can rely on

The source documents are the truth and the bulk is disposable: a run that would risk real work does nothing at all.

- Gathering is idempotent. Run twice on unchanged sources, the second run writes nothing: the bulk keeps its `Last update` stamp and its mtime.
- Gathering writes exactly one file, the bulk, deletion included. It never opens a source document for writing.
- `resolve` opens on a read-only preflight over everything the run would touch. A failing preflight aborts with exit 3 and zero writes: no source half-written, no bulk touched.
- Past the preflight, every edit is computed in memory before the first byte is written. Each file is then written to a temporary sibling and renamed over its target, which is atomic for a same-directory rename on APFS and NTFS.
- `resolve` makes one edit per applied entry in a source document, brainstorms included: the entry's empty `Resolution:` line receives the bulk Resolution verbatim, continuation lines included, `lgtm` as `lgtm`. An entry with no `Resolution:` line receives one as its last field line. Everything else in the file stays untouched bytes, offsets included.
- The question and the Proposition, Rationale, Rloq and Route lines reach the bulk byte for byte, with their current source value at each gathering and each `resolve` rebuild. A Resolution filled in the bulk survives a gathering while its source Resolution is empty.
- The source wins: a source Resolution already filled is never overwritten. When the bulk carried a different answer, the run that drops the entry names it once in `skipped`, reason `answered-in-source`.
- Line endings are preserved per file, CRLF included, and a BOM survives. UTF-8 in, UTF-8 out.
- The output is deterministic: directory scans are sorted, document order is the epic first then the sources by path, entry order follows the source. No locale, no filesystem ordering, no wall clock — the CLI passes the date in.
- A keyless entry: gathering carries it to the bulk on the legacy identity, source path plus verbatim question text, and names it once in the report so it can be keyed; `resolve` refuses it. `bulker` never writes a key into a source document.

## Windows 11

- The Windows path rules are unit-tested: the path flavour, case-insensitive comparison, the `\\?\` extended-length prefix and CRLF handling are injected rather than read from `process.platform`, so a macOS run exercises the win32 behaviour on every suite.
- Nothing here has run on an actual Windows 11 machine (Dep 2 of the `better-bulkman` story). The Windows invocation is expected to work, not verified.

## Development

- `npm test` — Vitest: unit tests, plus suites replaying both phases on verbatim copies of real Compound documents (`test/fixtures/corpus/`).
- `npm run test:watch`
- `npm run typecheck`
- `npm run build` — see Build.

`src/index.ts` exports the grammar, the parsers, the two planners and the pipeline; the tests drive the round trip through it. The build ships the command only, from `src/bin.ts`.
