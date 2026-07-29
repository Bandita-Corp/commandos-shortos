export interface ObsidianEntry {
  id: string;
  wordCount: number;
  tags: string;
  createdAt: string;
}

export interface MacroUsageLog {
  id: number;
  macroName: string;
  status: string;
  executedAt: string;
}

export interface AppSettings {
  obsidianVaultFile: string;
  proxifierPath: string;
  netlimiterPath: string;
  vmName: string;
  cockpitUrl: string;
}

export interface ElectronAPI {
  captureObsidianNote: (data: { filePath?: string; content: string; tags: string[] }) => Promise<{ success: boolean; data?: any; error?: string }>;
  getObsidianEntries: () => Promise<{ success: boolean; data?: { entry?: ObsidianEntry } | any; error?: string }>;
  selectVaultFile: () => Promise<{ success: boolean; data?: string; error?: string }>;

  runMacro: (macroKey: string, customConfig?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  getMacroLogs: () => Promise<{ success: boolean; data?: MacroUsageLog[]; error?: string }>;

  getSettings: () => Promise<{ success: boolean; data?: AppSettings; error?: string }>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<{ success: boolean; data?: AppSettings; error?: string }>;

  onTriggerQuickCapture: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
