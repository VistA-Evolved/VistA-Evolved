const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vistaDesktop', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  platform: process.platform,
  isElectron: true,
});
