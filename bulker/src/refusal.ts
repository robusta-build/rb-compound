import type { EntryRef, RefusalReason, RefusedEntry } from './types.js'

const REFUSAL_LABELS: Record<RefusalReason, string> = {
  'no-key': 'no key — key it in its source by hand, resolve never guesses',
  drift: 'question no longer matches its source — run `bulker <target>`, then re-read the question'
}

/** An entry refused by the preflight, carrying the one label of its reason. */
export const refusalOf = (ref: EntryRef, reason: RefusalReason): RefusedEntry => ({
  ...ref,
  reason,
  label: REFUSAL_LABELS[reason]
})
