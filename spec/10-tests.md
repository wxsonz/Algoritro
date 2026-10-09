# 10. Tests

`node tests/run.mjs` runs without any framework.

- **replay.js:** every op, including on empty and single-value stacks; unknown op names;
  sorted and unsorted detection.
- **Every card × every legal hand combination:** for n ∈ {0, 1, 2, 3, 4, 5, 6, 7, 20, 100}
  × each generator × 5 seeds, the stream replays to a sorted A with B empty. Illegal
  combinations (by `compat.json`) are rejected by `hand.js`, never silently run.
- **Exhaustive small n:** all permutations for n ≤ 6 on every algorithm. All must be valid,
  and none may beat the Oracle. If one does, the Oracle or the replay is wrong.
- **Oracle:** over all n! inputs (B empty at the start), the optimal counts match this table.
  It comes from a full BFS of all (n+1)·n! states, run on 2026-10-09.

  | n | inputs | states | max ops | sum of optimal ops | mean |
  | --- | --- | --- | --- | --- | --- |
  | 2 | 2 | 6 | 1 | 1 | 0.500 |
  | 3 | 6 | 24 | 2 | 7 | 1.167 |
  | 4 | 24 | 120 | 5 | 69 | 2.875 |
  | 5 | 120 | 720 | 8 | 583 | 4.858 |
  | 6 | 720 | 5040 | 10 | 5083 | 7.060 |
  | 7 | 5040 | 40320 | 13 | 46903 | 9.306 |
  | 8 | 40320 | 362880 | 16 | 467324 | 11.590 |
- **Post cards:** the rewritten stream replays to the same final state and is never longer
  than the input.
- **Determinism:** the same seed and hand give byte-identical streams.
- **Data:** every card in `cards.json` has the required fields. Every native, default and
  requirement in `compat.json` names an existing card or role, and no card has more slots
  than open roles.
- **Reference numbers:** each seed deck in `05-meta.md` and each bare card measures within
  ±5 % of its "sim" number in [sim/results.md](sim/results.md). A larger difference means
  either the implementation or the spec is wrong, and the test says which number to update.
- **Class check:** the growth check in [09-metrics.md](09-metrics.md#growth) flags the cases it
  must flag (Butterfly and Chunks with constant params, Turk labelled n log n) and passes the
  ones it must pass (Quick 2-Way, LSD Radix, √n-scaled params).
- **Builds:** under the subject's thresholds, a build whose hand misses its regime's class
  target is reported as non-compliant.
