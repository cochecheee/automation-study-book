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

/* ================= SITE 3: GameDeck, the REAL app in an iframe, driven through its test bridge ================= */
const DECK = {frame: 'app', iframe: true, ttl: 'GameDeck · Electron', src: 'launcher/index.html?embed=1&fresh=1', init: () => ({}), render: () => '', url: () => 'http://localhost:5173/', act: () => []};

/* ---- code generation: the locator expression is BOTH what the bridge evaluates and what the code panel shows ---- */
const jstr = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
function javaLoc(expr) {
  const s = expr.replace(/;$/, ''), re = /\.?\s*(\w+)\(((?:[^()]|\([^()]*\))*)\)/y; let pos = 0, out = 'page', first = true;
  const opt = o => { const r = {}; let m; if (m = o.match(/name\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/)) r.name = m[2]; if (m = o.match(/hasText\s*:\s*(['"`])((?:\\.|(?!\1).)*)\1/)) r.hasText = m[2]; if (/exact\s*:\s*true/.test(o)) r.exact = true; return r; };
  while (pos < s.length) {
    re.lastIndex = pos; const m = re.exec(s); if (!m) break; pos = re.lastIndex;
    const fn = m[1], am = m[2].match(/^\s*(['"`])((?:\\.|(?!\1).)*)\1\s*(?:,\s*(\{[\s\S]*\}))?\s*$/), a = am ? am[2] : m[2].trim(), o = opt(am && am[3] || ''), P = first ? 'Page' : 'Locator';
    if (fn === 'getByRole') { let x = `getByRole(AriaRole.${a.toUpperCase().replace(/-/g, '_')}`; const opts = []; if (o.name != null) opts.push(`.setName(${jstr(o.name)})`); if (o.exact) opts.push('.setExact(true)'); if (opts.length) x += `, new ${P}.GetByRoleOptions()${opts.join('')}`; out += '.' + x + ')'; }
    else if (['getByText', 'getByLabel', 'getByPlaceholder'].includes(fn)) { const cls = {getByText: 'GetByTextOptions', getByLabel: 'GetByLabelOptions', getByPlaceholder: 'GetByPlaceholderOptions'}[fn]; out += `.${fn}(${jstr(a)}${o.exact ? `, new ${P}.${cls}().setExact(true)` : ''})`; }
    else if (fn === 'filter') out += `.filter(new Locator.FilterOptions().setHasText(${jstr(o.hasText || '')}))`;
    else if (fn === 'first' || fn === 'last') out += `.${fn}()`;
    else if (fn === 'nth') out += `.nth(${a})`;
    else out += `.${fn}(${jstr(a)})`;
    first = false;
  }
  return out;
}
const TSQ = v => "'" + String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const JA = {toBeVisible: ['isVisible', 'IsVisibleOptions'], toBeHidden: ['isHidden', 'IsHiddenOptions'], toBeEnabled: ['isEnabled', 'IsEnabledOptions'], toBeChecked: ['isChecked', 'IsCheckedOptions'], toHaveText: ['hasText', 'HasTextOptions'], toContainText: ['containsText', 'ContainsTextOptions'], toHaveValue: ['hasValue', 'HasValueOptions'], toHaveCount: ['hasCount', 'HasCountOptions']};
const OPCDP = {click: 'Input.dispatchMouseEvent (move, press, release)', dblclick: 'Input.dispatchMouseEvent (clickCount: 2)', contextmenu: 'Input.dispatchMouseEvent (button: right)', fill: 'DOM.focus + Input.insertText', select: 'Runtime.callFunctionOn (set option + change event)', check: 'Input.dispatchMouseEvent + state check', press: 'Input.dispatchKeyEvent (keyDown, keyUp)', expect: 'Runtime.evaluate (polled until it passes or times out)', goto: 'Page.navigate → Page.loadEventFired'};
const OPMS = {click: 44, dblclick: 60, contextmenu: 46, fill: 31, select: 28, check: 40, press: 12, expect: 18, goto: 380};
function A(o) {
  const L = 'page.' + o.expr, J = o.expr ? javaLoc(o.expr) : ''; let ts, java;
  switch (o.op) {
    case 'goto': ts = o.ts || "await page.goto('http://localhost:5173/');"; java = o.java || 'page.navigate("http://localhost:5173/");'; break;
    case 'click': ts = `await ${L}.click();`; java = `${J}.click();`; break;
    case 'dblclick': ts = `await ${L}.dblclick();`; java = `${J}.dblclick();`; break;
    case 'contextmenu': ts = `await ${L}.click({ button: 'right' });`; java = `${J}.click(new Locator.ClickOptions().setButton(MouseButton.RIGHT));`; break;
    case 'fill': ts = `await ${L}.fill(${TSQ(o.value)});`; java = `${J}.fill(${jstr(o.value)});`; break;
    case 'select': ts = `await ${L}.selectOption(${TSQ(o.value)});`; java = `${J}.selectOption(${jstr(o.value)});`; break;
    case 'check': ts = `await ${L}.check();`; java = `${J}.check();`; break;
    case 'press': ts = `await page.keyboard.press(${TSQ(o.key)});`; java = `page.keyboard().press(${jstr(o.key)});`; break;
    case 'expect': {
      const num = o.assert === 'toHaveCount', arg = o.value != null ? (num ? o.value : TSQ(o.value)) : '', jm = JA[o.assert], to = o.timeout ? `{ timeout: ${String(o.timeout).replace(/\B(?=(\d{3})+$)/g, '_')} }` : '';
      ts = `await expect(${L})${o.not ? '.not' : ''}.${o.assert}(${[arg, to].filter(Boolean).join(', ')});`;
      const jargs = [o.value != null ? (num ? o.value : jstr(o.value)) : '', o.timeout ? `new LocatorAssertions.${jm[1]}().setTimeout(${o.timeout})` : ''].filter(Boolean).join(', ');
      java = `assertThat(${J})${o.not ? '.not()' : ''}.${jm[0]}(${jargs});`; break;
    }
  }
  return {...o, kind: o.op === 'expect' ? 'expect' : o.op, loc: o.loc || (o.op === 'press' ? o.key : o.expr || 'page'), ts, java, cdp: o.cdp || OPCDP[o.op], ms: o.ms || OPMS[o.op]};
}
const hdr = name => ({ts: ["import { test, expect, _electron as electron } from '@playwright/test';", '', `test('${name}', async () => {`], java: ['import com.microsoft.playwright.*;', 'import com.microsoft.playwright.options.*;', 'import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;', '', '// Java has no _electron API. Start Electron with a debug port and attach over CDP:', '//   electron . --remote-debugging-port=9222']});
const ftr = {ts: ['  await app.close();', '});'], java: ['browser.close();']};
const LAUNCH = ex => A({op: 'goto', title: 'Launch the Electron app', loc: 'electron.launch()', act: 'electron.launch', cdp: 'electron.launch → Node inspector (main) + CDP (renderer)',
  ts: "const app = await electron.launch({ args: ['.'] });\nconst page = await app.firstWindow();",
  java: 'Browser browser = playwright.chromium().connectOverCDP("http://localhost:9222");\nPage page = browser.contexts().get(0).pages().get(0);',
  explain: ex + ' Playwright starts the Electron binary, attaches to its main process and returns the first renderer window as a normal Page, so every locator below works exactly as on the web. (_electron is Node.js only; Java attaches over CDP instead.)'});
const ROW = n => `getByRole('listitem', { name: '${n}' })`;

const DECK_DEMOS = [
{
  id: 'deck-search-add', site: 'deck', level: 1, title: 'Search a library, add a game', subtitle: 'Real app · fill · dialog · toast', guideSlug: 'locators',
  overview: 'GameDeck is an Electron desktop app: its renderer runs in the frame, and Playwright drives it through _electron.launch() and firstWindow(). Each line of the script is executed against it: locators are resolved in the live DOM, the pink box shows what matched, and assertions wait for the UI like Playwright does.',
  header: hdr('search and add a game'), footer: ftr,
  steps: [
    LAUNCH('The app loads with its sample library. Every demo starts from a clean state, like a fresh browser context.'),
    A({op: 'fill', expr: "getByPlaceholder('Search your library')", value: 'sword', title: 'Type in the search box', explain: 'getByPlaceholder finds the input by its placeholder text. fill() types the text, and the library list filters live as the app reacts to each input event.'}),
    A({op: 'expect', expr: "getByRole('listitem')", assert: 'toHaveCount', value: '1', title: 'Only one game left', explain: 'toHaveCount counts the elements with the ARIA role listitem. The sidebar rows carry role="listitem", so we assert exactly one game still matches the search.'}),
    A({op: 'fill', expr: "getByPlaceholder('Search your library')", value: '', title: 'Clear the search', explain: 'fill with an empty string clears the field and the full library comes back.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Add a game' })", title: 'Click “Add a game”', explain: 'Role plus accessible name is the recommended locator: it is what a screen reader announces, so it survives CSS and markup changes.'}),
    A({op: 'expect', expr: "getByRole('dialog')", assert: 'toBeVisible', title: 'The dialog is open', explain: 'The modal declares role="dialog", so we can assert on it directly. The assertion would keep retrying if the animation took longer.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Manual entry' })", title: 'Open the “Manual entry” tab', explain: 'A tab strip made of buttons: the accessible name is the visible label.'}),
    A({op: 'fill', expr: "getByLabel('Name')", value: 'Retro Racer', title: 'Fill the name', explain: 'getByLabel follows the label[for] link to the input. This works because the form is correctly labelled, which is also good for accessibility.'}),
    A({op: 'fill', expr: "getByLabel('Executable path')", value: 'D:\\Games\\RetroRacer\\racer.exe', title: 'Fill the executable path', explain: 'The app validates that the path looks like a real executable path (.exe, .lnk, .app, .sh or .bat).'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Add game', exact: true })", title: 'Submit with exact name', explain: 'exact: true makes the name match case-sensitively and in full. Without it, a substring match could pick another button whose name contains the same words.'}),
    A({op: 'expect', expr: ROW('Retro Racer'), assert: 'toBeVisible', title: 'The game appears in the list', explain: 'The new entry shows up in the sidebar. We locate it by role listitem and its accessible name, which the app sets from the game name.'}),
    A({op: 'expect', expr: "getByRole('status')", assert: 'toContainText', value: 'added to your library', title: 'A toast confirms it', explain: 'Toasts use role="status". toContainText matches a substring, which is robust if the exact wording changes slightly.'})
  ]
},
{
  id: 'deck-remove-undo', site: 'deck', level: 2, title: 'Remove a game, then undo', subtitle: 'Context menu · confirm dialog · exact', guideSlug: 'actionability',
  overview: 'A destructive flow with a safety net: remove a game through the Manage menu, confirm the dialog, then restore it from the toast. Great for learning menus, dialogs and exact matching.',
  header: hdr('remove then undo'), footer: ftr,
  steps: [
    LAUNCH('Fresh state again. The library has eight sample games, among them Fish Frenzy.'),
    A({op: 'click', expr: ROW('Fish Frenzy'), title: 'Select Fish Frenzy', explain: 'Rows in the sidebar are list items named after their game. Clicking one opens the detail page.'}),
    A({op: 'expect', expr: "getByRole('heading', { name: 'Fish Frenzy' })", assert: 'toBeVisible', title: 'The detail page is shown', explain: 'The hero shows the title as an h1, which has the implicit role heading.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Manage' })", title: 'Open the Manage menu', explain: 'The Manage button opens a context menu with game actions, like the right-click menu in Steam.'}),
    A({op: 'click', expr: "getByRole('menuitem', { name: 'Remove from library' })", title: 'Choose “Remove from library”', explain: 'Menu entries have role menuitem. The name includes the keyboard hint “Del”, but a substring match on “Remove from library” is enough.'}),
    A({op: 'expect', expr: "getByRole('dialog')", assert: 'toContainText', value: 'Remove Fish Frenzy from your library?', title: 'A confirmation dialog appears', explain: 'Destructive actions ask first. We assert on the dialog text, which also proves the right game is targeted.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Remove', exact: true })", title: 'Confirm with exact: true', explain: 'The page also contains other buttons whose names include “Remove”. exact: true limits the match to the button named exactly “Remove”, avoiding a strict-mode violation.'}),
    A({op: 'expect', expr: ROW('Fish Frenzy'), assert: 'toHaveCount', value: '0', title: 'The game is gone', explain: 'toHaveCount(0) is the right way to assert absence. It waits until the element disappears instead of failing on the first check.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Undo' })", title: 'Click Undo in the toast', explain: 'The toast offers a 7-second undo. A real test would also check it vanishes after that time.'}),
    A({op: 'expect', expr: ROW('Fish Frenzy'), assert: 'toHaveCount', value: '1', title: 'The game is back', explain: 'The row is restored in the same place. Flows like “delete then undo” are cheap to cover and catch many state bugs.'})
  ]
},
{
  id: 'deck-download-limit', site: 'deck', level: 2, title: 'Download manager and speed limit', subtitle: 'select · polling assertions · auto-wait', guideSlug: 'test-assertions',
  overview: 'Install a game, open the download manager, cap the bandwidth and watch the speed follow the limit, then lift it and wait for the install to finish. The last assertion polls for up to a minute: this is auto-retrying in action.',
  header: hdr('download with a bandwidth limit'), footer: ftr,
  steps: [
    LAUNCH('Fresh state. Fish Frenzy is in the library but not installed.'),
    A({op: 'click', expr: ROW('Fish Frenzy'), title: 'Select Fish Frenzy', explain: 'The detail page offers “Install” because the game is not installed.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Install' })", title: 'Click Install', explain: 'The game joins the download queue. The button text includes the size, so we match on the stable part of the name.'}),
    A({op: 'click', expr: "getByRole('tab', { name: 'Downloads' })", title: 'Open the Downloads tab', explain: 'The navigation uses role="tab". The tab’s name also contains the queue badge, so a substring name keeps the locator stable.'}),
    A({op: 'select', expr: "getByLabel('Limit bandwidth to')", value: '5', title: 'Limit bandwidth to 5 MB/s', explain: 'selectOption picks the option by value. The label is linked to the select, so getByLabel works.'}),
    A({op: 'expect', expr: "getByTestId('download-item')", assert: 'toContainText', value: '5.0 MB/s', title: 'Speed follows the limit', explain: 'The download row reports the live speed. The assertion retries until the text contains 5.0 MB/s, which is exactly the cap. data-testid is used here because the row has no good role or text.'}),
    A({op: 'select', expr: "getByLabel('Limit bandwidth to')", value: '0', title: 'Remove the limit', explain: 'Value 0 is “No limit”. The download now runs at full demo speed.'}),
    A({op: 'expect', expr: "getByRole('status')", assert: 'toContainText', value: 'installed', timeout: 60000, title: 'Wait for the install toast', explain: 'The assertion polls every 100 ms for up to 60 seconds. No sleep, no manual waiting: it finishes the moment the toast appears.', note: 'timeout: 60_000 overrides the default 5 s only for this assertion.'}),
    A({op: 'click', expr: "getByRole('tab', { name: 'Library' })", title: 'Back to the Library', explain: 'Switching tabs keeps the selected game.'}),
    A({op: 'expect', expr: "getByRole('button', { name: 'Play', exact: true })", assert: 'toBeVisible', title: 'The Play button is offered', explain: 'Now that the game is installed, the primary action became Play. exact: true avoids matching “Playing”.'})
  ]
},
{
  id: 'deck-control-kill', site: 'deck', level: 3, title: 'Run a game, kill it, clean disk', subtitle: 'Auto-wait · tables · count', guideSlug: 'actionability',
  overview: 'Launch a game, find its process in the Control tab, terminate it, then scan and clean the disk. It shows web-first assertions that wait for asynchronous UI (the launch takes about a second) and assertions on tables and counts.',
  header: hdr('process killer and cleaner'), footer: ftr,
  steps: [
    LAUNCH('Fresh state with all sample games.'),
    A({op: 'click', expr: ROW('Bomber Arena'), title: 'Select Bomber Arena', explain: 'An installed game: the primary button is Play.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Play', exact: true })", title: 'Press Play', explain: 'The app shows “Launching…” for about a second before the game is running.'}),
    A({op: 'expect', expr: "getByTestId('now-playing')", assert: 'toBeVisible', title: 'Wait for the Now playing pill', explain: 'The pill appears only after the launch finishes. toBeVisible keeps retrying until it does, which is why we never need a fixed sleep.'}),
    A({op: 'click', expr: "getByRole('tab', { name: 'Control' })", title: 'Open the Control tab', explain: 'The Control tab lists processes with their CPU and RAM use, inspired by browser “process killers”.'}),
    A({op: 'expect', expr: "getByRole('cell', { name: 'Bomber Arena' })", assert: 'toBeVisible', title: 'The game is in the process list', explain: 'Table cells have the implicit role cell. The name also includes the “game” badge, hence the substring match.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Kill' })", title: 'Kill the process', explain: 'There is exactly one Kill button because only one game runs. If two matched, Playwright would throw a strict-mode violation.'}),
    A({op: 'expect', expr: "getByTestId('now-playing')", assert: 'toBeHidden', title: 'The pill disappears', explain: 'toBeHidden passes when the element is gone or invisible, and retries until then.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Scan now' })", title: 'Scan for junk files', explain: 'The cleaner runs a short scan. Results appear after a moment.'}),
    A({op: 'expect', expr: "locator('#cbody .cl')", assert: 'toHaveCount', value: '5', title: 'Five categories are found', explain: 'locator() with CSS is the escape hatch for structure that has no role. Prefer roles when possible; use CSS when you must.'}),
    A({op: 'click', expr: "getByRole('button', { name: 'Clean selected' })", title: 'Clean selected', explain: 'All categories are ticked by default, so everything is removed.'}),
    A({op: 'expect', expr: "getByRole('status')", assert: 'toContainText', value: 'Cleaned', title: 'A toast reports the result', explain: 'End of the flow: the user-visible confirmation is the assertion that matters.'})
  ]
},
{
  id: 'deck-palette', site: 'deck', level: 1, title: 'Keyboard: the command palette', subtitle: 'press · fill · Enter', guideSlug: 'input',
  overview: 'Keyboard flows are tests too. Open the global search with Ctrl+K, type, and pick a result with Enter, all without touching the mouse.',
  header: hdr('command palette'), footer: ftr,
  steps: [
    LAUNCH('Fresh state.'),
    A({op: 'press', key: 'Control+K', title: 'Press Ctrl+K', explain: 'keyboard.press sends real key events. The app listens for Ctrl+K to open the palette.'}),
    A({op: 'expect', expr: "getByTestId('palette-input')", assert: 'toBeVisible', title: 'The palette opened', explain: 'The search field is exposed with data-testid="palette-input" because it has no label.'}),
    A({op: 'fill', expr: "getByTestId('palette-input')", value: 'hunt', title: 'Type “hunt”', explain: 'Results update while typing. The palette searches your library, the store and actions.'}),
    A({op: 'expect', expr: "locator('#pres .pr')", assert: 'toHaveCount', value: '1', title: 'One result', explain: 'Only “Hunt Online” matches. Counting rows is a compact way to check a filter.'}),
    A({op: 'press', key: 'Enter', title: 'Press Enter', explain: 'Enter picks the highlighted result and opens the game.'}),
    A({op: 'expect', expr: "getByRole('heading', { name: 'Hunt Online' })", assert: 'toBeVisible', title: 'The game page is open', explain: 'The result of the keyboard flow is visible without a single click.'})
  ]
},
{
  id: 'deck-playground', type: 'playground', site: 'deck', level: 1, title: 'Locator playground', subtitle: 'Type a locator, see it on the real app', guideSlug: 'locators',
  overview: 'Type any Playwright locator and see which elements of the real app match it. More than one match means actions would fail with a strict-mode violation.',
  header: {ts: [], java: []}, footer: {ts: [], java: []}, steps: []
}
];
DEMOS.push(...DECK_DEMOS);

SITES.deck = DECK;

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
    return `<div class="sc ${on ? 'on' : ''}" data-id="${d.id}"><button><span class="dot"></span><span><b>${esc(d.title)}</b><small>${esc(d.subtitle)}</small></span><span class="plat">${SITES[d.site].frame === 'phone' ? 'Mobile' : SITES[d.site].frame === 'app' ? 'App' : 'Web'}</span></button><div class="steps">${on ? d.steps.map((x, i) => `<div class="st ${step === i ? 'act' : ''} ${step > i ? 'done' : ''}" data-i="${i}"><div class="n">${step > i ? '✓' : i + 1}</div><div><b>${esc(x.title)}</b><small>${esc(x.cdp)}</small></div></div>`).join('') : ''}</div></div>`;
  }).join('');
  $$('#dList .sc > button').forEach(b => b.onclick = () => selectDemo(b.parentElement.dataset.id));
  $$('#dList .st').forEach(e => e.onclick = () => goStep(+e.dataset.i));
  const a = $('#dList .st.act') || $('#dList .sc.on'); a && a.scrollIntoView({block: 'nearest'});
}
function buildFrame() {
  const phone = SITE.frame === 'phone';
  if (SITE.iframe) { appReady = false; $('#dFit').innerHTML = `<div class="dapp"><div class="dviewport"><iframe id="dif" title="GameDeck" src="${SITE.src}"></iframe><div class="dov" id="dov"><div class="dcur" id="dcur"></div></div></div></div>`; $('#dcur').innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 2l17 8-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>'; fit(); placeCursor(60, 60, false); return; }
  $('#dFit').innerHTML = phone
    ? `<div class="dphone"><div class="dviewport"><div id="dvp" style="height:100%"></div><div class="dov" id="dov"><div class="dcur" id="dcur"></div></div></div><div class="dlabel" id="dlabel"></div></div>`
    : `<div class="dbrowser"><div class="dbar"><i style="background:#ff5f57"></i><i style="background:#febc2e"></i><i style="background:#28c840"></i><div class="url" id="durl"></div></div><div class="dviewport"><div id="dvp" style="height:100%"></div><div class="dov" id="dov"><div class="dcur" id="dcur"></div></div></div></div>`;
  $('#dcur').innerHTML = '<svg viewBox="0 0 24 24"><path d="M3 2l17 8-7 2-3 7z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>';
  fit(); placeCursor(40, 40, false);
}
function fit() {
  const st = $('#dStage'); if (!st || !D) return; const phone = SITE.frame === 'phone';
  const dw = SITE.iframe ? 1290 : phone ? 400 : 790, dh = SITE.iframe ? 730 : phone ? 840 : 520, k = Math.min(st.clientWidth / (dw + 30), st.clientHeight / (dh + 30), 1.2);
  $('#dFit').style.transform = `translate(-50%,-50%) scale(${Math.max(.3, k)})`;
}
function vpScale() { const vp = $('#dvp'); return vp.getBoundingClientRect().width / vp.offsetWidth || 1; }
function relRect(el) { const vp = $('#dvp').getBoundingClientRect(), r = el.getBoundingClientRect(), k = vpScale(); return {x: (r.left - vp.left) / k, y: (r.top - vp.top) / k, w: r.width / k, h: r.height / k}; }
function placeCursor(x, y, anim = true) { const c = $('#dcur'); if (!c) return; c.style.transition = anim ? '' : 'none'; c.style.left = x + 'px'; c.style.top = y + 'px'; if (!anim) { c.offsetHeight; c.style.transition = ''; } }
function paintSite() {
  if (SITE.iframe) return;
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
function entry(i, ok, extra) { const st = D.steps[i]; const N = {goto: 'page.goto', click: 'locator.click', dblclick: 'locator.dblclick', contextmenu: 'locator.click (right)', fill: 'locator.fill', select: 'locator.selectOption', check: 'locator.check', press: 'keyboard.press'};
  const action = st.act ? st.act : st.op ? (st.op === 'expect' ? 'expect.' + st.assert : N[st.op]) : (st.kind.startsWith('expect') ? 'expect.' + (st.assert || 'toHaveURL') : (kindName[st.kind] || st.kind) + (st.kind === 'ctx' && st.set && 'offline' in st.set ? '.setOffline' : ''));
  return {n: i + 1, action, loc: st.loc, ms: st.ms, ok, extra}; }

async function runStep(i, animate, myTok) {
  if (SITE.iframe) return runStepApp(i, animate, myTok);
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
  <div class="kv"><div class="k">Locator</div><div>${esc(s.loc || '—')}</div><div class="k">Protocol</div><div>${esc(s.cdp)}</div>${e && e.extra && e.extra.actual != null ? `<div class="k">Actual</div><div>${esc(e.extra.actual)}</div>` : ''}${e && e.extra && e.extra.err ? `<div class="k">Error</div><div class="st-bad">${esc(e.extra.err)}</div>` : ''}<div class="k">Duration</div><div>${s.ms} ms${e ? (e.ok ? ' · <span class="st-ok">passed</span>' : ' · <span class="st-bad">failed</span>') : ''}</div></div>
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
  if (D && D.type === 'playground') { renderList(); return; }
  renderList(); renderCode(); renderExplain(); renderLogs();
  $('#dPlay').textContent = playing ? '❚❚ PAUSE' : '▶ PLAY';
  if (document.body.dataset.app === 'demo') history.replaceState(null, '', '#demo/' + D.id + (step >= 0 ? '/' + (step + 1) : ''));
}
async function selectDemo(id, at) {
  const d = DEMOS.find(x => x.id === id); if (!d) return; stop(); D = d; SITE = SITES[d.site]; step = -1;
  document.body.classList.toggle('pg', d.type === 'playground'); document.body.classList.toggle('appdemo', !!SITE.iframe);
  $('#dTitle').textContent = d.title; $('#dChips').innerHTML = `<span class="chip">${SITE.iframe ? 'Electron app (renderer)' : SITE.frame === 'phone' ? 'mobile emulation' : 'desktop browser'}</span><span class="chip">${esc(SITE.ttl)}</span>`;
  $('#aTitle').textContent = d.type === 'playground' ? 'Matches' : 'Actions'; $('#nTitle').textContent = d.type === 'playground' ? 'Tips' : SITE.iframe ? 'App events' : 'Network';
  const di = $('#dInteract'); if (di) { di.style.display = SITE.iframe ? '' : 'none'; di.classList.remove('on'); }
  S = SITE.init(); log = []; net = []; buildFrame(); if (!SITE.iframe) paintSite();
  if (SITE.iframe) { renderAll(); await waitReady(); const my = tok; if (d.type === 'playground') { initPlayground(); return; } if (at != null && at >= 0) { await applyInstantApp(at, my); if (my !== tok) return; step = at; } renderAll(); return; }
  if (at != null && at >= 0) { applyInstant(at); step = at; }
  renderAll();
}
async function goStep(i) { if (!D) return; stop(); i = Math.max(-1, Math.min(D.steps.length - 1, i)); const my = tok;
  if (D.type === 'playground') return;
  if (SITE.iframe) { step = i; renderAll(); log = []; net = []; if (i < 0) await resetApp(); else await applyInstantApp(i, my); if (my !== tok) return; renderAll(); return; }
  if (i < 0) { S = SITE.init(); log = []; net = []; paintSite(); clearOv(); } else applyInstant(i); step = i; renderAll(); }
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

/* ---------- app bridge client (talks to the iframe through postMessage) ---------- */
let rpcId = 0, appReady = false, readyWait = null; const pend = {};
addEventListener('message', e => {
  const m = e.data; if (!m || !m.gd) return;
  if (m.gd === 'ready') { appReady = true; if (readyWait) { readyWait(); readyWait = null; } }
  else if (m.gd === 'res' && pend[m.id]) { pend[m.id](m); delete pend[m.id]; }
});
const appWin = () => { const f = $('#dif'); return f && f.contentWindow; };
function rpc(op, p = {}, timeout = 9000) {
  return new Promise(res => {
    const w = appWin(); if (!w) return res({ok: false, err: 'app not loaded'});
    const id = ++rpcId, t = setTimeout(() => { delete pend[id]; res({ok: false, err: 'bridge timeout'}); }, timeout);
    pend[id] = m => { clearTimeout(t); res(m); };
    w.postMessage({gd: 'cmd', id, op, ...p}, '*');
  });
}
function waitReady(ms = 8000) { return new Promise(r => { if (appReady) return r(); readyWait = r; setTimeout(r, ms); }); }
async function resetApp() { appReady = false; const w = appWin(); if (w) w.postMessage({gd: 'cmd', id: ++rpcId, op: 'reset'}, '*'); await waitReady(); await sleep(150); }
async function drainEv(i) { const d = await rpc('drain'); (d.events || []).forEach(ev => net.push({m: 'EVENT', u: ev.t, s: 'ok', t: i + 1})); }
function addHlRect(r, label, cls = '') {
  const d = document.createElement('div'); d.className = 'dhl ' + cls + (r.y < 34 ? ' below' : '');
  d.style.cssText = `left:${r.x - 3}px;top:${r.y - 3}px;width:${r.w + 6}px;height:${r.h + 6}px`; d.innerHTML = `<span>${esc(label)}</span>`;
  $('#dov').appendChild(d); return d;
}
async function runStepApp(i, animate, myTok) {
  const st = D.steps[i], alive = () => myTok === tok; clearOv();
  if (st.op === 'goto') { if (animate) { banner('↻ page.goto → app reloaded'); await sleep(600 / speed); } await resetApp(); if (!alive()) return; log.push(entry(i, true)); await drainEv(i); return; }
  if (st.op === 'press') { if (animate) { banner('⌨  ' + st.key); await sleep(520 / speed); } const r = await rpc('press', {key: st.key}); await sleep(animate ? 450 / speed : 80); log.push(entry(i, r.ok)); await drainEv(i); return; }
  const r0 = await rpc('rect', {expr: st.expr}); if (!alive()) return;
  if (st.op === 'expect') {
    const first = (r0.matches || []).find(m => m.vis);
    if (animate && first) { addHlRect(first.rect, st.loc); await sleep(420 / speed); }
    const r = await rpc('expect', {expr: st.expr, kind: st.assert, value: st.value, not: !!st.not, timeout: st.timeout || 5000}, (st.timeout || 5000) + 4000); if (!alive()) return;
    clearOv(); const r2 = await rpc('rect', {expr: st.expr}); const f2 = (r2.matches || []).find(m => m.vis) || (r2.matches || [])[0];
    if (animate) { if (f2 && f2.vis) addHlRect(f2.rect, (r.ok ? '✔ ' : '✘ ') + st.assert, r.ok ? 'ok' : 'bad'); else banner((r.ok ? '✔ ' : '✘ ') + st.assert + '  ' + st.loc); await sleep(800 / speed); }
    log.push(entry(i, r.ok, {actual: r.actual})); await drainEv(i); return;
  }
  const vis = (r0.matches || []).filter(m => m.vis);
  if (vis.length !== 1) {
    const msg = vis.length ? `strict mode violation: ${vis.length} elements` : 'locator resolved to 0 visible elements';
    if (animate) { vis.forEach(m => addHlRect(m.rect, msg, 'bad')); banner('✘ ' + msg); await sleep(1300 / speed); }
    log.push(entry(i, false, {err: msg})); return;
  }
  const rect = vis[0].rect;
  if (animate) {
    placeCursor(rect.x + rect.w / 2 - 4, rect.y + rect.h / 2 - 2); await sleep(560 / speed); if (!alive()) return;
    addHlRect(rect, st.loc);
    if (st.op === 'fill' && st.value) {
      const per = Math.min(60, 900 / Math.max(1, st.value.length));
      for (let k = 1; k <= st.value.length; k++) { await rpc('fill', {expr: st.expr, value: st.value.slice(0, k)}); await sleep(per / speed); if (!alive()) return; }
      await sleep(200 / speed);
    } else if (['click', 'dblclick', 'contextmenu', 'check'].includes(st.op)) {
      const rp = document.createElement('div'); rp.className = 'dripple'; rp.style.left = (rect.x + rect.w / 2 - 6) + 'px'; rp.style.top = (rect.y + rect.h / 2 - 6) + 'px'; $('#dov').appendChild(rp); await sleep(380 / speed);
    } else await sleep(300 / speed);
  }
  if (!alive()) return;
  const r = await rpc(st.op, {expr: st.expr, value: st.value, key: st.key});
  log.push(entry(i, r.ok, r.ok ? undefined : {err: r.err}));
  if (animate) await sleep(480 / speed);
  await drainEv(i);
}
async function applyInstantApp(i, my) {
  log = []; net = [];
  for (let k = 0; k <= i; k++) { if (my !== tok) return; await runStepApp(k, false, my); }
  clearOv();
}

/* ---------- locator playground (type a locator, see matches on the real app) ---------- */
const PG_PRESETS = ["getByRole('button', { name: 'Add a game' })", "getByPlaceholder('Search your library')", "getByRole('listitem')", "getByRole('listitem', { name: 'Hunt Online' })", "getByTestId('game-row-sword')", "getByRole('tab', { name: 'Store' })", "getByText('UPDATE')", "getByRole('combobox')", "getByLabel('Sort games')", "getByRole('listitem').filter({ hasText: 'Lantern' })", "locator('.gh').first()", "getByRole('button')", "getByRole('listitem').nth(2)"];
let pgBusy = false, pgTimer = null;
function initPlayground() {
  $('#dCode').innerHTML = `<div class="pgbox"><label class="pgl">LOCATOR  <small>(everything after <code>page.</code>)</small></label><input id="pgi" class="inp" spellcheck="false" value="${esc(PG_PRESETS[0])}"><div class="pgcode" id="pgc"></div><div class="pgp">${PG_PRESETS.map((p, i) => `<button class="btn sm" data-i="${i}">${esc(p)}</button>`).join('')}</div></div>`;
  $('#dExplain').innerHTML = '<div id="pgs"></div>';
  $('#pgi').oninput = () => { clearTimeout(pgTimer); pgTimer = setTimeout(pgRun, 160); };
  $$('#dCode .pgp button').forEach(b => b.onclick = () => { $('#pgi').value = PG_PRESETS[+b.dataset.i]; pgRun(); });
  pgRun();
}
async function pgRun() {
  if (pgBusy || !$('#pgi')) return; pgBusy = true;
  const expr = $('#pgi').value.trim(); clearOv();
  const r = await rpc('rect', {expr}); pgBusy = false;
  const s = $('#pgs'), c = $('#pgc'); if (!s) return;
  if (!r.ok) { s.innerHTML = `<div class="rtitle" style="font-size:18px;color:var(--bad)">Invalid locator</div><p class="rtext">${esc(r.err || 'error')}</p>`; $('#aLog').innerHTML = '<div class="empty">—</div>'; return; }
  const m = r.matches || [], vis = m.filter(x => x.vis); vis.forEach((x, k) => addHlRect(x.rect, String(k + 1) + (vis.length > 1 ? '' : ' · ' + (x.role || x.tag)), vis.length > 1 ? 'bad' : 'ok'));
  const ok = vis.length === 1;
  c.innerHTML = hl(`await page.${expr}.click();`);
  s.innerHTML = `<div class="stepno">RESULT</div><div class="rtitle" style="font-size:24px;color:${ok ? 'var(--ok)' : vis.length ? 'var(--warn)' : 'var(--bad)'}">${vis.length} visible match${vis.length === 1 ? '' : 'es'}${m.length !== vis.length ? ` <small style="font-size:13px;color:var(--mut)">(${m.length} in the DOM)</small>` : ''}</div>
   <p class="rtext">${ok ? 'Exactly one element: any action (click, fill…) is allowed.' : vis.length ? 'More than one element: <b>click() would throw a strict-mode violation</b>. Narrow it with a name, <code>exact</code>, <code>.filter()</code>, <code>.first()</code> or <code>.nth()</code>. (Counting with <code>toHaveCount</code> or looping with <code>all()</code> is still fine.)' : 'Nothing matches: an action would wait until the timeout, an assertion would fail.'}</p>`;
  $('#aLog').innerHTML = `<table><thead><tr><th>#</th><th>TAG</th><th>ROLE</th><th>NAME</th><th>VISIBLE</th></tr></thead><tbody>${m.length ? m.map((x, k) => `<tr class="row"><td><span class="no" style="background:${x.vis ? 'var(--accent)' : 'var(--p4)'}">${k + 1}</span></td><td>${esc(x.tag)}</td><td>${esc(x.role || '—')}</td><td class="info">${esc(x.name)}</td><td>${x.vis ? 'yes' : 'no'}</td></tr>`).join('') : '<tr><td colspan="5" class="empty">No elements match.</td></tr>'}</tbody></table>`;
  $('#nLog').innerHTML = '<div class="empty" style="text-align:left"><b style="color:var(--tx)">Locator tips</b><br>1. Prefer <code>getByRole</code> with a name.<br>2. Then label, placeholder, text.<br>3. <code>getByTestId</code> for things without semantics.<br>4. CSS with <code>locator()</code> as a last resort.</div>';
}

/* ---------- init ---------- */
function init() {
  const el = $('#demo'); if (!el) return;
  $('#dPlay').onclick = play; $('#dNext').onclick = next; $('#dPrev').onclick = prev; $('#dReset').onclick = () => goStep(-1);
  $('#dSpeed').onchange = e => speed = +e.target.value;
  $$('#dLangSeg button').forEach(b => b.onclick = () => { EX().setLang && EX().setLang(b.dataset.l); });
  if (EX().onLang) EX().onLang(l => { $$('#dLangSeg button').forEach(b => b.classList.toggle('on', b.dataset.l === l)); if (D) renderCode(); });
  const dh = $('.dhead'); if (dh) { const b = document.createElement('button'); b.className = 'btn sm'; b.id = 'dInteract'; b.style.cssText = 'margin-left:auto;display:none'; b.textContent = '🖱 Try the app yourself'; b.onclick = () => { const f = $('#dif'); const on = b.classList.toggle('on'); f.style.pointerEvents = on ? 'auto' : 'none'; clearInterval(window.__pgi); if (on) { b.textContent = '✋ Stop interacting'; if (D.type === 'playground') window.__pgi = setInterval(pgRun, 900); } else { b.textContent = '🖱 Try the app yourself'; } }; dh.appendChild(b); }
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
