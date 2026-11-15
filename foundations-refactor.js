/* Refactoring Lab: one spec file -> layers. Code is illustrative (not run against a real site). */
(() => {
const LAYERS = [
  {n: 'Test', c: '#38d6ff', d: 'intent + assertions'},
  {n: 'Business flow', c: '#a78bfa', d: 'named steps'},
  {n: 'Page / component', c: '#34d399', d: 'locators + waiting'},
  {n: 'Driver adapter', c: '#fbbf24', d: 'tool behind an interface'},
  {n: 'Infra', c: '#fb923c', d: 'config, data, fixtures, API setup'}
];
const layerOf = p => /\.spec\.ts$/.test(p) ? 0 : p.startsWith('flows/') ? 1 : p.startsWith('pages/') ? 2 : p.startsWith('driver/') ? 3 : 4;

const L = (...a) => a.join('\n');
const USER = 'user: { email: string; password: string }';

/* ---------- stage 0: everything in one file ---------- */
const SPEC0 = L(
"import { test, expect } from '@playwright/test';",
"",
"test('user can log in', async ({ page }) => {",
"  await page.goto('https://shop.example.com/login');",
"  await page.locator('#email').fill('anna@example.com');",
"  await page.locator('#pwd').fill('S3cret!');",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await expect(page.locator('.welcome')).toHaveText('Hi Anna');",
"});",
"",
"test('user can buy a keyboard', async ({ page }) => {",
"  await page.goto('https://shop.example.com/login');",
"  await page.locator('#email').fill('anna@example.com');",
"  await page.locator('#pwd').fill('S3cret!');",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await page.locator('text=Keyboard >> .add').click();",
"  await page.locator('#cart').click();",
"  await page.locator('#checkout').click();",
"  await page.locator('#card').fill('4242424242424242');",
"  await page.locator('#pay').click();",
"  await page.waitForTimeout(3000);",
"  await expect(page.locator('.done')).toBeVisible();",
"});",
"",
"test('cart shows the right total', async ({ page }) => {",
"  await page.goto('https://shop.example.com/login');",
"  await page.locator('#email').fill('anna@example.com');",
"  await page.locator('#pwd').fill('S3cret!');",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await page.locator('text=Keyboard >> .add').click();",
"  await page.locator('#cart').click();",
"  await expect(page.locator('.total')).toHaveText('$49');",
"});",
"",
"test('declined card shows an error', async ({ page }) => {",
"  await page.goto('https://shop.example.com/login');",
"  await page.locator('#email').fill('anna@example.com');",
"  await page.locator('#pwd').fill('S3cret!');",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await page.locator('text=Keyboard >> .add').click();",
"  await page.locator('#cart').click();",
"  await page.locator('#checkout').click();",
"  await page.locator('#card').fill('4000000000000002');",
"  await page.locator('#pay').click();",
"  await page.waitForTimeout(3000);",
"  await expect(page.locator('.card-error')).toBeVisible();",
"});");

/* ---------- stage 1: config + data ---------- */
const CONFIG = L(
"import { defineConfig } from '@playwright/test';",
"",
"export default defineConfig({",
"  use: {",
"    baseURL: process.env.BASE_URL ?? 'https://shop.example.com',",
"  },",
"});");
const USERS = L(
"export const anna = {",
"  email: process.env.SHOP_USER ?? 'anna@example.com',",
"  password: process.env.SHOP_PASS ?? 'S3cret!',",
"  greeting: 'Hi Anna',",
"};",
"",
"export const cards = {",
"  ok: '4242424242424242',",
"  declined: '4000000000000002',",
"};");
const SPEC1 = L(
"import { test, expect } from '@playwright/test';",
"import { anna, cards } from './data/users';",
"",
"test('user can log in', async ({ page }) => {",
"  await page.goto('/login');",
"  await page.locator('#email').fill(anna.email);",
"  await page.locator('#pwd').fill(anna.password);",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await expect(page.locator('.welcome')).toHaveText(anna.greeting);",
"});",
"",
"test('user can buy a keyboard', async ({ page }) => {",
"  await page.goto('/login');",
"  await page.locator('#email').fill(anna.email);",
"  await page.locator('#pwd').fill(anna.password);",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await page.locator('text=Keyboard >> .add').click();",
"  await page.locator('#cart').click();",
"  await page.locator('#checkout').click();",
"  await page.locator('#card').fill(cards.ok);",
"  await page.locator('#pay').click();",
"  await page.waitForTimeout(3000);",
"  await expect(page.locator('.done')).toBeVisible();",
"});",
"",
"test('cart shows the right total', async ({ page }) => {",
"  await page.goto('/login');",
"  await page.locator('#email').fill(anna.email);",
"  await page.locator('#pwd').fill(anna.password);",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await page.locator('text=Keyboard >> .add').click();",
"  await page.locator('#cart').click();",
"  await expect(page.locator('.total')).toHaveText('$49');",
"});",
"",
"test('declined card shows an error', async ({ page }) => {",
"  await page.goto('/login');",
"  await page.locator('#email').fill(anna.email);",
"  await page.locator('#pwd').fill(anna.password);",
"  await page.locator('button.btn-login').click();",
"  await page.waitForTimeout(2000);",
"  await page.locator('text=Keyboard >> .add').click();",
"  await page.locator('#cart').click();",
"  await page.locator('#checkout').click();",
"  await page.locator('#card').fill(cards.declined);",
"  await page.locator('#pay').click();",
"  await page.waitForTimeout(3000);",
"  await expect(page.locator('.card-error')).toBeVisible();",
"});");

/* ---------- stage 2: page objects ---------- */
const LOGIN = L(
"import { Page, Locator, expect } from '@playwright/test';",
"",
"export class LoginPage {",
"  readonly email: Locator;",
"  readonly password: Locator;",
"  readonly submit: Locator;",
"  readonly welcome: Locator;",
"",
"  constructor(private page: Page) {",
"    this.email = page.locator('#email');",
"    this.password = page.locator('#pwd');",
"    this.submit = page.locator('button.btn-login');",
"    this.welcome = page.locator('.welcome');",
"  }",
"",
"  async open() {",
"    await this.page.goto('/login');",
"  }",
"",
"  async login(" + USER + ") {",
"    await this.email.fill(user.email);",
"    await this.password.fill(user.password);",
"    await this.submit.click();",
"    await expect(this.welcome).toBeVisible();",
"  }",
"}");
const CART = L(
"import { Page, Locator } from '@playwright/test';",
"",
"export class CartPage {",
"  readonly total: Locator;",
"",
"  constructor(private page: Page) {",
"    this.total = page.locator('.total');",
"  }",
"",
"  async add(item: string) {",
"    await this.page.locator('text=' + item + ' >> .add').click();",
"  }",
"  async open() {",
"    await this.page.locator('#cart').click();",
"  }",
"  async toCheckout() {",
"    await this.page.locator('#checkout').click();",
"  }",
"}");
const CHECKOUT = L(
"import { Page, Locator } from '@playwright/test';",
"",
"export class CheckoutPage {",
"  readonly done: Locator;",
"  readonly error: Locator;",
"",
"  constructor(private page: Page) {",
"    this.done = page.locator('.done');",
"    this.error = page.locator('.card-error');",
"  }",
"",
"  async pay(card: string) {",
"    await this.page.locator('#card').fill(card);",
"    await this.page.locator('#pay').click();",
"  }",
"}");
const SPEC2 = L(
"import { test, expect } from '@playwright/test';",
"import { anna, cards } from './data/users';",
"import { LoginPage } from './pages/LoginPage';",
"import { CartPage } from './pages/CartPage';",
"import { CheckoutPage } from './pages/CheckoutPage';",
"",
"test('user can log in', async ({ page }) => {",
"  const login = new LoginPage(page);",
"  await login.open();",
"  await login.login(anna);",
"  await expect(login.welcome).toHaveText(anna.greeting);",
"});",
"",
"test('user can buy a keyboard', async ({ page }) => {",
"  const login = new LoginPage(page);",
"  const cart = new CartPage(page);",
"  const checkout = new CheckoutPage(page);",
"  await login.open();",
"  await login.login(anna);",
"  await cart.add('Keyboard');",
"  await cart.open();",
"  await cart.toCheckout();",
"  await checkout.pay(cards.ok);",
"  await expect(checkout.done).toBeVisible();",
"});",
"",
"test('cart shows the right total', async ({ page }) => {",
"  const login = new LoginPage(page);",
"  const cart = new CartPage(page);",
"  await login.open();",
"  await login.login(anna);",
"  await cart.add('Keyboard');",
"  await cart.open();",
"  await expect(cart.total).toHaveText('$49');",
"});",
"",
"test('declined card shows an error', async ({ page }) => {",
"  const login = new LoginPage(page);",
"  const cart = new CartPage(page);",
"  const checkout = new CheckoutPage(page);",
"  await login.open();",
"  await login.login(anna);",
"  await cart.add('Keyboard');",
"  await cart.open();",
"  await cart.toCheckout();",
"  await checkout.pay(cards.declined);",
"  await expect(checkout.error).toBeVisible();",
"});");

/* ---------- stage 3: business flow ---------- */
const FLOW = L(
"import { Page } from '@playwright/test';",
"import { LoginPage } from '../pages/LoginPage';",
"import { CartPage } from '../pages/CartPage';",
"import { CheckoutPage } from '../pages/CheckoutPage';",
"",
"export class ShopFlow {",
"  readonly login: LoginPage;",
"  readonly cart: CartPage;",
"  readonly checkout: CheckoutPage;",
"",
"  constructor(page: Page) {",
"    this.login = new LoginPage(page);",
"    this.cart = new CartPage(page);",
"    this.checkout = new CheckoutPage(page);",
"  }",
"",
"  async loginAs(" + USER + ") {",
"    await this.login.open();",
"    await this.login.login(user);",
"  }",
"",
"  async buy(item: string, card: string) {",
"    await this.cart.add(item);",
"    await this.cart.open();",
"    await this.cart.toCheckout();",
"    await this.checkout.pay(card);",
"  }",
"}");
const SPEC3 = L(
"import { test, expect } from '@playwright/test';",
"import { anna, cards } from './data/users';",
"import { ShopFlow } from './flows/ShopFlow';",
"",
"test('user can log in', async ({ page }) => {",
"  const shop = new ShopFlow(page);",
"  await shop.loginAs(anna);",
"  await expect(shop.login.welcome).toHaveText(anna.greeting);",
"});",
"",
"test('user can buy a keyboard', async ({ page }) => {",
"  const shop = new ShopFlow(page);",
"  await shop.loginAs(anna);",
"  await shop.buy('Keyboard', cards.ok);",
"  await expect(shop.checkout.done).toBeVisible();",
"});",
"",
"test('cart shows the right total', async ({ page }) => {",
"  const shop = new ShopFlow(page);",
"  await shop.loginAs(anna);",
"  await shop.cart.add('Keyboard');",
"  await shop.cart.open();",
"  await expect(shop.cart.total).toHaveText('$49');",
"});",
"",
"test('declined card shows an error', async ({ page }) => {",
"  const shop = new ShopFlow(page);",
"  await shop.loginAs(anna);",
"  await shop.buy('Keyboard', cards.declined);",
"  await expect(shop.checkout.error).toBeVisible();",
"});");

/* ---------- stage 4: fixtures + API setup ---------- */
const API = L(
"import { Page, expect } from '@playwright/test';",
"",
"// Setup below the UI: log in through the API (cookies are shared with the page).",
"export async function loginByApi(page: Page, " + USER + ") {",
"  const res = await page.request.post('/api/login', { data: user });",
"  expect(res.ok()).toBeTruthy();",
"}");
const FIX = L(
"import { test as base } from '@playwright/test';",
"import { ShopFlow } from './flows/ShopFlow';",
"import { loginByApi } from './api/shopApi';",
"import { anna } from './data/users';",
"",
"type Fx = { shop: ShopFlow; signedIn: ShopFlow };",
"",
"export const test = base.extend<Fx>({",
"  shop: async ({ page }, use) => {",
"    await use(new ShopFlow(page));",
"  },",
"  signedIn: async ({ page }, use) => {",
"    await loginByApi(page, anna);",
"    await page.goto('/');",
"    await use(new ShopFlow(page));",
"  },",
"});",
"export { expect } from '@playwright/test';");
const SPEC4 = L(
"import { test, expect } from './fixtures';",
"import { anna, cards } from './data/users';",
"",
"test('user can log in', async ({ shop }) => {",
"  await shop.loginAs(anna);",
"  await expect(shop.login.welcome).toHaveText(anna.greeting);",
"});",
"",
"test('user can buy a keyboard', async ({ signedIn }) => {",
"  await signedIn.buy('Keyboard', cards.ok);",
"  await expect(signedIn.checkout.done).toBeVisible();",
"});",
"",
"test('cart shows the right total', async ({ signedIn }) => {",
"  await signedIn.cart.add('Keyboard');",
"  await signedIn.cart.open();",
"  await expect(signedIn.cart.total).toHaveText('$49');",
"});",
"",
"test('declined card shows an error', async ({ signedIn }) => {",
"  await signedIn.buy('Keyboard', cards.declined);",
"  await expect(signedIn.checkout.error).toBeVisible();",
"});");

/* ---------- stage 5: driver adapter (optional) ---------- */
const DRV = L(
"export interface Driver {",
"  goto(path: string): Promise<void>;",
"  click(selector: string): Promise<void>;",
"  fill(selector: string, text: string): Promise<void>;",
"  text(selector: string): Promise<string>;",
"  waitVisible(selector: string): Promise<void>;",
"}");
const PWD = L(
"import { Page } from '@playwright/test';",
"import { Driver } from './Driver';",
"",
"// Pages and flows no longer know Playwright; this class does.",
"export class PlaywrightDriver implements Driver {",
"  constructor(private page: Page) {}",
"",
"  async goto(path: string) { await this.page.goto(path); }",
"  click(s: string) { return this.page.locator(s).click(); }",
"  fill(s: string, t: string) { return this.page.locator(s).fill(t); }",
"  text(s: string) { return this.page.locator(s).innerText(); }",
"  waitVisible(s: string) { return this.page.locator(s).waitFor(); }",
"}");
const LOGIN5 = L(
"import { Driver } from '../driver/Driver';",
"",
"export class LoginPage {",
"  constructor(private d: Driver) {}",
"",
"  async open() {",
"    await this.d.goto('/login');",
"  }",
"",
"  async login(" + USER + ") {",
"    await this.d.fill('#email', user.email);",
"    await this.d.fill('#pwd', user.password);",
"    await this.d.click('button.btn-login');",
"    await this.d.waitVisible('.welcome');",
"  }",
"",
"  greeting() { return this.d.text('.welcome'); }",
"}");
const CART5 = L(
"import { Driver } from '../driver/Driver';",
"",
"export class CartPage {",
"  constructor(private d: Driver) {}",
"",
"  add(item: string) { return this.d.click('text=' + item + ' >> .add'); }",
"  open() { return this.d.click('#cart'); }",
"  toCheckout() { return this.d.click('#checkout'); }",
"  total() { return this.d.text('.total'); }",
"}");
const CHECKOUT5 = L(
"import { Driver } from '../driver/Driver';",
"",
"export class CheckoutPage {",
"  constructor(private d: Driver) {}",
"",
"  async pay(card: string) {",
"    await this.d.fill('#card', card);",
"    await this.d.click('#pay');",
"  }",
"",
"  result() { return this.d.text('.done, .card-error'); }",
"}");
const FLOW5 = L(
"import { Driver } from '../driver/Driver';",
"import { LoginPage } from '../pages/LoginPage';",
"import { CartPage } from '../pages/CartPage';",
"import { CheckoutPage } from '../pages/CheckoutPage';",
"",
"export class ShopFlow {",
"  readonly login: LoginPage;",
"  readonly cart: CartPage;",
"  readonly checkout: CheckoutPage;",
"",
"  constructor(d: Driver) {",
"    this.login = new LoginPage(d);",
"    this.cart = new CartPage(d);",
"    this.checkout = new CheckoutPage(d);",
"  }",
"",
"  async loginAs(" + USER + ") {",
"    await this.login.open();",
"    await this.login.login(user);",
"  }",
"",
"  async buy(item: string, card: string) {",
"    await this.cart.add(item);",
"    await this.cart.open();",
"    await this.cart.toCheckout();",
"    await this.checkout.pay(card);",
"  }",
"}");
const FIX5 = FIX.replace("import { ShopFlow } from './flows/ShopFlow';", "import { ShopFlow } from './flows/ShopFlow';\nimport { PlaywrightDriver } from './driver/PlaywrightDriver';")
  .replace("    await use(new ShopFlow(page));\n  },\n  signedIn", "    await use(new ShopFlow(new PlaywrightDriver(page)));\n  },\n  signedIn")
  .replace("    await page.goto('/');\n    await use(new ShopFlow(page));", "    await page.goto('/');\n    await use(new ShopFlow(new PlaywrightDriver(page)));");
const SPEC5 = L(
"import { test, expect } from './fixtures';",
"import { anna, cards } from './data/users';",
"",
"test('user can log in', async ({ shop }) => {",
"  await shop.loginAs(anna);",
"  await expect.poll(() => shop.login.greeting()).toBe(anna.greeting);",
"});",
"",
"test('user can buy a keyboard', async ({ signedIn }) => {",
"  await signedIn.buy('Keyboard', cards.ok);",
"  await expect.poll(() => signedIn.checkout.result()).toContain('confirmed');",
"});",
"",
"test('cart shows the right total', async ({ signedIn }) => {",
"  await signedIn.cart.add('Keyboard');",
"  await signedIn.cart.open();",
"  await expect.poll(() => signedIn.cart.total()).toBe('$49');",
"});",
"",
"test('declined card shows an error', async ({ signedIn }) => {",
"  await signedIn.buy('Keyboard', cards.declined);",
"  await expect.poll(() => signedIn.checkout.result()).toContain('declined');",
"});");

const SPECN = 'checkout.spec.ts';
const STAGES = [
  {t: 'One file', why: 'Everything in one place: URLs, passwords, selectors, sleeps and **4 copies of the login steps**.', gain: 'Fast to write and it works. The pain grows with every new test.',
    files: {[SPECN]: SPEC0}},
  {t: 'Config & data out', why: 'URL and credentials leave the tests: `playwright.config.ts` and `data/users.ts`. This is the **Infra** layer starting.', gain: 'Change environment or user without touching a test.',
    files: {'playwright.config.ts': CONFIG, 'data/users.ts': USERS, [SPECN]: SPEC1}},
  {t: 'Page objects', why: 'Locators and waiting hide behind methods. `waitForTimeout` becomes a web-first wait. This is the **Page** layer.', gain: 'A UI change touches one page class, not every test.',
    files: {'pages/LoginPage.ts': LOGIN, 'pages/CartPage.ts': CART, 'pages/CheckoutPage.ts': CHECKOUT, [SPECN]: SPEC2}},
  {t: 'Business flow', why: '`loginAs()` and `buy()` are named business steps. Tests read like requirements. This is the **Flow** layer.', gain: 'A business-process change touches one flow method; tests shrink.',
    files: {'flows/ShopFlow.ts': FLOW, [SPECN]: SPEC3}},
  {t: 'Fixtures & API setup', why: 'Fixtures hand out ready objects. Login for most tests goes through the **API**, below the UI.', gain: 'Less repeated UI work, isolated tests, faster runs.',
    files: {'api/shopApi.ts': API, 'fixtures.ts': FIX, [SPECN]: SPEC4}},
  {t: 'Driver adapter (optional)', why: 'Pages and flows talk to a `Driver` interface and no longer know Playwright. Cost: an extra layer, and Locator-based web-first matchers are gone (`expect.poll` instead).', gain: 'Switching tool means rewriting the driver plus two small setup helpers, not pages or tests. Skip it unless you need that.',
    files: {'driver/Driver.ts': DRV, 'driver/PlaywrightDriver.ts': PWD, 'pages/LoginPage.ts': LOGIN5, 'pages/CartPage.ts': CART5, 'pages/CheckoutPage.ts': CHECKOUT5, 'flows/ShopFlow.ts': FLOW5, 'fixtures.ts': FIX5, [SPECN]: SPEC5}}
];
const TOOL = /\bpage\b\.|\.locator\(/;
const SCEN = [
  {k: 'A', t: 'The login button\'s locator changes', pats: ['button.btn-login']},
  {k: 'B', t: 'Staging: new URL + new credentials', pats: ['shop.example.com', 'anna@example.com', 'S3cret!']},
  {k: 'C', t: 'Checkout gets a new step ("accept terms")', stagePats: ['#pay', '#pay', 'checkout.pay(', 'checkout.pay(', 'checkout.pay(', 'checkout.pay(']},
  {k: 'D', t: 'Switch to another automation tool', tool: true}
];

/* cumulative file maps */
const FILES = []; STAGES.forEach((s, i) => { const m = Object.assign({}, i ? FILES[i - 1] : {}, s.files); FILES.push(m); });
const count = (s, pat) => { let n = 0, i = 0; while ((i = s.indexOf(pat, i)) >= 0) { n++; i += pat.length; } return n; };
function scen(si, sc) {
  const files = FILES[si], hit = {}; let places = 0;
  for (const [p, code] of Object.entries(files)) {
    let n = 0;
    if (sc.tool) n = code.split('\n').filter(l => TOOL.test(l)).length;
    else { const pats = sc.stagePats ? [sc.stagePats[si]] : sc.pats; pats.forEach(x => n += count(code, x)); }
    if (n) { hit[p] = n; places += n; }
  }
  return {hit, places};
}
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const rich = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
const KW = /(\/\/.*$)|('(?:[^'\\]|\\.)*')|\b(import|from|export|const|async|await|class|constructor|private|readonly|new|return|interface|extends|implements|type|void|Promise|string|test|expect)\b/g;
const hl = line => { let o = '', last = 0, m; KW.lastIndex = 0; while ((m = KW.exec(line))) { o += esc(line.slice(last, m.index)); o += m[1] ? '<i class="c">' + esc(m[1]) + '</i>' : m[2] ? '<i class="s">' + esc(m[2]) + '</i>' : '<i class="k">' + m[3] + '</i>'; last = m.index + m[0].length; } return o + esc(line.slice(last)); };

window.REFACTOR = {STAGES, SCEN};
window.refactorHTML = () => '<div class="rf"></div>';
window.initRefactor = root => {
  let st = 0, sel = SPECN, sc = null, timer = null;
  const first = i => { const fs = Object.keys(STAGES[i].files).filter(p => p !== SPECN && !(i && FILES[i - 1][p] === FILES[i][p])); return fs[0] || SPECN; };
  const paint = () => {
    const files = FILES[st], prev = st ? FILES[st - 1] : {};
    if (!files[sel]) sel = SPECN;
    const paths = Object.keys(files).sort((a, b) => layerOf(a) - layerOf(b) || a.localeCompare(b));
    const lit = LAYERS.map((l, i) => paths.filter(p => layerOf(p) === i).length);
    const total = paths.reduce((n, p) => n + files[p].split('\n').length, 0);
    const R = sc ? scen(st, sc) : null;
    const status = p => !prev[p] ? 'new' : prev[p] !== files[p] ? 'changed' : '';
    const cur = files[sel], pv = prev[sel], pset = new Set((pv || '').split('\n').map(x => x.trim()).filter(Boolean)), cset = new Set(cur.split('\n').map(x => x.trim()).filter(Boolean));
    const added = cur.split('\n').filter(l => l.trim() && (!pv || !pset.has(l.trim()))).length, removed = pv ? [...pset].filter(x => !cset.has(x)).length : 0;
    const series = sc ? STAGES.map((_, i) => scen(i, sc).places) : [], mx = Math.max(1, ...series);
    root.innerHTML =
      '<div class="rf-top"><div class="rf-steps">' + STAGES.map((s, i) => '<button data-s="' + i + '" class="' + (i === st ? 'on' : i < st ? 'done' : '') + '"><b>' + i + '</b><span>' + esc(s.t) + '</span></button>').join('') + '</div><div class="rf-ctl"><button data-a="prev">‹</button><button data-a="play" class="pri">' + (timer ? '❚❚ Pause' : '▶ Play') + '</button><button data-a="next">›</button></div></div>' +
      '<div class="rf-why"><b>' + st + ' · ' + esc(STAGES[st].t) + '</b> ' + rich(STAGES[st].why) + '<div class="rf-gain">✓ ' + rich(STAGES[st].gain) + '</div></div>' +
      '<div class="rf-grid"><div class="rf-tree"><h5>Files <small>' + paths.length + ' · ' + total + ' lines</small></h5>' +
      paths.map(p => { const sx = status(p), hit = R && R.hit[p]; return '<button data-f="' + esc(p) + '" class="' + (p === sel ? 'on ' : '') + (hit ? 'hit' : '') + '" style="--lc:' + LAYERS[layerOf(p)].c + '"><i></i><span>' + esc(p) + '</span>' + (sx ? '<em class="' + sx + '">' + sx + '</em>' : '') + '<small>' + files[p].split('\n').length + (hit ? ' · ✎' + hit : '') + '</small></button>'; }).join('') + '</div>' +
      '<div class="rf-code"><div class="rf-ch"><b>' + esc(sel) + '</b><span style="--lc:' + LAYERS[layerOf(sel)].c + '">' + LAYERS[layerOf(sel)].n + '</span><small>' + (pv ? '+' + added + ' −' + removed : 'new file · ' + added + ' code lines') + '</small></div><pre>' +
      cur.split('\n').map((l, i) => '<div class="ln' + (l.trim() && (!pv || !pset.has(l.trim())) && st ? ' add' : '') + '"><u>' + (i + 1) + '</u><code>' + hl(l) + '</code></div>').join('') + '</pre></div>' +
      '<div class="rf-side"><div class="rf-lay"><h5>Layers lit up</h5>' + LAYERS.map((l, i) => '<div class="' + (lit[i] ? 'on' : '') + '" style="--lc:' + l.c + '"><b>' + l.n + '</b><span>' + (lit[i] ? lit[i] + ' file' + (lit[i] > 1 ? 's' : '') : 'not yet') + '</span></div>').join('') + '</div>' +
      '<div class="rf-sc"><h5>What if… <small>(counted from the code shown)</small></h5>' + SCEN.map(s => '<button data-c="' + s.k + '" class="' + (sc && sc.k === s.k ? 'on' : '') + '"><b>' + s.k + '</b> ' + esc(s.t) + '</button>').join('') +
      (R ? '<div class="rf-res"><div class="rf-n">' + (sc.tool ? 'lines that call the tool API: ' : 'places to edit: ') + '<b>' + R.places + '</b> in <b>' + Object.keys(R.hit).length + '</b> file' + (Object.keys(R.hit).length === 1 ? '' : 's') + '</div><div class="rf-bars">' + series.map((v, i) => '<div class="' + (i === st ? 'on' : '') + '" data-s="' + i + '" title="stage ' + i + ': ' + v + '"><i style="height:' + Math.max(4, Math.round(60 * v / mx)) + 'px"></i><span>' + v + '</span></div>').join('') + '</div><div class="rf-bn">stage 0 → 5</div></div>' : '<div class="rf-hint">Pick a change request to see how many places you must edit at this stage.</div>') + '</div></div></div>';
    $$('[data-s]').forEach(b => b.onclick = () => go(+b.dataset.s));
    $$('[data-f]').forEach(b => b.onclick = () => { sel = b.dataset.f; paint(); });
    $$('[data-c]').forEach(b => b.onclick = () => { sc = sc && sc.k === b.dataset.c ? null : SCEN.find(x => x.k === b.dataset.c); paint(); });
    $$('[data-a]').forEach(b => b.onclick = () => { const a = b.dataset.a; if (a === 'prev') go(Math.max(0, st - 1)); else if (a === 'next') go(Math.min(STAGES.length - 1, st + 1)); else play(); });
  };
  const $$ = s => [...root.querySelectorAll(s)];
  const go = i => { st = i; sel = first(i); paint(); };
  const stop = () => { clearInterval(timer); timer = null; };
  const play = () => { if (timer) { stop(); paint(); return; } if (st >= STAGES.length - 1) go(0); timer = setInterval(() => { if (st >= STAGES.length - 1) { stop(); paint(); return; } go(st + 1); }, 3800); paint(); };
  sel = first(0); paint();
};
})();
