import { app, BrowserWindow, ipcMain, globalShortcut, dialog } from 'electron';
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
  } catch (err) {
    console.error('Failed to initialize database tables:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 650,
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

// App lifecycle
app.whenReady().then(async () => {
  await initDatabase();
  createWindow();

  // Register Global Shortcut for Quick Capture
  const shortcutKey = process.platform === 'darwin' ? 'Command+Shift+O' : 'Ctrl+Shift+O';
  const registered = globalShortcut.register(shortcutKey, () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send('quick-capture:trigger');
    }
  });

  if (!registered) {
    console.warn(`Failed to register global shortcut: ${shortcutKey}`);
  }

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
    
    // Calculate word count
    const words = content.trim().split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const tagString = Array.isArray(tags) ? tags.join(', ') : (tags || '');

    // Format Markdown content with timestamp
    const nowStr = new Date().toLocaleString();
    const markdownBlock = `\n\n### Quick Capture [${nowStr}]\n${content}\n${tagString ? `\n**Tags:** ${tagString}` : ''}\n---`;

    // Ensure directory exists
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Append to file
    fs.appendFileSync(targetFile, markdownBlock, 'utf8');

    // Save entry to SQLite database
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

// Get Obsidian entries from DB
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

// File dialog for Obsidian Vault file selection
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

  // Log macro usage in SQLite DB via Prisma
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

// Get Macro execution logs
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
