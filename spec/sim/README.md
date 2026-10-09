# Reference simulator

Every "sim" number in the spec comes from here. It is a quick reference implementation, not a
tuned one, and it is not the explorer: it exists so the spec's claims can be checked and
re-run.

```sh
node spec/sim/report.mjs > spec/sim/results.md        # everything, about 10 minutes
node spec/sim/report.mjs cards,decks                   # some sections only
```

Sections: `cards decks insertion buckets post builds builds2 growth inputs small speed
techniques newcards disorder worst`.

## Files

| file | what it is |
| --- | --- |
| [../measure-sim.js](../measure-sim.js) | the original throwaway simulator: Bubble Wheel, Min Extract, Insert-into-B, LSD Radix, Chunks, Butterfly, Turk, Quick 2-Way, LIS Insertion. Run on its own, it prints quick unseeded means. |
| [lib.mjs](lib.mjs) | loads `measure-sim.js` without its runner, logs every op, and adds a seeded RNG, an independent replay checker, the peephole passes and statistics |
| [cards.mjs](cards.mjs) | the variants the cards describe: the Insertion bench (anchor, pick, cost and bands as options), Twin Extract, Ternary Radix, Chunks sweeps and Second-Max, Butterfly with a √n window, and the Adaptive Selector |
| [engines.mjs](engines.mjs) | fast Insertion and Turk engines with every technique as an option: anchors, cost cards, `sb` Seed, Double-Op Sharing on or off, Lookahead-k, and Beam over Orders. With default options they reproduce `ins()` and the sim's Turk op for op. |
| [divide.mjs](divide.mjs) | Quick 2-Way with Restore Skip as a switch, and a four-ends quicksort with switchable ends, split, pivot and Finisher: Four Ends, Thirds Split, Pivot by Leaf Count, BFS Leaf with walls, and a simplified DP Splits |
| [buckets.mjs](buckets.mjs) | Chunks with explicit boundaries, Middle-Out Push, Cheapest Return, the Bucket Insertion card, and Annealed Plan over chunk boundaries |
| [more.mjs](more.mjs) | Natural Merge, the exact-disorder and nearly-sorted generators, and the worst-case search |
| [report.mjs](report.mjs) | runs every section and prints Markdown |
| [results.md](results.md) | the output the spec cites |

## Method

- **Inputs** are uniform random permutations of ranks 0..n−1 from a seeded generator
  (mulberry32). The same (n, count, seed) always gives the same inputs: 1000 at n=100, 300 at
  n=200 and 200 at n=500 unless a table says otherwise.
- **Pairing.** Every technique effect and interaction compares the same inputs with and
  without the card, so the noise of the inputs cancels out. "± x" is one standard error of the
  paired difference.
- **Validation.** Every stream must pass both `measure-sim.js`'s own check and an independent
  replay that shares no code with it (A ascending, B empty). Rewritten streams from the post
  passes are replayed too.
- **The Oracle** is a full BFS from the sorted state over all (n+1)·n! states, up to n=8. Every
  card is run on every input up to n=7 and must never beat it.
- **New engines are checked against the old ones** before they measure anything: where they
  overlap, they must reproduce the original op streams exactly (they do, on 300–1300 inputs
  each), and every new variant must sort every input up to n=7.

## Known limits

- One implementation per card, written for clarity. A different implementation of the same
  card can measure differently, which is why the spec tags these numbers "sim". Where a
  reference build implements the same hand, the two agree: Four Corners measures 533 / 3825
  here and 528 / 3824 in the reference build; Bucket Insertion is about 4 % worse here.
- The worst-case search is hill-climbing, so its results are lower bounds on the true worst
  case, not the worst case itself.
- Not built: Beam Leaf (≤ 32), Restore Skip's second case, Tape Merge, Beam Sorter as a
  whole-problem search, and the Annealer card on hosts other than Chunks.
- DP Splits is simplified: it ignores `rr` merges and free reads, and building its table takes
  about 10 s.
- The CPU times in the `speed` section depend on the machine and the Node version.
- `measure-sim.js` had two small-n bugs, fixed on 2026-10-09: LSD Radix looped forever at n=0,
  and Min Extract left `[1 0]` unsorted.
