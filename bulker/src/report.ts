import type { Report, SkipReason } from './types.js'

const SKIP_LABELS: Record<SkipReason, string> = {
  'empty-resolution': 'Resolution still empty',
  'not-in-source': 'no longer in its source — typically integrated by its owner',
  'answered-in-source': 'answered differently in its source — never overwritten'
}

const INVOCATIONS: Record<Report['phase'], string> = {
  refresh: 'bulker',
  resolve: 'bulker resolve'
}

const list = (title: string, items: string[]): string[] =>
  items.length === 0 ? [] : [`${title}:`, ...items.map((item) => `  - ${item}`)]

const name = (ref: { key: string | null; head: string; source: string }): string =>
  `${ref.key ?? `(keyless) ${ref.head}`} — ${ref.source}`

/** The prose form of the report. The exit code is the machine contract; this is not parsed. */
export function renderReport(report: Report, dryRun: boolean): string {
  const lines: string[] = [
    `${INVOCATIONS[report.phase]}${dryRun ? ' --dry-run' : ''} — ${report.target}`,
    `bulk: ${report.bulk.action}${report.bulk.path ? ` (${report.bulk.path})` : ''}`
  ]
  lines.push(...list('Applied', report.applied.map(name)))
  lines.push(...list('Pending', report.pending.map(name)))
  lines.push(...list('Skipped', report.skipped.map((ref) => `${name(ref)} — ${SKIP_LABELS[ref.reason] ?? ref.reason}`)))
  lines.push(...list('Refused', report.refused.map((ref) => `${name(ref)} — ${ref.label}`)))
  lines.push(...list('Unparsable', report.unparsable.map((e) => `${e.path}:${e.line} — ${e.reason}`)))
  lines.push(...list('Warnings', report.warnings))
  lines.push(...list('Follow-ups', report.followUps))
  lines.push(`exit ${report.exitCode}`)
  return lines.join('\n')
}

/** A report with nothing applied, refused or warned, exit code 0: the base every run spreads its outcome over. */
export function emptyReport(phase: Report['phase'], target: string): Report {
  return {
    version: 2,
    phase,
    target,
    exitCode: 0,
    bulk: { path: '', action: 'none' },
    applied: [],
    pending: [],
    skipped: [],
    refused: [],
    unparsable: [],
    warnings: [],
    followUps: []
  }
}
