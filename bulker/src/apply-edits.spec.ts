import { describe, expect, it } from 'vitest'
import { applyEdits, type EditFs } from './apply-edits.js'

interface Trace {
  fs: EditFs
  files: Map<string, string>
  calls: string[]
}

function memoryFs(fail?: { on: 'write' | 'rename' | 'unlink'; path: string }): Trace {
  const files = new Map<string, string>()
  const calls: string[] = []
  const guard = (kind: 'write' | 'rename' | 'unlink', path: string) => {
    if (fail && fail.on === kind && path.includes(fail.path)) throw new Error(`EACCES ${kind} ${path}`)
  }
  return {
    files,
    calls,
    fs: {
      writeFile: async (path, content) => {
        calls.push(`write ${path}`)
        guard('write', path)
        files.set(path, content)
      },
      rename: async (from, to) => {
        calls.push(`rename ${from} -> ${to}`)
        guard('rename', to)
        files.set(to, files.get(from)!)
        files.delete(from)
      },
      unlink: async (path) => {
        calls.push(`unlink ${path}`)
        guard('unlink', path)
        files.delete(path)
      },
      exists: (path) => files.has(path),
      dirname: (path) => path.slice(0, path.lastIndexOf('/')),
      join: (...parts) => parts.join('/'),
      basename: (path) => path.slice(path.lastIndexOf('/') + 1)
    }
  }
}

const tempName = (basename: string, index: number) => `.${basename}.tmp${index}`

describe('applyEdits — R-BULKER-66', () => {
  it('writes beside the target and renames over it', async () => {
    const trace = memoryFs()
    const result = await applyEdits(
      [{ kind: 'write', path: '/e/a.story.md', content: 'new', previous: 'old' }],
      trace.fs,
      { tempName }
    )
    expect(result.ok).toBe(true)
    expect(trace.calls).toEqual([
      'write /e/.a.story.md.tmp0',
      'rename /e/.a.story.md.tmp0 -> /e/a.story.md'
    ])
    expect(trace.files.get('/e/a.story.md')).toBe('new')
  })

  it('leaves the target untouched when the rename fails', async () => {
    const trace = memoryFs({ on: 'rename', path: 'a.story.md' })
    trace.files.set('/e/a.story.md', 'old')

    const result = await applyEdits(
      [{ kind: 'write', path: '/e/a.story.md', content: 'new', previous: 'old' }],
      trace.fs,
      { tempName }
    )
    expect(result.ok).toBe(false)
    expect(trace.files.get('/e/a.story.md')).toBe('old')
  })

  it('names the files already replaced when a later write fails', async () => {
    const trace = memoryFs({ on: 'write', path: 'b.story.md' })
    const result = await applyEdits(
      [
        { kind: 'write', path: '/e/a.story.md', content: 'A', previous: null },
        { kind: 'write', path: '/e/b.story.md', content: 'B', previous: null },
        { kind: 'write', path: '/e/c.story.md', content: 'C', previous: null }
      ],
      trace.fs,
      { tempName }
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.path).toBe('/e/b.story.md')
    expect(result.error.written).toEqual(['/e/a.story.md'])
    expect(trace.files.has('/e/c.story.md')).toBe(false)
  })

  it('deletes a bulk, and tolerates one that is already gone', async () => {
    const trace = memoryFs()
    trace.files.set('/e/x.bulk.md', 'stale')
    expect((await applyEdits([{ kind: 'delete', path: '/e/x.bulk.md' }], trace.fs)).ok).toBe(true)
    expect(trace.files.has('/e/x.bulk.md')).toBe(false)
    expect((await applyEdits([{ kind: 'delete', path: '/e/x.bulk.md' }], trace.fs)).ok).toBe(true)
  })

  it('does nothing at all on an empty edit set', async () => {
    const trace = memoryFs()
    expect((await applyEdits([], trace.fs)).ok).toBe(true)
    expect(trace.calls).toEqual([])
  })
})
