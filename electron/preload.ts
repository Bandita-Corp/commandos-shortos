import { contextBridge, ipcRenderer } from 'electron';

export interface ElectronAPI {
  // Obsidian
  captureObsidianNote: (data: { filePath?: string; content: string; tags: string[] }) => Promise<{ success: boolean; data?: any; error?: string }>;
  getObsidianEntries: () => Promise<{ success: boolean; data?: any; error?: string }>;
  selectVaultFile: () => Promise<{ success: boolean; data?: any; error?: string }>;
  
  // Macros
  runMacro: (macroKey: string, customConfig?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  getMacroLogs: () => Promise<{ success: boolean; data?: any; error?: string }>;
  
  // App Settings
  getSettings: () => Promise<{ success: boolean; data?: any; error?: string }>;
  saveSettings: (settings: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  
  // Events
  onTriggerQuickCapture: (callback: () => void) => () => void;
}

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
