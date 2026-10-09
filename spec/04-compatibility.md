# 4. Compatibility

When an Algorithm card is played, the Technique rail shows only the cards whose role it
accepts. The data in this file becomes `data/compat.json` (see
[06-architecture.md](06-architecture.md)).

**Slot roles** hold one card each: anchor, pick, cost, sweep, band, retrieval, ends, split,
pivot and order. A card played into one of them uses a slot.

**Free roles** use no slot. **Prep** and **post** cards fit every algorithm and stack, and post
cards run in the order played. Rank Compression (prep) and Double-Op Sharing (post) are always
on.

**Finisher.** A leaf card is a Finisher. It goes in the hand's own Finisher slot: one per hand,
optional.

**Natives and defaults.** A **native** is part of the algorithm and is locked. A **default**
fills an open role until you replace it. A default in plain words below is the card's own
built-in behaviour, not a technique card. Natives and defaults use no slot, so a card's
**slots** count the techniques you add or swap in. A card never has more slots than open
roles.

**Params**, such as the chunk count, the window w or a search variant, change only how the card
itself behaves. They are settings, not techniques, and use no slot.

## 4.1 Roles by algorithm

**Legend:** defaults are in brackets · **~** playable with a caveat (shown on hover) · a role
that is not listed is incompatible (greyed out, with a reason).

| algorithm | slots | native (locked) | open roles (default) | Finisher (default) |
| --- | --- | --- | --- | --- |
| Hardcoded Three | 0 | — | — | — (plays as a Finisher) |
| Five Hand | 0 | — | — | ✓ (Hardcoded Three, its inner sort) |
| Oracle | 0 | — | — | — (plays as BFS Leaf) |
| Bubble Wheel | 0 | — | — | — |
| Min Extract | 0 | anchor: Keep Three | — | ✓ (Hardcoded Three) |
| Twin Extract | 0 | — | — | ✓ (Hardcoded Three, the measured default) |
| Insert-into-B | 2 | — | anchor ~, pick, cost | — |
| Simple Insertion | 4 | — | anchor, pick, cost, band, order | — |
| LIS Insertion | 3 | anchor: LIS Anchor · pick: Cheapest Pick | cost (Two-Way Cost), band, order | — |
| Turk | 3 | pick: Cheapest Pick | anchor (Keep Three), cost (Four-Way Cost), band, order | ✓ (Hardcoded Three) |
| Chunks | 3 | — | anchor ~, sweep (Nearest-Member Sweep), band (`rb` Sink), retrieval (Max Retrieval), order | — |
| Butterfly | 2 | sweep: the window rule | band (`rb` Sink, through the window rule), retrieval (Max Retrieval) | — |
| Bucket Insertion | 3 | pick and retrieval: cheapest, within the current bucket | sweep (One-Way Sweep), band (`rb` Sink), cost (Two-Way Cost), order | — |
| Bucket Beam | 0 | ends: Four Ends · split: DP Splits · anchor: LIS Anchor · order: Beam over Orders | — | — |
| LSD Radix | 0 | — | — | — |
| Ternary Radix | 0 | — | — | — |
| MSD Radix | 0 | — | — | ✓ (built in: `sa`/`sb` on leaves of 2) |
| Quick 2-Way | 4 | — | ends (two ends, rotations restored), split (halves), pivot (Median Pivot), order | ✓ (built in: `sa`/`sb` on leaves of 2; BFS Leaf once Four Ends is played) |
| Four-End Quicksort | 3 | ends: Four Ends | split (Thirds Split), pivot (equal thirds), order | ✓ (none: the recursion goes down to single values) |
| Tape Merge | 0 | — | — | ✓ (optional: sorts the first runs) |
| Natural Merge | 0 | — | — | — |
| Lookahead Greedy | 2 | pick and cost: cheapest pick, priced with lookahead | anchor (Keep Three), band | ✓ (Hardcoded Three) |
| Beam Sorter | 0 | — | — | — |
| Annealer | 0 | — | — | — |

## 4.2 Incompatibility reasons

These are shown on hover over a greyed-out card or a ~ caveat. A caveat can also attach to one
card on one host.

- **Radix + any slot role:** "Radix never chooses which value to move or where it lands, and
  never prices a rotation. Every value is visited once per digit."
- **Selection cards + cost:** "A selection card has one candidate per step: the min (or
  max). There is nothing to compare."
- **Cards with no slots + any slot role:** "This card has no technique role. Its knobs are
  params, such as the search variant or the beam width."
- **Butterfly + anchor:** "The window rule pushes every value. An anchor has nothing to
  keep."
- **Butterfly + sweep:** "The window rule is the card: it decides which value is pushed next."
- **Divide cards + sweep or band:** "Divide cards place values through their ends, split and
  pivot roles."
- **Chunks + anchor (~):** "Possible (skip LIS values while sweeping), but kept values sit
  between chunk members and add rotations. Expect a small effect."
- **Insert-into-B + anchor (~):** "The anchor stays in A, but this card inserts into B.
  Use the mirrored form: keep a decreasing run in B."
- **Bucket Insertion + Nearest-Member Sweep (~):** "Playable, but a nearest-member sweep can
  pass the same value many times. That breaks the O(n√n) proof that One-Way Sweep gives."

## 4.3 Requires and conflicts

Cards in the same role always exclude each other, so those pairs are not listed: for example
Four-Way and Two-Way Cost, One-Way and Nearest-Member Sweep, or any two anchors.

- A requirement on **another role** is met by a card played there, or by the host's native or
  default card there.
- A requirement on the card's **own role** names the host default that the card replaces. The
  card only fits hosts whose default in that role is the named card.

A **default steps aside** when a played card conflicts with it: Thirds Split on Quick 2-Way
removes its default Median Pivot, and Median Pivot on Four-End Quicksort removes its default
Thirds Split (it then splits in halves). A played card that conflicts with another played card
is an error.

**Built hosts.** A technique lists the hosts it is built on. On any other host whose role is
open it shows greyed out as an **open space** (◌), with the reason, rather than running
something nobody has measured. Quick 2-Way with Four Ends runs the four-ends engine with 2-value
leaves, which is how the sim measured Four Ends against it.

| card | requires | also conflicts with |
| --- | --- | --- |
| Four-Way Cost | a cheapest pick, played or native | — |
| Lookahead-k | a cheapest pick, played or native | — |
| Beam over Orders | a cheapest pick, played or native | — |
| Second-Max Lookahead | Max Retrieval as the host's default retrieval, which it replaces | — |
| Thirds Split | Four Ends, or a host with a third destination | Median Pivot |
| DP Splits | Four Ends | Median Pivot, Pivot by Leaf Count |
