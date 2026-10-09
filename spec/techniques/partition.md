# Partition techniques: ends, split and pivot

For Divide cards. Three roles, one card each per hand:

- **ends:** where the parts go. Four Ends, Restore Skip. Quick 2-Way's default is two ends
  (the top of A and the top of B), with its rotations restored.
- **split:** how many parts, and how big. Thirds Split, DP Splits. Quick 2-Way's default is
  halves.
- **pivot:** where to cut. Median Pivot, Pivot by Leaf Count.

## Median Pivot

**The idea.** Split each group exactly at its middle value, into two halves.

**Under the hood.** Role: pivot. Split at the median rank of the chunk, into two halves. Ranks make the median
exact and free.

- **Pros:** balanced recursion with depth log₂ n.
- **Cons:** two parts only, so many passes.

## Thirds Split — *"Three-way partition"*

**The idea.** Split a group into three parts, low, middle and high, instead of two, and send each part to a different end.

**Under the hood.** Role: split. Split by two pivots into low, mid and high parts, and send each to a different
place.

- **Measured:** with Four Ends and no Finisher, −86 at n=100 and −330 at n=500 against halves
  (sim).
- **Pros:** recursion depth log₃ n. Fewer passes over each value.
- **Cons:** needs at least three destinations. That is natural with Four Ends, awkward
  without.
- **Requires:** Four Ends, or a host with a third destination. **Conflicts:** Median Pivot,
  which cuts into two.

## Four Ends

**The idea.** Use the top and the bottom of both stacks as four places to send numbers, so nothing has to be moved back later.

**Under the hood.** Role: ends. Use the top and bottom of both stacks as four destinations. A part sent to the
bottom of the current stack costs one rotation and never needs restoring.

- **Measured:** on Quick 2-Way with halves, both with 2-value leaves: +6 at n=100 and −355 at
  n=500 (sim).
- **Pros:** removes the "undo the rotations" overhead of Quick 2-Way. This is the key idea of
  Four-End Quicksort.
- **Cons:** direction logic depends on which end a chunk sits at. Only the max part may go to
  the top of A, because sorted output piles up there.

## Pivot by Leaf Count

**The idea.** Choose the split points so the last small groups come out full, which makes the Finisher's work cheaper.

**Under the hood.** Role: pivot. Choose pivots so that the final leaves come out full (for example, ⌈m/5⌉ leaves of
up to 5 values), instead of splitting in equal thirds.

- **Measured:** with BFS Leaf ≤ 5, −27 at n=100 and −334 at n=500; without a Finisher, +12 /
  −89 (sim). Together with BFS Leaf it is a **synergy**: the pair saves 39 / 245 more than the
  two alone add up to.
- **Pros:** fewer wasted small leaves. Pairs with BFS Leaf.
- **Cons:** more arithmetic, and on its own it barely helps.

## DP Splits — *"Plan every split in advance"*

**The idea.** Plan the size and the destination of every split in advance, to need the fewest moves on average.

**Under the hood.** Role: split. A dynamic program over (chunk size, location, whether the stacks hold other
values) chooses part sizes and destinations that minimise the **expected** op count. It
includes `rr` merges and free cases, such as a chunk alone on its stack.

- **As built (ref):** the study's full planner (claude-opus-5.5-max's `dp*.c`), ported op for op
  (`js/cards/engines/planned.js`). It plans every size up to n (up to 2000, scaled beyond) and
  every context: the chunk's end, and whether each stack holds anything else. A split costs each
  value's move (≤ 3 ops) plus each part's expected cost, less the expected `rr` merges, and a
  chunk alone on its stack reads from either end for free. Sizes come from an exhaustive scan up
  to 32 values, else from hill climbing from the previous size's optimum, re-anchored by a grid
  every 16 sizes. Leaf costs come from the Finisher: exact table averages for BFS Leaf (≤ 5) and
  Distance Tables (≤ 4), and the build's measured beam costs for Beam Leaf (≤ 32).
- **Measured (seeds 1000–1004, both peepholes):** with BFS Leaf, 516.2 / 3590.0, against Pivot by
  Leaf Count's 528.0 / 3823.0 (−12 / −233). The sim's simplified DP (no `rr` merges, no free
  reads) measures 520.2 / 3658.8 on the same inputs, so the full planner's two additions are worth
  −4 / −69 on their own. With Beam Leaf it is claude-opus-5.5-max's `--complex`: 419.6 / 3110.8,
  the same streams move for move (`tests/planned.test.mjs`).
- **Pros:** the strongest partition card.
- **Cons:** Legendary Grasp (dynamic programming) and Craft (24 functions). It needs measured leaf
  costs as input, and planning takes about half a second in JavaScript the first time.
- **Requires:** Four Ends. **Conflicts:** Median Pivot and Pivot by Leaf Count, because it
  chooses the part sizes itself.

## Restore Skip

**The idea.** In Quick 2-Way, skip undoing the rotations when there is nothing underneath to protect.

**Under the hood.** Role: ends, as a variant of Quick 2-Way's two ends. In Quick 2-Way, skip the `rra` restore
when the chunk is the whole stack, or when the remaining part can be processed from the
bottom instead. The first case is part of the bare Quick 2-Way: always restoring would cost
+139 at n=100 and +732 at n=500 (sim). The second case is not built in the sim; carried
through, it becomes Four Ends.

- **Pros:** an easy saving.
- **Cons:** many special cases.
