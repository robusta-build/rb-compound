# schematic — the seven patterns

Each entry is a worked example that doubles as a template. Copy the closest one and replace the numbers rather than starting from a blank block. Every example below has passed the width check.

Nothing here bounds what may be drawn: when none fits, compose from the primitives listed in `SKILL.md`.


## A — A value ladder over one variable

When: a function read at a handful of points, with its ends named. Prefer it whenever the values themselves are the message.

Prevents: drawing a curve when six numbers would do. If the reader needs the shape rather than the values — a minimum, a plateau, a change of regime — use pattern H instead.

```
  The defence law at s = 1:  D = (1 - W*) / (1 + s)

  W*      0.00   0.10   0.22   0.40   0.60   0.80   1.00
  D       0.50   0.45   0.39   0.30   0.20   0.10   0.00
          ↑                                           ↑
    polarised corner                            give-up corner
      ( = the MDF )                    ( reaches 0 from inside )
```

## B — An action tree or betting line

When: the branching of a decision - example: the line a poker hand took.

Prevents: prose that says "he can fold, call or raise, and if he raises then" for three paragraphs.

```
  River tree, one bet size, raise allowed

  BB check ──┬── BTN check ───────────────── showdown
             │
             └── BTN b0.75 ──┬── BB fold
                             ├── BB call ─── showdown
                             └── BB r2.5x ──┬── BTN fold
                                            └── BTN call ─ showdown
```

Indent each level by a fixed amount. A tree whose branches indent by eye stops being readable at depth three.

## C — A pipeline or dependency chain

When: showing that something flows one way, or that a value is computed before another needs it.

Prevents: a reader assuming a loop where there is none. If there is no return arrow, the absence is the message and should be stated.

```
  One direction, no return arrow anywhere.

  (pPOT, pDEPTH) ──→ SPR ──→ enf(SPR) ──→ the two zone floors
                                              │
  (pRANGE, pNUTS) ─────────────────────→ shaping ──→ two densities
                                                          │
  pBETS = [0.3, 0.7, 1.2, 3] + shove ──────────→ solve ──→ strategy
                                                          │
  pHAND ─────────────────────────────────────→ read the bucket
```

## D — The curve of a closed form

When: the shape of an exact formula is the message — where it rises, where it turns, where it flattens. Only for closed forms. Measured curves belong to `dataviz`.

Prevents: a hand-placed curve. Every other pattern here may be typed by hand; this one may not. A row misplaced by one is invisible to the writer and wrong to every reader, and no amount of care substitutes for computing the rows.

Generate, then paste the output. The script below is the whole recipe — replace `f`, the range and the ticks:

```
python3 - <<'PY'
import math
f = lambda s: 1 - s / ((1 + s) * (1 + 2 * s))     # the closed form
X0, X1, LOG = 0.1, 20.0, True                     # domain, log or linear
TICKS = [0.1, 0.25, 0.5, 1, 2, 5, 10, 20]
W, H, PAD = 54, 10, "        "                    # fits the 80-col budget
tx = (lambda v: math.log10(v)) if LOG else (lambda v: v)
lo, hi = tx(X0), tx(X1)
col = lambda v: int(round((tx(v) - lo) / (hi - lo) * (W - 1)))
xs = [(10 ** (lo + (hi - lo) * c / (W - 1))) if LOG
      else lo + (hi - lo) * c / (W - 1) for c in range(W)]
ys = [f(x) for x in xs]
y1, y0 = max(ys) + 0.004, min(ys) - 0.004
g = [[" "] * W for _ in range(H)]
for c, y in enumerate(ys):
    g[max(0, min(H - 1, int(round((y1 - y) / (y1 - y0) * (H - 1)))))][c] = "·"
for r in range(H):
    print(f"  {y1 - (y1 - y0) * r / (H - 1):.3f} ┤ " + "".join(g[r]).rstrip())
ax, row = ["─"] * W, [" "] * (W + 10)
for v in TICKS:
    c = col(v); ax[c] = "┬"; s = f"{v:g}"
    for i, ch in enumerate(s): row[10 + c - len(s) // 2 + i] = ch
print(PAD + "└" + "".join(ax)); print("".join(row).rstrip())
PY
```

The output, with a title, an axis caption and at most one `←` annotation added by hand:

```
  The get-paid threshold enf(SPR) — a U, not a ramp

  enf(SPR)
  0.981 ┤                                                     ··
  0.963 ┤                                               ······
  0.946 ┤                                           ····
  0.929 ┤ ·                                      ···
  0.911 ┤  ···                                ···
  0.894 ┤     ···                          ···
  0.877 ┤        ··                      ··
  0.859 ┤          ···                ···
  0.842 ┤             ·····      ·····
  0.825 ┤                  ······   ← minimum at s = 1/sqrt(2)
        └┬────────┬──────┬──────┬──────┬────────┬──────┬──────┬
         0.1     0.25    0.5     1      2        5     10     20
        s, log scale.  s = SPR for a shove.
```

Three rules the example obeys and a curve is worthless without.

- Declare the axis scale. A log axis that does not say so is read as linear, and every conclusion drawn from the shape is then wrong.
- Choose the scale for the structure, not for the data range. Here the log axis exists because `enf(SPR) = enf(1/(2·SPR))`: on it the curve is exactly symmetric about its minimum, and that symmetry is the point. On a linear axis the same curve looks like a hook and the identity is invisible.
- Do not put tick labels close enough to collide. The first draft of this figure printed `0.50.7071` where three ticks overlapped; ticks were dropped until the row read cleanly, and the interesting point moved into the plot as an `←` annotation.

## I — A dependency map

When: the overview figure that opens a `## Boundaries` section (`boundaries` skill), in an epic above all: which apps, modules or packages the work touches and who uses whose API.

Prevents: a cycle, or an app something depends on, hidden across several blocks. Both jump out as an arrow going the wrong way.

Rules: boxes are named by kind then name, as in the figure; arrows go from client code down or right to the API, each arrow carries the API kind. One zoom per figure: apps and modules, or the packages of one of them.

```
  Arrow = depends on, from client code to the API it uses.
  Nothing points into an app, no loop.

  app `cli` [modified: race-results]      app `web`
      │                                       │
      │ library                               │ library
      ↓                                       ↓
  module `race-history`  ─────library────→  module `core`
  [new: last-race-run]                      [modified: race-results,
                                             last-race-run]
```

## Beyond the model — two composed examples

Neither is in the repertoire. Both were assembled from the primitives, and they are here to show that the seven patterns are a starting point rather than a boundary.

Seat order, which is ordering on a line rather than on the strength axis:

```
  6-max, order of action postflop

    SB    BB    UTG   HJ    CO    BTN
     1     2     3     4     5     6    ← postflop order
     └──┬──┘
     blinds posted preflop

  ip = BTN, last to act on every postflop street
  oop = everyone else
```

A board and what it makes available, which is containment rather than ordering:

```
  Q♦ T♦ 3♣ turn 7♥ — what the runout opened

  completed   ·  no flush, no straight
  drawing     ██  any two diamonds, now dead on the river
  made        ██████  QQ TT 33 77 sets, QT two pair
  reaching    ████  J9 K J for the gutshots still live

  Bar length is share of a typical continuing range, stated,
  not measured — this figure is a shape, not a count.
```

The last caption is doing real work: a schematic that carries proportions someone might read as data must say whether they were measured. If they were, it is probably a `dataviz` job instead.
