# ● Insertion family

Keep one stack sorted (often only **circularly** sorted) and insert values into the right
gap. Everything here builds on one idea: the **slot** of x in a circularly sorted stack is the
gap between its predecessor and successor, and you can reach it by rotating either way.

---

## Insert-into-B — *"Keep B sorted as you go"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n²) · ✓ | 1459 sim GOOD | 32251 sim FAIL | 4 | 5 | Uncommon |

**The idea.** Move the numbers to B one at a time, each straight into its right place, so B is always sorted. Then pour B back into A.

**Step by step.**
1. Take the number on top of A.
2. Turn B the short way until the gap for that number is at the top.
3. Push the number in (`pb`).
4. When A is empty, turn B so its biggest number is on top, and push everything back.

**Under the hood.** Take A's top, rotate B (the shorter way) until the slot for that value is on
top, then `pb`. B stays circularly sorted in descending order. At the end, rotate B's max to
the top and `pa` everything.

**Lore.** Plain insertion sort, as when you slide each new card into place in your hand. The
twist here is the circular slot.

**Pros**
- It introduces the circular slot, the core idea of the whole family.

**Cons**
- It never chooses *which* value to insert, so it pays for every unlucky one.
- About the same count as Min Extract.

**Slots:** 2, from anchor (mirrored, with a caveat), pick and cost.

---

## Simple Insertion — *"Empty A, then insert back"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n²) · ✓ | 1462 sim GOOD | 32242 sim FAIL | 4 | 5 | Uncommon |

**The idea.** Move everything to B, then bring the numbers back one by one, each into its right place in A.

**Step by step.**
1. Push every number to B.
2. Take the number on top of B and turn A until its spot is on top.
3. Push it back (`pa`), and repeat until B is empty.
4. Turn A so the smallest number is on top.

**Under the hood.** `pb` everything. Then repeatedly take B's top, rotate A to its slot, and `pa`.
Finish by rotating A's minimum to the top.

**Lore.** Same idea as Insert-into-B, mirrored. No separate history.

**Pros**
- This is the base that every Insertion technique plugs into. It is the cleanest card for
  measuring what each technique is worth.

**Cons**
- It pushes values that were already in a good order.
- It takes values blindly from B's top.

**Slots:** 4, from anchor, pick, cost, band and order. With Quick 2-Way, it has the most
slots of any card. It is the main **lab bench** for Insertion techniques.

---

## LIS Insertion — *"Keep the longest ordered line, insert the rest"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n²) · ✓ | 547 sim EXC | 5059 sim EXC | 10 | 13 | Rare |

**The idea.** Some numbers are already in a good order. Keep the longest such line in A, move only the rest, and insert those back where they belong, cheapest first.

**Step by step.**
1. Find the longest line of numbers in A that already goes up.
2. Walk A once: rotate past the numbers on that line, push the others to B.
3. Bring the numbers back from B, always the one that is cheapest to place, turning both stacks together when they go the same way.
4. Turn A so the smallest number is on top.

**Under the hood.** Find a longest increasing subsequence (patience sorting, O(n log n)). Pass 1:
`ra` past values on the LIS and `pb` the rest, so A becomes the LIS in circular order. Pass 2:
insert each value of B back, choosing the cheapest value in B, with A and B rotating together
(`rr`/`rrr`) when their directions agree. Final rotation of the minimum to the top.

The numbers above are the bare card, with its default Two-Way Cost. The Long Line deck adds
Four-Way Cost and `rb` Sink and measures 530 / 4425 (sim).

**Lore.** Patience sorting is named after the solitaire card game. Colin Mallows named it,
crediting A. S. C. Ross with inventing it in the early 1960s, and in 1973 Mallows noted that
the number of piles equals the longest increasing subsequence. In 1977 Logan–Shepp and
Vershik–Kerov independently proved that the LIS of a random permutation grows like 2√n. That is
why the anchor keeps only about 17 of 100 values.

**Pros**
- One of the strongest O(n²) cards. It is EXCELLENT at both sizes, on every sim run.
- It pushes the fewest values possible for a non-circular anchor: n − LIS. The LIS is about
  17 values at n=100 and 40 at n=500 (sim).
- Easy to justify in a README.

**Cons**
- Patience sorting with predecessor links is a new idea for most peers.
- The worst-case bound is quadratic, so it cannot serve as the subject's O(n log n) method.

**Slots:** 3 (cost, band, order). LIS Anchor and Cheapest Pick are native. The cost role
starts as Two-Way Cost.

---

## Turk — *"Always make the cheapest move"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n²) · ✓ | 557 sim EXC | 5088 sim EXC | 7 | 11 | Common |

**The idea.** Before every move, price every number: how many turns it takes to bring it to the top and its spot in B to the top, together. Make the cheapest move, then price again.

**Step by step.**
1. Push two numbers to B to start.
2. For each number in A, count the turns to bring it to the top and B's matching spot to the top, sharing turns when both stacks go the same way.
3. Make the cheapest of those moves and push (`pb`). Repeat until three numbers are left in A.
4. Sort those three, then bring each number back from B to its spot in A, and turn the smallest to the top.

**Under the hood.** This is the most popular 42 push_swap ("Mechanical Turk", credited to a 42
student; see sources). Start with `pb pb`. While A has more than 3 values: for **every** value
in A, find its target in B (the largest smaller value, or B's max) and price the four rotation
combinations (`rr`, `rrr`, `ra+rrb`, `rra+rb`); perform the cheapest and `pb`. Finish the last
3 with Hardcoded Three. Then return each top of B to its slot in A (the smallest larger value,
or A's min) and rotate the min to the top.

**Lore.** A 42-peer invention, popularised by a 2023 Medium post (see sources). The name comes
from the Mechanical Turk, the 1770 chess automaton that hid a human player inside: the
algorithm looks clever, but it is a brute-force check of every move. The intuition to keep:
price every option, take the cheapest, repeat.

**Pros**
- EXCELLENT on every sim run at both sizes: at n=500 the mean is 5088 and the worst of 200
  runs is 5466 (sim). Web reports range from 5100 to 6500 at n=500, depending on details.
- Easy to explain with a picture.
- Many peer write-ups exist.

**Cons**
- There are many fiddly details: targets, four cost cases, the empty-B start. Debugging is the
  main cost.
- It pushes **everything**, including values that were already in good order (compare LIS
  Insertion).
- O(n²) CPU per move (about 65 ms per sort at n=500 in the sim's JS) is fine at 500 but slow
  beyond.
- Labelling it O(n log n) is a common mistake: one insertion can cost |A|/2 + |B|/2, and the
  measured ops ÷ n log₂ n keep rising: 0.87 at n=128, 1.69 at n=2048 (sim), 2.25 at n=5000
  (ref).

**Slots:** 3, from anchor, cost, band and order. Cheapest Pick is native. Keep Three (anchor)
and Four-Way Cost (cost) are defaults, and Hardcoded Three is the default Finisher.
