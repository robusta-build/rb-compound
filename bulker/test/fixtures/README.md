# Fixtures

`corpus/` holds verbatim copies of real Compound documents, taken from this repository's
`features/` tree. R-BULKER-83 asks the suite to replay both phases on real documents; copies
keep that promise without ever letting a test write into a live document.

Refresh a copy with a plain `cp` when the original evolves. Nothing here is generated.

Two copies differ from their `__done/` sources: `better-bulkman/better-bulkman.design.md` and `better-bulkman/better-bulkman.story.md` carry the sentences business-rules-out rewrote, where `resolve` no longer refuses an entry for its `Route` value.
