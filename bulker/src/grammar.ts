import { C, F, Stream } from '@masala/parser'
import type { EntryKey, EntryType, LabelledLine } from './types.js'

/**
 * The entry grammar of the design doc, one line at a time:
 *
 *   entry-head := "- " (key | legacy) sep text
 *   key        := ("Gap" | "OQ") "-" infix "-" number
 *   legacy     := ("Gap" | "Open Question") " " number
 *   infix      := [A-Z]{5,15}
 *   number     := [1-9] [0-9]*
 *   sep        := ":" | " :"
 *   field-line := "- " label sep [text]
 *
 * `sep` admits the French spacing because live documents carry both forms, and
 * whichever form a line used is kept so it can be rendered back byte for byte.
 */

const BULLET = '- '
const KEY_SOURCE = '(?:Gap|OQ)-[A-Z]{5,15}-[1-9][0-9]*'
const LEGACY_SOURCE = '(?:Gap|Open Question) [1-9][0-9]*'

/** Field labels the parser recognises. Anything else inside an entry fails the document. */
export const FIELD_LABELS = ['Proposition', 'Rationale', 'Resolution', 'Route', 'Rloq', 'Note'] as const
export type ParsedFieldLabel = (typeof FIELD_LABELS)[number]

const restOfLine = F.regex(/.*/)
const separator = F.regex(/ ?:/)

const labelled = (label: ReturnType<typeof F.regex>) =>
  C.string(BULLET).drop().then(label).then(separator).then(restOfLine).then(F.eos().drop())

const headParser = labelled(F.regex(new RegExp(`${KEY_SOURCE}|${LEGACY_SOURCE}`)))
const fieldParser = labelled(F.regex(new RegExp(`(?:${FIELD_LABELS.join('|')})(?= ?:)`)))
/** Catches `- Something:` shapes the grammar does not model, so they can be refused loudly. */
const unknownFieldParser = labelled(F.regex(/[A-Za-z][A-Za-z0-9 ]{0,29}?(?= ?:)/))
const keyParser = F.regex(new RegExp(`^${KEY_SOURCE}$`)).then(F.eos().drop())

interface Parts {
  label: string
  sep: string
  text: string
}

function run(parser: { parse: (s: unknown) => { isAccepted(): boolean; value: unknown } }, line: string): Parts | null {
  const response = parser.parse(Stream.ofChars(line))
  if (!response.isAccepted()) return null
  const parts = (response.value as { array(): unknown[] }).array() as string[]
  return { label: parts[0]!, sep: parts[1]!, text: parts[2]! }
}

function toLine(parts: Parts): LabelledLine {
  return { label: parts.label, sep: parts.sep, text: parts.text, continuations: [] }
}

/** Parses `Gap-BULKER-1`. Returns null for a legacy `Gap 1` label, which carries no key. */
export function parseKey(label: string): EntryKey | null {
  const response = keyParser.parse(Stream.ofChars(label))
  if (!response.isAccepted()) return null
  const [type, infix, number] = label.split('-') as [string, string, string]
  return {
    type: type === 'Gap' ? 'gap' : 'oq',
    infix,
    number: Number(number),
    text: label
  }
}

/** Gap or Open Question, readable from a keyed head as well as a legacy one. */
export function entryTypeOf(label: string): EntryType {
  return label.startsWith('Gap') ? 'gap' : 'oq'
}

/** An entry head line — keyed or legacy. */
export function parseHeadLine(line: string): LabelledLine | null {
  const parts = run(headParser, line)
  return parts ? toLine(parts) : null
}

/** A recognised field line. `Note` is legacy noise and is reported as such. */
export function parseFieldLine(line: string): LabelledLine | null {
  const parts = run(fieldParser, line)
  return parts ? toLine(parts) : null
}

/** A `- Word:` line the grammar does not model. Non-null means the document must be refused. */
export function parseUnknownFieldLine(line: string): LabelledLine | null {
  const parts = run(unknownFieldParser, line)
  return parts ? toLine(parts) : null
}

/** Renders a head or field line back to its exact source form. */
export function renderLine(line: LabelledLine, eol: string): string {
  const head = `${BULLET}${line.label}${line.sep}${line.text}`
  return [head, ...line.continuations].join(eol)
}
