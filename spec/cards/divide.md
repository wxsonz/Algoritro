# ✦ Divide family

Recursive splitting (quicksort) or merging (merge sort), adapted to two stacks where the only
cheap places to put a value are the **top and bottom of each stack**.

---

## Quick 2-Way — *"Split at the median, recurse"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n log n) · ✓ | 718 sim GOOD | 5235 sim EXC | 6 | 6 | ~200 | Uncommon |

**The idea.** Quicksort with two stacks: split a group at its middle value, send the lower half to B, and sort each half the same way.

**Step by step.**
1. Take the group on top of A and find its middle value, the median rank.
2. Push the smaller half to B and rotate past the bigger half. Undo those rotations, unless the group was the whole stack.
3. Sort the half in A the same way, then bring the half in B back and sort it too.
4. Groups of two are fixed with a single swap.

**Under the hood.** Sort a chunk of k values on top of A by pushing the lower half (below the
median rank) to B and rotating the rest past (`ra`). Then undo those rotations (`rra`) if the
chunk was not the whole stack, recurse on the upper half in A, then do the mirror operation
for the half in B (push the upper part back with `pa`, rotate the rest with `rb`). Leaves of
size 2 are fixed with `sa`/`sb`.

Always restoring the rotations, even when the chunk is the whole stack, would cost 857 / 5967
(sim): the whole-stack case of Restore Skip is part of this card.

**Why the class holds.** Ranks make the median exact, so the recursion depth is ⌈log₂ n⌉. At
each level a value is pushed or rotated at most once, and rotated back at most once by a
restore, so a level costs at most 2 ops per value, plus the leaves. That is O(n log n) in the
worst case. Measured ops stay between 1.0 and 1.35 × n log₂ n on random input up to n=4096
and on reversed and organ-pipe inputs up to n=8192 (sim).

**Lore.** Tony Hoare invented quicksort in 1959 while studying in Moscow. He was working on
machine translation and needed to sort words before looking them up in a dictionary stored on
tape. It was published in 1961 (Algorithm 64, Communications of the ACM) and is still the
default sort in many libraries. The intuition: pick a pivot, split, and never compare across
the split again.

**Pros**
- A real O(n log n) partition method that also uses existing order: a sorted chunk is
  detected and skipped.
- The hardest part is the recursion itself. Once it works, it is compact.

**Cons**
- "Undo the rotations" is pure overhead. It is the main reason this card loses to Four-End
  Quicksort.
- GOOD, not EXCELLENT, at n=100: only 10 % of runs get under 700 (sim). As a build's complex
  method, it costs EXCELLENT on about half of the n=100 runs (see 05-meta, Builds).
- Bugs in the B-side mirror are easy to make.

**Slots:** 4 (ends, split, pivot, order). Defaults: two ends with the rotations restored,
halves, and Median Pivot. A Finisher is optional; by default, leaves of 2 are fixed with
`sa`/`sb`.

---

## Four-End Quicksort — *"Four bins, never step over anyone"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n log n) · ✓ | 735 sim GOOD | 5033 sim EXC | 8 | 8 | ~400 | Rare |

**The idea.** Quicksort that uses the top and the bottom of both stacks as four places to put things. A group splits into three parts at once, and nothing ever has to be moved back out of the way.

**Step by step.**
1. Take a group sitting at one of the four ends.
2. Split it by rank into three parts: small, middle and big.
3. Send each part to one of the other three ends, at most three moves per number.
4. Sort each part the same way, biggest first, so the sorted numbers pile up on top of A.

**Under the hood.** Treat the tops and bottoms of A and B as **four locations**. A chunk sitting
at one location is split by **exact rank** into three parts, and each part is sent to one of
the other three locations. Every move costs at most 3 ops and never passes over another value,
so nothing is ever "undone". The parts are sorted max first, so sorted values pile up on top
of A; only the max part may be sent there. The bare card has no Finisher: the recursion goes
down to single values. Five Hand cannot serve, because its Hardcoded Three rotates A and would
disturb the sorted values below the leaf. BFS Leaf solves leaves of ≤ 5 optimally around them.

Without a Finisher, its op count depends only on n, not on the order of the input (sim): every
value's path is fixed by its rank. The numbers above are that bare card. With Pivot by Leaf
Count, BFS Leaf ≤ 5 and Peephole, the Four Corners deck, the sim measures 533 / 3825. That
matches the reference build's 528 / 3824, which is that method's own mean over 5 seeds, not
the build's `--adaptive` mean (529.8 / 3948.0).

**Lore.** Three-way partitioning goes back to Dijkstra's 'Dutch national flag' problem (1976):
sort red, white and blue in one pass. Multi-pivot quicksort became mainstream when Java 7
adopted Yaroslavskiy's dual-pivot version in 2011. The four-ends twist is push_swap's own: the
four stack ends are four cheap pockets.

**Pros**
- The strongest provable O(n log n) card in the roster. Bare, it is EXCELLENT at n=500; as
  Four Corners, at both sizes on every run (sim).
- The class has a simple argument: every move costs at most 3 ops and never passes over
  another value, and exact-rank thirds give a depth of about log₃ n. The constant the
  reference build states, ≤ 3n⌈log₃ n⌉ + 13n/5, is its own claim, and the study notes that
  nobody has checked it independently.
- Once the "four locations" model is understood, the code is regular.

**Cons**
- The hardest mental model in the deck: chunks move between ends, and directions flip
  depending on the location.
- Bare, it is only GOOD at n=100 (735). The gains come from its techniques, and they compound:
  BFS Leaf ≤ 5 saves 142 / 657, and Pivot by Leaf Count adds 27 / 334 on top, a synergy (sim).

**Slots:** 3 (split, pivot, order). Four Ends is native. Thirds Split is the default split, and
**DP Splits** replaces it in the Legendary deck (a simplified DP saves 17 / 214 more, sim). The
Finisher slot is empty by default; BFS Leaf is the one to play.

---

## Tape Merge — *"Merge sort on four tapes"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n log n) · ✓ | 1200 ref GOOD | 8400 ref GOOD | 8 | 8 | ~350 | Legendary |

**The idea.** Merge sort, the way old computers sorted on tape drives: make short sorted runs at the stack ends, then keep merging two runs into one longer run until only one is left.

**Step by step.**
1. Split the input into short sorted runs, spread over the four stack ends.
2. Take two runs, compare their front numbers, and move the smaller one to the output end.
3. Repeat until the two runs are one.
4. Keep merging runs in pairs until a single run holds every number.

**Under the hood.** Treat the four stack ends like the tapes in old **external merge sort**.
First split the input into sorted runs (natural runs, or small runs sorted by a Finisher),
spread across the ends. Then repeatedly merge pairs of runs: compare the heads at two
locations, move the smaller to the output location, and repeat. **Polyphase merge** (a
Fibonacci distribution of runs) reduces the number of passes.

**As built (ref).** A balanced two-way merge in which every value costs one op per merge step.
Each pass starts with all runs ascending on A's top. Distribute: runs alternately go to A's bottom
(`ra`) and to B's top (`pb`), so a run at A's bottom has its largest value lowest and a run on B's
top has its largest value on top. Merge: take the larger head, A's bottom with `rra` or B's top
with `pa`, onto A's top, so each pair becomes one ascending run there and the next pass starts
the same way. A pass costs exactly 2n, and there are ⌈log₂ runs⌉ passes. Random input has
about n/2 natural runs, so the count barely varies: exactly 1200 on every n=100 run, and 8000
or 9000 at n=500, 8400 on average over the study's seeds 1000–1004 (ref). Its reference build is
C in the Norm's style (`study/explorer-refs/tape_merge`: 6 functions on a shared kit of 31), and
it gives the card's count on each of those seeds. A Finisher sorts the first runs as blocks: Distance Tables (blocks of 4)
saves 50 / 355, BFS Leaf (blocks of 5) 23 / 215. It beats Natural Merge (1495 / 10165) by not
rotating past the runs it is not merging, but it stays far from Four-End Quicksort. Polyphase
distribution is still open.

**Lore.** John von Neumann wrote a merge routine in 1945 for the EDVAC, among the first
programs written for a stored-program computer. When data lived on magnetic tape, merging runs
between tapes was the way to sort, and polyphase merge (written up by R. L. Gilstad in the
early 1960s) did it with fewer tape drives. Stacks behave much like tapes, which is why this
card exists.

**Pros**
- It uses existing order directly: natural runs make nearly sorted input cheap.
- It is a classic algorithm (Knuth, Vol. 3) that few 42 peers have tried, so there is room
  for new ideas here.

**Cons**
- Every pass touches every value twice (distribute, then merge), so it pays 2n per pass where
  Four-End Quicksort pays at most 3 per value per level of a shallower recursion: 1200 / 8400
  (ref) against 735 / 5033 bare (sim).
- It ignores existing order inside the distribution, so a nearly sorted input with a few long
  runs is cheap only when the runs are few.

**Slots:** none. The Finisher is optional and sorts the first runs (BFS Leaf or Distance
Tables). Without one, the runs are the natural runs; the distribution is balanced.

---

## Natural Merge — *"Merge the runs that are already there"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n log n) · ✓ | 1495 sim GOOD | 10165 sim PASS | 4 | 6 | ~150 | Rare |

**The idea.** Use the sorted stretches the input already has: merge them two at a time until the whole stack is one sorted run.

**Step by step.**
1. Find the stretches of A that already go up.
2. Push the first stretch to B.
3. Merge it with the next stretch onto the bottom of A, smallest first.
4. Do the same with the next pair, and make more passes until one run is left.

**Under the hood.** Find the ascending runs in A. Merge them in pairs: push the first run to B,
then merge both smallest first onto A's bottom. A value of the second run is already on A's
top (`ra`); a value of the first is at B's bottom (`rrb pa ra`). The merged run ends up behind
the runs not yet merged, so the next pair is on top. Repeat passes until one run is left.

**Lore.** This is the natural merge sort of the tape era, and the core of Timsort (Tim Peters,
2002), Python's and Java's sort for objects: real data has runs, so merge them instead of
starting from scratch.

**Pros**
- A clean O(n log n) proof: ⌈log₂ runs⌉ passes, at most 4 ops per value per pass.
- Sorted input is free.

**Cons**
- **It is the lesson card for this model.** Every pass rotates all of A, even when only two
  runs need merging, so nearly sorted input is not cheap: one random swap at n=100 costs 454,
  against 106 for Long Line (sim). Timsort's trick depends on cheap random access to the runs,
  which stacks do not have.
- Random input has about n/2 runs, so it is the most expensive n log n card: 1495 / 10165, and
  its worst random run at n=500 (11791) is close to the PASS limit.

**Slots:** none.
