import { describe, expect, it } from 'vitest'
import { runRefresh } from '../src/pipeline.js'
import { tempProject } from './project.js'

describe('refresh on the real corpus — R-BULKER-41 to R-BULKER-45', () => {
  it('aggregates the epic folder and writes exactly one file', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const before = project.read('features', 'design-pipeline-epic', 'design-pipeline.epic.md')
    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.bulk.action).toBe('written')
    expect(project.exists('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(true)
    // R-BULKER-41: refresh never opens a source for writing.
    expect(project.read('features', 'design-pipeline-epic', 'design-pipeline.epic.md')).toBe(before)
  })

  it('copies the French-spaced entries byte for byte — AC-BULKER-04', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const bulk = project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')
    const epic = project.read('features', 'design-pipeline-epic', 'design-pipeline.epic.md')

    for (const line of epic.split('\n')) {
      if (/^- (Open Question \d+|Proposition|Rationale) :/.test(line)) {
        expect(bulk, line).toContain(line)
      }
    }
    expect(bulk).toContain('- Open Question 3 : Où définir le glossaire UL quand le projet cible n\'a pas de README adapté ?')
  })

  it('is idempotent: a second run leaves the bytes and the mtime alone — AC-BULKER-01, R-BULKER-43', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const first = project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')
    const mtime = project.mtime('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')

    const second = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(second.bulk.action).toBe('unchanged')
    expect(project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(first)
    expect(project.mtime('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(mtime)
  })

  it('stays unchanged on a later day too — the stamp does not move on its own', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const first = project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')

    const later = await runRefresh(project.dir('design-pipeline-epic'), project.deps({ today: '2027-01-01' }))

    expect(later.bulk.action).toBe('unchanged')
    expect(project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(first)
    expect(first).toContain('**Last update:** 2026-08-08')
  })

  it('preserves a Resolution filled in the bulk and reports the rest pending', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const path = 'features/design-pipeline-epic/design-pipeline.bulk.md'
    project.write(path, project.read(path).replace('- Resolution:\n\n- Open Question 4', '- Resolution: README du projet\n\n- Open Question 4'))

    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(project.read(path)).toContain('- Resolution: README du projet')
    expect(report.pending).toHaveLength(2)
  })

  it('lets the source win when both sides answered: the entry leaves the bulk, named once — R-BULKRESOLVE-81, R-BULKRESOLVE-82', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const bulkPath = 'features/design-pipeline-epic/design-pipeline.bulk.md'
    const epicPath = 'features/design-pipeline-epic/design-pipeline.epic.md'
    project.write(bulkPath, project.read(bulkPath).replace('- Resolution:', '- Resolution: bulk answer'))
    project.write(epicPath, project.read(epicPath).replace('- Resolution:', '- Resolution: source answer'))
    const epicBefore = project.read(epicPath)

    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    const bulk = project.read(bulkPath)
    expect(bulk).not.toContain('CONFLICT')
    expect(bulk).not.toContain('bulk answer')
    expect(bulk).not.toContain('Open Question 3 :')
    expect(project.read(epicPath)).toBe(epicBefore)
    expect(report.skipped).toEqual([
      { key: null, head: expect.stringContaining('Open Question 3'), source: 'design-pipeline.epic.md', reason: 'answered-in-source' }
    ])
    expect(report.warnings.some((w) => w.includes('CONFLICT'))).toBe(false)

    const following = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(following.skipped).toEqual([])
  })

  it('drops an entry whose source carries the same Resolution and names it nowhere — AC-BULKRESOLVE-5', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const bulkPath = 'features/design-pipeline-epic/design-pipeline.bulk.md'
    const epicPath = 'features/design-pipeline-epic/design-pipeline.epic.md'
    project.write(bulkPath, project.read(bulkPath).replace('- Resolution:', '- Resolution: lgtm'))
    project.write(epicPath, project.read(epicPath).replace('- Resolution:', '- Resolution:  lgtm '))

    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.skipped).toEqual([])
    expect(project.read(bulkPath)).not.toContain('Open Question 3 :')
    expect(project.read(bulkPath)).toContain('Open Question 4 :')
  })

  it('refuses to rebuild a bulk still carrying a CONFLICT line, naming its path and line — R-BULKRESOLVE-83', async () => {
    const project = tempProject(['design-pipeline-epic'])
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const bulkPath = 'features/design-pipeline-epic/design-pipeline.bulk.md'
    project.write(bulkPath, project.read(bulkPath).replace('- Resolution:', '- CONFLICT: two answers\n- Resolution:'))
    const bulkBefore = project.read(bulkPath)
    const conflictLine = bulkBefore.split('\n').indexOf('- CONFLICT: two answers') + 1

    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(1)
    expect(report.unparsable).toEqual([{ path: expect.stringContaining('design-pipeline.bulk.md'), line: conflictLine, reason: expect.any(String) }])
    expect(report.warnings.some((w) => w.includes(`design-pipeline.bulk.md:${conflictLine}`))).toBe(true)
    expect(project.read(bulkPath)).toBe(bulkBefore)
  })

  it('carries a keyless entry on its legacy identity and names it once — R-BULKER-45, AC-BULKER-11', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    const keyless = report.warnings.filter((w) => w.includes('keyless entry'))
    // The three pending entries of the epic: the five of roadmap-skill.design.md are answered in their source.
    expect(keyless).toHaveLength(3)
    expect(keyless[0]).toContain('key it before `bulker resolve`')
    expect(project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md'))
      .toContain('- Open Question 3 : Où définir le glossaire UL')
  })

  it('warns once per legacy-heading file and takes nothing from it — R-BULKER-23', async () => {
    const project = tempProject(['statusline'])
    const report = await runRefresh(project.dir('statusline'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.warnings.filter((w) => w.includes('legacy heading'))).toHaveLength(3)
    expect(report.bulk.action).toBe('none')
    expect(project.exists('features', 'statusline', 'statusline.bulk.md')).toBe(false)
  })

  it('writes no bulk at all for a feature whose stories have no section', async () => {
    const project = tempProject(['better-bulkman'])
    const report = await runRefresh(project.dir('better-bulkman'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.bulk.action).toBe('none')
    expect(project.exists('features', 'better-bulkman', 'better-bulkman.bulk.md')).toBe(false)
  })

  it('deletes a bulk left with nothing in it — R-BULKER-41', async () => {
    const project = tempProject(['better-bulkman'])
    project.write('features/better-bulkman/better-bulkman.bulk.md', '# Epic BULKER\n\n**Last update:** 2026-08-01\n**Epic:** better-bulkman\n\nstale.\n')

    const report = await runRefresh(project.dir('better-bulkman'), project.deps())

    expect(report.bulk.action).toBe('deleted')
    expect(project.exists('features', 'better-bulkman', 'better-bulkman.bulk.md')).toBe(false)
  })

  it('skips an unparsable document and aggregates the others — AC-BULKER-03, R-BULKER-44', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const designPath = 'features/design-pipeline-epic/roadmap-skill.design.md'
    const before = project.read(designPath)
    project.write(designPath, before.replace('- Gap 1:', '- Depends on: broken\n- Gap 1:'))

    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.unparsable).toHaveLength(1)
    expect(report.unparsable[0]!.path).toContain('roadmap-skill.design.md')
    // The clean document still reaches the bulk, and no source was modified.
    expect(project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toContain('Open Question 3')
    expect(project.read(designPath)).toBe(before.replace('- Gap 1:', '- Depends on: broken\n- Gap 1:'))
  })

  it('writes nothing under --dry-run but returns the real exit code — R-BULKER-06', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps({ dryRun: true }))

    expect(report.exitCode).toBe(0)
    expect(report.bulk.action).toBe('written')
    expect(project.exists('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(false)
  })

  it('refuses a target outside the project before reading anything — AC-BULKER-02, R-BULKER-03', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const report = await runRefresh('/etc', project.deps())

    expect(report.exitCode).toBe(2)
    expect(report.warnings[0]).toContain('outside the current Claude project')
    expect(report.bulk.action).toBe('none')
  })

  it('orders the bulk epic first, then by lexicographic path', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const designPath = 'features/design-pipeline-epic/roadmap-skill.design.md'
    project.write(designPath, `${project.read(designPath)}\n- Gap 6: still pending\n- Resolution:\n`)
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    const bulk = project.read('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')

    expect(bulk.indexOf('### Epic OQ (design-pipeline.epic.md)'))
      .toBeLessThan(bulk.indexOf('### Design OQ (roadmap-skill.design.md)'))
  })
})
