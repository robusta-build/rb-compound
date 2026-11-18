import { cpSync, mkdirSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { nodeFs, nodeTargetEnv } from '../src/node-env.js'
import type { RunDeps } from '../src/pipeline.js'
import { CORPUS } from './corpus.js'

export interface TempProject {
  root: string
  dir(feature: string): string
  read(...parts: string[]): string
  write(relative: string, content: string): void
  exists(...parts: string[]): boolean
  mtime(...parts: string[]): number
  deps(overrides?: Partial<RunDeps>): RunDeps
}

/**
 * A throwaway copy of the real corpus under a CLAUDE.md, so both phases run against real
 * documents while no test ever writes into a live one — R-BULKER-83.
 */
export function tempProject(features: string[]): TempProject {
  const root = mkdtempSync(join(tmpdir(), 'bulker-'))
  writeFileSync(join(root, 'CLAUDE.md'), '# temp project\n', 'utf8')
  mkdirSync(join(root, 'features'))
  for (const feature of features) {
    cpSync(join(CORPUS, feature), join(root, 'features', feature), { recursive: true })
  }
  const at = (...parts: string[]) => join(root, ...parts)
  return {
    root,
    dir: (feature) => at('features', feature),
    read: (...parts) => readFileSync(at(...parts), 'utf8'),
    write: (relative, content) => writeFileSync(at(relative), content, 'utf8'),
    exists: (...parts) => {
      try {
        statSync(at(...parts))
        return true
      } catch {
        return false
      }
    },
    mtime: (...parts) => statSync(at(...parts)).mtimeMs,
    deps: (overrides = {}) => ({
      env: nodeTargetEnv(root, process.platform),
      fs: nodeFs(),
      today: '2026-08-08',
      ...overrides
    })
  }
}

/**
 * Rewrites the real epic's legacy heads into keyed ones, exactly as Dep 1 will once the
 * authoring agents emit keys. The prose, the French spacing and the accents stay real.
 */
export const withKeys = (text: string): string =>
  text.replace(/^- Open Question (\d+) :/gm, '- OQ-DESIGNDOC-$1 :')
