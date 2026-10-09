# Algoritro: spec index

Status: built, 2026-10-09. Milestones 1–7 are implemented in the repository root (see
[11-milestones.md](11-milestones.md)); milestone 8, publishing, waits for a decision. Changes are
listed in
[CHANGELOG.md](CHANGELOG.md).

Algoritro (a push_swap card table) is a card-game-themed tool for **exploring push_swap algorithms and
techniques before you build one**. You play a main **Algorithm card**. The game shows which
**Technique cards** fit it. You add techniques and the result plays out on the same page.
A **Meta** page ranks the combinations.

It is meant for 42 peers. It shows what is possible, what each idea costs to understand and
to build, and how many operations it actually saves, so that new ideas can come from the
gaps.

## Reading order

| # | file | what it covers |
| --- | --- | --- |
| 1 | [01-vision.md](01-vision.md) | goal, audience, questions it answers, non-goals, principles |
| 2 | [02-game-design.md](02-game-design.md) | the card game: card types, the play loop, slots, interactions, grades, modes |
| 3 | [03-stats.md](03-stats.md) | what each card stat means and how it is measured or scored |
| 4 | [cards/README.md](cards/README.md) | **Algorithm cards**: the full roster with summary stats |
| 5 | [techniques/README.md](techniques/README.md) | **Technique cards**: the full roster with effects |
| 6 | [04-compatibility.md](04-compatibility.md) | roles, slots, natives and defaults: which techniques fit which algorithm |
| 7 | [05-meta.md](05-meta.md) | the Meta page: tiers, builds, named decks, interactions, traps |
| 8 | [06-architecture.md](06-architecture.md) | files, modules, the algorithm/technique plugin contract, card data |
| 9 | [07-inputs.md](07-inputs.md) | input generators and seeds |
| 10 | [08-views.md](08-views.md) | pages and screens: Table, Codex, Meta, Lab, and Paths on the Table |
| 11 | [09-metrics.md](09-metrics.md) | counts, grades, pass rates, the growth check |
| 12 | [10-tests.md](10-tests.md) | validation and the test suite |
| 13 | [11-milestones.md](11-milestones.md) | build order |
| 14 | [12-open-questions.md](12-open-questions.md) | undecided items |
| — | [sources.md](sources.md) | where the numbers and ideas come from |
| — | [sim/README.md](sim/README.md) | the reference simulator behind the "sim" numbers, and its [results](sim/results.md) |
| — | [CHANGELOG.md](CHANGELOG.md) | what changed in the spec, and why |

## Where the numbers come from

The specs tag every operation count with its origin:

- **sim:** measured by the reference simulator in [sim/](sim/README.md). It runs
  `measure-sim.js` plus the card variants the spec describes, on seeded uniform random
  permutations: 1000 at n=100, 300 at n=200 and 200 at n=500 unless stated. Technique effects
  are paired (the same inputs with and without the card). Every number is in
  [sim/results.md](sim/results.md), and `node spec/sim/report.mjs` reproduces it exactly. This
  is a quick reference implementation, not a tuned one.
- **ref:** taken from the reference C builds studied in `push_swap/study/`, over 5 seeds
  (1000–1004). A single method is quoted from its own column of the study's per-selector table.
  The study's headline numbers are `--adaptive` means that mix two methods, and they are only
  quoted for whole builds. Tape Merge, the Annealer and Beam Sorter, which the sim never built,
  have reference builds of their own (`study/explorer-refs/`: C in the Norm's style, one card per
  binary, measured on the study's inputs with its replayer). They were ported from the explorer,
  so their counts equal the explorer's on each of the five seeds.
- **web:** reported by other 42 students; see [sources.md](sources.md).
- **exp:** measured by the explorer itself (`node tools/meta.mjs`, 50 seeds at n=100 and 20 at
  n=500 from seed 1000, stored in `data/meta.json`). No card rests on it alone any more. The
  explorer re-measures every sim number too, and `tests/reference.test.mjs` keeps them within
  ±5 %, and the reference builds' counts exactly.
- **est.:** an estimate that has not been measured yet. None are left in the card rosters.
