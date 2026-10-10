const {
  app,
  BrowserWindow,
  ipcMain,
  globalShortcut,
  clipboard,
  shell,
} = require('electron');
const path = require('path');
const { execFile } = require('child_process');
const Store = require('electron-store');
const defaultSettings = require('./lib/defaultSettings');
const { runAction: runActionRunner } = require('./lib/actionRunner');
const { autoUpdater } = require('electron-updater');

const store = new Store({
  defaults: defaultSettings,
  name: 'kwaais-rp-desk-settings',
});

// v1.0.3: action sounds are now on by default. Saved settings from older
// versions always contain soundOnAction: false, so turn it on once.
if (!store.get('soundDefaultOnApplied')) {
  store.set('soundOnAction', true);
  store.set('soundDefaultOnApplied', true);
}

let mainWindow = null;
let collapseTimeout = null;
let modalOpen = false;
let dragStart = null; // { screenX, screenY, winX, winY }
// Step-by-step mode: the chat line currently waiting for Send/Skip/Stop
let pendingStep = null; // { resolve, abort }
const COLLAPSED_WIDTH = 48;

function getPrimaryDisplay() {
  const { screen } = require('electron');
  return screen.getPrimaryDisplay().workAreaSize;
}

function expandWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const opts = store.store;
  const w = Math.min(800, Math.max(240, opts.windowWidth || 320));
  const h = Math.min(900, Math.max(300, opts.windowHeight || 560));
  const b = mainWindow.getBounds();
  mainWindow.setMinimumSize(240, 300);
  mainWindow.setBounds({
    x: b.x + b.width - w,
    y: b.y,
    width: w,
    height: h,
  });
  mainWindow.webContents.send('expanded');
}

function collapseWindow() {
  if (!mainWindow || mainWindow.isDestroyed() || modalOpen) return;
  const b = mainWindow.getBounds();
  mainWindow.setMinimumSize(COLLAPSED_WIDTH, 300);
  mainWindow.setBounds({
    x: b.x + b.width - COLLAPSED_WIDTH,
    y: b.y,
    width: COLLAPSED_WIDTH,
    height: b.height,
  });
  mainWindow.webContents.send('collapsed');
}

function getCollapseDelayMs() {
  const sec = Math.min(
    120,
    Math.max(3, store.store.sidebarCollapseSeconds || 10)
  );
  return sec * 1000;
}

function scheduleCollapse() {
  if (collapseTimeout) clearTimeout(collapseTimeout);
  collapseTimeout = null;
  if (modalOpen || !store.store.sidebarAutoCollapse) return;
  const delay = getCollapseDelayMs();
  collapseTimeout = setTimeout(() => {
    collapseTimeout = null;
    if (
      mainWindow &&
      !mainWindow.isDestroyed() &&
      mainWindow.getBounds().width > COLLAPSED_WIDTH
    ) {
      collapseWindow();
    }
  }, delay);
}

function onNavKey() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const w = mainWindow.getBounds().width;
  if (w <= COLLAPSED_WIDTH) expandWindow();
  scheduleCollapse(); // no-op if sidebarAutoCollapse is off
}

function createWindow() {
  const opts = store.store;
  const width = Math.min(800, Math.max(240, opts.windowWidth || 320));
  const height = Math.min(900, Math.max(300, opts.windowHeight || 560));
  const frame = opts.borderless !== true;

  const win = new BrowserWindow({
    width,
    height,
    minWidth: 240,
    minHeight: 300,
    title: "KWAAI's RP DESK",
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    alwaysOnTop: true,
    frame,
    resizable: true,
    transparent: false,
  });

  win.loadFile('index.html');

  const { screen } = require('electron');
  const primary = screen.getPrimaryDisplay().workAreaSize;
  const x = primary.width - width;
  win.setBounds({ x, y: 0, width, height });

  const opacity = opts.windowOpacity;
  if (opacity != null && opacity < 100) {
    win.setOpacity(Math.min(1, Math.max(0.15, opacity / 100)));
  }

  mainWindow = win;
  win.on('closed', () => {
    mainWindow = null;
  });

  win.setAlwaysOnTop(true, 'screen-saver');

  // Always accept mouse on startup; pass-through only applies after first blur
  win.setIgnoreMouseEvents(false);
  win.on('focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setIgnoreMouseEvents(false);
    }
  });

  win.on('show', () => {
    scheduleCollapse();
    if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(false);
  });
  win.webContents.once('did-finish-load', () => {
    scheduleCollapse();
    if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(false);
  });
}

function wasSidebarCollapsed() {
  return (
    mainWindow &&
    !mainWindow.isDestroyed() &&
    mainWindow.getBounds().width <= COLLAPSED_WIDTH
  );
}

function normalizeAccel(accel) {
  if (!accel || typeof accel !== 'string') return '';
  return accel.trim().replace(/\bCtrl\b/gi, 'Control');
}

function registerGlobalShortcuts() {
  const opts = store.store;
  const navUp = normalizeAccel(opts.navUpAccel) || 'Control+Up';
  const navDown = normalizeAccel(opts.navDownAccel) || 'Control+Down';
  const navLeft = normalizeAccel(opts.navLeftAccel) || 'Control+Left';
  const navRight = normalizeAccel(opts.navRightAccel) || 'Control+Right';
  const expand = normalizeAccel(opts.expandAccel) || 'Control+Shift+Right';

  function registerNav(accel, direction) {
    if (!accel) return;
    try {
      globalShortcut.register(accel, () => {
        // While a step is waiting, the run key sends that line instead
        if (pendingStep && direction === 'right') {
          requestStepSubmit();
          return;
        }
        const collapsed = wasSidebarCollapsed();
        onNavKey();
        if (mainWindow && !mainWindow.isDestroyed() && !collapsed)
          mainWindow.webContents.send('nav', direction);
      });
    } catch (_) {}
  }
  registerNav(navUp, 'up');
  registerNav(navDown, 'down');
  registerNav(navLeft, 'left');
  registerNav(navRight, 'right');

  if (expand && expand !== navRight) {
    try {
      globalShortcut.register(expand, () => {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        if (pendingStep) {
          requestStepSubmit();
          return;
        }
        const collapsed = wasSidebarCollapsed();
        mainWindow.focus();
        onNavKey();
        if (!collapsed) mainWindow.webContents.send('nav', 'right');
      });
    } catch (_) {}
  }

  globalShortcut.register('Control+Shift+Q', () => app.quit());
  globalShortcut.register('Control+Shift+M', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.setIgnoreMouseEvents(false);
    }
  });
  globalShortcut.register('Control+Shift+S', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.webContents.send('openSettings');
    }
  });
  globalShortcut.register('Control+Shift+A', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.webContents.send('promptAdminUnlock');
    }
  });

  if (opts.quickBarHotkeysEnabled !== false) {
    const rawKeys = opts.quickBarKeys || [];
    for (let i = 0; i < 6; i++) {
      let accel = normalizeAccel(rawKeys[i]);
      if (/^Control\+\d$/.test(accel)) accel = 'Alt+' + (i + 1);
      if (!accel) continue;
      try {
        const index = i;
        globalShortcut.register(accel, () => {
          if (mainWindow && !mainWindow.isDestroyed())
            mainWindow.webContents.send('runQuickBarSlot', index);
        });
      } catch (_) {}
    }
  }
}

function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
}

// --- Auto-update (GitHub Releases) ---------------------------------------
// Only runs in the installed app. New versions download in the background;
// they install when the user clicks "Restart to update" or next time the app quits.
const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
let updateStatus = { state: 'idle' };

function sendUpdateStatus(status) {
  updateStatus = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updateStatus', status);
  }
}

function setupAutoUpdater() {
  if (!app.isPackaged) {
    updateStatus = { state: 'dev' };
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('checking-for-update', () =>
    sendUpdateStatus({ state: 'checking' }),
  );
  autoUpdater.on('update-available', (info) =>
    sendUpdateStatus({ state: 'downloading', version: info.version, percent: 0 }),
  );
  autoUpdater.on('download-progress', (p) =>
    sendUpdateStatus({
      state: 'downloading',
      version: updateStatus.version,
      percent: Math.round(p.percent || 0),
    }),
  );
  autoUpdater.on('update-not-available', () =>
    sendUpdateStatus({ state: 'up-to-date' }),
  );
  autoUpdater.on('update-downloaded', (info) =>
    sendUpdateStatus({ state: 'ready', version: info.version }),
  );
  autoUpdater.on('error', (err) =>
    sendUpdateStatus({ state: 'error', message: err?.message || String(err) }),
  );
  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 5000);
  setInterval(check, UPDATE_CHECK_INTERVAL_MS);
}

ipcMain.handle('getUpdateStatus', () => updateStatus);

ipcMain.handle('checkForUpdates', async () => {
  if (!app.isPackaged) return { state: 'dev' };
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    sendUpdateStatus({ state: 'error', message: err?.message || String(err) });
  }
  return updateStatus;
});

ipcMain.handle('installUpdate', () => {
  if (updateStatus.state !== 'ready') return;
  unregisterGlobalShortcuts();
  autoUpdater.quitAndInstall(true, true);
});

app.whenReady().then(() => {
  createWindow();
  registerGlobalShortcuts();
  setupAutoUpdater();
});

app.on('window-all-closed', () => {
  unregisterGlobalShortcuts();
  app.quit();
});

app.on('will-quit', () => {
  unregisterGlobalShortcuts();
});

ipcMain.handle('getSettings', () => {
  return store.store;
});

ipcMain.handle('unlockAdmin', (_e, password) => {
  if (String(password || '') === '88888888') {
    store.set('adminUnlocked', true);
    return { ok: true, settings: store.store };
  }
  return { ok: false };
});

ipcMain.handle('getAppVersion', () => {
  return app.getVersion();
});

let penalCodeData = null;
const bundledPenalCodePath = path.join(__dirname, 'penal_code.json');

// Installed builds pack penal_code.json inside app.asar (read-only), so edits
// go to a copy in userData. In dev the repo file is edited directly.
function getEditablePenalCodePath() {
  if (!app.isPackaged) return bundledPenalCodePath;
  return path.join(app.getPath('userData'), 'penal_code.json');
}

function loadPenalCode() {
  if (penalCodeData) return penalCodeData;
  const fs = require('fs');
  const editablePath = getEditablePenalCodePath();
  const jsonPath = fs.existsSync(editablePath)
    ? editablePath
    : bundledPenalCodePath;
  try {
    penalCodeData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    return penalCodeData;
  } catch (e) {
    return { categories: [] };
  }
}

ipcMain.handle('getPenalCodeCategories', () => {
  const data = loadPenalCode();
  return (data.categories || []).map((c, i) => ({ id: i, name: c.name }));
});

ipcMain.handle('getPenalCodeSection', (_e, categoryId) => {
  const data = loadPenalCode();
  const cats = data.categories || [];
  const idx = typeof categoryId === 'number' ? categoryId : parseInt(categoryId, 10);
  const cat = cats[idx];
  return cat ? { name: cat.name, offenses: cat.offenses || [] } : null;
});

ipcMain.handle('getPenalCodeFull', () => {
  const data = loadPenalCode();
  return data;
});

ipcMain.handle('openPenalCodeForEdit', () => {
  const fs = require('fs');
  penalCodeData = null;
  const editablePath = getEditablePenalCodePath();
  if (!fs.existsSync(editablePath)) {
    fs.writeFileSync(editablePath, fs.readFileSync(bundledPenalCodePath));
  }
  return shell.openPath(editablePath);
});

ipcMain.handle('writeClipboard', (_e, text) => {
  if (text != null && typeof text === 'string') clipboard.writeText(text);
});

ipcMain.handle('saveSettings', (_e, newSettings) => {
  const current = store.store;
  const merged = deepMerge(current, newSettings);
  store.set(merged);
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (merged.mousePassThrough !== undefined) {
      const passThrough = merged.mousePassThrough;
      if (!passThrough) {
        mainWindow.setIgnoreMouseEvents(false);
      }
    }
    const w = merged.windowWidth;
    const h = merged.windowHeight;
    const opacity = merged.windowOpacity;
    if (w != null && h != null) {
      const width = Math.min(800, Math.max(240, w));
      const height = Math.min(900, Math.max(300, h));
      const b = mainWindow.getBounds();
      mainWindow.setBounds({ ...b, width, height }, false);
    }
    if (opacity != null) {
      mainWindow.setOpacity(Math.min(1, Math.max(0.15, opacity / 100)));
    }
    if (merged.sidebarAutoCollapse === false && collapseTimeout) {
      clearTimeout(collapseTimeout);
      collapseTimeout = null;
    }
    const keybindKeys = [
      'navUpAccel',
      'navDownAccel',
      'navLeftAccel',
      'navRightAccel',
      'expandAccel',
      'quickBarKeys',
      'quickBarHotkeysEnabled',
    ];
    if (keybindKeys.some((k) => newSettings[k] !== undefined)) {
      unregisterGlobalShortcuts();
      registerGlobalShortcuts();
    }
  }
  return store.store;
});

function deepMerge(target, source) {
  const out = { ...target };
  for (const key of Object.keys(source)) {
    if (
      source[key] != null &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      out[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      out[key] = source[key];
    }
  }
  return out;
}

ipcMain.handle('getActionDuration', async (_e, actionId, params = {}) => {
  const settings = store.store;
  const previewSteps = [];
  try {
    await runActionRunner(actionId, params, settings, null, {
      preview: true,
      previewSteps,
    });
    const total = previewSteps.reduce((acc, s) => acc + (s.delayAfter || 0), 0);
    return total;
  } catch {
    return 0;
  }
});

ipcMain.handle('runAction', async (_e, actionId, params = {}) => {
  const settings = store.store;
  const devMode = settings.devMode === true;

  if (devMode) {
    const previewSteps = [];
    try {
      await runActionRunner(actionId, params, settings, null, {
        preview: true,
        previewSteps,
      });
      return { ok: true, preview: previewSteps };
    } catch (err) {
      return { ok: false, error: err.message, preview: previewSteps };
    }
  }

  const abortController = new AbortController();
  const signal = abortController.signal;
  const stepMode = settings.stepMode === true;
  let stepGate;
  if (stepMode) {
    const previewSteps = [];
    try {
      await runActionRunner(actionId, params, settings, null, {
        preview: true,
        previewSteps,
      });
    } catch (_) {}
    const total = previewSteps.length;
    stepGate = ({ index, text }) =>
      new Promise((resolve, reject) => {
        const abort = () => {
          pendingStep = null;
          reject(Object.assign(new Error('Cancelled'), { name: 'AbortError' }));
        };
        if (signal.aborted) return abort();
        signal.addEventListener('abort', abort, { once: true });
        pendingStep = {
          resolve: (result) => {
            signal.removeEventListener('abort', abort);
            pendingStep = null;
            resolve(result);
          },
          abort: () => abortController.abort(),
        };
        if (mainWindow && !mainWindow.isDestroyed()) {
          if (wasSidebarCollapsed()) expandWindow();
          if (collapseTimeout) {
            clearTimeout(collapseTimeout);
            collapseTimeout = null;
          }
          mainWindow.webContents.send('stepPrompt', {
            index,
            total: Math.max(total, index + 1),
            text,
            label: params.label || actionId,
          });
        }
      });
  }

  const unregisterEscape = () => {
    try {
      globalShortcut.unregister('Escape');
    } catch (_) {}
  };

  globalShortcut.register('Escape', () => {
    abortController.abort();
  });

  // Chat lines are sent by pasting, so put back whatever the user had copied
  const savedClipboard = clipboard.readText();

  try {
    await runActionRunner(actionId, params, settings, signal, { stepGate });
    return { ok: true };
  } catch (err) {
    if (err.name === 'AbortError' || err.message === 'Cancelled') {
      return { ok: false, error: 'Cancelled', cancelled: true };
    }
    console.error('runAction error', actionId, err);
    return { ok: false, error: err.message };
  } finally {
    if (stepMode) {
      pendingStep = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('stepDone');
      }
      scheduleCollapse();
    }
    unregisterEscape();
    if (savedClipboard) clipboard.writeText(savedClipboard);
  }
});

function requestStepSubmit() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('stepSubmit');
  }
}

ipcMain.handle('stepAdvance', (_e, action, text) => {
  if (!pendingStep) return;
  if (action === 'stop') pendingStep.abort();
  else pendingStep.resolve({ action: action === 'skip' ? 'skip' : 'next', text });
});

ipcMain.handle('focusApp', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.focus();
  }
});

ipcMain.handle('quitApp', () => {
  app.quit();
});

ipcMain.handle('setIgnoreMouseEvents', (_e, ignore) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setIgnoreMouseEvents(!!ignore);
});

ipcMain.handle('setModalOpen', (_e, open) => {
  modalOpen = !!open;
  if (open && collapseTimeout) {
    clearTimeout(collapseTimeout);
    collapseTimeout = null;
  } else if (!open) {
    scheduleCollapse();
  }
});

ipcMain.handle('requestExpand', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    onNavKey(); // expands if collapsed and resets timer
    mainWindow.focus();
  }
});

ipcMain.handle('requestCollapse', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!store.store.sidebarAutoCollapse) return;
  if (collapseTimeout) {
    clearTimeout(collapseTimeout);
    collapseTimeout = null;
  }
  if (mainWindow.getBounds().width > COLLAPSED_WIDTH) {
    collapseWindow();
  }
});

async function getGameStatus() {
  const { resolveGameProcName } = require('./lib/keySender');
  const configured = (store.store.targetExe || 'FiveM_GTAProcess.exe').trim();
  if (!configured) return { running: false };
  try {
    const resolved = await resolveGameProcName(configured);
    const image = `${resolved}.exe`;
    // CSV avoids tasklist truncating long names like FiveM_b3889_GTAProcess.exe
    const out = await new Promise((resolve, reject) => {
      execFile(
        'tasklist',
        ['/FI', `IMAGENAME eq ${image}`, '/FO', 'CSV', '/NH'],
        {
          encoding: 'utf8',
          timeout: 2500,
          windowsHide: true,
        },
        (err, stdout) => (err ? reject(err) : resolve(stdout)),
      );
    });
    const lower = out.toLowerCase();
    const running =
      lower.includes(image.toLowerCase()) ||
      lower.includes(`"${resolved.toLowerCase()}.exe"`);
    return { running, processName: resolved };
  } catch (_e) {
    return { running: false };
  }
}

ipcMain.handle('getGameStatus', () => getGameStatus());

ipcMain.handle('openExternal', (_e, url) => {
  if (typeof url !== 'string') return;
  const safe = url.trim();
  if (!safe.startsWith('https://') && !safe.startsWith('http://')) return;
  shell.openExternal(safe);
});

ipcMain.handle('exportSettings', () => {
  return JSON.stringify(store.store, null, 2);
});

ipcMain.handle('importSettings', (_e, jsonString) => {
  let data;
  try {
    data = JSON.parse(jsonString);
  } catch (err) {
    throw new Error('Invalid JSON');
  }
  if (data == null || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid settings');
  }
  const NUMERIC_FIELDS = ['windowWidth', 'windowHeight', 'windowOpacity', 'sidebarCollapseSeconds', 'actionLogMax', 'mechanicRPDelaySeconds', 'soundVolume'];
  const BOOL_FIELDS = ['mousePassThrough', 'borderless', 'sidebarAutoCollapse', 'actionLogEnabled', 'soundOnAction', 'compactList', 'devMode', 'devModeTimedPreview', 'quickBarHotkeysEnabled', 'adminUnlocked', 'stepMode'];
  for (const key of NUMERIC_FIELDS) {
    if (key in data && (typeof data[key] !== 'number' || !isFinite(data[key]))) {
      throw new Error(`Invalid value for setting: ${key}`);
    }
  }
  for (const key of BOOL_FIELDS) {
    if (key in data && typeof data[key] !== 'boolean') {
      throw new Error(`Invalid value for setting: ${key}`);
    }
  }
  const merged = deepMerge(store.store, data);
  store.set(merged);
  return store.store;
});

ipcMain.on('window-drag-start', (_e, screenX, screenY) => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const b = mainWindow.getBounds();
  dragStart = {
    screenX,
    screenY,
    winX: b.x,
    winY: b.y,
    width: b.width,
    height: b.height,
  };
});

ipcMain.on('window-drag-move', (_e, screenX, screenY) => {
  if (!dragStart || !mainWindow || mainWindow.isDestroyed()) return;
  const dx = screenX - dragStart.screenX;
  const dy = screenY - dragStart.screenY;
  mainWindow.setBounds({
    x: dragStart.winX + dx,
    y: dragStart.winY + dy,
    width: dragStart.width,
    height: dragStart.height,
  });
});

ipcMain.on('window-drag-end', () => {
  dragStart = null;
});
