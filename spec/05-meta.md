# 5. Meta page

The Meta page answers **"which combinations are actually good?"** It is computed from runs,
not written by hand. The tables below are the **seed content**: what is known today, to be
replaced by explorer measurements as cards are implemented. "sim" numbers come from
[sim/results.md](sim/results.md) and "ref" numbers from [sources.md](sources.md).

## 5.1 What the page shows

1. **Tier list** of complete hands at n=100 and at n=500, ranked by mean ops. Each tier also
   shows the share of runs under its bar, because the evaluation grades every run.

   | tier | n=100 | n=500 |
   | --- | --- | --- |
   | S | < 500 | < 4000 |
   | A | < 700 (EXCELLENT) | < 5500 (EXCELLENT) |
   | B | < 1500 (GOOD) | < 8000 (GOOD) |
   | C | < 2000 (PASS) | < 12000 (PASS) |
   | D | FAIL | FAIL |

   Each hand shows its Hand Grasp and Hand Craft next to its tier.
2. **Builds:** an Adaptive Selector wrapped around a simple, a medium and a complex hand is
   what the evaluation runs (§5.4). Builds are ranked like hands, with a class check per
   regime.
3. **Pareto front:** ops (y) against Hand Craft (x). The front shows the best result for each
   level of effort. It is the most useful chart for peers deciding what to build.
4. **Technique value table:** for every technique, the measured Δops on each host and
   Value = Δops ÷ max(1, added Craft). This answers "what should I add next?"
5. **Interaction matrix:** technique × technique on a chosen host. Each cell is the measured
   interaction I = Δ(both) − Δ(first alone) − Δ(second alone), on the same seeds for all four
   runs, with its standard error. ✦ marks a synergy (I below 0 by more than two standard
   errors: the pair saves more than the sum). ✕ marks an overlap (I above 0 by more than two
   standard errors: it saves less). A pair that does worse than its better card alone is
   flagged as a clash. Anything else is additive and gets no badge.
6. **Class check:** for each hand, the claimed class, the proof mark, and the growth check from
   [09-metrics.md](09-metrics.md#growth). Hands whose claim fails are flagged. In the sim, the
   check flags Butterfly and Chunks with constant params and Turk labelled n log n, and passes
   Quick 2-Way, LSD Radix and √n-scaled params.
7. **Disorder winners:** at n=100, which hand wins at each disorder level. Feeds the Adaptive
   Selector.

Meta data is generated offline with `node tools/meta.mjs` and shipped as `data/meta.json`. The
page can also recompute it in a Web Worker for the user's own choices.

## 5.2 Named decks (seed)

Named decks give peers a shared vocabulary. Each deck has a page with its full hand, its
stats, and a "play it" button. Natives and defaults are listed for clarity but cost nothing
in the Hand totals ([03-stats.md §3.4](03-stats.md#34-hand-totals)).

| deck | hand | @100 | @500 | Hand Grasp/Craft | tier @500 | note |
| --- | --- | --- | --- | --- | --- | --- |
| **The First Step** | Min Extract + Three | 1454 sim | 32298 sim | 2 / 4 | D | the honest baseline |
| **Bit Grinder** | LSD Radix | 1084 sim | 6784 sim | 3 / 2 | B | the most common first "fast" deck; 6784 is also the subject's own example count |
| **Crate Runner** | Chunks (K = round(0.4√n)) + One-Way Sweep + Second-Max | 606 sim | 5247 sim | 4 / 7 | A | a provable n√n deck, EXCELLENT on every sim run |
| **Butterfly Net** | Butterfly (w = 15 / 30) | 577 sim | 5080 sim | 3 / 5 | A | short code, but a constant w breaks its class claim; w = round(1.4√n) fixes it at the same cost |
| **Careful Crates** | Bucket Insertion | 606 sim (576 ref) | 4291 sim (4121 ref) | 8 / 12 | A | the provable n√n champion: beats Turk at n=500 |
| **The Turk** | Turk + Keep Three + Four-Way Cost | 557 sim | 5088 sim | 7 / 11 | A | the 42 classic; its class is O(n²), so it cannot be the n log n method |
| **Split Second** | Quick 2-Way + Median Pivot | 718 sim | 5235 sim | 5 / 6 | A | provable n log n that sees existing order, but only GOOD at n=100 |
| **Long Line** | LIS Insertion + Four-Way Cost + `rb` Sink | 530 sim | 4425 sim | 11 / 14 | A | best O(n²) seed deck; running a second hand and keeping the shorter (a portfolio, no longer a card) adds −8 at n=100 and nothing at n=500 |
| **Four Corners** | Four-End Quicksort + Thirds + Pivot by Leaf + BFS Leaf + Peephole | 533 sim (528 ref) | 3825 sim (3824 ref) | 11 / 29 | S | the provable n log n champion; the sim reproduces the reference build |
| **Oracle's Plan** | Four-End Quicksort + DP Splits + Beam Leaf + Peephole | 420 ref | 3111 ref | 14 / 51 | S | the Legendary deck (the study's build also runs a portfolio, which is not a card); the sim's version without Beam Leaf measures 523 / 3667 |

The "ref" numbers are each reference method's own mean over 5 seeds, not its build's
`--adaptive` mean. Where the sim also builds the deck, both are shown.

## 5.3 Interactions (seed)

- **Cheapest Pick + LIS Anchor** (on Simple Insertion): ✕ overlap, +24 ± 2 at n=100, +86 ± 10
  at n=200 and +220 ± 37 at n=500 (sim). Cheapest Pick alone takes Simple Insertion from 1462
  to 588, so the anchor adds only −41 on top of it, against −65 on its own.
- **`rb` Sink + Four-Way Cost** (on LIS Insertion): additive, +0.9 ± 0.5 at n=100, +0.5 ± 2.1
  at n=200 and −4 ± 7 at n=500 (sim). No badge.
- **Peephole on hosts that already share rotations:** ✕ overlap by design. Under one op is
  left to cancel or fuse on Turk and LIS hosts (sim).
- **Pivot by Leaf Count + BFS Leaf** (on Four-End Quicksort): ✦ **synergy**, −39 ± 0.3 at n=100
  and −245 ± 1.2 at n=500 (sim). Alone, Pivot by Leaf Count barely helps (+12 / −89); with BFS
  leaves it saves 27 / 334, because full leaves are exactly what the optimal solver needs.
  This is the first measured synergy.
- **Four Ends + Thirds Split:** they cannot be separated, since Thirds Split needs a third
  destination. Given Four Ends, Thirds saves 86 / 330. Four Ends alone, against Quick 2-Way
  with the same 2-value leaves, costs 6 more at n=100 and saves 355 at n=500 (sim).

## 5.4 Builds (seed)

The evaluation runs the default `--adaptive`, and the disorder of uniform random input is
0.500 ± 0.034 at n=100 and ± 0.015 at n=500. About half the graded runs therefore go to the
medium hand and half to the complex one, and a build's worst runs come from the weaker hand.

| build (simple / medium / complex) | classes hold | @100 mean | @100 runs EXCELLENT | @500 mean | @500 runs EXCELLENT |
| --- | --- | --- | --- | --- | --- |
| **Radix build:** Min Extract / Chunks / LSD Radix | yes, with K ∝ √n | 884 sim | 45 % | 6380 sim | 0 % |
| **Turk build:** Min Extract / Butterfly (w = 15 / 30) / Turk | no: constant w, and Turk is O(n²) | 564 sim | 100 % | 5077 sim | 100 % |
| **Provable build:** Long Line / Butterfly (w = round(1.4√n)) / Quick 2-Way | yes | 651 sim | 52 % | 5155 sim | 100 % |
| `claude-opus-5.5-high`: LIS insertion / Bucket Insertion / Four Corners | yes, claimed | 529.8 ref | — | 3948.0 ref | — |
| `claude-opus-5.5-max`: LIS insertion / buckets with beam-ordered insertion / Oracle's Plan | claimed; two regimes keep the shortest of several streams | 435.6 ref | — | 3236.2 ref | — |
| `gemini-flash-3.8`: Min Extract / Butterfly (w = 15 / 30) / Turk | no | 545.8 ref | — | 5020.2 ref | — |

The lesson in this table: the provable sim build is EXCELLENT on every n=500 run but on only
half of the n=100 runs, because its complex method, Quick 2-Way, averages 718 at n=100. To be
EXCELLENT on every run with classes that hold, the complex method must also beat 700 at
n=100, as Four Corners does. Built that way, every sim run is EXCELLENT:

| strong build (simple / medium / complex) | classes hold | @100 mean (worst run) | @500 mean (worst run) | runs EXCELLENT |
| --- | --- | --- | --- | --- |
| Long Line / Careful Crates / Four Corners | yes | 566 (662) | 4038 (4508) | 100 % at both sizes |
| Long Line / Crate Runner / Four Corners | yes | 566 (650) | 4485 (5385) | 100 % at both sizes |

## 5.5 Disorder winners and worst cases (seed)

From the disorder sweep and the worst-case search in [sim/results.md](sim/results.md). Hands
are tried at exact disorder levels, and on sorted input with a few random swaps.

| regime | class target | cheapest hand that meets it (sim) |
| --- | --- | --- |
| below 0.2 | O(n²) or better | **Long Line** at almost every level: 0 on sorted input, 106 at n=100 and 612 at n=500 with one random swap |
| 0.2 to 0.5 | O(n√n) or better | at n=100, Butterfly √n up to 0.3, then Four Corners; at n=500, Four Corners |
| 0.5 and above | O(n log n) | **Four Corners** |

- **Explorer re-run (exp, 10 seeds per level, with Oracle's Plan in the field):** the compliant
  winners agree: Long Line below 0.2, Butterfly √n at 0.2–0.25 at n=100, then the Four-End decks
  (Oracle's Plan, Four Corners), and Careful Crates once at n=500. Among all hands, ignoring
  class targets, Turk is the cheapest at most levels from 0.2 up, and Min Extract wins on fully
  reversed input (about 3n ops). Lab › Disorder map draws it for any three hands.
- An O(n log n) method meets the O(n√n) target, so Four Corners may run the medium regime too,
  and it beats every n√n card there at n=500. But the subject also asks for a separate
  O(n√n) method behind `--medium`; routing the medium regime to the complex method is a call
  an evaluator may question.
- Exact-disorder inputs are easier than uniform input at the same disorder: at 0.5, Turk costs
  about 3050 on them and 5088 on uniform input. The sweep ranks hands; it does not predict
  grades.
- **Worst cases found by search** (hill-climbing; the true worst is at least this bad): Long
  Line (640 / 4830), Careful Crates (695 / 4719) and Four Corners (595 / 3919) stay EXCELLENT
  at both sizes. Turk drops to GOOD at n=500 (5644). Crate Runner (714 / 5513) and Butterfly √n
  (706 at n=100) drop to GOOD. Min Extract reaches 2135 at n=100: FAIL.

## 5.6 Known traps (seed)

- **Peephole on top of native cost planning:** ~0 gain. The planner already merged the
  rotations.
- **Nearest-Member Sweep:** it looks smarter than a plain `ra` sweep, but on Chunks it costs
  more ops (+16 at n=100, +140 at n=500, sim) and weakens the O(n√n) proof. An `ra` sweep
  gets each member for free, because each `pb` moves it forward.
- **Constant params as the O(n√n) method:** Butterfly with w = 15 / 30, or Chunks with a fixed
  chunk count. Growth up to n=1000 hides it, and only the offline sizes show it: ops ÷ n√n
  turns up from 0.45 at n=1000 to 0.61 at n=4096 (sim).
- **Turk labelled O(n log n):** the only proven bound is O(n²), and ops ÷ n log₂ n keeps
  rising: 0.87 at n=128, 1.69 at n=2048 (sim).
- **Grading on the mean:** Chunks averages 662 at n=100, yet 5 % of its runs reach 700 or
  more (sim). A complex method that averages 718 costs a build EXCELLENT on about half its
  n=100 runs.
- **Stacking techniques that overlap:** LIS Anchor saves −65 alone but −41 once Cheapest Pick
  is in (sim).
- **Lookahead on a greedy:** two-step lookahead re-plans after every move and ends up worse:
  +175 on Turk and +297 on Long Line at n=500 (sim). Beam over Orders, which compares whole
  partial plans, is the search that gains.
- **Keeping the LIS in Turk:** a common idea, but at n=500 it costs +49 instead of Keep Three
  (sim). Turk's cheapest pick already does the anchor's job.
- **Middle-Out Push:** it makes B look tidier, but it costs +1794 on Chunks at n=500 (sim),
  because retrieval must search whole chunks instead of half chunks.
- **`sb` Seed:** it costs more than it saves (+0.3 on Turk, sim).
- **Portfolio as "one method":** an evaluator may challenge it, so it is no longer a card
  (2026-10-10). The Table's build routes each stack to one seat instead.
- **Min Extract as the simple method:** fine on average (1454), but a bad input reaches 2135 at
  n=100, which FAILs (sim). Long Line never left EXCELLENT under the same search.
- **Natural Merge on nearly sorted input:** every merge pass rotates all of A, so even one
  swap costs 454 at n=100 (sim). Runs only help when you can reach them without rotating.

## 5.7 Open spaces (where new ideas could come from)

The Meta page highlights cells with **no measured hand yet**. These are invitations to
explore:

- **Ternary Radix:** as described it loses to binary radix (1333 / 7362 against
  1084 / 6784, sim). Can a gather that avoids the `rrb` return trip make base 3 pay?
- **LSD radix without the return trip:** alternate the pass direction so the minority bucket
  never comes back. It needs a stability argument.
- **Tape Merge:** how close can merging get to Four-End Quicksort?
- **LIS Anchor + Four-End Quicksort:** keep an increasing run in place while partitioning the
  rest?
- **The full DP Splits:** the simplified DP in the sim saves 214 at n=500 over Pivot by Leaf
  Count. The reference DP adds `rr` merges and free reads; how much do they add alone?
- **Beam Leaf in the sim:** the reference build's leaves of up to 32 values are the main
  difference left between Four Corners (3825) and Oracle's Plan (3111).
- **A greedy with a proven bound:** a cheapest pick restricted to a bounded window keeps a
  provable class (Bucket Insertion does it per bucket). How small can the window get?
- **The Elegant quadrant:** no bare card is hard to see but short to write.
- **The gap to optimal at n=100:** the best known count is 420 (ref), and the
  information-theoretic floor is about 152 (log₁₁ n!). Nobody knows where the optimum lies.
- **A better disorder metric for Adaptive:** which metric best predicts which deck wins?
