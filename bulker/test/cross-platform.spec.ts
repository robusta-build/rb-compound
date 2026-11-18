import { describe, expect, it } from 'vitest'
import { runRefresh, runResolve } from '../src/pipeline.js'
import { tempProject, type TempProject } from './project.js'

const STORY = 'features/better-bulkman/better-bulkman.story.md'
const BULK = 'features/better-bulkman/better-bulkman.bulk.md'

const KEYED_SECTION = [
  '',
  '## Open Questions & Gaps',
  '',
  '- OQ-BULKER-1: faut-il publier sous `@robusta` ou garder l\'install locale ?',
  '- Proposition : publier sous `@robusta`, le nom nu étant pris.',
  '- Rationale : l\'invocation reste `bulker` grâce au champ `bin`.',
  '- Resolution:',
  ''
].join('\n')

/** The real story, given a keyed section and CRLF endings — Wendel's file on Windows 11. */
function crlfStory(): TempProject {
  const project = tempProject(['better-bulkman'])
  const text = (project.read(STORY) + KEYED_SECTION).replace(/\r?\n/g, '\r\n')
  project.write(STORY, text)
  return project
}

describe('CRLF and path separators — AC-BULKER-09', () => {
  it('accepts a relative target written with backslashes', async () => {
    const project = crlfStory()
    const report = await runRefresh('features\\better-bulkman', project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.bulk.action).toBe('written')
    expect(project.exists('features', 'better-bulkman', 'better-bulkman.bulk.md')).toBe(true)
  })

  it('keeps every line of a CRLF source ending in CRLF, the copied Resolution included', async () => {
    const project = crlfStory()
    await runRefresh('features\\better-bulkman', project.deps())
    project.write(BULK, project.read(BULK).replace('- Resolution:', '- Resolution: publier sous `@robusta`'))

    const report = await runResolve('features\\better-bulkman', project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied.map((r) => r.key)).toEqual(['OQ-BULKER-1'])
    const story = project.read(STORY)
    expect(story.match(/(?<!\r)\n/g)).toBeNull()
    expect(story).toContain('- Rationale : l\'invocation reste `bulker` grâce au champ `bin`.\r\n- Resolution: publier sous `@robusta`\r\n')
  })

  it('lands a multi-line Resolution with its continuation lines, and changes nothing else', async () => {
    const project = crlfStory()
    await runRefresh('features\\better-bulkman', project.deps())
    const before = project.read(STORY)
    project.write(BULK, project.read(BULK).replace('- Resolution:', '- Resolution: publier sous `@robusta`,\nmais garder l\'install locale\n  pour le poste de dev'))

    await runResolve('features\\better-bulkman', project.deps())

    const after = project.read(STORY)
    expect(after.match(/(?<!\r)\n/g)).toBeNull()
    expect(after).toBe(before.replace(
      '- Resolution:\r\n',
      '- Resolution: publier sous `@robusta`,\r\nmais garder l\'install locale\r\n  pour le poste de dev\r\n'
    ))
  })

  it('accepts an absolute target and a trailing separator alike', async () => {
    const project = crlfStory()
    expect((await runRefresh(project.dir('better-bulkman'), project.deps())).exitCode).toBe(0)
    expect((await runRefresh(`${project.dir('better-bulkman')}/`, project.deps())).exitCode).toBe(0)
  })
})

describe('brainstorm — R-BULKRESOLVE-04', () => {
  it('receives the Resolution like any other document, and keeps its entry', async () => {
    const project = tempProject(['better-bulkman'])
    project.write('features/better-bulkman/better-bulkman.brainstorm.md',
      `# Brainstorm\n\n**Infix :** BULKER\n${KEYED_SECTION}`)
    await runRefresh(project.dir('better-bulkman'), project.deps())
    project.write(BULK, project.read(BULK).replace('- Resolution:', '- Resolution: lgtm'))

    const report = await runResolve(project.dir('better-bulkman'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied).toHaveLength(1)
    const brainstorm = project.read('features', 'better-bulkman', 'better-bulkman.brainstorm.md')
    expect(brainstorm).toBe(`# Brainstorm\n\n**Infix :** BULKER\n${KEYED_SECTION.replace('- Resolution:', '- Resolution: lgtm')}`)
    expect(report.followUps).toEqual([
      'storyman update better-bulkman avec brainstorm — 1 entry resolved in better-bulkman.brainstorm.md'
    ])
  })
})

describe('design doc — the follow-up', () => {
  it('recommends `designman update`, copies `lgtm` and rewrites no Status', async () => {
    const project = tempProject(['better-bulkman'])
    const design = 'features/better-bulkman/better-bulkman.design.md'
    const before = project.read(design) + KEYED_SECTION
    project.write(design, before)
    await runRefresh(project.dir('better-bulkman'), project.deps())
    project.write(BULK, project.read(BULK).replace('- Resolution:', '- Resolution: lgtm'))

    const report = await runResolve(project.dir('better-bulkman'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.followUps).toEqual(['designman update better-bulkman — 1 entry resolved in better-bulkman.design.md'])
    expect(project.read(design)).toBe(before.replace('- Resolution:\n', '- Resolution: lgtm\n'))
  })
})
