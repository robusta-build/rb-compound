import { describe, expect, it } from 'vitest'
import { parseFieldLine, parseHeadLine, parseKey, parseUnknownFieldLine, renderLine } from './grammar.js'

describe('parseKey', () => {
  it('reads a Gap and an OQ key', () => {
    expect(parseKey('Gap-BULKER-1')).toEqual({ type: 'gap', infix: 'BULKER', number: 1, text: 'Gap-BULKER-1' })
    expect(parseKey('OQ-DESIGNDOC-12')).toEqual({ type: 'oq', infix: 'DESIGNDOC', number: 12, text: 'OQ-DESIGNDOC-12' })
  })

  it('refuses a legacy label, a short infix, a lowercase infix and a leading zero', () => {
    for (const label of ['Gap 1', 'Open Question 3', 'OQ-ABC-1', 'OQ-bulker-1', 'OQ-BULKER-01', 'OQ-BULKER-0']) {
      expect(parseKey(label), label).toBeNull()
    }
  })

  it('refuses an infix longer than 15 letters', () => {
    expect(parseKey('OQ-ABCDEFGHIJKLMNOP-1')).toBeNull()
  })
})

describe('parseHeadLine', () => {
  it('accepts both separators and keeps the one it found — R-BULKER-22', () => {
    expect(parseHeadLine('- OQ-BULKER-2: the question')).toEqual({
      label: 'OQ-BULKER-2', sep: ':', text: ' the question', continuations: []
    })
    expect(parseHeadLine('- Open Question 3 : Où définir le glossaire ?')).toEqual({
      label: 'Open Question 3', sep: ' :', text: ' Où définir le glossaire ?', continuations: []
    })
  })

  it('accepts a legacy Gap head', () => {
    expect(parseHeadLine('- Gap 1: missing rule')?.label).toBe('Gap 1')
  })

  it('rejects a field line, an indented head and a prose line', () => {
    for (const line of ['- Proposition: x', '  - OQ-BULKER-2: x', 'OQ-BULKER-2: x', '- Gap-BULKER-1']) {
      expect(parseHeadLine(line), line).toBeNull()
    }
  })
})

describe('parseFieldLine', () => {
  it('reads the four fields plus the legacy Note', () => {
    expect(parseFieldLine('- Proposition : verbatim')?.label).toBe('Proposition')
    expect(parseFieldLine('- Rationale: why')?.label).toBe('Rationale')
    expect(parseFieldLine('- Route: epicman')?.text).toBe(' epicman')
    expect(parseFieldLine('- Note : lgtm')?.label).toBe('Note')
  })

  it('distinguishes an absent value from an empty one and keeps trailing whitespace', () => {
    expect(parseFieldLine('- Resolution:')?.text).toBe('')
    expect(parseFieldLine('- Resolution:   ')?.text).toBe('   ')
    expect(parseFieldLine('- Resolution: lgtm ')?.text).toBe(' lgtm ')
  })

  it('reads a Rloq line with either separator and any value', () => {
    expect(parseFieldLine('- Rloq: true')).toEqual({ label: 'Rloq', sep: ':', text: ' true', continuations: [] })
    expect(parseFieldLine('- Rloq : yes')?.text).toBe(' yes')
  })

  it('rejects an unmodelled label, CONFLICT included', () => {
    expect(parseFieldLine('- Depends on: x')).toBeNull()
    expect(parseFieldLine('- CONFLICT: two answers')).toBeNull()
  })
})

describe('parseUnknownFieldLine', () => {
  it('catches a `- Word:` shape so the document can be refused — R-BULKER-24', () => {
    expect(parseUnknownFieldLine('- Depends on: x')?.label).toBe('Depends on')
    expect(parseUnknownFieldLine('- Blocks : nothing')?.label).toBe('Blocks')
  })

  it('does not catch a plain bullet or a continuation line', () => {
    expect(parseUnknownFieldLine('- just a bullet')).toBeNull()
    expect(parseUnknownFieldLine('  wrapped continuation')).toBeNull()
  })
})

describe('renderLine', () => {
  it('reproduces the source line byte for byte, spacing included — AC-BULKER-04', () => {
    for (const line of [
      '- Open Question 3 : Où définir le glossaire UL ?',
      '- Proposition : README du projet par défaut ; repli sur `.epic.md`.',
      '- Resolution:',
      '- Resolution: lgtm   '
    ]) {
      const parsed = parseHeadLine(line) ?? parseFieldLine(line)
      expect(parsed, line).not.toBeNull()
      expect(renderLine(parsed!, '\n')).toBe(line)
    }
  })

  it('joins continuations with the target line ending', () => {
    const line = { label: 'Proposition', sep: ': ', text: 'first', continuations: ['  second'] }
    expect(renderLine(line, '\r\n')).toBe('- Proposition: first\r\n  second')
  })
})
