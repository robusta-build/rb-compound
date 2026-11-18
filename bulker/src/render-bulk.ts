import { entryTypeOf, renderLine } from './grammar.js'
import { bulkHeadingFor } from './doc-kind.js'
import type { Bulk, BulkDocSection, Entry, LabelledLine } from './types.js'

/**
 * Canonical field order in the bulk. The source's own order is not reproduced — each
 * line is, byte for byte — so that a refresh is idempotent whatever order the source used.
 * Resolution comes last: it is the one line the human writes.
 */
const FIELD_ORDER = ['Proposition', 'Rationale', 'Rloq', 'Route', 'Resolution'] as const

const EOL = '\n'

const isFilled = (value: string | null): boolean => value !== null && value.trim() !== ''

function orderedFields(entry: Entry): LabelledLine[] {
  const ordered: LabelledLine[] = []
  for (const label of FIELD_ORDER) {
    const field = entry.fields.find((candidate) => candidate.label === label)
    if (field) ordered.push(field)
  }
  // The bulk is where the human answers, so the line is always there to answer on.
  if (!ordered.some((field) => field.label === 'Resolution')) {
    ordered.push({ label: 'Resolution', sep: ':', text: '', continuations: [] })
  }
  return ordered
}

function renderEntry(entry: Entry): string {
  return [renderLine(entry.headLine, EOL), ...orderedFields(entry).map((field) => renderLine(field, EOL))].join(EOL)
}

function renderDocSection(doc: BulkDocSection): string {
  const blocks: string[] = [`### ${bulkHeadingFor(doc.kind)} (${doc.sourcePath})`]
  const gaps = doc.entries.filter((entry) => entryTypeOf(entry.headLine.label) === 'gap')
  const questions = doc.entries.filter((entry) => entryTypeOf(entry.headLine.label) === 'oq')
  if (gaps.length > 0) blocks.push('Gaps:', ...gaps.map(renderEntry))
  if (questions.length > 0) blocks.push('Open Questions:', ...questions.map(renderEntry))
  return blocks.join(EOL + EOL)
}

/** Deterministic worklist synthesis: counts only, never a second epic summary. */
export function synthesise(docs: BulkDocSection[]): string {
  const entries = docs.flatMap((doc) => doc.entries)
  const gaps = entries.filter((entry) => entryTypeOf(entry.headLine.label) === 'gap').length
  const filled = entries.filter((entry) => isFilled(entry.resolution)).length
  const keyless = entries.filter((entry) => entry.key === null).length
  const lines = [
    `${entries.length} ${plural(entries.length, 'entry', 'entries')} across ${docs.length} ${plural(docs.length, 'document', 'documents')}: ${gaps} ${plural(gaps, 'gap', 'gaps')}, ${entries.length - gaps} open ${plural(entries.length - gaps, 'question', 'questions')}.`,
    `${filled} filled ${plural(filled, 'Resolution', 'Resolutions')} ready for \`bulker resolve\`, ${entries.length - filled} pending.`
  ]
  if (keyless > 0) {
    lines.push(`${keyless} ${plural(keyless, 'entry', 'entries')} carry no key — key them in their source before \`bulker resolve\`.`)
  }
  return lines.join(EOL)
}

const plural = (count: number, one: string, many: string): string => (count === 1 ? one : many)

/**
 * Renders the bulk in the format of the `bulk` skill. Non-epic documents are grouped
 * under `## Story <INFIX>` by the feature stem their file names share.
 */
export function renderBulk(bulk: Bulk): string {
  const blocks: string[] = [
    `# Epic ${bulk.epicInfix ?? 'UNKNOWN'}`,
    [`**Last update:** ${bulk.lastUpdate ?? ''}`, `**Epic:** ${bulk.epicSlug ?? ''}`].join(EOL),
    synthesise(bulk.docs)
  ]

  let group: string | null = null
  for (const doc of bulk.docs) {
    if (doc.kind === 'epic') {
      blocks.push(renderDocSection(doc))
      continue
    }
    const stem = groupOf(doc.sourcePath)
    if (stem !== group) {
      group = stem
      blocks.push(`## Story ${doc.infix ?? stem.toUpperCase()}`)
    }
    blocks.push(renderDocSection(doc))
  }
  return blocks.join(EOL + EOL) + EOL
}

/** `features/x/better-bulkman.design.md` → `better-bulkman`: the stem a story and its design share. */
export function groupOf(sourcePath: string): string {
  const normalised = sourcePath.replace(/\\/g, '/')
  const dir = normalised.includes('/') ? normalised.slice(0, normalised.lastIndexOf('/') + 1) : ''
  const name = normalised.slice(dir.length)
  return dir + name.replace(/\.(epic|story|brainstorm|design|prd)\.md$/, '')
}
