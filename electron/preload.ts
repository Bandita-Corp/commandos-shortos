import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  captureObsidianNote: (data: { filePath?: string; content: string; tags: string[] }) =>
    ipcRenderer.invoke('obsidian:capture', data),
  getObsidianEntries: () =>
    ipcRenderer.invoke('obsidian:getEntries'),
  selectVaultFile: () =>
    ipcRenderer.invoke('obsidian:selectVaultFile'),

  runMacro: (macroKey: string, customConfig?: any) =>
    ipcRenderer.invoke('macro:run', { macroKey, customConfig }),
  getMacroLogs: () =>
    ipcRenderer.invoke('macro:getLogs'),

  // Dynamic Shortcuts Manager
  getShortcuts: () =>
    ipcRenderer.invoke('shortcuts:get'),
  createShortcut: (data: any) =>
    ipcRenderer.invoke('shortcuts:create', data),
  updateShortcut: (id: string, data: any) =>
    ipcRenderer.invoke('shortcuts:update', { id, data }),
  deleteShortcut: (id: string) =>
    ipcRenderer.invoke('shortcuts:delete', id),
  toggleShortcut: (id: string, enabled: boolean) =>
    ipcRenderer.invoke('shortcuts:toggle', { id, enabled }),
  testShortcut: (id: string) =>
    ipcRenderer.invoke('shortcuts:test', id),

  getSettings: () =>
    ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) =>
    ipcRenderer.invoke('settings:save', settings),

  onTriggerQuickCapture: (callback: () => void) => {
    const subscription = () => callback();
    ipcRenderer.on('quick-capture:trigger', subscription);
    return () => {
      ipcRenderer.removeListener('quick-capture:trigger', subscription);
    };
  },
});
