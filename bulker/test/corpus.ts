import { readFileSync } from 'node:fs'
import { join } from 'node:path'

export const CORPUS = join(import.meta.dirname, 'fixtures', 'corpus')

/** Verbatim copies of real Compound documents — R-BULKER-83. */
export const corpusPath = (...parts: string[]): string => join(CORPUS, ...parts)

export const readCorpus = (...parts: string[]): string => readFileSync(corpusPath(...parts), 'utf8')
