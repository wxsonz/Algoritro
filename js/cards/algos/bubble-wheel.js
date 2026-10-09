import { bubbleWheel } from '../engines/simple.js';
export default {
  id: 'bubble-wheel', kind: 'algorithm', family: 'selection', name: 'Bubble Wheel', tagline: 'Turn the wheel, swap when wrong',
  rarity: 'uncommon', claimedClass: 'n²', proof: 'yes', grasp: 2, craft: 2, lines: 25, slots: 0, maxN: 600,
  run(m) { bubbleWheel(m); },
};
