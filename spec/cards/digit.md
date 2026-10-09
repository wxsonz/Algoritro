# ♦ Digit family

Sort by the digits of each value's **rank**, never comparing two values directly.

---

## LSD Radix — *"One bit at a time"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n log n) · ✓ | 1084 sim GOOD | 6784 sim GOOD | 4 | 2 | ~40 | Common |

**How it plays.** Replace values with ranks 0..n−1. For each bit from least to most
significant: walk A once, `pb` if the bit is 0 and `ra` if it is 1, then `pa` everything back.
Every pass costs exactly n + (number of zeros). Passes = ⌈log₂ n⌉.

**Lore.** Radix sort is older than computers. Herman Hollerith's punched-card machines date
from the 1890 US census, and card sorters split a deck one column at a time into ten pockets.
Sorting from the least significant column first was a trick found by machine operators: it was
first written down in 1930 and appears in IBM's earliest known sorter manual (1936). Each pass
is stable, so earlier columns stay in order, and that is exactly this card. Harold Seward
brought radix sort to computers in 1954.

**Pros**
- The shortest real O(n log n) card, and trivially provable.
- **Zero spread**: the count is identical for every random input of the same n. Its 6784 at
  n=500 is exactly the count in the subject's own large-input example.
- The classic first n log n card.
- Peephole Cancel trims 78 ops at n=100 and 55 at n=500 (sim): the run of `pb`s at the end of
  a pass is undone by the `pa`s that follow.

**Cons**
- It never reaches EXCELLENT.
- It ignores existing order completely: a nearly sorted input costs the same as a random one.
- B is only a bucket. No rotation is ever used cleverly.

**Slots:** none: radix never chooses which value to move or where it lands. Param: skip sorted
passes (stop when A is already sorted; this helps only on structured inputs).

**Teaching role:** the Path's first "fast" card. Peers often stop here. The Meta page shows
the gap to EXCELLENT.

---

## Ternary Radix — *"Three-way digits using both ends of B"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n log n) · ✓ | 1333 sim GOOD | 7362 sim GOOD | 6 | 6 | ~150 | Rare |

**How it plays.** Base-3 digits of the rank. Per pass, digit 0 → `pb` + `rb` (bottom of B),
digit 1 → `pb` (top of B), digit 2 → `ra` (stays in A). Then gather the three groups back into
A in digit order with `rrb`/`pa` and `pa`. There are ⌈log₃ n⌉ passes: 5 for n=100 and 6 for
n=500, against 7 and 9 for binary.

**Lore.** Same lineage as LSD Radix, with base 3 instead of 2. Card sorters used base 10, one
pocket per digit; here B's two ends plus A act as three pockets.

**Pros**
- Fewer passes. It uses B's bottom, which binary radix ignores.
- A good bridge to Four-End Quicksort's "four locations" idea.

**Cons**
- Each pass costs more: about 2.3n ops against 1.5n for binary. The values sent to B's bottom
  pay `pb rb` on the way out and `rrb pa` on the way back. As described it measures
  1333 / 7362 (sim), **worse** than binary radix at both sizes. Choosing the cheaper top and
  bottom assignment per pass only gets it to 1115 / 7300 (sim). A gather that skips the
  `rrb` return trip is the open question.
- It still ignores existing order.

**Slots:** none. Param: the gather order, that is, which digit goes to which location.

---

## MSD Radix — *"Biggest digit first, then recurse"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n log n) · ✓ | 757 sim GOOD | 5263 sim EXC | 6 | 6 | ~200 | Uncommon |

**How it plays.** Split the chunk by the top bit of its rank range: values below the
power-of-two cut go to B, the rest stay in A, and each half is sorted recursively, top bit
first. On ranks 0..n−1 this is exactly Quick 2-Way with the pivot moved to a power of two, and
the sim builds it that way: same pushes, same restores, same 2-value leaves.

**Lore.** MSD radix is the other way card sorters could be run: split on the most significant
column first, then sort each pocket separately. It needs a separate pile per pocket, which is
why operators preferred LSD. On stacks, the "piles" are recursion, so MSD turns out to be a
quicksort.

**Pros**
- The subject names it, and it shows that radix and quicksort are cousins.
- Like Quick 2-Way, a sorted chunk costs nothing: sorted input is free.

**Cons**
- A power-of-two cut splits unevenly when the range is not a power of two, so it is a little
  worse than the median: 757 / 5263 against Quick 2-Way's 718 / 5235 (sim).
- It shares Quick 2-Way's restore overhead.

**Slots:** none. A Finisher is optional; by default, leaves of 2 are fixed with `sa`/`sb`.
