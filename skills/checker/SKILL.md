---
name: checker
description: "Code quality gatekeeper that runs build, lint, and test checks. Use before coding to ensure clean state, and after coding to validate changes before commit."
---

# Checker Skill

You are a code quality gatekeeper. Run checks before and after coding to ensure clean commits and working code.

## Usage

- `/checker before` - Run pre-coding checks (clean git, compiles, lints)
- `/checker after` - Run post-coding checks (compile, test, format, lint), then ready for review

## Arguments

$ARGUMENTS - Phase: `before`, `after`, or empty (auto-detect)

## Phase Detection

If no argument provided:
1. Run `git status --porcelain`
2. If output is empty → run **before** phase
3. If output has changes → run **after** phase

---

## BEFORE Phase

Run these checks sequentially. Stop at first failure.

### Step 1: Git Status

```bash
git status --porcelain
```

**If clean (empty output):** Proceed to Step 2

**If dirty (has output):** Stop and present options:

```
## Uncommitted Changes Detected

<list changed files>

| Option | Action |
|--------|--------|
| A | Stash changes (`git stash -u`) and proceed |
| B | Commit now with /rb-compound:commit, then proceed |
| C | Discard changes (`git checkout .`) - DESTRUCTIVE |
| D | Abort - I'll handle this manually |

Which option?
```

### Step 2: Detect Build System

Scan for build configuration in this priority order:

| File | System | Compile Command |
|------|--------|-----------------|
| `package.json` | Node/TS | `npm run build` or `tsc --noEmit` |
| `tsconfig.json` | TypeScript | `tsc --noEmit` |
| `pom.xml` | Maven | `mvn compile -q` |
| `build.gradle` | Gradle | `./gradlew compileJava` |
| `Cargo.toml` | Rust | `cargo check` |
| `go.mod` | Go | `go build ./...` |
| `pyproject.toml` | Python | Skip (no compile) |

**Scope detection:** If task mentions a specific package/area:
- Find that package's directory
- Run compile from there (e.g., `cd packages/api && npm run build`)
- If unclear, compile from project root

### Step 3: Compile

Run the detected compile command.

**If success:** Proceed to Step 4

**If failure:** Stop and show:

```
## Compilation Failed

<error output, truncated to key lines>

| Option | Action |
|--------|--------|
| A | Fix these errors first (I'll help) |
| B | Proceed anyway (errors may be unrelated) |
| C | Abort |

Which option?
```

### Step 4: Lint (if available)

Check for linter config:

| File | Linter | Command |
|------|--------|---------|
| `.eslintrc*` or `eslint.config.*` | ESLint | `npm run lint` or `npx eslint .` |
| `biome.json` | Biome | `npx biome check .` |
| `.pylintrc` or `pyproject.toml[tool.pylint]` | Pylint | `pylint <src>` |
| `checkstyle.xml` | Checkstyle | `mvn checkstyle:check` |

**If no linter:** Skip, proceed.

**If lint passes:** Ready to code!

**If lint fails:** Show errors and same option pattern as compile.

### Before Phase Complete

```
## Pre-Coding Checks Passed

- Git: Clean
- Compile: <system>
- Lint: <linter> (or "skipped")

Ready to code. Run `/checker after` when done.
```

---

## AFTER Phase

Run after coding is complete, before committing.

### Step 1: Compile Current Package

Same as Before Step 3, but scoped to changed files:

```bash
git diff --name-only HEAD
```

Identify which package(s) were touched, compile those.

### Step 2: Format (if available)

| File | Formatter | Command |
|------|-----------|---------|
| `.prettierrc*` or `prettier` in package.json | Prettier | `npx prettier --write .` |
| `biome.json` | Biome | `npx biome format --write .` |
| `rustfmt.toml` | Rustfmt | `cargo fmt` |
| `.editorconfig` + Go | gofmt | `go fmt ./...` |

Run formatter (it auto-fixes). No need to ask - just format.

### Step 3: Lint + Autofix

Run linter with fix flag if available:

| Linter | Fix Command |
|--------|-------------|
| ESLint | `npx eslint . --fix` |
| Biome | `npx biome check --apply .` |

**If unfixable errors remain:** Show errors, ask if user wants to fix manually or proceed.

### Step 4: Run Tests

Detect test framework and scope:

| File/Pattern | Framework | Command |
|--------------|-----------|---------|
| `vitest.config.*` | Vitest | `npx vitest run` |
| `jest.config.*` | Jest | `npx jest` |
| `*.test.ts` pattern | Vitest/Jest | Use detected |
| `pom.xml` | Maven | `mvn test -q` |
| `build.gradle` | Gradle | `./gradlew test` |
| `pytest.ini` or `tests/` | Pytest | `pytest` |
| `*_test.go` | Go | `go test ./...` |

**Scope:** Run full unit test suite (fast feedback). Skip E2E/integration unless user specifies.

**If tests pass:** Proceed to Step 5

**If tests fail:**

```
## Tests Failed

<failure summary>

| Option | Action |
|--------|--------|
| A | Fix failing tests (I'll help) |
| B | Skip these tests (add --skip flag to commit) |
| C | Abort commit |

Which option?
```

### Step 5: Final Git Status

```bash
git status
```

Show what will be committed.

### Step 6: Ready for Review

Present the final status:

```
## All Checks Passed - Ready for Review

- Compile: OK
- Format: Applied
- Lint: OK (N issues auto-fixed)
- Tests: N passing

Files to commit:
<git status output>

Ready for review. Use /rb-compound:commit when satisfied.
```

**Do not commit automatically.** The user reviews and decides when to commit.

---

## Quick Reference

```
/checker before    →  git clean? → compile → lint → ready to code
/checker after     →  compile → format → lint → test → ready for review
/checker           →  auto-detect phase based on git status
```

## Rules

1. **Fail fast** - Stop at first real failure, don't accumulate errors
2. **Scope smart** - Compile/test only affected packages when possible
3. **Autofix when safe** - Format and lint --fix don't need permission
4. **Tests are mandatory** - Never skip Step 4 without explicit user override
5. **Never auto-commit** - Always end with "ready for review", let user decide when to commit
