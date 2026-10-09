# Objective: the Table plays a push_swap build

Planned on 2026-10-10. Nothing below is built yet. Each step in [Build order](#build-order)
ships on its own, with its tests, UI checks and spec updates.

## Why

- The Adaptive Selector already picks a hand for each stack, but the Table cannot show which
  one ran, or why.
- The Table is full: the right column holds two decks and the Book of Codex, and Draw (a random
  card) does not fit a sandbox.
- The push_swap the subject grades is not one hand. It is three strategies, chosen by the
  input's disorder. The Table should let you build exactly that, and show where every stack
  goes.

## Words

- **Stack level** (Easy, Medium, Hard): a size and shape to test against. It has **no link** to
  the flags: an Easy stack such as One swap goes to `--simple`, and Reversed 500 to `--complex`.
- **Disorder:** the subject's measure, inversions ÷ pairs. 0 is sorted, 1 is reversed, and
  uniform random input is about 0.5.
- **Flag** (`--simple`, `--medium`, `--complex`): the strategy the program runs. By default
  (`--adaptive`) it is chosen by disorder.
- **Seat:** the hand (one algorithm card and its techniques) that runs for one flag.
- **Build:** the three seats, plus the locked tiny seat.
- **Route:** stack → disorder → flag → card.

## Settled

### 1. Layout

```
left panel (wider)                     | mat
---------------------------------------+-------------------------------------------------
score plate: moves, stamp, Grasp/Craft | build: [--simple] [--medium] [--complex] [tiny]
                                       | slots of the seat being edited
stacks, each with its route:           | route: Reversed 500 · 1.00 → --complex → card
  Nearly sorted   0.03  simple   Turk  | [played card] [board .........................]
  Four runs       0.36  medium   Chunk |
  Reversed 500    1.00  complex  LIS   | your hand (fanned) ......... [algo deck] [tech deck]
  5, every order    —   tiny     Oracle|
```

- The **Book of Codex** leaves the Table: Codex is in the top bar.
- The **two decks** sit to the right of the hand, with **no Browse or Draw buttons**. Clicking a
  deck opens Browse.
- The **right column** goes away, and the **left panel** takes the space.

### 2. The build: three seats and a tiny seat

| seat | disorder | the subject's class target |
| --- | --- | --- |
| `--simple` | below 0.2 | any class (O(n²) is fine) |
| `--medium` | 0.2 to 0.5 | O(n√n) or better |
| `--complex` | 0.5 and above | O(n log n) |
| tiny 🔒 | n ≤ 5, any disorder | the subject's limits: 3 moves for 3 numbers, 12 for 5 |

- Each seat holds a **full hand**: one algorithm card and its techniques.
- The **tiny seat** is locked and built in: 3 numbers or fewer take the hardcoded cases, 4 or
  5 the Oracle's search (optimal: 8 moves for the worst order of 5). The subject does not name
  it, but every push_swap needs it.
- Every stack goes to **exactly one seat**, by its disorder. That is `--adaptive`, and it is how
  the Table plays from now on.
- **One seat is being edited** at a time. Its card sits on the mat, and the slots and the hand
  work on it as they do today.
- Each seat shows whether its card meets the **subject's class target**. Turk is O(n²): fine in
  `--simple`, red in `--medium` and `--complex`.

### 3. Routes: which stack goes where

- Every stack's **disorder is computed first**, and decides its seat.
- **Stack rows** show the disorder, a flag chip in the seat's colour, and a mini icon of the card
  that sorted it.
- A **route banner above the board** shows the stack being played:
  `Reversed 500 · disorder 1.00 → --complex → [LIS Insertion]`. The flag chip and the card wear
  the seat's colour, and clicking the card opens Inspect.
- The **seat that sorts the current stack lights up**, with a "sorting: Reversed 500" tag.
- Tiny stacks show the locked route: `5, every order → tiny 🔒 → Oracle search`.
- Each seat shows a **summary** of its stacks, such as "sorts 8 stacks · 7 ★ 1 ✓", so a weak
  seat stands out.

Today's 26 stacks route like this (seed 42):

| seat | stacks |
| --- | --- |
| tiny (5) | 1 number, 2 in order, 2 swapped, 3 numbers every order, 5 numbers every order |
| `--simple` (5) | Already sorted 0.000, One swap 0.006, Smallest at the bottom 0.020, Nearly sorted 500 0.026, Nearly sorted 0.027 |
| `--medium` (8) | Interleaved halves 0.247, A quarter messy 0.250, Four runs 0.364, Twenty runs 0.384, Rotated 500 0.399, Rotated 100 0.471, Up then down 0.495, Up then down 500 0.499 |
| `--complex` (8) | Half messy 0.500, Down then up 0.505, Random 100 0.523, Random 500 0.528, Three quarters messy 0.750, Nearly reversed 0.973, Reversed 100 1.000, Reversed 500 1.000 |

Mirror shapes split across the line: Up then down is 0.495 (`--medium`) and Down then up 0.505
(`--complex`).

### 4. Selecting stacks and seats

- Clicking a **stack** plays it and makes its seat the one being edited, so the card on the mat
  is always the one that sorted the stack on the board.
- Clicking a **seat** makes it the one being edited and moves the board to one of that seat's
  stacks (the last one played there, else the first in the list).
- The board always shows the **real route**. Nothing is ever run "forced".

### 5. Browse: a mini Codex that places cards

- Clicking a deck opens Browse: a card grid on one side, and a **detail pane** for the selected
  card on the other. The pane has the idea in plain words, the scorecard, the card's fit for
  each flag's class target, a preview of its stamps on your stacks, and a link to the full
  Codex page.
- Browse **places cards**, so it is never just a reference:
  - Opened from a **seat** (its card, or an empty seat), the algorithm Browse is in picking
    mode. A header says "Choosing for `--medium` (disorder 0.2 to 0.5, needs O(n√n) or
    better)", and the pane's button is **Put in `--medium`**.
  - Opened from the **algorithm deck**, the button is **Put in** the seat being edited.
  - The **technique deck** shows details and **Play on** the seat being edited. Cards that do
    not fit stay greyed, with their reason. The hand stays the quick way to play techniques.

### 6. Cheats

Two tickboxes, both labelled as cheats. They are a "best possible on this table" line to compare
your build against, not something the subject allows.

- **Best card per stack:** each stack is sorted by whichever card does it in the fewest moves,
  ignoring flags. Its stamp shows that score, and its icon the winning card. It is the
  ceiling: no single push_swap reaches it.
- **Best push_swap:** the best three-flag build. Each stack goes to one seat by disorder, so the
  seats are independent: for each seat, try every card on that seat's stacks and keep the best.
  - It ranks by fewest fails, then most ★, then fewest total moves.
  - It only uses cards that meet the seat's class target, so it is a build the subject allows.
  - The result shows as three cheat seats, which you can copy into your build with one click.
- Both search **bare cards** first (an algorithm with its natives and defaults). Searching every
  technique combination is a later step.

### 7. Removed

- **Portfolio**, the **Meta slot**, and the **Meta card overlay** (the Adaptive Selector's setup).
  The seats replace them.
- **Draw**, the **Book of Codex** on the Table, and the **right column**.

### 8. Grasp and Craft, redefined (the numbers still need a check)

The 0 to 10 points cannot say "this takes a week to understand". Time was considered and
dropped: it depends too much on the person. Instead:

**Grasp is the prior knowledge a card needs.** Each card lists the concepts you must know
first, and its Grasp is the sum of their weights. The two stacks, the 11 moves, loops and
arrays are the free base.

| concept | weight | concept | weight |
| --- | --- | --- | --- |
| rank compression | 1 | recursion | 2 |
| rotation distance (`ra` against `rra`) | 1 | partition around a pivot | 2 |
| greedy "cheapest first" | 1 | binary digits, bit tests | 2 |
| ranges and chunks by rank | 1 | merging sorted runs | 2 |
| target slot in a circular sorted stack | 2 | longest increasing subsequence | 3 |
| shared rotations (`rr`, `rrr`) in a cost | 2 | dynamic programming | 3 |
| move algebra (peephole rewrites) | 2 | graph search (BFS) | 3 |
| heuristics (what makes a good guess) | 2 | beam or A* search | 3 |
| | | simulated annealing, randomness | 3 |

First estimates: LSD Radix 3, Chunks 3, Turk 6, LIS Insertion 9, Beam Sorter about 12. A card
can go to about 15.

**Craft is the number of functions it takes under the Norm.** Each function is at most 25 lines
and 4 parameters, with 5 functions per file, no `for` and no ternary. More instructions mean
more functions. Code that needs structs to get past the 4-parameter limit, or `malloc`'d state
(search nodes, tables), costs more.

First estimates, as extra functions on top of the base kit: Hardcoded Three about 2, LSD Radix
about 4, Chunks about 6, Turk about 14, LIS Insertion about 20, Four-End Quicksort about 25,
Beam Sorter about 40.

**A build's totals:**
- **Grasp** is the union of the concepts across the seats: knowledge already learnt counts once.
- **Craft** is the seats' functions plus the **base kit** (parsing, errors, the 11 moves,
  freeing: about 20 functions), with shared code counted once.
- The gems keep their place with bigger numbers. Fire moves to build-level thresholds, set once
  the new numbers exist.
- Every card is re-rated, with its concept list and function estimate written in the spec, so
  the numbers can be checked and argued with.

## Build order

1. **Layout.** Decks beside the hand, no Browse or Draw buttons, no Book of Codex, no right
   column, a wider left panel.
   Done when: clicking a deck opens Browse, the UI checks pass at 1920 × 1080 and at phone
   width, and the frame-rate probe still reads 60 fps at idle.
2. **Routes.** Each stack's disorder, flag chip and card icon, while the Table still plays one
   hand.
   Done when: the 26 stacks route as in the table above, and a unit test pins the thresholds
   (0.2 and 0.5, with 0.5 going to `--complex`).
3. **The build.** Three seats, the tiny seat, seat and stack selection, the route banner, seat
   summaries, class-target marks, and share links that carry all three hands.
   Done when: the stamps match `--adaptive` run outside the UI on every stack, and a build
   survives a reload through its link.
4. **Browse.** The detail pane, picking mode from a seat, and the Put in and Play on buttons.
   Done when: a seat can be filled from Browse alone, without the hand.
5. **Cheats.** Best card per stack and Best push_swap, then Portfolio and the Meta overlay are
   removed.
   Done when: a unit test checks that no seat of Best push_swap breaks its class target, and
   that its total is never worse than the starting build's.
6. **Grasp and Craft.** The concept list and function estimates for every card, the new totals,
   and the fire thresholds.
   Done when: every card's numbers have their reasons in the spec.

Each step also updates the spec (02 game design, 03 stats, 08 views, CHANGELOG) and the
README where they describe what changed.

## Proposed defaults (say if you disagree)

- **The thresholds** stay at the subject's 0.2 and 0.5 on the Table. The Lab keeps the editable
  ones.
- **Already sorted input** prints nothing before any seat runs, as the subject requires,
  alongside the tiny seat. It lives in `main()` in a real push_swap, not in a card.
- **Old share links** (`#deck=…`) fill all three seats with that hand. **Paths**, which open from
  Codex links with a single hand, do the same.
- **Portfolio** leaves the Codex and the spec too, with a line in the changelog.
- **Stacks near a line:** a stack within 0.05 of a threshold gets a "near the line" mark, since
  a few swaps move it to the other seat.

## Open questions

- **The Grasp weights and Craft estimates** in section 8: do they match what peers find hard?
  They are checked before step 6 starts.
- **Fire thresholds** for a build's Grasp and Craft.
- **Random stacks straddle 0.5.** Uniform random input has disorder 0.500 ± 0.034, so across 400
  seeds about half go to `--medium` (210 at n=100, 189 at n=500) and half to `--complex`. Seed 42
  happens to go to `--complex` for both Random 100 and Random 500, so one seed hides how much the
  `--medium` seat matters for the main graded test. Should Random 100 and Random 500 run several
  seeds, stamped by the worst and showing both routes?
