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

export type ActionType = 'START_APP' | 'START_SCRIPT' | 'CREATE_OBSIDIAN_DOC' | 'OPEN_RESOURCE';

export interface ShortcutBinding {
  id: string;
  name: string;
  shortcut: string;
  actionType: ActionType;
  target: string;
  enabled: boolean;
  createdAt: string;
}

export interface AppSettings {
  obsidianVaultFile: string;
  proxifierPath: string;
  netlimiterPath: string;
  vmName: string;
  cockpitUrl: string;
}

export interface ElectronAPI {
  // Obsidian
  captureObsidianNote: (data: { filePath?: string; content: string; tags: string[] }) => Promise<{ success: boolean; data?: any; error?: string }>;
  getObsidianEntries: () => Promise<{ success: boolean; data?: { entry?: ObsidianEntry } | any; error?: string }>;
  selectVaultFile: () => Promise<{ success: boolean; data?: string; error?: string }>;

  // Macros
  runMacro: (macroKey: string, customConfig?: any) => Promise<{ success: boolean; data?: any; error?: string }>;
  getMacroLogs: () => Promise<{ success: boolean; data?: MacroUsageLog[]; error?: string }>;

  // Dynamic Shortcuts Manager
  getShortcuts: () => Promise<{ success: boolean; data?: ShortcutBinding[]; error?: string }>;
  createShortcut: (data: Omit<ShortcutBinding, 'id' | 'createdAt'>) => Promise<{ success: boolean; data?: ShortcutBinding; error?: string }>;
  updateShortcut: (id: string, data: Partial<ShortcutBinding>) => Promise<{ success: boolean; data?: ShortcutBinding; error?: string }>;
  deleteShortcut: (id: string) => Promise<{ success: boolean; data?: boolean; error?: string }>;
  toggleShortcut: (id: string, enabled: boolean) => Promise<{ success: boolean; data?: ShortcutBinding; error?: string }>;
  testShortcut: (id: string) => Promise<{ success: boolean; data?: any; error?: string }>;

  // App Settings
  getSettings: () => Promise<{ success: boolean; data?: AppSettings; error?: string }>;
  saveSettings: (settings: Partial<AppSettings>) => Promise<{ success: boolean; data?: AppSettings; error?: string }>;

  // Events
  onTriggerQuickCapture: (callback: () => void) => () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
