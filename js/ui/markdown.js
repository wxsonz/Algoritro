// A small Markdown renderer for card text: headings, paragraphs, lists, emphasis, code, links
// and tables. Input is the spec's own Markdown, escaped before any markup is added.
import { esc } from './common.js';

function inline(s, base = 'spec/') {
  return esc(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, t, u) => {
      // Spec links point at files in spec/; keep them working relative to the site root.
      const href = /^https?:/.test(u) || u.startsWith('#') ? u : new URL(u, 'http://x/' + base).pathname.slice(1);
      return `<a href="${href}"${/^https?:/.test(u) ? ' target="_blank" rel="noopener"' : ''}>${t}</a>`;
    });
}
export function markdown(md, base = 'spec/') {
  const inl = s => inline(s, base);
  const lines = String(md || '').split('\n'), out = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim() || /^---\s*$/.test(l)) { i++; continue; }
    let m;
    if ((m = l.match(/^(#{1,6})\s+(.*)/))) { const k = Math.min(6, m[1].length + 2); out.push(`<h${k}>${inl(m[2])}</h${k}>`); i++; continue; }
    if (l.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = r => r.split('|').slice(1, -1).map(c => c.trim());
      const body = rows.filter(r => !/^\|\s*-/.test(r));
      out.push('<div class="tablewrap"><table>' + body.map((r, k) => `<tr>${cells(r).map(c => k === 0 ? `<th>${inl(c)}</th>` : `<td>${inl(c)}</td>`).join('')}</tr>`).join('') + '</table></div>');
      continue;
    }
    if (/^\s*[-*] /.test(l)) {
      const items = [];
      while (i < lines.length && (/^\s*[-*] /.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
        if (/^\s*[-*] /.test(lines[i])) items.push(lines[i].replace(/^\s*[-*] /, '')); else items[items.length - 1] += ' ' + lines[i].trim();
        i++;
      }
      out.push('<ul>' + items.map(t => `<li>${inl(t)}</li>`).join('') + '</ul>');
      continue;
    }
    if (/^```/.test(l)) { const code = []; i++; while (i < lines.length && !/^```/.test(lines[i])) code.push(lines[i++]); i++; out.push(`<pre>${esc(code.join('\n'))}</pre>`); continue; }
    const para = []; while (i < lines.length && lines[i].trim() && !/^(#|\||\s*[-*] |```)/.test(lines[i])) para.push(lines[i++]);
    out.push(`<p>${inl(para.join(' '))}</p>`);
  }
  return out.join('\n');
}
// Split a card's Markdown into its bold-labelled parts: "How it plays", "Lore", "Pros", "Cons", ….
export function sections(md) {
  const out = {}; let key = 'intro', buf = [];
  for (const l of String(md || '').split('\n')) {
    const m = l.match(/^\*\*([A-Z][^*]{1,40}?)[.:]?\*\*[.:]?\s*(.*)$/);
    if (m && !l.startsWith('- ')) { out[key] = buf.join('\n').trim(); key = m[1].replace(/[.:]$/, ''); buf = [m[2]]; } else buf.push(l);
  }
  out[key] = buf.join('\n').trim();
  return out;
}
