(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const store = {get:(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

const SC = (window.SCENARIOS || []).filter(Boolean);
const PCOL = {CLI:'#9aa7d6',CDP:'#3b82f6',WS:'#22d3ee',HTTP:'#fbbf24',ADB:'#34d399',W3C:'#a78bfa',IPC:'#fb923c',FS:'#f472b6',UI:'#f87171'};
const PLAT = {web:'Web', mobile:'Mobile', desktop:'Desktop'};
const LAYERS = ['Test code','Test runner','Driver / protocol','Browser / app / device','Page / UI'];
const col = p => PCOL[p] || '#9aa7d6';

const ICONS = {
 laptop:'<rect x="-34" y="-30" width="68" height="44" rx="3"/><path d="M-44 20h88l-8 10h-72z"/><path d="M-22 -18h44M-22 -8h30"/>',
 phone:'<rect x="-22" y="-40" width="44" height="80" rx="7"/><path d="M-6 -33h12M-4 32h8"/><path d="M-14 -18h28M-14 -8h20"/>',
 server:'<rect x="-34" y="-36" width="68" height="20" rx="3"/><rect x="-34" y="-10" width="68" height="20" rx="3"/><rect x="-34" y="16" width="68" height="20" rx="3"/><path d="M-24 -26h6M-24 0h6M-24 26h6M16 -26h8M16 0h8M16 26h8"/>',
 browser:'<rect x="-42" y="-32" width="84" height="64" rx="4"/><path d="M-42 -16h84"/><circle cx="-34" cy="-24" r="2"/><circle cx="-26" cy="-24" r="2"/><circle cx="-18" cy="-24" r="2"/><path d="M-30 -4h40M-30 6h60M-30 16h30"/>',
 cube:'<path d="M0 -38l36 20v40L0 42l-36 -20v-40z"/><path d="M0 2l36-20M0 2l-36-20M0 2v40"/>',
 chip:'<rect x="-26" y="-26" width="52" height="52" rx="4"/><rect x="-12" y="-12" width="24" height="24"/><path d="M-12 -34v8M0 -34v8M12 -34v8M-12 26v8M0 26v8M12 26v8M-34 -12h8M-34 0h8M-34 12h8M26 -12h8M26 0h8M26 12h8"/>',
 cloud:'<path d="M-30 20h56a18 18 0 0 0 0-36 24 24 0 0 0-46-6 20 20 0 0 0-10 42z"/><circle cx="0" cy="2" r="12"/><path d="M-12 2h24M0 -10c-8 8-8 16 0 24M0 -10c8 8 8 16 0 24"/>',
 terminal:'<rect x="-42" y="-30" width="84" height="60" rx="4"/><path d="M-30 -14l12 10-12 10M-8 8h22"/>',
 app:'<rect x="-42" y="-32" width="84" height="64" rx="4"/><path d="M-42 -18h84M-20 -18v50"/><path d="M-34 -8h8M-34 2h8M-34 12h8M-10 -6h40M-10 6h40M-10 18h24"/>',
 usb:'<path d="M-44 0h56M12 0l12-10v20z"/><rect x="26" y="-8" width="18" height="16" rx="2"/><circle cx="-30" cy="0" r="5"/>',
 android:'<path d="M-26 -4a26 26 0 0 1 52 0z"/><circle cx="-10" cy="-14" r="2.5"/><circle cx="10" cy="-14" r="2.5"/><path d="M-18 -26l-6-8M18 -26l6-8"/><rect x="-26" y="0" width="52" height="32" rx="5"/>',
 db:'<ellipse cx="0" cy="-26" rx="32" ry="10"/><path d="M-32 -26v50c0 6 14 10 32 10s32-4 32-10v-50M-32 -2c0 6 14 10 32 10s32-4 32-10"/>',
 doc:'<path d="M-26 -38h36l18 18v58h-54z"/><path d="M10 -38v18h18M-16 -6h32M-16 6h32M-16 18h20"/>',
 gear:'<circle r="14"/><path d="M0 -36v10M0 26v10M-36 0h10M26 0h10M-25 -25l7 7M18 18l7 7M25 -25l-7 7M-18 18l-7 7"/><circle r="26"/>',
 plug:'<path d="M-14 -34v22M14 -34v22M-24 -12h48v14a24 24 0 0 1-48 0zM0 26v16"/>',
 user:'<circle cx="0" cy="-18" r="14"/><path d="M-30 36a30 30 0 0 1 60 0z"/>'
};

/* ---------- highlighting ---------- */
const KW = 'import|from|export|const|let|var|async|await|function|return|new|class|extends|implements|public|private|static|void|final|try|catch|finally|throw|throws|if|else|for|while|true|false|null|undefined|type|interface|package|String|int|boolean|var|this|of|in|as';
const HLX = new RegExp('(\\/\\/.*|#.*|\\/\\*[\\s\\S]*?\\*\\/)|(\'(?:\\\\.|[^\'\\\\\\n])*\'|"(?:\\\\.|[^"\\\\\\n])*"|`(?:\\\\.|[^`\\\\])*`)|\\b(' + KW + ')\\b|\\b(\\d+(?:\\.\\d+)?)\\b|(\\.[a-zA-Z_]\\w*)(?=\\()', 'g');
function hl(code) {
  return esc(code).replace(HLX, (...m) => m[1] ? `<span class="c">${m[1]}</span>` : m[2] ? `<span class="s">${m[2]}</span>` : m[3] ? `<span class="k">${m[3]}</span>` : m[4] ? `<span class="n">${m[4]}</span>` : `<span class="f">${m[5]}</span>`);
}

/* ---------- state ---------- */
let cur = null;                  // current scenario
let st = {step: -1, k: 0};       // step index (-1 overview) and revealed messages inside the step
let view = 'net', playing = false, runTok = 0, animTok = 0, granular = false;
let lang = store.get('pwx-lang', 'ts'), theme = store.get('pw-theme', 'dark');
let platFilter = 'all', layerSel = 0, inspIdx = -1, speed = 1;
let camera = [0, 0, 1000, 560], camTok = 0;

/* ---------- derived data ---------- */
function prep(sc) {
  if (sc._p) return sc;
  let t = 0, n = 0;
  sc.messages.forEach((m, i) => { m.n = ++n; if (m.t == null) t += 10 + (i % 3) * 7; else t = m.t; m.t = t; });
  sc.steps.forEach((s, i) => { s.msgs = sc.messages.filter(m => m.step === i); });
  sc._p = true; return sc;
}
const nodeOf = id => cur.nodes.find(n => n.id === id);
const stepMsgs = i => cur.steps[i] ? cur.steps[i].msgs : [];
function shown() { // messages revealed in current state
  if (st.step < 0) return [];
  const out = [];
  cur.steps.forEach((s, i) => { if (i < st.step) out.push(...s.msgs); else if (i === st.step) out.push(...s.msgs.slice(0, st.k)); });
  return out;
}
const lastShown = () => { const s = shown(); return s[s.length - 1]; };

/* ---------- list ---------- */
function renderTabs() {
  const counts = {all: SC.length}; Object.keys(PLAT).forEach(p => counts[p] = SC.filter(s => s.platform === p).length);
  $('#tabs').innerHTML = ['all', 'web', 'mobile', 'desktop'].map(p => `<button data-p="${p}" class="${platFilter === p ? 'on' : ''}">${p === 'all' ? 'All' : PLAT[p]} <b>${counts[p]}</b></button>`).join('');
  $$('#tabs button').forEach(b => b.onclick = () => { platFilter = b.dataset.p; renderTabs(); renderList(); });
}
function renderList() {
  const items = SC.filter(s => platFilter === 'all' || s.platform === platFilter);
  $('#list').innerHTML = items.map(s => {
    const on = cur && cur.id === s.id;
    const steps = on ? s.steps.map((x, i) => `<div class="st ${st.step === i ? 'act' : ''} ${st.step > i ? 'done' : ''}" data-i="${i}"><div class="n">${st.step > i ? '✓' : i + 1}</div><div><b>${esc(x.title)}</b><small>${esc(x.sub || '')}</small></div></div>`).join('') : '';
    return `<div class="sc ${on ? 'on' : ''}" data-id="${s.id}"><button><span class="dot"></span><span><b>${esc(s.title)}</b><small>${esc(s.subtitle || '')}</small></span><span class="plat">${PLAT[s.platform] || s.platform}</span></button><div class="steps">${steps}</div></div>`;
  }).join('') || '<div class="empty">No scenarios in this category yet.</div>';
  $$('#list .sc > button').forEach(b => b.onclick = () => selectScenario(b.parentElement.dataset.id));
  $$('#list .st').forEach(e => e.onclick = () => gotoStep(+e.dataset.i, true));
  const a = $('#list .st.act') || $('#list .sc.on'); a && a.scrollIntoView({block: 'nearest'});
}

/* ---------- diagram ---------- */
function allLinks() {
  const seen = new Set(), out = [];
  (cur.links || []).forEach(l => { const k = [l.a, l.b].sort().join('|'); seen.add(k); out.push(l); });
  cur.messages.forEach(m => { if (m.from === m.to) return; const k = [m.from, m.to].sort().join('|'); if (!seen.has(k)) { seen.add(k); out.push({a: m.from, b: m.to}); } });
  return out;
}
function drawDiagram() {
  const svg = $('#svg');
  const links = allLinks();
  svg.innerHTML = `<defs></defs>
  <g id="linkLayer">${links.map(l => { const a = nodeOf(l.a), b = nodeOf(l.b); if (!a || !b) return ''; const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
     return `<g><line class="link" data-k="${[l.a, l.b].sort().join('|')}" x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>${l.label ? (() => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, ox = -dy / d * 16, oy = dx / d * 16; return `<text class="llabel" data-k="${[l.a, l.b].sort().join('|')}" x="${mx + ox * (oy > 0 ? -1 : 1)}" y="${my + oy * (oy > 0 ? -1 : 1) + 4}">${esc(l.label)}</text>`; })() : ''}</g>`; }).join('')}</g>
  <g id="nodeLayer">${cur.nodes.map(n => `<g class="node" data-id="${n.id}" transform="translate(${n.x},${n.y})"><circle class="halo" r="50"/><g class="ico" fill="var(--panel)" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${ICONS[n.icon] || ICONS.cube}</g><text class="l" y="68">${esc(n.label)}</text>${n.sub ? `<text class="s" y="86">${esc(n.sub)}</text>` : ''}</g>`).join('')}</g>
  <g id="pktLayer"></g>
  <g id="bubble" style="display:none"></g>`;
}
function paintHot() {
  const hot = new Set(); let hotLink = null;
  const m = lastShown();
  if (st.step >= 0) {
    const s = cur.steps[st.step];
    if (st.k > 0 && m && m.step === st.step) { hot.add(m.from); hot.add(m.to); hotLink = [m.from, m.to].sort().join('|'); }
    else if (s.focus) hot.add(s.focus);
    (s.highlight || []).forEach(h => hot.add(h));
  }
  $$('#svg .node').forEach(g => {
    const n = nodeOf(g.dataset.id);
    g.classList.toggle('hot', hot.has(g.dataset.id));
    g.classList.toggle('dim', layerSel > 0 && n.layer !== layerSel);
  });
  $$('#svg .link').forEach(l => l.classList.toggle('hot', l.dataset.k === hotLink));
  $$('#svg .llabel').forEach(l => l.classList.toggle('hot', l.dataset.k === hotLink));
  // bubble (e.g. URL typed) on focus node
  const b = $('#bubble'), s = st.step >= 0 ? cur.steps[st.step] : null;
  if (s && s.bubble && st.k === 0) {
    const n = nodeOf(s.focus || (s.msgs[0] && s.msgs[0].from)); if (n) {
      const w = Math.max(160, s.bubble.length * 11 + 50);
      b.style.display = ''; b.innerHTML = `<rect class="bubble" x="${n.x - w / 2}" y="${n.y - 120}" width="${w}" height="46" rx="3"/><text class="bubble-t" x="${n.x}" y="${n.y - 90}" text-anchor="middle">${esc(s.bubble)}</text>`;
    }
  } else if (b) b.style.display = 'none';
}
function targetCam() {
  if (st.step < 0 || view !== 'net') return [0, 0, 1000, 560];
  const s = cur.steps[st.step]; const ids = new Set([s.focus, ...(s.highlight || [])]);
  s.msgs.forEach(m => { ids.add(m.from); ids.add(m.to); }); ids.delete(undefined);
  const ns = [...ids].map(nodeOf).filter(Boolean); if (!ns.length) return [0, 0, 1000, 560];
  let x0 = Math.min(...ns.map(n => n.x)) - 190, x1 = Math.max(...ns.map(n => n.x)) + 190, y0 = Math.min(...ns.map(n => n.y)) - 160, y1 = Math.max(...ns.map(n => n.y)) + 150;
  const box = $('#stage').getBoundingClientRect(); const ar = box.width / Math.max(1, box.height);
  let w = x1 - x0, h = y1 - y0; if (w / h < ar) { const nw = h * ar; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / ar; y0 -= (nh - h) / 2; h = nh; }
  if (w > 1000) { const f = 1000 / w; } return [x0, y0, w, h];
}
function moveCam(animate = true) {
  const to = targetCam(), from = camera.slice(), tok = ++camTok, t0 = performance.now(), dur = animate ? 650 : 0;
  const svg = $('#svg');
  const f = now => { if (tok !== camTok) return; const p = dur ? Math.min(1, (now - t0) / dur) : 1, e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    camera = from.map((v, i) => v + (to[i] - v) * e); svg.setAttribute('viewBox', camera.join(' ')); if (p < 1) requestAnimationFrame(f); };
  requestAnimationFrame(f);
}
function animatePacket(m) {
  return new Promise(res => {
    if (view !== 'net') { res(); return; }
    const a = nodeOf(m.from), b = nodeOf(m.to), layer = $('#pktLayer'); if (!a || !b || !layer) { res(); return; }
    const c = col(m.proto), g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.setAttribute('class', 'pkt');
    const lab = m.short || (m.info.length > 24 ? m.info.slice(0, 23) + '…' : m.info);
    g.innerHTML = `<circle r="9" fill="${c}" style="color:${c}"/><text y="-18" text-anchor="middle">${esc(lab)}</text>`; layer.appendChild(g);
    let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1; const off = m.from === m.to ? 0 : 46, ux = dx / d, uy = dy / d;
    const sx = a.x + ux * off, sy = a.y + uy * off, ex = b.x - ux * off, ey = b.y - uy * off;
    const self = m.from === m.to, my = animTok, dur = 900 / speed, t0 = performance.now();
    const f = now => { const p = Math.min(1, (now - t0) / dur), e = p < .5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      let x = sx + (ex - sx) * e, y = sy + (ey - sy) * e; if (self) { const ang = e * Math.PI * 2; x = a.x + 56 * Math.sin(ang); y = a.y - 40 + 22 * (1 - Math.cos(ang)) - 22; }
      g.setAttribute('transform', `translate(${x},${y})`);
      if (p < 1 && my === animTok) requestAnimationFrame(f); else { g.remove(); res(); } };
    requestAnimationFrame(f);
  });
}

/* ---------- sequence view ---------- */
function drawSeq() {
  const ids = []; cur.messages.forEach(m => [m.from, m.to].forEach(i => { if (!ids.includes(i)) ids.push(i); }));
  ids.sort((a, b) => nodeOf(a).x - nodeOf(b).x);
  const nc = ids.length, shownSet = new Set(shown().map(m => m.n)), lm = lastShown();
  const cx = i => ((i + .5) / nc * 100);
  let h = `<div class="seqhead" style="grid-template-columns:repeat(${nc},1fr)">${ids.map(i => { const n = nodeOf(i); return `<div>${esc(n.label)}<small>${esc(n.sub || '')}</small></div>`; }).join('')}</div><div class="seqbody">${ids.map((i, k) => `<div style="position:absolute;top:0;bottom:0;left:${cx(k)}%;border-left:1px dashed var(--line2)"></div>`).join('')}`;
  cur.steps.forEach((s, si) => {
    h += `<div class="seqstep" style="position:relative;background:var(--panel)">Step ${si + 1} · ${esc(s.title)}</div>`;
    s.msgs.forEach(m => {
      const a = ids.indexOf(m.from), b = ids.indexOf(m.to), c = col(m.proto), l = Math.min(cx(a), cx(b)), w = Math.abs(cx(a) - cx(b)), self = a === b;
      const dir = b >= a ? 1 : -1;
      h += `<div class="seqrow ${shownSet.has(m.n) ? 'shown' : ''} ${lm && lm.n === m.n ? 'cur' : ''}" data-n="${m.n}" style="display:block">
        <div class="lbl" style="${self ? (cx(a) > 55 ? `right:${100 - cx(a) + 2}%` : `left:${cx(a) + 7}%`) : `left:${l + w / 2}%;transform:translateX(-50%)`}">${esc(m.info.length > 60 ? m.info.slice(0, 58) + '…' : m.info)}</div>
        ${self ? `<div style="position:absolute;left:${cx(a)}%;top:26px;width:6%;height:10px;border:2px solid ${c};border-left:0;border-radius:0 8px 8px 0"></div>`
        : `<div style="position:absolute;left:${l}%;width:${w}%;top:29px;height:2px;background:${c}"></div>
           <div style="position:absolute;${dir > 0 ? `left:${l + w}%;margin-left:-8px;border-left:10px solid ${c}` : `left:${l}%;border-right:10px solid ${c}`};top:23px;border-top:7px solid transparent;border-bottom:7px solid transparent"></div>`}</div>`;
    });
  });
  $('#seq').innerHTML = h + '</div>';
  $$('#seq .seqrow').forEach(r => r.onclick = () => openInsp(+r.dataset.n - 1));
}

/* ---------- table ---------- */
function drawTable() {
  const s = shown(), lm = s[s.length - 1];
  $('#tbl').innerHTML = `<table><thead><tr><th>NO.</th><th>TIME</th><th>SOURCE</th><th>DESTINATION</th><th>PROTOCOL</th><th>INFO</th><th style="text-align:right">SIZE</th></tr></thead><tbody>${
    s.length ? s.map(m => `<tr class="row ${lm && lm.n === m.n ? 'cur' : ''}" data-n="${m.n}"><td><span class="no" style="background:${col(m.proto)}">${m.n}</span></td><td>${m.t} ms</td><td>${esc(nodeOf(m.from).label)}</td><td>${esc(nodeOf(m.to).label)}</td><td style="color:${col(m.proto)}">${esc(m.proto)}</td><td class="info">${esc(m.info)}</td><td style="text-align:right">${esc(m.size || '')}</td></tr>`).join('')
    : `<tr><td colspan="7" class="empty">No messages on the wire yet. Press PLAY or STEP.</td></tr>`}</tbody></table>`;
  $$('#tbl .row').forEach(r => r.onclick = () => openInsp(+r.dataset.n - 1));
  const last = $('#tbl .row.cur'); last && last.scrollIntoView({block: 'nearest'});
  const protos = [...new Set(cur.messages.map(m => m.proto))];
  $('#legend').innerHTML = protos.map(p => `<span style="margin-right:12px"><i style="background:${col(p)}"></i>${esc(p)}</span>`).join('');
}

/* ---------- inspector ---------- */
function openInsp(i) {
  const m = cur.messages[i]; if (!m) return; inspIdx = i;
  // sync state so the diagram/step match this message
  const idx = m.step, k = cur.steps[idx].msgs.indexOf(m) + 1;
  if (!(st.step > idx || (st.step === idx && st.k >= k))) { st = {step: idx, k}; renderAll(false); }
  const d = m.detail || {}, parts = d.parts || [], total = parts.reduce((a, p) => a + (p.size || 1), 0) || 1;
  const palette = ['#64748b', '#3b82f6', '#22c55e', '#f59e0b', '#a78bfa', '#f472b6'];
  $('#insp').innerHTML = `<div class="ih"><div class="num" style="background:${col(m.proto)}">${m.n}</div><div><b>${esc(m.info.length > 70 ? m.info.slice(0, 68) + '…' : m.info)}</b><small>${m.t} ms · ${esc(nodeOf(m.from).label)} → ${esc(nodeOf(m.to).label)} · ${esc(m.proto)}${m.size ? ' · ' + esc(m.size) : ''}</small></div><div class="sp"></div>
    <button class="btn" id="iPrev">‹</button><button class="btn" id="iNext">›</button><button class="btn" id="iClose">✕</button></div>
    ${d.summary ? `<div style="padding:8px 16px;color:var(--muted)">${esc(d.summary)}</div>` : ''}
    ${parts.length ? `<div class="ibar">${parts.map((p, j) => `<i style="width:${(p.size || 1) / total * 100}%;background:${p.color || palette[j % palette.length]}"></i>`).join('')}</div><div class="ilegend">${parts.map((p, j) => `<div><b style="color:${p.color || palette[j % palette.length]}">${esc(p.name)}</b>${esc(p.note || '')}</div>`).join('')}</div>` : ''}
    <div class="ibody"><div>${(d.fields || []).map(f => `<div class="fld"><b>${esc(f[0])}</b><span>${esc(f[1])}</span>${f[2] ? `<small>${esc(f[2])}</small>` : ''}</div>`).join('') || '<div class="empty">No field breakdown for this message.</div>'}</div>
    <div><div class="rawh">${esc(d.rawLabel || 'Raw message')}</div>${d.raw ? `<pre style="margin:0;white-space:pre-wrap;word-break:break-all;font:12.5px/1.6 var(--font)">${hl(d.raw)}</pre>` : '<div class="empty">—</div>'}</div></div>
    <div class="ifoot">${esc(d.footer || 'Illustrative message: real values differ on every run.')}</div>`;
  $('#insp').classList.add('on');
  $('#iClose').onclick = closeInsp; $('#iPrev').onclick = () => openInsp(Math.max(0, i - 1)); $('#iNext').onclick = () => openInsp(Math.min(cur.messages.length - 1, i + 1));
  $$('#tbl .row').forEach(r => r.classList.toggle('cur', +r.dataset.n === m.n));
}
function closeInsp() { inspIdx = -1; $('#insp').classList.remove('on'); }

/* ---------- right panel ---------- */
function drawRight() {
  const body = $('#rbody'), back = $('#bBack');
  if (!cur) { body.innerHTML = '<div class="empty">Pick a scenario on the left.</div>'; return; }
  if (st.step < 0) {
    back.style.display = 'none'; $('#rhead').textContent = 'Overview';
    const o = cur.overview || {};
    body.innerHTML = `<span class="badge">${esc(PLAT[cur.platform] || cur.platform).toUpperCase()}</span>${cur.level ? ` <span class="badge" style="border-color:var(--warn);color:var(--warn)">${['','BEGINNER','INTERMEDIATE','ADVANCED'][cur.level]}</span>` : ''}
    <div class="rtitle">${esc(cur.title)}</div><div class="rsub">${esc(cur.subtitle || '')}</div>
    <p class="rtext">${esc(o.text || '')}</p>
    <div class="kv">${(o.facts || []).map(f => `<div class="k">${esc(f[0])}</div><div>${esc(f[1])}</div>`).join('')}</div>
    ${o.caveat ? `<div class="callout">${esc(o.caveat)}</div>` : ''}
    <p style="margin-top:14px"><button class="btn" id="bStart">▶ Start the walkthrough</button> ${o.guide ? `<a class="btn" href="#" data-book="${esc(o.guide)}">📖 Read the deep dive</a>` : ''}</p>`;
    $('#bStart').onclick = () => togglePlay();
    return;
  }
  const s = cur.steps[st.step], m = lastShown();
  back.style.display = ''; $('#rhead').textContent = 'Step details';
  const code = s.code || {}, c = code[lang];
  const codeHtml = (code.ts || code.java || code.javaNote) ? `<div class="codebox"><div class="codehead"><span>${lang === 'ts' ? 'TYPESCRIPT' : 'JAVA'}</span><span><button data-l="ts" class="${lang === 'ts' ? 'on' : ''}">TS</button><button data-l="java" class="${lang === 'java' ? 'on' : ''}">JAVA</button><button id="cpy">COPY</button></span></div>${c ? `<pre>${hl(c)}</pre>` : `<div class="note">${esc(code.javaNote && lang === 'java' ? code.javaNote : 'No ' + (lang === 'ts' ? 'TypeScript' : 'Java') + ' version of this snippet.')}</div>`}</div>` : '';
  body.innerHTML = `<div class="stepno">STEP ${st.step + 1} OF ${cur.steps.length}</div><div class="rtitle" style="font-size:26px">${esc(s.title)}</div><div class="rsub">${esc(s.sub || '')}</div><p class="rtext">${esc(s.text || '')}</p>
    ${m && m.step === st.step ? `<div class="msgcard" style="border-left-color:${col(m.proto)}"><span class="tag" style="background:${col(m.proto)}">${esc(m.proto)}</span><b>${esc(nodeOf(m.from).label)} → ${esc(nodeOf(m.to).label)}</b><small>${esc(m.info)}</small><small>MESSAGE ${m.n} OF ${cur.messages.length}${m.size ? ' · ' + esc(m.size) : ''}</small></div>` : ''}
    <div class="kv">${(s.facts || []).map(f => `<div class="k">${esc(f[0])}</div><div>${esc(f[1])}</div>`).join('')}</div>
    ${codeHtml}${s.note ? `<div class="callout">${esc(s.note)}</div>` : ''}
    ${(s.guide || (cur.overview && cur.overview.guide)) ? `<p><a class="btn" href="#" data-book="${esc(s.guide || cur.overview.guide)}">📖 Deep dive</a></p>` : ''}`;
  $$('.codehead button[data-l]', body).forEach(b => b.onclick = () => setLang(b.dataset.l));
  const cp = $('#cpy'); if (cp) cp.onclick = () => navigator.clipboard.writeText(c || '').then(() => { cp.textContent = '✓'; setTimeout(() => cp.textContent = 'COPY', 1200); });
}

/* ---------- master render ---------- */
function renderAll(cam = true) {
  if (!cur) return;
  paintHot(); renderList(); drawRight(); drawTable();
  if (view === 'seq') drawSeq();
  if (cam) moveCam();
  $('#bPlay').textContent = playing ? '❚❚ PAUSE' : '▶ PLAY';
  if (document.body.dataset.app === 'explorer') history.replaceState(null, '', '#' + cur.id + (st.step >= 0 ? '/' + (st.step + 1) : ''));
}
function selectScenario(id, step) {
  const sc = SC.find(s => s.id === id); if (!sc) return;
  stopPlay(); cur = prep(sc); st = {step: -1, k: 0}; closeInsp(); camera = [0, 0, 1000, 560];
  drawDiagram(); $('#svg').setAttribute('viewBox', camera.join(' '));
  if (step != null && step >= 0) { st = {step, k: stepMsgs(step).length}; }
  renderAll(); if (step != null) moveCam(false);
}
function gotoStep(i, full = true) {
  if (!cur) return; stopPlay(); closeInsp();
  i = Math.max(-1, Math.min(cur.steps.length - 1, i));
  st = i < 0 ? {step: -1, k: 0} : {step: i, k: full ? stepMsgs(i).length : 0};
  renderAll(); const m = lastShown(); if (full && m && m.step === st.step) { const tok = ++animTok; animatePacket(m); }
}

/* ---------- playback ---------- */
function advanceOne() { // returns false at the end
  if (st.step < 0) { st = {step: 0, k: 0}; return 'step'; }
  if (st.k < stepMsgs(st.step).length) { st.k++; return 'msg'; }
  if (st.step < cur.steps.length - 1) { st = {step: st.step + 1, k: 0}; return 'step'; }
  return false;
}
async function togglePlay() { if (playing) { stopPlay(); renderAll(false); return; }
  if (!cur) return; closeInsp();
  if (st.step === cur.steps.length - 1 && st.k >= stepMsgs(st.step).length) st = {step: -1, k: 0};
  playing = true; const tok = ++runTok; $('#bPlay').textContent = '❚❚ PAUSE';
  while (playing && tok === runTok) {
    const r = advanceOne(); if (!r) break;
    renderAll(r === 'step');
    if (r === 'step') await sleep(1700 / speed);
    else { const m = lastShown(); ++animTok; await animatePacket(m); if (tok !== runTok) return; await sleep(260 / speed); }
  }
  if (tok === runTok) { playing = false; renderAll(false); }
}
function stopPlay() { playing = false; runTok++; animTok++; $$('#pktLayer *').forEach(e => e.remove()); }
function stepNext() { if (!cur) return; stopPlay();
  if (granular) { const r = advanceOne(); renderAll(r === 'step'); const m = lastShown(); if (r === 'msg' && m) { ++animTok; animatePacket(m); } }
  else gotoStep(st.step + 1 > cur.steps.length - 1 ? cur.steps.length - 1 : st.step + 1, true); }
function stepPrev() { if (!cur) return; stopPlay(); gotoStep(st.step - 1, true); }

/* ---------- misc UI ---------- */
function setLang(l) { lang = l; (window.__langL || []).forEach(f => f(l)); store.set('pwx-lang', l); $$('#langSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === l)); drawRight(); }
function setTheme(t) { theme = t; document.documentElement.dataset.theme = t; $('#bTheme').textContent = t === 'dark' ? '☾' : '☀'; store.set('pw-theme', t); }
function setView(v) { view = v; document.body.classList.toggle('seqmode', v === 'seq'); $('#vNet').classList.toggle('on', v === 'net'); $('#vSeq').classList.toggle('on', v === 'seq'); if (cur) { if (v === 'seq') drawSeq(); moveCam(false); } }
function setLayer(n) { layerSel = layerSel === n ? 0 : n; $$('#layers button').forEach(b => b.classList.toggle('on', +b.dataset.n === layerSel)); $('#layerName').textContent = layerSel ? LAYERS[layerSel - 1] : 'All'; paintHot(); }
function toggleBody(c, btn) { document.body.classList.toggle(c); $(btn).classList.toggle('on', document.body.classList.contains(c)); setTimeout(() => moveCam(false), 50); }
function openModal(id) { $(id).classList.add('on'); const i = $('input', $(id)); i && setTimeout(() => i.focus(), 20); }
function closeModals() { $$('.modal').forEach(m => m.classList.remove('on')); }

/* ---------- search ---------- */
let sel = 0, hits = [];
function runSearch() {
  const q = $('#q').value.trim().toLowerCase(), terms = q.split(/\s+/).filter(Boolean); hits = [];
  SC.forEach(s => {
    const hay = (s.title + ' ' + s.subtitle + ' ' + (s.tags || []).join(' ') + ' ' + ((s.overview || {}).text || '')).toLowerCase();
    if (!terms.length || terms.every(t => hay.includes(t))) hits.push({type: 'Scenario', t: s.title, sub: s.subtitle, id: s.id, step: null});
    s.steps.forEach((x, i) => { const h = (x.title + ' ' + x.sub + ' ' + x.text).toLowerCase(); if (terms.length && terms.every(t => h.includes(t) || hay.includes(t))) hits.push({type: 'Step', t: x.title, sub: s.title + ' · step ' + (i + 1), id: s.id, step: i}); });
  });
  hits = hits.slice(0, 40); sel = 0; drawHits();
}
function drawHits() {
  let last = '';
  $('#res').innerHTML = hits.map((h, i) => `${h.type !== last ? `<div class="grp">${(last = h.type).toUpperCase()}S</div>` : ''}<a data-i="${i}" class="${i === sel ? 'sel' : ''}">${esc(h.t)}<small>${esc(h.sub || '')}</small></a>`).join('') || '<div class="empty">No matches.</div>';
  $$('#res a').forEach(a => a.onclick = () => pick(+a.dataset.i));
}
function pick(i) { const h = hits[i]; if (!h) return; closeModals(); selectScenario(h.id, h.step); }

/* ---------- wiring ---------- */
function init() {
  document.documentElement.dataset.theme = theme; $('#bTheme').textContent = theme === 'dark' ? '☾' : '☀';
  $('#layers').innerHTML = LAYERS.map((l, i) => `<button data-n="${i + 1}" title="${l}">${i + 1}</button>`).join('');
  $$('#layers button').forEach(b => b.onclick = () => setLayer(+b.dataset.n));
  $$('#langSeg button').forEach(b => { b.onclick = () => setLang(b.dataset.l); b.classList.toggle('on', b.dataset.l === lang); });
  $('#bTheme').onclick = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  $('#bList').onclick = () => toggleBody('nolist', '#bList'); $('#bDiag').onclick = () => toggleBody('diagram', '#bDiag');
  $('#bFull').onclick = () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  $('#bKeys').onclick = () => openModal('#mKeys'); $('#searchBtn').onclick = () => { openModal('#mSearch'); runSearch(); };
  $('#vNet').onclick = () => setView('net'); $('#vSeq').onclick = () => setView('seq');
  $('#bPlay').onclick = togglePlay; $('#bStep').onclick = stepNext; $('#bPrev').onclick = stepPrev; $('#bReset').onclick = () => gotoStep(-1);
  $('#bBack').onclick = () => gotoStep(-1);
  $('#rbody').addEventListener('click', e => { const a = e.target.closest('[data-book]'); if (a) { e.preventDefault(); window.openBook && window.openBook(a.dataset.book); } }); $('#speed').onchange = e => speed = +e.target.value;
  $$('[data-close]').forEach(b => b.onclick = closeModals); $$('.modal').forEach(m => m.onclick = e => { if (e.target === m) closeModals(); });
  $('#q').oninput = runSearch;
  $('#shList').innerHTML = [['PLAYBACK'], ['Space', 'Play / pause'], ['← / →', 'Previous / next step'], ['S', 'Toggle one-message-at-a-time stepping'], ['1 – 9', 'Go to step 1–9'], ['[ / ]', 'Slower / faster'], ['Esc', 'Close panel / back to overview'],
    ['VIEW'], ['V', 'Network / sequence view'], ['D', 'Diagram only'], ['L', 'Show / hide scenario list'], ['F', 'Fullscreen'], ['T', 'Light / dark theme'], ['J', 'Switch TypeScript / Java'],
    ['FIND'], ['Ctrl K  /  /', 'Search'], ['N / P', 'Next / previous scenario'], ['?', 'This help'], ['INSPECTOR'], ['← / →', 'Previous / next message (when open)']]
    .map(r => r.length === 1 ? `<h4>${r[0]}</h4>` : `<div><span>${r[1]}</span><kbd>${r[0]}</kbd></div>`).join('');
  addEventListener('keydown', e => {
    if (document.body.dataset.app && document.body.dataset.app !== 'explorer') return;
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openModal('#mSearch'); runSearch(); return; }
    if ($('#mSearch').classList.contains('on')) {
      if (e.key === 'Escape') closeModals(); else if (e.key === 'ArrowDown') { sel = Math.min(hits.length - 1, sel + 1); drawHits(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); drawHits(); e.preventDefault(); } else if (e.key === 'Enter') pick(sel);
      return;
    }
    if (e.key === 'Escape') { if ($('#mKeys').classList.contains('on')) closeModals(); else if (inspIdx >= 0) closeInsp(); else gotoStep(-1); return; }
    if (typing || e.ctrlKey || e.altKey || e.metaKey) return;
    const k = e.key, K = k.toLowerCase();
    if (k === '/') { e.preventDefault(); openModal('#mSearch'); runSearch(); }
    else if (k === '?') openModal('#mKeys');
    else if (k === ' ') { e.preventDefault(); togglePlay(); }
    else if (k === 'ArrowRight') { if (inspIdx >= 0) openInsp(Math.min(cur.messages.length - 1, inspIdx + 1)); else stepNext(); }
    else if (k === 'ArrowLeft') { if (inspIdx >= 0) openInsp(Math.max(0, inspIdx - 1)); else stepPrev(); }
    else if (/^[1-9]$/.test(k)) gotoStep(+k - 1, true);
    else if (K === 's') { granular = !granular; $('#bStep').textContent = granular ? 'STEP·1' : 'STEP'; }
    else if (k === '[' || k === ']') { const o = [...$('#speed').options], i = o.findIndex(x => +x.value === speed), j = Math.max(0, Math.min(o.length - 1, i + (k === ']' ? 1 : -1))); $('#speed').selectedIndex = j; speed = +o[j].value; }
    else if (K === 'v') setView(view === 'net' ? 'seq' : 'net');
    else if (K === 'd') toggleBody('diagram', '#bDiag');
    else if (K === 'l') toggleBody('nolist', '#bList');
    else if (K === 'f') $('#bFull').click();
    else if (K === 't') $('#bTheme').click();
    else if (K === 'j') setLang(lang === 'ts' ? 'java' : 'ts');
    else if (K === 'n' || K === 'p') { const i = SC.indexOf(SC.find(s => s === cur)); const j = (i + (K === 'n' ? 1 : -1) + SC.length) % SC.length; selectScenario(SC[j].id); }
  });
  addEventListener('resize', () => cur && moveCam(false));
  renderTabs();
  if (!SC.length) { $('#list').innerHTML = '<div class="empty">No scenarios loaded.</div>'; return; }
  const h = location.hash.slice(1).split('/'); const first = SC.find(s => s.id === h[0]) || SC[0];
  selectScenario(first.id, h[1] ? +h[1] - 1 : null);
}
window.EXPLORER = {hl, lang: () => lang, setLang, onLang: f => (window.__langL = window.__langL || []).push(f), get cur() { return cur }, get st() { return st }, selectScenario, gotoStep, togglePlay, setView, scenarios: SC};
init();
})();
