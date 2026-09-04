const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// The department this build is locked to. In a packaged build this comes from
// package.json's "department" field, injected at build time via
// `electron-builder --config.extraMetadata.department=Restaurant|Bakery`
// (see package.json scripts dist:win:restaurant / dist:win:bakery).
const pkg = require('../package.json');
const DEPARTMENT = pkg.department === 'Bakery' ? 'Bakery' : 'Restaurant';

const isDev = !app.isPackaged;
const PORT = isDev ? 3000 : 47890;

let serverProcess = null;
let mainWindow = null;

// Never let an unexpected error silently kill the whole app — log it instead.
process.on('uncaughtException', (err) => {
  console.error('Uncaught exception in main process:', err);
});

// If a renderer (the main window, or a hidden print window) crashes, this
// fires instead of the app just vanishing — log it so it's diagnosable.
app.on('render-process-gone', (_event, details) => {
  console.error('Renderer process gone:', details.reason);
});

function getDbPath() {
  return path.join(app.getPath('userData'), 'zapbill.db');
}

function startServer() {
  const standaloneDir = path.join(process.resourcesPath, 'next', 'standalone');
  const serverEntry = path.join(standaloneDir, 'server.js');

  serverProcess = spawn(process.execPath, [serverEntry], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      DATABASE_PATH: getDbPath(),
      APP_DEPARTMENT: DEPARTMENT,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      NODE_ENV: 'production',
    },
    stdio: 'inherit',
  });

  serverProcess.on('exit', (code) => {
    if (code && code !== 0) console.error(`Zapbill server exited with code ${code}`);
  });
}

async function waitForServer() {
  for (let i = 0; i < 150; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}`);
      if (res) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('Zapbill server did not start in time.');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 1024,
    minHeight: 700,
    title: `Zapbill — ${DEPARTMENT}`,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
}

app.whenReady().then(async () => {
  fs.mkdirSync(app.getPath('userData'), { recursive: true });

  if (!isDev) {
    startServer();
  }

  await waitForServer();
  createWindow();
});

app.on('window-all-closed', () => {
  serverProcess?.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  serverProcess?.kill();
});

// ── Receipt printing ─────────────────────────────────────────────
// Uses Electron's native print API (via a hidden window) instead of the
// renderer's window.print(), because only this API reports back whether the
// print actually succeeded or failed — the checkout page uses that result to
// decide whether the bill gets saved at all.
//
// Prints silently (no OS print dialog) straight to the default printer —
// this isn't just a UX choice: on Linux, opening the interactive GTK print
// dialog from here has been observed to crash the whole app when the user
// interacts with it. Silent printing also matches how POS receipt printers
// are normally used (one fixed printer, no per-bill picker needed).
ipcMain.handle('print:receipt', async (_event, html, widthMm) => {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const CSS_DPI = 96; // CSS px is always a 96dpi reference pixel, per spec.
    const WIDTH_MM = Number.isFinite(widthMm) && widthMm > 0 ? widthMm : 80;

    let printWindow;
    try {
      // Match the window's on-screen width to the printed page's width (in
      // CSS px, at the 96dpi reference) so the content height we measure
      // before printing reflects the same text wrapping it'll get at print
      // time, rather than a wider on-screen layout with less wrap.
      const widthPx = Math.round((WIDTH_MM / 25.4) * CSS_DPI);
      printWindow = new BrowserWindow({ show: false, width: widthPx, height: 600 });
    } catch (err) {
      finish({ success: false, error: err instanceof Error ? err.message : 'Failed to open print window.' });
      return;
    }

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

    printWindow.webContents.once('did-finish-load', async () => {
      try {
        // Chromium's silent print does NOT read the receipt's own `@page` CSS
        // rule for a physical printer — without an explicit pageSize it falls
        // back to the printer's configured default (commonly A4/Letter), lays
        // the receipt out at that width, and the thermal printer then only
        // physically prints the leftmost sliver of it — which is why only the
        // Item column survived and Qty/Rate/Amount got clipped off-page.
        // Measure the rendered content height and set an explicit page sized
        // to the configured printer width, fit exactly to the content.
        const MICRONS_PER_MM = 1000;
        let heightMicrons = 200 * MICRONS_PER_MM; // 200mm fallback if measuring fails.
        try {
          const contentHeightPx = await printWindow.webContents.executeJavaScript('document.documentElement.scrollHeight');
          const contentHeightMm = (contentHeightPx / CSS_DPI) * 25.4;
          heightMicrons = Math.round((contentHeightMm + 4) * MICRONS_PER_MM); // +4mm buffer.
        } catch {
          // Fall back to the fixed height above.
        }

        printWindow.webContents.print(
          {
            silent: true,
            printBackground: true,
            margins: { marginType: 'none' },
            pageSize: { width: WIDTH_MM * MICRONS_PER_MM, height: heightMicrons },
          },
          (success, failureReason) => {
            finish({ success, error: success ? undefined : failureReason });
            // Give the print job a moment to fully hand off before destroying
            // the window — closing immediately has been linked to native crashes.
            setTimeout(() => { if (!printWindow.isDestroyed()) printWindow.close(); }, 500);
          }
        );
      } catch (err) {
        finish({ success: false, error: err instanceof Error ? err.message : 'Print failed.' });
        if (!printWindow.isDestroyed()) printWindow.close();
      }
    });

    printWindow.webContents.once('did-fail-load', () => {
      finish({ success: false, error: 'Failed to render receipt.' });
      printWindow.close();
    });
  });
});

// ── App info ─────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion());

// ── Backup / Restore ────────────────────────────────────────────
ipcMain.handle('backup:save', async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Zapbill Backup',
    defaultPath: `zapbill-${DEPARTMENT.toLowerCase()}-backup-${new Date().toISOString().slice(0, 10)}.db`,
    filters: [{ name: 'Zapbill Database', extensions: ['db'] }],
  });
  if (canceled || !filePath) return { success: false };

  try {
    fs.copyFileSync(getDbPath(), filePath);
    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Backup failed.' };
  }
});

ipcMain.handle('backup:restore', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: 'Restore Zapbill Backup',
    properties: ['openFile'],
    filters: [{ name: 'Zapbill Database', extensions: ['db'] }],
  });
  if (canceled || !filePaths[0]) return { success: false };

  try {
    serverProcess?.kill();
    fs.copyFileSync(filePaths[0], getDbPath());
    app.relaunch();
    app.exit(0);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Restore failed.' };
  }
});
