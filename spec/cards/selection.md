# ▲ Selection family

Repeatedly find an extreme value and move it. These are the easiest cards to understand, and
the best way to learn what each op actually costs.

---

## Bubble Wheel — *"Turn the wheel, swap when wrong"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n²) · ✓ | 11301 sim FAIL | 301410 sim FAIL | 2 | 2 | ~25 | Uncommon |

**How it plays.** Bubble sort using only A. Each pass does, n−1 times: if the top two are out of
order, `sa`; then `ra`. One more `ra` completes the revolution. Repeat the pass until A is
sorted. B is never used.

**Lore.** Bubble sort was first described by Edward Friend in 1956 as "sorting by exchange".
Kenneth Iverson seems to have named it "bubble sort" in 1962. It survives as the first sort
people are taught, not because anyone uses it. Knuth's verdict: it "seems to have nothing to
recommend it, except a catchy name and the fact that it leads to some interesting theoretical
problems". Here it shows why a single swap op is weak.

**Pros**
- The purest illustration of the op set: it shows why `sa` alone is weak and why B exists.
- Very short.

**Cons**
- About n² ops, which fails both grades badly.

**Slots:** none. Stopping as soon as A is sorted is built in, and the measured count
includes it.
**Teaching role:** the first card of the Path. It shows the problem every later card solves.

---

## Min Extract (selection sort) — *"Grab the smallest, every time"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n²) · ✓ | 1454 sim GOOD | 32298 sim FAIL | 2 | 2 | ~40 | Common |

**How it plays.** Find the minimum of A, rotate it to the top by the shorter direction, `pb`.
Repeat until 3 remain, finish with Hardcoded Three (with only 2 values, `sa` if needed), then
`pa` everything back. B ends in descending order from the top, so the `pa`s rebuild A in
order.

**Lore.** Plain selection sort: the way anyone sorts a hand of cards by picking out the
smallest each time. No inventor to credit.

**Pros**
- Easy to prove: each extraction costs at most n/2 rotations plus 1.
- A very common choice for the subject's O(n²) "simple" slot.
- Doubles as the Five Hand.

**Cons**
- Each rotation passes over values without doing anything useful with them.
- It fails n=500.

**Slots:** none. Keep Three is native, and the Finisher is Hardcoded Three by default.
Presorted Shortcut is a prep card, so it fits without a slot.

---

## Twin Extract — *"Smallest or largest, whichever is closer"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n²) · ✓ | 1117 sim GOOD | 22318 sim FAIL | 4 | 4 | ~80 | Uncommon |

**How it plays.** At each step, find the cheaper of the current min and the current max to bring
to the top. A min goes `pb` onto the top of B. A max goes `pb` then `rb` to the bottom of B.
At the end, B holds the mins (descending from the top) above the maxes, and the maxes run
from the largest down to the smallest. Return the mins with `pa`. The largest max is now on
B's top, so `pa` the maxes one by one, then rotate that block of maxes to the bottom of A
(`ra`, or `rra` if shorter).

**Lore.** Double-ended selection (min and max at once) is a classic textbook tweak. Nothing
more to it.

**Pros**
- Cuts the average search distance by about a third compared with Min Extract: 8.6 against
  13.0 rotations per extraction at n=100 (sim). The closer of two random positions in a stack
  of m is about m/6 away, against m/4 for one.
- A natural "first optimisation" exercise.

**Cons**
- The return phase is easy to get wrong. The obvious `rrb` + `pa` per max brings the maxes
  back upside down: it sorted 0 of 1000 inputs (sim).
- Still O(n²), and still fails n=500.

**Slots:** none. A Finisher is optional, for example Hardcoded Three for the last 3.
Presorted Shortcut is a prep card, so it fits without a slot.
