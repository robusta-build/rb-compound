import { describe, expect, it } from 'vitest'
import { parseDocument } from '../src/parse-document.js'
import { readCorpus } from './corpus.js'

describe('parseDocument on the real corpus — R-BULKER-83', () => {
  it('reads the three French-spaced entries of design-pipeline.epic.md', () => {
    const text = readCorpus('design-pipeline-epic', 'design-pipeline.epic.md')
    const parsed = parseDocument(text, 'design-pipeline.epic.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const doc = parsed.value
    expect(doc.kind).toBe('epic')
    expect(doc.infix).toBe('DESIGNDOC')
    expect(doc.section!.entries).toHaveLength(3)

    // Real epic entries are legacy and keyless, with an empty Resolution and French spacing.
    for (const entry of doc.section!.entries) {
      expect(entry.key).toBeNull()
      expect(entry.resolution).toBe('')
      expect(entry.headLine.sep).toBe(' :')
      expect(entry.fields.find((f) => f.label === 'Proposition')!.sep).toBe(' :')
      // …while `- Resolution:` in the same file uses the plain separator.
      expect(entry.fields.find((f) => f.label === 'Resolution')!.sep).toBe(':')
    }
    expect(doc.section!.entries.map((e) => e.headLine.label))
      .toEqual(['Open Question 3', 'Open Question 4', 'Open Question 5'])
  })

  it('stops that section before `## Hors scope`', () => {
    const text = readCorpus('design-pipeline-epic', 'design-pipeline.epic.md')
    const parsed = parseDocument(text, 'design-pipeline.epic.md')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const slice = text.slice(parsed.value.section!.span.start, parsed.value.section!.span.end)
    expect(slice.startsWith('## Open Questions & Gaps')).toBe(true)
    expect(slice).not.toContain('Hors scope')
    expect(text.slice(parsed.value.section!.span.end)).toMatch(/^## Hors scope/)
  })

  it('reads the five keyless entries of roadmap-skill.design.md, filled Resolutions included', () => {
    const parsed = parseDocument(
      readCorpus('design-pipeline-epic', 'roadmap-skill.design.md'),
      'roadmap-skill.design.md'
    )
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.kind).toBe('design')
    expect(parsed.value.infix).toBe('ROADMAP')
    const entries = parsed.value.section!.entries
    expect(entries.map((e) => e.headLine.label))
      .toEqual(['Gap 1', 'Gap 2', 'Open Question 1', 'Open Question 2', 'Open Question 3'])
    expect(entries.map((e) => e.resolution)).toEqual([
      ' lgtm',
      ' no need for a story',
      ' lgtm',
      ' lgtm',
      ' lgtm,  docman should not touch the roadmap'
    ])
  })

  it('reads no section from the two stories that have none', () => {
    for (const [dir, file] of [
      ['better-bulkman', 'better-bulkman.story.md'],
      ['entry-key', 'entry-key.story.md']
    ] as const) {
      const parsed = parseDocument(readCorpus(dir, file), file)
      expect(parsed.ok, file).toBe(true)
      if (!parsed.ok) continue
      expect(parsed.value.section, file).toBeNull()
      expect(parsed.value.warnings, file).toEqual([])
    }
  })

  it('warns once per legacy-heading file and reads nothing from it — R-BULKER-23', () => {
    const files: [string, string][] = [
      ['statusline', 'statusline.story.md'],
      ['statusline', 'statusline.prd.md'],
      ['statusline', 'statusline.brainstorm.md'],
      ['poste-dev', 'poste-dev.story.md'],
      ['poste-dev', 'poste-dev.brainstorm.md']
    ]
    for (const [dir, file] of files) {
      const parsed = parseDocument(readCorpus(dir, file), file)
      expect(parsed.ok, file).toBe(true)
      if (!parsed.ok) continue
      expect(parsed.value.section, file).toBeNull()
      expect(parsed.value.warnings, `${file} warnings`).toHaveLength(1)
    }
  })

  it('parses every corpus document without a single failure', () => {
    const files: [string, string][] = [
      ['design-pipeline-epic', 'design-pipeline.epic.md'],
      ['design-pipeline-epic', 'roadmap-skill.design.md'],
      ['better-bulkman', 'better-bulkman.story.md'],
      ['better-bulkman', 'better-bulkman.design.md'],
      ['entry-key', 'entry-key.story.md'],
      ['statusline', 'statusline.story.md'],
      ['statusline', 'statusline.prd.md'],
      ['statusline', 'statusline.brainstorm.md'],
      ['poste-dev', 'poste-dev.story.md'],
      ['poste-dev', 'poste-dev.brainstorm.md']
    ]
    const failures = files
      .map(([dir, file]) => [file, parseDocument(readCorpus(dir, file), file)] as const)
      .filter(([, parsed]) => !parsed.ok)
      .map(([file, parsed]) => `${file}: ${!parsed.ok ? parsed.error.reason : ''}`)
    expect(failures).toEqual([])
  })

  it('keeps every corpus document byte-identical in `text`', () => {
    const text = readCorpus('poste-dev', 'poste-dev.brainstorm.md')
    const parsed = parseDocument(text, 'poste-dev.brainstorm.md')
    expect(parsed.ok && parsed.value.text).toBe(text)
  })
})
