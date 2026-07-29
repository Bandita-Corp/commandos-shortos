import React, { useState, useEffect } from 'react';
import { 
  Keyboard, 
  Plus, 
  Play, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Globe, 
  Terminal, 
  FileText, 
  AppWindow, 
  Search,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { ShortcutBinding, ActionType } from '../types/electron';

interface ShortcutManagerProps {
  onShortcutTriggered: () => void;
}

export const ShortcutManager: React.FC<ShortcutManagerProps> = ({ onShortcutTriggered }) => {
  const [shortcuts, setShortcuts] = useState<ShortcutBinding[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{
    name: string;
    shortcut: string;
    actionType: ActionType;
    target: string;
    enabled: boolean;
  }>({
    name: '',
    shortcut: '',
    actionType: 'OPEN_RESOURCE',
    target: '',
    enabled: true,
  });

  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; msg: string } | null>(null);

  const fetchShortcuts = async () => {
    setIsLoading(true);
    try {
      const res = await window.electronAPI.getShortcuts();
      if (res.success && res.data) {
        setShortcuts(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch shortcuts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShortcuts();
  }, []);

  const handleToggle = async (id: string, currentEnabled: boolean) => {
    const nextState = !currentEnabled;
    // Optimistic UI update
    setShortcuts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enabled: nextState } : s))
    );
    await window.electronAPI.toggleShortcut(id, nextState);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shortcut keybinding?')) return;
    const res = await window.electronAPI.deleteShortcut(id);
    if (res.success) {
      setShortcuts((prev) => prev.filter((s) => s.id !== id));
    }
  };

  const handleTest = async (id: string) => {
    setIsTesting(id);
    setTestResult(null);
    try {
      const res = await window.electronAPI.testShortcut(id);
      if (res.success) {
        setTestResult({ id, success: true, msg: 'Executed successfully!' });
      } else {
        setTestResult({ id, success: false, msg: res.error || 'Execution failed' });
      }
    } catch (err: any) {
      setTestResult({ id, success: false, msg: err.message || 'Error executing action' });
    } finally {
      setIsTesting(null);
      onShortcutTriggered();
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      name: '',
      shortcut: 'Ctrl+Alt+Key',
      actionType: 'OPEN_RESOURCE',
      target: '',
      enabled: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (s: ShortcutBinding) => {
    setEditingId(s.id);
    setFormData({
      name: s.name,
      shortcut: s.shortcut,
      actionType: s.actionType,
      target: s.target,
      enabled: s.enabled,
    });
    setIsModalOpen(true);
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.shortcut || !formData.target) return;

    if (editingId) {
      const res = await window.electronAPI.updateShortcut(editingId, formData);
      if (res.success && res.data) {
        setShortcuts((prev) => prev.map((s) => (s.id === editingId ? res.data! : s)));
      }
    } else {
      const res = await window.electronAPI.createShortcut(formData);
      if (res.success && res.data) {
        setShortcuts((prev) => [...prev, res.data!]);
      }
    }
    setIsModalOpen(false);
  };

  const actionIcons: Record<ActionType, React.ReactNode> = {
    START_APP: <AppWindow className="w-4 h-4 text-cyan-400" />,
    START_SCRIPT: <Terminal className="w-4 h-4 text-emerald-400" />,
    CREATE_OBSIDIAN_DOC: <FileText className="w-4 h-4 text-purple-400" />,
    OPEN_RESOURCE: <Globe className="w-4 h-4 text-amber-400" />,
  };

  const actionLabels: Record<ActionType, string> = {
    START_APP: 'Start App',
    START_SCRIPT: 'Run Script',
    CREATE_OBSIDIAN_DOC: 'Create Obsidian Doc',
    OPEN_RESOURCE: 'Open Resource (URL/Path)',
  };

  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.shortcut.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.target.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = selectedFilter === 'ALL' || s.actionType === selectedFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent-cyan" />
            Global Keyboard Shortcuts & Actions
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Assign custom keybindings to start desktop applications, run scripts, capture Obsidian notes, or open resources.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-cyan hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg glow-cyan transition-all active:scale-95 flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Custom Shortcut
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-4 rounded-2xl">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search shortcuts or actions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accent-cyan/60 transition-colors"
          />
        </div>

        <div className="flex flex-wrap gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800">
          {['ALL', 'START_APP', 'START_SCRIPT', 'CREATE_OBSIDIAN_DOC', 'OPEN_RESOURCE'].map((type) => (
            <button
              key={type}
              onClick={() => setSelectedFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedFilter === type
                  ? 'bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              {type === 'ALL' ? 'All Actions' : actionLabels[type as ActionType]}
            </button>
          ))}
        </div>
      </div>

      {/* Shortcut Cards Grid / List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {isLoading ? (
          <div className="col-span-2 glass-panel p-10 rounded-2xl text-center text-xs text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-accent-cyan" />
            Loading shortcut keybindings...
          </div>
        ) : filteredShortcuts.length === 0 ? (
          <div className="col-span-2 glass-panel p-12 rounded-2xl text-center text-xs text-slate-500">
            No keyboard shortcuts configured matching your criteria. Click "Add Custom Shortcut" to create one!
          </div>
        ) : (
          filteredShortcuts.map((s) => {
            const isTestRunning = isTesting === s.id;
            const res = testResult?.id === s.id ? testResult : null;

            return (
              <div
                key={s.id}
                className={`glass-panel rounded-2xl p-5 border transition-all ${
                  s.enabled ? 'border-slate-800 hover:border-accent-cyan/40 bg-slate-900/40' : 'border-slate-800/50 opacity-60 bg-slate-950/40'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                      {actionIcons[s.actionType as ActionType] || <Sparkles className="w-4 h-4 text-slate-400" />}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {s.name}
                      </h3>
                      <span className="text-[10px] font-mono text-slate-400">
                        {actionLabels[s.actionType as ActionType]}
                      </span>
                    </div>
                  </div>

                  {/* Enable / Disable Toggle Switch */}
                  <button
                    onClick={() => handleToggle(s.id, s.enabled)}
                    title={s.enabled ? 'Disable Shortcut' : 'Enable Shortcut'}
                    className="text-slate-400 hover:text-accent-cyan transition-colors"
                  >
                    {s.enabled ? (
                      <ToggleRight className="w-7 h-7 text-accent-cyan" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-slate-600" />
                    )}
                  </button>
                </div>

                {/* Target Information */}
                <div className="mt-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800/60 font-mono text-xs text-slate-300 truncate">
                  <span className="text-slate-500 font-sans mr-2">Target:</span>
                  {s.target}
                </div>

                {/* Footer Bar with Keybinding Badge and Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-accent-cyan bg-slate-900 px-3 py-1 rounded-lg border border-accent-cyan/30 shadow-inner">
                    {s.shortcut}
                  </span>

                  <div className="flex items-center gap-2">
                    {/* Test Trigger Button */}
                    <button
                      onClick={() => handleTest(s.id)}
                      disabled={isTestRunning}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition-all active:scale-95 disabled:opacity-50"
                      title="Test Action"
                    >
                      {isTestRunning ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-accent-cyan" />
                      )}
                      Test
                    </button>

                    {/* Edit Button */}
                    <button
                      onClick={() => openEditModal(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                      title="Edit Shortcut"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete Shortcut"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Test Feedback Message */}
                {res && (
                  <div
                    className={`mt-3 p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                      res.success
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {res.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    {res.msg}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel border-accent-cyan/30 rounded-3xl w-full max-w-xl bg-gradient-to-b from-[#151824] to-[#0f111a] p-6 shadow-2xl space-y-5 border">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-accent-cyan" />
                {editingId ? 'Edit Shortcut Action' : 'Add Custom Shortcut'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Shortcut Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Rule Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Open Terminal, Launch Proxifier"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-accent-cyan"
                />
              </div>

              {/* Key Combination */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Hotkey Combination (Electron Format)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ctrl+Alt+P, Alt+Space, Ctrl+Shift+X"
                  value={formData.shortcut}
                  onChange={(e) => setFormData({ ...formData, shortcut: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-accent-cyan font-bold focus:outline-none focus:border-accent-cyan"
                />
                <p className="text-[11px] text-slate-500">
                  Examples: <code className="text-slate-400">Ctrl+Alt+C</code>, <code className="text-slate-400">Ctrl+Shift+L</code>, <code className="text-slate-400">Alt+Space</code>
                </p>
              </div>

              {/* Action Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Action Type</label>
                <select
                  value={formData.actionType}
                  onChange={(e) => setFormData({ ...formData, actionType: e.target.value as ActionType })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-accent-cyan"
                >
                  <option value="START_APP">Start Application (Executable Path or App Name)</option>
                  <option value="START_SCRIPT">Start Script (Shell Command / Powershell)</option>
                  <option value="CREATE_OBSIDIAN_DOC">Create / Append Obsidian Note</option>
                  <option value="OPEN_RESOURCE">Open Resource (URL or Local File/Directory Path)</option>
                </select>
              </div>

              {/* Action Target Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Action Target</label>
                <textarea
                  rows={3}
                  required
                  placeholder={
                    formData.actionType === 'START_APP'
                      ? 'e.g. C:\\Program Files\\Proxifier\\Proxifier.exe or spotify'
                      : formData.actionType === 'START_SCRIPT'
                      ? 'e.g. ipconfig /flushdns or powershell Clear-DnsClientCache'
                      : formData.actionType === 'CREATE_OBSIDIAN_DOC'
                      ? 'e.g. Note content template text to append to Obsidian file'
                      : 'e.g. https://github.com or C:\\Users\\user\\Documents'
                  }
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono placeholder-slate-600 focus:outline-none focus:border-accent-cyan resize-none"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-accent-cyan hover:bg-cyan-400 text-slate-950 text-xs font-bold shadow-lg"
                >
                  Save Shortcut Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
