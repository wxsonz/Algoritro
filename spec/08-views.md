# 8. Views

There are four pages, Table, Codex, Meta and Lab, with a shared top bar. Paths run on the
Table as a guided mode (§8.5). Light and dark themes, usable at phone width.

## 8.1 Table (`index.html`): the play page

The main page, laid out like a card table. It follows [02-game-design.md §2.4](02-game-design.md#24-the-play-loop-the-table).

```
┌ left panel ──────┬ play mat ─────────────────────────────────────┬ right panel ┐
│ the stack: goal  │ slots: [meta][pick][anchor][cost]…[finisher]  │ algorithm   │
│ moves · stamp    │        [extras]                     [knobs]   │ deck        │
│ Grasp, Craft gems│ ┌ played card ┐ ┌ board: A | B, transport,  ┐ │ browse·draw │
│ delta chip       │ │(click: read)│ │ phase timeline, overlays  │ │ technique   │
│ stacks: easy,    │ └─────────────┘ └───────────────────────────┘ │ deck        │
│ medium, hard,    │ your hand: the techniques that fit, fanned    │ browse·draw │
│ Learn Stats      │                                               │ Book of     │
│ Compare Share    │                                               │ Codex       │
└──────────────────┴───────────────────────────────────────────────┴─────────────┘
```

- **Wide screens fit the window** like a game screen (from 1100 × 620): only the stack list,
  the slot row and the overlays scroll. Narrower screens stack the panels and the page scrolls;
  on a phone the hand becomes a scrolling row.
- **Stacks**, the starting stack A to sort, from easy to hard. Easy: Already sorted (0
  moves), One swap, Nearly sorted (3 swaps), 3 numbers (3 reversed, at most 3 moves), 5
  numbers (at most 12 moves). Medium: Random 100, Reversed 100, Rotated 100 (sorted, rotated
  by 37), Up then down (organ pipe), Four runs. Hard: Random 500, Reversed 500, Up then down
  500. Seeded stacks use seed 42, and a custom stack is one more entry. Each stack carries
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
- **Hand totals past 10 catch fire:** the Grasp or Craft row burns, and the number throbs.
- **Tooltips** sit above the pointer in the table's colours, with a heading and a few lines.
  Hand cards have none: hovering one enlarges it instead.
- **Decks.** Clicking a pile spreads it in an overlay: algorithm cards by family, with the
  prebuilt hands and the Meta cards; technique cards by role. **Draw** plays a random card
  that fits, skipping cards that take more than about 1.5 s to plan at this n. A slow card
  played on purpose says it is thinking before it runs.
- **Inspect.** Click the played card, right-click any card, or press its **?**, to see it up
  close on the felt, in panels read top to bottom: **The idea** in plain words, **Step by
  step** beside a replay of it sorting 20 numbers, the **Scorecard** (its three badges, each
  explained in a sentence), **Good at** and **Watch out**, and last **Under the hood**, the
  technical part, then its lore and slots. A technique shows **On** the played card: its
  change in moves at 100 and 500, or that the card has it built in or comes with it. Then
  its pros and cons, a **Measured** table of its change on every card it fits (the played card
  highlighted) with the study's notes, and the technical part. Cards have no back to flip.
- **Tools** open as overlays: Custom input, Learn (Paths and Challenges), Stats (op counts,
  many seeds with a histogram, and the technical-details switch) and the Meta card's setup.
- **Compare:** pin the current hand, change a card, and see both side by side, stepping
  together. Each run keeps its own length, and a finished run stays on its final state.
- **Overlays** follow the cards in play: the cost table over candidates for Cheapest Pick,
  chunk ranges for Chunks, kept bars for anchors, the partition tree for Divide cards, the
  current bit for Radix.
- **Playback.** The phase timeline is the scrubber: drag it, click it, or scroll on it
  (Shift scrolls ten moves). The keys play, step and skip to the next phase; Space, ←/→,
  Shift+←/→, Home and End do the same. **Speed** is in moves per second, from 0.25 to 200 000:
  scroll or drag the dial, step it with ‹ › or [ ], or type a number ("250", "1.5k"). **Auto**,
  the default, fits the whole run into about 6 seconds. Below 25 moves a second every move is
  animated: a push slides across, a swap trades places, a rotation wraps around. In Compare,
  one console drives both boards.
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
explains what the next card fixes.

| path | steps |
| --- | --- |
| **First Sort** | Bubble Wheel → Min Extract → Five Hand → Oracle (gap) |
| **Insertion Ladder** | Simple Insertion → + LIS Anchor → + Cheapest Pick → + Four-Way → + `rb` Sink → Turk (compare) |
| **Buckets** | Chunks → + One-Way Sweep → + Second-Max → Butterfly → Bucket Insertion → Lab: class check |
| **Divide** | LSD Radix → Quick 2-Way → + Restore Skip → Four-End Quicksort → + BFS Leaf → Meta: DP Splits |
| **Adaptive** | Disorder Meter → Disorder map → Adaptive Selector → tune the thresholds |
