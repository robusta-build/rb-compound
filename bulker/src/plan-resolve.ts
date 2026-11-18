import { editDocument, type ResolutionCopy } from './edit-document.js'
import { refusalOf } from './refusal.js'
import { err, ok, type Result } from './result.js'
import type {
  Bulk, BulkDocSection, DocKind, Entry, EntryRef, FileEdit, LabelledLine, ParseError,
  PreflightFailure, RefusedEntry, SkipReason, SourceDoc
} from './types.js'

export interface ResolveOptions {
  relativise(path: string): string
  /** Documents that failed to parse. Any one of them aborts the whole run. */
  unparsable?: ParseError[]
}

export interface ResolvePlan {
  /** `write` edits on source documents only, never a `delete`. */
  edits: FileEdit[]
  applied: EntryRef[]
  pending: EntryRef[]
  skipped: (EntryRef & { reason: SkipReason })[]
  followUps: string[]
}

type Skip = EntryRef & { reason: SkipReason }

const isFilled = (value: string | null): boolean => value !== null && value.trim() !== ''

const refOf = (entry: Entry, source: string): EntryRef => ({
  key: entry.key?.text ?? null,
  head: entry.head,
  source
})

const slugOf = (sourcePath: string): string => {
  const name = sourcePath.replace(/\\/g, '/').split('/').pop() ?? sourcePath
  return name.replace(/\.(epic|story|brainstorm|design|prd)\.md$/, '')
}

const INTEGRATORS: Record<DocKind, (slug: string) => string> = {
  epic: (slug) => `epicman update ${slug}`,
  story: (slug) => `storyman update ${slug}`,
  design: (slug) => `designman update ${slug}`,
  brainstorm: (slug) => `storyman update ${slug} avec brainstorm`
}

function followUpOf(kind: DocKind, path: string, count: number): string {
  const entries = count === 1 ? '1 entry' : `${count} entries`
  return `${INTEGRATORS[kind](slugOf(path))} — ${entries} resolved in ${path}`
}

type Lookup = (doc: BulkDocSection, entry: Entry) => Entry | undefined

/** Filled in the bulk, and no filled Resolution in the source entry found by key. */
const toApply = (doc: BulkDocSection, entry: Entry, lookup: Lookup): boolean =>
  isFilled(entry.resolution) && !isFilled(lookup(doc, entry)?.resolution ?? null)

function preflight(bulk: Bulk, lookup: Lookup, unparsable: ParseError[]): PreflightFailure | null {
  const refused: RefusedEntry[] = []
  for (const doc of bulk.docs) {
    for (const entry of doc.entries.filter((candidate) => toApply(doc, candidate, lookup))) {
      const ref = refOf(entry, doc.sourcePath)
      if (entry.key === null) {
        // A wrong match is the one failure that destroys real work, so `resolve` never guesses.
        refused.push(refusalOf(ref, 'no-key'))
      } else {
        const sourceEntry = lookup(doc, entry)
        if (sourceEntry && sourceEntry.question !== entry.question) refused.push(refusalOf(ref, 'drift'))
      }
    }
  }
  return refused.length > 0 || unparsable.length > 0 ? { unparsable, refused } : null
}

function resolutionFieldOf(entry: Entry): LabelledLine {
  return entry.fields.find((field) => field.label === 'Resolution')!
}

/** Copies only into an empty source Resolution; preflight over the entries to apply. */
export function planResolve(
  bulk: Bulk,
  sources: SourceDoc[],
  options: ResolveOptions
): Result<ResolvePlan, PreflightFailure> {
  const byPath = new Map(sources.map((source) => [options.relativise(source.path), source]))
  const lookup: Lookup = (doc, entry) =>
    byPath.get(doc.sourcePath)?.section?.entries.find((candidate) => candidate.key?.text === entry.key?.text)

  const failure = preflight(bulk, lookup, options.unparsable ?? [])
  if (failure) return err(failure)

  const applied: EntryRef[] = []
  const pending: EntryRef[] = []
  const skipped: Skip[] = []
  const edits: FileEdit[] = []
  const followUps: string[] = []

  for (const doc of bulk.docs) {
    const copies: ResolutionCopy[] = []
    for (const entry of doc.entries) {
      const ref = refOf(entry, doc.sourcePath)
      if (!isFilled(entry.resolution)) {
        pending.push(ref)
        skipped.push({ ...ref, reason: 'empty-resolution' })
        continue
      }
      const sourceEntry = lookup(doc, entry)
      if (!sourceEntry) {
        skipped.push({ ...ref, reason: 'not-in-source' })
        continue
      }
      // The rebuild drops it and names it when the answers differ: one reporter only.
      if (isFilled(sourceEntry.resolution)) continue
      copies.push({ entry: sourceEntry, resolution: resolutionFieldOf(entry) })
      applied.push(ref)
    }
    if (copies.length === 0) continue
    const source = byPath.get(doc.sourcePath)!
    edits.push({ kind: 'write', path: source.path, content: editDocument(source, { copies }), previous: source.text })
    followUps.push(followUpOf(source.kind, doc.sourcePath, copies.length))
  }

  return ok({ edits, applied, pending, skipped, followUps })
}
