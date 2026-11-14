// Runs in the renderer before the page, with access to a small, explicit API surface.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gdElectron', {
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  close: () => ipcRenderer.send('win:close'),
  info: () => ipcRenderer.invoke('app:info')
});
