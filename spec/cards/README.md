# Algorithm cards — roster

One file per family. Stats are defined in [../03-stats.md](../03-stats.md), and number tags
(sim / ref / web / est.) are explained in [../README.md](../README.md). Grades use the subject
thresholds: n=100 → FAIL ≥ 2000, PASS < 2000, GOOD < 1500, EXCELLENT < 700; n=500 → FAIL ≥
12000, PASS < 12000, GOOD < 8000, EXCELLENT < 5500.

## How a card's text reads

Each card is told top-down, so a peer gets the idea before the details:

1. **The idea.** One or two plain sentences, no jargon: what the card does and why it works.
2. **Step by step.** A short numbered list a peer could follow by hand.
3. **Under the hood.** The technical part: exact rules, costs, parameters and edge cases.

Then come the class argument, the variants, the measured numbers, **Lore**, **Pros**, **Cons**
and **Slots**. Technique cards follow the same order: **The idea**, then **Under the hood**
with its labelled notes (Pros, Cons, Measured, Hosts, Conflicts). Inspect and the Codex show
the parts in this order; `tools/build-data.mjs` copies them into `data/cards.json`.

| file | family |
| --- | --- |
| [small.md](small.md) | ◆ Small: tiny n, exact |
| [selection.md](selection.md) | ▲ Selection |
| [insertion.md](insertion.md) | ● Insertion |
| [bucket.md](bucket.md) | ■ Bucket |
| [digit.md](digit.md) | ♦ Digit |
| [divide.md](divide.md) | ✦ Divide |
| [search.md](search.md) | ✺ Search |
| [meta.md](meta.md) | Meta cards (wrap other hands) |
| [cursed.md](cursed.md) | Cursed: classic sorts that do not fit two stacks, and why |

## Summary

These are **bare cards**: each card with its natives and defaults only (see
[../04-compatibility.md](../04-compatibility.md)), unless the table says otherwise. "EXC"
marks the grade of the mean; the card files give the share of runs under each bar.

| card | family | class (claimed · proof) | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hardcoded Three | ◆ | O(1) · ✓ | — | — | 1 | 1 | Common |
| Five Hand | ◆ | O(1) · ✓ | — | — | 2 | 3 | Common |
| Oracle (BFS / IDA*) | ◆ | exponential · ✓ | n ≤ 8–9 only | — | 4 | 16 | Rare |
| Bubble Wheel | ▲ | O(n²) · ✓ | 11301 sim FAIL | 301410 sim FAIL | 1 | 2 | Uncommon |
| Min Extract | ▲ | O(n²) · ✓ | 1454 sim GOOD | 32298 sim FAIL | 2 | 4 | Common |
| Twin Extract | ▲ | O(n²) · ✓ | 1117 sim GOOD | 22318 sim FAIL | 3 | 6 | Uncommon |
| Insert-into-B | ● | O(n²) · ✓ | 1459 sim GOOD | 32251 sim FAIL | 4 | 5 | Uncommon |
| Simple Insertion | ● | O(n²) · ✓ | 1462 sim GOOD | 32242 sim FAIL | 4 | 5 | Uncommon |
| LIS Insertion | ● | O(n²) · ✓ | 547 sim EXC | 5059 sim EXC | 10 | 13 | Rare |
| Turk | ● | O(n²) · ✓ | 557 sim EXC | 5088 sim EXC | 7 | 11 | Common |
| Chunks | ■ | O(n√n) · ~ (✓ with K ∝ √n and One-Way Sweep) | 662 sim EXC | 5927 sim GOOD | 3 | 6 | Common |
| Butterfly | ■ | O(n√n) · ✕ if w is constant | 577 sim EXC | 5080 sim EXC | 3 | 5 | Uncommon |
| Bucket Insertion | ■ | O(n√n) · ✓ | 606 sim EXC (576 ref) | 4291 sim EXC (4121 ref) | 8 | 12 | Rare |
| Bucket Beam | ■ | O(n√n) · ✓ | 488 ref EXC | 3394 ref EXC | 18 | 58 | Legendary |
| LSD Radix | ♦ | O(n log n) · ✓ | 1084 sim GOOD | 6784 sim GOOD | 3 | 2 | Common |
| Ternary Radix | ♦ | O(n log n) · ✓ | 1333 sim GOOD | 7362 sim GOOD | 5 | 5 | Rare |
| MSD Radix | ♦ | O(n log n) · ✓ | 757 sim GOOD | 5263 sim EXC | 7 | 6 | Uncommon |
| Quick 2-Way | ✦ | O(n log n) · ✓ | 718 sim GOOD | 5235 sim EXC | 5 | 6 | Uncommon |
| Four-End Quicksort | ✦ | O(n log n) · ✓ | 735 sim GOOD | 5033 sim EXC | 6 | 7 | Rare |
| Tape Merge | ✦ | O(n log n) · ✓ | 1200 ref GOOD | 8400 ref GOOD | 3 | 5 | Legendary |
| Natural Merge | ✦ | O(n log n) · ✓ | 1495 sim GOOD | 10165 sim PASS | 3 | 4 | Rare |
| Lookahead Greedy | ✺ | O(n² · bᵏ) CPU | 557 sim EXC | 5284 sim EXC | 9 | 14 | Rare |
| Beam Sorter | ✺ | heuristic | 479 ref EXC | 4601 ref EXC (1.3 s per sort in C) | 14 | 30 | Legendary |
| Annealer | ✺ | heuristic | 572 ref EXC | 5094 ref EXC | 7 | 18 | Legendary |

LIS Insertion's bare card uses its default Two-Way Cost. The Long Line deck adds Four-Way
Cost and `rb` Sink and measures 530 / 4425 (sim). With a top-of-B pick instead (Simple
Insertion + LIS Anchor) it measures 1397 at n=100.

Four-End Quicksort's bare card has no Finisher. With Pivot by Leaf Count, BFS Leaf ≤ 5 and
Peephole (the Four Corners deck) it measures 533 / 3825 (sim), matching the reference build's
528 / 3824.

The "ref" numbers come from reference builds whose hands carry many techniques, for example
Four-End Quicksort with BFS leaves and peephole. Each is that method's own mean over 5 seeds,
from the per-selector table in [../sources.md](../sources.md). The explorer will re-measure
them as bare cards.

## Where the subject's examples live

The subject (§VI.3.3) lists example methods per class. Peers read that list first, so the
Codex links each example to its card:

| subject's example | class | cards |
| --- | --- | --- |
| insertion sort adaptation | O(n²) | Simple Insertion, LIS Insertion, Insert-into-B, Turk |
| selection sort adaptation; min/max extraction | O(n²) | Min Extract, Twin Extract |
| bubble sort adaptation | O(n²) | Bubble Wheel |
| chunk-based sorting (√n chunks); range-based | O(n√n) | Chunks, Butterfly |
| bucket sort with √n buckets; block partitioning | O(n√n) | Bucket Insertion, Bucket Beam |
| radix sort (LSD) | O(n log n) | LSD Radix, Ternary Radix |
| radix sort (MSD) | O(n log n) | MSD Radix (on ranks it is Quick 2-Way with power-of-two pivots) |
| merge sort using two stacks | O(n log n) | Natural Merge, Tape Merge |
| quick sort with stack partitioning | O(n log n) | Quick 2-Way, Four-End Quicksort |
| heap sort adaptation | O(n log n) | Heapsort is a Cursed card: a literal port is O(n²) ops ([cursed.md](cursed.md)) |
| binary indexed tree approaches | O(n log n) | not a sorting method on its own here: it speeds up planning, not moving ([cursed.md](cursed.md)) |
