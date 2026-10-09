# Leaf techniques (Finishers)

These solve small leftovers inside a bigger card. A Finisher goes in the hand's own Finisher
slot, not a technique slot, and a hand holds at most one. Better leaves matter most for Divide
cards, which produce about n/k leaves.

| card | size | quality | Grasp | Craft | notes |
| --- | --- | --- | --- | --- | --- |
| Hardcoded Three | 3 | optimal | 1 | 1 | Turk, Min Extract |
| Five Hand | ≤ 5 | good | 1 | 2 | push two mins, Three, pull back |
| BFS Leaf | ≤ 5 | optimal | 2 | 4 | the rest of each stack is a fixed **wall** the search cannot touch. States pack into an integer key. On Four-End Quicksort: ≤ 3 saves 95 / 635, ≤ 5 saves 142 / 657 at n=100 / 500 (sim). |
| Distance Tables | ≤ 4 | optimal, O(1) lookup | 3 | 4 | precomputed backward BFS from the goal. The same ops as BFS Leaf ≤ 4 (−105 / −657), only faster. |
| Beam Leaf | ≤ ~32 | near optimal | 5 | 5 | pattern-database heuristic. Falls back to splitting if the beam result is too long. Not built in the sim (ref only). |

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
