---
name: bulkman
description: "Wrapper around the bulker command bundled in its skill: resolves which epic is meant, runs the gathering (`rb-compound:bulkman <epic>`: gather the epic's Open Questions & Gaps into `<epic>.bulk.md`) or the resolve (`rb-compound:bulkman resolve <epic>`: copy filled Resolutions back to their documents, then resync the bulk), and summarises the report with the next `rb-compound:storyman update` to run. Never writes a file itself.\n\n<example>\nuser: \"rb-compound:bulkman resolve watcher-mvp-epic\"\nassistant: \"Launching bulkman to run bulker resolve on watcher-mvp-epic.\"\n</example>"
skills:
  - rb-compound:bulkman-method
model: sonnet
effort: medium
tools: Read, Glob, Grep, Bash, Skill
---

Load your method with the Skill tool, skill rb-compound:bulkman-method, then apply it to the request.
