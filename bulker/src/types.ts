import type { Result } from './result.js'

export type DocKind = 'epic' | 'story' | 'brainstorm' | 'design'
export type EntryType = 'gap' | 'oq'
export type Phase = 'refresh' | 'resolve'

/** R-BULKER-21: the identity an entry carries in its own head line. */
export interface EntryKey {
  type: EntryType
  infix: string
  number: number
  /** `Gap-BULKER-1` — the key exactly as written in the source. */
  text: string
}

/**
 * A head or field line, split so it can be rendered back byte for byte.
 * R-BULKER-22: `sep` holds `:` or ` :` as the source wrote it.
 */
export interface LabelledLine {
  label: string
  sep: string
  /** Rest of the line after the separator, verbatim — leading and trailing spaces kept. */
  text: string
  /** Continuation lines, verbatim and without their line endings. */
  continuations: string[]
}

export type FieldLabel = 'Proposition' | 'Rationale' | 'Resolution' | 'Route' | 'Rloq'

export interface Span {
  start: number
  end: number
}

export interface Entry {
  key: EntryKey | null
  /** Verbatim head line, without its line ending. */
  head: string
  /** Verbatim question: head text plus its continuation lines. */
  question: string
  proposition: string | null
  rationale: string | null
  /** null = field absent, '' = present and empty. */
  resolution: string | null
  route: string | null
  span: Span
  /** Head line split for byte-exact rendering. */
  headLine: LabelledLine
  /** Field lines in source order, for byte-exact rendering. */
  fields: LabelledLine[]
  /** Line number of the head line, 1-based, for diagnostics. */
  line: number
}

export interface DocSection {
  span: Span
  /** Span of the heading line alone. */
  headingSpan: Span
  entries: Entry[]
}

export interface SourceDoc {
  path: string
  kind: DocKind
  infix: string | null
  text: string
  section: DocSection | null
  /** R-BULKER-23: one line per legacy heading found, at most one per file. */
  warnings: string[]
}

export interface BulkDocSection {
  /** Relative path of the source document, as written in the `### … OQ (path)` heading. */
  sourcePath: string
  kind: DocKind
  infix: string | null
  entries: Entry[]
}

export interface Bulk {
  path: string
  text: string
  epicInfix: string | null
  epicSlug: string | null
  lastUpdate: string | null
  docs: BulkDocSection[]
}

export interface ParseError {
  path: string
  /** 1-based line number of the offending line. */
  line: number
  reason: string
}

export interface EntryRef {
  key: string | null
  head: string
  source: string
}

export type SkipReason =
  | 'empty-resolution'
  /** Key or document gone: typically integrated by its owner. */
  | 'not-in-source'
  /** The source carried another answer: the source wins, the bulk answer is dropped. */
  | 'answered-in-source'
export type RefusalReason = 'no-key' | 'drift'

/** A refused entry: its reason, and the label the prose and the JSON report both print. */
export type RefusedEntry = EntryRef & { reason: RefusalReason; label: string }

export interface PreflightFailure {
  unparsable: ParseError[]
  refused: RefusedEntry[]
}

export type FileEdit =
  | { kind: 'write'; path: string; content: string; previous: string | null }
  | { kind: 'delete'; path: string }

export interface IoFailure {
  path: string
  message: string
  /** Files already replaced when the failure hit — R-BULKER-66 reporting duty. */
  written: string[]
}

export interface Report {
  version: 2
  phase: Phase
  target: string
  exitCode: 0 | 1 | 2 | 3 | 4
  bulk: { path: string; action: 'written' | 'unchanged' | 'deleted' | 'none' }
  applied: EntryRef[]
  pending: EntryRef[]
  skipped: (EntryRef & { reason: SkipReason })[]
  refused: RefusedEntry[]
  unparsable: ParseError[]
  warnings: string[]
  followUps: string[]
}

export type ParseResult<T> = Result<T, ParseError>
