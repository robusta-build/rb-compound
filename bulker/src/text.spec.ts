import { describe, expect, it } from 'vitest'
import { applySplices, detectEol, hasBom, hasFinalNewline, splitLines } from './text.js'

describe('splitLines', () => {
  it('keeps LF endings and offsets', () => {
    const lines = splitLines('a\nb\n')
    expect(lines.map((l) => [l.text, l.eol, l.start, l.end])).toEqual([
      ['a', '\n', 0, 2],
      ['b', '\n', 2, 4]
    ])
  })

  it('keeps CRLF endings as two characters', () => {
    const lines = splitLines('a\r\nb')
    expect(lines.map((l) => [l.text, l.eol, l.start, l.end])).toEqual([
      ['a', '\r\n', 0, 3],
      ['b', '', 3, 4]
    ])
  })

  it('reports a last line with no final newline', () => {
    const lines = splitLines('only')
    expect(lines).toHaveLength(1)
    expect(lines[0]).toMatchObject({ text: 'only', eol: '', number: 1 })
  })

  it('round-trips any text byte for byte', () => {
    for (const text of ['', '\n', 'a', 'a\r\nb\nc\r\n', '﻿# T\n\n- x   \n', 'a\rb']) {
      expect(splitLines(text).map((l) => l.text + l.eol).join('')).toBe(text)
    }
  })

  it('does not trim trailing whitespace', () => {
    expect(splitLines('- Resolution: lgtm   \n')[0]!.text).toBe('- Resolution: lgtm   ')
  })
})

describe('detectEol', () => {
  it('picks the dominant ending', () => {
    expect(detectEol('a\r\nb\r\nc\n')).toBe('\r\n')
    expect(detectEol('a\nb\nc\r\n')).toBe('\n')
    expect(detectEol('no endings')).toBe('\n')
  })
})

describe('bom and final newline', () => {
  it('detects a BOM', () => {
    expect(hasBom('﻿# T')).toBe(true)
    expect(hasBom('# T')).toBe(false)
  })

  it('detects a final newline', () => {
    expect(hasFinalNewline('a\n')).toBe(true)
    expect(hasFinalNewline('a')).toBe(false)
    expect(hasFinalNewline('')).toBe(false)
  })
})

describe('applySplices', () => {
  it('applies several splices without shifting offsets', () => {
    expect(applySplices('0123456789', [
      { start: 2, end: 4, replacement: '' },
      { start: 8, end: 8, replacement: 'X' }
    ])).toBe('014567X89')
  })

  it('inserts at end of text', () => {
    expect(applySplices('abc', [{ start: 3, end: 3, replacement: '!' }])).toBe('abc!')
  })

  it('throws on overlapping splices rather than corrupting the text', () => {
    expect(() => applySplices('abcdef', [
      { start: 0, end: 3, replacement: '' },
      { start: 2, end: 5, replacement: '' }
    ])).toThrow(/overlapping/)
  })
})
