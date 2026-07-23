const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

const SERVER_PORT = 3000;
const SERVER_URL = 'http://localhost:' + SERVER_PORT;

function startServer() {
  return new Promise((resolve) => {
    const serverPath = path.join(__dirname, 'server', 'index.js');
    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: __dirname,
      stdio: 'pipe',
      env: { ...process.env, PORT: String(SERVER_PORT) }
    });

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[Server]', msg);
      if (msg.includes('running on port') || msg.includes('Serveur demarre')) {
        resolve();
      }
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('[Server]', data.toString());
    });

    serverProcess.on('error', (err) => {
      console.error('Failed to start server:', err);
    });

    setTimeout(resolve, 3000);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Gestion-Stock',
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    autoHideMenuBar: true,
    show: false
  });

  mainWindow.loadURL(SERVER_URL + '/dashboard.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  await startServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
