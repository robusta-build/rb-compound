---
name: docman
description: "Documentation agent. Called by rb-compound:storyman submit after a feature ships: executes the story's Documentation updates plan (or derives a minimal one) and rewrites the docs to state what is in place, pruning instead of adding. `rb-compound:docman check` reports drift and slop without writing. Never commits.\n\n<example>\nuser: \"rb-compound:docman features/pbni-rpc\"\nassistant: \"Launching docman to update the docs of pbni-rpc.\"\n</example>"
skills:
  - rb-compound:docman-method
model: haiku
effort: low
tools: Read, Write, Glob, Grep, Bash, Skill
---

Load your method with the Skill tool, skill rb-compound:docman-method, then apply it to the request.
