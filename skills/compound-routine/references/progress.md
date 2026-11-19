# Progress block

A design doc whose implementation has started carries a `## Progress` block: one line per Requirements group, what is done and what is not, read at a glance on resumption without opening the code or the tests. The code stays the reference, the `**Status:**` line stays the only state of the document.

It does not belong to designman, same pattern as the status line: the main agent writes and refreshes it during the implementation; `tddman` and `codeman` still write nothing in the design doc; designman never counts. A DRAFT never carries one — nothing is implemented, each line would read `TODO 0/n`, and a block that only says "not started" costs context while teaching nothing. In update mode, when designman brings the document back to DRAFT because the contracts changed, it **deletes** the block with the cycle: the groups move with the contracts, a block that survives a contract change is a stale block.

Place: a real `##` section holding a single fenced block with no language tag, between the header and `## Goal`. The fence is what saves the alignment for readers with a proportional font; the language tag is dropped because syntax highlighting recolors the cells of the gauge.

Normative rendering — 14 items done out of 36, hence the 38%:

````
## Progress — APPROVED 38%

```
      Pool Catalog              ████████████████████  8/8    ✅
 WIP  F1 AMM Source UniV2       ██████████░░░░░░░░░░  2/4
 WIP  F2 CEX Orderbook Binance  █████░░░░░░░░░░░░░░░  1/4
 WIP  F3 Oracle Abstraction     ███████████████░░░░░  3/4
TODO  D2 Competition Detector   ░░░░░░░░░░░░░░░░░░░░  0/4
TODO  Acceptance Criteria       ░░░░░░░░░░░░░░░░░░░░  0/12
```
````

The lines: one per `###` subsection of `## Requirements`, in the order of the body and with the label taken verbatim, then a last `Acceptance Criteria` line. A `## Requirements` without subsections gives a single `Requirements` line. The block is the only place where progress appears: no `R-` line, no `AC-` line, no title of the body carries a state marker.

Line grammar, five fixed-width columns:

- state prefix, 4 columns right-aligned — `TODO` when `done` is 0, ` WIP` when `0 < done < total`, four spaces when the group is closed. Text, never an emoji: an emoji takes two columns where `WIP` takes three, so an emoji prefix shifts each line by a different amount and the alignment of the block dies.
- two spaces, then the label, padded to the width of the longest label of the block.
- two spaces, then the gauge: exactly 20 cells, `█` (U+2588) full and `░` (U+2591) empty.
- two spaces, then the count `done/total`, padded to the width of the longest count of the block.
- `✅` at the end of the line, on closed groups only, after at least two spaces. The only column with no alignment constraint: nothing follows it.

No other marker anywhere — the gauge already says "in progress" and "not started", a second glyph would be noise — and no deferral annotation like `R84 → V1`: a requirement that changes scope leaves the document through `designman update`, not through a note in the margin.

Gauge arithmetic: `floor(done × 20 / total)` full cells, bounded to 1 at the minimum as soon as something is done, to 19 at the maximum as long as something remains. 20 full therefore means closed and 0 not started — the two readings the eye takes first are exact, never a rounding artifact. Floor rather than round: a gauge that rounds up over-declares, and this view has no authority to over-declare anything.

Block header: `## Progress — <STATUS> <N>%`. `<STATUS>` copies verbatim the token of the `**Status:**` line, whatever it is. `<N>` is `floor(Σ done × 100 / Σ total)`, weighted by items, so that a reader who adds up the counts displayed below lands on the same number. This header is a copy and never a source: it is not a `**Status:**` line, `grep -m1 '^\*\*Status:\*\*'` always settles on the header of the file, and if the two diverge the header wins and the block is stale.

What does not come back with this block, and stays banned: the "Progress is truth" rule, states on the `R-`/`AC-` lines, the markdown table, the percentage that would be authoritative against the code. The block also disappears when the document becomes IMPLEMENTED, deleted in the very edit that writes the status — all its lines would be closed, it would only repeat the status line at ten times the price.
