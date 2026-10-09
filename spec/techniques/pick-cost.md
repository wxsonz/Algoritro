# Pick and cost techniques

**Pick** decides which value moves next. **Cost** decides how a candidate move is priced and
executed.

## Cheapest Pick — *"Look at everyone before moving"*

**The idea.** Instead of always moving the top number, look at every number and move the one that costs the fewest turns.

**Under the hood.** Instead of taking the top of the source stack, evaluate every value in it and move the one
whose total rotation cost is lowest.

- **Measured:** on an LIS-anchored Simple Insertion, 1397 → 547 at n=100 (−850) and −26,817 at
  n=500 (sim). Alone, without the anchor, it takes Simple Insertion from 1462 to 588. This is
  the largest single technique effect in the deck.
- **Pros:** turns O(n²) blind insertion into an EXCELLENT-grade card.
- **Cons:** O(n) candidates per move, each needing a slot lookup. That is O(n³) CPU per sort
  with a linear slot search, and O(n² log n) with a binary search, since A is circularly
  sorted. Both are fine at 500: the sim's linear version takes about 45 ms per sort.
- **Param: the candidate window.** Only the w values nearest either end of the source stack
  are priced. On Turk, w = 20 gives the same ops at n=100 and +65 at n=500, w = 50 the same at
  both, w = 5 costs +23 / +2658 (sim). The best move is almost always near an end, so the window
  cuts CPU from O(n) candidates per move to 2w. It does not change the class.
- **Hosts:** Simple Insertion, Insert-into-B. It is native in Turk and LIS Insertion.
- **Requires:** a cost card (it defaults to Two-Way Cost).

## Two-Way Cost

**The idea.** Price a move by turning each stack the short way; when both turn the same way, they turn together.

**Under the hood.** Price each stack independently by its shorter direction. If both directions agree, the cost
is max(a, b), because `rr`/`rrr` move both stacks at once; otherwise it is a + b.

- **Pros:** simple.
- **Cons:** it misses the case where going the **longer** way on one stack lets both stacks
  share rotations.
- **Hosts:** any card with Cheapest Pick.

## Four-Way Cost — *"Price all four ways"*

**The idea.** Price all four ways of lining up both stacks (both up, both down, or one each way) and take the cheapest.

**Under the hood.** Price `rr` (max(fa, fb)), `rrr` (max(ba, bb)), `ra+rrb` (fa + bb) and `rra+rb` (ba + fb), and
take the minimum.

- **Measured:** on LIS Insertion, −4 at n=100, −9 at n=200 and −19 at n=500, and the same on
  Turk, −4 / −19 (sim). A reference build rejected it as not worth the code. Turk peers usually
  include it.
- **Pros:** per move it is never worse than Two-Way Cost, because Two-Way's choice is one of
  its four. About ten extra lines.
- **Cons:** a small gain, and not a guaranteed one. A cheaper move now can leave a worse
  layout, so over a whole sort Four-Way ends worse than Two-Way on 11 % of inputs at n=100
  and 17 % at n=500 (sim).
- **Conflicts:** Two-Way Cost.

## Double-Op Sharing

**The idea.** When both stacks need to turn the same way, turn them together with one move (`rr` or `rrr`) instead of two.

**Under the hood.** When planning a move, emit `rr`/`rrr` for the shared part instead of separate `ra` and `rb`
ops. Cost cards assume it. Without it, the planner's prices are lies.

It is a **post** card that acts as each move is emitted, like No-op Suppression, and it is
always on. It is not a cost card, so it never competes with Two-Way or Four-Way Cost for the
cost role.

- **Measured:** switching it off costs Turk +98 at n=100 and +1224 at n=500, and Long Line
  +69 / +852 (sim). It is the biggest effect after Cheapest Pick itself.
- **Pros:** without it, Cheapest Pick saves much less.
- **Cons:** none. It is listed so peers notice that it is a choice.

## Lookahead-k — *"Price the move after next"*

**The idea.** Price a move together with the best move right after it, not on its own.

**Under the hood.** Score a candidate by its cost plus the cheapest follow-up move after it (depth k, keeping the
top-b candidates).

- **Measured (k = 2):** it makes things **worse**. Among the 3 cheapest moves: Turk −2 at n=100
  but +175 at n=500, Long Line +25 / +297; among the 10 cheapest it is no better (sim).
- **Why it loses:** it re-plans after every move, so it keeps paying extra now for a cheap
  follow-up it then never takes. Committing to both moves of the best pair halves the loss at
  n=500 (+88 instead of +175), but it is still worse than the plain greedy (sim). Beam over Orders, which compares
  whole partial plans, is the version that gains.
- **Cons:** CPU grows with bᵏ.
- **Hosts:** Turk, LIS Insertion, Bucket Insertion.
