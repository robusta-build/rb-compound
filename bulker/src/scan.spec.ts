import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { scanSources } from './scan.js'

const fsOf = (tree: Record<string, string[]>) => ({
  readDirEntries: (dir: string) =>
    (tree[dir] ?? []).map((name) => ({ name, isDirectory: tree[path.posix.join(dir, name)] !== undefined }))
})

describe('scanSources', () => {
  it('takes the four document kinds and the legacy .prd.md, and nothing else', () => {
    const fs = fsOf({
      '/e': ['a.epic.md', 'a.story.md', 'a.brainstorm.md', 'a.design.md', 'a.prd.md', 'a.bulk.md', 'notes.md', 'script.ts']
    })
    expect(scanSources('/e', fs, path.posix)).toEqual([
      '/e/a.brainstorm.md', '/e/a.design.md', '/e/a.epic.md', '/e/a.prd.md', '/e/a.story.md'
    ])
  })

  it('never picks up the bulk it is about to write', () => {
    expect(scanSources('/e', fsOf({ '/e': ['a.bulk.md'] }), path.posix)).toEqual([])
  })

  it('recurses into subfolders but skips __done, its legacy spelling and dot folders', () => {
    const fs = fsOf({
      '/e': ['sub', '__done', '_done', '.git', 'node_modules', 'a.story.md'],
      '/e/sub': ['b.design.md'],
      '/e/__done': ['old.story.md'],
      '/e/_done': ['older.story.md'],
      '/e/.git': ['x.story.md'],
      '/e/node_modules': ['dep.story.md']
    })
    expect(scanSources('/e', fs, path.posix)).toEqual(['/e/a.story.md', '/e/sub/b.design.md'])
  })

  it('skips __chore at the scanned root and nested one level down, but walks chore-ignore', () => {
    const fs = fsOf({
      '/e': ['__chore', 'chore-ignore', 'epic'],
      '/e/__chore': ['notes.story.md'],
      '/e/chore-ignore': ['chore-ignore.story.md'],
      '/e/epic': ['__chore', 'b.story.md'],
      '/e/epic/__chore': ['notes.story.md']
    })
    expect(scanSources('/e', fs, path.posix)).toEqual([
      '/e/chore-ignore/chore-ignore.story.md', '/e/epic/b.story.md'
    ])
  })

  it('skips __future at the scanned root and nested in an epic', () => {
    const fs = fsOf({
      '/e': ['__future', 'epic'],
      '/e/__future': ['later.story.md'],
      '/e/epic': ['__future', 'b.story.md'],
      '/e/epic/__future': ['parked.story.md']
    })
    expect(scanSources('/e', fs, path.posix)).toEqual(['/e/epic/b.story.md'])
  })

  it('sorts its result so no filesystem ordering reaches the output', () => {
    const fs = fsOf({ '/e': ['z.story.md', 'a.story.md', 'm.story.md'] })
    expect(scanSources('/e', fs, path.posix)).toEqual(['/e/a.story.md', '/e/m.story.md', '/e/z.story.md'])
  })
})
