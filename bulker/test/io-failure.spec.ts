import { describe, expect, it } from 'vitest'
import { runRefresh, runResolve } from '../src/pipeline.js'
import { tempProject, withKeys } from './project.js'
import type { RunFs } from '../src/node-env.js'

const EPIC = 'features/design-pipeline-epic/design-pipeline.epic.md'
const BULK = 'features/design-pipeline-epic/design-pipeline.bulk.md'

/** A filesystem that refuses to rename onto one path, everything else untouched. */
const failingOn = (fs: RunFs, needle: string): RunFs => ({
  ...fs,
  rename: async (from, to) => {
    if (to.includes(needle)) throw new Error(`EACCES rename ${to}`)
    return fs.rename(from, to)
  }
})

describe('write failures — exit 4', () => {
  it('reports exit 4 and leaves the target file as it was', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const deps = project.deps()
    const before = project.read(EPIC)

    const report = await runRefresh(project.dir('design-pipeline-epic'), {
      ...deps,
      fs: failingOn(deps.fs, 'design-pipeline.bulk.md')
    })

    expect(report.exitCode).toBe(4)
    expect(report.warnings.some((w) => w.includes('write failed'))).toBe(true)
    expect(project.exists('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(false)
    expect(project.read(EPIC)).toBe(before)
  })

  it('names the files already replaced when the failure hits mid-run', async () => {
    const project = tempProject(['design-pipeline-epic'])
    project.write(EPIC, withKeys(project.read(EPIC)))
    project.write(
      'features/design-pipeline-epic/roadmap-skill.design.md',
      `${project.read('features', 'design-pipeline-epic', 'roadmap-skill.design.md').replace(/^## Open Questions & Gaps[\s\S]*$/m, '')}## Open Questions & Gaps\n\n- OQ-ROADMAP-1: q ?\n- Proposition: p\n- Resolution:\n`
    )
    const deps = project.deps()
    await runRefresh(project.dir('design-pipeline-epic'), deps)
    project.write(BULK, project.read(BULK).replace(/- Resolution:/g, '- Resolution: lgtm'))

    const report = await runResolve(project.dir('design-pipeline-epic'), {
      ...deps,
      fs: failingOn(deps.fs, 'roadmap-skill.design.md')
    })

    expect(report.exitCode).toBe(4)
    expect(report.warnings.some((w) => w.includes('already replaced'))).toBe(true)
    // The epic went through before the failure; the design doc did not.
    expect(project.read(EPIC)).toContain('- Resolution: lgtm')
    expect(project.read('features', 'design-pipeline-epic', 'roadmap-skill.design.md')).toContain('- OQ-ROADMAP-1: q ?\n- Proposition: p\n- Resolution:\n')
  })

  it('leaves no temporary file behind on a clean run', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const { readdirSync } = await import('node:fs')
    expect(readdirSync(project.dir('design-pipeline-epic')).filter((n) => n.includes('.tmp'))).toEqual([])
  })
})
