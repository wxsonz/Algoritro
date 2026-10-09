# Leaf techniques (Finishers)

These solve small leftovers inside a bigger card. A Finisher goes in the hand's own Finisher
slot, not a technique slot, and a hand holds at most one. Better leaves matter most for Divide
cards, which produce about n/k leaves.

| card | size | quality | Grasp | Craft | notes | idea |
| --- | --- | --- | --- | --- | --- | --- |
| Hardcoded Three | 3 | optimal | 0 | 1 | Turk, Min Extract | Three numbers have only six orders: look up the right answer for each one. |
| Five Hand | ≤ 5 | good | 1 | 3 | push two mins, Three, pull back | Park the two smallest numbers in B, sort the three left, then bring the two back. |
| BFS Leaf | ≤ 5 | optimal | 3 | 18 | the rest of each stack is a fixed **wall** the search cannot touch. States pack into an integer key. On Four-End Quicksort: ≤ 3 saves 95 / 635, ≤ 5 saves 142 / 657 at n=100 / 500 (sim). | Search every move sequence for the last few numbers and use the shortest, without disturbing the rest of the stacks. |
| Distance Tables | ≤ 4 | optimal, O(1) lookup | 5 | 21 | precomputed backward BFS from the goal. The same ops as BFS Leaf ≤ 4 (−105 / −657), only faster. | The same perfect answers as BFS Leaf, looked up in a table computed in advance. |
| Beam Leaf | ≤ 32 | near optimal | 8 | 45 | claude-opus-5.5-max's leaf search, ported op for op: a level beam (width 150 000 / n, 200 to 1000) ranked by the exact table distances of the leaf's projections onto groups of 4 ranks, plus penalties for values blocking higher ones; finished exactly once 4 remain. Falls back to splitting when the beam's result is longer than the split DP Splits expects, so it needs DP Splits. With both peepholes on Four-End Quicksort: −97 / −479 against BFS Leaf. | A beam search for leftovers of up to about 32 numbers: nearly perfect, and far bigger than a full search can handle. |

**As a Finisher on other hosts (exp, n=100 / 500):** BFS Leaf on Turk (it keeps 5 instead of 3)
−5 / −50; on Lookahead Greedy −13 / −24; on Min Extract and Twin Extract about −2.5. On Tape Merge,
sorting the first runs as blocks: Distance Tables (blocks of 4) −50 / −355, BFS Leaf (blocks of
5) −23 / −215.

**Pros of better leaves:** a direct saving per leaf. For n=500, a quicksort produces ~100
leaves. With Pivot by Leaf Count, which makes the leaves come out full, the saving grows: the
pair is the first measured synergy (sim).

**Cons:** BFS and beam leaves are the most memory- and CPU-sensitive code in a build. Watch
for leaks and time limits.

**Hosts:** Four-End Quicksort, Quick 2-Way, Tape Merge (to sort the first runs), Five Hand (its
inner Three), and Turk, Lookahead Greedy, Min Extract and Twin Extract (the last values in A).
See [../04-compatibility.md](../04-compatibility.md) for each host's default Finisher.
