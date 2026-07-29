import { app, BrowserWindow, ipcMain, globalShortcut, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

let mainWindow: BrowserWindow | null = null;

// Dynamic SQLite path in app.getPath('userData')
const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'app-data.db');
process.env.DATABASE_URL = `file:${dbPath}`;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: `file:${dbPath}`,
    },
  },
});

// App settings file path
const settingsPath = path.join(userDataPath, 'settings.json');

function loadSettings() {
  try {
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading settings file:', err);
  }
  return {
    obsidianVaultFile: path.join(userDataPath, 'QuickCapture.md'),
    proxifierPath: 'Proxifier.exe',
    netlimiterPath: 'NLClient.exe',
    vmName: 'Windows',
    cockpitUrl: 'https://localhost:9090',
  };
}

function saveSettingsData(settings: any) {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving settings file:', err);
    return false;
  }
}

async function initDatabase() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ObsidianEntry (
        id TEXT PRIMARY KEY,
        wordCount INTEGER NOT NULL,
        tags TEXT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS MacroUsageLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        macroName TEXT NOT NULL,
        status TEXT NOT NULL,
        executedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS ShortcutBinding (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        shortcut TEXT NOT NULL,
        actionType TEXT NOT NULL,
        target TEXT NOT NULL,
        enabled BOOLEAN NOT NULL DEFAULT 1,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed default shortcuts if table is empty
    const count = await prisma.shortcutBinding.count();
    if (count === 0) {
      await prisma.shortcutBinding.createMany({
        data: [
          {
            id: randomUUID(),
            name: 'Open AI Workspace',
            shortcut: 'Ctrl+Alt+C',
            actionType: 'OPEN_RESOURCE',
            target: 'https://gemini.google.com',
            enabled: true,
          },
          {
            id: randomUUID(),
            name: 'Flush DNS Resolver',
            shortcut: 'Ctrl+Alt+F',
            actionType: 'START_SCRIPT',
            target: process.platform === 'win32' ? 'ipconfig /flushdns' : 'sudo killall -HUP mDNSResponder',
            enabled: true,
          },
          {
            id: randomUUID(),
            name: 'Start Spotify Player',
            shortcut: 'Ctrl+Alt+S',
            actionType: 'START_APP',
            target: process.platform === 'win32' ? 'spotify:' : 'Spotify',
            enabled: true,
          },
          {
            id: randomUUID(),
            name: 'Create Quick Obsidian Note',
            shortcut: 'Ctrl+Alt+N',
            actionType: 'CREATE_OBSIDIAN_DOC',
            target: '### Quick Shortcut Note\nCreated via keybinding action.',
            enabled: true,
          },
        ],
      });
    }
  } catch (err) {
    console.error('Failed to initialize database tables:', err);
  }
}

function executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

// Action executor for Shortcut Bindings
async function triggerShortcutAction(binding: { name: string; actionType: string; target: string }) {
  let status = 'SUCCESS';
  let executionError: string | undefined = undefined;

  try {
    switch (binding.actionType) {
      case 'START_APP': {
        const cmd = process.platform === 'win32' ? `start "" "${binding.target}"` : `open -a "${binding.target}"`;
        await executeCommand(cmd);
        break;
      }
      case 'START_SCRIPT': {
        await executeCommand(binding.target);
        break;
      }
      case 'OPEN_RESOURCE': {
        if (binding.target.startsWith('http://') || binding.target.startsWith('https://')) {
          await shell.openExternal(binding.target);
        } else {
          await shell.openPath(binding.target);
        }
        break;
      }
      case 'CREATE_OBSIDIAN_DOC': {
        const settings = loadSettings();
        const targetFile = settings.obsidianVaultFile || path.join(userDataPath, 'QuickCapture.md');
        const targetDir = path.dirname(targetFile);

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        const nowStr = new Date().toLocaleString();
        const markdownBlock = `\n\n### ${binding.name} [${nowStr}]\n${binding.target}\n---`;
        fs.appendFileSync(targetFile, markdownBlock, 'utf8');

        const words = binding.target.trim().split(/\s+/).filter(Boolean).length;
        await prisma.obsidianEntry.create({
          data: {
            id: randomUUID(),
            wordCount: words,
            tags: 'shortcut-trigger',
          },
        });
        break;
      }
      default:
        throw new Error(`Unsupported action type: ${binding.actionType}`);
    }
  } catch (err: any) {
    status = 'FAILED';
    executionError = err.message || 'Execution failed';
  }

  // Log execution
  try {
    await prisma.macroUsageLog.create({
      data: {
        macroName: `Shortcut: ${binding.name}`,
        status,
      },
    });
  } catch (dbErr) {
    console.error('Error logging shortcut macro execution:', dbErr);
  }

  if (status === 'FAILED') {
    throw new Error(executionError);
  }
  return { success: true };
}

// Global Hotkeys Register Engine
async function registerAllShortcuts() {
  globalShortcut.unregisterAll();

  // Register main Quick Capture modal hotkey
  const quickKey = process.platform === 'darwin' ? 'Command+Shift+O' : 'Ctrl+Shift+O';
  globalShortcut.register(quickKey, () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('quick-capture:trigger');
    }
  });

  // Register dynamic DB shortcut bindings
  try {
    const activeBindings = await prisma.shortcutBinding.findMany({
      where: { enabled: true },
    });

    activeBindings.forEach((binding) => {
      if (!binding.shortcut) return;
      try {
        const registered = globalShortcut.register(binding.shortcut, async () => {
          console.log(`Global shortcut triggered: ${binding.shortcut} -> ${binding.name}`);
          try {
            await triggerShortcutAction(binding);
          } catch (err) {
            console.error(`Shortcut action error (${binding.name}):`, err);
          }
        });

        if (!registered) {
          console.warn(`Could not register keybinding: ${binding.shortcut}`);
        }
      } catch (err) {
        console.error(`Invalid shortcut format: ${binding.shortcut}`, err);
      }
    });
  } catch (err) {
    console.error('Failed to load shortcuts from DB:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 920,
    minHeight: 680,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0d0f17',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(async () => {
  await initDatabase();
  createWindow();
  await registerAllShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers

// 1. Obsidian Capture
ipcMain.handle('obsidian:capture', async (event, { filePath, content, tags }: { filePath?: string; content: string; tags: string[] }) => {
  try {
    const settings = loadSettings();
    const targetFile = filePath || settings.obsidianVaultFile || path.join(userDataPath, 'QuickCapture.md');
    
    const words = content.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const tagString = Array.isArray(tags) ? tags.join(', ') : (tags || '');

    const nowStr = new Date().toLocaleString();
    const markdownBlock = `\n\n### Quick Capture [${nowStr}]\n${content}\n${tagString ? `\n**Tags:** ${tagString}` : ''}\n---`;

    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.appendFileSync(targetFile, markdownBlock, 'utf8');

    const entryId = randomUUID();
    const entry = await prisma.obsidianEntry.create({
      data: {
        id: entryId,
        wordCount,
        tags: tagString,
      },
    });

    return { success: true, data: { entry, targetFile } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to execute Obsidian Quick Capture' };
  }
});

ipcMain.handle('obsidian:getEntries', async () => {
  try {
    const entries = await prisma.obsidianEntry.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return { success: true, data: entries };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch Obsidian entries' };
  }
});

ipcMain.handle('obsidian:selectVaultFile', async () => {
  try {
    const result = await dialog.showOpenDialog({
      title: 'Select Obsidian Note or Vault File',
      properties: ['openFile'],
      filters: [{ name: 'Markdown Files', extensions: ['md'] }],
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, data: result.filePaths[0] };
    }
    return { success: false, error: 'File selection cancelled' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// 2. Macro Execution Handler
ipcMain.handle('macro:run', async (event, { macroKey, customConfig }: { macroKey: string; customConfig?: any }) => {
  const settings = loadSettings();
  let command = '';
  let macroName = macroKey;

  switch (macroKey) {
    case 'proxifier':
      macroName = 'Run Proxifier';
      command = `start "" "${settings.proxifierPath || 'Proxifier.exe'}"`;
      break;

    case 'flushdns':
      macroName = 'Flush DNS Cache';
      command = process.platform === 'win32' ? 'ipconfig /flushdns' : 'sudo killall -HUP mDNSResponder';
      break;

    case 'netlimiter':
      macroName = 'Run NetLimiter';
      command = `start "" "${settings.netlimiterPath || 'NLClient.exe'}"`;
      break;

    case 'chrome_tabs':
      macroName = 'Launch Chrome Workspace';
      command = 'start chrome "https://gemini.google.com" "https://github.com" "https://youtube.com"';
      break;

    case 'spotify':
      macroName = 'Open Spotify';
      command = process.platform === 'win32' ? 'cmd /c start spotify:' : 'open -a Spotify';
      break;

    case 'start_vm':
      macroName = 'Start Virtual Machine';
      const vm = customConfig?.vmName || settings.vmName || 'Windows';
      command = `VBoxManage startvm "${vm}"`;
      break;

    case 'cockpit_tools':
      macroName = 'Open Cockpit Tools';
      const url = settings.cockpitUrl || 'https://localhost:9090';
      command = process.platform === 'win32' ? `start "" "${url}"` : `open "${url}"`;
      break;

    default:
      return { success: false, error: `Unknown macro key: ${macroKey}` };
  }

  let status = 'SUCCESS';
  let executionError = undefined;

  try {
    await executeCommand(command);
  } catch (err: any) {
    status = 'FAILED';
    executionError = err.message || 'Execution error';
  }

  try {
    await prisma.macroUsageLog.create({
      data: {
        macroName,
        status,
      },
    });
  } catch (dbErr) {
    console.error('Failed to log macro usage to database:', dbErr);
  }

  if (status === 'SUCCESS') {
    return { success: true, data: { macroName, status } };
  } else {
    return { success: false, error: executionError, data: { macroName, status } };
  }
});

ipcMain.handle('macro:getLogs', async () => {
  try {
    const logs = await prisma.macroUsageLog.findMany({
      orderBy: { executedAt: 'desc' },
      take: 100,
    });
    return { success: true, data: logs };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch macro logs' };
  }
});

// 3. Dynamic Shortcut Manager Handlers
ipcMain.handle('shortcuts:get', async () => {
  try {
    const bindings = await prisma.shortcutBinding.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return { success: true, data: bindings };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shortcuts:create', async (event, data: any) => {
  try {
    const newBinding = await prisma.shortcutBinding.create({
      data: {
        id: randomUUID(),
        name: data.name,
        shortcut: data.shortcut,
        actionType: data.actionType,
        target: data.target,
        enabled: data.enabled ?? true,
      },
    });
    await registerAllShortcuts();
    return { success: true, data: newBinding };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shortcuts:update', async (event, { id, data }: { id: string; data: any }) => {
  try {
    const updated = await prisma.shortcutBinding.update({
      where: { id },
      data,
    });
    await registerAllShortcuts();
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shortcuts:delete', async (event, id: string) => {
  try {
    await prisma.shortcutBinding.delete({
      where: { id },
    });
    await registerAllShortcuts();
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shortcuts:toggle', async (event, { id, enabled }: { id: string; enabled: boolean }) => {
  try {
    const updated = await prisma.shortcutBinding.update({
      where: { id },
      data: { enabled },
    });
    await registerAllShortcuts();
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('shortcuts:test', async (event, id: string) => {
  try {
    const binding = await prisma.shortcutBinding.findUnique({ where: { id } });
    if (!binding) return { success: false, error: 'Shortcut not found' };

    await triggerShortcutAction(binding);
    return { success: true, data: { name: binding.name } };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

// Settings Handlers
ipcMain.handle('settings:get', async () => {
  try {
    return { success: true, data: loadSettings() };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('settings:save', async (event, newSettings: any) => {
  try {
    const current = loadSettings();
    const updated = { ...current, ...newSettings };
    const saved = saveSettingsData(updated);
    if (saved) {
      return { success: true, data: updated };
    }
    return { success: false, error: 'Failed to write settings file' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});
