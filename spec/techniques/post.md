# Post techniques

They rewrite the finished op stream, or act on each op as it is emitted. They work with
**every** Algorithm card. Post cards stack, run in the order played, and use no slot.
Double-Op Sharing is also a post card; it is described with the cost cards in
[pick-cost.md](pick-cost.md).

## No-op Suppression

**The idea.** Leave out moves that do nothing, such as rotating a stack that holds a single number.

**Under the hood.** Drop an op that changes nothing at the moment it is emitted: rotating or swapping a stack of
size < 2, or pushing from an empty stack. Record `rr` with one idle half as the single half.

- **Measured:** under 0.5 op per stream on every sim card: Long Line 0.4 (a sink with one value
  in B), Four-End Quicksort 0.4, Butterfly 0.05, the rest 0 (sim).
- **Pros:** makes every later rewrite an exact identity.
- **Cons:** none.

## Peephole Cancel

**The idea.** Remove moves that undo each other straight away, such as `ra` then `rra`.

**Under the hood.** Remove adjacent inverse pairs: `ra/rra`, `rb/rrb`, `rr/rrr`, `pa/pb`, `sa/sa`, `sb/sb`. Do it
in one left-to-right pass that treats the output as a stack, so cascades also cancel.

- **Measured:** on LSD Radix, −78 at n=100 and −55 at n=500: the `pb`s that end a pass are
  undone by the `pa`s that follow. Under one op on Turk and LIS hosts (sim): hosts that plan
  carefully leave little to cancel.

## Peephole Fuse

**The idea.** Merge two neighbouring moves into one double move: `ra` then `rb` becomes `rr`.

**Under the hood.** Merge adjacent halves: `ra+rb → rr`, `rra+rrb → rrr`, `sa+sb → ss`.

- **Measured:** −17 at n=100 and −106 at n=500 on Chunks, and −20 / −166 on Butterfly, mostly
  a sunk value's `rb` meeting the next `ra`. Nothing on LSD Radix, which never rotates B, and
  under one op on Turk and LIS hosts, which already share rotations (sim). Together with
  Peephole Cancel on Four-End Quicksort: −33 / −217.

## Commutation Peephole

**The idea.** Moves on different stacks can trade places, so it reorders them to let more pairs cancel or merge.

**Under the hood.** Ops on different stacks commute. For example, `ra pb`… cannot be reordered, but `ra rb` can be
pulled together across an unrelated op on the other stack. Reorder within a window before
cancelling and fusing.

- **Measured:** after Cancel and Fuse, a window of 8 ops finds nothing more on any sim card
  except Four-End Quicksort, −0.15 at n=100 (sim). A reference build measured −0.4 and
  rejected it.
- **Lesson:** most of the value is already caught by the simple peephole.
