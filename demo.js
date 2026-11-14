/* Live Demo: test code drives a mock website. Sites + scripts + engine. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const money = n => '$' + n.toFixed(2);
const norm = s => (s || '').replace(/\s+/g, ' ').trim();

/* ================= SITE 1: Northwind Shop (desktop browser) ================= */
const PRODUCTS = [
  {id: 1, name: 'Wireless Mouse', price: 24, emoji: '🖱️'}, {id: 2, name: 'Mechanical Keyboard', price: 89, emoji: '⌨️'},
  {id: 3, name: 'USB-C Hub', price: 39, emoji: '🔌'}, {id: 4, name: 'Monitor Stand', price: 45, emoji: '🖥️'}];
const SHOP = {
  frame: 'browser',
  init: () => ({screen: 'blank', fields: {}, user: null, query: '', cart: [], mocked: false, err: '', url: 'about:blank'}),
  list(S) { let l = S.mocked ? PRODUCTS.filter(p => p.id === 1 || p.id === 3) : PRODUCTS; const q = (S.query || '').toLowerCase(); return q ? l.filter(p => p.name.toLowerCase().includes(q)) : l; },
  url(S) { return ({blank: 'about:blank', login: 'https://shop.example.com/login', catalog: 'https://shop.example.com/products' + (S.query ? '?q=' + encodeURIComponent(S.query) : ''), cart: 'https://shop.example.com/cart', done: 'https://shop.example.com/confirmation'})[S.screen]; },
  render(S) {
    const f = k => esc(S.fields[k] || '');
    const top = `<div class="ms-top"><span class="ms-brand">NORTH<i>WIND</i></span><span class="ms-sp"></span>${S.screen === 'catalog' ? `<input data-q="search" type="text" placeholder="Search products" value="${f('search')}"><a class="ms-link" data-q="cart-link">Cart (${S.cart.length})</a>` : ''}${S.screen === 'cart' || S.screen === 'done' ? '<a class="ms-link">Shop</a>' : ''}</div>`;
    let body = '';
    if (S.screen === 'blank') return '<div class="ms"><div class="ms-blank">about:blank</div></div>';
    if (S.screen === 'login') body = `<div class="ms-card ms-login"><h1>Sign in</h1><label class="ms-f">Email<input data-q="email" type="email" value="${f('email')}"></label><label class="ms-f">Password<input data-q="password" type="password" value="${f('password')}"></label><button data-q="signin" style="width:100%">Sign in</button><div class="ms-err">${esc(S.err)}</div></div>`;
    if (S.screen === 'catalog') body = `<div class="ms-welcome" data-q="welcome">Welcome, ${esc(S.user)}</div>${S.mocked ? '<div class="ms-mock">⚡ GET /api/products answered by route.fulfill (mocked response: 2 items)</div>' : ''}<div class="ms-grid">${SHOP.list(S).map(p => `<div class="ms-card ms-prod" data-q="card-${p.id}"><div class="img">${p.emoji}</div><b>${p.name}</b><span>${money(p.price)}</span><button data-q="add-${p.id}">Add to cart</button></div>`).join('')}</div>`;
    if (S.screen === 'cart') body = `<div class="ms-cart"><h1>Your cart</h1>${S.cart.map(p => `<div class="ms-row"><span>${p.emoji} ${p.name}</span><span>${money(p.price)}</span></div>`).join('')}<div class="ms-total"><span>Total</span><strong data-q="total">${money(S.cart.reduce((a, p) => a + p.price, 0))}</strong></div><p style="text-align:right"><button data-q="checkout">Checkout</button></p></div>`;
    if (S.screen === 'done') body = `<div class="ms-done"><div class="ok">✓</div><h1 data-q="confirm">Order confirmed</h1><p>Order #1042 · a confirmation email is on its way</p></div>`;
    return `<div class="ms">${top}${body}</div>`;
  },
  act(S, st) {
    const net = [], m = S.mocked;
    if (st.kind === 'route') { S.mocked = true; return net; }
    if (st.kind === 'goto') { S.screen = st.screen; net.push({m: 'GET', u: '/login', s: 200}); }
    else if (st.kind === 'fill') { S.fields[st.q] = st.value; if (st.q === 'search') { S.query = st.value; net.push({m: 'GET', u: '/api/products?q=' + st.value, s: 200, mock: m}); } }
    else if (st.kind === 'click') {
      if (st.q === 'signin') { if (S.fields.email && S.fields.password) { S.user = 'Ada'; S.screen = 'catalog'; net.push({m: 'POST', u: '/api/login', s: 200}, {m: 'GET', u: '/api/products', s: 200, mock: m}); } else S.err = 'Enter email and password'; }
      else if (/^add-/.test(st.q || '')) { /* handled below via sel */ }
      else if (st.q === 'cart-link') S.screen = 'cart';
      else if (st.q === 'checkout') { S.screen = 'done'; net.push({m: 'POST', u: '/api/checkout', s: 200}); }
      if (st.addFirst) { const p = SHOP.list(S)[0]; if (p) { S.cart.push(p); net.push({m: 'POST', u: '/api/cart', s: 201}); } }
    }
    S.url = SHOP.url(S); return net;
  },
  ttl: 'Northwind Shop'
};

/* ================= SITE 2: TaskFlow (phone) ================= */
const TASKS = {
  frame: 'phone',
  init: () => ({screen: 'blank', fields: {}, tasks: [], nextId: 3, filter: 'all', offline: false, dark: false, toast: null, device: 'Desktop Chromium · 1280×720', url: 'about:blank'}),
  url: S => S.screen === 'blank' ? 'about:blank' : 'https://tasks.example.com/',
  render(S) {
    if (S.screen === 'blank') return `<div class="mt ${S.dark ? 'dark' : ''}"><div class="blank">about:blank</div></div>`;
    const vis = S.tasks.filter(t => S.filter === 'all' || (S.filter === 'active' ? !t.done : t.done)), left = S.tasks.filter(t => !t.done).length;
    return `<div class="mt ${S.dark ? 'dark' : ''}"><div class="sb"><span>9:41</span><span>5G ▮▮▮</span></div>
    <div class="hd"><h1>TaskFlow</h1><span class="net ${S.offline ? 'off' : ''}" data-q="net">${S.offline ? '● offline' : '● online'}</span></div>
    <div class="add"><input data-q="todo" type="text" placeholder="What needs doing?" value="${esc(S.fields.todo || '')}"><button data-q="add">Add</button></div>
    <div class="chips">${['all', 'active', 'done'].map(f => `<button data-q="f-${f}" class="${S.filter === f ? 'on' : ''}">${f[0].toUpperCase() + f.slice(1)}</button>`).join('')}</div>
    <ul>${vis.map(t => `<li class="${t.done ? 'done' : ''}" data-q="t-${t.id}"><input type="checkbox" data-q="chk-${t.id}" ${t.done ? 'checked' : ''}><span class="t">${esc(t.text)}</span>${t.pending ? '<span class="pend">☁ pending</span>' : ''}</li>`).join('')}</ul>
    <div class="ft" data-q="count">${left} item${left === 1 ? '' : 's'} left</div>
    ${S.toast ? `<div class="toast ${S.toast.c}" data-q="toast">${esc(S.toast.t)}</div>` : ''}</div>`;
  },
  act(S, st) {
    const net = []; S.toast = null;
    if (st.kind === 'ctx') {
      if (st.set) { const was = S.offline; Object.assign(S, st.set);
        if (was && S.offline === false) { const n = S.tasks.filter(t => t.pending).length; if (n) { S.tasks.forEach(t => t.pending = false); S.toast = {t: 'Synced', c: 'good'}; net.push({m: 'POST', u: '/api/sync (' + n + ' queued)', s: 200}); } } }
    } else if (st.kind === 'goto') { S.screen = 'list'; S.tasks = [{id: 1, text: 'Buy milk', done: false}, {id: 2, text: 'Walk the dog', done: false}]; net.push({m: 'GET', u: '/', s: 200}, {m: 'GET', u: '/api/tasks', s: 200}); }
    else if (st.kind === 'fill') S.fields[st.q] = st.value;
    else if (st.kind === 'tap' && st.q === 'add') {
      const text = (S.fields.todo || '').trim();
      if (text) { S.tasks.push({id: S.nextId++, text, done: false, pending: S.offline}); S.fields.todo = '';
        if (S.offline) { S.toast = {t: "You're offline. Saved on this device.", c: 'bad'}; net.push({m: 'POST', u: '/api/tasks', s: 'FAILED', note: 'net::ERR_INTERNET_DISCONNECTED'}); }
        else net.push({m: 'POST', u: '/api/tasks', s: 201}); } }
    else if (st.kind === 'check') { const t = S.tasks.find(x => 'chk-' + x.id === st.q); if (t) { t.done = !t.done; net.push({m: 'PATCH', u: '/api/tasks/' + t.id, s: 200}); } }
    else if (st.kind === 'tap' && /^f-/.test(st.q || '')) S.filter = st.q.slice(2);
    S.url = TASKS.url(S); return net;
  },
  ttl: 'TaskFlow'
};
const SITES = {shop: SHOP, tasks: TASKS};

/* ================= DEMO SCRIPTS ================= */
const DEMOS = [
{
  id: 'shop-checkout', site: 'shop', title: 'Shop: login → cart → checkout', subtitle: 'Desktop web · mock the API · assert',
  level: 1, device: '', guideSlug: 'locators',
  header: {ts: ["import { test, expect } from '@playwright/test';", '', "test('customer can check out', async ({ page }) => {"], java: ['import com.microsoft.playwright.*;', 'import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;', '', '// inside a JUnit test that has a Page `page`']},
  footer: {ts: ['});'], java: []},
  steps: [
    {kind: 'route', title: 'Mock the catalog API', loc: "route('**/api/products*')", ms: 6, cdp: 'Fetch.enable → Fetch.requestPaused ⇒ Fetch.fulfillRequest',
      ts: "await page.route('**/api/products*', route => route.fulfill({ json: [{ id: 1, name: 'Wireless Mouse', price: 24 }, { id: 3, name: 'USB-C Hub', price: 39 }] }));",
      java: 'page.route("**/api/products*", route -> route.fulfill(new Route.FulfillOptions().setContentType("application/json").setBody("[{\\"id\\":1,\\"name\\":\\"Wireless Mouse\\",\\"price\\":24},{\\"id\\":3,\\"name\\":\\"USB-C Hub\\",\\"price\\":39}]")));',
      explain: 'Before the page loads, the test installs a network handler. Any request matching /api/products* will be answered by the test itself with this JSON, so the catalog will show only two items no matter what the real backend returns.', banner: '⚡ page.route registered'},
    {kind: 'goto', screen: 'login', title: 'Open the login page', loc: 'goto(url)', ms: 412, cdp: 'Page.navigate → Page.loadEventFired',
      ts: "await page.goto('https://shop.example.com/login');", java: 'page.navigate("https://shop.example.com/login");',
      explain: 'The browser navigates. goto resolves when the load event fires, and the login form appears on the website.'},
    {kind: 'fill', q: 'email', value: 'ada@example.com', title: 'Fill the email', loc: "getByLabel('Email')", ms: 31, cdp: 'DOM.focus + Input.insertText',
      ts: "await page.getByLabel('Email').fill('ada@example.com');", java: 'page.getByLabel("Email").fill("ada@example.com");',
      explain: 'getByLabel finds the input through its visible label text, the way a user does. fill focuses the field and types the value in one go.'},
    {kind: 'fill', q: 'password', value: 's3cret!', title: 'Fill the password', loc: "getByLabel('Password')", ms: 29, cdp: 'DOM.focus + Input.insertText',
      ts: "await page.getByLabel('Password').fill('s3cret!');", java: 'page.getByLabel("Password").fill("s3cret!");',
      explain: 'Same idea for the password. The value is masked on screen but sent as real characters to the page.'},
    {kind: 'click', q: 'signin', title: 'Click “Sign in”', loc: "getByRole('button', { name: 'Sign in' })", ms: 46, cdp: 'Input.dispatchMouseEvent (move, press, release)',
      ts: "await page.getByRole('button', { name: 'Sign in' }).click();", java: 'page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign in")).click();',
      explain: 'Before clicking, Playwright waits until the button is visible, stable, enabled and not covered. Then it presses the mouse at the centre of the button. The site sends POST /api/login and shows the catalog.'},
    {kind: 'expect', q: 'welcome', assert: 'toBeVisible', title: 'Assert the welcome text', loc: "getByText('Welcome, Ada')", ms: 18, cdp: 'Runtime.evaluate (polled)',
      ts: "await expect(page.getByText('Welcome, Ada')).toBeVisible();", java: 'assertThat(page.getByText("Welcome, Ada")).isVisible();',
      explain: 'A web-first assertion: it re-checks until the text is visible or the 5 s timeout expires, so it does not matter if the catalog takes a moment to render.'},
    {kind: 'fill', q: 'search', value: 'mouse', title: 'Search for “mouse”', loc: "getByPlaceholder('Search products')", ms: 33, cdp: 'DOM.focus + Input.insertText',
      ts: "await page.getByPlaceholder('Search products').fill('mouse');", java: 'page.getByPlaceholder("Search products").fill("mouse");',
      explain: 'The site filters its list. Note the mocked response banner: the catalog data comes from the route handler, not from the server.'},
    {kind: 'click', sel: '[data-q^="add-"]', q: 'add-1', addFirst: true, title: 'Add the first result', loc: "getByRole('button', { name: 'Add to cart' }).first()", ms: 44, cdp: 'Input.dispatchMouseEvent',
      ts: "await page.getByRole('button', { name: 'Add to cart' }).first().click();", java: 'page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Add to cart")).first().click();',
      explain: 'The filtered list can contain several “Add to cart” buttons, and click() would throw on ambiguity (strict mode), so .first() picks one explicitly. The cart counter becomes (1).'},
    {kind: 'click', q: 'cart-link', title: 'Open the cart', loc: "getByRole('link', { name: 'Cart (1)' })", ms: 42, cdp: 'Input.dispatchMouseEvent',
      ts: "await page.getByRole('link', { name: 'Cart (1)' }).click();", java: 'page.getByRole(AriaRole.LINK, new Page.GetByRoleOptions().setName("Cart (1)")).click();',
      explain: 'The accessible name of the link includes the count, which makes this locator also an implicit check of the badge.'},
    {kind: 'expect', q: 'total', assert: 'toHaveText', value: '$24.00', title: 'Assert the total', loc: "getByTestId('total')", ms: 21, cdp: 'Runtime.evaluate (polled)',
      ts: "await expect(page.getByTestId('total')).toHaveText('$24.00');", java: 'assertThat(page.getByTestId("total")).hasText("$24.00");',
      explain: 'getByTestId targets data-testid and is a stable choice for elements without good role or text. toHaveText compares the full normalised text.'},
    {kind: 'click', q: 'checkout', title: 'Click “Checkout”', loc: "getByRole('button', { name: 'Checkout' })", ms: 51, cdp: 'Input.dispatchMouseEvent',
      ts: "await page.getByRole('button', { name: 'Checkout' }).click();", java: 'page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Checkout")).click();',
      explain: 'POST /api/checkout runs against the real backend (it is not mocked) and the site navigates to the confirmation page.'},
    {kind: 'expectUrl', re: 'confirmation', title: 'Assert the URL', loc: 'page', ms: 15, cdp: 'Runtime.evaluate (location.href)',
      ts: 'await expect(page).toHaveURL(/confirmation/);', java: 'assertThat(page).hasURL(java.util.regex.Pattern.compile(".*confirmation"));',
      explain: 'Page-level assertion: waits until the URL matches. Combined with the heading check next, it proves the order really went through.'},
    {kind: 'expect', q: 'confirm', assert: 'toBeVisible', title: 'Assert “Order confirmed”', loc: "getByRole('heading', { name: 'Order confirmed' })", ms: 17, cdp: 'Runtime.evaluate (polled)',
      ts: "await expect(page.getByRole('heading', { name: 'Order confirmed' })).toBeVisible();", java: 'assertThat(page.getByRole(AriaRole.HEADING, new Page.GetByRoleOptions().setName("Order confirmed"))).isVisible();',
      explain: 'The user-visible outcome. The test ends here and the browser context is thrown away, so the next test starts clean.'}
  ],
  tail: {ts: '', java: ''}
},
{
  id: 'tasks-mobile', site: 'tasks', title: 'TaskFlow: mobile app, offline mode', subtitle: 'Pixel 7 emulation · tap · setOffline',
  level: 2, device: 'Pixel 7 · 412×915 · touch', guideSlug: 'emulation',
  header: {ts: ["import { test, expect, devices } from '@playwright/test';", '', "test('works on a phone, even offline', async ({ browser }) => {"], java: ['import com.microsoft.playwright.*;', 'import com.microsoft.playwright.options.*;', 'import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;', '', '// Java has no devices[...] registry: set the options by hand', 'Browser browser = playwright.chromium().launch();']},
  footer: {ts: ['});'], java: ['context.close();']},
  steps: [
    {kind: 'ctx', set: {dark: true, device: 'Pixel 7 · 412×915 · touch · dark'}, title: 'Create a Pixel 7 context', loc: "newContext({ ...devices['Pixel 7'] })", ms: 14, cdp: 'Emulation.setDeviceMetricsOverride + setTouchEmulationEnabled + setUserAgentOverride',
      ts: "const context = await browser.newContext({ ...devices['Pixel 7'], colorScheme: 'dark' });\nconst page = await context.newPage();",
      java: 'BrowserContext context = browser.newContext(new Browser.NewContextOptions()\n  .setViewportSize(412, 915).setDeviceScaleFactor(2.625)\n  .setIsMobile(true).setHasTouch(true).setColorScheme(ColorScheme.DARK));\nPage page = context.newPage();',
      explain: 'A fresh BrowserContext with the phone profile: viewport, pixel density, mobile user agent, touch events and dark mode. The website now sees a phone.', banner: '📱 Emulation: Pixel 7'},
    {kind: 'goto', screen: 'list', title: 'Open the app', loc: 'goto(url)', ms: 388, cdp: 'Page.navigate → Page.loadEventFired',
      ts: "await page.goto('https://tasks.example.com');", java: 'page.navigate("https://tasks.example.com");',
      explain: 'The mobile layout renders. Two tasks come from the server.'},
    {kind: 'fill', q: 'todo', value: 'Write Playwright test', title: 'Type a new task', loc: "getByPlaceholder('What needs doing?')", ms: 36, cdp: 'DOM.focus + Input.insertText',
      ts: "await page.getByPlaceholder('What needs doing?').fill('Write Playwright test');", java: 'page.getByPlaceholder("What needs doing?").fill("Write Playwright test");',
      explain: 'fill works the same on a phone: the field is focused and the text inserted.'},
    {kind: 'tap', q: 'add', title: 'Tap “Add”', loc: "getByRole('button', { name: 'Add' })", ms: 52, cdp: 'Input.dispatchTouchEvent (touchStart, touchEnd)',
      ts: "await page.getByRole('button', { name: 'Add' }).tap();", java: 'page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Add")).tap();',
      explain: 'tap() sends real touch events, which only works because the context was created with hasTouch. A desktop click() would not fire touch handlers.'},
    {kind: 'check', q: 'chk-1', title: 'Check “Buy milk”', loc: "getByRole('checkbox', { name: 'Buy milk' })", ms: 39, cdp: 'Input.dispatchMouseEvent + state check',
      ts: "await page.getByRole('checkbox', { name: 'Buy milk' }).check();", java: 'page.getByRole(AriaRole.CHECKBOX, new Page.GetByRoleOptions().setName("Buy milk")).check();',
      explain: 'check() is idempotent: if the box were already ticked it would do nothing, and afterwards it verifies the state really changed.'},
    {kind: 'expect', q: 'count', assert: 'toHaveText', value: '2 items left', title: 'Assert the counter', loc: "getByTestId('count')", ms: 19, cdp: 'Runtime.evaluate (polled)',
      ts: "await expect(page.getByTestId('count')).toHaveText('2 items left');", java: 'assertThat(page.getByTestId("count")).hasText("2 items left");',
      explain: 'Three tasks, one done, so two are left. The assertion retries until the UI settles.'},
    {kind: 'tap', q: 'f-active', title: 'Filter: Active', loc: "getByRole('button', { name: 'Active' })", ms: 47, cdp: 'Input.dispatchTouchEvent',
      ts: "await page.getByRole('button', { name: 'Active' }).tap();", java: 'page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Active")).tap();',
      explain: 'The completed task disappears from the list: the filter works with the same touch gesture.'},
    {kind: 'ctx', set: {offline: true}, title: 'Go offline', loc: 'context.setOffline(true)', ms: 5, cdp: 'Network.emulateNetworkConditions { offline: true }',
      ts: 'await context.setOffline(true);', java: 'context.setOffline(true);',
      explain: 'The whole context loses its network. From now on every request fails with net::ERR_INTERNET_DISCONNECTED, exactly like airplane mode.', banner: '✈️ context.setOffline(true)'},
    {kind: 'fill', q: 'todo', value: 'Pay rent', title: 'Type another task', loc: "getByPlaceholder('What needs doing?')", ms: 30, cdp: 'DOM.focus + Input.insertText',
      ts: "await page.getByPlaceholder('What needs doing?').fill('Pay rent');", java: 'page.getByPlaceholder("What needs doing?").fill("Pay rent");',
      explain: 'Typing works offline, since it is all local.'},
    {kind: 'tap', q: 'add', title: 'Tap “Add” offline', loc: "getByRole('button', { name: 'Add' })", ms: 48, cdp: 'Input.dispatchTouchEvent',
      ts: "await page.getByRole('button', { name: 'Add' }).tap();", java: 'page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Add")).tap();',
      explain: 'The POST fails, and the app (a PWA-style client) keeps the task locally with a pending marker and tells the user. This is the behaviour you want to be able to test.'},
    {kind: 'ctx', set: {offline: false}, title: 'Back online', loc: 'context.setOffline(false)', ms: 5, cdp: 'Network.emulateNetworkConditions { offline: false }',
      ts: 'await context.setOffline(false);', java: 'context.setOffline(false);',
      explain: 'The network returns; the app syncs the queued task and shows “Synced”.', banner: '📶 context.setOffline(false)'},
    {kind: 'expect', q: 'toast', assert: 'toBeVisible', title: 'Assert “Synced” toast', loc: "getByText('Synced')", ms: 22, cdp: 'Runtime.evaluate (polled)',
      ts: "await expect(page.getByText('Synced')).toBeVisible();", java: 'assertThat(page.getByText("Synced")).isVisible();',
      explain: 'Offline then online, verified end to end in a few lines. The pending marker disappeared too.'}
  ]
}];

/* ================= ENGINE ================= */
let D = null, SITE = null, S = null, step = -1, playing = false, tok = 0, speed = 1, log = [], net = [];
const EX = () => window.EXPLORER || {};
const lang = () => (EX().lang ? EX().lang() : 'ts');
const hl = c => (EX().hl ? EX().hl(c) : esc(c));
const kindName = {goto: 'page.goto', fill: 'locator.fill', click: 'locator.click', tap: 'locator.tap', check: 'locator.check', route: 'page.route', ctx: 'context'};
const selOf = st => st.sel || (st.q ? `[data-q="${st.q}"]` : null);

function renderList() {
  $('#dList').innerHTML = DEMOS.map(d => {
    const on = D && D.id === d.id;
    return `<div class="sc ${on ? 'on' : ''}" data-id="${d.id}"><button><span class="dot"></span><span><b>${esc(d.title)}</b><small>${esc(d.subtitle)}</small></span><span class="plat">${SITES[d.site].frame === 'phone' ? 'Mobile' : 'Web'}</span></button><div class="steps">${on ? d.steps.map((x, i) => `<div class="st ${step === i ? 'act' : ''} ${step > i ? 'done' : ''}" data-i="${i}"><div class="n">${step > i ? '✓' : i + 1}</div><div><b>${esc(x.title)}</b><small>${esc(x.cdp)}</small></div></div>`).join('') : ''}</div></div>`;
  }).join('');
  $$('#dList .sc > button').forEach(b => b.onclick = () => selectDemo(b.parentElement.dataset.id));
  $$('#dList .st').forEach(e => e.onclick = () => goStep(+e.dataset.i));
  const a = $('#dList .st.act') || $('#dList .sc.on'); a && a.scrollIntoView({block: 'nearest'});
}
function buildFrame() {
  const phone = SITE.frame === 'phone';
  $('#dFit').innerHTML = phone
    ? `<div class="dphone"><div class="dviewport"><div id="dvp" style="height:100%"></div><div class="dov" id="dov"><div class="dcur" id="dcur"></div></div></div><div class="dlabel" id="dlabel"></div></div>`
    : `<div class="dbrowser"><div class="dbar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><div class="url" id="durl"></div></div><div class="dviewport"><div id="dvp" style="height:100%"></div><div class="dov" id="dov"><div class="dcur" id="dcur"></div></div></div></div>`;
  $('#dcur').innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 2l17 8-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  fit(); placeCursor(40, 40, false);
}
function fit() {
  const st = $('#dStage'); if (!st || !D) return; const phone = SITE.frame === 'phone';
  const dw = phone ? 400 : 790, dh = phone ? 840 : 520, k = Math.min(st.clientWidth / (dw + 30), st.clientHeight / (dh + 30), 1.2);
  $('#dFit').style.transform = `translate(-50%,-50%) scale(${Math.max(.3, k)})`;
}
function vpScale() { const vp = $('#dvp'); return vp.getBoundingClientRect().width / vp.offsetWidth || 1; }
function relRect(el) { const vp = $('#dvp').getBoundingClientRect(), r = el.getBoundingClientRect(), k = vpScale(); return {x: (r.left - vp.left) / k, y: (r.top - vp.top) / k, w: r.width / k, h: r.height / k}; }
function placeCursor(x, y, anim = true) { const c = $('#dcur'); if (!c) return; c.style.transition = anim ? '' : 'none'; c.style.left = x + 'px'; c.style.top = y + 'px'; if (!anim) { c.offsetHeight; c.style.transition = ''; } }
function paintSite() {
  $('#dvp').innerHTML = SITE.render(S);
  const u = $('#durl'); if (u) u.textContent = SITE.url(S);
  const l = $('#dlabel'); if (l) l.textContent = S.device;
}
function clearOv() { $$('#dov .dhl, #dov .dripple, #dov .dbanner').forEach(e => e.remove()); }
function addHl(el, label, cls = '') { const r = relRect(el), d = document.createElement('div'); d.className = 'dhl ' + cls; d.style.cssText = `left:${r.x - 3}px;top:${r.y - 3}px;width:${r.w + 6}px;height:${r.h + 6}px`; d.innerHTML = `<span>${esc(label)}</span>`; $('#dov').appendChild(d); return d; }
function banner(t) { const b = document.createElement('div'); b.className = 'dbanner'; b.textContent = t; $('#dov').appendChild(b); }
function evalExpect(st) {
  const vp = $('#dvp'), el = selOf(st) ? vp.querySelector(selOf(st)) : null;
  if (st.kind === 'expectUrl') return {ok: new RegExp(st.re).test(SITE.url(S)), el: null, label: 'toHaveURL'};
  if (st.assert === 'toBeVisible') return {ok: !!el, el, label: 'toBeVisible'};
  if (st.assert === 'toHaveText') return {ok: !!el && norm(el.textContent) === st.value, el, label: 'toHaveText'};
  return {ok: false, el, label: st.assert};
}
function entry(i, ok, extra) { const st = D.steps[i]; return {n: i + 1, action: st.kind.startsWith('expect') ? 'expect.' + (st.assert || 'toHaveURL') : (kindName[st.kind] || st.kind) + (st.kind === 'ctx' && st.set && 'offline' in st.set ? '.setOffline' : ''), loc: st.loc, ms: st.ms, ok, extra}; }

async function runStep(i, animate, myTok) {
  const st = D.steps[i], alive = () => myTok === tok;
  clearOv();
  if (st.kind === 'expect' || st.kind === 'expectUrl') {
    const r = evalExpect(st);
    if (animate && r.el) { addHl(r.el, `${r.ok ? '✔' : '✘'} ${r.label}`, r.ok ? 'ok' : 'bad'); await sleep(900 / speed); }
    else if (animate && st.kind === 'expectUrl') { banner(`${r.ok ? '✔' : '✘'} toHaveURL(/${st.re}/)`); await sleep(900 / speed); }
    log.push(entry(i, r.ok)); return;
  }
  const el = selOf(st) ? $('#dvp').querySelector(selOf(st)) : null;
  if (animate && el) {
    const r = relRect(el); placeCursor(r.x + r.w / 2 - 4, r.y + r.h / 2 - 2); await sleep(560 / speed); if (!alive()) return;
    el.classList.add('ms-focus'); const h = addHl(el, st.loc);
    if (st.kind === 'fill' && st.value != null && 'value' in el) {
      el.value = ''; const per = Math.min(55, 900 / Math.max(1, st.value.length));
      for (const ch of st.value) { el.value += ch; await sleep(per / speed); if (!alive()) return; }
      await sleep(200 / speed);
    } else if (['click', 'tap', 'check'].includes(st.kind)) {
      const rp = document.createElement('div'); rp.className = 'dripple'; rp.style.left = (r.x + r.w / 2 - 6) + 'px'; rp.style.top = (r.y + r.h / 2 - 6) + 'px'; $('#dov').appendChild(rp);
      await sleep(420 / speed);
    } else await sleep(300 / speed);
  } else if (animate) {
    if (st.banner) banner(st.banner); await sleep(900 / speed);
  }
  if (!alive()) return;
  const nets = SITE.act(S, st) || []; paintSite();
  nets.forEach(n => net.push({...n, t: i + 1}));
  if (animate && st.banner && el) banner(st.banner);
  log.push(entry(i, true));
  if (animate) await sleep(450 / speed);
}
function applyInstant(i) {
  S = SITE.init(); log = []; net = []; paintSite();
  for (let k = 0; k <= i; k++) {
    const st = D.steps[k];
    if (st.kind === 'expect' || st.kind === 'expectUrl') { log.push(entry(k, evalExpect(st).ok)); continue; }
    const nets = SITE.act(S, st) || []; paintSite(); nets.forEach(n => net.push({...n, t: k + 1})); log.push(entry(k, true));
  }
  paintSite(); clearOv();
}

/* ---------- panels ---------- */
function renderCode() {
  const L = lang(), pre = D.header[L] || [], post = D.footer[L] || []; let n = 0;
  const lines = [];
  pre.forEach(t => lines.push(`<div class="cl pre"><span class="ln">${++n}</span><pre>${hl(t)}</pre></div>`));
  D.steps.forEach((s, i) => {
    const code = s[L] != null ? s[L] : '// ' + (s.javaNote || 'not available in this language');
    const cls = i === step ? 'on' : i < step ? 'done' : 'todo', ind = L === 'ts' ? '  ' : '';
    const body = code.split('\n').map(x => ind + x).join('\n');
    lines.push(`<div class="cl ${cls}" data-i="${i}"><span class="ln">${n + 1}</span><pre>${hl(body)}</pre></div>`); n += code.split('\n').length;
  });
  post.forEach(t => lines.push(`<div class="cl pre"><span class="ln">${++n}</span><pre>${hl(t)}</pre></div>`));
  $('#dCode').innerHTML = lines.join('');
  $$('#dCode .cl[data-i]').forEach(e => e.onclick = () => goStep(+e.dataset.i));
  const on = $('#dCode .cl.on'); on && on.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  
}
function renderExplain() {
  const box = $('#dExplain');
  if (step < 0) { box.innerHTML = `<div class="stepno">${esc(D.title.toUpperCase())}</div><p class="rtext">${esc(D.overview || 'Press PLAY: each line of the test runs against the website on the left. Watch the cursor, the pink locator box, the typing, the network calls and the assertions.')}</p><p><a class="btn" id="dBook">📖 Deep dive</a></p>`; const b = $('#dBook'); if (b) b.onclick = () => window.openBook && window.openBook(D.guideSlug); return; }
  const s = D.steps[step], e = log[step];
  box.innerHTML = `<div class="stepno">STEP ${step + 1} OF ${D.steps.length}</div><div class="rtitle">${esc(s.title)}</div><p class="rtext">${esc(s.explain)}</p>
  <div class="kv"><div class="k">Locator</div><div>${esc(s.loc || '—')}</div><div class="k">Protocol</div><div>${esc(s.cdp)}</div><div class="k">Duration</div><div>${s.ms} ms${e ? (e.ok ? ' · <span class="st-ok">passed</span>' : ' · <span class="st-bad">failed</span>') : ''}</div></div>
  <p><a class="btn" id="dBook">📖 Deep dive</a></p>`;
  $('#dBook').onclick = () => window.openBook && window.openBook(D.guideSlug);
}
function renderLogs() {
  $('#aLog').innerHTML = `<table><thead><tr><th>#</th><th>ACTION</th><th>LOCATOR</th><th style="text-align:right">TIME</th></tr></thead><tbody>${log.length ? log.map(e => `<tr class="row ${e.n === step + 1 ? 'cur' : ''}" data-i="${e.n - 1}"><td><span class="no" style="background:${e.ok ? 'var(--ok)' : 'var(--bad)'}">${e.n}</span></td><td style="color:var(--head)">${esc(e.action)}</td><td class="info">${esc(e.loc || '')}</td><td style="text-align:right">${e.ms} ms</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No actions yet. Press PLAY.</td></tr>'}</tbody></table>`;
  $$('#aLog .row').forEach(r => r.onclick = () => goStep(+r.dataset.i));
  const c = $('#aLog .row.cur'); c && c.scrollIntoView({block: 'nearest'});
  $('#nLog').innerHTML = `<table><thead><tr><th>#</th><th>METHOD</th><th>URL</th><th>STATUS</th></tr></thead><tbody>${net.length ? net.map(n => `<tr><td>${n.t}</td><td style="color:var(--c-HTTP)">${esc(n.m)}</td><td class="info">${esc(n.u)}${n.mock ? '<span class="tagm">MOCKED</span>' : ''}</td><td class="${n.s === 'FAILED' ? 'st-bad' : 'st-ok'}">${esc(n.s)}${n.note ? ' ' + esc(n.note) : ''}</td></tr>`).join('') : '<tr><td colspan="4" class="empty">No requests yet.</td></tr>'}</tbody></table>`;
  const l = $('#nLog .tw'); const w = $('#nLog'); w.scrollTop = w.scrollHeight;
}
function renderAll() {
  renderList(); renderCode(); renderExplain(); renderLogs();
  $('#dPlay').textContent = playing ? '❚❚ PAUSE' : '▶ PLAY';
  if (document.body.dataset.app === 'demo') history.replaceState(null, '', '#demo/' + D.id + (step >= 0 ? '/' + (step + 1) : ''));
}
function selectDemo(id, at) {
  const d = DEMOS.find(x => x.id === id); if (!d) return; stop(); D = d; SITE = SITES[d.site]; step = -1;
  $('#dTitle').textContent = d.title; $('#dChips').innerHTML = `<span class="chip">${SITE.frame === 'phone' ? 'mobile emulation' : 'desktop browser'}</span><span class="chip">${esc(SITE.ttl)}</span>`;
  S = SITE.init(); log = []; net = []; buildFrame(); paintSite();
  if (at != null && at >= 0) { applyInstant(at); step = at; }
  renderAll();
}
function goStep(i) { if (!D) return; stop(); i = Math.max(-1, Math.min(D.steps.length - 1, i)); if (i < 0) { S = SITE.init(); log = []; net = []; paintSite(); clearOv(); } else applyInstant(i); step = i; renderAll(); }
function stop() { playing = false; tok++; clearOv(); }
async function play() {
  if (playing) { stop(); renderAll(); return; }
  if (!D) return; if (step >= D.steps.length - 1) { step = -1; S = SITE.init(); log = []; net = []; paintSite(); }
  playing = true; const my = ++tok; $('#dPlay').textContent = '❚❚ PAUSE';
  while (playing && my === tok && step < D.steps.length - 1) {
    step++; const i = step; renderList(); renderCode(); renderExplain();
    await runStep(i, true, my); if (my !== tok) return;
    renderLogs(); renderExplain(); await sleep(250 / speed);
  }
  if (my === tok) { playing = false; renderAll(); }
}
function next() { if (D && step < D.steps.length - 1) goStep(step + 1); }
function prev() { if (D) goStep(step - 1); }

/* ---------- init ---------- */
function init() {
  const el = $('#demo'); if (!el) return;
  $('#dPlay').onclick = play; $('#dNext').onclick = next; $('#dPrev').onclick = prev; $('#dReset').onclick = () => goStep(-1);
  $('#dSpeed').onchange = e => speed = +e.target.value;
  $$('#dLangSeg button').forEach(b => b.onclick = () => { EX().setLang && EX().setLang(b.dataset.l); });
  if (EX().onLang) EX().onLang(l => { $$('#dLangSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === l)); if (D) renderCode(); });
  addEventListener('resize', fit);
  addEventListener('keydown', e => {
    if (document.body.dataset.app !== 'demo' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || e.ctrlKey || e.metaKey) return;
    const k = e.key.toLowerCase();
    if (k === ' ') { e.preventDefault(); play(); } else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev();
    else if (k === 'r') goStep(-1); else if (k === 'j' && EX().setLang) EX().setLang(lang() === 'ts' ? 'java' : 'ts');
    else if (k === 't') $('#bTheme').click(); else if (k === 'f') $('#bFull').click();
  });
  window.DEMO = {open(id, at) { selectDemo(id || DEMOS[0].id, at); }, fit, list: DEMOS, get step() { return step; }, play, goStep};
  selectDemo(DEMOS[0].id);
}
init();
})();
