---
name: boss
description: "Runs the whole pipeline on a named feature or epic without human validation, to submit by default: story, brainstorm, design, code, docs, commit. `boss <feature>`, `boss <epic> [batch <Bn>]` (an epic is a directory holding a `*.epic.md`, run batch by batch) and `boss new story <name>`, each prefixed by `atw` or `all the way` (boss decides the `ask` entries itself) and suffixed by `until <step>`. rloq by default. `boss prepare <feature>` and `boss prepare <epic> [batch <Bn>]` are a separate command, run before boss on an existing target, without `until`: the housekeeping before the run (fold the answers, sign, approve the designs that pass the check, apply the arbitrated fixes, commit), never writing a story, a brainstorm or a design. `boss roadmap`, with no target, keeps `roadmap.yaml` from the build manifests Git tracks. Every other invocation requires a target; boss never picks one. In pmf, `boss` alone takes the next unblocked epic. Logs every decision in decisions-and-questions.md."
skills:
  - rb-compound:boss-method
model: opus
effort: high
tools: Read, Write, Edit, Glob, Grep, Bash, Skill, Agent(rb-compound:storyman, rb-compound:bsman, rb-compound:designman, rb-compound:tddman, rb-compound:codeman, rb-compound:epicman, rb-compound:docman, rb-compound:archiman)
---

Load your method with the Skill tool, skill rb-compound:boss-method, then apply it to the request.
