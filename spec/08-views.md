# 8. Views

There are four pages, Table, Codex, Meta and Lab, with a shared top bar. Paths run on the
Table as a guided mode (§8.5). Light and dark themes, usable at phone width.

## 8.1 Table (`index.html`): the play page

The main page, laid out like a card table. It follows [02-game-design.md §2.4](02-game-design.md#24-the-play-loop-the-table).

```
┌ left panel ──────────┬ play mat ──────────────────────────────────────────────┐
│ the stack: goal      │ build: [--simple] [--medium] [--complex] [tiny 🔒]     │
│ moves · stamp        │ slots of the seat on the mat: [pick][anchor]…[knobs]   │
│ Grasp, Craft gems    │ ┌ played card ┐ ┌ route: stack · disorder → flag → card┐│
│ delta chip           │ │(click: read)│ │ board: A | B, transport, timeline   ││
│ stacks with routes:  │ └─────────────┘ └─────────────────────────────────────┘│
│ easy, medium, hard,  │ your hand: the techniques that fit, fanned  [algo][tech]│
│ custom stack         │                                             deck  deck │
└──────────────────────┴────────────────────────────────────────────────────────┘
```

- **Wide screens fit the window** like a game screen (from 1100 × 620): only the stack list,
  the slot row and the overlays scroll. Narrower screens stack the panels and the page scrolls;
  on a phone the hand becomes a scrolling row.
- **Stacks**, the starting stack A to sort, from easy to hard (26 in all). Easy: 1 number and
  2 in order (0 moves), 2 swapped (1 move), 3 numbers every order (at most 3 moves) and 5
  numbers every order (at most 12), Already sorted (0 moves), One swap, Nearly sorted (3
  swaps), Smallest at the bottom (one `rra` away). Medium: Random 100, Reversed 100, Rotated
  100 (by 37), Up then down, Four runs, Down then up, Interleaved halves, Nearly reversed,
  Twenty runs, and exact disorder at 25 %, 50 % and 75 %. Hard: Random 500, Reversed 500, Up
  then down 500, Nearly sorted 500 (10 swaps), Rotated 500 (by 137). Seeded stacks (the nine that
  use randomness) follow the **global seed**, top right, which starts at 1000: rolling it changes
  all nine at once, and their routes follow. An "every order" stack runs all n! orders, is
  stamped by the worst, and picking it plays that worst order. Each row also shows the stack's **route**: its disorder, the flag it goes
  to (`--simple` below 0.2, `--medium` up to 0.5, `--complex` from 0.5, or `tiny` for 5 numbers or
  fewer, whatever the disorder) and the icon of the card that sorted it. The flags have their
  own colours, never the stack levels'. A stack with a hard limit is graded against its optimum (the worst
  order's shortest solution, found by the Oracle: 1 for 2 swapped, 2 for 3 numbers, 8 for 5):
  ★ at the optimum, blue ✓ at least halfway from the limit to it, orange ✓ within the limit. A custom stack is one more entry. Each stack carries
  the current hand's moves and a stamp (★ EXCELLENT or perfect, ✓ GOOD or PASS, ✕ FAIL),
  measured in a background worker whenever the hand changes. After a change, each stack also
  shows how many moves the change saved or cost there, and a line sums it up ("On every stack:
  8 better · 5 worse"), so a card's pros and cons show at a glance. Results are kept per hand,
  so taking a card back is instant.
- **Your hand.** Each card carries its measured change in moves on the played card (at 100,
  or at 500 for a big stack) in the corner a fanned hand leaves visible; hovering a card
  lifts and enlarges it. A card that needs another one says so ("needs a Pick: Cheapest
  Pick"), and while it is hovered the slots it needs light up, green when they are filled and
  red when they are not. In the slot row, a chain on a slot's tab marks a card that another
  card in play relies on, or, in red, a card that is missing what it needs.
- **The Table is a sandbox:** a card's slot count is shown, never enforced.
- **Built in and default.** A slot whose card is built into the played card has a gold tab
  with a lock, and its card a lock seal and a "built in" ribbon. Clicking it shakes the card
  and says why it stays. A default card wears a "default" ribbon; clicking it points at the
  hand cards that can replace it.
- **Hand totals past 10 catch fire:** the Grasp or Craft row burns, and the number throbs.
- **Tooltips** sit above the pointer in the table's colours, with a heading and a few lines.
  Hand cards have none: hovering one enlarges it instead.
- **The build.** Above the slots, four seats: `--simple`, `--medium`, `--complex` and the
  locked tiny seat. Each shows its range of disorder, its card, whether that card meets the
  flag's class target (✓ or a red ✕ with the reason), and a tally of its stacks ("8 stacks ·
  7★ 1✓"). The seat sorting the current stack is lit, with a "sorting: Random 100" tag; clicking
  another seat puts it on the mat and moves the board to one of its stacks. Stamps are kept
  per hand, so a change re-measures only the stacks of the seat it touched.
- **Precompute ☢**, top right beside the seed, is also the fill meter: the share of every legal
  hand × every stack the cache already holds at this seed. Nothing is measured twice: results come
  from the shipped precompute (`data/stacks.json`, every legal hand at the default seed, with all
  16 subsets of the post cards), then from what this browser kept in IndexedDB on earlier
  visits, and every new result is kept. The meter creeps up as you play; a click fills the rest
  in a pool of workers, resumes where it stopped, and a second click stops it. At the default
  seed a first visit reads 100 % and measures nothing; a new seed starts at the share of stacks it
  does not touch (65 %).
- **The route banner** above the board names the stack, why it goes where it goes (its
  disorder, or its size for the tiny seat), the flag, and the card; clicking the card opens
  Inspect. On the tiny seat the slots say it is built in, and the hand is empty.
- **Decks and Browse.** The two decks sit to the right of the hand. Clicking a pile spreads it
  in an overlay, **Browse**: algorithm cards by family, with the prebuilt hands and the named
  builds (a hand in every seat); technique cards by role. Clicking a card shows it in a pane
  beside the grid: its idea in plain words, which flags its class can serve (✓ or ✕ for
  `--simple`, `--medium`, `--complex`), and its stamps on the seat's stacks against the card
  there now, from the kept results or measured live. The pane's button places it: **Put in
  `--medium`** for an algorithm, **Play on `--medium`** or **Take it back** for a technique.
  Each seat has a button that opens the algorithm deck choosing for that seat; the deck pile
  chooses for the seat on the mat. A double-click places a card at once. Cards in the deck wear
  the flags of the seats they sit in, and a card that misses a seat's class target can still go
  in, with a warning. There is no Draw: a random card does not fit a sandbox. A slow card says it
  is thinking before it runs. The Codex is in the top bar, so the Table has no book of it.
- **Inspect.** Click the played card, right-click any card, or press its **?**, to see it up
  close on the felt, in panels read top to bottom: **The idea** in plain words, **Step by
  step** beside a replay of it sorting 20 numbers, the **Scorecard** (its three badges, each
  explained in a sentence), **Good at** and **Watch out**, and last **Under the hood**, the
  technical part, then its lore and slots. A technique shows **On** the played card: its
  change in moves at 100 and 500, or that the card has it built in or comes with it. Then
  its pros and cons, a **Measured** table of its change on every card it fits (the played card
  highlighted) with the study's notes, and the technical part. Cards have no back to flip.
- **Overlays:** the custom stack. The left panel holds no tool buttons: Learn, Stats, Compare
  and Share were removed as out of place on a card table. The address bar carries the whole
  build (`#s=…&m=…&c=…`), so a copied URL shares it. The Meta slot and Portfolio are gone: the
  seats are the Adaptive Selector.
- **Overlays** follow the cards in play: the cost table over candidates for Cheapest Pick,
  chunk ranges for Chunks, kept bars for anchors, the partition tree for Divide cards, the
  current bit for Radix.
- **Playback.** The phase timeline is the scrubber: drag it, click it, or scroll on it
  (Shift scrolls ten moves). The keys play, step and skip to the next phase; Space, ←/→,
  Shift+←/→, Home and End do the same. **Speed** is in moves per second, from 0.25 to 200 000:
  scroll or drag the dial, step it with ‹ › or [ ], or type a number ("250", "1.5k"). **Auto**,
  the default, fits the whole run into about 6 seconds. Below 25 moves a second every move is
  animated: a push slides across, a swap trades places, a rotation wraps around.
- **Effects while it plays** (FX): a banner for each new phase, a combo counter for streaks
  of the same move that catches fire on long ones, sparks where moves land in slow motion, a
  milestone every 100 moves, and a finale (a stamp, a quake, and confetti when it sorted).
- **The move log** (LOG) beside the board lists the moves up to the current one, each with its
  reason, under a header for each phase.

## 8.2 Codex (`codex.html`)

- Every card, as a grid of card faces. Filter by type, family, role and rarity.
- **Card page:** the card face and its full text in the same top-down order (the idea, step
  by step, under the hood, lore, pros and cons), compatible cards, a mini replay, its Path
  position, and "play on Table". Clicking a card in the grid opens its page.
- The **Grasp × Craft grid** with all Algorithm cards plotted and the quadrants labelled
  (Starter, Grinder, Elegant, Boss).
- Cursed cards in their own section.

## 8.3 Meta (`meta.html`)

See [05-meta.md](05-meta.md): tier list, builds, Pareto front, technique value table,
interaction matrix, class check, disorder winners, named decks, open spaces.

## 8.4 Lab (`lab.html`)

The analysis tools, all running in a Web Worker with progress and cancel:

- **Scaling:** ops against n for the chosen hands, with a min–max band over seeds. Reference
  curves (n², n√n, n log₂ n) and grade thresholds are drawn. A normalised mode plots
  ops ÷ (n log₂ n) and ops ÷ (n√n).
- **Disorder map:** at fixed n, mean ops against exact disorder per hand. The Adaptive
  thresholds can be edited and are drawn on the map, along with the band where uniform random
  input falls (0.50 ± 0.03 at n=100, ± 0.015 at n=500). Moving a threshold flags any regime
  whose hand no longer meets the subject's class target for that regime.
- **Param sweep:** one numeric param (chunk count, window w, leaf size, beam width) against
  mean ops.
- **Optimality gap:** for n ≤ 8, every permutation, comparing each hand with the Oracle. One
  backward BFS from the sorted state gives every permutation's optimum at once (362,880 states
  at n=8). A histogram of the extra ops. The worst permutations open on the Table.

## 8.5 Paths

Guided sequences for peers. Each step plays a deck on the Table, asks one question, and
explains what the next card fixes. A path opens from its card's Codex page (a link with
`&path=…&step=…`); the Table no longer lists them itself.

| path | steps |
| --- | --- |
| **First Sort** | Bubble Wheel → Min Extract → Five Hand → Oracle (gap) |
| **Insertion Ladder** | Simple Insertion → + LIS Anchor → + Cheapest Pick → + Four-Way → + `rb` Sink → Turk (compare) |
| **Buckets** | Chunks → + One-Way Sweep → + Second-Max → Butterfly → Bucket Insertion → Lab: class check |
| **Divide** | LSD Radix → Quick 2-Way → + Restore Skip → Four-End Quicksort → + BFS Leaf → Meta: DP Splits |
| **Adaptive** | Disorder Meter → Disorder map → Adaptive Selector → tune the thresholds |
