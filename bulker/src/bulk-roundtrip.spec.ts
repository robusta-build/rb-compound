import { describe, expect, it } from 'vitest'
import { parseBulk } from './parse-bulk.js'
import { parseDocument } from './parse-document.js'
import { renderBulk } from './render-bulk.js'
import type { Bulk } from './types.js'

const entriesOf = (body: string, path: string) => {
  const parsed = parseDocument(`# t\n\n${body}`, path)
  if (!parsed.ok) throw new Error(parsed.error.reason)
  return parsed.value.section?.entries ?? []
}

const bulkOf = (docs: Bulk['docs']): Bulk => ({
  path: 'x.bulk.md',
  text: '',
  epicInfix: 'DESIGNDOC',
  epicSlug: 'design-pipeline',
  lastUpdate: '2026-08-08',
  docs
})

describe('renderBulk / parseBulk round trip', () => {
  it('renders the format of the bulk skill', () => {
    const rendered = renderBulk(bulkOf([
      {
        sourcePath: 'design-pipeline.epic.md',
        kind: 'epic',
        infix: 'DESIGNDOC',
        entries: entriesOf('## Open Questions & Gaps\n\n- Gap-DESIGNDOC-1: g\n- Proposition : p\n- Rationale: r\n- Resolution:\n', 'a.epic.md')
      },
      {
        sourcePath: 'roadmap-skill.design.md',
        kind: 'design',
        infix: 'ROADMAP',
        entries: entriesOf('## Open Questions & Gaps\n\n- OQ-ROADMAP-2: q\n- Proposition: p\n- Resolution: lgtm\n', 'a.design.md')
      }
    ]))
    expect(rendered).toBe([
      '# Epic DESIGNDOC',
      '',
      '**Last update:** 2026-08-08',
      '**Epic:** design-pipeline',
      '',
      '2 entries across 2 documents: 1 gap, 1 open question.',
      '1 filled Resolution ready for `bulker resolve`, 1 pending.',
      '',
      '### Epic OQ (design-pipeline.epic.md)',
      '',
      'Gaps:',
      '',
      '- Gap-DESIGNDOC-1: g',
      '- Proposition : p',
      '- Rationale: r',
      '- Resolution:',
      '',
      '## Story ROADMAP',
      '',
      '### Design OQ (roadmap-skill.design.md)',
      '',
      'Open Questions:',
      '',
      '- OQ-ROADMAP-2: q',
      '- Proposition: p',
      '- Resolution: lgtm',
      ''
    ].join('\n'))
  })

  it('reads back every field it wrote, separators included', () => {
    const rendered = renderBulk(bulkOf([{
      sourcePath: 'a/b.story.md',
      kind: 'story',
      infix: 'BULKER',
      entries: entriesOf('## Open Questions & Gaps\n\n- Open Question 3 : Où définir ?\n- Proposition : verbatim ;\n- Rationale : parce que\n- Resolution:\n', 'b.story.md')
    }]))
    const reparsed = parseBulk(rendered, 'x.bulk.md')
    expect(reparsed.ok).toBe(true)
    if (!reparsed.ok) return
    expect(reparsed.value).toMatchObject({ epicInfix: 'DESIGNDOC', epicSlug: 'design-pipeline', lastUpdate: '2026-08-08' })
    expect(reparsed.value.docs).toHaveLength(1)
    const doc = reparsed.value.docs[0]!
    expect(doc.sourcePath).toBe('a/b.story.md')
    expect(doc.kind).toBe('story')
    expect(doc.infix).toBe('BULKER')
    const entry = doc.entries[0]!
    expect(entry.head).toBe('Open Question 3 : Où définir ?')
    expect(entry.key).toBeNull()
    expect(entry.proposition).toBe(' verbatim ;')
    expect(entry.rationale).toBe(' parce que')
    expect(entry.resolution).toBe('')
  })

  it('is stable: render → parse → render yields the same bytes', () => {
    const first = renderBulk(bulkOf([
      {
        sourcePath: 'e.epic.md',
        kind: 'epic',
        infix: 'DESIGNDOC',
        entries: entriesOf('## Open Questions & Gaps\n\n- Gap-DESIGNDOC-1: g\n- Rationale: r\n- Resolution:\n\n- OQ-DESIGNDOC-2: q\n- Proposition : p\n- Route: epicman\n- Resolution: yes\n', 'e.epic.md')
      },
      {
        sourcePath: 'f/f.story.md',
        kind: 'story',
        infix: 'BULKER',
        entries: entriesOf('## Open Questions & Gaps\n\n- OQ-BULKER-9: q\n- Resolution:\n', 'f.story.md')
      }
    ]))
    const reparsed = parseBulk(first, 'x.bulk.md')
    expect(reparsed.ok).toBe(true)
    if (!reparsed.ok) return
    expect(renderBulk(reparsed.value)).toBe(first)
  })

  it('adds the Resolution line the source never had', () => {
    const rendered = renderBulk(bulkOf([{
      sourcePath: 'a.story.md',
      kind: 'story',
      infix: 'BULKER',
      entries: entriesOf('## Open Questions & Gaps\n\n- OQ-BULKER-1: q\n- Proposition: p\n', 'a.story.md')
    }]))
    expect(rendered).toContain('- Proposition: p\n- Resolution:\n')
  })

  it('keeps a duplicate key legal across two document sections', () => {
    const rendered = renderBulk(bulkOf([
      { sourcePath: 'a.story.md', kind: 'story', infix: 'BULKER', entries: entriesOf('## Open Questions & Gaps\n\n- OQ-BULKER-1: a\n', 'a.story.md') },
      { sourcePath: 'b.story.md', kind: 'story', infix: 'BULKER', entries: entriesOf('## Open Questions & Gaps\n\n- OQ-BULKER-1: b\n', 'b.story.md') }
    ]))
    const reparsed = parseBulk(rendered, 'x.bulk.md')
    expect(reparsed.ok).toBe(true)
    if (!reparsed.ok) return
    expect(reparsed.value.docs.map((d) => d.entries[0]!.key!.text)).toEqual(['OQ-BULKER-1', 'OQ-BULKER-1'])
  })

  it('refuses a duplicate key inside one document section', () => {
    const bulk = [
      '# Epic BULKER',
      '',
      '### Story OQ (a.story.md)',
      '',
      '- OQ-BULKER-1: a',
      '',
      '- OQ-BULKER-1: b',
      ''
    ].join('\n')
    const reparsed = parseBulk(bulk, 'x.bulk.md')
    expect(reparsed.ok).toBe(false)
    expect(!reparsed.ok && reparsed.error.reason).toMatch(/duplicate key/)
  })
})
