# Changelog

## 2026-10-10, the Table plays a push_swap build (objective.md)

- **Step 1, layout.** The right column is gone: the two decks sit to the right of the hand, with
  no Browse or Draw buttons (click a deck to spread it), and the Book of Codex left the Table
  (Codex is in the top bar). The left panel is wider. Lesson and research cards wear a book or
  a flask icon in the type line instead of a ribbon.
- **Step 2, routes.** Every stack row shows its route: the disorder, the flag it goes to
  (`--simple`, `--medium`, `--complex`, or `tiny` for 5 numbers or fewer) and the icon of the card
  that sorted it. With the Adaptive Selector in play, that is the card it actually chose.
- **Step 3, the build.** The Table plays a push_swap build: three seats, one hand per flag,
  plus the built-in tiny seat (Hardcoded Three for 3 numbers or fewer, the Oracle's search for 4
  or 5). Every stack goes to the seat its size and disorder pick; picking a stack puts its seat on
  the mat, and picking a seat moves the board to one of its stacks. Seats show their class
  target, a tally of their stacks and "sorting: …"; a route banner sits above the board. Stamps
  are kept per hand, so a change re-measures only its own seat's stacks, and they equal
  `--adaptive` run outside the page (a UI check). The algorithm deck gains the named builds;
  share links carry all three hands, and old `#deck=` links fill every seat. The Meta slot,
  Portfolio and the Adaptive Selector's setup are gone: the seats replace them.
- **Step 4, Browse.** The decks are a mini Codex that places cards. Clicking a card shows it in a
  pane: its idea, its fit for each flag's class target, and its stamps on the seat's stacks
  against the card there now (live, or from the kept results). **Put in `--seat`**, **Play on
  `--seat`** and **Take it back** place it; each seat has a button that opens the deck choosing
  for it, and a double-click places a card at once. Stamps and previews share one measure, so
  nothing is measured twice.
- **Playback lays out only the board.** Every move was laying out the whole page, stack list and
  hand included: containment on the board plate did nothing, because Chrome never lets a grid
  item be a layout boundary. The board now sits in a plain block. Layout during playback went
  from 780 to 173 ms per 2 s (headless, no GPU).

## 2026-10-09, fewer buttons

- **Adaptive Selector handles tiny stacks first:** 3 or fewer numbers by Hardcoded Three, 5 or
  fewer by the Oracle's search. It failed the new every-order stacks (9 and 18 moves); now 2
  and 8, the best possible.
- **Tiny stacks are graded against their optimum** (Oracle's worst order: 1, 2 and 8 moves):
  ★ at the optimum, blue ✓ halfway there, orange ✓ just within the subject's limit.
- **13 more stacks** (26 in all): 1 number, 2 in order, 2 swapped, every order of 3 and of 5
  (stamped by the worst, which picking the stack plays), Smallest at the bottom, Down then up,
  Interleaved halves, Nearly reversed, Twenty runs, exact disorder at 25/50/75 %, and Nearly
  sorted and Rotated at 500. They already split cards apart: Turk spends 197 moves where one
  `rra` would do, and LSD Radix fails both 2-number stacks.
- **The class badge** takes the tier colours too.
- **New tier colours:** S fancy gold with a light sweep and a twinkle, A vibrant purple with a
  light sweep, B pale blue, C pale green, D grey, on the cards, in Inspect and on the Meta page.
- **Learn, Stats, Compare and Share are gone** from the Table's left panel, with what only
  they reached: the Challenges, the op-count and many-inputs Stats overlay, side-by-side
  Compare and the copy-link button. The URL still shares the hand, and Paths open from Codex
  links. The hand is also dealt once on load, and a dealt card no longer shows before its
  flight lands.

## 2026-10-09, built-in cards, and a lighter table

- **Built-in cards say so** ([08-views.md §8.1](08-views.md#81-table-indexhtml-the-play-page)):
  a gold slot tab with a lock, a lock seal and a "built in" ribbon. Clicking one shakes it and
  says why it stays; clicking a default points at the cards that can replace it.
- **Faster table** ([06-architecture.md §6.1](06-architecture.md#61-ground-rules)). Measured in
  headless Chromium without a GPU at 1920 × 1080: idle 28 → 60 fps, Inspect open 11 → 60, a
  legendary card on the mat 12 → 60, playback 25 → 44, with layout during playback down from
  1.2 s to 0.24 s per 2 s. The causes were a 70 px blur on a turning background, a legendary rim
  animated through an inherited property (it restyled the whole card every frame), holo and
  shine animated by repainting, frosted-glass blurs over moving content, a canvas font change
  that forced a page layout several times a frame, and the played card sized in container
  units. The felt is now still; card effects play only on the card in focus.

## 2026-10-09, cards told top-down, and Inspect on the felt

- **The project is called Algoritro**, "a push_swap card table", and lives in git.
- **No more card backs.** The flip button is gone from the Table and the Codex: clicking a
  card opens it in Inspect, which says more than a back could.
- **Inspect was redesigned** to sit on the table's felt as cream panels in reading order
  ([08-views.md §8.1](08-views.md#81-table-indexhtml-the-play-page)): The idea, Step by step
  beside a replay, the Scorecard (the three badges in plain words), Good at and Watch out,
  then Under the hood. A technique shows its change on the played card, says when the card
  has it built in or comes with it, and lists its change on every card it fits.
- **Card text is told top-down** ([cards/README.md](cards/README.md#how-a-cards-text-reads)):
  "How it plays" became **The idea** in plain words and **Step by step** as a numbered list,
  followed by **Under the hood** with the exact rules. Every technique and Finisher has an
  idea line too.
- **Fixes:** a bold phrase opening a sentence no longer starts a new section of a card's text;
  numbered lists render as lists; the Finisher table's Grasp and Craft are on the 0–10 scale
  like the rest; the Codex's Grasp × Craft note uses the 0–10 bands.

## 2026-10-09, cards you can read, covers with ideas, and a show while it plays

- **Algorithm cards were remade** ([02-game-design.md §2.3](02-game-design.md#23-the-card-face)):
  the quote, then three badges, its complexity class, its slot tier and its push_swap tier
  ([03-stats.md §3.5](03-stats.md#35-card-tiers)). The numbers at 100 and 500 moved into the
  badge's tooltip, so they are no longer said twice.
- **Every Algorithm card has its own cover** that draws its idea, instead of the same replay
  on every card. The replay moved to Inspect.
- **Grasp is a bulb and Craft a hammer**, on the cards and in the hand totals; a hand past 10
  catches fire.
- **Bigger type** on every card, so names and quotes read in the hand and in the slots; a
  hovered hand card enlarges to 1.45×.
- **Rarity shows more**: shine, holo with sparkles, and a turning prismatic rim.
- **Playback has effects** (phase banners, combos, sparks, milestones, a finale with confetti)
  and a **move log**; both can be switched off.
- **Themed tooltips** above the pointer.
- **Fixes:** a dealt or returned card no longer flies to the left end of the hand (a new card's
  first place was measured mid-slide), and setting custom CSS properties from the page code now
  works (it silently did nothing, so fanned layers and the extras stack never spread).

## 2026-10-09, stacks, pros and cons, and a 0–10 scale

- **Blinds are now stacks** in three levels, Easy, Medium and Hard, with plain names such as
  Random 100 and Reversed 500 ([08-views.md §8.1](08-views.md#81-table-indexhtml-the-play-page)).
  One stack is new (Up then down 500); Already sorted and the 3- and 5-number cases moved to Easy.
- **Pros and cons across stacks:** after each change every stack shows the change in moves,
  and a line sums it up ("8 better · 5 worse"). Results are kept per hand.
- **Requirements are visible:** a card says what it needs ("needs a Pick: Cheapest Pick")
  or clashes with, slots light up green or red while a card is hovered, and a chain on a
  slot's tab marks the dependency.
- **Grasp and Craft run 0–10** ([03-stats.md §3.2](03-stats.md#32-scored-stats)). Every score is
  the old 1–5 judgment doubled; hand totals are no longer capped, so a big hand shows how far
  past 10 it goes (Four Corners: 12 / 20).
- **The hand is easier to read:** the measured change sits big in each card's visible corner,
  the fan is flatter, and a hovered card lifts and enlarges.
- **Cards fly above everything:** a played card no longer slips under the board or vanishes
  into the slot row. The card tilt is gone, and the slot-limit switch too: the Table is a
  sandbox.

## 2026-10-09, playback

- **Speed in moves per second** (0.25 to 200 000) instead of ops per frame, whose slowest
  setting was already 60 moves a second. Scroll, drag, step or type it; **auto** fits a run into
  about 6 seconds, so a 2-move run and a 297 000-move run both play at a watchable pace.
- **Slow motion animates each move** below 25 moves a second: pushes slide across, swaps trade
  places, rotations wrap around. Single steps from the keys are animated too.
- **One timeline:** the phase bar is now the scrubber, with a playhead, a tooltip, and wheel and
  keyboard control. The keys and the move token use the Table's look, and in Compare one
  console drives both boards ([08-views.md §8.1](08-views.md#81-table-indexhtml-the-play-page)).

## 2026-10-09, the Table as a card table

- **Layout** ([08-views.md §8.1](08-views.md#81-table-indexhtml-the-play-page)): the blinds and
  the score on the left, the algorithm deck, the technique deck and the Book of Codex on the
  right, and a play mat in the middle with the slots, the played card, the board and a fanned
  hand. On wide screens the whole table fits the window.
- **Blinds** replace the input bar: twelve named edge-case inputs in three tiers, plus a custom
  input. Every blind is stamped for the current hand in a background worker.
- **The hand** ([02-game-design.md §2.4](02-game-design.md#24-the-play-loop-the-table)): the
  techniques that fit the played card are dealt into it; playing one moves it to its slot, and
  a replaced default comes back. Decks can be spread out, drawn from, and any card inspected.
- **Card faces** ([02-game-design.md §2.3](02-game-design.md#23-the-card-face)): family frame
  colours, role colours that match the slots, rarity metals, tier shields, cost gems, foil on
  rare cards, and pixel icons. Technical stats move behind a "technical details" switch.
- **Plain words** on the Table: moves instead of ops, "very messy" instead of a disorder
  percentage.

## 2026-10-09, the whole explorer built (milestones 1–7)

- **Every card is playable.** All 23 Algorithm cards, 39 Technique cards (37 built; Multi-Band
  and Beam Leaf stay unbuildable, Rank Compression and Double-Op Sharing are always on), both
  Meta cards, and 6 playable Cursed ports. The engines are ported from spec/sim, so the explorer
  reproduces every bare card and seed deck within ±5 % of its sim number, and LSD Radix exactly.
- **The research cards are measured** (new tag "exp", see README): Tape Merge 1200 / 8100
  (a balanced two-way merge on the stack ends, one op per value per merge step), Beam Sorter
  503 / 4562 (a whole-plan beam over insertion orders: best single card at n=100, worse than
  Long Line at n=500), Annealer 575 / 5060 (annealing Crate Runner's chunk boundaries).
- **Pages:** the Table (hand rail, played card with its slots and Finisher, technique rail
  filtered by role with reasons, delta strip, board with overlays, Compare, Portfolio and
  Adaptive, many seeds in a Web Worker, Paths, Challenges, deck links), the Codex (filters,
  flippable cards, card pages, Grasp × Craft, Cursed ports measured live), the Meta page (tiers,
  builds, Pareto front, technique value, interaction matrix, class check, disorder winners,
  decks, open spaces) and the Lab (scaling with the class check, disorder map with editable
  thresholds and four metrics, param sweep, optimality gap for n ≤ 8).
- **Rules made explicit** ([04-compatibility.md](04-compatibility.md)): a default steps aside
  when a played card conflicts with it; a technique lists the hosts it is built on, and other
  open hosts show it as an open space. Twin Extract's default Finisher is Hardcoded Three, the
  one its measured number uses.
- **Card text has one home.** `tools/build-data.mjs` extracts it from this spec into
  `data/cards.json` ([06-architecture.md §6.5](06-architecture.md#65-card-data)).
- **Known limit of the class check:** merge cards' integer pass counts make Natural Merge a false
  positive at +5.7 % ([09-metrics.md](09-metrics.md#growth)).
- **Open questions** 1, 2, 8, 9, 11 and 12 are decided for now ([12-open-questions.md](12-open-questions.md)).

## 2026-10-09, milestone 1 prototype

- **Built:** the core (rng, input, machine, independent replay, metrics, hand), the cards
  Hardcoded Three, Five Hand, Min Extract, LSD Radix and the Oracle (BFS, n ≤ 8), the prep card
  Presorted Shortcut, the post cards No-op Suppression, Peephole Cancel and Peephole Fuse, and a
  plain Table with a board, transport, phase timeline and a many-seeds panel.
- **Tests:** `node tests/run.mjs`, 35 passing. They cover the Oracle fixtures for n = 2..8, no
  card beating the Oracle on any permutation of n ≤ 6, LSD Radix at exactly 1084 / 6784, and Min
  Extract within 5 % of 1454 / 32298. `tools/ui-check.mjs` drives the Table in headless Chromium
  (35 checks).

## 2026-10-09, new cards and the disorder and worst-case measurements

- **New cards, built and measured in the sim:**
  - **MSD Radix** (Digit): 757 / 5263. On ranks it is Quick 2-Way with power-of-two pivots.
  - **Natural Merge** (Divide): 1495 / 10165. It is the lesson that runs do not help when every
    merge pass must rotate all of A; even one swap costs 454 at n=100.
- **New Cursed lessons:** merge insertion (Ford–Johnson), optimal for comparisons, which
  push_swap does not count; smoothsort and Cartesian tree sort, adaptive but needing random
  access.
- **Window Pick** became a param of Cheapest Pick: on Turk, a window of 20–50 values at each end
  of A keeps the ops and cuts the CPU.
- **Chunk schedule:** Annealed Plan's average boundaries are equal widths, so there is no fixed
  schedule to extract; its gain is per input.
- **Disorder sweep and nearly sorted inputs** ([05-meta.md §5.5](05-meta.md#55-disorder-winners-and-worst-cases-seed)):
  Long Line wins below 0.2, Four Corners from 0.4 (from 0.2 at n=500), Butterfly √n in between
  at n=100. The exact-disorder generator is noted as easier than uniform input.
- **Worst-case search:** Long Line, Careful Crates and Four Corners stay EXCELLENT under it;
  Turk drops to GOOD at n=500, and Min Extract can FAIL at n=100.

## 2026-10-09, lore

Every Algorithm and Meta card now has a short **Lore** paragraph: where the idea came from,
when that helps intuition (radix from punched-card sorters, quicksort from machine
translation, patience sorting from a solitaire game, merge sort from tapes), and one plain line
when there is no story. The Cursed cards share one lore paragraph. Every dated or attributed claim was
fact-checked on the web; sources are in [sources.md](sources.md#card-lore). The card back shows it
([02-game-design.md §2.3](02-game-design.md#23-the-card-face)).

## 2026-10-09, second pass — every technique measured

Each technique card now has a measured effect in [sim/results.md](sim/results.md), or a stated
reason why it has none. The numbers are paired: the same inputs with and without the card.

### New simulator engines

- **`sim/engines.mjs`:** fast Insertion and Turk engines with every technique as an option.
  They reproduce the old engines op for op before measuring anything.
- **`sim/divide.mjs`:** Quick 2-Way with Restore Skip as a switch, and a four-ends quicksort
  with switchable Four Ends, Thirds Split, Pivot by Leaf Count, BFS Leaf (with walls) and a
  simplified DP Splits.
- **`sim/buckets.mjs`:** Chunks with explicit boundaries, Middle-Out Push, Cheapest Return,
  the Bucket Insertion card, and Annealed Plan.
- **`sim/lib.mjs`:** the machine now supports `sb` and `ss` everywhere, plus a no-op counter
  and a Commutation Peephole.

### What the measurements say

- **The first measured synergy:** Pivot by Leaf Count + BFS Leaf, −39 at n=100 and −245 at
  n=500. Alone, Pivot by Leaf Count barely helps.
- **The simulated Four Corners matches the reference build:** 533 / 3825 against 528 / 3824.
  Without a Finisher, Four-End Quicksort costs 735 / 5033, and its op count depends only on n.
- **A fully compliant build is EXCELLENT on every run:** Long Line / Careful Crates / Four
  Corners measures 566 / 4038, with worst runs of 662 and 4508.
- **Techniques that lose:**
  - Lookahead-k: +175 on Turk and +297 on Long Line at n=500. It re-plans after every move;
    Beam over Orders, which compares whole plans, gains instead.
  - Middle-Out Push: +1794 on Chunks at n=500, all in retrieval.
  - `sb` Seed: +0.3.
  - Keeping the LIS (or the longest run) in Turk: +49 / +83 at n=500.
- **Big effects:** switching off Double-Op Sharing costs +1224 on Turk at n=500. Restore Skip's
  whole-stack case (already in the bare Quick 2-Way) is worth 139 / 732. BFS Leaf ≤ 5 saves
  142 / 657.
- **Mixed:** Cheapest Return hurts Chunks at n=100 (+21) but saves 494 at n=500. Four Ends
  alone costs +6 at n=100 and saves 355 at n=500.
- **Small or zero:** No-op Suppression and Commutation Peephole save under 0.5 op per stream.
  Rank-Range Max is 0 by construction. Longest Run Anchor saves 7 / 20.

### Spec changes

- **Technique roster and files:** every technique has its measured effect
  ([techniques/README.md](techniques/README.md)).
- **Middle-Out Push** moved from the sweep role to the band role: it decides where values land.
- **Multi-Band** is marked as not buildable as written (B has two ends); its knob is `rb` Sink's
  split point, best at 0.4–0.5·n.
- **Four-End Quicksort:** its default Finisher is now none (recurse to single values); Five
  Hand cannot work around the sorted values below a leaf. Its card shows the bare sim numbers.
- **Lookahead Greedy and Bucket Insertion** now carry sim numbers (557 / 5284 and 606 / 4291).
- **[05-meta.md](05-meta.md):** the first synergy, both sim and ref for Four Corners and
  Careful Crates, the strong builds, four new traps, and new open spaces.
- **New open question:** what to do with cards that measure as losses.

### Still not measured

Beam Leaf (≤ 32), Restore Skip's second case, the full reference DP Splits (with `rr` merges
and free reads), Tape Merge, Beam Sorter as a whole-problem search, and the Annealer card on
other hosts.

## 2026-10-09 — verification pass and redesign

The spec was checked against the subject (`en.subject.pdf`), against the reference study in
`push_swap/study/`, and by re-running every number. This entry lists what changed and why.

### 1. How numbers are produced

- **New reference simulator, [sim/](sim/README.md).** It loads `measure-sim.js`, adds the
  variants the cards describe, seeds every input, pairs every technique comparison, and
  replays every stream with an independent checker. The output is
  [sim/results.md](sim/results.md), and `node spec/sim/report.mjs` reproduces it exactly.
- **All "sim" numbers were re-measured**, on 1000 inputs at n=100 and 200 at n=500 instead of
  50 and 12 unseeded ones. Most moved by under 1.5 % (Turk 563 → 557, Butterfly 585 → 577).
  No grade changed.
- **"ref" numbers now quote a single method's own mean.** The study's headline numbers are
  `--adaptive` means that mix two methods. They were attributed to Four-End Quicksort and its
  decks, so those numbers changed: Four Corners ~530 / ~3950 → 528 / 3824, and Oracle's Plan
  ~436 / ~3236 → 420 / 3111. The adaptive means now appear only for whole builds.
- **Numbers from the "LIS walkthrough artifact" were replaced.** They did not reproduce with
  the simulator's own code. For example, `rb` Sink measured −14 at n=100 and −93 at n=200,
  not −1 and −163.
- **`measure-sim.js` bugs fixed:** LSD Radix looped forever at n=0, and Min Extract left
  `[1 0]` unsorted.

### 2. Roles, slots, natives and defaults

These are the rules `compat.json` needs. Before, several of the spec's own decks were
illegal hands.

- **Layout** split into **sweep** and **band**. **Partition** split into **ends**, **split** and
  **pivot**.
- **Prep and post cards stack** and use no slot. A **Finisher** has its own slot.
- **Natives** (locked) and **defaults** (replaceable) are part of a card and use no slot.
  Slots count only the techniques you add or swap in.
- **"Requires"** on another role is met by a played, native or default card. On the card's own
  role, it names the host default the card replaces (Second-Max replaces Max Retrieval).
- **Every card's Slots line now matches [04-compatibility.md](04-compatibility.md)**, which
  lists each card's natives, defaults and Finisher. Pseudo-slots such as Early Exit, the gather
  order and the beam width became **params**. Eleven cards now have no technique slot.
- **Turk's Four-Way Cost** is a default, not a native, so its effect on Turk can be measured.
- **Double-Op Sharing** moved from cost to post, always on. As a cost card it could never sit
  alongside the cost cards that assume it.
- **The Oracle** moved into milestone 1, with exact BFS fixtures up to n=8 in
  [10-tests.md](10-tests.md).

### 3. Claims corrected

| claim | was | now (sim unless tagged) |
| --- | --- | --- |
| Known synergy: Cheapest Pick + LIS Anchor | ✦ synergy | ✕ overlap: +24 ± 2 at n=100, +220 ± 37 at n=500 |
| `rb` Sink + Four-Way Cost (§2.5 example) | synergy | additive |
| Four-Way Cost "strictly never worse" than Two-Way | always | per move only; worse over a whole sort on 11–17 % of inputs |
| Ternary Radix | ~900 / ~5800 est., better than binary | 1333 / 7362, worse than binary (1084 / 6784) |
| Reversed input | worst case for insertion cards | among their cheapest inputs (~3n); worse than random for Bubble Wheel, Butterfly and Quick 2-Way |
| Crate Runner: "tune the chunk count for A" | tuning reaches A | tuning alone tops out at 5858 (B). The deck is now K ≈ 0.4√n + One-Way Sweep + Second-Max: 606 / 5247, EXCELLENT on every run |
| Circular LIS at n=500 (a "known trap") | +15 ops | −17 ± 11: noise; removed from the traps |
| Nearest-Member Sweep | "a large saving over a blind `ra` sweep" | costs +16 / +140 more than an `ra` sweep. A `pb` advances an `ra` sweep for free, while `rra` pays for every value it pulls up |
| One-Way Sweep | "a few more ops than Nearest-Member" | the cheapest sweep, once priced with the `rra` surcharge; it also carries the n√n proof |
| Peephole Fuse on Radix | "est. large" | 0 (radix never rotates B). Peephole Cancel saves −78 / −55 on radix |
| Bucket Insertion | ~560 / ~4700 est. | 576 / 4121 ref: it is the reference build's medium method |
| Oracle state space at n=7 | ~10⁵–10⁶ | (n+1)·n! = 40,320; a BFS to n=8 takes ~1 s |
| IDA* heuristic "inversions ÷ 2" | admissible | not admissible (`[1 2 3 4 0]`: h=2, true 1). Replaced by max(\|B\|, ⌈breakpoints ÷ 5⌉), checked on every state to n=8 |
| Five Hand | ≤ 12 ops; the Oracle saves 1–3 | ≤ 10, mean 7.4; the Oracle saves 2.5 on average and up to 6 |
| Cheapest Pick CPU | O(n²) with a linear slot search | O(n³) linear, O(n² log n) binary |
| Twin Extract | "halves" the search distance | about a third less (8.6 vs 13.0 rotations); the described return never sorted. Now 1117 / 22318 |
| LIS length | ~18 / ~42 | 16.7 / 40.1 |
| Quick 2-Way proof mark | ~ | ✓, with the argument: exact median, ≤ 2 ops per value per level |
| Chunks proof mark | ✓ | ~ with its default Nearest-Member sweep; ✓ with K ∝ √n and One-Way |
| Four-End Quicksort bound | "a clean proof" | the class argument is simple; the stated constant is the reference build's unchecked claim |
| Grade interpolation | "the n log₂ n curve through these two points" (impossible) | a power law through both points |
| Heapsort port | O(n² log n) | O(n²): the jumps along a sift-down double, so they sum to O(n) |
| Turk speed | ●●●●○ | ●●●○○ (about 65 ms at n=500 in JS); the tiers are now defined |
| Vision: four-end quicksort "short to write" | short | regular, not short (Craft 4) |
| Hand totals | Long Line 3 / 3, Four Corners 4 / 4 | 5 / 5 and 5+ / 5+ by the §3.4 formula |
| 08-views | "four pages" listing five | four pages; Paths run on the Table |

### 4. Design additions

- **Builds** ([05-meta.md §5.4](05-meta.md#54-builds-seed), [cards/meta.md](cards/meta.md)).
  Uniform input has disorder 0.500 ± 0.034, so `--adaptive` sends about half the graded runs to
  the medium hand. The Meta page now ranks whole builds, with a class check per regime. Seed
  result: the provable sim build is EXCELLENT on every n=500 run but on only 52 % of n=100 runs,
  because Quick 2-Way averages 718 there.
- **Pass rates** next to every grade ([03-stats.md](03-stats.md),
  [09-metrics.md](09-metrics.md), [02-game-design.md §2.7](02-game-design.md#27-grades)),
  because the evaluation grades each run. For example, Chunks averages 662 at n=100 but 5 % of
  its runs reach 700.
- **One interaction rule** ([02-game-design.md §2.5](02-game-design.md#25-slots-interactions-and-conflicts),
  [05-meta.md §5.1](05-meta.md#51-what-the-page-shows)): paired seeds, a two-standard-error
  threshold, and badges for ✦ synergy, ✕ overlap and clash.
- **A growth class check that works** ([09-metrics.md](09-metrics.md#growth)): fit
  a·f(n) + b·n up to n=1000, then check the offline sizes. The old rule, "a rising ratio
  flags the claim", would have failed Quick 2-Way and passed constant-w Butterfly.
- **Params as functions of n.** A param that stops growing on an O(n√n) card is flagged without
  measuring.
- **Named decks:** Careful Crates (Bucket Insertion) added. Long Line recomposed as LIS
  Insertion + Four-Way + `rb` Sink, since Portfolio adds −8 at n=100 and nothing at n=500.
  Crate Runner recomposed (see §3).
- **Tiers at n=100** as well as n=500.
- **The subject's examples mapped to cards** ([cards/README.md](cards/README.md)), including
  why heap sort and binary indexed trees are not methods here ([cards/cursed.md](cards/cursed.md)).
- **Grasp × Craft quadrants** now have thresholds (1–2 low, 3–5 high). The Elegant quadrant is
  empty, which makes it an open space.
- **Architecture:** `core/data.js` loads JSON with fetch or fs (no JSON module imports),
  `ui/markdown.js` renders card text, and `data/seeds.json` is in the layout.
- **Inputs:** disorder is shown as a percentage like `--bench`, is 0 when n < 2, and comes
  with the regime `--adaptive` would pick.
- **Smaller fixes:** technique Value = Δops ÷ max(1, added Craft); Meta cards add to hand
  totals; the Legendary rarity example is Beam Leaf (Pattern Database was not a card); the
  Lab's optimality gap goes to n=8 with one backward BFS.
- **New open questions** 9–12 in [12-open-questions.md](12-open-questions.md): Presorted
  Shortcut always on, additive difficulty, tiers by pass rate, and zero-slot cards.

### 5. Still open

- **Unmeasured (est.) cards and techniques:** Lookahead Greedy, Beam Sorter as a
  whole-problem search, Annealer, Tape Merge, Multi-Band, Middle-Out Push, Cheapest Return,
  Restore Skip, BFS Leaf's effect, and Four Ends + Thirds Split.
- **"ref" numbers** rest on 5 seeds, and the reference builds' class proofs are unchecked.
- **The Turk article's byline** is not confirmed.
