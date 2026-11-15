/* Foundations app renderer. Data lives in foundations-data.js (window.FOUND). */
(() => {
const F = window.FOUND; if (!F) return;
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const rich = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const PAL = ['#38d6ff', '#a78bfa', '#34d399', '#fbbf24', '#fb923c', '#f472b6', '#60a5fa', '#f87171'];

const V = {
  layers(v) {
    const rows = v.layers.map((l, i) => {
      const c = l.color || PAL[i % PAL.length];
      return `<div class="lr" style="--lc:${c}"><div class="ln">${esc(l.name)}</div><div class="lo"><span>${rich(l.owns)}</span></div><div class="le"><span>${rich(l.eg || '')}</span></div></div>` + (i < v.layers.length - 1 ? `<div class="ar">${esc(v.arrow || 'calls ▼')}</div>` : '');
    }).join('');
    return `<div class="lay">${rows}</div>`;
  },
  pyramid(v) {
    const n = v.levels.length;
    return `<div class="pyr">${v.levels.map((l, i) => `<div class="pl" style="--w:${l.w || Math.round(32 + (68 * i) / Math.max(1, n - 1))}%;--lc:${l.color || PAL[i % PAL.length]}"><b>${esc(l.name)}</b><span>${rich(l.note || '')}</span></div>`).join('')}</div>` +
      (v.axis ? `<div class="pax"><span>${esc(v.axis[0])}</span><span>${esc(v.axis[1])}</span></div>` : '');
  },
  flow(v) { return `<div class="flw">${v.steps.map((s, i) => `<div class="fs"><div class="n">${i + 1}</div><b>${rich(s.t)}</b>${s.d ? `<span>${rich(s.d)}</span>` : ''}</div>`).join('')}</div>`; },
  chain(v) {
    return `<div class="chn">${v.nodes.map((n, i) => `<div class="cn"><b>${esc(n.t)}</b>${n.s ? `<small>${esc(n.s)}</small>` : ''}</div>` + (i < v.nodes.length - 1 ? `<div class="cl">${esc((v.links || [])[i] || '')}</div>` : '')).join('')}</div>`;
  },
  matrix(v) {
    return `<div class="mxw"><table class="mx"><thead><tr>${v.cols.map(c => `<th>${esc(c)}</th>`).join('')}</tr></thead><tbody>${v.rows.map(r => `<tr>${r.map(c => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  },
  stats(v) { return `<div class="sts">${v.items.map(s => `<div class="sx"><b>${esc(s.n)}</b><span>${rich(s.l)}</span>${s.s ? `<small>${esc(s.s)}</small>` : ''}</div>`).join('')}</div>`; },
  compare(v) {
    const col = (x, cls) => `<div class="${cls || ''}"><h5>${esc(x.t)}</h5><ul>${x.items.map(i => `<li>${rich(i)}</li>`).join('')}</ul></div>`;
    return `<div class="cmpx">${col(v.a)}${col(v.b, v.bBad ? 'no' : '')}</div>`;
  },
  bars(v) {
    const max = Math.max(...v.items.map(i => i.v));
    return `<div class="bars">${v.items.map(i => `<div class="br"><span>${esc(i.l)}</span><div class="bt"><i style="width:${Math.round(100 * i.v / max)}%"></i></div><b>${esc(i.t || i.v)}</b></div>`).join('')}</div>`;
  }
};
const visual = v => `<div class="fv"><h4>${esc(v.title || '')}</h4>${V[v.type](v)}${v.note ? `<div class="fnote">${rich(v.note)}</div>` : ''}</div>`;
const srcList = ids => (ids || []).map(id => F.sources[id] ? `<li><a href="${esc(F.sources[id].u)}" target="_blank" rel="noopener">${esc(F.sources[id].t)}</a> – ${esc(F.sources[id].o)}</li>` : '').join('');

function chapter(c) {
  return `<article class="fchapter" id="f-${c.id}"><div class="fch"><div class="ic">${c.icon}</div><div><h3>${esc(c.title)}</h3><div class="tag">${rich(c.tag)}</div></div></div><div class="fb">` +
    (c.points ? `<ul class="fpts">${c.points.map(p => `<li><span>${rich(p)}</span></li>`).join('')}</ul>` : '') +
    (c.visuals || []).map(visual).join('') +
    (c.callout ? `<div class="fcall ${c.callout.kind || ''}">${rich(c.callout.text)}</div>` : '') +
    (c.src && c.src.length ? `<details class="fsrc"><summary>Sources (${c.src.length})</summary><ul>${srcList(c.src)}</ul></details>` : '') +
    `</div></article>`;
}

function build() {
  $('#fNav').innerHTML = '<div class="fh">Foundations</div>' + F.chapters.map(c => `<button data-id="${c.id}"><i>${c.icon}</i>${esc(c.title)}</button>`).join('') + '<button data-id="sources"><i>📚</i>All sources</button>';
  const seen = new Set(), all = Object.entries(F.sources).filter(([, s]) => { const k = s.u.replace(/\/$/, ''); if (seen.has(k)) return false; seen.add(k); return true; });
  $('#fMain').innerHTML =
    `<div class="fhero"><h2>${esc(F.title)}</h2><p>${rich(F.intro)}</p>${F.hero ? visual(F.hero) : ''}</div>` +
    F.chapters.map(chapter).join('') +
    `<article class="fchapter" id="f-sources"><div class="fch"><div class="ic">📚</div><div><h3>All sources</h3><div class="tag">${all.length} documents read for this guide</div></div></div><div class="fall"><ol>${all.map(([id, s]) => `<li><a href="${esc(s.u)}" target="_blank" rel="noopener">${esc(s.t)}</a> – ${esc(s.o)}</li>`).join('')}</ol></div></article>`;
  $$('#fNav button').forEach(b => b.onclick = () => go(b.dataset.id));
  const spy = () => {
    const m = $('#fMain'), mobile = matchMedia('(max-width:1100px)').matches; let cur = null;
    $$('.fchapter').forEach(a => { const top = a.getBoundingClientRect().top - (mobile ? 120 : m.getBoundingClientRect().top + 40); if (top <= 0) cur = a.id.slice(2); });
    $$('#fNav button').forEach(b => b.classList.toggle('on', b.dataset.id === cur));
  };
  document.addEventListener('scroll', spy, true);
  spy();
}
function go(id, replace) {
  const el = $('#f-' + id); if (!el) return;
  const mobile = matchMedia('(max-width:1100px)').matches;
  if (mobile) el.scrollIntoView({behavior: 'smooth', block: 'start'});
  else { const m = $('#fMain'); m.scrollTo({top: el.offsetTop - m.offsetTop - 4, behavior: 'smooth'}); }
  history[replace ? 'replaceState' : 'replaceState'](null, '', '#found/' + id);
}
build();
window.FOUNDATIONS = {go, chapters: F.chapters.map(c => c.id)};
})();
