import type { DocKind } from './types.js'

const SUFFIXES: [string, DocKind][] = [
  ['.epic.md', 'epic'],
  ['.story.md', 'story'],
  ['.brainstorm.md', 'brainstorm'],
  ['.design.md', 'design'],
  // Legacy: a *.prd.md was the design doc before designman renamed the artifact.
  ['.prd.md', 'design']
]

/** File-name patterns `refresh` scans inside an epic folder. */
export const SOURCE_SUFFIXES = SUFFIXES.map(([suffix]) => suffix)

/** The kind a file name's suffix gives a source document, null for any other file. */
export function docKindOf(path: string): DocKind | null {
  const name = path.replace(/\\/g, '/').split('/').pop() ?? path
  for (const [suffix, kind] of SUFFIXES) {
    if (name.endsWith(suffix)) return kind
  }
  return null
}

/** `Epic OQ`, `Story OQ`, … — the bulk subsection heading of the `bulk` skill. */
export function bulkHeadingFor(kind: DocKind): string {
  return `${kind[0]!.toUpperCase()}${kind.slice(1)} OQ`
}

/** `Story` → `story`: the kind a bulk subsection heading names, case ignored, null for an unknown one. */
export function docKindFromBulkHeading(label: string): DocKind | null {
  const lowered = label.toLowerCase()
  for (const kind of ['epic', 'story', 'brainstorm', 'design'] as DocKind[]) {
    if (lowered === kind) return kind
  }
  return null
}
