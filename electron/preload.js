const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveBackup: () => ipcRenderer.invoke('backup:save'),
  restoreBackup: () => ipcRenderer.invoke('backup:restore'),
  printReceipt: (html, widthMm) => ipcRenderer.invoke('print:receipt', html, widthMm),
});
