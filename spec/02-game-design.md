# 2. Game design

The theme is a collectible card game. It gives the material a structure that is easy to
browse, makes comparing combinations feel like deckbuilding, and gives peers a shared
vocabulary ("Turk with Four-Way Cost and Peephole").

## 2.1 Card types

| type | frame | role | examples |
| --- | --- | --- | --- |
| **Algorithm** | large, coloured by family | The main card. Exactly one per hand. It decides how values move overall. | Turk, Radix, Butterfly, Four-End Quicksort |
| **Technique** | small, coloured by category | A modifier that plugs into an Algorithm's slots. It changes a rule, a cost model, a layout or a post-pass. | LIS Anchor, Four-Way Cost, Peephole, `rb` Sink |
| **Finisher** | small, grey | Handles small leftovers: the last 3 in A, a leaf of ≤ 5, and so on. One per hand, optional, in its own Finisher slot. | Hardcoded Three, BFS Leaf |
| **Meta** | gold border | Wraps one or more complete hands: picks between them, or runs all of them and keeps the best. | Portfolio, Adaptive Selector |
| **Cursed** | cracked frame | Classic sorts that do **not** map well onto two stacks. Kept in the Codex to explain *why*. | Heapsort, Shell sort, Bogosort |

## 2.2 Families (elements)

Each Algorithm card belongs to a family. The family sets its colour and icon, and usually its
complexity class.

| family | icon | idea | cards |
| --- | --- | --- | --- |
| **Small** | ◆ | exact or hardcoded sorts for tiny n | Three, Five, Oracle |
| **Selection** | ▲ | repeatedly find and move one extreme value | Bubble Wheel, Min Extract, Twin Extract |
| **Insertion** | ● | put each value into its place in a sorted stack | Insert-into-B, Simple Insertion, LIS Insertion, Turk |
| **Bucket** | ■ | split by rank range, then order within ranges | Chunks, Butterfly, Bucket Insertion |
| **Digit** | ♦ | split by bits or digits of the rank | LSD Radix, Ternary Radix, MSD Radix |
| **Divide** | ✦ | recursive partitioning or merging | Quick 2-Way, Four-End Quicksort, Tape Merge, Natural Merge |
| **Search** | ✺ | explore many op sequences with a score | Beam Sorter, Lookahead Greedy, Annealer |

## 2.3 The card face

Cards look like physical cards: cream faces in both themes, with type big enough to read in
a fanned hand. The anatomy borrows from card games peers already know:

```
┌──────────────────────────────────┐
│ (💡4)         TURK          (🔨6) │  Grasp gem (a bulb: to understand) · name · Craft gem (a hammer: to build)
│ ┌──────────────────────────────┐ │
│ │  [5] [3] [1] [4] [6]   cover │ │  the cover draws the card's idea: here, price tags with the cheapest lit
│ └──────────────────────────────┘ │
│ ● INSERTION ALGORITHM          ◆ │  type line: family, rarity gem (Magic's type line)
│ “Always make the cheapest move”  │  the quote
│ ┌────────┐ ┌────────┐ ┌────────┐ │
│ │ class  │ │ slots  │ │push_swap│ │  three badges: complexity class, slot tier, push_swap tier
│ │ O(n²)  │ │   S    │ │   A    │ │
│ └────────┘ └────────┘ └────────┘ │
└──────────────────────────────────┘
```

- **The frame colour is the family**, like a colour identity: Small slate, Selection ember,
  Insertion blue, Bucket green, Digit magenta, Divide teal, Search violet.
- **The cover draws the idea**, one per card: radix shows its bars half sorted in a rainbow
  over a grid of their bits, Turk prices its candidates, LIS Insertion lights its longest
  rising line, the Annealer cools a ball into the deepest valley. A replay of the card sorting
  20 numbers is in Inspect.
- **Three badges** sum the card up ([03-stats.md §3.5](03-stats.md#35-card-tiers)): its
  complexity class, its **slot tier** (how much it can be tuned) and its **push_swap tier**
  (how it scores at 100 and 500). The measured numbers are in each badge's tooltip.
- **Technique cards** have a header band in their **role colour** (anchor green, pick orange,
  cost gold, sweep cyan, band pink, retrieval blue, ends lavender, split red, pivot brown,
  order slate, Finisher indigo, prep teal, post steel) and a trim in their **rarity metal**:
  iron, silver, gold, prismatic. A slot on the Table wears the same role colour, so a card's
  colour says where it goes. The footer shows the card's measured effect on the played card,
  and in your hand the same change sits big in the top-left corner. A card that needs another
  shows a chain line ("needs Four Ends"), green when it is met and red when it is not.
- **Rarity shows:** uncommon cards shine now and then, rare cards are holo and sparkle, and
  legendary cards have a slowly turning prismatic rim. The effects play on the card in focus
  (on the mat, in Inspect, or under the pointer); elsewhere they hold still, so a full hand
  stays light.
- **Icons** are 12×12 pixel bitmaps drawn as SVG, so they look the same on every system.

A card has no back to flip. Clicking it opens it up close in **Inspect**, told top-down so
the plain words come first: **the idea** in a sentence or two, **step by step** as a short
numbered list, a replay of it sorting 20 numbers, the scorecard behind its three badges, what
it is **good at** and what to **watch out** for, and only then **under the hood**, the exact
rules, costs and edge cases. Its **lore** (where the idea came from, kept to a few plain
sentences, or one line when there is no story) and its slots close the page. All stats are
defined in [03-stats.md](03-stats.md).

## 2.4 The play loop: the Table

Everything happens on one page, the **Table**, laid out like a card table ([08-views.md §8.1](08-views.md#81-table-indexhtml-the-play-page)):

1. **Pick a stack.** The left panel lists the **stacks** to sort, from easy (Already
   sorted, 3 numbers) through medium (Random 100, Reversed 100) to hard (Random 500). A
   custom stack (n, generator, seed, or your own numbers) is one more entry
   ([07-inputs.md](07-inputs.md)). Every stack is open; there is no progression.
2. **Play an Algorithm card** from the algorithm deck on the right: spread it out and pick
   one, or draw one at random. The table runs it at once, with its natives and defaults.
3. **Your hand is dealt.** Every technique that fits the played card is dealt into your hand
   (see [04-compatibility.md](04-compatibility.md)). The rest stay in the technique deck,
   face up but greyed, each with a one-line reason ("Radix never searches for a target, so a
   cost model has nothing to price").
4. **Play techniques** from your hand: click one, or drag it onto its slot. A card that
   replaces a default sends the default back to your hand, and clicking a played card takes
   it back. Each change re-runs instantly, and a chip shows the **delta**: moves, grade,
   Grasp and Craft. Every stack's moves and stamp update in the background, each with the
   change in moves, so a card's pros and cons across inputs show at once.
5. **Optional Finisher and Meta.** Play a Finisher, or wrap the hand in Portfolio to race its
   variants.
6. **Read the result** in the same view (§2.6) and step through it.

The hand can be saved as a **Deck** (a named combo) and shared as a URL fragment, for
example `#deck=turk+rb-sink+peephole-cancel&n=100&seed=42`.

## 2.5 Slots, interactions and conflicts

- **Slots.** Each Algorithm has 0–4 technique slots, roughly by how much it can be tuned.
  Radix has none, Turk has 3, Simple Insertion and Quick 2-Way have 4. A slot holds a
  technique you add or swap in. A card's **natives** (locked, such as Turk's Cheapest Pick)
  and **defaults** (pre-filled but replaceable, such as Turk's Keep Three) are part of the
  card and use no slot. A native is what makes the card what it is: Turk without Cheapest
  Pick is Simple Insertion. A default fills a role the card cannot run without, until another
  card of that role replaces it. On the Table a native's slot has a gold tab with a lock, and
  the card wears a lock seal and a **built in** ribbon; a default wears a **default** ribbon.
  Clicking either says why it stays. The count tells you how much a card is meant to be tuned. It is
  **not** a real-world limit, and the Table, a sandbox, never enforces it.
- **Roles.** Each slot role (anchor, pick, cost, sweep, band, retrieval, ends, split, pivot,
  order) holds one card. Prep and post cards stack and use no slot, and the Finisher has its
  own slot. See [04-compatibility.md](04-compatibility.md).
- **Requires.** Some techniques need another one. A requirement on another role is met by a
  card played there or by the host's native or default card: Four-Way Cost needs a cheapest
  pick, so it fits Turk through its native Cheapest Pick. A requirement on the card's own role
  names the host default it replaces: Second-Max Lookahead replaces Max Retrieval, so it only
  fits cards that retrieve by max.
- **Conflicts.** Cards in the same role always exclude each other. For example, LIS Anchor
  and Circular LIS Anchor both fill the anchor role, so only one can be played. A few pairs in
  different roles also conflict, such as DP Splits and Median Pivot.
- **Interactions.** For a pair of techniques, the **interaction** is Δ(both) − Δ(first
  alone) − Δ(second alone), measured on the same seeds for all four runs. When the pair saves
  clearly more than the sum (by more than two standard errors), the result panel shows a ✦
  synergy badge. When it saves clearly less, it shows a ✕ overlap badge. A pair that does
  worse than its better card alone is flagged as a clash. The value is measured, not
  hand-written.
- **Examples.** Cheapest Pick on top of LIS Anchor is an overlap: the anchor saves 65 ops on
  its own at n=100, but only 41 once Cheapest Pick is in (sim). Peephole after a cost model
  that already merges `rr` is another: it has little left to merge. `rb` Sink with Four-Way
  Cost is simply additive. No synergy has been measured yet; Four Ends with Thirds Split is
  the expected one.

The Meta page aggregates these into tables (see [05-meta.md](05-meta.md)).

## 2.6 The result panel

It sits on the same page, below or beside the hand:

- **Scoreboard:** total ops, the grade for this n, ops per type (in the `--bench` layout), CPU
  time, and validity ✓/✗ from the independent replay.
- **Delta strip:** what the last card added or removed, for example "+`rb` Sink: −14 ops".
- **Board:** stacks A and B with the transport bar (first, previous, play, next, scrubber,
  speed, next phase). Each step shows its op, its phase tag, why it happens, and the card's
  overlay (cost table, chunk ranges, LIS set, partition tree, radix bit).

## 2.7 Grades

The subject's thresholds become grade badges. These are the official numbers from the
push_swap subject.

| n | FAIL | PASS | GOOD | EXCELLENT |
| --- | --- | --- | --- | --- |
| 100 | ≥ 2000 | < 2000 | < 1500 | < 700 |
| 500 | ≥ 12000 | < 12000 | < 8000 | < 5500 |

The evaluation grades **each run**, not the mean. The result panel therefore shows, next to
the badge of the mean, the share of runs under each threshold.

For other n, each threshold is interpolated through the two official points with a power law,
T(n) = T(100) · (n / 100)^p with p = log(T(500) / T(100)) / log 5. That gives p ≈ 1.11 for
PASS, 1.04 for GOOD and 1.28 for EXCELLENT. The badge is then shown as approximate (~), and
outside 100–500 it is an extrapolation. A single c · n log₂ n curve cannot pass through both
points: for EXCELLENT, c is 1.054 at n=100 but 1.227 at n=500.

## 2.8 Rarity

Rarity reflects **how often peers use the card**. It is not a measure of strength.

| rarity | meaning | examples |
| --- | --- | --- |
| Common | in most 42 push_swaps | Hardcoded Three, Min Extract, Radix, Turk, Chunks |
| Uncommon | well known, less used | Butterfly, Quick 2-Way, Peephole |
| Rare | seen in strong builds | LIS Insertion, Four-End Quicksort, BFS Leaf |
| Legendary | research-grade, rarely attempted | DP Splits, Beam Sorter, Beam Leaf |

## 2.9 Modes

- **Sandbox:** no slot limits, everything unlocked. The Table always plays this way.
- **Path:** a guided learning sequence. Each step unlocks the next card and explains what it
  fixes about the previous one. For example: Bubble Wheel → Min Extract → Simple Insertion →
  LIS Insertion → Turk. See [08-views.md](08-views.md).

## 2.10 Tone

The theme is playful but the text is precise. A card's tagline can be fun. Its stats, pros,
cons and explanation are plain and accurate. Game words never replace technical terms: the
Codex always says "cheapest insertion", even if the card is called "Turk".
