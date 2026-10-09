# push_swap explorer

A static, dependency-free tool for 42 peers to explore push_swap algorithms as a card game. Play
an Algorithm card, fill its slots with Technique cards, and watch the result on the same page.
Every number in it is measured. The design is in [spec/](spec/README.md).

## Run

```sh
npm run dev        # or: pnpm dev · bun run dev · node tools/serve.mjs [port]
# open http://127.0.0.1:8765/
```

Node ≥ 18 is the only requirement; there is nothing to install. ES modules need a server, so
opening `index.html` from disk will not work.

| page | what it is for |
| --- | --- |
| **Table** (`index.html`) | a card table: pick a blind, play an algorithm card from the deck, play techniques from your hand, step through the result, compare hands, run Paths and Challenges |
| **Codex** (`codex.html`) | every card, its text, measured stats and the Grasp × Craft grid; Cursed cards |
| **Meta** (`meta.html`) | tiers, builds, Pareto front, technique value, interactions, class check |
| **Lab** (`lab.html`) | scaling, disorder map, param sweep, optimality gap (in a Web Worker) |

The URL keeps the hand and the input, for example
`index.html#deck=four-end-quicksort+pivot-by-leaf-count+bfs-leaf+peephole-cancel+peephole-fuse&n=500&gen=uniform&seed=42`.

## Test and regenerate

```sh
npm test                      # unit, reference (±5 % of the sim), growth and data suites
npm run test:ui               # the four pages in headless Chromium (needs npm run dev and chromium)
node tools/build-data.mjs     # data/cards.json, compat.json, seeds.json, dp-plans.json (≈1 min)
node tools/meta.mjs           # data/meta.json: measures everything (≈3 min on many cores)
npm run sim                   # the reference simulator behind the spec's "sim" numbers
```

After changing a card's module or its text in `spec/`, run `build-data`; after changing what a
card does, run `meta` too.

## Layout

- `js/core/`: rng, input, machine, independent replay, metrics, hand resolution, Meta runners
- `js/cards/`: Algorithm cards (`algos/`), Technique cards (`techniques/`), shared engines, Cursed and Meta cards, named decks
- `js/ui/`: the four pages and their components; `js/workers/`: measurement jobs
- `tools/`: dev server, data and Meta generators, browser smoke test; `tests/`: the suites
