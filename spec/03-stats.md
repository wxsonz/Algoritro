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

### Grasp: how hard is it to understand? (0–10)

| score | rubric |
| --- | --- |
| 0 | Nothing to understand: it works by itself (an always-on card). |
| 1–2 | You can explain it in one sentence and simulate it by hand. |
| 3–4 | One idea beyond the stack ops, for example "rank" or "chunk". |
| 5–6 | Several interacting ideas, or one that needs a diagram: circular order, cost models. |
| 7–8 | Recursion across both stacks, or invariants you must hold in your head. |
| 9–10 | Needs outside theory: search heuristics, DP over plans, proofs of bounds. |

### Craft: how hard is it to implement in C under the Norm? (0–10)

| score | rubric |
| --- | --- |
| 0 | Nothing to write. |
| 1–2 | Under ~50 lines, one loop, few edge cases. |
| 3–4 | ~50–150 lines, a couple of helpers. |
| 5–6 | ~150–300 lines, several cases to get right (directions, wraparound, empty stacks). |
| 7–8 | ~300–600 lines, recursion or state that is easy to corrupt, and painful debugging. |
| 9–10 | 600+ lines, hash tables or memory-heavy search, tight CPU limits. |

The scores were first given on a 1–5 scale. On 0–10 they are those judgments doubled, so
every card sits on an even number for now; the odd steps are room for finer judgments, and the
wider range gives a full hand room to grow (§3.4).

Grasp and Craft are deliberately separate. The Codex plots every Algorithm card and every
saved hand on a **Grasp × Craft grid**. Scores of 0–4 count as low and 5–10 as high. Technique
cards carry added costs, not scores, so they are not plotted on their own.

| | Craft low (0–4) | Craft high (5–10) |
| --- | --- | --- |
| **Grasp low (0–4)** | *Starter*: Min Extract, LSD Radix, Chunks, Butterfly, Simple Insertion | *Grinder*: Turk, Oracle |
| **Grasp high (5–10)** | *Elegant*: no bare card yet, so this is an open space | *Boss*: LIS Insertion, Bucket Insertion, Quick 2-Way, Four-End Quicksort, Beam Sorter |

### Lines: rough size in C

This is an estimate of Norm-style C lines for the card alone, not counting parsing or stack
ops. It anchors Craft but does not replace it.

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
| **Cost** | +Grasp / +Craft added to the hand |
| **Role** | the role it fills. Slot roles (anchor, pick, cost, sweep, band, retrieval, ends, split, pivot, order) hold one card each. **leaf** cards are Finishers and use the Finisher slot. **prep** and **post** cards stack and use no slot. See [04-compatibility.md](04-compatibility.md). |
| **Value** | Effect ÷ max(1, added Craft), so the Meta page can rank techniques by "ops saved per unit of pain" without dividing by zero for +0 Craft cards |

## 3.4 Hand totals

For a full hand, the result panel shows the measured stats of the actual combined run. It
also shows **Hand Grasp** and **Hand Craft** = the Algorithm's score + the added costs of the
techniques played on it, on the same 0–10 scale. The bar fills at 10; a hand past 10 keeps its
real total and is marked as over. Natives and defaults are part of
the Algorithm's score and add nothing. A Meta card adds its own Grasp and Craft to the highest
totals among the hands it wraps. These totals are rough guides: costs do not really add up
linearly.
The Codex explains them, and the Meta page plots hands on ops × Hand Craft.

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
