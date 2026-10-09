# Retrieval techniques

They decide how values return from B to A. This is the main cost centre for Bucket cards.

## Max Retrieval

Bring B's maximum to the top by the shorter direction and `pa`. Repeat.

- **Pros:** trivially correct. A ends up sorted with no final rotation.
- **Cons:** blind. It pays the full distance to every max.

## Second-Max Lookahead — *"Grab the runner-up on the way"*

If the second-largest value is cheaper to reach than the largest (by more than ~2 ops),
`pa` it first, then `pa` the max, then `sa`.

- **Pros:** a few lines, with a steady saving of about 3–6.5 %: −26 at n=100 and −385 at
  n=500 on Chunks, and −19 / −279 on Butterfly (sim).
- **Cons:** adds `sa` ops. It needs a threshold.
- **Requires:** a host whose default retrieval is Max Retrieval. It replaces Max Retrieval in
  the retrieval role and keeps its logic.

## Rank-Range Max

Search for the max **by rank range** (for example, "the next expected rank") rather than by
scanning. It also fixes the bug of assuming a chunk stays contiguous in B.

- **Measured:** 0 by construction: it finds the same max as Max Retrieval.
- **Pros:** correctness and CPU.
- **Cons:** no ops gained.

## Cheapest Return — *"Turk on the way back"*

Instead of the max, pick the B value (optionally restricted to the current bucket) whose
B rotation plus A slot rotation is cheapest, and insert it into A's circular order. Finish by
rotating the minimum to the top.

- **Measured:** on Chunks, +21 at n=100 but −494 at n=500; restricted to the top bucket, +38 /
  −541 (sim). It pays off at n=500 only.
- **Pros:** the biggest retrieval upgrade at n=500. It turns Chunks into Bucket Insertion.
- **Cons:** brings in Turk's complexity, and it is worse than Max Retrieval at n=100.
  Restricting it to one bucket is needed to keep the O(n√n) proof.
- **Conflicts:** Max Retrieval.
