import { applyEdits, type ApplyOptions } from './apply-edits.js'
import type { RunFs } from './node-env.js'
import { parseBulk } from './parse-bulk.js'
import { parseDocument } from './parse-document.js'
import { planRefresh, type RefreshOptions, type RefreshPlan } from './plan-refresh.js'
import { planResolve } from './plan-resolve.js'
import { emptyReport } from './report.js'
import { err, ok, type Result } from './result.js'
import { resolveTarget, type TargetEnv, type Target } from './resolve-target.js'
import { scanSources } from './scan.js'
import type { Bulk, FileEdit, ParseError, Report, SourceDoc } from './types.js'

export interface RunDeps {
  env: TargetEnv
  fs: RunFs
  today: string
  dryRun?: boolean
  apply?: ApplyOptions
}

interface Loaded {
  sources: SourceDoc[]
  unparsable: ParseError[]
  warnings: string[]
}

/** Source path as the bulk records it: relative to the bulk, forward slashes on every platform. */
const relativiser = (env: TargetEnv, dir: string) => (path: string): string =>
  env.path.relative(dir, path).replace(/\\/g, '/')

function loadSources(target: Target, deps: RunDeps): Loaded {
  const sources: SourceDoc[] = []
  const unparsable: ParseError[] = []
  const warnings: string[] = []
  for (const path of scanSources(target.dir, deps.fs, deps.env.path)) {
    const parsed = parseDocument(deps.fs.readFile(path), path)
    if (!parsed.ok) {
      unparsable.push(parsed.error)
      continue
    }
    sources.push(parsed.value)
    warnings.push(...parsed.value.warnings)
  }
  return { sources, unparsable, warnings }
}

function loadBulk(target: Target, deps: RunDeps): { bulk: Bulk | null; error: ParseError | null } {
  if (!deps.fs.exists(target.bulkPath)) return { bulk: null, error: null }
  const parsed = parseBulk(deps.fs.readFile(target.bulkPath), target.bulkPath)
  return parsed.ok ? { bulk: parsed.value, error: null } : { bulk: null, error: parsed.error }
}

async function write(edits: FileEdit[], report: Report, deps: RunDeps): Promise<Report> {
  if (deps.dryRun || edits.length === 0) return report
  const applied = await applyEdits(edits, deps.fs, deps.apply)
  if (applied.ok) return report
  return {
    ...report,
    exitCode: 4,
    warnings: [
      ...report.warnings,
      `write failed on ${applied.error.path}: ${applied.error.message}`,
      ...(applied.error.written.length > 0 ? [`already replaced: ${applied.error.written.join(', ')}`] : [])
    ]
  }
}

function refusalReport(phase: Report['phase'], input: string, refusal: { kind: string; message: string }): Report {
  return {
    ...emptyReport(phase, input),
    exitCode: refusal.kind === 'outside-project' ? 2 : 1,
    warnings: [refusal.message]
  }
}

const refreshOptions = (target: Target, deps: RunDeps): RefreshOptions => ({
  bulkPath: target.bulkPath,
  slug: target.slug,
  today: deps.today,
  relativise: relativiser(deps.env, target.dir)
})

const gatheringWarnings = (plan: RefreshPlan): string[] => [
  // R-BULKER-45: named once, so it can be keyed by hand before `resolve` needs it.
  ...plan.keyless.map((ref) => `keyless entry carried on its legacy identity: \`${ref.head}\` in ${ref.source} — key it before \`bulker resolve\``)
]

const answeredInSource = (plan: RefreshPlan): Report['skipped'] =>
  plan.answeredInSource.map((ref) => ({ ...ref, reason: 'answered-in-source' as const }))

/** R-BULKER-41 to R-BULKER-45 and R-BULKFLOW-05: the bulk rebuilt from the sources, the only file written. */
async function gather(phase: Report['phase'], target: Target, loaded: Loaded, existing: Bulk | null, deps: RunDeps, notes: string[]): Promise<Report> {
  const plan = planRefresh(loaded.sources, existing, refreshOptions(target, deps))
  if (!plan.ok) {
    return { ...emptyReport(phase, target.dir), exitCode: phase === 'resolve' ? 3 : 1, unparsable: plan.error, warnings: loaded.warnings }
  }
  const report: Report = {
    ...emptyReport(phase, target.dir),
    bulk: { path: target.bulkPath, action: plan.value.bulkAction },
    pending: plan.value.pending,
    skipped: answeredInSource(plan.value),
    unparsable: loaded.unparsable,
    warnings: [...loaded.warnings, ...gatheringWarnings(plan.value), ...notes]
  }
  return write(plan.value.edits, report, deps)
}

/** The sources as the copy will leave them on disk, re-parsed from the very bytes it writes. */
function afterCopy(sources: SourceDoc[], edits: FileEdit[]): Result<SourceDoc[], ParseError[]> {
  const written = new Map(edits.flatMap((edit) => (edit.kind === 'write' ? [[edit.path, edit.content] as const] : [])))
  const docs: SourceDoc[] = []
  const errors: ParseError[] = []
  for (const source of sources) {
    const content = written.get(source.path)
    if (content === undefined) {
      docs.push(source)
      continue
    }
    const parsed = parseDocument(content, source.path)
    if (parsed.ok) docs.push(parsed.value)
    else errors.push(parsed.error)
  }
  return errors.length > 0 ? err(errors) : ok(docs)
}

/** Writes exactly one file, the bulk, and never opens a source for writing. */
export async function runRefresh(input: string, deps: RunDeps): Promise<Report> {
  const target = resolveTarget(input, deps.env.cwd, deps.env)
  if (!target.ok) return refusalReport('refresh', input, target.error)

  const loaded = loadSources(target.value, deps)
  const bulk = loadBulk(target.value, deps)
  if (bulk.error) {
    // Rebuilding over a bulk we cannot read would discard the human's filled Resolutions.
    return {
      ...emptyReport('refresh', target.value.dir),
      exitCode: 1,
      bulk: { path: target.value.bulkPath, action: 'none' },
      unparsable: [bulk.error],
      warnings: [...loaded.warnings, `refusing to rebuild an unreadable bulk: ${bulk.error.path}:${bulk.error.line} — ${bulk.error.reason}`]
    }
  }
  return gather('refresh', target.value, loaded, bulk.bulk, deps, [])
}

/** Copies, then rebuilds the bulk from the post-copy sources. No bulk on disk: gathers, phase 'resolve'. */
export async function runResolve(input: string, deps: RunDeps): Promise<Report> {
  const target = resolveTarget(input, deps.env.cwd, deps.env)
  if (!target.ok) return refusalReport('resolve', input, target.error)

  const loaded = loadSources(target.value, deps)
  const { sources, unparsable, warnings } = loaded
  const bulk = loadBulk(target.value, deps)
  if (bulk.error) {
    return {
      ...emptyReport('resolve', target.value.dir),
      exitCode: 3,
      bulk: { path: target.value.bulkPath, action: 'none' },
      unparsable: [bulk.error],
      warnings
    }
  }
  if (bulk.bulk === null) {
    return gather('resolve', target.value, loaded, null, deps, [
      `no bulk at ${target.value.bulkPath} — nothing to resolve, gathered from the sources`
    ])
  }

  const refused = (failure: { unparsable: ParseError[]; refused?: Report['refused'] }): Report => ({
    ...emptyReport('resolve', target.value.dir),
    exitCode: 3,
    bulk: { path: target.value.bulkPath, action: 'unchanged' },
    refused: failure.refused ?? [],
    unparsable: failure.unparsable,
    warnings: [...warnings, 'preflight failed — nothing was written']
  })

  // R-BULKFLOW-04: both plans are computed before the first byte is written.
  const plan = planResolve(bulk.bulk, sources, { relativise: relativiser(deps.env, target.value.dir), unparsable })
  if (!plan.ok) return refused(plan.error)
  const postCopy = afterCopy(sources, plan.value.edits)
  if (!postCopy.ok) return refused({ unparsable: postCopy.error })
  const rebuild = planRefresh(postCopy.value, bulk.bulk, refreshOptions(target.value, deps))
  if (!rebuild.ok) return refused({ unparsable: rebuild.error })

  const report: Report = {
    ...emptyReport('resolve', target.value.dir),
    bulk: { path: target.value.bulkPath, action: rebuild.value.bulkAction },
    applied: plan.value.applied,
    pending: rebuild.value.pending,
    skipped: [...plan.value.skipped, ...answeredInSource(rebuild.value)],
    unparsable,
    warnings: [...warnings, ...gatheringWarnings(rebuild.value)],
    followUps: plan.value.followUps
  }
  // Sources first, then the bulk: an exit 4 on the bulk leaves a state a second resolve repairs.
  return write([...plan.value.edits, ...rebuild.value.edits], report, deps)
}
