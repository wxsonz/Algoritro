# 3. Card stats

Every Algorithm and Technique card carries the same stat block. **Measured stats** are
computed by the explorer from runs. **Scored stats** are judged by people against the rubric
below, and the Codex shows the reason for each score.

## 3.1 Measured stats

| stat | meaning | how |
| --- | --- | --- |
| **@100**, **@500** | mean total ops on uniform random input | S seeds (default 50 at n=100, 20 at n=500), fixed seed list |
| **Worst** | maximum over the same runs | — |
| **Spread** | (max − min) / mean | shown as a small bar; low means stable |
| **Grade** | the badge for the mean at that n | [02-game-design.md §2.7](02-game-design.md#27-grades) |
| **Pass rate** | the share of runs under each threshold | the evaluation grades every run, so a mean just under a bar still fails some runs |
| **Speed** | planner CPU time at n=500, in the browser (JS, not C) | median of the runs: ●●●●● under 1 ms, ●●●●○ under 10 ms, ●●●○○ under 100 ms, ●●○○○ under 1 s, ●○○○○ 1 s or more. A card that cannot run at n=500 is timed at its largest n. |
| **Growth** | measured class | fit ops ≈ a · f(n) + b · n for the claimed class on n ≤ 1000, then check the offline sizes against it ([09-metrics.md](09-metrics.md#growth)) |
| **Disorder curve** | mean ops against input disorder at n=100 | a sparkline on the card back |

For a Technique card, the measured stats are **deltas** on each compatible Algorithm. For
example, Four-Way Cost on Turk is −X at n=100 and −Y at n=500, and the card shows the range
across hosts.

## 3.2 Scored stats

### Grasp: what must you know first?

Grasp is the **prior knowledge** a card needs: the concepts you must know before it makes sense,
each with a weight, summed. The two stacks, the 11 moves, loops and arrays are the free base.
Time to understand was considered and dropped: it depends too much on the person.

| concept | weight | concept | weight |
| --- | --- | --- | --- |
| rank compression | 1 | recursion | 2 |
| disorder: inversions over pairs | 1 | partition around a pivot | 2 |
| rotation distance (`ra` against `rra`) | 1 | digits in a base, bit tests | 2 |
| greedy "cheapest first" | 1 | merging sorted runs | 2 |
| ranges and chunks by rank | 1 | longest increasing subsequence | 3 |
| target slot in a circular sorted stack | 2 | dynamic programming | 3 |
| shared rotations (`rr`, `rrr`) in a cost | 2 | graph search (BFS) | 3 |
| move algebra (peephole rewrites) | 2 | beam or A* search | 3 |
| heuristics: what makes a good guess | 2 | simulated annealing, randomness | 3 |

Weight 1 is one idea you can explain in a sentence; 2 needs a diagram or a page; 3 is a topic of
its own, usually met in a course before push_swap. LSD Radix is 3 (ranks, binary digits), Turk 7,
LIS Insertion 10, Beam Sorter 14.

### Craft: how much code under the Norm?

Craft is the **number of functions** a card takes under the Norm: at most 25 lines and 4
parameters each, 5 functions to a file, no `for`, no ternary. More instructions mean more
functions, and code that needs structs to get past the 4-parameter limit, or `malloc`'d state
(search nodes, tables), costs more. Where a card has real C, its Craft is **counted** from that
code: one of the study's builds (`push_swap/study/`) or a reference build
(`study/explorer-refs/`, [README.md](README.md)). Where none has it, it is **estimated** from the
nearest code that does. Hardcoded Three is 1, LSD Radix 2, Chunks 6, Turk 11, Beam Sorter 30.

Every card's concepts and functions, with where each count comes from, are in
[grasp-craft.md](grasp-craft.md), generated from the card data, so the numbers can be checked and
argued with.

### Sets, not sums

Both scores add up as **sets**. A concept learnt once counts once, and code written once counts
once. Code more than one card uses is listed once: the insertion core (4 functions), the two-way
partition (4), the BFS core (13), the distance tables (21). An Algorithm card's own scores
include its natives, its defaults and its default Finisher, since they come with it, and the
cards always in play. A technique card shows what it asks on its own; in a hand it adds only
what the hand does not have yet, so Four-Way Cost adds nothing to Grasp where Two-Way Cost was.

### The Grasp × Craft grid

The Codex plots every Algorithm card on a **Grasp × Craft grid**. Grasp is high from 6 (about two
heavy ideas) and Craft from 10 functions (two files under the Norm).

| | Craft low (under 10) | Craft high (10 and up) |
| --- | --- | --- |
| **Grasp low (under 6)** | *Starter*: Hardcoded Three, Five Hand, Bubble Wheel, Min Extract, Twin Extract, Insert-into-B, Simple Insertion, Chunks, Butterfly, LSD Radix, Ternary Radix, Quick 2-Way, Tape Merge, Natural Merge | *Grinder*: the Oracle |
| **Grasp high (6 and up)** | *Elegant*: MSD Radix, Four-End Quicksort | *Boss*: LIS Insertion, Turk, Bucket Insertion, Lookahead Greedy, Beam Sorter, Annealer |

### Proof: can you defend the complexity class?

| mark | meaning |
| --- | --- |
| ✓ | There is a simple worst-case argument for the claimed class. |
| ~ | It is true in practice or on average, but the worst case is unproven or worse. |
| ✕ | The claim does not hold. For example, Butterfly with a constant window is O(n²), not O(n√n). |

This matters because the subject asks for one method per complexity class and a README that
justifies it.

## 3.3 Technique-only stats

| stat | meaning |
| --- | --- |
| **Effect** | the measured Δops on each compatible host, at n=100 and n=500 |
| **Cost** | +Grasp / +Craft: what it asks on its own; in a hand, only what is new counts (§3.2) |
| **Role** | the role it fills. Slot roles (anchor, pick, cost, sweep, band, retrieval, ends, split, pivot, order) hold one card each. **leaf** cards are Finishers and use the Finisher slot. **prep** and **post** cards stack and use no slot. See [04-compatibility.md](04-compatibility.md). |
| **Value** | Effect ÷ max(1, added Craft): ops saved per function written, so the Meta page can rank techniques without dividing by zero for +0 Craft cards |

## 3.4 Hand and build totals

- **Hand Grasp and Hand Craft** are the union of every card in play: the Algorithm, its natives
  and defaults, the cards played, the Finisher, and the cards always in play (§3.2). They leave
  out the base kit. A technique's delta chip says what it changed.
- **A build's totals** are what the Table's Grasp and Craft rows show, since the Table plays a
  build: the union over its three seats and the tiny seat (Hardcoded Three and the Oracle), plus
  the **base kit** every push_swap needs (30 functions: parsing and errors, ranks, the two
  stacks, the 11 moves and their output, freeing, the flags and main, and the disorder count the
  selector reads). Knowledge and code the seats share count once: the Oracle's BFS core serves
  BFS Leaf too.
- **Fire.** A build burns past **Grasp 20** or **Craft 100**. A classic build (Min Extract,
  Chunks, LSD Radix) is Grasp 9 and Craft 58: Grasp 20 is that plus about four heavy ideas, and
  Craft 100 about twenty files under the Norm. The strong build is Grasp 21 and Craft 84, so its
  Grasp burns; DP Splits or Beam Leaf in `--complex` sets the Craft row alight too. Each row's
  ten gems fill up to its fire line.
- The Meta page plots hands on ops × Hand Craft. These totals are guides, not measurements of a
  person: they say what a build asks, not how long it takes.

## 3.5 Card tiers

An Algorithm card shows two tiers next to its complexity class.

- **Slot tier**, how much the card can be tuned: its technique slots, plus one when its
  Finisher can be swapped. 4 or more is S, 3 is A, 2 is B, 1 is C, 0 is D. Turk (3 slots and a
  Finisher) and Simple Insertion (4 slots) are S; the radix cards are D.
- **push_swap tier**, from the card's mean at 100 and at 500 against the subject's bars
  ([09-metrics.md](09-metrics.md)), always the worse of the two sizes:

| tier | meaning |
| --- | --- |
| S | way under the top bar: at most 85 % of it at both sizes |
| A | under the top bar at both sizes |
| B | under the middle bar at both sizes |
| C | under the pass bar at both sizes, close to failing |
| D | fails the pass bar at one size or both |

Today only Beam Sorter is S; Turk, LIS Insertion, Bucket Insertion, Butterfly, Lookahead
Greedy and the Annealer are A, and the radix and quicksort cards are B. Cards that only play
small inputs show their size limit instead.
