import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { rename, unlink, writeFile } from 'node:fs/promises'
import nodePath from 'node:path'
import type { EditFs } from './apply-edits.js'
import type { TargetEnv } from './resolve-target.js'

/** The real platform, read once here so no other module consults `process.platform`. */
export function nodeTargetEnv(cwd: string = process.cwd(), platform: string = process.platform): TargetEnv {
  const isWindows = platform === 'win32'
  return {
    path: isWindows ? nodePath.win32 : nodePath.posix,
    caseInsensitive: isWindows || platform === 'darwin',
    cwd,
    realpath: (p) => {
      try {
        return realpathSync(p)
      } catch {
        return p
      }
    },
    exists: (p) => existsSync(p),
    isDirectory: (p) => {
      try {
        return statSync(p).isDirectory()
      } catch {
        return false
      }
    },
    readDir: (p) => {
      try {
        return readdirSync(p)
      } catch {
        return []
      }
    }
  }
}

export interface RunFs extends EditFs {
  readFile(path: string): string
  readDirEntries(path: string): { name: string; isDirectory: boolean }[]
}

export function nodeFs(sep: typeof nodePath = nodePath): RunFs {
  return {
    readFile: (p) => readFileSync(p, 'utf8'),
    readDirEntries: (p) => {
      try {
        return readdirSync(p, { withFileTypes: true }).map((entry) => ({ name: entry.name, isDirectory: entry.isDirectory() }))
      } catch {
        return []
      }
    },
    writeFile: (p, content) => writeFile(p, content, 'utf8'),
    rename: (from, to) => rename(from, to),
    unlink: (p) => unlink(p),
    exists: (p) => existsSync(p),
    dirname: (p) => sep.dirname(p),
    join: (...parts) => sep.join(...parts),
    basename: (p) => sep.basename(p)
  }
}
