import { ok, type Result } from './result.js'
import { renderBulk } from './render-bulk.js'
import type { Bulk, BulkDocSection, Entry, EntryRef, FileEdit, LabelledLine, ParseError, SourceDoc } from './types.js'

export interface RefreshOptions {
  bulkPath: string
  slug: string
  today: string
  /** Source path as the bulk records it: relative to the bulk, forward slashes. */
  relativise(path: string): string
}

export interface RefreshPlan {
  edits: FileEdit[]
  bulk: Bulk | null
  bulkAction: 'written' | 'unchanged' | 'deleted' | 'none'
  pending: EntryRef[]
  keyless: EntryRef[]
  /** Dropped from the bulk while it carried another answer than the source's. */
  answeredInSource: EntryRef[]
}

const isFilled = (value: string | null): boolean => value !== null && value.trim() !== ''

const emptyResolution = (): LabelledLine => ({ label: 'Resolution', sep: ':', text: '', continuations: [] })

const refOf = (entry: Entry, source: string): EntryRef => ({
  key: entry.key?.text ?? null,
  head: entry.head,
  source
})

/** The source owns the question, the bulk carries the answer until it is copied. */
function bulkEntryOf(sourceEntry: Entry, previous: Entry | undefined): Entry {
  const previousResolution = previous?.fields.find((f) => f.label === 'Resolution')
  const resolution = previousResolution && isFilled(previous!.resolution) ? previousResolution : emptyResolution()
  const carried = ['Proposition', 'Rationale', 'Rloq', 'Route']
    .map((label) => sourceEntry.fields.find((f) => f.label === label))
    .filter((f): f is LabelledLine => f !== undefined)
  return { ...sourceEntry, resolution: resolution.text, fields: [...carried, resolution] }
}

const answeredDifferently = (sourceEntry: Entry, previous: Entry | undefined): boolean =>
  previous !== undefined && isFilled(previous.resolution) && previous.resolution!.trim() !== sourceEntry.resolution!.trim()

/**
 * R-BULKER-45. A keyed entry is found by its key; a keyless one falls back to the legacy
 * identity, source path plus verbatim question text — enough here, since `refresh` never
 * opens a source for writing.
 */
function findPrevious(previousDoc: BulkDocSection | undefined, sourceEntry: Entry): Entry | undefined {
  if (!previousDoc) return undefined
  if (sourceEntry.key) {
    return previousDoc.entries.find((candidate) => candidate.key?.text === sourceEntry.key!.text)
  }
  return previousDoc.entries.find((candidate) => candidate.key === null && candidate.question === sourceEntry.question)
}

/** Epic first, then by lexicographic path — no filesystem ordering reaches the output. */
function orderSources(sources: SourceDoc[], relativise: (path: string) => string): SourceDoc[] {
  return [...sources].sort((a, b) => {
    const kindRank = Number(a.kind !== 'epic') - Number(b.kind !== 'epic')
    return kindRank !== 0 ? kindRank : relativise(a.path).localeCompare(relativise(b.path), 'en')
  })
}

/** Drops every source entry whose Resolution is filled; deletes the bulk when nothing remains. */
export function planRefresh(
  sources: SourceDoc[],
  existing: Bulk | null,
  options: RefreshOptions
): Result<RefreshPlan, ParseError[]> {
  const docs: BulkDocSection[] = []
  const pending: EntryRef[] = []
  const keyless: EntryRef[] = []
  const answeredInSource: EntryRef[] = []

  for (const source of orderSources(sources, options.relativise)) {
    const entries = source.section?.entries ?? []
    if (entries.length === 0) continue
    const sourcePath = options.relativise(source.path)
    const previousDoc = existing?.docs.find((doc) => doc.sourcePath === sourcePath)
    const merged: Entry[] = []
    for (const entry of entries) {
      const previous = findPrevious(previousDoc, entry)
      if (isFilled(entry.resolution)) {
        if (answeredDifferently(entry, previous)) answeredInSource.push(refOf(entry, sourcePath))
        continue
      }
      const bulkEntry = bulkEntryOf(entry, previous)
      const ref = refOf(bulkEntry, sourcePath)
      if (bulkEntry.key === null) keyless.push(ref)
      if (!isFilled(bulkEntry.resolution)) pending.push(ref)
      merged.push(bulkEntry)
    }
    if (merged.length === 0) continue
    docs.push({ sourcePath, kind: source.kind, infix: source.infix, entries: merged })
  }

  if (docs.length === 0) {
    const action = existing === null ? 'none' : 'deleted'
    const edits: FileEdit[] = existing === null ? [] : [{ kind: 'delete', path: options.bulkPath }]
    return ok({ edits, bulk: null, bulkAction: action, pending, keyless, answeredInSource })
  }

  const epicInfix = docs.find((doc) => doc.kind === 'epic')?.infix ?? docs[0]!.infix
  const bulk: Bulk = {
    path: options.bulkPath,
    text: '',
    epicInfix,
    epicSlug: options.slug,
    lastUpdate: options.today,
    docs
  }
  const rendered = renderBulk(bulk)

  // R-BULKER-43: `Last update` is the only line a same-day rerun would move, so an otherwise
  // identical bulk keeps its stamp and its mtime rather than being rewritten.
  if (existing !== null) {
    const asExisting = renderBulk({ ...bulk, lastUpdate: existing.lastUpdate })
    if (asExisting === existing.text) {
      return ok({ edits: [], bulk: { ...bulk, lastUpdate: existing.lastUpdate, text: existing.text }, bulkAction: 'unchanged', pending, keyless, answeredInSource })
    }
  }
  return ok({
    edits: [{ kind: 'write', path: options.bulkPath, content: rendered, previous: existing?.text ?? null }],
    bulk: { ...bulk, text: rendered },
    bulkAction: 'written',
    pending,
    keyless,
    answeredInSource
  })
}
