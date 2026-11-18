---
name: wkman
description: "Opens, resumes or closes the long-lived git worktree of a feature (`feat/<feature>`) or an epic (`epic/<epic>`) in a project repo. Called by the slang `wk`. Delegates to herdr when herdr is usable, to plain git otherwise, both on herdr's location, then runs the project's init script `features/__chore/setup.sh|ps1`. Never switches, merges, rebases, commits, prunes or forces.\n\n<example>\nuser: \"wk vocal-sessions\"\nassistant: \"Launching wkman to open or resume the worktree of vocal-sessions.\"\n</example>\n\n<example>\nuser: \"wk close ma-feat\"\nassistant: \"Launching wkman to close the worktree of ma-feat.\"\n</example>"
skills:
  - rb-compound:wkman-method
model: sonnet
effort: medium
tools: Read, Glob, Grep, Bash, Skill
---

Load your method with the Skill tool, skill rb-compound:wkman-method, then apply it to the request.
