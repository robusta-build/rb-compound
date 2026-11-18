# Brainstorm : Status line maison pour Claude Code CLI

**Date :** 2026-06-29
**Feature :** statusline
**Participants :** autobrain (autonomous)

> **Note:** All axes completed autonomously by autobrain. Decisions are flagged with **Décision (autonome):** for review.

This is **not** a PRD. It captures decisions and reasoning to feed the future PRD. Source: `features/statusline/statusline.story.md`.

---

## Business Rules

Domain/behavioral rules the status line must obey, independent of implementation. The story already resolved its 7 Open Questions (all `Note: lgtm`); the choices below honor those and make the implicit rules explicit.

- **BR1** — A missing JSON field must hide its segment, never produce an error or a broken line. *(from the story — to validate)*
- **BR2** — The status line must occupy a **single line by default**; it may fall back to a compacted form when the terminal is narrow, but never wrap into unintended extra lines. *(from the story, Q1 — to validate)*
- **BR3** — Color encodes **hierarchy and alerting only**, never decoration. A reader must be able to infer severity from color alone. *(from the story — to validate)*
- **BR4** — Context-usage color thresholds: green ≤ 60%, yellow 60–85%, red > 85%; an explicit badge is shown when `exceeds_200k_tokens` is true. *(from the story, Q4 — to validate)*
- **BR5** — The git branch is always shown when available; a dirty working tree is highlighted. The dirtiness indicator is **deferred** unless the JSON exposes it directly (no synchronous `git status` call on every refresh). *(from the story, Q7 — to validate)*
- **BR6** — Effort level is shown **only when it is not the default**; output style and CLI version are not shown on the main line. *(from the story, Q3 — to validate)*
- **BR7** — Cost is shown as session USD plus session lines added/removed; these reflect the **current session only**, not lifetime totals. *(from the story — to validate)*
- **BR8** — The script is read-only with respect to the environment: it must not mutate files, git state, or settings while rendering — it only reads stdin + env and writes stdout. *(defined autonomously — a status renderer triggered on every refresh must have zero side effects to be safe at high frequency.)*
- **BR9** — Rendering must be deterministic for a given stdin payload (same input → same output), so the script is testable with fixtures. *(defined autonomously — required to satisfy the DoD's "JSON d'exemple complet" acceptance check.)*
- **BR10** — The script must terminate quickly and never block; a slow or hung render degrades the entire prompt experience. *(defined autonomously — the status line runs synchronously on the user's prompt path.)*

---

## 1. Product Role

**Contexte :** The story frames this as a technical tooling artifact: a shell script wired into Claude Code's `statusLine` mechanism that renders session state under the prompt.

**Décision (autonome) :** It **is** a minimalist, dense, self-authored single-script status renderer (shell + jq) for one user's macOS/zsh Claude Code sessions. It **is NOT** a configurable framework, a theming engine, a powerline clone, or a redistributable product — ccstatusline already occupies that space.

**Rationale :** Defining it as a personal script (not a product) keeps every later decision biased toward simplicity and removes the temptation to add configuration surface.

---

## 2. Target Audience

**Contexte :** The story names a single persona: a hardcore dev who chains Claude Code sessions in the terminal.

**Décision (autonome) :** Audience = the author (one expert dev), high terminal/shell maturity, who values scanning speed over discoverability and screen real estate over ornament. No onboarding, no defaults-for-beginners.

**Rationale :** A single expert user means we can favor density and terse glyphs over labels, and skip any guided configuration.

---

## 3. Core Problem

**Problème :** The terminal shows no session state. To know the active model, branch, session cost, or remaining context, the user must guess or break their flow to run a command.

**Options considérées :**
- Option A: Render the essential state continuously under the prompt — zero interaction.
- Option B: A command the user runs on demand — rejected, it reintroduces the very interruption we want to remove.

**Décision (autonome) :** Continuously surface the essential session state (location, model, context, cost) at a glance, with no command to type.

**Rationale :** Persistent ambient display is the only thing that removes the "guess or break flow" cost the story calls out.

---

## 4. Unique Value Proposition

**Contexte :** State of the art (ccstatusline) is rich: powerline, themes, gradients, up to 3 lines, PR widgets, weekly usage, React/Ink config UI.

**Décision (autonome) :** The UVP is **deliberate subtraction**: a single dense line, no decoration, only fields a session-chaining dev actually reads, owned in one auditable shell script the user can edit in seconds.

**Rationale :** Against a feature-maximal incumbent, "less, faster to scan, fully owned" is the only differentiation worth pursuing for this persona.

---

## 5. Functional Scope

**Contexte :** The story fixes a clear in/out boundary.

**In scope:** single shell script reading stdin via jq; segments = model, project dir, branch + git state, context used %, cost + session lines; ANSI color hierarchy and alert thresholds; missing-field tolerance; basic width adaptation via `COLUMNS`; wiring in `settings.json` + `chmod +x`.

**Out of scope:** powerline/themes/gradients/decorative separators; multiple independent status lines; PR/MR widgets; weekly Sonnet/Opus usage; account email; block timer; interactive config UI; OSC 8 clickable links (Q5, deferred); Windows/PowerShell (Q6, separate story).

**Décision (autonome) :** Adopt the story's scope verbatim. The dirty-git indicator (Q7) stays **conditionally in scope**: included only if the real stdin JSON exposes cleanliness; otherwise deferred to avoid a per-refresh `git status`.

**Rationale :** The boundary is already sound and minimal; the only genuinely undecided item is git-dirtiness, which we gate on real-payload inspection rather than committing to a costly synchronous call.

---

## 6. Core Features (MVP)

Segment order (resolving Q2): **location (project dir + branch) → model → context % → cost + lines**, left to right. Location goes leftmost because it is glanced at most; metrics go right where the eye lands last.

### Feature: Location segment (project dir + git branch)

**Capability:** Show the project directory name and current git branch. If a dirty-state field exists in the JSON, highlight the branch when the tree is dirty (BR5).

**Acceptance Criteria:**
- Given a JSON with `workspace.project_dir` and `worktree.branch`, When rendered, Then the directory base name and branch are shown together in the leftmost segment.
- Given a JSON with no branch field, When rendered, Then the branch is omitted and the directory still renders without error.
- Given a JSON whose dirty-state field is present and true, When rendered, Then the branch is shown in the alert color.

**Test Approach:** Fixture-driven unit tests piping crafted JSON to the script and asserting on stdout (with ANSI codes stripped for value assertions, kept for color assertions).

---

### Feature: Model segment

**Capability:** Show `model.display_name`. Append an effort badge only when `effort.level` is not the default (BR6).

**Acceptance Criteria:**
- Given `model.display_name` present and default effort, When rendered, Then only the model name appears, no effort badge.
- Given a non-default `effort.level`, When rendered, Then a compact effort badge is appended to the model segment.
- Given `model.display_name` absent, When rendered, Then the model segment is omitted entirely (BR1).

**Test Approach:** Fixture unit tests covering default-effort, non-default-effort, and missing-model cases.

---

### Feature: Context segment

**Capability:** Show `context_window.used_percentage`, colored by threshold (green ≤60, yellow 60–85, red >85), plus an explicit badge when `exceeds_200k_tokens` is true (BR4).

**Acceptance Criteria:**
- Given used_percentage = 45, When rendered, Then the segment is green.
- Given used_percentage = 90, When rendered, Then the segment is red.
- Given `exceeds_200k_tokens` true, When rendered, Then an explicit overflow badge is shown regardless of percentage color.

**Test Approach:** Parameterized fixture tests across threshold boundaries (59/60/85/86) plus the 200k flag, asserting on emitted ANSI color codes.

---

### Feature: Cost segment

**Capability:** Show `cost.total_cost_usd` and session `total_lines_added` / `total_lines_removed` (BR7).

**Acceptance Criteria:**
- Given cost and line fields present, When rendered, Then USD cost and +/- line counts appear in the rightmost segment.
- Given cost fields absent, When rendered, Then the cost segment is omitted without error (BR1).

**Test Approach:** Fixture unit tests for present-all and missing-cost cases; assert numeric formatting (e.g. 2-decimal USD).

---

### Feature: Width adaptation + robustness

**Capability:** Adapt to `COLUMNS`: render a compacted variant (drop/shorten lower-priority segments or truncate) when the terminal is narrow, never wrapping (BR2). Tolerate any missing field (BR1).

**Acceptance Criteria:**
- Given a narrow `COLUMNS` (e.g. 60), When rendered, Then output fits within the width without wrapping (compact/truncated form).
- Given an empty or malformed JSON on stdin, When rendered, Then the script exits cleanly with a minimal or empty line, never an error trace (BR1, BR10).
- Given the full example JSON, When rendered, Then all retained segments appear on one line, color-hierarchized.

**Test Approach:** Fixture tests at several `COLUMNS` widths; a fuzz/edge fixture set (empty string, `{}`, truncated JSON); a final manual check inside a real Claude Code session (per DoD).

---

## 7. Critical Edge Cases

**Décision (autonome) :** Handle these explicitly; all resolve to "degrade gracefully, never break the line."

- **Empty / malformed stdin** → emit empty or minimal line, exit 0 (BR1, BR10).
- **Partial JSON** (any subset of fields missing) → each absent field silently drops its segment (BR1).
- **Field-name drift** between the assumed names and the installed CLI version → the script must be resilient (jq `// empty` defaults); real-payload inspection is a prerequisite (story Prereq 3).
- **Very narrow terminal** → compact/truncate, no wrap (BR2).
- **No git context** (not in a repo / no worktree) → location segment shows dir only.
- **`jq` absent or non-executable** → already mitigated (Prereq 1, present), but the script should fail to a safe minimal line rather than spew shell errors.
- **High refresh frequency** → no synchronous external calls (BR5, BR8, BR10).

**Rationale :** A status renderer on the prompt hot path must treat every anomaly as "render less," never "render an error."

---

## 8. Non-Functional Constraints

**Décision (autonome) :**
- **Performance:** sub-100ms typical render; no blocking calls, no network, no synchronous `git status` (BR10).
- **Security/safety:** read-only — no file/git/settings mutation during render (BR8); never `eval` untrusted JSON-derived strings.
- **Cost:** zero runtime cost; pure local shell + jq.
- **Compliance/privacy:** does not print account email or other PII (explicitly out of scope per story).
- **Portability:** target macOS/zsh + bash + jq only; no Windows support (Q6).

**Rationale :** Because the script runs on every prompt refresh, speed and zero side effects are non-negotiable; everything else (theming, portability) is intentionally sacrificed.

---

## 9. External Dependencies

**Décision (autonome) :**
- **Claude Code `statusLine` contract** — stdin JSON → stdout lines; the integration surface. Risk: field names/shape may differ from assumptions (Prereq 3, to confirm by inspecting a real payload).
- **`jq`** — JSON parsing; present at `/opt/homebrew/bin/jq` (Prereq 1, OK).
- **ANSI-capable terminal** — macOS/zsh (Prereq 5, OK).
- **`.claude/settings.json`** — wiring point under `statusLine` (type command); user owns it (Prereq 4, OK).

**Rationale :** Only the JSON field names carry real uncertainty; every other dependency is already satisfied on the target machine.

---

## 10. Major Risks

**Décision (autonome) :**
- **Field-name mismatch (technical, medium):** assumed JSON keys may not match the installed version → mitigate by inspecting a real stdin payload before finalizing, and using defensive jq defaults. *Most important risk.*
- **Density vs. legibility (product, low):** packing too much onto one line could become unreadable → mitigated by strict segment limit and width adaptation.
- **Scope creep toward ccstatusline (product, low):** temptation to add badges/widgets → mitigated by the explicit out-of-scope list.
- **Git-dirtiness latency (technical, low):** if added via synchronous `git status`, it would slow every refresh → deferred unless the JSON exposes it (BR5).
- **Adoption (very low):** single known user who requested it.

**Rationale :** The only risk that can actually break delivery is the JSON contract; the rest are bounded by the minimalist scope.

---

## Gaps / Open Questions

The story's 7 Open Questions are all resolved (`Note: lgtm`) and reflected in the decisions above. Remaining items for human review:

**Q1 : Real stdin JSON field names — CONFIRMED (payload captured 2026-06-29).**
A real payload was captured from a live session (CLI v2.1.185) and stored as a test fixture: `fixtures/real-payload.json`. Reconciliation against the brainstorm assumptions:

Confirmed present (names exact): `model.display_name` (`"Opus 4.8"`), `model.id` (`"claude-opus-4-8"`), `workspace.current_dir`, `workspace.project_dir`, `workspace.repo.{host,owner,name}`, `cost.total_cost_usd`, `cost.total_lines_added`, `cost.total_lines_removed`, `context_window.used_percentage`, `context_window.remaining_percentage`, `context_window.context_window_size`, `exceeds_200k_tokens`, `effort.level`, `version`, `output_style.name`, `session_name`, `thinking.enabled`, `fast_mode`, `rate_limits.five_hour.used_percentage`, `rate_limits.seven_day.used_percentage`.

**Absent in a normal session (DESIGN-CHANGING):** there is **no git branch field and no dirty-state field** in the payload. `worktree.branch` / `worktree.*` appear only in `--worktree` sessions; `workspace.git_worktree` only inside a linked worktree. In an ordinary session none of them are present.
Recommandation: the script must obtain the branch itself via git (e.g. `git -C "$project_dir" symbolic-ref --short HEAD`), it cannot come from the JSON. This is cheap and acceptable. Dirty-state still requires the more costly `git status` (see Q2). Use jq `// empty` defaults everywhere so any field drift degrades gracefully.
Note : lgtm

**Q1bis : `context_window_size` is 1_000_000 in this session, not 200_000.**
The captured session runs on extended context (1M). So the visual context bar must scale off `context_window.used_percentage` (pre-calculated, already correct) or the actual `context_window_size`, never a hardcoded 200k. The `exceeds_200k_tokens` badge stays a separate fixed-threshold flag, independent of bar color.
Note : lgtm

**Q2 : Branch AND dirty-git both require a git call now — what to run on the hot path?**
Since even the branch name is absent from the JSON (Q1), the script will already shell out to git. Recommandation: run only the cheap branch lookup (`git symbolic-ref`, ~ms, no working-tree scan) on every refresh; keep the dirty-state check (`git status --porcelain`) deferred or behind `refreshInterval` caching, never an unconditional per-refresh full status. This revises BR5: "no synchronous git" softens to "only the cheap O(1) branch ref synchronously; defer the O(tree) dirty scan."
Note : lgtm

**Q2bis : Bonus fields now known to be available — opt in any?**
The payload also exposes `workspace.repo.name` (nicer than the dir basename when in a repo), `rate_limits.five_hour.used_percentage` (5h quota — plausibly valuable to a hardcore dev chaining sessions), `fast_mode`, and `thinking.enabled`.
Recommandation: keep the MVP line as decided (location/model/context/cost). Consider `rate_limits.five_hour.used_percentage` as the single most defensible *optional* add for this persona, behind the same threshold-coloring as context. Leave `fast_mode`/`thinking`/repo-owner out of the main line. Decide at `/concept`.
Note : lgtm

**Q3 : Compaction strategy on narrow terminals — drop segments or truncate?**
Recommandation: drop lowest-priority segments first (cost, then model effort badge) before truncating the project-dir name, since location + context are the highest-value glance targets; keep the priority order explicit in the script so thresholds are tunable. *(BR2.)*
Note : lgtm

**Gap G1 : Threshold/segment values are "common sense, tune in real use."**
Recommandation: treat the 60/85% context thresholds and the segment order as defaults exposed as clearly-marked variables at the top of the script, so the user adjusts them without rereading logic; the DoD already asks for short docs on how to adjust them.
Note : lgtm

---

## Next Steps

1. Capture one real stdin payload from a live Claude Code session and reconcile field names (Q1, Prereq 3).
2. Write the PRD (`/concept`) turning these decisions into an implementation plan: script structure, jq extraction with safe defaults, segment renderers, threshold variables, width adaptation.
3. Implement `.claude/statusline.sh` with fixture-based tests (BR9), then wire into `settings.json` and `chmod +x`.
4. Verify the real rendering inside a live session (DoD) and write the short segment/threshold doc.
