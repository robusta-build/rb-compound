import { splitLines, type TextLine } from './text.js'
import type { Span } from './types.js'

export const CANONICAL_HEADING = '## Open Questions & Gaps'

/**
 * Level-two headings that used to hold doubts and no longer count as a section.
 * They carry the abandoned `Q1 : … / Note : lgtm` shape, so reading them would mean
 * writing into a structure the tool does not model — R-BULKER-23.
 */
const LEGACY_HEADINGS = [
  'open questions',
  'gaps',
  'gaps / open questions',
  'open questions / gaps',
  'questions ouvertes'
]

export interface HeadingScan {
  canonical: TextLine[]
  legacy: TextLine[]
  lines: TextLine[]
}

/** The number of `#` of a Markdown heading line, 0 when the line is no heading. */
export function headingLevel(text: string): number {
  const match = /^(#{1,6}) /.exec(text)
  return match ? match[1]!.length : 0
}

/** The canonical and legacy level-two doubt headings of a text, with all its lines. */
export function scanHeadings(text: string): HeadingScan {
  const lines = splitLines(text)
  const canonical: TextLine[] = []
  const legacy: TextLine[] = []
  for (const line of lines) {
    if (headingLevel(line.text) !== 2) continue
    const label = line.text.slice(3).trim()
    if (label === CANONICAL_HEADING.slice(3)) canonical.push(line)
    else if (LEGACY_HEADINGS.includes(label.toLowerCase())) legacy.push(line)
  }
  return { canonical, legacy, lines }
}

/**
 * A section runs from its heading to the next level-one or level-two heading, or to EOF.
 * `### Gaps` / `### Open Questions` subheadings stay inside it.
 */
export function sectionSpan(lines: TextLine[], heading: TextLine): Span {
  for (let i = heading.number; i < lines.length; i++) {
    const level = headingLevel(lines[i]!.text)
    if (level === 1 || level === 2) return { start: heading.start, end: lines[i]!.start }
  }
  return { start: heading.start, end: lines[lines.length - 1]!.end }
}

/** The lines strictly inside a span, heading excluded. */
export function bodyLines(lines: TextLine[], heading: TextLine, span: Span): TextLine[] {
  return lines.filter((line) => line.start >= heading.end && line.end <= span.end && line.start < span.end)
}

/** Blank, or an empty bullet an editor's list continuation leaves where a blank line was meant. */
export const isBlank = (line: TextLine): boolean => /^\s*-?\s*$/.test(line.text)
