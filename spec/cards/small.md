# ◆ Small family

These cards handle tiny n exactly. They are also used as **Finishers**, solving the leftovers
inside bigger algorithms.

---

## Hardcoded Three — *"Six cases, no thinking"*

| class | n | ops | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(1) · ✓ | 3 | ≤ 2 | 2 | 2 | ~20 | Common |

**The idea.** Three numbers can only be in six orders, so the card simply knows the best answer for each one.

**Step by step.**
1. If the biggest number is on top, rotate it to the bottom (`ra`).
2. If it is in the middle, bring the bottom one up instead (`rra`).
3. The biggest is now at the bottom. If the top two are the wrong way round, swap them (`sa`).
4. Done, in at most two moves.

**Under the hood.** There are 3! = 6 orders. If the max is on top, `ra`. If the max is in the
middle, `rra`. Then, if the top two are out of order, `sa`. This is always optimal for 3
(checked against the Oracle on all 6 orders, sim).

**Lore.** Nothing to tell: with 6 orders, every push_swap writer works the cases out by hand.

**Pros**
- Optimal and trivial to write.
- Used as the finisher in Turk, Min Extract and many others.

**Cons**
- Only for 3. It does not generalise.

**Slots:** none. **Plays as:** Finisher.

---

## Five Hand — *"Push the two smallest, fix three, pull back"*

| class | n | ops | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(1) · ✓ | 4–5 | ≤ 10 (mean 7.4 at n=5) | 2 | 4 | ~40 | Common |

**The idea.** Park the two smallest numbers in B, sort the three that are left, then bring the two back on top.

**Step by step.**
1. Turn A the short way until the smallest number is on top, and push it to B.
2. Do the same for the second smallest.
3. Sort the three numbers left in A with Hardcoded Three.
4. Push both back (`pa pa`): the smaller one lands on top.

**Under the hood.** Rotate the minimum to the top by the shorter way and `pb`. Repeat for the
second minimum. Hardcoded Three on A, then `pa pa`.

**Lore.** Folk 42 knowledge, passed between peers because evaluators used to check 5 values in
≤ 12 ops.

**Pros**
- Simple and reliable. Its worst case at n=5 is 10 ops, so it always fits the common
  "5 values in ≤ 12" bar.

**Cons**
- Not optimal. At n=5 the Oracle needs 2.5 fewer ops on average and up to 6 fewer, and Five
  Hand is optimal on only 7 of the 120 orders (sim). The gap is shown in Lab › Optimality
  gap.

**Slots:** none. **Finisher:** its inner Three (Hardcoded Three by default) can be swapped.
**Plays as:** Finisher for leaves of 5.

---

## Oracle — *"Sees every future"*

| class | n | ops | Grasp | Craft | Lines | Speed | rarity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| exponential · ✓ optimal | ≤ 8 (BFS), 9+ (IDA*) | optimal | 4 | 6 | ~200 | ●●○○○ | Rare |

**The idea.** Try every possible sequence of moves, shortest first, until one sorts the stack. It always finds the fewest moves, but only small stacks fit in memory.

**Step by step.**
1. Start from the input: one position, zero moves.
2. From every position, try all 11 moves to reach the positions one move further.
3. Never visit the same position twice.
4. The first sorted position found gives the answer: the moves that led there.

**Under the hood.** Breadth-first search over states (A, B) using the 11 ops. The first time the
sorted state is reached, the path is the shortest stream. Every way to split an order of the n
values between the two stacks is a state: (n+1)·n! in all. That is 40,320 at n=7, 362,880 at
n=8 (a full BFS takes about a second in Node, sim) and 3.6 million at n=9. Pack each state into
an integer key and keep a visited set. One backward BFS from the sorted state gives the
optimum of every input at once.

**Variants.** These are params, not technique cards: they change CPU time and the reachable n,
never the op count.
- **Bidirectional BFS:** search from both ends and meet in the middle, roughly a square-root
  saving in states.
- **IDA\*:** iterative deepening with an admissible heuristic, so memory stays flat and n ≥ 9
  becomes feasible. Inversions ÷ 2 is **not** admissible: `[1 2 3 4 0]` scores 2 but is one
  `rra` from sorted. A safe one: read A followed by B reversed as a cycle. `pa` and `pb` never
  change that cycle, and one op removes at most 5 **breakpoints** (neighbours that are not
  consecutive ranks), so max(|B|, ⌈breakpoints ÷ 5⌉) never overestimates (checked on every
  state up to n=8, sim). It is weak, about a fifth of the true distance, so a pattern database
  is the real upgrade.
- **Distance tables:** precompute a backward BFS from the goal once, then look up any small
  leaf in O(1).
- **Op pruning:** never play an op right after its inverse, and never `ra` then `rb` when `rr`
  exists.

**Lore.** Breadth-first search was reinvented by Edward F. Moore in 1959 to find the shortest
way out of a maze (Konrad Zuse had it in 1945, unpublished until 1972). IDA* is Richard Korf's
1985 answer to BFS's memory hunger, tested on the 15-puzzle, which is exactly the kind of
problem a small push_swap is.

**Pros**
- Ground truth. Every heuristic's optimality gap is measured against it.
- As a leaf solver inside quicksorts, it saves a measurable number of ops.

**Cons**
- Exponential: 3.6 million states at n=9 and 40 million at n=10. Beyond ~9 values it needs
  serious engineering.
- C needs a hash set and a queue (malloc-heavy, so watch the leaks).

**Slots:** none; the variants above are params. **Plays as:** Finisher (BFS Leaf) and as the
baseline in the Lab.
