import { renderLine } from './grammar.js'
import { applySplices, detectEol, splitLines, type Splice, type TextLine } from './text.js'
import type { Entry, LabelledLine, SourceDoc } from './types.js'

/** One source entry receiving the bulk's Resolution field verbatim. */
export interface ResolutionCopy {
  /** The source entry, by identity within `doc.section.entries`. */
  entry: Entry
  resolution: LabelledLine
}

/** The only edit `resolve` makes on a source document: Resolution copies. */
export interface DocumentEdit {
  copies: ResolutionCopy[]
}

const RESOLUTION = 'Resolution'

/** Groups the entry's lines by field, head first, as the parser consumed them. */
function fieldLines(lines: TextLine[], entry: Entry): { field: LabelledLine; lines: TextLine[] }[] {
  const own = lines.filter((line) => line.start >= entry.span.start && line.start < entry.span.end)
  let cursor = 1 + entry.headLine.continuations.length
  return entry.fields.map((field) => {
    const taken = own.slice(cursor, cursor + 1 + field.continuations.length)
    cursor += taken.length
    return { field, lines: taken }
  })
}

function copySplice(lines: TextLine[], fallbackEol: string, copy: ResolutionCopy): Splice {
  const target = fieldLines(lines, copy.entry).find(({ field }) => field.label === RESOLUTION)
  if (target) {
    const first = target.lines[0]!
    const last = target.lines[target.lines.length - 1]!
    const eol = first.eol || fallbackEol
    const replacement = renderLine({ ...copy.resolution, label: RESOLUTION, sep: target.field.sep }, eol)
    return { start: first.start, end: last.start + last.text.length, replacement }
  }
  const lastLine = lines.filter((line) => line.start < copy.entry.span.end).pop()!
  const eol = lastLine.eol || fallbackEol
  const rendered = renderLine({ ...copy.resolution, label: RESOLUTION }, eol)
  return lastLine.eol === ''
    ? { start: lastLine.end, end: lastLine.end, replacement: `${eol}${rendered}` }
    : { start: lastLine.end, end: lastLine.end, replacement: `${rendered}${eol}` }
}

/** The document text with each copy's Resolution written into its entry, every other byte kept. */
export function editDocument(doc: SourceDoc, edit: DocumentEdit): string {
  if (edit.copies.length === 0) return doc.text
  const lines = splitLines(doc.text)
  const eol = detectEol(doc.text)
  return applySplices(doc.text, edit.copies.map((copy) => copySplice(lines, eol, copy)))
}
