import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { findProjectRoot, isWithin, resolveTarget, type TargetEnv } from './resolve-target.js'

/**
 * A memory filesystem so the win32 rules can be exercised from a macOS run.
 * `tree` holds directories as string sets and files as plain entries; `links` holds symlinks.
 */
function envOf(flavour: 'posix' | 'win32', tree: string[], links: Record<string, string> = {}): TargetEnv {
  const p = flavour === 'win32' ? path.win32 : path.posix
  const key = (value: string) => (flavour === 'win32' ? value.toLowerCase() : value)
  const files = new Set(tree.map(key))
  const dirs = new Set<string>()
  for (const entry of tree) {
    let dir = p.dirname(entry)
    for (;;) {
      dirs.add(key(dir))
      const parent = p.dirname(dir)
      if (parent === dir) break
      dir = parent
    }
  }
  const resolveLink = (value: string): string => {
    for (const [from, to] of Object.entries(links)) {
      if (key(value) === key(from)) return to
      if (key(value).startsWith(key(from) + p.sep)) return to + value.slice(from.length)
    }
    return value
  }
  return {
    path: p,
    caseInsensitive: flavour === 'win32',
    cwd: flavour === 'win32' ? 'C:\\' : '/',
    realpath: resolveLink,
    exists: (value) => files.has(key(resolveLink(value))) || dirs.has(key(resolveLink(value))),
    isDirectory: (value) => dirs.has(key(resolveLink(value))),
    readDir: (value) => {
      const prefix = key(resolveLink(value)) + p.sep
      return [...files].filter((f) => f.startsWith(prefix) && !f.slice(prefix.length).includes(p.sep))
        .map((f) => f.slice(prefix.length))
    }
  }
}

const POSIX_TREE = [
  '/srv/nz/.claude/CLAUDE.md',
  '/srv/nz/.claude/features/better-bulkman/better-bulkman.story.md',
  '/srv/nz/.claude/features/design-pipeline-epic/design-pipeline.epic.md',
  '/srv/nz/.claude/features/design-pipeline-epic/design-pipeline.bulk.md',
  '/srv/other/secrets.md'
]

const WIN_TREE = [
  'C:\\Users\\Wendel\\.claude\\CLAUDE.md',
  'C:\\Users\\Wendel\\.claude\\features\\better-bulkman\\better-bulkman.story.md',
  'C:\\Users\\Wendel\\.claude\\features\\design-pipeline-epic\\design-pipeline.epic.md',
  'D:\\elsewhere\\secrets.md'
]

describe('findProjectRoot', () => {
  it('walks up to the nearest CLAUDE.md', () => {
    const env = envOf('posix', POSIX_TREE)
    expect(findProjectRoot(env, '/srv/nz/.claude/features/better-bulkman')).toBe('/srv/nz/.claude')
  })

  it('finds a .claude directory as a marker too', () => {
    const env = envOf('posix', ['/work/proj/.claude/settings.json', '/work/proj/src/a.ts'])
    expect(findProjectRoot(env, '/work/proj/src')).toBe('/work/proj')
  })

  it('returns null when no ancestor carries a marker', () => {
    expect(findProjectRoot(envOf('posix', ['/tmp/a.md']), '/tmp')).toBeNull()
  })
})

describe('isWithin', () => {
  it('does not let a sibling prefix pass for a child', () => {
    const env = envOf('posix', POSIX_TREE)
    expect(isWithin(env, '/srv/nz/.claude', '/srv/nz/.claude-evil/x.md')).toBe(false)
    expect(isWithin(env, '/srv/nz/.claude', '/srv/nz/.claude/x.md')).toBe(true)
    expect(isWithin(env, '/srv/nz/.claude', '/srv/nz/.claude')).toBe(true)
  })

  it('compares case-insensitively on win32 only', () => {
    expect(isWithin(envOf('win32', WIN_TREE), 'C:\\Users\\Wendel\\.claude', 'c:\\users\\wendel\\.claude\\features')).toBe(true)
    expect(isWithin(envOf('posix', POSIX_TREE), '/srv/nz/.claude', '/srv/NZ/.claude/features')).toBe(false)
  })
})

describe('resolveTarget — posix, R-BULKER-02', () => {
  const env = envOf('posix', POSIX_TREE)
  const cwd = '/srv/nz/.claude'

  it('accepts a relative folder', () => {
    const target = resolveTarget('features/design-pipeline-epic', cwd, env)
    expect(target.ok).toBe(true)
    if (!target.ok) return
    expect(target.value).toMatchObject({
      dir: '/srv/nz/.claude/features/design-pipeline-epic',
      slug: 'design-pipeline',
      epicPath: '/srv/nz/.claude/features/design-pipeline-epic/design-pipeline.epic.md',
      bulkPath: '/srv/nz/.claude/features/design-pipeline-epic/design-pipeline.bulk.md',
      root: '/srv/nz/.claude'
    })
  })

  it('accepts an absolute .epic.md and a .bulk.md, landing on the same target', () => {
    const fromEpic = resolveTarget('/srv/nz/.claude/features/design-pipeline-epic/design-pipeline.epic.md', cwd, env)
    const fromBulk = resolveTarget('/srv/nz/.claude/features/design-pipeline-epic/design-pipeline.bulk.md', cwd, env)
    expect(fromEpic.ok && fromBulk.ok).toBe(true)
    if (!fromEpic.ok || !fromBulk.ok) return
    expect(fromEpic.value.bulkPath).toBe(fromBulk.value.bulkPath)
    expect(fromEpic.value.slug).toBe('design-pipeline')
  })

  it('names the bulk after the folder when the feature has no epic file', () => {
    const target = resolveTarget('features/better-bulkman', cwd, env)
    expect(target.ok && target.value).toMatchObject({
      slug: 'better-bulkman',
      epicPath: null,
      bulkPath: '/srv/nz/.claude/features/better-bulkman/better-bulkman.bulk.md'
    })
  })

  it('accepts a Windows-style relative path on posix — R-BULKER-02', () => {
    const target = resolveTarget('features\\design-pipeline-epic', cwd, env)
    expect(target.ok && target.value.slug).toBe('design-pipeline')
  })

  it('refuses a target outside the project — R-BULKER-03, exit 2', () => {
    const target = resolveTarget('../../other', cwd, env)
    expect(target.ok).toBe(false)
    if (target.ok) return
    expect(target.error.kind).toBe('outside-project')
    expect(target.error.message).toContain('outside the current Claude project')
  })

  it('refuses an absolute target outside the project', () => {
    const target = resolveTarget('/srv/other', cwd, env)
    expect(!target.ok && target.error.kind).toBe('outside-project')
  })

  it('refuses a symlink that escapes the project — the check runs on the real path', () => {
    const linked = envOf('posix', [...POSIX_TREE, '/srv/nz/.claude/features/escape/x.md'], {
      '/srv/nz/.claude/features/escape': '/srv/other'
    })
    const target = resolveTarget('features/escape', cwd, linked)
    expect(!target.ok && target.error.kind).toBe('outside-project')
  })

  it('reports a usage error, not a refusal, for a missing target inside the project', () => {
    const target = resolveTarget('features/nope', cwd, env)
    expect(!target.ok && target.error.kind).toBe('usage')
    expect(!target.ok && target.error.message).toContain('not found')
  })

  it('reports a usage error for a file that is neither an epic nor a bulk', () => {
    const target = resolveTarget('features/better-bulkman/better-bulkman.story.md', cwd, env)
    expect(!target.ok && target.error.kind).toBe('usage')
    expect(!target.ok && target.error.message).toContain('must be an epic folder')
  })

  it('refuses when no Claude project can be found at all', () => {
    const bare = envOf('posix', ['/tmp/x/a.md'])
    expect(resolveTarget('a.md', '/tmp/x', bare)).toMatchObject({ ok: false, error: { kind: 'outside-project', root: null } })
  })
})

describe('resolveTarget — win32 rules, exercised from macOS (story Dep 2 still needs a real Windows run)', () => {
  const env = envOf('win32', WIN_TREE)
  const cwd = 'C:\\Users\\Wendel\\.claude'

  it('accepts a relative backslash path', () => {
    const target = resolveTarget('features\\design-pipeline-epic', cwd, env)
    expect(target.ok && target.value).toMatchObject({
      dir: 'C:\\Users\\Wendel\\.claude\\features\\design-pipeline-epic',
      slug: 'design-pipeline',
      bulkPath: 'C:\\Users\\Wendel\\.claude\\features\\design-pipeline-epic\\design-pipeline.bulk.md'
    })
  })

  it('accepts a forward-slash path on win32 too', () => {
    expect(resolveTarget('features/design-pipeline-epic', cwd, env)).toMatchObject({ ok: true })
  })

  it('accepts a drive-letter absolute path whatever its case', () => {
    const target = resolveTarget('c:\\users\\wendel\\.claude\\features\\better-bulkman', cwd, env)
    expect(target.ok && target.value.slug).toBe('better-bulkman')
  })

  it('refuses another drive — R-BULKER-03', () => {
    expect(resolveTarget('D:\\elsewhere', cwd, env)).toMatchObject({ ok: false, error: { kind: 'outside-project' } })
  })

  it('refuses a target escaping the project with `..`', () => {
    expect(resolveTarget('..\\..\\..\\Windows', cwd, env)).toMatchObject({ ok: false, error: { kind: 'outside-project' } })
  })

  it('accepts a \\\\?\\ extended-length path as the plain path it names', () => {
    const target = resolveTarget('\\\\?\\C:\\Users\\Wendel\\.claude\\features\\better-bulkman', cwd, env)
    expect(target.ok && target.value.slug).toBe('better-bulkman')
  })
})
