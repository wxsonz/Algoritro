# Meta cards

A Meta card wraps one or more **complete hands** and decides which output to use. Meta cards
cost CPU, not ops.

---

## Portfolio — *"Run them all, keep the shortest"*

| cost | Grasp | Craft | rarity |
| --- | --- | --- | --- |
| CPU × (number of hands) | 2 | 2 | Rare |

**The idea.** Play several hands on the same stack and keep the shortest move list.

**Under the hood.** Run every wrapped hand on a copy of the input and output the shortest stream.
The simplest version is "one band vs two bands" inside LIS Insertion: −8 ops at n=100 against
two bands alone, and nothing at n=500, where two bands always win (sim).

**Lore.** Huberman, Lukose and Hogg named algorithm portfolios in 1997 (in Science). They
borrowed the idea from finance: when no single method wins every input, spread the effort over
several and keep the best.

**Pros**
- Free ops. It can never be worse than its best member.

**Cons**
- An evaluator may not accept "the shortest of several streams" as **one method** for a
  complexity class. Its class is the worst of its members' classes.
- CPU multiplies.

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
