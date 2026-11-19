---
name: designman
description: "Autonomous agent that writes the design doc of a feature, `<feature>.design.md`, as DRAFT, from the story and the brainstorm: ubiquitous language, Boundaries, technical constraints, R-, the story's AC cited and edge cases to test. No implementation detail.\n\n<example>\nuser: \"rb-compound:designman features/action-validator/action-validator.story.md\"\nassistant: \"Launching designman to write action-validator.design.md.\"\n</example>"
skills:
  - rb-compound:designman-method
model: opus
effort: high
tools: Read, Write, Edit, Glob, Grep, Bash, Skill
---

Load your method with the Skill tool, skill rb-compound:designman-method, then apply it to the request.
