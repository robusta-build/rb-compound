# Bulk — one-pass arbitration at epic level

The bulk is a productivity tool, not a source of truth. Truth lives in the compound documents (story, brainstorm, design, epic); `<epic>.bulk.md` only mirrors their pending Gaps and Open Questions so a human can arbitrate a whole epic in one pass — then it disappears.

## Responsibilities

- The `bulker` command reads the compound documents and writes the bulk. Sole writer of `<epic>.bulk.md`, deletion included. Gathering (`bulker <target>`) never modifies a source document; `bulker resolve` copies each filled Resolution into the empty `Resolution:` line of its source entry, one edit per entry, then rebuilds the bulk in the same run. The `rb-compound:bulkman` agent only resolves the target, runs it and reads the report back.
- Integrators fold the filled Resolutions of their own file and modify that file only: storyman for stories and brainstorms, designman for design docs, epicman for epic-level entries. The bulk is never an integration input; they never write it.
- Nobody creates truth in the bulk: an entry is born in a compound document and is resolved there.

## Authority rule

- The source document owns the question and the answer; the bulk carries the Resolution until `resolve` copies it.
- `Resolution:` is born empty in the bulk too — nothing is ever prefilled. An entry signed `lgtm (<agent>)` or `lgtm (<agent> <mode>)[ : <option>]` in its source never enters the bulk. The human fills what they can during the arbitration pass; `lgtm` accepts the Proposition as-is. Partial arbitration is the normal mode: entries left empty stay pending, they never block the integration of the filled ones.
- On refresh, questions are rewritten from the sources and Resolutions already filled in the bulk are preserved. A Resolution already filled in the source wins: the entry leaves the bulk, and the report names it once when the bulk carried a different answer.

## Entry identity

An entry is identified by its key — `Gap-<INFIX>-n` or `OQ-<INFIX>-n`, carried in its own head line. An entry written before the key existed falls back to source path plus verbatim question text: enough for gathering, which never writes a source, while `resolve` refuses a keyless entry rather than risk a wrong match. Each doc section of the bulk carries the relative path of its source document. Questions, propositions and rationales are copied exactly: reformulating breaks identity.

## Format

```markdown
# Epic <INFIX>

**Last update:** YYYY-MM-DD
**Epic:** <epic-slug>

<Synthesis, 3-5 lines, pending arbitrations only: n blocking gaps, n open questions, which stories are blocked. Never a second epic summary — bulk = worklist, epic = memory.>

### Epic OQ (<epic>.epic.md)

<The epic file's own open entries, if any. Integrator: epicman.>

## Story <INFIX>

<One line: what the story does.>

### Story OQ (relative/path/to/story.md)

Gaps:

- Gap-<INFIX>-1: <verbatim from the source>
- Proposition: <verbatim>
- Rationale: <verbatim>
- Rloq: <verbatim, when the source carries it>
- Resolution:

Open Questions:

- OQ-<INFIX>-2: <verbatim>
- Proposition: <verbatim>
- Rationale: <verbatim>
- Rloq: <verbatim, when the source carries it>
- Resolution:

### Brainstorm OQ (relative/path/to/brainstorm.md)

### Design OQ (relative/path/to/design.md)

## Story <INFIX>

<same structure for each story>
```

Omit empty subsections and story sections with no entries. Inside each document section, keep the open-question skill order: all Gaps first, then the Open Questions.

## Integration rules

- `bulker resolve` copies verbatim (`lgtm` stays `lgtm`), every document kind alike: question, Proposition and Rationale stay in the source, no decision line is written.
- Apply an entry only if its Resolution is filled in the bulk, its source Resolution is empty, AND the bulk question still matches the source verbatim. A question that drifted in its source refuses the whole resolve, nothing written: gather again with `rb-compound:bulkman <epic>`, then re-read the question.
- Entries with an empty Resolution are skipped: they stay pending in the bulk and in their source. A half-arbitrated bulk is a normal state.
- Integration follows the normal lifecycle, launched by the human: the owner (`rb-compound:storyman update`, `rb-compound:designman update`, `rb-compound:epicman update`) folds each filled Resolution of its own document into the body and deletes the entry. The report of `bulker resolve` names the integrator to run per written document.
- Brainstorm entries integrate downstream: the brainstorm is a disposable one-shot, its truth returns to the story's Decisions (`## Décisions` / `## Decisions`, either series, `${CLAUDE_SKILL_DIR}/../compound-routine/references/headers.md`) by default — or the epic's structuring decisions when the outcome constrains the epic beyond one story — never back into the .brainstorm.md. `bulker resolve` copies the Resolution into the brainstorm like any source; storyman folds it only when asked (`rb-compound:storyman update <feature> with brainstorm`, or `avec brainstorm`, same meaning).

## Lifecycle

Ephemeral. Created on demand by `rb-compound:bulkman <epic>`, rebuilt on every gathering and every resolve: an entry leaves the bulk when its question is gone from its source or its source carries a filled Resolution, and the bulk is deleted when empty. Pending entries (Resolution empty in the source) survive as many runs as needed. Right after a resolve, the bulk lists only entries with an empty Resolution. A stale bulk is the worst state: when in doubt, run `rb-compound:bulkman <epic>` before answering.
