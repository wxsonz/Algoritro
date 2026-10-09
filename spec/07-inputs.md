# 7. Inputs

## Controls

- **n:** 1–1000 in the UI, with quick buttons for 3, 5, 7, 20, 100 and 500. Offline tools allow
  more.
- **seed:** shown, editable, with a reroll button. The same (generator, n, seed, params) always
  gives the same input. On the Table one **global seed** (top right, `seed 1000 🎲`) drives every
  seeded stack; it starts at 1000, the study's first seed. A custom stack has its own seed box.
- **generator:**

| generator | param | why it is useful |
| --- | --- | --- |
| uniform | — | the grading case, generated exactly as Python does: `random.Random(seed).sample(range(-100000, 100000), n)`, bit for bit (`core/pyrandom.js`, ported from the push_swap visualizer). A seed names the same input here, in the study's builds and in a peer's Python tester. Its disorder is 0.500 ± 0.034 at n=100 and ± 0.015 at n=500, so about half the graded inputs go to the medium hand under `--adaptive` |
| exact disorder | d ∈ [0, 1] | the Disorder map and Adaptive thresholds. A random Lehmer code with exactly d·n(n−1)/2 inversions: not uniform among inputs with that disorder, and easier than uniform input at the same level (sim). The disorder is **global**: a value can land far from its place |
| exact disorder, local | d ∈ [0, 1] | the same exact count of inversions made only of **adjacent swaps** of pairs still in order, so every value stays near its place (the push_swap visualizer's "local" shape, ported bit for bit, seeded with Python's generator: a seed gives the visualizer's input). At the same 25 % it moves chunk cards very differently from the Lehmer shape |
| nearly sorted | k swaps | shows which cards exploit existing order |
| reversed | — | among the cheapest inputs for insertion and selection cards (about 3n ops, against ~1460 at n=100 for random input), and worse than random for Bubble Wheel, Butterfly and Quick 2-Way (sim) |
| sorted | — | the subject's "smallest list" is empty. Bare cards do not all manage it (LSD Radix spends 6784 at n=500, Four-End Quicksort 3914); Presorted Shortcut does |
| rotated sorted | offset | disorder up to about 0.5 (0.505 at n=100 for an offset of n/2), yet a few rotations sort it: exposes the inversion metric |
| organ pipe | — | ascending then descending |
| sawtooth | k runs | a natural-runs test, good for Tape Merge |
| down then up | — | descending then ascending: organ pipe upside down |
| interleaved halves | — | 0, h, 1, h+1, …: hard for cards that move chunks of ranks |
| nearly reversed | k swaps | reversed, then k random swaps |
| one order | — | the seed picks one of the n! orders (lexicographic); with n ≤ 6 a stack can run every order |
| manual | text | paste any values |

## Always shown

n; disorder (inversions ÷ pairs, the subject's definition, shown as a percentage with two
decimals like `--bench`, and 0 when n < 2, where there are no pairs); the regime that
`--adaptive` would pick; LIS length, longest run, the number of ascending runs, and the
rank-compressed view.

## Validation

Manual input follows push_swap's rules: integers only, signed 32-bit range, no duplicates.
Errors are explained inline. The explorer never runs on invalid input.
