const { app, BrowserWindow, Menu, shell, ipcMain } = require('electron');
const path = require('path');

const isDev = process.argv.includes('--dev');
const API_URL = process.env.VISTA_API_URL || 'http://127.0.0.1:3001';
const WEB_URL = process.env.VISTA_WEB_URL || 'http://127.0.0.1:3000';

let mainWindow;
let splashWindow;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 320,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'VistA Evolved',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
    },
  });

  mainWindow.loadURL(`${WEB_URL}/cprs/vista-workspace`);

  mainWindow.webContents.on('did-finish-load', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function buildMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'New Patient Search', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.loadURL(`${WEB_URL}/patient-search`) },
        { type: 'separator' },
        { label: 'VistA Workspace', accelerator: 'CmdOrCtrl+W', click: () => mainWindow?.webContents.loadURL(`${WEB_URL}/cprs/vista-workspace`) },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(isDev ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },
    {
      label: 'Terminal',
      submenu: [
        { label: 'Roll & Scroll Terminal', accelerator: 'CmdOrCtrl+T', click: () => mainWindow?.webContents.executeJavaScript("document.querySelector('[data-mode=terminal]')?.click()") },
        { label: 'Hybrid Mode', accelerator: 'CmdOrCtrl+H', click: () => mainWindow?.webContents.executeJavaScript("document.querySelector('[data-mode=hybrid]')?.click()") },
        { label: 'Modern GUI', accelerator: 'CmdOrCtrl+G', click: () => mainWindow?.webContents.executeJavaScript("document.querySelector('[data-mode=gui]')?.click()") },
      ],
    },
    {
      label: 'Help',
      submenu: [
        { label: 'VistA Documentation', click: () => shell.openExternal('https://www.va.gov/vdl/') },
        { label: 'VistA Evolved Docs', click: () => shell.openExternal('https://github.com/YourOrg/VistA-Evolved') },
        { type: 'separator' },
        { label: `API: ${API_URL}`, enabled: false },
        { label: `Web: ${WEB_URL}`, enabled: false },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

ipcMain.handle('get-config', () => ({
  apiUrl: API_URL,
  webUrl: WEB_URL,
  isDev,
  version: app.getVersion(),
}));

app.whenReady().then(() => {
  createSplashWindow();
  buildMenu();
  setTimeout(createMainWindow, 500);
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (!mainWindow) createMainWindow(); });
