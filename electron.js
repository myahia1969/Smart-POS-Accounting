/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * نظام المبيعات والمحاسبة الذكي - Smart POS & Accounting System
 * Electron Main Process (Desktop Wrapper & Process Manager) - Pure JavaScript for Electron runtime compatibility
 */

import { app, BrowserWindow, ipcMain, shell, Menu, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { fork } from 'child_process';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. DATA PATHS & LOGGING CONFIGURATION (التحدي الأول والثالث)
// ==========================================

/**
 * Determine the absolute safest, permanent data storage path for offline database and logs.
 * If running as a Windows Portable EXE from USB/Desktop, process.env.PORTABLE_EXECUTABLE_DIR is set by electron-builder.
 * We prioritize a local data folder next to the portable EXE for USB portability, otherwise standard appData/userData.
 * @returns {string} Safe storage directory path
 */
function resolvePermanentUserDataPath() {
  let storageDir;
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    // Portable Windows EXE mode: Store inside a permanent folder next to the .exe file
    storageDir = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'SmartPOS_Data');
  } else {
    // Standard installed desktop app mode: Store inside OS user data (C:\Users\<user>\AppData\Roaming\SmartPOS_Accounting)
    storageDir = path.join(app.getPath('userData'), 'SmartPOS_Data');
  }

  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }
  return storageDir;
}

const USER_DATA_PATH = resolvePermanentUserDataPath();
const APP_LOG_PATH = path.join(USER_DATA_PATH, 'app.log');

/**
 * Main Process Logger: Writes timestamped logs to external app.log file.
 * @param {'INFO'|'WARN'|'ERROR'} level
 * @param {string} message
 * @param {any} [meta]
 */
function logElectron(level, message, meta) {
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 23);
  const metaStr = meta ? ` | ${JSON.stringify(meta)}` : '';
  const logLine = `[${timestamp}] [ELECTRON-${level}] ${message}${metaStr}\n`;

  if (level === 'ERROR') console.error(logLine.trim());
  else if (level === 'WARN') console.warn(logLine.trim());
  else console.log(logLine.trim());

  try {
    fs.appendFileSync(APP_LOG_PATH, logLine, 'utf8');
  } catch (err) {
    console.error('Failed to append to log file:', err);
  }
}

logElectron('INFO', 'Electron Main Process Initialized', {
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,
  platform: process.platform,
  arch: process.arch,
  isPortable: !!process.env.PORTABLE_EXECUTABLE_DIR,
  userDataPath: USER_DATA_PATH,
  logPath: APP_LOG_PATH
});

// ==========================================
// 2. PROCESS MANAGEMENT & EXPRESS SERVER SPAWNING (التحدي الثاني)
// ==========================================

/** @type {import('child_process').ChildProcess | null} */
let serverProcess = null;
/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
const SERVER_PORT = 3000;
const SERVER_URL = `http://localhost:${SERVER_PORT}`;

/**
 * Spawns the bundled Express backend (dist/server.cjs) as a child process.
 * Passes the verified USER_DATA_PATH and APP_LOG_PATH via environment variables.
 * @returns {Promise<boolean>}
 */
function startExpressServer() {
  return new Promise((resolve, reject) => {
    // Check if dist/server.cjs exists (Production Bundle)
    const bundledServerPath = path.join(__dirname, 'dist', 'server.cjs');
    const devServerPath = path.join(__dirname, 'server.ts');
    
    let execPath;
    let execArgs = [];

    if (fs.existsSync(bundledServerPath)) {
      execPath = bundledServerPath;
      logElectron('INFO', `Spawning Production Bundled Server: ${execPath}`);
    } else if (fs.existsSync(devServerPath)) {
      // Fallback for local testing if not bundled yet
      execPath = devServerPath;
      execArgs = ['--loader', 'tsx'];
      logElectron('WARN', `Production bundle not found. Using dev server path: ${execPath}`);
    } else {
      const err = new Error('Server entry file not found! Please run npm run build first.');
      logElectron('ERROR', err.message);
      return reject(err);
    }

    const envConfig = {
      ...process.env,
      NODE_ENV: 'production',
      PORT: SERVER_PORT.toString(),
      USER_DATA_PATH: USER_DATA_PATH,
      APP_LOG_PATH: APP_LOG_PATH,
      IS_PORTABLE: process.env.PORTABLE_EXECUTABLE_DIR ? 'true' : 'false'
    };

    try {
      // Use fork to enable IPC messaging and stdio capture
      serverProcess = fork(execPath, execArgs, {
        env: envConfig,
        silent: true // Capture stdout and stderr
      });

      logElectron('INFO', `Express server process spawned with PID: ${serverProcess.pid}`);

      // Capture child stdout & stderr into the external log file (التحدي الثالث)
      if (serverProcess.stdout) {
        serverProcess.stdout.on('data', (data) => {
          const lines = data.toString().trim().split('\n');
          lines.forEach(line => {
            if (line) logElectron('INFO', `[EXPRESS-STDOUT] ${line}`);
          });
        });
      }

      if (serverProcess.stderr) {
        serverProcess.stderr.on('data', (data) => {
          const lines = data.toString().trim().split('\n');
          lines.forEach(line => {
            if (line) logElectron('ERROR', `[EXPRESS-STDERR] ${line}`);
          });
        });
      }

      serverProcess.on('error', (err) => {
        logElectron('ERROR', `Express Server process error: ${err.message}`, err);
      });

      serverProcess.on('exit', (code, signal) => {
        logElectron('WARN', `Express Server process exited with code ${code} and signal ${signal}`);
        serverProcess = null;
      });

      // Poll until HTTP port 3000 responds with status OK
      waitForServerReady(SERVER_URL, 30, 500)
        .then(() => {
          logElectron('INFO', `Express Server is fully operational at ${SERVER_URL}`);
          resolve(true);
        })
        .catch(err => {
          logElectron('ERROR', 'Timed out waiting for Express server to become ready', err);
          reject(err);
        });

    } catch (spawnErr) {
      logElectron('ERROR', `Fatal exception while spawning server: ${spawnErr.message}`);
      reject(spawnErr);
    }
  });
}

/**
 * Polls HTTP GET /api/health until server is responsive.
 * @param {string} url
 * @param {number} maxRetries
 * @param {number} intervalMs
 * @returns {Promise<void>}
 */
function waitForServerReady(url, maxRetries, intervalMs) {
  let attempts = 0;
  return new Promise((resolve, reject) => {
    const check = () => {
      attempts++;
      http.get(`${url}/api/health`, (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else if (attempts < maxRetries) {
          setTimeout(check, intervalMs);
        } else {
          reject(new Error(`Server responded with status ${res.statusCode} after ${attempts} attempts`));
        }
      }).on('error', (err) => {
        if (attempts < maxRetries) {
          setTimeout(check, intervalMs);
        } else {
          reject(new Error(`Server unreachable after ${attempts} attempts: ${err.message}`));
        }
      });
    };
    check();
  });
}

/**
 * Strictly terminate and kill the child Express process (التحدي الثاني).
 * Prevents zombie processes, memory leaks, and port 3000 locks.
 */
function killExpressServer() {
  if (serverProcess && !serverProcess.killed) {
    logElectron('INFO', `Terminating Express server process (PID: ${serverProcess.pid})...`);
    
    try {
      // Step 1: Send graceful shutdown message via IPC
      serverProcess.send({ command: 'shutdown' });
      serverProcess.kill('SIGTERM');
    } catch (e) {
      logElectron('WARN', 'Error sending SIGTERM to server process:', e);
    }

    // Step 2: Force SIGKILL if process doesn't exit within 2.5 seconds
    const killTimeout = setTimeout(() => {
      if (serverProcess && !serverProcess.killed) {
        logElectron('WARN', `Forcing SIGKILL on server process PID: ${serverProcess?.pid}`);
        try {
          serverProcess.kill('SIGKILL');
        } catch (killErr) {
          logElectron('ERROR', 'Failed to send SIGKILL:', killErr);
        }
      }
    }, 2500);

    // Don't keep Node event loop alive just for the timeout
    if (killTimeout.unref) killTimeout.unref();
  }
}

// ==========================================
// 3. ELECTRON WINDOW & MENU MANAGEMENT
// ==========================================

function createMainWindow() {
  logElectron('INFO', 'Creating Main BrowserWindow with Soft Glass UI setup...');
  
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: 'نظام المبيعات والمحاسبة الذكي - Smart POS & Accounting System',
    backgroundColor: '#0f172a', // Slate-900 background matching dark glass theme
    show: false, // Don't show until loaded
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  });

  // Build custom menu bar in Arabic & English
  const menuTemplate = [
    {
      label: 'الملف (File)',
      submenu: [
        {
          label: 'فتح مجلد البيانات والحفظ (Open Data Folder)',
          click: () => shell.openPath(USER_DATA_PATH)
        },
        {
          label: 'فتح سجل الأخطاء والعمليات (Open Log File)',
          click: () => shell.openPath(APP_LOG_PATH)
        },
        { type: 'separator' },
        {
          label: 'خروج (Exit)',
          role: 'quit'
        }
      ]
    },
    {
      label: 'العرض (View)',
      submenu: [
        { label: 'إعادة تحميل (Reload)', role: 'reload' },
        { label: 'وضع ملء الشاشة (Toggle Full Screen)', role: 'togglefullscreen' },
        { type: 'separator' },
        { label: 'أدوات المطور (Developer Tools)', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'المساعدة والدعم (Help & Support)',
      submenu: [
        {
          label: 'فحص تشخيصي للنظام (System Diagnostics)',
          click: () => {
            if (mainWindow) {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'تشخيص النظام والمسارات',
                message: `نظام المبيعات والمحاسبة الذكي (v1.0.0)\n\n` +
                         `• بيئة التشغيل: ${process.env.PORTABLE_EXECUTABLE_DIR ? 'محمول (Portable Windows EXE)' : 'مثبت (Installed Desktop)'}\n` +
                         `• مسار حفظ قاعدة البيانات (Offline DB): ${USER_DATA_PATH}\n` +
                         `• مسار ملف السجلات (Log File): ${APP_LOG_PATH}\n` +
                         `• رقم العملية للخدمة (PID): ${serverProcess ? serverProcess.pid : 'غير متصل'}\n` +
                         `• منفذ الخادم (Port): ${SERVER_PORT}`
              });
            }
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Load the running Express GUI URL
  mainWindow.loadURL(SERVER_URL);

  mainWindow.once('ready-to-show', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.maximize();
    }
    logElectron('INFO', 'MainWindow displayed and maximized.');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==========================================
// 4. ELECTRON LIFECYCLE HOOKS (التحكم في الإغلاق النظيف)
// ==========================================

app.on('ready', async () => {
  logElectron('INFO', 'Electron App Ready Event triggered.');
  try {
    await startExpressServer();
    createMainWindow();
  } catch (err) {
    logElectron('ERROR', `Failed to start desktop backend: ${err.message}`);
    dialog.showErrorBox('خطأ فادح في تشغيل خادم المبيعات', `تعذر بدء تشغيل قاعدة البيانات المحفوظة.\nالتفاصيل: ${err.message}\nراجِع ملف السجلات: ${APP_LOG_PATH}`);
    app.quit();
  }
});

// Windows/Linux desktop standard: Quit when all windows close
app.on('window-all-closed', () => {
  logElectron('INFO', 'window-all-closed event triggered.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Strictly kill child server before quitting
app.on('before-quit', () => {
  logElectron('INFO', 'before-quit event triggered. Initiating server shutdown.');
  killExpressServer();
});

app.on('will-quit', () => {
  logElectron('INFO', 'will-quit event triggered. Ensuring port release.');
  killExpressServer();
});

// ==========================================
// 5. IPC MAIN HANDLERS (التواصل مع الواجهة الرسومية)
// ==========================================

ipcMain.handle('app:get-paths', () => ({
  userDataPath: USER_DATA_PATH,
  logPath: APP_LOG_PATH,
  isPortable: !!process.env.PORTABLE_EXECUTABLE_DIR
}));

ipcMain.handle('app:open-logs', () => {
  shell.openPath(APP_LOG_PATH);
  return true;
});

ipcMain.handle('app:open-data-dir', () => {
  shell.openPath(USER_DATA_PATH);
  return true;
});
