import { err, ok, type Result } from './result.js'

/** The subset of node's `path` this module needs. `path.posix` and `path.win32` both satisfy it. */
export interface PathFlavour {
  sep: string
  isAbsolute(p: string): boolean
  resolve(...parts: string[]): string
  normalize(p: string): string
  dirname(p: string): string
  basename(p: string, ext?: string): string
  join(...parts: string[]): string
  relative(from: string, to: string): string
}

/**
 * Everything platform-dependent, injected rather than read from `process.platform`, so the
 * Windows path rules are unit-testable from a macOS run — story Dep 2 still needs a real
 * Windows 11 machine to close, but nothing here hides behind the host platform.
 */
export interface TargetEnv {
  path: PathFlavour
  /** win32 compares paths case-insensitively; posix does not. */
  caseInsensitive: boolean
  cwd: string
  /** Resolves symlinks. Returns its input unchanged when the path does not exist. */
  realpath(p: string): string
  exists(p: string): boolean
  isDirectory(p: string): boolean
  readDir(p: string): string[]
}

export type Refusal =
  | { kind: 'usage'; message: string }
  | { kind: 'outside-project'; message: string; root: string | null }

export interface Target {
  input: string
  /** Absolute epic folder. */
  dir: string
  /** `<epic>` of `<epic>.bulk.md`. */
  slug: string
  bulkPath: string
  epicPath: string | null
  root: string
}

const PROJECT_MARKERS = ['CLAUDE.md', '.claude']

/** R-BULKER-03: the nearest ancestor of the working directory holding a project marker. */
export function findProjectRoot(env: TargetEnv, from: string): string | null {
  let current = env.path.resolve(from)
  for (;;) {
    for (const marker of PROJECT_MARKERS) {
      if (env.exists(env.path.join(current, marker))) return current
    }
    const parent = env.path.dirname(current)
    if (parent === current) return null
    current = parent
  }
}

const stripWin32Prefix = (p: string): string => p.replace(/^\\\\\?\\/, '')

function comparable(env: TargetEnv, p: string): string {
  const normalised = env.path.normalize(stripWin32Prefix(p))
  return env.caseInsensitive ? normalised.toLowerCase() : normalised
}

/** True when the candidate is the root itself or lies under it, compared with the platform's separator and case rule. */
export function isWithin(env: TargetEnv, root: string, candidate: string): boolean {
  const a = comparable(env, root).replace(new RegExp(`\\${env.path.sep}+$`), '')
  const b = comparable(env, candidate).replace(new RegExp(`\\${env.path.sep}+$`), '')
  return b === a || b.startsWith(a + env.path.sep)
}

/** Resolves symlinks as far as the path exists, then re-appends the part that does not yet. */
function realpathDeep(env: TargetEnv, p: string): string {
  const tail: string[] = []
  let current = env.path.resolve(p)
  for (;;) {
    if (env.exists(current)) return env.path.join(env.realpath(current), ...tail)
    const parent = env.path.dirname(current)
    if (parent === current) return env.path.resolve(p)
    tail.unshift(env.path.basename(current))
    current = parent
  }
}

/** R-BULKER-02: relative or absolute, with either separator. */
function toAbsolute(env: TargetEnv, raw: string): string {
  // `\\?\C:\x` is Windows' extended-length spelling of `C:\x`, not a distinct location.
  const input = env.path.sep === '\\' ? stripWin32Prefix(raw) : raw
  const direct = env.path.isAbsolute(input)
    ? env.path.normalize(input)
    : env.path.resolve(env.cwd, input)
  if (env.exists(direct) || !input.includes('\\')) return direct
  // A posix run given a Windows-style relative path: `\` is a separator, not a file name.
  const swapped = input.replace(/\\/g, '/')
  return env.path.isAbsolute(swapped) ? env.path.normalize(swapped) : env.path.resolve(env.cwd, swapped)
}

const EPIC_SUFFIX = '.epic.md'
const BULK_SUFFIX = '.bulk.md'

function slugOfDirectory(env: TargetEnv, dir: string): { slug: string; epicPath: string | null } {
  const epics = env.readDir(dir).filter((name) => name.endsWith(EPIC_SUFFIX)).sort()
  const epic = epics[0]
  if (epic) {
    return { slug: epic.slice(0, -EPIC_SUFFIX.length), epicPath: env.path.join(dir, epic) }
  }
  // A feature that stands alone carries no `.epic.md`; the folder name names its bulk.
  return { slug: env.path.basename(dir), epicPath: null }
}

/**
 * R-BULKER-01 / R-BULKER-03. The project-boundary check runs before any file content is read,
 * and a target outside the project is refused rather than resolved.
 */
export function resolveTarget(input: string, cwd: string, env: TargetEnv): Result<Target, Refusal> {
  if (input.trim() === '') {
    return err({ kind: 'usage', message: 'a target is required: an epic folder, an <epic>.epic.md or an <epic>.bulk.md' })
  }
  const scoped: TargetEnv = { ...env, cwd }
  const root = findProjectRoot(scoped, cwd)
  if (root === null) {
    return err({
      kind: 'outside-project',
      message: `no Claude project found from ${cwd}: no ancestor carries a CLAUDE.md or a .claude directory`,
      root: null
    })
  }
  const realRoot = realpathDeep(scoped, root)
  const absolute = toAbsolute(scoped, input)
  const real = realpathDeep(scoped, absolute)
  if (!isWithin(scoped, realRoot, real)) {
    return err({
      kind: 'outside-project',
      message: `${input} resolves to ${real}, outside the current Claude project ${realRoot}`,
      root: realRoot
    })
  }
  if (!scoped.exists(real)) {
    return err({ kind: 'usage', message: `target not found: ${input}` })
  }

  if (scoped.isDirectory(real)) {
    const { slug, epicPath } = slugOfDirectory(scoped, real)
    return ok({ input, dir: real, slug, epicPath, bulkPath: scoped.path.join(real, `${slug}${BULK_SUFFIX}`), root: realRoot })
  }

  const name = scoped.path.basename(real)
  const suffix = name.endsWith(EPIC_SUFFIX) ? EPIC_SUFFIX : name.endsWith(BULK_SUFFIX) ? BULK_SUFFIX : null
  if (!suffix) {
    return err({ kind: 'usage', message: `target must be an epic folder, an <epic>.epic.md or an <epic>.bulk.md, got ${name}` })
  }
  const dir = scoped.path.dirname(real)
  const slug = name.slice(0, -suffix.length)
  const epicCandidate = scoped.path.join(dir, `${slug}${EPIC_SUFFIX}`)
  return ok({
    input,
    dir,
    slug,
    epicPath: scoped.exists(epicCandidate) ? epicCandidate : null,
    bulkPath: scoped.path.join(dir, `${slug}${BULK_SUFFIX}`),
    root: realRoot
  })
}
