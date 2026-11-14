# GameDeck (Electron sample)

A sample desktop game launcher used by the study book. The UI is plain HTML/CSS/JS (`index.html`);
Electron wraps it in a frameless window.

```
index.html            the whole UI (also opens in a normal browser; it then simulates the window controls)
electron/main.js      main process: creates the 1280x720 frameless window, handles minimize/maximize/close over IPC
electron/preload.js   exposes window.gdElectron (minimize, maximize, close, info) with contextIsolation on
tests/gamedeck.spec.ts  Playwright tests that launch the real Electron app with _electron.launch()
```

## Run

```bash
npm install
npm start          # opens the desktop app
npm test           # Playwright launches Electron and drives it
```

## How Playwright drives it

```ts
const app = await electron.launch({ args: ['.'] });   // starts Electron, attaches to the main process
const page = await app.firstWindow();                 // the renderer window is a normal Page
await page.getByRole('button', { name: 'Add a game' }).click();
const w = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds().width);  // main process
```

`_electron` is Node.js only (and still marked experimental). From Java, start Electron with
`electron . --remote-debugging-port=9222` and attach with `playwright.chromium().connectOverCDP("http://localhost:9222")`.

## Embed mode

`index.html?embed=1&fresh=1` renders maximised, hides the shortcut hint, starts from sample data and exposes a small
`postMessage` bridge. The Live Demo in the study book uses it to run the same locators against this UI inside an iframe.

> Note: the Electron shell (main.js/preload.js and the specs) has been written but not executed in the environment where
> this sample was generated; run `npm install && npm test` once to confirm on your machine.
