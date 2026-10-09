# Technique cards — roster

A Technique card modifies an Algorithm card by filling one **role**. Each slot role holds at
most one card per hand. **Prep** and **post** cards stack and use no slot. A **leaf** card is a
Finisher and goes in the hand's own Finisher slot. Stats are defined in
[../03-stats.md §3.3](../03-stats.md#33-technique-only-stats). Which algorithms accept which
roles, and the rules for slots, natives and defaults, are in
[../04-compatibility.md](../04-compatibility.md).

| file | role | what it changes |
| --- | --- | --- |
| [prep.md](prep.md) | **prep** (free, stacks) | what happens before any op: ranks, shortcuts, measurement |
| [anchor.md](anchor.md) | **anchor** | which values stay in A and never move |
| [pick-cost.md](pick-cost.md) | **pick**, **cost** | which value moves next, and how its rotation cost is priced |
| [layout.md](layout.md) | **sweep**, **band** | how A is swept while pushing, and where pushed values land in B |
| [retrieval.md](retrieval.md) | **retrieval** | how values come back from B |
| [partition.md](partition.md) | **ends**, **split**, **pivot** | where a divide card sends its parts, how many parts, and where it cuts |
| [leaf.md](leaf.md) | **leaf** (Finisher slot) | how small leftovers are solved |
| [post.md](post.md) | **post** (free, stacks) | rewriting the finished stream |
| [order.md](order.md) | **order** | searching over plans instead of taking the greedy choice |

## Summary

Effects are Δ mean ops, measured on the named host by the reference simulator (sim) unless
tagged, with the same inputs with and without the card. Negative means fewer ops. Details
and error bars are in [../sim/results.md](../sim/results.md).

| card | role | +Grasp | +Craft | measured effect | rarity |
| --- | --- | --- | --- | --- | --- |
| Rank Compression | prep (always on) | +1 | +0 | enables most cards; 0 ops by itself | Common |
| Presorted Shortcut | prep | +0 | +0 | sorted input → 0 (bare LSD Radix spends 6784 at n=500, Four-End Quicksort 3914); a rotation by k → min(k, n − k) | Common |
| Disorder Meter | prep | +1 | +2 | none (feeds Adaptive) | Common |
| LIS Anchor | anchor | +3 | +3 | Simple Insertion −65 @100, −366 @500; once Cheapest Pick is in −41 / −145; on Turk −9 / +49 | Rare |
| Circular LIS Anchor | anchor | +4 | +5 | LIS host −6 @100, −17 ± 11 @500; on Turk −13 / +45 | Rare |
| Longest Run Anchor | anchor | +0 | +1 | Simple Insertion + Cheapest Pick −7 @100, −20 ± 12 @500; on Turk +20 / +83 | Uncommon |
| Keep Three | anchor | +0 | +0 | Turk default, Min Extract native | Common |
| Cheapest Pick | pick | +1 | +2 | LIS host: −850 @100 (1397 → 547); alone on Simple Insertion −874 | Common |
| Two-Way Cost | cost | +3 | +2 | baseline for Cheapest Pick | Common |
| Four-Way Cost | cost | +3 | +2 | LIS host −4 @100, −19 @500; Turk −4 / −19; worse than Two-Way on 11–17 % of inputs | Common |
| Lookahead-k | cost | +2 | +3 | worse: Turk −2 @100, +175 @500; Long Line +25 / +297 (k = 2 among the 3 cheapest) | Rare |
| Double-Op Sharing | post (always on) | +0 | +0 | switched off: Turk +98 @100, +1224 @500; Long Line +69 / +852 | Common |
| `rb` Sink (Two Bands) | band | +1 | +1 | LIS host: −14 @100, −93 @200, −616 @500 | Uncommon |
| Multi-Band | band | +1 | +2 | not buildable as written (B has two ends); its knob is rb Sink's split point, best at 0.4–0.5·n | Rare |
| `sb` Seed | band | +0 | +1 | Turk +0.3: the `sb` costs more than it saves | Uncommon |
| Nearest-Member Sweep | sweep | +1 | +1 | Chunks: +16 @100, +140 @500 vs One-Way | Common |
| One-Way Sweep | sweep | +1 | +1 | Chunks: −16 @100, −140 @500 vs Nearest-Member; gives the n√n proof | Rare |
| Middle-Out Push | band | +1 | +1 | Chunks +141 @100, +1794 @500 instead of rb Sink | Uncommon |
| Max Retrieval | retrieval | +1 | +2 | baseline for buckets | Common |
| Second-Max Lookahead | retrieval | +2 | +3 | Chunks −26 @100, −385 @500; Butterfly −19 / −279 | Uncommon |
| Rank-Range Max | retrieval | +1 | +2 | 0 by construction (it finds the same max); a correctness and CPU fix | Uncommon |
| Cheapest Return | retrieval | +3 | +6 | Chunks +21 @100, −494 @500; within the top bucket +38 / −541 | Rare |
| Four Ends | ends | +1 | +4 | vs Quick 2-Way, both with 2-value leaves: +6 @100, −355 @500 | Rare |
| Restore Skip | ends | +0 | +1 | the whole-stack case is in the bare Quick 2-Way (−139 / −732 vs always restoring); the other case is not built | Uncommon |
| Thirds Split | split | +2 | +1 | given Four Ends, no Finisher: −86 @100, −330 @500 | Rare |
| DP Splits | split | +3 | +24 | with BFS Leaf and both peepholes, vs Pivot by Leaf Count: −12 @100, −233 @500; with Beam Leaf, the study's best `--complex`, 419.6 / 3110.8 | Legendary |
| Median Pivot | pivot | +0 | +0 | Quick 2-Way baseline | Common |
| Pivot by Leaf Count | pivot | +0 | +1 | with BFS Leaf ≤ 5: −27 @100, −334 @500; without it +12 / −89 (a synergy) | Rare |
| Hardcoded Three | leaf | +0 | +1 | — | Common |
| Five Hand | leaf | +1 | +3 | — | Common |
| BFS Leaf (≤ 5) | leaf | +3 | +18 | Four-End Quicksort: ≤ 3 −95 / −635, ≤ 5 −142 / −657 | Rare |
| Distance Tables | leaf | +5 | +21 | the same ops as BFS Leaf ≤ 4 (−105 / −657 on Four-End Quicksort), only faster | Legendary |
| Beam Leaf (≤ 32) | leaf | +8 | +45 | with DP Splits and both peepholes, vs BFS Leaf: −97 @100, −479 @500 (ported from the study) | Legendary |
| No-op Suppression | post | +0 | +1 | under 0.5 op per stream on every sim card | Common |
| Peephole Cancel | post | +2 | +2 | Radix −78 @100, −55 @500; Turk and LIS hosts < 1 | Uncommon |
| Peephole Fuse | post | +2 | +1 | Chunks −17 / −106; Butterfly −20 / −166; Radix 0; Turk and LIS hosts < 1. With Cancel on Four-End Quicksort: −33 / −217 | Uncommon |
| Commutation Peephole | post | +2 | +3 | after Cancel + Fuse: 0 on every sim card but Four-End Quicksort (−0.15 @100); ref −0.4 | Rare |
| Beam over Orders | order | +5 | +13 | Long Line: W = 4 −7 @100, W = 16 −14, W = 64 −19; at n=500 about −46 ± 30 | Legendary |
| Annealed Plan | order | +3 | +10 | chunk boundaries on Chunks, 200 trials: −47 @100, −263 @500 | Legendary |
