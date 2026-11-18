import { describe, expect, it } from 'vitest'
import { editDocument } from './edit-document.js'
import { parseDocument } from './parse-document.js'
import type { LabelledLine, SourceDoc } from './types.js'

const parse = (text: string, path = 'x.story.md'): SourceDoc => {
  const parsed = parseDocument(text, path)
  if (!parsed.ok) throw new Error(parsed.error.reason)
  return parsed.value
}

const resolution = (text: string, continuations: string[] = [], sep = ':'): LabelledLine =>
  ({ label: 'Resolution', sep, text, continuations })

const TWO_ENTRIES = [
  '# Story : x',
  '',
  '## Open Questions & Gaps',
  '',
  '- OQ-BULKER-1: first question',
  '- Proposition: do A',
  '- Rationale: because A',
  '- Resolution:',
  '',
  '- OQ-BULKER-2: second question',
  '- Proposition: do C',
  '- Resolution:',
  '',
  '## Hors scope',
  '',
  '- nothing',
  ''
].join('\n')

describe('editDocument — the Resolution copy', () => {
  it('fills the empty Resolution line and moves no other byte — AC-BULKRESOLVE-1', () => {
    const doc = parse(TWO_ENTRIES)
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[0]!, resolution: resolution(' do B instead') }] })
    expect(out).toBe(TWO_ENTRIES.replace('- Rationale: because A\n- Resolution:\n', '- Rationale: because A\n- Resolution: do B instead\n'))
  })

  it('copies `lgtm` as `lgtm` — AC-BULKRESOLVE-2', () => {
    const doc = parse(TWO_ENTRIES)
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[1]!, resolution: resolution(' lgtm') }] })
    expect(out).toContain('- Proposition: do C\n- Resolution: lgtm\n')
    expect(out.match(/do C/g)).toHaveLength(1)
  })

  it('keeps the source separator when the bulk wrote the other one', () => {
    const doc = parse(TWO_ENTRIES.replace('- Proposition: do C\n- Resolution:', '- Proposition: do C\n- Resolution :'))
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[1]!, resolution: resolution(' yes to C') }] })
    expect(out).toContain('- Resolution : yes to C\n')
  })

  it('replaces a Resolution line holding only whitespace', () => {
    const doc = parse(TWO_ENTRIES.replace('- Proposition: do C\n- Resolution:', '- Proposition: do C\n- Resolution:   '))
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[1]!, resolution: resolution(' yes') }] })
    expect(out).toContain('- Proposition: do C\n- Resolution: yes\n\n## Hors scope')
  })

  it('fills two entries of the same document', () => {
    const doc = parse(TWO_ENTRIES)
    const [first, second] = doc.section!.entries
    const out = editDocument(doc, {
      copies: [
        { entry: first!, resolution: resolution(' one') },
        { entry: second!, resolution: resolution(' two') }
      ]
    })
    expect(out.split('\n').filter((line) => line.startsWith('- Resolution'))).toEqual(['- Resolution: one', '- Resolution: two'])
  })

  it('leaves a field that follows the Resolution line in place', () => {
    const doc = parse(TWO_ENTRIES.replace('- Proposition: do C\n- Resolution:', '- Proposition: do C\n- Resolution:\n- Route: epicman'))
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[1]!, resolution: resolution(' yes') }] })
    expect(out).toContain('- Resolution: yes\n- Route: epicman\n')
  })

  it('appends a Resolution line as the last field of a legacy `Note: lgtm` entry', () => {
    const doc = parse(TWO_ENTRIES.replace('- Proposition: do C\n- Resolution:', '- Proposition: do C\n- Note: lgtm'))
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[1]!, resolution: resolution(' yes to C') }] })
    expect(out).toContain('- Proposition: do C\n- Note: lgtm\n- Resolution: yes to C\n\n## Hors scope')
  })

  it('appends the Resolution line after an entry ending the file with no final newline', () => {
    const text = '# Story : x\n\n## Open Questions & Gaps\n\n- OQ-BULKER-1: q\n- Proposition: p'
    const doc = parse(text)
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[0]!, resolution: resolution(' yes') }] })
    expect(out).toBe(`${text}\n- Resolution: yes`)
  })

  it('treats a brainstorm like any other document — R-BULKRESOLVE-04', () => {
    const doc = parse(TWO_ENTRIES, 'x.brainstorm.md')
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[0]!, resolution: resolution(' lgtm') }] })
    expect(out).toBe(TWO_ENTRIES.replace('- Rationale: because A\n- Resolution:\n', '- Rationale: because A\n- Resolution: lgtm\n'))
  })
})

describe('editDocument — byte fidelity', () => {
  it('lands a multi-line Resolution with its continuations in a CRLF story', () => {
    const crlf = TWO_ENTRIES.replace(/\n/g, '\r\n')
    const doc = parse(crlf)
    const out = editDocument(doc, {
      copies: [{ entry: doc.section!.entries[0]!, resolution: resolution(' first line', ['second line', '  third, indented']) }]
    })
    expect(out).toBe(crlf.replace(
      '- Rationale: because A\r\n- Resolution:\r\n',
      '- Rationale: because A\r\n- Resolution: first line\r\nsecond line\r\n  third, indented\r\n'
    ))
  })

  it('keeps a BOM, a missing final newline and trailing whitespace elsewhere', () => {
    const text = '﻿' + TWO_ENTRIES.replace('- nothing\n', '- nothing   ')
    const doc = parse(text)
    const out = editDocument(doc, { copies: [{ entry: doc.section!.entries[0]!, resolution: resolution(' yes') }] })
    expect(out.startsWith('﻿')).toBe(true)
    expect(out.endsWith('- nothing   ')).toBe(true)
  })

  it('touches nothing when there is nothing to copy', () => {
    const doc = parse(TWO_ENTRIES)
    expect(editDocument(doc, { copies: [] })).toBe(TWO_ENTRIES)
  })
})
