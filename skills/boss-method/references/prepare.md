## boss prepare

`boss prepare <feature> | <epic> [batch <Bn>]` does the housekeeping between the user's arbitration and the boss run: fold the answers, sign the entries that need no human, approve the designs that pass the check, apply the arbitrated fixes, commit, the documents of its scope already modified included. It never creates a story, a brainstorm or a design: that work stays with `boss <target>`, in rloq or atw. Started from `main`, `master` or `develop`, it ends back there. Phase 1 and the Target and Batches rules of Phase 2 apply; Phases 3 to 8 do not.

The markers of epics and stories are read in either series, French or English, as named inline below (`avec brainstorm` and `avec brainstorms` are read as `with brainstorm` and `with brainstorms`); the pairs live in `${CLAUDE_SKILL_DIR}/../compound-routine/references/headers.md`.

Scope:

- `<feature>`: its story, brainstorm and design, and the open entries of the `*.fix.md` whose `**Owner :**` is that story. An epic's fix document is read by an epic target only.
- `<epic> [batch <Bn>]`: the epic itself, the stories of the current batch or of `Bn` (Phase 2, Batches, `Outside batch` excluded; `Hors batch` in a French epic), their brainstorms and designs, and the open entries of the `*.fix.md` whose Owner is the epic or one of those stories. Other batches are not read.
- A fix entry is open when its `- Fixed:` line is empty, arbitrated when it carries a `- Arbitrage (<user>, <date>) :` bullet anywhere in the entry. The fix format of fixman does not change.

Read-only pass, before the branch switch of Phase 1, nothing written:

- The expected branch exists and is not the current one: the target and this pass read it (`git show <expected branch>:<path>`, `git ls-tree -r --name-only <expected branch> -- features/`), and take the checkout's file for a document already modified. `<epic>.bulk.md` is read from the checkout when the tree state lists it, otherwise from the expected branch; it stays in the `Not committed` set, read for the stop only. No switch. Otherwise they read the checkout.
- A name absent from the checkout is looked up on the local `feat/<name>` and `epic/*` branches, with the patterns of Phase 2 Target. The path found gives the expected branch by the rule of Phase 1; the same path on several branches is one target. Two different paths: `boss refused: <name> is <path> and <path>, pass a path.`
- A clean story of the checkout absent from the existing expected branch counts as unknown: `boss refused: <name> is not on <expected branch>.`
- The tree state is read once, `git status --porcelain --untracked-files=all`, and splits every listed path in two. Never a stash.
  - document already modified: a story, brainstorm, design or `*.fix.md` of the scope, or the epic of an epic target, even written before the run;
  - the `Not committed` set: everything else, such as code, the bulk, the epic of a story target, the documents of another batch. A `decisions-and-questions.md` already modified belongs to it, its new line included.

Stopped before any write, in this order, no branch switched, nothing committed:

- a Resolution filled in `<epic>.bulk.md` and empty in its source entry, the source being a document of the scope: `boss stopped: run bulkman resolve <epic> first.` The whole target stops, not only that document. prepare never runs bulkman;
- no filled Resolution, no empty entry to sign, no story with a brainstorm and no design, no design DRAFT, no open arbitrated fix and no document already modified: `nothing to prepare`. When the expected branch is checked out in a linked worktree, the reply adds `; <expected branch> is checked out in <path>, its uncommitted documents are not read from here.`;
- the `git switch` of Phase 1 refused, with git's reason:
  - `boss stopped: <files> differ on <expected branch>: <git's reason>`, for a modified or untracked file;
  - `boss stopped: <expected branch> is checked out in <path>, run boss prepare <x> from there: <git's reason>`.

Steps, in this order: fold, then approve, then fix.

1. Sort: boss loads `rb-compound:relevant-oq` and sorts every empty entry of the scope's stories, brainstorms, designs and epic, as §Sorting Open Questions does in rloq. `decide` or `nothing` gets `Resolution: lgtm (boss)` before the owner's update, which folds it in the same run. An `ask` entry stays empty and goes into the report: prepare never fills an `ask` Resolution.
2. Fold: every filled Resolution goes to its owner, APIs unchanged, in this order:
   ```
   rb-compound:storyman update <story> with brainstorm          # story with a brainstorm and no design
   rb-compound:storyman update <story> [with brainstorm]        # story target carrying a filled Resolution
   rb-compound:storyman update <epic> [Bn] with brainstorms     # epic target
   rb-compound:designman update <story> : fold the resolved entries   # design carrying a filled Resolution, or named by storyman's output
   rb-compound:epicman update <epic>                           # epic target, last fold, once storyman has passed the epic entries
   ```
   A story with a brainstorm and no design gets `rb-compound:storyman update <story> with brainstorm` on every prepare, as Phase 2 does for a full run: no file records a brainstorm fold. An entry born in a fold is sorted and signed the same way, folds on the owner's next pass and does not hold the approval. An owner reporting BLOCKED leaves its document as is, is named in the report, and the other documents go on.
3. Missing documents: a "story to write" line (`story à écrire` / `story to write`), a story with no brainstorm or no design is named in the report with the boss run that writes it, never written. Never called: storyman to create a story, bsman, designman to create a design, bulkman, `bulker`, `rb-compound:storyman submit`, `rb-compound:storyman done`.
4. Approve: after the folds, a design DRAFT, one a fold sent back to DRAFT included, is approved when no `ask` entry is pending in its story, brainstorm or design and the check of Phase 5 step 3 passes: `**Status:** APPROVED (<YYYY-MM-DD> — validated by boss)`, that line only. Otherwise it stays DRAFT, with no `rb-compound:designman update` retry, and the report gives the reason: the AC keys, `Boundaries`, or `<n> ask`. A design IMPLEMENTED under a reopened story is not touched: its story and brainstorm answers fold, and the report names `boss <feature>`.
5. Fix: each open arbitrated fix of the scope runs the fix cycle of `rb-compound:fixman-method`, one after the other, never in parallel. tddman, or codeman when no test runner covers the fixed files, implements it and stamps `Fixed:`; docman and archiman take the doc lines it reports stale; one commit holds code, fix document and docs.
   ```
   rb-compound:tddman <fix document path> <FIX-key> LFG fast
   Arbitrated fix: implement the Arbitrage, stamp Fixed: once the checker is green, report the doc lines it made false.
   Not committed, do not touch: <files>. A fix that needs one: stop before writing, leave Fixed: empty, name the file.
   Do not ask questions.
   ```
   A fix that needs a file of `Not committed` stays open, `Fixed:` empty, named in the report with that file; the next fixes go on. Tests still red after two retries: a `wip(<scope>)` commit, `Fixed:` stays empty, and the remaining arbitrated fixes are not run, left untouched and named in the report. An open fix without arbitration is named in the report, never implemented. A defect prepare notices itself is named for fixman, never corrected.

Writes, and only these:

- `Resolution: lgtm (boss)` in an empty entry sorted `decide` or `nothing`, in the story, the brainstorm, the design and the epic; in the epic, that signature only (§Sorting Open Questions);
- the Status line of a design;
- one outcome line in `decisions-and-questions.md` (Golden Rule 3);
- the commits, on the target's branch per §Commits, never a push: one `docs(<scope>)` commit for the folds, signatures, approvals, documents already modified and the `decisions-and-questions.md` line, before the fix commits, even when the run wrote nothing else; then one `fix(<scope>)` per fix, or `wip(<scope>)` for a fix still red. `<scope>` is the feature or the epic.

A prepare commit is `git add -- <paths>`, then `git commit -m <message> -- <paths>`. Its paths are the tree at that moment less the `Not committed` set; a path of that set is never committed, even when already staged, and stays staged. A `decisions-and-questions.md` that git ignores stays out of the commit.

Never written: a story, a brainstorm, a design body, the bulk, a human answer, an `ask` Resolution. A run whose calls write nothing, such as a brainstorm fold bringing nothing new, and that found no document already modified, ends with `nothing to prepare` and no commit.

Branch at the end of the run:

- started from `main`, `master` or `develop` and switched: `git switch <start branch>` is the last git command, after a `wip` or with no commit too. A branch created for a run that ends with no commit stays;
- started from the expected branch: it stays there;
- the switch back fails: the run stays on the expected branch and the report gives git's reason;
- `wk <expected branch>` is named, never run, the branch written verbatim.

Report, the last message of the run, here started from `main`:

```
boss prepare compound-plugins-epic — batch B2 — epic/compound-plugins-epic
    - seo: folded OQ-SEO-2, Gap-SEO-4; design APPROVED
    - landing-page: design DRAFT, design check: AC-LANDING-3
    - deploy: committed as found: deploy.story.md; design DRAFT, 1 ask
    - pricing: no design, written by boss compound-plugins-epic batch B2
    - billing: story to write, written by boss compound-plugins-epic batch B2
    - FIX-COMPOUNDPLUGIN-12: fixed, commit 7c1d0e2
    - FIX-COMPOUNDPLUGIN-14: open, needs agents/foo.md, Not committed
    - commits: 4f2a9c1 (docs), 7c1d0e2 (fix)

Against the story
    - OQ-SEO-1 — seo.design.md — lgtm (designman) contradicts AC-SEO-2: <the point>

Hand-offs
    - FIX-COMPOUNDPLUGIN-12 — global CLAUDE.md: <text proposed by docman>.

Not arbitrated
    - FIX-COMPOUNDPLUGIN-13 — compound-plugins.fix.md — <head line>

For fixman
    - <defect seen during the run, one line>

Not committed
    - agents/foo.md
    - features/compound-plugins-epic/compound-plugins.bulk.md

Ask entries, most impactful first
    - OQ-DEPLOY-3 — deploy.design.md — <head line>
      Proposition: <one line>

Back on main, epic/compound-plugins-epic free for a worktree.
Next: wk epic/compound-plugins-epic, then boss compound-plugins-epic batch B2
```

- One line per story and per fix: folded keys, documents committed as found, design state with its reason, the missing document and the run that writes it. A story reopened over an IMPLEMENTED design reads `design IMPLEMENTED, story reopened: boss <feature>`. An owner BLOCKED reads `BLOCKED: <agent>`.
- `Next:` is `boss <feature>` for a story target, `boss <epic> batch <Bn>` for an epic target, preceded by `wk <expected branch>, then` after a return. A fix still red takes its place: `Blocking: FIX-<INFIX>-n, tests red after two retries, wip <sha>`.
- `Back on <start branch>, <expected branch> free for a worktree.` appears after a return only; a failed switch back replaces it with `Still on <expected branch>: <git's reason>`.
- A run that switched and wrote nothing replies `nothing to prepare`, then its `Not committed` block, `Back on` and `Next:`. A stop or a refusal carries none of them.
- Against the story, Hand-offs and Ask entries follow §Sorting Open Questions and §Phase 8. Each block is omitted when empty.
