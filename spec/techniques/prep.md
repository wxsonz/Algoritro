# Prep techniques

They run before the first op. They cost ops only indirectly, by making other cards possible.
Prep cards stack: a hand can hold any number of them, and they use no slot.

## Rank Compression — *"Forget the values, keep the order"*

Replace each value with its rank 0..n−1. This can be done with a merge sort in O(n log n),
which also detects duplicates (equal neighbours) and counts inversions for free.

- **Pros:** Radix needs it. Chunks and buckets become arithmetic. It removes INT_MIN/INT_MAX
  edge cases from the algorithm code.
- **Cons:** none for ops. The O(n²) counting version is slow but fine at n=500.
- **Hosts:** all cards. It is always on in the explorer and shown in the input panel. The
  Codex keeps it as a card so peers learn that it is a choice.

## Presorted Shortcut — *"Don't fix what isn't broken"*

If A is already sorted, output nothing. If A is a **rotation** of the sorted order, output
only the shorter rotation. Optionally, if it is sorted except for the top two, output `sa`.

- **Measured:** on sorted input, bare cards spend from 0 (Long Line, Quick 2-Way) up to 1084 at
  n=100 (LSD Radix) and 3914 at n=500 (Four-End Quicksort); on a sorted input rotated by n/4,
  every card pays 175 to 1084 ops at n=100, against 25 for the shortcut (sim).
- **Pros:** free, and the subject requires the no-op output for sorted input.
- **Cons:** only helps on special inputs: it never fires on uniform random input.
- **Hosts:** all cards.

## Disorder Meter — *"How messy is it?"*

Disorder = inversions ÷ (n(n−1)/2), as the subject defines it, computed with a merge-sort
count in O(n log n). Alternatives are runs, LIS deficit and displacement (see the Adaptive
Selector).

- **Pros:** required for `--adaptive` and `--bench`.
- **Cons:** the inversion ratio is a poor predictor for some cards. For example, a rotated
  sorted input has high disorder but is nearly free.
- **Hosts:** the Adaptive Selector.
