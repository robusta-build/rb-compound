import { describe, expect, it } from 'vitest'
import * as bulker from '../src/index.js'

describe('library API of @robusta/bulker — R-BULKRESOLVE-43', () => {
  it('no longer exports the decision-line helpers', () => {
    expect(bulker).not.toHaveProperty('decisionLineOf')
    expect(bulker).not.toHaveProperty('decisionSectionFor')
    expect(bulker).not.toHaveProperty('decisionTextOf')
  })

  it('still exports what the pipeline builds on', () => {
    expect(typeof bulker.planResolve).toBe('function')
    expect(typeof bulker.editDocument).toBe('function')
  })
})
