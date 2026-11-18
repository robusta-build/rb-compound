import { describe, expect, it } from 'vitest'
import { parseDocument } from './parse-document.js'

const doc = (body: string) => `# Story : x\n\n**Infix :** BULKER\n\n## Story\n\nbody.\n\n${body}`

describe('parseDocument — section detection', () => {
  it('reads no section when the document has none — the empty case of a fresh story', () => {
    const parsed = parseDocument(doc('## Dependencies\n\n- Dep 1: none\n'), 'x.story.md')
    expect(parsed.ok).toBe(true)
    expect(parsed.ok && parsed.value.section).toBeNull()
    expect(parsed.ok && parsed.value.warnings).toEqual([])
  })

  it('stops the section at the next level-two heading', () => {
    const parsed = parseDocument(doc('## Open Questions & Gaps\n\n- OQ-BULKER-1: q\n- Resolution:\n\n## Hors scope\n\n- nope\n'), 'x.story.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.section!.entries).toHaveLength(1)
    expect(parsed.value.text.slice(parsed.value.section!.span.start, parsed.value.section!.span.end))
      .toBe('## Open Questions & Gaps\n\n- OQ-BULKER-1: q\n- Resolution:\n\n')
  })

  it('tolerates ### Gaps / ### Open Questions subheadings inside the section', () => {
    const parsed = parseDocument(doc(
      '## Open Questions & Gaps\n\n### Gaps\n\n- Gap-BULKER-1: g\n- Resolution:\n\n### Open Questions\n\n- OQ-BULKER-2: q\n- Resolution:\n'
    ), 'x.story.md')
    expect(parsed.ok && parsed.value.section!.entries.map((e) => e.key!.text)).toEqual(['Gap-BULKER-1', 'OQ-BULKER-2'])
  })

  it('runs the section to EOF when nothing follows it', () => {
    const parsed = parseDocument(doc('## Open Questions & Gaps\n\n- OQ-BULKER-1: q\n- Resolution:\n'), 'x.story.md')
    expect(parsed.ok && parsed.value.section!.span.end).toBe(parsed.ok ? parsed.value.text.length : -1)
  })

  it('warns once per file on a legacy heading and reads nothing from it — R-BULKER-23', () => {
    const parsed = parseDocument(doc('## Open Questions\n\nQ1 : one line ?\nProposition : do it\nNote : lgtm\n\n## Gaps\n\nQ2 : two ?\n'), 'legacy.story.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.section).toBeNull()
    expect(parsed.value.warnings).toHaveLength(1)
    expect(parsed.value.warnings[0]).toContain('legacy heading')
  })
})

describe('parseDocument — R-BULKER-24 whole-document failures', () => {
  const cases: [string, string, RegExp][] = [
    [
      'two canonical sections',
      '## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n\n## Middle\n\n## Open Questions & Gaps\n\n- OQ-BULKER-2: b\n',
      /two .* sections in one file/
    ],
    [
      'an unrecognised field line inside an entry',
      '## Open Questions & Gaps\n\n- OQ-BULKER-1: q\n- Depends on: something\n- Resolution:\n',
      /unrecognised field line/
    ],
    [
      'a duplicate key',
      '## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n- Resolution:\n\n- OQ-BULKER-1: b\n- Resolution:\n',
      /duplicate key/
    ],
    [
      'a field line before any head line',
      '## Open Questions & Gaps\n\n- Proposition: orphan\n\n- OQ-BULKER-1: q\n',
      /before any entry head/
    ]
  ]

  for (const [name, body, reason] of cases) {
    it(`refuses the whole document on ${name}`, () => {
      const parsed = parseDocument(doc(body), 'x.story.md')
      expect(parsed.ok, name).toBe(false)
      if (parsed.ok) return
      expect(parsed.error.reason).toMatch(reason)
      expect(parsed.error.path).toBe('x.story.md')
      expect(parsed.error.line).toBeGreaterThan(0)
    })
  }
})

describe('parseDocument — entry shape', () => {
  it('distinguishes an absent Resolution from a present empty one', () => {
    const parsed = parseDocument(doc('## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n- Proposition: p\n\n- OQ-BULKER-2: b\n- Resolution:\n'), 'x.story.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const [first, second] = parsed.value.section!.entries
    expect(first!.resolution).toBeNull()
    expect(second!.resolution).toBe('')
  })

  it('reads a legacy `Note : lgtm` as an empty Resolution', () => {
    const parsed = parseDocument(doc('## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n- Note : lgtm\n'), 'x.story.md')
    expect(parsed.ok && parsed.value.section!.entries[0]!.resolution).toBe('')
  })

  it('takes continuation lines into the field value, verbatim leading space kept', () => {
    const parsed = parseDocument(doc('## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n- Proposition: first\n  wrapped second\n- Resolution:\n'), 'x.story.md')
    expect(parsed.ok && parsed.value.section!.entries[0]!.proposition).toBe(' first\n  wrapped second')
  })

  it('keeps a keyless legacy entry, key null', () => {
    const parsed = parseDocument(doc('## Open Questions & Gaps\n\n- Open Question 3 : q\n- Resolution:\n'), 'x.epic.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.section!.entries[0]!.key).toBeNull()
    expect(parsed.value.section!.entries[0]!.head).toBe('Open Question 3 : q')
  })

  it('spans the entry block without its terminating blank line', () => {
    const text = doc('## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n- Resolution:\n\n- OQ-BULKER-2: b\n- Resolution:\n')
    const parsed = parseDocument(text, 'x.story.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const first = parsed.value.section!.entries[0]!
    expect(text.slice(first.span.start, first.span.end)).toBe('- OQ-BULKER-1: a\n- Resolution:\n')
  })

  it('reads an empty bullet left by an editor list continuation as a blank line', () => {
    const parsed = parseDocument(doc('## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n- Resolution: lgtm\n- \n- OQ-BULKER-2: b\n- Resolution:\n-\n'), 'x.story.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const [first, second] = parsed.value.section!.entries
    expect(first!.resolution).toBe(' lgtm')
    expect(second!.resolution).toBe('')
  })
})

describe('parseDocument — infix and kind', () => {
  it('reads the French-spaced Infix header, and the plain one', () => {
    expect(parseDocument('**Infix :** BULKER\n', 'a.story.md')).toMatchObject({ value: { infix: 'BULKER' } })
    expect(parseDocument('**Infix:** ROADMAP\n', 'a.design.md')).toMatchObject({ value: { infix: 'ROADMAP' } })
  })

  it('falls back to the infix of the first keyed entry', () => {
    const parsed = parseDocument('# t\n\n## Open Questions & Gaps\n\n- OQ-DESIGNDOC-4: q\n', 'a.brainstorm.md')
    expect(parsed.ok && parsed.value.infix).toBe('DESIGNDOC')
  })

  it('derives the kind from the file name, legacy .prd.md included', () => {
    const kinds = ['a.epic.md', 'a.story.md', 'a.brainstorm.md', 'a.design.md', 'a.prd.md']
      .map((p) => parseDocument('x\n', p))
      .map((r) => (r.ok ? r.value.kind : 'fail'))
    expect(kinds).toEqual(['epic', 'story', 'brainstorm', 'design', 'design'])
  })
})

describe('parseDocument — R-BULKER-25 opaque bytes', () => {
  it('leaves BOM, CRLF and a missing final newline visible in text', () => {
    const text = '﻿# T\r\n\r\n## Open Questions & Gaps\r\n\r\n- OQ-BULKER-1: q\r\n- Resolution: lgtm   '
    const parsed = parseDocument(text, 'x.story.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.text).toBe(text)
    expect(parsed.value.section!.entries[0]!.resolution).toBe(' lgtm   ')
  })
})

describe('parseDocument — a heading is a line, not a substring', () => {
  it('ignores `## Open Questions & Gaps` quoted inside prose', () => {
    const text = [
      '# Story : x',
      '',
      '## Décisions',
      '',
      '- 2026-01-01 — Le doute passe par une seule section `## Open Questions & Gaps` en fin de document.',
      ''
    ].join('\n')
    const parsed = parseDocument(text, 'x.story.md')
    expect(parsed.ok && parsed.value.section).toBeNull()
  })

  it('ignores an indented or level-three lookalike', () => {
    for (const line of ['  ## Open Questions & Gaps', '### Open Questions & Gaps']) {
      const parsed = parseDocument(`# t\n\n${line}\n\n- OQ-BULKER-1: q\n`, 'x.story.md')
      expect(parsed.ok && parsed.value.section, line).toBeNull()
    }
  })
})
