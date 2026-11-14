// Electron main process for GameDeck.
// The whole UI is the web page in ../index.html; the main process only owns the window.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    frame: false,                 // GameDeck draws its own title bar and window buttons
    backgroundColor: '#0d0f11',   // same colour as the page: no white flash at start-up
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,     // renderer cannot touch Node.js directly
      nodeIntegration: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.once('ready-to-show', () => win.show());
}

// Window controls requested by the renderer through the preload bridge
const winOf = (e) => BrowserWindow.fromWebContents(e.sender);
ipcMain.on('win:minimize', (e) => winOf(e)?.minimize());
ipcMain.on('win:maximize', (e) => { const w = winOf(e); if (w) (w.isMaximized() ? w.unmaximize() : w.maximize()); });
ipcMain.on('win:close', (e) => winOf(e)?.close());
ipcMain.handle('app:info', () => ({ version: app.getVersion(), electron: process.versions.electron, platform: process.platform }));

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
