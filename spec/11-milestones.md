# 11. Milestones

**Status (2026-10-09):** 1–7 are built and tested (`npm test`: the unit, reference, growth and
data suites; `npm run test:ui`: the pages in headless Chromium). 8 waits for a decision on where
and how to publish.

1. **Core.** rng, input, machine, replay, metrics, hand, and the test runner. Cards: Hardcoded
   Three, Five Hand, Min Extract, LSD Radix, and the Oracle (BFS), which the exhaustive tests
   need as ground truth. A plain Table with a board and a transport, and no card visuals yet.
2. **The card game.** Card component (front and back), hand rail, slots, technique rail with
   compatibility filtering, the result panel with grades and the delta strip. Cards: Simple
   Insertion, LIS Insertion, Turk, plus anchor, pick, cost, band and post techniques. This is
   the **Insertion Ladder** in full.
3. **Codex.** Card pages, the Grasp × Craft grid, Cursed cards (naive ports for heapsort,
   shell sort and pancake sort). Cards: Bubble Wheel, Twin Extract, Insert-into-B, Chunks,
   Butterfly, Bucket Insertion, plus sweep and retrieval techniques.
4. **Lab.** Worker-based scaling, disorder map, param sweep, and the optimality gap. The
   Adaptive Selector with the subject's thresholds, and the regime class check.
5. **Divide.** Quick 2-Way, Four-End Quicksort, ends, split and pivot techniques, Finishers
   for leaves, the partition-tree overlay.
6. **Meta.** `tools/meta.mjs`, tier list, builds, Pareto front, technique value, interaction
   matrix, named decks, open spaces. Portfolio. Paths.
7. **Research cards.** Ternary Radix, Tape Merge, Lookahead Greedy, Beam Sorter, Annealer, DP
   Splits, Adaptive Selector with alternative metrics.
8. **Publish** as a shared artifact for peers.
