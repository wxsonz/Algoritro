# ■ Bucket family

Split values by **rank range** (chunks or buckets). Move each range across cheaply, then order
the values inside each range on the way back. With about √n ranges, both phases cost
O(n√n).

---

## Chunks — *"Ship it in crates"*

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n√n) · ~ (✓ with K ∝ √n and One-Way Sweep) | 662 sim EXC | 5927 sim GOOD | 4 | 4 | ~150 | Common |

**How it plays.** Split the ranks into K chunks (the sim uses K = round(√n / 2): 5 chunks at
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

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n√n) · ✕ with a constant w; ✓ with w = k·√n | 577 sim EXC | 5080 sim EXC | 4 | 4 | ~80 | Uncommon |

**How it plays.** Keep a counter i of how many values have been pushed so far. For A's top x:
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

| class | @100 | @500 | Grasp | Craft | Lines | rarity |
| --- | --- | --- | --- | --- | --- | --- |
| O(n√n) · ✓ | 606 sim EXC (576 ref) | 4291 sim EXC (4121 ref) | 6 | 6 | ~300 | Rare |

**How it plays.** Buckets of about c·√n ranks (a reference build uses ⌊4√n⌋), each pushed in a
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
