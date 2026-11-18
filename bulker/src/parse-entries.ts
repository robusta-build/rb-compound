import { parseFieldLine, parseHeadLine, parseKey, parseUnknownFieldLine } from './grammar.js'
import { err, ok, type Result } from './result.js'
import { headingLevel, isBlank } from './section.js'
import type { TextLine } from './text.js'
import type { Entry, LabelledLine, ParseError } from './types.js'

interface Draft {
  head: LabelledLine
  fields: LabelledLine[]
  line: number
  start: number
  end: number
}

const questionOf = (head: LabelledLine): string => [head.text, ...head.continuations].join('\n')

const valueOf = (field: LabelledLine): string => [field.text, ...field.continuations].join('\n')

function build(draft: Draft): Entry {
  const pick = (label: string): LabelledLine | undefined =>
    draft.fields.find((field) => field.label === label)
  const resolutionField = pick('Resolution')
  // Legacy: `Note : lgtm` was prefilled by agents and carries no information.
  const noteField = pick('Note')
  const propositionField = pick('Proposition')
  const rationaleField = pick('Rationale')
  const routeField = pick('Route')
  return {
    key: parseKey(draft.head.label),
    head: draft.head.label + draft.head.sep + draft.head.text,
    question: questionOf(draft.head),
    proposition: propositionField ? valueOf(propositionField) : null,
    rationale: rationaleField ? valueOf(rationaleField) : null,
    resolution: resolutionField ? valueOf(resolutionField) : noteField ? '' : null,
    route: routeField ? valueOf(routeField) : null,
    span: { start: draft.start, end: draft.end },
    headLine: draft.head,
    fields: draft.fields,
    line: draft.line
  }
}

/**
 * Reads the entry blocks of one section body.
 *
 * An entry is a head line followed by its field lines, terminated by a blank line,
 * the next head line, or the end of the section. A field value takes the rest of its
 * line plus any following line that is neither blank nor a field line.
 *
 * R-BULKER-24 — these fail the whole document rather than half of it: a `- Word:` line
 * the grammar does not model, a field line before any head line, a duplicate key.
 */
export function parseEntries(lines: TextLine[], path: string): Result<Entry[], ParseError> {
  const entries: Entry[] = []
  let draft: Draft | null = null
  let field: LabelledLine | null = null

  const close = () => {
    if (draft) entries.push(build(draft))
    draft = null
    field = null
  }

  for (const line of lines) {
    if (isBlank(line)) {
      close()
      continue
    }
    // `### Gaps` / `### Open Questions` are tolerated markers, not content.
    if (headingLevel(line.text) >= 3) {
      close()
      continue
    }
    const head = parseHeadLine(line.text)
    if (head) {
      close()
      draft = { head, fields: [], line: line.number, start: line.start, end: line.end }
      continue
    }
    const parsedField = parseFieldLine(line.text)
    if (parsedField) {
      if (!draft) {
        return err({ path, line: line.number, reason: `field line \`${line.text.trim()}\` before any entry head` })
      }
      draft.fields.push(parsedField)
      draft.end = line.end
      field = parsedField
      continue
    }
    const unknown = parseUnknownFieldLine(line.text)
    if (unknown) {
      return err({
        path,
        line: line.number,
        reason: `unrecognised field line \`- ${unknown.label}${unknown.sep}\` inside an entry block`
      })
    }
    // Continuation of the current field, or of the question when no field came yet.
    if (field) {
      field.continuations.push(line.text)
      draft!.end = line.end
      continue
    }
    if (draft) {
      draft.head.continuations.push(line.text)
      draft.end = line.end
      continue
    }
    // Section preamble prose such as the bulk's `Gaps:` / `Open Questions:` markers.
  }
  close()

  const seen = new Map<string, number>()
  for (const entry of entries) {
    if (!entry.key) continue
    const previous = seen.get(entry.key.text)
    if (previous !== undefined) {
      return err({
        path,
        line: entry.line,
        reason: `duplicate key \`${entry.key.text}\`, already used at line ${previous}`
      })
    }
    seen.set(entry.key.text, entry.line)
  }
  return ok(entries)
}
