# ✺ Search family

Explore many possible op sequences and keep the best by some score. These cards trade CPU
time for ops, and they appear in the strongest builds.

---

## Lookahead Greedy — *"Think k moves ahead"*

| class | @100 | @500 | Grasp | Craft | Lines | Speed | rarity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| O(n²·bᵏ) CPU · heuristic | 557 sim EXC | 5284 sim EXC | 6 | 6 | ~300 | ●●○○○ | Rare |

**The idea.** Turk, but it looks one move further: it makes the move whose cost plus the best move after it is lowest, instead of the cheapest move on its own.

**Step by step.**
1. Price every candidate move, as Turk does.
2. For the cheapest few, also price the best move that would follow each one.
3. Make the first move of the cheapest pair.
4. Plan again after every move.

**Under the hood.** Turk, but instead of taking the single cheapest move, evaluate the best
**sequence** of k moves (for example k = 2: the cost of this move plus the cheapest next move
after it). Only consider the top b candidates per level to bound the CPU cost.

The sim measures k = 2 among the 10 cheapest moves, re-planning after every move.

**Lore.** Lookahead is the oldest idea in game-playing programs: Shannon's 1950 chess paper
already proposed looking a few moves ahead. Here it turns out not to help (see the card), which
is itself the lesson.

**Pros**
- Built on Turk's code, so it is a short step from it.
- The idea is right: Turk's short-sightedness does cost ops, as Beam over Orders shows on LIS
  Insertion.

**Cons**
- **It is not an upgrade.** At n=100 it ties Turk (557); at n=500 it is worse, 5284 against
  5088, and only 96.5 % of its runs are EXCELLENT (sim). Re-planning every move, it keeps
  paying now for a cheap next move it then never takes. Committing to both moves halves the
  loss (+88 at n=500) but does not turn it into a gain.
- CPU grows with bᵏ.

**Slots:** 2, from anchor and band. The lookahead pick and its pricing are native, and it has
no order role: the lookahead already searches over the next moves. Defaults as Turk: Keep
Three and Hardcoded Three.

---

## Beam Sorter — *"Keep the best few futures"*

| class | @100 | @500 | Grasp | Craft | Lines | Speed | rarity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| heuristic | 503 exp EXC | 4562 exp EXC | 10 | 10 | ~600 | ●○○○○ | Legendary |

**The idea.** Explore many move sequences at once, but keep only the most promising few at every step: smarter than one greedy choice, and far cheaper than trying everything.

**Step by step.**
1. Start with the input as the only plan.
2. Extend every plan by each useful next move.
3. Score each new plan by its moves so far plus a guess of the moves still needed.
4. Keep the W best plans, and repeat until one of them sorts the stack.

**Under the hood.** Keep the W best partial solutions (the beam). At each step, expand each
partial solution by the useful next moves, score every candidate with (ops so far + heuristic
estimate of the remaining cost), and keep the top W. The heuristic can be a **pattern
database**: exact distances for small groups of ranks, summed. Applied to the whole problem,
the beam is too slow at 500, so the strongest reference build uses it **inside** other cards:
for leaves of up to ~32 values and for choosing insertion orders.

**As built (exp).** The explorer's Beam Sorter searches whole insertion plans on the Insertion
bench (LIS kept, `rb` Sink in pass 1): W = 64 plans, each expanded by its 4 cheapest next
insertions, scored by ops so far plus h × (mean cheapest cost of the values left) × √(values
left), with h = 0.25. It measures 503 at n=100, the best single card at that size, but 4562 at
n=500, worse than Long Line's 4425, and it takes about 26 s per sort there in JS (exp). That keeps
the verdict: a whole-problem beam pays at n=100 and is the wrong tool at n=500.

**Lore.** Beam search comes from speech recognition: Bruce Lowerre's Harpy system (1976) kept
only the best few hypotheses at each step to stay fast. Pattern databases come from puzzle
solving (Culberson and Schaeffer, mid-1990s): precompute exact costs for small parts and use
them as estimates. They are what later made optimal Rubik's Cube solving possible.

**Pros**
- The strongest known results come from search layered on a structured algorithm. The
  reference build that uses it inside Four-End Quicksort averages 420 / 3111 on that method
  (ref, 5 seeds).
- One knob, W, trades CPU for ops.

**Cons**
- The Grasp and Craft limits of the deck: hashing, memory limits, heuristics, a time budget.
- Hard to justify as "one method" in the README. The subject wants a stated complexity class.

**Slots:** none. Params: the beam width W and the heuristic. Inside other cards, the same
search plays as Beam Leaf (a Finisher) and Beam over Orders (order).

---

## Annealer — *"Shake it until it settles"*

| class | @100 | @500 | Grasp | Craft | Lines | Speed | rarity |
| --- | --- | --- | --- | --- | --- | --- | --- |
| heuristic | 575 exp EXC | 5060 exp EXC | 8 | 6 | ~200 | ●○○○○ | Legendary |

**The idea.** Take a working plan, such as where Chunks cuts its crates, and keep making small random changes, keeping the ones that help. Early on it also accepts some worse changes, so it does not get stuck.

**Step by step.**
1. Start from a plan, such as Chunks' crate boundaries.
2. Change it a little at random and count the moves again.
3. Keep the change if it is better, or sometimes even if it is worse while the temperature is still high.
4. Cool down step by step, until it stops changing.

**Under the hood.** Simulated annealing over a **plan**, not over raw ops. The plan can be the
insertion order (LIS Insertion), the chunk boundaries (Chunks), or the pivots (quicksort). Make
a small random change, re-simulate, and keep the change if it is better (or occasionally if it
is worse, with a probability that falls over time).

**Lore.** Simulated annealing (Kirkpatrick, Gelatt and Vecchi, 1983) copies how metal cools:
early on, accept bad moves often, so the search can escape local optima; later, almost never.

**Pros**
- Works with any card that has a plan to tweak.
- Easy to bolt on top of an existing build.

**Cons**
- Not deterministic unless seeded.
- Each candidate needs a full re-simulation, which is slow.
- **As built (exp):** annealing over the chunk boundaries of Crate Runner (Chunks with One-Way
  Sweep and Second-Max), 400 trials: 575 / 5060 against Crate Runner's 607 / 5226. About
  0.1 s per sort at n=100 and 3 s at n=500 in JS. The gain is real but small: plans are
  cheap to perturb, and the boundaries barely matter once the sweep and retrieval are good.

**Slots:** none. Param: what to perturb. Inside another card, the same idea plays as the
Annealed Plan technique (order).
