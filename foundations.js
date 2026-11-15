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
  refactor() { return window.refactorHTML ? window.refactorHTML() : ''; },
  bars(v) {
    const max = Math.max(...v.items.map(i => i.v));
    return `<div class="bars">${v.items.map(i => `<div class="br"><span>${esc(i.l)}</span><div class="bt"><i style="width:${Math.round(100 * i.v / max)}%"></i></div><b>${esc(i.t || i.v)}</b></div>`).join('')}</div>`;
  }
};

let uid = 0;
const X = s => esc(s);
V.seq = function (v) {
  const id = 'sq' + (++uid), n = v.actors.length, colW = v.colW || Math.max(120, Math.min(200, Math.floor(980 / n))), W = n * colW, rowH = v.rowH || 36;
  const cx = i => colW * i + colW / 2; let y = 52, o = '', k = 0;
  for (const m of v.msgs) {
    if (m.sep) { o += '<line class="sq-sep" x1="6" x2="' + (W - 6) + '" y1="' + (y + 8) + '" y2="' + (y + 8) + '"/><text class="sq-sept" x="' + (W / 2) + '" y="' + (y + 12) + '" text-anchor="middle">' + X(m.sep) + '</text>'; y += 28; continue; }
    if (m.note) { const a = m.over[0], b = m.over[1] == null ? a : m.over[1], x1 = cx(a) - colW / 2 + 12, w = cx(b) - cx(a) + colW - 24; o += '<rect class="sq-note" x="' + x1 + '" y="' + (y - 4) + '" width="' + w + '" height="24" rx="3"/><text class="sq-nt" x="' + (x1 + w / 2) + '" y="' + (y + 12) + '" text-anchor="middle">' + X(m.note) + '</text>'; y += 32; continue; }
    k++; const lab = (v.numbered ? k + '. ' : '') + m.t;
    if (m.from === m.to) { const x = cx(m.from); o += '<path class="sq-l" d="M' + x + ' ' + (y + 6) + ' h30 v16 h-30" marker-end="url(#' + id + 'a)"/><text class="sq-t" x="' + (x + 36) + '" y="' + (y + 18) + '">' + X(lab) + '</text>'; y += rowH + 2; continue; }
    const a = cx(m.from), b = cx(m.to), mid = (a + b) / 2;
    o += '<line class="sq-l' + (m.ret ? ' ret' : '') + '" x1="' + a + '" y1="' + (y + 14) + '" x2="' + (b + (b > a ? -1 : 1)) + '" y2="' + (y + 14) + '" marker-end="url(#' + id + (m.ret ? 'r' : 'a') + ')"/><text class="sq-t" x="' + mid + '" y="' + (y + 9) + '" text-anchor="middle">' + X(lab) + '</text>';
    y += rowH;
  }
  const H = y + 10;
  const heads = v.actors.map((a, i) => { const w = colW - 26; return '<rect class="sq-h" x="' + (cx(i) - w / 2) + '" y="6" width="' + w + '" height="32" rx="4"/><text class="sq-ht" x="' + cx(i) + '" y="26" text-anchor="middle">' + X(a) + '</text>'; }).join('');
  const ll = v.actors.map((a, i) => '<line class="sq-life" x1="' + cx(i) + '" y1="38" x2="' + cx(i) + '" y2="' + (H - 6) + '"/>').join('');
  return '<div class="svgw"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:' + Math.max(420, Math.min(W, 640)) + 'px;max-width:' + W + 'px;margin:0 auto" xmlns="http://www.w3.org/2000/svg"><defs><marker id="' + id + 'a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" class="sq-ah"/></marker><marker id="' + id + 'r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 1L10 5L0 9" class="sq-ar"/></marker></defs>' + ll + o + heads + '</svg></div>';
};
V.cls = function (v) {
  const id = 'cd' + (++uid), cw = 6.6, lh = 15, bx = {};
  v.classes.forEach(c => {
    const lines = [(c.stereo ? '«' + c.stereo + '»' : ''), c.name].concat(c.attrs || [], c.methods || []);
    c.w = Math.max(130, Math.max.apply(null, lines.map(s => s.length)) * cw + 22);
    c.hh = c.stereo ? 38 : 24;
    c.h = c.hh + (c.attrs && c.attrs.length ? c.attrs.length * lh + 8 : 0) + (c.methods && c.methods.length ? c.methods.length * lh + 8 : 0) + 4;
    bx[c.id] = c;
  });
  const cols = {}, rows = {};
  v.classes.forEach(c => { const ci = Math.floor(c.c); cols[ci] = Math.max(cols[ci] || 0, c.w); rows[c.r] = Math.max(rows[c.r] || 0, c.h); });
  const gapX = 70, gapY = 54, colX = {}, rowY = {}; let ax = 10, ay = 10;
  Object.keys(cols).sort((a, b) => a - b).forEach(k => { colX[k] = ax; ax += cols[k] + gapX; });
  Object.keys(rows).sort((a, b) => a - b).forEach(k => { rowY[k] = ay; ay += rows[k] + gapY; });
  const W = ax - gapX + 10, H = ay - gapY + 10;
  v.classes.forEach(c => { const ci = Math.floor(c.c), frac = c.c - ci; c.x = colX[ci] + (cols[ci] - c.w) / 2 + frac * (cols[ci] + gapX); c.y = rowY[c.r] + (rows[c.r] - c.h) / 2; });
  const edge = (c, tx, ty) => { const cxx = c.x + c.w / 2, cyy = c.y + c.h / 2, dx = tx - cxx, dy = ty - cyy; if (!dx && !dy) return [cxx, cyy]; const s = Math.min((c.w / 2) / Math.abs(dx || 1e-9), (c.h / 2) / Math.abs(dy || 1e-9)); return [cxx + dx * s, cyy + dy * s]; };
  let rel = '', lbl = '';
  (v.rels || []).forEach(r => {
    const a = bx[r.from], b = bx[r.to], ac = [a.x + a.w / 2, a.y + a.h / 2], bc = [b.x + b.w / 2, b.y + b.h / 2];
    const p1 = edge(a, bc[0], bc[1]), p2 = edge(b, ac[0], ac[1]);
    const dash = r.kind === 'impl' || r.kind === 'dep' ? ' dash' : '';
    const me = r.kind === 'inherit' || r.kind === 'impl' ? 'marker-end="url(#' + id + 't)"' : (r.kind === 'assoc' || r.kind === 'dep' ? 'marker-end="url(#' + id + 'o)"' : '');
    const ms = r.kind === 'compose' ? 'marker-start="url(#' + id + 'd)"' : (r.kind === 'aggr' ? 'marker-start="url(#' + id + 'e)"' : '');
    rel += '<line class="cd-r' + dash + '" x1="' + p1[0] + '" y1="' + p1[1] + '" x2="' + p2[0] + '" y2="' + p2[1] + '" ' + me + ' ' + ms + '/>';
    if (r.label) lbl += '<text class="cd-l" x="' + ((p1[0] + p2[0]) / 2 + 6) + '" y="' + ((p1[1] + p2[1]) / 2 - 3) + '">' + X(r.label) + '</text>';
  });
  const boxes = v.classes.map(c => {
    let y = c.y, s = '<rect class="cd-b" x="' + c.x + '" y="' + c.y + '" width="' + c.w + '" height="' + c.h + '" rx="3"/>';
    if (c.stereo) s += '<text class="cd-s" x="' + (c.x + c.w / 2) + '" y="' + (y + 14) + '" text-anchor="middle">«' + X(c.stereo) + '»</text>';
    s += '<text class="cd-n" x="' + (c.x + c.w / 2) + '" y="' + (y + (c.stereo ? 30 : 16)) + '" text-anchor="middle">' + X(c.name) + '</text>'; y += c.hh;
    if (c.attrs && c.attrs.length) { s += '<line class="cd-d" x1="' + c.x + '" x2="' + (c.x + c.w) + '" y1="' + y + '" y2="' + y + '"/>'; c.attrs.forEach((t, i) => s += '<text class="cd-m" x="' + (c.x + 10) + '" y="' + (y + 14 + i * lh) + '">' + X(t) + '</text>'); y += c.attrs.length * lh + 8; }
    if (c.methods && c.methods.length) { s += '<line class="cd-d" x1="' + c.x + '" x2="' + (c.x + c.w) + '" y1="' + y + '" y2="' + y + '"/>'; c.methods.forEach((t, i) => s += '<text class="cd-m" x="' + (c.x + 10) + '" y="' + (y + 14 + i * lh) + '">' + X(t) + '</text>'); }
    return s;
  }).join('');
  const defs = '<defs><marker id="' + id + 't" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="11" markerHeight="11" orient="auto"><path d="M1 1L11 6L1 11z" class="cd-hollow"/></marker><marker id="' + id + 'o" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="9" markerHeight="9" orient="auto"><path d="M1 1L11 6L1 11" class="cd-open"/></marker><marker id="' + id + 'd" viewBox="0 0 16 12" refX="1" refY="6" markerWidth="14" markerHeight="11" orient="auto"><path d="M1 6L8 1L15 6L8 11z" class="cd-fill"/></marker><marker id="' + id + 'e" viewBox="0 0 16 12" refX="1" refY="6" markerWidth="14" markerHeight="11" orient="auto"><path d="M1 6L8 1L15 6L8 11z" class="cd-hollow"/></marker></defs>';
  return '<div class="svgw"><svg viewBox="0 0 ' + W + ' ' + H + '" style="min-width:' + Math.min(W, 620) + 'px;max-width:' + W + 'px;margin:0 auto" xmlns="http://www.w3.org/2000/svg">' + defs + rel + boxes + lbl + '</svg></div>';
};
const visual = v => `<div class="fv"><h4>${esc(v.title || '')}</h4>${V[v.type](v)}${v.note ? `<div class="fnote">${rich(v.note)}</div>` : ''}</div>`;
const srcList = ids => (ids || []).map(id => F.sources[id] ? `<li><a href="${esc(F.sources[id].u)}" target="_blank" rel="noopener">${esc(F.sources[id].t)}</a> – ${esc(F.sources[id].o)}</li>` : '').join('');

function chapter(c) {
  return `<article class="fchapter" id="f-${c.id}"><div class="fch"><div class="ic">${c.icon}</div><div><h3>${esc(c.title)}</h3><div class="tag">${rich(c.tag)}</div></div></div><div class="fb">` +
    (c.points ? `<ul class="fpts">${c.points.map(p => `<li><span>${rich(p)}</span></li>`).join('')}</ul>` : '') +
    (c.visuals || []).concat(c.flows || []).map(visual).join('') +
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
  $$('.rf').forEach(r => window.initRefactor && window.initRefactor(r));
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
