import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  FolderOpen, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  FileCode,
  Shield,
  Activity,
  Monitor,
  Wrench,
  Keyboard
} from 'lucide-react';
import { AppSettings } from '../types/electron';

export const SettingsModal: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>({
    obsidianVaultFile: '',
    proxifierPath: 'Proxifier.exe',
    netlimiterPath: 'NLClient.exe',
    vmName: 'Windows',
    cockpitUrl: 'https://localhost:9090',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  useEffect(() => {
    window.electronAPI.getSettings().then((res) => {
      if (res.success && res.data) {
        setSettings((prev) => ({ ...prev, ...res.data }));
      }
      setIsLoading(false);
    });
  }, []);

  const handleBrowseVault = async () => {
    const res = await window.electronAPI.selectVaultFile();
    if (res.success && res.data) {
      setSettings((prev) => ({ ...prev, obsidianVaultFile: res.data! }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setStatusMsg(null);
    try {
      const res = await window.electronAPI.saveSettings(settings);
      if (res.success) {
        setStatusMsg({ success: true, text: 'Settings saved successfully!' });
      } else {
        setStatusMsg({ success: false, text: res.error || 'Failed to save settings.' });
      }
    } catch (err: any) {
      setStatusMsg({ success: false, text: err.message || 'Save error' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel p-10 rounded-2xl text-center text-xs text-slate-400">
        Loading settings...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-accent-cyan" />
            Application Settings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure executable paths, vault targets, virtual machines, and shortcuts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Obsidian Vault File Config */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FileCode className="w-4 h-4 text-accent-purple" />
            Obsidian Target Markdown File
          </h3>
          <p className="text-xs text-slate-400">
            Notes captured via Quick Capture will be appended to this file.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={settings.obsidianVaultFile}
              onChange={(e) => setSettings({ ...settings, obsidianVaultFile: e.target.value })}
              placeholder="e.g. C:\Users\Username\Documents\ObsidianVault\QuickCapture.md"
              className="flex-1 bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-accent-cyan/60"
            />
            <button
              type="button"
              onClick={handleBrowseVault}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-accent-cyan text-xs font-semibold border border-accent-cyan/30 transition-colors flex-shrink-0"
            >
              <FolderOpen className="w-4 h-4" />
              Browse
            </button>
          </div>
        </div>

        {/* Macros Executable Paths */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Wrench className="w-4 h-4 text-accent-cyan" />
            Macro Executable Commands & Paths
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Proxifier */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-accent-cyan" />
                Proxifier Executable Path
              </label>
              <input
                type="text"
                value={settings.proxifierPath}
                onChange={(e) => setSettings({ ...settings, proxifierPath: e.target.value })}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-cyan/60"
              />
            </div>

            {/* NetLimiter */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                NetLimiter Executable Path
              </label>
              <input
                type="text"
                value={settings.netlimiterPath}
                onChange={(e) => setSettings({ ...settings, netlimiterPath: e.target.value })}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-cyan/60"
              />
            </div>

            {/* Windows VM Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-purple-400" />
                VBox VM Name
              </label>
              <input
                type="text"
                value={settings.vmName}
                onChange={(e) => setSettings({ ...settings, vmName: e.target.value })}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-cyan/60"
              />
            </div>

            {/* Cockpit URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-rose-400" />
                Cockpit Web URL
              </label>
              <input
                type="text"
                value={settings.cockpitUrl}
                onChange={(e) => setSettings({ ...settings, cockpitUrl: e.target.value })}
                className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-accent-cyan/60"
              />
            </div>
          </div>
        </div>

        {/* Global Shortcut Info */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-emerald-400" />
            Global Keybindings
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <span>Quick Capture Foreground Trigger</span>
            <span className="font-mono bg-slate-800 border border-slate-700 px-2 py-1 rounded text-accent-cyan font-bold">
              Ctrl + Shift + O (Cmd+Shift+O on macOS)
            </span>
          </div>
        </div>

        {/* Status Msg */}
        {statusMsg && (
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-xs ${
              statusMsg.success
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
            }`}
          >
            {statusMsg.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            {statusMsg.text}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-accent-cyan hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg glow-cyan transition-all active:scale-95 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
};
