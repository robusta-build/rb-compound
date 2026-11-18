import { docKindFromBulkHeading } from './doc-kind.js'
import { parseEntries } from './parse-entries.js'
import { err, ok } from './result.js'
import { headingLevel } from './section.js'
import { splitLines } from './text.js'
import type { Bulk, BulkDocSection, ParseResult } from './types.js'

const DOC_HEADING = /^### ([A-Za-z]+) OQ \((.+)\)\s*$/
const EPIC_INFIX = /^# Epic ([A-Z]{5,15})\s*$/m
const LAST_UPDATE = /^\*\*Last update:\*\*\s*(\S*)\s*$/m
const EPIC_SLUG = /^\*\*Epic:\*\*\s*(\S*)\s*$/m
const GROUP_HEADING = /^## Story ([A-Z]{5,15})\s*$/

/**
 * Reads `<epic>.bulk.md` back. Only the `### <Kind> OQ (<path>)` subsections carry entries;
 * the `## Story <INFIX>` group headings are navigation and hold nothing.
 */
export function parseBulk(text: string, path: string): ParseResult<Bulk> {
  const lines = splitLines(text)
  const docs: BulkDocSection[] = []
  let groupInfix: string | null = null
  let open: { doc: BulkDocSection; first: number } | null = null

  const close = (upto: number): ParseResult<null> => {
    if (!open) return ok(null)
    const parsed = parseEntries(lines.slice(open.first, upto), path)
    if (!parsed.ok) return parsed
    open.doc.entries = parsed.value
    docs.push(open.doc)
    open = null
    return ok(null)
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const docHeading = DOC_HEADING.exec(line.text)
    if (docHeading) {
      const closed = close(i)
      if (!closed.ok) return closed
      const kind = docKindFromBulkHeading(docHeading[1]!)
      if (!kind) {
        return err({ path, line: line.number, reason: `unknown bulk subsection \`${docHeading[1]!} OQ\`` })
      }
      open = { doc: { sourcePath: docHeading[2]!, kind, infix: groupInfix, entries: [] }, first: i + 1 }
      continue
    }
    const group = GROUP_HEADING.exec(line.text)
    if (group) {
      const closed = close(i)
      if (!closed.ok) return closed
      groupInfix = group[1]!
      continue
    }
    const level = headingLevel(line.text)
    if (level >= 1 && level <= 3) {
      const closed = close(i)
      if (!closed.ok) return closed
    }
  }
  const closed = close(lines.length)
  if (!closed.ok) return closed

  return ok({
    path,
    text,
    epicInfix: EPIC_INFIX.exec(text)?.[1] ?? null,
    epicSlug: EPIC_SLUG.exec(text)?.[1] ?? null,
    lastUpdate: LAST_UPDATE.exec(text)?.[1] ?? null,
    docs
  })
}

