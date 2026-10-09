# Meta cards

A Meta card wraps **complete hands** and decides which one plays. The one left is the Adaptive
Selector, and the Table's build is it: one hand per flag, chosen by disorder. Portfolio (run
several hands, keep the shortest move list) was removed: a reviewer may not accept "the shortest of
several streams" as one method, and the Table's cheats now show that ceiling instead.

---

## Adaptive Selector — *"Read the table, pick the deck"*

| cost | Grasp | Craft | rarity |
| --- | --- | --- | --- |
| one disorder measurement | 4 | 4 | Common (required by the subject's `--adaptive`) |

**The idea.** Measure how messy the stack is, then play the hand that suits it best.

**Under the hood.** Tiny stacks come first: three numbers or fewer go to Hardcoded Three, and
four or five to the Oracle's search, whatever their disorder. That is optimal: the worst order
of 5 takes 8 moves (Five Hand needs 10), well inside the subject's 12. In C this is a BFS over
the 120 orders, or a table of them computed once. Otherwise, measure the input's disorder (inversions ÷
pairs, by the subject's definition), then dispatch to a hand per range. The subject's baseline is < 0.2 → the O(n²)
hand, < 0.5 → the O(n√n) hand, and otherwise → the O(n log n) hand. These are also the
subject's class targets: whatever runs at disorder ≥ 0.5 must be O(n log n), and whatever
runs at 0.2–0.5 must be O(n√n) or better. In the Lab, the thresholds can be edited and drawn
on the Disorder map, so you can see whether the subject's cut points are where the hands
actually cross. Moving them flags any regime whose hand misses its class target.

**Uniform input sits on the cut.** The disorder of a uniform random input is 0.500 ± 0.034 at
n=100 and ± 0.015 at n=500, so about half of the evaluation's random inputs go to the medium
hand and half to the complex one (sim). The subject's own `--bench` example shows a random
500-value input at 49.93 % going to the O(n√n) method. A build's grade therefore depends on
both hands, and its worst runs come from the weaker one.

**Builds.** This card wrapped around a simple, a medium and a complex hand is a **build**: the
thing the evaluation actually runs. The Meta page ranks builds ([05-meta.md](../05-meta.md)).

**Variants (params):**
- **Metric choice:** inversions, runs, LIS deficit (n − LIS), displacement. Some metrics
  predict a card's cost better than others.
- **Predict, don't measure:** estimate each hand's cost from the metric with a fitted curve,
  instead of fixed thresholds.

**Lore.** Required by the subject; the disorder metric is the classic inversion count, which
measures how far a list is from sorted (it is also the number of swaps bubble sort needs).

**Pros**
- Required by the subject, and it makes "which card when?" explicit.

**Cons**
- With bad thresholds, it picks a worse hand than any single one would, or breaks a class
  target.
- The Disorder map makes both visible.
