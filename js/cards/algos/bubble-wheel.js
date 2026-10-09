import { bubbleWheel } from '../engines/simple.js';
export default {
  id: 'bubble-wheel', kind: 'algorithm', family: 'selection', name: 'Bubble Wheel', tagline: 'Turn the wheel, swap when wrong',
  rarity: 'uncommon', claimedClass: 'n²', proof: 'yes', knows: [], fns: 2, from: "est.: one loop of sa or ra, and a sorted check; no study build has it", slots: 0, maxN: 600,
  run(m) { bubbleWheel(m); },
};
