/**
 * Package bulker — the bulk round trip: gather Open Questions & Gaps into <epic>.bulk.md, copy filled Resolutions back into their sources.
 *
 * Design: better-bulkman
 * Requirements: R-BULKER-01, R-BULKER-02, R-BULKER-03, R-BULKER-04, R-BULKER-05, R-BULKER-06, R-BULKER-21, R-BULKER-22, R-BULKER-23, R-BULKER-24, R-BULKER-25, R-BULKER-41, R-BULKER-42, R-BULKER-43, R-BULKER-44, R-BULKER-45, R-BULKER-61, R-BULKER-65, R-BULKER-66, R-BULKER-67, R-BULKER-81, R-BULKER-82, R-BULKER-83
 * Design: bulk-resolve-copy
 * Requirements: R-BULKRESOLVE-01, R-BULKRESOLVE-02, R-BULKRESOLVE-03, R-BULKRESOLVE-04, R-BULKRESOLVE-21, R-BULKRESOLVE-22, R-BULKRESOLVE-23, R-BULKRESOLVE-24, R-BULKRESOLVE-41, R-BULKRESOLVE-42, R-BULKRESOLVE-43, R-BULKRESOLVE-81, R-BULKRESOLVE-82, R-BULKRESOLVE-83
 * Design: bulk-oq-flow
 * Requirements: R-BULKFLOW-01, R-BULKFLOW-02, R-BULKFLOW-03, R-BULKFLOW-04, R-BULKFLOW-05, R-BULKFLOW-06, R-BULKFLOW-07, R-BULKFLOW-08, R-BULKFLOW-09, R-BULKFLOW-10
 * Design: chore-ignore
 * Requirements: R-CHOREIGNORE-01, R-CHOREIGNORE-21
 * Design: business-rules-out
 * Requirements: R-RULESOUT-41, R-RULESOUT-42, R-RULESOUT-43, R-RULESOUT-44, R-RULESOUT-45, R-RULESOUT-46
 * Design: role-skills-plan
 * Requirements: R-ROLEPLAN-61, R-ROLEPLAN-62, R-ROLEPLAN-63, R-ROLEPLAN-64
 */
export { applyEdits, type ApplyOptions, type EditFs } from './apply-edits.js'
export { bulkHeadingFor, docKindOf } from './doc-kind.js'
export { editDocument, type DocumentEdit, type ResolutionCopy } from './edit-document.js'
export { entryTypeOf, parseFieldLine, parseHeadLine, parseKey, renderLine } from './grammar.js'
export { nodeFs, nodeTargetEnv, type RunFs } from './node-env.js'
export { parseBulk } from './parse-bulk.js'
export { parseDocument } from './parse-document.js'
export { planRefresh, type RefreshOptions, type RefreshPlan } from './plan-refresh.js'
export { planResolve, type ResolveOptions, type ResolvePlan } from './plan-resolve.js'
export { renderBulk, synthesise } from './render-bulk.js'
export { emptyReport, renderReport } from './report.js'
export { findProjectRoot, isWithin, resolveTarget, type PathFlavour, type Refusal, type Target, type TargetEnv } from './resolve-target.js'
export { runRefresh, runResolve, type RunDeps } from './pipeline.js'
export { scanSources } from './scan.js'
export { main, parseArgv, USAGE, VERSION, type Cli, type Parsed } from './cli.js'
export * from './types.js'
export { ok, err, type Result } from './result.js'
