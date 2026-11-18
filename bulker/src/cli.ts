import { nodeFs, nodeTargetEnv } from './node-env.js'
import { runRefresh, runResolve } from './pipeline.js'
import { renderReport } from './report.js'
import type { Report } from './types.js'

export const VERSION = '0.6.0'

export const USAGE = `bulker — the Compound bulk round trip, as a deterministic command

  bulker <target> [--json] [--dry-run]           gather the Open Questions & Gaps into <epic>.bulk.md
  bulker resolve <target> [--json] [--dry-run]   copy filled Resolutions into their sources, then rebuild the bulk
  bulker --help | --version

<target> is required and never inferred: an epic folder, an <epic>.epic.md or an
<epic>.bulk.md, relative or absolute, with either path separator.

Exit codes are the machine contract:
  0  success, a no-op run included
  1  usage error: unknown option, no target, two targets, or a target that cannot be read
  2  safety refusal: the target resolves outside the current Claude project
  3  preflight failure (resolve only) — nothing was written
  4  I/O failure during the write phase; the report lists the files already replaced`

export interface Cli {
  argv: string[]
  cwd: string
  today: string
  stdout(text: string): void
  stderr(text: string): void
  platform?: string
}

export interface Parsed {
  command: 'refresh' | 'resolve' | 'help' | 'version' | null
  target: string | null
  json: boolean
  dryRun: boolean
  error: string | null
}

/** A first positional other than `resolve` or `refresh` is the target, command 'refresh'. */
export function parseArgv(argv: string[]): Parsed {
  const parsed: Parsed = { command: null, target: null, json: false, dryRun: false, error: null }
  const positional: string[] = []
  for (const arg of argv) {
    if (arg === '--json') parsed.json = true
    else if (arg === '--dry-run') parsed.dryRun = true
    else if (arg === '--help' || arg === '-h') parsed.command ??= 'help'
    else if (arg === '--version' || arg === '-V') parsed.command ??= 'version'
    else if (arg.startsWith('-')) parsed.error = `unknown option ${arg}`
    else positional.push(arg)
  }
  if (parsed.command === 'help' || parsed.command === 'version') return parsed
  // `refresh` is a hidden alias of the gathering: parsed, never named back to a human.
  const command = positional[0] === 'resolve' ? 'resolve' : 'refresh'
  const targets = positional[0] === 'resolve' || positional[0] === 'refresh' ? positional.slice(1) : positional
  const invocation = command === 'resolve' ? 'resolve' : 'bulker'
  if (targets.length === 0) {
    return { ...parsed, command, error: command === 'resolve' ? 'resolve needs a target' : 'no target given' }
  }
  if (targets.length > 1) return { ...parsed, command, error: `${invocation} takes exactly one target, got ${targets.length}` }
  return { ...parsed, command, target: targets[0]! }
}

/** Returns the process exit code. Every write goes through the pipeline, never through here. */
export async function main(cli: Cli): Promise<number> {
  const parsed = parseArgv(cli.argv)

  if (parsed.command === 'help') {
    cli.stdout(USAGE)
    return 0
  }
  if (parsed.command === 'version') {
    cli.stdout(VERSION)
    return 0
  }
  if (parsed.error !== null || parsed.command === null || parsed.target === null) {
    cli.stderr(`${parsed.error ?? 'no target given'}\n\n${USAGE}`)
    return 1
  }

  const env = nodeTargetEnv(cli.cwd, cli.platform ?? process.platform)
  const deps = { env, fs: nodeFs(), today: cli.today, dryRun: parsed.dryRun }
  const report: Report = parsed.command === 'refresh'
    ? await runRefresh(parsed.target, deps)
    : await runResolve(parsed.target, deps)

  cli.stdout(parsed.json ? JSON.stringify(report, null, 2) : renderReport(report, parsed.dryRun))
  if (report.exitCode !== 0 && !parsed.json) {
    cli.stderr(report.warnings.join('\n'))
  }
  return report.exitCode
}
