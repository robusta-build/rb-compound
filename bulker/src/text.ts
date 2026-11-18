export const BOM = '﻿'

export interface TextLine {
  /** Line content without its line ending. */
  text: string
  /** The line ending exactly as found — '\r\n', '\n', or '' at EOF. */
  eol: string
  /** Offset of the first character of the line in the whole text. */
  start: number
  /** Offset just past the line ending. */
  end: number
  /** 1-based line number. */
  number: number
}

/**
 * Splits text into lines while keeping every offset and line ending intact,
 * so a caller can splice the original string instead of rebuilding it.
 * R-BULKER-25 rests on this: nothing is normalised, nothing is trimmed.
 */
export function splitLines(text: string): TextLine[] {
  const lines: TextLine[] = []
  let start = 0
  let number = 1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch !== '\n' && ch !== '\r') continue
    const eol = ch === '\r' && text[i + 1] === '\n' ? '\r\n' : ch
    lines.push({ text: text.slice(start, i), eol, start, end: i + eol.length, number })
    i += eol.length - 1
    start = i + 1
    number++
  }
  if (start < text.length || text.length === 0) {
    lines.push({ text: text.slice(start), eol: '', start, end: text.length, number })
  }
  return lines
}

/** The dominant line ending of a text, used only for content this tool adds itself. */
export function detectEol(text: string): string {
  let crlf = 0
  let lf = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== '\n') continue
    if (i > 0 && text[i - 1] === '\r') crlf++
    else lf++
  }
  if (crlf === 0 && lf === 0) return '\n'
  return crlf > lf ? '\r\n' : '\n'
}

export function hasBom(text: string): boolean {
  return text.startsWith(BOM)
}

/** True when the text ends with a line ending, i.e. carries a final newline. */
export function hasFinalNewline(text: string): boolean {
  return text.length > 0 && (text.endsWith('\n') || text.endsWith('\r'))
}

export interface Splice {
  start: number
  end: number
  replacement: string
}

/**
 * Applies splices to a text right-to-left so earlier offsets stay valid.
 * Overlapping splices are a programming error and throw rather than corrupt a document.
 */
export function applySplices(text: string, splices: Splice[]): string {
  const sorted = [...splices].sort((a, b) => a.start - b.start || a.end - b.end)
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1]!
    const current = sorted[i]!
    if (current.start < previous.end) {
      throw new Error(`overlapping splices at ${previous.start}-${previous.end} and ${current.start}-${current.end}`)
    }
  }
  let out = text
  for (let i = sorted.length - 1; i >= 0; i--) {
    const { start, end, replacement } = sorted[i]!
    out = out.slice(0, start) + replacement + out.slice(end)
  }
  return out
}
