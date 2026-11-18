import { describe, expect, it } from 'vitest'
import { main, parseArgv, USAGE, VERSION, type Cli } from '../src/cli.js'
import { emptyReport, renderReport } from '../src/report.js'
import { refusalOf } from '../src/refusal.js'
import { tempProject, withKeys } from './project.js'
import type { Report } from '../src/types.js'

interface Run {
  code: number
  out: string
  errOut: string
}

const run = async (argv: string[], cwd: string): Promise<Run> => {
  const out: string[] = []
  const errOut: string[] = []
  const cli: Cli = {
    argv,
    cwd,
    today: '2026-08-08',
    stdout: (text) => out.push(text),
    stderr: (text) => errOut.push(text)
  }
  return { code: await main(cli), out: out.join('\n'), errOut: errOut.join('\n') }
}

describe('parseArgv — R-BULKFLOW-01, R-BULKFLOW-02', () => {
  it('reads a first positional other than `resolve` as the target of a gathering', () => {
    expect(parseArgv(['features/open-question-epic', '--json']))
      .toMatchObject({ command: 'refresh', target: 'features/open-question-epic', json: true, dryRun: false, error: null })
  })

  it('reads `resolve`, its target and its flags', () => {
    expect(parseArgv(['resolve', 'features/x', '--json', '--dry-run']))
      .toMatchObject({ command: 'resolve', target: 'features/x', json: true, dryRun: true, error: null })
  })

  it('keeps `refresh` as a hidden alias of the gathering', () => {
    expect(parseArgv(['refresh', 'features/x'])).toMatchObject({ command: 'refresh', target: 'features/x', error: null })
  })

  it('refuses no target, `resolve` without one, two targets and an unknown option', () => {
    expect(parseArgv([]).error).toMatch(/no target given/)
    expect(parseArgv(['resolve']).error).toMatch(/needs a target/)
    expect(parseArgv(['refresh']).error).toMatch(/no target given/)
    expect(parseArgv(['bulk', 'a']).error).toMatch(/exactly one target, got 2/)
    expect(parseArgv(['resolve', 'a', 'b']).error).toMatch(/exactly one target, got 2/)
    expect(parseArgv(['a', '--wat']).error).toMatch(/unknown option/)
  })

  it('never names `refresh` in an error a human reads', () => {
    for (const argv of [[], ['refresh'], ['refresh', 'a', 'b'], ['a', 'b']]) {
      expect(parseArgv(argv).error).not.toMatch(/refresh/)
    }
  })

  it('reads --help and --version before anything else', () => {
    expect(parseArgv(['--help']).command).toBe('help')
    expect(parseArgv(['x', '--version']).command).toBe('version')
  })
})

describe('exit codes — R-BULKER-04', () => {
  it('0 on a successful gathering, and on a no-op run', async () => {
    const project = tempProject(['design-pipeline-epic'])
    expect((await run(['features/design-pipeline-epic'], project.root)).code).toBe(0)
    expect((await run(['features/design-pipeline-epic'], project.root)).code).toBe(0)
  })

  it('gathers through the hidden `refresh` alias exactly as without a verb', async () => {
    const plain = tempProject(['design-pipeline-epic'])
    const aliased = tempProject(['design-pipeline-epic'])
    const bulk = ['features', 'design-pipeline-epic', 'design-pipeline.bulk.md']
    expect((await run(['features/design-pipeline-epic'], plain.root)).code).toBe(0)
    expect((await run(['refresh', 'features/design-pipeline-epic'], aliased.root)).code).toBe(0)
    expect(aliased.read(...bulk)).toBe(plain.read(...bulk))
  })

  it('1 with USAGE on stderr on no target, `resolve` without one and two targets — R-BULKFLOW-02', async () => {
    const project = tempProject(['better-bulkman'])
    for (const argv of [[], ['resolve'], ['bulk', 'x']]) {
      const result = await run(argv, project.root)
      expect(result.code, argv.join(' ')).toBe(1)
      expect(result.errOut).toContain(USAGE)
    }
  })

  it('1 on a target that does not exist', async () => {
    const project = tempProject(['better-bulkman'])
    expect((await run(['features/nope'], project.root)).code).toBe(1)
  })

  it('2 on a target outside the project — AC-BULKER-02', async () => {
    const project = tempProject(['better-bulkman'])
    const result = await run(['/etc', '--json'], project.root)
    expect(result.code).toBe(2)
    const report = JSON.parse(result.out) as Report
    expect(report.warnings[0]).toContain('outside the current Claude project')
  })

  it('3 on a preflight failure, with nothing written', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const epic = 'features/design-pipeline-epic/design-pipeline.epic.md'
    project.write(epic, withKeys(project.read(epic)))
    await run(['features/design-pipeline-epic'], project.root)
    const bulk = 'features/design-pipeline-epic/design-pipeline.bulk.md'
    project.write(bulk, project.read(bulk).replace(/^- OQ-DESIGNDOC-3 ?:([\s\S]*?)- Resolution:/m, '- Open Question 3 :$1- Resolution: some answer'))
    const before = project.read(epic)

    const result = await run(['resolve', 'features/design-pipeline-epic', '--json'], project.root)

    expect(result.code).toBe(3)
    const refused = (JSON.parse(result.out) as Report).refused
    expect(refused.map(({ reason, label }) => ({ reason, label })))
      .toEqual([{ reason: 'no-key', label: 'no key — key it in its source by hand, resolve never guesses' }])
    expect(project.read(epic)).toBe(before)
  })

  it('0 on --help and --version', async () => {
    const project = tempProject([])
    const help = await run(['--help'], project.root)
    expect(help.code).toBe(0)
    expect(help.out).toBe(USAGE)
    const version = await run(['--version'], project.root)
    expect(version.out).toBe(VERSION)
    expect(VERSION).toBe('0.6.0')
  })

  it('names no `refresh` in USAGE — R-BULKFLOW-02', () => {
    expect(USAGE).not.toMatch(/refresh/)
    expect(USAGE).toContain('bulker <target> [--json] [--dry-run]')
    expect(USAGE).toContain('bulker resolve <target> [--json] [--dry-run]')
  })
})

describe('report output — R-BULKER-05', () => {
  it('--json prints one parseable Report object on stdout', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const result = await run(['features/design-pipeline-epic', '--json'], project.root)

    const report = JSON.parse(result.out) as Report
    expect(report).toMatchObject({ version: 2, phase: 'refresh', exitCode: 0 })
    expect(report.bulk.action).toBe('written')
    expect(report.target).toContain('design-pipeline-epic')
  })

  it('prints the same report as prose without --json', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const result = await run(['features/design-pipeline-epic'], project.root)

    expect(result.out).toMatch(/^bulker — .*design-pipeline-epic$/m)
    expect(result.out).toContain('bulk: written')
    expect(result.out).toContain('exit 0')
    expect(() => JSON.parse(result.out)).toThrow()
  })

  it('sends diagnostics to stderr when the run fails', async () => {
    const project = tempProject(['better-bulkman'])
    const result = await run(['/etc'], project.root)
    expect(result.errOut).toContain('outside the current Claude project')
  })

  it('marks a --dry-run in the prose report and writes nothing', async () => {
    const project = tempProject(['design-pipeline-epic'])
    const result = await run(['features/design-pipeline-epic', '--dry-run'], project.root)

    expect(result.code).toBe(0)
    expect(result.out).toContain('--dry-run')
    expect(project.exists('features', 'design-pipeline-epic', 'design-pipeline.bulk.md')).toBe(false)
  })
})

describe('prose report — R-BULKFLOW-08', () => {
  const ref = { key: 'OQ-X-1', head: '- OQ-X-1: q?', source: 'x.story.md' }
  const drift = refusalOf(ref, 'drift')

  it('names the invocation in its header', () => {
    expect(renderReport(emptyReport('refresh', 'features/x'), false).split('\n')[0]).toBe('bulker — features/x')
    expect(renderReport(emptyReport('resolve', 'features/x'), false).split('\n')[0]).toBe('bulker resolve — features/x')
    expect(renderReport(emptyReport('resolve', 'features/x'), true).split('\n')[0]).toBe('bulker resolve --dry-run — features/x')
  })

  it('sends a drift back to a gathering, then to a re-read of the question', () => {
    const prose = renderReport({ ...emptyReport('resolve', 'features/x'), exitCode: 3, refused: [drift] }, false)
    expect(prose).toContain('question no longer matches its source — run `bulker <target>`, then re-read the question')
    expect(prose).not.toMatch(/refresh/)
  })

  it('prints the label each refused entry carries, the one the JSON carries — R-RULESOUT-42', () => {
    const refused = { ...ref, reason: 'no-key' as const, label: 'a label of its own' }
    const prose = renderReport({ ...emptyReport('resolve', 'features/x'), exitCode: 3, refused: [refused] }, false)
    expect(prose).toContain('  - OQ-X-1 — x.story.md — a label of its own')
  })
})
