window.SCENARIOS = window.SCENARIOS || [];
(function () {
  // helper: builds one message object (data only)
  function M(step, from, to, proto, info, short, size, t, summary, parts, fields, raw, rawLabel, footer) {
    var d = { summary: summary, parts: parts, fields: fields, raw: raw };
    if (rawLabel) d.rawLabel = rawLabel;
    if (footer) d.footer = footer;
    var o = { step: step, from: from, to: to, proto: proto, info: info, detail: d };
    if (short) o.short = short;
    if (size) o.size = size;
    if (t != null) o.t = t;
    return o;
  }

  /* ------------------------------------------------------------------ 1 */
  window.SCENARIOS.push({
    id: 'mobile-emulation',
    platform: 'mobile',
    level: 1,
    title: 'Mobile web emulation',
    subtitle: 'devices[\'Pixel 7\'] on a desktop browser',
    tags: ['mobile', 'emulation', 'devices', 'viewport', 'touch', 'tap', 'userAgent', 'deviceScaleFactor'],
    overview: {
      text: 'Playwright can make a desktop Chromium, Firefox or WebKit behave like a phone by applying a device descriptor to a BrowserContext. The descriptor bundles viewport, deviceScaleFactor, userAgent, isMobile and hasTouch. For Chromium this becomes a handful of CDP Emulation.* calls, so responsive CSS, touch handlers and mobile user-agent branches run exactly as they would on the phone. It is fast and cheap, but it is still a desktop engine, not a real device.',
      facts: [['Protocol', 'CDP Emulation.* (Chromium)'], ['Runs in', 'Desktop browser, any CI box'], ['Scope', 'Per BrowserContext'], ['Typical cost', '+5-15 ms per context'], ['Java', 'Same options, no devices registry']],
      caveat: 'Emulation is not a real phone: no real GPU/raster, no mobile browser engine quirks, no OS keyboard or system UI. Use real devices (scenario "Real Android via ADB") for those.',
      guide: 'emulation'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'store.spec.ts / StoreTest.java', icon: 'terminal', x: 130, y: 300, layer: 1 },
      { id: 'devices', label: 'Device registry', sub: 'deviceDescriptorsSource.json', icon: 'doc', x: 380, y: 160, layer: 2 },
      { id: 'pw', label: 'Playwright driver', sub: 'Node.js server process', icon: 'gear', x: 380, y: 410, layer: 3 },
      { id: 'browser', label: 'Chromium', sub: 'desktop build, new context', icon: 'browser', x: 640, y: 300, layer: 4 },
      { id: 'page', label: 'Mobile site', sub: 'm.shop.example', icon: 'phone', x: 870, y: 300, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'devices', label: 'lookup' },
      { a: 'test', b: 'pw', label: 'newContext(opts)' },
      { a: 'pw', b: 'browser', label: 'CDP WebSocket/pipe' },
      { a: 'browser', b: 'page', label: 'HTTP + DOM' }
    ],
    steps: [
      {
        title: 'Pick a descriptor', sub: 'Named device = bundle of options',
        text: 'Playwright ships a registry of device descriptors. devices["Pixel 7"] is just a plain object: viewport 412x839, deviceScaleFactor 2.625, a Chrome-on-Android user agent, isMobile true, hasTouch true. Nothing is sent to a browser yet; you are only choosing the options.',
        focus: 'test', highlight: ['devices'], bubble: "devices['Pixel 7']",
        facts: [['Pixel 7', '412x839 @2.625x'], ['iPhone 15', '393x659 @3x, WebKit'], ['Source', 'Node: playwright.devices']],
        code: {
          ts: `import { test, devices } from '@playwright/test';

const pixel = devices['Pixel 7'];
console.log(pixel.viewport);          // { width: 412, height: 839 }
console.log(pixel.deviceScaleFactor); // 2.625
console.log(pixel.isMobile, pixel.hasTouch); // true true
console.log(devices['iPhone 15'].defaultBrowserType); // 'webkit'`,
          java: `// Playwright for Java has no devices[...] registry.
// Copy the values you need into Browser.NewContextOptions:
Browser.NewContextOptions pixel7 = new Browser.NewContextOptions()
    .setViewportSize(412, 839)
    .setDeviceScaleFactor(2.625)
    .setIsMobile(true)
    .setHasTouch(true)
    .setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 "
        + "(KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");`
        },
        note: 'The userAgent string embeds a Chrome version that matches the Playwright release; copying it into Java by hand means it can go stale.',
        guide: 'emulation'
      },
      {
        title: 'Create the context', sub: 'Options travel to the driver',
        text: 'The test calls browser.newContext(...) with the descriptor spread in. The Playwright driver creates an isolated browser context (own cookies, storage, cache) and remembers the emulation options so every future page in it inherits them.',
        focus: 'pw', highlight: ['test', 'browser'],
        facts: [['Isolation', 'Cookies/storage per context'], ['Cost', '~ms, no new process'], ['Applies to', 'All pages of context']],
        code: {
          ts: `import { chromium, devices } from 'playwright';

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices['Pixel 7'],
});
const page = await context.newPage();
await page.goto('https://m.shop.example/');`,
          java: `import com.microsoft.playwright.*;

try (Playwright playwright = Playwright.create()) {
  Browser browser = playwright.chromium().launch();
  BrowserContext context = browser.newContext(new Browser.NewContextOptions()
      .setViewportSize(412, 839).setDeviceScaleFactor(2.625)
      .setIsMobile(true).setHasTouch(true));
  Page page = context.newPage();
  page.navigate("https://m.shop.example/");
}`
        },
        guide: 'browser-contexts'
      },
      {
        title: 'Apply CDP emulation', sub: 'Three Emulation.* calls per page',
        text: 'For each new page Playwright attaches to the target and sends Emulation.setDeviceMetricsOverride (width, height, deviceScaleFactor, mobile), Emulation.setUserAgentOverride and Emulation.setTouchEmulationEnabled. Setting mobile:true makes Chromium honour the viewport meta tag and use the mobile layout viewport, which is why a desktop-width window still renders the phone layout.',
        focus: 'browser', highlight: ['pw'],
        facts: [['CDP domain', 'Emulation'], ['mobile:true', 'meta viewport + overlay scrollbars'], ['Touch points', 'maxTouchPoints = 1']],
        note: 'Firefox has no isMobile support in Playwright; WebKit emulates iPhone via its own driver patch. The option set is the same, the plumbing differs.'
      },
      {
        title: 'Load the mobile site', sub: 'Server sees a phone',
        text: 'page.goto() now sends the mobile User-Agent (and matching Sec-CH-UA-Mobile: ?1 client hint). The server may redirect to m.shop.example or return the responsive layout. CSS media queries evaluate against 412 CSS px, and window.devicePixelRatio is 2.625, so srcset picks 2x or 3x images.',
        focus: 'page', highlight: ['browser'], bubble: 'matchMedia(max-width:600px) = true',
        facts: [['window.innerWidth', '412'], ['devicePixelRatio', '2.625'], ['navigator.maxTouchPoints', '1']],
        code: {
          ts: `import { test, expect, devices } from '@playwright/test';

test.use({ ...devices['Pixel 7'] });

test('burger menu shows on phone', async ({ page }) => {
  await page.goto('https://m.shop.example/');
  await expect(page.getByRole('button', { name: 'Menu' })).toBeVisible();
  expect(await page.evaluate(() => window.devicePixelRatio)).toBe(2.625);
});`,
          java: `import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

page.navigate("https://m.shop.example/");
assertThat(page.getByRole(AriaRole.BUTTON,
    new Page.GetByRoleOptions().setName("Menu"))).isVisible();
Object dpr = page.evaluate("window.devicePixelRatio");
System.out.println(dpr); // 2.625`
        },
        guide: 'emulation'
      },
      {
        title: 'tap() vs click()', sub: 'Touch events instead of mouse',
        text: 'With hasTouch enabled, locator.tap() dispatches touchStart and touchEnd through Input.dispatchTouchEvent, so listeners for touch and pointer events fire. click() still works (it sends mouse events, which mobile pages also handle) but will not trigger touch-only code paths such as swipe carousels.',
        focus: 'pw', highlight: ['browser', 'test'],
        facts: [['tap()', 'Input.dispatchTouchEvent'], ['click()', 'Input.dispatchMouseEvent'], ['Requires', 'hasTouch: true']],
        code: {
          ts: `// context created with hasTouch: true
await page.getByRole('button', { name: 'Menu' }).tap();
await page.getByRole('link', { name: 'Stores' }).tap();
await expect(page).toHaveURL(/\\/stores/);`,
          java: `// context created with setHasTouch(true)
page.getByRole(AriaRole.BUTTON,
    new Page.GetByRoleOptions().setName("Menu")).tap();
page.getByRole(AriaRole.LINK,
    new Page.GetByRoleOptions().setName("Stores")).tap();
assertThat(page).hasURL(java.util.regex.Pattern.compile(".*/stores"));`
        },
        note: 'Calling tap() on a context without hasTouch throws an error; the fix is the descriptor, not a retry.',
        guide: 'input'
      },
      {
        title: 'What it cannot cover', sub: 'Desktop engine in a phone costume',
        text: 'Emulation changes what the page can observe, not what produces the pixels. Rendering still uses your desktop GPU and font stack, the JS engine is the desktop build, and the OS soft keyboard, address-bar collapse, pinch zoom and native permission dialogs do not exist. Treat emulation as a fast first line for layout and logic, and add a few real-device runs for the rest.',
        focus: 'browser', highlight: ['page'],
        facts: [['Not covered', 'Real GPU, OS keyboard'], ['Not covered', 'Mobile Safari quirks'], ['Good for', 'Layout, breakpoints, UA logic']],
        note: 'A green emulated run does not prove the site works in Mobile Safari: use the webkit project only as an approximation.'
      }
    ],
    messages: [
      M(0, 'test', 'devices', 'FS', "devices['Pixel 7'] -> plain descriptor object", 'lookup', '310 B', 0,
        'The test reads a static descriptor; no browser is contacted.',
        [{ name: 'Key', size: 20, note: 'device name' }, { name: 'Descriptor JSON', size: 290, note: 'viewport, UA, flags' }],
        [['viewport', '{ width: 412, height: 839 }', 'CSS pixels of the visible area'], ['deviceScaleFactor', '2.625', 'device pixels per CSS pixel'], ['isMobile / hasTouch', 'true / true', 'mobile layout viewport and touch events'], ['defaultBrowserType', 'chromium', 'iPhone entries say webkit']],
        '"Pixel 7": {\n  "userAgent": "Mozilla/5.0 (Linux; Android 14; Pixel 7) ... Mobile Safari/537.36",\n  "viewport": { "width": 412, "height": 839 },\n  "deviceScaleFactor": 2.625,\n  "isMobile": true, "hasTouch": true,\n  "defaultBrowserType": "chromium"\n}', 'Descriptor (illustrative)', 'Values vary slightly per Playwright release.'),
      M(1, 'test', 'pw', 'IPC', 'browser.newContext({ ...devices["Pixel 7"] })', 'newContext', '420 B', 8,
        'The client library serialises the options and asks the driver for a new context.',
        [{ name: 'Channel frame', size: 24, note: 'guid + method' }, { name: 'Params', size: 396, note: 'context options' }],
        [['method', 'newContext', 'Browser channel method'], ['viewport', '412x839', 'stored on the context'], ['isMobile', 'true', 'drives mobile viewport mode'], ['hasTouch', 'true', 'enables touch emulation']],
        '{"guid":"browser@3c1","method":"newContext","params":{"viewport":{"width":412,"height":839},"deviceScaleFactor":2.625,"isMobile":true,"hasTouch":true,"userAgent":"Mozilla/5.0 (Linux; Android 14; Pixel 7) ..."}}', 'Playwright channel message'),
      M(1, 'pw', 'browser', 'CDP', 'Target.createBrowserContext({disposeOnDetach:true})', 'new context', '96 B', 14,
        'The driver creates an isolated incognito-like context in the browser.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 90, note: 'method + params' }],
        [['method', 'Target.createBrowserContext', 'isolated storage and cache'], ['disposeOnDetach', 'true', 'cleaned up if the driver disconnects'], ['result', 'browserContextId', 'used for all later targets']],
        '{"id":4,"method":"Target.createBrowserContext","params":{"disposeOnDetach":true}}', 'CDP message (JSON)'),
      M(2, 'pw', 'browser', 'CDP', 'Emulation.setDeviceMetricsOverride({width:412,height:839,...})', 'metrics', '168 B', 31,
        'Forces viewport size, pixel ratio and mobile mode for the page.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 162, note: 'metrics' }],
        [['width, height', '412, 839', 'viewport in CSS pixels'], ['deviceScaleFactor', '2.625', 'devicePixelRatio seen by the page'], ['mobile', 'true', 'use mobile layout viewport / meta viewport'], ['screenOrientation', 'portraitPrimary', 'matches viewport aspect']],
        '{"id":21,"method":"Emulation.setDeviceMetricsOverride","params":{"width":412,"height":839,"deviceScaleFactor":2.625,"mobile":true,"screenOrientation":{"angle":0,"type":"portraitPrimary"}}}'),
      M(2, 'pw', 'browser', 'CDP', 'Emulation.setUserAgentOverride({userAgent:"...Pixel 7...Mobile"})', 'user agent', '210 B', 33,
        'Replaces navigator.userAgent and the User-Agent request header.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 204, note: 'UA string' }],
        [['userAgent', 'Mozilla/5.0 (Linux; Android 14; Pixel 7) ...', 'sent on every request'], ['acceptLanguage', 'en-US', 'from context locale'], ['userAgentMetadata', 'mobile:true', 'drives Sec-CH-UA-Mobile']],
        '{"id":22,"method":"Emulation.setUserAgentOverride","params":{"userAgent":"Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36","acceptLanguage":"en-US"}}'),
      M(2, 'pw', 'browser', 'CDP', 'Emulation.setTouchEmulationEnabled({enabled:true,maxTouchPoints:1})', 'touch on', '92 B', 35,
        'Turns on touch event support so navigator.maxTouchPoints is 1 and tap works.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 86, note: 'enable flag' }],
        [['enabled', 'true', 'ontouchstart exists, pointer type touch'], ['maxTouchPoints', '1', 'reported to scripts'], ['configuration', 'mobile', 'also affects scrollbar overlay']],
        '{"id":23,"method":"Emulation.setTouchEmulationEnabled","params":{"enabled":true,"maxTouchPoints":1}}'),
      M(3, 'browser', 'page', 'HTTP', 'GET /  (UA: ...Pixel 7... Mobile Safari, Sec-CH-UA-Mobile: ?1)', 'mobile GET', '540 B', 80,
        'The site receives mobile identifiers and may serve a mobile layout.',
        [{ name: 'Request line + headers', size: 480, note: 'UA, client hints' }, { name: 'Body', size: 0, note: 'none for GET' }],
        [['User-Agent', 'Mozilla/5.0 (Linux; Android 14; Pixel 7) ...', 'overridden value'], ['Sec-CH-UA-Mobile', '?1', 'client hint says mobile'], ['Accept-Language', 'en-US', 'from locale option']],
        'GET / HTTP/1.1\nHost: m.shop.example\nUser-Agent: Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36\nSec-CH-UA-Mobile: ?1\nAccept-Language: en-US', 'HTTP request'),
      M(3, 'page', 'browser', 'UI', 'Layout at 412 CSS px: burger menu visible, DPR 2.625', 'mobile layout', null, 140,
        'The responsive CSS applies the phone breakpoint.',
        [{ name: 'Layout viewport', size: 412, note: 'CSS px' }, { name: 'Raster', size: 1082, note: 'device px (412 x 2.625)' }],
        [['matchMedia("(max-width:600px)")', 'true', 'phone breakpoint active'], ['innerWidth', '412', 'matches viewport'], ['devicePixelRatio', '2.625', 'srcset picks 3x asset']],
        'window.innerWidth = 412\nwindow.devicePixelRatio = 2.625\nnavigator.maxTouchPoints = 1\n.burger { display: block }', 'Observed in page'),
      M(4, 'pw', 'browser', 'CDP', 'Input.dispatchTouchEvent({type:"touchStart",touchPoints:[{x:48,y:34}]})', 'touchStart', '150 B', 190,
        'tap() sends a touch press at the centre of the button.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 144, note: 'touch point' }],
        [['type', 'touchStart', 'followed by touchEnd'], ['touchPoints', '[{x:48,y:34}]', 'centre of the Menu button box'], ['modifiers', '0', 'no keys held']],
        '{"id":41,"method":"Input.dispatchTouchEvent","params":{"type":"touchStart","touchPoints":[{"x":48,"y":34}],"modifiers":0}}'),
      M(4, 'pw', 'browser', 'CDP', 'Input.dispatchTouchEvent({type:"touchEnd",touchPoints:[]})', 'touchEnd', '110 B', 196,
        'Releasing the touch makes the browser synthesise the click.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 104, note: 'empty points' }],
        [['type', 'touchEnd', 'finishes the gesture'], ['touchPoints', '[]', 'finger lifted'], ['result', 'click + pointerup', 'menu opens']],
        '{"id":42,"method":"Input.dispatchTouchEvent","params":{"type":"touchEnd","touchPoints":[]}}'),
      M(5, 'browser', 'browser', 'UI', 'Reality check: desktop GPU, desktop fonts, no OS keyboard', 'limits', null, 260,
        'Everything below the emulation layer is still the host machine.',
        [{ name: 'Emulated', size: 40, note: 'viewport, UA, touch, DPR' }, { name: 'Not emulated', size: 60, note: 'GPU, keyboard, OS UI' }],
        [['Rendering', 'Host GPU/Skia', 'subpixel and font differences remain'], ['Soft keyboard', 'absent', 'viewport does not shrink on focus'], ['Engine', 'Desktop Chromium', 'not Chrome for Android build']],
        'emulated: viewport, deviceScaleFactor, userAgent, isMobile, hasTouch\nnot emulated: real GPU, Mobile Safari engine, OS keyboard, system dialogs', 'Summary', 'Conceptual, not a wire message.')
    ]
  });

  /* ------------------------------------------------------------------ 2 */
  window.SCENARIOS.push({
    id: 'mobile-android-device',
    platform: 'mobile',
    level: 3,
    title: 'Real Android via ADB',
    subtitle: 'Experimental _android API (Node.js only)',
    tags: ['android', 'adb', '_android', 'chrome', 'real-device', 'experimental', 'devtools'],
    overview: {
      text: 'Playwright has an experimental Android API that talks to a real device or emulator through the Android Debug Bridge. It can run shell commands, take device screenshots, launch Chrome on the phone and hand you a normal BrowserContext connected to it. The Page API you already know then drives real Chrome for Android. It is only exposed in the Node.js library and its status is experimental, so treat it as a power tool rather than a stable platform.',
      facts: [['Protocol', 'ADB (TCP 5037) + CDP'], ['Runs in', 'Node.js only (_android)'], ['Status', 'Experimental'], ['Needs', 'USB debugging, adb server'], ['Browser', 'Chrome for Android'], ['Java', 'Not available']],
      caveat: 'Experimental and JavaScript/TypeScript only. There is no _android in Java, Python or .NET. Native app UI is out of scope: use Appium for that.',
      guide: 'f-mobile-appium-grid'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'android.spec.ts (Node.js)', icon: 'terminal', x: 120, y: 200, layer: 1 },
      { id: 'pw', label: 'Playwright _android', sub: 'driver + ADB client', icon: 'gear', x: 360, y: 340, layer: 2 },
      { id: 'adb', label: 'ADB server', sub: 'localhost:5037', icon: 'usb', x: 360, y: 150, layer: 3 },
      { id: 'adbd', label: 'adbd on device', sub: 'USB / Wi-Fi debugging', icon: 'android', x: 620, y: 150, layer: 3 },
      { id: 'chrome', label: 'Chrome for Android', sub: 'chrome_devtools_remote', icon: 'browser', x: 620, y: 400, layer: 4 },
      { id: 'page', label: 'Page on phone', sub: 'real GPU + real engine', icon: 'phone', x: 870, y: 280, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process' },
      { a: 'pw', b: 'adb', label: 'ADB host protocol' },
      { a: 'adb', b: 'adbd', label: 'USB / TCP' },
      { a: 'adbd', b: 'chrome', label: 'unix socket' },
      { a: 'pw', b: 'chrome', label: 'CDP via ADB tunnel' },
      { a: 'chrome', b: 'page', label: 'render' }
    ],
    steps: [
      {
        title: 'Prepare the phone', sub: 'USB debugging + adb server',
        text: 'Enable Developer options and USB debugging on the phone, plug it in and accept the RSA fingerprint prompt. Playwright does not bundle adb; it connects to an adb server that is already listening on TCP 5037, which you start with adb start-server or by running any adb command.',
        focus: 'adb', highlight: ['adbd'], bubble: 'adb devices',
        facts: [['Server port', '5037'], ['Auth', 'RSA key accepted on phone'], ['Chrome', 'Must be installed and set up']],
        note: 'If the phone shows "unauthorized" in adb devices, Playwright will not see it either; re-plug and accept the prompt.'
      },
      {
        title: 'Discover devices', sub: 'android.devices()',
        text: 'android.devices() opens a socket to the adb server, sends host:devices and returns an AndroidDevice per attached serial. You can filter by serial or model, and read device.model() and device.serial() to pick the right phone in a lab.',
        focus: 'pw', highlight: ['adb', 'test'],
        facts: [['ADB command', 'host:devices'], ['Returns', 'AndroidDevice[]'], ['Import', "_android from 'playwright'"]],
        code: {
          ts: `import { _android as android } from 'playwright';

const [device] = await android.devices();
console.log(device.model(), device.serial()); // Pixel 7  28011FDH2001AB
console.log(await device.shell('getprop ro.build.version.release'));
await device.close();`,
          java: null,
          javaNote: 'The _android API is experimental and exists only in the Node.js library. In Java use the Appium Java client, or run adb yourself and attach with BrowserType.connectOverCDP (see "Remote browser / device farm").'
        },
        guide: 'f-mobile-appium-grid'
      },
      {
        title: 'Run device commands', sub: 'shell() and screenshot()',
        text: 'device.shell() runs a command via the adb shell service and returns stdout as a Buffer. device.screenshot() captures the entire device screen, including the status bar and any native dialogs, by reading framebuffer PNG data through adb. This is the only place you can see system UI, since the Page API only sees web content.',
        focus: 'pw', highlight: ['adbd'],
        facts: [['Shell service', 'shell:<cmd>'], ['Screenshot', 'whole device, PNG'], ['Page.screenshot', 'web content only']],
        code: {
          ts: `const model = await device.shell('getprop ro.product.model');
console.log(model.toString().trim());
await device.shell('am force-stop com.android.chrome');
await device.screenshot({ path: 'home-screen.png' });`,
          java: null,
          javaNote: 'No Java equivalent. With plain adb: run "adb shell ..." and "adb exec-out screencap -p > shot.png" via ProcessBuilder, or use Appium driver.getScreenshotAs.'
        },
        note: 'device.shell() can run anything the shell user can; keep test devices dedicated and never point this at personal phones.'
      },
      {
        title: 'Launch Chrome', sub: 'launchBrowser() opens a context',
        text: 'device.launchBrowser() starts Chrome on the phone with remote debugging enabled, then opens the chrome_devtools_remote unix socket via an ADB tunnel (localabstract) and speaks CDP over it. You receive a BrowserContext whose pages are tabs on the real phone.',
        focus: 'chrome', highlight: ['pw', 'adbd'], bubble: 'launchBrowser()',
        facts: [['Package', 'com.android.chrome'], ['Socket', 'localabstract:chrome_devtools_remote'], ['Returns', 'BrowserContext']],
        code: {
          ts: `const context = await device.launchBrowser({
  pkg: 'com.android.chrome',
});
console.log(context.pages().length); // existing tabs`,
          java: null,
          javaNote: 'Not available in Java. Start Chrome with remote debugging yourself, run "adb forward tcp:9222 localabstract:chrome_devtools_remote", then Java can call chromium().connectOverCDP("http://localhost:9222").'
        }
      },
      {
        title: 'Use the normal Page API', sub: 'goto, tap, screenshot on real Chrome',
        text: 'From here everything is ordinary Playwright: context.newPage(), page.goto(), locator.tap(), expect assertions. Rendering is done by the phone GPU and the real Chrome for Android, so you catch problems emulation cannot, like jank, font rendering and viewport changes when the keyboard opens.',
        focus: 'page', highlight: ['chrome', 'test'],
        facts: [['Same API', 'Page / Locator / expect'], ['Engine', 'Real Chrome for Android'], ['Limit', 'Chromium features only']],
        code: {
          ts: `const page = await context.newPage();
await page.goto('https://m.shop.example/');
await page.getByRole('button', { name: 'Menu' }).tap();
await page.screenshot({ path: 'menu-real-device.png' });
await context.close();
await device.close();`,
          java: null,
          javaNote: 'Same Page API in Java works only after connectOverCDP to the device Chrome; the _android launch helpers themselves are Node.js only.'
        },
        note: 'Only web content in Chrome is automatable. Taps on native UI (permission sheets, share dialogs) need adb input or Appium.'
      }
    ],
    messages: [
      M(0, 'test', 'adb', 'CLI', 'adb start-server   (listens on tcp:5037)', 'start-server', null, 0,
        'You make sure the adb server daemon is running before Playwright connects.',
        [{ name: 'Command', size: 20, note: 'adb start-server' }, { name: 'Daemon output', size: 60, note: 'port 5037' }],
        [['binary', 'adb (platform-tools)', 'not bundled with Playwright'], ['port', '5037', 'default ADB server port'], ['ANDROID_ADB_SERVER_PORT', 'optional', 'override the port']],
        '$ adb start-server\n* daemon not running; starting now at tcp:5037\n* daemon started successfully\n$ adb devices\nList of devices attached\n28011FDH2001AB\tdevice', 'Terminal'),
      M(0, 'adb', 'adbd', 'ADB', 'USB handshake: CNXN, AUTH (RSA fingerprint accepted)', 'auth', '24 B', 20,
        'The server authenticates to the phone daemon over USB or Wi-Fi.',
        [{ name: 'ADB packet header', size: 24, note: 'command, arg0, arg1, length' }, { name: 'Payload', size: 256, note: 'RSA signature' }],
        [['command', 'AUTH', 'follows CNXN from the device'], ['key', 'adbkey.pub', 'in ~/.android'], ['state', 'device', 'shown by adb devices']],
        'CNXN version=0x01000001 maxdata=1048576 "device::ro.product.name=panther;..."\nAUTH type=SIGNATURE ...\nCNXN (accepted)', 'ADB handshake (simplified)'),
      M(1, 'pw', 'adb', 'ADB', 'host:devices-l  -> "28011FDH2001AB device model:Pixel_7"', 'host:devices', '70 B', 60,
        'Playwright lists attached devices using the host protocol on port 5037.',
        [{ name: 'Length prefix', size: 4, note: 'hex length "000e"' }, { name: 'Service string', size: 66, note: 'host:devices-l' }],
        [['service', 'host:devices-l', 'long listing with model'], ['reply', 'OKAY + data', 'or FAIL + reason'], ['serial', '28011FDH2001AB', 'becomes device.serial()']],
        '0012host:devices-l\n--> OKAY\n--> 0039 28011FDH2001AB device usb:1-1 product:panther model:Pixel_7 device:panther', 'ADB host protocol'),
      M(2, 'pw', 'adb', 'ADB', 'host:transport:28011FDH2001AB then shell:getprop ro.product.model', 'shell', '90 B', 120,
        'A shell command is sent to the device through the transport.',
        [{ name: 'host:transport', size: 30, note: 'select device' }, { name: 'shell: service', size: 60, note: 'command string' }],
        [['host:transport', '<serial>', 'routes the connection to the phone'], ['service', 'shell:getprop ro.product.model', 'run on device shell'], ['output', 'Pixel 7', 'returned as Buffer']],
        '001chost:transport:28011FDH2001AB\nOKAY\n0021shell:getprop ro.product.model\nOKAY\nPixel 7\\n', 'ADB host protocol'),
      M(2, 'adbd', 'pw', 'ADB', 'screenshot: shell:screencap -p  -> PNG 1.1 MB', 'screencap', '1.1 MB', 190,
        'The device returns raw PNG bytes for the whole screen.',
        [{ name: 'ADB stream header', size: 24, note: 'WRTE packets' }, { name: 'PNG data', size: 1100000, note: '1080x2400' }],
        [['service', 'shell:screencap -p', 'framebuffer to PNG'], ['size', '1080x2400', 'physical pixels'], ['includes', 'status bar and dialogs', 'unlike page.screenshot']],
        'shell:screencap -p\nOKAY\n\\x89PNG\\r\\n\\x1a\\n ... (1.1 MB)', 'ADB stream'),
      M(3, 'pw', 'adbd', 'ADB', 'shell:am start -n com.android.chrome/...  --remote-debugging', 'start Chrome', '180 B', 260,
        'Chrome is started with its DevTools unix socket enabled.',
        [{ name: 'Service', size: 30, note: 'shell:' }, { name: 'am start args', size: 150, note: 'activity + flags' }],
        [['package', 'com.android.chrome', 'the browser to launch'], ['flag file', '/data/local/tmp/chrome-command-line', 'adds --remote-debugging-pipe style flags'], ['socket', 'chrome_devtools_remote', 'abstract unix socket']],
        'shell:am start -a android.intent.action.VIEW -n com.android.chrome/com.google.android.apps.chrome.Main -d about:blank', 'adb shell command'),
      M(3, 'pw', 'chrome', 'CDP', 'localabstract:chrome_devtools_remote -> Target.setAutoAttach', 'attach', '140 B', 330,
        'Playwright opens the ADB tunnel to the DevTools socket and attaches to tabs.',
        [{ name: 'ADB stream', size: 24, note: 'localabstract:' }, { name: 'CDP JSON', size: 120, note: 'auto attach' }],
        [['transport', 'localabstract:chrome_devtools_remote', 'ADB-tunnelled unix socket'], ['method', 'Target.setAutoAttach', 'discover tabs'], ['flatten', 'true', 'single connection for all sessions']],
        '{"id":1,"method":"Target.setAutoAttach","params":{"autoAttach":true,"waitForDebuggerOnStart":true,"flatten":true}}', 'CDP message (JSON)'),
      M(4, 'pw', 'chrome', 'CDP', 'Page.navigate({url:"https://m.shop.example/"})', 'goto', '96 B', 420,
        'Normal navigation, but on the real phone.',
        [{ name: 'CDP JSON', size: 96, note: 'navigate' }, { name: 'Tunnel framing', size: 24, note: 'ADB WRTE' }],
        [['method', 'Page.navigate', 'same as desktop'], ['url', 'https://m.shop.example/', 'loaded by phone network'], ['frameId', 'F1A2...', 'returned']],
        '{"id":12,"method":"Page.navigate","params":{"url":"https://m.shop.example/"}}'),
      M(4, 'pw', 'chrome', 'CDP', 'Input.dispatchTouchEvent({type:"touchStart",...})', 'tap', '150 B', 520,
        'tap() travels over ADB tunnel as CDP; latency is higher than local.',
        [{ name: 'CDP JSON', size: 144, note: 'touch' }, { name: 'Tunnel framing', size: 24, note: 'ADB WRTE' }],
        [['method', 'Input.dispatchTouchEvent', 'real touch pipeline in Chrome'], ['x, y', '206, 412', 'in CSS pixels'], ['latency', '30-120 ms', 'USB adds round-trip time']],
        '{"id":18,"method":"Input.dispatchTouchEvent","params":{"type":"touchStart","touchPoints":[{"x":206,"y":412}]}}'),
      M(4, 'page', 'pw', 'UI', 'Real Chrome renders on phone GPU; screenshot returned over CDP', 'real render', '280 KB', 640,
        'Rendering fidelity is that of the actual device.',
        [{ name: 'Page.captureScreenshot reply', size: 280000, note: 'base64 PNG' }, { name: 'CDP envelope', size: 80, note: 'id + result' }],
        [['renderer', 'Chrome for Android (Skia GPU)', 'real fonts and compositing'], ['viewport', '412x915', 'real visual viewport'], ['dpr', '2.625', 'real device value']],
        '{"id":19,"result":{"data":"iVBORw0KGgoAAA..."}}', 'CDP result (truncated)', 'Sizes are illustrative.')
    ]
  });

  /* ------------------------------------------------------------------ 3 */
  window.SCENARIOS.push({
    id: 'mobile-remote-cdp',
    platform: 'mobile',
    level: 3,
    title: 'Remote browser / device farm',
    subtitle: 'connectOverCDP and browserType.connect',
    tags: ['cdp', 'connectOverCDP', 'remote', 'device-farm', 'adb-forward', 'websocket', 'browserstack'],
    overview: {
      text: 'Instead of launching a browser itself, Playwright can attach to one that is already running elsewhere. chromium.connectOverCDP speaks raw Chrome DevTools Protocol to a ws:// or http:// endpoint such as a cloud device farm or a phone exposed with adb forward. browserType.connect speaks the Playwright protocol to a server started with run-server. Your test code stays local while the browser and page run remotely.',
      facts: [['Protocol', 'CDP over WebSocket'], ['Alternative', 'browserType.connect (Playwright WS)'], ['Typical port', '9222 (Chrome debug)'], ['Latency', 'Each action = 1+ round trips'], ['Java', 'connectOverCDP supported'], ['Fidelity', 'Lower than native launch']],
      caveat: 'connectOverCDP is lower fidelity than a launched browser: no Playwright-patched browser build, fewer features (for example some tracing/video options), and the remote Chrome version must be compatible with your Playwright release.',
      guide: 'selenium-grid'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'runs on your CI box', icon: 'terminal', x: 120, y: 290, layer: 1 },
      { id: 'pw', label: 'Playwright client', sub: 'connectOverCDP()', icon: 'gear', x: 360, y: 180, layer: 2 },
      { id: 'adbf', label: 'adb forward', sub: 'localhost:9222', icon: 'usb', x: 360, y: 400, layer: 3 },
      { id: 'farm', label: 'Remote endpoint', sub: 'wss://farm.example/cdp', icon: 'cloud', x: 620, y: 180, layer: 3 },
      { id: 'chrome', label: 'Remote Chrome', sub: 'on device / VM', icon: 'browser', x: 640, y: 400, layer: 4 },
      { id: 'page', label: 'Page under test', sub: 'runs remotely', icon: 'phone', x: 880, y: 290, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process' },
      { a: 'pw', b: 'farm', label: 'wss (internet)' },
      { a: 'pw', b: 'adbf', label: 'localhost' },
      { a: 'adbf', b: 'chrome', label: 'ADB tunnel' },
      { a: 'farm', b: 'chrome', label: 'farm internal' },
      { a: 'chrome', b: 'page', label: 'render' }
    ],
    steps: [
      {
        title: 'Expose a debug endpoint', sub: 'Chrome remote debugging',
        text: 'A remote Chrome publishes DevTools on a port: locally via --remote-debugging-port=9222, on Android via adb forward tcp:9222 localabstract:chrome_devtools_remote, or by a vendor which hands you a wss:// URL containing your session token. The first thing to verify is the /json/version document.',
        focus: 'adbf', highlight: ['chrome'], bubble: 'adb forward tcp:9222 ...',
        facts: [['Chrome flag', '--remote-debugging-port=9222'], ['Android', 'adb forward tcp:9222 localabstract:chrome_devtools_remote'], ['Check', 'GET /json/version']],
        note: 'Never expose port 9222 on a public interface: anyone who can reach it controls the browser.'
      },
      {
        title: 'Discover the WebSocket', sub: 'GET /json/version',
        text: 'Given an http:// endpoint, Playwright first fetches /json/version to read webSocketDebuggerUrl and the browser version. Given a ws:// endpoint it connects directly. This HTTP call is also where version skew first shows up: the Browser field tells you which Chrome you attach to.',
        focus: 'pw', highlight: ['adbf', 'chrome'],
        facts: [['Endpoint', 'http://localhost:9222'], ['Reads', 'webSocketDebuggerUrl'], ['Browser', 'Chrome/130.0.6723.58']]
      },
      {
        title: 'Connect over CDP', sub: 'Playwright attaches to the browser',
        text: 'chromium.connectOverCDP opens the WebSocket and returns a Browser. Remote default contexts already exist, so use browser.contexts()[0] to reuse the real profile or create a new context where the vendor allows it. Playwright then attaches to targets with Target.setAutoAttach.',
        focus: 'chrome', highlight: ['pw'],
        facts: [['TS method', 'chromium.connectOverCDP()'], ['Java method', 'chromium().connectOverCDP()'], ['Default context', 'browser.contexts()[0]']],
        code: {
          ts: `import { chromium } from 'playwright';

const browser = await chromium.connectOverCDP('http://localhost:9222');
const context = browser.contexts()[0];
const page = context.pages()[0] ?? await context.newPage();
await page.goto('https://m.shop.example/');
console.log(await page.title());
await browser.close(); // disconnects, does not kill remote Chrome`,
          java: `import com.microsoft.playwright.*;

try (Playwright playwright = Playwright.create()) {
  Browser browser = playwright.chromium()
      .connectOverCDP("http://localhost:9222");
  BrowserContext context = browser.contexts().get(0);
  Page page = context.pages().isEmpty() ? context.newPage() : context.pages().get(0);
  page.navigate("https://m.shop.example/");
  System.out.println(page.title());
}`
        },
        note: 'browser.close() on a connectOverCDP browser only disconnects; the remote Chrome keeps running.',
        guide: 'f-automation-protocols'
      },
      {
        title: 'Run actions remotely', sub: 'What runs where',
        text: 'Your test and the Playwright client run locally; the browser, DOM, JavaScript and rendering run remotely. Each locator action is one or more CDP round trips (DOM.getBoxModel, Input.dispatchTouchEvent), so a 100 ms link makes a click cost several hundred ms. Auto-waiting loops keep working, but timeouts must be raised for slow links.',
        focus: 'page', highlight: ['chrome', 'pw'],
        facts: [['Runs locally', 'Test + client + assertions'], ['Runs remotely', 'Browser, DOM, JS, render'], ['Action cost', '2-4 round trips']],
        code: {
          ts: `await page.getByRole('link', { name: 'Stores' }).tap();
await expect(page.getByRole('heading', { name: 'Find a store' }))
  .toBeVisible({ timeout: 15_000 }); // slow link: raise timeout
await page.screenshot({ path: 'remote-stores.png' });`,
          java: `page.getByRole(AriaRole.LINK,
    new Page.GetByRoleOptions().setName("Stores")).tap();
assertThat(page.getByRole(AriaRole.HEADING,
    new Page.GetByRoleOptions().setName("Find a store")))
    .isVisible(new LocatorAssertions.IsVisibleOptions().setTimeout(15_000));
page.screenshot(new Page.ScreenshotOptions().setPath(java.nio.file.Paths.get("remote-stores.png")));`
        },
        note: 'Screenshots come back as base64 over the WebSocket; large full-page images on slow links are a common timeout cause.'
      },
      {
        title: 'Playwright server option', sub: 'browserType.connect()',
        text: 'If you run npx playwright run-server on the remote machine, browserType.connect(wsEndpoint) uses the full Playwright protocol and a Playwright-managed browser, which gives higher fidelity than raw CDP. The trade-off is that the client and server must be the same Playwright version, whereas CDP only needs a compatible Chrome.',
        focus: 'farm', highlight: ['pw'],
        facts: [['Server', 'npx playwright run-server --port 3000'], ['Client', 'chromium.connect(ws)'], ['Versions', 'client == server version']],
        code: {
          ts: `import { chromium } from 'playwright';

const browser = await chromium.connect('ws://farm.example:3000/', {
  timeout: 30_000,
});
const page = await browser.newPage();
await page.goto('https://m.shop.example/');
await browser.close();`,
          java: `Browser browser = playwright.chromium().connect(
    "ws://farm.example:3000/",
    new BrowserType.ConnectOptions().setTimeout(30_000));
Page page = browser.newPage();
page.navigate("https://m.shop.example/");
browser.close();`
        },
        note: 'Check each vendor: some farms only accept connectOverCDP, others only their own connect URL with capabilities.'
      }
    ],
    messages: [
      M(0, 'adbf', 'chrome', 'ADB', 'adb forward tcp:9222 localabstract:chrome_devtools_remote', 'forward', '60 B', 0,
        'A local TCP port is tunnelled to the phone Chrome DevTools socket.',
        [{ name: 'Command', size: 60, note: 'adb forward' }, { name: 'ADB reply', size: 4, note: 'OKAY' }],
        [['local', 'tcp:9222', 'on your machine'], ['remote', 'localabstract:chrome_devtools_remote', 'abstract unix socket on device'], ['lifetime', 'until adb kill-server', 'or adb forward --remove']],
        '$ adb forward tcp:9222 localabstract:chrome_devtools_remote\n9222', 'Terminal'),
      M(1, 'pw', 'adbf', 'HTTP', 'GET http://localhost:9222/json/version', 'json/version', '420 B', 40,
        'Playwright asks Chrome who it is and where its WebSocket lives.',
        [{ name: 'HTTP headers', size: 180, note: 'GET' }, { name: 'JSON body', size: 240, note: 'version info' }],
        [['Browser', 'Chrome/130.0.6723.58', 'compare with your Playwright build'], ['Protocol-Version', '1.3', 'CDP version'], ['webSocketDebuggerUrl', 'ws://localhost:9222/devtools/browser/<guid>', 'browser endpoint']],
        '{\n "Browser": "Chrome/130.0.6723.58",\n "Protocol-Version": "1.3",\n "User-Agent": "Mozilla/5.0 (Linux; Android 14; Pixel 7) ... Chrome/130.0.6723.58 Mobile Safari/537.36",\n "webSocketDebuggerUrl": "ws://localhost:9222/devtools/browser/8b1c2e0e-..."\n}', 'HTTP response'),
      M(1, 'adbf', 'chrome', 'ADB', 'tunnel: tcp:9222 -> localabstract:chrome_devtools_remote', 'tunnel', null, 45,
        'The adb server relays the bytes to the phone through the open stream.',
        [{ name: 'ADB OPEN', size: 24, note: 'stream header' }, { name: 'Payload', size: 420, note: 'HTTP bytes' }],
        [['stream', 'localabstract:chrome_devtools_remote', 'destination'], ['framing', 'WRTE packets', 'max 1 MB per chunk'], ['overhead', '~24 B per packet', 'ADB header']],
        'OPEN localabstract:chrome_devtools_remote\nOKAY\nWRTE GET /json/version HTTP/1.1 ...', 'ADB stream (simplified)'),
      M(2, 'pw', 'farm', 'WS', 'WebSocket upgrade  wss://farm.example/cdp?token=...', 'ws upgrade', '350 B', 90,
        'The client upgrades HTTP to a WebSocket against the remote endpoint.',
        [{ name: 'HTTP upgrade request', size: 250, note: 'headers' }, { name: '101 response', size: 100, note: 'Switching Protocols' }],
        [['Upgrade', 'websocket', 'RFC 6455 handshake'], ['query token', 'token=<session>', 'vendor auth, treat as secret'], ['status', '101', 'tunnel is open']],
        'GET /cdp?token=*** HTTP/1.1\nHost: farm.example\nUpgrade: websocket\nConnection: Upgrade\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\nSec-WebSocket-Version: 13', 'HTTP upgrade'),
      M(2, 'pw', 'chrome', 'CDP', 'Target.setAutoAttach({autoAttach:true, flatten:true})', 'auto attach', '110 B', 120,
        'Playwright starts receiving every existing and future tab as a target.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 104, note: 'attach settings' }],
        [['method', 'Target.setAutoAttach', 'discovery'], ['flatten', 'true', 'one socket carries all sessions via sessionId'], ['waitForDebuggerOnStart', 'true', 'lets Playwright configure before page scripts run']],
        '{"id":2,"method":"Target.setAutoAttach","params":{"autoAttach":true,"waitForDebuggerOnStart":true,"flatten":true}}'),
      M(2, 'chrome', 'pw', 'CDP', 'Target.attachedToTarget({sessionId, targetInfo:{type:"page"}})', 'attached', '260 B', 135,
        'The browser announces an existing tab, which becomes context.pages()[0].',
        [{ name: 'WebSocket frame', size: 8, note: 'header' }, { name: 'CDP event', size: 250, note: 'targetInfo' }],
        [['sessionId', '5F3A...', 'used on every later command'], ['targetInfo.type', 'page', 'a tab'], ['url', 'chrome://newtab/', 'initial blank']],
        '{"method":"Target.attachedToTarget","params":{"sessionId":"5F3A12","targetInfo":{"targetId":"9C1E","type":"page","url":"chrome://newtab/"},"waitingForDebugger":true}}'),
      M(3, 'pw', 'chrome', 'CDP', 'DOM.getBoxModel({objectId}) before tap', 'box model', '96 B', 210,
        'Actionability checks run remotely and each costs a round trip.',
        [{ name: 'CDP JSON', size: 90, note: 'request' }, { name: 'Reply', size: 220, note: 'quad points' }],
        [['method', 'DOM.getBoxModel', 'element geometry'], ['round trip', '40-300 ms', 'depends on link'], ['why', 'find tap point', 'centre of the element']],
        '{"id":31,"sessionId":"5F3A12","method":"DOM.getBoxModel","params":{"objectId":"-6021.4"}}'),
      M(3, 'pw', 'chrome', 'CDP', 'Input.dispatchTouchEvent({type:"touchStart"...})', 'tap', '150 B', 260,
        'The touch is injected on the remote device.',
        [{ name: 'CDP JSON', size: 144, note: 'touch' }, { name: 'sessionId', size: 12, note: 'tab session' }],
        [['method', 'Input.dispatchTouchEvent', 'real touch pipeline'], ['sessionId', '5F3A12', 'selects the tab'], ['requires', 'hasTouch', 'mobile context']],
        '{"id":32,"sessionId":"5F3A12","method":"Input.dispatchTouchEvent","params":{"type":"touchStart","touchPoints":[{"x":120,"y":560}]}}'),
      M(4, 'test', 'farm', 'WS', 'chromium.connect("ws://farm.example:3000/") speaks Playwright protocol', 'pw connect', '2 KB', 340,
        'With run-server the whole Playwright protocol runs over one WebSocket.',
        [{ name: 'WebSocket frame', size: 8, note: 'header' }, { name: 'Playwright JSON', size: 1900, note: 'launch + commands' }],
        [['endpoint', 'ws://farm.example:3000/', 'run-server'], ['x-playwright-browser', 'chromium', 'header chooses browser type'], ['version rule', 'client == server', 'else connection is refused']],
        'GET / HTTP/1.1\nHost: farm.example:3000\nUpgrade: websocket\nx-playwright-browser: chromium\nx-playwright-launch-options: {"timeout":30000}', 'Handshake headers', 'Header names illustrative of the run-server handshake.')
    ]
  });

  /* ------------------------------------------------------------------ 4 */
  window.SCENARIOS.push({
    id: 'mobile-appium-native',
    platform: 'mobile',
    level: 2,
    title: 'Native apps with Appium',
    subtitle: 'Outside Playwright: W3C WebDriver + drivers',
    tags: ['appium', 'native', 'uiautomator2', 'xcuitest', 'webdriverio', 'w3c', 'accessibility-id'],
    overview: {
      text: 'Playwright automates web pages in browsers; it cannot drive native iOS or Android UI such as a Settings screen or your own APK. For that the standard open-source tool is Appium. Your test is a WebDriver client that sends W3C HTTP commands to an Appium server on port 4723, and the server delegates to a platform driver: UiAutomator2 for Android, XCUITest for iOS. This scenario shows the architecture so you can decide which tool fits.',
      facts: [['Protocol', 'W3C WebDriver over HTTP'], ['Server port', '4723 (Appium 2)'], ['Android driver', 'UiAutomator2'], ['iOS driver', 'XCUITest'], ['Clients', 'Java, WebdriverIO, Python...'], ['Not Playwright', 'Separate tool and API']],
      caveat: 'This is Appium, not Playwright. Playwright has no API for native views. Choose Playwright for web/PWA and Appium (or a hybrid of both) for native or webview-heavy apps.',
      guide: 'f-mobile-appium-grid'
    },
    nodes: [
      { id: 'test', label: 'Test client', sub: 'Java / WebdriverIO', icon: 'terminal', x: 110, y: 300, layer: 1 },
      { id: 'appium', label: 'Appium server', sub: 'node, :4723', icon: 'server', x: 340, y: 160, layer: 3 },
      { id: 'drv', label: 'Platform driver', sub: 'UiAutomator2 / XCUITest', icon: 'plug', x: 560, y: 240, layer: 3 },
      { id: 'agent', label: 'On-device agent', sub: 'UiAutomator2 server :6790', icon: 'chip', x: 580, y: 420, layer: 4 },
      { id: 'device', label: 'Device / simulator', sub: 'Pixel 7 emulator', icon: 'android', x: 780, y: 160, layer: 4 },
      { id: 'app', label: 'Native app', sub: 'com.example.shop', icon: 'app', x: 840, y: 340, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'appium', label: 'HTTP W3C :4723' },
      { a: 'appium', b: 'drv', label: 'in-process' },
      { a: 'drv', b: 'agent', label: 'adb forward + HTTP' },
      { a: 'drv', b: 'device', label: 'ADB / xcodebuild' },
      { a: 'agent', b: 'app', label: 'accessibility tree' }
    ],
    steps: [
      {
        title: 'Start Appium', sub: 'Server + installed drivers',
        text: 'Install Appium 2 (npm i -g appium), then add drivers with appium driver install uiautomator2 (and xcuitest on macOS). Run appium to start the HTTP server on port 4723. Appium 2 serves at the root path, whereas Appium 1 used /wd/hub.',
        focus: 'appium', highlight: ['test'], bubble: 'appium  ->  :4723',
        facts: [['Install', 'npm i -g appium'], ['Driver', 'appium driver install uiautomator2'], ['Default port', '4723']],
        note: 'The most common first failure is a missing ANDROID_HOME or an adb that is not on PATH; run appium-doctor style checks first.'
      },
      {
        title: 'Create a session', sub: 'POST /session with capabilities',
        text: 'The client sends capabilities describing the target: platformName, appium:automationName, appium:deviceName and appium:app. The server selects the driver, which boots the device agent (installs UiAutomator2 server APKs on Android), installs the app and replies with a session id.',
        focus: 'test', highlight: ['appium', 'drv'],
        facts: [['Endpoint', 'POST /session'], ['Prefix', 'appium: vendor capabilities'], ['Returns', 'sessionId']],
        code: {
          ts: `import { remote } from 'webdriverio';

const driver = await remote({
  hostname: '127.0.0.1', port: 4723, path: '/',
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': 'Pixel_7',
    'appium:app': '/builds/shop-debug.apk',
  },
});`,
          java: `import io.appium.java_client.android.AndroidDriver;
import io.appium.java_client.android.options.UiAutomator2Options;
import java.net.URL;

UiAutomator2Options options = new UiAutomator2Options()
    .setPlatformName("Android")
    .setDeviceName("Pixel_7")
    .setApp("/builds/shop-debug.apk");
AndroidDriver driver = new AndroidDriver(new URL("http://127.0.0.1:4723"), options);`
        },
        guide: 'f-mobile-appium-grid'
      },
      {
        title: 'Find by accessibility id', sub: 'Element lookup via the driver',
        text: 'POST /session/{id}/element with using "accessibility id" maps to the content-description on Android and accessibilityIdentifier on iOS, which is the most stable cross-platform locator. The driver asks the on-device agent, which searches the accessibility tree, and returns an element reference.',
        focus: 'drv', highlight: ['agent', 'appium'],
        facts: [['Strategy', 'accessibility id'], ['Android source', 'content-desc'], ['iOS source', 'accessibilityIdentifier']],
        code: {
          ts: `const login = await driver.$('~Login'); // ~ = accessibility id
await login.waitForDisplayed({ timeout: 10000 });
console.log(await login.getText());`,
          java: `import io.appium.java_client.AppiumBy;
import org.openqa.selenium.WebElement;

WebElement login = driver.findElement(AppiumBy.accessibilityId("Login"));
System.out.println(login.getText());`
        },
        note: 'XPath works but is slow on native trees; ask developers for stable accessibility ids.'
      },
      {
        title: 'Tap and assert', sub: 'Real UI input on the device',
        text: 'element.click() becomes POST /element/{id}/click; the driver forwards it to the UiAutomator2 server on the device, which injects a real touch through the Android instrumentation API. Unlike Playwright there is no built-in auto-waiting, so you add explicit waits or wait-for conditions yourself.',
        focus: 'agent', highlight: ['app', 'drv'],
        facts: [['Endpoint', 'POST /element/{id}/click'], ['Injected by', 'Android instrumentation'], ['Auto-wait', 'No: use explicit waits']],
        code: {
          ts: `await (await driver.$('~Login')).click();
const welcome = await driver.$('~Welcome banner');
await welcome.waitForDisplayed({ timeout: 10000 });
await driver.deleteSession();`,
          java: `driver.findElement(AppiumBy.accessibilityId("Login")).click();
WebElement welcome = driver.findElement(AppiumBy.accessibilityId("Welcome banner"));
System.out.println(welcome.isDisplayed());
driver.quit();`
        },
        note: 'Always end with deleteSession / quit, otherwise the device session stays locked.'
      },
      {
        title: 'Playwright vs Appium', sub: 'When to choose each',
        text: 'Use Playwright for websites, PWAs and mobile-web emulation: fast, auto-waiting, great tracing. Use Appium when the thing under test is a native app or needs OS-level UI: it is slower and more brittle but is the only open option for native iOS and Android. Many teams run both, and Appium can also drive a WebView by switching context.',
        focus: 'test', highlight: ['appium', 'app'],
        facts: [['Playwright', 'Web, PWA, emulation'], ['Appium', 'Native iOS/Android UI'], ['Hybrid', 'Appium context switch to WEBVIEW']],
        note: 'There is no Playwright API for Appium sessions; the two tools do not share locators or traces.'
      }
    ],
    messages: [
      M(0, 'test', 'appium', 'CLI', 'appium --port 4723  (drivers: uiautomator2, xcuitest)', 'start server', null, 0,
        'You start the Appium server with the drivers installed.',
        [{ name: 'Command', size: 30, note: 'appium' }, { name: 'Log lines', size: 200, note: 'drivers loaded' }],
        [['port', '4723', 'Appium 2 default'], ['base path', '/', 'was /wd/hub in Appium 1'], ['drivers', 'uiautomator2, xcuitest', 'installed with appium driver install']],
        '$ appium\n[Appium] Welcome to Appium v2.x\n[Appium] Available drivers:\n[Appium]   - uiautomator2@2.x (automationName \'UiAutomator2\')\n[Appium] Appium REST http interface listener started on http://0.0.0.0:4723', 'Terminal'),
      M(1, 'test', 'appium', 'HTTP', 'POST /session  {capabilities: platformName=Android, appium:automationName=UiAutomator2}', 'new session', '420 B', 30,
        'Client asks for a new automation session with a device profile.',
        [{ name: 'HTTP headers', size: 120, note: 'POST /session' }, { name: 'JSON capabilities', size: 300, note: 'alwaysMatch' }],
        [['platformName', 'Android', 'standard W3C capability'], ['appium:automationName', 'UiAutomator2', 'selects driver'], ['appium:app', '/builds/shop-debug.apk', 'installed before start']],
        '{"capabilities":{"alwaysMatch":{"platformName":"Android","appium:automationName":"UiAutomator2","appium:deviceName":"Pixel_7","appium:app":"/builds/shop-debug.apk"}}}', 'HTTP body (JSON)'),
      M(1, 'drv', 'device', 'ADB', 'adb install shop-debug.apk + start UiAutomator2 server instrumentation', 'install', '7 MB', 400,
        'The driver prepares the device: installs APKs and starts instrumentation.',
        [{ name: 'ADB install', size: 7000000, note: 'APK upload' }, { name: 'am instrument', size: 150, note: 'start agent' }],
        [['adb install', 'shop-debug.apk', 'app under test'], ['helper APKs', 'io.appium.uiautomator2.server', 'agent + test APK'], ['am instrument', 'io.appium.uiautomator2.server.test/...', 'starts HTTP server on device']],
        'adb -s emulator-5554 install -r shop-debug.apk\nadb -s emulator-5554 shell am instrument -w io.appium.uiautomator2.server.test/androidx.test.runner.AndroidJUnitRunner', 'adb commands'),
      M(1, 'appium', 'test', 'HTTP', '200 OK  {"value":{"sessionId":"a1b2c3","capabilities":{...}}}', 'session id', '380 B', 3200,
        'The client gets a session id used in every later URL.',
        [{ name: 'HTTP status + headers', size: 100, note: '200 OK' }, { name: 'JSON body', size: 280, note: 'sessionId, capabilities' }],
        [['sessionId', 'a1b2c3', 'appears in /session/a1b2c3/...'], ['platformVersion', '14', 'detected from device'], ['deviceUDID', 'emulator-5554', 'adb serial']],
        '{"value":{"sessionId":"a1b2c3","capabilities":{"platformName":"Android","automationName":"UiAutomator2","platformVersion":"14","deviceUDID":"emulator-5554"}}}', 'HTTP response', 'Session creation commonly takes 3-15 s.'),
      M(2, 'test', 'appium', 'HTTP', 'POST /session/a1b2c3/element  {using:"accessibility id", value:"Login"}', 'find element', '150 B', 3300,
        'The client finds an element by accessibility id.',
        [{ name: 'HTTP headers', size: 110, note: 'POST' }, { name: 'JSON body', size: 40, note: 'using + value' }],
        [['using', 'accessibility id', 'cross-platform strategy'], ['value', 'Login', 'content-desc / accessibilityIdentifier'], ['path', '/session/a1b2c3/element', 'W3C endpoint']],
        '{"using":"accessibility id","value":"Login"}', 'HTTP body (JSON)'),
      M(2, 'drv', 'agent', 'HTTP', 'POST http://127.0.0.1:8200/session/.../element  (adb-forwarded to device :6790)', 'to agent', '160 B', 3320,
        'The driver relays the lookup to the HTTP server running on the device.',
        [{ name: 'HTTP request', size: 160, note: 'to device agent' }, { name: 'Port forward', size: 0, note: 'adb forward tcp:8200 tcp:6790' }],
        [['agent port', '6790 on device', 'UiAutomator2 server'], ['local port', '8200 (example)', 'adb forward'], ['strategy', 'accessibility id', 'mapped to content-desc']],
        'POST /session/a1b2c3/element HTTP/1.1\nHost: 127.0.0.1:8200\n\n{"strategy":"accessibility id","selector":"Login","context":"","multiple":false}', 'HTTP (driver to agent)'),
      M(2, 'agent', 'app', 'UI', 'UiDevice searches accessibility tree for content-desc="Login"', 'a11y search', null, 3340,
        'The agent walks the native accessibility hierarchy.',
        [{ name: 'AccessibilityNodeInfo walk', size: 120, note: 'tree search' }, { name: 'Match', size: 40, note: 'one node' }],
        [['tree', 'AccessibilityNodeInfo', 'Android view hierarchy snapshot'], ['match', 'content-desc="Login"', 'Button'], ['bounds', '[240,1620][840,1740]', 'screen pixels']],
        '<android.widget.Button content-desc="Login" clickable="true" bounds="[240,1620][840,1740]" />', 'Matched node'),
      M(3, 'test', 'appium', 'HTTP', 'POST /session/a1b2c3/element/e7/click  {}', 'click', '90 B', 3500,
        'Client taps the element.',
        [{ name: 'HTTP headers', size: 90, note: 'POST' }, { name: 'JSON body', size: 2, note: '{}' }],
        [['endpoint', '/element/e7/click', 'W3C Element Click'], ['element id', 'e7', 'reference from find'], ['body', '{}', 'empty']],
        'POST /session/a1b2c3/element/e7/click HTTP/1.1\nContent-Type: application/json\n\n{}', 'HTTP request'),
      M(3, 'agent', 'app', 'UI', 'Real touch injected: tap at (540,1680)', 'tap', null, 3540,
        'Android instrumentation sends a real touch event to the app.',
        [{ name: 'MotionEvent DOWN/UP', size: 80, note: 'injected' }, { name: 'App handler', size: 30, note: 'onClick' }],
        [['x, y', '540, 1680', 'centre of bounds'], ['mechanism', 'UiAutomation.injectInputEvent', 'real system input'], ['result', 'Login screen opens', 'native navigation']],
        'MotionEvent ACTION_DOWN (540,1680)\nMotionEvent ACTION_UP   (540,1680)', 'Injected input'),
      M(4, 'test', 'appium', 'HTTP', 'DELETE /session/a1b2c3', 'quit', '40 B', 4600,
        'Ends the session and frees the device.',
        [{ name: 'HTTP request line', size: 40, note: 'DELETE' }, { name: 'Response', size: 20, note: '{"value":null}' }],
        [['method', 'DELETE', 'W3C Delete Session'], ['effect', 'Stops agent, uninstalls helper APKs optionally', 'cleanup'], ['skipped?', 'device stays locked', 'next run fails to start']],
        'DELETE /session/a1b2c3 HTTP/1.1\nHost: 127.0.0.1:4723\n\n-> {"value":null}', 'HTTP')
    ]
  });

  /* ------------------------------------------------------------------ 5 */
  window.SCENARIOS.push({
    id: 'mobile-responsive-emulation-suite',
    platform: 'mobile',
    level: 2,
    title: 'Geo, permissions, dark mode',
    subtitle: 'Store locator on a phone profile',
    tags: ['geolocation', 'permissions', 'locale', 'timezone', 'colorScheme', 'offline', 'store-locator'],
    overview: {
      text: 'A store locator depends on the phone location, the language, the time zone, dark mode and sometimes no network at all. Playwright lets you set all of these once on a BrowserContext and flip some at runtime, with each option mapped to a CDP or browser-level emulation call. This scenario builds a Pixel 7 profile near Berlin, grants geolocation, and checks both online and offline behaviour with a mobile screenshot.',
      facts: [['Scope', 'BrowserContext options'], ['CDP calls', 'Emulation.*, Browser.grantPermissions'], ['Runtime toggles', 'setGeolocation, setOffline'], ['Mobile profile', 'devices Pixel 7 values'], ['Java', 'Same options on Browser.NewContextOptions'], ['Screenshot', 'page.screenshot()']],
      caveat: 'Emulated geolocation and permissions skip the native OS prompts; the real permission dialog and GPS fix behaviour need a real device.',
      guide: 'emulation'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'stores.spec.ts', icon: 'terminal', x: 120, y: 300, layer: 1 },
      { id: 'ctx', label: 'BrowserContext', sub: 'Pixel 7 + de-DE + Berlin', icon: 'cube', x: 350, y: 170, layer: 2 },
      { id: 'pw', label: 'Playwright driver', sub: 'maps options to CDP', icon: 'gear', x: 350, y: 410, layer: 3 },
      { id: 'browser', label: 'Chromium', sub: 'emulation overrides', icon: 'browser', x: 610, y: 300, layer: 4 },
      { id: 'page', label: 'Store locator', sub: 'shop.example/stores', icon: 'phone', x: 860, y: 300, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'ctx', label: 'newContext(opts)' },
      { a: 'ctx', b: 'pw', label: 'options' },
      { a: 'pw', b: 'browser', label: 'CDP' },
      { a: 'browser', b: 'page', label: 'APIs seen by page' }
    ],
    steps: [
      {
        title: 'Define the profile', sub: 'One context, many overrides',
        text: 'All environment facts go into one newContext call: the Pixel 7 viewport and touch flags, geolocation of Berlin Mitte, the geolocation permission, locale de-DE, timezoneId Europe/Berlin and colorScheme dark. Because they are per context, parallel tests with different profiles do not interfere.',
        focus: 'ctx', highlight: ['test'], bubble: 'Berlin, de-DE, dark',
        facts: [['Geolocation', '52.5200, 13.4050'], ['Locale', 'de-DE'], ['Timezone', 'Europe/Berlin'], ['Color scheme', 'dark']],
        code: {
          ts: `import { test, devices } from '@playwright/test';

test.use({
  ...devices['Pixel 7'],
  geolocation: { latitude: 52.52, longitude: 13.405 },
  permissions: ['geolocation'],
  locale: 'de-DE',
  timezoneId: 'Europe/Berlin',
  colorScheme: 'dark',
});`,
          java: `BrowserContext context = browser.newContext(new Browser.NewContextOptions()
    .setViewportSize(412, 839).setDeviceScaleFactor(2.625)
    .setIsMobile(true).setHasTouch(true)
    .setGeolocation(52.52, 13.405)
    .setPermissions(java.util.Arrays.asList("geolocation"))
    .setLocale("de-DE")
    .setTimezoneId("Europe/Berlin")
    .setColorScheme(ColorScheme.DARK));`
        },
        guide: 'emulation'
      },
      {
        title: 'Map to CDP', sub: 'Each option is one browser call',
        text: 'The driver translates the options: Emulation.setGeolocationOverride, Browser.grantPermissions, Emulation.setLocaleOverride, Emulation.setTimezoneOverride and Emulation.setEmulatedMedia with prefers-color-scheme. Locale also feeds the Accept-Language header and Intl formatting.',
        focus: 'browser', highlight: ['pw'],
        facts: [['Geo', 'Emulation.setGeolocationOverride'], ['Permission', 'Browser.grantPermissions'], ['Media', 'Emulation.setEmulatedMedia'], ['Time zone', 'Emulation.setTimezoneOverride']],
        note: 'Without the geolocation permission, setGeolocation alone still results in a permission-denied error in the page.'
      },
      {
        title: 'Use the location', sub: 'Page sees Berlin, in German',
        text: 'The store locator calls navigator.geolocation.getCurrentPosition and receives the override instantly without any prompt, then sorts stores by distance. Dates render with the Berlin time zone and the page switches to its dark theme because prefers-color-scheme is dark.',
        focus: 'page', highlight: ['browser'], bubble: 'Nearest store: 0.4 km',
        facts: [['getCurrentPosition', 'resolves, no prompt'], ['Intl date', 'de-DE, CET'], ['prefers-color-scheme', 'dark']],
        code: {
          ts: `import { test, expect } from '@playwright/test';

test('nearest store is shown', async ({ page }) => {
  await page.goto('https://shop.example/stores');
  await page.getByRole('button', { name: 'Standort verwenden' }).tap();
  await expect(page.getByTestId('nearest-store')).toContainText('Berlin Mitte');
  await page.screenshot({ path: 'stores-pixel7-dark.png' });
});`,
          java: `page.navigate("https://shop.example/stores");
page.getByRole(AriaRole.BUTTON,
    new Page.GetByRoleOptions().setName("Standort verwenden")).tap();
assertThat(page.getByTestId("nearest-store")).containsText("Berlin Mitte");
page.screenshot(new Page.ScreenshotOptions()
    .setPath(java.nio.file.Paths.get("stores-pixel7-dark.png")));`
        },
        guide: 'screenshots'
      },
      {
        title: 'Move the user', sub: 'setGeolocation at runtime',
        text: 'To test that results refresh when the user travels, change the location mid-test with context.setGeolocation(). It re-sends the override and any watchPosition callbacks in the page fire with the new coordinates, so you can assert the list reorders to Munich stores.',
        focus: 'ctx', highlight: ['pw', 'browser'],
        facts: [['Method', 'context.setGeolocation()'], ['New position', '48.1351, 11.5820'], ['Fires', 'watchPosition callbacks']],
        code: {
          ts: `await context.setGeolocation({ latitude: 48.1351, longitude: 11.582 }); // Munich
await expect(page.getByTestId('nearest-store')).toContainText('München');`,
          java: `context.setGeolocation(new Geolocation(48.1351, 11.582)); // Munich
assertThat(page.getByTestId("nearest-store")).containsText("München");`
        },
        note: 'Pass null to clear the override; the page then reports position unavailable.'
      },
      {
        title: 'Go offline', sub: 'setOffline and error UX',
        text: 'context.setOffline(true) calls Network.emulateNetworkConditions with offline true; fetches fail immediately and navigator.onLine becomes false, which is how you test the "No connection" banner and cached store data. Switch it back to restore the network.',
        focus: 'browser', highlight: ['page', 'test'],
        facts: [['Method', 'context.setOffline()'], ['CDP', 'Network.emulateNetworkConditions'], ['navigator.onLine', 'false']],
        code: {
          ts: `await context.setOffline(true);
await page.getByRole('button', { name: 'Aktualisieren' }).tap();
await expect(page.getByText('Keine Verbindung')).toBeVisible();
await context.setOffline(false);`,
          java: `context.setOffline(true);
page.getByRole(AriaRole.BUTTON,
    new Page.GetByRoleOptions().setName("Aktualisieren")).tap();
assertThat(page.getByText("Keine Verbindung")).isVisible();
context.setOffline(false);`
        },
        note: 'Offline emulation does not stop an already-registered service worker serving cached responses; that is often what you want to test.',
        guide: 'network'
      }
    ],
    messages: [
      M(0, 'test', 'pw', 'IPC', 'browser.newContext({geolocation, permissions, locale, timezoneId, colorScheme, ...})', 'newContext', '560 B', 0,
        'The full environment profile is sent in a single request.',
        [{ name: 'Channel frame', size: 24, note: 'guid + method' }, { name: 'Context options', size: 536, note: 'device + environment' }],
        [['geolocation', '{latitude:52.52, longitude:13.405}', 'Berlin Mitte'], ['permissions', '["geolocation"]', 'granted without prompt'], ['locale / timezoneId', 'de-DE / Europe/Berlin', 'language and clock'], ['colorScheme', 'dark', 'prefers-color-scheme']],
        '{"method":"newContext","params":{"viewport":{"width":412,"height":839},"deviceScaleFactor":2.625,"isMobile":true,"hasTouch":true,"geolocation":{"latitude":52.52,"longitude":13.405},"permissions":["geolocation"],"locale":"de-DE","timezoneId":"Europe/Berlin","colorScheme":"dark"}}', 'Playwright channel message'),
      M(1, 'pw', 'browser', 'CDP', 'Emulation.setGeolocationOverride({latitude:52.52,longitude:13.405,accuracy:0})', 'geo', '120 B', 20,
        'Overrides the position returned by the Geolocation API.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 114, note: 'coordinates' }],
        [['latitude, longitude', '52.52, 13.405', 'Berlin Mitte'], ['accuracy', '0', 'Playwright default'], ['effect', 'getCurrentPosition resolves', 'with these values']],
        '{"id":51,"method":"Emulation.setGeolocationOverride","params":{"latitude":52.52,"longitude":13.405,"accuracy":0}}'),
      M(1, 'pw', 'browser', 'CDP', 'Browser.grantPermissions({origin:"https://shop.example",permissions:[geolocation]})', 'permissions', '150 B', 24,
        'Pre-grants the permission so no prompt appears.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 144, note: 'origin + list' }],
        [['permissions', '["geolocation"]', 'also: notifications, camera...'], ['origin', 'https://shop.example', 'scoped per origin'], ['browserContextId', 'C1F...', 'only this context']],
        '{"id":52,"method":"Browser.grantPermissions","params":{"origin":"https://shop.example","permissions":["geolocation"],"browserContextId":"C1F0A9"}}'),
      M(1, 'pw', 'browser', 'CDP', 'Emulation.setLocaleOverride(de-DE) + setTimezoneOverride(Europe/Berlin)', 'locale + tz', '170 B', 30,
        'Sets Intl locale and the time zone used for Date.',
        [{ name: 'Locale call', size: 80, note: 'setLocaleOverride' }, { name: 'Timezone call', size: 90, note: 'setTimezoneOverride' }],
        [['locale', 'de-DE', 'Intl, Accept-Language'], ['timezoneId', 'Europe/Berlin', 'Date offsets, CET/CEST'], ['note', 'two CDP messages', 'sent back to back']],
        '{"id":53,"method":"Emulation.setLocaleOverride","params":{"locale":"de-DE"}}\n{"id":54,"method":"Emulation.setTimezoneOverride","params":{"timezoneId":"Europe/Berlin"}}'),
      M(1, 'pw', 'browser', 'CDP', 'Emulation.setEmulatedMedia({features:[{name:"prefers-color-scheme",value:"dark"}]})', 'dark mode', '140 B', 34,
        'Forces the dark colour scheme media query.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 134, note: 'media features' }],
        [['feature', 'prefers-color-scheme', 'CSS media feature'], ['value', 'dark', 'or light / no-preference'], ['effect', 'matchMedia matches', 'theme switches']],
        '{"id":55,"method":"Emulation.setEmulatedMedia","params":{"features":[{"name":"prefers-color-scheme","value":"dark"}]}}'),
      M(2, 'page', 'browser', 'UI', 'navigator.geolocation.getCurrentPosition -> {lat 52.52, lng 13.405}', 'got position', null, 120,
        'The page receives the emulated location instantly.',
        [{ name: 'Page JS call', size: 60, note: 'getCurrentPosition' }, { name: 'Result', size: 80, note: 'coords' }],
        [['coords.latitude', '52.52', 'emulated'], ['coords.accuracy', '0', 'override'], ['prompt', 'none', 'permission pre-granted']],
        'GeolocationPosition { coords: { latitude: 52.52, longitude: 13.405, accuracy: 0 } }', 'Value seen by page'),
      M(2, 'browser', 'page', 'HTTP', 'GET /api/stores?lat=52.52&lng=13.405  (Accept-Language: de-DE)', 'stores API', '380 B', 160,
        'The locator calls its API with the emulated coordinates.',
        [{ name: 'Request headers', size: 300, note: 'GET + language' }, { name: 'Query string', size: 40, note: 'lat,lng' }],
        [['lat, lng', '52.52, 13.405', 'from emulation'], ['Accept-Language', 'de-DE', 'from locale'], ['response', '200 JSON list', 'sorted by distance']],
        'GET /api/stores?lat=52.52&lng=13.405 HTTP/1.1\nHost: shop.example\nAccept-Language: de-DE\nUser-Agent: Mozilla/5.0 (Linux; Android 14; Pixel 7) ... Mobile Safari/537.36', 'HTTP request'),
      M(3, 'pw', 'browser', 'CDP', 'Emulation.setGeolocationOverride({latitude:48.1351,longitude:11.582})', 'geo update', '120 B', 400,
        'Runtime change; page watchers fire.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 114, note: 'new coords' }],
        [['latitude, longitude', '48.1351, 11.582', 'Munich'], ['trigger', 'context.setGeolocation()', 'from test'], ['effect', 'watchPosition fires', 'list reorders']],
        '{"id":71,"method":"Emulation.setGeolocationOverride","params":{"latitude":48.1351,"longitude":11.582,"accuracy":0}}'),
      M(4, 'pw', 'browser', 'CDP', 'Network.emulateNetworkConditions({offline:true,latency:0,...})', 'offline', '170 B', 600,
        'Takes the network down for the context pages.',
        [{ name: 'WebSocket frame', size: 6, note: 'header' }, { name: 'CDP JSON', size: 164, note: 'conditions' }],
        [['offline', 'true', 'all requests fail'], ['throughput', '-1', 'unthrottled when online'], ['effect', 'navigator.onLine = false', 'page shows banner']],
        '{"id":88,"method":"Network.emulateNetworkConditions","params":{"offline":true,"latency":0,"downloadThroughput":-1,"uploadThroughput":-1}}'),
      M(4, 'page', 'browser', 'UI', 'fetch /api/stores fails: net::ERR_INTERNET_DISCONNECTED -> banner "Keine Verbindung"', 'offline banner', null, 640,
        'The UI shows its offline state; the test asserts it and takes a screenshot.',
        [{ name: 'Failed request', size: 80, note: 'net error' }, { name: 'DOM change', size: 60, note: 'banner shown' }],
        [['error', 'net::ERR_INTERNET_DISCONNECTED', 'Chromium network error'], ['navigator.onLine', 'false', 'offline event fires'], ['UI', '"Keine Verbindung"', 'asserted with toBeVisible']],
        'Failed to fetch  (net::ERR_INTERNET_DISCONNECTED)\nwindow event: offline\n<div role="alert">Keine Verbindung</div>', 'Observed in page')
    ]
  });
})();
