# Anchor techniques

Choose a set of values that **stay in A** and are never pushed. Every value kept saves one
`pb` and one `pa`, and the kept values form the circular skeleton that the rest are inserted
into.

## LIS Anchor — *"Keep the longest ordered line"*

**The idea.** Keep the longest line of numbers in A that already goes up, and never move it: everything else is inserted around it.

**Under the hood.** Keep a longest increasing subsequence, found by patience sorting with predecessor links in
O(n log n). The expected LIS of a random permutation approaches 2√n, but it is shorter at
these sizes: about 17 values at n=100 and 40 at n=500 (sim).

- **Measured:** on Simple Insertion, −65 at n=100 (1462 → 1397) and −366 at n=500 (sim). With
  Cheapest Pick added, it is the bare LIS Insertion card (547). The two overlap: Cheapest Pick
  alone takes Simple Insertion to 588, so the anchor adds only −41 on top of it.
- **Pros:** optimal for its job: the fewest pushes possible while keeping A ordered.
- **Cons:** pass 1 must still `ra` past the kept values, so each one costs a rotation instead
  of two pushes. The saving is smaller than "2 per kept value".
- **On Turk:** keeping the LIS instead of three values gives −9 at n=100 but **+49** at n=500
  (sim). Turk's cheapest pick already avoids most of what the anchor saves, and the kept values
  sit between the ones it still has to push.
- **Hosts:** Simple Insertion, Turk (replacing Keep Three), Insert-into-B (mirrored).
- **Conflicts:** other anchors.

## Circular LIS Anchor — *"The line can wrap around"*

**The idea.** Like LIS Anchor, but A is a circle, so the kept line may wrap around from the bottom back to the top.

**Under the hood.** A is a circle, so the kept set only needs to be increasing **circularly**. Take the best LIS
over all n rotations (O(n² log n)).

- **Measured:** on LIS Insertion (Four-Way Cost, one band), −6 ± 1 at n=100, −7 ± 4 at n=200
  and −17 ± 11 at n=500 (sim). The anchor is about 2 values longer at n=100 and 4 at n=500.
  An earlier run reported +15 at n=500 from 40 inputs, which was within its noise.
- **On Turk:** −13 at n=100 and +45 at n=500 instead of Keep Three (sim), like LIS Anchor.
- **Pros:** never shorter than the plain LIS.
- **Cons:** a small gain for an O(n² log n) search over rotations. Keeping more values does not
  save much, because each kept value still costs a rotation in pass 1.
- **Hosts:** as LIS Anchor.

## Longest Run Anchor — *"Keep the longest contiguous ordered block"*

**The idea.** Keep the longest block of neighbours that is already in order, and move only the rest.

**Under the hood.** Keep the longest stretch of **adjacent** values that are already in order. It is trivial to
find in O(n).

- **Measured:** on Simple Insertion + Cheapest Pick, −7 at n=100 and −20 ± 12 at n=500; on Turk
  instead of Keep Three, +20 / +83 (sim).
- **Pros:** very easy. It is free on nearly sorted inputs.
- **Cons:** on random input the longest run is short, about 5 values at n=100–500 (sim), so
  the effect is small, and on Turk it is negative.
- **Hosts:** as LIS Anchor.

## Keep Three — *"Leave three, sort them by hand"*

**The idea.** Stop pushing when three numbers are left in A, and sort those three directly.

**Under the hood.** Stop pushing when 3 values remain in A and sort them with Hardcoded Three.

- **Pros:** Turk's default anchor, and native in Min Extract. Zero Grasp cost.
- **Cons:** it keeps only 3, against ~2√n for the LIS.
- **Hosts:** Turk, Min Extract.
