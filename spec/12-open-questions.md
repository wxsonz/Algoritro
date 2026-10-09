# 12. Open questions

**Decided while building (2026-10-09):** the Table is always a sandbox: slot counts are shown
but never enforced, and the toggle is gone (1). Card art is pure CSS frames with the mini replay as the art (2). The Codex shows the
explanation, not the JS (8). Presorted Shortcut stays a card you play (9). Tiers rank by mean and
every tier row shows the share of runs under its bar (11). Lesson cards stay, marked "lesson"
(12). The rest are still open.

1. **Slot limits.** Are per-card slot counts fun and clarifying, or just friction? Sandbox
   removes them anyway. Should Sandbox be the only mode at first?
2. **Card art.** Pure CSS card frames with the mini replay as the "art", or illustrated
   icons per family?
3. **Grasp and Craft scoring.** Who scores them? Proposal: the spec's scores are the starting
   point, and peers can vote on the Codex later. That needs storage, so it is out of scope for
   now.
4. **External streams.** Should the Table accept a pasted stdout from a peer's C build as an
   "Imported" Algorithm card, so it can be compared with the decks? It is cheap, and peers
   would love it, but it blurs the non-goal.
5. **Disorder axis.** Should the Disorder map allow switching the metric (inversions, runs,
   LIS deficit, displacement)?
6. **Language.** English only, or also other languages common among 42 peers? The card text
   lives in modules, so translations could be separate files.
7. **In-browser limits.** Default caps of n ≤ 1000 and 50 seeds are proposed. Beam Sorter and
   Oracle need their own caps.
8. **Hiding code.** Should the Codex show the JS for each card, or only the explanation? Showing
   it helps learning, but also invites copying.
9. **Presorted Shortcut always on?** The subject's "smallest list" means 0 ops on sorted
   input, and bare LSD Radix spends 6784 at n=500 on it. Making the card always on (like Rank
   Compression) fixes that everywhere, but hides what the card is worth.
10. **Additive difficulty.** Hand Grasp and Hand Craft add up technique costs, but measured
    effects overlap (LIS Anchor and Cheapest Pick, [05-meta.md](05-meta.md#53-interactions-seed)).
    Long Line scores 5 / 5 by the formula, the same as Beam Sorter. Should totals use the
    maximum plus a smaller increment instead?
11. **Tiers by pass rate?** Tiers rank hands by their mean, but the evaluation grades each run.
    Should a tier also require, say, 95 % of runs under its bar?
12. **Cards that measure as losses.** Lookahead-k, `sb` Seed and Middle-Out Push make things
    worse, and Multi-Band cannot be built as written. Keep them as lesson cards, the way Cursed
    cards teach, or drop them?
13. **Zero-slot cards.** Eleven Algorithm cards, Hardcoded Three among them, have no technique
    slot: their knobs are params. Is a card with nothing to play into still fun on the Table,
    or should those cards live mainly in Paths and the Codex?
