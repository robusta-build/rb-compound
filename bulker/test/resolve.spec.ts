import { describe, expect, it } from 'vitest'
import type { RunFs } from '../src/node-env.js'
import { runRefresh, runResolve } from '../src/pipeline.js'
import { tempProject, withKeys, type TempProject } from './project.js'

const EPIC = 'features/design-pipeline-epic/design-pipeline.epic.md'
const BULK = 'features/design-pipeline-epic/design-pipeline.bulk.md'
const DESIGN = 'features/design-pipeline-epic/roadmap-skill.design.md'
const STORY = 'features/design-pipeline-epic/roadmap-skill.story.md'
const NEW_QUESTION = '- OQ-ROADMAP-7: a question asked since the last gathering?'

/** The real epic, keyed as Dep 1 will key it, with its bulk built by a first `refresh`. */
async function keyedEpic(): Promise<TempProject> {
  const project = tempProject(['design-pipeline-epic'])
  project.write(EPIC, withKeys(project.read(EPIC)))
  // roadmap-skill.design.md stays keyless on purpose: it is the real state of that file.
  project.write(DESIGN, project.read(DESIGN).replace(/^## Open Questions & Gaps[\s\S]*$/m, ''))
  await runRefresh(project.dir('design-pipeline-epic'), project.deps())
  return project
}

const answer = (project: TempProject, key: string, value: string): void => {
  const bulk = project.read(BULK)
  const start = bulk.search(new RegExp(`^- ${key} ?:`, 'm'))
  expect(start, `${key} in bulk`).toBeGreaterThan(-1)
  const at = bulk.indexOf('- Resolution:', start)
  project.write(BULK, bulk.slice(0, at) + `- Resolution: ${value}` + bulk.slice(at + '- Resolution:'.length))
}

/** A story of the epic receives a question after the bulk was gathered. */
const askSince = (project: TempProject): void =>
  project.write(STORY, `# Story\n\n## Open Questions & Gaps\n\n${NEW_QUESTION}\n- Proposition: yes\n- Resolution:\n`)

/** A filesystem that refuses to rename onto one path, everything else untouched. */
const failingOn = (fs: RunFs, needle: string): RunFs => ({
  ...fs,
  rename: async (from, to) => {
    if (to.includes(needle)) throw new Error(`EACCES rename ${to}`)
    return fs.rename(from, to)
  }
})

/** The owner's fold, as storyman update or epicman update would do it: the entry leaves its source. */
const integrate = (project: TempProject, path: string, key: string): void => {
  const text = project.read(path)
  const start = text.search(new RegExp(`^- ${key} ?:`, 'm'))
  const end = text.indexOf('\n\n', start)
  project.write(path, text.slice(0, start) + text.slice(end + 2))
}

const diff = (before: string, after: string) => {
  const beforeLines = before.split('\n')
  const afterLines = after.split('\n')
  return {
    added: afterLines.filter((line) => !beforeLines.includes(line)),
    removed: beforeLines.filter((line) => !afterLines.includes(line))
  }
}

describe('resolve — the one copy, AC-BULKRESOLVE-1 and AC-BULKRESOLVE-2', () => {
  it('copies a free-text answer verbatim and keeps the question, Proposition and Rationale', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-3'])
    const epic = project.read(EPIC)
    expect(epic).toContain([
      '- OQ-DESIGNDOC-3 : Où définir le glossaire UL quand le projet cible n\'a pas de README adapté ?',
      '- Proposition : README du projet par défaut',
    ].join('\n'))
    expect(epic).toContain('- Rationale : cohérence de niveau projet entre le glossaire UL et le registre BR.\n- Resolution: README du projet cible\n')
    expect(epic).not.toContain('2026-08-08')
  })

  it('changes exactly one line of the document, inside the section — R-BULKRESOLVE-02', async () => {
    const project = await keyedEpic()
    const before = project.read(EPIC)
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')

    await runResolve(project.dir('design-pipeline-epic'), project.deps())

    const after = project.read(EPIC)
    expect(after.split('\n')).toHaveLength(before.split('\n').length)
    expect(diff(before, after).added).toEqual(['- Resolution: README du projet cible'])
    expect(after.replace('- Resolution: README du projet cible', '- Resolution:')).toBe(before)
  })

  it('copies `lgtm` as `lgtm`, never the Proposition — R-BULKRESOLVE-03', async () => {
    const project = await keyedEpic()
    const before = project.read(EPIC)
    answer(project, 'OQ-DESIGNDOC-4', 'lgtm')

    await runResolve(project.dir('design-pipeline-epic'), project.deps())

    const epic = project.read(EPIC)
    expect(diff(before, epic).added).toEqual(['- Resolution: lgtm'])
    expect(epic).toContain('- Rationale : storyman a le contexte de l\'Infix, epicman a la vue registre globale.\n- Resolution: lgtm\n')
  })

  it('copies the last pending entries and keeps the source section until its owner integrates them', async () => {
    const project = await keyedEpic()
    for (const key of ['OQ-DESIGNDOC-3', 'OQ-DESIGNDOC-4', 'OQ-DESIGNDOC-5']) answer(project, key, 'lgtm')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.applied).toHaveLength(3)
    expect(project.read(EPIC).split('\n')).toContain('## Open Questions & Gaps')
  })

  it('drops the copied entries from the resynced bulk, the source keeping question, Proposition and Resolution — AC-BULKRESOLVE-5', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.bulk.action).toBe('written')
    const bulk = project.read(BULK)
    expect(bulk).not.toContain('OQ-DESIGNDOC-3')
    expect(bulk).toContain('OQ-DESIGNDOC-4')
    expect(bulk).toContain('OQ-DESIGNDOC-5')
    expect(bulk.match(/^- Resolution:.+$/gm)).toBeNull()
    expect(report.pending.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-4', 'OQ-DESIGNDOC-5'])
    expect(project.read(EPIC)).toContain('- Proposition : README du projet par défaut')
  })

  it('deletes the bulk in the same run when the last pending entries are copied — R-BULKRESOLVE-81', async () => {
    const project = await keyedEpic()
    for (const key of ['OQ-DESIGNDOC-3', 'OQ-DESIGNDOC-4', 'OQ-DESIGNDOC-5']) answer(project, key, 'lgtm')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied).toHaveLength(3)
    expect(report.bulk.action).toBe('deleted')
    expect(report.pending).toEqual([])
    expect(project.exists(BULK)).toBe(false)
  })
})

describe('resolve — the bulk resynced in the same run, AC-BULKFLOW-2', () => {
  it('copies the answers and lets a question asked since into the bulk — R-BULKFLOW-03', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    askSince(project)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-3'])
    expect(project.read(EPIC)).toContain('- Resolution: README du projet cible\n')
    expect(report.bulk.action).toBe('written')
    expect(project.read(BULK)).toContain(NEW_QUESTION)
  })

  it('takes `pending` from the resynced bulk and the outcome of each entry from the copy — R-BULKFLOW-07', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    askSince(project)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.pending.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-4', 'OQ-DESIGNDOC-5', 'OQ-ROADMAP-7'])
    expect(report.skipped.map((s) => s.key)).toEqual(['OQ-DESIGNDOC-4', 'OQ-DESIGNDOC-5'])
    expect(report.followUps).toEqual(['epicman update design-pipeline — 1 entry resolved in design-pipeline.epic.md'])
  })

  it('adds the warnings the gathering emits — R-BULKFLOW-07', async () => {
    const project = await keyedEpic()
    project.write(STORY, '# Story\n\n## Open Questions & Gaps\n\n- Open Question 1 : a keyless question?\n- Resolution:\n')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.warnings.filter((w) => w.startsWith('keyless entry carried'))).toHaveLength(1)
  })

  it('rebuilds the bulk even when nothing is copied', async () => {
    const project = await keyedEpic()
    askSince(project)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.applied).toEqual([])
    expect(report.bulk.action).toBe('written')
    expect(project.read(BULK)).toContain(NEW_QUESTION)
  })

  it('writes nothing on a second resolve, neither source nor bulk — R-BULKFLOW-06', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    askSince(project)
    await runResolve(project.dir('design-pipeline-epic'), project.deps())
    const files = [EPIC, STORY, DESIGN, BULK]
    const before = files.map((file) => [project.read(file), project.mtime(file)])

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied).toEqual([])
    expect(report.bulk.action).toBe('unchanged')
    expect(files.map((file) => [project.read(file), project.mtime(file)])).toEqual(before)
  })

  it('writes the sources before the bulk, and a second resolve repairs an exit 4 without writing a source — R-BULKFLOW-03', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    askSince(project)
    const deps = project.deps()

    const failed = await runResolve(project.dir('design-pipeline-epic'), { ...deps, fs: failingOn(deps.fs, 'design-pipeline.bulk.md') })

    expect(failed.exitCode).toBe(4)
    expect(failed.warnings.find((w) => w.startsWith('already replaced'))).toContain('design-pipeline.epic.md')
    expect(project.read(EPIC)).toContain('- Resolution: README du projet cible\n')
    expect(project.read(BULK)).not.toContain(NEW_QUESTION)

    const epicAfterFailure = project.read(EPIC)

    const repaired = await runResolve(project.dir('design-pipeline-epic'), deps)

    expect(repaired.exitCode).toBe(0)
    expect(repaired.applied).toEqual([])
    expect(repaired.followUps).toEqual([])
    expect(repaired.skipped.find((s) => s.key === 'OQ-DESIGNDOC-3')).toBeUndefined()
    expect(repaired.bulk.action).toBe('written')
    expect(project.read(EPIC)).toBe(epicAfterFailure)
    expect(project.read(BULK)).toContain(NEW_QUESTION)
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-3')
  })
})

describe('resolve — the follow-ups, R-BULKRESOLVE-41 and AC-BULKRESOLVE-4', () => {
  it('names the integrator of the one document written', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    answer(project, 'OQ-DESIGNDOC-4', 'lgtm')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.followUps).toEqual(['epicman update design-pipeline — 2 entries resolved in design-pipeline.epic.md'])
  })

  it('gives one line per written document, epic first then by path — R-BULKFLOW-09', async () => {
    /*
     * The epic folder holds four documents with a filled entry each: the epic, the design doc,
     * a brainstorm and a story. A fifth, `aaa.story.md`, carries only a pending entry and is
     * not written, so it gets no line even though its path sorts first.
     */
    const project = await keyedEpic()
    const section = (key: string) => `\n## Open Questions & Gaps\n\n- ${key}: a question?\n- Proposition: yes\n- Resolution:\n`
    project.write(DESIGN, project.read(DESIGN) + section('OQ-ROADMAP-1'))
    project.write('features/design-pipeline-epic/roadmap-skill.brainstorm.md', `# Brainstorm\n${section('OQ-ROADMAP-2')}`)
    project.write('features/design-pipeline-epic/roadmap-skill.story.md', `# Story\n${section('OQ-ROADMAP-3')}`)
    project.write('features/design-pipeline-epic/aaa.story.md', `# Story\n${section('OQ-AAAAA-1')}`)
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    for (const key of ['OQ-DESIGNDOC-5', 'OQ-ROADMAP-1', 'OQ-ROADMAP-2', 'OQ-ROADMAP-3']) answer(project, key, 'lgtm')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.followUps).toEqual([
      'epicman update design-pipeline — 1 entry resolved in design-pipeline.epic.md',
      'storyman update roadmap-skill avec brainstorm — 1 entry resolved in roadmap-skill.brainstorm.md',
      'designman update roadmap-skill — 1 entry resolved in roadmap-skill.design.md',
      'storyman update roadmap-skill — 1 entry resolved in roadmap-skill.story.md'
    ])
    const brainstorm = project.read('features', 'design-pipeline-epic', 'roadmap-skill.brainstorm.md')
    expect(brainstorm).toContain('- OQ-ROADMAP-2: a question?\n- Proposition: yes\n- Resolution: lgtm\n')
  })
})

describe('resolve — idempotence and the owner fold, AC-BULKRESOLVE-5 and AC-BULKRESOLVE-6', () => {
  it('writes no source on a second run, the copied entries already out of the bulk — R-BULKRESOLVE-21', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    await runResolve(project.dir('design-pipeline-epic'), project.deps())
    const epicBefore = project.read(EPIC)
    const mtime = project.mtime(EPIC)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied).toEqual([])
    expect(report.skipped.find((s) => s.key === 'OQ-DESIGNDOC-3')).toBeUndefined()
    expect(report.followUps).toEqual([])
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-3')
    expect(project.read(EPIC)).toBe(epicBefore)
    expect(project.mtime(EPIC)).toBe(mtime)
  })

  it('skips an entry its owner integrated before any refresh as `not-in-source`, without failing — R-BULKRESOLVE-22', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    integrate(project, EPIC, 'OQ-DESIGNDOC-3')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.refused).toEqual([])
    expect(report.skipped.find((s) => s.key === 'OQ-DESIGNDOC-3')?.reason).toBe('not-in-source')
  })

  it('drops the entries an older resolve left in the bulk, writing no source and naming none — trwg case', async () => {
    const project = await keyedEpic()
    for (const key of ['OQ-DESIGNDOC-3', 'OQ-DESIGNDOC-4']) answer(project, key, 'lgtm')
    const leftover = project.read(BULK)
    await runResolve(project.dir('design-pipeline-epic'), project.deps())
    project.write(BULK, leftover)
    const epicBefore = project.read(EPIC)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied).toEqual([])
    expect(report.skipped.map((s) => s.key)).toEqual(['OQ-DESIGNDOC-5'])
    expect(report.followUps).toEqual([])
    expect(project.read(EPIC)).toBe(epicBefore)
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-3')
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-4')
  })

  it('never overwrites a Resolution answered by hand in the source, names it once and still copies the others — R-BULKRESOLVE-82', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'bulk answer')
    answer(project, 'OQ-DESIGNDOC-4', 'lgtm')
    const epic = project.read(EPIC)
    project.write(EPIC, epic.replace('- Resolution:', '- Resolution: answered by hand'))

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.skipped.filter((s) => s.key === 'OQ-DESIGNDOC-3')).toEqual([
      { key: 'OQ-DESIGNDOC-3', head: expect.stringContaining('OQ-DESIGNDOC-3'), source: 'design-pipeline.epic.md', reason: 'answered-in-source' }
    ])
    expect(report.applied.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-4'])
    const after = project.read(EPIC)
    expect(after).toContain('- Resolution: answered by hand\n')
    expect(after).not.toContain('bulk answer')
    expect(after).toContain('globale.\n- Resolution: lgtm\n')
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-3')

    const following = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(following.skipped.find((s) => s.key === 'OQ-DESIGNDOC-3')).toBeUndefined()
  })

  it('compares trimmed values, so a source differing by spaces is dropped and named nowhere', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'same answer')
    project.write(EPIC, project.read(EPIC).replace('- Resolution:', '- Resolution:   same answer  '))
    const epicBefore = project.read(EPIC)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.skipped.find((s) => s.key === 'OQ-DESIGNDOC-3')).toBeUndefined()
    expect(report.applied).toEqual([])
    expect(project.read(EPIC)).toBe(epicBefore)
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-3')
  })
})

describe('resolve — preflight', () => {
  it('refuses a drifted question with zero writes anywhere — R-BULKRESOLVE-23', async () => {
    const project = await keyedEpic()
    project.write(DESIGN, `${project.read(DESIGN)}\n## Open Questions & Gaps\n\n- OQ-ROADMAP-1: q?\n- Proposition: p\n- Resolution:\n`)
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    answer(project, 'OQ-ROADMAP-1', 'lgtm')
    answer(project, 'OQ-DESIGNDOC-3', 'an answer')
    answer(project, 'OQ-DESIGNDOC-4', 'another answer')
    project.write(EPIC, project.read(EPIC).replace('- OQ-DESIGNDOC-3 : Où définir', '- OQ-DESIGNDOC-3 : Où placer'))
    const epicBefore = project.read(EPIC)
    const designBefore = project.read(DESIGN)
    const bulkBefore = project.read(BULK)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(3)
    expect(report.refused).toEqual([{ key: 'OQ-DESIGNDOC-3', head: expect.stringContaining('OQ-DESIGNDOC-3'), source: 'design-pipeline.epic.md', reason: 'drift', label: 'question no longer matches its source — run `bulker <target>`, then re-read the question' }])
    expect(report.applied).toEqual([])
    expect(report.followUps).toEqual([])
    expect(project.read(EPIC)).toBe(epicBefore)
    expect(project.read(DESIGN)).toBe(designBefore)
    expect(project.read(BULK)).toBe(bulkBefore)
  })

  it('lets no question asked since into the bulk when another question drifted — R-BULKFLOW-04', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'an answer')
    askSince(project)
    project.write(EPIC, project.read(EPIC).replace('- OQ-DESIGNDOC-3 : Où définir', '- OQ-DESIGNDOC-3 : Où placer'))
    const epicBefore = project.read(EPIC)
    const bulkBefore = project.read(BULK)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(3)
    expect(report.refused.map((r) => r.reason)).toEqual(['drift'])
    expect(report.bulk.action).toBe('unchanged')
    expect(report.pending).toEqual([])
    expect(project.read(EPIC)).toBe(epicBefore)
    expect(project.read(BULK)).toBe(bulkBefore)
  })

  it('copies an entry carrying a `Route` line like any other, its Route lines unchanged — R-RULESOUT-41', async () => {
    const project = await keyedEpic()
    project.write(EPIC, project.read(EPIC)
      .replace('le registre BR.\n- Resolution:', 'le registre BR.\n- Route: epicman\n- Resolution:')
      .replace('vue registre globale.\n- Resolution:', 'vue registre globale.\n- Route: epicman\n- Resolution:'))
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    answer(project, 'OQ-DESIGNDOC-3', 'record it')

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.refused).toEqual([])
    expect(report.applied.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-3'])
    expect(project.read(EPIC)).toContain('le registre BR.\n- Route: epicman\n- Resolution: record it\n')
    expect(project.read(BULK)).toMatch(/^- OQ-DESIGNDOC-4 ?:[^\n]*\n(?:- (?!OQ-|Gap-)[^\n]*\n)*?- Route: epicman\n- Resolution:\n/m)
  })

  it('refuses a keyless entry rather than guessing its source — AC-BULKER-10', async () => {
    const project = await keyedEpic()
    project.write(BULK, project.read(BULK).replace('- OQ-DESIGNDOC-3 :', '- Open Question 3 :'))
    answer(project, 'Open Question 3', 'some answer')
    const epicBefore = project.read(EPIC)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(3)
    expect(report.refused.map((r) => r.reason)).toEqual(['no-key'])
    expect(report.refused[0]!.key).toBeNull()
    expect(report.refused[0]!.head).toContain('Open Question 3')
    expect(project.read(EPIC)).toBe(epicBefore)
  })

  it('aborts on an unparsable document, the clean ones included — AC-BULKER-07', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    project.write(DESIGN, `${project.read(DESIGN)}\n## Open Questions & Gaps\n\n- OQ-ROADMAP-9: q\n- Depends on: broken\n`)
    const epicBefore = project.read(EPIC)
    const bulkBefore = project.read(BULK)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(3)
    expect(report.unparsable).toHaveLength(1)
    expect(report.applied).toEqual([])
    expect(project.read(EPIC)).toBe(epicBefore)
    expect(project.read(BULK)).toBe(bulkBefore)
  })

  it('refuses nothing for an entry whose source already holds a Resolution, routed or drifted — R-BULKRESOLVE-24', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'record it')
    answer(project, 'OQ-DESIGNDOC-4', 'lgtm')
    project.write(BULK, project.read(BULK).replace('- Resolution: record it', '- Route: epicman\n- Resolution: record it'))
    project.write(EPIC, project.read(EPIC)
      .replace('- Resolution:', '- Resolution: recorded by epicman')
      .replace('- OQ-DESIGNDOC-4 : ', '- OQ-DESIGNDOC-4 : Drifted — ')
      .replace('globale.\n- Resolution:', 'globale.\n- Resolution: lgtm'))

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.refused).toEqual([])
    expect(report.applied).toEqual([])
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-3')
    expect(project.read(BULK)).not.toContain('OQ-DESIGNDOC-4')
  })

  it('names every offender at once rather than stopping at the first', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'answer three')
    answer(project, 'OQ-DESIGNDOC-4', 'answer four')
    answer(project, 'OQ-DESIGNDOC-5', 'answer five')
    project.write(BULK, project.read(BULK)
      .replace('- OQ-DESIGNDOC-4 :', '- Open Question 4 :'))
    project.write(EPIC, project.read(EPIC).replace('- OQ-DESIGNDOC-5 : ', '- OQ-DESIGNDOC-5 : Drifted — '))

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(3)
    expect(report.refused.map((r) => r.reason).sort()).toEqual(['drift', 'no-key'])
  })
})

describe('resolve — the other skips', () => {
  it('skips an empty Resolution and keeps it pending', async () => {
    const project = await keyedEpic()
    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.applied).toEqual([])
    expect(report.pending).toHaveLength(3)
    expect(report.skipped.every((s) => s.reason === 'empty-resolution')).toBe(true)
  })

  it('refuses a bulk still carrying a CONFLICT line, naming its path and line — R-BULKRESOLVE-83', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'bulk answer')
    project.write(BULK, project.read(BULK).replace('- Resolution: bulk answer', '- CONFLICT: two answers\n- Resolution: bulk answer'))
    const epicBefore = project.read(EPIC)
    const conflictLine = project.read(BULK).split('\n').indexOf('- CONFLICT: two answers') + 1

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(3)
    expect(report.unparsable).toEqual([{ path: expect.stringContaining('design-pipeline.bulk.md'), line: conflictLine, reason: expect.any(String) }])
    expect(project.read(EPIC)).toBe(epicBefore)
  })
})

describe('resolve — dry run and no bulk', () => {
  it('computes both plans, writes nothing and gives the action the bulk would have received — R-BULKER-06', async () => {
    const project = await keyedEpic()
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    askSince(project)
    const epicBefore = project.read(EPIC)
    const bulkBefore = project.read(BULK)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps({ dryRun: true }))

    expect(report.exitCode).toBe(0)
    expect(report.applied.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-3'])
    expect(report.followUps).toHaveLength(1)
    expect(report.bulk.action).toBe('written')
    expect(project.read(EPIC)).toBe(epicBefore)
    expect(project.read(BULK)).toBe(bulkBefore)
  })

  it('gathers from the sources when no bulk exists, and says so — R-BULKFLOW-05', async () => {
    const project = tempProject(['design-pipeline-epic'])
    project.write(EPIC, withKeys(project.read(EPIC)))

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.phase).toBe('resolve')
    expect(report.applied).toEqual([])
    expect(report.bulk.action).toBe('written')
    expect(report.pending.map((r) => r.key)).toEqual(expect.arrayContaining(['OQ-DESIGNDOC-3', 'OQ-DESIGNDOC-4', 'OQ-DESIGNDOC-5']))
    expect(project.exists('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(true)
    expect(report.warnings).toContain(`no bulk at ${report.bulk.path} — nothing to resolve, gathered from the sources`)
  })
})

describe('resolve — the write surface', () => {
  it('writes the sources it copies into and the bulk, nothing else: no registry, no roadmap', async () => {
    const project = await keyedEpic()
    project.write('ROADMAP.md', '# Roadmap\n\n- item one\n')
    project.write('business-rules.md', '# Business Rules\n\n(empty)\n')
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    askSince(project)
    const bulkBefore = project.read(BULK)
    const untouched = ['ROADMAP.md', 'business-rules.md', 'CLAUDE.md', DESIGN, STORY]
      .map((name) => [name, project.read(name)] as const)

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(project.read(BULK)).not.toBe(bulkBefore)
    for (const [name, before] of untouched) {
      expect(project.read(name), name).toBe(before)
    }
  })
})

describe('the Rloq line — AC-DATACONTRACT-8', () => {
  const RATIONALE_3 = '- Rationale : cohérence de niveau projet entre le glossaire UL et le registre BR.'
  const RESOLUTION_4_PREFIX = '- Rationale : storyman a le contexte de l\'Infix, epicman a la vue registre globale.\n- Resolution:'

  /**
   * The keyed epic, gathered once. OQ-DESIGNDOC-3 carries `Rloq: true` between Rationale
   * and Resolution, OQ-DESIGNDOC-4 carries `Rloq : yes` after its Resolution, OQ-DESIGNDOC-5 none.
   */
  async function epicWithRloq(): Promise<TempProject> {
    const project = tempProject(['design-pipeline-epic'])
    const keyed = withKeys(project.read(EPIC))
      .replace(RATIONALE_3, `${RATIONALE_3}\n- Rloq: true`)
      .replace(RESOLUTION_4_PREFIX, `${RESOLUTION_4_PREFIX}\n- Rloq : yes`)
    project.write(EPIC, keyed)
    project.write(DESIGN, project.read(DESIGN).replace(/^## Open Questions & Gaps[\s\S]*$/m, ''))
    return project
  }

  const entryBlock = (text: string, key: string): string => {
    const start = text.search(new RegExp(`^- ${key} ?:`, 'm'))
    const end = text.indexOf('\n\n', start)
    return text.slice(start, end === -1 ? undefined : end)
  }

  it('gathers a document carrying Rloq lines and renders each between Rationale and Resolution', async () => {
    const project = await epicWithRloq()

    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.unparsable).toEqual([])
    const bulk = project.read(BULK)
    expect(entryBlock(bulk, 'OQ-DESIGNDOC-3')).toContain(`${RATIONALE_3}\n- Rloq: true\n- Resolution:`)
    expect(entryBlock(bulk, 'OQ-DESIGNDOC-4')).toContain(`${RESOLUTION_4_PREFIX.split('\n')[0]}\n- Rloq : yes\n- Resolution:`)
    expect(entryBlock(bulk, 'OQ-DESIGNDOC-5')).not.toContain('Rloq')
  })

  it('carries the current Rloq value at the next gathering', async () => {
    const project = await epicWithRloq()
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    project.write(EPIC, project.read(EPIC).replace('- Rloq: true', '- Rloq: false'))

    const report = await runRefresh(project.dir('design-pipeline-epic'), project.deps())

    expect(report.bulk.action).toBe('written')
    expect(entryBlock(project.read(BULK), 'OQ-DESIGNDOC-3')).toContain('- Rloq: false\n- Resolution:')
    expect(project.read(BULK)).not.toContain('- Rloq: true')
  })

  it('resolves as before, a Rloq change alone is no drift, and the rebuild carries the current value', async () => {
    const project = await epicWithRloq()
    await runRefresh(project.dir('design-pipeline-epic'), project.deps())
    answer(project, 'OQ-DESIGNDOC-3', 'README du projet cible')
    project.write(EPIC, project.read(EPIC).replace('- Rloq : yes', '- Rloq : no'))

    const report = await runResolve(project.dir('design-pipeline-epic'), project.deps())

    expect(report.exitCode).toBe(0)
    expect(report.refused).toEqual([])
    expect(report.applied.map((r) => r.key)).toEqual(['OQ-DESIGNDOC-3'])
    expect(entryBlock(project.read(EPIC), 'OQ-DESIGNDOC-3')).toContain('- Rloq: true\n- Resolution: README du projet cible')
    const bulk = project.read(BULK)
    expect(bulk).not.toContain('OQ-DESIGNDOC-3')
    expect(entryBlock(bulk, 'OQ-DESIGNDOC-4')).toContain('- Rloq : no\n- Resolution:')
    expect(entryBlock(bulk, 'OQ-DESIGNDOC-5')).not.toContain('Rloq')
  })
})
