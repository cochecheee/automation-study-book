(function () {
  window.SCENARIOS = window.SCENARIOS || [];
  // helper: compact message builder
  function m(step, from, to, proto, info, short, size, summary, parts, fields, raw, rawLabel) {
    return {
      step: step, from: from, to: to, proto: proto, info: info, short: short, size: size,
      detail: {
        summary: summary,
        parts: parts.map(function (p) { return { name: p[0], size: p[1], note: p[2] }; }),
        fields: fields, rawLabel: rawLabel, raw: raw, footer: 'Values are illustrative.'
      }
    };
  }

  /* ------------------------------------------------------------------ 1 */
  window.SCENARIOS.push({
    id: 'web-launch-goto', platform: 'web', level: 1,
    title: 'Launch & page.goto',
    subtitle: 'From test start to a loaded page',
    tags: ['launch', 'goto', 'browser', 'context', 'page', 'cdp', 'navigation'],
    overview: {
      text: 'Before any click or assertion can happen, Playwright has to start its driver, launch a real browser process, create an isolated BrowserContext with one Page, and navigate it. This scenario shows every process involved and every protocol message from the first line of your test to the page "load" event. Understanding it explains why tests are fast to start, why contexts are cheap, and where a navigation timeout actually comes from.',
      facts: [['Protocol', 'CDP over a pipe (Chromium)'], ['Processes', 'Test/Node, browser, renderer'], ['Browser launch', '~300-900 ms headless'], ['New context', '~10-30 ms'], ['goto waits for', '"load" event by default']],
      caveat: 'Node.js runs the Playwright server in-process; Java and Python spawn a separate Node "driver" process and talk to it over a stdio pipe.',
      guide: 'browser-contexts'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'launch.spec.ts / Main.java', icon: 'terminal', x: 120, y: 300, layer: 1 },
      { id: 'driver', label: 'Playwright driver', sub: 'Node.js server + CDP client', icon: 'gear', x: 340, y: 170, layer: 3 },
      { id: 'browser', label: 'Browser process', sub: 'Chromium (headless)', icon: 'browser', x: 560, y: 260, layer: 4 },
      { id: 'ctx', label: 'BrowserContext', sub: 'isolated profile in memory', icon: 'cube', x: 560, y: 430, layer: 4 },
      { id: 'page', label: 'Page / renderer', sub: 'about:blank -> example.com', icon: 'app', x: 800, y: 170, layer: 5 },
      { id: 'site', label: 'example.com', sub: 'web server', icon: 'cloud', x: 800, y: 400, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'driver', label: 'in-process / stdio' },
      { a: 'driver', b: 'browser', label: 'CDP over pipe' },
      { a: 'browser', b: 'ctx', label: 'owns' },
      { a: 'browser', b: 'page', label: 'renderer IPC' },
      { a: 'browser', b: 'site', label: 'HTTPS' }
    ],
    steps: [
      { title: 'Start Playwright', sub: 'Create the driver connection', focus: 'test', highlight: ['driver'],
        bubble: 'Playwright.create()',
        text: 'Your test first needs a Playwright object. In Node.js the server code runs inside your own process. In Java the library unpacks and launches a Node driver as a child process and talks to it with JSON messages over stdin/stdout. Nothing is launched in the browser yet.',
        facts: [['Node.js', 'server in-process'], ['Java', 'child "node driver" over stdio'], ['Wire format', 'JSON, length-prefixed']],
        code: {
          ts: `import { chromium } from 'playwright';

// Node: client and server live in the same process
console.log(typeof chromium.launch); // "function"
const browser = await chromium.launch();
console.log(browser.version());
await browser.close();`,
          java: `import com.microsoft.playwright.*;

public class Main {
  public static void main(String[] args) {
    // spawns the bundled Node driver (stdio pipe)
    try (Playwright playwright = Playwright.create()) {
      Browser browser = playwright.chromium().launch();
      System.out.println(browser.version());
    }
  }
}`
        },
        note: 'First Java run can feel slow: the driver is extracted and browsers may be downloaded once.', guide: 'library' },
      { title: 'Launch the browser', sub: 'A real Chromium process starts', focus: 'driver', highlight: ['browser'],
        bubble: 'chromium.launch()',
        text: 'The driver resolves the browser executable from its ms-playwright cache and starts it as a child process with --remote-debugging-pipe. CDP messages now flow over file descriptors 3 and 4 as null-terminated JSON instead of a TCP port, so nothing else on the machine can attach. Headless is the default.',
        facts: [['Flag', '--remote-debugging-pipe'], ['Default mode', 'headless'], ['Cache dir', '~/.cache/ms-playwright'], ['Handle', 'Browser object']],
        code: {
          ts: `import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: true,
  args: ['--disable-gpu'],
});
console.log(browser.isConnected()); // true
await browser.close();`,
          java: `import com.microsoft.playwright.*;

try (Playwright playwright = Playwright.create()) {
  Browser browser = playwright.chromium().launch(
    new BrowserType.LaunchOptions()
      .setHeadless(true)
      .setArgs(java.util.List.of("--disable-gpu")));
  System.out.println(browser.isConnected()); // true
}`
        },
        note: 'Playwright uses its own patched browser builds; a different system Chrome needs channel: "chrome".', guide: 'browsers' },
      { title: 'Context and page', sub: 'Isolated profile + one tab', focus: 'ctx', highlight: ['browser', 'driver'],
        bubble: 'browser.newContext()',
        text: 'A BrowserContext is an isolated, in-memory browser profile: its own cookies, localStorage, cache and permissions, like an incognito window. Creating one takes milliseconds, which is why every test gets its own. page = context.newPage() then creates a target (a tab) inside that context, and the driver attaches to it.',
        facts: [['Isolation', 'cookies, storage, cache, permissions'], ['Cost', 'ms, no new browser process'], ['CDP', 'Target.createBrowserContext']],
        code: {
          ts: `import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  locale: 'en-US',
});
const page = await context.newPage();
console.log(context.pages().length); // 1`,
          java: `import com.microsoft.playwright.*;

try (Playwright playwright = Playwright.create()) {
  Browser browser = playwright.chromium().launch();
  BrowserContext context = browser.newContext(
    new Browser.NewContextOptions()
      .setViewportSize(1280, 720)
      .setLocale("en-US"));
  Page page = context.newPage();
  System.out.println(context.pages().size()); // 1
}`
        },
        note: 'Never share one context across parallel tests - state leaks are a classic flakiness source.', guide: 'browser-contexts' },
      { title: 'page.goto()', sub: 'Navigate and ask the network', focus: 'browser', highlight: ['site', 'driver'],
        bubble: 'page.goto(url)',
        text: 'goto sends Page.navigate to the target. The browser resolves DNS, opens TLS and requests the document from the server. Playwright answers your call only after the navigation commits and the wait condition is met - by default the "load" event, with the main-resource Response object returned.',
        facts: [['CDP', 'Page.navigate'], ['waitUntil', 'load (default)'], ['Timeout', 'navigationTimeout, 0 = none in library'], ['Returns', 'main Response | null']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test('opens the home page', async ({ page }) => {
  const response = await page.goto('https://example.com/', {
    waitUntil: 'load',
  });
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle('Example Domain');
});`,
          java: `import com.microsoft.playwright.*;
import com.microsoft.playwright.options.WaitUntilState;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

// page created as in the previous step
Response response = page.navigate("https://example.com/",
  new Page.NavigateOptions()
    .setWaitUntil(WaitUntilState.LOAD));
System.out.println(response.status()); // 200
assertThat(page).hasTitle("Example Domain");`
        },
        note: 'goto resolves on "load", not when your SPA finished rendering - use web-first assertions afterwards.', guide: 'navigations' },
      { title: 'Loaded events', sub: 'Lifecycle events resolve the call', focus: 'driver', highlight: ['browser', 'page', 'test'],
        bubble: 'load fired',
        text: 'While the page loads the browser streams Page.lifecycleEvent notifications (commit, DOMContentLoaded, load). The driver watches for the one you asked for, then resolves the pending goto and replies to your test with the Response. The page now shows the Example Domain heading and the test continues.',
        facts: [['Events', 'DOMContentLoaded, load'], ['Return path', 'driver -> test'], ['Redirects', 'followed automatically']],
        note: 'A goto timeout almost always means the load event never fired (hanging third-party request), not that the server is down.' },
      { title: 'Close and clean up', sub: 'Dispose context, kill browser', focus: 'driver', highlight: ['ctx', 'browser'],
        text: 'Closing the context discards all of its cookies and storage instantly; closing the browser terminates the child process. Playwright Test does this for you after every test through fixtures, which is why tests start from a clean slate.',
        facts: [['CDP', 'Target.disposeBrowserContext'], ['State after', 'nothing persisted to disk']],
        code: {
          ts: `import { chromium } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext();
await context.newPage();
await context.close();   // cookies and storage gone
await browser.close();   // child process exits`,
          java: `import com.microsoft.playwright.*;

try (Playwright playwright = Playwright.create()) {
  Browser browser = playwright.chromium().launch();
  BrowserContext context = browser.newContext();
  context.newPage();
  context.close();   // cookies and storage gone
  browser.close();   // child process exits
}`
        } }
    ],
    messages: [
      m(0, 'test', 'driver', 'IPC', 'Playwright.create()  (Java: spawn node driver, stdio pipe)', 'create', '180 B',
        'The client library connects to the Playwright server (in-process in Node, child process in Java).',
        [['Length prefix', 4, 'uint32 LE'], ['JSON message', 176, 'id, guid, method']],
        [['guid', '(root)', 'root object of the protocol'], ['method', 'initialize', 'handshake'], ['sdkLanguage', 'java', 'Node/Python/Java/.NET']],
        '{"id":1,"guid":"","method":"initialize","params":{"sdkLanguage":"java"}}', 'Playwright protocol message'),
      m(1, 'test', 'driver', 'IPC', 'browserType.launch {headless:true}', 'launch', '210 B',
        'Your launch call is serialized and sent to the server.',
        [['Length prefix', 4, 'framing'], ['JSON', 206, 'launch options']],
        [['guid', 'browser-type@chromium', 'which engine'], ['method', 'launch', 'the call'], ['headless', 'true', 'no window']],
        '{"id":2,"guid":"browser-type@chromium","method":"launch","params":{"headless":true,"args":["--disable-gpu"]}}'),
      m(1, 'driver', 'browser', 'CLI', 'chrome --remote-debugging-pipe --headless --no-sandbox ...', 'spawn', '~1 KB',
        'The driver starts the browser child process with a CDP pipe.',
        [['Executable', 40, 'chrome-linux/chrome'], ['Flags', 600, 'automation defaults'], ['fd 3/4', 1, 'CDP pipe']],
        [['--remote-debugging-pipe', 'fd 3 (in) / fd 4 (out)', 'CDP without a TCP port'], ['--user-data-dir', '/tmp/playwright_chromiumdev_profile-XXXX', 'temp profile'], ['--headless', 'new', 'no visible window']],
        '/home/ci/.cache/ms-playwright/chromium-1140/chrome-linux/chrome --disable-gpu --headless --no-sandbox --remote-debugging-pipe --user-data-dir=/tmp/playwright_chromiumdev_profile-ab12cd --no-startup-window', 'Process command line'),
      m(2, 'test', 'driver', 'IPC', 'browser.newContext {viewport:1280x720, locale:en-US}', 'newContext', '240 B',
        'Ask for an isolated context.',
        [['Frame', 4, 'length'], ['JSON', 236, 'context options']],
        [['method', 'newContext', 'create isolated profile'], ['viewport', '1280x720', 'emulated window size'], ['locale', 'en-US', 'navigator.language']],
        '{"id":3,"guid":"browser@1","method":"newContext","params":{"viewport":{"width":1280,"height":720},"locale":"en-US"}}'),
      m(2, 'driver', 'browser', 'CDP', 'Target.createBrowserContext {disposeOnDetach:true}', 'createCtx', '90 B',
        'The server creates the context inside the browser.',
        [['pipe framing', 1, 'NUL terminator'], ['CDP JSON', 89, 'method + params']],
        [['method', 'Target.createBrowserContext', 'new incognito-like profile'], ['disposeOnDetach', 'true', 'cleans up if the client dies'], ['id', '4', 'correlates the reply']],
        '{"id":4,"method":"Target.createBrowserContext","params":{"disposeOnDetach":true}}', 'CDP message (JSON)'),
      m(2, 'driver', 'browser', 'CDP', 'Target.createTarget {url:"about:blank", browserContextId}', 'newPage', '130 B',
        'context.newPage() opens a blank tab; the browser replies with Target.attachedToTarget.',
        [['framing', 1, 'NUL'], ['CDP JSON', 129, 'createTarget']],
        [['method', 'Target.createTarget', 'open a tab'], ['url', 'about:blank', 'initial document'], ['browserContextId', 'A1F9...', 'the context from the previous reply']],
        '{"id":5,"method":"Target.createTarget","params":{"url":"about:blank","browserContextId":"A1F9C3D2E7"}}'),
      m(3, 'test', 'driver', 'IPC', 'page.goto {url:"https://example.com/", waitUntil:"load"}', 'goto', '190 B',
        'The goto call reaches the server together with its wait condition.',
        [['Frame', 4, 'length'], ['JSON', 186, 'url + options']],
        [['guid', 'frame@1', 'main frame of the page'], ['url', 'https://example.com/', 'target'], ['waitUntil', 'load', 'resolve after load event']],
        '{"id":7,"guid":"frame@1","method":"goto","params":{"url":"https://example.com/","waitUntil":"load","timeout":30000}}'),
      m(3, 'driver', 'browser', 'CDP', 'Page.navigate {url, frameId}', 'navigate', '110 B',
        'The driver tells the page to navigate.',
        [['framing', 1, 'NUL'], ['CDP JSON', 109, 'Page.navigate']],
        [['method', 'Page.navigate', 'start navigation'], ['url', 'https://example.com/', 'document to load'], ['frameId', '8B3F...', 'main frame']],
        '{"id":9,"method":"Page.navigate","params":{"url":"https://example.com/","frameId":"8B3F21D0"},"sessionId":"S-4F2A"}'),
      m(3, 'browser', 'site', 'HTTP', 'GET / HTTP/2  Host: example.com', 'GET /', '~400 B',
        'The browser network stack fetches the document.',
        [['Request line', 14, 'GET /'], ['Headers', 380, 'UA, Accept, Accept-Language']],
        [['method', 'GET', 'document request'], ['accept-language', 'en-US', 'from the locale option'], ['user-agent', 'HeadlessChrome/126', 'default UA']],
        'GET / HTTP/2\nHost: example.com\nAccept: text/html,application/xhtml+xml\nAccept-Language: en-US\nUser-Agent: Mozilla/5.0 ... HeadlessChrome/126.0.6478.26 Safari/537.36', 'HTTP request'),
      m(4, 'browser', 'driver', 'CDP', 'Page.lifecycleEvent {name:"load"}  +  Page.loadEventFired', 'load', '120 B',
        'The browser reports that the load event fired; the driver can now resolve goto.',
        [['framing', 1, 'NUL'], ['CDP JSON', 119, 'event, no id']],
        [['method', 'Page.lifecycleEvent', 'notification (no id)'], ['name', 'load', 'matches waitUntil'], ['timestamp', '41652.18', 'monotonic seconds']],
        '{"method":"Page.lifecycleEvent","params":{"frameId":"8B3F21D0","loaderId":"6C1A","name":"load","timestamp":41652.18},"sessionId":"S-4F2A"}', 'CDP event'),
      m(4, 'driver', 'test', 'IPC', 'goto -> Response {status:200, url, headers}', 'response', '320 B',
        'The pending goto call returns the main resource response to your test.',
        [['Frame', 4, 'length'], ['JSON', 316, 'result']],
        [['id', '7', 'matches the request id'], ['status', '200', 'HTTP status of the document'], ['url', 'https://example.com/', 'final URL after redirects']],
        '{"id":7,"result":{"response":{"guid":"response@5"}}}'),
      m(5, 'driver', 'browser', 'CDP', 'Target.disposeBrowserContext / Browser.close', 'dispose', '80 B',
        'Closing the context drops its profile; closing the browser ends the process.',
        [['framing', 1, 'NUL'], ['CDP JSON', 79, 'dispose']],
        [['method', 'Target.disposeBrowserContext', 'delete cookies and storage'], ['browserContextId', 'A1F9C3D2E7', 'which context'], ['next', 'Browser.close', 'then the child exits']],
        '{"id":12,"method":"Target.disposeBrowserContext","params":{"browserContextId":"A1F9C3D2E7"}}')
    ]
  });

  /* ------------------------------------------------------------------ 2 */
  window.SCENARIOS.push({
    id: 'web-click-autowait', platform: 'web', level: 2,
    title: 'locator.click()',
    subtitle: 'Auto-waiting and actionability',
    tags: ['click', 'locator', 'auto-wait', 'actionability', 'cdp', 'input'],
    overview: {
      text: 'A Playwright locator is just a description; nothing happens until you act on it. When you call click(), Playwright resolves the element, runs actionability checks (visible, stable, enabled, receives events), scrolls it into view, computes the click point and only then sends real mouse events. If something fails a check, it silently retries until the timeout. This is the core reason Playwright tests need no sleep() calls.',
      facts: [['Protocol', 'CDP over pipe'], ['Runs in', 'Node worker + injected script'], ['Retry waits', '0, 20, 100, 100, 500 ms ...'], ['Action timeout', 'none by default (test timeout 30 s)'], ['Mouse events', 'trusted, via Input domain']],
      caveat: 'Playwright uses DOM.getContentQuads (and layout metrics) to find the click point, the same data DOM.getBoxModel exposes in DevTools.',
      guide: 'actionability'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'checkout.spec.ts', icon: 'terminal', x: 120, y: 300, layer: 1 },
      { id: 'pw', label: 'Playwright server', sub: 'frame.click + retry loop', icon: 'gear', x: 340, y: 170, layer: 3 },
      { id: 'browser', label: 'Chromium (CDP)', sub: 'DOM, Input domains', icon: 'browser', x: 570, y: 300, layer: 4 },
      { id: 'page', label: 'Page', sub: '<button>Sign in</button>', icon: 'app', x: 800, y: 170, layer: 5 },
      { id: 'overlay', label: 'Cookie banner', sub: 'covers the button 300 ms', icon: 'doc', x: 800, y: 420, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process / stdio' },
      { a: 'pw', b: 'browser', label: 'CDP pipe' },
      { a: 'browser', b: 'page', label: 'renderer' },
      { a: 'page', b: 'overlay', label: 'z-index covers' }
    ],
    steps: [
      { title: 'Lazy locator', sub: 'No DOM query happens yet', focus: 'test',
        bubble: 'getByRole(...)',
        text: 'page.getByRole("button", { name: "Sign in" }) only builds a Locator holding the selector string internal:role=button[name="Sign in"i]. No element is looked up. Each action re-resolves it from scratch, so the locator never goes stale even when the page re-renders.',
        facts: [['Selector', 'internal:role=button[name="Sign in"i]'], ['Queries DOM?', 'no'], ['Strict mode', 'must match exactly 1']],
        code: {
          ts: `import { test } from '@playwright/test';

test('sign in', async ({ page }) => {
  await page.goto('https://shop.example.com/login');
  const signIn = page.getByRole('button', { name: 'Sign in' });
  // nothing has touched the DOM yet
  await signIn.click();
});`,
          java: `import com.microsoft.playwright.*;
import com.microsoft.playwright.options.AriaRole;

page.navigate("https://shop.example.com/login");
Locator signIn = page.getByRole(AriaRole.BUTTON,
  new Page.GetByRoleOptions().setName("Sign in"));
// nothing has touched the DOM yet
signIn.click();`
        },
        guide: 'locators' },
      { title: 'Resolve element', sub: 'Strict query in the page', focus: 'pw', highlight: ['browser', 'page'],
        text: 'click() sends a frame.click command with the selector. The server evaluates it inside the page through an injected script and expects exactly one match. If zero elements match it waits and retries; if two or more match it throws a strict mode violation immediately.',
        facts: [['Call', 'frame.click'], ['CDP', 'Runtime.callFunctionOn'], ['Zero matches', 'retry'], ['Many matches', 'strict mode error']],
        note: 'Strict mode violations are a feature: they stop a click landing on the wrong duplicate element.' },
      { title: 'Actionability checks', sub: 'Visible, stable, enabled', focus: 'pw', highlight: ['browser'],
        bubble: 'checks passed?',
        text: 'Before touching the element Playwright verifies it is attached, visible (non-empty box, not visibility:hidden), stable (same bounding box for two animation frames) and enabled. Only then does it test whether the element will receive the event at the click point. These checks run in the page on every retry.',
        facts: [['Checks', 'visible, stable, enabled'], ['Stable', '2 consecutive rAF frames'], ['Then', 'receives events (hit test)']],
        code: {
          ts: `import { test } from '@playwright/test';

test('trial click', async ({ page }) => {
  await page.goto('https://shop.example.com/login');
  const signIn = page.getByRole('button', { name: 'Sign in' });
  // runs every actionability check but does not click
  await signIn.click({ trial: true, timeout: 5000 });
});`,
          java: `import com.microsoft.playwright.*;
import com.microsoft.playwright.options.AriaRole;

page.navigate("https://shop.example.com/login");
Locator signIn = page.getByRole(AriaRole.BUTTON,
  new Page.GetByRoleOptions().setName("Sign in"));
// runs every actionability check but does not click
signIn.click(new Locator.ClickOptions()
  .setTrial(true).setTimeout(5000));`
        },
        guide: 'actionability' },
      { title: 'Covered - retry', sub: 'Hit-target check fails', focus: 'overlay', highlight: ['pw', 'page'],
        bubble: 'intercepts pointer events',
        text: 'At the click point Playwright asks which element is on top. A cookie banner covers the button, so the check fails with "intercepts pointer events". It does not click the banner by accident; it waits 20 ms, 100 ms, 100 ms, 500 ms and tries the whole sequence again while the banner animates away.',
        facts: [['Failure log', '<div class="cookie"> intercepts pointer events'], ['Backoff', '20, 100, 100, 500 ms'], ['Ends at', 'timeout or success']],
        note: 'In the failure message the "Call log" names the interceptor; use it to dismiss the overlay instead of using force: true.' },
      { title: 'Scroll and aim', sub: 'Compute the click point', focus: 'pw', highlight: ['browser'],
        text: 'Once the banner is gone the element is scrolled into view if needed and its geometry is read from the browser as quads. Playwright clicks the centre of the first quad, in viewport coordinates, adding the optional position offset.',
        facts: [['CDP', 'DOM.scrollIntoViewIfNeeded'], ['CDP', 'DOM.getContentQuads'], ['Click point', 'centre of box']] },
      { title: 'Real mouse events', sub: 'move, press, release', focus: 'browser', highlight: ['page'],
        bubble: 'Input.dispatchMouseEvent',
        text: 'Three trusted input events are sent: mouseMoved (hover), mousePressed and mouseReleased with clickCount 1. They go through the browser input pipeline so :hover, focus and event.isTrusted all behave like a real user. Afterwards Playwright waits for any navigation the click started.',
        facts: [['CDP', 'Input.dispatchMouseEvent x3'], ['Button', 'left'], ['isTrusted', 'true']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test('click then verify', async ({ page }) => {
  await page.goto('https://shop.example.com/login');
  await page.getByRole('button', { name: 'Sign in' }).click({
    position: { x: 10, y: 5 },
  });
  await expect(page).toHaveURL(/dashboard/);
});`,
          java: `import com.microsoft.playwright.*;
import com.microsoft.playwright.options.AriaRole;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import java.util.regex.Pattern;

page.navigate("https://shop.example.com/login");
page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign in"))
  .click(new Locator.ClickOptions().setPosition(10, 5));
assertThat(page).hasURL(Pattern.compile("dashboard"));`
        },
        guide: 'input' }
    ],
    messages: [
      m(0, 'test', 'test', 'IPC', 'page.getByRole("button",{name:"Sign in"})  -> Locator (no I/O)', 'locator', '0 B',
        'Building a locator is pure client-side string work.',
        [['Selector', 40, 'internal:role=button'], ['Name filter', 12, '[name="Sign in"i]']],
        [['selector', 'internal:role=button[name="Sign in"i]', 'role + accessible name, case-insensitive'], ['network I/O', 'none', 'lazy evaluation'], ['frame', 'page.mainFrame()', 'scope of the lookup']],
        'locator = frame("main").locator("internal:role=button[name=\\"Sign in\\"i]")', 'Client-side representation'),
      m(1, 'test', 'pw', 'IPC', 'frame.click {selector, strict:true, timeout:30000}', 'click', '230 B',
        'The click action is sent with its selector and strictness.',
        [['Frame', 4, 'length'], ['JSON', 226, 'click params']],
        [['method', 'click', 'action'], ['strict', 'true', 'fail on >1 matches'], ['timeout', '30000', 'remaining test budget']],
        '{"id":21,"guid":"frame@1","method":"click","params":{"selector":"internal:role=button[name=\\"Sign in\\"i]","strict":true,"timeout":30000}}'),
      m(1, 'pw', 'browser', 'CDP', 'Runtime.callFunctionOn injected.querySelectorAll(...)', 'resolve', '300 B',
        'The injected script finds matches in the page and returns an element handle.',
        [['framing', 1, 'NUL'], ['CDP JSON', 299, 'function + objectId']],
        [['method', 'Runtime.callFunctionOn', 'run helper in utility world'], ['functionDeclaration', 'injected.querySelectorAll', 'selector engine'], ['returnByValue', 'false', 'we want an element handle']],
        '{"id":44,"method":"Runtime.callFunctionOn","params":{"functionDeclaration":"(injected, selector) => injected.querySelectorAll(selector)","objectId":"-1.4.1","arguments":[{"objectId":"-1.4.2"}],"returnByValue":false},"sessionId":"S-4F2A"}'),
      m(2, 'pw', 'browser', 'CDP', 'Runtime.callFunctionOn checkElementStates ["visible","enabled","stable"]', 'checks', '260 B',
        'All state checks pass in the page; stability needs two animation frames.',
        [['framing', 1, 'NUL'], ['CDP JSON', 259, 'states list']],
        [['states', 'visible, enabled, stable', 'checked in this order'], ['stable', '2 rAF frames', 'bounding box unchanged'], ['result', '"done"', 'or "error:notvisible" etc.']],
        '{"id":45,"method":"Runtime.callFunctionOn","params":{"functionDeclaration":"(el, states) => injected.checkElementStates(el, states)","objectId":"-1.4.7","arguments":[{"value":["visible","enabled","stable"]}],"returnByValue":true},"sessionId":"S-4F2A"}'),
      m(3, 'pw', 'browser', 'CDP', 'hit-target check at (412, 308): <div class="cookie"> intercepts', 'hit test', '240 B',
        'The point check reports a different element on top.',
        [['framing', 1, 'NUL'], ['CDP JSON', 239, 'result']],
        [['result', 'error:intercept', 'another element receives the event'], ['interceptor', 'div.cookie-banner', 'named in the log'], ['action', 'retry', 'no click was sent']],
        '{"id":47,"result":{"result":{"type":"object","value":{"hitTargetDescription":"<div class=\\"cookie-banner\\"> intercepts pointer events"}}},"sessionId":"S-4F2A"}', 'CDP response'),
      m(3, 'overlay', 'page', 'UI', 'cookie banner slides away after 300 ms', 'banner gone', '-',
        'The page itself clears the obstruction while Playwright is backing off.',
        [['Animation', 300, 'CSS transition'], ['DOM removal', 1, 'node detached']],
        [['element', 'div.cookie-banner', 'removed after animation'], ['elapsed', '~300 ms', 'two retries ran'], ['retry waits', '20, 100, 100, 500', 'ms']],
        'retrying click action\n  waiting for element to be visible, enabled and stable\n  element is visible, enabled and stable\n  <div class="cookie-banner"> intercepts pointer events\n  retrying click action, attempt #2 (waiting 100ms)', 'Playwright call log'),
      m(4, 'pw', 'browser', 'CDP', 'DOM.scrollIntoViewIfNeeded {objectId}', 'scroll', '90 B',
        'Make sure the element is inside the viewport.',
        [['framing', 1, 'NUL'], ['CDP JSON', 89, 'scroll']],
        [['method', 'DOM.scrollIntoViewIfNeeded', 'only scrolls when off-screen'], ['objectId', '-1.4.7', 'the element handle'], ['rect', 'omitted', 'whole element']],
        '{"id":50,"method":"DOM.scrollIntoViewIfNeeded","params":{"objectId":"-1.4.7"},"sessionId":"S-4F2A"}'),
      m(4, 'pw', 'browser', 'CDP', 'DOM.getContentQuads {objectId} -> [[x1,y1,...]]', 'quads', '220 B',
        'Geometry is read back; the click point is the centre of the quad.',
        [['framing', 1, 'NUL'], ['CDP JSON', 219, 'quads']],
        [['quad', '[352,288, 472,288, 472,328, 352,328]', 'four corners in CSS px'], ['centre', '412, 308', 'average of the corners'], ['note', 'getBoxModel shows the same data', 'DevTools-equivalent']],
        '{"id":51,"result":{"quads":[[352,288,472,288,472,328,352,328]]},"sessionId":"S-4F2A"}', 'CDP response'),
      m(5, 'pw', 'browser', 'CDP', 'Input.dispatchMouseEvent mouseMoved (412,308)', 'mouseMoved', '110 B',
        'Hover first so :hover styles and mouseover handlers run.',
        [['framing', 1, 'NUL'], ['CDP JSON', 109, 'move']],
        [['type', 'mouseMoved', 'hover'], ['x, y', '412, 308', 'centre of the button'], ['button', 'none', 'no button yet']],
        '{"id":52,"method":"Input.dispatchMouseEvent","params":{"type":"mouseMoved","x":412,"y":308,"button":"none"},"sessionId":"S-4F2A"}'),
      m(5, 'pw', 'browser', 'CDP', 'Input.dispatchMouseEvent mousePressed (412,308) clickCount 1', 'mousePressed', '135 B',
        'Press the left button.',
        [['framing', 1, 'NUL'], ['CDP JSON', 134, 'press']],
        [['type', 'mousePressed', 'button down'], ['button', 'left', 'primary'], ['clickCount', '1', 'single click']],
        '{"id":53,"method":"Input.dispatchMouseEvent","params":{"type":"mousePressed","x":412,"y":308,"button":"left","clickCount":1},"sessionId":"S-4F2A"}'),
      m(5, 'pw', 'browser', 'CDP', 'Input.dispatchMouseEvent mouseReleased (412,308)', 'mouseReleased', '135 B',
        'Release triggers the click event on the button.',
        [['framing', 1, 'NUL'], ['CDP JSON', 134, 'release']],
        [['type', 'mouseReleased', 'button up, fires click'], ['clickCount', '1', 'same as press'], ['isTrusted', 'true', 'event is indistinguishable from a user']],
        '{"id":54,"method":"Input.dispatchMouseEvent","params":{"type":"mouseReleased","x":412,"y":308,"button":"left","clickCount":1},"sessionId":"S-4F2A"}'),
      m(5, 'page', 'page', 'UI', 'click handler runs, form submits, URL becomes /dashboard', 'navigates', '-',
        'The application reacts exactly like it would to a human click.',
        [['Event', 1, 'click'], ['Handler', 20, 'submit + route change']],
        [['event', 'click', 'isTrusted: true'], ['result', 'URL /dashboard', 'checked by the next assertion'], ['Playwright', 'waits for scheduled navigations', 'before returning']],
        'button#sign-in click -> form.submit() -> location=/dashboard', 'Observed effect')
    ]
  });

  /* ------------------------------------------------------------------ 3 */
  window.SCENARIOS.push({
    id: 'web-assert-retry', platform: 'web', level: 2,
    title: 'expect(locator) polling',
    subtitle: 'Web-first assertions retry until true',
    tags: ['expect', 'assertion', 'retry', 'polling', 'flaky', 'timeout', 'web-first'],
    overview: {
      text: 'A web-first assertion such as await expect(locator).toHaveText(...) does not check once; it re-reads the page again and again until the condition holds or the expect timeout (5 s by default) expires. A one-shot assertion on a value you already read has no such patience, so it fails whenever the UI is a few milliseconds late. Choosing the right style is the single biggest fix for flaky UI tests.',
      facts: [['Default expect timeout', '5000 ms'], ['Poll intervals', '100, 250, 500, 1000 ms'], ['Runs in', 'server side retry loop'], ['Failure output', 'Expected / Received + call log'], ['Config', 'expect.timeout or toPass()']],
      caveat: 'Only matchers on locators and pages (toHaveText, toBeVisible, toHaveURL...) retry. expect(await locator.textContent()).toBe(...) does not.',
      guide: 'test-assertions'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'welcome.spec.ts', icon: 'terminal', x: 120, y: 300, layer: 1 },
      { id: 'pw', label: 'Playwright server', sub: 'expect retry loop', icon: 'gear', x: 340, y: 170, layer: 3 },
      { id: 'browser', label: 'Chromium (CDP)', sub: 'Runtime.callFunctionOn', icon: 'browser', x: 570, y: 300, layer: 4 },
      { id: 'page', label: 'Page DOM', sub: '#welcome', icon: 'app', x: 800, y: 170, layer: 5 },
      { id: 'api', label: 'Backend API', sub: 'answers after 600 ms', icon: 'cloud', x: 800, y: 420, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process / stdio' },
      { a: 'pw', b: 'browser', label: 'CDP pipe' },
      { a: 'browser', b: 'page', label: 'renderer' },
      { a: 'page', b: 'api', label: 'fetch' }
    ],
    steps: [
      { title: 'One-shot (flaky)', sub: 'Read once, compare once', focus: 'test', highlight: ['pw'],
        bubble: 'textContent() then assert',
        text: 'Here the test reads the heading text right after the click, which gives "Loading..." because the API has not answered yet. A plain equality check fails instantly. The code is correct on a fast laptop and wrong on a slow CI machine, which is exactly what flaky means.',
        facts: [['Pattern', 'value = await read(); assert(value)'], ['Retries', 'none'], ['Result', 'fails if UI is late']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test('flaky one-shot check', async ({ page }) => {
  await page.goto('https://app.example.com/');
  // snapshot of "right now" - may be "Loading..."
  const text = await page.locator('#welcome').textContent();
  expect(text).toBe('Welcome, Ada');
});`,
          java: `import com.microsoft.playwright.*;
import static org.junit.jupiter.api.Assertions.assertEquals;

page.navigate("https://app.example.com/");
// snapshot of "right now" - may be "Loading..."
String text = page.locator("#welcome").textContent();
assertEquals("Welcome, Ada", text);`
        },
        note: 'This is the anti-pattern the best-practices guide warns about.', guide: 'best-practices' },
      { title: 'Web-first assertion', sub: 'Hand the condition to Playwright', focus: 'pw', highlight: ['test'],
        bubble: 'await expect(...)',
        text: 'expect(locator).toHaveText() sends one expect command containing the expected value and the timeout. From that point the server owns the loop: it evaluates the condition in the page, and if false it waits and evaluates again. Your test code is not involved until a verdict is ready.',
        facts: [['Command', 'frame.expect'], ['Expression', 'to.have.text'], ['Timeout', '5000 ms default']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test('web-first assertion', async ({ page }) => {
  await page.goto('https://app.example.com/');
  await expect(page.locator('#welcome'))
    .toHaveText('Welcome, Ada');
  await expect(page.getByRole('link', { name: 'Logout' }))
    .toBeVisible({ timeout: 10_000 });
});`,
          java: `import com.microsoft.playwright.*;
import com.microsoft.playwright.options.AriaRole;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

page.navigate("https://app.example.com/");
assertThat(page.locator("#welcome")).hasText("Welcome, Ada");
assertThat(page.getByRole(AriaRole.LINK,
    new Page.GetByRoleOptions().setName("Logout")))
  .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(10_000));`
        } },
      { title: 'Poll with backoff', sub: '0 ms, 100, 350, 850 ...', focus: 'browser', highlight: ['pw', 'page', 'api'],
        bubble: 'not yet... retry',
        text: 'The first evaluation runs at once and sees "Loading...". The server then sleeps 100 ms, evaluates again, then 250, 500 and finally 1000 ms between attempts. Cheap early polls catch fast pages; longer waits avoid hammering a busy browser. Meanwhile the API answers at about 600 ms and the DOM updates.',
        facts: [['Intervals', '100, 250, 500, 1000 ms'], ['Poll times', '0, 100, 350, 850, 1850 ...'], ['Each poll', 'one CDP call']],
        note: 'The page needs no hint: there is no sleep, the loop simply ends at the first poll after the DOM changes.' },
      { title: 'Condition met', sub: 'Pass at t = 850 ms', focus: 'pw', highlight: ['test', 'browser'],
        text: 'The poll at 850 ms finds "Welcome, Ada" and the matcher resolves with matches: true. The server returns success and the test moves on, having waited only as long as needed - 850 ms here, not a fixed 5 seconds.',
        facts: [['Elapsed', '~850 ms'], ['Return', 'matches: true'], ['Wasted time', 'none']] },
      { title: 'When it never matches', sub: 'Timeout and failure message', focus: 'test', highlight: ['pw'],
        bubble: 'Timed out 5000ms',
        text: 'If the text never appears, the loop gives up at the timeout and throws a rich error: the locator, the expected value, the last received value and a call log of every attempt. That message usually shows the bug directly, for example a typo in the expected text or an error banner.',
        facts: [['Error', 'Timed out 5000ms waiting for expect(...)'], ['Includes', 'Expected, Received, Call log'], ['Tune', 'expect.configure({ timeout })']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

const slow = expect.configure({ timeout: 15_000 });

test('slow report', async ({ page }) => {
  await page.goto('https://app.example.com/report');
  await slow(page.locator('#total')).toHaveText('42');
  // retry a block of plain code until it passes
  await expect(async () => {
    expect(await page.locator('#rows').count()).toBeGreaterThan(3);
  }).toPass({ intervals: [500, 1000], timeout: 10_000 });
});`,
          java: null,
          javaNote: 'Java has no expect.configure or toPass. Set a global default with PlaywrightAssertions.setDefaultAssertionTimeout(15000) or pass a per-assertion setTimeout(...) option.'
        },
        guide: 'test-timeouts' }
    ],
    messages: [
      m(0, 'test', 'pw', 'IPC', 'locator.textContent() -> "Loading..."', 'textContent', '170 B',
        'A plain read returns whatever the DOM holds this instant.',
        [['Frame', 4, 'length'], ['JSON', 166, 'textContent']],
        [['method', 'textContent', 'one read, no waiting for a value'], ['selector', '#welcome', 'element to read'], ['result', '"Loading..."', 'API not finished']],
        '{"id":31,"guid":"frame@1","method":"textContent","params":{"selector":"#welcome","strict":true,"timeout":30000}}'),
      m(0, 'pw', 'test', 'IPC', 'result "Loading..." -> assertEquals fails immediately', 'wrong value', '90 B',
        'The test asserts on a stale snapshot; no retry exists.',
        [['Frame', 4, 'length'], ['JSON', 86, 'value']],
        [['value', '"Loading..."', 'transient UI state'], ['assertion', 'toBe("Welcome, Ada")', 'plain JS equality'], ['outcome', 'fail at t=0', 'flaky on slow machines']],
        '{"id":31,"result":{"value":"Loading..."}}'),
      m(1, 'test', 'pw', 'IPC', 'frame.expect {expression:"to.have.text", expectedText:["Welcome, Ada"], timeout:5000}', 'expect', '320 B',
        'The whole assertion is delegated to the server.',
        [['Frame', 4, 'length'], ['JSON', 316, 'expect params']],
        [['expression', 'to.have.text', 'which matcher'], ['expectedText', '[{"string":"Welcome, Ada"}]', 'normalized expected values'], ['timeout', '5000', 'expect timeout']],
        '{"id":32,"guid":"frame@1","method":"expect","params":{"selector":"#welcome","expression":"to.have.text","expectedText":[{"string":"Welcome, Ada","normalizeWhiteSpace":true}],"isNot":false,"timeout":5000}}'),
      m(2, 'pw', 'browser', 'CDP', 'poll #1 (t=0 ms): Runtime.callFunctionOn expect -> "Loading..."', 'poll 1', '260 B',
        'First evaluation runs immediately and fails.',
        [['framing', 1, 'NUL'], ['CDP JSON', 259, 'expect function']],
        [['t', '0 ms', 'no initial delay'], ['received', '"Loading..."', 'does not match'], ['next wait', '100 ms', 'first interval']],
        '{"id":60,"method":"Runtime.callFunctionOn","params":{"functionDeclaration":"(injected, node, options) => injected.expect(node, options, [])","returnByValue":true},"sessionId":"S-4F2A"}'),
      m(2, 'pw', 'browser', 'CDP', 'poll #2 (t=100) and #3 (t=350): still "Loading..."', 'poll 2-3', '260 B',
        'Two more polls with growing delay find no change yet.',
        [['framing', 1, 'NUL'], ['CDP JSON', 259, 'same function']],
        [['t', '100, 350 ms', 'intervals 100 then 250'], ['received', '"Loading..."', 'API still pending'], ['next wait', '500 ms', 'interval grows']],
        '{"id":61,"result":{"result":{"value":{"matches":false,"received":"Loading..."}}},"sessionId":"S-4F2A"}', 'CDP response'),
      m(2, 'api', 'page', 'HTTP', 'GET /api/me -> 200 {"name":"Ada"}  (t~600 ms), DOM updates', 'data arrives', '140 B',
        'The page finally receives data and rewrites the heading.',
        [['Status line', 15, '200 OK'], ['JSON body', 25, 'name']],
        [['elapsed', '~600 ms', 'slow CI backend'], ['DOM change', '#welcome = "Welcome, Ada"', 'rendered by the app'], ['Playwright', 'unaware', 'it just keeps polling']],
        'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"name":"Ada"}', 'HTTP response'),
      m(3, 'pw', 'browser', 'CDP', 'poll #4 (t=850 ms): matches:true received "Welcome, Ada"', 'poll 4', '230 B',
        'The first poll after the DOM change succeeds.',
        [['framing', 1, 'NUL'], ['CDP JSON', 229, 'result']],
        [['t', '850 ms', '100 + 250 + 500'], ['matches', 'true', 'condition satisfied'], ['received', '"Welcome, Ada"', 'equals expected']],
        '{"id":62,"result":{"result":{"value":{"matches":true,"received":"Welcome, Ada"}}},"sessionId":"S-4F2A"}', 'CDP response'),
      m(3, 'pw', 'test', 'IPC', 'expect result {matches:true}  (850 ms elapsed)', 'pass', '70 B',
        'The server reports success; the awaiting test continues.',
        [['Frame', 4, 'length'], ['JSON', 66, 'result']],
        [['matches', 'true', 'assertion passed'], ['elapsed', '850 ms', 'only as long as needed'], ['log entries', '4 polls', 'visible in trace']],
        '{"id":32,"result":{"matches":true,"log":["locator resolved to <h1 id=\\"welcome\\">Welcome, Ada</h1>"]}}'),
      m(4, 'pw', 'test', 'IPC', 'error: Timed out 5000ms waiting for expect(locator).toHaveText(expected)', 'timeout', '640 B',
        'When nothing matches, the loop ends with a detailed failure.',
        [['Frame', 4, 'length'], ['Message', 400, 'matcher, locator, expected'], ['Call log', 236, 'one line per poll']],
        [['locator', "locator('#welcome')", 'what was polled'], ['Expected / Received', '"Welcome, Ada" / "Error: 500"', 'last observed value'], ['Call log', 'unexpected value x N', 'every attempt is listed']],
        "Error: expect(locator).toHaveText(expected) failed\n\nLocator: locator('#welcome')\nExpected string: \"Welcome, Ada\"\nReceived string: \"Error: 500\"\nTimeout: 5000ms\n\nCall log:\n  - expect.toHaveText with timeout 5000ms\n  - waiting for locator('#welcome')\n  -   locator resolved to <h1 id=\"welcome\">Error: 500</h1>\n  -   unexpected value \"Error: 500\"", 'Failure message')
    ]
  });

  /* ------------------------------------------------------------------ 4 */
  window.SCENARIOS.push({
    id: 'web-network-mock', platform: 'web', level: 2,
    title: 'page.route() mock',
    subtitle: 'Intercept and fulfill network requests',
    tags: ['route', 'mock', 'network', 'fulfill', 'fetch', 'interception', 'cdp'],
    overview: {
      text: 'page.route() lets a test intercept matching requests before they leave the browser and answer them itself. You can return canned JSON, change a real response, or abort the call. This makes UI tests fast and deterministic: no backend needed, rare states such as empty lists or 500 errors on demand. The page cannot tell the difference, because the browser itself believes the response came from the network.',
      facts: [['Protocol', 'CDP Fetch domain'], ['Enable', 'Fetch.enable on first route'], ['Fulfill', 'Fetch.fulfillRequest'], ['Pass through', 'route.continue() / resume()'], ['Scope', 'page or whole context']],
      caveat: 'In Java the pass-through method is route.resume() because "continue" is a reserved word; Playwright Test also offers route.fallback() to chain handlers.',
      guide: 'mock'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'users.spec.ts', icon: 'terminal', x: 110, y: 300, layer: 1 },
      { id: 'pw', label: 'Playwright server', sub: 'route handlers', icon: 'gear', x: 330, y: 170, layer: 3 },
      { id: 'browser', label: 'Chromium (CDP)', sub: 'Fetch domain', icon: 'browser', x: 550, y: 300, layer: 4 },
      { id: 'page', label: 'Page', sub: 'users table', icon: 'app', x: 790, y: 170, layer: 5 },
      { id: 'api', label: 'Real API', sub: 'api.example.com', icon: 'cloud', x: 790, y: 420, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process / stdio' },
      { a: 'pw', b: 'browser', label: 'CDP Fetch' },
      { a: 'browser', b: 'page', label: 'renderer' },
      { a: 'browser', b: 'api', label: 'HTTPS (real)' },
      { a: 'pw', b: 'api', label: 'route.fetch()' }
    ],
    steps: [
      { title: 'Register the route', sub: 'Fetch.enable with patterns', focus: 'test', highlight: ['pw', 'browser'],
        bubble: 'page.route("**/api/users")',
        text: 'page.route() stores your handler on the client and tells the browser to pause requests. The server enables the CDP Fetch domain for the page so every matching request stops at the request stage and is reported to Playwright before it touches the network. Register routes before the navigation that makes the request.',
        facts: [['Glob', '**/api/users'], ['CDP', 'Fetch.enable'], ['Stage', 'Request'], ['Order', 'last registered wins']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test('mocked users list', async ({ page }) => {
  await page.route('**/api/users', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([{ id: 1, name: 'Ada' }]),
  }));
  await page.goto('https://app.example.com/users');
  await expect(page.getByRole('row', { name: 'Ada' })).toBeVisible();
});`,
          java: `import com.microsoft.playwright.*;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

page.route("**/api/users", route -> route.fulfill(
  new Route.FulfillOptions()
    .setStatus(200)
    .setContentType("application/json")
    .setBody("[{\\"id\\":1,\\"name\\":\\"Ada\\"}]")));
page.navigate("https://app.example.com/users");
assertThat(page.getByText("Ada")).isVisible();`
        },
        guide: 'network' },
      { title: 'Request is paused', sub: 'Fetch.requestPaused', focus: 'browser', highlight: ['page', 'pw'],
        bubble: 'GET /api/users paused',
        text: 'The page runs fetch("/api/users"). Before any DNS or socket work the browser freezes the request and sends Fetch.requestPaused with the URL, method and headers. The page is still waiting on its promise, and nothing has reached api.example.com.',
        facts: [['CDP event', 'Fetch.requestPaused'], ['Carries', 'requestId, request, resourceType'], ['Network hit', 'none yet']] },
      { title: 'route.fulfill()', sub: 'Answer with canned JSON', focus: 'pw', highlight: ['browser', 'page'],
        bubble: 'Fetch.fulfillRequest',
        text: 'Your handler runs in the test process. route.fulfill() becomes Fetch.fulfillRequest carrying the status code, headers and the body as base64. The browser then completes the request as if a server had replied, so CORS headers, content-type handling and response parsing all behave normally.',
        facts: [['CDP', 'Fetch.fulfillRequest'], ['Body', 'base64 encoded'], ['Latency', 'a few ms']],
        note: 'Add access-control-allow-origin when mocking cross-origin calls, otherwise the page itself blocks the mock.' },
      { title: 'Page renders mock data', sub: 'The UI never knew', focus: 'page', highlight: ['browser'],
        text: 'The fetch promise resolves with the mocked JSON and the framework renders one row, Ada. The visible result is identical to a real backend answer, which means UI logic is exercised for real while the data is fully under test control.',
        facts: [['Rows shown', '1 (Ada)'], ['Backend calls', '0'], ['Flakiness', 'no network dependency']] },
      { title: 'continue and fetch', sub: 'Pass through or modify', focus: 'pw', highlight: ['api', 'browser'],
        bubble: 'route.fetch() + patch',
        text: 'route.continue() releases the request unchanged (Fetch.continueRequest), optionally with changed headers. route.fetch() performs the real request from Node through APIRequestContext, giving you a response object you can edit before calling route.fulfill({ response, json }). Use it to tweak one field of a real payload.',
        facts: [['continue', 'Fetch.continueRequest'], ['fetch', 'request made by Node, not the page'], ['abort', 'Fetch.failRequest']],
        code: {
          ts: `import { test } from '@playwright/test';

test('patch a real response', async ({ page }) => {
  await page.route('**/api/users', async route => {
    const response = await route.fetch();   // real network call
    const users = await response.json();
    users.push({ id: 99, name: 'Test User' });
    await route.fulfill({ response, json: users });
  });
  await page.goto('https://app.example.com/users');
});`,
          java: `import com.microsoft.playwright.*;
import com.google.gson.*;

page.route("**/api/users", route -> {
  APIResponse response = route.fetch();     // real network call
  JsonArray users = JsonParser
    .parseString(response.text()).getAsJsonArray();
  JsonObject extra = new JsonObject();
  extra.addProperty("id", 99);
  extra.addProperty("name", "Test User");
  users.add(extra);
  route.fulfill(new Route.FulfillOptions()
    .setResponse(response).setBody(users.toString()));
});`
        } },
      { title: 'Unroute', sub: 'Stop intercepting', focus: 'pw', highlight: ['browser'],
        text: 'page.unroute() removes a handler; when no routes remain Playwright sends Fetch.disable and traffic flows normally again. Routes also vanish when the page or context closes, so cleanup is automatic between tests.',
        facts: [['CDP', 'Fetch.disable'], ['Auto cleanup', 'on context close']],
        code: {
          ts: `import { test } from '@playwright/test';

test('route only for part of a test', async ({ page }) => {
  const handler = route => route.abort();
  await page.route('**/analytics/**', handler);
  await page.goto('https://app.example.com/');   // analytics blocked
  await page.unroute('**/analytics/**', handler);
  await page.reload();                           // analytics allowed again
});`,
          java: `import com.microsoft.playwright.*;

page.route("**/analytics/**", route -> route.abort());
page.navigate("https://app.example.com/");   // analytics blocked
page.unroute("**/analytics/**");             // removes the handler(s)
page.reload();                               // analytics allowed again`
        },
        note: 'Remember: only requests that happen after route() are intercepted; service workers can bypass it unless blocked.', guide: 'service-workers' }
    ],
    messages: [
      m(0, 'test', 'pw', 'IPC', 'page.route {glob:"**/api/users"}  -> setNetworkInterceptionPatterns', 'route', '170 B',
        'The client registers a pattern; the handler function stays in the test process.',
        [['Frame', 4, 'length'], ['JSON', 166, 'pattern']],
        [['method', 'setNetworkInterceptionPatterns', 'tell the server what to intercept'], ['glob', '**/api/users', 'URL pattern'], ['handler', 'kept in test process', 'invoked per request']],
        '{"id":14,"guid":"browser-context@1","method":"setNetworkInterceptionPatterns","params":{"patterns":[{"glob":"**/api/users"}]}}'),
      m(0, 'pw', 'browser', 'CDP', 'Fetch.enable {patterns:[{urlPattern:"*"}]}', 'Fetch.enable', '90 B',
        'The browser is told to pause requests at the request stage.',
        [['framing', 1, 'NUL'], ['CDP JSON', 89, 'patterns']],
        [['method', 'Fetch.enable', 'turn on interception'], ['patterns', '[{"urlPattern":"*"}]', 'all URLs; Playwright filters by glob itself'], ['handleAuthRequests', 'true', 'also pause auth challenges']],
        '{"id":71,"method":"Fetch.enable","params":{"handleAuthRequests":true,"patterns":[{"urlPattern":"*"}]},"sessionId":"S-4F2A"}'),
      m(1, 'page', 'browser', 'HTTP', 'fetch("/api/users")  GET https://app.example.com/api/users', 'GET', '~350 B',
        'The page issues a normal request; the network stack is about to start.',
        [['Request line', 40, 'GET /api/users'], ['Headers', 310, 'cookie, accept']],
        [['method', 'GET', 'read'], ['url', 'https://app.example.com/api/users', 'matches the glob'], ['initiator', 'script (fetch)', 'resourceType Fetch']],
        'GET /api/users HTTP/1.1\nHost: app.example.com\nAccept: application/json\nCookie: session=...', 'Outgoing request'),
      m(1, 'browser', 'pw', 'CDP', 'Fetch.requestPaused {requestId:"interception-job-3.0", request:{url,method}}', 'requestPaused', '420 B',
        'The browser reports the paused request; nothing went over the wire.',
        [['framing', 1, 'NUL'], ['CDP JSON', 419, 'event']],
        [['requestId', 'interception-job-3.0', 'handle for fulfill/continue'], ['resourceType', 'Fetch', 'XHR/fetch call'], ['responseStatusCode', 'absent', 'request stage, not response stage']],
        '{"method":"Fetch.requestPaused","params":{"requestId":"interception-job-3.0","request":{"url":"https://app.example.com/api/users","method":"GET","headers":{"Accept":"application/json"}},"frameId":"8B3F21D0","resourceType":"Fetch","networkId":"1000.7"},"sessionId":"S-4F2A"}', 'CDP event'),
      m(2, 'pw', 'browser', 'CDP', 'Fetch.fulfillRequest {responseCode:200, headers, body:base64}', 'fulfill', '380 B',
        'route.fulfill() answers the paused request with the mock.',
        [['framing', 1, 'NUL'], ['CDP JSON', 379, 'fulfill']],
        [['responseCode', '200', 'from status option'], ['responseHeaders', 'content-type: application/json', 'from contentType'], ['body', 'W3siaWQiOjEsIm5hbWUiOiJBZGEifV0=', 'base64 of [{"id":1,"name":"Ada"}]']],
        '{"id":72,"method":"Fetch.fulfillRequest","params":{"requestId":"interception-job-3.0","responseCode":200,"responseHeaders":[{"name":"content-type","value":"application/json"},{"name":"content-length","value":"26"}],"body":"W3siaWQiOjEsIm5hbWUiOiJBZGEifV0="},"sessionId":"S-4F2A"}'),
      m(2, 'browser', 'page', 'HTTP', '200 OK application/json  [{"id":1,"name":"Ada"}]  (no network)', '200 mock', '26 B',
        'The page gets its response straight from memory.',
        [['Status', 6, '200'], ['Body', 26, 'mock JSON']],
        [['status', '200', 'as configured'], ['via', 'Fetch.fulfillRequest', 'never hit api.example.com'], ['timing', '~3 ms', 'vs 80-300 ms real']],
        'HTTP/1.1 200 OK\ncontent-type: application/json\ncontent-length: 26\n\n[{"id":1,"name":"Ada"}]', 'Delivered response'),
      m(3, 'page', 'page', 'UI', 'table re-renders with 1 row: Ada', 'renders', '-',
        'The UI shows mocked data.',
        [['Render', 10, 'framework update'], ['DOM', 20, '<tr>Ada</tr>']],
        [['rows', '1', 'Ada'], ['assertion', 'getByRole("row",{name:"Ada"}) visible', 'passes at first poll'], ['backend', 'untouched', 'deterministic']],
        '<table><tr><td>1</td><td>Ada</td></tr></table>', 'Resulting DOM'),
      m(4, 'pw', 'browser', 'CDP', 'Fetch.continueRequest {requestId}  (route.continue())', 'continue', '120 B',
        'Release a request unchanged, optionally with overridden headers.',
        [['framing', 1, 'NUL'], ['CDP JSON', 119, 'continue']],
        [['method', 'Fetch.continueRequest', 'pass-through'], ['headers', 'optional overrides', 'e.g. add x-test: 1'], ['url', 'optional override', 'redirect to staging']],
        '{"id":73,"method":"Fetch.continueRequest","params":{"requestId":"interception-job-4.0","headers":[{"name":"x-test","value":"1"}]},"sessionId":"S-4F2A"}'),
      m(4, 'pw', 'api', 'HTTP', 'route.fetch(): GET /api/users (made by Node APIRequestContext)', 'fetch()', '~300 B',
        'route.fetch() performs the real request from the test process so the response can be edited.',
        [['Request line', 30, 'GET'], ['Headers', 270, 'copied from the page request']],
        [['made by', 'Node, not browser', 'shares the context cookies'], ['returns', 'APIResponse', 'json(), text(), headers()'], ['then', 'route.fulfill({response, json})', 'send the patched version']],
        'GET /api/users HTTP/1.1\nHost: app.example.com\nCookie: session=...\nUser-Agent: Playwright/1.45', 'Request from Node'),
      m(4, 'api', 'pw', 'HTTP', '200 OK [{...real users...}]  -> patched and fulfilled', 'real data', '1.2 KB',
        'The real payload arrives in Node and is modified before being passed to the page.',
        [['Status+headers', 200, 'real'], ['Body', 1000, 'real users']],
        [['status', '200', 'real server'], ['body', '[{"id":1,"name":"Ada"},...]', 'original data'], ['patch', 'push {id:99}', 'test-only user']],
        'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"id":1,"name":"Ada"},{"id":2,"name":"Linus"}]', 'Real response'),
      m(5, 'pw', 'browser', 'CDP', 'Fetch.disable (after page.unroute / context close)', 'Fetch.disable', '60 B',
        'With no routes left the interception stops.',
        [['framing', 1, 'NUL'], ['CDP JSON', 59, 'disable']],
        [['method', 'Fetch.disable', 'resume normal networking'], ['trigger', 'last unroute', 'or context.close()'], ['pending', 'none', 'all handlers settled']],
        '{"id":74,"method":"Fetch.disable","sessionId":"S-4F2A"}')
    ]
  });

  /* ------------------------------------------------------------------ 5 */
  window.SCENARIOS.push({
    id: 'web-auth-state', platform: 'web', level: 2,
    title: 'storageState login once',
    subtitle: 'Reuse authentication across tests',
    tags: ['auth', 'storageState', 'login', 'setup project', 'cookies', 'localStorage', 'dependencies'],
    overview: {
      text: 'Logging in through the UI in every test is slow and fragile. The recommended pattern is a setup project that logs in once, saves the browser state (cookies and localStorage) to a JSON file with storageState, and lets every other test start with a context already preloaded from that file. Tests stay isolated, but each one begins already signed in.',
      facts: [['File', 'playwright/.auth/user.json'], ['Contains', 'cookies, localStorage per origin'], ['Config', 'dependencies: ["setup"]'], ['Saves', 'context.storageState({ path })'], ['Loads', 'use.storageState']],
      caveat: 'The state file holds live credentials: git-ignore it. sessionStorage and IndexedDB are not saved by default.',
      guide: 'auth'
    },
    nodes: [
      { id: 'runner', label: 'Test runner', sub: 'playwright.config.ts', icon: 'gear', x: 330, y: 320, layer: 2 },
      { id: 'setup', label: 'Setup test', sub: 'auth.setup.ts', icon: 'terminal', x: 120, y: 170, layer: 1 },
      { id: 'browser', label: 'Browser context', sub: 'Chromium', icon: 'browser', x: 560, y: 170, layer: 4 },
      { id: 'app', label: 'App server', sub: 'app.example.com', icon: 'cloud', x: 800, y: 170, layer: 5 },
      { id: 'disk', label: 'storageState', sub: 'user.json on disk', icon: 'doc', x: 560, y: 420, layer: 3 },
      { id: 'test', label: 'Feature tests', sub: 'dashboard.spec.ts', icon: 'terminal', x: 120, y: 430, layer: 1 }
    ],
    links: [
      { a: 'runner', b: 'setup', label: 'IPC' },
      { a: 'setup', b: 'browser', label: 'CDP' },
      { a: 'browser', b: 'app', label: 'HTTPS' },
      { a: 'browser', b: 'disk', label: 'write JSON' },
      { a: 'runner', b: 'test', label: 'IPC' },
      { a: 'disk', b: 'test', label: 'read JSON' }
    ],
    steps: [
      { title: 'Declare dependency', sub: 'Setup project runs first', focus: 'runner', highlight: ['setup'],
        bubble: 'dependencies: ["setup"]',
        text: 'In playwright.config.ts a "setup" project matches *.setup.ts files. The real browser project lists it under dependencies and points use.storageState at the file. The runner therefore starts the setup test first and only schedules feature tests when it has passed.',
        facts: [['Setup match', '*.setup.ts'], ['Order', 'setup, then chromium'], ['If setup fails', 'dependent tests are skipped']],
        code: {
          ts: `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  projects: [
    { name: 'setup', testMatch: /.*\\.setup\\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], storageState: 'playwright/.auth/user.json' },
      dependencies: ['setup'],
    },
  ],
});`,
          java: null,
          javaNote: 'Playwright Test projects and dependencies are Node.js only. In Java, log in once in a @BeforeAll with browser.newContext(), save context.storageState(...) to a path, then create each test context with Browser.NewContextOptions().setStorageStatePath(path).'
        },
        guide: 'test-projects' },
      { title: 'Log in once', sub: 'UI login in the setup test', focus: 'browser', highlight: ['setup', 'app'],
        bubble: 'POST /login',
        text: 'The setup test fills the form and clicks Sign in like any other test. The server answers 200 and sets a session cookie (HttpOnly, Secure); the SPA also stores a token in localStorage. The test waits for a post-login element so the state is fully written before saving.',
        facts: [['Cookie', 'session=... HttpOnly Secure'], ['localStorage', 'token'], ['Wait for', 'dashboard heading']],
        code: {
          ts: `import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('https://app.example.com/login');
  await page.getByLabel('Email').fill('ada@example.com');
  await page.getByLabel('Password').fill(process.env.PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
});`,
          java: `import com.microsoft.playwright.*;
import com.microsoft.playwright.options.AriaRole;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

page.navigate("https://app.example.com/login");
page.getByLabel("Email").fill("ada@example.com");
page.getByLabel("Password").fill(System.getenv("PASSWORD"));
page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Sign in")).click();
assertThat(page.getByRole(AriaRole.HEADING,
  new Page.GetByRoleOptions().setName("Dashboard"))).isVisible();`
        } },
      { title: 'Save storageState', sub: 'Write JSON to disk', focus: 'disk', highlight: ['browser', 'setup'],
        text: 'The setup test calls page.context().storageState({ path }). The server asks the browser for all cookies and each origin\'s localStorage, then writes one JSON file. The folder playwright/.auth is git-ignored because the file is effectively a password.',
        facts: [['Method', 'context.storageState'], ['Output', 'cookies[] + origins[]'], ['Size', '~1-5 KB']],
        code: {
          ts: `import { test as setup } from '@playwright/test';

setup('save state', async ({ page }) => {
  await page.goto('https://app.example.com/dashboard');
  await page.context().storageState({
    path: 'playwright/.auth/user.json',
  });
});`,
          java: `import com.microsoft.playwright.*;
import java.nio.file.Paths;

page.navigate("https://app.example.com/dashboard");
page.context().storageState(
  new BrowserContext.StorageStateOptions()
    .setPath(Paths.get("playwright/.auth/user.json")));`
        },
        note: 'Add playwright/.auth to .gitignore.', guide: 'auth' },
      { title: 'Dependent project starts', sub: 'Runner schedules feature tests', focus: 'runner', highlight: ['test'],
        text: 'Once the setup project passes, the runner dispatches feature tests to workers. Each worker reads the same state file; no worker ever repeats the login. With ten workers you still log in exactly once per run.',
        facts: [['Logins per run', '1'], ['Workers', 'read the same file'], ['Isolation', 'each test gets its own context']] },
      { title: 'Preloaded context', sub: 'Tests start signed in', focus: 'test', highlight: ['browser', 'disk', 'app'],
        bubble: 'already logged in',
        text: 'For each test the fixture creates browser.newContext({ storageState }). Playwright adds the cookies to the new context and restores localStorage before any page runs, so page.goto("/dashboard") is authenticated straight away and the server sees the Cookie header.',
        facts: [['Creates', 'context with state loaded'], ['First request', 'carries session cookie'], ['Saved login', 'reused, never mutated']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

// the project's storageState is applied automatically
test('dashboard is reachable', async ({ page }) => {
  await page.goto('https://app.example.com/dashboard');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('ada@example.com')).toBeVisible();
});`,
          java: `import com.microsoft.playwright.*;
import java.nio.file.Paths;
import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

BrowserContext context = browser.newContext(new Browser.NewContextOptions()
  .setStorageStatePath(Paths.get("playwright/.auth/user.json")));
Page page = context.newPage();
page.navigate("https://app.example.com/dashboard");
assertThat(page.getByText("ada@example.com")).isVisible();`
        },
        guide: 'test-use-options' },
      { title: 'Housekeeping', sub: 'Expiry and ignore rules', focus: 'disk', highlight: ['runner'],
        text: 'Sessions expire, so setup runs on every test run and overwrites the file. For several roles save several files (admin.json, user.json). Keep them out of source control and never reuse state across environments.',
        facts: [['Refresh', 'every run via setup project'], ['Multiple roles', 'one file per role'], ['Git', 'ignore playwright/.auth']] }
    ],
    messages: [
      m(0, 'runner', 'setup', 'IPC', 'run {project:"setup", file:"auth.setup.ts"}', 'run setup', '260 B',
        'The runner starts the dependency project first.',
        [['IPC frame', 4, 'length'], ['JSON', 256, 'run message']],
        [['project', 'setup', 'matched by testMatch'], ['file', 'auth.setup.ts', 'the only test in the project'], ['next', 'chromium project', 'blocked until setup passes']],
        '{"method":"run","params":{"file":"/repo/tests/auth.setup.ts","entries":[{"testId":"a1b2-0","retry":0}]}}', 'Runner to worker message'),
      m(1, 'setup', 'browser', 'CDP', 'Input + fill: Email, Password, click Sign in', 'fill / click', '~1 KB',
        'The setup test drives the login form like any other test.',
        [['Actions', 3, 'fill, fill, click'], ['CDP', 900, 'Input.insertText, mouse events']],
        [['fields', 'Email, Password', 'filled via Input.insertText'], ['click', 'Sign in', 'actionability checks apply'], ['secret', 'process.env.PASSWORD', 'never hard-code']],
        '{"id":88,"method":"Input.insertText","params":{"text":"ada@example.com"},"sessionId":"S-4F2A"}'),
      m(1, 'browser', 'app', 'HTTP', 'POST /login {email, password}', 'POST /login', '~420 B',
        'The browser submits credentials to the backend.',
        [['Headers', 220, 'content-type, origin'], ['Body', 200, 'credentials']],
        [['method', 'POST', 'login'], ['content-type', 'application/json', 'API style login'], ['origin', 'https://app.example.com', 'same site']],
        'POST /login HTTP/1.1\nHost: app.example.com\nContent-Type: application/json\n\n{"email":"ada@example.com","password":"***"}', 'HTTP request'),
      m(1, 'app', 'browser', 'HTTP', '200 OK  Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax', 'Set-Cookie', '~380 B',
        'The server issues the session cookie that authenticates later requests.',
        [['Status+headers', 340, 'Set-Cookie'], ['Body', 40, 'token JSON']],
        [['Set-Cookie', 'session=9f2c...', 'HttpOnly so JS cannot read it'], ['SameSite', 'Lax', 'cookie attribute'], ['body', '{"token":"eyJ..."}', 'SPA stores it in localStorage']],
        'HTTP/1.1 200 OK\nSet-Cookie: session=9f2c7a; Path=/; HttpOnly; Secure; SameSite=Lax\nContent-Type: application/json\n\n{"token":"eyJhbGciOi..."}', 'HTTP response'),
      m(2, 'setup', 'browser', 'CDP', 'context.storageState(): Storage.getCookies + read localStorage', 'read state', '~1.4 KB',
        'The server collects cookies and localStorage from the live context.',
        [['framing', 1, 'NUL'], ['CDP JSON', 1400, 'cookies + origins']],
        [['cookies', 'Storage.getCookies', 'all cookies of the context'], ['localStorage', 'per origin', 'read via script in each frame origin'], ['returns', '{cookies, origins}', 'serialized to JSON']],
        '{"id":91,"method":"Storage.getCookies","params":{"browserContextId":"A1F9C3D2E7"}}'),
      m(2, 'browser', 'disk', 'FS', 'write playwright/.auth/user.json', 'write JSON', '1.8 KB',
        'The state is saved so other workers can read it.',
        [['cookies', 700, 'session cookie'], ['origins', 1100, 'localStorage items']],
        [['path', 'playwright/.auth/user.json', 'gitignored'], ['cookies[0].name', 'session', 'auth cookie'], ['origins[0].localStorage', 'token', 'JWT for SPA']],
        '{\n  "cookies": [{"name":"session","value":"9f2c7a","domain":"app.example.com","path":"/","expires":1767225600,"httpOnly":true,"secure":true,"sameSite":"Lax"}],\n  "origins": [{"origin":"https://app.example.com","localStorage":[{"name":"token","value":"eyJhbGciOi..."}]}]\n}', 'user.json'),
      m(3, 'runner', 'test', 'IPC', 'run {project:"chromium", file:"dashboard.spec.ts"}', 'run tests', '260 B',
        'The dependent project may start now that setup passed.',
        [['IPC frame', 4, 'length'], ['JSON', 256, 'run message']],
        [['project', 'chromium', 'depends on setup'], ['file', 'dashboard.spec.ts', 'feature tests'], ['storageState', 'playwright/.auth/user.json', 'from project use options']],
        '{"method":"run","params":{"file":"/repo/tests/dashboard.spec.ts","entries":[{"testId":"c3d4-0","retry":0}]}}', 'Runner to worker message'),
      m(4, 'disk', 'test', 'FS', 'read user.json -> browser.newContext({storageState})', 'read JSON', '1.8 KB',
        'The test fixture loads the saved state when creating its context.',
        [['File', 1800, 'user.json'], ['Fixture', 1, 'context']],
        [['read by', 'context fixture', 'before the page exists'], ['mutation', 'none', 'read-only reuse'], ['applies', 'cookies + localStorage', 'to the fresh context']],
        'browser.newContext({ storageState: "playwright/.auth/user.json" })', 'Fixture call'),
      m(4, 'test', 'browser', 'CDP', 'Storage.setCookies + restore localStorage for the origin', 'preload', '~1.5 KB',
        'Cookies are injected through CDP; localStorage is restored before page scripts run.',
        [['framing', 1, 'NUL'], ['CDP JSON', 1500, 'cookies']],
        [['method', 'Storage.setCookies', 'inject the saved cookies'], ['localStorage', 'restored per origin', 'mechanism is internal to Playwright'], ['result', 'context starts logged in', 'no UI steps']],
        '{"id":12,"method":"Storage.setCookies","params":{"cookies":[{"name":"session","value":"9f2c7a","domain":"app.example.com","path":"/","secure":true,"httpOnly":true}],"browserContextId":"B7E2A1"}}'),
      m(4, 'browser', 'app', 'HTTP', 'GET /dashboard  Cookie: session=9f2c7a  -> 200 (no redirect to /login)', 'GET /dashboard', '~300 B',
        'The first request of the test already carries the session cookie.',
        [['Request line', 25, 'GET /dashboard'], ['Headers', 270, 'Cookie']],
        [['cookie', 'session=9f2c7a', 'from the state file'], ['response', '200', 'not 302 /login'], ['saved time', '~2-4 s', 'per test vs UI login']],
        'GET /dashboard HTTP/1.1\nHost: app.example.com\nCookie: session=9f2c7a', 'HTTP request'),
      m(5, 'runner', 'disk', 'FS', '.gitignore += playwright/.auth ; setup overwrites file each run', 'gitignore', '30 B',
        'Housekeeping: keep secrets out of git and refresh on every run.',
        [['.gitignore', 30, 'one line'], ['user.json', 1800, 'overwritten']],
        [['ignore', 'playwright/.auth', 'avoid committing live sessions'], ['refresh', 'each run', 'setup project always executes'], ['roles', 'admin.json / user.json', 'one file per role']],
        'playwright/.auth', '.gitignore')
    ]
  });

  /* ------------------------------------------------------------------ 6 */
  window.SCENARIOS.push({
    id: 'web-parallel-workers', platform: 'web', level: 2,
    title: 'Workers, projects, sharding',
    subtitle: 'How the runner parallelises tests',
    tags: ['workers', 'parallel', 'projects', 'sharding', 'fullyParallel', 'ipc', 'retries'],
    overview: {
      text: 'The Playwright Test runner is a coordinator. It loads the config, discovers spec files, expands them across projects (chromium, firefox, webkit), and spawns worker processes. Each worker owns a separate browser and runs test groups handed to it over IPC. A failing test makes the worker restart, so one bad test cannot poison the next. With --shard the same run is split across several CI machines.',
      facts: [['Default workers', '50% of CPU cores'], ['Transport', 'Node child_process IPC'], ['Messages', 'init, run, testBegin, testEnd, done'], ['Parallel unit', 'file (or test if fullyParallel)'], ['Shard flag', '--shard=1/3']],
      caveat: 'Playwright Test (runner, projects, workers, sharding) is Node.js only. Java relies on JUnit/TestNG parallel features instead. IPC payloads shown are simplified.',
      guide: 'test-parallel'
    },
    nodes: [
      { id: 'cli', label: 'CLI', sub: 'npx playwright test', icon: 'terminal', x: 110, y: 300, layer: 1 },
      { id: 'runner', label: 'Runner (main)', sub: 'discovery + dispatcher', icon: 'gear', x: 330, y: 300, layer: 2 },
      { id: 'w1', label: 'Worker 0', sub: 'chromium project', icon: 'cube', x: 560, y: 180, layer: 2 },
      { id: 'w2', label: 'Worker 1', sub: 'firefox project', icon: 'cube', x: 560, y: 420, layer: 2 },
      { id: 'b1', label: 'Chromium', sub: 'own browser process', icon: 'browser', x: 800, y: 180, layer: 4 },
      { id: 'b2', label: 'Firefox', sub: 'own browser process', icon: 'browser', x: 800, y: 420, layer: 4 }
    ],
    links: [
      { a: 'cli', b: 'runner', label: 'process start' },
      { a: 'runner', b: 'w1', label: 'IPC' },
      { a: 'runner', b: 'w2', label: 'IPC' },
      { a: 'w1', b: 'b1', label: 'CDP pipe' },
      { a: 'w2', b: 'b2', label: 'Juggler pipe' }
    ],
    steps: [
      { title: 'Discover tests', sub: 'Config, files, projects', focus: 'runner', highlight: ['cli'],
        bubble: 'loads config, finds *.spec.ts',
        text: 'npx playwright test starts the runner, which loads playwright.config.ts, globs testDir for spec files and expands each test across every project. 12 files and 2 projects gives 24 file/project combinations. Nothing is executed yet; the runner just builds a suite tree and test groups.',
        facts: [['Config', 'playwright.config.ts'], ['Projects', 'chromium, firefox'], ['fullyParallel', 'false = file is the unit']],
        code: {
          ts: `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,      // parallelise tests inside files too
  workers: 4,
  retries: 1,
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
  ],
});`,
          java: null,
          javaNote: 'Java has no Playwright Test runner. Use JUnit 5 (junit.jupiter.execution.parallel.enabled=true) or TestNG; each thread needs its own Playwright instance because Playwright objects are not thread-safe.'
        },
        guide: 'test-projects' },
      { title: 'Spawn workers', sub: 'One OS process per worker', focus: 'runner', highlight: ['w1', 'w2'],
        bubble: 'fork 2 workers',
        text: 'The dispatcher forks worker processes (Node child_process). Each worker receives an init message with its workerIndex, project and config. Workers are tied to a project so project-specific use options and browser type are fixed for the life of the worker.',
        facts: [['Process', 'node worker process'], ['Env', 'TEST_WORKER_INDEX, TEST_PARALLEL_INDEX'], ['IPC', 'init message']],
        note: 'Test code runs only in workers, never in the runner process.' },
      { title: 'Run test groups', sub: 'Dispatch, browser per worker', focus: 'w1', highlight: ['runner', 'b1'],
        bubble: 'run + testBegin/testEnd',
        text: 'The runner sends run messages containing test groups. A worker launches its own browser once (worker-scoped fixture), creates a fresh context per test and streams testBegin, stepBegin, stepEnd and testEnd events back. Workers never share a browser, so there is no cross-talk between parallel tests.',
        facts: [['Browser', 'worker-scoped fixture'], ['Context', 'new per test'], ['Events', 'testBegin, stepBegin/End, testEnd']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test('worker identity', async ({ page }, testInfo) => {
  console.log('worker', testInfo.workerIndex, 'project', testInfo.project.name);
  await page.goto('https://example.com/');
  await expect(page).toHaveTitle('Example Domain');
});`,
          java: null,
          javaNote: 'No workerIndex in Java. With JUnit, create Playwright and Browser per test class or thread (for example in @BeforeAll) and close them in @AfterAll.'
        } },
      { title: 'Failure restarts worker', sub: 'Clean process for the retry', focus: 'runner', highlight: ['w1'],
        bubble: 'worker 0 exits',
        text: 'When a test fails, its worker process is torn down because leftover state may be dirty. The runner starts a new worker (new workerIndex) and the retry runs there, along with the remaining tests. This is why a failed test never makes later tests fail, and why worker-scoped setup runs again.',
        facts: [['On failure', 'worker is discarded'], ['New worker', 'new TEST_WORKER_INDEX'], ['Retries', 'config retries: 1']],
        guide: 'test-retries' },
      { title: 'Sharding', sub: 'Split across CI machines', focus: 'cli', highlight: ['runner'],
        bubble: '--shard=1/3',
        text: 'With --shard=1/3 each machine builds the same test list, then keeps only its third of the test groups. Three jobs in a CI matrix thus finish in roughly a third of the time. Workers still parallelise within each machine, and blob reports are merged afterwards.',
        facts: [['Flag', '--shard=1/3'], ['Split unit', 'test groups (files or tests)'], ['Merge', 'blob reporter + merge-reports']],
        code: {
          ts: `// CLI, one command per CI machine:
//   npx playwright test --shard=1/3 --reporter=blob
//   npx playwright test --shard=2/3 --reporter=blob
//   npx playwright test --shard=3/3 --reporter=blob
// then on one machine:
//   npx playwright merge-reports --reporter=html ./all-blob-reports
import { defineConfig } from '@playwright/test';

export default defineConfig({
  fullyParallel: true, // better balance across shards
  reporter: process.env.CI ? 'blob' : 'html',
});`,
          java: null,
          javaNote: 'Sharding is a Playwright Test feature. In Java split suites yourself, for example with Maven Surefire forkCount or by distributing test classes across CI jobs.'
        },
        guide: 'test-sharding' }
    ],
    messages: [
      m(0, 'cli', 'runner', 'CLI', 'npx playwright test --project=chromium --project=firefox', 'start', '-',
        'The command launches the runner process.',
        [['Command', 20, 'npx playwright test'], ['Flags', 40, 'projects, workers']],
        [['args', '--workers=4', 'cap parallelism'], ['projects', 'chromium, firefox', 'matrix dimension'], ['config', 'playwright.config.ts', 'auto-detected']],
        'npx playwright test --workers=4 --project=chromium --project=firefox', 'Command line'),
      m(0, 'runner', 'runner', 'FS', 'glob tests/**/*.spec.ts -> 12 files x 2 projects = 24 groups', 'discover', '-',
        'The runner builds the suite tree without running tests.',
        [['Glob', 20, 'testMatch'], ['Suite tree', 80, 'files x projects']],
        [['files', '12', 'matched by testMatch'], ['groups', '24', 'file/project pairs'], ['fullyParallel', 'true', 'groups can be single tests']],
        'Listing: tests/login.spec.ts, tests/cart.spec.ts, ... [chromium] [firefox]', 'Discovery log'),
      m(1, 'runner', 'w1', 'IPC', 'init {workerIndex:0, parallelIndex:0, projectId:"chromium"}', 'init', '~600 B',
        'The first worker process is configured for the chromium project.',
        [['IPC frame', 4, 'length'], ['JSON', 600, 'config snapshot']],
        [['workerIndex', '0', 'unique id of this process'], ['projectId', 'chromium', 'fixes browser type'], ['config', 'serialized', 'worker reloads config']],
        '{"method":"init","params":{"workerIndex":0,"parallelIndex":0,"repeatEachIndex":0,"projectId":"chromium","config":{"rootDir":"/repo"}}}', 'Runner to worker'),
      m(1, 'runner', 'w2', 'IPC', 'init {workerIndex:1, parallelIndex:1, projectId:"firefox"}', 'init', '~600 B',
        'A second worker is configured for firefox.',
        [['IPC frame', 4, 'length'], ['JSON', 600, 'config snapshot']],
        [['workerIndex', '1', 'unique id'], ['projectId', 'firefox', 'launches Firefox'], ['parallelIndex', '1', 'slot among running workers']],
        '{"method":"init","params":{"workerIndex":1,"parallelIndex":1,"repeatEachIndex":0,"projectId":"firefox"}}', 'Runner to worker'),
      m(2, 'runner', 'w1', 'IPC', 'run {file:"login.spec.ts", entries:[{testId, retry:0}]}', 'run', '~300 B',
        'The dispatcher hands a test group to the worker.',
        [['IPC frame', 4, 'length'], ['JSON', 300, 'group']],
        [['file', 'tests/login.spec.ts', 'file to load'], ['entries', 'testId + retry', 'which tests to run'], ['next', 'testBegin/testEnd', 'streamed back']],
        '{"method":"run","params":{"file":"/repo/tests/login.spec.ts","entries":[{"testId":"f3a1-0","retry":0},{"testId":"f3a1-1","retry":0}]}}', 'Runner to worker'),
      m(2, 'w1', 'b1', 'CDP', 'chromium.launch() once per worker, newContext() per test', 'launch', '-',
        'The worker owns its browser; contexts are created per test.',
        [['launch', 1, 'once'], ['contexts', 1, 'per test']],
        [['browser', 'worker-scoped fixture', 'shared by tests in this worker'], ['context', 'test-scoped fixture', 'fresh and isolated'], ['transport', 'CDP pipe', 'no TCP port']],
        'Target.createBrowserContext -> context fixture -> Target.createTarget', 'Fixture lifecycle'),
      m(2, 'w1', 'runner', 'IPC', 'testBegin / stepBegin / stepEnd / testEnd {status:"passed"}', 'testEnd', '~900 B',
        'Progress events stream back for reporters.',
        [['IPC frame', 4, 'length'], ['JSON', 900, 'event']],
        [['event', 'testEnd', 'one per test attempt'], ['status', 'passed', 'or failed, timedOut, skipped'], ['duration', '1840', 'milliseconds']],
        '{"method":"testEnd","params":{"testId":"f3a1-0","duration":1840,"status":"passed","expectedStatus":"passed","annotations":[],"timeout":30000}}', 'Worker to runner'),
      m(3, 'w1', 'runner', 'IPC', 'testEnd {testId:"f3a1-1", status:"failed"}  then done {failedTestId}', 'failed + done', '~1.2 KB',
        'A failure ends the worker with a done message naming the failed test.',
        [['IPC frame', 4, 'length'], ['JSON', 1200, 'error + stack']],
        [['status', 'failed', 'assertion error attached'], ['done.failedTestId', 'f3a1-1', 'tells the runner why the worker stops'], ['next', 'new worker', 'retry runs in fresh process']],
        '{"method":"done","params":{"failedTestId":"f3a1-1","fatalErrors":[],"remaining":[{"testId":"f3a1-2","retry":0}]}}', 'Worker to runner'),
      m(3, 'runner', 'w1', 'IPC', 'init {workerIndex:2, projectId:"chromium"}  (replacement worker, retry #1)', 'respawn', '~600 B',
        'A new process takes over the retry and remaining tests.',
        [['IPC frame', 4, 'length'], ['JSON', 600, 'config']],
        [['workerIndex', '2', 'new index, old one retired'], ['retry', '1', 'attempt counter'], ['state', 'clean', 'new process and browser']],
        '{"method":"init","params":{"workerIndex":2,"parallelIndex":0,"projectId":"chromium"}}', 'Runner to worker'),
      m(4, 'cli', 'runner', 'CLI', 'npx playwright test --shard=1/3  (machine 1 of 3)', 'shard 1/3', '-',
        'Each CI machine runs the same command with a different shard index.',
        [['Command', 30, 'playwright test'], ['--shard', 10, 'index/total']],
        [['shard', '1/3', 'run first third of the groups'], ['split', 'by test group order', 'not by duration'], ['reporter', 'blob', 'needed to merge later']],
        'npx playwright test --shard=1/3 --reporter=blob', 'Command line'),
      m(4, 'runner', 'runner', 'FS', 'blob-report/report-1.zip written; merge-reports builds one HTML', 'blob', '~250 KB',
        'Per-shard blob reports are merged into one report afterwards.',
        [['blob zip', 250000, 'events + attachments'], ['merge', 1, 'later job']],
        [['file', 'blob-report/report-1.zip', 'one per shard'], ['merge', 'npx playwright merge-reports', 'combine into html'], ['why', 'single report for the whole run', 'instead of 3 partial ones']],
        'blob-report/report-1.zip\nblob-report/report-2.zip\nblob-report/report-3.zip', 'Files written')
    ]
  });

  /* ------------------------------------------------------------------ 7 */
  window.SCENARIOS.push({
    id: 'web-trace-failure', platform: 'web', level: 1,
    title: 'Failure to Trace Viewer',
    subtitle: 'Record, retry, then replay a failed test',
    tags: ['trace', 'trace viewer', 'debug', 'retry', 'on-first-retry', 'snapshots', 'trace.zip'],
    overview: {
      text: 'When a test fails on CI you usually cannot see what the browser showed. A Playwright trace records actions, DOM snapshots, screenshots, console and network for the whole test and packs them into trace.zip. With trace set to on-first-retry, only the retry of a failed test is recorded, so passing runs stay fast while failures come with a complete time-travel debugger.',
      facts: [['Config', "trace: 'on-first-retry'"], ['Output', 'test-results/<test>/trace.zip'], ['Open with', 'npx playwright show-trace'], ['Contains', 'actions, snapshots, network, console'], ['Overhead', 'small, only when recording']],
      caveat: "'on-first-retry' needs retries >= 1; use 'retain-on-failure' to record every run but keep only failures.",
      guide: 'trace-viewer-intro'
    },
    nodes: [
      { id: 'test', label: 'Test worker', sub: 'checkout.spec.ts', icon: 'terminal', x: 110, y: 300, layer: 1 },
      { id: 'runner', label: 'Test runner', sub: 'retries: 1', icon: 'gear', x: 330, y: 170, layer: 2 },
      { id: 'browser', label: 'Chromium', sub: 'page + screencast', icon: 'browser', x: 560, y: 300, layer: 4 },
      { id: 'disk', label: 'trace.zip', sub: 'test-results/...', icon: 'doc', x: 790, y: 170, layer: 3 },
      { id: 'viewer', label: 'Trace Viewer', sub: 'localhost app', icon: 'app', x: 790, y: 420, layer: 5 }
    ],
    links: [
      { a: 'runner', b: 'test', label: 'IPC' },
      { a: 'test', b: 'browser', label: 'CDP' },
      { a: 'test', b: 'disk', label: 'writes' },
      { a: 'disk', b: 'viewer', label: 'loads zip' },
      { a: 'browser', b: 'disk', label: 'snapshots' }
    ],
    steps: [
      { title: 'Test fails', sub: 'First attempt has no trace', focus: 'test', highlight: ['runner'],
        bubble: 'expect timed out',
        text: 'The first attempt of the checkout test fails because a Pay button never became enabled. With trace: "on-first-retry" nothing was recorded for this attempt, so the run is as fast as a normal one. The worker reports failed and the runner decides to retry.',
        facts: [['Attempt', '1 of 2 (retry 0)'], ['Tracing', 'off'], ['Result', 'failed']],
        code: {
          ts: `import { defineConfig } from '@playwright/test';

export default defineConfig({
  retries: 1,                 // required for on-first-retry
  use: {
    trace: 'on-first-retry',  // record only the retry
    screenshot: 'only-on-failure',
  },
});`,
          java: null,
          javaNote: 'trace modes are a Playwright Test option. In Java call context.tracing().start(...) and stop(...) yourself (shown in the next code step).'
        },
        guide: 'test-retries' },
      { title: 'Retry with tracing', sub: 'Fresh worker, recording on', focus: 'runner', highlight: ['test', 'browser'],
        bubble: 'retry #1, trace ON',
        text: 'The runner starts a fresh worker for retry #1. Because testInfo.retry is 1 the trace fixture starts tracing on the new context with screenshots, snapshots and sources enabled. Every action will now be logged with a before and after DOM snapshot.',
        facts: [['Trace options', 'screenshots, snapshots, sources'], ['Chunk', 'one per test'], ['API', 'context.tracing.start()']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test('checkout (manual tracing)', async ({ context, page }) => {
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
  await page.goto('https://shop.example.com/cart');
  await page.getByRole('button', { name: 'Pay' }).click();
  await expect(page.getByText('Thanks')).toBeVisible();
  await context.tracing.stop({ path: 'trace.zip' });
});`,
          java: `import com.microsoft.playwright.*;
import java.nio.file.Paths;

context.tracing().start(new Tracing.StartOptions()
  .setScreenshots(true).setSnapshots(true).setSources(true));
page.navigate("https://shop.example.com/cart");
// ... test steps ...
context.tracing().stop(new Tracing.StopOptions()
  .setPath(Paths.get("trace.zip")));`
        },
        guide: 'trace-viewer' },
      { title: 'Recording', sub: 'Snapshots, frames, events', focus: 'browser', highlight: ['test', 'disk'],
        text: 'While the test runs, each action writes an entry to trace.trace with its selector, timing and a log. DOM snapshots are captured before and after the action, screencast frames give the filmstrip, and network, console and errors are appended as they happen. Large resources such as screenshots and CSS are stored once by hash.',
        facts: [['Files', 'trace.trace, trace.network, resources/'], ['Frames', 'Page.screencastFrame (JPEG)'], ['Snapshots', 'before, action, after']],
        note: 'Traces are small enough to upload from CI but can contain sensitive data in network bodies; treat them like logs.' },
      { title: 'trace.zip is saved', sub: 'Kept next to the failure', focus: 'disk', highlight: ['runner', 'test'],
        text: 'When the test ends, the tracing chunk is stopped and zipped into test-results/checkout-chromium-retry1/trace.zip. The HTML report links the file, and CI uploads it as an artifact so you can download it from the job page.',
        facts: [['Path', 'test-results/<name>-retry1/trace.zip'], ['Typical size', '0.5-5 MB'], ['Linked from', 'HTML report']] },
      { title: 'Open the viewer', sub: 'show-trace on any machine', focus: 'viewer', highlight: ['disk'],
        bubble: 'npx playwright show-trace',
        text: 'Run npx playwright show-trace trace.zip (or drag the file onto trace.playwright.dev). The viewer unpacks the zip locally and serves a web app. Nothing is re-run against your site: it replays recorded data, so it works even when the staging environment is long gone.',
        facts: [['Command', 'npx playwright show-trace trace.zip'], ['Online', 'trace.playwright.dev (runs locally in browser)'], ['Needs network?', 'no']],
        code: {
          ts: `// shell:   npx playwright show-trace test-results/checkout-chromium-retry1/trace.zip
// or open the whole report:   npx playwright show-report
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['html', { open: 'never' }]],
  use: { trace: 'retain-on-failure' }, // alternative mode
});`,
          java: null,
          javaNote: 'Same viewer in Java: mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI -D exec.args="show-trace trace.zip"'
        } },
      { title: 'Read the timeline', sub: 'Actions, snapshots, network', focus: 'viewer', highlight: ['disk'],
        text: 'The top filmstrip shows screenshots over time; the left list shows each action with its duration. Click the red action: the centre shows the DOM before, during and after, the highlighted target, and the call log ("element is not enabled - retrying"). Bottom tabs show Console, Network and the source line. The Pay button was disabled because a /api/cart call returned 500.',
        facts: [['Filmstrip', 'top, hover to scrub'], ['Tabs', 'Call, Log, Errors, Console, Network, Source'], ['Root cause', '500 on POST /api/cart']],
        note: 'Start from the first red action, then look at the Network tab just before it.', guide: 'trace-viewer' }
    ],
    messages: [
      m(0, 'test', 'runner', 'IPC', 'testEnd {status:"failed", errors:[Timed out 5000ms waiting for ... toBeEnabled]}', 'failed', '~1.5 KB',
        'The worker reports the failure with its error and attempt number.',
        [['IPC frame', 4, 'length'], ['JSON', 1500, 'error + stack']],
        [['status', 'failed', 'assertion timeout'], ['retry', '0', 'first attempt'], ['errors[0]', 'Timed out 5000ms waiting for expect(locator).toBeEnabled()', 'Pay button disabled']],
        '{"method":"testEnd","params":{"testId":"9ab3-0","status":"failed","duration":9120,"errors":[{"message":"Timed out 5000ms waiting for expect(locator).toBeEnabled()"}]}}', 'Worker to runner'),
      m(1, 'runner', 'test', 'IPC', 'run {testId:"9ab3-0", retry:1}  (new worker)', 'retry 1', '~300 B',
        'The runner schedules the same test again with retry=1.',
        [['IPC frame', 4, 'length'], ['JSON', 296, 'run']],
        [['retry', '1', 'enables trace on-first-retry'], ['worker', 'new process', 'clean state'], ['trace', 'on', 'decided from testInfo.retry']],
        '{"method":"run","params":{"file":"/repo/tests/checkout.spec.ts","entries":[{"testId":"9ab3-0","retry":1}]}}', 'Runner to worker'),
      m(1, 'test', 'browser', 'CDP', 'context.tracing.start -> Page.startScreencast + snapshot instrumentation', 'tracing on', '~400 B',
        'Tracing starts on the new context.',
        [['framing', 1, 'NUL'], ['CDP JSON', 399, 'screencast']],
        [['method', 'Page.startScreencast', 'JPEG frames for the filmstrip'], ['snapshots', 'true', 'DOM serialised per action'], ['sources', 'true', 'test source copied into the zip']],
        '{"id":15,"method":"Page.startScreencast","params":{"format":"jpeg","quality":90,"maxWidth":800,"maxHeight":800},"sessionId":"S-4F2A"}'),
      m(2, 'browser', 'disk', 'FS', 'append trace.trace: before / log / after + Page.screencastFrame', 'events', '~120 KB',
        'Every action and frame is persisted incrementally.',
        [['trace.trace', 40000, 'actions'], ['trace.network', 30000, 'HAR-like'], ['resources/', 50000, 'screenshots, css']],
        [['before/after', 'DOM snapshots', 'time-travel source'], ['frame', 'page@...-1700000123.jpeg', 'filmstrip image'], ['network', 'POST /api/cart 500', 'root cause evidence']],
        '{"type":"before","callId":"call@7","apiName":"locator.click","params":{"selector":"internal:role=button[name=\\"Pay\\"i]"},"beforeSnapshot":"before@call@7"}\n{"type":"log","callId":"call@7","message":"element is not enabled - retrying click action"}', 'trace.trace (NDJSON)'),
      m(2, 'browser', 'test', 'CDP', 'Network.responseReceived POST /api/cart 500 + Runtime.consoleAPICalled error', 'net + console', '~600 B',
        'Network and console events are captured alongside actions; they explain the failure later.',
        [['framing', 1, 'NUL'], ['CDP JSON', 599, 'events']],
        [['url', 'https://shop.example.com/api/cart', 'request made by the page'], ['status', '500', 'server error'], ['console', 'error: cart update failed', 'stored in the trace console tab']],
        '{"method":"Network.responseReceived","params":{"requestId":"1000.12","type":"Fetch","response":{"url":"https://shop.example.com/api/cart","status":500,"mimeType":"application/json"}},"sessionId":"S-4F2A"}', 'CDP event'),
      m(3, 'test', 'disk', 'FS', 'tracing.stop -> test-results/checkout-chromium-retry1/trace.zip', 'trace.zip', '1.6 MB',
        'The chunk is stopped and zipped on disk.',
        [['trace.trace', 400000, 'events'], ['trace.network', 300000, 'requests'], ['resources', 900000, 'images, css']],
        [['path', 'test-results/checkout-chromium-retry1/trace.zip', 'per attempt'], ['compression', 'zip', 'viewer reads it directly'], ['also', 'screenshot + error-context', 'next to it']],
        'test-results/checkout-chromium-retry1/\n  trace.zip   1.6 MB\n  test-failed-1.png', 'Directory listing'),
      m(4, 'disk', 'viewer', 'CLI', 'npx playwright show-trace test-results/.../trace.zip', 'show-trace', '-',
        'The CLI opens the viewer on the zip.',
        [['Command', 50, 'show-trace'], ['Arg', 40, 'zip path']],
        [['command', 'show-trace', 'opens a window or browser tab'], ['argument', 'trace.zip', 'local file'], ['alternative', 'trace.playwright.dev', 'drop the zip; still processed locally']],
        'npx playwright show-trace test-results/checkout-chromium-retry1/trace.zip', 'Command line'),
      m(5, 'viewer', 'disk', 'FS', 'viewer reads trace.trace, trace.network and resources/<sha1> from the zip', 'load zip', '1.6 MB',
        'The viewer parses the recorded files locally; nothing is sent to a server.',
        [['trace.trace', 400000, 'actions'], ['trace.network', 300000, 'requests'], ['resources', 900000, 'screenshots, css']],
        [['read', 'trace.zip entries', 'local only'], ['index', 'actions by callId', 'builds the timeline'], ['snapshots', 'rendered in an iframe', 'with the real recorded DOM and CSS']],
        'trace.zip\n  trace.trace\n  trace.network\n  resources/3f9a...jpeg\n  resources/src@ab12.txt', 'Zip contents'),
      m(5, 'viewer', 'viewer', 'UI', 'click red action: Before / Action / After snapshot, call log, network tab', 'inspect', '-',
        'The viewer lets you scrub through time.',
        [['Timeline', 30, 'filmstrip'], ['Snapshot', 60, 'DOM'], ['Tabs', 40, 'log, network']],
        [['call log', 'element is not enabled', 'why click was retried'], ['network', 'POST /api/cart -> 500', 'backend error'], ['source', 'checkout.spec.ts:14', 'failing line highlighted']],
        'Actions: goto 412ms | click Pay 5012ms (FAILED)\nCall log: waiting for getByRole("button",{name:"Pay"}); element is not enabled - retrying', 'Viewer details')
    ]
  });

  /* ------------------------------------------------------------------ 8 */
  window.SCENARIOS.push({
    id: 'web-ci-pipeline', platform: 'web', level: 2,
    title: 'Run in CI + HTML report',
    subtitle: 'Push to GitHub Actions to a report',
    tags: ['ci', 'github actions', 'html report', 'artifacts', 'sharding', 'retries', 'install --with-deps'],
    overview: {
      text: 'A git push triggers a GitHub Actions job on a clean Linux VM. The job installs dependencies and browsers, runs npx playwright test with CI-friendly settings (retries, one worker, forbidOnly), then uploads the HTML report and traces as artifacts so a failure can be diagnosed without re-running. For large suites a matrix of shards splits the work across machines.',
      facts: [['Runner', 'ubuntu-latest'], ['Install', 'npx playwright install --with-deps'], ['Run', 'npx playwright test'], ['Artifacts', 'playwright-report/, test-results/'], ['CI env', 'CI=true']],
      caveat: 'Settings such as retries and workers are config choices, not CI defaults. Java projects run via Maven or Gradle instead of npx playwright test.',
      guide: 'ci-intro'
    },
    nodes: [
      { id: 'dev', label: 'Developer', sub: 'git push origin main', icon: 'laptop', x: 100, y: 300, layer: 1 },
      { id: 'gh', label: 'GitHub', sub: 'workflow orchestration', icon: 'cloud', x: 310, y: 160, layer: 3 },
      { id: 'vm', label: 'Actions runner', sub: 'ubuntu-latest VM', icon: 'server', x: 520, y: 300, layer: 3 },
      { id: 'pwt', label: 'playwright test', sub: 'workers + browsers', icon: 'terminal', x: 740, y: 170, layer: 2 },
      { id: 'art', label: 'Artifacts', sub: 'report + traces', icon: 'doc', x: 760, y: 420, layer: 3 }
    ],
    links: [
      { a: 'dev', b: 'gh', label: 'git push' },
      { a: 'gh', b: 'vm', label: 'job dispatch' },
      { a: 'vm', b: 'pwt', label: 'shell step' },
      { a: 'pwt', b: 'art', label: 'files' },
      { a: 'vm', b: 'art', label: 'upload-artifact' }
    ],
    steps: [
      { title: 'Push triggers workflow', sub: 'on: push / pull_request', focus: 'dev', highlight: ['gh', 'vm'],
        bubble: 'git push',
        text: 'The push reaches GitHub, which matches .github/workflows/playwright.yml (on: push and pull_request) and queues a job. A fresh ubuntu-latest VM is assigned within seconds. It starts empty, so everything the test needs must be installed in the job.',
        facts: [['File', '.github/workflows/playwright.yml'], ['Trigger', 'push, pull_request'], ['Machine', 'fresh VM, no browsers']],
        guide: 'ci-intro' },
      { title: 'Install deps + browsers', sub: 'npm ci, install --with-deps', focus: 'vm', highlight: ['gh'],
        bubble: 'install --with-deps',
        text: 'The job checks out the repo, installs Node, runs npm ci and then npx playwright install --with-deps. The --with-deps flag also installs the Linux system libraries (fonts, libnss, gtk) that browsers need, which a bare VM lacks. Browsers land in ~/.cache/ms-playwright and can be cached.',
        facts: [['Command', 'npx playwright install --with-deps'], ['Browsers dir', '~/.cache/ms-playwright'], ['Time', '~30-90 s without cache']],
        code: {
          ts: `import { chromium } from 'playwright';

// after "npx playwright install chromium" this path exists
console.log(chromium.executablePath());
// e.g. /home/runner/.cache/ms-playwright/chromium-1140/chrome-linux/chrome`,
          java: `import com.microsoft.playwright.*;

try (Playwright playwright = Playwright.create()) {
  // browsers are installed on first create(), or by running the CLI:
  // mvn exec:java -e -D exec.mainClass=com.microsoft.playwright.CLI \\
  //   -D exec.args="install --with-deps"
  System.out.println(playwright.chromium().executablePath());
}`
        },
        guide: 'browsers' },
      { title: 'Run with CI settings', sub: 'retries, workers, forbidOnly', focus: 'pwt', highlight: ['vm'],
        bubble: 'npx playwright test',
        text: 'Because the CI environment variable is set, the config switches to CI behaviour: forbidOnly fails the build if someone committed test.only, retries are 2, and workers is 1 to avoid flaky behaviour on small shared VMs. The webServer option can start the app under test before tests begin.',
        facts: [['forbidOnly', 'true on CI'], ['retries', '2 on CI'], ['workers', '1 on CI (default: half the cores)']],
        code: {
          ts: `import { defineConfig } from '@playwright/test';

export default defineConfig({
  forbidOnly: !!process.env.CI,           // fail on test.only
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { open: 'never' }], ['list']],
  use: { trace: 'on-first-retry' },
});`,
          java: null,
          javaNote: 'Java uses JUnit/TestNG with Maven or Gradle (mvn test). Retries come from the build tool, e.g. Surefire rerunFailingTestsCount; there is no forbidOnly or workers option.'
        },
        guide: 'test-configuration' },
      { title: 'Flaky vs failed', sub: 'Retry results in the report', focus: 'pwt', highlight: ['art'],
        text: 'A test that fails and then passes on retry is marked flaky, not failed, and the job still goes green. The summary line says "1 flaky". The report keeps the failed attempt\'s trace so you can fix the cause later; ignoring flaky tests lets real problems hide.',
        facts: [['Status', 'passed / failed / flaky / skipped'], ['Flaky means', 'failed then passed on retry'], ['Exit code', '0 if only flaky']],
        note: 'Track flaky counts over time - a rising number means CI is hiding instability.', guide: 'test-retries' },
      { title: 'Upload HTML report', sub: 'Artifacts survive the VM', focus: 'art', highlight: ['vm', 'pwt'],
        bubble: 'upload-artifact',
        text: 'The VM is destroyed after the job, so a final step uploads playwright-report/ (and test-results/ with traces) as an artifact, using if: !cancelled() so it runs even when tests fail. Download the zip, run npx playwright show-report, and click a failed test to open its trace.',
        facts: [['Step', 'actions/upload-artifact'], ['Condition', 'if: ${{ !cancelled() }}'], ['Retention', '30 days (typical)']],
        code: {
          ts: `// .github/workflows/playwright.yml (relevant steps)
//   - run: npx playwright test
//   - uses: actions/upload-artifact@v4
//     if: \${{ !cancelled() }}
//     with: { name: playwright-report, path: playwright-report/, retention-days: 30 }
import { defineConfig } from '@playwright/test';

export default defineConfig({
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
});`,
          java: null,
          javaNote: 'Java has no built-in HTML report. Publish Surefire/JUnit reports, and upload trace.zip files you wrote with context.tracing().stop(...) as artifacts.'
        },
        guide: 'test-reporters' },
      { title: 'Sharded matrix', sub: 'Split across parallel jobs', focus: 'gh', highlight: ['vm', 'art'],
        bubble: 'matrix shard 1..4',
        text: 'A matrix strategy starts four jobs, each running npx playwright test --shard=N/4 --reporter=blob. A final merge-reports job downloads the four blob artifacts and builds a single HTML report. Total wall-clock time falls from about 20 minutes to about 6 for an evenly balanced suite.',
        facts: [['Matrix', 'shardIndex: [1,2,3,4], shardTotal: [4]'], ['Per job', '--shard=${shardIndex}/${shardTotal}'], ['Merge', 'npx playwright merge-reports']],
        guide: 'test-sharding' }
    ],
    messages: [
      m(0, 'dev', 'gh', 'HTTP', 'git push origin main  (HTTPS/SSH)', 'git push', '~4 KB',
        'New commits reach the remote and fire a push event.',
        [['Git pack', 4000, 'objects'], ['Ref update', 80, 'main']],
        [['ref', 'refs/heads/main', 'branch updated'], ['event', 'push', 'matches workflow on:'], ['sha', '3f9c1e2', 'commit to test']],
        'To github.com:acme/shop-tests.git\n   a1b2c3d..3f9c1e2  main -> main', 'git output'),
      m(0, 'gh', 'vm', 'HTTP', 'job queued -> runner picks up "test" job (ubuntu-latest)', 'dispatch', '~2 KB',
        'GitHub assigns the job to a fresh hosted runner.',
        [['Job payload', 1800, 'steps, env, secrets'], ['Token', 200, 'GITHUB_TOKEN']],
        [['runs-on', 'ubuntu-latest', 'clean VM'], ['env', 'CI=true', 'read by playwright.config.ts'], ['timeout-minutes', '60', 'job limit']],
        'jobs:\n  test:\n    timeout-minutes: 60\n    runs-on: ubuntu-latest', 'workflow YAML'),
      m(1, 'vm', 'vm', 'CLI', 'actions/checkout; npm ci; npx playwright install --with-deps', 'install', '~400 MB',
        'Dependencies and browsers (plus OS libraries) are installed on the VM.',
        [['npm ci', 100000, 'node_modules'], ['browsers', 300000, 'chromium, firefox, webkit']],
        [['--with-deps', 'apt-get install libnss3 ...', 'system libraries'], ['browsers', '~/.cache/ms-playwright', 'cacheable path'], ['time', '30-90 s', 'without cache']],
        'Installing dependencies...\nSwitching to root user to install dependencies...\nDownloading Chromium 126.0.6478.26 (playwright build v1140)\nDownloading Firefox 127.0 (playwright build v1456)', 'Install log'),
      m(2, 'vm', 'pwt', 'CLI', 'CI=true npx playwright test', 'run tests', '-',
        'The test command starts with CI behaviour active.',
        [['Command', 25, 'npx playwright test'], ['Env', 10, 'CI=true']],
        [['CI', 'true', 'selects retries 2, workers 1'], ['forbidOnly', 'true', 'fails on test.only'], ['reporter', 'html + list', 'console and report']],
        'CI=true npx playwright test', 'Shell step'),
      m(2, 'pwt', 'pwt', 'IPC', 'worker 0 runs 42 tests sequentially (workers: 1)', 'run', '-',
        'With a single worker tests run one after another for stability on a small VM.',
        [['Runner', 1, 'one process'], ['Worker', 1, 'one browser']],
        [['workers', '1', 'predictable timing'], ['tests', '42', 'in file order'], ['browser', 'headless chromium', 'one process']],
        'Running 42 tests using 1 worker\n  1 [chromium] > login.spec.ts:5:1 > signs in', 'List reporter'),
      m(3, 'pwt', 'pwt', 'IPC', 'cart.spec.ts:14 failed (retry 0), passed (retry 1)  -> 1 flaky', 'flaky', '-',
        'A retry turns a transient failure into a "flaky" result.',
        [['Attempt 1', 40, 'failed'], ['Attempt 2', 40, 'passed']],
        [['attempt 1', 'failed', 'trace recorded on retry'], ['attempt 2', 'passed', 'test marked flaky'], ['summary', '41 passed, 1 flaky', 'exit code 0']],
        '  1 flaky\n    [chromium] > cart.spec.ts:14:1 > updates total\n  41 passed (2.4m)', 'Run summary'),
      m(4, 'pwt', 'art', 'FS', 'write playwright-report/index.html + test-results/**/trace.zip', 'report', '~6 MB',
        'The reporter writes the HTML report and traces.',
        [['index.html', 800000, 'report shell'], ['data/', 5000000, 'attachments, traces']],
        [['report', 'playwright-report/index.html', 'open with show-report'], ['traces', 'test-results/**/trace.zip', 'only for retries'], ['open', "'never'", 'do not block CI by serving it']],
        'playwright-report/\n  index.html\n  data/ab12.zip\ntest-results/\n  cart-updates-total-chromium-retry1/trace.zip', 'Files written'),
      m(4, 'vm', 'art', 'HTTP', 'actions/upload-artifact@v4 name=playwright-report if: !cancelled()', 'upload', '~6 MB',
        'The artifact is uploaded before the VM is destroyed, even when tests failed.',
        [['Zip', 6000000, 'report dir'], ['Metadata', 200, 'name, retention']],
        [['name', 'playwright-report', 'download from the run page'], ['retention-days', '30', 'auto-expires'], ['if', '!cancelled()', 'also runs after failures']],
        '- uses: actions/upload-artifact@v4\n  if: ${{ !cancelled() }}\n  with:\n    name: playwright-report\n    path: playwright-report/\n    retention-days: 30', 'workflow step'),
      m(5, 'gh', 'vm', 'HTTP', 'matrix: shardIndex [1,2,3,4] -> 4 jobs run --shard=N/4 --reporter=blob', 'matrix', '~8 KB',
        'GitHub fans out one job per shard.',
        [['Job 1', 2000, 'shard 1/4'], ['Job 2-4', 6000, 'shards 2..4']],
        [['strategy.fail-fast', 'false', 'let all shards finish'], ['matrix.shardIndex', '1,2,3,4', 'one job each'], ['command', 'npx playwright test --shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}', 'per job']],
        'strategy:\n  fail-fast: false\n  matrix:\n    shardIndex: [1, 2, 3, 4]\n    shardTotal: [4]', 'workflow YAML'),
      m(5, 'vm', 'art', 'HTTP', 'upload blob-report-N; merge job: npx playwright merge-reports --reporter html', 'merge', '~12 MB',
        'A final job merges the four partial reports.',
        [['blob zips', 12000000, '4 shards'], ['merge', 100, 'html output']],
        [['download', 'pattern: blob-report-*', 'all shards'], ['merge', 'merge-reports --reporter html', 'one HTML report'], ['upload', 'html-report--attempt-1', 'final artifact']],
        'npx playwright merge-reports --reporter html ./all-blob-reports', 'Merge command')
    ]
  });
})();
