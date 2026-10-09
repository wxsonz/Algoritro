// Paths (spec/08 §8.5): guided sequences on the Table. Each step plays a deck, asks one question,
// and says what the next card fixes. Challenges (spec/02 §2.9): teaching prompts, no leaderboard.

export const PATHS = [
  { id: 'first-sort', name: 'First Sort', steps: [
    { deck: 'bubble-wheel', n: 20, q: 'Bubble Wheel only swaps the top two and turns A. How many ops does a pass cost, and how many passes does it need?', next: 'Min Extract uses B: each value is found once and pushed once.' },
    { deck: 'min-extract', n: 100, q: 'Every extraction rotates to the minimum. Watch the rotations between pushes: what do they do for the values they pass?', next: 'For 5 values, the same moves are the Five Hand.' },
    { deck: 'five-hand', n: 5, q: 'Five Hand is at most 10 ops at n=5. Is it optimal?', next: 'The Oracle searches every stream: it is the ground truth.' },
    { deck: 'oracle', n: 5, q: 'The Oracle needs 2.5 fewer ops than Five Hand on average at n=5. Open Lab › Optimality gap to see every permutation.', link: 'lab.html#gap', next: '' },
  ] },
  { id: 'insertion-ladder', name: 'Insertion Ladder', steps: [
    { deck: 'simple-insertion', n: 100, q: 'Simple Insertion pushes everything, then inserts B\'s top into its slot. Where does it waste ops?', next: 'LIS Anchor keeps the longest increasing line in A, so those values never move.' },
    { deck: 'simple-insertion+lis-anchor', n: 100, q: 'The anchor saves about 65 ops. Why not 2 per kept value?', next: 'Cheapest Pick looks at every value in B before moving.' },
    { deck: 'simple-insertion+lis-anchor+cheapest-pick', n: 100, q: 'The biggest single effect in the deck: about −850. This is the LIS Insertion card. What does it price?', next: 'Four-Way Cost also prices going the long way on one stack.' },
    { deck: 'simple-insertion+lis-anchor+cheapest-pick+four-way-cost', n: 100, q: 'A small gain (−4). On which inputs is it a loss, and why can a cheaper move now be worse later?', next: 'rb Sink splits B into two bands while pushing.' },
    { deck: 'simple-insertion+lis-anchor+cheapest-pick+four-way-cost+rb-sink', n: 500, q: 'rb Sink grows with n: −14 at 100, −616 at 500. Why does a rough order in B help the return?', next: 'Compare with Turk, which keeps three and pushes everything else by cheapest move.' },
    { deck: 'turk', n: 500, q: 'Pin this hand, step back, and compare Turk with the ladder\'s last hand. Which keeps more values still?', compare: 'lis-insertion+four-way-cost+rb-sink', next: '' },
  ] },
  { id: 'buckets', name: 'Buckets', steps: [
    { deck: 'chunks', n: 100, q: 'Chunks pushes ranges of values, sinking each chunk\'s lower half. Where do its ops go: pushing or retrieving?', next: 'One-Way Sweep never reverses inside a chunk.' },
    { deck: 'chunks+one-way-sweep', n: 500, q: 'An ra sweep gets every member for free, because each pb moves it forward. Why does Nearest-Member lose?', next: 'Second-Max grabs the runner-up on the way to the max.' },
    { deck: 'chunks+one-way-sweep+second-max-lookahead', n: 500, q: 'A few lines, −385 at n=500. What does the extra sa buy?', next: 'Butterfly replaces the chunks with a sliding window.' },
    { deck: 'butterfly', n: 500, q: 'Butterfly is short and strong, but with a constant window its class claim breaks. Try the √n preset.', next: 'Bucket Insertion returns by cheapest insertion inside one bucket.' },
    { deck: 'bucket-insertion', n: 500, q: 'Turk\'s cheapest return with an O(n√n) proof. Why does restricting it to one bucket keep the proof?', next: 'Lab › Scaling shows which claims hold.' },
    { deck: 'bucket-insertion', n: 500, q: 'Open the Lab and run the class check on Butterfly, Chunks and Bucket Insertion.', link: 'lab.html#scaling', next: '' },
  ] },
  { id: 'divide', name: 'Divide', steps: [
    { deck: 'lsd-radix', n: 100, q: 'Radix costs exactly the same on every input of this size. Try a sorted one: what happens?', next: 'Quick 2-Way splits at the median and sees existing order.' },
    { deck: 'quick-2way', n: 100, q: 'Watch the restores (rra / rrb): they undo rotations. Tick "always restore" to see what the whole-stack case of Restore Skip saves.', next: 'Four-End Quicksort sends parts to the bottoms instead of restoring.' },
    { deck: 'four-end-quicksort', n: 500, q: 'Every move costs at most 3 ops and never steps over a value. Why is nothing ever undone?', next: 'BFS Leaf solves leaves of ≤ 5 optimally around the walls.' },
    { deck: 'four-end-quicksort+bfs-leaf+pivot-by-leaf-count', n: 500, q: 'BFS Leaf and Pivot by Leaf Count are the first measured synergy. Remove one: how much does the other save alone?', next: 'The Meta page shows the DP Splits deck and the interaction matrix.' },
    { deck: 'four-end-quicksort+dp-splits+bfs-leaf+peephole-cancel+peephole-fuse', n: 500, q: 'DP Splits plans every split in advance. Open the Meta page: how far is this from the best known 3111?', link: 'meta.html#decks', next: '' },
  ] },
  { id: 'adaptive', name: 'Adaptive', steps: [
    { deck: 'turk+disorder-meter', n: 100, gen: 'uniform', q: 'The Disorder Meter reads inversions ÷ pairs. Uniform input sits at 0.50 ± 0.03: which regime does it pick?', next: 'The Disorder map shows which hand wins at each level.' },
    { deck: 'turk', n: 100, q: 'Open Lab › Disorder map and draw it for the strong build\'s three hands.', link: 'lab.html#disorder', next: 'The Adaptive Selector dispatches by those thresholds.' },
    { deck: 'turk', n: 100, meta: 'adaptive', q: 'Here the Table runs the strong build. Change n and the generator: which regime runs?', next: 'Move the thresholds in the Lab and watch the class targets.' },
    { deck: 'turk', n: 100, q: 'Back in the Lab, drag the thresholds. Which regimes stop meeting their class target?', link: 'lab.html#disorder', next: '' },
  ] },
];

// Challenges check the current hand and input. ctx: { hand, resolved, n, gen, mean(n, k), runOn(deck) }.
export const CHALLENGES = [
  { id: 'excellent-craft3', name: 'Reach EXCELLENT at n=100 with Craft ≤ 3', hint: 'Turk is Craft 3. Can a Craft-2 card get there?',
    async check(c) { if (c.resolved.craft > 3) return [false, `Hand Craft is ${c.resolved.craft}.`]; const m = await c.mean(100, 30); return [m < 700, `mean ${m.toFixed(1)} over 30 seeds at n=100${m < 700 ? '' : ': not under 700'}`]; } },
  { id: 'bucket-5000', name: 'Beat 5000 at n=500 using only Bucket-family cards', hint: 'The Bucket family is Chunks, Butterfly and Bucket Insertion. Techniques are allowed.',
    async check(c) { if (c.resolved.algo.family !== 'bucket') return [false, `${c.resolved.algo.name} is not a Bucket card.`]; const m = await c.mean(500, 12); return [m < 5000, `mean ${m.toFixed(1)} over 12 seeds at n=500`]; } },
  { id: 'turk-loses', name: 'Find an input where Turk loses to Radix', hint: 'Type values in the manual field, or try the generators. Turk is checked against LSD Radix on the input on the Table.',
    async check(c) { const t = c.runOn('turk'), r = c.runOn('lsd-radix'); return [t > r, `Turk ${t} ops, LSD Radix ${r} ops on this input`]; } },
  { id: 'provable-every-run', name: 'EXCELLENT on every run at n=100 with a provable O(n log n) hand', hint: 'Split Second averages 718. Which deck gets every run under 700?',
    async check(c) { const a = c.resolved.algo; if (a.claimedClass !== 'n log n' || a.proof !== 'yes') return [false, `${a.name} is not a provable O(n log n) card.`]; const xs = await c.runs(100, 30); const worst = Math.max(...xs); return [worst < 700, `worst of 30 runs: ${worst}`]; } },
  { id: 'five-ten', name: 'Find 5 values where Five Hand needs 10 ops', hint: 'Its worst case at n=5 is exactly 10.',
    async check(c) { if (c.n !== 5) return [false, 'Use n = 5 (or type 5 values).']; const k = c.runOn('five-hand'); return [k === 10, `Five Hand: ${k} ops`]; } },
  { id: 'beat-4000', name: 'Make Four-End Quicksort beat 4000 at n=500', hint: 'Its techniques compound. Which pair is the synergy?',
    async check(c) { if (c.resolved.algo.id !== 'four-end-quicksort') return [false, 'Play Four-End Quicksort.']; const m = await c.mean(500, 8); return [m < 4000, `mean ${m.toFixed(1)} over 8 seeds at n=500`]; } },
];
