# ■ Bucket family

Split values by **rank range** (chunks or buckets). Move each range across cheaply, then order
the values inside each range on the way back. With about √n ranges, both phases cost
O(n√n).

---

## Chunks — *"Ship it in crates"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n√n) · ~ (✓ with K ∝ √n and One-Way Sweep) | 662 sim EXC | 5927 sim GOOD | 3 | 6 | Common |

**The idea.** Cut the numbers into a few ranges, like crates. Ship the smallest crate to B first, then the next one; at the end, bring the numbers back biggest first.

**Step by step.**
1. Split the ranks into K equal ranges: 5 crates for 100 numbers, 11 for 500.
2. For the first crate, bring its nearest member in A to the top and push it to B. Members from the lower half of the crate go to the bottom of B (`rb`).
3. Repeat, crate by crate, until A is empty.
4. Bring B's biggest number to the top and push it back, again and again.

**Under the hood.** Split the ranks into K chunks (the sim uses K = round(√n / 2): 5 chunks at
n=100 and 11 at n=500). For each chunk in order: bring its nearest member in A to the top (by
either direction) and `pb`. If the value is in the lower half of its chunk, also `rb` (a
"sink"), so B forms an hourglass. When A is empty, repeatedly bring B's max to the top and
`pa`.

**Lore.** Bucket sort's idea (split by range, then order within each range) dates from the
punched-card era. In push_swap it is folk 42 knowledge, usually the first 'medium' method peers
find.

**Pros**
- Intuitive and easy to visualise.
- EXCELLENT at n=100 on average, though 5 % of runs reach 700 or more (sim).
- The upgrade path is short and measured. One-Way Sweep is both cheaper and provable (−16 at
  n=100, −140 at n=500), Second-Max saves 26 / 385, and K ≈ 0.4√n is the best chunk count.
  Together they make the Crate Runner deck: 606 / 5247, EXCELLENT on every run (sim).

**Cons**
- Sensitive to the chunk count, but tuning alone does not reach EXCELLENT at n=500: the best
  K is 9, at 5858 (sim). Web write-ups report ~4900–5035 at n=500 with retrieval tricks this
  card's defaults lack.
- Max retrieval rescans B every time. That is fine for ops, but O(n²) CPU.
- A constant chunk count (not ∝ √n) quietly breaks the O(n√n) claim. So does the default
  Nearest-Member Sweep, which can pass the same value many times.

**Slots:** 3, from anchor (with a caveat), sweep, band, retrieval and order. Defaults:
Nearest-Member Sweep, `rb` Sink and Max Retrieval, which are what the measured numbers use.
Param: the chunk count K.

---

## Butterfly (K-sort) — *"A sliding window"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n√n) · ✕ with a constant w; ✓ with w = k·√n | 577 sim EXC | 5080 sim EXC | 3 | 5 | ~80 | Uncommon |

**The idea.** Push the numbers to B in roughly increasing order through a sliding window: the ones that are due sink to B's bottom, the ones just above them stay on top, and the rest wait their turn.

**Step by step.**
1. Keep a count of how many numbers have been pushed, and a window width w.
2. If A's top number is among the numbers already due, push it and sink it to B's bottom (`pb` then `rb`).
3. If it falls inside the window just above those, push it to B's top (`pb`).
4. Otherwise rotate A (`ra`) and look at the next one.
5. When A is empty, bring B's biggest number back, again and again.

**Under the hood.** Keep a counter i of how many values have been pushed so far. For A's top x:
if rank(x) ≤ i, then `pb` + `rb` (sink it); else if rank(x) ≤ i + w, then `pb`; otherwise
`ra`. This produces a "butterfly" shape in B. Then retrieve the max of B repeatedly. The sim
uses w = 15 at n=100 and w = 30 above, like one reference build, which makes w a constant
beyond n=100. With w = round(1.4√n) instead (14 and 31), it measures the same at the grading
sizes, 577 / 5077, and keeps its class (sim).

**Lore.** A folk 42 name for the shape B takes: low values sunk to the bottom, high ones on
top, like two wings. No published origin.

**Pros**
- Very short code for its strength. It beats Chunks at both sizes in the sim.
- No chunk bookkeeping.

**Cons**
- With a constant w, the cost per value grows with n, so claiming O(n√n) is wrong unless w
  scales with √n. The grading sizes hide it: ops ÷ n√n is 0.45 at n=1000 and only climbs
  after, to 0.61 at n=4096 (sim).
- Retrieval is still a blind max search. Second-Max saves 19 at n=100 and 279 at n=500 (sim).

**Slots:** 2, from band and retrieval. The window rule is native: it decides which value is
pushed next and, through its sink, where it lands. Defaults: `rb` Sink (through the window
rule) and Max Retrieval. Param: the window w.

---

## Bucket Insertion — *"Crates, then careful unpacking"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n√n) · ✓ | 606 sim EXC (576 ref) | 4291 sim EXC (4121 ref) | 8 | 12 | Rare |

**The idea.** Ship the numbers to B in crates, like Chunks, then unpack each crate the smart way: from the highest crate down, move back whichever member is cheapest to put in its place.

**Step by step.**
1. Split the ranks into buckets of about c·√n.
2. Push them bucket by bucket in a single sweep, sinking the lower half of each bucket to B's bottom.
3. Starting with the highest bucket, pick the member that costs the fewest turns, both stacks together, to put in its spot in A, and push it back.
4. When B is empty, turn A so the smallest number is on top.

**Under the hood.** Buckets of about c·√n ranks (a reference build uses ⌊4√n⌋), each pushed in a
**One-Way Sweep**, with lower-half sinking. The return is **cheapest insertion restricted to
the current bucket**: pick the member of the highest remaining bucket whose combined A and B
rotation is cheapest, sharing `rr`/`rrr`. Restricting the choice to one bucket keeps the
O(n√n) proof valid.

**Lore.** A recombination rather than an invention: Chunks' buckets plus Turk's cheapest
return, restricted per bucket so the proof survives. One reference build did it this way.

**Pros**
- Takes Turk's cost-based return and gives it a provable O(n√n) bound. This makes a strong
  "medium" method for the subject.
- It is the medium method of one reference build: 576 / 4121 (ref, 5 seeds). The sim's
  version measures 606 / 4291, EXCELLENT on every run. Either way it beats Turk at n=500 with
  a provable class.

**Cons**
- Two phases, each with its own tuning.
- The proof needs care: an unrestricted cheapest pick breaks it.

**Slots:** 3, from sweep, band, cost and order. The bucket-restricted pick and return are
native. Defaults: One-Way Sweep, `rb` Sink and Two-Way Cost. Param: the bucket width.

---

## Bucket Beam — *"Plan the crates, fill each one in its best order"*

| class | @100 | @500 | Grasp | Craft | rarity |
| --- | --- | --- | --- | --- | --- |
| O(n√n) · ✓ | 488 ref EXC | 3394 ref EXC | 18 | 58 | Legendary |

**The idea.** Cut the numbers into small crates the way a careful planner would, then empty each
crate into A in the best order there is: keep the part already in order where it stands, and
slot the others in, choosing their order by trying many orders at once.

**Step by step.**
1. Split the stack three ways by rank, sending the parts to the other ends, as Four-End
   Quicksort does, with each split's sizes taken from a plan worked out in advance.
2. Stop splitting at crates of about √n numbers.
3. In each crate, keep its longest increasing run in A and push the rest to B.
4. Insert the pushed numbers back one by one, in the order a beam search finds cheapest, turning
   both stacks together where it can.

**Under the hood.** The study's best `--medium` (claude-opus-5.5-max), ported op for op. Its
buckets come from **DP Splits** in forced mode: every chunk of at most b = ⌈√n⌉ values is a
leaf, whose expected cost is that build's measured insertion cost, and the planner chooses the
three-way splits above it. Each bucket keeps a **longest increasing subsequence** in A (scanned
from the end its values sit nearest to) and pushes the rest; then a **beam over insertion
orders** (width about 1 800 000 / b², at most 2000) inserts them, each move turning A to the
slot and B to the value, sharing `rr`/`rrr`, then `pa`. The build also tries two sweep layouts
and keeps the shortest stream (a portfolio); on random input the planned layout always won, so
the card is that layout alone.

**As built (ref).** With both peepholes, 488.0 / 3394.2 on the study's seeds 1000–1004, against
the build's 488.2 / 3394.4 (its one-pass peephole saves one more move on two of the ten inputs);
without them, every stream is identical to the build's, move for move (`tests/planned.test.mjs`).

**Lore.** A recombination of the study's strongest ideas: Four-End Quicksort's exact-rank
splits, DP Splits' planning, the LIS anchor of the insertion builds, and a beam over insertion
orders. The bound needs only the bucket size: O(b²) per bucket of b values, whatever the order.

**Pros**
- The best measured medium method: 488 / 3394, ahead of Bucket Insertion (576 / 4121, ref)
  with the same provable class.
- Each idea is a card you can study alone: Four Ends, DP Splits, LIS Anchor, Beam over Orders.

**Cons**
- Legendary Grasp and Craft (18 and 58 functions): a planner, an LIS and a beam in one method.
- It is slow for push_swap: about 0.7 s a sort at n=500 in JavaScript.
- On inputs with long sorted runs the planned layout loses to a plain sweep; the build's
  portfolio kept those, this card does not.

**Slots:** none. Built in: Four Ends, DP Splits, LIS Anchor and Beam over Orders.
