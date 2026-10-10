const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSettings: () => ipcRenderer.invoke('getSettings'),
  getAppVersion: () => ipcRenderer.invoke('getAppVersion'),
  getPenalCodeCategories: () => ipcRenderer.invoke('getPenalCodeCategories'),
  getPenalCodeSection: (categoryId) => ipcRenderer.invoke('getPenalCodeSection', categoryId),
  getPenalCodeFull: () => ipcRenderer.invoke('getPenalCodeFull'),
  openPenalCodeForEdit: () => ipcRenderer.invoke('openPenalCodeForEdit'),
  writeClipboard: (text) => ipcRenderer.invoke('writeClipboard', text),
  saveSettings: (settings) => ipcRenderer.invoke('saveSettings', settings),
  runAction: (actionId, params) =>
    ipcRenderer.invoke('runAction', actionId, params),
  getActionDuration: (actionId, params) =>
    ipcRenderer.invoke('getActionDuration', actionId, params),
  focusApp: () => ipcRenderer.invoke('focusApp'),
  quitApp: () => ipcRenderer.invoke('quitApp'),
  setIgnoreMouseEvents: (ignore) =>
    ipcRenderer.invoke('setIgnoreMouseEvents', ignore),
  getGameStatus: () => ipcRenderer.invoke('getGameStatus'),
  exportSettings: () => ipcRenderer.invoke('exportSettings'),
  importSettings: (jsonString) =>
    ipcRenderer.invoke('importSettings', jsonString),
  onNav: (callback) => {
    ipcRenderer.on('nav', (_e, direction) => callback(direction));
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on('openSettings', () => callback());
  },
  onPromptAdminUnlock: (callback) => {
    ipcRenderer.on('promptAdminUnlock', () => callback());
  },
  unlockAdmin: (password) => ipcRenderer.invoke('unlockAdmin', password),
  setModalOpen: (open) => ipcRenderer.invoke('setModalOpen', open),
  onExpanded: (callback) => {
    ipcRenderer.on('expanded', () => callback());
  },
  onCollapsed: (callback) => {
    ipcRenderer.on('collapsed', () => callback());
  },
  onRunQuickBarSlot: (callback) => {
    ipcRenderer.on('runQuickBarSlot', (_e, index) => callback(index));
  },
  requestExpand: () => ipcRenderer.invoke('requestExpand'),
  requestCollapse: () => ipcRenderer.invoke('requestCollapse'),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
  windowDragStart: (screenX, screenY) =>
    ipcRenderer.send('window-drag-start', screenX, screenY),
  windowDragMove: (screenX, screenY) =>
    ipcRenderer.send('window-drag-move', screenX, screenY),
  windowDragEnd: () => ipcRenderer.send('window-drag-end'),
  takeScreenshot: (label) => ipcRenderer.invoke('takeScreenshot', label),
  getDisplays: () => ipcRenderer.invoke('getDisplays'),
  getScreenshotFolder: () => ipcRenderer.invoke('getScreenshotFolder'),
  openScreenshotFolder: () => ipcRenderer.invoke('openScreenshotFolder'),
  chooseScreenshotFolder: () => ipcRenderer.invoke('chooseScreenshotFolder'),
  stepAdvance: (action, text) => ipcRenderer.invoke('stepAdvance', action, text),
  onStepPrompt: (callback) => {
    ipcRenderer.on('stepPrompt', (_e, step) => callback(step));
  },
  onStepSubmit: (callback) => {
    ipcRenderer.on('stepSubmit', () => callback());
  },
  onStepDone: (callback) => {
    ipcRenderer.on('stepDone', () => callback());
  },
  getUpdateStatus: () => ipcRenderer.invoke('getUpdateStatus'),
  checkForUpdates: () => ipcRenderer.invoke('checkForUpdates'),
  installUpdate: () => ipcRenderer.invoke('installUpdate'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('updateStatus', (_e, status) => callback(status));
  },
});
