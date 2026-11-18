import { docKindOf } from './doc-kind.js'
import type { PathFlavour } from './resolve-target.js'

export interface ScanFs {
  readDirEntries(path: string): { name: string; isDirectory: boolean }[]
}

/** `__done/`, its legacy spelling, `__future/` and `__chore/` are locations, not states: nothing there is pending. */
const SKIP_DIRS = new Set(['__done', '_done', '__future', '__chore', 'node_modules', 'dist'])

/**
 * Lists the source documents of an epic folder, sorted, so no filesystem ordering
 * reaches the output. Determinism is a contract of both phases.
 */
export function scanSources(dir: string, fs: ScanFs, path: PathFlavour): string[] {
  const found: string[] = []
  const walk = (current: string) => {
    const entries = [...fs.readDirEntries(current)].sort((a, b) => a.name.localeCompare(b.name, 'en'))
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = path.join(current, entry.name)
      if (entry.isDirectory) {
        if (!SKIP_DIRS.has(entry.name)) walk(full)
        continue
      }
      if (docKindOf(entry.name) !== null) found.push(full)
    }
  }
  walk(dir)
  return found.sort((a, b) => a.localeCompare(b, 'en'))
}
