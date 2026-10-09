# Order techniques

They replace a greedy choice ("cheapest next") with a search over the whole **plan**.

## Beam over Orders

Keep the W best partial insertion orders, expanding each by the cheapest few next insertions,
and score them by ops so far. Width can be scaled by size, for example W = budget ÷ b².

- **Measured:** on Long Line, keeping the 3 cheapest next insertions per order: W = 4 gives −7
  at n=100, W = 16 −14 and W = 64 −19. At n=500 it is about −46 ± 30 with W = 16–64, from 40
  inputs (sim). Unlike Lookahead-k, it gains, because it compares whole partial plans.
- **Measured (ref):** one reference build uses it in its medium method (√n buckets,
  488 / 3394) and its simple method (LIS insertion, 471 / 4312).
- **Pros:** fixes greedy regret systematically.
- **Cons:** CPU cost, and Legendary Craft.
- **Hosts:** LIS Insertion, Bucket Insertion, Turk.

## Annealed Plan

Simulated annealing over a plan: insertion order, chunk boundaries or pivots. See the Annealer
card.

- **Measured:** over the chunk boundaries of Chunks, 200 trials per input: −47 at n=100 and −263
  at n=500 (sim). Each trial re-runs the whole card.
- **No fixed schedule hides in it:** averaged over inputs, the boundaries it settles on are
  equal widths, and reusing that average as a fixed schedule saves only 2 / 8 (sim). The gain
  is per input, so the search has to run at runtime.
- **Pros:** works with any host that has a plan.
- **Cons:** needs seeding to be deterministic, and CPU grows with the number of trials.
