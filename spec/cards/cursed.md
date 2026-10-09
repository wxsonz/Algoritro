# Cursed cards

Famous sorting algorithms that **do not map well onto two stacks**. They live in the Codex
with a cracked frame. Where it is feasible, a naive port is playable, so peers can *see* the
curse instead of just reading about it.

The common reason is that push_swap has **no random access**. Reaching position i costs
min(i, m − i) rotations, and only the tops (and, through rotation, the bottoms) are cheap.
Any algorithm whose speed comes from jumping around an array loses that speed here.

| card | why it is cursed | playable? |
| --- | --- | --- |
| **Heapsort** | Sift-down jumps from i to 2i+1. The jumps along one sift-down double in length, so they add up to O(n) rotations, and n sift-downs cost O(n²) ops: quadratic, not n log n. | yes, a naive port, to show the blow-up |
| **Shell sort** | Gap comparisons need positions i and i+gap at the same time. With one swap op that only touches the top two, every gap compare costs about gap rotations, so the large-gap passes that make Shell sort fast are the most expensive here. | yes, naive |
| **Counting sort** | Ranks already give every value's final position. The hard part was never knowing where a value goes, only moving it there. | as a lesson only: "Rank Compression is the counting part" |
| **Pancake sort** | Its prefix reversal is a single operation there. Here, reversing k values costs about 2k ops (the optimum is 5, 9, 11 and 14 ops for k = 3 to 6, sim). | yes, naive |
| **Bitonic / sorting networks** | Fixed compare-exchange pairs at arbitrary distances need random access. | no |
| **Bogosort** | Random shuffles. It is included as a joke and a lesson in expected cost. | n ≤ 6 only, capped |
| **Cycle sort** | It minimises writes, but here moves are what cost, not writes. Following a cycle means rotating to each position. | yes, naive |
| **Merge insertion (Ford–Johnson)** | It sorts with the fewest comparisons known (1959), but push_swap counts moves, not comparisons. Fewer comparisons buy nothing when every look at a value is free and every move costs. | as a lesson only: "optimal for the wrong metric" |
| **Smoothsort / Cartesian tree sort** | Adaptive in theory: nearly sorted input is cheap. But they keep a heap or tree over array positions, so they need random access, and they fall apart like heapsort. | as a lesson only |
| **Stooge sort** | O(n^2.7) comparisons, made worse by rotations. | n ≤ 30, capped |

**Lore.** Each of these was a good idea somewhere else, which is the point. Shell sort is
Donald Shell's (1959). Heapsort is J. W. J. Williams' (1964), soon improved by Robert Floyd.
Pancake sorting was posed in 1975 in the American Mathematical Monthly
under the pen name "Harry Dweighter"; its first paper (1979) is the best-known research paper
Bill Gates co-wrote. Counting sort and sorting networks came from 1950s machine design.
Merge insertion is Ford and Johnson's (1959); smoothsort is Dijkstra's (1981). All of them
assume you can reach any position cheaply, which a stack cannot.

**The subject lists two of these ideas.** Its O(n log n) examples include "heap sort
adaptation" and "binary indexed tree approaches". A literal heapsort port is the cursed card
above: any adaptation must first show an O(n log n) op count without random access, and none
of the studied builds does. A binary indexed tree answers rank and position queries in
O(log n) CPU. That speeds up a planner, for example Cheapest Pick's slot search, but it moves
no values, so the op count still comes from the method it serves. The Codex says this on both
cards, so peers who read the subject first are not misled.

**Teaching value.** Each cursed card links to the playable card that fixes its weakness:

- Heapsort → Four-End Quicksort: structure without random access.
- Shell sort → Butterfly: "almost sorted first, then finish".
- Pancake sort → Bubble Wheel.
