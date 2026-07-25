/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Preload Script for Electron Desktop Wrapper
 * Exposes safe IPC methods to React renderer process via window.electronAPI
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPaths: () => ipcRenderer.invoke('app:get-paths'),
  openLogs: () => ipcRenderer.invoke('app:open-logs'),
  openDataDir: () => ipcRenderer.invoke('app:open-data-dir'),
  getPrinters: () => ipcRenderer.invoke('app:get-printers'),
  printReceipt: (html, printerName) => ipcRenderer.invoke('app:print-receipt', { html, printerName })
});
