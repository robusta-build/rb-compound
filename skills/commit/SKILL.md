---
name: commit
description: "Commit convention and precommit checklist: `type(scope): description`, only the files of the current task, no AI attribution, no emoji. Load it when the user asks for a git commit or types `/rb-compound:commit`."
---

# Commit

Create a git commit for staged or all changes. 

Never do the shell git commit command on your lone side. Use this skill to get commit message suggestions based on your changes.
Either ask before, either do it on the user's `/rb-compound:commit` command.
Exception: a `rb-compound:boss` run commits its own pipeline steps alone, without asking (`rb-compound:compound-routine` §boss).

## Precommit Checklist

We commit after having work on a task or some features. We'll call it a task here.
Another Claude may run in parrallele on another task, so you must decide by yourself what are
the files related to your task you have done in your context.


- list files concerned by your task
- ensure all tests of that task pass
- If the feature has a `{feature}.story.md`, tell the user when its Definition of done looks met, and suggest `rb-compound:storyman submit {feature}`
- Legacy projects: a `{feature}.prd.md` still carrying a progress table gets it updated, and that change is part of the commit

## Rules


1. Commit only the changes relevant to your context.
2. If you know something is broken by tests or compilation, do not commit it.
2. NEVER add "Co-Authored-By" or any mention of Claude/AI in commits
2. NEVER add emojis to commit messages
3. Use this exact format: `type(scope): description`
4. If code is mostly in french, commit in french


## Commit Format

```
type(scope): short description in imperative mood
```

Dont list all feature with bullet points, just summarize the main change.

### Types
- `feat` - New feature
- `fix` - Bug fix
- `chore` - Maintenance, dependencies, tooling
- `refactor` - Code restructuring without behavior change
- `docs` - Documentation only, when writing some .md files (archi, story, design doc, Readme...)
- `test` - Adding or updating tests, without creating the feature in that commit

### Scope
The domain or package affected:
- `auth-domain`, `auth`, `auth-backend`
- `kit`, `engine`, `runtime`
- `deps` for dependency updates
- `housekeeping` for cleanup tasks

### Description
- Imperative mood ("add", "fix", "update" not "added", "fixed", "updated")
- Lowercase
- No period at end
- Be specific but concise

## Process

1. Run `git status` to see changes
2. Run `git diff --staged` or `git diff` to understand what changed
3. Group related changes logically
4. Write commit message following the format above
5. Commit without any AI attribution

## Examples

Good:
```
feat(auth-domain): add token refresh logic
fix(auth): handle expired token redirect
chore(deps): update zod to v3.24
refactor(auth-backend): extract provider factory
docs(parser): added documentation of @package/name
```

Bad:
```
Fixed the bug          # no type/scope, past tense
feat: stuff            # vague, no scope
FEAT(Auth): Add Things # wrong case
feat: lot of things done \n - feat1 \feat2 - ...  # too detailed
```
