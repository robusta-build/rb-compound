import { docKindOf } from './doc-kind.js'
import { parseEntries } from './parse-entries.js'
import { err, ok } from './result.js'
import { bodyLines, CANONICAL_HEADING, scanHeadings, sectionSpan } from './section.js'
import type { DocKind, ParseResult, SourceDoc } from './types.js'

const INFIX_HEADER = /^\*\*Infix\s*:\*\*\s*([A-Z]{5,15})\s*$/m

function infixOf(text: string, doc: Pick<SourceDoc, 'section'>): string | null {
  const header = INFIX_HEADER.exec(text)
  if (header) return header[1]!
  // A document may carry no Infix header; its entries' keys then name it.
  for (const entry of doc.section?.entries ?? []) {
    if (entry.key) return entry.key.infix
  }
  return null
}

/**
 * Parses a Compound source document: everything outside `## Open Questions & Gaps`
 * stays opaque bytes, offsets included, so a caller can splice rather than rebuild.
 *
 * R-BULKER-24 — a document either parses whole or fails whole.
 */
export function parseDocument(text: string, path: string, kind?: DocKind): ParseResult<SourceDoc> {
  const resolvedKind = kind ?? docKindOf(path) ?? 'design'
  const { canonical, legacy, lines } = scanHeadings(text)

  if (canonical.length > 1) {
    return err({
      path,
      line: canonical[1]!.number,
      reason: `two \`${CANONICAL_HEADING}\` sections in one file`
    })
  }

  const warnings = legacy.length > 0
    ? [`${path}: legacy heading \`${legacy[0]!.text.trim()}\` is not a section — no entry read from this file`]
    : []

  if (canonical.length === 0) {
    return ok({ path, kind: resolvedKind, infix: infixOf(text, { section: null }), text, section: null, warnings })
  }

  const heading = canonical[0]!
  const span = sectionSpan(lines, heading)
  const parsed = parseEntries(bodyLines(lines, heading, span), path)
  if (!parsed.ok) return parsed

  const section = {
    span,
    headingSpan: { start: heading.start, end: heading.end },
    entries: parsed.value
  }
  return ok({ path, kind: resolvedKind, infix: infixOf(text, { section }), text, section, warnings })
}
