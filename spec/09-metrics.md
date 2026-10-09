# 9. Metrics

## Per run

- Total ops, and per-op counts in the subject's `--bench` layout:
  `sa sb ss pa pb ra rb rr rra rrb rrr`.
- Ops per phase (from `m.phase`).
- Ops removed by each post card, before and after.
- Planner CPU time (`performance.now`, median of 5 runs for small n).
- Validity from `replay.js`: A sorted ascending from the top, and B empty.

## Per hand over seeds

- Mean, min, max, standard deviation, a histogram, and Spread = (max − min) / mean.
- Grade of the mean at n = 100 and 500, interpolated (~) elsewhere with the power law in
  [02-game-design.md §2.7](02-game-design.md#27-grades).
- **Pass rate:** the share of runs under each threshold at n = 100 and 500. The evaluation
  grades every run, so this is the number a peer actually needs. For example, Chunks averages
  662 at n=100, yet 5 % of its runs reach 700 or more (sim).
- Technique effects and interactions are always **paired**: the same seeds with and without the
  card. Pairing cuts the noise enough to see effects of a few ops; the error bars in
  [spec/sim/results.md](sim/results.md) are standard errors of paired differences.

## Growth

- Mean ops at n ∈ {16, 32, 64, 100, 128, 256, 500, 512, 1000} in the browser. Offline adds
  2048 and 4096, which the class check needs.
- **Class check.** For the claimed class f (n², n√n or n log₂ n), fit ops ≈ a · f(n) + b · n on
  the sizes up to 1000, then compare the offline sizes with the fit. The claim is flagged when
  the measured mean exceeds the prediction by more than 5 %. In the sim, this flags Butterfly
  and Chunks with constant params (+14 % and +10 % at n=2048, +42 % and +36 % at n=4096) and
  Turk labelled n log n (+14 % at n=2048). It passes Quick 2-Way, LSD Radix and the √n-scaled
  params, all within 1 %.
- **Why not "a ratio that keeps rising".** Ops ÷ f(n) can rise for a valid claim when the
  lower-order term is negative: Quick 2-Way's ops ÷ n log₂ n rises from 1.08 at n=128 to 1.25
  at n=4096, yet it is O(n log n). It can also stay flat up to n=1000 for a failing claim: with
  w = 30 above n=100, Butterfly's ops ÷ n√n only turns up after n=1000.
- **A known false positive: integer pass counts.** Merge cards run ⌈log₂ runs⌉ passes, so their
  ops jump at powers of two (Natural Merge: 9760 at n=500, 11467 at n=512, exp). The smooth fit
  then underestimates n = 4096 by 5.7 % and the check flags Natural Merge although its
  O(n log n) proof holds; Tape Merge sits at +4.0 %. The Codex shows the flag with the numbers,
  and the tolerance stays at 5 % so the real failures stay visible.
- **Params are declared as functions of n**, for example w = round(1.4√n). A param that stops
  growing (a constant, or a step like w = 15 / 30) on a card that claims O(n√n) is flagged
  without measuring.
- The normalised ratios ops ÷ (n log₂ n) and ops ÷ (n√n) are still plotted in the Lab.

## Seed lists

Fixed seed lists per n are stored in `data/seeds.json`, so every measurement and every Meta
entry is reproducible. Users can change the seed count in the Lab.
