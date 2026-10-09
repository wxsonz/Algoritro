// Themed tooltips that sit above the pointer. The browser's own title tooltip appears under the
// cursor and cannot be styled, so on first hover an element's title moves to data-tip and one
// tooltip element follows the pointer instead. A first line followed by more lines becomes a
// heading.
import { el } from './common.js';

export function bindTips(root = document) {
  const tip = el('div.tip', { 'aria-hidden': 'true' });
  document.body.append(tip);
  let target = null, timer = 0, x = 0, y = 0;
  const place = () => {
    const w = tip.offsetWidth, h = tip.offsetHeight;
    const left = Math.min(Math.max(8, x - w / 2), innerWidth - w - 8);
    let top = y - h - 18;
    tip.classList.toggle('below', top < 8);
    if (top < 8) top = y + 26;   // no room above the cursor: go below it
    tip.style.left = `${left}px`; tip.style.top = `${top}px`;
    tip.style.setProperty('--ax', `${Math.min(Math.max(12, x - left), w - 12)}px`);
  };
  const show = () => {
    if (!target?.isConnected) return hide();
    const lines = target.dataset.tip.split('\n').map(s => s.trim()).filter(Boolean);
    tip.replaceChildren(...lines.map((l, i) => el(i === 0 && lines.length > 1 ? 'b' : 'span', {}, l)));
    tip.classList.add('on'); place();
  };
  const hide = () => { clearTimeout(timer); target = null; tip.classList.remove('on'); };
  root.addEventListener('pointerover', e => {
    const t = e.target.closest?.('[title], [data-tip]');
    if (t === target) return;
    hide();
    if (!t) return;
    if (t.hasAttribute('title')) { const v = t.getAttribute('title'); t.removeAttribute('title'); if (v) t.dataset.tip = v; else delete t.dataset.tip; }
    if (!t.dataset.tip) return;
    target = t; x = e.clientX; y = e.clientY;
    timer = setTimeout(show, 280);
  });
  root.addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; if (tip.classList.contains('on')) place(); }, { passive: true });
  root.addEventListener('pointerout', e => { if (target && !target.contains(e.relatedTarget)) hide(); });
  for (const type of ['pointerdown', 'wheel', 'keydown', 'scroll']) addEventListener(type, hide, { capture: true, passive: true });
}
