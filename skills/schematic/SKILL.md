---
name: schematic
description: Draw an ASCII schematic in a markdown document — a range as density pieces on the [0,1] strength axis, two ranges facing, a threshold cut into zones, the strategy regions an equilibrium produces, an action tree, a pipeline, a value ladder, a dependency map between apps, modules and packages, or a figure composed from scratch when none of those fit. Use whenever a document needs a monospace drawing of structure rather than a chart of measured data. Enforces 80 columns, English labels and ubiquitous-language.md symbols.
---

# schematic

A schematic draws structure. `dataviz` renders data. If the request is "show me how these things sit relative to each other", it is a schematic.

The line is drawn by where the numbers come from, not by whether the figure has an axis. A curve of a closed form is a schematic: it is exact, it has no error bars, it can be recomputed from the formula at any resolution, and its point is a shape — a rise, a minimum, a plateau. A curve of measured results is `dataviz`: it carries uncertainty, it needs units and a legend, and someone will want to read values off it. `enf(SPR) = 1 − SPR/((1+SPR)(1+2·SPR))` is the first kind. A sweep of solver output at 45 rungs is the second. When a figure would mix both, it is a `dataviz` job.

Home ground is the Fantom cardless model, but the skill is not confined to it. Board textures, action trees, seat order, a pipeline of computation, the shape of a data structure — anything whose point is spatial and whose medium is monospace text inside a markdown file.

## The five invariants

These are what a schematic is, not a checklist appended at the end. A drawing that breaks one of them is not a schematic that needs fixing; it is not a schematic.

1. Every line is at most 80 characters. No exception, no "it is only 82".
2. A figure stays under 25 lines. Over that, it is two figures, or it is prose.
3. Every label inside a figure is in English, whatever the language of the surrounding document. The corpus documents are French; their figures are not, because figures carry Ubiquitous Language terms and that language is English.
4. Symbols come from `ubiquitous-language.md`, never from recall and never invented. A figure is not where a term is coined.
5. The figure lives in a fenced code block with no language tag, so no syntax highlighter touches it.

## Verify, never estimate

Width cannot be eyeballed, and this is the one mechanical thing the skill exists to enforce. Box-drawing characters and `█` are three bytes each in UTF-8, so `awk 'length > 80'` overcounts by a factor of three on macOS and passes lines that are far too wide. It is not an acceptable substitute.

Run this on the file after writing any figure, and do not assert the width without having run it:

```
python3 - "$FILE" <<'PY'
import sys
inblock = False
for i, line in enumerate(open(sys.argv[1], encoding='utf-8'), 1):
    s = line.rstrip('\n')
    if s.strip() == '```':
        inblock = not inblock
        continue
    if inblock and len(s) > 80:
        print(f"{i}: {len(s)} chars — {s}")
PY
```

No output means the constraint holds. Also check the block heights with the same walk if a figure looks long.

## The column budget

Reach 80 by construction rather than by trimming afterwards. A template that respects the budget cannot overflow when its numbers change.

Single-column figure, vertical axis:

- columns 1-5, the value label, right-aligned
- column 6, the axis glyph `┤` or `┼`
- columns 8-47, the drawing area
- columns 49-79, the annotation

Two-column figure, Hero facing Villain:

- columns 1-5, the value label
- column 6, the axis glyph
- columns 9-28, the first column
- columns 33-52, the second column
- columns 55-79, the annotation

Horizontal scale: indent 2, segment from column 3, never past column 74 so an end label fits.

## Character set

`─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼ █ · ← → ↑ ↓`

Nothing outside it, so figures stay consistent across documents. Two extensions, and no others:

- `░` as a second shading level, when a figure genuinely has two layers of mass.
- card ranks and the suits `♠ ♥ ♦ ♣`, in figures about real hands and boards rather than the cardless model. These are the one risk to the width rule: several terminals render suits double-width even though they count as one character, so a figure using them keeps a margin of a few columns rather than filling to 80.

No trailing whitespace on any line — it makes width checks and diffs lie.

## The repertoire

Nine patterns, in `references/patterns.md`. Read that file when actually drawing; it holds a worked example of each that doubles as the template.

- A, range as density pieces on the strength axis
- B, two ranges facing
- C, a scale cut into labelled zones
- D, the strategy regions an equilibrium produces
- E, a value ladder over one variable
- F, an action tree or betting line
- G, a pipeline or dependency chain
- H, the curve of a closed form
- I, a dependency map between apps, modules and packages, the overview figure of the `boundaries` skill

The list is a starting point, not a menu. It is where to look first, not the boundary of what may be drawn.

Pattern H is the one exception to drawing by hand. A curve is where hand-placed ASCII drifts worst — a misplaced row is invisible to the writer and wrong to every reader — so H ships a generator script and the figure is the script's output, pasted. Never eyeball a curve.

## Composing a figure the repertoire does not have

This is the normal case for anything outside the model, and it is five steps rather than improvisation.

1. Name the one spatial relation the figure must make obvious — ordering, containment, overlap, branching, a cut, a flow. If you name two, it is two figures.
2. Pick the carrier that relation lives on. A vertical axis carries ordering and stacking. A horizontal segment carries a scale cut into zones. An indented tree carries branching. Aligned rows carry a series. A left-to-right chain carries a flow.
3. Declare what the axis is, and which frame it is in, inside the figure. A Fantom figure states whether it is on the natural axis or in the Villain-uniform frame, because a polarised range looks completely different in the two.
4. Assemble from the primitives below, obeying the column budget and the character set.
5. Run the width check.

Primitives, which is what makes composition mechanical: the labelled axis with its gutter; the mass bar, a run of `█` whose length is proportional to something stated; the cut line, a `┼` plus `─` run carrying a named threshold; the annotation column with its `┐ │ ┘` brace; the arrow, `←` for "read this here" and `→` for flow; the placeholder `·` for "this player has nothing here", which is not the same as blank.

An invented figure that survives these five steps is as legitimate as one from the repertoire. A figure that skips step 1 is the one that ends up unreadable.

## When not to draw

A figure is for structure that is genuinely spatial — stacking, ordering, overlap, a cut, a branch. Three numbers in a row are a bullet list, and this repo prefers bullet lists to tables. If the content is a list, write the list. If the content is a table, reconsider: a schematic that is a grid of aligned cells is a table wearing box-drawing characters, and it inherits every maintenance problem tables have here.

## Known failure modes

Each of these has already happened in this corpus.

- Brace annotations `┐ │ ┘` that open on one block and close on another, leaving an unclosed brace mid-figure. Draw the brace last, after the block it annotates is final.
- Two facing columns whose rows drift apart because one label grew a character. Pin the column starts from the budget, do not align by eye.
- A figure drawn in the Villain-uniform frame but labelled as the natural axis, or the reverse. State the frame.
- A `density piece`, which is an input to the solver, shown next to a strategy threshold, which is an output of it, without saying which is which. MoP's Game #9 gives both players one flat piece and the equilibrium still cuts each range into four regions — that is the whole point, and a figure that blurs it teaches the opposite.
- A figure imported from *The Mathematics of Poker* without flipping it. Their axis is labelled `Hand Values, 0 = nuts`, the reverse of Fantom's. Flip it, and say in the caption that it has been flipped.
- A caption asserting a number the figure does not show.
