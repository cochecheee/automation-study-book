/* One page, three apps: Explorer, Live Demo, Study Book (embedded). */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const BOOK = 'playwright-deep-dive-en.html';
let bookSrc = '';

function theme() { return document.documentElement.dataset.theme; }
function pushTheme() { const f = $('#book'); try { f.contentWindow.postMessage({pwTheme: theme()}, '*'); } catch (e) { } }
$('#book').addEventListener('load', pushTheme);
new MutationObserver(pushTheme).observe(document.documentElement, {attributes: true, attributeFilter: ['data-theme']});

function setApp(app, arg, at) {
  if (!['explorer', 'demo', 'book'].includes(app)) app = 'explorer';
  document.body.dataset.app = app;
  $$('#apps button').forEach(b => b.classList.toggle('on', b.dataset.app === app));
  if (app === 'book') {
    const src = BOOK + '?embed=1' + (arg ? '#' + arg : '');
    if (src !== bookSrc) { bookSrc = src; $('#book').src = src; }
    history.replaceState(null, '', '#book' + (arg ? '/' + arg : ''));
  } else if (app === 'demo') {
    if (window.DEMO) { if (arg) window.DEMO.open(arg, at); window.DEMO.fit(); setTimeout(window.DEMO.fit, 60); }
    if (!arg && window.DEMO) history.replaceState(null, '', '#demo');
  } else {
    const cur = window.EXPLORER && window.EXPLORER.cur;
    if (arg && window.EXPLORER) window.EXPLORER.selectScenario(arg, at);
    else if (cur) history.replaceState(null, '', '#' + cur.id);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 30);
  }
}
window.openBook = slug => setApp('book', slug);
window.openApp = setApp;

$$('#apps button').forEach(b => b.onclick = () => setApp(b.dataset.app));

function route() {
  const h = location.hash.slice(1).split('/');
  if (h[0] === 'book') setApp('book', h[1] || '');
  else if (h[0] === 'demo') setApp('demo', h[1] || null, h[2] ? +h[2] - 1 : null);
  else document.body.dataset.app = 'explorer';
}
function setHH() { document.documentElement.style.setProperty('--hh', $('#top').offsetHeight + 'px'); }
addEventListener('resize', setHH); setHH(); setTimeout(setHH, 200);
route();
})();
