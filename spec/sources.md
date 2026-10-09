# Sources

## Measured here

- **The reference simulator** ([sim/](sim/README.md)). It loads `measure-sim.js` (quick JS
  implementations of Bubble Wheel, Min Extract, Insert-into-B, LSD Radix, Chunks, Butterfly,
  Turk, Quick 2-Way and LIS Insertion) and adds the variants the cards describe: Simple
  Insertion and the LIS family on one bench, Twin Extract, Ternary Radix, the Chunks sweeps and
  Second-Max, the adaptive builds, a BFS Oracle up to n=8, and the post passes. Inputs are
  seeded, technique effects are paired, and every stream is replayed by an independent
  checker. All numbers are in [sim/results.md](sim/results.md); `node spec/sim/report.mjs`
  reproduces them exactly.
- Earlier drafts also cited a "LIS walkthrough artifact" and an unseeded sim run of
  2026-10-08. Their numbers did not reproduce with the simulator's own code, so they were
  replaced; see [CHANGELOG.md](CHANGELOG.md).

## Reference builds

`~/42cc/_work/rank01/push_swap/study/README.md` and `study/TECHNIQUE.md` describe seven
reference builds. Their numbers are means over **5 seeds** (1000–1004, values from
[−100000, 100000)). The study's headline numbers are `--adaptive` means, which mix the medium
and complex methods because uniform input sits at disorder ≈ 0.5. The spec therefore quotes a
single method from its own column of the study's per-selector table (n=100 / n=500), and quotes
the adaptive column only for whole builds.

| build | simple | medium | complex | adaptive |
| --- | --- | --- | --- | --- |
| `claude-opus-5.5-max` | LIS insertion, four variants, shortest kept: 470.6 / 4311.6 | √n buckets, insertion with a beam over orders, three layouts kept shortest: 488.2 / 3394.4 | four-end 3-way quicksort with DP splits, distance tables (≤ 4) and beam leaves (≤ 32): 419.6 / 3110.8 | 435.6 / 3236.2 |
| `claude-opus-5.5-high` | LIS-anchored insertion: 547.6 / 5096.6 | Bucket Insertion (⌊4√n⌋ buckets, one-way sweep, sink, bucket-restricted cheapest insertion): 576.0 / 4120.8 | Four Corners (four-end 3-way quicksort, pivots by leaf count, BFS leaves ≤ 5, peephole): 528.0 / 3824.2 | 529.8 / 3948.0 |
| `gemini-flash-3.8` | Min Extract: 1474.4 / 32372.4 | Butterfly, w = 15 / 30: 575.0 / 5046.2 | Turk: 547.2 / 5113.6 | 545.8 / 5020.2 |
| `fuka(gemini-flash-3.8)` | Min Extract: 1474.0 / 32372.0 | Butterfly, w = 15 / 32, Second-Max, online peephole: 537.2 / 4610.4 | Turk, `sb` Seed, online peephole: 546.4 / 5112.8 | 535.6 / 4859.4 |
| `gpt-6-sol-high` | Min Extract: 1474.4 / 32372.4 | chunks of width ⌊1.5·⌈√n⌉⌋, `ra`-only sweeps, no sink: 745.2 / 7263.0 | LSD Radix: 1084.0 / 6784.0 | 1014.0 / 6930.4 |
| `gpt-6-astra-low` | min extraction of all n: 1479.8 / 32378.4 | ⌈√n⌉ chunks, one revolution each, sink: 831.6 / 7841.8 | LSD Radix: 1084.0 / 6784.0 | 1034.8 / 7189.8 |

`fuka(deepseek-flash)` reproduces `gpt-6-sol-high` exactly. The study notes that the class
proofs in the two `claude-opus` READMEs have **not been independently checked**.

## Peer write-ups

- [Push Swap — A journey to find most efficient sorting algorithm (Medium)](https://medium.com/p/c1f5d2d41e97):
  the post usually credited with the "Turk" (Mechanical Turk) method, by a 42 Heilbronn
  student. Other repos credit A. Yigit Ogun; the byline is not confirmed here.
- [How to Over-optimize an Algorithm: Push_Swap (Medium)](https://medium.com/@kilfenbaridon/how-to-over-optimize-an-algorithm-push-swap-42-school-project-d01a50e5fd78)
- [Push_swap: an easy and efficient algorithm (Medium, julien-ctx)](https://medium.com/@julien-ctx/push-swap-an-easy-and-efficient-algorithm-to-sort-numbers-4b7049c2639a)
- [Turk algorithm docs (ibon-ira)](https://www.mintlify.com/ibon-ira/Push_swap-42-turk-algorithm-/algorithm/turkish-algorithm)
- [Dan Sylvain: my implementation of push_swap](https://dansylvain.com/blog/algorithm/my-implementation-of-the-42-push-swap-project)
- [push_swap: surviving 4 algorithms (TabNews, 42SP)](https://www.tabnews.com.br/ciproterona/push-swap-sobrevivendo-a-4-algoritmos-e-1-mes-de-big-o-na-42sp): chunk sort tuned by a parameter sweep, ~570 at n=100 and ~5035 at n=500; radix 6784
- [jiricodes/push_swap](https://github.com/jiricodes/push_swap): quicksort + insertion hybrid
- [jgrigorjeva/push_swap wiki](https://github-wiki-see.page/m/jgrigorjeva/push_swap/wiki/Algorithm-overview)
- [marcioflavio.com: the algorithmic challenge of sorting](https://www.marcioflavio.com/push_swap-the-algorithmic-challenge-of-sorting/)

Peers report Turk at ~540–570 at n=100 and ~5100–6500 at n=500, and radix as "not enough for
100 %". Both agree with the sim. Their tuned chunk results (~4900–5035 at n=500) beat the
sim's Chunks with tuning alone (5858), so those builds must use retrieval tricks the card's
defaults lack. Tuning K together with a One-Way Sweep and Second-Max brings it to 5247
(sim).

## Background

- D. Knuth, *The Art of Computer Programming, Vol. 3*: polyphase merge and external sorting
  (Tape Merge).
- Patience sorting and the LIS (Aldous & Diaconis, 1999). The expected LIS approaches 2√n, but
  at finite n it is about 2√n − 1.77 n^(1/6) (Baik, Deift & Johansson, 1999): 16.2 at n=100 and
  39.7 at n=500, against 16.7 and 40.1 measured in the sim.
- Inversions of a uniform random permutation have mean n(n−1)/4 and variance
  n(n−1)(2n+5)/72 (Kendall's tau under independence). That is why uniform input has disorder
  0.500 ± 0.034 at n=100 and ± 0.015 at n=500.
- An information-theoretic floor, from the study README: with 11 ops there are at most about
  11^k streams of length k, and every input needs its own stream, so k ≥ log₁₁(n!). That is
  about 152 ops at n=100 and 1090 at n=500, far below anything measured.
- The push_swap subject (`en.subject.pdf`): grading thresholds, complexity classes,
  `--adaptive` regimes and `--bench`.

## Card lore

Checked against these on 2026-10-09:

- Bubble sort's name and Knuth's verdict: [Wikipedia](https://en.wikipedia.org/wiki/Bubble_sort), [Astrachan, "Bubble Sort: An Archaeological Algorithmic Analysis"](https://users.cs.duke.edu/~ola/papers/bubble.pdf)
- Quicksort's origin: [Computer History Museum](https://computerhistory.org/profile/sir-antony-hoare/), [Britannica](https://www.britannica.com/biography/Tony-Hoare), [Oxford: Algorithm 64](https://www.cs.ox.ac.uk/publications/publication8194-abstract.html)
- Patience sorting and the 2√n result: [Aldous & Diaconis](https://www.stat.berkeley.edu/~aldous/Research/OP/patience.pdf), [Wikipedia](https://en.wikipedia.org/wiki/Patience_sorting), [Plancherel measure](https://en.wikipedia.org/wiki/Plancherel_measure)
- Radix sort on card sorters: [Knuth's history of sorting (OCR)](https://ed-thelen.org/comp-hist/Knuth-Sort.html), [ibm-1401.info](https://ibm-1401.info/KensSorter/Kens.html), [Harold H. Seward](https://en.wikipedia.org/wiki/Harold_H._Seward)
- Von Neumann's merge routine: [Priestley, *Routines of Substitution*](https://link.springer.com/10.1007/978-3-319-91671-2); polyphase merge: [Gilstad 1963 and Manker, CACM](https://cacm.acm.org/research/multiphase-sorting)
- Dutch national flag and dual-pivot quicksort: [Wikipedia](https://en.wikipedia.org/wiki/Dutch_national_flag_problem), [Wild & Nebel](https://arxiv.org/abs/1310.7409)
- Heapsort and Shell sort: [Heapsort](https://en.wikipedia.org/wiki/Heapsort), [Donald Shell](https://en.wikipedia.org/wiki/Donald_Shell)
- Pancake sorting: [Wikipedia](https://en.wikipedia.org/wiki/Pancake_sorting)
- BFS, IDA*, beam search, pattern databases: [Beam search](https://en.wikipedia.org/wiki/Beam_search), [Culberson & Schaeffer](https://linux.ime.usp.br/~henrick/pattern.pdf), [Maze structure (Moore)](https://nap.nationalacademies.org/read/10866/chapter/85)
- Shannon 1950, simulated annealing 1983: [Shannon](https://fermatslibrary.com/s/programming-a-computer-for-playing-chess), [Kirkpatrick](https://en.wikipedia.org/wiki/Scott_Kirkpatrick)
- Algorithm portfolios and the Mechanical Turk: [Kotthoff survey](https://arxiv.org/pdf/1210.7959), [Mechanical Turk](https://en.wikipedia.org/wiki/Mechanical_Turk)
