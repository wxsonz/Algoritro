# Sweep and band techniques

Two roles, one card each per hand. They can be played together, for example Chunks' default
Nearest-Member Sweep with its default `rb` Sink.

- **band:** where pushed values land in B. `rb` Sink, Multi-Band, `sb` Seed, Middle-Out Push.
- **sweep:** which value of A is pushed next, and how A rotates to reach it. Nearest-Member
  Sweep, One-Way Sweep.

## `rb` Sink (Two Bands) — *"Low ones to the floor"*

**The idea.** When a pushed number is from the lower half of its range, drop it to the bottom of B, so B splits into a high band on top and a low band below.

**Under the hood.** Role: band. Right after pushing a value from the lower half of its range, `rb` it to the bottom
of B. B becomes two bands (an "hourglass"): high values near the top, low values near the
bottom. When the next op is an `ra`, the `rb` merges into one `rr`.

- **Measured:** on LIS Insertion, −14 at n=100, −93 at n=200 and −616 at n=500 (sim). The
  effect grows with n. The split point is a param: sinking below 0.4·n or 0.5·n is best, and
  0.7·n costs +23 / +222 (sim).
- **Pros:** cheap to add. Retrieval rotations shorten because B is roughly ordered.
- **Cons:** an extra `rb` per sunk value, unless it pairs with an `ra`.
- **Hosts:** Chunks and Bucket Insertion (default), Butterfly (through its window rule),
  Simple Insertion, LIS Insertion, Turk (variant).

## Multi-Band — *"More floors"*

**The idea.** Split B into more than two bands, using both of its ends.

**Under the hood.** Role: band. Generalise to k bands, using both the top and bottom of B with a split per band.

- **Not buildable as written:** B has only two cheap ends, so a third band has nowhere to go
  without rotating past the others. Its measurable part is the split point of `rb` Sink, which
  is a param of that card (see above). Proposal: drop this card, or make it the split param.
- **Pros:** B is closer to sorted before retrieval.
- **Cons:** more bookkeeping.

## `sb` Seed

**The idea.** After Turk pushes its first two numbers, swap them if needed so B starts in order.

**Under the hood.** Role: band. After Turk's opening `pb pb`, `sb` if needed so the two seeds are in descending
order.

- **Measured:** +0.3 on Turk at both sizes (sim): the `sb` it sometimes spends is not won back.
- **Pros:** one op, and slightly better early targets.
- **Cons:** a net loss, however small.
- **Hosts:** Turk.

## Nearest-Member Sweep

**The idea.** To find the next number of a crate, look both up and down A and take the nearer one.

**Under the hood.** Role: sweep. When pushing a chunk, bring the **nearest** member of the chunk to the top,
searching both directions, instead of rotating `ra` until one appears.

- **Pros:** none measured. It looks smarter than a blind `ra` sweep, but on Chunks it costs
  16 more ops at n=100 and 140 more at n=500 (sim).
- **Why it loses:** an `ra` sweep gets every member for free, because each `pb` takes the top
  value and so moves the sweep forward. An `rra` sweep pays one `rra` for every value it pulls
  up, members included. Picking the nearest member by distance alone ignores that.
- **Cons:** it can pass the same value many times, which weakens the O(n√n) proof.
- **Hosts:** Chunks (default), Bucket Insertion (with a caveat: it breaks the proof).

## One-Way Sweep — *"Pass each value once"*

**The idea.** Sweep each crate in one direction only and never turn back, so every number is passed at most once.

**Under the hood.** Role: sweep. Per chunk, pick a direction and sweep once, never reversing. Price the two
directions honestly: an `ra` sweep pays only for the non-members it passes, while an `rra`
sweep pays for every value it pulls up, members included. So `ra` nearly always wins.

- **Pros:** gives a clean O(n√n) argument, because each chunk pass costs ≤ n. It is also the
  cheapest sweep measured: −16 at n=100 and −140 at n=500 against Nearest-Member on Chunks
  (sim).
- **Cons:** priced by distance alone, without the `rra` surcharge, it picks `rra` too often,
  loses that edge and ties Nearest-Member.
- **Hosts:** Bucket Insertion (default), Chunks.

## Middle-Out Push

**The idea.** Push the middle chunks first, then the ones further out, above and below, so B ends up sorted chunk by chunk.

**Under the hood.** Role: band. Push the chunks from the middle outwards: chunks above the middle go on top of B,
chunks below it are sunk. B ends up sorted chunk by chunk, from the highest at the top to the
lowest at the bottom.

- **Measured:** instead of `rb` Sink on Chunks, +141 at n=100 and +1794 at n=500 (sim). The push
  phase costs the same; the whole loss is in retrieval.
- **Why it loses:** `rb` Sink splits each chunk across B's top and bottom, so max retrieval only
  searches half a chunk in either direction. Here each chunk sits whole on one side, so
  retrieval searches all of it.
- **Hosts:** Chunks.
