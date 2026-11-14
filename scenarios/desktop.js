window.SCENARIOS = window.SCENARIOS || [];
(function () {
  // helper: compact message builder
  function M(step, from, to, proto, info, short, size, summary, parts, fields, raw, rawLabel, footer) {
    var d = {
      summary: summary,
      parts: parts.map(function (p) { return { name: p[0], size: p[1], note: p[2] }; }),
      fields: fields,
      raw: raw
    };
    if (rawLabel) d.rawLabel = rawLabel;
    if (footer) d.footer = footer;
    return { step: step, from: from, to: to, proto: proto, info: info, short: short, size: size, detail: d };
  }
  var ILLUS = 'Values are illustrative.';

  /* ------------------------------------------------------------------ 1 */
  var electronLaunch = {
    id: 'desktop-electron-launch',
    platform: 'desktop',
    level: 2,
    title: 'Electron: _electron.launch()',
    subtitle: 'Start an Electron app and grab its window',
    tags: ['electron', '_electron', 'launch', 'firstWindow', 'inspect', 'desktop', 'experimental'],
    overview: {
      text: 'Electron apps are Chromium (the renderer windows) plus Node.js (the main process). Playwright can start the Electron binary itself with _electron.launch(), attach to the main process through the Node inspector and to every BrowserWindow through CDP, and hand you a normal Page object. This is the quickest way to run end-to-end tests of a desktop app written with web technology, but it is Node.js-only and still marked experimental.',
      facts: [
        ['API', '_electron.launch() (experimental)'],
        ['Main process link', 'Node inspector (pipe/WebSocket)'],
        ['Renderer link', 'CDP per BrowserWindow'],
        ['Languages', 'Node.js / TypeScript only'],
        ['Typical startup', '1-4 s, app dependent']
      ],
      caveat: 'Electron support is experimental and exists only in the Node.js package. There is no Playwright Java API for Electron.',
      guide: 'library'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'app.spec.ts', icon: 'terminal', x: 130, y: 300, layer: 1 },
      { id: 'pw', label: 'Playwright', sub: '_electron driver', icon: 'plug', x: 340, y: 190, layer: 2 },
      { id: 'main', label: 'Electron main', sub: 'Node.js process', icon: 'chip', x: 560, y: 190, layer: 3 },
      { id: 'proc', label: 'Electron binary', sub: 'node_modules/electron', icon: 'app', x: 340, y: 400, layer: 3 },
      { id: 'win', label: 'BrowserWindow', sub: 'renderer (Chromium)', icon: 'browser', x: 780, y: 310, layer: 4 },
      { id: 'dom', label: 'App UI', sub: 'index.html', icon: 'doc', x: 780, y: 130, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process' },
      { a: 'pw', b: 'proc', label: 'child process' },
      { a: 'pw', b: 'main', label: 'Node inspector' },
      { a: 'main', b: 'win', label: 'creates window' },
      { a: 'pw', b: 'win', label: 'CDP' },
      { a: 'win', b: 'dom', label: 'renders' }
    ],
    steps: [
      {
        title: 'Launch the binary', sub: 'spawn electron with the app path',
        text: 'The test calls _electron.launch({ args: ["."] }). Playwright resolves the electron executable from node_modules, spawns it as a child process and adds the debugging flags it needs so it can later attach to the Node main process. You can also pass executablePath for a packaged app, plus env and cwd.',
        focus: 'test', highlight: ['pw', 'proc'], bubble: '_electron.launch({ args: ["."] })',
        facts: [['Method', '_electron.launch(options)'], ['Key options', 'args, executablePath, env, cwd'], ['Returns', 'ElectronApplication']],
        code: {
          ts: `import { _electron as electron } from 'playwright';

(async () => {
  const electronApp = await electron.launch({
    args: ['.'],            // folder with package.json "main"
    env: { ...process.env, NODE_ENV: 'test' },
  });
  console.log('pid', electronApp.process().pid);
  await electronApp.close();
})();`,
          java: null,
          javaNote: 'Electron is not part of the Playwright Java API (only Node.js exposes _electron). In Java, drive Electron with Selenium + chromedriver (ChromeOptions.setBinary(electronExe), matching chromedriver version), or start the app with --remote-debugging-port=9222 and use playwright.chromium().connectOverCDP("http://localhost:9222") to reach the renderer pages (no main-process access).'
        },
        note: 'Run the binary from node_modules, not a packaged build, unless executablePath points at it; packaged apps may have the inspector fuse disabled.',
        guide: 'library'
      },
      {
        title: 'Attach to main process', sub: 'Node inspector handshake',
        text: 'Electron is started with --inspect=0 style flags (Playwright uses a pipe or ephemeral port) so Playwright can open the Node inspector of the main process. Through it Playwright knows when the app is ready and can later run electronApp.evaluate() inside the main process.',
        focus: 'pw', highlight: ['proc', 'main'], bubble: 'Debugger listening on ws://...',
        facts: [['Channel', 'Node inspector protocol'], ['Flag', '--inspect=0 / --remote-debugging-port=0'], ['Fuse', 'EnableNodeCliInspectArguments must be on']],
        note: 'If the app was packaged with the EnableNodeCliInspectArguments fuse disabled, launch() hangs until timeout (default 30 s).'
      },
      {
        title: 'Windows via CDP', sub: 'every BrowserWindow is a Page',
        text: 'When the main process creates a BrowserWindow, Chromium exposes it as a CDP target. Playwright attaches (Target.attachedToTarget), wraps it as a Page and fires the "window" event. electronApp.firstWindow() simply waits for the first such Page, so you do not need arbitrary sleeps.',
        focus: 'win', highlight: ['pw', 'main'], bubble: 'Target.attachedToTarget',
        facts: [['Wait helper', 'firstWindow()'], ['Event', 'electronApp.on("window")'], ['Window list', 'electronApp.windows()']],
        code: {
          ts: `import { _electron as electron } from 'playwright';

(async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();
  console.log(await window.title());
  window.on('console', msg => console.log('[renderer]', msg.text()));
  await window.waitForLoadState('domcontentloaded');
  await electronApp.close();
})();`,
          java: null,
          javaNote: 'No Java equivalent of firstWindow(). With connectOverCDP in Java use browser.contexts().get(0).pages() and poll or context.onPage(...) to find the window.'
        },
        note: 'firstWindow() returns the splash screen if you have one; pick the right window by title() or URL via electronApp.windows().'
      },
      {
        title: 'Drive the UI', sub: 'same Page API as the web',
        text: 'The window is a normal Playwright Page, so locators, auto-waiting, expect() assertions, tracing and network mocking all work. The only difference is that page.goto is rarely needed because the app already loaded its own HTML (file:// or a local dev server).',
        focus: 'dom', highlight: ['win'], bubble: 'getByRole("button", { name: "New note" })',
        facts: [['Locators', 'getByRole / getByText / testId'], ['Assertions', 'expect(locator)'], ['URL scheme', 'file:// or app://']],
        code: {
          ts: `import { test, expect, _electron as electron } from '@playwright/test';

test('creates a note', async () => {
  const app = await electron.launch({ args: ['.'] });
  const window = await app.firstWindow();
  await window.getByRole('button', { name: 'New note' }).click();
  await expect(window.getByRole('listitem')).toHaveCount(1);
  await app.close();
});`,
          java: null,
          javaNote: 'Not available in Java. The Page API itself is identical in Java, so a connectOverCDP page (see the WebView2 scenario) can use the same getByRole / assertThat code.'
        }
      },
      {
        title: 'Screenshot & close', sub: 'evidence, then shut down',
        text: 'window.screenshot() asks the renderer for pixels through Page.captureScreenshot, so it captures the web content only, not the OS title bar or native menus. electronApp.close() ends the process; always close it in a finally/afterEach block or the Electron process lingers and blocks the next run.',
        focus: 'test', highlight: ['win', 'pw'], bubble: 'window.screenshot()',
        facts: [['Method', 'page.screenshot()'], ['Captures', 'web content only'], ['Cleanup', 'electronApp.close()']],
        code: {
          ts: `import { _electron as electron } from 'playwright';

(async () => {
  const app = await electron.launch({ args: ['.'] });
  try {
    const window = await app.firstWindow();
    await window.screenshot({ path: 'home.png' });
  } finally {
    await app.close();
  }
})();`,
          java: null,
          javaNote: 'In Java, page.screenshot(new Page.ScreenshotOptions().setPath(Paths.get("home.png"))) works on a page obtained via connectOverCDP.'
        },
        note: 'Native OS dialogs and menus are not part of the page; use main-process evaluate or an OS-level tool (see Appium scenario).'
      }
    ],
    messages: [
      M(0, 'test', 'pw', 'CLI', '_electron.launch({ args: ["."] })', 'launch', '-',
        'Test asks the Playwright driver to start an Electron application.',
        [['Method call', 30, 'electron.launch'], ['Options', 40, 'args, env, cwd, timeout']],
        [['args', '["."]', 'Arguments given to electron: here the app folder'], ['executablePath', 'node_modules/electron/dist/electron.exe', 'Resolved automatically if omitted'], ['timeout', '30000', 'ms to wait for the app to be ready']],
        'electron.launch({ args: ["."], env: { NODE_ENV: "test" }, timeout: 30000 })', 'API call (TypeScript)', ILLUS),
      M(0, 'pw', 'proc', 'CLI', 'spawn electron . --inspect=0 --remote-debugging-port=0', 'spawn', '~180 B',
        'Playwright spawns the Electron binary as a child process with debugging switches.',
        [['Executable', 35, 'electron.exe'], ['App args', 10, '.'], ['Debug flags', 55, '--inspect, --remote-debugging-port']],
        [['--inspect=0', 'ephemeral port', 'Node inspector for the main process'], ['--remote-debugging-port=0', 'ephemeral port', 'CDP endpoint for renderers'], ['--no-sandbox', 'optional', 'Often needed in Linux CI containers']],
        'C:\\app\\node_modules\\electron\\dist\\electron.exe . --inspect=0 --remote-debugging-port=0', 'Command line', ILLUS),
      M(1, 'proc', 'pw', 'IPC', 'stderr: "Debugger listening on ws://127.0.0.1:53911/..."', 'inspector url', '~90 B',
        'Electron prints the inspector WebSocket URL, which Playwright parses to connect.',
        [['Log prefix', 25, 'Debugger listening on'], ['WebSocket URL', 75, 'ws://127.0.0.1:port/uuid']],
        [['Channel', 'stderr pipe', 'Playwright reads process output'], ['Port', '53911', 'Random free port'], ['Next step', 'WebSocket connect', 'Starts the inspector session']],
        'Debugger listening on ws://127.0.0.1:53911/5c1e9a50-7d3b-4a68-9e0f-0b2f6c1a7d11', 'stderr line', ILLUS),
      M(1, 'pw', 'main', 'WS', 'Runtime.evaluate: require("electron").app.isReady()', 'ready?', '~140 B',
        'Over the Node inspector Playwright asks the main process whether the app is ready.',
        [['WebSocket frame', 8, 'header'], ['Inspector JSON', 92, 'Runtime.evaluate']],
        [['method', 'Runtime.evaluate', 'Evaluates JS in the main process context'], ['expression', 'app.whenReady()', 'Resolves when Electron finished init'], ['awaitPromise', 'true', 'Wait for the promise']],
        '{"id":3,"method":"Runtime.evaluate","params":{"expression":"require(\\"electron\\").app.whenReady()","awaitPromise":true}}', 'Inspector message (JSON)', ILLUS),
      M(2, 'main', 'win', 'IPC', 'new BrowserWindow({ width: 1000, height: 700 }).loadFile("index.html")', 'create window', '-',
        'The app code in the main process opens its first window.',
        [['Constructor options', 50, 'size, webPreferences'], ['loadFile', 50, 'index.html']],
        [['width x height', '1000 x 700', 'Initial window size'], ['webPreferences.preload', 'preload.js', 'Exposes safe IPC bridge'], ['contextIsolation', 'true', 'Recommended default']],
        'const win = new BrowserWindow({ width: 1000, height: 700, webPreferences: { preload: path.join(__dirname, "preload.js") } }); win.loadFile("index.html");', 'main.js excerpt', ILLUS),
      M(2, 'pw', 'win', 'CDP', 'Target.attachedToTarget { type: "page" }', 'attach page', '~320 B',
        'Chromium reports the new window as a page target and Playwright attaches to it.',
        [['WebSocket frame', 6, 'header'], ['CDP event', 94, 'Target.attachedToTarget']],
        [['sessionId', '8F3A...', 'Session used for all further commands'], ['targetInfo.type', 'page', 'Window content'], ['targetInfo.url', 'file:///C:/app/index.html', 'What the window loaded']],
        '{"method":"Target.attachedToTarget","params":{"sessionId":"8F3A2C","targetInfo":{"targetId":"A1B2","type":"page","title":"Notes","url":"file:///C:/app/index.html","attached":true},"waitingForDebugger":false}}', 'CDP event (JSON)', ILLUS),
      M(2, 'pw', 'test', 'WS', 'firstWindow() resolves with Page', 'Page', '-',
        'The Playwright driver completes the pending firstWindow() promise.',
        [['Driver message', 60, 'result object'], ['Page guid', 40, 'page@...']],
        [['Resolved value', 'Page', 'Normal Playwright Page object'], ['Title', '"Notes"', 'window.title()'], ['Event', '"window"', 'Also emitted on ElectronApplication']],
        '{"id":12,"result":{"page":{"guid":"page@7c1e"}}}', 'Driver response', ILLUS),
      M(3, 'win', 'dom', 'CDP', 'Input.dispatchMouseEvent (click New note)', 'click', '~210 B',
        'Playwright clicks the button inside the renderer exactly like in a browser.',
        [['Frame', 6, 'header'], ['CDP JSON', 94, 'mouse press/release']],
        [['x, y', '412, 96', 'Centre of the button box'], ['type', 'mousePressed / mouseReleased', 'Two commands'], ['button', 'left', 'Primary button']],
        '{"id":41,"method":"Input.dispatchMouseEvent","params":{"type":"mousePressed","x":412,"y":96,"button":"left","clickCount":1}}', 'CDP message (JSON)', ILLUS),
      M(3, 'dom', 'win', 'UI', 'List shows 1 note item', 'UI updated', '-',
        'The app reacts: a list item appears, which expect().toHaveCount(1) waits for.',
        [['DOM change', 70, 'li added'], ['Repaint', 30, 'frame']],
        [['Selector', 'role=listitem', 'Assertion target'], ['Count', '1', 'Expected value'], ['Polling', 'until 5 s', 'expect timeout default']],
        '<ul id="notes"><li>Untitled note</li></ul>', 'DOM after click', ILLUS),
      M(4, 'win', 'pw', 'CDP', 'Page.captureScreenshot { format: "png" }', 'screenshot', '~48 KB',
        'Renderer pixels come back as base64 and Playwright writes home.png.',
        [['CDP result', 15, 'JSON envelope'], ['PNG data', 85, 'base64']],
        [['format', 'png', 'Lossless image'], ['clip', 'viewport', 'Web content only, no OS chrome'], ['data', 'iVBORw0KGgo...', 'Base64 PNG']],
        '{"id":58,"result":{"data":"iVBORw0KGgoAAAANSUhEUgAA..."}}', 'CDP result (truncated)', ILLUS),
      M(4, 'pw', 'proc', 'CLI', 'electronApp.close() -> app.quit() then kill', 'close', '-',
        'Closing asks the app to quit and terminates the process if it does not exit.',
        [['Quit request', 50, 'app.quit()'], ['Process wait', 50, 'exit code']],
        [['Graceful', 'app.quit()', 'Fires before-quit handlers'], ['Fallback', 'SIGKILL', 'If the process hangs'], ['Exit code', '0', 'Normal exit']],
        'Process 18244 exited with code 0', 'Process log', ILLUS)
    ]
  };

  /* ------------------------------------------------------------------ 2 */
  var electronIpc = {
    id: 'desktop-electron-ipc',
    platform: 'desktop',
    level: 3,
    title: 'Electron main process & IPC',
    subtitle: 'evaluate in main, renderer and ipcMain',
    tags: ['electron', 'ipc', 'ipcMain', 'ipcRenderer', 'evaluate', 'dialog', 'main-process'],
    overview: {
      text: 'An Electron app has two worlds. The renderer is a web page; the main process is Node.js with access to the file system, native dialogs and every BrowserWindow. Playwright reaches both: page.evaluate() runs in the renderer, electronApp.evaluate() runs in the main process with the electron module injected. Together they let a test mock native dialogs, read app paths and verify an ipcRenderer to ipcMain round trip without touching the OS UI.',
      facts: [
        ['Main-process API', 'electronApp.evaluate(fn)'],
        ['Renderer API', 'page.evaluate(fn)'],
        ['Injected arg', '{ app, BrowserWindow, dialog, ... }'],
        ['Native dialogs', 'Mock them in main, never click'],
        ['Language', 'Node.js / TypeScript only']
      ],
      caveat: 'Electron support is experimental and Node.js-only; there is no Java API. Serialisation limits apply: only JSON-like values cross evaluate().',
      guide: 'evaluating'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'ipc.spec.ts', icon: 'terminal', x: 120, y: 300, layer: 1 },
      { id: 'pw', label: 'Playwright', sub: 'ElectronApplication', icon: 'plug', x: 330, y: 170, layer: 2 },
      { id: 'main', label: 'Main process', sub: 'ipcMain, dialog, fs', icon: 'chip', x: 560, y: 170, layer: 3 },
      { id: 'pre', label: 'Preload bridge', sub: 'contextBridge', icon: 'gear', x: 560, y: 400, layer: 3 },
      { id: 'win', label: 'Renderer', sub: 'BrowserWindow page', icon: 'browser', x: 790, y: 290, layer: 4 },
      { id: 'os', label: 'OS dialog', sub: 'native file chooser', icon: 'laptop', x: 330, y: 420, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process' },
      { a: 'pw', b: 'main', label: 'Node inspector' },
      { a: 'pw', b: 'win', label: 'CDP' },
      { a: 'win', b: 'pre', label: 'window.api' },
      { a: 'pre', b: 'main', label: 'ipcRenderer.invoke' },
      { a: 'main', b: 'os', label: 'dialog.showOpenDialog' }
    ],
    steps: [
      {
        title: 'Evaluate in main', sub: 'electronApp.evaluate()',
        text: 'electronApp.evaluate(fn, arg) serialises your function, sends it to the main process over the Node inspector and runs it there. The first parameter is the electron module, so you can destructure app, BrowserWindow, dialog and friends. Only the return value must be serialisable.',
        focus: 'pw', highlight: ['main', 'test'], bubble: 'evaluate(({ app }) => app.getPath("userData"))',
        facts: [['Runs in', 'Main process (Node.js)'], ['First param', 'electron module'], ['Returns', 'JSON-serialisable value']],
        code: {
          ts: `import { test, expect, _electron as electron } from '@playwright/test';

test('reads app paths', async () => {
  const app = await electron.launch({ args: ['.'] });
  const userData = await app.evaluate(({ app }) => app.getPath('userData'));
  const version = await app.evaluate(({ app }) => app.getVersion());
  expect(userData).toContain('MyApp');
  expect(version).toBe('1.4.0');
  await app.close();
});`,
          java: null,
          javaNote: 'ElectronApplication does not exist in Playwright Java. Alternatives: expose a test-only HTTP/IPC endpoint from the app and call it with Java HTTP client, or use Selenium + chromedriver for the renderer only.'
        },
        guide: 'evaluating'
      },
      {
        title: 'Main window handle', sub: 'evaluate with BrowserWindow',
        text: 'electronApp.browserWindow(page) returns a JSHandle to the BrowserWindow behind a Page, letting you read or change native window state such as bounds, maximised or always-on-top. electronApp.windows() lists all open pages, which is how you find secondary windows.',
        focus: 'main', highlight: ['pw', 'win'], bubble: 'browserWindow(page).evaluate(w => w.getBounds())',
        facts: [['Handle', 'JSHandle<BrowserWindow>'], ['List', 'electronApp.windows()'], ['Event', 'on("window")']],
        code: {
          ts: `import { test, expect, _electron as electron } from '@playwright/test';

test('window state', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  const win = await app.browserWindow(page);
  const bounds = await win.evaluate(w => w.getBounds());
  expect(bounds.width).toBeGreaterThan(800);
  console.log('windows open:', app.windows().length);
  await app.close();
});`,
          java: null,
          javaNote: 'No Java API. Native window size is outside the Page object in Java; use Appium/UI Automation for OS-level window state.'
        }
      },
      {
        title: 'Renderer evaluate', sub: 'page.evaluate in the web page',
        text: 'page.evaluate() runs inside the renderer, so it sees window, document and anything exposed by the preload script (contextBridge puts it on window.api). With contextIsolation on, Node globals such as require are not available there, which is intentional.',
        focus: 'win', highlight: ['pre'], bubble: 'page.evaluate(() => window.api.version())',
        facts: [['Runs in', 'Renderer (isolated world)'], ['Sees', 'window, document, window.api'], ['No access to', 'require, process (isolated)']],
        code: {
          ts: `import { test, expect, _electron as electron } from '@playwright/test';

test('renderer bridge', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  const hasRequire = await page.evaluate(() => typeof require);
  const pong = await page.evaluate(() => (window as any).api.ping());
  expect(hasRequire).toBe('undefined');
  expect(pong).toBe('pong');
  await app.close();
});`,
          java: null,
          javaNote: 'In Java, page.evaluate("() => window.api.ping()") works on a page obtained via connectOverCDP to the renderer only.'
        },
        note: 'If window.api is undefined the preload script failed to load; check webPreferences.preload path and the renderer console.'
      },
      {
        title: 'ipcRenderer round trip', sub: 'invoke -> ipcMain.handle -> result',
        text: 'The page calls window.api.readConfig(), the preload forwards it with ipcRenderer.invoke("config:read"), and ipcMain.handle in the main process answers. A test can trigger it from the UI and then assert on the result, or call the handler directly with electronApp.evaluate to isolate each side.',
        focus: 'pre', highlight: ['win', 'main'], bubble: 'ipcRenderer.invoke("config:read")',
        facts: [['Pattern', 'invoke / handle (async)'], ['Channel', '"config:read"'], ['Transport', 'Chromium Mojo IPC, not network']],
        code: {
          ts: `import { test, expect, _electron as electron } from '@playwright/test';

test('ipc round trip', async () => {
  const app = await electron.launch({ args: ['.'] });
  const page = await app.firstWindow();
  const cfg = await page.evaluate(() => (window as any).api.readConfig());
  expect(cfg.theme).toBe('dark');
  const seen = await app.evaluate(({ ipcMain }) => ipcMain.eventNames().map(String));
  expect(seen).toContain('config:read');
  await app.close();
})`,
          java: null,
          javaNote: 'IPC is internal to Electron; Java has no Electron hook. Test the same channel through the UI with connectOverCDP or via an HTTP test endpoint.'
        },
        note: 'ipcMain.eventNames() lists handlers registered with .on(); handlers registered with .handle() are tracked separately, so prefer asserting on behaviour.'
      },
      {
        title: 'Mock native dialog', sub: 'stub dialog.showOpenDialog in main',
        text: 'A native file chooser cannot be clicked by Playwright because it lives outside the page. Instead, replace dialog.showOpenDialog in the main process with a stub that returns a fixed path, then click "Open" in the UI. The app receives the canned answer and the test stays deterministic and headless.',
        focus: 'main', highlight: ['os', 'pw'], bubble: 'dialog.showOpenDialog = stub',
        facts: [['Technique', 'Monkey-patch dialog in main'], ['Why', 'OS dialogs are not DOM'], ['Scope', 'Per launched app instance']],
        code: {
          ts: `import { test, expect, _electron as electron } from '@playwright/test';

test('open file with mocked dialog', async () => {
  const app = await electron.launch({ args: ['.'] });
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [filePath] });
  }, 'C:\\\\data\\\\sample.txt');
  const page = await app.firstWindow();
  await page.getByRole('button', { name: 'Open file' }).click();
  await expect(page.getByTestId('file-name')).toHaveText('sample.txt');
  await app.close();
});`,
          java: null,
          javaNote: 'Not possible in Java with Playwright. For real native dialogs use Appium (Windows/Mac2 driver) to interact with the OS file chooser.'
        },
        note: 'The stub must match the real return shape ({ canceled, filePaths }); otherwise the app code throws in a confusing way.'
      }
    ],
    messages: [
      M(0, 'test', 'pw', 'CLI', 'app.evaluate(({ app }) => app.getPath("userData"))', 'evaluate', '~120 B',
        'Test hands a function to ElectronApplication for execution in the main process.',
        [['Function source', 70, 'serialised as string'], ['Arg', 30, 'optional JSON']],
        [['fn', '({ app }) => app.getPath("userData")', 'Receives the electron module'], ['arg', 'undefined', 'Optional serialisable argument'], ['Target', 'main process', 'Not the page']],
        'electronApp.evaluate(({ app }) => app.getPath("userData"))', 'API call', ILLUS),
      M(0, 'pw', 'main', 'WS', 'Runtime.callFunctionOn (Node inspector)', 'run in main', '~260 B',
        'Playwright forwards the function over the Node inspector to the main process.',
        [['WebSocket frame', 6, 'header'], ['Inspector JSON', 94, 'callFunctionOn']],
        [['method', 'Runtime.callFunctionOn', 'Run a function with arguments'], ['functionDeclaration', '(electron) => ...', 'Wrapper that injects electron'], ['returnByValue', 'true', 'Result copied back as JSON']],
        '{"id":7,"method":"Runtime.callFunctionOn","params":{"functionDeclaration":"(e,a)=>(({app})=>app.getPath(\\"userData\\"))(e,a)","returnByValue":true,"awaitPromise":true}}', 'Inspector message', ILLUS),
      M(0, 'main', 'pw', 'WS', 'result: "C:\\\\Users\\\\qa\\\\AppData\\\\Roaming\\\\MyApp"', 'result', '~150 B',
        'The main process returns the path as a plain string.',
        [['Envelope', 30, 'id, result'], ['Value', 70, 'string']],
        [['type', 'string', 'JSON-compatible value'], ['value', 'C:\\Users\\qa\\AppData\\Roaming\\MyApp', 'app.getPath("userData")'], ['id', '7', 'Matches the request']],
        '{"id":7,"result":{"result":{"type":"string","value":"C:\\\\Users\\\\qa\\\\AppData\\\\Roaming\\\\MyApp"}}}', 'Inspector result', ILLUS),
      M(1, 'pw', 'main', 'WS', 'browserWindow(page).evaluate(w => w.getBounds())', 'getBounds', '~230 B',
        'A JSHandle to the BrowserWindow is used to read native window geometry.',
        [['Handle id', 25, 'objectId'], ['Function', 75, 'getBounds()']],
        [['Handle', 'JSHandle<BrowserWindow>', 'Remote reference in main'], ['Result', '{x:60,y:40,width:1000,height:700}', 'Window rectangle in DIPs'], ['Page link', 'webContents.id', 'Maps a Page to its window']],
        '{"id":9,"method":"Runtime.callFunctionOn","params":{"objectId":"-12.3","functionDeclaration":"w=>w.getBounds()","returnByValue":true}}', 'Inspector message', ILLUS),
      M(2, 'test', 'win', 'CDP', 'Runtime.evaluate: typeof require / window.api.ping()', 'page.evaluate', '~200 B',
        'Renderer-side evaluate shows what the web page can see (isolated world).',
        [['Frame', 6, 'header'], ['CDP JSON', 94, 'Runtime.evaluate']],
        [['expression', '(() => typeof require)()', 'Returns "undefined" with contextIsolation'], ['contextId', '3', 'Playwright utility/main world'], ['returnByValue', 'true', 'Copy value back']],
        '{"id":22,"method":"Runtime.evaluate","params":{"expression":"typeof require","contextId":3,"returnByValue":true}}', 'CDP message', ILLUS),
      M(3, 'win', 'pre', 'IPC', 'window.api.readConfig() -> ipcRenderer.invoke("config:read")', 'invoke', '~60 B',
        'The page calls the function exposed by the preload through contextBridge.',
        [['Bridge call', 40, 'window.api'], ['IPC send', 60, 'channel + args']],
        [['Channel', 'config:read', 'String name used by both sides'], ['Args', '[]', 'No arguments'], ['Mode', 'invoke', 'Returns a Promise']],
        'contextBridge.exposeInMainWorld("api", { readConfig: () => ipcRenderer.invoke("config:read") })', 'preload.js excerpt', ILLUS),
      M(3, 'pre', 'main', 'IPC', 'ipcMain.handle("config:read") -> { theme: "dark" }', 'handle', '~40 B',
        'The main process handler returns data which flows back to the page.',
        [['IPC request', 40, 'channel'], ['IPC reply', 60, 'serialised object']],
        [['Handler', 'ipcMain.handle', 'Registered once at startup'], ['Return', '{ theme: "dark" }', 'Structured-clone serialised'], ['Security', 'validate sender', 'Check event.senderFrame in real apps']],
        'ipcMain.handle("config:read", async () => ({ theme: "dark", lang: "en" }))', 'main.js excerpt', ILLUS),
      M(4, 'test', 'pw', 'CLI', 'app.evaluate(({ dialog }, p) => { dialog.showOpenDialog = stub })', 'mock dialog', '~210 B',
        'Test patches the dialog module before the UI is used.',
        [['Function', 65, 'assigns stub'], ['Arg', 35, 'file path']],
        [['dialog', 'electron.dialog', 'Module object, writable in main'], ['stub return', '{canceled:false, filePaths:[...]}', 'Same shape as real API'], ['arg', 'C:\\data\\sample.txt', 'Passed as JSON']],
        'app.evaluate(({ dialog }, p) => { dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [p] }); }, "C:\\\\data\\\\sample.txt")', 'API call', ILLUS),
      M(4, 'win', 'main', 'IPC', 'click "Open file" -> ipcRenderer.invoke("file:open")', 'file:open', '~50 B',
        'The UI asks main to open a dialog; the stub answers instantly.',
        [['IPC request', 50, 'file:open'], ['Reply', 50, 'path list']],
        [['Trigger', 'getByRole("button", {name:"Open file"})', 'Playwright click'], ['Dialog call', 'dialog.showOpenDialog(win, opts)', 'Now stubbed'], ['Reply', '["C:\\\\data\\\\sample.txt"]', 'Deterministic']],
        '{"canceled":false,"filePaths":["C:\\\\data\\\\sample.txt"]}', 'Stub result', ILLUS),
      M(4, 'main', 'os', 'UI', 'Real native dialog is never shown', 'skipped', '-',
        'Because the stub replaces showOpenDialog, no OS window appears and the test cannot hang on it.',
        [['Real dialog', 50, 'bypassed'], ['Test time', 50, 'saved']],
        [['Without mock', 'test blocks', 'No DOM for Playwright to click'], ['With mock', 'instant', 'Value injected from main'], ['Alternative', 'Appium', 'Use a native-UI tool if the real dialog must be tested']],
        'dialog.showOpenDialog -> [mock] returned without UI', 'Behaviour note', ILLUS)
    ]
  };

  /* ------------------------------------------------------------------ 3 */
  var webview2 = {
    id: 'desktop-webview2',
    platform: 'desktop',
    level: 3,
    title: 'WebView2 (Windows) via CDP',
    subtitle: 'Attach to an Edge-based control with connectOverCDP',
    tags: ['webview2', 'cdp', 'connectOverCDP', 'windows', 'edge', 'remote-debugging-port', 'wpf', 'winforms'],
    overview: {
      text: 'Microsoft Edge WebView2 is a control that lets WinForms, WPF or WinUI apps embed Chromium-based web content. Because it is Chromium, it can accept CDP connections. If you start the app with the WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS environment variable set to --remote-debugging-port=9222, Playwright can attach with chromium.connectOverCDP and test the embedded page like any other web page, in both Node.js and Java.',
      facts: [
        ['Env var', 'WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'],
        ['Flag', '--remote-debugging-port=9222'],
        ['Isolation', 'WEBVIEW2_USER_DATA_FOLDER per worker'],
        ['Attach API', 'chromium.connectOverCDP(url)'],
        ['Languages', 'Node.js, Java, Python, .NET']
      ],
      caveat: 'This tests only the web content inside the control. Native WinForms/WPF controls around it are not reachable; use Appium Windows driver for those. CDP connections have lower fidelity than a Playwright-launched browser.',
      guide: 'webview2'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'webview.spec.ts / Java', icon: 'terminal', x: 120, y: 300, layer: 1 },
      { id: 'pw', label: 'Playwright', sub: 'connectOverCDP', icon: 'plug', x: 330, y: 170, layer: 2 },
      { id: 'app', label: 'Windows app', sub: 'WPF / WinForms .exe', icon: 'app', x: 330, y: 420, layer: 3 },
      { id: 'wv', label: 'WebView2 runtime', sub: 'msedgewebview2.exe', icon: 'cube', x: 580, y: 330, layer: 4 },
      { id: 'cdp', label: 'CDP endpoint', sub: 'localhost:9222', icon: 'server', x: 580, y: 140, layer: 3 },
      { id: 'page', label: 'Embedded page', sub: 'https://app.example', icon: 'doc', x: 810, y: 300, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process' },
      { a: 'test', b: 'app', label: 'start with env' },
      { a: 'app', b: 'wv', label: 'hosts' },
      { a: 'wv', b: 'cdp', label: 'opens debug port' },
      { a: 'pw', b: 'cdp', label: 'HTTP + WebSocket' },
      { a: 'wv', b: 'page', label: 'renders' }
    ],
    steps: [
      {
        title: 'Start app with port', sub: 'env var enables CDP',
        text: 'Before the app starts, the test sets WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222. The WebView2 runtime appends those arguments to the Chromium command line it launches. For parallel runs also set WEBVIEW2_USER_DATA_FOLDER to a unique folder, otherwise all instances share one profile and one port.',
        focus: 'test', highlight: ['app'], bubble: 'WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS',
        facts: [['Env var', 'WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS'], ['Value', '--remote-debugging-port=9222'], ['Profile', 'WEBVIEW2_USER_DATA_FOLDER'], ['Alternative', 'CoreWebView2EnvironmentOptions.AdditionalBrowserArguments']],
        code: {
          ts: `import { spawn } from 'child_process';

const app = spawn('C:\\\\apps\\\\MyWebView2App.exe', [], {
  env: {
    ...process.env,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: '--remote-debugging-port=9222',
    WEBVIEW2_USER_DATA_FOLDER: 'C:\\\\temp\\\\wv2-profile-0',
  },
});
app.stdout.on('data', d => console.log(String(d)));`,
          java: `import java.nio.file.Path;

ProcessBuilder pb = new ProcessBuilder("C:\\\\apps\\\\MyWebView2App.exe");
pb.environment().put("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
    "--remote-debugging-port=9222");
pb.environment().put("WEBVIEW2_USER_DATA_FOLDER",
    Path.of(System.getProperty("java.io.tmpdir"), "wv2-profile-0").toString());
Process process = pb.start();`
        },
        note: 'Fixed port 9222 collides when workers run in parallel; allocate a free port per worker (as the official docs do) and one user data folder each.',
        guide: 'webview2'
      },
      {
        title: 'WebView2 opens CDP', sub: 'Chromium listens on the port',
        text: 'When the control initialises (CoreWebView2InitializationCompleted), the embedded Chromium starts with the extra flag and begins listening on 127.0.0.1:9222. A good test waits for an app log line such as "WebView2 initialized" or polls /json/version before connecting, to avoid connection refused errors.',
        focus: 'wv', highlight: ['cdp', 'app'], bubble: 'DevTools listening on ws://127.0.0.1:9222',
        facts: [['Bind address', '127.0.0.1 (loopback)'], ['Discovery', 'GET /json/version'], ['Readiness', 'CoreWebView2InitializationCompleted']],
        note: 'Ship the env var only in test builds or CI; an open debugging port lets any local process control the app.'
      },
      {
        title: 'connectOverCDP', sub: 'attach Playwright to the port',
        text: 'chromium.connectOverCDP("http://localhost:9222") fetches the WebSocket URL from /json/version, opens it and attaches to the existing browser. It does not launch anything, so closing the Browser object only disconnects. WebView2 exposes its default context, which you reach with browser.contexts()[0].',
        focus: 'pw', highlight: ['cdp'], bubble: 'chromium.connectOverCDP("http://localhost:9222")',
        facts: [['Method', 'BrowserType.connectOverCDP'], ['Endpoint', 'http://localhost:9222'], ['Does not', 'launch or own the browser']],
        code: {
          ts: `import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages()[0];
  console.log('attached to', page.url());
  await browser.close();   // disconnects only
})();`,
          java: `import com.microsoft.playwright.*;

public class AttachWebView2 {
  public static void main(String[] args) {
    try (Playwright playwright = Playwright.create()) {
      Browser browser = playwright.chromium().connectOverCDP("http://localhost:9222");
      BrowserContext context = browser.contexts().get(0);
      Page page = context.pages().get(0);
      System.out.println("attached to " + page.url());
    }
  }
}`
        },
        guide: 'webview2'
      },
      {
        title: 'Find the page', sub: 'contexts()[0].pages()',
        text: 'The default context holds one Page per WebView2 control. If the app has several controls, pick the right one by URL or title rather than index. Pages that open after attaching are announced with the context "page" event, so you can also wait for them.',
        focus: 'page', highlight: ['wv', 'pw'], bubble: 'context.pages()',
        facts: [['Context', 'browser.contexts()[0]'], ['Pages', 'one per WebView2 control'], ['Wait for new', 'context.waitForEvent("page")']],
        code: {
          ts: `import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const context = browser.contexts()[0];
  const page = context.pages().find(p => p.url().includes('app.example'))
    ?? await context.waitForEvent('page');
  await page.waitForLoadState('domcontentloaded');
  console.log(await page.title());
})();`,
          java: `import com.microsoft.playwright.*;

try (Playwright playwright = Playwright.create()) {
  Browser browser = playwright.chromium().connectOverCDP("http://localhost:9222");
  BrowserContext context = browser.contexts().get(0);
  Page page = context.pages().stream()
      .filter(p -> p.url().contains("app.example"))
      .findFirst()
      .orElseGet(() -> context.waitForPage(() -> {}));
  page.waitForLoadState();
  System.out.println(page.title());
}`
        },
        note: 'contexts() may be empty if you connect before the control finished initialising; retry or wait for the app readiness signal.'
      },
      {
        title: 'Test the embedded UI', sub: 'normal locators and assertions',
        text: 'From here the page behaves like any Chromium page: getByRole, auto-waiting, expect assertions, route mocking and screenshots work. Native chrome around the WebView2 (menus, title bar) is not part of the page and is not visible in page.screenshot().',
        focus: 'test', highlight: ['page', 'pw'], bubble: 'expect(page.getByRole("heading")).toBeVisible()',
        facts: [['Works', 'locators, expect, route, tracing'], ['Not captured', 'native window frame'], ['Cleanup', 'kill the app process']],
        code: {
          ts: `import { test, expect, chromium } from '@playwright/test';

test('embedded dashboard', async () => {
  const browser = await chromium.connectOverCDP('http://localhost:9222');
  const page = browser.contexts()[0].pages()[0];
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await page.getByRole('button', { name: 'Refresh' }).click();
  await expect(page.getByTestId('last-updated')).not.toBeEmpty();
  await browser.close();
});`,
          java: `import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;
import com.microsoft.playwright.*;
import com.microsoft.playwright.options.AriaRole;

Browser browser = playwright.chromium().connectOverCDP("http://localhost:9222");
Page page = browser.contexts().get(0).pages().get(0);
assertThat(page.getByRole(AriaRole.HEADING,
    new Page.GetByRoleOptions().setName("Dashboard"))).isVisible();
page.getByRole(AriaRole.BUTTON, new Page.GetByRoleOptions().setName("Refresh")).click();
assertThat(page.getByTestId("last-updated")).not().isEmpty();
browser.close();`
        }
      }
    ],
    messages: [
      M(0, 'test', 'app', 'CLI', 'CreateProcess MyWebView2App.exe + env WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', 'start app', '~220 B',
        'The test starts the Windows app with environment variables that configure WebView2.',
        [['Executable', 40, 'MyWebView2App.exe'], ['Environment', 60, 'two WEBVIEW2_* vars']],
        [['WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS', '--remote-debugging-port=9222', 'Extra Chromium command-line switch'], ['WEBVIEW2_USER_DATA_FOLDER', 'C:\\temp\\wv2-profile-0', 'Unique profile per worker'], ['stdout', 'WebView2 initialized', 'Readiness line printed by the app']],
        'set WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=9222\nset WEBVIEW2_USER_DATA_FOLDER=C:\\temp\\wv2-profile-0\nMyWebView2App.exe', 'Shell equivalent', ILLUS),
      M(1, 'app', 'wv', 'IPC', 'EnsureCoreWebView2Async(env) -> spawn msedgewebview2.exe', 'init control', '-',
        'The app initialises the control; the runtime starts browser processes.',
        [['API call', 50, 'EnsureCoreWebView2Async'], ['Browser args', 50, 'incl. debugging port']],
        [['Runtime', 'Evergreen WebView2', 'Updated independently of the app'], ['Process', 'msedgewebview2.exe', 'Browser process of the control'], ['Args', '--remote-debugging-port=9222', 'Taken from env var or options']],
        'msedgewebview2.exe --embedded-browser-webview=1 --webview-exe-name=MyWebView2App.exe --remote-debugging-port=9222 --user-data-dir="C:\\temp\\wv2-profile-0\\EBWebView"', 'Chromium command line', ILLUS),
      M(1, 'wv', 'cdp', 'HTTP', 'DevTools listening on ws://127.0.0.1:9222/devtools/browser/<uuid>', 'listening', '~110 B',
        'Chromium opens the debugging endpoint on loopback.',
        [['HTTP server', 40, '127.0.0.1:9222'], ['Browser WS path', 60, '/devtools/browser/uuid']],
        [['Host', '127.0.0.1', 'Loopback only by default'], ['Port', '9222', 'From the flag'], ['Endpoints', '/json/version, /json/list', 'Discovery over HTTP']],
        'DevTools listening on ws://127.0.0.1:9222/devtools/browser/0b9f5a62-3e1c-4d52-b0e7-93f1c2a85e44', 'Chromium log', ILLUS),
      M(2, 'pw', 'cdp', 'HTTP', 'GET http://localhost:9222/json/version', 'discover', '~420 B',
        'Playwright discovers the browser WebSocket URL from the HTTP endpoint.',
        [['HTTP request', 20, 'GET'], ['JSON body', 80, 'Browser, webSocketDebuggerUrl']],
        [['Browser', 'Edg/131.0.2903.51', 'WebView2 runtime version'], ['Protocol-Version', '1.3', 'CDP version'], ['webSocketDebuggerUrl', 'ws://localhost:9222/devtools/browser/...', 'Where to connect']],
        '{"Browser":"Edg/131.0.2903.51","Protocol-Version":"1.3","webSocketDebuggerUrl":"ws://localhost:9222/devtools/browser/0b9f5a62-3e1c-4d52-b0e7-93f1c2a85e44"}', 'HTTP response (JSON)', ILLUS),
      M(2, 'pw', 'cdp', 'CDP', 'Target.setAutoAttach { autoAttach: true, flatten: true }', 'auto attach', '~160 B',
        'Over the WebSocket Playwright asks Chromium to attach to all existing targets.',
        [['WebSocket frame', 6, 'header'], ['CDP JSON', 94, 'setAutoAttach']],
        [['autoAttach', 'true', 'Attach to current and new targets'], ['flatten', 'true', 'Use sessionId on the same socket'], ['waitForDebuggerOnStart', 'false', 'No pause']],
        '{"id":1,"method":"Target.setAutoAttach","params":{"autoAttach":true,"waitForDebuggerOnStart":false,"flatten":true}}', 'CDP message', ILLUS),
      M(3, 'cdp', 'pw', 'CDP', 'Target.attachedToTarget { type: "page", url: "https://app.example/" }', 'page target', '~340 B',
        'The embedded page shows up as a page target in the default context.',
        [['WebSocket frame', 6, 'header'], ['CDP event', 94, 'attachedToTarget']],
        [['targetInfo.type', 'page', 'The WebView2 content'], ['browserContextId', 'default', 'Playwright maps it to contexts()[0]'], ['url', 'https://app.example/', 'Use it to select the page']],
        '{"method":"Target.attachedToTarget","params":{"sessionId":"D41C","targetInfo":{"targetId":"E7F0","type":"page","title":"Dashboard","url":"https://app.example/","browserContextId":"C0FFEE"}}}', 'CDP event', ILLUS),
      M(3, 'pw', 'test', 'WS', 'contexts()[0].pages() -> [Page]', 'Page', '-',
        'Playwright returns the Page wrapper to your test code.',
        [['Driver response', 70, 'page guid'], ['Metadata', 30, 'url, title']],
        [['contexts', '1', 'Default WebView2 context'], ['pages', '1', 'One control'], ['page.url()', 'https://app.example/', 'Current location']],
        '{"id":5,"result":{"context":"browser-context@1","pages":["page@a3"]}}', 'Driver response', ILLUS),
      M(4, 'test', 'page', 'CDP', 'Input.dispatchMouseEvent on "Refresh" button', 'click', '~210 B',
        'Clicks and assertions flow through CDP to the embedded page.',
        [['Frame', 6, 'header'], ['CDP JSON', 94, 'mouse events']],
        [['x, y', '620, 148', 'Centre of the Refresh button'], ['type', 'mousePressed', 'Then mouseReleased'], ['button', 'left', 'Primary']],
        '{"id":33,"method":"Input.dispatchMouseEvent","params":{"type":"mousePressed","x":620,"y":148,"button":"left","clickCount":1}}', 'CDP message', ILLUS),
      M(4, 'page', 'test', 'UI', 'Heading "Dashboard" visible, last-updated text filled', 'asserted', '-',
        'The assertion polls until the UI shows the new state.',
        [['DOM state', 60, 'text updated'], ['Assertion', 40, 'passes']],
        [['Locator', 'getByTestId("last-updated")', 'Target element'], ['Check', 'not empty', 'Auto-retrying assertion'], ['Timeout', '5 s', 'Default expect timeout']],
        '<span data-testid="last-updated">2026-11-14 09:12:03</span>', 'DOM after refresh', ILLUS)
    ]
  };

  /* ------------------------------------------------------------------ 4 */
  var chromeExt = {
    id: 'desktop-chrome-extension',
    platform: 'desktop',
    level: 3,
    title: 'Chrome extension testing',
    subtitle: 'Load an unpacked extension in Chromium',
    tags: ['chrome-extension', 'launchPersistentContext', 'service-worker', 'load-extension', 'manifest-v3', 'popup', 'headless'],
    overview: {
      text: 'Browser extensions run inside Chromium, so Playwright can test them if the browser is started with the extension side-loaded. Extensions only work in a persistent context launched with --disable-extensions-except and --load-extension. A Manifest V3 extension has a service worker; Playwright exposes it, and its URL contains the extension ID, which you then use to open chrome-extension://ID/popup.html and verify content scripts on normal pages.',
      facts: [
        ['Launch API', 'chromium.launchPersistentContext'],
        ['Flags', '--disable-extensions-except, --load-extension'],
        ['Headless', 'use channel "chromium" (new headless)'],
        ['Extension ID', 'serviceWorker.url().split("/")[2]'],
        ['Browser', 'Playwright Chromium (not Chrome/Edge)']
      ],
      caveat: 'Branded Google Chrome and Microsoft Edge removed the flags needed to side-load extensions, so use the Chromium bundled with Playwright. The official docs show JS and Python samples; the Java snippets here use the Java equivalents of the same APIs and were not copied from an official Java page.',
      guide: 'chrome-extensions'
    },
    nodes: [
      { id: 'test', label: 'Test code', sub: 'extension.spec.ts', icon: 'terminal', x: 120, y: 300, layer: 1 },
      { id: 'pw', label: 'Playwright', sub: 'launchPersistentContext', icon: 'plug', x: 340, y: 170, layer: 2 },
      { id: 'br', label: 'Chromium', sub: 'bundled build', icon: 'browser', x: 340, y: 420, layer: 4 },
      { id: 'sw', label: 'Extension SW', sub: 'background.js (MV3)', icon: 'gear', x: 590, y: 170, layer: 3 },
      { id: 'pop', label: 'Popup page', sub: 'chrome-extension://ID/popup.html', icon: 'app', x: 800, y: 300, layer: 5 },
      { id: 'web', label: 'Web page', sub: 'content script target', icon: 'doc', x: 590, y: 420, layer: 5 }
    ],
    links: [
      { a: 'test', b: 'pw', label: 'in-process' },
      { a: 'pw', b: 'br', label: 'CDP pipe' },
      { a: 'br', b: 'sw', label: 'loads extension' },
      { a: 'pw', b: 'sw', label: 'Worker object' },
      { a: 'br', b: 'pop', label: 'opens' },
      { a: 'br', b: 'web', label: 'injects content script' }
    ],
    steps: [
      {
        title: 'Launch persistent ctx', sub: 'load-extension flags',
        text: 'Extensions need a user data directory, so the test calls launchPersistentContext. Two args load the unpacked folder: --disable-extensions-except limits Chromium to your extension, --load-extension installs it. Setting channel "chromium" selects the new headless mode, which supports extensions; the old headless did not.',
        focus: 'pw', highlight: ['br', 'test'], bubble: 'launchPersistentContext(dir, { channel: "chromium" })',
        facts: [['Method', 'launchPersistentContext(userDataDir, opts)'], ['Channel', '"chromium" for headless'], ['Args', '--load-extension=<path>']],
        code: {
          ts: `import { chromium } from '@playwright/test';
import path from 'path';

const pathToExtension = path.join(__dirname, 'my-extension');
const context = await chromium.launchPersistentContext('', {
  channel: 'chromium',
  args: [
    \`--disable-extensions-except=\${pathToExtension}\`,
    \`--load-extension=\${pathToExtension}\`,
  ],
});`,
          java: `import com.microsoft.playwright.*;
import java.nio.file.Path;
import java.util.Arrays;

Path ext = Path.of("my-extension").toAbsolutePath();
BrowserContext context = playwright.chromium().launchPersistentContext(
    Path.of("target/user-data"),
    new BrowserType.LaunchPersistentContextOptions()
        .setChannel("chromium")
        .setArgs(Arrays.asList(
            "--disable-extensions-except=" + ext,
            "--load-extension=" + ext)));`
        },
        note: 'Pass an absolute path to the extension folder; relative paths resolve against Chromium\'s cwd and silently fail to load.',
        guide: 'chrome-extensions'
      },
      {
        title: 'Chromium loads it', sub: 'manifest.json parsed, SW registered',
        text: 'Chromium reads manifest.json, assigns the extension an ID derived from the path (for unpacked extensions without a key) and registers the MV3 background service worker. If the manifest is invalid the extension is skipped silently, so a missing worker is the first sign of a broken manifest.',
        focus: 'br', highlight: ['sw'], bubble: 'manifest_version: 3',
        facts: [['Manifest', 'manifest.json v3'], ['Background', 'service_worker: background.js'], ['ID source', 'path hash or manifest "key"']],
        note: 'Add a "key" to manifest.json if you need a stable extension ID across machines.'
      },
      {
        title: 'Find service worker', sub: 'serviceWorkers() or event',
        text: 'The service worker may already be running when the context is returned, or may start a moment later. The documented pattern reads context.serviceWorkers() first and falls back to waiting for the "serviceworker" event. The Worker URL looks like chrome-extension://abcdefghijklmnopabcdefghijklmnop/background.js.',
        focus: 'sw', highlight: ['pw'], bubble: 'context.waitForEvent("serviceworker")',
        facts: [['Sync list', 'context.serviceWorkers()'], ['Async wait', 'waitForEvent("serviceworker")'], ['MV2 instead', 'context.backgroundPages()']],
        code: {
          ts: `let [serviceWorker] = context.serviceWorkers();
if (!serviceWorker)
  serviceWorker = await context.waitForEvent('serviceworker');

console.log(serviceWorker.url());
// chrome-extension://<id>/background.js
const result = await serviceWorker.evaluate(() => chrome.runtime.getManifest().name);
console.log(result);`,
          java: `import com.microsoft.playwright.Worker;
import java.util.concurrent.*;

CompletableFuture<Worker> found = new CompletableFuture<>();
context.onServiceWorker(found::complete);
context.serviceWorkers().forEach(found::complete);
Worker serviceWorker = found.get(10, TimeUnit.SECONDS);
System.out.println(serviceWorker.url());
Object name = serviceWorker.evaluate("() => chrome.runtime.getManifest().name");
System.out.println(name);`
        },
        note: 'MV3 workers suspend after about 30 s idle; Playwright keeps the same Worker object alive, so a handle stays usable. The Java version registers onServiceWorker and also completes with already-running workers; it is built from the Java API names, not copied from an official Java page.'
      },
      {
        title: 'Derive the extension ID', sub: 'parse it from the worker URL',
        text: 'The extension ID is the host part of the service worker URL, so url().split("/")[2] gives it. Put this in a fixture so every test can use it. Never hard-code the ID unless the manifest has a fixed "key", otherwise tests break when the folder moves.',
        focus: 'test', highlight: ['sw'], bubble: 'url().split("/")[2]',
        facts: [['URL form', 'chrome-extension://ID/background.js'], ['ID length', '32 chars a-p'], ['Place', 'worker-scoped fixture']],
        code: {
          ts: `import { test as base, chromium, type BrowserContext } from '@playwright/test';

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  context: async ({}, use) => { /* launchPersistentContext as above */ },
  extensionId: async ({ context }, use) => {
    let [sw] = context.serviceWorkers();
    if (!sw) sw = await context.waitForEvent('serviceworker');
    await use(sw.url().split('/')[2]);
  },
});`,
          java: `String url = serviceWorker.url();
// chrome-extension://abcdefghijklmnopabcdefghijklmnop/background.js
String extensionId = url.split("/")[2];
System.out.println("Extension ID: " + extensionId);`
        }
      },
      {
        title: 'Open popup & test', sub: 'chrome-extension:// URL and content',
        text: 'With the ID, page.goto("chrome-extension://ID/popup.html") opens the popup as a regular tab you can drive with locators. To test the content script, visit a normal site and assert on the changes the extension injected. The browser action popup itself cannot be opened by clicking the toolbar icon, which is why testing it as a page is the standard approach.',
        focus: 'pop', highlight: ['web', 'br'], bubble: 'goto("chrome-extension://ID/popup.html")',
        facts: [['Popup URL', 'chrome-extension://ID/popup.html'], ['Toolbar icon', 'not clickable from Playwright'], ['Content script', 'assert on injected DOM']],
        code: {
          ts: `import { test, expect } from './fixtures';

test('popup page', async ({ page, extensionId }) => {
  await page.goto(\`chrome-extension://\${extensionId}/popup.html\`);
  await expect(page.locator('body')).toHaveText('my-extension popup');
});

test('content script', async ({ page }) => {
  await page.goto('https://example.com');
  await expect(page.locator('body')).toHaveText('Changed by my-extension');
});`,
          java: `import static com.microsoft.playwright.assertions.PlaywrightAssertions.assertThat;

Page page = context.newPage();
page.navigate("chrome-extension://" + extensionId + "/popup.html");
assertThat(page.locator("body")).hasText("my-extension popup");

page.navigate("https://example.com");
assertThat(page.locator("body")).hasText("Changed by my-extension");`
        },
        note: 'Because the extension loads asynchronously, the first navigation can occasionally race the content script; assert with auto-retrying expect, not a one-shot read.'
      }
    ],
    messages: [
      M(0, 'test', 'pw', 'CLI', 'chromium.launchPersistentContext(userDataDir, { channel: "chromium", args })', 'launch ctx', '-',
        'Test requests a persistent Chromium with the extension flags.',
        [['userDataDir', 20, 'profile folder'], ['channel', 20, '"chromium"'], ['args', 60, 'load-extension flags']],
        [['userDataDir', '"" (temp dir)', 'Empty string creates a temporary profile'], ['channel', 'chromium', 'Enables new headless with extension support'], ['args', '--disable-extensions-except, --load-extension', 'Side-load the unpacked folder']],
        'chromium.launchPersistentContext("", { channel: "chromium", args: ["--disable-extensions-except=C:/ext", "--load-extension=C:/ext"] })', 'API call', ILLUS),
      M(0, 'pw', 'br', 'CLI', 'chrome.exe --remote-debugging-pipe --user-data-dir --load-extension=C:\\ext --headless=new', 'spawn', '~400 B',
        'Playwright spawns Chromium and talks to it over a debugging pipe.',
        [['Binary', 25, 'chromium build'], ['Playwright flags', 35, 'pipe, no-first-run'], ['Extension flags', 40, 'load/disable']],
        [['--remote-debugging-pipe', 'fd 3/4', 'CDP transport without a TCP port'], ['--headless=new', 'new headless', 'Required for extensions headless'], ['--load-extension', 'C:\\ext', 'Unpacked extension folder']],
        'chrome.exe --remote-debugging-pipe --user-data-dir="C:\\Temp\\pw-1" --no-first-run --headless=new --disable-extensions-except=C:\\ext --load-extension=C:\\ext about:blank', 'Command line', ILLUS),
      M(1, 'br', 'sw', 'FS', 'read C:\\ext\\manifest.json, register service worker background.js', 'load manifest', '~1 KB',
        'Chromium parses the manifest and starts the extension service worker.',
        [['manifest.json', 60, 'read from disk'], ['SW registration', 40, 'background.js']],
        [['manifest_version', '3', 'Service worker model'], ['background.service_worker', 'background.js', 'Entry script'], ['action.default_popup', 'popup.html', 'Popup page']],
        '{"manifest_version":3,"name":"my-extension","version":"1.0","background":{"service_worker":"background.js"},"action":{"default_popup":"popup.html"},"content_scripts":[{"matches":["https://example.com/*"],"js":["content.js"]}]}', 'manifest.json', ILLUS),
      M(2, 'br', 'pw', 'CDP', 'Target.attachedToTarget { type: service_worker, url: chrome-extension://ID/... }', 'SW target', '~330 B',
        'The extension service worker is announced as a CDP target.',
        [['WebSocket/pipe frame', 6, 'transport'], ['CDP event', 94, 'attachedToTarget']],
        [['targetInfo.type', 'service_worker', 'Becomes a Playwright Worker'], ['url', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/background.js', 'Contains the ID'], ['sessionId', '5B02', 'Session for evaluate()']],
        '{"method":"Target.attachedToTarget","params":{"sessionId":"5B02","targetInfo":{"targetId":"9F3C","type":"service_worker","title":"","url":"chrome-extension://abcdefghijklmnopabcdefghijklmnop/background.js"}}}', 'CDP event', ILLUS),
      M(2, 'pw', 'test', 'WS', 'event "serviceworker" -> Worker', 'Worker', '-',
        'The driver emits the serviceworker event to the waiting test.',
        [['Event', 30, 'serviceworker'], ['Worker guid', 70, 'worker@...']],
        [['Event name', 'serviceworker', 'BrowserContext event'], ['Payload', 'Worker', 'Has url() and evaluate()'], ['Already running?', 'serviceWorkers() first', 'Avoids missing the event']],
        '{"guid":"browser-context@1","method":"serviceWorker","params":{"worker":{"guid":"worker@4d"}}}', 'Driver event', ILLUS),
      M(3, 'test', 'test', 'CLI', 'extensionId = serviceWorker.url().split("/")[2]', 'parse ID', '-',
        'Pure string work in the test: no network or browser call.',
        [['URL', 70, 'chrome-extension://ID/...'], ['Index 2', 30, 'host = ID']],
        [['url', 'chrome-extension://abcdefghijklmnopabcdefghijklmnop/background.js', 'Worker URL'], ['split("/")[2]', 'abcdefghijklmnopabcdefghijklmnop', 'Host part'], ['Stability', 'depends on path or key', 'Add "key" for a fixed ID']],
        'chrome-extension://abcdefghijklmnopabcdefghijklmnop/background.js -> abcdefghijklmnopabcdefghijklmnop', 'Parsing', ILLUS),
      M(4, 'test', 'pop', 'CDP', 'Page.navigate chrome-extension://ID/popup.html', 'open popup', '~190 B',
        'The popup HTML is opened in a normal tab so it can be tested with locators.',
        [['Frame', 6, 'header'], ['CDP JSON', 94, 'Page.navigate']],
        [['url', 'chrome-extension://ID/popup.html', 'Extension-origin page'], ['transitionType', 'typed', 'Like typing the URL'], ['frameId', 'F1', 'Top frame']],
        '{"id":31,"method":"Page.navigate","params":{"url":"chrome-extension://abcdefghijklmnopabcdefghijklmnop/popup.html","frameId":"F1"}}', 'CDP message', ILLUS),
      M(4, 'test', 'web', 'CDP', 'Page.navigate https://example.com (content script injected)', 'visit site', '~170 B',
        'Visiting a matching URL makes Chromium inject the extension content script.',
        [['Navigate', 40, 'example.com'], ['Content script', 60, 'content.js']],
        [['matches', 'https://example.com/*', 'From manifest content_scripts'], ['run_at', 'document_idle', 'Default injection time'], ['Result', 'body text changed', 'Observed by expect']],
        '{"id":32,"method":"Page.navigate","params":{"url":"https://example.com"}}', 'CDP message', ILLUS),
      M(4, 'web', 'pop', 'UI', 'Popup shows "my-extension popup"; page body "Changed by my-extension"', 'verified', '-',
        'Both assertions pass: popup UI and injected content are present.',
        [['Popup DOM', 50, 'body text'], ['Page DOM', 50, 'modified text']],
        [['Popup', 'my-extension popup', 'toHaveText'], ['Page', 'Changed by my-extension', 'Content script effect'], ['Timeout', '5 s', 'expect default']],
        '<body>my-extension popup</body>  |  <body>Changed by my-extension</body>', 'Observed DOM', ILLUS)
    ]
  };

  /* ------------------------------------------------------------------ 5 */
  var appium = {
    id: 'desktop-native-appium',
    platform: 'desktop',
    level: 2,
    title: 'Native Windows / macOS apps',
    subtitle: 'Playwright cannot; Appium can',
    tags: ['appium', 'winappdriver', 'mac2', 'native', 'windows', 'macos', 'tauri-driver', 'ui-automation', 'webdriverio'],
    overview: {
      text: 'Playwright drives browsers and Chromium-based shells over CDP. It cannot see native controls built with Win32, WPF, UWP, WinUI or Cocoa because those are not DOM. For true native desktop apps the correct architecture is: test client, Appium server, a platform driver (Windows driver using UI Automation, or Mac2 driver using XCTest), then the app. Tauri apps use the standard WebDriver protocol through tauri-driver.',
      facts: [
        ['Client protocol', 'W3C WebDriver over HTTP'],
        ['Windows driver', 'appium-windows-driver / WinAppDriver (UI Automation)'],
        ['macOS driver', 'appium-mac2-driver (XCTest)'],
        ['Tauri', 'tauri-driver (WebDriver)'],
        ['Server port', '4723 (Appium 2)']
      ],
      caveat: 'WinAppDriver is a separate Microsoft tool with limited maintenance; the Appium Windows driver can use it or work with its own approach. Check the current appium-windows-driver README for supported versions. Details here are illustrative and not tied to one release.',
      guide: 'f-mobile-appium-grid'
    },
    nodes: [
      { id: 'test', label: 'Test client', sub: 'Java client / WebdriverIO', icon: 'terminal', x: 110, y: 300, layer: 1 },
      { id: 'srv', label: 'Appium server', sub: 'localhost:4723', icon: 'server', x: 330, y: 170, layer: 3 },
      { id: 'win', label: 'Windows driver', sub: 'UI Automation / WinAppDriver', icon: 'plug', x: 560, y: 150, layer: 3 },
      { id: 'mac', label: 'Mac2 driver', sub: 'XCTest / WebDriverAgentMac', icon: 'chip', x: 560, y: 430, layer: 3 },
      { id: 'app', label: 'Native app', sub: 'Notepad / Calculator / Cocoa', icon: 'app', x: 800, y: 290, layer: 4 },
      { id: 'tauri', label: 'tauri-driver', sub: 'WebDriver proxy', icon: 'gear', x: 330, y: 420, layer: 3 }
    ],
    links: [
      { a: 'test', b: 'srv', label: 'W3C HTTP' },
      { a: 'srv', b: 'win', label: 'driver plugin' },
      { a: 'srv', b: 'mac', label: 'driver plugin' },
      { a: 'win', b: 'app', label: 'UI Automation' },
      { a: 'mac', b: 'app', label: 'XCTest / AX API' },
      { a: 'test', b: 'tauri', label: 'W3C HTTP (Tauri)' },
      { a: 'tauri', b: 'app', label: 'native webdriver' }
    ],
    steps: [
      {
        title: 'Why not Playwright', sub: 'DOM versus accessibility tree',
        text: 'Playwright talks to a browser engine and sees DOM elements. A native Windows button is a UI Automation element and a macOS button is an accessibility (AX) element; neither has a DOM or a CDP endpoint. A tool that speaks the native accessibility APIs is required, and in the WebDriver world that tool is Appium.',
        focus: 'test', highlight: ['app'], bubble: 'No DOM, no CDP',
        facts: [['Playwright sees', 'DOM via CDP / browser protocols'], ['Native apps expose', 'UI Automation (Win) / AX (macOS)'], ['Right tool', 'Appium']],
        note: 'Decision guide: web UI inside a desktop shell (Electron, WebView2, CEF with debug port) -> Playwright via CDP. True native controls (WPF, WinForms, UWP, Cocoa) -> Appium.'
      },
      {
        title: 'Start Appium', sub: 'server + install the driver',
        text: 'Appium 2 is a Node.js server that loads drivers as plugins. You install the driver once (appium driver install --source=npm appium-windows-driver, or mac2) and start the server on port 4723. The server then accepts W3C WebDriver requests from any language client.',
        focus: 'srv', highlight: ['win', 'mac'], bubble: 'appium  ->  listening on :4723',
        facts: [['Install', 'appium driver install ...'], ['Start', 'appium'], ['Port', '4723'], ['Docs', 'appium.io/docs/en/latest']],
        note: 'Windows driver requires Developer Mode enabled and, if using WinAppDriver, its server running on port 4724.'
      },
      {
        title: 'Create a session', sub: 'POST /session with capabilities',
        text: 'The client sends capabilities that name the platform and the app. For Windows, platformName is Windows, appium:automationName is Windows and appium:app is the executable or a UWP app ID such as Microsoft.WindowsCalculator_8wekyb3d8bbwe!App. The server picks the matching driver and launches the app.',
        focus: 'test', highlight: ['srv', 'win', 'app'], bubble: 'POST /session',
        facts: [['Windows caps', 'platformName, automationName, app'], ['Mac2 caps', 'appium:bundleId'], ['Protocol', 'W3C WebDriver REST']],
        code: {
          ts: `import { remote } from 'webdriverio';

const driver = await remote({
  hostname: '127.0.0.1',
  port: 4723,
  capabilities: {
    platformName: 'Windows',
    'appium:automationName': 'Windows',
    'appium:app': 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App',
  },
});
console.log(driver.sessionId);`,
          java: `import io.appium.java_client.windows.WindowsDriver;
import org.openqa.selenium.remote.DesiredCapabilities;
import java.net.URL;

DesiredCapabilities caps = new DesiredCapabilities();
caps.setCapability("platformName", "Windows");
caps.setCapability("appium:automationName", "Windows");
caps.setCapability("appium:app", "Microsoft.WindowsCalculator_8wekyb3d8bbwe!App");
WindowsDriver driver = new WindowsDriver(new URL("http://127.0.0.1:4723"), caps);
System.out.println(driver.getSessionId());`
        },
        note: 'Playwright launches and owns a browser; Appium launches the native app through the OS. Session creation is much slower (seconds) than a Playwright launch.'
      },
      {
        title: 'Find and act', sub: 'accessibility id -> UI Automation',
        text: 'Locators map to UI Automation properties: "accessibility id" is the AutomationId, "name" is the Name property, and "xpath" walks the UIA tree. The driver finds the element, then performs click or sendKeys through UI Automation patterns. On macOS the Mac2 driver does the same through XCTest.',
        focus: 'win', highlight: ['srv', 'app'], bubble: 'accessibility id = num7Button',
        facts: [['Best locator', 'accessibility id (AutomationId)'], ['Fallbacks', 'name, class name, xpath'], ['Inspector', 'Appium Inspector / Accessibility Insights']],
        code: {
          ts: `// continuing with the WebdriverIO driver above
await driver.$('~num7Button').click();
await driver.$('~plusButton').click();
await driver.$('~num8Button').click();
await driver.$('~equalButton').click();
const result = await driver.$('~CalculatorResults').getText();
console.log(result);   // "Display is 15"
await driver.deleteSession();`,
          java: `import org.openqa.selenium.By;
import io.appium.java_client.AppiumBy;

driver.findElement(AppiumBy.accessibilityId("num7Button")).click();
driver.findElement(AppiumBy.accessibilityId("plusButton")).click();
driver.findElement(AppiumBy.accessibilityId("num8Button")).click();
driver.findElement(AppiumBy.accessibilityId("equalButton")).click();
String text = driver.findElement(AppiumBy.accessibilityId("CalculatorResults")).getText();
System.out.println(text);   // Display is 15
driver.quit();`
        },
        note: 'Elements without an AutomationId force brittle xpath locators; ask developers to set AutomationProperties.AutomationId in WPF/UWP.'
      },
      {
        title: 'Tauri & macOS', sub: 'other desktop routes',
        text: 'Tauri apps embed the system webview, and the Tauri project ships tauri-driver, a cross-platform WebDriver wrapper around the native webdriver (msedgedriver on Windows, WebKitWebDriver on Linux). Your test uses plain WebDriver (WebdriverIO or Selenium) against it. macOS native apps use the Mac2 driver with appium:bundleId.',
        focus: 'tauri', highlight: ['test', 'app', 'mac'], bubble: 'tauri-driver on :4444',
        facts: [['Tauri', 'tauri-driver + native webdriver'], ['macOS', 'appium-mac2-driver, bundleId'], ['macOS note', 'Tauri WebDriver not supported on macOS (WKWebView)']],
        code: {
          ts: `import { remote } from 'webdriverio';

const driver = await remote({
  hostname: '127.0.0.1',
  port: 4444,                       // tauri-driver
  capabilities: {
    browserName: 'wry',
    'tauri:options': { application: 'C:\\app\\target\\debug\\my-tauri.exe' },
  },
});
console.log(await driver.getTitle());
await driver.deleteSession();`,
          java: `import org.openqa.selenium.remote.*;
import java.net.URL;
import java.util.Map;

DesiredCapabilities caps = new DesiredCapabilities();
caps.setBrowserName("wry");
caps.setCapability("tauri:options",
    Map.of("application", "C:\\app\\target\\debug\\my-tauri.exe"));
RemoteWebDriver driver = new RemoteWebDriver(new URL("http://127.0.0.1:4444"), caps);
System.out.println(driver.getTitle());
driver.quit();`
        },
        note: 'Per Tauri docs there is no WebDriver client for macOS WKWebView, so Tauri on macOS needs another approach; verify in the current Tauri docs.'
      }
    ],
    messages: [
      M(0, 'test', 'app', 'UI', 'Playwright: page.locator("#ok") -> no DOM, no CDP endpoint', 'not possible', '-',
        'A native app has no browser protocol endpoint, so Playwright has nothing to attach to.',
        [['Query', 50, 'DOM selector'], ['Target', 50, 'native control']],
        [['Playwright needs', 'CDP / browser protocol', 'Not offered by Win32/WPF/Cocoa'], ['App exposes', 'UIA / AX tree', 'Different API'], ['Use instead', 'Appium', 'Speaks UIA / XCTest']],
        'Error: browserType.connectOverCDP: connect ECONNREFUSED 127.0.0.1:9222', 'Typical failure', ILLUS),
      M(1, 'test', 'srv', 'CLI', 'appium driver install --source=npm appium-windows-driver; appium', 'start', '-',
        'Prepare the Appium server and its Windows driver.',
        [['Install', 50, 'driver plugin'], ['Start', 50, 'server']],
        [['Command', 'appium driver install', 'One-time driver install'], ['Server', 'appium', 'Listens on 4723'], ['Check', 'GET /status', 'Ready when ready:true']],
        '[Appium] Appium v2.x welcome\n[Appium] Available drivers: - windows (appium-windows-driver)\n[Appium] Appium REST http interface listener started on http://0.0.0.0:4723', 'Server log', ILLUS),
      M(2, 'test', 'srv', 'HTTP', 'POST /session { capabilities: { platformName: "Windows", app: ... } }', 'new session', '~420 B',
        'The client asks Appium for a new automation session.',
        [['HTTP headers', 25, 'POST /session'], ['JSON body', 75, 'W3C capabilities']],
        [['platformName', 'Windows', 'Selects the Windows driver'], ['appium:automationName', 'Windows', 'Driver name'], ['appium:app', 'Microsoft.WindowsCalculator_8wekyb3d8bbwe!App', 'App to launch (UWP AppID or .exe path)']],
        '{"capabilities":{"alwaysMatch":{"platformName":"Windows","appium:automationName":"Windows","appium:app":"Microsoft.WindowsCalculator_8wekyb3d8bbwe!App"}}}', 'POST body (JSON)', ILLUS),
      M(2, 'srv', 'win', 'IPC', 'createSession -> launch app via Windows driver', 'launch', '-',
        'Appium dispatches to the Windows driver which launches the application.',
        [['Driver call', 50, 'createSession'], ['Launch', 50, 'app start']],
        [['Driver', 'appium-windows-driver', 'Chosen by automationName'], ['Launch', 'AppID or exe path', 'OS activates the app'], ['Result', 'sessionId', 'Returned to client']],
        '{"value":{"sessionId":"b6f4c1d7-2a6e-4f31-9c1e-8a3d5e7b9012","capabilities":{"platformName":"windows"}}}', 'Session response', ILLUS),
      M(3, 'test', 'srv', 'HTTP', 'POST /session/{id}/element { using: "accessibility id", value: "num7Button" }', 'find element', '~160 B',
        'Client asks for an element by AutomationId.',
        [['HTTP', 30, 'POST'], ['JSON body', 70, 'strategy + value']],
        [['using', 'accessibility id', 'Appium locator strategy'], ['value', 'num7Button', 'AutomationId in UIA'], ['Response', 'element-6066-...', 'W3C element reference']],
        '{"using":"accessibility id","value":"num7Button"}', 'POST body', ILLUS),
      M(3, 'win', 'app', 'UI', 'UI Automation: FindFirst(AutomationId=num7Button) + InvokePattern.Invoke()', 'UIA invoke', '-',
        'The driver finds the control in the UI Automation tree and invokes it.',
        [['UIA query', 50, 'property condition'], ['Pattern call', 50, 'Invoke']],
        [['API', 'Windows UI Automation', 'Native accessibility framework'], ['Pattern', 'InvokePattern', 'Equivalent of a click for buttons'], ['Result', 'button pressed', 'Calculator shows 7']],
        'IUIAutomationElement::FindFirst(TreeScope_Descendants, AutomationId="num7Button") -> IUIAutomationInvokePattern::Invoke()', 'UIA call', ILLUS),
      M(3, 'srv', 'test', 'HTTP', '200 OK { value: "Display is 15" } (GET .../text)', 'text', '~70 B',
        'The result text is read back through the same chain.',
        [['HTTP status', 20, '200'], ['JSON', 80, 'value']],
        [['Endpoint', 'GET /session/{id}/element/{eid}/text', 'getText()'], ['value', 'Display is 15', 'UIA Name of the result element'], ['Status', '200', 'Success']],
        '{"value":"Display is 15"}', 'Response body', ILLUS),
      M(4, 'test', 'tauri', 'HTTP', 'POST http://127.0.0.1:4444/session (tauri-driver, WebDriver)', 'tauri session', '~380 B',
        'For a Tauri app the client speaks plain WebDriver to tauri-driver.',
        [['HTTP', 25, 'POST /session'], ['Caps', 75, 'tauri:options.application']],
        [['Port', '4444', 'tauri-driver default'], ['tauri:options.application', 'C:\\app\\target\\debug\\my-tauri.exe', 'Binary to run'], ['Backend', 'msedgedriver (Windows)', 'Native WebDriver behind it']],
        '{"capabilities":{"alwaysMatch":{"browserName":"wry","tauri:options":{"application":"C:\\\\app\\\\target\\\\debug\\\\my-tauri.exe"}}}}', 'POST body', ILLUS),
      M(4, 'test', 'mac', 'HTTP', 'POST /session { platformName: "mac", automationName: "Mac2", bundleId }', 'mac session', '~300 B',
        'For macOS native apps the same Appium server routes to the Mac2 driver.',
        [['HTTP', 25, 'POST'], ['Caps', 75, 'Mac2 + bundleId']],
        [['platformName', 'mac', 'Selects macOS'], ['appium:automationName', 'Mac2', 'XCTest-based driver'], ['appium:bundleId', 'com.apple.calculator', 'App to activate']],
        '{"capabilities":{"alwaysMatch":{"platformName":"mac","appium:automationName":"Mac2","appium:bundleId":"com.apple.calculator"}}}', 'POST body', ILLUS)
    ]
  };

  window.SCENARIOS.push(electronLaunch, electronIpc, webview2, chromeExt, appium);
})();
