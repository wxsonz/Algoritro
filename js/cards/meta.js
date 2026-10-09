// The Meta card: the Adaptive Selector, which the Table's build plays (objective.md §2). Its runner
// is in core/meta-run.js. Portfolio (run several hands, keep the shortest) was removed.
export default [
  { id: 'adaptive-selector', kind: 'meta', name: 'Adaptive Selector', tagline: 'Read the table, pick the deck', knows: ['disorder'], fns: 1, uses: ['disorder'], from: "in the base kit: the selector that reads the disorder count", rarity: 'common',
    cost: 'one disorder measurement', classNote: 'each regime must meet its class target' },
];
